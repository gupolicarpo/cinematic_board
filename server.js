require("dotenv").config({ override: true });
const express  = require("express");
const cors     = require("cors");
const https    = require("https");
const crypto   = require("crypto");
const fs       = require("fs");
const path     = require("path");
const os       = require("os");
const { exec } = require("child_process");
const multer   = require("multer");
const { createClient } = require("@supabase/supabase-js");
const Stripe   = require("stripe");
// Vite loaded dynamically in dev mode only (see start())

// ── SUPABASE ───────────────────────────────────────────────────────────────────
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const ASSET_BUCKET         = "cinematic-assets";
const ASSET_TYPES          = ["images", "videos", "audio", "text"];

// Admin client (service role — bypasses RLS, used for Veo cache + verifying tokens)
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// ── DEV / OWNER BYPASS ────────────────────────────────────────────────────────
// Accounts in this list are never credit-checked. Add via env var (comma-separated)
// or hardcoded here for owner testing. Credits always reported as 999999.
const BYPASS_EMAILS = new Set([
  "gupolicarpo@gmail.com",
  ...(process.env.DEV_BYPASS_EMAILS ? process.env.DEV_BYPASS_EMAILS.split(",").map(e=>e.trim().toLowerCase()) : []),
]);

// Cache userId → email lookups to avoid hitting Supabase auth on every generation
const _emailCache = new Map();
async function getUserEmail(userId) {
  if (!supabaseAdmin || !userId) return null;
  if (_emailCache.has(userId)) return _emailCache.get(userId);
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = data?.user?.email?.toLowerCase() || null;
    if (email) _emailCache.set(userId, email);
    return email;
  } catch { return null; }
}

// Helper: create a per-request client authenticated as the calling user
function supabaseFor(token) {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

// Helper: extract userId from Bearer token in request headers
async function getUserId(req) {
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
  if (!token || !supabaseAdmin) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user?.id || null;
}

// ── STRIPE ─────────────────────────────────────────────────────────────────────
const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Price IDs — set these in .env after creating products in Stripe dashboard
// STRIPE_PRICE_INDIE   e.g. price_xxx  ($19/mo)
// STRIPE_PRICE_PRO     e.g. price_xxx  ($49/mo)
// STRIPE_PRICE_STUDIO  e.g. price_xxx  ($99/mo)
const STRIPE_PRICES = {
  indie:  process.env.STRIPE_PRICE_INDIE,
  pro:    process.env.STRIPE_PRICE_PRO,
  studio: process.env.STRIPE_PRICE_STUDIO,
};
const TOPUP_PRICES = {
  "500":  process.env.STRIPE_PRICE_TOPUP_500,
  "1500": process.env.STRIPE_PRICE_TOPUP_1500,
  "4000": process.env.STRIPE_PRICE_TOPUP_4000,
};

// Monthly credits per tier
const TIER_CREDITS = { free: 80, indie: 900, pro: 2500, studio: 6000 };
const TIER_LABELS  = { free: "Free", indie: "Indie", pro: "Pro", studio: "Studio" };
const TIER_FEATURES = {
  free:   ["80 credits/mo", "Kling Standard", "Watermark", "2 projects"],
  indie:  ["900 credits/mo", "All Kling + Lipsync", "Veo Fast", "10 projects", "No watermark"],
  pro:    ["2500 credits/mo", "All Kling + All Veo", "30 projects", "All AI features"],
  studio: ["6000 credits/mo", "Everything", "Unlimited projects", "All AI features"],
};
const TOPUP_DESCRIPTIONS = {
  "500":  "~25 Kling videos",
  "1500": "~33 Veo Fast videos",
  "4000": "Best value",
};

function formatStripeMoney(unitAmount, currency = "usd") {
  if (typeof unitAmount !== "number") return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase(),
    minimumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
  }).format(unitAmount / 100);
}

// Cost in credits per operation
const OP_CREDITS = {
  kling_5s_std:  20,
  kling_5s_pro:  40,
  kling_10s_std: 40,
  kling_10s_pro: 80,
  kling_lipsync: 8,
  kling_tts:     2,
  kling_extend:  20,
  music_gen:     5,
  music_video_sync: 8,
  veo_fast_5s:   45,
  veo_fast_8s:   70,
  veo_fast_10s:  88,
  veo_fast_12s:  105,
  veo_std_5s:    115,
  veo_std_8s:    185,
  veo_std_10s:   230,
  image_gen:     3,
  coherence:     1,
};

// ── CREDIT HELPERS ─────────────────────────────────────────────────────────────

// Get or create user subscription row
async function getUserSub(userId) {
  if (!supabaseAdmin || !userId) return null;
  const { data, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") {
    // Row doesn't exist yet — create free tier
    const { data: created } = await supabaseAdmin
      .from("user_subscriptions")
      .insert({ user_id: userId, tier: "free", credits_balance: 80, credits_monthly: 80 })
      .select().single();
    return created;
  }
  return data || null;
}

// Deduct credits; returns { ok, balance } or { ok: false, balance }
async function deductCredits(userId, amount, operation, metadata = {}) {
  if (!supabaseAdmin || !userId) return { ok: true, balance: 999 }; // dev fallback
  // Owner / dev bypass — unlimited credits, no deduction
  const email = await getUserEmail(userId);
  if (email && BYPASS_EMAILS.has(email)) return { ok: true, balance: 999999 };
  const sub = await getUserSub(userId);
  if (!sub) return { ok: false, balance: 0 };
  if (sub.credits_balance < amount) return { ok: false, balance: sub.credits_balance };
  const newBalance = sub.credits_balance - amount;
  await supabaseAdmin
    .from("user_subscriptions")
    .update({ credits_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  await supabaseAdmin
    .from("credit_transactions")
    .insert({ user_id: userId, amount: -amount, operation, metadata });
  return { ok: true, balance: newBalance };
}

// Middleware factory — checks credits BEFORE the operation
function requireCredits(operation) {
  return async (req, res, next) => {
    if (!supabaseAdmin) return next(); // skip if supabase not configured
    const userId = await getUserId(req);
    if (!userId) return next(); // unauthenticated — let endpoint handle auth
    const cost = OP_CREDITS[operation] || 0;
    if (cost === 0) return next();
    const sub = await getUserSub(userId);
    if (!sub || sub.credits_balance < cost) {
      return res.status(402).json({
        error: "insufficient_credits",
        credits_balance: sub?.credits_balance || 0,
        credits_needed:  cost,
        tier: sub?.tier || "free",
      });
    }
    req._creditUserId    = userId;
    req._creditOperation = operation;
    req._creditCost      = cost;
    next();
  };
}

// Call after successful generation to actually deduct
async function commitCredits(req) {
  if (!req._creditUserId || !req._creditCost) return;
  await deductCredits(req._creditUserId, req._creditCost, req._creditOperation, {});
}

// Multer memory storage for asset uploads (no local disk)
const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// ── LOCAL FALLBACK (kept for backward compat & local dev without Supabase) ────
const ASSETS_ROOT = path.join(__dirname, "assets");
ASSET_TYPES.forEach(t => {
  const dir = path.join(ASSETS_ROOT, t);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
const VEO_CACHE = path.join(__dirname, ".veo-cache");
if (!fs.existsSync(VEO_CACHE)) fs.mkdirSync(VEO_CACHE, { recursive: true });

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "30mb" }));

function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { console.log(`[${hostname}] ${res.statusCode}`); resolve({ status: res.statusCode, data }); });
    });
    req.on("error", (e) => { console.error(e.message); reject(e); });
    req.write(payload);
    req.end();
  });
}

function get(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: "GET",
      headers: { "Content-Type": "application/json", ...headers },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { console.log(`[GET ${hostname}] ${res.statusCode}`); resolve({ status: res.statusCode, data }); });
    });
    req.on("error", (e) => { console.error(e.message); reject(e); });
    req.end();
  });
}

function requestRaw({ hostname, path, method = "POST", headers = {}, body = "" }) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    const req = https.request({
      hostname, path, method,
      headers: { "Content-Length": Buffer.byteLength(payload), ...headers },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { console.log(`[${method} ${hostname}] ${res.statusCode}`); resolve({ status: res.statusCode, data }); });
    });
    req.on("error", (e) => { console.error(e.message); reject(e); });
    req.write(payload);
    req.end();
  });
}

let googleTokenCache = { token: null, exp: 0 };
let googleServiceAccountCache = null;

function readGoogleServiceAccount() {
  if (googleServiceAccountCache) return googleServiceAccountCache;
  const inline = process.env.VERTEX_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (inline.trim()) {
    try {
      googleServiceAccountCache = JSON.parse(inline);
      return googleServiceAccountCache;
    } catch {
      try {
        googleServiceAccountCache = JSON.parse(Buffer.from(inline, "base64").toString("utf8"));
        return googleServiceAccountCache;
      } catch {}
    }
  }
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.VERTEX_SERVICE_ACCOUNT_PATH || "";
  if (credsPath && fs.existsSync(credsPath)) {
    googleServiceAccountCache = JSON.parse(fs.readFileSync(credsPath, "utf8"));
    return googleServiceAccountCache;
  }
  return null;
}

function vertexVeoConfig(modelHint = "") {
  const sa = readGoogleServiceAccount();
  return {
    project: process.env.VERTEX_AI_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || sa?.project_id || "",
    location: process.env.VERTEX_AI_LOCATION || "us-central1",
    frameModel: process.env.VERTEX_VEO_FRAME_MODEL || "veo-3.1-generate-001",
    model: process.env.VERTEX_VEO_MODEL || modelHint || "veo-3.1-generate-preview",
  };
}

async function googleAccessToken() {
  if (process.env.VERTEX_ACCESS_TOKEN) return process.env.VERTEX_ACCESS_TOKEN;
  const now = Math.floor(Date.now() / 1000);
  if (googleTokenCache.token && googleTokenCache.exp > now + 60) return googleTokenCache.token;
  const sa = readGoogleServiceAccount();
  if (!sa?.client_email || !sa?.private_key) {
    throw new Error("Vertex AI requires service account credentials. Set GOOGLE_APPLICATION_CREDENTIALS or VERTEX_SERVICE_ACCOUNT_JSON.");
  }
  const jwtHeader = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtPayload = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const unsigned = `${jwtHeader}.${jwtPayload}`;
  const signature = b64url(crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key));
  const assertion = `${unsigned}.${signature}`;
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  }).toString();
  const r = await requestRaw({
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (r.status !== 200) throw new Error(`Google OAuth ${r.status}: ${String(r.data).slice(0, 200)}`);
  const d = JSON.parse(r.data);
  googleTokenCache = { token: d.access_token, exp: now + Number(d.expires_in || 3600) };
  return googleTokenCache.token;
}

function isVertexOperationName(opName = "") {
  return /^projects\/[^/]+\/locations\/[^/]+\/publishers\/google\/models\/[^/]+\/operations\/[^/]+$/.test(String(opName));
}

function gcsMediaUrl(gsUri) {
  const trimmed = String(gsUri || "");
  if (!trimmed.startsWith("gs://")) throw new Error("Invalid gs:// URI");
  const withoutScheme = trimmed.slice(5);
  const slash = withoutScheme.indexOf("/");
  if (slash <= 0) throw new Error("Invalid gs:// URI");
  const bucket = withoutScheme.slice(0, slash);
  const object = withoutScheme.slice(slash + 1);
  return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object)}?alt=media`;
}

async function cacheVeoBuffer(buffer, cacheKey) {
  const fileId = crypto.createHash("sha1").update(cacheKey).digest("hex");
  const storagePath = `veo-cache/${fileId}.mp4`;

  if (supabaseAdmin) {
    const { data: existing } = await supabaseAdmin.storage
      .from(ASSET_BUCKET).list("veo-cache", { search: `${fileId}.mp4` });
    if (existing && existing.length > 0) {
      const { data: urlData } = supabaseAdmin.storage.from(ASSET_BUCKET).getPublicUrl(storagePath);
      return urlData.publicUrl;
    }
    const { error: upErr } = await supabaseAdmin.storage.from(ASSET_BUCKET)
      .upload(storagePath, buffer, { contentType: "video/mp4", upsert: true });
    if (upErr) throw upErr;
    const { data: urlData } = supabaseAdmin.storage.from(ASSET_BUCKET).getPublicUrl(storagePath);
    return urlData.publicUrl;
  }

  const localPath = path.join(VEO_CACHE, `${fileId}.mp4`);
  if (!fs.existsSync(localPath)) fs.writeFileSync(localPath, buffer);
  return `/api/veo/file/${fileId}.mp4`;
}

// ── Kling JWT (HS256, no external dep) ────────────────────────────────────────
function b64url(buf) {
  return (Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
    .toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function klingJWT() {
  const ak = process.env.KLING_ACCESS_KEY || "";
  const sk = process.env.KLING_SECRET_KEY || "";
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 }));
  const sig = b64url(crypto.createHmac("sha256", sk).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

// Kling task_id values are 18-digit integers — beyond JS MAX_SAFE_INTEGER.
// JSON.parse() silently corrupts them. Convert to strings before sending to client.
// Covers both snake_case (task_id, element_id) and camelCase (taskId, elementId) — matching official Kling skill.
function protectBigInts(text) {
  return String(text || "").replace(/"(task_id|element_id|taskId|elementId)":\s*(\d{15,})/g, '"$1":"$2"');
}

// POST /api/kling/video  — create video generation task
app.post("/api/kling/video", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  // Credit check — cost depends on mode/quality/duration/resolution
  const userId = await getUserId(req);
  if (userId && supabaseAdmin) {
    const dur  = parseInt(req.body?.duration || req.body?.parameters?.durationSeconds || 5, 10);
    const mode = (req.body?.mode || req.body?.parameters?.mode || "std").toLowerCase();
    const res_  = (req.body?.resolution || "720p").toLowerCase();
    const isPro = mode === "pro";
    const is10  = dur >= 10;
    const op = isPro ? (is10 ? "kling_10s_pro" : "kling_5s_pro") : (is10 ? "kling_10s_std" : "kling_5s_std");
    const resMult = res_ === "1080p" ? 2 : 1;
    const baseCost = OP_CREDITS[op];
    const totalCost = Math.ceil(baseCost * resMult);
    const result = await deductCredits(userId, totalCost, op);
    if (!result.ok) return res.status(402).json({
      error: "insufficient_credits", credits_balance: result.balance, credits_needed: totalCost,
    });
  }
  try {
    // Strip internal fields before forwarding
    const { klingVersion, ...body } = req.body;
    const isV16 = klingVersion === "v1.6";
    // V1.6 uses text2video/image2video; V3 uses omni-video
    const endpoint = isV16
      ? (body.image_url ? "/v1/videos/image2video" : "/v1/videos/text2video")
      : "/v1/videos/omni-video";
    const r = await post("api-singapore.klingai.com", endpoint,
      { "Authorization": `Bearer ${klingJWT()}` }, body);
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/kling/video/:taskId  — poll task status
app.get("/api/kling/video/:taskId", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  try {
    const isV16 = req.query.ver === "v1.6";
    const endpoint = isV16
      ? (req.query.img ? `/v1/videos/image2video/${req.params.taskId}` : `/v1/videos/text2video/${req.params.taskId}`)
      : `/v1/videos/omni-video/${req.params.taskId}`;
    const r = await get("api-singapore.klingai.com", endpoint,
      { "Authorization": `Bearer ${klingJWT()}` });
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// POST /api/kling/multi-image — generate video from up to 4 reference images
// Body: { image_list: [{image: url|base64}, ...], prompt, negative_prompt?, mode?, duration?, aspect_ratio? }
app.post("/api/kling/multi-image", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  const userId = await getUserId(req);
  if (userId && supabaseAdmin) {
    const dur  = parseInt(req.body?.duration || 5, 10);
    const mode = (req.body?.mode || "std").toLowerCase();
    const isPro = mode === "pro";
    const is10  = dur >= 10;
    const op = isPro ? (is10 ? "kling_10s_pro" : "kling_5s_pro") : (is10 ? "kling_10s_std" : "kling_5s_std");
    const result = await deductCredits(userId, OP_CREDITS[op], op);
    if (!result.ok) return res.status(402).json({
      error: "insufficient_credits", credits_balance: result.balance, credits_needed: OP_CREDITS[op],
    });
  }
  try {
    const { image_list, prompt, negative_prompt = "", mode = "std", duration = "5", aspect_ratio = "16:9" } = req.body;
    if (!image_list?.length) return res.status(400).json({ error: "image_list is required" });
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });
    // Strip data: prefix from base64 images if present
    const cleanList = image_list.map(item => ({
      image: (item.image || "").replace(/^data:[^;]+;base64,/, ""),
    }));
    const r = await post("api-singapore.klingai.com", "/v1/videos/multi-image2video",
      { "Authorization": `Bearer ${klingJWT()}` },
      { model_name: "kling-v1-6", image_list: cleanList, prompt, negative_prompt, mode, duration: String(duration), aspect_ratio });
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/kling/multi-image/:taskId — poll multi-image task status
app.get("/api/kling/multi-image/:taskId", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  try {
    const r = await get("api-singapore.klingai.com", `/v1/videos/multi-image2video/${req.params.taskId}`,
      { "Authorization": `Bearer ${klingJWT()}` });
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// POST /api/kling/extend — extend an existing Kling video by 4-5s
// Body: { video_id, prompt?, negative_prompt? }
// Only works with videos generated by V1.0, V1.5, V1.6 models
app.post("/api/kling/extend", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  const { video_id, prompt = "", negative_prompt = "" } = req.body;
  if (!video_id) return res.status(400).json({ error: "video_id is required" });
  const userId = await getUserId(req);
  if (userId && supabaseAdmin) {
    const result = await deductCredits(userId, OP_CREDITS.kling_extend, "kling_extend");
    if (!result.ok) return res.status(402).json({
      error: "insufficient_credits", credits_balance: result.balance, credits_needed: OP_CREDITS.kling_extend,
    });
  }
  try {
    const r = await post("api-singapore.klingai.com", "/v1/videos/video-extend",
      { "Authorization": `Bearer ${klingJWT()}` },
      { video_id, prompt, negative_prompt });
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/kling/extend/:taskId — poll extension task status
app.get("/api/kling/extend/:taskId", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  try {
    const r = await get("api-singapore.klingai.com", `/v1/videos/video-extend/${req.params.taskId}`,
      { "Authorization": `Bearer ${klingJWT()}` });
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/kling/voices — return static voice list
// Source: Kling AI official Voice Guide (verified IDs + languages)
// voice_language MUST match what Kling's TTS API expects — wrong language → 400
const KLING_VOICES = [
  // ── English voices ──────────────────────────────────────────────────────────
  { voice_id: "commercial_lady_en_f-v1", voice_name: "EN · Commercial Lady",  voice_language: "en", voice_gender: "female" },
  { voice_id: "reader_en_m-v1",          voice_name: "EN · The Reader",        voice_language: "en", voice_gender: "male"   },
  { voice_id: "oversea_male1",           voice_name: "EN · Anchor",            voice_language: "en", voice_gender: "male"   },
  { voice_id: "uk_man2",                 voice_name: "EN · Crag (UK Male)",    voice_language: "en", voice_gender: "male"   },
  { voice_id: "uk_boy1",                 voice_name: "EN · Bud (UK Young)",    voice_language: "en", voice_gender: "male"   },
  { voice_id: "calm_story1",             voice_name: "EN · Lore",              voice_language: "en", voice_gender: "male"   },
  { voice_id: "ai_huangzhong_712",       voice_name: "EN · Beacon",            voice_language: "en", voice_gender: "male"   },
  { voice_id: "ai_laoguowang_712",       voice_name: "EN · Titan",             voice_language: "en", voice_gender: "male"   },
  { voice_id: "ai_huangyaoshi_712",      voice_name: "EN · Rock",              voice_language: "en", voice_gender: "male"   },
  { voice_id: "genshin_vindi2",          voice_name: "EN · Sunny",             voice_language: "en", voice_gender: "male"   },
  { voice_id: "chat1_female_new-3",      voice_name: "EN · Tender",            voice_language: "en", voice_gender: "female" },
  { voice_id: "chat_0407_5-1",           voice_name: "EN · Siren",             voice_language: "en", voice_gender: "female" },
  { voice_id: "girlfriend_4_speech02",   voice_name: "EN · Melody",            voice_language: "en", voice_gender: "female" },
  { voice_id: "genshin_kirara",          voice_name: "EN · Dove",              voice_language: "en", voice_gender: "female" },
  { voice_id: "genshin_klee2",           voice_name: "EN · Peppy",             voice_language: "en", voice_gender: "female" },
  { voice_id: "ai_shatang",             voice_name: "EN · Blossom",            voice_language: "en", voice_gender: "female" },
  { voice_id: "chengshu_jiejie",         voice_name: "EN · Grace",             voice_language: "en", voice_gender: "female" },
  { voice_id: "you_pingjing",            voice_name: "EN · Helen",             voice_language: "en", voice_gender: "female" },
  { voice_id: "cartoon-boy-07",          voice_name: "EN · Zippy",             voice_language: "en", voice_gender: "male"   },
  { voice_id: "cartoon-girl-01",         voice_name: "EN · Sprite",            voice_language: "en", voice_gender: "female" },
  { voice_id: "laopopo_speech02",        voice_name: "EN · Prattle",           voice_language: "en", voice_gender: "female" },
  { voice_id: "heainainai_speech02",     voice_name: "EN · Hearth",            voice_language: "en", voice_gender: "female" },
  { voice_id: "AOT",                     voice_name: "EN · Ace",               voice_language: "en", voice_gender: "male"   },
  { voice_id: "zhinen_xuesheng",         voice_name: "EN · Sage",              voice_language: "en", voice_gender: "male"   },
  { voice_id: "ai_kaiya",                voice_name: "EN · Shine",             voice_language: "en", voice_gender: "male"   },
  { voice_id: "ai_chenjiahao_712",       voice_name: "EN · Lyric",             voice_language: "en", voice_gender: "male"   },
  // ── Chinese voices ──────────────────────────────────────────────────────────
  { voice_id: "ai_shatang",              voice_name: "ZH · 青春少女",           voice_language: "zh", voice_gender: "female" },
  { voice_id: "genshin_kirara",          voice_name: "ZH · 元气少女",           voice_language: "zh", voice_gender: "female" },
  { voice_id: "chat1_female_new-3",      voice_name: "ZH · 温柔姐姐",           voice_language: "zh", voice_gender: "female" },
  { voice_id: "ai_kaiya",                voice_name: "ZH · 阳光男生",           voice_language: "zh", voice_gender: "male"   },
  { voice_id: "ai_chenjiahao_712",       voice_name: "ZH · 文艺小哥",           voice_language: "zh", voice_gender: "male"   },
  { voice_id: "ai_laoguowang_712",       voice_name: "ZH · 严肃上司",           voice_language: "zh", voice_gender: "male"   },
  { voice_id: "uk_oldman3",             voice_name: "ZH · 唠叨爷爷",            voice_language: "zh", voice_gender: "male"   },
  { voice_id: "diyinnansang_DB_CN_M_04-v2", voice_name: "ZH · 新闻播报男",     voice_language: "zh", voice_gender: "male"   },
  { voice_id: "yizhipiannan-v1",         voice_name: "ZH · 译制片男",           voice_language: "zh", voice_gender: "male"   },
  { voice_id: "daopianyansang-v1",       voice_name: "ZH · 刀片烟嗓",           voice_language: "zh", voice_gender: "male"   },
];
app.get("/api/kling/voices", (req, res) => {
  res.json({ code: 0, data: { voices: KLING_VOICES } });
});

// ── ADVANCED LIP SYNC endpoints (3-step: TTS → identify-face → advanced-lipsync) ──

// POST /api/kling/tts — generate TTS audio for a character's dialogue
// body: { text, voice_id, voice_language?, voice_speed? }
// returns Kling task: poll /api/kling/tts/:taskId → task_result.audios[0].{ id, url, duration }
app.post("/api/kling/tts", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  const { text, voice_id, voice_speed = 1.0 } = req.body;
  if (!text || !voice_id) return res.status(400).send("text and voice_id required");
  // Always look up the correct voice_language from the official voice table.
  // Client-supplied language is ignored — wrong language is the #1 cause of 400 errors.
  const voiceEntry = KLING_VOICES.find(v => v.voice_id === voice_id);
  const voice_language = voiceEntry?.voice_language || "en";
  const body = { text: text.slice(0, 1000), voice_id, voice_language, voice_speed };
  console.log("[tts] text len:", text.length, "voice:", voice_id, "lang:", voice_language, voiceEntry ? "✓" : "⚠ unknown voice_id");
  try {
    const r = await post("api-singapore.klingai.com", "/v1/audio/tts",
      { "Authorization": `Bearer ${klingJWT()}` }, body);
    console.log("[tts] create response:", r.status, r.data?.slice?.(0, 300));
    if (r.status !== 200) console.error("[tts] create FAILED:", r.status, r.data);
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { console.error("[tts] exception:", e.message); res.status(500).send(e.message); }
});

// GET /api/kling/tts/:taskId — poll TTS task
app.get("/api/kling/tts/:taskId", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  const taskId = req.params.taskId;
  console.log("[tts-poll] taskId:", taskId);
  try {
    const r = await get("api-singapore.klingai.com", `/v1/audio/tts/${taskId}`,
      { "Authorization": `Bearer ${klingJWT()}` });
    console.log("[tts-poll]", r.status, r.data?.slice?.(0, 300));
    if (r.status !== 200) console.error("[tts-poll] FAILED:", r.status, r.data);
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { console.error("[tts-poll] exception:", e.message); res.status(500).send(e.message); }
});

// POST /api/kling/identify-face — step 2: scan video to get face_data + session_id
// body: { video_url } or { video_id }
// returns: { session_id, face_data: [{ face_id, face_image, start_time, end_time }] }
app.post("/api/kling/identify-face", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  const { video_url, video_id } = req.body;
  if (!video_url && !video_id) return res.status(400).send("video_url or video_id required");
  const body = video_id ? { video_id } : { video_url };
  console.log("[identify-face] video_url:", video_url?.slice?.(0, 80));
  try {
    const r = await post("api-singapore.klingai.com", "/v1/videos/identify-face",
      { "Authorization": `Bearer ${klingJWT()}` }, body);
    console.log("[identify-face] response:", r.status, r.data?.slice?.(0, 300));
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// POST /api/kling/advanced-lipsync — step 3: apply per-face lipsync
// body: { session_id, face_choose: [{ face_id, audio_id, sound_start_time, sound_end_time, sound_insert_time }] }
app.post("/api/kling/advanced-lipsync", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  const { session_id, face_choose } = req.body;
  if (!session_id || !face_choose?.length) return res.status(400).send("session_id and face_choose required");
  console.log("[advanced-lipsync] session:", session_id, "faces:", face_choose.map(f=>f.face_id));
  try {
    const r = await post("api-singapore.klingai.com", "/v1/videos/advanced-lip-sync",
      { "Authorization": `Bearer ${klingJWT()}` }, req.body);
    console.log("[advanced-lipsync] response:", r.status, r.data?.slice?.(0, 300));
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/kling/advanced-lipsync/:taskId — poll advanced lipsync task
app.get("/api/kling/advanced-lipsync/:taskId", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  try {
    const r = await get("api-singapore.klingai.com", `/v1/videos/advanced-lip-sync/${req.params.taskId}`,
      { "Authorization": `Bearer ${klingJWT()}` });
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// POST /api/kling/lipsync  — LEGACY text2video fallback (kept for compatibility)
app.post("/api/kling/lipsync", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  const { video_url, voice_id, dialogue, voice_language = "en" } = req.body;
  if (!video_url || !voice_id || !dialogue) return res.status(400).send("video_url, voice_id, and dialogue are required");
  // Credit check
  const userId = await getUserId(req);
  if (userId && supabaseAdmin) {
    const result = await deductCredits(userId, OP_CREDITS.kling_lipsync, "kling_lipsync");
    if (!result.ok) return res.status(402).json({
      error: "insufficient_credits", credits_balance: result.balance, credits_needed: OP_CREDITS.kling_lipsync,
    });
  }
  const textPayload = dialogue.slice(0, 120);
  const body = { input: { mode: "text2video", video_url, voice_id, voice_language, voice_speed: 1.0, text: textPayload } };
  console.log("[lipsync-legacy] text:", textPayload);
  try {
    const r = await post("api-singapore.klingai.com", "/v1/videos/lip-sync",
      { "Authorization": `Bearer ${klingJWT()}` }, body);
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/kling/lipsync/:taskId  — LEGACY poll
app.get("/api/kling/lipsync/:taskId", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  try {
    const r = await get("api-singapore.klingai.com", `/v1/videos/lip-sync/${req.params.taskId}`,
      { "Authorization": `Bearer ${klingJWT()}` });
    res.status(r.status).send(protectBigInts(r.data));
  } catch (e) { res.status(500).send(e.message); }
});

app.post("/api/messages", async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).send("ANTHROPIC_API_KEY not set");
  try {
    const r = await post("api.anthropic.com", "/v1/messages", { "x-api-key": key, "anthropic-version": "2023-06-01" }, req.body);
    res.status(r.status).send(r.data);
  } catch (e) { res.status(500).send(e.message); }
});

app.post("/api/oai/messages", async (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).send("OPENAI_API_KEY not set");
  try {
    // Responses API: "system" role must be "developer" role in the input array
    const input = (req.body.messages || []).map(m =>
      m.role === "system" ? { role: "developer", content: m.content } : m
    );
    const body = {
      model: req.body.model,
      input,
      max_output_tokens: req.body.max_tokens || 4000,
    };
    const r = await post("api.openai.com", "/v1/responses", { "Authorization": `Bearer ${key}` }, body);
    res.status(r.status).send(r.data);
  } catch (e) { res.status(500).send(e.message); }
});

app.post("/api/gemini/image", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).send("GEMINI_API_KEY not set");
  try {
    // Build multimodal parts: reference images first, then text prompt
    const parts = [];
    const refs = req.body.references || [];
    const aspect_ratio = req.body.aspect_ratio || "1:1";
    const resolution   = req.body.resolution   || "1K";
    for (const ref of refs) {
      if (ref.data && ref.mimeType) {
        parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
      }
    }
    // Inject aspect ratio and resolution as a generation hint in the prompt
    const arLabels = { "1:1":"square 1:1", "16:9":"landscape 16:9 widescreen", "9:16":"portrait 9:16 vertical", "4:3":"standard 4:3", "3:2":"photo 3:2" };
    const arHint = arLabels[aspect_ratio] || aspect_ratio;
    const resHint = resolution !== "1K" ? `, ${resolution} resolution detail` : "";
    const promptWithHints = `[Generate as ${arHint}${resHint}]\n\n${req.body.prompt}`;
    parts.push({ text: promptWithHints });
    const r = await post("generativelanguage.googleapis.com",
      `/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${key}`, {},
      { contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } });
    res.status(r.status).send(r.data);
  } catch (e) { res.status(500).send(e.message); }
});

// ── Veo 3.1 Video Generation ─────────────────────────────────────────────────
// POST /api/veo/video — start generation (returns operation name for polling)
app.post("/api/veo/video", async (req, res) => {
  // Credit check — cost depends on model quality, duration, and resolution
  const userId = await getUserId(req);
  if (userId && supabaseAdmin) {
    const dur     = parseInt(req.body?.parameters?.durationSeconds || 5, 10);
    const model   = (req.body?._veoModel || "").toLowerCase();
    const res_    = (req.body?.parameters?.resolution || "720p").toLowerCase();
    const isFast  = model.includes("fast");
    // Map duration → operation key (fast vs standard, rounded to nearest bracket)
    let op;
    if (isFast)     op = dur >= 10 ? "veo_fast_10s" : dur >= 8 ? "veo_fast_8s" : "veo_fast_5s";
    else            op = dur >= 10 ? "veo_std_10s"  : dur >= 8 ? "veo_std_8s"  : "veo_std_5s";
    // Resolution multiplier: 1080p = 2×, 4K = 4×, 720p = 1×
    const resMult = res_ === "4k" ? 4 : res_ === "1080p" ? 2 : 1;
    const baseCost = OP_CREDITS[op] || OP_CREDITS.veo_std_5s;
    const totalCost = Math.ceil(baseCost * resMult);
    const result = await deductCredits(userId, totalCost, op);
    if (!result.ok) return res.status(402).json({
      error: "insufficient_credits", credits_balance: result.balance, credits_needed: totalCost,
    });
  }
  try {
    const { _veoModel, ...payload } = req.body;
    const hasFrameGuidance = !!payload?.instances?.[0]?.image || !!payload?.instances?.[0]?.lastFrame;
    if (hasFrameGuidance) {
      const vertex = vertexVeoConfig(_veoModel);
      if (!vertex.project) {
        return res.status(400).send(JSON.stringify({ error: { code: 400, message: "Veo start/end frame requires Vertex AI project configuration. Set VERTEX_AI_PROJECT or GOOGLE_CLOUD_PROJECT.", status: "INVALID_ARGUMENT" } }));
      }
      const accessToken = await googleAccessToken();
      const r = await post(`${vertex.location}-aiplatform.googleapis.com`,
        `/v1/projects/${vertex.project}/locations/${vertex.location}/publishers/google/models/${vertex.frameModel}:predictLongRunning`,
        { "Authorization": `Bearer ${accessToken}` }, payload);
      return res.status(r.status).send(r.data);
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).send("GEMINI_API_KEY not set");
    const model = _veoModel || "veo-3.1-generate-preview";
    const r = await post("generativelanguage.googleapis.com",
      `/v1beta/models/${model}:predictLongRunning?key=${key}`,
      {}, payload);
    res.status(r.status).send(r.data);
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/veo/video?op=OPERATION_NAME — poll operation status
app.get("/api/veo/video", async (req, res) => {
  const opName = req.query.op;
  if (!opName) return res.status(400).send("Missing op param");
  try {
    if (isVertexOperationName(opName)) {
      const basePath = String(opName).replace(/\/operations\/[^/]+$/, "");
      const locationMatch = String(opName).match(/^projects\/[^/]+\/locations\/([^/]+)\//);
      const location = locationMatch?.[1] || vertexVeoConfig().location;
      const accessToken = await googleAccessToken();
      const r = await post(`${location}-aiplatform.googleapis.com`,
        `/v1/${basePath}:fetchPredictOperation`,
        { "Authorization": `Bearer ${accessToken}` },
        { operationName: opName });
      if (r.status < 200 || r.status >= 300) return res.status(r.status).send(r.data);
      const d = JSON.parse(r.data);
      if (d.done && !d.error && Array.isArray(d.response?.videos)) {
        for (let i = 0; i < d.response.videos.length; i++) {
          const video = d.response.videos[i];
          if (video?.bytesBase64Encoded) {
            const buffer = Buffer.from(video.bytesBase64Encoded, "base64");
            const url = await cacheVeoBuffer(buffer, `${opName}:${i}`);
            d.response.videos[i] = { ...video, uri: url };
          }
        }
      }
      return res.status(200).send(JSON.stringify(d));
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).send("GEMINI_API_KEY not set");
    const r = await get("generativelanguage.googleapis.com",
      `/v1beta/${opName}?key=${key}`, {});
    res.status(r.status).send(r.data);
  } catch (e) { res.status(500).send(e.message); }
});

// Helper: download a URL following redirects into a Buffer
function downloadToBuffer(url, headers = {}, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? require("https") : require("http");
    const req = proto.request(url, { method: "GET", headers }, res => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (!redirectsLeft) return reject(new Error("Too many redirects"));
        return downloadToBuffer(res.headers.location, headers, redirectsLeft - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end",  () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

// GET /api/veo/download?uri=VIDEO_URI
// Downloads the Veo video from Google, stores in Supabase Storage (or local cache),
// then returns the public URL as JSON { url } and also redirects to it.
app.get("/api/veo/download", async (req, res) => {
  const videoUri = req.query.uri;
  if (!videoUri) return res.status(400).send("Missing uri param");
  try {
    if (String(videoUri).startsWith("gs://")) {
      const accessToken = await googleAccessToken();
      const buffer = await downloadToBuffer(gcsMediaUrl(videoUri), { Authorization: `Bearer ${accessToken}` });
      const url = await cacheVeoBuffer(buffer, String(videoUri));
      return url.startsWith("/api/veo/file/") ? res.redirect(url) : res.json({ url });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).send("GEMINI_API_KEY not set");
    const fileId      = crypto.createHash("sha1").update(videoUri).digest("hex");
    const storagePath = `veo-cache/${fileId}.mp4`;

    // ── Supabase path ─────────────────────────────────────────────────────────
    if (supabaseAdmin) {
      // Check if already uploaded
      const { data: existing } = await supabaseAdmin.storage
        .from(ASSET_BUCKET).list("veo-cache", { search: `${fileId}.mp4` });
      if (existing && existing.length > 0) {
        const { data: urlData } = supabaseAdmin.storage.from(ASSET_BUCKET).getPublicUrl(storagePath);
        return res.json({ url: urlData.publicUrl });
      }
      // Download from Google
      const googleUrl = new URL(videoUri);
      googleUrl.searchParams.set("key", key);
      googleUrl.searchParams.set("alt", "media");
      const buffer = await downloadToBuffer(googleUrl.toString());
      // Upload to Supabase
      const { error: upErr } = await supabaseAdmin.storage.from(ASSET_BUCKET)
        .upload(storagePath, buffer, { contentType: "video/mp4", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabaseAdmin.storage.from(ASSET_BUCKET).getPublicUrl(storagePath);
      return res.json({ url: urlData.publicUrl });
    }

    // ── Local fallback ────────────────────────────────────────────────────────
    const localPath = path.join(VEO_CACHE, `${fileId}.mp4`);
    if (!fs.existsSync(localPath)) {
      const googleUrl = new URL(videoUri);
      googleUrl.searchParams.set("key", key);
      googleUrl.searchParams.set("alt", "media");
      const buffer = await downloadToBuffer(googleUrl.toString());
      fs.writeFileSync(localPath, buffer);
    }
    res.redirect(`/api/veo/file/${fileId}.mp4`);
  } catch (e) {
    console.error("[veo/download]", e.message);
    res.status(500).send(e.message);
  }
});

// GET /api/veo/file/:id — serve a locally cached Veo video (fallback / backward compat)
app.get("/api/veo/file/:id", (req, res) => {
  const filePath = path.join(VEO_CACHE, req.params.id);
  if (!fs.existsSync(filePath)) return res.status(404).send("Video not found");
  res.sendFile(filePath);
});

// ── Video Edit Export ─────────────────────────────────────────────────────────
// Downloads a remote video URL to a temp file
function downloadToTemp(url) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `clip_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
    const file = fs.createWriteStream(tmp);
    const proto = url.startsWith("https") ? require("https") : require("http");
    proto.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(tmp, ()=>{});
        return downloadToTemp(res.headers.location).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(tmp); });
    }).on("error", err => { fs.unlink(tmp, ()=>{}); reject(err); });
  });
}

app.post("/api/videoedit/export", async (req, res) => {
  const { clips, format, audioTrack, mix } = req.body;
  if (!clips || !clips.length) return res.status(400).send("No clips");
  const scale = format === "1080p" ? "1920:1080" : "1280:720";
  const tmpFiles = [];
  const outFile  = path.join(os.tmpdir(), `export_${Date.now()}.mp4`);
  try {
    const runCmd = (cmd) => new Promise((resolve, reject) =>
      exec(cmd, { maxBuffer: 64*1024*1024 }, (err, _out, stderr) =>
        err ? reject(new Error(stderr || err.message)) : resolve()
      )
    );
    const hasAudioStream = async (filePath) => {
      try {
        await runCmd(`ffprobe -v error -select_streams a:0 -show_entries stream=index -of csv=p=0 "${filePath}"`);
        return true;
      } catch {
        return false;
      }
    };
    const decodeDataUrlToTemp = async (dataUrl, fileName = "audio-track") => {
      const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl || "");
      if (!match) throw new Error("Invalid audio track data URL");
      const mime = match[1].toLowerCase();
      const base64 = match[2];
      const extMap = {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a",
        "audio/aac": ".aac",
        "audio/ogg": ".ogg",
        "audio/webm": ".webm",
      };
      const ext = extMap[mime] || path.extname(fileName || "") || ".bin";
      const tempPath = path.join(os.tmpdir(), `videoedit_audio_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
      fs.writeFileSync(tempPath, Buffer.from(base64, "base64"));
      tmpFiles.push(tempPath);
      return tempPath;
    };
    // Resolve each clip URL to a local file path
    const resolved = [];
    for (const clip of clips) {
      if (!clip.url) throw new Error("Clip missing videoUrl — generate video first");
      let filePath;
      if (clip.url.includes("/api/veo/file/")) {
        // Legacy local cache path
        const fileId = clip.url.replace(/.*\/api\/veo\/file\//, "");
        filePath = path.join(VEO_CACHE, `${fileId}.mp4`);
        if (!fs.existsSync(filePath)) throw new Error(`VEO video not cached locally: ${fileId} — please regenerate`);
      } else {
        // Remote URL (Kling CDN, Supabase public URL, etc.) — download first
        filePath = await downloadToTemp(clip.url);
        tmpFiles.push(filePath);
      }
      resolved.push({
        path: filePath,
        trimStart: clip.trimStart || 0,
        trimEnd: clip.trimEnd || 0,
        duration: clip.duration || 8,
        hasAudio: false,
      });
    }
    for (const clip of resolved) {
      clip.hasAudio = await hasAudioStream(clip.path);
    }

    let audioTrackPath = null;
    if (audioTrack?.dataUrl) {
      audioTrackPath = await decodeDataUrlToTemp(audioTrack.dataUrl, audioTrack.fileName);
    } else if (audioTrack?.url) {
      audioTrackPath = await downloadToTemp(audioTrack.url);
      tmpFiles.push(audioTrackPath);
    }

    // Build ffmpeg filter_complex for trim + scale + concat + optional audio mix
    const inputs = resolved.map(c => `-i "${c.path}"`).join(" ");
    const extraInputs = audioTrackPath ? ` -i "${audioTrackPath}"` : "";
    const videoVolume = Math.max(0, Math.min(2, Number(mix?.videoVolume ?? 1)));
    const soundtrackVolume = Math.max(0, Math.min(2, Number(mix?.soundtrackVolume ?? 1)));
    const totalDuration = resolved.reduce((sum, c) => sum + Math.max(0.5, c.duration - c.trimStart - c.trimEnd), 0);

    const vFilters = resolved.map((c, i) => {
      const ss  = c.trimStart;
      const dur = Math.max(0.5, c.duration - c.trimStart - c.trimEnd);
      return `[${i}:v]trim=start=${ss}:duration=${dur},setpts=PTS-STARTPTS,scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2:black[v${i}]`;
    }).join(";");
    const aFilters = resolved.map((c, i) => {
      const ss  = c.trimStart;
      const dur = Math.max(0.5, c.duration - c.trimStart - c.trimEnd);
      if (c.hasAudio) {
        return `[${i}:a]atrim=start=${ss}:duration=${dur},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,volume=${videoVolume}[a${i}]`;
      }
      return `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${dur},asetpts=PTS-STARTPTS,volume=${videoVolume}[a${i}]`;
    }).join(";");
    const concatV     = resolved.map((_,i)=>`[v${i}]`).join("");
    const concatA     = resolved.map((_,i)=>`[a${i}]`).join("");
    const trackTrim = audioTrack?.trim || {};
    const trackStart = Math.max(0, Number(trackTrim.start || 0));
    const trackEnd = Math.max(0, Number(trackTrim.end || 0));
    const trackOffset = Math.max(0, Number(trackTrim.offset || 0));
    const trackDelayMs = Math.round(trackOffset * 1000);
    const trackVisibleDuration = audioTrack?.duration
      ? Math.max(0.1, Number(audioTrack.duration) - trackStart - trackEnd)
      : Math.max(0.1, totalDuration);

    let filterComplex = `${vFilters};${aFilters};${concatV}concat=n=${resolved.length}:v=1:a=0[vout];${concatA}concat=n=${resolved.length}:v=0:a=1[aVid]`;
    if (audioTrackPath) {
      const trackInputIndex = resolved.length;
      filterComplex += `;[${trackInputIndex}:a]atrim=start=${trackStart}:duration=${trackVisibleDuration},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,volume=${soundtrackVolume},adelay=${trackDelayMs}|${trackDelayMs},atrim=duration=${Math.max(0.1, totalDuration)}[aTrack];[aVid][aTrack]amix=inputs=2:duration=first:dropout_transition=0[aout]`;
    } else {
      filterComplex += `;[aVid]anull[aout]`;
    }

    const cmd = `ffmpeg -y ${inputs}${extraInputs} -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" -c:v libx264 -crf 18 -preset fast -c:a aac "${outFile}"`;
    await runCmd(cmd);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="export_${format}.mp4"`);
    const stream = fs.createReadStream(outFile);
    stream.pipe(res);
    stream.on("end", () => {
      fs.unlink(outFile, ()=>{});
      tmpFiles.forEach(f => fs.unlink(f, ()=>{}));
    });
  } catch(e) {
    tmpFiles.forEach(f => fs.unlink(f, ()=>{}));
    fs.unlink(outFile, ()=>{});
    const msg = e.message || String(e);
    if (msg.includes("ffmpeg") && msg.includes("not found")) {
      res.status(500).json({ error:"FFmpeg not installed. Install it with: brew install ffmpeg (macOS) or sudo apt install ffmpeg (Linux)" });
    } else {
      res.status(500).json({ error: msg });
    }
  }
});

// ── ASSETS API (Supabase Storage) ─────────────────────────────────────────────

// Serve legacy local asset files (backward compat for dev)
app.use("/api/assets/file", express.static(ASSETS_ROOT));

// List all assets — query Supabase assets table, fallback to local disk
app.get("/api/assets/list", async (req, res) => {
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
  if (SUPABASE_URL && token) {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const sb = supabaseFor(token);
      const { data, error } = await sb.from("assets").select("*")
        .eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      const result = {};
      ASSET_TYPES.forEach(t => { result[t] = []; });
      (data || []).forEach(row => {
        if (!result[row.type]) result[row.type] = [];
        result[row.type].push({
          id: row.id, name: row.name, url: row.url,
          size: row.size, createdAt: new Date(row.created_at).getTime(),
          ...(row.type === "text" ? { content: row.content } : {}),
        });
      });
      return res.json(result);
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }
  // Local fallback (dev without Supabase)
  try {
    const result = {};
    for (const type of ASSET_TYPES) {
      const dir = path.join(ASSETS_ROOT, type);
      const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
      result[type] = files.map(name => {
        const filePath = path.join(dir, name);
        const stat = fs.statSync(filePath);
        const meta = { id: name, name, url: `/api/assets/file/${type}/${encodeURIComponent(name)}`, size: stat.size, createdAt: stat.birthtimeMs };
        if (type === "text") { try { meta.content = fs.readFileSync(filePath, "utf8"); } catch(_) {} }
        return meta;
      }).sort((a, b) => b.createdAt - a.createdAt);
    }
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Upload binary asset (images / videos / audio) — Supabase Storage, fallback to local disk
app.post("/api/assets/upload/:type", uploadMem.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const type = req.params.type;
  if (!ASSET_TYPES.includes(type)) return res.status(400).json({ error: "Invalid asset type" });
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");

  if (SUPABASE_URL && token) {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const safe = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userId}/${type}/${Date.now()}_${safe}`;
      // Upload via admin client so we bypass storage RLS (path scoped by userId)
      const client = supabaseAdmin || supabaseFor(token);
      const { error: upErr } = await client.storage.from(ASSET_BUCKET)
        .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = client.storage.from(ASSET_BUCKET).getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;
      // Save metadata to assets table
      const sb = supabaseFor(token);
      const { data: row, error: dbErr } = await sb.from("assets").insert({
        user_id: userId, type, name: req.file.originalname,
        storage_path: storagePath, url: publicUrl, size: req.file.size,
      }).select().single();
      if (dbErr) throw dbErr;
      return res.json({ id: row.id, name: row.name, url: publicUrl, size: row.size });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }
  // Local fallback
  const safe = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}_${safe}`;
  const filePath = path.join(ASSETS_ROOT, type, filename);
  fs.writeFileSync(filePath, req.file.buffer);
  res.json({ id: filename, name: filename, url: `/api/assets/file/${type}/${encodeURIComponent(filename)}`, size: req.file.size });
});

// Save / update a text asset
app.post("/api/assets/text", async (req, res) => {
  const { name, content, id } = req.body;
  if (!name || content === undefined) return res.status(400).json({ error: "name and content required" });
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");

  if (SUPABASE_URL && token) {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const sb = supabaseFor(token);
      if (id) {
        // Update existing
        const { data: row, error } = await sb.from("assets")
          .update({ name, content }).eq("id", id).eq("user_id", userId).select().single();
        if (error) throw error;
        return res.json({ id: row.id, name: row.name, url: row.url, content });
      } else {
        const { data: row, error } = await sb.from("assets").insert({
          user_id: userId, type: "text", name, content, url: null, size: Buffer.byteLength(content),
        }).select().single();
        if (error) throw error;
        return res.json({ id: row.id, name: row.name, url: row.url, content });
      }
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }
  // Local fallback
  const filename = id || `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, "_")}.txt`;
  const filePath = path.join(ASSETS_ROOT, "text", filename);
  try {
    fs.writeFileSync(filePath, content, "utf8");
    res.json({ id: filename, name: filename, url: `/api/assets/file/text/${encodeURIComponent(filename)}`, content });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Delete an asset
app.delete("/api/assets/:type/:assetId", async (req, res) => {
  const { type, assetId } = req.params;
  if (!ASSET_TYPES.includes(type)) return res.status(400).json({ error: "Invalid type" });
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");

  if (SUPABASE_URL && token) {
    try {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const sb = supabaseFor(token);
      // Fetch the row first to get storage_path
      const { data: row } = await sb.from("assets").select("storage_path")
        .eq("id", assetId).eq("user_id", userId).single();
      if (row?.storage_path) {
        const client = supabaseAdmin || sb;
        await client.storage.from(ASSET_BUCKET).remove([row.storage_path]);
      }
      await sb.from("assets").delete().eq("id", assetId).eq("user_id", userId);
      return res.json({ ok: true });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }
  // Local fallback (assetId is filename in local mode)
  const filePath = path.join(ASSETS_ROOT, type, assetId);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SCRIPT: extract text from uploaded document ───────────────────────────────
const PDFParser = require("pdf2json");
const mammoth   = require("mammoth");
const multerMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function parsePdf(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1); // 1 = raw text mode
    parser.on("pdfParser_dataReady", () => resolve(parser.getRawTextContent()));
    parser.on("pdfParser_dataError", (err) => reject(new Error(err.parserError || "PDF parse error")));
    parser.parseBuffer(buffer);
  });
}

app.post("/api/script/extract", multerMem.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const { originalname, buffer } = req.file;
  const ext = path.extname(originalname).toLowerCase();
  try {
    let text = "";
    if (ext === ".pdf") {
      text = await parsePdf(buffer);
    } else if (ext === ".docx" || ext === ".doc") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      // .txt, .odt, .md — plain text
      text = buffer.toString("utf8");
    }
    res.json({ text: text.trim() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SCRIPT: generate full script from idea ────────────────────────────────────
app.post("/api/script/generate", async (req, res) => {
  const { idea, format = "screenplay" } = req.body;
  if (!idea) return res.status(400).json({ error: "idea is required" });

  const formatGuide = format === "screenplay"
    ? `Write a short film screenplay in standard Hollywood format. Use INT./EXT. scene headings (e.g. "INT. CAFÉ - DAY"), action lines and dialogue. Keep it to 3–6 scenes.`
    : `Write a short film treatment / narrative script. Each scene starts with a heading like "SCENE 1:" followed by prose description and dialogue. Keep it to 3–6 scenes.`;

  const prompt = `${formatGuide}\n\nIDEA: ${idea}\n\nWrite the full script now. Be vivid, cinematic, and concise.`;

  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
    const r = await post("api.anthropic.com", "/v1/messages",
      { "x-api-key": key, "anthropic-version": "2023-06-01" },
      { model: "claude-sonnet-4-5", max_tokens: 4096,
        messages: [{ role: "user", content: prompt }] }
    );
    const body = JSON.parse(r.data);
    const text = body.content?.[0]?.text || "";
    res.json({ script: text });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SCRIPT: split script into scenes ─────────────────────────────────────────
app.post("/api/script/split", async (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: "script is required" });

  const prompt = `You are a script breakdown assistant. Given the following script, extract each scene and return a JSON array. Each item must have:
- "heading": the scene heading or title (e.g. "INT. CAFÉ - DAY" or "SCENE 1: The Arrival")
- "sceneText": a 2–4 sentence description of what happens in the scene, suitable for a storyboard brief
- "shotCount": suggested number of shots (integer, between 2 and 6)
- "cinematicStyle": one of: drama, thriller, action, noir, sci-fi, epic-fantasy, documentary, comedy
- "dialogueLines": an array of objects, one per spoken line in this scene, each with:
  - "speaker": the character name or tag (e.g. "@hero", "ELENA") — use the exact tag if it matches a @tag in the script, otherwise use the character name in ALL CAPS
  - "line": the exact spoken line as written in the script
  If the scene has no dialogue, return an empty array.

Return ONLY valid JSON array, no markdown, no explanation.

SCRIPT:
${script}`;

  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: "OPENAI_API_KEY not set" });
    const r = await post("api.openai.com", "/v1/responses",
      { "Authorization": `Bearer ${key}` },
      { model: "gpt-5.4-nano", max_output_tokens: 2048,
        input: [{ role: "user", content: prompt }] }
    );
    const body = JSON.parse(r.data);
    const outputBlock = body.output?.find(o => o.type === "message");
    let text = outputBlock?.content?.find(c => c.type === "output_text")?.text || "[]";
    text = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
    const scenes = JSON.parse(text);
    res.json({ scenes });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ElevenLabs Video-to-Music ─────────────────────────────────────────────────
// (downloadToBuffer is defined near the top of the file — shared utility)

// POST /api/elevenlabs/video-to-music
// Body: { videoUrl: string, description?: string, tags?: string[], duration?: number }
// Server downloads the video, sends as multipart to ElevenLabs, streams audio back
app.post("/api/elevenlabs/video-to-music", async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(500).json({ error: "ELEVENLABS_API_KEY not set" });
  const userId = await getUserId(req);
  if (userId && supabaseAdmin) {
    const result = await deductCredits(userId, OP_CREDITS.music_video_sync, "music_video_sync");
    if (!result.ok) return res.status(402).json({
      error: "insufficient_credits", credits_balance: result.balance, credits_needed: OP_CREDITS.music_video_sync,
    });
  }
  const { videoUrl, description = "", tags = [] } = req.body;
  if (!videoUrl) return res.status(400).json({ error: "videoUrl required" });
  try {
    const videoBuffer = await downloadToBuffer(videoUrl);
    const ext  = (videoUrl.split("?")[0].split(".").pop() || "mp4").toLowerCase();
    const mime = ext === "webm" ? "video/webm" : ext === "mov" ? "video/quicktime" : "video/mp4";
    const fname = `video.${ext}`;
    console.log(`[elevenlabs/video-to-music] sending ${videoBuffer.length} bytes as ${mime} (${fname})`);

    const boundary = `----ELBoundary${crypto.randomBytes(8).toString("hex")}`;
    const CRLF     = "\r\n";

    const textPart = (name, value) =>
      Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`);
    const filePart = (name, buf, filename, mimetype) =>
      Buffer.concat([
        Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"; filename="${filename}"${CRLF}Content-Type: ${mimetype}${CRLF}${CRLF}`),
        buf,
        Buffer.from(CRLF),
      ]);

    const parts = [ filePart("videos", videoBuffer, fname, mime) ];
    if (description) parts.push(textPart("description", description));
    const tagList = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    tagList.forEach(t => { if (t) parts.push(textPart("tags", t)); });
    const closing = Buffer.from(`--${boundary}--${CRLF}`);
    const body    = Buffer.concat([...parts, closing]);

    const upstream = https.request({
      hostname: "api.elevenlabs.io",
      path:     "/v1/music/video-to-music?output_format=mp3_44100_128",
      method:   "POST",
      headers: {
        "xi-api-key":   key,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    }, upRes => {
      console.log(`[elevenlabs/video-to-music] ${upRes.statusCode}`);
      if (upRes.statusCode !== 200) {
        let err = "";
        upRes.on("data", c => { err += c; });
        upRes.on("end",  () => {
          console.error("[elevenlabs/video-to-music] error body:", err);
          res.status(upRes.statusCode).json({ error: err.slice(0, 600) });
        });
        return;
      }
      const ct = upRes.headers["content-type"] || "audio/mpeg";
      const audioChunks = [];
      upRes.on("data", c => audioChunks.push(c));
      upRes.on("end", () => {
        const audioBuf = Buffer.concat(audioChunks);
        console.log(`[elevenlabs/video-to-music] 200 OK — audio size: ${audioBuf.length} bytes, content-type: ${ct}`);
        res.setHeader("Content-Type", ct);
        res.end(audioBuf);
      });
    });
    upstream.on("error", e => res.status(500).json({ error: e.message }));
    upstream.write(body);
    upstream.end();
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ElevenLabs Music Generation ───────────────────────────────────────────────
// POST /api/elevenlabs/music
// Body: { prompt: string, tags: string[] }
// Returns: audio/mpeg binary streamed directly from ElevenLabs
app.post("/api/elevenlabs/music", async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(500).json({ error: "ELEVENLABS_API_KEY not set" });
  const userId = await getUserId(req);
  if (userId && supabaseAdmin) {
    const result = await deductCredits(userId, OP_CREDITS.music_gen, "music_gen");
    if (!result.ok) return res.status(402).json({
      error: "insufficient_credits", credits_balance: result.balance, credits_needed: OP_CREDITS.music_gen,
    });
  }
  const { prompt = "", tags = [], duration = 30 } = req.body;
  // ElevenLabs compose uses "music_length_ms" in milliseconds (3000–600000)
  const durationMs = Math.max(3000, Math.min(600000, Math.round(Number(duration) * 1000)));
  // prompt must be non-empty; fall back to a neutral cinematic default
  const finalPrompt = (prompt && prompt.trim()) ? prompt.trim() : "cinematic film score";
  const payload = JSON.stringify({
    prompt: finalPrompt,
    music_length_ms: durationMs,
    ...(tags.length > 0 ? { tags } : {}),
  });

  const options = {
    hostname: "api.elevenlabs.io",
    path: "/v1/music/compose",
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  console.log(`[elevenlabs/music] payload:`, payload);
  const upstream = https.request(options, (upRes) => {
    console.log(`[elevenlabs/music] ${upRes.statusCode}`);
    if (upRes.statusCode !== 200) {
      let errBody = "";
      upRes.on("data", c => { errBody += c; });
      upRes.on("end", () => {
        console.error(`[elevenlabs/music] error body:`, errBody);
        res.status(upRes.statusCode).json({ error: errBody.slice(0, 600) });
      });
      return;
    }
    res.setHeader("Content-Type", upRes.headers["content-type"] || "audio/mpeg");
    upRes.pipe(res);
  });

  upstream.on("error", e => res.status(500).json({ error: e.message }));
  upstream.write(payload);
  upstream.end();
});

// ── SUBSCRIPTION / BILLING ENDPOINTS ──────────────────────────────────────────

// GET /api/user/credits — returns current balance, tier, monthly allowance
app.get("/api/user/credits", async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  // Owner bypass — report unlimited studio credits so UI shows no warnings
  const email = await getUserEmail(userId);
  if (email && BYPASS_EMAILS.has(email)) {
    return res.json({ tier: "studio", credits_balance: 999999, credits_monthly: 999999, op_costs: OP_CREDITS });
  }
  const sub = await getUserSub(userId);
  if (!sub) return res.json({ tier: "free", credits_balance: 0, credits_monthly: 80 });
  res.json({
    tier:             sub.tier,
    credits_balance:  sub.credits_balance,
    credits_monthly:  sub.credits_monthly,
    current_period_end: sub.current_period_end,
    op_costs:         OP_CREDITS,
  });
});

// GET /api/stripe/public-pricing — public pricing metadata for landing / pricing UI
app.get("/api/stripe/public-pricing", async (_req, res) => {
  const fallback = {
    tiers: [
      { tier:"free",   label:"Free",   priceDisplay:"$0",  credits:TIER_CREDITS.free,   features:TIER_FEATURES.free, interval:"month" },
      { tier:"indie",  label:"Indie",  priceDisplay:"$19", credits:TIER_CREDITS.indie,  features:TIER_FEATURES.indie, interval:"month" },
      { tier:"pro",    label:"Pro",    priceDisplay:"$49", credits:TIER_CREDITS.pro,    features:TIER_FEATURES.pro, interval:"month" },
      { tier:"studio", label:"Studio", priceDisplay:"$99", credits:TIER_CREDITS.studio, features:TIER_FEATURES.studio, interval:"month" },
    ],
    topups: [
      { pack:"500",  label:"500 credits",  priceDisplay:"$9.99",  description:TOPUP_DESCRIPTIONS["500"] },
      { pack:"1500", label:"1500 credits", priceDisplay:"$24.99", description:TOPUP_DESCRIPTIONS["1500"] },
      { pack:"4000", label:"4000 credits", priceDisplay:"$59.99", description:TOPUP_DESCRIPTIONS["4000"] },
    ],
  };
  if (!stripe) return res.json(fallback);

  try {
    const paidTiers = Object.entries(STRIPE_PRICES).filter(([, priceId]) => !!priceId);
    const [stripeTierPrices, stripeTopups] = await Promise.all([
      Promise.all(paidTiers.map(async ([tier, priceId]) => {
        const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
        const product = price?.product && typeof price.product === "object" ? price.product : null;
        return {
          tier,
          label: product?.name || TIER_LABELS[tier] || tier,
          priceDisplay: formatStripeMoney(price?.unit_amount, price?.currency),
          credits: TIER_CREDITS[tier],
          features: TIER_FEATURES[tier] || [],
          description: product?.description || "",
          interval: price?.recurring?.interval || "month",
          priceId: price?.id || priceId,
        };
      })),
      Promise.all(Object.entries(TOPUP_PRICES).filter(([, priceId]) => !!priceId).map(async ([pack, priceId]) => {
        const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
        const product = price?.product && typeof price.product === "object" ? price.product : null;
        return {
          pack,
          label: product?.name || `${pack} credits`,
          priceDisplay: formatStripeMoney(price?.unit_amount, price?.currency),
          description: product?.description || TOPUP_DESCRIPTIONS[pack] || "",
          priceId: price?.id || priceId,
        };
      })),
    ]);

    const tierOrder = ["free", "indie", "pro", "studio"];
    const mergedTierMap = new Map(fallback.tiers.map(t => [t.tier, t]));
    stripeTierPrices.forEach(t => {
      mergedTierMap.set(t.tier, { ...mergedTierMap.get(t.tier), ...t });
    });
    const tiers = tierOrder
      .map(tier => mergedTierMap.get(tier))
      .filter(Boolean);

    const mergedTopupMap = new Map(fallback.topups.map(t => [t.pack, t]));
    stripeTopups.forEach(pack => {
      mergedTopupMap.set(pack.pack, { ...mergedTopupMap.get(pack.pack), ...pack });
    });
    const topups = Array.from(mergedTopupMap.values())
      .sort((a, b) => Number(a.pack) - Number(b.pack));

    return res.json({ tiers, topups });
  } catch (err) {
    console.error("[stripe-public-pricing]", err.message);
    return res.json(fallback);
  }
});

// POST /api/stripe/checkout — create Stripe Checkout session for a given tier
app.post("/api/stripe/checkout", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { tier } = req.body;
  const priceId = STRIPE_PRICES[tier];
  if (!priceId) return res.status(400).json({ error: `No price configured for tier: ${tier}` });

  const sub = await getUserSub(userId);
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;

  // Reuse existing Stripe customer or create new one
  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } });
    customerId = customer.id;
    await supabaseAdmin.from("user_subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId);
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?payment=success&tier=${tier}`,
    cancel_url:  `${appUrl}/?payment=cancelled`,
    metadata:    { supabase_user_id: userId, tier },
    subscription_data: { metadata: { supabase_user_id: userId, tier } },
    allow_promotion_codes: true,
  });
  res.json({ url: session.url });
});

// POST /api/stripe/portal — Stripe Customer Portal (manage/cancel subscription)
app.post("/api/stripe/portal", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const sub = await getUserSub(userId);
  if (!sub?.stripe_customer_id)
    return res.status(400).json({ error: "No Stripe customer found" });
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const session = await stripe.billingPortal.sessions.create({
    customer:   sub.stripe_customer_id,
    return_url: appUrl,
  });
  res.json({ url: session.url });
});

// POST /api/stripe/topup — buy a credit pack (one-time payment)
app.post("/api/stripe/topup", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { pack } = req.body; // "500", "1500", "4000"
  const priceId = TOPUP_PRICES[pack];
  if (!priceId) return res.status(400).json({ error: `Unknown pack: ${pack}` });
  const sub = await getUserSub(userId);
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const session = await stripe.checkout.sessions.create({
    customer:    sub?.stripe_customer_id || undefined,
    mode:        "payment",
    line_items:  [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?payment=topup_success&pack=${pack}`,
    cancel_url:  `${appUrl}/?payment=cancelled`,
    metadata:    { supabase_user_id: userId, topup_credits: pack },
  });
  res.json({ url: session.url });
});

// POST /api/stripe/webhook — Stripe events (raw body required)
app.post("/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe) return res.status(500).send("Stripe not configured");
    const sig = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error("[stripe-webhook] signature failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const data = event.data.object;
    console.log("[stripe-webhook]", event.type);

    // ── Subscription activated / renewed ──────────────────────────────────────
    if (event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated") {
      const tier = data.metadata?.tier || "indie";
      const userId = data.metadata?.supabase_user_id;
      if (!userId) { console.warn("[stripe-webhook] no supabase_user_id in metadata"); return res.json({ received: true }); }
      const monthly = TIER_CREDITS[tier] || 900;
      const periodEnd = new Date(data.current_period_end * 1000).toISOString();

      // On renewal (new period), reset credits; on update just change tier
      const isNewPeriod = event.type === "customer.subscription.created" ||
        data.billing_cycle_anchor === data.current_period_start;

      await supabaseAdmin.from("user_subscriptions").upsert({
        user_id:                userId,
        tier,
        credits_monthly:        monthly,
        credits_balance:        isNewPeriod ? monthly : undefined,
        stripe_customer_id:     data.customer,
        stripe_subscription_id: data.id,
        stripe_price_id:        data.items?.data?.[0]?.price?.id,
        current_period_end:     periodEnd,
        updated_at:             new Date().toISOString(),
      }, { onConflict: "user_id", ignoreDuplicates: false });

      if (isNewPeriod) {
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: userId, amount: monthly, operation: "monthly_reset",
          metadata: { tier, period_end: periodEnd },
        });
      }
    }

    // ── Subscription cancelled ────────────────────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const userId = data.metadata?.supabase_user_id;
      if (userId) {
        await supabaseAdmin.from("user_subscriptions").update({
          tier: "free", credits_monthly: 80,
          stripe_subscription_id: null, stripe_price_id: null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }
    }

    // ── One-time top-up payment ───────────────────────────────────────────────
    if (event.type === "checkout.session.completed" && data.mode === "payment") {
      const userId  = data.metadata?.supabase_user_id;
      const credits = parseInt(data.metadata?.topup_credits || "0", 10);
      if (userId && credits > 0) {
        const sub = await getUserSub(userId);
        const newBalance = (sub?.credits_balance || 0) + credits;
        await supabaseAdmin.from("user_subscriptions")
          .update({ credits_balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: userId, amount: credits, operation: "topup",
          metadata: { pack: credits, session_id: data.id },
        });
      }
    }

    res.json({ received: true });
  }
);

app.get("/health", (req, res) => res.json({ ok: true, node: process.version,
  anthropic: !!process.env.ANTHROPIC_API_KEY, openai: !!process.env.OPENAI_API_KEY,
  gemini: !!process.env.GEMINI_API_KEY, kling: !!process.env.KLING_ACCESS_KEY,
  elevenlabs: !!process.env.ELEVENLABS_API_KEY,
  stripe: !!process.env.STRIPE_SECRET_KEY }));

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";
const SITE_ORIGIN = (process.env.APP_URL || "https://www.cartasis.com").replace(/\/$/, "");
const SITE_HOSTNAME = (() => {
  try { return new URL(SITE_ORIGIN).hostname; } catch { return ""; }
})();

// ─── PER-PAGE SEO META ────────────────────────────────────────────────────────
// Each route gets its own <title>, <description>, og:*, twitter:* and JSON-LD.
// This lets Google see the right metadata for /pricing and /features instead of
// always getting the homepage copy.
const PAGE_META = {
  "/": {
    title: "Cartasis - From Script to Storyboard to Video",
    description: "Cartasis helps AI filmmakers plan scenes, shots, references, and continuity before generation. Turn scripts into structured visual workflows before rendering with AI tools.",
    ogTitle: "Cartasis - From Script to Storyboard to Video",
    ogDescription: "Plan scenes, shots, references, and continuity before generation. Cartasis is the visual workflow for AI filmmakers.",
    canonical: `${SITE_ORIGIN}/`,
  },
  "/pricing": {
    title: "Cartasis Pricing — Free Plan + AI Credits | From $0 to $99/mo",
    description: "Start free with 80 AI credits/mo. Scale to Indie ($19/mo, 900 credits), Pro ($49/mo, 2500 credits), or Studio ($99/mo, 6000 credits). Generate videos with Kling AI & Google Veo, create images, add lipsync, and compose music.",
    ogTitle: "Cartasis Pricing — Transparent AI Video Plans",
    ogDescription: "Start free. Generate AI videos with Kling & Veo, create images, compose music. No hidden fees — just credits. Plans from $0 to $99/mo.",
    canonical: `${SITE_ORIGIN}/pricing`,
    ldJson: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Cartasis",
      "url": SITE_ORIGIN,
      "description": "AI-powered cinematic production canvas — script to finished video in one workflow.",
      "offers": [
        { "@type":"Offer", "name":"Free",   "price":"0",  "priceCurrency":"USD", "description":"80 credits/mo, Kling Standard, watermark, 2 projects" },
        { "@type":"Offer", "name":"Indie",  "price":"19", "priceCurrency":"USD", "description":"900 credits/mo, all Kling + Lipsync, Veo Fast, 10 projects, no watermark" },
        { "@type":"Offer", "name":"Pro",    "price":"49", "priceCurrency":"USD", "description":"2500 credits/mo, all Kling + all Veo, 30 projects, all AI features" },
        { "@type":"Offer", "name":"Studio", "price":"99", "priceCurrency":"USD", "description":"6000 credits/mo, everything, unlimited projects, all AI features" },
      ],
    }),
  },
  "/features": {
    title: "Cartasis Features — Node-Based AI Video Canvas | All AI Tools in One Place",
    description: "Explore every Cartasis feature: AI script writing, cinematic shot planning, world bible for character consistency, Kling AI & Google Veo video generation, lipsync, AI music with ElevenLabs, and multi-node video editing.",
    ogTitle: "Cartasis Features — The Complete AI Filmmaker's Toolkit",
    ogDescription: "Node-based AI video production: script → scene → shot → image → video → lipsync → music → edit. Everything a director needs, powered by Kling, Veo, and ElevenLabs.",
    canonical: `${SITE_ORIGIN}/features`,
  },
  "/kling-video-generation": {
    title: "Kling Video Generation in Cartasis | Directed AI Video Workflow",
    description: "Generate Kling video inside Cartasis with scene, shot, and world bible context. Plan shots, compile prompts, attach references, and direct Kling video generation from one cinematic canvas.",
    ogTitle: "Kling Video Generation in Cartasis",
    ogDescription: "Use Cartasis for Kling video generation with shot planning, prompt compilation, reference continuity, and edit-ready outputs.",
    canonical: `${SITE_ORIGIN}/kling-video-generation`,
  },
  "/kling-3-0": {
    title: "Kling 3.0 in Cartasis | Scene-to-Shot AI Video Workflow",
    description: "See how Cartasis uses Kling 3.0 inside a production workflow built around scenes, shots, references, and story structure instead of isolated prompts.",
    ogTitle: "Kling 3.0 in Cartasis",
    ogDescription: "Cartasis wraps Kling 3.0 in a node-based workflow for directed video generation, continuity, and iteration.",
    canonical: `${SITE_ORIGIN}/kling-3-0`,
  },
  "/kling-lipsync": {
    title: "Kling Lipsync in Cartasis | Dialogue-Driven Shot Workflow",
    description: "Plan dialogue shots, manage speaking turns, and run Kling lipsync inside Cartasis with shot timing, character context, and generation history in one canvas.",
    ogTitle: "Kling Lipsync in Cartasis",
    ogDescription: "Use Cartasis to connect dialogue, shot timing, and Kling lipsync inside one production graph.",
    canonical: `${SITE_ORIGIN}/kling-lipsync`,
  },
  "/workspace": {
    title: "Cartasis - From Script to Storyboard to Video",
    description: "Your Cartasis production canvas. Write scripts, plan scenes and shots, generate AI images, produce videos with Kling & Veo, add lipsync, compose music, and edit — all in one workflow.",
    ogTitle: "Cartasis Workspace",
    ogDescription: "Your AI director's canvas. Script to finished video in one place.",
    canonical: `${SITE_ORIGIN}/workspace`,
  },
};

function injectPageMeta(html, path) {
  const meta = PAGE_META[path] || PAGE_META["/"];
  const inject = `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <link rel="canonical" href="${meta.canonical}" />
    <meta property="og:url" content="${meta.canonical}" />
    <meta property="og:title" content="${meta.ogTitle}" />
    <meta property="og:description" content="${meta.ogDescription}" />
    <meta name="twitter:title" content="${meta.ogTitle}" />
    <meta name="twitter:description" content="${meta.ogDescription}" />
    ${meta.ldJson ? `<script type="application/ld+json">${meta.ldJson}</script>` : ""}
  `;
  // Replace the existing <title> tag (and everything up to </title>) with our injected block
  return html.replace(/<title>[\s\S]*?<\/title>/, inject);
}

async function start() {
  if (isProd) {
    app.use((req, res, next) => {
      const rawHost = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
      const rawProto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
      const hostNoPort = rawHost.replace(/:\d+$/, "");
      if (hostNoPort && SITE_HOSTNAME && hostNoPort !== SITE_HOSTNAME && hostNoPort === "cartasis.com" && SITE_HOSTNAME === "www.cartasis.com") {
        return res.redirect(301, `${SITE_ORIGIN}${req.originalUrl || "/"}`);
      }
      if (hostNoPort && SITE_HOSTNAME && rawProto === "http" && SITE_ORIGIN.startsWith("https://") && hostNoPort === SITE_HOSTNAME) {
        return res.redirect(301, `${SITE_ORIGIN}${req.originalUrl || "/"}`);
      }
      next();
    });

    // Production: serve pre-built static files from dist/
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    // SPA fallback — inject per-page meta then serve index.html
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        const fs = require("fs");
        const indexPath = path.join(distPath, "index.html");
        try {
          const raw = fs.readFileSync(indexPath, "utf8");
          const html = injectPageMeta(raw, req.path);
          res.setHeader("Content-Type", "text/html");
          res.send(html);
        } catch {
          res.sendFile(indexPath);
        }
      }
    });
  } else {
    // Development: use Vite middleware (hot reload etc.)
    const { createServer: createViteServer } = require("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`\n✅  http://localhost:${PORT}  (Node ${process.version})`);
    console.log(`   MODE      : ${isProd ? "production" : "development"}`);
    console.log(`   ANTHROPIC : ${process.env.ANTHROPIC_API_KEY  ? "✓" : "✗ not set"}`);
    console.log(`   GEMINI    : ${process.env.GEMINI_API_KEY     ? "✓" : "✗ not set"}`);
    console.log(`   KLING     : ${process.env.KLING_ACCESS_KEY   ? "✓" : "✗ not set"}`);
    console.log(`\n   Open http://localhost:${PORT}\n`);
  });
}

start().catch(console.error);
