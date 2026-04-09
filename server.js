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

// POST /api/kling/video  — create video generation task
app.post("/api/kling/video", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  try {
    const r = await post("api-singapore.klingai.com", "/v1/videos/omni-video",
      { "Authorization": `Bearer ${klingJWT()}` }, req.body);
    res.status(r.status).send(r.data);
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/kling/video/:taskId  — poll task status
app.get("/api/kling/video/:taskId", async (req, res) => {
  if (!process.env.KLING_ACCESS_KEY) return res.status(500).send("KLING_ACCESS_KEY not set");
  try {
    const r = await get("api-singapore.klingai.com", `/v1/videos/omni-video/${req.params.taskId}`,
      { "Authorization": `Bearer ${klingJWT()}` });
    res.status(r.status).send(r.data);
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
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).send("GEMINI_API_KEY not set");
  try {
    const r = await post("generativelanguage.googleapis.com",
      `/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key=${key}`,
      {}, req.body);
    res.status(r.status).send(r.data);
  } catch (e) { res.status(500).send(e.message); }
});

// GET /api/veo/video?op=OPERATION_NAME — poll operation status
app.get("/api/veo/video", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).send("GEMINI_API_KEY not set");
  const opName = req.query.op;
  if (!opName) return res.status(400).send("Missing op param");
  try {
    const r = await get("generativelanguage.googleapis.com",
      `/v1beta/${opName}?key=${key}`, {});
    res.status(r.status).send(r.data);
  } catch (e) { res.status(500).send(e.message); }
});

// Helper: download a URL following redirects into a Buffer
function downloadToBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? require("https") : require("http");
    proto.get(url, res => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (!redirectsLeft) return reject(new Error("Too many redirects"));
        return downloadToBuffer(res.headers.location, redirectsLeft - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end",  () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// GET /api/veo/download?uri=VIDEO_URI
// Downloads the Veo video from Google, stores in Supabase Storage (or local cache),
// then returns the public URL as JSON { url } and also redirects to it.
app.get("/api/veo/download", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).send("GEMINI_API_KEY not set");
  const videoUri = req.query.uri;
  if (!videoUri) return res.status(400).send("Missing uri param");
  try {
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
  const { clips, format } = req.body;
  if (!clips || !clips.length) return res.status(400).send("No clips");
  const scale = format === "1080p" ? "1920:1080" : "1280:720";
  const tmpFiles = [];
  const outFile  = path.join(os.tmpdir(), `export_${Date.now()}.mp4`);
  try {
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
      resolved.push({ path: filePath, trimStart: clip.trimStart || 0, trimEnd: clip.trimEnd || 0, duration: clip.duration || 8 });
    }
    // Build ffmpeg filter_complex for trim + scale + concat
    const inputs = resolved.map(c => `-i "${c.path}"`).join(" ");
    const runCmd = (cmd) => new Promise((resolve, reject) =>
      exec(cmd, { maxBuffer: 64*1024*1024 }, (err, _out, stderr) =>
        err ? reject(new Error(stderr || err.message)) : resolve()
      )
    );
    // Build filter for video+audio concat
    const vFilters = resolved.map((c, i) => {
      const ss  = c.trimStart;
      const dur = Math.max(0.5, c.duration - c.trimStart - c.trimEnd);
      return `[${i}:v]trim=start=${ss}:duration=${dur},setpts=PTS-STARTPTS,scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2:black[v${i}]`;
    }).join(";");
    const aFilters = resolved.map((c, i) => {
      const ss  = c.trimStart;
      const dur = Math.max(0.5, c.duration - c.trimStart - c.trimEnd);
      return `[${i}:a]atrim=start=${ss}:duration=${dur},asetpts=PTS-STARTPTS[a${i}]`;
    }).join(";");
    const concatV     = resolved.map((_,i)=>`[v${i}]`).join("");
    const concatA     = resolved.map((_,i)=>`[a${i}]`).join("");
    const filterWithA = `${vFilters};${aFilters};${concatV}${concatA}concat=n=${resolved.length}:v=1:a=1[vout][aout]`;
    const filterNoA   = `${vFilters};${concatV}concat=n=${resolved.length}:v=1:a=0[vout]`;
    const cmdWithA    = `ffmpeg -y ${inputs} -filter_complex "${filterWithA}" -map "[vout]" -map "[aout]" -c:v libx264 -crf 18 -preset fast -c:a aac "${outFile}"`;
    const cmdNoA      = `ffmpeg -y ${inputs} -filter_complex "${filterNoA}"  -map "[vout]" -c:v libx264 -crf 18 -preset fast -an "${outFile}"`;
    // Try with audio; if clips lack audio streams, fall back to video-only
    try {
      await runCmd(cmdWithA);
    } catch(audioErr) {
      if (audioErr.message.includes("Stream specifier") || audioErr.message.includes("matches no streams") ||
          audioErr.message.includes("Invalid stream") || audioErr.message.includes("audio")) {
        await runCmd(cmdNoA);
      } else {
        throw audioErr;
      }
    }
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
    const r = await post("api.anthropic.com", "/v1/messages",
      { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      { model: "claude-opus-4-5", max_tokens: 4096,
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

Return ONLY valid JSON array, no markdown, no explanation.

SCRIPT:
${script}`;

  try {
    const r = await post("api.anthropic.com", "/v1/messages",
      { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      { model: "claude-opus-4-5", max_tokens: 2048,
        messages: [{ role: "user", content: prompt }] }
    );
    const body = JSON.parse(r.data);
    let text = body.content?.[0]?.text || "[]";
    // Strip any accidental markdown fences
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
app.post("/api/elevenlabs/music", (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(500).json({ error: "ELEVENLABS_API_KEY not set" });

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

app.get("/health", (req, res) => res.json({ ok: true, node: process.version,
  anthropic: !!process.env.ANTHROPIC_API_KEY, openai: !!process.env.OPENAI_API_KEY,
  gemini: !!process.env.GEMINI_API_KEY, kling: !!process.env.KLING_ACCESS_KEY,
  elevenlabs: !!process.env.ELEVENLABS_API_KEY }));

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

async function start() {
  if (isProd) {
    // Production: serve pre-built static files from dist/
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    // SPA fallback — all non-API routes serve index.html
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(distPath, "index.html"));
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