import React, { useState, useRef, useCallback, useEffect, createContext, useContext } from "react";
import { Film, Video, Image as ImageIcon, Clapperboard, Camera, User, MapPin, Box, Pencil, Link2, Bot, AlertTriangle, Loader2, X, ChevronDown, Download, Sparkles, Layers, Scissors, BookOpen, Plus, FolderOpen, FileText, FileDown, PanelLeft, LogOut, LogIn, Save, FolderOpen as FolderOpenIcon, ChevronRight, ScrollText, Upload, Wand2, SplitSquareVertical, LayoutTemplate, Music } from "lucide-react";
import { supabase } from "./supabase";
import LandingPage from "./LandingPage";
import FeaturesPage from "./FeaturesPage";
import KlingPage from "./KlingPage";

// Returns { Authorization: "Bearer <token>" } for server asset calls,
// or {} if no session (local/dev mode falls back gracefully on the server).
async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

// ─── ICON HELPER ──────────────────────────────────────────────────────────────
const Ico = ({ icon: Icon, size=10, color, style, sw=1.5 }) =>
  <Icon size={size} color={color} strokeWidth={sw} style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0, ...style }} />;
const KindIcon = ({ kind, size=13, th }) => {
  const c = th?.t2 || "#64748b";
  return kind==="character" ? <Ico icon={User} size={size} color={c}/> : kind==="location" ? <Ico icon={MapPin} size={size} color={c}/> : <Ico icon={Box} size={size} color={c}/>;
};

// ─── THEME ────────────────────────────────────────────────────────────────────
const DARK_TH = {
  bg:    "#121212", card:  "#1a1a1a", card2: "#1e1e1e", card3: "#141414", card4: "#222222",
  b0:    "rgba(255,255,255,0.07)", b1: "rgba(255,255,255,0.10)", b2: "rgba(255,255,255,0.03)",
  t0:    "#e2e8f0", t1:    "#94a3b8", t2:    "#6b7280", t3:    "#4b5563", t4:    "#374151",
  sh:    "rgba(0,0,0,0.65)", sc: "rgba(255,255,255,0.10)", dark: true,
};
const LIGHT_TH = {
  bg:    "#f8f8f8", card:  "#ffffff", card2: "#fafafa", card3: "#f5f5f5", card4: "#efefef",
  b0:    "rgba(0,0,0,0.08)", b1: "rgba(0,0,0,0.05)", b2: "rgba(0,0,0,0.03)",
  t0:    "#0a0a0a", t1:    "#1a1a1a", t2:    "#52525b", t3:    "#a1a1aa", t4:    "#d4d4d8",
  sh:    "rgba(0,0,0,0.08)", sc: "rgba(0,0,0,0.06)", dark: false,
};
const ThemeCtx = createContext(DARK_TH);
const useTheme = () => useContext(ThemeCtx);


// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CINEMATIC_STYLES = ["drama","thriller","action","noir","sci-fi","epic-fantasy","documentary","comedy"];
const VISUAL_STYLE_PRESETS = {
  none: { label:"None", prompt:"" },
  "black-and-white": { label:"Black & White", prompt:"Monochrome black-and-white treatment, rich tonal separation, deep contrast, subtle silver-grain texture. Preserve identity, wardrobe, pose, composition, and lighting intent." },
  "70s-film": { label:"70s Film", prompt:"1970s motion-picture look, analog film stock, warm halation, soft grain, restrained contrast, vintage color bias. Preserve subject identity, wardrobe, and scene composition." },
  "anime-cel": { label:"Anime Cel", prompt:"Anime cel-shaded stylization, clean line work, graphic shapes, expressive color blocking, polished 2D finish. Preserve character identity, silhouette, costume, and camera composition." },
  "graphic-novel": { label:"Graphic Novel", prompt:"Graphic novel treatment with inked contours, bold contrast, selective color accents, and cinematic panel energy. Preserve identity, staging, wardrobe, and environment geometry." },
  "stylized-3d": { label:"Stylized 3D", prompt:"Stylized 3D animated feature look, polished materials, expressive shapes, soft global illumination, premium animation-art finish. Preserve facial identity, costume design, and shot composition." },
  "watercolor": { label:"Watercolor", prompt:"Painterly watercolor illustration, layered washes, soft edges, textured paper feel, elegant color bleed. Preserve identity, silhouette, composition, and environment readability." },
  "16mm-doc": { label:"16mm Documentary", prompt:"16mm documentary film look, organic grain, muted palette, light gate weave, observational realism. Preserve identity, action blocking, and location clarity." },
  "vhs-analog": { label:"VHS Analog", prompt:"Analog VHS transfer look, scan noise, chroma bleed, tape softness, nostalgic low-fidelity image. Preserve identity, blocking, and the original framing." },
  "cgi-cutscene": { label:"CGI Cutscene", prompt:"Cinematic real-time CGI render in the style of a AAA video game cutscene — Unreal Engine 5 quality, photorealistic physically-based materials, subsurface scattering on skin, ultra-detailed textures, dramatic cinematic lighting with volumetric rays, deep cinematic depth of field, hero-quality character rendering. The image should feel like a paused frame from a God of War or The Last of Us cutscene. Preserve identity, costume, environment geometry, and camera composition." },
};
const VISUAL_STYLES = Object.keys(VISUAL_STYLE_PRESETS);
const CAMERA_SIZES = ["extreme-wide","wide","medium-wide","medium","medium-close","close-up","extreme-close-up"];
const CAMERA_ANGLES = ["eye-level","high-angle","low-angle","over-the-shoulder","top-down","dutch"];
const CAMERA_MOVEMENTS = ["static","slow-push-in","pull-back","pan","tilt","tracking","handheld","crane-like"];
const LIGHTING_STYLES = ["natural-soft","hard-contrast","low-key","high-key","practical-night","backlit","silhouetted"];
const styleColor = { drama:"#c084fc",thriller:"#f87171",action:"#fb923c",noir:"#94a3b8","sci-fi":"#38bdf8","epic-fantasy":"#a3e635",documentary:"#fbbf24",comedy:"#f472b6" };
const styleEmoji = { drama:"🎭",thriller:"🔪",action:"💥",noir:"🌑","sci-fi":"🚀","epic-fantasy":"🐉",documentary:"🎥",comedy:"😂" };
const T = { SCENE:"scene", SHOT:"shot", IMAGE:"image", KLING:"kling", VEO:"veo", LLM:"llm", VIDEOEDIT:"videoedit", SCRIPT:"script", AUDIO:"audio", MUSICDNA:"musicdna", CLIP:"clip" };
const uid = () => Math.random().toString(36).slice(2,9);

// ─── KLING CONSTRAINTS ────────────────────────────────────────────────────────
const KLING_MAX_SHOTS = 6;
const KLING_MAX_SECS  = 15;

// ─── LOGIC ────────────────────────────────────────────────────────────────────
const clampShotDuration = (n) => Math.max(1, Math.min(15, Math.round(n)));

function capitalize(v) { return v ? v[0].toUpperCase() + v.slice(1) : v; }
function humanizeMove(m) {
  return m === "static" ? "with a static camera" : `with a ${m.replaceAll("-"," ")} camera move`;
}
function humanizeLighting(l) { return `${l.replaceAll("-"," ")} lighting`; }
function normalizeVisualStyle(v) {
  if (!v || v === "inherit") return v || "none";
  return VISUAL_STYLE_PRESETS[v] ? v : "none";
}
function entryStyleVariants(entry) {
  return (entry && typeof entry._styleVariants === "object" && entry._styleVariants) ? entry._styleVariants : {};
}
function entryVariantImage(entry, style) {
  const key = normalizeVisualStyle(style);
  if (!key || key === "none" || key === "inherit") return "";
  const variant = entryStyleVariants(entry)[key];
  if (!variant) return "";
  if (typeof variant === "string") return variant;
  return variant._imgUrl || variant._prev || "";
}
function resolveEntryImage(entry, style = "none") {
  const variantImg = entryVariantImage(entry, style);
  if (variantImg) return variantImg;
  return entry?._imgUrl || entry?._prev || "";
}
function withResolvedEntryImage(entry, style = "none") {
  const resolved = resolveEntryImage(entry, style);
  return { ...entry, _prev: resolved };
}
function setEntryImageForStyle(entry, style, imgUrl, assetId = null) {
  const key = normalizeVisualStyle(style);
  if (!imgUrl) return entry;
  if (!key || key === "none" || key === "inherit") {
    return {
      ...entry,
      _imgUrl: imgUrl,
      _prev: imgUrl,
      ...(assetId ? { assetId } : {}),
    };
  }
  const variants = { ...entryStyleVariants(entry) };
  const prev = typeof variants[key] === "object" && variants[key] ? variants[key] : {};
  variants[key] = {
    ...prev,
    _imgUrl: imgUrl,
    _prev: imgUrl,
    ...(assetId ? { assetId } : {}),
  };
  return { ...entry, _styleVariants: variants };
}
function stripBibleEntryForStorage(entry) {
  const stripUrl = (url) => (url?.startsWith("data:") ? "" : (url || ""));
  const variants = Object.fromEntries(
    Object.entries(entryStyleVariants(entry)).map(([style, variant]) => {
      if (typeof variant === "string") return [style, stripUrl(variant)];
      return [style, {
        ...variant,
        _imgUrl: stripUrl(variant?._imgUrl),
        _prev: stripUrl(variant?._prev),
      }];
    })
  );
  return {
    ...entry,
    _imgUrl: stripUrl(entry._imgUrl),
    _prev: stripUrl(entry._prev),
    _styleVariants: variants,
  };
}
function resolveVisualStyle(shot, scene) {
  const shotStyle = normalizeVisualStyle(shot?.visualStyle || "inherit");
  if (shotStyle && shotStyle !== "inherit" && shotStyle !== "none") return shotStyle;
  return normalizeVisualStyle(scene?.visualStyle || "none");
}
function applyVisualStylePrompt(prompt, visualStyle, medium = "image") {
  const styleKey = normalizeVisualStyle(visualStyle);
  const preset = VISUAL_STYLE_PRESETS[styleKey];
  const cleanPrompt = (prompt || "").trim();
  if (!preset || !preset.prompt) return cleanPrompt;
  const subjectRule = medium === "video"
    ? "Keep motion, shot geography, and action continuity consistent with the source prompt."
    : "Keep the source image composition and subject continuity intact.";
  return `${cleanPrompt}\n\nVISUAL STYLE OVERRIDE - ${preset.label}: ${preset.prompt} ${subjectRule}`;
}

// Strip screenplay speaker names (ALL-CAPS lines, parentheticals) from dialogue text
// e.g. "WIZARD (O.S.)\nLine here.\nRANGER\nAnd if I refuse?" → "Line here. And if I refuse?"
function stripSpeakerNames(text) {
  if (!text) return "";
  return text
    .split('\n')
    .filter(line => {
      const t = line.trim();
      if (!t) return false;
      // Screenplay speaker name: all-caps word(s), optional parenthetical suffix
      if (/^[A-Z][A-Z0-9\s.'"\-]+(\s*\([^)]*\))?\s*$/.test(t)) return false;
      // Stage direction on its own line: (beat), (pause), etc.
      if (/^\([^)]+\)$/.test(t)) return false;
      return true;
    })
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Detect distinct speakers in raw screenplay dialogue block
// Returns array of speaker names found
function detectSpeakers(text) {
  if (!text) return [];
  const speakers = new Set();
  text.split('\n').forEach(line => {
    const t = line.trim();
    if (/^[A-Z][A-Z0-9\s.'"\-]+(\s*\([^)]*\))?\s*$/.test(t)) {
      speakers.add(t.replace(/\s*\([^)]*\)\s*$/, '').trim());
    }
  });
  return [...speakers];
}

function parseDialogueSegments(text) {
  if (!text) return [];
  const segments = [];
  let curSpeaker = null;
  let curLines = [];
  const flush = () => {
    const cleaned = curLines.join(" ").replace(/\s+/g, " ").trim();
    if (curSpeaker && cleaned) segments.push({ speaker: curSpeaker, text: cleaned });
    curLines = [];
  };
  for (const rawLine of text.split("\n")) {
    const t = rawLine.trim();
    if (!t) continue;
    if (/^[A-Z][A-Z0-9\s.'"\-]+(\s*\([^)]*\))?\s*$/.test(t)) {
      flush();
      curSpeaker = t.replace(/\s*\([^)]*\)\s*$/, "").trim();
    } else if (/^\([^)]+\)$/.test(t)) {
      // Stage direction — ignore
    } else if (curSpeaker) {
      curLines.push(t);
    }
  }
  flush();
  return segments;
}

function buildKlingShotPlan(shots, multiShot = false) {
  if (!multiShot) {
    const shot = shots?.[0];
    if (!shot) return [];
    const durationSec = Math.max(3, Math.min(15, shot.durationSec || 5));
    return [{ shot, durationSec, startSec: 0, endSec: durationSec }];
  }

  const filteredShots = (shots || []).filter(s => (s.compiledText || s.how)?.trim()).slice(0, 6);
  if (filteredShots.length === 0) return [];

  let durs = filteredShots.map(sh => Math.max(1, Math.round(sh.durationSec || 5)));
  let total = durs.reduce((a, b) => a + b, 0);

  if (total > 15) {
    durs = durs.map(d => Math.max(1, Math.round((d / total) * 15)));
    const newTotal = durs.reduce((a, b) => a + b, 0);
    durs[durs.length - 1] += 15 - newTotal;
    total = 15;
  }
  if (total < 3) {
    durs[durs.length - 1] += 3 - total;
  }

  let cursor = 0;
  return filteredShots.map((shot, i) => {
    const durationSec = durs[i];
    const startSec = cursor;
    cursor += durationSec;
    return { shot, durationSec, startSec, endSec: cursor };
  });
}

function compileShotText(s) {
  const tags = s.entityTags?.length ? s.entityTags.join(" ") : "";
  // base = only concrete, observable visual information — no abstract intent language
  const base = `${capitalize(s.cameraSize)} cinematic shot at ${s.when}, ${s.cameraAngle}, ${humanizeMove(s.cameraMovement)}, lens ${s.lens}, ${humanizeLighting(s.lighting)}.${tags ? " "+tags : ""} ${s.how} in ${s.where}.`;
  // visualHint = coherence check translates both visualGoal + directorNote into ONE concrete visual sentence
  // neither visualGoal nor directorNote go into the prompt raw — both are intent layers, not visual descriptions
  const withDirector = s.visualHint ? `${base} ${s.visualHint}` : base;
  const dialogueBlock = (s.dialogue || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
  return dialogueBlock ? `${withDirector}\nDialogue block:\n${dialogueBlock}` : withDirector;
}

function getSceneShots(nodes, sceneId) {
  return nodes.filter(n => n.type === T.SHOT && n.sceneId === sceneId);
}
function getSceneShotStats(nodes, sceneId) {
  const shots = getSceneShots(nodes, sceneId);
  return {
    shotCount: shots.length,
    totalDur:  shots.reduce((s,n) => s + (n.durationSec||0), 0),
  };
}

function recommendSceneConfig(sceneText) {
  const len = (sceneText||"").trim().length;
  if (len < 120) return { shots:2, secs:6  };
  if (len < 280) return { shots:3, secs:9  };
  if (len < 500) return { shots:4, secs:12 };
  return              { shots:5, secs:15 };
}

// Count distinct action beats in a scene text.
// Each sentence that is long enough to imply a filmable moment counts as one beat.
// Returns { beats, beatsPerShot(shotCount) } so the UI can warn when shots are overcrowded.
function countSceneBeats(sceneText) {
  if (!sceneText?.trim()) return 0;
  const sentences = sceneText
    .split(/(?<=[.!?])\s+/)         // split on sentence-ending punctuation
    .map(s => s.trim())
    .filter(s => s.length > 20);    // ignore very short fragments / parentheticals
  return sentences.length;
}

function estimateSpeechSeconds(text="") {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  const words = cleaned.split(" ").filter(Boolean).length;
  const sentencePauses = (cleaned.match(/[.!?]/g) || []).length;
  const minorPauses = (cleaned.match(/[,:;—-]/g) || []).length;
  const secs = (words / 2.6) + (sentencePauses * 0.28) + (minorPauses * 0.12);
  return Math.max(0.8, secs);
}

// ─── CONTINUITY VALIDATOR ────────────────────────────────────────────────────
// Returns array of { code, msg, level:"error"|"warn" }
function validateShot(shot, scene) {
  const issues = [];
  const activeVisualStyle = resolveVisualStyle(shot, scene);
  const isLinked = !!scene;
  const allBible = isLinked
    ? [...(scene.bible||[]), ...(shot.bible||[]).filter(l=>!(scene.bible||[]).find(s=>s.tag===l.tag))]
    : (shot.bible||[]);
  const knownTags = new Set(allBible.map(e=>e.tag));

  if (!shot.how?.trim())           issues.push({ code:"NO_HOW",      level:"error", msg:"Missing action — what is happening?" });
  if (!shot.where?.trim())         issues.push({ code:"NO_WHERE",    level:"error", msg:"Missing location — where does this happen?" });
  if (!shot.when?.trim())          issues.push({ code:"NO_WHEN",     level:"warn",  msg:"No temporal context — when?" });
  if (!shot.visualGoal?.trim())    issues.push({ code:"NO_GOAL",     level:"warn",  msg:"No visual goal defined" });
  if (!shot.durationSec || shot.durationSec < 1)
    issues.push({ code:"BAD_DUR",      level:"error", msg:"Invalid shot duration" });
  if (shot.durationSec > 15)
    issues.push({ code:"SHOT_TOO_LONG", level:"error", msg:"Shot exceeds Kling max of 15s" });

  // Dialogue-duration check: estimate spoken length (~13 chars/sec for TTS pacing)
  // and warn if the shot is likely too short to fit the audio.
  if (shot.dialogue?.trim()) {
    const spokenText = stripSpeakerNames(shot.dialogue).replace(/\s+/g, " ").trim();
    if (spokenText.length > 0) {
      const estimatedSecs = estimateSpeechSeconds(spokenText);
      if (estimatedSecs < 2) {
        issues.push({
          code: "LIPSYNC_AUDIO_TOO_SHORT",
          level: "warn",
          msg: `Estimated speech is ~${estimatedSecs.toFixed(1)}s — Kling advanced lipsync requires at least 2.0s of audio`,
        });
      }
      if (estimatedSecs > (shot.durationSec || 1)) {
        issues.push({
          code: "DIALOGUE_TOO_LONG",
          level: "warn",
          msg: `Dialogue needs ~${estimatedSecs.toFixed(1)}s but shot is ${shot.durationSec || 1}s — lipsync may be clipped`,
        });
      }
    }
  }

  if (shot.entityTags?.length === 0)
    issues.push({ code:"NO_TAGS", level:"warn", msg:"No entity tags — who is in this shot?" });

  shot.entityTags?.forEach(t => {
    if (!knownTags.has(t))
      issues.push({ code:"UNKNOWN_TAG", level:"error", msg:`Tag ${t} not in any bible` });
  });

  if (isLinked) {
    if (!shot.sourceAnchor?.trim())
      issues.push({ code:"NO_ANCHOR",  level:"warn",  msg:"No source anchor — which part of the scene?" });
    const sceneTags = new Set((scene.bible||[]).map(e=>e.tag));
    const localOnly = (shot.bible||[]).filter(l=>!sceneTags.has(l.tag));
    if (localOnly.length > 0)
      issues.push({ code:"LOCAL_REFS",  level:"warn",  msg:`${localOnly.length} local ref(s) not in scene bible` });
  } else {
    // standalone rules
    const localBible = shot.bible||[];
    if (localBible.length === 0)
      issues.push({ code:"NO_BIBLE",   level:"warn",  msg:"Standalone shot has no references — add to Shot Bible" });
    localBible.forEach(e => {
      const variantAsset = activeVisualStyle !== "none" ? entryStyleVariants(e)[activeVisualStyle]?.assetId : e.assetId;
      if (!(variantAsset || resolveEntryImage(e, activeVisualStyle)))
        issues.push({ code:"NO_ASSET",  level:"warn",  msg:`${e.tag} has no image reference` });
    });
  }

  return issues;
}

// ─── EXPORT UTILITIES ─────────────────────────────────────────────────────────
function downloadMd(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatShotMd(shot) {
  const lines = [];
  lines.push(`## Shot #${shot.index || "?"}`);
  if (shot.sourceAnchor) lines.push(`\n> *"${shot.sourceAnchor}"*`);
  lines.push(`\n| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| **Action** | ${shot.how || "—"} |`);
  lines.push(`| **Where** | ${shot.where || "—"} |`);
  lines.push(`| **When** | ${shot.when || "—"} |`);
  lines.push(`| **Visual Goal** | ${shot.visualGoal || "—"} |`);
  lines.push(`| **Duration** | ${shot.durationSec || 1}s |`);
  lines.push(`| **Camera Size** | ${shot.cameraSize || "—"} |`);
  lines.push(`| **Camera Angle** | ${shot.cameraAngle || "—"} |`);
  lines.push(`| **Camera Movement** | ${shot.cameraMovement || "—"} |`);
  lines.push(`| **Lens** | ${shot.lens || "—"} |`);
  lines.push(`| **Lighting** | ${shot.lighting || "—"} |`);
  if (shot.entityTags?.length) lines.push(`| **Tags** | ${shot.entityTags.join(" ")} |`);
  if (shot.compiledText) {
    lines.push(`\n**Compiled Prompt:**`);
    lines.push(`\`\`\`\n${shot.compiledText}\n\`\`\``);
  }
  return lines.join("\n");
}

function formatSceneMd(sceneNode, shots) {
  const emoji = styleEmoji[sceneNode.cinematicStyle] || "";
  const lines = [];
  lines.push(`# Scene — ${emoji} ${sceneNode.cinematicStyle}`);
  lines.push(`\n## Scene Text\n\n${sceneNode.sceneText || "*(empty)*"}`);
  if (sceneNode.bible?.length) {
    lines.push(`\n## Entity Bible\n`);
    for (const e of sceneNode.bible) {
      lines.push(`**${e.tag}** — ${e.name} *(${e.kind})*${e.notes ? `  \n${e.notes}` : ""}`);
    }
  }
  if (shots.length) {
    lines.push(`\n## Shots (${shots.length} total)\n`);
    for (const s of shots) {
      lines.push(formatShotMd(s));
      lines.push("\n---\n");
    }
  } else {
    lines.push(`\n## Shots\n\n*(no shots linked)*`);
  }
  return lines.join("\n");
}

function formatProductionPackageMd(nodes, projectName = "Project") {
  const sceneNodes = nodes.filter(n => n.type === T.SCENE);
  const shotNodes = nodes.filter(n => n.type === T.SHOT);
  const imageNodes = nodes.filter(n => n.type === T.IMAGE);
  const klingNodes = nodes.filter(n => n.type === T.KLING);
  const veoNodes = nodes.filter(n => n.type === T.VEO);
  const audioNodes = nodes.filter(n => n.type === T.AUDIO);
  const videoEditNodes = nodes.filter(n => n.type === T.VIDEOEDIT);

  const lines = [];
  lines.push(`# Production Package — ${projectName}`);
  lines.push("");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push("## Project Summary");
  lines.push("");
  lines.push(`- Scenes: ${sceneNodes.length}`);
  lines.push(`- Shots: ${shotNodes.length}`);
  lines.push(`- Images: ${imageNodes.length}`);
  lines.push(`- Kling nodes: ${klingNodes.length}`);
  lines.push(`- Veo nodes: ${veoNodes.length}`);
  lines.push(`- Audio nodes: ${audioNodes.length}`);
  lines.push(`- Video edits: ${videoEditNodes.length}`);
  lines.push("");

  sceneNodes
    .slice()
    .sort((a, b) => (a.id || "").localeCompare(b.id || ""))
    .forEach((sceneNode, idx) => {
      const shots = shotNodes
        .filter(s => s.sceneId === sceneNode.id)
        .sort((a, b) => (a.index || 0) - (b.index || 0));

      lines.push(`---`);
      lines.push("");
      lines.push(`## Scene ${idx + 1} — ${capitalize(sceneNode.cinematicStyle || "scene")}`);
      lines.push("");
      lines.push(`### Scene Text`);
      lines.push("");
      lines.push(sceneNode.sceneText || "*(empty)*");
      lines.push("");
      lines.push(`### Styles`);
      lines.push("");
      lines.push(`- Cinematic: ${sceneNode.cinematicStyle || "—"}`);
      lines.push(`- Visual: ${VISUAL_STYLE_PRESETS[sceneNode.visualStyle || "none"]?.label || "None"}`);
      lines.push("");

      if (sceneNode.directorCoherence) {
        const c = sceneNode.directorCoherence;
        lines.push(`### Continuity Report`);
        lines.push("");
        lines.push(`- Score: ${c.score ?? "—"}/100`);
        if (c.recommendation) lines.push(`- Recommendation: ${c.recommendation}`);
        if (c.skippedBeats?.length) {
          lines.push(`- Skipped beats:`);
          c.skippedBeats.forEach(b => lines.push(`  - ${b}`));
        }
        if (c.overlapIssues?.length) {
          lines.push(`- Overlap issues:`);
          c.overlapIssues.forEach(o => lines.push(`  - ${o}`));
        }
        lines.push("");
      }

      if (sceneNode.bible?.length) {
        lines.push(`### Scene Bible`);
        lines.push("");
        sceneNode.bible.forEach(e => {
          lines.push(`- ${e.tag} — ${e.name} (${e.kind})${e.notes ? `: ${e.notes}` : ""}`);
        });
        lines.push("");
      }

      if (shots.length) {
        lines.push(`### Shots`);
        lines.push("");
        shots.forEach(s => {
          lines.push(formatShotMd(s));
          if (s.directorNote || s.directorIssue || s.visualHint) {
            lines.push("");
            lines.push(`**Director Layer**`);
            if (s.directorQuality) lines.push(`- Quality: ${s.directorQuality}`);
            if (s.directorNote) lines.push(`- Note: ${s.directorNote}`);
            if (s.directorIssue) lines.push(`- Issue: ${s.directorIssue}`);
            if (s.visualHint) lines.push(`- Visual Hint: ${s.visualHint}`);
          }
          lines.push("");
          lines.push("---");
          lines.push("");
        });
      } else {
        lines.push(`### Shots`);
        lines.push("");
        lines.push("*(no shots linked)*");
        lines.push("");
      }
    });

  return lines.join("\n");
}

function getEditableNodeContent(n) {
  if (!n) return {};
  if (n.type === T.SHOT)  return { how:n.how, where:n.where, when:n.when, cameraSize:n.cameraSize, cameraAngle:n.cameraAngle, cameraMovement:n.cameraMovement, lighting:n.lighting, lens:n.lens, visualGoal:n.visualGoal, visualStyle:n.visualStyle, durationSec:n.durationSec, sourceAnchor:n.sourceAnchor, dialogue:n.dialogue };
  if (n.type === T.SCENE) return { sceneText:n.sceneText, cinematicStyle:n.cinematicStyle, visualStyle:n.visualStyle };
  if (n.type === T.IMAGE) return { prompt:n.prompt };
  if (n.type === T.KLING || n.type === T.VEO) return { manualPrompt:n.manualPrompt };
  return {};
}

function mkScene() { return { id:`sc_${uid()}`, type:T.SCENE, sceneText:"", cinematicStyle:"thriller", visualStyle:"none", shotCount:3, bible:[], dialogueLines:[] }; }
function mkShot(sceneId,index=1) { return { id:`sh_${uid()}`, type:T.SHOT, sceneId, index, durationSec:3, sourceAnchor:"", where:"", entityTags:[], how:"", when:"", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"natural-soft", visualGoal:"", visualStyle:"inherit", compiledText:"", bible:[], dialogue:"" }; }
function mkImage(sceneId=null, shotId=null) { return { id:`im_${uid()}`, type:T.IMAGE, sceneId, shotId, prompt:"", generatedUrl:null, entityTag:"", aspect_ratio:"1:1", resolution:"1K", refImageUrl:null }; }
function mkKling() { return { id:`kl_${uid()}`, type:T.KLING, shotIds:[], imageRefIds:[], videoUrl:null, aspect_ratio:"16:9", mode:"pro", resolution:"720p", sound:"off", prevKlingId:null, voice:"none", lipsync:false, klingVersion:"v3", klingVideoId:null, klingVideoDuration:null, klingMode:"shots", multiImagePrompt:"" }; }
function mkVeo()   { return { id:`veo_${uid()}`, type:T.VEO, shotId:null, videoUrl:null, aspect_ratio:"16:9", duration:8, resolution:"720p", startFrameNodeId:null, endFrameNodeId:null, refNodeIds:[], useRefs:true, refType:"asset", manualPrompt:"" }; }
function mkLlm()   { return { id:`llm_${uid()}`, type:T.LLM, targetNodeIds:[], targetNodeId:null, llmMode:"edit", command:"", model:"claude-sonnet-4-5", lastResult:null }; }
function mkVideoEdit() { return { id:`ved_${uid()}`, type:T.VIDEOEDIT, videoNodeIds:[], localClips:[], clipOrder:[], trims:{}, exportFormat:"1080p", lastSplitAction:null, audioMix:{ videoVolume:1, soundtrackVolume:1 } }; }
function mkScript()   { return { id:`scr_${uid()}`, type:T.SCRIPT, title:"Untitled Script", script:"", idea:"", format:"screenplay", scriptMode:"write" }; }
function mkAudio()    { return { id:`aud_${uid()}`, type:T.AUDIO, audioUrl:null, fileName:null, bpm:null, beats:[], duration:0, snapEnabled:true, videoNodeId:null, musicAnalysis:null }; }
function mkMusicDNA() { return { id:`mdna_${uid()}`, type:T.MUSICDNA, title:"Music DNA", audioNodeId:null, concept:"", lyrics:"", clipMode:"hybrid", genre:"auto", preferredSections:"auto", visualStyle:"none", analysis:null, lastBlueprint:null }; }
function mkClip()     { return { id:`clp_${uid()}`, type:T.CLIP,  videoUrl:null, fileName:null, duration:0 }; }

const MUSIC_GENRES = [
  "auto",
  "trap",
  "rap",
  "drill",
  "electro",
  "techno",
  "house",
  "minimal",
  "ambient",
  "pop",
  "rock",
  "punk",
  "experimental",
];

const MUSIC_GENRE_GRAMMARS = {
  auto: {
    moodBias: "follow the detected rhythm and energy rather than forcing a narrative trope",
    imageBehavior: "repeat strong visual motifs when the pulse repeats",
    cameraBehavior: "let movement density follow the beat pressure",
    palette: "derive the look from the concept and energy rather than a default atmosphere",
  },
  trap: {
    moodBias: "confident, nocturnal, hard-edged, status-driven",
    imageBehavior: "bold silhouettes, flex moments, fragmentary body details, luxury or street iconography",
    cameraBehavior: "low angles, assertive push-ins, controlled swagger, punctuated movement on hits",
    palette: "deep blacks, chrome, red accents, sodium vapor, wet surfaces",
  },
  rap: {
    moodBias: "presence, authorship, realism or stylized dominance",
    imageBehavior: "performance-led frames, social environment, sharp emblematic details",
    cameraBehavior: "deliberate tracking, hero framing, rhythmic cuts around bars and punchlines",
    palette: "high contrast urban texture, practical light, skin and fabric detail",
  },
  drill: {
    moodBias: "tense, cold, confrontational, raw",
    imageBehavior: "masked groups, hard architecture, glare, repetition, compressed space",
    cameraBehavior: "handheld threat energy, abrupt reframing, aggressive lateral motion",
    palette: "cold LED, stark contrast, concrete, metallic reflections",
  },
  electro: {
    moodBias: "synthetic, kinetic, graphic, body-meets-machine energy",
    imageBehavior: "strobe logic, repetition, geometry, reflections, neon cues, graphic motion",
    cameraBehavior: "pulsing push-ins, lateral glides, robotic pivots, tempo-responsive cuts",
    palette: "neon, LED color contrast, reflective surfaces, dark club or industrial spaces",
  },
  techno: {
    moodBias: "hypnotic, relentless, immersive, industrial",
    imageBehavior: "pattern repetition, light architecture, smoke, crowd or machinery rhythm",
    cameraBehavior: "steady pressure, loops, driving forward motion, trance-like repetition",
    palette: "monochrome plus laser accents, steel, concrete, haze",
  },
  house: {
    moodBias: "euphoric, fluid, sensual, communal",
    imageBehavior: "dance energy, syncopated bodies, light bloom, nightlife ritual",
    cameraBehavior: "flowing movement, circular motion, buoyant tracking, smooth rhythmic edits",
    palette: "warm neon, color bloom, club atmospherics, skin glow",
  },
  minimal: {
    moodBias: "precise, reduced, hypnotic, elegant restraint",
    imageBehavior: "clean shapes, sparse motifs, repetition with small variation, negative space",
    cameraBehavior: "measured motion, locked frames with subtle shifts, economical cuts",
    palette: "controlled monochrome or two-tone palettes, polished surfaces, sparse light",
  },
  ambient: {
    moodBias: "atmospheric, spacious, drifting, introspective",
    imageBehavior: "slow transformation, texture, landscape, haze, suspended gestures",
    cameraBehavior: "drift, float, gentle reveals, very low cut pressure",
    palette: "soft gradients, mist, low contrast, diffuse light",
  },
  pop: {
    moodBias: "hook-driven, glossy, legible, emotionally direct",
    imageBehavior: "clear icon moments, repeatable motifs, star framing, choreography or color set pieces",
    cameraBehavior: "clean energetic coverage, designed transitions, chorus escalation",
    palette: "high color clarity, polished light, strong wardrobe/pop iconography",
  },
  rock: {
    moodBias: "physical, expressive, raw, performance-heavy",
    imageBehavior: "instrument force, sweat, texture, crowd or room energy, impact gestures",
    cameraBehavior: "shoulder-level force, push-ins, whip energy, visceral cut rhythm",
    palette: "stage light, practical haze, grit, sweat, contrast",
  },
  punk: {
    moodBias: "urgent, abrasive, anti-polish, rebellious",
    imageBehavior: "DIY surfaces, collision, crowd crush, chaos motifs, overexposed flashes",
    cameraBehavior: "restless handheld, slam cuts, hard snap zoom energy",
    palette: "dirty whites, black, red, photocopy textures, blown highlights",
  },
  experimental: {
    moodBias: "rule-breaking, surprising, unstable, concept-first",
    imageBehavior: "non-literal motifs, fragmentation, texture and pattern rupture",
    cameraBehavior: "unconventional framing, abrupt grammar shifts, mixed temporal feel",
    palette: "defined by concept; allow unusual combinations and non-naturalistic light",
  },
};

function inferRhythmCharacter(bpm = 0, energy = "medium", clipMode = "hybrid") {
  if (bpm >= 145) return clipMode === "abstract" ? "hyper-kinetic and relentless" : "driving and high-pressure";
  if (bpm >= 125) return energy === "high" ? "club-driven and propulsive" : "steady and kinetic";
  if (bpm >= 105) return energy === "high" ? "punchy and insistent" : "measured with forward pressure";
  if (bpm >= 85) return energy === "low" ? "slow-burn and spacious" : "mid-tempo and deliberate";
  return "slow and expansive";
}

function inferCutDensity(bpm = 0, energy = "medium", clipMode = "hybrid") {
  const score = (bpm >= 140 ? 2 : bpm >= 110 ? 1 : 0) + (energy === "high" ? 2 : energy === "medium" ? 1 : 0) + (clipMode === "performance" ? 1 : 0);
  if (score >= 4) return "fast";
  if (score >= 2) return "medium";
  return "slow";
}

function inferMovementBias(genre = "auto", clipMode = "hybrid", energy = "medium") {
  if (clipMode === "abstract") return energy === "high" ? "patterned kinetic motion" : "designed controlled motion";
  if (genre === "electro" || genre === "techno" || genre === "house") return energy === "high" ? "pulsing glide and rhythmic camera pressure" : "measured drift with pulse accents";
  if (genre === "trap" || genre === "rap" || genre === "drill") return energy === "high" ? "assertive push-ins and hard reframes" : "hero framing with restrained motion";
  if (genre === "ambient" || genre === "minimal") return "slow drift and restrained camera grammar";
  return energy === "high" ? "rhythm-led movement" : "controlled minimal movement";
}

function buildMusicVideoBlueprintGuide(analysis, musicNode) {
  const bpm = Number(analysis?.bpm || 0);
  const genre = musicNode?.genre || "auto";
  const clipMode = musicNode?.clipMode || "hybrid";
  const grammar = MUSIC_GENRE_GRAMMARS[genre] || MUSIC_GENRE_GRAMMARS.auto;
  const peakSection = (analysis?.sections || []).reduce((best, section) => {
    if (!best) return section;
    return (section.energyValue || 0) > (best.energyValue || 0) ? section : best;
  }, null);
  const overall = {
    genre,
    clipMode,
    rhythmCharacter: inferRhythmCharacter(bpm, peakSection?.energy || "medium", clipMode),
    cutDensity: inferCutDensity(bpm, peakSection?.energy || "medium", clipMode),
    movementBias: inferMovementBias(genre, clipMode, peakSection?.energy || "medium"),
    moodBias: grammar.moodBias,
    imageBehavior: grammar.imageBehavior,
    cameraBehavior: grammar.cameraBehavior,
    palette: grammar.palette,
    antiGenericRule: "Do not default to lonely figures, dawn fog, contemplative walking, or generic arthouse mood unless the concept or lyrics explicitly ask for that.",
  };
  const sections = (analysis?.sections || []).map((section, idx) => ({
    label: section.label,
    startSec: section.startSec,
    endSec: section.endSec,
    energy: section.energy,
    visualRole: section.visualRole,
    rhythmCharacter: inferRhythmCharacter(bpm, section.energy, clipMode),
    cutDensity: inferCutDensity(bpm, section.energy, clipMode),
    movementBias: inferMovementBias(genre, clipMode, section.energy),
    imageDirection:
      clipMode === "performance"
        ? `Use the ${section.label.toLowerCase()} for performance-led coverage that visibly rides the pulse. ${grammar.imageBehavior}.`
        : clipMode === "narrative"
          ? `Use the ${section.label.toLowerCase()} as a clear story beat, but keep the visuals visibly driven by the music's pressure and repetition. ${grammar.imageBehavior}.`
          : clipMode === "abstract"
            ? `Use the ${section.label.toLowerCase()} to build a non-literal visual system shaped by repetition, geometry, texture, and pulse. ${grammar.imageBehavior}.`
            : `Blend performance, motif repetition, and visual progression in the ${section.label.toLowerCase()}, following the pulse rather than generic cinematic filler. ${grammar.imageBehavior}.`,
    shotGuidance:
      section.energy === "high"
        ? "Favor shorter shots, stronger impact frames, and visual escalation on section accents."
        : section.energy === "low"
          ? "Let shots breathe, but keep a visible link to the pulse through repetition, design, or micro-movement."
          : "Use a balanced shot rhythm that advances visual momentum without flattening the section.",
  }));

  return { overall, sections };
}

function estimateMusicSectionCount(duration = 0, preferred = "auto") {
  if (preferred && preferred !== "auto") return Math.max(3, Math.min(6, Number(preferred) || 4));
  if (duration >= 150) return 6;
  if (duration >= 90) return 5;
  return 4;
}

function getMonoSamples(audioBuffer) {
  const channelCount = audioBuffer.numberOfChannels || 1;
  const length = audioBuffer.length;
  if (channelCount === 1) return audioBuffer.getChannelData(0);
  const mono = new Float32Array(length);
  for (let ch = 0; ch < channelCount; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channelCount;
  }
  return mono;
}

function movingAverage(values, radius) {
  if (!values.length || radius <= 0) return values.slice();
  const out = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i > radius * 2) sum -= values[i - radius * 2 - 1];
    const span = Math.min(i, radius) + Math.min(values.length - 1 - i, radius) + 1;
    out[i] = sum / span;
  }
  return out;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

function peakPick(values, { threshold = 0, minDistance = 1 } = {}) {
  const picks = [];
  let last = -minDistance;
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] <= threshold) continue;
    if (values[i] >= values[i - 1] && values[i] > values[i + 1]) {
      if (i - last >= minDistance) {
        picks.push(i);
        last = i;
      } else if (picks.length && values[i] > values[picks[picks.length - 1]]) {
        picks[picks.length - 1] = i;
        last = i;
      }
    }
  }
  return picks;
}

function estimateBpmFromNovelty(novelty, frameHopSec) {
  if (!novelty.length || !frameHopSec) return null;
  const minBpm = 60;
  const maxBpm = 180;
  const minLag = Math.floor((60 / maxBpm) / frameHopSec);
  const maxLag = Math.ceil((60 / minBpm) / frameHopSec);
  let bestLag = 0;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let i = lag; i < novelty.length; i++) score += novelty[i] * novelty[i - lag];
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (!bestLag) return null;
  return Math.round(60 / (bestLag * frameHopSec));
}

function classifyEnergy(value, low, high) {
  if (value <= low) return "low";
  if (value >= high) return "high";
  return "medium";
}

function buildSectionLabel(index) {
  return `SECTION ${String.fromCharCode(65 + index)}`;
}

function analyzeAudioStructure(audioBuffer, preferredSections = "auto") {
  const mono = getMonoSamples(audioBuffer);
  const sampleRate = audioBuffer.sampleRate || 44100;
  const durationSec = Number(audioBuffer.duration.toFixed(2));
  const frameSize = Math.max(1024, Math.round(sampleRate * 0.10));
  const hopSize = Math.max(512, Math.round(sampleRate * 0.05));
  const frameHopSec = hopSize / sampleRate;

  const rms = [];
  for (let start = 0; start + frameSize <= mono.length; start += hopSize) {
    let sum = 0;
    for (let i = 0; i < frameSize; i++) {
      const s = mono[start + i] || 0;
      sum += s * s;
    }
    rms.push(Math.sqrt(sum / frameSize));
  }
  const smoothedRms = movingAverage(rms, 2);
  const novelty = smoothedRms.map((v, i) => i === 0 ? 0 : Math.max(0, v - smoothedRms[i - 1]));
  const noveltySmooth = movingAverage(novelty, 1);

  const bpm = estimateBpmFromNovelty(noveltySmooth, frameHopSec);
  const beatThreshold = percentile(noveltySmooth, 0.78);
  const beatFrames = peakPick(noveltySmooth, {
    threshold: beatThreshold,
    minDistance: Math.max(1, Math.round((60 / (bpm || 110)) / frameHopSec * 0.5)),
  });
  const beats = beatFrames.map(i => Number((i * frameHopSec).toFixed(3)));

  const blockSec = 2;
  const blockFrames = Math.max(1, Math.round(blockSec / frameHopSec));
  const blocks = [];
  for (let start = 0; start < smoothedRms.length; start += blockFrames) {
    const end = Math.min(smoothedRms.length, start + blockFrames);
    const energySlice = smoothedRms.slice(start, end);
    const noveltySlice = noveltySmooth.slice(start, end);
    if (!energySlice.length) continue;
    const energyMean = energySlice.reduce((a, b) => a + b, 0) / energySlice.length;
    const noveltyMean = noveltySlice.reduce((a, b) => a + b, 0) / noveltySlice.length;
    blocks.push({
      startSec: start * frameHopSec,
      endSec: Math.min(durationSec, end * frameHopSec),
      energyMean,
      noveltyMean,
    });
  }

  const changeScores = [];
  for (let i = 1; i < blocks.length; i++) {
    const energyDelta = Math.abs(blocks[i].energyMean - blocks[i - 1].energyMean);
    const noveltyDelta = Math.abs(blocks[i].noveltyMean - blocks[i - 1].noveltyMean);
    changeScores.push({ index: i, score: energyDelta * 0.7 + noveltyDelta * 1.3 });
  }

  const targetSections = estimateMusicSectionCount(durationSec, preferredSections);
  const wantedBoundaries = Math.max(1, targetSections - 1);
  const sortedBoundaries = changeScores
    .sort((a, b) => b.score - a.score)
    .filter(({ index }, pos, self) => {
      return !self.slice(0, pos).some(prev => Math.abs(prev.index - index) < 2);
    })
    .slice(0, wantedBoundaries)
    .sort((a, b) => a.index - b.index);

  const boundaryIndices = [0, ...sortedBoundaries.map(b => b.index), blocks.length].filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
  const energyValues = blocks.map(b => b.energyMean);
  const lowEnergy = percentile(energyValues, 0.33);
  const highEnergy = percentile(energyValues, 0.66);
  const sections = [];

  for (let i = 0; i < boundaryIndices.length - 1; i++) {
    const startBlock = boundaryIndices[i];
    const endBlock = boundaryIndices[i + 1];
    const slice = blocks.slice(startBlock, endBlock);
    if (!slice.length) continue;
    const sectionEnergy = slice.reduce((a, b) => a + b.energyMean, 0) / slice.length;
    const sectionNovelty = slice.reduce((a, b) => a + b.noveltyMean, 0) / slice.length;
    const startSec = Number(slice[0].startSec.toFixed(2));
    const endSec = Number(slice[slice.length - 1].endSec.toFixed(2));
    const beatCount = beats.filter(t => t >= startSec && t < endSec).length;
    sections.push({
      label: buildSectionLabel(i),
      key: `section-${i + 1}`,
      startSec,
      endSec,
      durationSec: Number((endSec - startSec).toFixed(2)),
      energy: classifyEnergy(sectionEnergy, lowEnergy, highEnergy),
      energyValue: sectionEnergy,
      noveltyValue: sectionNovelty,
      beatCount,
      estimatedBars: bpm ? Math.max(1, Math.round(beatCount / 4)) : 0,
      visualRole: i === 0
        ? "establish the opening visual language"
        : i === boundaryIndices.length - 2
          ? "land the final visual payoff"
          : "shift the clip into a new visual phase",
    });
  }

  const notableMoments = [...sortedBoundaries]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((boundary, i) => ({
      atSec: Number((blocks[boundary.index]?.startSec || 0).toFixed(2)),
      label: `Transition ${i + 1}`,
      reason: "strong structural change detected in the audio energy and onset profile",
    }))
    .sort((a, b) => a.atSec - b.atSec);

  return {
    durationSec,
    bpm,
    beats,
    beatsDetected: beats.length,
    sectionCount: sections.length,
    energyCurve: sections.map(section => `${section.label}:${section.energy}`).join(" -> "),
    sections,
    notableMoments,
    summary: `Detected ${sections.length} audio-driven sections across ${durationSec.toFixed(1)}s${bpm ? ` at roughly ${bpm} BPM` : ""}. Sections come from changes in energy and onset density, not fixed song templates.`,
  };
}

const MUSIC_SECTION_LIBRARY = {
  3: [
    { label:"INTRO", key:"intro", start:0.00, end:0.20, energy:"low", visualRole:"establish the visual world and first emotional signal" },
    { label:"BODY", key:"body", start:0.20, end:0.72, energy:"medium", visualRole:"carry the main visual progression and repeatable motif" },
    { label:"PAYOFF", key:"payoff", start:0.72, end:1.00, energy:"high", visualRole:"deliver the strongest visual payoff and close with a final image" },
  ],
  4: [
    { label:"INTRO", key:"intro", start:0.00, end:0.16, energy:"low", visualRole:"open with mood, iconography, and world definition" },
    { label:"VERSE", key:"verse", start:0.16, end:0.44, energy:"medium", visualRole:"introduce the visual premise or performance language" },
    { label:"CHORUS", key:"chorus", start:0.44, end:0.76, energy:"high", visualRole:"expand scale, motion, and emotional clarity" },
    { label:"OUTRO", key:"outro", start:0.76, end:1.00, energy:"medium-high", visualRole:"land the final motif and leave a strong closing frame" },
  ],
  5: [
    { label:"INTRO", key:"intro", start:0.00, end:0.14, energy:"low", visualRole:"set mood and first visual symbols" },
    { label:"VERSE", key:"verse", start:0.14, end:0.34, energy:"medium", visualRole:"build the visual world and subject focus" },
    { label:"PRE-CHORUS", key:"pre-chorus", start:0.34, end:0.48, energy:"rising", visualRole:"increase tension and prepare a transition" },
    { label:"CHORUS", key:"chorus", start:0.48, end:0.76, energy:"high", visualRole:"deliver the biggest performance or narrative lift" },
    { label:"OUTRO", key:"outro", start:0.76, end:1.00, energy:"medium", visualRole:"echo the core motif and resolve visually" },
  ],
  6: [
    { label:"INTRO", key:"intro", start:0.00, end:0.12, energy:"low", visualRole:"define the world and first mood signal" },
    { label:"VERSE A", key:"verse-a", start:0.12, end:0.28, energy:"medium", visualRole:"introduce primary subject behavior and visual motif" },
    { label:"PRE-CHORUS", key:"pre-chorus", start:0.28, end:0.40, energy:"rising", visualRole:"tighten rhythm and anticipation" },
    { label:"CHORUS", key:"chorus", start:0.40, end:0.62, energy:"high", visualRole:"expand movement, scale, and graphic impact" },
    { label:"BRIDGE", key:"bridge", start:0.62, end:0.80, energy:"dynamic", visualRole:"break the pattern with contrast or surprise" },
    { label:"FINAL CHORUS / OUTRO", key:"final-chorus", start:0.80, end:1.00, energy:"peak", visualRole:"deliver the signature image and final emotional release" },
  ],
};

function inferMusicMoments(sections, duration) {
  if (!sections?.length || !duration) return [];
  const moments = sections.slice(0, -1).map((section, index) => ({
    atSec: Number(section.endSec.toFixed(2)),
    label: `${section.label} transition`,
    reason: index === 0
      ? "first major change in visual rhythm"
      : index === sections.length - 2
        ? "final lift into closing payoff"
        : "section handoff with new pacing pressure",
  }));
  const chorusLike = sections.find(s => /chorus|payoff/i.test(s.label));
  if (chorusLike) {
    moments.unshift({
      atSec: Number(Math.max(0, chorusLike.startSec).toFixed(2)),
      label: `${chorusLike.label} impact point`,
      reason: "best candidate for the clip's widest or most iconic visual escalation",
    });
  }
  return moments.slice(0, 5);
}

function buildMusicDNAAnalysis(audioNode, preferredSections = "auto") {
  if (audioNode?.musicAnalysis?.sections?.length) {
    return audioNode.musicAnalysis;
  }
  if (!audioNode?.duration) return null;
  const duration = Number(audioNode.duration || 0);
  const bpm = Number(audioNode.bpm || 0);
  const sectionCount = estimateMusicSectionCount(duration, preferredSections);
  const template = MUSIC_SECTION_LIBRARY[sectionCount] || MUSIC_SECTION_LIBRARY[4];
  const beatsPerBar = 4;
  const secondsPerBeat = bpm ? 60 / bpm : 0;

  const sections = template.map((section, index) => {
    const startSec = Number((duration * section.start).toFixed(2));
    const endSec = Number((duration * (index === template.length - 1 ? 1 : section.end)).toFixed(2));
    const beatCount = secondsPerBeat ? Math.max(1, Math.round((endSec - startSec) / secondsPerBeat)) : 0;
    const estimatedBars = beatCount ? Math.max(1, Math.round(beatCount / beatsPerBar)) : 0;
    return {
      ...section,
      startSec,
      endSec,
      durationSec: Number((endSec - startSec).toFixed(2)),
      beatCount,
      estimatedBars,
    };
  });

  const notableMoments = inferMusicMoments(sections, duration);
  const energyCurve = sections.map(section => `${section.label}:${section.energy}`).join(" -> ");

  return {
    durationSec: duration,
    bpm: bpm || null,
    beatsDetected: audioNode.beats?.length || 0,
    sectionCount,
    energyCurve,
    sections,
    notableMoments,
    summary: bpm
      ? `Detected ${sectionCount} structural sections across ${duration.toFixed(1)}s at roughly ${bpm} BPM. Use the chorus/payoff moments as your highest-contrast visual events.`
      : `Built a ${sectionCount}-section timing map across ${duration.toFixed(1)}s. Add a stronger concept or lyrics pass if you want more story-specific blueprinting.`,
  };
}

function normalizeMusicBlueprintScenes(scenes = []) {
  const normalized = [];

  scenes.forEach((scene, sceneIndex) => {
    const sourceShots = (scene.shots || []).map((shot, shotIndex) => ({
      ...shot,
      index: shotIndex + 1,
      durationSec: Math.max(1, Math.min(5, Math.round(Number(shot.durationSec) || 3))),
    }));

    if (!sourceShots.length) {
      normalized.push({
        ...scene,
        shotCount: 0,
        shots: [],
      });
      return;
    }

    let bucket = [];
    let bucketDur = 0;
    let bucketIndex = 1;

    const flushBucket = () => {
      if (!bucket.length) return;
      const splitLabel = sourceShots.length === bucket.length && bucketIndex === 1
        ? (scene.sectionLabel || scene.heading || `SECTION ${sceneIndex + 1}`)
        : `${scene.sectionLabel || scene.heading || `SECTION ${sceneIndex + 1}`} · PART ${bucketIndex}`;
      normalized.push({
        ...scene,
        sectionLabel: splitLabel,
        heading: splitLabel,
        shotCount: bucket.length,
        shots: bucket.map((shot, idx) => ({
          ...shot,
          index: idx + 1,
          durationSec: Math.max(1, Math.min(5, Math.round(Number(shot.durationSec) || 3))),
        })),
      });
      bucketIndex += 1;
      bucket = [];
      bucketDur = 0;
    };

    sourceShots.forEach((shot) => {
      const nextDur = Math.max(1, Math.min(5, Math.round(Number(shot.durationSec) || 3)));
      const wouldOverflow = bucket.length >= KLING_MAX_SHOTS || (bucketDur + nextDur) > KLING_MAX_SECS;
      if (wouldOverflow) flushBucket();
      bucket.push({ ...shot, durationSec: nextDur });
      bucketDur += nextDur;
    });

    flushBucket();
  });

  return normalized;
}

// ─── AI ───────────────────────────────────────────────────────────────────────
const SHOT_MODELS = [
  { id:"claude-sonnet-4-5", label:"Claude Sonnet 4.6", provider:"anthropic", color:"#f87171" },
  { id:"gpt-5.4",                  label:"GPT-5.4",           provider:"openai",    color:"#10b981" },
  { id:"gpt-5.4-mini",             label:"GPT-5.4 mini",      provider:"openai",    color:"#34d399" },
  { id:"gpt-5.4-nano",             label:"GPT-5.4 nano",      provider:"openai",    color:"#6ee7b7" },
];

// ─── AI VERSION B — shot breakdown with Director critique injected ─────────────
// Same as aiShots but prepends the Director's findings so the model knows what
// the previous breakdown got wrong and must address.
async function aiVersionB(scene, model, critique) {
  const critText = [
    critique.skippedBeats?.length  ? `Skipped beats: ${critique.skippedBeats.join("; ")}` : "",
    critique.overlapIssues?.length ? `Overlap issues: ${critique.overlapIssues.join("; ")}` : "",
    critique.recommendation        ? `Recommendation: ${critique.recommendation}` : "",
    ...(critique.shotIssues||[]).map(i=>`Shot ${i.index} flagged: ${i.issue}`),
  ].filter(Boolean).join("\n");

  const sceneWithCritique = {
    ...scene,
    sceneText: scene.sceneText,
    _versionBCritique: critText,
  };
  return aiShots(sceneWithCritique, model, critText);
}

// ─── AI RETRY SINGLE SHOT ─────────────────────────────────────────────────────
// Regenerates ONE shot given the Director's specific issue with it.
async function aiRetrySingleShot(scene, shot, issue, model) {
  const bible = scene.bible.map(e=>`${e.tag} (${e.kind}: ${e.name})`).join(", ")||"none";
  const styleGuide = STYLE_GUIDE[scene.cinematicStyle] || "Clear, vivid, professional cinematography.";

  const sys = `You are a film director. A specific shot in a breakdown was flagged with a problem. Generate ONE improved replacement shot that fixes the issue while still covering the same narrative beat.

Rules:
- Cover the same story beat as the original shot (same sourceAnchor)
- Fix the specific problem described in the critique
- Return ONLY a single JSON object (not an array) with these exact fields: index, durationSec, sourceAnchor, where, entityTags, how, when, cameraSize, cameraAngle, cameraMovement, lens, lighting, visualGoal

cameraSize values: ${JSON.stringify(CAMERA_SIZES)}
cameraAngle values: ${JSON.stringify(CAMERA_ANGLES)}
cameraMovement values: ${JSON.stringify(CAMERA_MOVEMENTS)}
lighting values: ${JSON.stringify(LIGHTING_STYLES)}
STYLE: ${scene.cinematicStyle.toUpperCase()}: ${styleGuide}`;

  const usr = `Scene: "${scene.sceneText}"\nBible: ${bible}\n\nOriginal shot ${shot.index}: ${shot.how} in ${shot.where}. Camera: ${shot.cameraSize}, ${shot.cameraAngle}. Visual goal: ${shot.visualGoal}.\n\nDirector critique: ${issue}\n\nGenerate an improved replacement.`;

  const m = SHOT_MODELS.find(x=>x.id===model) || SHOT_MODELS[0];
  let txt = "";
  if (m.provider === "anthropic") {
    const r = await fetch("/api/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:m.id, max_tokens:800, system:sys, messages:[{role:"user",content:usr}] })
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${raw.slice(0,200)}`);
    const d = JSON.parse(raw);
    txt = d.content?.map(b=>b.text||"").join("")||"";
  } else {
    const r = await fetch("/api/oai/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:m.id, max_tokens:800, messages:[{role:"system",content:sys},{role:"user",content:usr}] })
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${raw.slice(0,200)}`);
    const d = JSON.parse(raw);
    const outputBlock = d.output?.find(o=>o.type==="message");
    txt = outputBlock?.content?.find(ct=>ct.type==="output_text")?.text || d.choices?.[0]?.message?.content || "";
  }
  const clean = txt.replace(/```json|```/g,"").trim();
  const start = clean.indexOf("{"); const end = clean.lastIndexOf("}");
  if (start===-1||end===-1) throw new Error("No JSON in retry response");
  return JSON.parse(clean.slice(start,end+1));
}

async function aiShots(scene, model, versionBCritique = "") {
  const bible = scene.bible.map(e=>`${e.tag} (${e.kind}: ${e.name}${e.notes ? ` — ${e.notes}` : ""})`).join(", ")||"none";
  const styleGuide = STYLE_GUIDE[scene.cinematicStyle] || "Clear, vivid, professional cinematography.";
  const sys = `You are a film director and script breakdown assistant.
Your task is to read the current scene and convert it into a technical shot list, dividing the action into exactly ${scene.shotCount} shots.

MANDATORY STEPS BEFORE GENERATING SHOTS:
1. Read the full scene from start to finish.
2. Identify all distinct story moments in chronological order — changes of action, character, time, or space.
3. Divide those moments into ${scene.shotCount} proportional narrative segments, covering the scene from start to finish.
4. Generate exactly one shot per segment, in chronological order.

CRITICAL DISTRIBUTION RULE:
- Shots must cover the ENTIRE scene, from first moment to last.
- It is forbidden to assign two or more shots to the same story beat.
- Scenes with a time jump, character change, or location change REQUIRE separate shots for each moment.
- Shot index 1 must cover the beginning of the scene. The last shot must cover the end of the scene.

Base everything only on the current scene.
Do not invent actions, characters, objects or events not explicitly present in this scene.
Do not use backstory, previous scenes or future scenes.
Think visually, like cinema — not like literature.
Break the scene into filmable, objective, production-ready shots.
Avoid metaphors, poetic phrases or abstract language.
Prioritise practical clarity for on-set shooting.
Return only a JSON array. ALL field values must be in English.

Each shot must contain exactly these fields:
- index
- durationSec (integer between 1 and 5)
- sourceAnchor
- where
- entityTags
- how
- when
- cameraSize
- cameraAngle
- cameraMovement
- lens
- lighting
- visualGoal
- dialogue (string — the exact spoken line(s) delivered in this shot, or empty string "" if no dialogue occurs in this shot)

Field rules:
- sourceAnchor = exact or near-exact quote from the scene text that justifies this shot
- where = visible physical location
- entityTags = only tags that already exist in the bible (array)
- how = visible action in the frame
- when = simple temporal context
- lens = short technical value, e.g. 35mm, 50mm, 85mm
- lighting = short technical description
- visualGoal = short, filmable dramatic intention
- dialogue = if the scene has dialogue lines, assign each line to the shot where it is spoken; use the exact wording from the script; if a shot has no spoken words, set to ""

cameraSize must be ONLY one of:
${JSON.stringify(CAMERA_SIZES)}

cameraAngle must be ONLY one of:
${JSON.stringify(CAMERA_ANGLES)}

cameraMovement must be ONLY one of:
${JSON.stringify(CAMERA_MOVEMENTS)}

lighting must be ONLY one of:
${JSON.stringify(LIGHTING_STYLES)}

STYLE GUIDE — ${scene.cinematicStyle.toUpperCase()}: ${styleGuide}

Apply the style through:
- framing choice
- angle choice
- movement choice
- lens choice
- lighting choice
- shot rhythm

Do NOT apply the style through literary language.

Correct field examples:
- sourceAnchor: "Dimitri reaches toward the smoking stone"
- where: "olive terrace, afternoon light"
- how: "@dimitri extends his arm toward the meteorite"
- when: "just after impact"
- lens: "85mm"
- lighting: "hard-contrast"
- visualGoal: "show impact and rupture"

Forbidden:
- poetic phrases
- metaphorical language
- abstract atmospheric descriptions
- details outside the current scene

Return only JSON.`;
  const critiqueBlock = versionBCritique
    ? `\n\nVERSION B — DIRECTOR CRITIQUE FROM PREVIOUS BREAKDOWN:\nThe previous breakdown had these problems. You MUST fix all of them:\n${versionBCritique}\n`
    : "";
  const dialogueBlock = (scene.dialogueLines?.length)
    ? `\n\nDIALOGUE LINES IN THIS SCENE (assign each to the shot where it is spoken):\n${scene.dialogueLines.map((d,i) => `${i+1}. ${d.speaker}: "${d.line}"`).join("\n")}`
    : "";
  const usrText = `Scene: "${scene.sceneText}"\nStyle: ${scene.cinematicStyle}\nShots: ${scene.shotCount}\nBible: ${bible}${dialogueBlock}${critiqueBlock}`;

  // Build multimodal user content: character images first, then the text prompt
  // This lets the AI visually identify each character (age, appearance, role)
  const sceneVisualStyle = normalizeVisualStyle(scene.visualStyle || "none");
  const bibleImgs = scene.bible
    .map(e => withResolvedEntryImage(e, sceneVisualStyle))
    .filter(e => e._prev && (e._prev.startsWith("data:") || e._prev.startsWith("/")));

  function buildAnthropicContent() {
    const parts = [];
    for (const e of bibleImgs) {
      parts.push({ type:"text", text:`CHARACTER IMAGE — ${e.tag} (${e.name}${e.notes ? ` · ${e.notes}` : ""}):` });
      if (e._prev.startsWith("data:")) {
        const comma = e._prev.indexOf(",");
        const mimeType = e._prev.slice(5, e._prev.indexOf(";"));
        parts.push({ type:"image", source:{ type:"base64", media_type: mimeType, data: e._prev.slice(comma+1) } });
      } else {
        // Public URL path — use url source type
        const url = e._prev.startsWith("/") ? `${window.location.origin}${e._prev}` : e._prev;
        parts.push({ type:"image", source:{ type:"url", url } });
      }
    }
    parts.push({ type:"text", text: usrText });
    return parts;
  }

  function buildOAIContent() {
    // OpenAI Responses API uses "input_text" and "input_image", not "text"/"image_url"
    const parts = [];
    for (const e of bibleImgs) {
      parts.push({ type:"input_text", text:`CHARACTER IMAGE — ${e.tag} (${e.name}${e.notes ? ` · ${e.notes}` : ""}):` });
      parts.push({ type:"input_image", image_url: e._prev });
    }
    parts.push({ type:"input_text", text: usrText });
    return parts;
  }

  const m = SHOT_MODELS.find(x=>x.id===model) || SHOT_MODELS[0];
  let txt = "";
  if (m.provider === "anthropic") {
    const userContent = bibleImgs.length > 0 ? buildAnthropicContent() : usrText;
    const r = await fetch("/api/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:m.id, max_tokens:4000, system:sys, messages:[{role:"user", content: userContent}] })
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${raw.slice(0,300)}`);
    const d = JSON.parse(raw);
    txt = d.content?.map(b=>b.text||"").join("")||"";
  } else {
    const userContent = bibleImgs.length > 0 ? buildOAIContent() : usrText;
    const r = await fetch("/api/oai/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:m.id, max_tokens:4000, messages:[{role:"system",content:sys},{role:"user", content: userContent}] })
    });
    const raw = await r.text();
    console.log("OpenAI raw response:", raw.slice(0, 500));
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${raw.slice(0,500)}`);
    const d = JSON.parse(raw);
    // Responses API returns output array
    const outputBlock = d.output?.find(o => o.type === "message");
    txt = outputBlock?.content?.find(ct => ct.type === "output_text")?.text
      || d.choices?.[0]?.message?.content  // fallback for chat completions
      || "";
  }
  if (!txt) throw new Error("Empty response from model");
  const clean = txt.replace(/```json|```/g,"").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array in response:\n" + clean.slice(0,400));
  return JSON.parse(clean.slice(start, end+1));
}
// ─── AI DIRECTOR PASS ────────────────────────────────────────────────────────
// Second-pass LLM call that reads finished shots and annotates each with a
// director's note — the emotional/visual WHY behind each shot.
// Runs AFTER aiShots so it can never corrupt the story-fidelity of the breakdown.
async function aiDirectorPass(scene, shots, model) {
  const shotsDesc = shots.map(s =>
    `Shot ${s.index}: ${s.how} in ${s.where}. Camera: ${s.cameraSize}, ${s.cameraAngle}, ${s.cameraMovement}. Visual goal: ${s.visualGoal}.`
  ).join("\n");

  const sys = `You are an experienced film director reviewing a shot breakdown. Your job is two things:

1. ANNOTATE each shot with a director's note — 1-2 sentences on the emotional/visual WHY behind it.
2. CHECK the breakdown for coherence issues against the original scene text.

For each shot, assess quality:
- "good" = shot is well-chosen for its dramatic beat
- "warn" = shot works but has a minor weakness (e.g. wrong lens for intimacy, redundant with adjacent shot)
- "flag" = shot has a real problem (e.g. wrong camera size for the moment, misses key action, duplicates another shot)

For the scene as a whole, check:
- Are there narrative beats in the scene text that NO shot covers?
- Do any two shots describe the same moment?
- Does the breakdown cover the scene from start to finish?

Rules:
- Do NOT rewrite or restructure any shot — flag only, never fix
- Be specific and filmable — no abstract metaphors
- Write everything in English
- Return ONLY a JSON object in this exact shape:
{
  "shots": [
    { "index": 1, "directorNote": "...", "quality": "good|warn|flag", "issue": "short description if warn or flag, else empty string" }
  ],
  "coherence": {
    "score": 0-100,
    "skippedBeats": ["..."],
    "overlapIssues": ["..."],
    "recommendation": "one sentence, empty string if all good"
  }
}`;

  const usr = `Scene: "${scene.sceneText}"\nStyle: ${scene.cinematicStyle}\n\nShots:\n${shotsDesc}`;
  // Director pass uses Haiku — annotation/flagging task, no frontier model needed
  let txt = "";
  try {
    const r = await fetch("/api/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:2000, system:sys, messages:[{role:"user",content:usr}] })
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${raw.slice(0,200)}`);
    const d = JSON.parse(raw);
    txt = d.content?.map(b=>b.text||"").join("")||"";
    const clean = txt.replace(/```json|```/g,"").trim();
    const start = clean.indexOf("{"); const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(clean.slice(start, end+1));
  } catch(e) {
    console.warn("Director pass failed (non-blocking):", e.message);
    return null;
  }
}

async function aiInjectTag(sceneText, entry, existingBible, model) {
  // If no scene text yet, just return a placeholder sentence
  if (!sceneText.trim()) {
    return `${entry.tag} is present in this scene.`;
  }
  const bibleDesc = existingBible.map(e=>`${e.tag} = ${e.kind} "${e.name}"${e.notes ? ` (${e.notes})` : ""}`).join("\n") || "none";
  const sys = `You are a screenplay editor. A new entity was added to the scene bible. Update the scene text to include this entity's EXACT @tag.

RULES:
1. If the entity's name already appears in the text, replace it with the @tag (e.g. "John" → "@c3a2").
2. If the entity is not mentioned, insert a brief natural reference using the @tag (e.g. "@c3a2 stands nearby").
3. Do NOT change anything else in the text.
4. Return ONLY the updated scene text. No commentary, no quotes, no markdown.`;
  const usr = `Current scene text:\n"${sceneText}"\n\nExisting bible entities:\n${bibleDesc}\n\nNEW entity to inject: ${entry.tag} = ${entry.kind} "${entry.name}"\n\nReturn the scene text with ${entry.tag} properly referenced.`;
  const m = SHOT_MODELS.find(x=>x.id===model) || SHOT_MODELS[0];
  let txt = "";
  if (m.provider === "anthropic") {
    const r = await fetch("/api/messages", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:m.id, max_tokens:500, system:sys, messages:[{role:"user",content:usr}] }) });
    const raw = await r.text();
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${raw.slice(0,200)}`);
    txt = JSON.parse(raw).content?.map(b=>b.text||"").join("")||"";
  } else {
    const r = await fetch("/api/oai/messages", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:m.id, max_tokens:500, messages:[{role:"system",content:sys},{role:"user",content:usr}] }) });
    const raw = await r.text();
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${raw.slice(0,200)}`);
    const d = JSON.parse(raw);
    txt = d.output?.find(o=>o.type==="message")?.content?.find(c=>c.type==="output_text")?.text || d.choices?.[0]?.message?.content || "";
  }
  return txt.trim() || sceneText;
}

// ─── AI LLM NODE — targeted edit command on any connected node ────────────────
async function aiLlm(command, nodeType, nodeContent) {
  const fieldGuide = {
    [T.SHOT]:  `Editable fields: how (action description), where (location), when (time of day / temporal context), cameraSize (must be one of ${JSON.stringify(CAMERA_SIZES)}), cameraAngle (must be one of ${JSON.stringify(CAMERA_ANGLES)}), cameraMovement (must be one of ${JSON.stringify(CAMERA_MOVEMENTS)}), lighting (must be one of ${JSON.stringify(LIGHTING_STYLES)}), lens (e.g. "35mm","50mm","85mm"), visualGoal (the visual purpose of this shot), visualStyle (must be one of ${JSON.stringify(["inherit", ...VISUAL_STYLES])}), durationSec (integer 1-15).`,
    [T.SCENE]: `Editable fields: sceneText (full scene prose), cinematicStyle (must be one of ${JSON.stringify(CINEMATIC_STYLES)}), visualStyle (must be one of ${JSON.stringify(VISUAL_STYLES)}).`,
    [T.IMAGE]: `Editable fields: prompt (image generation prompt).`,
    [T.KLING]: `Editable fields: manualPrompt (the Kling video generation prompt).`,
    [T.VEO]:   `Editable fields: manualPrompt (the Veo video generation prompt).`,
  }[nodeType] || "Editable fields: any text fields.";

  const sys = `You are a cinematic AI assistant built into a storyboard tool. The user will give you a command and the current content of a ${nodeType.toUpperCase()} node.

Apply the command intelligently. Return ONLY a valid JSON object containing ONLY the fields that should change — omit fields that stay the same.
${fieldGuide}

RULES:
- Return ONLY raw JSON. No markdown fences, no explanations, no commentary.
- If a field must match an enum, use only valid values.
- Be surgical: change as little as possible to satisfy the command.`;

  const usr = `Command: "${command}"\n\nCurrent node:\n${JSON.stringify(nodeContent, null, 2)}`;

  const r = await fetch("/api/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1000, system: sys, messages: [{ role: "user", content: usr }] })
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Claude ${r.status}: ${raw.slice(0, 200)}`);
  const d = JSON.parse(raw);
  const txt = d.content?.map(b => b.text || "").join("") || "";
  const clean = txt.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{"); const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response: " + clean.slice(0, 200));
  return JSON.parse(clean.slice(start, end + 1));
}

// ─── AI COHERENCE CHECK — multi-node scene+shot analysis ──────────────────────
async function aiMusicBlueprint(musicNode, audioNode) {
  const analysis = musicNode.analysis;
  if (!analysis?.sections?.length) throw new Error("Analyze the music before generating a blueprint.");
  const blueprintGuide = buildMusicVideoBlueprintGuide(analysis, musicNode);

  const sys = `You are a music-video director. Convert a song structure analysis into a generation-ready visual blueprint for an AI filmmaking canvas.

Return ONLY a raw JSON object with this exact shape:
{
  "title": "short clip title",
  "creativeSummary": "1-2 sentence overview",
  "scenes": [
    {
      "sectionLabel": "INTRO",
      "sceneText": "continuous prose describing what happens visually in this section",
      "cinematicStyle": "must be one of ${JSON.stringify(CINEMATIC_STYLES)}",
      "visualStyle": "must be one of ${JSON.stringify(VISUAL_STYLES)}",
      "shotCount": 2,
      "shots": [
        {
          "index": 1,
          "durationSec": 3,
          "sourceAnchor": "short quote from the section label or lyric idea",
          "where": "visible location",
          "entityTags": [],
          "how": "single primary visible action",
          "when": "simple temporal context",
          "cameraSize": "medium",
          "cameraAngle": "eye-level",
          "cameraMovement": "static",
          "lens": "35mm",
          "lighting": "natural-soft",
          "visualGoal": "specific cinematic purpose",
          "dialogue": ""
        }
      ]
    }
  ]
}

Rules:
- One scene per music section.
- Each scene must reflect its section energy and visual role.
- The blueprint must visibly express rhythm, repetition, pressure, and release from the music itself.
- Each shot must describe ONE clear action or image, practical for AI generation.
- Each shot duration must be an integer between 1 and 5 seconds.
- Each scene must stay within ${KLING_MAX_SHOTS} shots and ${KLING_MAX_SECS} total seconds.
- Prefer performance / motif / narrative staging that can be edited later.
- Use the provided directionBlueprint as the primary visual grammar.
- Avoid generic arthouse filler like lone figures at dawn, foggy contemplation, empty plazas, or vague mood-only scenes unless the user's concept or lyrics clearly call for that.
- For beat-driven genres, prefer visual repetition, pressure, light logic, body rhythm, environment rhythm, and section-specific escalation.
- If lyrics are present, use them as inspiration only where relevant; do not quote long passages.
- Keep entityTags empty unless the user explicitly provided tagged entities.
- Return only valid JSON, no markdown.`;

  const usr = JSON.stringify({
    clipMode: musicNode.clipMode || "hybrid",
    genre: musicNode.genre || "auto",
    concept: musicNode.concept || "",
    lyrics: musicNode.lyrics || "",
    preferredVisualStyle: musicNode.visualStyle || "none",
    audio: {
      fileName: audioNode?.fileName || "",
      durationSec: analysis.durationSec,
      bpm: analysis.bpm,
      beatsDetected: analysis.beatsDetected,
      energyCurve: analysis.energyCurve,
    },
    sections: analysis.sections,
    notableMoments: analysis.notableMoments,
    directionBlueprint: blueprintGuide,
  }, null, 2);

  const r = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Claude ${r.status}: ${raw.slice(0, 250)}`);
  const d = JSON.parse(raw);
  const txt = d.content?.map(block => block.text || "").join("") || "";
  const clean = txt.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in music blueprint response.");
  return JSON.parse(clean.slice(start, end + 1));
}

async function aiCoherenceCheck(nodes, command) {
  const sceneNodes = nodes.filter(n => n.type === T.SCENE);
  const shotNodes  = nodes.filter(n => n.type === T.SHOT);

  // Group shots by their parent scene for sequence-level analysis
  const sceneMap = Object.fromEntries(sceneNodes.map(s => [s.id, s]));
  const shotsByScene = {};
  shotNodes.forEach(sh => {
    const sid = sh.sceneId || "__unlinked__";
    if (!shotsByScene[sid]) shotsByScene[sid] = [];
    shotsByScene[sid].push(sh);
  });

  // Build structured context grouped by scene → shots
  const context = sceneNodes.map(scene => ({
    id: scene.id,
    type: "SCENE",
    sceneText: scene.sceneText || "",
    cinematicStyle: scene.cinematicStyle || "",
    shots: (shotsByScene[scene.id] || [])
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map(sh => ({
        id: sh.id,
        index: sh.index,
        sourceAnchor: sh.sourceAnchor || "",
        how: sh.how || "",
        where: sh.where || "",
        when: sh.when || "",
        entityTags: sh.entityTags || [],
        cameraSize: sh.cameraSize || "",
        cameraAngle: sh.cameraAngle || "",
        cameraMovement: sh.cameraMovement || "",
        lighting: sh.lighting || "",
        visualGoal: sh.visualGoal || "",
        directorNote: sh.directorNote || "",
        visualHint: sh.visualHint || "",
        dialogue: sh.dialogue || "",
        durationSec: sh.durationSec || 0,
      })),
  }));

  // Also include any unlinked shots
  if (shotsByScene["__unlinked__"]?.length) {
    context.push({
      id: "__unlinked__", type: "UNLINKED_SHOTS",
      shots: shotsByScene["__unlinked__"].map(sh => ({
        id: sh.id, index: sh.index, how: sh.how || "", where: sh.where || "",
        visualGoal: sh.visualGoal || "", sourceAnchor: sh.sourceAnchor || "",
      })),
    });
  }

  const sys = `You are a senior script supervisor and continuity editor analyzing a storyboard for a short film or video production.

You receive SCENE nodes (with the full scene prose) and their child SHOT nodes (ordered by index). Your job is to do a thorough coherence review across six dimensions:

────────────────────────────────────────────
1. BEAT COVERAGE — Does the sequence of shots cover all the story beats in the scene text?
   • Flag if important actions, reveals, or dialogue beats from sceneText have no corresponding shot.
   • Flag if shots reference actions/characters/locations that do NOT exist in the scene text (hallucination risk).
   • Fix: update sourceAnchor to a verbatim 5-20 word quote from sceneText that justifies each shot.

2. SEQUENCE LOGIC — Does the shot order make narrative and spatial sense?
   • Check that establishing shots come before close-ups when introducing a new space.
   • Flag if there are abrupt jump cuts with no transitional logic (e.g., two consecutive extreme close-ups on the same subject with no spatial re-establishment).
   • Flag if character/object continuity breaks (e.g., a character is introduced in shot 3 but only the location is established in shot 5).

3. CUT CORRECTNESS — Are the edit cuts cinematically sound?
   • Check the 180° rule: if two characters face each other, their eye-line relationship must stay consistent across cuts.
   • Check for match-cut opportunities (movement, eyeline, action) that are being missed.
   • Flag where/when values that conflict between consecutive shots in the same scene.

4. SHOT BALANCE — Is there good coverage variety?
   • A scene should typically have: 1 wide/establishing shot, medium shots for action, close-ups for emotional beats.
   • Flag if ALL shots are the same cameraSize (e.g., all medium) — this produces flat coverage.
   • Flag if dialogue shots lack a corresponding reaction shot.

5. VISUAL GOAL — Every shot must have a clear cinematic purpose.
   • If visualGoal is empty or generic, write a specific purpose: "reveal the gap between what the character says and feels", "establish the threat looming behind the protagonist", etc.

6. HALLUCINATION PREVENTION — The most critical check.
   • Cross-reference every shot's "how", "where", "entityTags" against the scene text.
   • If a shot describes an action, character, or location detail that is NOT present in the scene text and cannot be reasonably inferred, flag it and suggest a correction grounded in the scene.

7. SHOT COMPLEXITY / AI GENERATION VIABILITY — Every shot must be generatable by an AI video model.
   • A single shot must describe ONE primary action or moment, not a sequence of events.
   • RED FLAGS that will cause AI video generation to fail or produce incoherent output:
     - Multiple characters doing different things simultaneously (e.g. "A runs left while B fires and C ducks")
     - A character performing more than one distinct action in sequence (e.g. "picks up the gun, loads it, and aims")
     - A location change within a single shot description
     - Shots that contain a cause AND an effect (e.g. "the explosion happens and the wall collapses")
     - More than 2-3 active entities in complex interaction
   • RULE: one shot = one action = one moment. If a shot "how" field contains multiple verbs describing distinct sequential events, it must be split or simplified.
   • Fix: rewrite "how" to describe only the single most important visual action for that shot. Use directorNote to explain what was removed and suggest it becomes its own shot.
   • Also check durationSec vs complexity: a 3s shot cannot credibly show a long physical sequence. Flag and suggest either simplifying the action or increasing duration.

────────────────────────────────────────────
OUTPUT RULES:
• Return a JSON object where each key is a node ID (scene or shot) and each value is a patch with ONLY the fields to change.
• For shots: patchable fields are sourceAnchor, how, where, when, visualGoal, cameraSize, cameraAngle, cameraMovement, lighting, directorNote, visualHint.
• Use directorNote to explain a coherence issue without changing creative intent (e.g. "Check 180° — previous shot has character entering from left").
• For every shot, always output a visualHint: a single concrete sentence (15–25 words) that translates BOTH visualGoal and directorNote into observable camera/framing/timing/subject behavior. This is the only part of the director's intent that goes into the video generation prompt — zero abstract language, zero reasoning. Only what the camera physically sees or does.
  Examples: visualGoal "make the ritual feel intimate" + directorNote "let the brass and the eyes carry the tension" → visualHint "extreme close-up locked on the object and face, no movement, shallow depth of field isolating both".
  If visualHint already exists on a shot and is still accurate, you may leave it unchanged (do not emit it in the patch).
• ONLY include nodes that actually need changes. Empty patches are forbidden.
• Return ONLY raw JSON. No markdown, no explanation outside the JSON.

Example:
{
  "sh_abc": { "sourceAnchor": "the door splinters open and smoke pours in", "visualGoal": "establish the violence of the entry before we see a face" },
  "sh_xyz": { "cameraSize": "close-up", "directorNote": "Previous shot was also medium — vary to close-up to land the emotional beat" },
  "sh_999": { "how": "Character reacts to the sound — DO NOT show the attacker yet", "directorNote": "Shot 4 reveals the attacker; this shot must preserve the mystery" }
}`;

  const usr = `${command?.trim() ? `Director's note / specific focus: "${command}"\n\n` : ""}Storyboard to analyze:\n${JSON.stringify(context, null, 2)}`;

  const r = await fetch("/api/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    })
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Claude ${r.status}: ${raw.slice(0, 200)}`);
  const d = JSON.parse(raw);
  const txt = d.content?.map(b => b.text || "").join("") || "";
  const clean = txt.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{"); const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response: " + clean.slice(0, 200));
  return JSON.parse(clean.slice(start, end + 1));
}

const STYLE_GUIDE = {
  drama:         "Slow, deliberate pacing. Focus on emotional subtext, tension in silence, internal conflict made visible through action and environment. Language is measured and weighty.",
  thriller:      "Tight, urgent pacing. Every detail feels like a threat or clue. Paranoia, shadows, and misdirection dominate. Sentences are short, punchy, breathless.",
  action:        "High kinetic energy. Movement is constant. Describe motion, impact, and spectacle with visceral precision. No wasted words — momentum above all.",
  noir:          "Rain-slicked streets, moral ambiguity, fatalism. Use moody, poetic language with a cynical edge. Light and shadow are characters themselves.",
  "sci-fi":      "Clinical precision mixed with awe. Technology and environment feel alien but logical. Establish the rules of this world through specific, grounded details.",
  "epic-fantasy":"Grand scale, mythic stakes. Rich world-building details, archaic or elevated language. Nature and architecture carry symbolic weight.",
  documentary:   "Observational, grounded, present-tense energy. Describe what a camera would capture — no internal states, only visible behavior and environment.",
  comedy:        "Timing is everything. Absurdity builds logically. Describe actions and reactions with playful specificity. Contrast and surprise drive the humor.",
};

async function aiRewriteScene(scene, model) {
  const bible = scene.bible.map(e=>`${e.tag} = ${e.kind} "${e.name}"`).join("\n")||"none";
  const styleGuide = STYLE_GUIDE[scene.cinematicStyle] || "Clear, vivid, professional scene description.";
  const sys = `You are a professional screenwriter and scene rewriter specializing in the "${scene.cinematicStyle}" genre.

Rewrite the user's input as a proper cinematic scene, not as a summary, tagline, character bio, or premise line.

STYLE — ${scene.cinematicStyle.toUpperCase()}: ${styleGuide}

CRITICAL RULES:
1. Write the output as a SCENE, in continuous prose action, with visible events unfolding moment by moment.
2. Expand the input into 1 to 3 solid paragraphs of cinematic scene writing.
3. Show environment, movement, tension, and action beats clearly enough for shot generation.
4. Preserve ALL story beats, facts, and creative intent from the user input.
5. Do NOT invent major plot events beyond what is implied.
6. Every character and object in the ENTITY BIBLE must appear using their EXACT @tag (e.g. @c3a2). Never write a character's plain name alone — always use the @tag.
7. If a bible entity is not mentioned in the original text, weave it in naturally using the @tag.
8. Avoid logline style. Avoid compressed biographical summary. Avoid "Years later..." shortcuts unless dramatized as part of the scene.
9. Prioritize present, visible, cinematic action over exposition.
10. Return ONLY the rewritten scene text. No commentary, no markdown, no quotes.`;
  const usr = `Rewrite this user input into a cinematic scene in prose.\n\nUser input:\n"${scene.sceneText}"\n\nENTITY BIBLE:\n${bible}\n\nCinematic style:\n${scene.cinematicStyle}\n\nGoal:\nProduce a scene that can later be broken into coherent shots.`;
  const m = SHOT_MODELS.find(x=>x.id===model) || SHOT_MODELS[0];
  let txt = "";
  if (m.provider === "anthropic") {
    const r = await fetch("/api/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:m.id, max_tokens:2000, system:sys, messages:[{role:"user",content:usr}] })
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${raw.slice(0,300)}`);
    const d = JSON.parse(raw);
    txt = d.content?.map(b=>b.text||"").join("")||"";
  } else {
    const r = await fetch("/api/oai/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:m.id, max_tokens:2000, messages:[{role:"system",content:sys},{role:"user",content:usr}] })
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${raw.slice(0,300)}`);
    const d = JSON.parse(raw);
    const outputBlock = d.output?.find(o=>o.type==="message");
    txt = outputBlock?.content?.find(ct=>ct.type==="output_text")?.text || d.choices?.[0]?.message?.content || "";
  }
  if (!txt) throw new Error("Empty response from model");
  return txt.trim();
}

async function aiImage(prompt, references=[], aspect_ratio="1:1", resolution="1K") {
  const r = await fetch("/api/gemini/image",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ prompt, references, aspect_ratio, resolution }) });
  const d = await r.json();
  const p = d.candidates?.[0]?.content?.parts?.find(x=>x.inlineData);
  if(!p) throw new Error(d.error?.message||"No image returned");
  return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
}

// Extrai { mimeType, data, tag, name } de uma entrada do bible com _prev (data URL)
function bibleToRef(e, style = "none") {
  const img = resolveEntryImage(e, style);
  if (!img || !img.startsWith("data:")) return null;
  const [header, data] = img.split(",");
  const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  return { mimeType, data, tag: e.tag, name: e.name, kind: e.kind };
}

// ─── KLING VIDEO ──────────────────────────────────────────────────────────────
// Extract pure base64 from a data URL (strips "data:image/xxx;base64," prefix)
function dataUrlToBase64(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

// Create a video generation task — single-shot or multi-shot
// options: { multiShot, sceneShots, aspect_ratio, mode, sound }
async function aiKlingCreate(shot, sceneBible = [], options = {}) {
  const { multiShot = false, sceneShots = [], aspect_ratio = "16:9", mode = "pro", resolution = "720p", sound = "off", prevVideoUrl = null, imageRefUrls = [], voice = "none", klingVersion = "v3" } = options;

  // When a previous video is used as reference, Kling limits total images+elements to 4
  const maxImages = prevVideoUrl ? 4 : 7;

  // Explicit image references wired from Image nodes — prepended before bible images
  // so they occupy the first N slots (image_1, image_2, ...)
  const validRefUrls = imageRefUrls.filter(u => u && (u.startsWith("data:") || u.startsWith("http")));
  const refSlots = validRefUrls.slice(0, Math.min(validRefUrls.length, maxImages - 1));
  const refOffset = refSlots.length; // bible images start after these

  // Build image list AND a tag→<<<image_N>>> map so each character can be
  // referenced explicitly in the prompt (Kling ignores image_list without it)
  const bibleWithImages = sceneBible
    .filter(e => e._prev && (e._prev.startsWith("data:") || e._prev.startsWith("http") || e._prev.startsWith("/")))
    .slice(0, maxImages - refOffset);

  const tagToRef = {};
  bibleWithImages.forEach((e, i) => { tagToRef[e.tag] = `<<<image_${refOffset + i + 1}>>>`; });

  // Ref images first, then bible images
  const imageList = [
    ...refSlots.map(u => ({ image_url: u.startsWith("data:") ? dataUrlToBase64(u) : u })),
    ...bibleWithImages.map(e => {
      if (e._prev.startsWith("data:")) return { image_url: dataUrlToBase64(e._prev) };
      // Convert relative public paths to absolute URLs for Kling
      const url = e._prev.startsWith("/") ? `${window.location.origin}${e._prev}` : e._prev;
      return { image_url: url };
    }),
  ];

  // Image ref tags for the first N wired images (<<<image_1>>>, <<<image_2>>>, ...)
  // These are injected into the prompt prefix so Kling uses them as visual references
  const refTagStr = refSlots.map((_, i) => `<<<image_${i + 1}>>>`).join(" ");

  // Replace every @tag in a prompt string with "@tag <<<image_N>>>"
  // so Kling knows which reference image corresponds to which character.
  function injectRefs(prompt) {
    if (!prompt || !Object.keys(tagToRef).length) return prompt || "";
    let result = prompt;
    for (const [tag, ref] of Object.entries(tagToRef)) {
      if (result.includes(tag) && !result.includes(ref)) {
        result = result.split(tag).join(`${tag} ${ref}`);
      }
    }
    return result;
  }

  let body;

  if (multiShot && sceneShots.length > 0) {
    // ── MULTI-SHOT MODE ─────────────────────────────────────────────────────
    const shotPlan = buildKlingShotPlan(sceneShots, true);
    const shots = shotPlan.map(p => p.shot);
    if (shots.length === 0) throw new Error("No shots with prompts found for multi-shot.");
    const total = shotPlan.reduce((sum, p) => sum + p.durationSec, 0);

    const multi_prompt = shotPlan.map(({ shot: sh, durationSec }, i) => {
      const raw = (sh.compiledText || `${sh.how || ""} in ${sh.where || ""}`).trim();
      let text = injectRefs(raw || `Shot ${i + 1}`);
      text = applyVisualStylePrompt(text, sh.visualStyle, "video");
      // On the first shot, anchor visual continuity to the previous video
      if (i === 0 && prevVideoUrl) text = `<<<video_1>>> ${text}`;
      // Prepend image ref tags on the first shot so Kling uses them as visual references
      if (i === 0 && refTagStr) text = `${refTagStr} ${text}`;
      return { index: i + 1, prompt: text.slice(0, 512), duration: String(durationSec) };
    });

    body = {
      model_name:   klingVersion === "v1.6" ? "kling-v1-6" : "kling-v3-omni",
      multi_shot:   klingVersion === "v3",  // multi-shot is V3 omni only
      shot_type:    "customize",
      prompt:       klingVersion === "v3" ? "" : (multi_prompt[0]?.prompt || ""),
      ...(klingVersion === "v3" ? { multi_prompt } : {}),
      duration:     String(total),
      aspect_ratio,
      mode,
      resolution,
      sound: prevVideoUrl ? "off" : sound,
      klingVersion,
    };
  } else {
    // ── SINGLE-SHOT MODE ────────────────────────────────────────────────────
    const rawPrompt = shot.compiledText || `${shot.how} in ${shot.where}`;
    const promptWithRefs = injectRefs(applyVisualStylePrompt(rawPrompt, shot.visualStyle, "video"));
    const promptFinal = refTagStr ? `${refTagStr} ${promptWithRefs}` : promptWithRefs;
    body = {
      model_name:   klingVersion === "v1.6" ? "kling-v1-6" : "kling-v3-omni",
      multi_shot:   false,
      prompt:       prevVideoUrl ? `<<<video_1>>> ${promptFinal}` : promptFinal,
      duration:     String(buildKlingShotPlan([shot], false)[0]?.durationSec || 5),
      aspect_ratio,
      mode,
      resolution,
      sound: prevVideoUrl ? "off" : sound,
      klingVersion,
    };
  }

  if (imageList.length > 0) body.image_list = imageList;

  // Inject voice when specified (used by lipsync-aware generation)
  if (voice && voice !== "none") body.voice = voice;

  // Feature-reference the previous video for visual continuity
  if (prevVideoUrl) {
    body.video_list = [{ video_url: prevVideoUrl, refer_type: "feature", keep_original_sound: "no" }];
  }

  const r = await fetch("/api/kling/video", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  if (!r.ok) {
    if (r.status === 402) {
      const body = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
      const err = new Error("insufficient_credits");
      err.creditsError = { needed: body.credits_needed || 0, balance: body.credits_balance || 0 };
      throw err;
    }
    throw new Error(`Kling ${r.status}: ${raw.slice(0, 300)}`);
  }
  const d = JSON.parse(raw);
  if (d.code && d.code !== 0) throw new Error(`Kling error ${d.code}: ${d.message}`);
  return d.data?.task_id;
}

// Poll until succeed/failed — returns { id, url, durationMs } on success
async function aiKlingPoll(taskId, onStatus, klingVersion = "v3") {
  const verParam = klingVersion === "v1.6" ? "?ver=v1.6" : "";
  for (let i = 0; i < 180; i++) {   // max ~6 min polling
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`/api/kling/video/${taskId}${verParam}`);
    const raw = await res.text();
    if (!res.ok) throw new Error(`Poll ${res.status}: ${raw.slice(0, 200)}`);
    const d = JSON.parse(raw);
    const status = d.data?.task_status;
    if (onStatus) onStatus(status);
    if (status === "succeed") {
      const video = d.data?.task_result?.videos?.[0];
      const url = video?.url;
      if (!url) throw new Error("Task succeeded but no video URL found");
      const durationMs = Math.round(parseFloat(video?.duration || 0) * 1000);
      return { id: video?.id || null, url, durationMs };
    }
    if (status === "failed") throw new Error(`Task failed: ${d.data?.task_status_msg || "unknown reason"}`);
  }
  throw new Error("Kling task timed out after 6 minutes");
}

// ─── VEO 3.1 VIDEO ────────────────────────────────────────────────────────────
// Helper: data URL → { bytesBase64Encoded, mimeType }
function dataUrlToVeo(dataUrl) {
  const comma = dataUrl.indexOf(",");
  return {
    bytesBase64Encoded: dataUrl.slice(comma + 1),
    mimeType: dataUrl.slice(5, dataUrl.indexOf(";")),
  };
}

// Start a Veo 3.1 generation — returns the operation name for polling
// options: { aspect_ratio, duration, startFrame, endFrame, referenceImages }
//   startFrame       — data URL from IMAGE node assigned role "startFrame" in VeoCard
//   endFrame         — data URL from IMAGE node assigned role "endFrame" (only when startFrame set)
//   referenceImages  — [{ dataUrl, referenceType }] from IMAGE nodes with role "ref" OR shot bible
//
// NOTE: reference mode and frame mode are MUTUALLY EXCLUSIVE. If referenceImages is non-empty,
// startFrame/endFrame are ignored. Gemini API frame-guided generation uses veo-3.1-generate-preview
// with both image and lastFrame on the same instance payload.
async function aiVeoCreate(shot, options = {}) {
  const { aspect_ratio = "16:9", duration = 8, resolution = "720p", startFrame = null, endFrame = null, referenceImages = [] } = options;

  // MUTUALLY EXCLUSIVE: referenceImages and frame fields cannot be combined.
  // When both are wired (refs + start frame), REFERENCE mode wins.
  const refs = referenceImages.filter(r => r.dataUrl?.startsWith("data:")).slice(0, 3);
  const hasRefs = refs.length > 0;
  // veo-3.1-generate-001  → T2V, I2V, first+last frame interpolation (default for all modes)
  // veo-3.1-generate-preview → video EXTENSION only; does NOT support lastFrame
  const veoModel = options.extend ? "veo-3.1-generate-preview" : "veo-3.1-generate-001";

  const styledPrompt = applyVisualStylePrompt(
    (shot.compiledText || `${shot.how || ""} in ${shot.where || ""}`).trim() || "Cinematic shot",
    shot.visualStyle,
    "video"
  );
  const instance = {
    prompt: styledPrompt.slice(0, 2000) || "Cinematic shot",
  };

  const parameters = {
    aspectRatio:     aspect_ratio,
    durationSeconds: Number(duration),
    resolution,
  };

  if (hasRefs) {
    // MODE B — reference-guided: refs go in parameters, no frame fields
    parameters.referenceImages = refs.map(r => ({
      image: dataUrlToVeo(r.dataUrl),
      referenceType: r.referenceType || "asset",
    }));
  } else {
    // MODE A — frame-guided: start frame in instances[0].image, end frame in parameters.lastFrame
    if (startFrame?.startsWith("data:")) {
      instance.image = dataUrlToVeo(startFrame);
      if (endFrame?.startsWith("data:")) {
        instance.lastFrame = dataUrlToVeo(endFrame);
      }
    }
  }

  const body = {
    _veoModel: veoModel,   // stripped server-side before forwarding to Google
    instances: [instance],
    parameters,
  };

  const r = await fetch("/api/veo/video", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  if (!r.ok) {
    if (r.status === 402) {
      const body = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
      const err = new Error("insufficient_credits");
      err.creditsError = { needed: body.credits_needed || 0, balance: body.credits_balance || 0 };
      throw err;
    }
    throw new Error(`Veo ${r.status}: ${raw.slice(0, 300)}`);
  }
  const d = JSON.parse(raw);
  if (d.error) throw new Error(`Veo error: ${d.error.message}`);
  return d.name; // operation name, e.g. "models/veo-3.1.../operations/XXXXX"
}

// Poll until done — returns proxied video URL
async function aiVeoPoll(operationName, onStatus) {
  for (let i = 0; i < 120; i++) {   // max ~10 min
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`/api/veo/video?op=${encodeURIComponent(operationName)}`);
    const raw = await res.text();
    if (!res.ok) throw new Error(`Veo poll ${res.status}: ${raw.slice(0, 200)}`);
    const d = JSON.parse(raw);
    if (onStatus) onStatus(d.done ? "done" : "processing");
    if (d.done) {
      if (d.error) throw new Error(`Veo failed: ${d.error.message}`);
      const genResp = d.response?.generateVideoResponse;
      // Detect RAI (content policy) filtering — Google returns done:true but no samples
      if (genResp?.raiMediaFilteredCount > 0 || genResp?.raiMediaFilteredReasons?.length > 0) {
        const reason = genResp.raiMediaFilteredReasons?.[0] || "Content was filtered by Google's safety policy.";
        throw new Error(`Veo blocked: ${reason}`);
      }
      const uri =
        genResp?.generatedSamples?.[0]?.video?.uri ||
        d.response?.generatedSamples?.[0]?.video?.uri ||
        d.response?.videos?.[0]?.uri ||
        d.response?.videos?.[0]?.gcsUri;
      if (!uri) throw new Error("Veo succeeded but no video URI in response");
      if (/^https?:\/\//.test(uri) || uri.startsWith("/api/veo/file/")) return uri;
      // Download via server proxy → stores in Supabase and returns public URL
      const dlRes = await fetch(`/api/veo/download?uri=${encodeURIComponent(uri)}`);
      if (!dlRes.ok) throw new Error("Veo download failed: " + await dlRes.text());
      const dlJson = await dlRes.json();
      return dlJson.url;
    }
  }
  throw new Error("Veo task timed out after 10 minutes");
}

// ─── THEMED FIELD STYLES ──────────────────────────────────────────────────────
const mkFBase = (th) => ({ background:th.card3, border:`1px solid ${th.b0}`, color:th.t0, fontFamily:"'Inter',system-ui,sans-serif", outline:"none", borderRadius:6 });
const mkInp   = (th) => ({ ...mkFBase(th), fontSize:11, padding:"5px 8px", width:"100%", boxSizing:"border-box" });
const mkSel   = (th) => ({ ...mkFBase(th), fontSize:10, padding:"4px 6px", width:"100%", boxSizing:"border-box" });
const mkLbl   = (th) => ({ fontSize:9, fontWeight:500, color:th.t3, letterSpacing:"0.06em", display:"block", marginBottom:3 });
// fBase is now always derived from theme — cards must call mkFBase(th) locally
// This stub is intentionally neutral so any missed usage is visible, not dark
const fBase = { background:"transparent", border:"1px solid #ccc", color:"inherit", fontFamily:"'Inter',system-ui,sans-serif", outline:"none", borderRadius:3 };

function F({ label, children, th }) {
  const lb = th ? mkLbl(th) : { fontSize:7, color:"#3a4a5a", letterSpacing:"0.15em", display:"block", marginBottom:2 };
  return <div><span style={lb}>{label}</span>{children}</div>;
}

function InspectAction({ onClick, th }) {
  return (
    <button
      onMouseDown={e=>e.stopPropagation()}
      onClick={e=>{ e.stopPropagation(); onClick && onClick(); }}
      style={{
        background:"transparent",
        border:`1px solid ${th.b0}`,
        color:th.t2,
        cursor:"pointer",
        fontSize:8,
        padding:"2px 7px",
        borderRadius:4,
        lineHeight:1.2,
        letterSpacing:"0.08em",
        fontFamily:"'Inter',system-ui,sans-serif",
      }}
      title="Open node in side inspector"
    >
      INSPECT
    </button>
  );
}

// ─── SCENE NODE ───────────────────────────────────────────────────────────────
function SceneCard({ node, upd, onGenShots, onGenVersionB, onReviewContinuity, onRepairScene, reviewBusy = false, repairBusy = false, onDel, sel: selected, onStartWire, nodePos, model, sceneStats, onExport, globalBible = [], onInspect }) {
  const th = useTheme();
  const ac = th.dark ? (styleColor[node.cinematicStyle]||"#c084fc") : th.t2;
  const uac = th.dark ? ac : th.t0;
  const fRefs = useRef({});
  const inp = mkInp(th); const sel = mkSel(th); const lbl = mkLbl(th);
  const textareaRef = useRef(null);
  const [aiPr, setAiPr] = useState({});
  const [genId, setGenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [atMention, setAtMention] = useState({ active: false, query: "", start: -1 });
  const [savingE, setSavingE] = useState({});

  // Resolve entity image: local _prev first, fall back to matching world-bible entry
  const eImg = (e) => resolveEntryImage(e, node.visualStyle || "none") || resolveEntryImage(globalBible.find(g => g.tag === e.tag), node.visualStyle || "none") || "";

  const cardWidth = expanded ? 580 : 310;

  // Handles @mention detection while typing in scene text
  const onSceneTextChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    upd({ sceneText: val });
    if (node.bible.length === 0) return;
    const before = val.slice(0, pos);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setAtMention({ active: true, query: match[1].toLowerCase(), start: pos - match[0].length });
    } else {
      setAtMention(a => a.active ? { active: false, query: "", start: -1 } : a);
    }
  };

  // Inserts a bible tag at the @mention position
  const insertTag = (tag) => {
    const ta = textareaRef.current;
    const pos = ta ? ta.selectionStart : atMention.start + atMention.query.length + 1;
    const text = node.sceneText;
    const newText = text.slice(0, atMention.start) + tag + " " + text.slice(pos);
    upd({ sceneText: newText });
    setAtMention({ active: false, query: "", start: -1 });
    setTimeout(() => {
      if (ta) { ta.focus(); const cur = atMention.start + tag.length + 1; ta.selectionStart = ta.selectionEnd = cur; }
    }, 0);
  };

  const mentionMatches = atMention.active
    ? node.bible.filter(e =>
        !atMention.query ||
        e.name.toLowerCase().includes(atMention.query) ||
        e.tag.slice(1).toLowerCase().startsWith(atMention.query)
      )
    : [];

  const updB = (id,k,v) => upd({ bible: node.bible.map(e=>e.id===id?{...e,[k]:v}:e) });
  const updateTag = (id, oldTag, newTag) => upd({
    bible: node.bible.map(e => e.id===id ? {...e, tag: newTag} : e),
    sceneText: node.sceneText.split(oldTag).join(newTag)
  });
  const addE = async (kind) => {
    const tag = `@${kind[0]}${uid().slice(0,3)}`;
    const entry = { id:uid(), kind, name:kind==="character"?"Character":kind==="location"?"Location":"Object", tag, assetId:"", notes:"" };
    const newBible = [...node.bible, entry];
    upd({ bible: newBible });
    setInjecting(true);
    try {
      const updated = await aiInjectTag(node.sceneText, entry, node.bible, model);
      upd({ bible: newBible, sceneText: updated });
    } catch(e) {
      // fallback: append tag at end
      const sep = node.sceneText.trim() ? " " : "";
      upd({ bible: newBible, sceneText: node.sceneText + sep + tag });
    } finally {
      setInjecting(false);
    }
  };
  const delE = (id) => upd({ bible:node.bible.filter(e=>e.id!==id) });

  const downloadEntityImage = (entry) => {
    const src = eImg(entry);
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${entry.kind}_${entry.name.replace(/\s+/g,"_")}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const saveEntityImage = async (entry) => {
    const src = eImg(entry);
    if (!src || savingE[entry.id]) return;
    setSavingE(s => ({...s, [entry.id]: true}));
    try {
      const res  = await fetch(src);
      const blob = await res.blob();
      const form = new FormData();
      form.append("file", blob, `${entry.kind}_${entry.name.replace(/\s+/g,"_")}.png`);
      const r = await fetch("/api/assets/upload/images", { method:"POST", headers: await authHeaders(), body:form });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      updB(entry.id, "_savedUrl", data.url);
    } catch(e) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSavingE(s => ({...s, [entry.id]: false}));
    }
  };

  const exportBible = () => {
    if (!node.bible.length) return;
    const lines = [`# Entity Bible\n`];
    node.bible.forEach(ent => {
      lines.push(`## ${ent.kind.toUpperCase()}: ${ent.name} (${ent.tag})`);
      if (ent.notes) lines.push(ent.notes);
      lines.push("");
    });
    downloadMd(`bible_${node.id}.md`, lines.join("\n"));
  };

  const upload = (id,file) => {
    if(!file)return;
    const r=new FileReader();
    r.onload=e=>{
      const nextAssetId = `ast_${uid()}`;
      upd({
        bible: node.bible.map(ent => ent.id===id ? setEntryImageForStyle(ent, node.visualStyle || "none", e.target.result, nextAssetId) : ent)
      });
    };
    r.readAsDataURL(file);
  };

  const genImg = async (id) => {
    const p=aiPr[id]; if(!p?.trim())return;
    setGenId(id);
    try{
      const styledPrompt = applyVisualStylePrompt(p, node.visualStyle || "none", "image");
      const u=await aiImage(styledPrompt);
      const nextAssetId = `ast_ai_${uid()}`;
      upd({
        bible: node.bible.map(ent => ent.id===id ? setEntryImageForStyle(ent, node.visualStyle || "none", u, nextAssetId) : ent)
      });
    }
    catch(e){alert(`🍌 ${e.message}`);}
    finally{setGenId(null);}
  };

  const rewriteScene = async () => {
    if(!node.sceneText.trim()){alert("Write scene text first");return;}
    setRewriting(true);
    try{
      const rewritten = await aiRewriteScene(node, model);
      upd({ sceneText: rewritten });
    }
    catch(e){alert(`Rewrite error: ${e.message}`);}
    finally{setRewriting(false);}
  };

  const genShots = async () => {
    if(!node.sceneText.trim()){alert("Write scene text first");return;}
    setBusy(true);
    try{ await onGenShots(node); }
    catch(e){alert(`Shot gen error: ${e.message}`);}
    finally{setBusy(false);}
  };

  return (
    <div style={{ position:"relative", width:cardWidth, background:th.card, border:`1px solid ${selected ? uac : th.b0}`, borderRadius:16, overflow:"visible", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}`, transition:"width 0.2s" }}>
      {/* Header */}
      <div style={{ background: th.dark ? `linear-gradient(90deg,${ac}18,transparent)` : th.card, padding:"10px 12px 6px", borderBottom:`1px solid ${th.dark ? ac+"22" : "transparent"}`, display:"flex", alignItems:"center", gap:8, borderRadius:"16px 16px 0 0", overflow:"hidden" }}>
        <div style={{ width:4, height:4, background: th.dark ? ac : th.t3, borderRadius:"50%" }} />
        <span style={{ fontSize:7, letterSpacing:"0.2em", color:uac, fontWeight:700 }}>SCENE NODE</span>
        <span style={{ marginLeft:"auto", fontSize:7, color:th.t2, letterSpacing:"0.08em" }}>{node.cinematicStyle.toUpperCase()}</span>
        {(node.visualStyle || "none") !== "none" && (
          <span style={{ fontSize:6, color:uac, letterSpacing:"0.08em", background:th.card3, border:`1px solid ${uac}33`, borderRadius:3, padding:"2px 5px" }}>
            {VISUAL_STYLE_PRESETS[node.visualStyle || "none"]?.label || "Visual Style"}
          </span>
        )}
        {onInspect && <InspectAction onClick={onInspect} th={th} />}
        {/* Expand / collapse button */}
        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setExpanded(x=>!x);}}
          title={expanded?"Collapse node":"Expand for writing"}
          style={{ background:expanded?`${uac}22`:"transparent", border:expanded?`1px solid ${uac}44`:"none", color:expanded?uac:`${uac}66`, cursor:"pointer", fontSize:10, padding:"1px 5px", borderRadius:3, lineHeight:1, letterSpacing:0 }}>
          {expanded ? "⊡" : "⊞"}
        </button>
        {/* Export scene + shots */}
        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onExport&&onExport();}}
          title="Export scene + all linked shots as Markdown"
          style={{ background:"transparent", border:"none", color:th.t2, cursor:"pointer", fontSize:11, padding:"0 2px", lineHeight:1 }}>⬇</button>
        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDel();}} style={{ background:"transparent",border:"none",color:"#334",cursor:"pointer",fontSize:11,padding:"0 2px",lineHeight:1 }}>✕</button>
      </div>

      <div style={{ padding:10, display:"flex", flexDirection:"column", gap:8 }}>
        {/* Scene text */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
            <span style={lbl}>SCENE TEXT {node.bible.length > 0 && <span style={{ color:th.t2, fontWeight:"normal" }}>· type @ to insert character</span>}</span>
            {injecting && <span style={{ fontSize:6, color:uac, letterSpacing:"0.1em", animation:"blink 1s infinite" }}>✦ UPDATING TAGS…</span>}
          </div>
          <div style={{ position:"relative" }}>
            <textarea
              ref={textareaRef}
              onMouseDown={e=>e.stopPropagation()}
              rows={expanded ? 14 : 3}
              style={{ ...mkFBase(th), fontSize:9, padding:"6px 8px", resize:"none", width:"100%", boxSizing:"border-box", minHeight: expanded ? 220 : 60, opacity: injecting ? 0.5 : 1, transition:"opacity 0.2s, min-height 0.2s", lineHeight:1.7 }}
              placeholder="Describe your scene in full detail… type @ to mention a character"
              value={node.sceneText}
              onChange={onSceneTextChange}
              onKeyDown={e => {
                e.stopPropagation();
                if (!atMention.active || mentionMatches.length === 0) return;
                if (e.key === "Escape") { e.preventDefault(); setAtMention({ active:false, query:"", start:-1 }); }
                if (e.key === "Enter")  { e.preventDefault(); insertTag(mentionMatches[0].tag); }
              }}
              onBlur={() => setTimeout(() => setAtMention({ active:false, query:"", start:-1 }), 120)}
            />
            {/* @ mention dropdown */}
            {atMention.active && mentionMatches.length > 0 && (
              <div style={{ position:"absolute", top:"100%", left:0, zIndex:2000, background:th.card2, border:`1px solid ${th.b0}`, borderRadius:5, boxShadow:"0 8px 24px #000c", overflow:"hidden", minWidth:200 }}>
                {mentionMatches.map((e, i) => (
                  <div key={e.id}
                    onMouseDown={ev => { ev.preventDefault(); ev.stopPropagation(); insertTag(e.tag); }}
                    style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 8px", cursor:"pointer", borderBottom:`1px solid ${th.b0}`, background: i===0 ? th.b1 : "transparent" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = th.b1}
                    onMouseLeave={ev => ev.currentTarget.style.background = i===0 ? th.b1 : "transparent"}
                  >
                    <div style={{ width:26, height:26, borderRadius:3, overflow:"hidden", flexShrink:0, background:th.card4, border:`1px solid ${th.b0}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {eImg(e)
                        ? <img src={eImg(e)} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        : <KindIcon kind={e.kind} size={13} />
                      }
                    </div>
                    <div>
                      <div style={{ fontSize:8, color:uac, fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em" }}>{e.tag}</div>
                      <div style={{ fontSize:7, color:th.t2, fontFamily:"'Inter',system-ui,sans-serif" }}>{e.name}</div>
                    </div>
                    {i === 0 && <span style={{ marginLeft:"auto", fontSize:6, color:th.t2 }}>↵</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
          <F label="CINEMATIC STYLE">
            <select onMouseDown={e=>e.stopPropagation()} style={{ ...sel, color:uac }} value={node.cinematicStyle} onChange={e=>upd({cinematicStyle:e.target.value})}>
              {CINEMATIC_STYLES.map(s=><option key={s} value={s}>{styleEmoji[s]} {s}</option>)}
            </select>
          </F>
          <F label={`SHOTS: ${node.shotCount}`}>
            <input onMouseDown={e=>e.stopPropagation()} type="range" min={1} max={6} value={node.shotCount}
              style={{ width:"100%", accentColor:uac, marginTop:4 }} onChange={e=>upd({shotCount:parseInt(e.target.value)})} />
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:7,color:th.t2,marginTop:1 }}><span>1</span><span>6</span></div>
          </F>
        </div>

        <F label="VISUAL STYLE">
          <select onMouseDown={e=>e.stopPropagation()} style={{ ...sel, color:uac }} value={node.visualStyle || "none"} onChange={e=>upd({ visualStyle:e.target.value })}>
            {VISUAL_STYLES.map(s => <option key={s} value={s}>{VISUAL_STYLE_PRESETS[s].label}</option>)}
          </select>
        </F>

        {/* Bible */}
        <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:8 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
            <div style={{ display:"flex",alignItems:"center",gap:5 }}>
              <span style={{ ...lbl, marginBottom:0 }}>ENTITY BIBLE</span>
              {node.bible.length > 0 && (
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();exportBible();}}
                  title="Export all entities as Markdown"
                  style={{ background:"transparent",border:`1px solid ${th.b0}`,color:th.t2,fontFamily:"'Inter',system-ui,sans-serif",fontSize:6,padding:"2px 5px",borderRadius:2,cursor:"pointer",letterSpacing:"0.08em" }}>
                  ⬇ MD
                </button>
              )}
            </div>
            <div style={{ display:"flex",gap:4 }}>
              {["character","object","location"].map(k=>(
                <button key={k} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();addE(k);}}
                  style={{ background:th.card,border:`1px solid ${th.b0}`,color:th.t1,fontFamily:"'Inter',system-ui,sans-serif",fontSize:7,padding:"3px 7px",borderRadius:3,cursor:"pointer",letterSpacing:"0.08em" }}>
                  +{k==="character"?"CHAR":k==="location"?"LOC":"OBJ"}
                </button>
              ))}
            </div>
          </div>

          {node.bible.length===0 && <div style={{ textAlign:"center",padding:"8px 0",fontSize:7,color:"#1e2837",letterSpacing:"0.1em" }}>NO ENTITIES — ADD REFERENCES ABOVE</div>}

          {node.bible.map(e=>(
            <div key={e.id} style={{ background:th.card,border:`1px solid ${th.b0}`,borderRadius:4,padding:7,marginBottom:6 }}>
              <div style={{ display:"flex",gap:7,marginBottom:6 }}>
                <div style={{ width:44,height:44,background:th.card4,border:`1px solid ${((node.visualStyle || "none") !== "none" ? entryStyleVariants(e)[node.visualStyle || "none"]?.assetId : e.assetId) || eImg(e) ? ac+"44" : th.b0}`,borderRadius:3,flexShrink:0,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {genId===e.id?<Ico icon={Loader2} size={16} color="#3a4a22" style={{animation:"spin 0.7s linear infinite"}}/>
                    :eImg(e)?<img src={eImg(e)} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                    :<KindIcon kind={e.kind} size={16} />}
                </div>
                <div style={{ flex:1,display:"flex",flexDirection:"column",gap:4 }}>
                  <div style={{ display:"flex",gap:4 }}>
                    <input onMouseDown={e2=>e2.stopPropagation()} style={{ ...inp,flex:2,fontSize:8 }} placeholder="Name" value={e.name} onChange={e2=>updB(e.id,"name",e2.target.value)} />
                    <input onMouseDown={e2=>e2.stopPropagation()} style={{ ...inp,flex:1,fontSize:8,color:uac }} placeholder="@tag" value={e.tag} onChange={e2=>updateTag(e.id, e.tag, e2.target.value)} />
                    <button onMouseDown={e2=>e2.stopPropagation()} onClick={e2=>{e2.stopPropagation();delE(e.id);}} style={{ background:"transparent",border:`1px solid ${th.b0}`,color:th.t3,cursor:"pointer",fontSize:9,padding:"2px 5px",borderRadius:2 }}>✕</button>
                  </div>
                  {(((node.visualStyle || "none") !== "none" ? entryStyleVariants(e)[node.visualStyle || "none"]?.assetId : e.assetId) || eImg(e))?<div style={{ fontSize:7,color:uac,letterSpacing:"0.08em" }}>✓ {e.tag} · {e.kind.toUpperCase()}</div>
                    :<div style={{ fontSize:7,color:th.t3,letterSpacing:"0.07em" }}>⚠ image ref required</div>}
                </div>
              </div>
              {/* Description / notes — sent to AI so it understands role, age, relationships */}
              <textarea onMouseDown={e2=>e2.stopPropagation()} rows={2}
                style={{ ...mkFBase(th),fontSize:7,padding:"4px 6px",resize:"none",width:"100%",boxSizing:"border-box",borderRadius:2,marginBottom:4,lineHeight:1.5 }}
                placeholder={e.kind==="character" ? "Describe: age, role, relationships… e.g. '12-year-old boy, Dmitri's son'" : e.kind==="location" ? "Describe: physical space, lighting, atmosphere, time of day…" : "Describe: what it is, its role in the scene…"}
                value={e.notes||""}
                onChange={e2=>updB(e.id,"notes",e2.target.value)} />
              {/* Image source row */}
              <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                <button onMouseDown={e2=>e2.stopPropagation()} onClick={e2=>{e2.stopPropagation();fRefs.current[e.id]?.click();}}
                  style={{ background:th.card4,border:`1px solid ${th.b0}`,color:th.t2,fontFamily:"'Inter',system-ui,sans-serif",fontSize:7,padding:"4px 7px",borderRadius:2,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:"0.08em" }}>
                  ↑ UPLOAD
                </button>
                <input type="file" accept="image/*" ref={r=>fRefs.current[e.id]=r} style={{ display:"none" }} onChange={e2=>upload(e.id,e2.target.files[0])} />
                <span style={{ fontSize:7,color:th.t3 }}>OR</span>
                <input onMouseDown={e2=>e2.stopPropagation()} style={{ flex:1,...mkFBase(th),fontSize:7,padding:"4px 6px",borderRadius:2 }}
                  placeholder="prompt for 🍌…" value={aiPr[e.id]||""}
                  onChange={e2=>setAiPr(p=>({...p,[e.id]:e2.target.value}))}
                  onKeyDown={e2=>{e2.stopPropagation();if(e2.key==="Enter")genImg(e.id);}} />
                <button onMouseDown={e2=>e2.stopPropagation()} onClick={e2=>{e2.stopPropagation();genImg(e.id);}} disabled={genId===e.id}
                  style={{ background:th.t0,border:`1px solid ${th.b0}`,color:th.card,fontFamily:"'Inter',system-ui,sans-serif",fontSize:7,padding:"4px 7px",borderRadius:2,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:"0.06em",opacity:genId===e.id?0.5:1 }}>
                  🍌 GEN
                </button>
              </div>
              {/* Save / Download row — only when image exists */}
              {eImg(e) && (
                <div style={{ display:"flex",gap:4,alignItems:"center",marginTop:4,paddingTop:4,borderTop:`1px solid ${th.b0}` }}>
                  <button onMouseDown={e2=>e2.stopPropagation()} onClick={e2=>{e2.stopPropagation();downloadEntityImage(e);}}
                    title="Download image to computer"
                    style={{ background:th.card4,border:`1px solid ${th.b0}`,color:th.t2,fontFamily:"'Inter',system-ui,sans-serif",fontSize:7,padding:"4px 7px",borderRadius:2,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:"0.08em" }}>
                    ⬇ DOWNLOAD
                  </button>
                  <button onMouseDown={e2=>e2.stopPropagation()} onClick={e2=>{e2.stopPropagation();saveEntityImage(e);}}
                    disabled={!!savingE[e.id] || !!e._savedUrl}
                    title={e._savedUrl ? "Already saved to assets" : "Save image to asset library"}
                    style={{ background: e._savedUrl ? `${uac}18` : th.card4, border:`1px solid ${e._savedUrl ? uac+"44" : th.b0}`, color: e._savedUrl ? uac : th.t2, fontFamily:"'Inter',system-ui,sans-serif",fontSize:7,padding:"4px 7px",borderRadius:2,cursor:(savingE[e.id]||e._savedUrl)?"default":"pointer",whiteSpace:"nowrap",letterSpacing:"0.08em",opacity:savingE[e.id]?0.5:1 }}>
                    {savingE[e.id] ? "⌛ SAVING…" : e._savedUrl ? "✓ SAVED" : "↑ SAVE TO ASSETS"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Scene stats + Kling constraints ── */}
        {(() => {
          const { shotCount: sc, totalDur: td } = sceneStats || { shotCount:0, totalDur:0 };
          const rec   = recommendSceneConfig(node.sceneText);
          const beats = countSceneBeats(node.sceneText);
          const overShots    = sc > KLING_MAX_SHOTS;
          const overTime     = td > KLING_MAX_SECS;
          // Overcrowding: more than ~2 beats per shot is a red flag for AI generation.
          // We only warn when there are actual shots and actual scene text to analyse.
          const beatsPerShot = sc > 0 && beats > 0 ? beats / sc : 0;
          const overcrowded  = beatsPerShot > 2.2;
          // Also warn when the user's shot slider is below the minimum recommended.
          const tooFewShots  = node.sceneText?.trim() && sc > 0 && sc < rec.shots;
          const borderColor  = overShots || overTime ? "#f8717144" : overcrowded || tooFewShots ? "#fbbf2444" : th.b0;
          return (
            <div style={{ background:th.card, border:`1px solid ${borderColor}`, borderRadius:3, padding:"6px 8px", display:"flex", flexDirection:"column", gap:4 }}>
              {/* Stats row */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:10 }}>
                  <span style={{ fontSize:7, color: overShots?"#f87171":uac, letterSpacing:"0.1em" }}>
                    {sc}/{KLING_MAX_SHOTS} SHOTS {overShots?"⚠":""}
                  </span>
                  <span style={{ fontSize:7, color: overTime?"#f87171":uac, letterSpacing:"0.1em" }}>
                    {Number(td.toFixed(1))}/{KLING_MAX_SECS}s {overTime?"⚠":""}
                  </span>
                  {beats > 0 && (
                    <span style={{ fontSize:7, color:th.t3, letterSpacing:"0.08em" }}>
                      ~{beats} beats
                    </span>
                  )}
                </div>
                <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.08em" }}>
                  rec: {rec.shots} shots / {rec.secs}s
                </span>
              </div>
              {/* Kling hard limits */}
              {overShots && <div style={{ fontSize:6, color:"#f87171", letterSpacing:"0.06em" }}>⚠ Kling limit: max {KLING_MAX_SHOTS} shots per scene</div>}
              {overTime  && <div style={{ fontSize:6, color:"#f87171", letterSpacing:"0.06em" }}>⚠ Kling limit: max {KLING_MAX_SECS}s total per scene</div>}
              {/* Overcrowding warning */}
              {overcrowded && !overShots && (
                <div style={{ fontSize:6, color:"#fbbf24", letterSpacing:"0.06em", lineHeight:1.6 }}>
                  △ ~{beats} story beats across {sc} shot{sc!==1?"s":""} — each shot may be too crowded for AI generation ({beatsPerShot.toFixed(1)} beats/shot). Add more shots or simplify the scene.
                </div>
              )}
              {tooFewShots && !overcrowded && (
                <div style={{ fontSize:6, color:"#fbbf24", letterSpacing:"0.06em", lineHeight:1.6 }}>
                  △ Scene text suggests ~{rec.shots} shots but only {sc} {sc===1?"is":"are"} planned — some beats may be skipped.
                </div>
              )}
            </div>
          );
        })()}

        {/* ── DIRECTOR COHERENCE REPORT ── */}
        {node.directorCoherence && (() => {
          const c = node.directorCoherence;
          const hasIssues = c.skippedBeats?.length || c.overlapIssues?.length;
          const scoreColor = c.score >= 85 ? "#4ade80" : c.score >= 60 ? "#fbbf24" : "#f87171";
          return (
            <div style={{ background: th.card2, border:`1px solid ${hasIssues ? "#fbbf2444" : th.b0}`, borderRadius:3, padding:"6px 8px", display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:7, color:th.t3, letterSpacing:"0.15em" }}>🎬 COHERENCE</span>
                <span style={{ fontSize:7, color:scoreColor, fontWeight:700 }}>{c.score}/100</span>
              </div>
              {c.skippedBeats?.map((b,i) => (
                <div key={i} style={{ fontSize:6, color:"#f87171", lineHeight:1.5 }}>⚑ Skipped: {b}</div>
              ))}
              {c.overlapIssues?.map((o,i) => (
                <div key={i} style={{ fontSize:6, color:"#fbbf24", lineHeight:1.5 }}>⚠ Overlap: {o}</div>
              ))}
              {c.recommendation && (
                <div style={{ fontSize:6, color:th.t2, lineHeight:1.5, fontStyle:"italic" }}>{c.recommendation}</div>
              )}
              {!hasIssues && (
                <div style={{ fontSize:6, color:"#4ade80", lineHeight:1.5 }}>✓ All narrative beats covered</div>
              )}
              {hasIssues && (
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation(); if(onGenVersionB) onGenVersionB(node);}}
                  disabled={busy}
                  style={{ marginTop:2, background:"transparent", border:`1px solid #fbbf2488`, color:"#fbbf24", fontFamily:"'Inter',system-ui,sans-serif", fontWeight:700, fontSize:7, padding:"5px 8px", borderRadius:3, cursor:busy?"not-allowed":"pointer", letterSpacing:"0.12em", transition:"all 0.15s", opacity:busy?0.5:1, textAlign:"left" }}
                  title="Re-run shot breakdown using the Director's critique as a brief for a better attempt">
                  ↳ Generate Version B
                </button>
              )}
              {node.directorCoherenceB && (
                <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:4, marginTop:2 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em" }}>VERSION B</span>
                    <span style={{ fontSize:6, color: node.directorCoherenceB.score>=85?"#4ade80":node.directorCoherenceB.score>=60?"#fbbf24":"#f87171", fontWeight:700 }}>{node.directorCoherenceB.score}/100</span>
                  </div>
                  {node.directorCoherenceB.recommendation && (
                    <div style={{ fontSize:6, color:th.t2, lineHeight:1.5, fontStyle:"italic", marginTop:2 }}>{node.directorCoherenceB.recommendation}</div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ display:"flex", gap:5 }}>
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();rewriteScene();}} disabled={rewriting||busy||injecting}
            style={{ flex:"0 0 auto",background:th.t0,border:`1px solid ${th.b0}`,color:th.card,fontFamily:"'Inter',system-ui,sans-serif",fontWeight:700,fontSize:7,padding:"9px 10px",borderRadius:3,cursor:(rewriting||busy)?"not-allowed":"pointer",letterSpacing:"0.12em",transition:"all 0.2s",whiteSpace:"nowrap",opacity:(rewriting||busy)?0.5:1 }}
            title="Rewrite scene text using AI — preserves your ideas, improves clarity">
            {rewriting?"◌ REWRITING…":"✦ REWRITE"}
          </button>
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();genShots();}} disabled={busy||rewriting||injecting||(sceneStats?.shotCount>=KLING_MAX_SHOTS)||(sceneStats?.totalDur>=KLING_MAX_SECS)}
            style={{ flex:1,background:(busy||sceneStats?.shotCount>=KLING_MAX_SHOTS||sceneStats?.totalDur>=KLING_MAX_SECS)?th.b0:th.t0,border:"none",color:(busy||sceneStats?.shotCount>=KLING_MAX_SHOTS||sceneStats?.totalDur>=KLING_MAX_SECS)?th.t3:th.card,fontFamily:"'Inter',system-ui,sans-serif",fontWeight:700,fontSize:8,padding:"9px",borderRadius:3,cursor:(busy||rewriting||sceneStats?.shotCount>=KLING_MAX_SHOTS||sceneStats?.totalDur>=KLING_MAX_SECS)?"not-allowed":"pointer",letterSpacing:"0.15em",transition:"all 0.2s",opacity:(busy||sceneStats?.shotCount>=KLING_MAX_SHOTS||sceneStats?.totalDur>=KLING_MAX_SECS)?0.5:1 }}>
            {busy?"◌  GENERATING SHOTS…":"▶  GENERATE SHOTS"}
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation(); onReviewContinuity && onReviewContinuity();}}
            disabled={reviewBusy || busy || injecting}
            style={{ background:"transparent", border:`1px solid ${uac}44`, color:uac, fontFamily:"'Inter',system-ui,sans-serif", fontWeight:700, fontSize:7, padding:"8px 9px", borderRadius:3, cursor:(reviewBusy||busy||injecting)?"not-allowed":"pointer", letterSpacing:"0.12em", opacity:(reviewBusy||busy||injecting)?0.5:1 }}>
            {reviewBusy ? "◌ REVIEWING…" : "REVIEW CONTINUITY"}
          </button>
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation(); onRepairScene && onRepairScene();}}
            disabled={repairBusy || reviewBusy || busy || injecting}
            style={{ background:"transparent", border:`1px solid ${th.t3}55`, color:th.t2, fontFamily:"'Inter',system-ui,sans-serif", fontWeight:700, fontSize:7, padding:"8px 9px", borderRadius:3, cursor:(repairBusy||reviewBusy||busy||injecting)?"not-allowed":"pointer", letterSpacing:"0.12em", opacity:(repairBusy||reviewBusy||busy||injecting)?0.5:1 }}>
            {repairBusy ? "◌ REPAIRING…" : "REPAIR SCENE"}
          </button>
        </div>
      </div>
      {/* OUTPUT PORT — right side, draggable to link shot/image nodes */}
      <div
        onMouseDown={e=>{
          e.preventDefault(); e.stopPropagation();
          if(onStartWire && nodePos) {
            onStartWire(node.id, T.SCENE, nodePos.x + cardWidth, nodePos.y + 70);
          }
        }}
        title="Drag to link a Shot or Image node"
        style={{ position:"absolute", right:-4, top:66, width:8, height:8, background: th.dark ? ac : th.t1, borderRadius:"50%", cursor:"crosshair", zIndex:10, transition:"transform 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.5)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
      >
      </div>
    </div>
  );
}

// ─── AUTO-RESIZING TEXTAREA ───────────────────────────────────────────────────
// Grows to fit content — no horizontal scrolling, no truncation
function AutoTextarea({ value, onChange, placeholder, style, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onMouseDown={e => e.stopPropagation()}
      style={{ resize:"none", overflow:"hidden", ...style }}
      {...props}
    />
  );
}

// ─── SHOT NODE ────────────────────────────────────────────────────────────────
function ShotCard({ node, upd, onDel, sceneBible, linkedScene, onLink, sel: selected, onStartWire, nodePos, sceneStats, globalBible, onRetrySingleShot, onInspect }) {
  const th = useTheme();
  const inp = mkInp(th); const sel = mkSel(th); const lbl = mkLbl(th);
  const ac = th.dark ? "#38bdf8" : th.t2;
  const uac = th.dark ? ac : th.t0;
  // recompile rebuilds compiledText from fields — skipped when user has manually overridden the prompt
  const recompile = (patch) => {
    const n = { ...node, ...patch, promptOverride: false };
    upd({ ...patch, promptOverride: false, compiledText: compileShotText(n) });
  };

  // local bible state
  const fRefs = useRef({});
  const [aiPr, setAiPr] = useState({});
  const [genId, setGenId] = useState(null);
  const [bibleOpen, setBibleOpen] = useState(false);
  const [promptEdit, setPromptEdit] = useState(false);


  const localBible = node.bible || [];
  const effectiveVisualStyle = resolveVisualStyle(node, linkedScene);
  const updB = (id,k,v) => upd({ bible: localBible.map(e=>e.id===id?{...e,[k]:v}:e) });
  const addE = (kind) => upd({ bible:[...localBible,{id:uid(),kind,name:kind==="character"?"Character":kind==="location"?"Location":"Object",tag:`@${kind[0]}${uid().slice(0,3)}`,assetId:"",notes:""}] });
  const delE = (id) => upd({ bible:localBible.filter(e=>e.id!==id) });
  const upload = (id,file) => {
    if(!file)return;
    const r=new FileReader();
    r.onload=e=>{
      const nextAssetId = `ast_${uid()}`;
      upd({ bible: localBible.map(ent => ent.id===id ? setEntryImageForStyle(ent, effectiveVisualStyle, e.target.result, nextAssetId) : ent) });
    };
    r.readAsDataURL(file);
  };
  const genImg = async (id) => {
    const p=aiPr[id]; if(!p?.trim())return;
    setGenId(id);
    try{
      const styledPrompt = applyVisualStylePrompt(p, resolveVisualStyle(node, linkedScene), "image");
      const u=await aiImage(styledPrompt);
      const nextAssetId = `ast_ai_${uid()}`;
      upd({ bible: localBible.map(ent => ent.id===id ? setEntryImageForStyle(ent, effectiveVisualStyle, u, nextAssetId) : ent) });
    }
    catch(e){alert(`🍌 ${e.message}`);}
    finally{setGenId(null);}
  };

  // merged tags: local shot bible (highest) → scene bible → global project bible (lowest)
  // Each level fills in only tags not already covered by a higher-priority level.
  const _gb = globalBible||[];
  const _sb = sceneBible||[];
  const allBible = [
    ...localBible,
    ..._sb.filter(s=>!localBible.find(l=>l.tag===s.tag)),
    ..._gb.filter(g=>!localBible.find(l=>l.tag===g.tag)&&!_sb.find(s=>s.tag===g.tag)),
  ];
  const allTags = allBible.map(e=>e.tag);

  const issues = validateShot(node, linkedScene);
  const errors = issues.filter(i=>i.level==="error");
  const warns  = issues.filter(i=>i.level==="warn");
  const borderColor = selected ? ac : errors.length ? "#f8717166" : warns.length ? "#fbbf2444" : ac+"22";

  return (
    <div data-nodeid={node.id} data-nodetype={T.SHOT} style={{ position:"relative", width:268 }}>
      {/* INPUT PORT — left side */}
      <div style={{ position:"absolute", left:-4, top:48, width:8, height:8, background:th.card, border:`1.5px solid ${linkedScene ? (th.dark ? (styleColor[linkedScene.cinematicStyle]||ac) : th.t1) : th.b0}`, borderRadius:"50%", zIndex:10, pointerEvents:"none" }}>
      </div>
    <div style={{ width:268, background:th.card, border:`1px solid ${borderColor}`, borderRadius:16, overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}` }}>
      {/* Header */}
      <div style={{ background: th.dark ? `linear-gradient(90deg,${ac}12,transparent)` : th.card, padding:"10px 12px 6px", borderBottom:`1px solid ${th.dark ? ac+"18" : "transparent"}`, display:"flex", alignItems:"center", gap:7 }}>
        <div style={{ width:18, height:18, background:th.card3, border:`1px solid ${th.b0}`, borderRadius:2, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontSize:7, color:uac, fontWeight:700 }}>#{node.index}</span>
        </div>
        <span style={{ fontSize:7, letterSpacing:"0.2em", color:uac, fontWeight:700 }}>SHOT NODE</span>
        {/* Link status — read only, wired via port drag */}
        {linkedScene
          ? <div style={{ display:"flex",alignItems:"center",gap:4,background:th.card3,border:`1px solid ${th.b0}`,borderRadius:3,padding:"2px 6px",marginLeft:4 }}>
              <div style={{ width:5,height:5,background:th.dark?(styleColor[linkedScene.cinematicStyle]||ac):th.t2,borderRadius:"50%" }} />
              <span style={{ fontSize:6,color:uac,letterSpacing:"0.08em",maxWidth:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                {linkedScene.sceneText?.slice(0,20)||"scene"}
              </span>
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onLink(null);}}
                style={{ background:"transparent",border:"none",color:th.t3,cursor:"pointer",fontSize:8,padding:"0 1px",lineHeight:1,marginLeft:2 }} title="Unlink">✕</button>
            </div>
          : <div style={{ display:"flex",alignItems:"center",gap:3,background:"transparent",border:`1px dashed ${th.b0}`,borderRadius:3,padding:"2px 7px",marginLeft:4 }}>
              <span style={{ fontSize:6,color:th.t3,letterSpacing:"0.06em" }}>drag scene port →</span>
            </div>
        }
        {/* issues badge */}
        {issues.length>0 && (
          <div style={{ display:"flex",gap:3,alignItems:"center",marginLeft:2 }}>
            {errors.length>0 && <span style={{ fontSize:7,background:"#f8717122",color:"#f87171",border:"1px solid #f8717133",borderRadius:3,padding:"1px 5px",letterSpacing:"0.05em" }}>{errors.length}✕</span>}
            {warns.length>0  && <span style={{ fontSize:7,background:"#fbbf2422",color:"#fbbf24",border:"1px solid #fbbf2433",borderRadius:3,padding:"1px 5px",letterSpacing:"0.05em" }}>{warns.length}△</span>}
          </div>
        )}
        <div style={{ marginLeft:"auto", background:th.card3, border:`1px solid ${th.b0}`, borderRadius:3, padding:"2px 7px", display:"flex", alignItems:"center", gap:2 }}>
          <span style={{ fontSize:11, color:uac, fontWeight:700 }}>{node.durationSec||1}</span>
          <span style={{ fontSize:7, color:th.t2, letterSpacing:"0.08em" }}>s</span>
        </div>
        {/* Export this shot */}
        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();
          const slug = `shot-${node.index||"x"}-${(node.how||"shot").trim().slice(0,20).replace(/[^a-z0-9]/gi,"-").toLowerCase()}`;
          downloadMd(`${slug}.txt`, formatShotMd(node));
        }}
          title="Export this shot as Markdown"
          style={{ background:"transparent", border:"none", color:th.t2, cursor:"pointer", fontSize:11, padding:"0 2px", lineHeight:1 }}>⬇</button>
        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDel();}} style={{ background:"transparent",border:"none",color:th.t3,cursor:"pointer",fontSize:11,padding:"0 2px",lineHeight:1 }}>✕</button>
      </div>

      {/* Continuity panel */}
      {issues.length>0 && (
        <div onMouseDown={e=>e.stopPropagation()} style={{ background:th.card,borderBottom:`1px solid ${th.b0}`,padding:"6px 10px",display:"flex",flexDirection:"column",gap:3 }}>
          {issues.map((iss,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:5 }}>
              <span style={{ fontSize:8,color:iss.level==="error"?"#f87171":"#fbbf24",flexShrink:0,marginTop:1 }}>
                {iss.level==="error"?"✕":"△"}
              </span>
              <span style={{ fontSize:7,color:iss.level==="error"?"#c0534a":"#a07a30",letterSpacing:"0.04em",lineHeight:1.5 }}>{iss.msg}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding:9, display:"flex", flexDirection:"column", gap:6 }}>
        {node.sourceAnchor&&<div style={{ background:th.card,borderLeft:`2px solid ${th.b0}`,padding:"4px 8px",borderRadius:"0 2px 2px 0",fontSize:7,color:th.t2,fontStyle:"italic",letterSpacing:"0.03em" }}>"{node.sourceAnchor}"</div>}

        <AutoTextarea style={inp} placeholder="How (action happening)" value={node.how} onChange={e=>recompile({how:e.target.value})} />

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:5 }}>
          <AutoTextarea style={inp} placeholder="Where" value={node.where} onChange={e=>recompile({where:e.target.value})} />
          <AutoTextarea style={inp} placeholder="When" value={node.when} onChange={e=>recompile({when:e.target.value})} />
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4 }}>
          {[["cameraSize",CAMERA_SIZES],["cameraAngle",CAMERA_ANGLES],["cameraMovement",CAMERA_MOVEMENTS]].map(([k,opts])=>(
            <select key={k} onMouseDown={e=>e.stopPropagation()} style={sel} value={node[k]} onChange={e=>recompile({[k]:e.target.value})}>
              {opts.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:4 }}>
          <select onMouseDown={e=>e.stopPropagation()} style={sel} value={node.lighting} onChange={e=>recompile({lighting:e.target.value})}>
            {LIGHTING_STYLES.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
          <input onMouseDown={e=>e.stopPropagation()} style={{ ...inp,fontSize:8 }} placeholder="lens" value={node.lens} onChange={e=>recompile({lens:e.target.value})} />
        </div>

        <div>
          <span style={lbl}>VISUAL STYLE</span>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:4, alignItems:"center" }}>
            <select onMouseDown={e=>e.stopPropagation()} style={sel} value={node.visualStyle || "inherit"} onChange={e=>upd({ visualStyle:e.target.value })}>
              <option value="inherit">Inherit scene style</option>
              {VISUAL_STYLES.filter(s => s !== "none").map(s => <option key={s} value={s}>{VISUAL_STYLE_PRESETS[s].label}</option>)}
              <option value="none">None</option>
            </select>
            <span style={{ fontSize:6, color:th.t2, letterSpacing:"0.06em", whiteSpace:"nowrap" }}>
              ACTIVE: {VISUAL_STYLE_PRESETS[effectiveVisualStyle]?.label || "None"}
            </span>
          </div>
        </div>

        {/* ── DURATION ─ prominent Kling-aware row ── */}
        {(()=>{
          const sceneTotalDur = sceneStats?.totalDur ?? 0;
          const otherDur = sceneTotalDur - (node.durationSec||0);
          const remaining = KLING_MAX_SECS - otherDur;
          const maxAllowed = Math.max(1, Math.min(15, remaining));
          const pct = Math.min(1, (node.durationSec||0) / KLING_MAX_SECS);
          const overBudget = (node.durationSec||0) > remaining;
          const barColor = overBudget ? "#f87171" : (node.durationSec||0) >= 8 ? "#fbbf24" : ac;
          return (
            <div onMouseDown={e=>e.stopPropagation()} style={{ background:th.bg, border:`1px solid ${overBudget?"#f8717144":th.b0}`, borderRadius:5, padding:"7px 9px", display:"flex", flexDirection:"column", gap:5 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:7, letterSpacing:"0.15em", color:overBudget?"#f87171":uac, fontWeight:700, flexShrink:0 }}>SHOT DURATION</span>
                <span style={{ fontSize:7, color:th.t3, marginLeft:"auto", letterSpacing:"0.05em" }}>
                  {Number(otherDur.toFixed(1))}s other · {Number(remaining.toFixed(1))}s left
                </span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input onMouseDown={e=>e.stopPropagation()} type="range" min={1} max={maxAllowed} step={1}
                  value={Math.min(node.durationSec||1, maxAllowed)}
                  onChange={e=>upd({durationSec:clampShotDuration(parseInt(e.target.value)||1)})}
                  style={{ flex:1, accentColor:barColor, cursor:"pointer", height:14 }} />
                <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                  <input onMouseDown={e=>e.stopPropagation()} type="number" min={1} max={maxAllowed}
                    value={node.durationSec||1}
                    onChange={e=>upd({durationSec:clampShotDuration(Math.min(parseInt(e.target.value)||1, maxAllowed))})}
                    style={{ ...inp, width:32, textAlign:"center", fontSize:13, fontWeight:700, color:barColor, border:`1px solid ${barColor}44`, padding:"3px 4px" }} />
                  <span style={{ fontSize:9, color:th.t3, marginLeft:3 }}>s</span>
                </div>
              </div>
              {/* mini bar — scene budget visualization */}
              <div style={{ height:3, background:th.b2, borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct*100}%`, background:barColor, borderRadius:2, transition:"width 0.15s" }} />
              </div>
              {overBudget && <span style={{ fontSize:6, color:"#f87171", letterSpacing:"0.06em" }}>⚠ exceeds scene budget — reduce other shots or shorten this one</span>}
            </div>
          );
        })()}

        {/* Entity tags — merged from scene + local bible */}
        <div>
          <span style={lbl}>ENTITY TAGS</span>
          <div style={{ display:"flex",flexWrap:"wrap",gap:3 }}>
            {allTags.length===0 && <span style={{ fontSize:7,color:th.b1,letterSpacing:"0.05em" }}>add references below or link a scene</span>}
            {allTags.map(t=>{
              const on=node.entityTags.includes(t);
              const isLocal = localBible.find(e=>e.tag===t);
              return <span key={t} onMouseDown={e=>e.stopPropagation()}
                onClick={e=>{e.stopPropagation();upd({entityTags:on?node.entityTags.filter(x=>x!==t):[...node.entityTags,t]});}}
                style={{ fontSize:7,padding:"2px 8px",borderRadius:20,border:`1px solid ${on?uac+"55":th.b0}`,color:on?uac:isLocal?th.t2:th.t3,cursor:"pointer",background:on?th.card3:isLocal?th.card2:"transparent",transition:"all 0.1s" }}
                title={isLocal?"local reference":"from scene"}>
                {t}{isLocal?" ·":""}
              </span>;
            })}
          </div>
        </div>

        <AutoTextarea style={inp} placeholder="Visual goal" value={node.visualGoal} onChange={e=>recompile({visualGoal:e.target.value})} />

        {/* ── DIRECTOR'S NOTE + QUALITY FLAG ── */}
        <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:6 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
            <span style={{ fontSize:7, color:th.t3, letterSpacing:"0.15em" }}>🎬 DIRECTOR'S NOTE</span>
            {node.directorQuality === "flag" && (
              <span style={{ fontSize:6, color:"#f87171", letterSpacing:"0.06em", background:"#f8717122", padding:"1px 5px", borderRadius:2 }}>⚑ FLAGGED</span>
            )}
            {node.directorQuality === "warn" && (
              <span style={{ fontSize:6, color:"#fbbf24", letterSpacing:"0.06em", background:"#fbbf2422", padding:"1px 5px", borderRadius:2 }}>⚠ WARN</span>
            )}
          </div>
          {node.directorIssue && (
            <div style={{ fontSize:6, color: node.directorQuality==="flag" ? "#f87171" : "#fbbf24", marginBottom:4, lineHeight:1.5 }}>
              {node.directorIssue}
            </div>
          )}
          {(node.directorQuality==="flag"||node.directorQuality==="warn") && onRetrySingleShot && (
            <button onMouseDown={e=>e.stopPropagation()}
              onClick={e=>{ e.stopPropagation(); onRetrySingleShot(node); }}
              style={{ marginBottom:5, background:"transparent", border:`1px solid ${node.directorQuality==="flag"?"#f8717188":"#fbbf2488"}`, color:node.directorQuality==="flag"?"#f87171":"#fbbf24", fontFamily:"'Inter',system-ui,sans-serif", fontWeight:700, fontSize:6, padding:"3px 7px", borderRadius:2, cursor:"pointer", letterSpacing:"0.1em" }}
              title="Regenerate this shot using the Director's critique as a brief">
              ↳ Retry this shot
            </button>
          )}
          {node.versionTag === "B" && (
            <div style={{ fontSize:6, color:"#a78bfa", letterSpacing:"0.1em", marginBottom:3, background:"#a78bfa22", padding:"2px 6px", borderRadius:2, display:"inline-block" }}>VERSION B</div>
          )}
          <AutoTextarea
            style={{ ...inp, fontStyle:"italic", color: node.directorNote ? uac : th.t3 }}
            placeholder="Director's intent will appear here after shot breakdown…"
            value={node.directorNote||""}
            onChange={e=>recompile({directorNote:e.target.value})}
          />
        </div>

        {/* ── DIALOGUE ── */}
        <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:6 }}>
          <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.15em", display:"block", marginBottom:3 }}>
            DIALOGUE <span style={{ color:th.t3, fontWeight:400, letterSpacing:"0.06em" }}>— spoken lines in this shot</span>
          </span>
          <AutoTextarea
            style={{ ...inp, fontStyle: node.dialogue?.trim() ? "normal" : "italic", color: node.dialogue?.trim() ? uac : th.t3 }}
            placeholder='e.g. "I never asked for any of this."'
            value={node.dialogue||""}
            onChange={e=>recompile({dialogue:e.target.value})}
          />
        </div>

        {/* ── LOCAL BIBLE ── */}
        <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:6 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <button onMouseDown={e=>e.stopPropagation()}
              onClick={e=>{e.stopPropagation();setBibleOpen(o=>!o);}}
              style={{ flex:1,background:"transparent",border:"none",display:"flex",alignItems:"center",gap:5,cursor:"pointer",padding:0,fontFamily:"'Inter',system-ui,sans-serif" }}>
              <span style={{ fontSize:7,color:th.t3,letterSpacing:"0.15em" }}>
                SHOT BIBLE {localBible.length>0?`(${localBible.length})`:""}
              </span>
              <span style={{ fontSize:7,color:th.t3 }}>{bibleOpen?"▲":"▼"}</span>
            </button>
            <button onMouseDown={e=>e.stopPropagation()}
              onClick={e=>{e.stopPropagation();setBibleOpen(true);}}
              title="Edit shot bible"
              style={{ background:"transparent",border:`1px solid ${th.b0}`,color:uac,fontFamily:"'Inter',system-ui,sans-serif",fontSize:7,padding:"2px 6px",borderRadius:2,cursor:"pointer",letterSpacing:"0.06em",marginLeft:4,lineHeight:1 }}>
              <Ico icon={Pencil} size={8}/> EDIT
            </button>
          </div>

          {bibleOpen && (
            <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:5 }}>
              {/* Add buttons */}
              <div style={{ display:"flex",gap:4 }}>
                {["character","object","location"].map(k=>(
                  <button key={k} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();addE(k);}}
                    style={{ flex:1,background:th.card,border:`1px solid ${th.b0}`,color:th.t1,fontFamily:"'Inter',system-ui,sans-serif",fontSize:7,padding:"4px 6px",borderRadius:3,cursor:"pointer",letterSpacing:"0.08em" }}>
                    + {k==="character"?"CHAR":k==="location"?"LOC":"OBJ"}
                  </button>
                ))}
              </div>

              {localBible.length===0 && (
                <div style={{ textAlign:"center",fontSize:7,color:th.t4,padding:"6px 0",letterSpacing:"0.08em" }}>NO LOCAL REFS</div>
              )}

              {localBible.map(e=>(
                <div key={e.id} style={{ background:th.card,border:`1px solid ${th.b0}`,borderRadius:4,padding:6 }}>
                  <div style={{ display:"flex",gap:6,marginBottom:5 }}>
                    {/* Thumb */}
                    <div style={{ width:38,height:38,background:th.card3,border:`1px solid ${((effectiveVisualStyle !== "none" ? entryStyleVariants(e)[effectiveVisualStyle]?.assetId : e.assetId) || resolveEntryImage(e, effectiveVisualStyle)) ? ac+"33" : th.b0}`,borderRadius:3,flexShrink:0,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {genId===e.id
                        ? <Ico icon={Loader2} size={13} color="#3a4a22" style={{animation:"spin 0.7s linear infinite"}}/>
                        : resolveEntryImage(e, effectiveVisualStyle)
                          ? <img src={resolveEntryImage(e, effectiveVisualStyle)} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                          : <KindIcon kind={e.kind} size={13} />}
                    </div>
                    <div style={{ flex:1,display:"flex",flexDirection:"column",gap:3 }}>
                      <div style={{ display:"flex",gap:3 }}>
                        <input onMouseDown={e2=>e2.stopPropagation()} style={{ flex:2,...mkFBase(th),fontSize:8,padding:"3px 5px" }} placeholder="Name" value={e.name} onChange={e2=>updB(e.id,"name",e2.target.value)} />
                        <input onMouseDown={e2=>e2.stopPropagation()} style={{ flex:1,...mkFBase(th),fontSize:8,padding:"3px 5px",color:uac }} placeholder="@tag" value={e.tag} onChange={e2=>updB(e.id,"tag",e2.target.value)} />
                        <button onMouseDown={e2=>e2.stopPropagation()} onClick={e2=>{e2.stopPropagation();delE(e.id);}} style={{ background:"transparent",border:`1px solid ${th.b0}`,color:th.t3,cursor:"pointer",fontSize:8,padding:"2px 4px",borderRadius:2 }}>✕</button>
                      </div>
                      {(effectiveVisualStyle !== "none" ? entryStyleVariants(e)[effectiveVisualStyle]?.assetId : e.assetId) || resolveEntryImage(e, effectiveVisualStyle)
                        ? <div style={{ fontSize:6,color:uac,letterSpacing:"0.07em" }}>✓ {e.tag}</div>
                        : <div style={{ fontSize:6,color:th.t3,letterSpacing:"0.07em" }}>⚠ needs image ref</div>}
                    </div>
                  </div>
                  {/* Description / notes — sent to AI so it understands appearance, role */}
                  <textarea onMouseDown={e2=>e2.stopPropagation()} rows={2}
                    style={{ ...mkFBase(th),fontSize:7,padding:"4px 6px",resize:"none",width:"100%",boxSizing:"border-box",borderRadius:2,marginBottom:4,lineHeight:1.5 }}
                    placeholder={e.kind==="character" ? "Describe: age, role, appearance… e.g. 'ranger, early 30s, worn leather armour'" : e.kind==="location" ? "Describe: space, lighting, atmosphere…" : "Describe: what it is, its role here…"}
                    value={e.notes||""}
                    onChange={e2=>updB(e.id,"notes",e2.target.value)} />
                  {/* Image source */}
                  <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                    <button onMouseDown={e2=>e2.stopPropagation()} onClick={e2=>{e2.stopPropagation();fRefs.current[e.id]?.click();}}
                      style={{ background:th.card3,border:`1px solid ${th.b0}`,color:th.t2,fontFamily:"'Inter',system-ui,sans-serif",fontSize:6,padding:"3px 6px",borderRadius:2,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:"0.06em" }}>
                      ↑ UPLOAD
                    </button>
                    <input type="file" accept="image/*" ref={r=>fRefs.current[e.id]=r} style={{ display:"none" }} onChange={e2=>upload(e.id,e2.target.files[0])} />
                    <span style={{ fontSize:6,color:th.t3 }}>OR</span>
                    <input onMouseDown={e2=>e2.stopPropagation()} style={{ flex:1,...mkFBase(th),fontSize:7,padding:"3px 5px",borderRadius:2 }}
                      placeholder="describe for 🍌…" value={aiPr[e.id]||""}
                      onChange={e2=>setAiPr(p=>({...p,[e.id]:e2.target.value}))}
                      onKeyDown={e2=>{e2.stopPropagation();if(e2.key==="Enter")genImg(e.id);}} />
                    <button onMouseDown={e2=>e2.stopPropagation()} onClick={e2=>{e2.stopPropagation();genImg(e.id);}} disabled={genId===e.id}
                      style={{ background:th.t0,border:`1px solid ${th.b0}`,color:th.card,fontFamily:"'Inter',system-ui,sans-serif",fontSize:6,padding:"3px 6px",borderRadius:2,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:"0.05em",opacity:genId===e.id?0.5:1 }}>
                      🍌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── COMPILED PROMPT — editable override ── */}
        {node.compiledText && (
          <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:6 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:6, color: node.promptOverride ? uac : th.t3, letterSpacing:"0.15em" }}>
                {node.promptOverride ? "✎ PROMPT OVERRIDE" : "COMPILED PROMPT"}
              </span>
              <div style={{ display:"flex", gap:4 }}>
                {node.promptOverride && (
                  <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation(); upd({ compiledText: compileShotText(node), promptOverride: false }); setPromptEdit(false);}}
                    title="Revert to auto-compiled prompt"
                    style={{ background:"transparent", border:`1px solid #f8717144`, color:"#f87171", fontFamily:"'Inter',system-ui,sans-serif", fontSize:6, padding:"2px 5px", borderRadius:2, cursor:"pointer", letterSpacing:"0.06em" }}>
                    ↺ RESET
                  </button>
                )}
                {onInspect && <InspectAction onClick={onInspect} th={th} />}
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation(); setPromptEdit(o=>!o);}}
                  title={promptEdit ? "Collapse prompt" : "Edit prompt directly"}
                  style={{ background: promptEdit ? `${uac}22` : "transparent", border:`1px solid ${promptEdit ? uac+"44" : th.b0}`, color: promptEdit ? uac : th.t2, fontFamily:"'Inter',system-ui,sans-serif", fontSize:6, padding:"2px 5px", borderRadius:2, cursor:"pointer", letterSpacing:"0.06em" }}>
                  <Ico icon={Pencil} size={7}/> {promptEdit ? "CLOSE" : "EDIT"}
                </button>
              </div>
            </div>
            {promptEdit
              ? <textarea onMouseDown={e=>e.stopPropagation()} rows={5}
                  style={{ ...mkFBase(th), fontSize:7, padding:"5px 7px", resize:"vertical", width:"100%", boxSizing:"border-box", lineHeight:1.7, borderRadius:3, borderColor: node.promptOverride ? uac+"55" : th.b0 }}
                  value={node.compiledText}
                  onChange={e=>upd({ compiledText: e.target.value, promptOverride: true })}
                />
              : <div style={{ background:th.card, border:`1px solid ${node.promptOverride ? uac+"33" : th.b0}`, borderRadius:3, padding:"5px 7px", fontSize:7, color: node.promptOverride ? uac : th.t3, lineHeight:1.7, letterSpacing:"0.02em", cursor:"text" }}
                  onClick={() => setPromptEdit(true)}>
                  {node.compiledText}
                </div>
            }
          </div>
        )}

        {/* Kling video generation → use the dedicated KLING NODE */}
      </div>
    </div>
      {/* OUTPUT PORT — right side, drag to link an Image or Kling node */}
      <div
        onMouseDown={e=>{
          e.preventDefault(); e.stopPropagation();
          if(onStartWire && nodePos) {
            onStartWire(node.id, T.SHOT, nodePos.x + 268, nodePos.y + 50);
          }
        }}
        title="Drag to link an Image or Kling node"
        style={{ position:"absolute", right:-4, top:48, width:8, height:8, background: th.dark ? ac : th.t1, borderRadius:"50%", cursor:"crosshair", zIndex:10, transition:"transform 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.5)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
      >
      </div>
    </div>
  );
}

// ─── VEO NODE ─────────────────────────────────────────────────────────────────
function VeoCard({ node, upd, onDel, sel: selected, allNodes, onStartWire, nodePos, globalBible, onInspect, credits, onOutOfCredits }) {
  const th = useTheme();
  const inp = mkInp(th); const sel = mkSel(th); const lbl = mkLbl(th);
  const ac = th.dark ? "#a855f7" : th.t2;
  const selColor = selected ? ac : th.dark ? `${ac}44` : th.b0;
  const [savingAsset, setSavingAsset] = React.useState(false);
  const [savedAsset,  setSavedAsset]  = React.useState(false);

  const saveToAssets = async () => {
    if (!node.videoUrl || savingAsset) return;
    setSavingAsset(true); setSavedAsset(false);
    try {
      const r    = await fetch(node.videoUrl);
      const blob = await r.blob();
      const ext  = (node.videoUrl.split("?")[0].split(".").pop() || "mp4").toLowerCase();
      const form = new FormData();
      form.append("file", blob, `veo_${node.id}.${ext}`);
      const res  = await fetch("/api/assets/upload/videos", { method:"POST", headers: await authHeaders(), body:form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      upd({ videoUrl: data.url });
      setSavedAsset(true);
    } catch(e) { console.error("Save to assets failed:", e); }
    finally { setSavingAsset(false); }
  };

  const shotNode = node.shotId ? allNodes.find(n => n.id === node.shotId) : null;
  const shotSceneNode = shotNode ? allNodes.find(n=>n.id===shotNode.sceneId) : null;
  const startFrameNode = node.startFrameNodeId ? allNodes.find(n => n.id === node.startFrameNodeId) : null;
  const endFrameNode   = node.endFrameNodeId   ? allNodes.find(n => n.id === node.endFrameNodeId)   : null;
  const refNodes = (node.refNodeIds||[]).map(id=>allNodes.find(n=>n.id===id)).filter(Boolean);
  // Merge shot → scene → global project bible (lowest priority), then filter to entries with images
  const _shotB  = shotNode?.bible||[];
  const _sceneB = shotSceneNode?.bible||[];
  const _gb     = globalBible||[];
  const activeVisualStyle = resolveVisualStyle(shotNode, shotSceneNode);
  const bibleMsgs = [
    ..._shotB,
    ..._sceneB.filter(s=>!_shotB.find(b=>b.tag===s.tag)),
    ..._gb.filter(g=>!_shotB.find(b=>b.tag===g.tag)&&!_sceneB.find(s=>s.tag===g.tag)),
  ].map(e => withResolvedEntryImage(e, activeVisualStyle)).filter(e => e._prev?.startsWith("data:"));

  const [veoStatus, setVeoStatus]   = useState("idle");
  const [veoOpName, setVeoOpName]   = useState(null);
  const [veoPollMsg, setVeoPollMsg] = useState("");
  const [veoError, setVeoError]     = useState("");

  // The prompt can come from a wired Shot OR a manual text field in the node
  const effectivePrompt = shotNode
    ? (shotNode.compiledText || `${shotNode.how||""} in ${shotNode.where||""}`).trim()
    : (node.manualPrompt || "").trim();

  // Generation is allowed if there's a prompt OR at least a start frame image ready
  const hasStartFrame = !!(startFrameNode?.generatedUrl);
  const canGenerate = !!effectivePrompt || hasStartFrame;

  const generateVideo = async () => {
    if (veoStatus === "creating" || veoStatus === "polling") return;
    if (!canGenerate) return;
    setVeoStatus("creating"); setVeoError(""); setVeoPollMsg("Submitting to Veo 3.1…");
    try {
      // Collect reference images: wired IMAGE nodes first, then shot bible fallback
      // Each ref node may have its own type stored in node.refTypes[id]
      const wiredRefs = refNodes
        .filter(n => n.generatedUrl)
        .map(n => ({ dataUrl: n.generatedUrl, referenceType: (node.refTypes||{})[n.id] || "asset" }));
      // Bible fallback: only kicks in when NO explicit ref IMAGE nodes AND NO start frame node.
      // If a start frame is wired, we're in frame mode (veo-3.1-generate-001) — bible images
      // must NOT be included as referenceImages or they would force the preview model and
      // silently discard the start frame.
      const bibleRefs = (bibleMsgs.length > 0 && wiredRefs.length === 0 && !startFrameNode)
        ? bibleMsgs.map(e => ({ dataUrl: e._prev, referenceType: "asset" }))
        : [];
      const referenceImages = [...wiredRefs, ...bibleRefs].slice(0, 3);

      // Resolve wired frame nodes → data URLs
      const startFrame = startFrameNode?.generatedUrl || null;
      const endFrame   = (endFrameNode?.generatedUrl && startFrame) ? endFrameNode.generatedUrl : null;

      // Build a synthetic shot-like object when no shot is wired
      // Falls back to "Cinematic shot" when no prompt is given (frame-only generation)
      const finalPrompt = effectivePrompt || "Cinematic shot";
      const shotLike = shotNode
        ? { ...shotNode, visualStyle: resolveVisualStyle(shotNode, shotSceneNode) }
        : { compiledText: finalPrompt, how: finalPrompt, where: "", visualStyle: "none" };

      const opName = await aiVeoCreate(shotLike, {
        aspect_ratio: node.aspect_ratio || "16:9",
        duration:     node.duration     || 8,
        resolution:   node.resolution   || "720p",
        startFrame,
        endFrame,
        referenceImages,
      });
      setVeoOpName(opName);
      setVeoStatus("polling"); setVeoPollMsg("Generating…");
      const url = await aiVeoPoll(opName, s => setVeoPollMsg(s === "done" ? "Finalizing…" : "Generating…"));
      upd({ videoUrl: url });
      setVeoStatus("done"); setVeoPollMsg("");
    } catch (e) {
      setVeoStatus("failed"); setVeoPollMsg("");
      if (e.creditsError) { onOutOfCredits?.(e.creditsError); return; }
      setVeoError(e.message);
    }
  };

  const fSel = mkSel(th);
  const busy = veoStatus==="creating"||veoStatus==="polling";

  // ── IMAGE ROLE helpers ─────────────────────────────────────────────────────
  // Unified list of all IMAGE nodes linked to this Veo node, in display order
  const allLinkedImages = [
    ...(startFrameNode ? [startFrameNode] : []),
    ...(endFrameNode   ? [endFrameNode]   : []),
    ...refNodes,
  ];

  const getRoleOf = (id) => {
    if (id === node.startFrameNodeId) return "startFrame";
    if (id === node.endFrameNodeId)   return "endFrame";
    return "ref";
  };

  const setImageRole = (imageId, newRole) => {
    const patch = {};
    // Remove from current role first
    if (node.startFrameNodeId === imageId) { patch.startFrameNodeId = null; patch.endFrameNodeId = null; }
    else if (node.endFrameNodeId === imageId) patch.endFrameNodeId = null;
    else patch.refNodeIds = (node.refNodeIds||[]).filter(id => id !== imageId);

    if (newRole === "startFrame") {
      // Push any existing start frame to refs
      const oldStart = node.startFrameNodeId;
      if (oldStart && oldStart !== imageId) {
        const base = patch.refNodeIds !== undefined ? patch.refNodeIds : (node.refNodeIds||[]);
        if (!base.includes(oldStart)) patch.refNodeIds = [...base, oldStart];
      }
      patch.startFrameNodeId = imageId;
    } else if (newRole === "endFrame") {
      // End frame requires a start frame — if none, promote to start frame
      if (!node.startFrameNodeId || node.startFrameNodeId === imageId) {
        patch.startFrameNodeId = imageId;
      } else {
        const oldEnd = node.endFrameNodeId;
        if (oldEnd && oldEnd !== imageId) {
          const base = patch.refNodeIds !== undefined ? patch.refNodeIds : (node.refNodeIds||[]);
          if (!base.includes(oldEnd)) patch.refNodeIds = [...base, oldEnd];
        }
        patch.endFrameNodeId = imageId;
      }
    } else { // "ref"
      const base = patch.refNodeIds !== undefined ? patch.refNodeIds : (node.refNodeIds||[]);
      if (!base.includes(imageId)) patch.refNodeIds = [...base, imageId];
    }
    upd(patch);
  };

  const removeImageNode = (imageId) => {
    if (node.startFrameNodeId === imageId) upd({ startFrameNodeId: null, endFrameNodeId: null });
    else if (node.endFrameNodeId === imageId) upd({ endFrameNodeId: null });
    else upd({ refNodeIds: (node.refNodeIds||[]).filter(id => id !== imageId) });
  };

  return (
    <div data-nodeid={node.id} data-nodetype={T.VEO} style={{ position:"relative", width:290 }}>
      {/* INPUT PORT */}
      <div style={{ position:"absolute", left:-4, top:48, width:8, height:8,
        background:th.card, border:`1.5px solid ${shotNode ? ac : th.b0}`, borderRadius:"50%",
        zIndex:10, pointerEvents:"none" }}>
      </div>
      {/* OUTPUT PORT — drag to VideoEdit node */}
      {node.videoUrl && (
        <div
          onMouseDown={e=>{e.preventDefault();e.stopPropagation();if(onStartWire&&nodePos)onStartWire(node.id,T.VEO,nodePos.x+290,nodePos.y+44);}}
          title="Drag to Video Edit node"
          style={{ position:"absolute", right:-4, top:48, width:8, height:8, background:th.dark?ac:th.t1, borderRadius:"50%", cursor:"crosshair", zIndex:10, transition:"transform 0.15s" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.5)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
        />
      )}

      <div style={{ width:290, background:th.card, border:`1px solid ${selColor}`, borderRadius:16, overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}` }}>
        {/* Header */}
        <div style={{ background:th.card, padding:"10px 12px 6px", display:"flex", alignItems:"center", gap:6, borderBottom:`1px solid ${th.dark ? ac+"22" : "transparent"}` }}>
          <Ico icon={Video} size={11} color={th.dark ? ac : th.t3}/>
          <span style={{ fontSize:7, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>VEO NODE</span>
          <span style={{ marginLeft:"auto", fontSize:6, color:`${ac}55`, letterSpacing:"0.06em" }}>Veo 3.1</span>
          {onInspect && <InspectAction onClick={onInspect} th={th} />}
          <button onMouseDown={e=>e.stopPropagation()} onClick={onDel}
            style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:"8px 10px", display:"flex", flexDirection:"column", gap:6 }}>

          {/* Connected shot OR manual prompt */}
          <div>
            <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.15em", display:"block", marginBottom:4 }}>PROMPT — wire Shot or type manually</span>
            {shotNode ? (
              <div style={{ display:"flex", alignItems:"flex-start", gap:5, background:th.bg, border:`1px solid ${ac}22`, borderRadius:3, padding:"5px 7px" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:6, color:"#38bdf8", letterSpacing:"0.06em", marginBottom:2 }}>SHOT #{shotNode.index} · {shotNode.durationSec||5}s</div>
                  <div style={{ fontSize:6, color:th.t2, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                    {shotNode.compiledText || shotNode.how || "—"}
                  </div>
                </div>
                <button onMouseDown={e=>e.stopPropagation()} onClick={()=>upd({shotId:null})}
                  style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1, flexShrink:0 }}>✕</button>
              </div>
            ) : (
              <textarea onMouseDown={e=>e.stopPropagation()} rows={2}
                style={{ background:th.bg, border:`1px dashed ${node.manualPrompt?.trim() ? ac+"44" : th.b0}`, color:th.t0, fontFamily:"'Inter',system-ui,sans-serif", fontSize:7, padding:"5px 7px", resize:"none", width:"100%", boxSizing:"border-box", borderRadius:3, outline:"none" }}
                placeholder="Type a prompt… or wire a Shot node ↙"
                value={node.manualPrompt||""} onChange={e=>upd({manualPrompt:e.target.value})} />
            )}
          </div>

          {/* Config row */}
          <div style={{ display:"flex", gap:4 }}>
            <div style={{ flex:2 }}>
              <span style={{ fontSize:6, color:"#3a4a5a", letterSpacing:"0.1em", display:"block", marginBottom:2 }}>ASPECT</span>
              <select onMouseDown={e=>e.stopPropagation()} value={node.aspect_ratio||"16:9"} onChange={e=>upd({aspect_ratio:e.target.value})} style={fSel}>
                <option>16:9</option><option>9:16</option>
              </select>
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:6, color:"#3a4a5a", letterSpacing:"0.1em", display:"block", marginBottom:2 }}>DURATION</span>
              <select onMouseDown={e=>e.stopPropagation()} value={node.duration||8} onChange={e=>upd({duration:Number(e.target.value)})} style={fSel}>
                <option value={4}>4s</option><option value={6}>6s</option><option value={8}>8s</option>
              </select>
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:6, color:"#3a4a5a", letterSpacing:"0.1em", display:"block", marginBottom:2 }}>RES</span>
              {(() => {
                const tier = credits?.tier;
                const isPaid = tier && tier !== "free";
                const isStudio = tier === "studio";
                return (
                  <select
                    onMouseDown={e=>e.stopPropagation()}
                    value={isPaid ? (node.resolution||"720p") : "720p"}
                    onChange={e=>{ if(isPaid) upd({resolution:e.target.value}); }}
                    disabled={!isPaid}
                    style={{ ...fSel, opacity: isPaid ? 1 : 0.45, cursor: isPaid ? "pointer" : "not-allowed" }}
                    title={!isPaid ? "1080p/4K requires a paid plan" : !isStudio ? "4K requires Studio plan" : undefined}
                  >
                    <option value="720p">720p</option>
                    {isPaid  && <option value="1080p">1080p ×2cr</option>}
                    {!isPaid && <option value="1080p" disabled>1080p 🔒</option>}
                    {isStudio  && <option value="4k">4K ×4cr</option>}
                    {!isStudio && <option value="4k" disabled>4K 🔒</option>}
                  </select>
                );
              })()}
            </div>
          </div>

          {/* LINKED IMAGES — unified list with per-image role selector */}
          <div style={{ borderTop:`1px solid ${ac}11`, paddingTop:6 }}>
            <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:5 }}>
              LINKED IMAGES — wire IMAGE nodes ↙
            </span>

            {allLinkedImages.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {allLinkedImages.map(imgNode => {
                  const role = getRoleOf(imgNode.id);
                  const roleLabel = role === "startFrame" ? "START FRAME" : role === "endFrame" ? "END FRAME" : "REFERENCE";
                  const roleColor = role === "startFrame" ? "#38bdf8" : role === "endFrame" ? "#818cf8" : ac;
                  return (
                    <div key={imgNode.id} style={{ display:"flex", gap:5, alignItems:"stretch", background:th.card3, border:`1px solid ${roleColor}33`, borderRadius:3, padding:"4px 6px" }}>
                      {/* Thumbnail */}
                      {imgNode.generatedUrl
                        ? <img src={imgNode.generatedUrl} alt="" style={{ width:44, height:38, objectFit:"cover", borderRadius:2, border:`1px solid ${roleColor}44`, flexShrink:0, alignSelf:"center" }}/>
                        : <div style={{ width:44, height:38, background:th.card4, border:`1px dashed ${roleColor}33`, borderRadius:2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, color:th.t3, flexShrink:0 }}>?</div>
                      }
                      {/* Role selector + type */}
                      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:3, justifyContent:"center" }}>
                        <div style={{ fontSize:5, color:roleColor, letterSpacing:"0.12em" }}>{roleLabel}</div>
                        <select
                          onMouseDown={e=>e.stopPropagation()}
                          value={role}
                          onChange={e => { e.stopPropagation(); setImageRole(imgNode.id, e.target.value); }}
                          style={{ ...fSel, fontSize:6 }}
                        >
                          <option value="startFrame">START FRAME</option>
                          <option value="endFrame">END FRAME</option>
                          <option value="ref">REFERENCE</option>
                        </select>
                        {role === "ref" && (
                          <select
                            onMouseDown={e=>e.stopPropagation()}
                            value={(node.refTypes||{})[imgNode.id] || "asset"}
                            onChange={e => { e.stopPropagation(); upd({ refTypes: {...(node.refTypes||{}), [imgNode.id]: e.target.value} }); }}
                            style={{ ...fSel, fontSize:6 }}
                          >
                            <option value="asset">TYPE: ASSET</option>
                            <option value="style">TYPE: STYLE</option>
                          </select>
                        )}
                        {role === "endFrame" && !node.startFrameNodeId && (
                          <div style={{ fontSize:5, color:"#f87171" }}>⚠ no start frame</div>
                        )}
                        {!imgNode.generatedUrl && (
                          <div style={{ fontSize:5, color:"#5a4a1a" }}>⚠ image not generated yet</div>
                        )}
                      </div>
                      {/* Remove */}
                      <button onMouseDown={e=>e.stopPropagation()} onClick={()=>removeImageNode(imgNode.id)}
                        style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1, alignSelf:"flex-start" }}>✕</button>
                    </div>
                  );
                })}
                {/* Drop zone for additional images */}
                <div data-veo-slot="ref" style={{ border:`1px dashed ${ac}22`, borderRadius:3, padding:"4px 7px", textAlign:"center", fontSize:6, color:th.t3, letterSpacing:"0.08em" }}>
                  + drop more IMAGE nodes
                </div>
              </div>
            ) : (
              <div data-veo-slot="ref" style={{ border:`1px dashed ${th.b1}`, borderRadius:3, padding:"10px 7px", textAlign:"center", fontSize:6, color:th.b1, letterSpacing:"0.08em" }}>
                drop IMAGE nodes here
              </div>
            )}

            {/* Bible fallback — shown when no IMAGE nodes wired and shot has bible images */}
            {allLinkedImages.length === 0 && bibleMsgs.length > 0 && (
              <div style={{ marginTop:5 }}>
                <div style={{ fontSize:6, color:th.t3, letterSpacing:"0.08em", marginBottom:3 }}>fallback: Shot bible ({bibleMsgs.length} images as asset refs)</div>
                <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                  {bibleMsgs.slice(0,3).map(e => (
                    <div key={e.id} style={{ position:"relative" }}>
                      <img src={e._prev} alt={e.tag} style={{ width:50, height:40, objectFit:"cover", borderRadius:3, border:`1px solid ${ac}33`, display:"block" }}/>
                      <div style={{ position:"absolute", bottom:2, left:2, fontSize:5, color:"#fff", background:"#00000099", padding:"0 2px", borderRadius:2 }}>{e.tag}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Video player */}
          {node.videoUrl && (
            <div style={{ borderRadius:4, overflow:"hidden", border:`1px solid ${ac}33`, background:"#000" }}>
              <video src={node.videoUrl} controls style={{ width:"100%", display:"block", maxHeight:150 }} />
              <div style={{ padding:"3px 7px", background:th.card2, display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:6, color:ac, letterSpacing:"0.1em" }}>VEO 3.1 VIDEO</span>
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();saveToAssets();}}
                  disabled={savingAsset}
                  style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:3, background: savedAsset ? "#22c55e22" : `${ac}22`, border:`1px solid ${savedAsset?"#22c55e44":ac+"44"}`, borderRadius:3, color: savedAsset ? "#22c55e" : ac, fontSize:6, fontWeight:700, letterSpacing:"0.08em", padding:"2px 6px", cursor:savingAsset?"not-allowed":"pointer", opacity:savingAsset?0.6:1 }}>
                  {savingAsset ? "SAVING…" : savedAsset ? "✓ SAVED" : "⬇ SAVE TO ASSETS"}
                </button>
                <a href={node.videoUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:6, color:`${ac}99`, textDecoration:"none" }}>↗ open</a>
                <button onMouseDown={e=>e.stopPropagation()} onClick={()=>upd({videoUrl:null})}
                  style={{ background:"transparent", border:"none", color:"#5a3a3a", cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1 }}>✕</button>
              </div>
            </div>
          )}

          {/* Error */}
          {veoStatus==="failed" && veoError && (
            <div style={{ fontSize:6, color:"#f87171", background:"#1a0a0a", border:"1px solid #f8717133", borderRadius:3, padding:"4px 7px", letterSpacing:"0.04em", lineHeight:1.6 }}>
              ✕ {veoError}
            </div>
          )}

          {/* Generate button */}
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();generateVideo();}}
            disabled={busy||!canGenerate}
            style={{
              background: veoStatus==="done" ? `${ac}18` : veoStatus==="failed" ? "#f8717118" : `${ac}15`,
              border: `1px solid ${veoStatus==="failed" ? "#f8717144" : `${ac}33`}`,
              color: veoStatus==="done" ? ac : veoStatus==="failed" ? "#f87171" : ac,
              borderRadius:4, padding:"7px 10px", fontSize:8, fontFamily:"'Inter',system-ui,sans-serif",
              letterSpacing:"0.12em", cursor: (!canGenerate||busy) ? "default" : "pointer",
              width:"100%", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              opacity: (busy||!canGenerate) ? 0.5 : 1,
            }}>
            {veoStatus==="idle"    && <><span style={{ fontSize:11 }}>▶</span> {canGenerate ? "GENERATE VIDEO" : "NEED PROMPT OR START FRAME"}</>}
            {veoStatus==="creating"&& <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> SUBMITTING…</>}
            {veoStatus==="polling" && <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> {veoPollMsg||"GENERATING…"}</>}
            {veoStatus==="done"    && <><span>✓</span> VIDEO READY {node.videoUrl?"":"— REGENERATE"}</>}
            {veoStatus==="failed"  && <><span>↺</span> RETRY</>}
          </button>

          {busy && (
            <div style={{ fontSize:6, color:"#2a3a4a", letterSpacing:"0.08em", textAlign:"center" }}>
              {veoOpName ? `op: ${veoOpName.split("/").pop().slice(0,20)}…` : "waiting…"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KLING NODE ───────────────────────────────────────────────────────────────
function KlingCard({ node, upd, onDel, sel: selected, allNodes, onStartWire, nodePos, globalBible, onInspect, credits, onOutOfCredits }) {
  const th = useTheme();
  const inp = mkInp(th); const sel = mkSel(th); const lbl = mkLbl(th);
  const ac = th.dark ? "#f97316" : th.t2;
  const selColor = selected ? ac : th.dark ? `${ac}44` : th.b0;
  const [savingAsset, setSavingAsset] = React.useState(false);
  const [savedAsset,  setSavedAsset]  = React.useState(false);
  const [klingVoices, setKlingVoices] = React.useState([]);
  const [voicesLoading, setVoicesLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setVoicesLoading(true);
    fetch("/api/kling/voices")
      .then(async r => {
        const body = await r.json().catch(() => null);
        if (!r.ok) {
          // Server now returns JSON with `message` field even on error
          const msg = body?.message || body?._raw || `HTTP ${r.status}`;
          console.error("[voices] Kling error:", msg);
          throw new Error(msg);
        }
        return body;
      })
      .then(data => { if (!cancelled) setKlingVoices(data?.data?.voices || data?.voices || (Array.isArray(data) ? data : [])); })
      .catch(err => console.warn("Could not load Kling voices:", err.message || err))
      .finally(() => { if (!cancelled) setVoicesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const saveToAssets = async () => {
    if (!node.videoUrl || savingAsset) return;
    setSavingAsset(true); setSavedAsset(false);
    try {
      const r    = await fetch(node.videoUrl);
      const blob = await r.blob();
      const ext  = (node.videoUrl.split("?")[0].split(".").pop() || "mp4").toLowerCase();
      const form = new FormData();
      form.append("file", blob, `kling_${node.id}.${ext}`);
      const res  = await fetch("/api/assets/upload/videos", { method:"POST", headers: await authHeaders(), body:form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      upd({ videoUrl: data.url });
      setSavedAsset(true);
    } catch(e) { console.error("Save to assets failed:", e); }
    finally { setSavingAsset(false); }
  };

  // Resolve ordered shot nodes from shotIds (skip deleted)
  const shotNodes = (node.shotIds || [])
    .map(id => allNodes.find(n => n.id === id))
    .filter(Boolean);
  const styledShotNodes = shotNodes.map(sh => ({
    ...sh,
    visualStyle: resolveVisualStyle(sh, allNodes.find(n => n.id === sh.sceneId)),
  }));

  // Resolve wired image reference nodes
  const imageRefNodes = (node.imageRefIds || [])
    .map(id => allNodes.find(n => n.id === id))
    .filter(Boolean);

  // Resolve previous Kling node for continuity
  const prevKlingNode = node.prevKlingId ? allNodes.find(n => n.id === node.prevKlingId) : null;
  const prevVideoUrl  = prevKlingNode?.videoUrl || null;

  // Generation state
  const [klingStatus, setKlingStatus]   = useState("idle");
  const [klingTaskId, setKlingTaskId]     = useState(null);
  const [klingPollMsg, setKlingPollMsg]   = useState("");
  const [klingError, setKlingError]       = useState("");
  const [klingLipsyncErr, setKlingLipsyncErr] = useState("");

  const removeShot = (shotId) => upd({ shotIds: (node.shotIds||[]).filter(id=>id!==shotId) });

  const generateVideo = async () => {
    if (klingStatus==="creating"||klingStatus==="polling") return;
    if (shotNodes.length===0) return;
    setKlingStatus("creating"); setKlingError(""); setKlingPollMsg("Submitting task…");
    try {
      // Build the bible for this Kling node.
      // For each shot: take its local bible entries PLUS any scene bible entries whose
      // tag appears in the shot's entityTags. Using entityTags as the filter prevents
      // characters from other shots leaking into the image_list.
      const allBible = styledShotNodes
        .flatMap(sh => {
          const sceneBible = allNodes.find(n => n.id === sh.sceneId)?.bible || [];
          const localBible = sh.bible || [];
          const localTags  = new Set(localBible.map(e => e.tag));
          // For each entityTag, prefer local bible entry, then fall back to scene bible
          const taggedSceneEntries = (sh.entityTags || [])
            .filter(tag => !localTags.has(tag))
            .map(tag => sceneBible.find(e => e.tag === tag))
            .filter(Boolean);
          return [...localBible, ...taggedSceneEntries].map(entry => withResolvedEntryImage(entry, sh.visualStyle));
        })
        .filter((e,i,a) => e._prev && a.findIndex(x => x._prev === e._prev) === i);

      // Collect generated image URLs from wired Image reference nodes
      const imageRefUrls = imageRefNodes
        .map(n => n.generatedUrl)
        .filter(Boolean);

      const klingVersion = node.klingVersion || "v3";
      const taskId = await aiKlingCreate(styledShotNodes[0], allBible, {
        multiShot:    klingVersion === "v3" && styledShotNodes.length > 1,
        sceneShots:   styledShotNodes,
        aspect_ratio: node.aspect_ratio || "16:9",
        mode:         node.mode         || "pro",
        resolution:   node.resolution   || "720p",
        sound:        node.sound        || "off",
        prevVideoUrl,
        imageRefUrls,
        voice:        node.voice        || "none",
        klingVersion,
      });
      setKlingTaskId(taskId);
      setKlingStatus("polling"); setKlingPollMsg("Processing…");
      const { id: generatedVideoId, url, durationMs: generatedVideoDurationMs } = await aiKlingPoll(taskId, s=>setKlingPollMsg(s), klingVersion);

      // Store the video ID for extension (V1.6 only) and duration tracking
      upd({ klingVideoId: generatedVideoId || null, klingVideoDuration: generatedVideoDurationMs || null });

      // ── LIPSYNC PASS ────────────────────────────────────────────────────────
      // Two modes:
      //  A) SIMPLE (text2video): no speaker names in dialogue, or advanced fails.
      //     Uses /api/kling/lipsync with stripped plain text. Max 120 chars.
      //  B) ADVANCED (TTS→face→lipsync): screenplay dialogue with speaker names.
      //     Tries TTS + identify-face + advanced-lipsync. Falls back to A on error.
      const charVoicesMap = node.characterVoices || {};
      const hasAnyVoice = (node.voice && node.voice !== "none") ||
        Object.values(charVoicesMap).some(v => v && v !== "none");

      // Plain stripped text (used by simple path)
      const simpleLipsyncText = shotNodes
        .map(sh => stripSpeakerNames(sh.dialogue))
        .filter(Boolean)
        .join(" ");
      const voiceForSimple = (node.voice && node.voice !== "none")
        ? node.voice
        : Object.values(charVoicesMap).find(v => v && v !== "none") || "none";

      // Simple lipsync helper — reusable for both primary and fallback
      const runSimpleLipsync = async (videoUrl) => {
        if (!simpleLipsyncText || voiceForSimple === "none") {
          upd({ videoUrl }); setKlingStatus("done"); setKlingPollMsg(""); return;
        }
        setKlingPollMsg("Running lipsync…");
        const lsRes = await fetch("/api/kling/lipsync", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_url: videoUrl, voice_id: voiceForSimple, dialogue: simpleLipsyncText }),
        });
        const lsText = await lsRes.text();
        if (!lsRes.ok) throw new Error(lsText);
        let lsData;
        try { lsData = JSON.parse(lsText); } catch { throw new Error(`Bad JSON: ${lsText.slice(0,200)}`); }
        if (lsData.code && lsData.code !== 0) throw new Error(`Kling lipsync ${lsData.code}: ${lsData.message}`);
        const lsTaskId = lsData.data?.task_id;
        if (!lsTaskId) throw new Error(`No task_id in lipsync response`);
        for (let i = 0; i < 180; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const pr = await fetch(`/api/kling/lipsync/${lsTaskId}`);
          if (!pr.ok) break;
          const pd = await pr.json();
          const st = pd.data?.task_status;
          if (st === "succeed") {
            const lsUrl = pd.data?.task_result?.videos?.[0]?.url;
            if (lsUrl) { upd({ videoUrl: lsUrl }); setKlingStatus("done"); setKlingPollMsg(""); return; }
            break;
          }
          if (st === "failed") throw new Error(`Lipsync task failed: ${pd.data?.task_status_msg || "unknown"}`);
          setKlingPollMsg(`Lipsync: ${st || "processing"}…`);
        }
        upd({ videoUrl }); setKlingStatus("done"); setKlingPollMsg("");
      };

      const shouldLipsync = node.lipsync && hasAnyVoice && simpleLipsyncText;
      if (shouldLipsync) {
        setKlingLipsyncErr("");
        try {
          const computeAdvancedTiming = ({ faceStartMs, faceEndMs, windowStartMs = 0, windowEndMs = videoDurationMs, audioDurationMs, videoDurationMs, speaker }) => {
            const SAFETY_MS = 120;
            if (!Number.isFinite(audioDurationMs) || audioDurationMs < 2000) {
              throw new Error(`Audio for ${speaker} is shorter than 2s, which Kling advanced lipsync rejects`);
            }
            if (!Number.isFinite(videoDurationMs) || videoDurationMs < 2000) {
              throw new Error(`Video is shorter than 2s, which Kling advanced lipsync rejects`);
            }
            if (!Number.isFinite(faceStartMs) || !Number.isFinite(faceEndMs)) {
              throw new Error(`Missing face timing for ${speaker}`);
            }

            const maxClipDurationMs = Math.max(0, Math.min(videoDurationMs - SAFETY_MS, windowEndMs - windowStartMs));
            const clipDurationMs = Math.min(audioDurationMs, maxClipDurationMs);
            if (clipDurationMs < 2000) {
              throw new Error(`Cropped audio for ${speaker} would be shorter than 2s`);
            }

            const maxVideoInsertTime = Math.max(0, videoDurationMs - SAFETY_MS - clipDurationMs);
            const minInsertTime = Math.max(0, windowStartMs, faceStartMs - (clipDurationMs - 2000));
            const maxInsertTime = Math.min(maxVideoInsertTime, windowEndMs - clipDurationMs, faceEndMs - 2000);
            if (maxInsertTime < minInsertTime) {
              throw new Error(`Face for ${speaker} is not visible long enough for a 2s lipsync overlap`);
            }

            const insertTimeMs = Math.max(minInsertTime, Math.min(faceStartMs, maxInsertTime));
            return {
              sound_start_time: 0,
              sound_end_time: clipDurationMs,
              sound_insert_time: insertTimeMs,
            };
          };
          // ── Step 1: parse per-speaker dialogue from all linked shots ──────
          const speakerLines = {}; // { "WIZARD": ["line1", "line2"], ... }
          const speakerShotBudgetSec = {}; // { "WIZARD": 4, ... } summed speaking-shot duration
          for (const sh of shotNodes) {
            if (!sh.dialogue?.trim()) continue;
            let curSpeaker = null;
            const speakersInShot = new Set();
            for (const rawLine of sh.dialogue.split('\n')) {
              const t = rawLine.trim();
              if (!t) continue;
              if (/^[A-Z][A-Z0-9\s.'"\\-]+(\s*\([^)]*\))?\s*$/.test(t)) {
                curSpeaker = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
                if (!speakerLines[curSpeaker]) speakerLines[curSpeaker] = [];
              } else if (/^\([^)]+\)$/.test(t)) {
                // stage direction — skip
              } else if (curSpeaker) {
                speakerLines[curSpeaker].push(t);
                speakersInShot.add(curSpeaker);
              }
            }
            for (const spk of speakersInShot) {
              speakerShotBudgetSec[spk] = (speakerShotBudgetSec[spk] || 0) + (sh.durationSec || 0);
            }
          }
          const speakers = Object.keys(speakerLines);
          if (speakers.length === 0) { await runSimpleLipsync(url); return; }
          const shotPlan = buildKlingShotPlan(shotNodes, shotNodes.length > 1);
          const segmentPlansBase = [];
          for (const { shot: plannedShot, durationSec, startSec, endSec } of shotPlan) {
            const segments = parseDialogueSegments(plannedShot.dialogue || "");
            segments.forEach((seg, segIdx) => {
              segmentPlansBase.push({
                segmentId: `${plannedShot.id}:${segIdx}:${seg.speaker}`,
                speaker: seg.speaker,
                text: seg.text.slice(0, 1000),
                shotId: plannedShot.id,
                shotIndex: plannedShot.index,
                shotDurationSec: durationSec,
                shotStartMs: Math.round(startSec * 1000),
                shotEndMs: Math.round(endSec * 1000),
                shotEntityTags: plannedShot.entityTags || [],
              });
            });
          }
          if (segmentPlansBase.length === 0) { await runSimpleLipsync(url); return; }
          const impossibleShotIssues = segmentPlansBase
            .filter(seg => seg.shotDurationSec < 2)
            .map(seg => `Shot ${seg.shotIndex} ${seg.speaker} is only ${seg.shotDurationSec.toFixed(1)}s; Kling advanced lipsync needs at least 2.0s of usable video`);
          if (impossibleShotIssues.length) {
            throw new Error(`[lipsync-precheck] ${impossibleShotIssues.join("; ")}`);
          }

          // ── Map speaker names → bible tags (e.g. "WIZARD" → "@WIZARD") ──
          // Normalise by uppercasing and stripping non-alphanumeric chars for fuzzy match
          const normTag = s => s.toUpperCase().replace(/^@/, '').replace(/[^A-Z0-9]/g, '');
          const allBibleEntries = shotNodes.flatMap(sh => {
            const sceneBible = allNodes.find(n => n.id === sh.sceneId)?.bible || [];
            return [...(sh.bible || []), ...sceneBible];
          });
          // speaker → matching bible entry (used to get reference image or other metadata)
          const speakerBibleMap = {};
          for (const speaker of speakers) {
            const match = allBibleEntries.find(e => normTag(e.tag) === normTag(speaker));
            if (match) speakerBibleMap[speaker] = match;
          }

          // ── Resolve per-speaker voice ID ─────────────────────────────────
          // Priority: characterVoices[speaker] → node.voice (global fallback)
          const charVoices = node.characterVoices || {};
          const resolveVoice = (speaker) => {
            const v = charVoices[speaker];
            if (v && v !== "none") return v;
            return node.voice || "none";
          };

          const segmentPlans = segmentPlansBase.map((seg) => {
            const voice_id = resolveVoice(seg.speaker);
            if (!voice_id || voice_id === "none") throw new Error(`No voice assigned for speaker: ${seg.speaker}`);
            return {
              ...seg,
              voice_id,
              speakerKey: normTag(seg.speaker),
              visualOrder: (seg.shotEntityTags || []).map(normTag),
            };
          });

          // ── Step 2: TTS for each speaker ─────────────────────────────────
          const pollTts = async (taskId) => {
            for (let i = 0; i < 60; i++) {
              await new Promise(r => setTimeout(r, 2000));
              const r = await fetch(`/api/kling/tts/${taskId}`);
              if (!r.ok) throw new Error(`TTS poll HTTP ${r.status}`);
              const d = await r.json();
              const st = d.data?.task_status;
              if (st === "succeed") return d.data.task_result.audios[0]; // { id, url, duration }
              if (st === "failed") throw new Error(`TTS failed: ${d.data?.task_status_msg || "unknown"}`);
            }
            throw new Error("TTS timeout");
          };

          const segmentAudio = {}; // segmentId → { id, url, duration (s) }
          for (const { segmentId, speaker, voice_id, text } of segmentPlans) {
            setKlingPollMsg(`TTS: generating voice for ${speaker}…`);
            const ttsRes = await fetch("/api/kling/tts", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text, voice_id, voice_language: "en" }),
            });
            if (!ttsRes.ok) {
              const errBody = await ttsRes.text().catch(() => "");
              throw new Error(`TTS request failed: ${ttsRes.status} — ${errBody.slice(0, 200)}`);
            }
            const ttsData = await ttsRes.json();
            if (ttsData.code && ttsData.code !== 0) throw new Error(`TTS error ${ttsData.code}: ${ttsData.message}`);
            if (ttsData.data?.task_status === "succeed" && ttsData.data?.task_result?.audios?.[0]) {
              segmentAudio[segmentId] = ttsData.data.task_result.audios[0];
            } else {
              const ttsTaskId = ttsData.data?.task_id;
              if (!ttsTaskId) throw new Error(`No TTS task_id in response: ${JSON.stringify(ttsData).slice(0, 200)}`);
              segmentAudio[segmentId] = await pollTts(ttsTaskId);
            }
          }

          // ── Step 3: identify faces in video ──────────────────────────────
          setKlingPollMsg("Identifying faces in video…");
          const shortAudioIssues = segmentPlans.flatMap(({ segmentId, shotIndex, speaker }) => {
            const audioDurationMs = Math.round(parseFloat(segmentAudio[segmentId]?.duration || 0) * 1000);
            if (Number.isFinite(audioDurationMs) && audioDurationMs >= 2000) return [];
            return [`Shot ${shotIndex} ${speaker} produced ${(Math.max(audioDurationMs, 0) / 1000).toFixed(1)}s of audio; Kling advanced lipsync requires at least 2.0s`];
          });
          if (shortAudioIssues.length) {
            throw new Error(`[lipsync-precheck] ${shortAudioIssues.join("; ")}`);
          }

          const faceRes = await fetch("/api/kling/identify-face", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(generatedVideoId ? { video_id: generatedVideoId } : { video_url: url }),
          });
          if (!faceRes.ok) throw new Error(`Identify-face HTTP ${faceRes.status}`);
          const faceData = await faceRes.json();
          if (faceData.code && faceData.code !== 0) throw new Error(`Identify-face error ${faceData.code}: ${faceData.message}`);
          const sessionId = faceData.data?.session_id;
          const faces = (faceData.data?.face_data || []).sort((a, b) => a.start_time - b.start_time);
          if (!sessionId) throw new Error("No session_id from identify-face");
          if (faces.length === 0) throw new Error("No faces detected in video — can't lipsync");

          // ── Step 4: build per-segment lipsync assignments ────────────────
          const assignments = segmentPlans.map((segment, segIdx) => {
            const audio = segmentAudio[segment.segmentId];
            const audioDurationMs = Math.round(parseFloat(audio?.duration || 0) * 1000);
            return {
              ...segment,
              orderIdx: segIdx,
              audio_id: audio?.id,
              _audioDurationMs: audioDurationMs,
            };
          });

          // ── Step 5: chain advanced-lipsync one face at a time ────────────
          // Kling only supports one-person lipsync per call. For multi-speaker:
          // apply lipsync → get new video URL → re-identify faces → repeat.
          const pollAdv = async (taskId, label) => {
            for (let i = 0; i < 180; i++) {
              await new Promise(r => setTimeout(r, 2000));
              const pr = await fetch(`/api/kling/advanced-lipsync/${taskId}`);
              if (!pr.ok) throw new Error(`Advanced-lipsync poll HTTP ${pr.status}`);
              const pd = await pr.json();
              const st = pd.data?.task_status;
              if (st === "succeed") {
                const video = pd.data?.task_result?.videos?.[0];
                return {
                  id: video?.id || null,
                  url: video?.url || null,
                  durationMs: Math.round(parseFloat(video?.duration || 0) * 1000),
                };
              }
              if (st === "failed") throw new Error(`Lipsync failed for ${label}: ${pd.data?.task_status_msg || "unknown"}`);
              setKlingPollMsg(`Lipsync ${label}: ${st || "processing"}…`);
            }
            throw new Error(`Lipsync timeout for ${label}`);
          };

          let currentVideoId = generatedVideoId;
          let currentVideoUrl = url;
          let currentVideoDurationMs = generatedVideoDurationMs;
          let currentSessionId = sessionId;
          let currentFaces = faces;

          for (let idx = 0; idx < assignments.length; idx++) {
            const a = assignments[idx];
            // For the 2nd+ speaker, re-identify faces on the updated video
            if (idx > 0) {
              setKlingPollMsg(`Re-identifying faces for ${a.speaker}…`);
              const reFaceRes = await fetch("/api/kling/identify-face", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentVideoId ? { video_id: currentVideoId } : { video_url: currentVideoUrl }),
              });
              if (reFaceRes.ok) {
                const rfd = await reFaceRes.json();
                if (!rfd.code || rfd.code === 0) {
                  currentSessionId = rfd.data?.session_id || currentSessionId;
                  currentFaces = (rfd.data?.face_data || []).sort((a2, b2) => a2.start_time - b2.start_time);
                }
              }
            }
            // Pick a face that overlaps this shot window, then use the shot's visual order when possible.
            const overlappingFaces = currentFaces.filter(f => f.end_time > a.shotStartMs && f.start_time < a.shotEndMs);
            const facePool = overlappingFaces.length ? overlappingFaces : currentFaces;
            const visualIdx = a.visualOrder.indexOf(a.speakerKey);
            const fallbackIdx = Math.min(a.orderIdx, Math.max(facePool.length - 1, 0));
            const faceIdx = visualIdx >= 0 ? Math.min(visualIdx, Math.max(facePool.length - 1, 0)) : fallbackIdx;
            const face = facePool[faceIdx] || facePool[0];
            const faceId = face?.face_id ?? a.face_id;
            if (!a.audio_id) throw new Error(`Missing TTS audio for ${a.speaker}`);
            const timing = computeAdvancedTiming({
              faceStartMs: face?.start_time ?? 0,
              faceEndMs: face?.end_time ?? currentVideoDurationMs,
              windowStartMs: a.shotStartMs,
              windowEndMs: a.shotEndMs,
              audioDurationMs: a._audioDurationMs,
              videoDurationMs: currentVideoDurationMs,
              speaker: a.speaker,
            });
            setKlingPollMsg(`Lipsync: applying ${a.speaker}'s voice to face ${faceId}…`);
            const lsRes = await fetch("/api/kling/advanced-lipsync", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                session_id: currentSessionId,
                face_choose: [{
                  face_id: faceId,
                  audio_id: a.audio_id,
                  ...timing,
                }],
              }),
            });
            if (!lsRes.ok) throw new Error(`Advanced-lipsync HTTP ${lsRes.status}`);
            const lsData = await lsRes.json();
            if (lsData.code && lsData.code !== 0) throw new Error(`Advanced-lipsync error ${lsData.code}: ${lsData.message}`);
            const lsTaskId = lsData.data?.task_id;
            if (!lsTaskId) throw new Error("No task_id from advanced-lipsync");
            const nextVideo = await pollAdv(lsTaskId, a.speaker);
            if (nextVideo?.id) currentVideoId = nextVideo.id;
            if (nextVideo?.url) currentVideoUrl = nextVideo.url;
            if (nextVideo?.durationMs) currentVideoDurationMs = nextVideo.durationMs;
          }

          upd({ videoUrl: currentVideoUrl });
          setKlingStatus("done"); setKlingPollMsg(""); return;

        } catch (lsErr) {
          const isPrecheckFailure = lsErr?.message?.startsWith?.("[lipsync-precheck]");
          const cleanMsg = isPrecheckFailure ? lsErr.message.replace("[lipsync-precheck] ", "") : lsErr.message;
          if (isPrecheckFailure) {
            console.warn("Advanced lipsync skipped by precheck:", cleanMsg);
            setKlingLipsyncErr(`Advanced lipsync skipped: ${cleanMsg}`);
            upd({ videoUrl: url }); setKlingStatus("done"); setKlingPollMsg("");
            return;
          }
          console.warn("Advanced lipsync failed, falling back to simple:", lsErr.message);
          setKlingLipsyncErr(`Advanced lipsync failed (${lsErr.message.slice(0,80)}), trying simple lipsync…`);
          try {
            await runSimpleLipsync(url);
          } catch (simpleErr) {
            setKlingLipsyncErr(`Lipsync error: ${simpleErr.message}`);
            upd({ videoUrl: url }); setKlingStatus("done"); setKlingPollMsg("");
          }
          return;
        }
      }

      upd({ videoUrl: url });
      setKlingStatus("done"); setKlingPollMsg("");
    } catch(e) {
      setKlingStatus("failed"); setKlingPollMsg("");
      if (e.creditsError) { onOutOfCredits?.(e.creditsError); return; }
      setKlingError(e.message);
    }
  };

  const fSel = mkSel(th);

  return (
    <div data-nodeid={node.id} data-nodetype={T.KLING} style={{ position:"relative", width:290 }}>
      {/* INPUT PORT — left, receives Shot wires */}
      <div style={{ position:"absolute", left:-4, top:48, width:8, height:8,
        background:th.card, border:`1.5px solid ${shotNodes.length>0 ? ac : th.b0}`, borderRadius:"50%",
        zIndex:10, pointerEvents:"none" }}>
      </div>

      {/* OUTPUT PORT — right, drag to next Kling node for continuity */}
      <div
        onMouseDown={e => {
          e.preventDefault(); e.stopPropagation();
          if (onStartWire && nodePos) onStartWire(node.id, T.KLING, nodePos.x + 290, nodePos.y + 44);
        }}
        title="Drag to next Kling node — feeds this video as continuity reference"
        style={{ position:"absolute", right:-4, top:48, width:8, height:8,
          background: th.dark ? (node.videoUrl ? ac : th.t3) : th.t1,
          borderRadius:"50%", zIndex:10, cursor:"crosshair",
          transition:"transform 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.5)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
      </div>

      <div style={{ width:290, background:th.card, border:`1px solid ${selColor}`, borderRadius:16, overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}` }}>
        {/* Header */}
        <div style={{ background:th.card, padding:"10px 12px 6px", display:"flex", alignItems:"center", gap:6, borderBottom:`1px solid ${th.dark ? ac+"22" : "transparent"}` }}>
          <Ico icon={Film} size={11} color={th.dark ? ac : th.t3}/>
          <span style={{ fontSize:7, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>KLING NODE</span>
          <span style={{ marginLeft:"auto", fontSize:6, color:`${ac}55`, letterSpacing:"0.06em" }}>
            {shotNodes.length===0 ? "no shots" : shotNodes.length===1 ? "single shot" : `${shotNodes.length} shots · multi`}
          </span>
          {onInspect && <InspectAction onClick={onInspect} th={th} />}
          <button onMouseDown={e=>e.stopPropagation()} onClick={onDel}
            style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1 }} title="Delete node">✕</button>
        </div>

        {/* Mode tabs */}
        {(() => {
          const kMode = node.klingMode || "shots";
          const tabStyle = (active) => ({
            flex:1, padding:"5px 0", fontSize:7, fontWeight:700, letterSpacing:"0.1em",
            fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer", border:"none",
            background: active ? `${ac}22` : "transparent",
            color: active ? ac : th.t3,
            borderBottom: active ? `2px solid ${ac}` : `2px solid transparent`,
          });
          return (
            <div style={{ display:"flex", borderBottom:`1px solid ${th.b0}` }}>
              {[["shots","SHOTS"],["multi-image","MULTI-IMAGE"]].map(([val,label]) => (
                <button key={val} onMouseDown={e=>e.stopPropagation()}
                  onClick={()=>upd({ klingMode: val })}
                  style={tabStyle(kMode===val)}>{label}</button>
              ))}
            </div>
          );
        })()}

        <div style={{ padding:"8px 10px", display:"flex", flexDirection:"column", gap:6 }}>

          {/* Continuity reference — previous Kling node */}
          {prevKlingNode && (
            <div style={{ background:th.card2, border:`1px solid ${ac}33`, borderRadius:4, padding:"5px 8px", display:"flex", alignItems:"center", gap:6 }}>
              <Ico icon={Link2} size={9} color={ac}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:6, color:ac, letterSpacing:"0.1em", marginBottom:1 }}>CONTINUING FROM</div>
                <div style={{ fontSize:6, color: prevVideoUrl ? "#a3e635" : "#f87171", letterSpacing:"0.06em" }}>
                  {prevVideoUrl ? "✓ video ready — will be used as reference" : "⚠ prev node has no video yet — generate it first"}
                </div>
              </div>
              <button onMouseDown={e=>e.stopPropagation()} onClick={()=>upd({prevKlingId:null})}
                style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1 }} title="Unlink">✕</button>
            </div>
          )}

          {/* ── SHOTS mode ─────────────────────────────────────────────────── */}
          {(node.klingMode||"shots") === "shots" && <>

          {/* Shot slots */}
          <div>
            <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.15em", display:"block", marginBottom:4 }}>
              SHOTS — wire from Shot output port ↙
            </span>
            {shotNodes.length===0 && (
              <div style={{ border:`1px dashed ${th.b0}`, borderRadius:4, padding:"10px", textAlign:"center", fontSize:6, color:th.b1, letterSpacing:"0.08em" }}>
                drag from Shot node output →
              </div>
            )}
            {shotNodes.map((sh, i) => (
              <div key={sh.id} style={{ display:"flex", alignItems:"flex-start", gap:5, background:th.bg, border:`1px solid ${ac}22`, borderRadius:3, padding:"4px 6px", marginBottom:3 }}>
                <div style={{ minWidth:20, height:20, background:`${ac}20`, border:`1px solid ${ac}44`, borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:ac, fontWeight:700, flexShrink:0 }}>
                  {i+1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:6, color:"#38bdf8", letterSpacing:"0.06em", marginBottom:2 }}>
                    SHOT #{sh.index} · {sh.durationSec||5}s
                  </div>
                  {!!sh.dialogue?.trim() && (
                    <div style={{ fontSize:6, color:"#a78bfa", lineHeight:1.5, marginBottom:2, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                      {stripSpeakerNames(sh.dialogue).replace(/\s+/g, " ").trim()}
                    </div>
                  )}
                  <div style={{ fontSize:6, color:th.t2, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                    {sh.compiledText || sh.how || "—"}
                  </div>
                </div>
                <button onMouseDown={e=>e.stopPropagation()} onClick={()=>removeShot(sh.id)}
                  style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1, flexShrink:0 }} title="Remove">✕</button>
              </div>
            ))}
          </div>

          {/* Image reference slots */}
          <div>
            <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.15em", display:"block", marginBottom:4 }}>
              IMAGE REFS — wire from Image node output ↙
            </span>
            {imageRefNodes.length === 0 ? (
              <div style={{ border:`1px dashed ${th.b0}`, borderRadius:4, padding:"10px", textAlign:"center", fontSize:6, color:th.b1, letterSpacing:"0.08em" }}>
                drag from Image node output → (used as visual reference)
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                {imageRefNodes.map(img => (
                  <div key={img.id} style={{ display:"flex", gap:5, alignItems:"center", background:th.bg, border:`1px solid ${ac}22`, borderRadius:3, padding:"4px 6px" }}>
                    {img.generatedUrl
                      ? <img src={img.generatedUrl} alt="" style={{ width:38, height:32, objectFit:"cover", borderRadius:2, border:`1px solid ${ac}33`, flexShrink:0 }}/>
                      : <div style={{ width:38, height:32, background:th.card2, border:`1px dashed ${ac}22`, borderRadius:2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, color:th.t3, flexShrink:0 }}>?</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:6, color:ac, letterSpacing:"0.1em", marginBottom:1 }}>IMAGE REF</div>
                      {!img.generatedUrl && (
                        <div style={{ fontSize:5, color:"#f87171" }}>⚠ generate image first</div>
                      )}
                      {img.generatedUrl && (
                        <div style={{ fontSize:5, color:th.t3 }}>injected as image reference</div>
                      )}
                    </div>
                    <button onMouseDown={e=>e.stopPropagation()}
                      onClick={()=>upd({ imageRefIds: (node.imageRefIds||[]).filter(id=>id!==img.id) })}
                      style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1, flexShrink:0 }} title="Remove">✕</button>
                  </div>
                ))}
                <div style={{ border:`1px dashed ${ac}22`, borderRadius:3, padding:"4px 7px", textAlign:"center", fontSize:6, color:th.t3, letterSpacing:"0.08em" }}>
                  + wire more IMAGE nodes
                </div>
              </div>
            )}
          </div>

          </> /* end SHOTS mode */}

          {/* ── MULTI-IMAGE mode ───────────────────────────────────────────── */}
          {(node.klingMode||"shots") === "multi-image" && (() => {
            const multiImgNodes = imageRefNodes.slice(0, 4);
            const canGenMulti = multiImgNodes.some(n => n.generatedUrl) && (node.multiImagePrompt||"").trim();
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em" }}>
                  Wire up to 4 IMAGE nodes — Kling animates across them
                </div>
                {/* Image slots */}
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  {[0,1,2,3].map(i => {
                    const img = multiImgNodes[i];
                    return (
                      <div key={i} style={{ display:"flex", gap:6, alignItems:"center",
                        background: img ? th.bg : th.card2,
                        border:`1px solid ${img ? `${ac}44` : th.b0}`,
                        borderRadius:4, padding:"5px 7px" }}>
                        <div style={{ fontSize:7, fontWeight:700, color:img ? ac : th.t4, minWidth:14 }}>{i+1}</div>
                        {img ? (
                          <>
                            {img.generatedUrl
                              ? <img src={img.generatedUrl} alt="" style={{ width:40, height:30, objectFit:"cover", borderRadius:2, flexShrink:0 }}/>
                              : <div style={{ width:40, height:30, background:th.card3, border:`1px dashed ${ac}33`, borderRadius:2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:6, color:"#f87171", flexShrink:0 }}>!</div>
                            }
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:6, color: img.generatedUrl ? "#a3e635" : "#f87171" }}>
                                {img.generatedUrl ? "✓ image ready" : "⚠ generate image first"}
                              </div>
                            </div>
                            <button onMouseDown={e=>e.stopPropagation()}
                              onClick={()=>upd({ imageRefIds:(node.imageRefIds||[]).filter(id=>id!==img.id) })}
                              style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px" }}>✕</button>
                          </>
                        ) : (
                          <span style={{ fontSize:6, color:th.t4, letterSpacing:"0.08em" }}>wire an Image node here</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Prompt */}
                <div>
                  <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em", display:"block", marginBottom:3 }}>PROMPT</span>
                  <textarea onMouseDown={e=>e.stopPropagation()}
                    value={node.multiImagePrompt||""} onChange={e=>upd({ multiImagePrompt:e.target.value })}
                    placeholder="Describe how to animate across these images…"
                    rows={3} style={{ ...mkInp(th), width:"100%", resize:"vertical", fontSize:7 }}/>
                </div>
              </div>
            );
          })()}

          {/* Config row */}
          <div style={{ display:"flex", gap:4 }}>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em", display:"block", marginBottom:2 }}>ASPECT</span>
              <select onMouseDown={e=>e.stopPropagation()} value={node.aspect_ratio||"16:9"} onChange={e=>upd({aspect_ratio:e.target.value})} style={fSel}>
                <option>16:9</option><option>9:16</option><option>1:1</option>
              </select>
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em", display:"block", marginBottom:2 }}>MODE</span>
              <select onMouseDown={e=>e.stopPropagation()} value={node.mode||"pro"} onChange={e=>upd({mode:e.target.value})} style={fSel}>
                <option value="pro">PRO</option><option value="std">STD</option>
              </select>
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em", display:"block", marginBottom:2 }}>SOUND</span>
              <select onMouseDown={e=>e.stopPropagation()} value={node.sound||"off"} onChange={e=>upd({sound:e.target.value})} style={fSel}>
                <option value="off">OFF</option><option value="on">ON</option>
              </select>
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em", display:"block", marginBottom:2 }}>RES</span>
              {(() => {
                const tier = credits?.tier;
                const isPaid = tier && tier !== "free";
                return (
                  <select
                    onMouseDown={e=>e.stopPropagation()}
                    value={isPaid ? (node.resolution||"720p") : "720p"}
                    onChange={e=>{ if(isPaid) upd({resolution:e.target.value}); }}
                    disabled={!isPaid}
                    style={{ ...fSel, opacity: isPaid ? 1 : 0.45, cursor: isPaid ? "pointer" : "not-allowed" }}
                    title={!isPaid ? "1080p requires a paid plan" : undefined}
                  >
                    <option value="720p">720p</option>
                    {isPaid && <option value="1080p">1080p ×2cr</option>}
                    {!isPaid && <option value="1080p" disabled>1080p 🔒</option>}
                  </select>
                );
              })()}
            </div>
            {/* Model version */}
            <div style={{ flex:1 }}>
              <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em", display:"block", marginBottom:2 }}>MODEL</span>
              <select onMouseDown={e=>e.stopPropagation()}
                value={node.klingVersion||"v3"}
                onChange={e=>upd({ klingVersion:e.target.value, klingVideoId:null, klingVideoDuration:null })}
                style={fSel}>
                <option value="v3">V3 (Omni)</option>
                <option value="v1.6">V1.6 + Extend</option>
              </select>
            </div>
          </div>
          {(node.klingVersion||"v3") === "v1.6" && (
            <div style={{ fontSize:6, color:"#f59e0b", letterSpacing:"0.08em", marginTop:2 }}>
              ⚡ V1.6 — single shot only · supports video extension up to 3 min
            </div>
          )}

          {/* Dialogue / Voice / Lipsync row */}
          {(() => {
            const hasDialogue = shotNodes.some(sh => sh.dialogue?.trim());
            const lipsyncAc = "#a78bfa";
            return (
              <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:6 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:6, color: hasDialogue ? lipsyncAc : th.t3, letterSpacing:"0.15em" }}>
                    DIALOGUE & VOICE {hasDialogue ? `· ${shotNodes.filter(sh=>sh.dialogue?.trim()).length} shot(s) with lines` : "· no dialogue in shots"}
                  </span>
                  <button
                    onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{ e.stopPropagation(); upd({ lipsync: !node.lipsync }); }}
                    disabled={!hasDialogue}
                    title={hasDialogue ? "Auto-run lipsync after video generation" : "Add dialogue to shot nodes first"}
                    style={{ fontSize:6, fontWeight:700, letterSpacing:"0.08em", padding:"2px 7px", borderRadius:2, border:`1px solid ${node.lipsync ? lipsyncAc+"88" : th.b0}`, background: node.lipsync ? lipsyncAc+"22" : "transparent", color: node.lipsync ? lipsyncAc : th.t3, cursor: hasDialogue ? "pointer" : "not-allowed", opacity: hasDialogue ? 1 : 0.4, fontFamily:"'Inter',system-ui,sans-serif" }}>
                    {node.lipsync ? "✓ LIPSYNC ON" : "LIPSYNC OFF"}
                  </button>
                </div>
                {node.lipsync && hasDialogue && (() => {
                  // Detect speakers and build per-speaker line previews
                  const allSpeakers = [...new Set(shotNodes.flatMap(sh => detectSpeakers(sh.dialogue || "")))];
                  const hasMultiSpeaker = allSpeakers.length > 1;

                  const previewShotPlan = buildKlingShotPlan(shotNodes, shotNodes.length > 1);
                  const segmentPreview = previewShotPlan.flatMap(({ shot, durationSec }, shotPlanIdx) =>
                    parseDialogueSegments(shot.dialogue || "").map((seg, segIdx) => {
                      const estimatedSecs = estimateSpeechSeconds(seg.text);
                      return {
                        key: `${shot.id}:${segIdx}`,
                        shotIndex: shot.index,
                        speaker: seg.speaker,
                        text: seg.text,
                        truncated: seg.text.length > 1000,
                        estimatedSecs,
                        shotBudgetSec: durationSec,
                        tooShortForAdvanced: estimatedSecs > 0 && estimatedSecs < 2,
                        tooLongForShot: estimatedSecs > durationSec,
                      };
                    })
                  );

                  // Voice selector helper — renders a <select> for a given value/onChange
                  const VoiceSelect = ({ value, onChange }) => (
                    <select onMouseDown={e=>e.stopPropagation()} value={value||"none"} onChange={onChange} style={fSel}>
                      <option value="none">{voicesLoading ? "Loading…" : "— select voice —"}</option>
                      {klingVoices.length > 0
                        ? klingVoices.map(v => (
                            <option key={v.voice_id||v.id} value={v.voice_id||v.id}>
                              {v.voice_name||v.name||v.voice_id||v.id}
                            </option>
                          ))
                        : !voicesLoading && (<>
                            <optgroup label="Female">
                              <option value="commercial_lady_en_f-v1">Female · Commercial</option>
                              <option value="chat1_female_new-3">Female · Chat</option>
                              <option value="genshin_kirara">Female · Kirara</option>
                            </optgroup>
                            <optgroup label="Male">
                              <option value="oversea_male1">Male · Overseas</option>
                              <option value="uk_man2">Male · UK</option>
                              <option value="uk_boy1">Male · UK Young</option>
                            </optgroup>
                          </>)
                      }
                    </select>
                  );

                  const charVoices = node.characterVoices || {};

                  return (
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>

                    {/* ── VOICE ASSIGNMENT ── */}
                    {hasMultiSpeaker ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                        <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em" }}>VOICES PER CHARACTER</span>
                        {allSpeakers.map(spk => (
                          <div key={spk} style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:6, color:lipsyncAc, fontWeight:700, minWidth:60, letterSpacing:"0.05em" }}>{spk}</span>
                            <div style={{ flex:1 }}>
                              <VoiceSelect
                                value={charVoices[spk] || "none"}
                                onChange={e => { e.stopPropagation(); upd({ characterVoices: { ...charVoices, [spk]: e.target.value } }); }}
                              />
                            </div>
                          </div>
                        ))}
                        {allSpeakers.some(spk => !charVoices[spk] || charVoices[spk] === "none") && (
                          <div style={{ fontSize:6, color:"#fbbf24", letterSpacing:"0.06em" }}>⚠ Assign a voice to every character to enable lipsync</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em", display:"block", marginBottom:2 }}>VOICE</span>
                        <VoiceSelect value={node.voice||"none"} onChange={e=>{e.stopPropagation();upd({voice:e.target.value});}} />
                        {(!node.voice || node.voice === "none") && (
                          <div style={{ fontSize:6, color:"#fbbf24", letterSpacing:"0.06em", marginTop:2 }}>⚠ Select a voice to enable lipsync generation</div>
                        )}
                      </div>
                    )}

                    {/* ── PER-SPEAKER AUDIO PREVIEW ── */}
                    <div style={{ background:`${lipsyncAc}0d`, border:`1px solid ${lipsyncAc}33`, borderRadius:3, padding:"5px 7px" }}>
                      <span style={{ fontSize:5, letterSpacing:"0.15em", color:lipsyncAc, fontWeight:700, display:"block", marginBottom:4 }}>
                        AUDIO SCRIPT {hasMultiSpeaker ? `— ${allSpeakers.length} SPEAKERS` : "PREVIEW"}
                      </span>
                      {segmentPreview.map(({ key, shotIndex, speaker, text, truncated, estimatedSecs, shotBudgetSec, tooShortForAdvanced, tooLongForShot }) => (
                        <div key={key} style={{ marginBottom:4 }}>
                          <span style={{ fontSize:5, color:lipsyncAc, fontWeight:700, letterSpacing:"0.1em", display:"block", marginBottom:1 }}>
                            SHOT {shotIndex} · {speaker}
                          </span>
                          <div style={{ fontSize:5, color:th.t3, letterSpacing:"0.06em", marginBottom:1 }}>
                            est. speech {estimatedSecs.toFixed(1)}s {shotBudgetSec > 0 ? `· shot time ${shotBudgetSec.toFixed(1)}s` : ""}
                          </div>
                          <div style={{ fontSize:6, color:th.t1, lineHeight:1.6, fontStyle:"italic", wordBreak:"break-word" }}>
                            "{text.slice(0,120)}{text.length>120?"…":""}"
                          </div>
                          {tooShortForAdvanced && (
                            <div style={{ fontSize:5, color:"#fbbf24", marginTop:1, letterSpacing:"0.06em" }}>
                              ⚠ Advanced lipsync needs at least 2.0s of speech for this speaker
                            </div>
                          )}
                          {tooLongForShot && (
                            <div style={{ fontSize:5, color:"#fbbf24", marginTop:1, letterSpacing:"0.06em" }}>
                              ⚠ Increase shot duration — estimated speech exceeds this shot's duration
                            </div>
                          )}
                          {truncated && (
                            <div style={{ fontSize:5, color:"#fbbf24", marginTop:1, letterSpacing:"0.06em" }}>
                              ⚠ {text.length}/1000 chars — truncated for TTS
                            </div>
                          )}
                        </div>
                      ))}
                      {shotNodes.filter(sh=>sh.dialogue?.trim()).length > 1 && (
                        <div style={{ fontSize:5, color:th.t3, marginTop:2, letterSpacing:"0.06em" }}>
                          Combined from {shotNodes.filter(sh=>sh.dialogue?.trim()).length} shots
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Video player */}
          {node.videoUrl && (
            <div style={{ borderRadius:4, overflow:"hidden", border:`1px solid ${ac}33`, background:"#000" }}>
              <video src={node.videoUrl} controls style={{ width:"100%", display:"block", maxHeight:150 }} />
              <div style={{ padding:"3px 7px", background:th.bg, display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:6, color:ac, letterSpacing:"0.1em" }}>KLING VIDEO</span>
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();saveToAssets();}}
                  disabled={savingAsset}
                  style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:3, background: savedAsset ? "#22c55e22" : `${ac}22`, border:`1px solid ${savedAsset?"#22c55e44":ac+"44"}`, borderRadius:3, color: savedAsset ? "#22c55e" : ac, fontSize:6, fontWeight:700, letterSpacing:"0.08em", padding:"2px 6px", cursor:savingAsset?"not-allowed":"pointer", opacity:savingAsset?0.6:1 }}>
                  {savingAsset ? "SAVING…" : savedAsset ? "✓ SAVED" : "⬇ SAVE TO ASSETS"}
                </button>
                <a href={node.videoUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:6, color:`${ac}99`, textDecoration:"none", letterSpacing:"0.08em" }}>↗ open</a>
                <button onMouseDown={e=>e.stopPropagation()} onClick={()=>upd({videoUrl:null})}
                  style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1 }} title="Clear video">✕</button>
              </div>
            </div>
          )}

          {/* Error */}
          {klingStatus==="failed" && klingError && (
            <div style={{ fontSize:6, color:"#f87171", background:"#1a0a0a", border:"1px solid #f8717133", borderRadius:3, padding:"4px 7px", letterSpacing:"0.04em", lineHeight:1.6 }}>
              ✕ {klingError}
            </div>
          )}

          {/* Lipsync error (non-fatal — video was saved, but lipsync failed) */}
          {klingLipsyncErr && (
            <div style={{ fontSize:6, color:"#fb923c", background:"#1a0e06", border:"1px solid #fb923c44", borderRadius:3, padding:"4px 7px", letterSpacing:"0.04em", lineHeight:1.6, display:"flex", gap:5 }}>
              <span>⚠</span>
              <span style={{ flex:1 }}>{klingLipsyncErr}<br/>Video saved without lipsync — check voice ID and retry.</span>
              <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setKlingLipsyncErr("")} style={{ background:"transparent", border:"none", color:"#fb923c", cursor:"pointer", fontSize:8, padding:0, flexShrink:0 }}>✕</button>
            </div>
          )}

          {/* Generate button */}
          {(() => {
            const isMulti = (node.klingMode||"shots") === "multi-image";
            const multiImgNodes = imageRefNodes.slice(0,4);
            const canMulti = isMulti && multiImgNodes.some(n=>n.generatedUrl) && (node.multiImagePrompt||"").trim();
            const canShots = !isMulti && shotNodes.length > 0;
            const busy = klingStatus==="creating"||klingStatus==="polling";
            const canGo = isMulti ? canMulti : canShots;

            const generateMultiImage = async () => {
              if (busy) return;
              setKlingStatus("creating"); setKlingError(""); setKlingPollMsg("Submitting…");
              try {
                const imageList = multiImgNodes
                  .filter(n=>n.generatedUrl)
                  .map(n=>({ image: n.generatedUrl.replace(/^data:[^;]+;base64,/,"") }));
                const r = await fetch("/api/kling/multi-image", {
                  method:"POST", headers:{"Content-Type":"application/json"},
                  body: JSON.stringify({
                    image_list: imageList,
                    prompt: node.multiImagePrompt,
                    mode: node.mode||"std",
                    duration: "5",
                    aspect_ratio: node.aspect_ratio||"16:9",
                  }),
                });
                if (r.status===402) {
                  const d = await r.json();
                  onOutOfCredits?.({ needed:d.credits_needed, balance:d.credits_balance, op:"kling_5s_std" });
                  setKlingStatus("idle"); return;
                }
                if (!r.ok) throw new Error(await r.text());
                const d = await r.json();
                if (d.code && d.code!==0) throw new Error(`Kling ${d.code}: ${d.message}`);
                const taskId = d.data?.task_id;
                setKlingTaskId(taskId);
                setKlingStatus("polling"); setKlingPollMsg("Processing…");
                for (let i=0; i<180; i++) {
                  await new Promise(res=>setTimeout(res,2000));
                  const pr = await fetch(`/api/kling/multi-image/${taskId}`);
                  const pd = await pr.json();
                  const status = pd.data?.task_status;
                  setKlingPollMsg(status||"processing");
                  if (status==="succeed") {
                    const vid = pd.data?.task_result?.videos?.[0];
                    if (vid?.url) upd({ videoUrl: vid.url, klingVideoId: vid.id||null });
                    setKlingStatus("done"); setKlingPollMsg(""); return;
                  }
                  if (status==="failed") throw new Error(pd.data?.task_status_msg||"Task failed");
                }
                throw new Error("Timed out");
              } catch(e) { setKlingStatus("failed"); setKlingError(e.message); }
            };

            return (
              <button onMouseDown={e=>e.stopPropagation()}
                onClick={isMulti ? generateMultiImage : generateVideo}
                disabled={busy||!canGo}
                style={{
                  background: klingStatus==="done" ? `${ac}18` : klingStatus==="failed" ? "#f8717118" : `${ac}15`,
                  border: `1px solid ${klingStatus==="failed" ? "#f8717144" : `${ac}33`}`,
                  color: klingStatus==="done" ? ac : klingStatus==="failed" ? "#f87171" : ac,
                  borderRadius:4, padding:"7px 10px", fontSize:8, fontFamily:"'Inter',system-ui,sans-serif",
                  letterSpacing:"0.12em", cursor: (busy||!canGo) ? "default" : "pointer",
                  width:"100%", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  opacity: (busy||!canGo) ? 0.5 : 1,
                }}>
                {klingStatus==="idle"    && <><span style={{ fontSize:11 }}>▶</span> {isMulti ? "GENERATE MULTI-IMAGE VIDEO" : `GENERATE ${shotNodes.length>1?"MULTI-SHOT":"SHOT"} VIDEO`}</>}
                {klingStatus==="creating"&& <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> SUBMITTING…</>}
                {klingStatus==="polling" && <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> {klingPollMsg||"PROCESSING…"}</>}
                {klingStatus==="done"    && <><span>✓</span> VIDEO READY {node.videoUrl?"":"— REGENERATE"}</>}
                {klingStatus==="failed"  && <><span>↺</span> RETRY</>}
              </button>
            );
          })()}

          {(klingStatus==="creating"||klingStatus==="polling") && (
            <div style={{ fontSize:6, color:th.t3, letterSpacing:"0.08em", textAlign:"center" }}>
              {klingTaskId ? `task: ${klingTaskId.slice(0,16)}…` : "waiting for task ID…"}
            </div>
          )}

          {/* ── EXTEND VIDEO (V1.6 only) ── */}
          {(node.klingVersion||"v3") === "v1.6" && node.klingVideoId && node.videoUrl && (() => {
            const totalSec = node.klingVideoDuration ? Math.round(node.klingVideoDuration / 1000) : null;
            const canExtend = !totalSec || totalSec < 175; // 3min = 180s, leave buffer
            const [extStatus, setExtStatus] = React.useState("idle");
            const [extPrompt, setExtPrompt] = React.useState("");

            const runExtend = async () => {
              if (extStatus === "creating" || extStatus === "polling") return;
              setExtStatus("creating");
              try {
                const r = await fetch("/api/kling/extend", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ video_id: node.klingVideoId, prompt: extPrompt }),
                });
                if (r.status === 402) {
                  const d = await r.json();
                  onOutOfCredits?.({ needed: d.credits_needed, balance: d.credits_balance, op: "kling_extend" });
                  setExtStatus("idle"); return;
                }
                if (!r.ok) throw new Error(await r.text());
                const d = await r.json();
                if (d.code && d.code !== 0) throw new Error(`Kling ${d.code}: ${d.message}`);
                const extTaskId = d.data?.task_id;
                setExtStatus("polling");
                // Poll extend task
                for (let i = 0; i < 180; i++) {
                  await new Promise(res => setTimeout(res, 2000));
                  const pr = await fetch(`/api/kling/extend/${extTaskId}`);
                  const pd = await pr.json();
                  const status = pd.data?.task_status;
                  if (status === "succeed") {
                    const vid = pd.data?.task_result?.videos?.[0];
                    if (vid?.url) {
                      const newDurMs = Math.round(parseFloat(vid.duration || 0) * 1000);
                      upd({ videoUrl: vid.url, klingVideoId: vid.id, klingVideoDuration: newDurMs });
                    }
                    setExtStatus("done"); return;
                  }
                  if (status === "failed") throw new Error(pd.data?.task_status_msg || "Extension failed");
                }
                throw new Error("Extension timed out");
              } catch(e) { setExtStatus("failed"); console.error("Extend failed:", e.message); }
            };

            return (
              <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:8, marginTop:4 }}>
                <div style={{ fontSize:6, color:"#f59e0b", letterSpacing:"0.1em", marginBottom:6, fontWeight:700 }}>
                  ⚡ EXTEND VIDEO
                  {totalSec && <span style={{ color:th.t3, fontWeight:400 }}> · {totalSec}s / 180s max</span>}
                  {!canExtend && <span style={{ color:"#ef4444" }}> · MAX DURATION REACHED</span>}
                </div>
                {canExtend && (
                  <>
                    <input onMouseDown={e=>e.stopPropagation()}
                      placeholder="Optional prompt to guide the extension…"
                      value={extPrompt} onChange={e=>setExtPrompt(e.target.value)}
                      style={{ ...mkInp(th), width:"100%", marginBottom:6, fontSize:7 }}/>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={runExtend}
                      disabled={extStatus==="creating"||extStatus==="polling"}
                      style={{ width:"100%", border:`1px solid #f59e0b44`, background:"#f59e0b18",
                        color:"#f59e0b", borderRadius:4, padding:"6px 10px", fontSize:8, fontWeight:700,
                        fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.1em",
                        cursor:(extStatus==="creating"||extStatus==="polling")?"not-allowed":"pointer",
                        opacity:(extStatus==="creating"||extStatus==="polling")?0.6:1,
                        display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      {extStatus==="idle"    && <><span>+5s</span> EXTEND VIDEO · 20 credits</>}
                      {extStatus==="creating"&& <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> SUBMITTING…</>}
                      {extStatus==="polling" && <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> EXTENDING…</>}
                      {extStatus==="done"    && <><span>✓</span> EXTENDED — EXTEND AGAIN?</>}
                      {extStatus==="failed"  && <><span>↺</span> RETRY EXTENSION</>}
                    </button>
                  </>
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

// ─── IMAGE NODE ───────────────────────────────────────────────────────────────
function ImageCard({ node, upd, onDel, sel: selected, linkedShot, linkedScene, onUnlinkShot, onStartWire, nodePos, globalBible, onSaveToBible, onInspect }) {
  const th = useTheme();
  const inp = mkInp(th); const sel = mkSel(th); const lbl = mkLbl(th); const fBase = mkFBase(th);
  const ac = th.dark ? "#a3e635" : th.t2;
  const shotAc = "#38bdf8";
  const [busy, setBusy] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [savingToBible, setSavingToBible] = useState(false);
  const fileRef = useRef(null);

  // Aspect ratio → CSS aspectRatio value map
  const arCss = { "1:1":"1/1", "16:9":"16/9", "9:16":"9/16", "4:3":"4/3", "3:2":"3/2" };
  const currentAr = node.aspect_ratio || "1:1";
  const activeVisualStyle = resolveVisualStyle(linkedShot, linkedScene);

  // Merge entity bible: shot (highest) → scene only.
  // Global bible is NOT auto-injected — it pollutes unconnected nodes.
  // Entries appear only when inherited from a wired shot or scene.
  const sceneBible = linkedScene?.bible || [];
  const shotBible  = linkedShot?.bible  || [];
  const allBible = [
    ...shotBible,
    ...sceneBible.filter(s=>!shotBible.find(b=>b.tag===s.tag)),
  ];

  // When first linked to a shot, auto-seed the prompt with the compiled shot text
  useEffect(() => {
    if (linkedShot && !node.prompt?.trim() && linkedShot.compiledText) {
      upd({ prompt: linkedShot.compiledText });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedShot?.id]);

  const gen = async () => {
    if(!node.prompt.trim())return;
    setBusy(true);
    try{
      const refs = allBible.map(e => bibleToRef(e, activeVisualStyle)).filter(Boolean);
      let fullPrompt = node.prompt;
      if (refs.length > 0) {
        const refDesc = refs.map(r=>`${r.tag} (${r.kind}: ${r.name})`).join(", ");
        fullPrompt = `VISUAL REFERENCE IMAGES PROVIDED — maintain exact appearance of: ${refDesc}.\n\n${node.prompt}`;
      }
      fullPrompt = applyVisualStylePrompt(fullPrompt, resolveVisualStyle(linkedShot, linkedScene), "image");
      const u = await aiImage(fullPrompt, refs, node.aspect_ratio||"1:1", node.resolution||"1K");
      upd({generatedUrl:u});
    }
    catch(e){alert(`🍌 ${e.message}`);}
    finally{setBusy(false);}
  };

  const refine = async () => {
    if(!refinePrompt.trim() || !node.generatedUrl) return;
    setBusy(true);
    try {
      const [header, data] = node.generatedUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
      const refs = [{ mimeType, data, tag:"current", name:"Current Image", kind:"reference" }];
      const styledRefinePrompt = applyVisualStylePrompt(`Modify this image: ${refinePrompt}`, resolveVisualStyle(linkedShot, linkedScene), "image");
      const u = await aiImage(styledRefinePrompt, refs, node.aspect_ratio||"1:1", node.resolution||"1K");
      upd({generatedUrl:u});
      setRefinePrompt("");
    }
    catch(e){alert(`🍌 ${e.message}`);}
    finally{setBusy(false);}
  };

  const downloadImage = () => {
    if(!node.generatedUrl) return;
    const a = document.createElement("a");
    a.href = node.generatedUrl;
    a.download = `image_${node.id}.png`;
    a.click();
  };

  const handleRefFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => upd({ generatedUrl: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isLinked = !!linkedShot || !!node.sceneId;

  return (
    <div data-nodeid={node.id} data-nodetype={T.IMAGE} style={{ position:"relative", width:220 }}>
      {/* INPUT PORT — left side */}
      <div style={{ position:"absolute", left:-4, top:48, width:8, height:8, background:th.card, border:`1.5px solid ${isLinked ? (linkedShot ? shotAc : ac) : th.b0}`, borderRadius:"50%", zIndex:10, pointerEvents:"none" }}/>
      {/* OUTPUT PORT — right side, drag to wire as Veo start/end frame */}
      {node.generatedUrl && (
        <div
          onMouseDown={e=>{e.preventDefault();e.stopPropagation();if(onStartWire&&nodePos)onStartWire(node.id,T.IMAGE,nodePos.x+220,nodePos.y+50);}}
          title="Drag to Veo (start/end frame or ref) or Kling (image reference)"
          style={{ position:"absolute", right:-4, top:48, width:8, height:8, background:th.dark?ac:th.t1, borderRadius:"50%", cursor:"crosshair", zIndex:10, transition:"transform 0.15s" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.5)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
        />
      )}
      <div style={{ width:220, background:th.card, border:`1px solid ${selected ? ac : th.b0}`, borderRadius:16, overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}` }}>
        {/* HEADER */}
        <div style={{ background:th.dark?`linear-gradient(90deg,${ac}10,transparent)`:th.card, padding:"10px 12px 6px", borderBottom:`1px solid ${th.dark?ac+"18":"transparent"}`, display:"flex", alignItems:"center", gap:7 }}>
          <Ico icon={ImageIcon} size={11} color={ac}/>
          <span style={{ fontSize:7, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>IMAGE NODE</span>
          {linkedShot && (
            <div style={{ display:"flex",alignItems:"center",gap:4,background:th.card2,border:`1px solid ${shotAc}44`,borderRadius:3,padding:"2px 6px",marginLeft:4 }}>
              <div style={{ width:5,height:5,background:shotAc,borderRadius:"50%" }}/>
              <span style={{ fontSize:6,color:shotAc,letterSpacing:"0.08em",maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                #{linkedShot.index} {linkedShot.how?.slice(0,15)||"shot"}
              </span>
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onUnlinkShot&&onUnlinkShot();}}
                style={{ background:"transparent",border:"none",color:th.t3,cursor:"pointer",fontSize:8,padding:"0 1px",lineHeight:1,marginLeft:2 }} title="Unlink shot">✕</button>
            </div>
          )}
          <div style={{ marginLeft:"auto" }} />
          {onInspect && <InspectAction onClick={onInspect} th={th} />}
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDel();}}
            style={{ background:"transparent",border:"none",color:th.t3,cursor:"pointer",fontSize:11,padding:"0 2px",lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:9, display:"flex", flexDirection:"column", gap:7 }}>

          {/* ENTITY REFERENCES */}
          {allBible.length > 0 && (
            <div style={{ background:th.card, border:`1px solid ${ac}11`, borderRadius:3, padding:"5px 7px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em" }}>ENTITY REFERENCES</span>
                <span style={{ fontSize:6, color:allBible.some(e=>resolveEntryImage(e, activeVisualStyle))?ac:"#7f3d3d", letterSpacing:"0.08em" }}>
                  {allBible.filter(e=>resolveEntryImage(e, activeVisualStyle)).length}/{allBible.length} IM REF
                </span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                {allBible.map(e=>(
                  <div key={e.id} style={{ display:"flex",alignItems:"center",gap:3,background:resolveEntryImage(e, activeVisualStyle)?th.card2:th.card3,border:`1px solid ${resolveEntryImage(e, activeVisualStyle)?ac+"33":"#7f3d3d44"}`,borderRadius:10,padding:"2px 6px" }}>
                    {resolveEntryImage(e, activeVisualStyle)
                      ?<img src={resolveEntryImage(e, activeVisualStyle)} alt="" style={{ width:14,height:14,borderRadius:"50%",objectFit:"cover",border:`1px solid ${ac}55` }}/>
                      :<Ico icon={AlertTriangle} size={8} color="#7f3d3d"/>}
                    <span style={{ fontSize:6, color:resolveEntryImage(e, activeVisualStyle)?ac:"#7f3d3d", letterSpacing:"0.06em" }}>{e.tag}</span>
                    <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.04em" }}>{e.name}</span>
                  </div>
                ))}
              </div>
              {allBible.some(e=>!resolveEntryImage(e, activeVisualStyle)) && (
                <div style={{ fontSize:6, color:"#7f3d3d", marginTop:4, letterSpacing:"0.06em" }}>⚠ entities without image ref won't be visually preserved</div>
              )}
            </div>
          )}

          {/* PROMPT */}
          <textarea onMouseDown={e=>e.stopPropagation()} rows={3}
            style={{ ...fBase,fontSize:8,padding:"5px 7px",resize:"none",width:"100%",boxSizing:"border-box" }}
            placeholder={linkedShot?"Shot prompt auto-filled — edit as needed…":"Enter prompt here…"}
            value={node.prompt} onChange={e=>upd({prompt:e.target.value})}
            onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();gen();}}} />

          {/* IMAGE PREVIEW — click empty area to load image from disk */}
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleRefFile}/>
          <div
            onMouseDown={e=>e.stopPropagation()}
            onClick={e=>{e.stopPropagation();if(!node.generatedUrl&&!busy)fileRef.current?.click();}}
            style={{ position:"relative", width:"100%", aspectRatio:arCss[currentAr]||"1/1", background:th.card2, border:`1px dashed ${node.generatedUrl?ac+"22":ac+"44"}`, borderRadius:4, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", cursor:node.generatedUrl||busy?"default":"pointer" }}>
            {busy
              ?<div style={{ textAlign:"center" }}><Ico icon={Loader2} size={28} color={th.t3} style={{animation:"spin 0.7s linear infinite"}}/><div style={{ fontSize:7,color:th.t3,marginTop:5,letterSpacing:"0.1em" }}>GENERATING…</div></div>
              :node.generatedUrl
                ?<img src={node.generatedUrl} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                :<div style={{ textAlign:"center",color:th.t3,pointerEvents:"none" }}>
                  <Ico icon={ImageIcon} size={22} color={th.t3}/>
                  <div style={{ fontSize:7,marginTop:4,letterSpacing:"0.08em" }}>EMPTY NODE</div>
                  <div style={{ fontSize:6,marginTop:2,color:th.t3,opacity:0.6 }}>click to load image</div>
                </div>
            }
            {/* Download overlay */}
            {node.generatedUrl && !busy && (
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();downloadImage();}}
                title="Download image"
                style={{ position:"absolute",bottom:5,right:5,background:th.dark?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.82)",border:`1px solid ${th.b0}`,borderRadius:4,padding:"3px 6px",cursor:"pointer",display:"flex",alignItems:"center",gap:3,backdropFilter:"blur(4px)" }}>
                <Ico icon={Download} size={9} color={th.dark?ac:th.t2}/>
              </button>
            )}
          </div>

          {/* ASPECT RATIO + RESOLUTION — above Generate */}
          <div style={{ display:"flex", gap:5 }}>
            <div style={{ flex:1.5 }}>
              <label style={{ ...lbl, fontSize:6 }}>ASPECT RATIO</label>
              <select onMouseDown={e=>e.stopPropagation()} value={currentAr} onChange={e=>upd({aspect_ratio:e.target.value})}
                style={{ ...sel, fontSize:8, padding:"3px 5px" }}>
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Portrait</option>
                <option value="4:3">4:3 Standard</option>
                <option value="3:2">3:2 Photo</option>
              </select>
            </div>
            <div style={{ flex:0.8 }}>
              <label style={{ ...lbl, fontSize:6 }}>RESOLUTION</label>
              <select onMouseDown={e=>e.stopPropagation()} value={node.resolution||"1K"} onChange={e=>upd({resolution:e.target.value})}
                style={{ ...sel, fontSize:8, padding:"3px 5px" }}>
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
            </div>
          </div>

          {/* GENERATE BUTTON — solid black */}
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();gen();}} disabled={busy}
            style={{ width:"100%",background:busy?th.card4:"#0a0a0a",border:busy?"none":`1px solid ${th.dark?"#333":"#222"}`,color:busy?th.t3:"#ffffff",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:700,fontSize:8,padding:"8px",borderRadius:6,cursor:busy?"not-allowed":"pointer",letterSpacing:"0.15em",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
            {busy?<><Ico icon={Loader2} size={9} style={{animation:"spin 0.7s linear infinite"}}/> GENERATING…</>:<><Ico icon={Sparkles} size={9} color="#ffffff"/> GENERATE</>}
          </button>

          {/* REFINE CARD — only shown once an image exists */}
          {node.generatedUrl && (
            <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:7 }}>
              <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.15em", display:"block", marginBottom:5 }}>REFINE</span>
              <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                <input onMouseDown={e=>e.stopPropagation()} type="text"
                  style={{ ...fBase,flex:1,fontSize:8,padding:"5px 7px" }}
                  placeholder="e.g. Make it more cinematic…"
                  value={refinePrompt} onChange={e=>setRefinePrompt(e.target.value)}
                  onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter"){e.preventDefault();refine();}}}/>
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();refine();}}
                  disabled={busy||!refinePrompt.trim()}
                  style={{ background:ac,border:"none",color:th.dark?"#000":"#fff",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:700,fontSize:9,padding:"5px 9px",borderRadius:4,cursor:(busy||!refinePrompt.trim())?"not-allowed":"pointer",opacity:(busy||!refinePrompt.trim())?0.45:1,flexShrink:0 }}>
                  ▶
                </button>
              </div>
            </div>
          )}

          {/* SAVE TO BIBLE — bridge generated image into a bible entity reference */}
          {node.generatedUrl && onSaveToBible && (
            <div style={{ borderTop:`1px solid ${th.b0}`, paddingTop:7 }}>
              {!savingToBible ? (
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setSavingToBible(true);}}
                  style={{ width:"100%", background:"transparent", border:`1px solid ${th.b0}`, borderRadius:5,
                    color:th.t2, fontFamily:"'Inter',system-ui,sans-serif", fontSize:8, fontWeight:600,
                    padding:"7px", cursor:"pointer", letterSpacing:"0.1em", display:"flex", alignItems:"center",
                    justifyContent:"center", gap:5, transition:"all 0.12s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=ac;e.currentTarget.style.color=ac;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=th.b0;e.currentTarget.style.color=th.t2;}}>
                  <BookOpen size={9}/> SAVE AS BIBLE REF
                </button>
              ) : (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                    <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em" }}>SAVE TO WHICH ENTRY?</span>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setSavingToBible(false);}}
                      style={{ background:"transparent",border:"none",color:th.t3,cursor:"pointer",fontSize:9,lineHeight:1 }}>✕</button>
                  </div>
                  {(globalBible||[]).length === 0 && (
                    <div style={{ fontSize:7, color:th.t3, textAlign:"center", padding:"8px 0" }}>No bible entries yet — add entities to a Scene node first.</div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    {(globalBible||[]).map(e=>(
                      <button key={e.id} onMouseDown={ev=>ev.stopPropagation()}
                        onClick={ev=>{ev.stopPropagation();onSaveToBible(e.id,node.generatedUrl,activeVisualStyle);setSavingToBible(false);}}
                        style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 7px",
                          background:th.card2, border:`1px solid ${th.b0}`, borderRadius:4,
                          cursor:"pointer", textAlign:"left", transition:"border-color 0.1s" }}
                        onMouseEnter={ev=>{ev.currentTarget.style.borderColor=ac;}}
                        onMouseLeave={ev=>{ev.currentTarget.style.borderColor=th.b0;}}>
                        <div style={{ width:20,height:20,borderRadius:3,overflow:"hidden",flexShrink:0,
                          background:th.card3,border:`1px solid ${th.b0}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {resolveEntryImage(e, activeVisualStyle)
                            ?<img src={resolveEntryImage(e, activeVisualStyle)} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                            :<KindIcon kind={e.kind} size={11}/>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:8, color:ac, fontWeight:700, letterSpacing:"0.06em" }}>{e.tag}</div>
                          <div style={{ fontSize:7, color:th.t2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.name}</div>
                        </div>
                        {resolveEntryImage(e, activeVisualStyle) && <span style={{ fontSize:6, color:ac }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── LLM NODE ─────────────────────────────────────────────────────────────────
function LlmCard({ node, upd, onDel, sel: selected, allNodes, onUpdateNode, onInspect }) {
  const th = useTheme();
  const ac = th.dark ? "#6366f1" : th.t2;
  const selColor = selected ? ac : th.dark ? `${ac}44` : th.b0;

  // ── Resolve connected nodes (merge legacy targetNodeId + new targetNodeIds array) ──
  const rawIds = node.targetNodeIds || (node.targetNodeId ? [node.targetNodeId] : []);
  const targetNodes = rawIds.map(id => allNodes.find(n => n.id === id)).filter(Boolean);
  const hasNodes = targetNodes.length > 0;

  // Mode: "edit" = single-node targeted edit | "coherence" = multi-node coherence check
  const mode = node.llmMode || "edit";

  // In edit mode, which node is the active edit target (local selection)
  const [activeEditId, setActiveEditId] = useState(null);
  const editTarget = targetNodes.find(n => n.id === activeEditId) || targetNodes[0] || null;

  const [status, setStatus]   = useState("idle");
  const [preview, setPreview] = useState(null);       // edit mode: patch object
  const [multiPrev, setMultiPrev] = useState(null);   // coherence mode: { nodeId: patch }
  const [error, setError]     = useState("");

  const NODE_COLOR = { scene:"#f87171", shot:"#38bdf8", image:"#a3e635", kling:"#f97316", veo:"#a855f7", script:"#fb923c" };

  const getNodeContent = (n) => {
    if (!n) return {};
    if (n.type === T.SHOT)  return { how:n.how, where:n.where, when:n.when, cameraSize:n.cameraSize, cameraAngle:n.cameraAngle, cameraMovement:n.cameraMovement, lighting:n.lighting, lens:n.lens, visualGoal:n.visualGoal, visualStyle:n.visualStyle, durationSec:n.durationSec, sourceAnchor:n.sourceAnchor, dialogue:n.dialogue };
    if (n.type === T.SCENE) return { sceneText:n.sceneText, cinematicStyle:n.cinematicStyle, visualStyle:n.visualStyle };
    if (n.type === T.IMAGE) return { prompt:n.prompt };
    if (n.type === T.KLING || n.type === T.VEO) return { manualPrompt:n.manualPrompt };
    return {};
  };

  const removeNode = (id) => {
    const newIds = rawIds.filter(i => i !== id);
    upd({ targetNodeIds: newIds, targetNodeId: newIds[newIds.length - 1] || null });
    if (activeEditId === id) setActiveEditId(null);
  };

  // ── EDIT MODE: run command on single target ──
  const runEdit = async () => {
    if (!node.command?.trim() || !editTarget) return;
    setStatus("running"); setError(""); setPreview(null);
    try {
      if (targetNodes.length > 1) {
        const patches = await Promise.all(targetNodes.map(async target => ([
          target.id,
          await aiLlm(node.command, target.type, getNodeContent(target)),
        ])));
        const filtered = Object.fromEntries(patches.filter(([, patch]) => patch && Object.keys(patch).length > 0));
        setMultiPrev(filtered);
        setStatus("preview");
        return;
      }
      const patch = await aiLlm(node.command, editTarget.type, getNodeContent(editTarget));
      setPreview(patch); setStatus("preview");
    } catch(e) { setStatus("failed"); setError(e.message); }
  };
  const syncShotPatch = (target, patch) => {
    if (target?.type !== T.SHOT) return patch;
    const merged = { ...target, ...patch, promptOverride: false };
    return { ...patch, promptOverride: false, compiledText: compileShotText(merged) };
  };
  const applyEdit = () => {
    if (multiPrev && Object.keys(multiPrev).length > 0) {
      Object.entries(multiPrev).forEach(([nid, patch]) => {
        const target = targetNodes.find(n => n.id === nid);
        if (target) onUpdateNode(nid, syncShotPatch(target, patch));
      });
      upd({ lastResult: multiPrev });
      setStatus("applied"); setMultiPrev(null); setPreview(null);
      return;
    }
    if (!preview || !editTarget) return;
    let finalPatch = preview;
    finalPatch = syncShotPatch(editTarget, preview);
    onUpdateNode(editTarget.id, finalPatch);
    upd({ lastResult: finalPatch });
    setStatus("applied"); setPreview(null);
  };

  // ── COHERENCE MODE: run on all nodes ──
  const runCoherence = async () => {
    if (targetNodes.length === 0) return;
    setStatus("running"); setError(""); setMultiPrev(null);
    try {
      const patches = await aiCoherenceCheck(targetNodes, node.command);
      // Filter to only patches that have actual changes
      const filtered = Object.fromEntries(Object.entries(patches).filter(([, v]) => Object.keys(v).length > 0));
      setMultiPrev(filtered); setStatus("preview");
    } catch(e) { setStatus("failed"); setError(e.message); }
  };
  // Helper: recompile compiledText for SHOT patches before applying
  const withRecompile = (nid, patch) => {
    const target = targetNodes.find(n => n.id === nid);
    return syncShotPatch(target, patch);
  };

  const applyAllCoherence = () => {
    if (!multiPrev) return;
    let count = 0;
    Object.entries(multiPrev).forEach(([nid, patch]) => {
      if (Object.keys(patch).length > 0) { onUpdateNode(nid, withRecompile(nid, patch)); count++; }
    });
    upd({ lastResult: multiPrev });
    setStatus("applied"); setMultiPrev(null);
  };
  const applySingleCoherence = (nid, patch) => {
    onUpdateNode(nid, withRecompile(nid, patch));
    const remaining = Object.fromEntries(Object.entries(multiPrev).filter(([k]) => k !== nid));
    setMultiPrev(Object.keys(remaining).length ? remaining : null);
    if (Object.keys(remaining).length === 0) setStatus("applied");
  };

  const discard = () => { setStatus("idle"); setPreview(null); setMultiPrev(null); };

  const canRun = hasNodes && (mode === "coherence" || editTarget) &&
    (mode === "coherence" || node.command?.trim());
  const isRunning = status === "running";

  return (
    <div data-nodeid={node.id} data-nodetype={T.LLM} style={{ position:"relative", width:270 }}>
      {/* INPUT PORT */}
      <div style={{ position:"absolute", left:-4, top:48, width:8, height:8,
        background:th.card, border:`1.5px solid ${hasNodes ? ac : th.b0}`, borderRadius:"50%",
        zIndex:10, pointerEvents:"none" }}/>

      <div style={{ width:270, background:th.card, border:`1px solid ${selColor}`, borderRadius:16, overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}` }}>

        {/* Header */}
        <div style={{ background: th.dark ? `linear-gradient(90deg,${ac}18,transparent)` : th.card, padding:"10px 12px 6px", display:"flex", alignItems:"center", gap:6, borderBottom:`1px solid ${th.dark ? ac+"22" : "transparent"}` }}>
          <Ico icon={Bot} size={11} color={ac}/>
          <span style={{ fontSize:7, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>AI NODE</span>
          <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.08em", marginLeft:2 }}>
            {targetNodes.length > 0 ? `${targetNodes.length} node${targetNodes.length>1?"s":""} connected` : "no nodes"}
          </span>
          <div style={{ marginLeft:"auto" }} />
          {onInspect && <InspectAction onClick={onInspect} th={th} />}
          <button onMouseDown={e=>e.stopPropagation()} onClick={onDel}
            style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px", lineHeight:1 }} title="Delete node">✕</button>
        </div>

        <div style={{ padding:"8px 10px", display:"flex", flexDirection:"column", gap:6 }}>

          {/* Mode toggle */}
          <div style={{ display:"flex", gap:3 }}>
            {[["edit","✏ EDIT"],["coherence","⚡ COHERENCE"]].map(([m, label]) => (
              <button key={m} onMouseDown={e=>e.stopPropagation()}
                onClick={()=>{ upd({llmMode:m}); setStatus("idle"); setPreview(null); setMultiPrev(null); }}
                style={{ flex:1, fontSize:6, fontWeight:700, letterSpacing:"0.1em", padding:"4px 6px", borderRadius:3,
                  border:`1px solid ${mode===m ? ac+"88" : th.b0}`,
                  background: mode===m ? `${ac}22` : "transparent",
                  color: mode===m ? ac : th.t3, cursor:"pointer",
                  fontFamily:"'Inter',system-ui,sans-serif" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Connected nodes list */}
          {targetNodes.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <span style={{ fontSize:5, color:th.t3, letterSpacing:"0.15em" }}>CONNECTED NODES</span>
              {targetNodes.map((n) => {
                const nc = NODE_COLOR[n.type] || ac;
                const isActive = mode==="edit" && editTarget?.id === n.id;
                const preview_ = n.type===T.SHOT ? n.how||"(empty shot)" :
                  n.type===T.SCENE ? (n.sceneText||"(empty scene)").slice(0,40)+"…" :
                  n.type===T.IMAGE ? (n.prompt||"(empty)").slice(0,35) :
                  (n.manualPrompt||"(empty)").slice(0,35);
                return (
                  <div key={n.id}
                    onMouseDown={e=>e.stopPropagation()}
                    onClick={mode==="edit" ? ()=>setActiveEditId(n.id) : undefined}
                    style={{ display:"flex", alignItems:"center", gap:5, background: isActive ? `${nc}18` : th.bg,
                      border:`1px solid ${isActive ? nc+"66" : nc+"22"}`,
                      borderRadius:3, padding:"3px 6px",
                      cursor: mode==="edit" ? "pointer" : "default",
                      transition:"border-color 0.1s" }}>
                    <div style={{ width:4, height:4, background:nc, borderRadius:"50%", flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:5, color:nc, letterSpacing:"0.1em", fontWeight:700 }}>{n.type.toUpperCase()}</span>
                      {n.type===T.SHOT && !n.sourceAnchor?.trim() && (
                        <span style={{ fontSize:5, color:"#fbbf24", marginLeft:4 }}>⚠ no anchor</span>
                      )}
                      <div style={{ fontSize:5, color:th.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {preview_}
                      </div>
                    </div>
                    {mode==="edit" && isActive && <span style={{ fontSize:5, color:nc }}>●</span>}
                    <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();removeNode(n.id);}}
                      style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:8, padding:"0 2px", lineHeight:1, flexShrink:0 }}>✕</button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background:th.bg, border:`1px dashed ${th.b0}`, borderRadius:4, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:6, color:th.t3, letterSpacing:"0.1em" }}>WIRE NODES → HERE</div>
              <div style={{ fontSize:5, color:th.t4, marginTop:2 }}>connect scenes, shots, images — any combination</div>
            </div>
          )}

          {/* EDIT mode: show active target hint */}
          {mode==="edit" && targetNodes.length > 1 && (
            <div style={{ fontSize:5, color:th.t3, letterSpacing:"0.06em", textAlign:"center" }}>
              {editTarget ? `Editing: ${editTarget.type.toUpperCase()} — click a node above to switch` : "Click a node above to select edit target"}
            </div>
          )}

          {/* COHERENCE mode: explain what it does */}
          {mode==="coherence" && targetNodes.length > 0 && status === "idle" && (
            <div style={{ fontSize:5, color:th.t3, lineHeight:1.6, letterSpacing:"0.04em", background:th.bg, borderRadius:3, padding:"5px 7px" }}>
              AI will check all {targetNodes.length} node{targetNodes.length>1?"s":""} together: fill missing sourceAnchors, fix incoherent fields, add visualGoals.
              {targetNodes.filter(n=>n.type===T.SHOT && !n.sourceAnchor?.trim()).length > 0 && (
                <span style={{ color:"#fbbf24" }}> {targetNodes.filter(n=>n.type===T.SHOT && !n.sourceAnchor?.trim()).length} shot{targetNodes.filter(n=>n.type===T.SHOT && !n.sourceAnchor?.trim()).length>1?"s":""} missing source anchor.</span>
              )}
            </div>
          )}

          {/* Command textarea */}
          <div>
            <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.15em", display:"block", marginBottom:2 }}>
              {mode==="coherence" ? "EXTRA INSTRUCTIONS (optional)" : "COMMAND"}
            </span>
            <textarea onMouseDown={e=>e.stopPropagation()} rows={mode==="coherence" ? 2 : 3}
              style={{ background:th.bg, border:`1px solid ${node.command?.trim() ? ac+"44" : th.b0}`, color:th.t0, fontFamily:"'Inter',system-ui,sans-serif", fontSize:7, padding:"5px 7px", resize:"none", width:"100%", boxSizing:"border-box", borderRadius:3, outline:"none" }}
              placeholder={mode==="coherence"
                ? `Optional: "focus on the throne room scene" or "prioritize dialogue shots"…`
                : `E.g. "make this shot more dramatic" or "shorten to 3s"…`}
              value={node.command||""} onChange={e=>upd({command:e.target.value})} />
          </div>

          {/* ── EDIT MODE PREVIEW ── */}
          {mode==="edit" && status==="preview" && preview && (
            <div style={{ background:th.bg, border:`1px solid ${ac}44`, borderRadius:4, padding:"6px 8px" }}>
              <div style={{ fontSize:6, color:ac, letterSpacing:"0.1em", marginBottom:4 }}>PREVIEW — {editTarget?.type?.toUpperCase()}</div>
              {Object.entries(preview).map(([k, v]) => (
                <div key={k} style={{ display:"flex", gap:6, marginBottom:3, alignItems:"flex-start" }}>
                  <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.06em", flexShrink:0, minWidth:70 }}>{k}</span>
                  <span style={{ fontSize:6, color:th.t0, lineHeight:1.5, wordBreak:"break-word" }}>{String(v)}</span>
                </div>
              ))}
              <div style={{ display:"flex", gap:4, marginTop:6 }}>
                <button onMouseDown={e=>e.stopPropagation()} onClick={applyEdit}
                  style={{ flex:1, background:`${ac}cc`, border:"none", color:"#fff", fontFamily:"'Inter',system-ui,sans-serif", fontWeight:700, fontSize:7, padding:"6px", borderRadius:3, cursor:"pointer", letterSpacing:"0.1em" }}>APPLY</button>
                <button onMouseDown={e=>e.stopPropagation()} onClick={discard}
                  style={{ flex:1, background:"transparent", border:`1px solid ${th.b1}`, color:th.t2, fontFamily:"'Inter',system-ui,sans-serif", fontSize:7, padding:"6px", borderRadius:3, cursor:"pointer", letterSpacing:"0.1em" }}>DISCARD</button>
              </div>
            </div>
          )}

          {/* ── COHERENCE MODE PREVIEW ── */}
          {(mode==="coherence" || mode==="edit") && status==="preview" && multiPrev && (
            <div style={{ background:th.bg, border:`1px solid ${ac}44`, borderRadius:4, padding:"6px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:6, color:ac, letterSpacing:"0.1em" }}>COHERENCE REPORT — {Object.keys(multiPrev).length} node{Object.keys(multiPrev).length>1?"s":""} to fix</span>
                <button onMouseDown={e=>e.stopPropagation()} onClick={mode==="coherence" ? applyAllCoherence : applyEdit}
                  style={{ fontSize:6, fontWeight:700, letterSpacing:"0.1em", padding:"3px 8px", borderRadius:2, border:`1px solid ${ac}88`, background:`${ac}22`, color:ac, cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif" }}>
                  APPLY ALL
                </button>
              </div>
              {Object.entries(multiPrev).map(([nid, patch]) => {
                const n = allNodes.find(x => x.id === nid);
                const nc = NODE_COLOR[n?.type] || ac;
                return (
                  <div key={nid} style={{ marginBottom:5, borderLeft:`2px solid ${nc}55`, paddingLeft:6 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ fontSize:5, color:nc, letterSpacing:"0.1em", fontWeight:700 }}>
                        {n?.type?.toUpperCase()} {n?.type===T.SHOT ? `#${n.index||""}` : ""}
                      </span>
                      {mode==="coherence" && (
                        <button onMouseDown={e=>e.stopPropagation()} onClick={()=>applySingleCoherence(nid, patch)}
                          style={{ fontSize:5, padding:"2px 6px", borderRadius:2, border:`1px solid ${nc}55`, background:`${nc}18`, color:nc, cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em" }}>
                          APPLY
                        </button>
                      )}
                    </div>
                    {Object.entries(patch).map(([k, v]) => (
                      <div key={k} style={{ display:"flex", gap:5, marginBottom:2, alignItems:"flex-start" }}>
                        <span style={{ fontSize:5, color:th.t3, letterSpacing:"0.06em", flexShrink:0, minWidth:65 }}>{k}</span>
                        <span style={{ fontSize:5, color:th.t0, lineHeight:1.5, wordBreak:"break-word", fontStyle: k==="sourceAnchor"?"italic":"normal" }}>
                          {k==="sourceAnchor" ? `"${v}"` : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
              <button onMouseDown={e=>e.stopPropagation()} onClick={discard}
                style={{ width:"100%", marginTop:3, background:"transparent", border:`1px solid ${th.b1}`, color:th.t3, fontFamily:"'Inter',system-ui,sans-serif", fontSize:6, padding:"4px", borderRadius:3, cursor:"pointer", letterSpacing:"0.1em" }}>DISCARD ALL</button>
            </div>
          )}

          {/* Status messages */}
          {status==="applied" && (
            <div style={{ fontSize:6, color:"#a3e635", letterSpacing:"0.1em", textAlign:"center" }}>✓ APPLIED — run again to refine</div>
          )}
          {status==="failed" && error && (
            <div style={{ fontSize:6, color:"#f87171", letterSpacing:"0.06em", lineHeight:1.5 }}>
              <Ico icon={AlertTriangle} size={7} color="#f87171"/> {error}
            </div>
          )}

          {/* Run button */}
          <button onMouseDown={e=>e.stopPropagation()}
            onClick={mode==="coherence" ? runCoherence : runEdit}
            disabled={isRunning || !canRun}
            style={{ width:"100%",
              background: (isRunning||!canRun) ? th.card4 : `linear-gradient(90deg,${ac}cc,${ac}88)`,
              border:"none",
              color: (isRunning||!canRun) ? th.t3 : "#fff",
              fontFamily:"'Inter',system-ui,sans-serif", fontWeight:700, fontSize:8,
              padding:"8px", borderRadius:3,
              cursor: (isRunning||!canRun) ? "not-allowed" : "pointer",
              letterSpacing:"0.15em", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            {isRunning
              ? <><Ico icon={Loader2} size={9} style={{animation:"spin 0.7s linear infinite"}}/> THINKING…</>
              : mode==="coherence"
                ? <><Ico icon={Sparkles} size={9}/> CHECK COHERENCE</>
                : <><Ico icon={Sparkles} size={9}/> RUN</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VIDEO EDIT NODE ──────────────────────────────────────────────────────────
// ─── BEAT DETECTION ─────────────────────────────────────────────────────────
// Pure-JS onset detection via Web Audio API — no external library needed.
// Downsamples to ~4410 Hz before analysis so a 3-min track runs in <300ms.
function detectBeats(audioBuffer) {
  // Downsample factor: analyze at 1/10th sample rate (4410 Hz from 44100)
  const factor     = 10;
  const raw        = audioBuffer.getChannelData(0);
  const srcRate    = audioBuffer.sampleRate;
  const targetRate = srcRate / factor;

  // Build downsampled RMS envelope (one value per ~2.3ms window)
  const winSize  = Math.max(2, Math.round(targetRate * 0.023)); // ~23ms window
  const hopSize  = Math.max(1, Math.round(winSize / 2));
  const energies = [];
  const totalDownsampled = Math.floor(raw.length / factor);
  for (let i = 0; i + winSize * factor < raw.length; i += hopSize * factor) {
    let sum = 0;
    for (let j = 0; j < winSize; j++) {
      const s = raw[i + j * factor] || 0;
      sum += s * s;
    }
    energies.push(Math.sqrt(sum / winSize));
  }

  if (energies.length < 4) return { bpm: null, beats: [] };

  // Local average energy over ~1s window (for adaptive threshold)
  const localWin = Math.max(2, Math.round(targetRate / hopSize));
  const beats    = [];

  for (let i = localWin; i < energies.length - localWin; i++) {
    let localSum = 0;
    for (let k = i - localWin; k < i + localWin; k++) localSum += energies[k];
    const localAvg = localSum / (localWin * 2);

    // Beat: energy spike > 1.35× local avg AND local peak
    if (
      energies[i] > localAvg * 1.35 &&
      energies[i] > energies[i - 1] &&
      energies[i] > energies[i + 1]
    ) {
      const t = (i * hopSize * factor) / srcRate;
      // Debounce: minimum 300ms between beats
      if (beats.length === 0 || t - beats[beats.length - 1] > 0.3) {
        beats.push(parseFloat(t.toFixed(3)));
      }
    }
  }

  if (beats.length < 2) return { bpm: null, beats };

  // BPM from median inter-beat interval
  const ibi = beats.slice(1).map((t, i) => t - beats[i]).sort((a, b) => a - b);
  const med = ibi[Math.floor(ibi.length / 2)];
  const bpm = Math.round(Math.max(40, Math.min(220, 60 / med)));

  return { bpm, beats };
}

// ─── CLIP NODE ────────────────────────────────────────────────────────────────
function ClipCard({ node, upd, onDel, sel: selected, onStartWire, nodePos, onInspect }) {
  const th      = useTheme();
  const ac      = "#3b82f6";   // blue accent
  const fileRef = useRef(null);
  const videoRef= useRef(null);
  const [dragging, setDragging] = useState(false);
  const [playState,setPlayState]= useState("stopped");

  const processFile = (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    const blobUrl = URL.createObjectURL(file);
    const tmp = document.createElement("video");
    tmp.preload = "metadata";
    tmp.src = blobUrl;
    tmp.addEventListener("loadedmetadata", async () => {
      const dur = isFinite(tmp.duration) && tmp.duration > 0 ? parseFloat(tmp.duration.toFixed(2)) : 0;
      // Store blob URL for local preview immediately; mark as uploading to server
      upd({ videoUrl: blobUrl, fileName: file.name, duration: dur, serverVideoUrl: null, uploading: true });
      try {
        const fd = new FormData();
        fd.append("file", file, file.name);
        const r = await fetch("/api/assets/upload/videos", { method: "POST", headers: await authHeaders(), body: fd });
        const j = await r.json();
        upd({ serverVideoUrl: j.url || null, uploading: false });
      } catch(_) {
        upd({ uploading: false });
      }
    }, { once: true });
  };

  const handleFilePick = (e) => { processFile(e.target.files?.[0]); e.target.value = ""; };
  const handleDrop     = (e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files?.[0]); };
  const fmtTime = (s) => { const m=Math.floor(s/60); const ss=Math.floor(s%60); return `${m}:${String(ss).padStart(2,"0")}`; };
  const portY = 44;

  return (
    <div data-nodeid={node.id} data-nodetype={T.CLIP} style={{ position:"relative", width:260 }}>
      {/* Output port — wire to VideoEdit, Kling (continuity), or Audio (video-to-music) */}
      <div
        onMouseDown={e=>{ e.preventDefault(); e.stopPropagation(); if(onStartWire&&nodePos) onStartWire(node.id, T.CLIP, nodePos.x+260, nodePos.y+portY); }}
        title="Wire to VideoEdit, Kling continuity, or Audio node"
        style={{ position:"absolute", right:-4, top:portY, width:8, height:8,
          background: node.videoUrl ? ac : th.card,
          border:`1.5px solid ${node.videoUrl ? ac : th.b0}`,
          borderRadius:"50%", zIndex:10, cursor:"crosshair",
          transition:"transform 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.5)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
      />

      <div style={{ width:260, background:th.card, border:`1px solid ${selected ? ac : th.b0}`,
        borderRadius:16, overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif",
        boxShadow:`0 4px 24px ${th.sh}` }}>

        {/* Header */}
        <div style={{ padding:"10px 12px 6px", borderBottom:`1px solid ${th.b0}`,
          display:"flex", alignItems:"center", gap:7 }}>
          <Ico icon={Film} size={11} color={ac}/>
          <span style={{ fontSize:7, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>CLIP</span>
          {node.duration > 0 && (
            <span style={{ fontSize:6, color:th.t3, marginLeft:4 }}>{fmtTime(node.duration)}</span>
          )}
          {node.uploading && (
            <span style={{ fontSize:6, color:"#f59e0b", marginLeft:4, animation:"blink 1s ease infinite" }}>↑ uploading…</span>
          )}
          {node.serverVideoUrl && !node.uploading && (
            <span style={{ fontSize:6, color:ac, marginLeft:4 }}>✓ server</span>
          )}
          <div style={{ flex:1 }}/>
          {onInspect && <InspectAction onClick={onInspect} th={th} />}
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDel();}}
            style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:11, padding:"0 2px", lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:10, display:"flex", flexDirection:"column", gap:8 }}>

          {/* Drop zone / preview */}
          {node.videoUrl ? (
            <div style={{ borderRadius:6, overflow:"hidden", border:`1px solid ${ac}33`, background:"#000" }}>
              <video ref={videoRef} src={node.videoUrl} controls
                style={{ width:"100%", display:"block", maxHeight:130 }}
                onPlay={()=>setPlayState("playing")} onPause={()=>setPlayState("paused")} onEnded={()=>setPlayState("stopped")}
              />
              <div style={{ padding:"4px 8px", background:th.bg, display:"flex", alignItems:"center", gap:5 }}>
                <Ico icon={Film} size={8} color={ac}/>
                <span style={{ fontSize:6, color:th.t2, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {node.fileName}
                </span>
                <button onMouseDown={e=>e.stopPropagation()} onClick={()=>fileRef.current?.click()}
                  style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:7, padding:"0 3px" }}
                  title="Replace">↺</button>
                <button onMouseDown={e=>e.stopPropagation()} onClick={()=>upd({videoUrl:null,fileName:null,duration:0})}
                  style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px" }}>✕</button>
              </div>
            </div>
          ) : (
            <div
              onDragEnter={e=>{e.preventDefault();setDragging(true);}}
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={handleDrop}
              onClick={()=>fileRef.current?.click()}
              style={{ border:`1.5px dashed ${dragging?ac:th.b0}`, borderRadius:8, padding:"20px 8px",
                textAlign:"center", cursor:"pointer", transition:"border-color 0.15s",
                background: dragging ? `${ac}0f` : th.card2 }}>
              <Ico icon={Upload} size={18} color={dragging ? ac : th.t3}/>
              <div style={{ fontSize:8, color:th.t3, letterSpacing:"0.1em", marginTop:6 }}>DROP VIDEO HERE</div>
              <div style={{ fontSize:7, color:th.t4, marginTop:3 }}>MP4 · MOV · WEBM</div>
            </div>
          )}

          <input ref={fileRef} type="file" accept="video/*" style={{ display:"none" }} onChange={handleFilePick}/>

          {/* Wire hint */}
          <div style={{ fontSize:6.5, color:th.t4, lineHeight:1.6 }}>
            Wire to <span style={{ color:ac }}>VIDEO EDIT</span> to use as a clip, or to <span style={{ color:"#10b981" }}>AUDIO</span> for video-to-music.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AUDIO TRACK CARD ────────────────────────────────────────────────────────
const MUSIC_STYLE_TAGS = [
  { label:"CINEMATIC", value:"cinematic" },
  { label:"DARK",      value:"dark" },
  { label:"TENSE",     value:"tense" },
  { label:"EPIC",      value:"epic" },
  { label:"DRAMATIC",  value:"dramatic" },
  { label:"NOIR",      value:"noir" },
  { label:"SCI-FI",    value:"sci-fi" },
  { label:"AMBIENT",   value:"ambient" },
  { label:"ORCHESTRAL",value:"orchestral" },
  { label:"ELECTRONIC",value:"electronic" },
  { label:"UPBEAT",    value:"upbeat" },
  { label:"COMEDY",    value:"comedy" },
];

function AudioTrackCard({ node, upd, onDel, sel: selected, onStartWire, nodePos, allNodes, onInspect }) {
  const th         = useTheme();
  const ac         = "#10b981";   // emerald green accent
  const fileRef    = useRef(null);
  const audioRef   = useRef(null);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [playState,   setPlayState]   = useState("stopped");
  const [err,         setErr]         = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [mode,        setMode]        = useState("upload");   // "upload" | "generate"
  const [genPrompt,   setGenPrompt]   = useState("");
  const [genTags,     setGenTags]     = useState([]);
  const [genDuration, setGenDuration] = useState(30);
  const [generating,  setGenerating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [savedUrl,    setSavedUrl]    = useState(null);    // server URL after save-to-assets
  const [vidDesc,     setVidDesc]     = useState("");
  const [vidTags,     setVidTags]     = useState([]);
  const [vidDuration, setVidDuration] = useState(30);
  const [vidLoops,    setVidLoops]    = useState(1);
  const [genFromVid,  setGenFromVid]  = useState(false);

  // Resolve wired video node
  // For CLIP nodes: prefer serverVideoUrl (server-accessible) over blob URL
  const videoNode = node.videoNodeId ? (allNodes||[]).find(n => n.id === node.videoNodeId) : null;
  const videoUrl  = videoNode
    ? (videoNode.serverVideoUrl || videoNode.videoUrl || null)
    : null;

  const processFile = async (file) => {
    if (!file || !file.type.startsWith("audio/")) { setErr("Drop an audio file (MP3 or WAV)"); return; }
    setErr(null);
    setAnalyzing(true);
    const url = URL.createObjectURL(file);
    // Immediately show filename
    upd({ audioUrl: url, fileName: file.name, bpm: null, beats: [], duration: 0, musicAnalysis: null, snapEnabled: node.snapEnabled ?? true });
    try {
      const arrBuf  = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      const decoded = await audioCtx.decodeAudioData(arrBuf);
      audioCtx.close();
      const { bpm, beats } = detectBeats(decoded);
      const musicAnalysis = analyzeAudioStructure(decoded, node.preferredSections || "auto");
      upd({ audioUrl: url, fileName: file.name, bpm, beats, duration: parseFloat(decoded.duration.toFixed(2)), musicAnalysis, snapEnabled: node.snapEnabled ?? true });
    } catch(e) {
      setErr("Could not analyze audio: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFilePick = (e) => { processFile(e.target.files?.[0]); e.target.value = ""; };
  const handleDrop     = (e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files?.[0]); };

  const generateMusic = async () => {
    if (generating) return;
    if (!genPrompt.trim() && genTags.length === 0) { setErr("Add a prompt or pick at least one style tag"); return; }
    setErr(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/elevenlabs/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: genPrompt.trim(), tags: genTags, duration: genDuration }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      // Response is binary audio — decode and run beat detection
      const arrBuf   = await res.arrayBuffer();
      const blob     = new Blob([arrBuf], { type: res.headers.get("content-type") || "audio/mpeg" });
      const url      = URL.createObjectURL(blob);
      const fileName = `elevenlabs_${genTags.join("-") || "music"}_${genDuration}s.mp3`;
      setSavedUrl(null);
      upd({ audioUrl: url, fileName, bpm: null, beats: [], duration: 0, musicAnalysis: null, snapEnabled: node.snapEnabled ?? true });
      setAnalyzing(true);
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
        const decoded  = await audioCtx.decodeAudioData(arrBuf.slice(0));
        audioCtx.close();
        const { bpm, beats } = detectBeats(decoded);
        const musicAnalysis = analyzeAudioStructure(decoded, node.preferredSections || "auto");
        upd({ audioUrl: url, fileName, bpm, beats, duration: parseFloat(decoded.duration.toFixed(2)), musicAnalysis, snapEnabled: node.snapEnabled ?? true });
      } finally {
        setAnalyzing(false);
      }
    } catch(e) {
      setErr("Generation failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTag    = (v) => setGenTags(prev => prev.includes(v) ? prev.filter(t=>t!==v) : [...prev, v]);
  const toggleVidTag = (v) => setVidTags(prev => prev.includes(v) ? prev.filter(t=>t!==v) : [...prev, v]);

  const generateFromVideo = async () => {
    if (genFromVid || !videoUrl) return;
    setErr(null); setGenFromVid(true);
    try {
      const res = await fetch("/api/elevenlabs/video-to-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, description: vidDesc.trim(), tags: vidTags }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const arrBuf = await res.arrayBuffer();
      const blob   = new Blob([arrBuf], { type: res.headers.get("content-type") || "audio/mpeg" });
      const url    = URL.createObjectURL(blob);
      const fileName = `elevenlabs_video_${vidTags.join("-") || "music"}_${Math.round(videoNode?.duration||0)}s.mp3`;
      setSavedUrl(null);
      upd({ audioUrl: url, fileName, bpm: null, beats: [], duration: 0, musicAnalysis: null, snapEnabled: node.snapEnabled ?? true });
      setAnalyzing(true);
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
        const decoded  = await audioCtx.decodeAudioData(arrBuf.slice(0));
        audioCtx.close();
        const { bpm, beats } = detectBeats(decoded);
        const musicAnalysis = analyzeAudioStructure(decoded, node.preferredSections || "auto");
        upd({ audioUrl: url, fileName, bpm, beats, duration: parseFloat(decoded.duration.toFixed(2)), musicAnalysis, snapEnabled: node.snapEnabled ?? true });
      } finally { setAnalyzing(false); }
    } catch(e) {
      setErr("Video-to-music failed: " + e.message);
    } finally {
      setGenFromVid(false);
    }
  };

  const handleDownload = () => {
    if (!node.audioUrl) return;
    const a = document.createElement("a");
    a.href = node.audioUrl;
    a.download = node.fileName || "audio.mp3";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const saveToAssets = async () => {
    if (!node.audioUrl || saving) return;
    setSaving(true); setErr(null);
    try {
      const r      = await fetch(node.audioUrl);
      const blob   = await r.blob();
      const form   = new FormData();
      form.append("file", blob, node.fileName || "audio.mp3");
      const res    = await fetch("/api/assets/upload/audio", { method:"POST", headers: await authHeaders(), body:form });
      if (!res.ok) throw new Error(await res.text());
      const data   = await res.json();
      setSavedUrl(data.url);
      upd({ audioUrl: data.url, fileName: data.name });
    } catch(e) {
      setErr("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePlay  = () => { if (audioRef.current) { audioRef.current.currentTime=0; audioRef.current.play(); setPlayState("playing"); } };
  const handleStop  = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime=0; } setPlayState("stopped"); };
  const handlePause = () => { if (audioRef.current) { audioRef.current.pause(); } setPlayState("paused"); };

  const fmtTime = (s) => { const m=Math.floor(s/60); const ss=Math.floor(s%60); return `${m}:${String(ss).padStart(2,"0")}`; };

  const portY = 44;

  return (
    <div data-nodeid={node.id} data-nodetype={T.AUDIO} style={{ position:"relative", width:280 }}>
      {/* Input port (left) — receives wires from Kling/Veo for video-to-music */}
      <div style={{ position:"absolute", left:-4, top:portY, width:8, height:8,
        background: th.card, border:`1.5px solid ${videoNode ? ac : th.b0}`,
        borderRadius:"50%", zIndex:10, pointerEvents:"none" }}/>
      {/* Output port (right) — wire into VideoEdit */}
      <div
        onMouseDown={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); onStartWire(node.id, T.AUDIO, nodePos.x + 280, nodePos.y + portY); }}
        style={{ position:"absolute", right:-4, top:portY, width:8, height:8,
          background: node.beats?.length > 0 ? ac : th.card,
          border:`1.5px solid ${node.beats?.length > 0 ? ac : th.b0}`,
          borderRadius:"50%", zIndex:10, cursor:"crosshair" }}
        title="Wire to VideoEdit node to enable beat sync"
      />

      <div style={{ width:280, background:th.card, border:`1px solid ${selected ? ac : th.b0}`, borderRadius:16,
        overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}` }}>

        {/* HEADER */}
        <div style={{ padding:"10px 12px 6px", borderBottom:`1px solid ${th.b0}`,
          display:"flex", alignItems:"center", gap:7 }}>
          <Ico icon={Music} size={11} color={ac}/>
          <span style={{ fontSize:7, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>AUDIO TRACK</span>
          {node.bpm && (
            <span style={{ fontSize:6, color:th.t3, marginLeft:4 }}>
              {node.bpm} BPM · {node.beats?.length || 0} beats · {fmtTime(node.duration)}
            </span>
          )}
          <div style={{ flex:1 }}/>
          {onInspect && <InspectAction onClick={onInspect} th={th} />}
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDel();}}
            style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:11, padding:"0 2px", lineHeight:1 }}>✕</button>
        </div>

        {/* BODY */}
        <div style={{ padding:10, display:"flex", flexDirection:"column", gap:8 }}>

          {/* Mode toggle */}
          <div style={{ display:"flex", gap:3 }}>
            {[["upload","↑ UPLOAD"],["generate","✦ GENERATE"],["video","🎬 FROM VIDEO"]].map(([m,lbl]) => (
              <button key={m} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setMode(m);setErr(null);}}
                style={{ flex:1, padding:"5px 0", fontSize:6, fontWeight:700, letterSpacing:"0.08em",
                  fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer", borderRadius:5,
                  border:`1px solid ${mode===m ? ac : th.b0}`,
                  background: mode===m ? `${ac}22` : "transparent",
                  color: mode===m ? ac : th.t3 }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* GENERATE panel */}
          {mode === "generate" && (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              <textarea
                onMouseDown={e=>e.stopPropagation()}
                value={genPrompt}
                onChange={e=>setGenPrompt(e.target.value)}
                placeholder="Describe the mood… e.g. a dark orchestral thriller theme with rising tension"
                rows={3}
                style={{ background:th.card2, border:`1px solid ${th.b0}`, color:th.t0,
                  fontFamily:"'Inter',system-ui,sans-serif", fontSize:8, borderRadius:6,
                  padding:"7px 9px", resize:"none", outline:"none", lineHeight:1.6 }}
              />
              {/* Duration */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", whiteSpace:"nowrap" }}>DURATION</span>
                <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                  {[[30,"30s"],[60,"1min"],[90,"1:30"],[120,"2min"],[180,"3min"],[300,"5min"]].map(([val,lbl]) => (
                    <button key={val} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setGenDuration(val);}}
                      style={{ padding:"3px 7px", fontSize:6, fontWeight:700, letterSpacing:"0.08em",
                        fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer", borderRadius:4,
                        border:`1px solid ${genDuration===val ? ac : th.b0}`,
                        background: genDuration===val ? `${ac}22` : "transparent",
                        color: genDuration===val ? ac : th.t3 }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style tag chips */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {MUSIC_STYLE_TAGS.map(t => (
                  <button key={t.value} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();toggleTag(t.value);}}
                    style={{ padding:"3px 7px", fontSize:6, fontWeight:700, letterSpacing:"0.1em",
                      fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer", borderRadius:4,
                      border:`1px solid ${genTags.includes(t.value) ? ac : th.b0}`,
                      background: genTags.includes(t.value) ? `${ac}22` : "transparent",
                      color: genTags.includes(t.value) ? ac : th.t3 }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();generateMusic();}}
                disabled={generating || analyzing}
                style={{ width:"100%", padding:"7px 0", fontSize:8, fontWeight:700, letterSpacing:"0.12em",
                  fontFamily:"'Inter',system-ui,sans-serif", cursor:(generating||analyzing)?"default":"pointer",
                  borderRadius:5, border:`1px solid ${ac}44`,
                  background: `${ac}15`, color: ac,
                  opacity:(generating||analyzing)?0.5:1,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                {generating
                  ? <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> GENERATING…</>
                  : analyzing
                    ? <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> ANALYZING BEATS…</>
                    : <><span>✦</span> GENERATE WITH ELEVENLABS</>}
              </button>
            </div>
          )}

          {/* FROM VIDEO panel */}
          {mode === "video" && (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {/* Wired video status */}
              {videoNode ? (
                <div style={{ background:th.card2, border:`1px solid ${ac}33`, borderRadius:6, padding:"7px 9px", display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontSize:9 }}>{videoNode.type === T.KLING ? "🎬" : "🎥"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:6, color:ac, letterSpacing:"0.1em", marginBottom:1 }}>
                    {videoNode.type === T.KLING ? "KLING" : videoNode.type === T.CLIP ? "CLIP" : "VEO"} NODE WIRED
                  </div>
                    <div style={{ fontSize:6, color: videoUrl ? th.t2 : videoNode.uploading ? "#f59e0b" : "#f87171" }}>
                      {videoNode.uploading
                        ? "↑ uploading to server…"
                        : videoUrl
                          ? "✓ video ready — will be analyzed"
                          : "⚠ no video yet — generate or upload first"}
                    </div>
                  </div>
                  <button onMouseDown={e=>e.stopPropagation()} onClick={()=>upd({videoNodeId:null})}
                    style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:9, padding:"0 2px" }}>✕</button>
                </div>
              ) : (
                <div style={{ border:`1.5px dashed ${th.b0}`, borderRadius:6, padding:"12px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:8, color:th.t3, letterSpacing:"0.08em", marginBottom:3 }}>🎬 Wire a Kling, Veo, or Clip node here</div>
                  <div style={{ fontSize:7, color:th.t4 }}>drag from video node output port → Audio left input port</div>
                </div>
              )}
              {/* Duration info — auto-matches video */}
              {videoNode?.duration > 0 && (
                <div style={{ background:`${ac}0f`, border:`1px solid ${ac}22`, borderRadius:5, padding:"5px 9px", display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:9 }}>⏱</span>
                  <span style={{ fontSize:6, color:th.t1 }}>
                    Will generate <strong>{Math.round(videoNode.duration)}s</strong> of music — matches your video exactly
                  </span>
                </div>
              )}
              {/* Description */}
              <textarea
                onMouseDown={e=>e.stopPropagation()}
                value={vidDesc}
                onChange={e=>setVidDesc(e.target.value)}
                placeholder="Describe the music mood — e.g. 'dark cinematic tension', 'uplifting adventure', 'slow emotional piano'"
                rows={2}
                style={{ background:th.card2, border:`1px solid ${th.b0}`, color:th.t0,
                  fontFamily:"'Inter',system-ui,sans-serif", fontSize:8, borderRadius:6,
                  padding:"7px 9px", resize:"none", outline:"none", lineHeight:1.6 }}
              />
              {/* Style tag chips */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {MUSIC_STYLE_TAGS.map(t => (
                  <button key={t.value} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();toggleVidTag(t.value);}}
                    style={{ padding:"3px 7px", fontSize:6, fontWeight:700, letterSpacing:"0.1em",
                      fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer", borderRadius:4,
                      border:`1px solid ${vidTags.includes(t.value) ? ac : th.b0}`,
                      background: vidTags.includes(t.value) ? `${ac}22` : "transparent",
                      color: vidTags.includes(t.value) ? ac : th.t3 }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();generateFromVideo();}}
                disabled={genFromVid || analyzing || !videoUrl || videoNode?.uploading}
                style={{ width:"100%", padding:"7px 0", fontSize:8, fontWeight:700, letterSpacing:"0.12em",
                  fontFamily:"'Inter',system-ui,sans-serif", cursor:(genFromVid||analyzing||!videoUrl||videoNode?.uploading)?"default":"pointer",
                  borderRadius:5, border:`1px solid ${ac}44`, background:`${ac}15`, color:ac,
                  opacity:(genFromVid||analyzing||!videoUrl||videoNode?.uploading)?0.5:1,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                {genFromVid
                  ? <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> ANALYZING VIDEO…</>
                  : analyzing
                    ? <><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> ANALYZING BEATS…</>
                    : videoNode?.uploading
                      ? <><span style={{ animation:"blink 1s ease infinite", display:"inline-block" }}>↑</span> UPLOADING CLIP…</>
                      : !videoUrl
                        ? "WIRE A VIDEO NODE FIRST"
                        : <><span>🎬</span> GENERATE FROM VIDEO</>}
              </button>
            </div>
          )}

          {/* UPLOAD Drop zone */}
          {mode === "upload" && <div
            onDragEnter={e=>{e.preventDefault();setDragging(true);}}
            onDragOver={e=>{e.preventDefault();setDragging(true);}}
            onDragLeave={e=>{setDragging(false);}}
            onDrop={handleDrop}
            onClick={()=>fileRef.current?.click()}
            style={{ border:`1.5px dashed ${dragging?ac:th.b0}`, borderRadius:8, padding:"12px 8px",
              textAlign:"center", cursor:"pointer", transition:"border-color 0.15s",
              background: dragging ? `${ac}0f` : th.card2 }}>
            <input ref={fileRef} type="file" accept="audio/*" style={{ display:"none" }} onChange={handleFilePick}/>
            {analyzing ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <Ico icon={Loader2} size={16} color={ac} style={{ animation:"spin 1s linear infinite" }}/>
                <span style={{ fontSize:8, color:th.t3, letterSpacing:"0.1em" }}>ANALYZING BEATS…</span>
              </div>
            ) : node.fileName ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <Ico icon={Music} size={14} color={ac}/>
                <span style={{ fontSize:8, color:th.t1, fontWeight:700, letterSpacing:"0.06em",
                  maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {node.fileName}
                </span>
                {node.bpm ? (
                  <div style={{ display:"flex", gap:10, marginTop:2 }}>
                    <span style={{ fontSize:9, color:ac, fontWeight:700 }}>{node.bpm} BPM</span>
                    <span style={{ fontSize:8, color:th.t3 }}>{node.beats?.length} beats detected</span>
                  </div>
                ) : (
                  <span style={{ fontSize:7, color:th.t4 }}>No beats detected</span>
                )}
                <span style={{ fontSize:7, color:th.t4, marginTop:1 }}>Click to replace</span>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <Ico icon={Upload} size={14} color={th.t3}/>
                <span style={{ fontSize:8, color:th.t3, letterSpacing:"0.1em" }}>DROP MP3 / WAV HERE</span>
                <span style={{ fontSize:7, color:th.t4 }}>or click to browse</span>
              </div>
            )}
          </div>}

          {err && (
            <div style={{ fontSize:7, color:"#f87171", background:"#f8717114", borderRadius:4, padding:"5px 8px" }}>{err}</div>
          )}

          {/* Beat waveform visualizer — shows beat grid as tick marks */}
          {node.beats?.length > 0 && node.duration > 0 && (
            <div style={{ position:"relative", height:28, background:th.card2, borderRadius:4,
              border:`1px solid ${th.b0}`, overflow:"hidden" }}>
              {/* Full bar */}
              <div style={{ position:"absolute", inset:0, background:`${ac}08` }}/>
              {/* Beat ticks */}
              {node.beats.map((t, i) => (
                <div key={i} style={{
                  position:"absolute", left:`${(t/node.duration)*100}%`,
                  top:0, bottom:0, width:1.5,
                  background: i%4===0 ? `${ac}cc` : `${ac}55`
                }}/>
              ))}
              <span style={{ position:"absolute", left:4, top:"50%", transform:"translateY(-50%)",
                fontSize:6, color:ac, letterSpacing:"0.1em", fontWeight:700, pointerEvents:"none" }}>
                BEAT GRID
              </span>
            </div>
          )}

          {/* Playback controls */}
          {node.audioUrl && (
            <>
              <audio ref={audioRef} src={node.audioUrl} onEnded={()=>setPlayState("stopped")} style={{ display:"none" }}/>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {playState==="playing" ? (
                  <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();handlePause();}}
                    style={{ border:"none", borderRadius:5, background:"#374151", color:"#fff",
                      fontSize:8, fontWeight:700, padding:"5px 11px", cursor:"pointer",
                      fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.1em" }}>⏸ PAUSE</button>
                ) : playState==="paused" ? (
                  <>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();audioRef.current?.play();setPlayState("playing");}}
                      style={{ border:"none", borderRadius:5, background:"#0a0a0a", color:"#fff",
                        fontSize:8, fontWeight:700, padding:"5px 11px", cursor:"pointer",
                        fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.1em" }}>▶ RESUME</button>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();handleStop();}}
                      style={{ border:`1px solid #374151`, borderRadius:5, background:"transparent", color:th.t2,
                        fontSize:8, fontWeight:700, padding:"5px 11px", cursor:"pointer",
                        fontFamily:"'Inter',system-ui,sans-serif" }}>⏹</button>
                  </>
                ) : (
                  <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();handlePlay();}}
                    style={{ border:"none", borderRadius:5, background:"#0a0a0a", color:"#fff",
                      fontSize:8, fontWeight:700, padding:"5px 11px", cursor:"pointer",
                      fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.1em" }}>▶ PREVIEW</button>
                )}
                <div style={{ flex:1 }}/>
                {/* Snap toggle */}
                <button onMouseDown={e=>e.stopPropagation()}
                  onClick={e=>{e.stopPropagation();upd({snapEnabled:!node.snapEnabled});}}
                  title="Toggle beat-snap for linked VideoEdit node"
                  style={{ border:`1px solid ${node.snapEnabled?ac:th.b0}`, borderRadius:5,
                    background: node.snapEnabled?`${ac}22`:"transparent",
                    color: node.snapEnabled?ac:th.t3, fontSize:7, fontWeight:700,
                    padding:"5px 8px", cursor:"pointer", letterSpacing:"0.1em",
                    fontFamily:"'Inter',system-ui,sans-serif" }}>
                  {node.snapEnabled ? "♩ SNAP ON" : "♩ SNAP OFF"}
                </button>
              </div>
            </>
          )}

          {/* Download + Save to Assets */}
          {node.audioUrl && (
            <div style={{ display:"flex", gap:4 }}>
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();handleDownload();}}
                style={{ flex:1, padding:"5px 0", fontSize:7, fontWeight:700, letterSpacing:"0.1em",
                  fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer", borderRadius:5,
                  border:`1px solid ${th.b0}`, background:"transparent", color:th.t2,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                ↓ DOWNLOAD
              </button>
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();saveToAssets();}}
                disabled={saving || !!savedUrl}
                style={{ flex:1, padding:"5px 0", fontSize:7, fontWeight:700, letterSpacing:"0.1em",
                  fontFamily:"'Inter',system-ui,sans-serif", cursor:(saving||savedUrl)?"default":"pointer",
                  borderRadius:5, border:`1px solid ${savedUrl ? ac : th.b0}`,
                  background: savedUrl ? `${ac}22` : "transparent",
                  color: savedUrl ? ac : th.t2, opacity: saving ? 0.5 : 1,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                {saving ? "SAVING…" : savedUrl ? "✓ SAVED" : "☁ SAVE TO ASSETS"}
              </button>
            </div>
          )}

          {/* Wire hint */}
          <div style={{ fontSize:6.5, color:th.t4, lineHeight:1.6 }}>
            Wire this node into a <span style={{ color:ac }}>VIDEO EDIT</span> node to snap cut points to the beat grid.
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoEditCard({ node, upd, onDel, sel: selected, allNodes, audioNode, onInspect, onOpenFullscreen, isFullscreen }) {
  const th = useTheme();
  const ac = th.dark ? "#e2e8f0" : "#0f172a";
  const beatAc = "#10b981"; // same as AudioTrackCard accent

  // ── Beat-snap: snap every clip boundary to the nearest beat ─────────────────
  const snapToBeat = () => {
    if (!audioNode?.beats?.length || !clips.length) return;
    const beats  = audioNode.beats;
    const snapT  = (t) => {
      let best = beats[0], bestDist = Math.abs(beats[0] - t);
      for (const b of beats) { const d = Math.abs(b - t); if (d < bestDist) { best = b; bestDist = d; } }
      return best;
    };
    // Rebuild trims so each clip's trimmed duration ends exactly on a beat
    const newTrims = { ...(node.trims || {}) };
    let cursor = 0;
    clips.forEach(c => {
      const baseDur  = getBaseDur(c);
      const idealEnd = snapT(cursor + getClipDur(c)); // snap end boundary
      const trimEnd  = Math.max(0, baseDur - (idealEnd - cursor) - (newTrims[c.id]?.start || 0));
      newTrims[c.id] = { start: newTrims[c.id]?.start || 0, end: parseFloat(Math.max(0, trimEnd).toFixed(3)) };
      cursor = idealEnd;
    });
    upd({ trims: newTrims });
  };

  const CLIP_COL = { [T.VEO]: "#a855f7", [T.KLING]: "#f97316", [T.CLIP]: "#3b82f6", upload: "#3b82f6" };
  const clipCol  = (n) => CLIP_COL[n?.type] || "#64748b";

  // Merge wired clips + locally-uploaded clips, respecting clipOrder if set
  const wiredClips    = (node.videoNodeIds || []).map(id => allNodes.find(n => n.id === id)).filter(Boolean);
  const uploadedClips = (node.localClips || []);
  const allClipMap    = {};
  [...wiredClips, ...uploadedClips].forEach(c => { allClipMap[c.id] = c; });
  const clips = (node.clipOrder && node.clipOrder.length > 0)
    ? node.clipOrder.map(id => allClipMap[id]).filter(Boolean)
    : [...wiredClips, ...uploadedClips];

  const getBaseDur = (n) => {
    if (!n) return 0;
    if (n.type === "upload" || n.type === T.CLIP) return n.duration || 5;
    if (n.type === T.VEO) return n.duration || 8;
    if (n.type === T.KLING) {
      const total = (n.shotIds||[]).reduce((s, sid) => {
        const sh = allNodes.find(x => x.id === sid);
        return s + (sh?.durationSec || 3);
      }, 0);
      return Math.min(total, 15);
    }
    return 5;
  };

  const getClipDur = (n) => {
    const base = getBaseDur(n);
    const trim = node.trims?.[n.id] || {};
    return Math.max(0.5, base - (trim.start||0) - (trim.end||0));
  };

  const totalDur = clips.reduce((s, c) => s + getClipDur(c), 0);

  // "stopped" | "playing" | "paused"
  const [playState,    setPlayState]   = useState("stopped");
  const [exporting,    setExporting]   = useState(false);
  const [expanded,     setExpanded]    = useState(false);
  const [playheadTime, setPlayheadTime]= useState(0);

  const cardVRef      = useRef(null);   // single video element — always rendered
  const tuRef         = useRef(null);   // current timeupdate listener
  const clipOffRef    = useRef(0);
  const fileInputRef  = useRef(null);
  const audioTrackRef = useRef(null);   // soundtrack — synced with video timeline

  // Upload a local video file directly into the editor
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const tmp = document.createElement("video");
    tmp.preload = "metadata";
    tmp.src = url;
    tmp.addEventListener("loadedmetadata", () => {
      const dur  = isFinite(tmp.duration) && tmp.duration > 0 ? tmp.duration : 5;
      const id   = `upl_${uid()}`;
      const clip = { id, name: file.name, videoUrl: url, duration: dur, type: "upload" };
      const newLocal = [...(node.localClips || []), clip];
      const newOrder = [...clips.map(c => c.id), id];
      upd({ localClips: newLocal, clipOrder: newOrder });
    }, { once: true });
    // reset so the same file can be re-selected
    e.target.value = "";
  };

  const activeV = () => cardVRef.current;
  const getAudioMix = () => ({
    videoVolume: Math.max(0, Math.min(2, node.audioMix?.videoVolume ?? 1)),
    soundtrackVolume: Math.max(0, Math.min(2, node.audioMix?.soundtrackVolume ?? 1)),
  });
  const applyLiveVolumes = () => {
    const mix = getAudioMix();
    const v = cardVRef.current;
    const a = audioTrackRef.current;
    if (v) {
      v.muted = false;
      v.volume = Math.max(0, Math.min(1, mix.videoVolume / 2));
    }
    if (a) a.volume = Math.max(0, Math.min(1, mix.soundtrackVolume / 2));
  };

  useEffect(() => {
    applyLiveVolumes();
  }, [node.audioMix?.videoVolume, node.audioMix?.soundtrackVolume, audioNode?.audioUrl]);

  // Clean up any live timeupdate listener
  const clearTU = () => {
    if (tuRef.current) cardVRef.current?.removeEventListener("timeupdate", tuRef.current);
    tuRef.current = null;
  };

  // Soundtrack helpers — respect audioTrim.offset and audioTrim.start
  // timelineT = global timeline position (seconds)
  // audio file position = timelineT - offset + trimStart  (clamped, 0 if before offset)
  const audioFileT = (timelineT) => {
    const trim = getAudioTrim();
    const pos  = timelineT - (trim.offset||0) + (trim.start||0);
    return Math.max(0, pos);
  };
  const getAudioWindow = () => {
    const trim = getAudioTrim();
    const duration = audioNode?.duration || 0;
    const visibleDur = duration > 0 ? Math.max(0, duration - (trim.start||0) - (trim.end||0)) : 0;
    const start = trim.offset || 0;
    const end = start + visibleDur;
    const endTimeInFile = duration > 0 ? Math.max(trim.start || 0, duration - (trim.end || 0)) : (trim.start || 0);
    return { trim, duration, visibleDur, start, end, endTimeInFile };
  };
  const syncTrackToTimeline = (timelineT, shouldPlay) => {
    const a = audioTrackRef.current;
    if (!a) return;
    applyLiveVolumes();
    const { trim, visibleDur, start, end, endTimeInFile } = getAudioWindow();
    if (timelineT < start) {
      a.pause();
      a.currentTime = trim.start || 0;
      return;
    }
    if (visibleDur > 0 && timelineT >= end - 0.01) {
      a.pause();
      a.currentTime = endTimeInFile;
      return;
    }
    const nextTime = audioFileT(timelineT);
    if (!Number.isFinite(a.currentTime) || Math.abs(a.currentTime - nextTime) > 0.2) {
      a.currentTime = nextTime;
    }
    if (shouldPlay) {
      if (a.paused) a.play().catch(() => {});
    } else {
      a.pause();
    }
  };
  const trackPlay  = (timelineT = 0) => {
    syncTrackToTimeline(timelineT, true);
  };
  const trackPause = () => audioTrackRef.current?.pause();
  const trackStop  = () => {
    const a = audioTrackRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = getAudioTrim().start || 0;
  };
  const trackSeek  = (timelineT) => {
    syncTrackToTimeline(timelineT, false);
  };

  // Full stop — resets position
  const handleStop = () => {
    clearTU();
    cardVRef.current?.pause();
    trackStop();
    setPlayState("stopped");
    setPlayheadTime(0);
    clipOffRef.current = 0;
  };

  // Pause — keeps position
  const handlePause = () => {
    cardVRef.current?.pause();
    trackPause();
    setPlayState("paused");
  };

  // Resume from pause
  const handleResume = () => {
    applyLiveVolumes();
    cardVRef.current?.play().catch(() => {});
    trackSeek(playheadTime);
    trackPlay(playheadTime);
    setPlayState("playing");
  };

  // Sequential clip playback
  const playFrom = (idx) => {
    const clip = clips[idx];
    const v    = activeV();
    if (!clip || !v) { setPlayState("stopped"); trackStop(); return; }
    if (!clip.videoUrl) { clipOffRef.current += getClipDur(clip); playFrom(idx+1); return; }
    const trim    = node.trims?.[clip.id] || {};
    const startAt = trim.start || 0;
    const endAt   = getBaseDur(clip) - (trim.end || 0);
    const offset  = clipOffRef.current;
    v.src         = clip.videoUrl;
    v.currentTime = startAt;
    applyLiveVolumes();
    v.play().catch(() => {});
    const onTU = () => {
      const timelineT = offset + (v.currentTime - startAt);
      setPlayheadTime(timelineT);
      syncTrackToTimeline(timelineT, true);
      if (v.currentTime >= endAt - 0.15) {
        v.removeEventListener("timeupdate", onTU);
        tuRef.current = null;
        clipOffRef.current += getClipDur(clip);
        if (idx+1 < clips.length) playFrom(idx+1);
        else { setPlayState("stopped"); v.pause(); trackStop(); }
      }
    };
    if (tuRef.current) v.removeEventListener("timeupdate", tuRef.current);
    tuRef.current = onTU;
    v.addEventListener("timeupdate", onTU);
  };

  // Play from beginning
  const handlePlay = () => {
    clearTU();
    clipOffRef.current = 0;
    setPlayheadTime(0);
    setPlayState("playing");
    trackPlay(0);  // start soundtrack from the top in sync
    playFrom(0);
  };

  // Seek to a global timeline position (0…totalDur) — works while stopped, paused, or playing
  const seekTo = (t) => {
    if (!clips.length) return;
    const clampedT = Math.max(0, Math.min(t, totalDur));

    // Find which clip contains this global time
    let elapsed = 0, targetIdx = clips.length - 1;
    for (let i = 0; i < clips.length; i++) {
      const dur = getClipDur(clips[i]);
      if (clampedT < elapsed + dur) { targetIdx = i; break; }
      elapsed += dur;
    }

    clearTU();
    const clip    = clips[targetIdx];
    const trim    = node.trims?.[clip.id] || {};
    const seekT   = (trim.start || 0) + (clampedT - elapsed);
    const endAt   = getBaseDur(clip) - (trim.end || 0);

    clipOffRef.current = elapsed;
    setPlayheadTime(clampedT);

    // Seek soundtrack to the same global timeline position
    trackSeek(clampedT);

    const v = activeV();
    if (!v || !clip.videoUrl) return;

    applyLiveVolumes();
    const doSeek = () => { v.currentTime = seekT; };
    if (v.src !== clip.videoUrl) {
      v.src = clip.videoUrl;
      v.addEventListener("loadedmetadata", doSeek, { once: true });
    } else {
      doSeek();
    }

    if (playState === "playing") {
      v.play().catch(() => {});
      trackPlay(clampedT);
      const offset = elapsed;
      const onTU = () => {
        const timelineT = offset + (v.currentTime - (trim.start || 0));
        setPlayheadTime(timelineT);
        syncTrackToTimeline(timelineT, true);
        if (v.currentTime >= endAt - 0.15) {
          v.removeEventListener("timeupdate", onTU);
          tuRef.current = null;
          clipOffRef.current += getClipDur(clip);
          if (targetIdx + 1 < clips.length) playFrom(targetIdx + 1);
          else { setPlayState("stopped"); v.pause(); trackStop(); }
        }
      };
      tuRef.current = onTU;
      v.addEventListener("timeupdate", onTU);
    }
  };

  // Mouse-down on the timeline track area — click seeks, drag scrubs
  const startTimelineSeek = (e, pps) => {
    e.stopPropagation();
    const el = e.currentTarget;
    const getT = (clientX) => {
      const rect = el.getBoundingClientRect();
      return Math.max(0, Math.min((clientX - rect.left) / pps, totalDur));
    };
    seekTo(getT(e.clientX));
    const onMove = (ev) => seekTo(getT(ev.clientX));
    const onUp   = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  };

  // Trim drag
  const startTrim = (e, clipId, side) => {
    e.stopPropagation(); e.preventDefault();
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;
    const startX  = e.clientX;
    const baseDur = getBaseDur(clip);
    const trimNow = node.trims?.[clipId] || { start:0, end:0 };
    const initVal = side==='start' ? (trimNow.start||0) : (trimNow.end||0);
    const other   = side==='start' ? (trimNow.end||0)   : (trimNow.start||0);
    const pps     = expanded ? 40 : 20;
    const onMove  = (ev) => {
      const delta  = (ev.clientX - startX) / pps;
      const newVal = Math.max(0, Math.min(initVal + (side==='start'?delta:-delta), baseDur - other - 0.5));
      upd({ trims: { ...(node.trims||{}), [clipId]: { ...(node.trims?.[clipId]||{}), [side]: newVal } } });
    };
    const onUp = () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  };

  // Clip reorder drag — works on the unified clips array, writes clipOrder
  const startClipDrag = (e, clipId) => {
    e.stopPropagation(); e.preventDefault();
    const startX  = e.clientX;
    const origIdx = clips.findIndex(c => c.id === clipId);
    const pps     = expanded ? 40 : 20;
    let curIdx    = origIdx;
    const onMove  = (ev) => {
      const dx     = ev.clientX - startX;
      const clip   = clips.find(c => c.id === clipId);
      const clipW  = Math.max(20, getClipDur(clip||{}) * pps);
      const newIdx = Math.max(0, Math.min(clips.length - 1, origIdx + Math.round(dx / clipW)));
      if (newIdx !== curIdx) {
        curIdx = newIdx;
        const ids = clips.map(c => c.id);
        ids.splice(ids.indexOf(clipId), 1);
        ids.splice(newIdx, 0, clipId);
        upd({ clipOrder: ids });
      }
    };
    const onUp = () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  };

  // Export
  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const doExport = async (fmt) => {
    if (!clips.length) return;
    setExporting(true);
    try {
      let audioTrack = null;
      if (audioNode?.audioUrl) {
        if (/^blob:/i.test(audioNode.audioUrl)) {
          const audioBlob = await fetch(audioNode.audioUrl).then(r => {
            if (!r.ok) throw new Error("Failed to read linked audio node");
            return r.blob();
          });
          audioTrack = {
            dataUrl: await blobToDataUrl(audioBlob),
            fileName: audioNode.fileName || "audio-track",
            trim: getAudioTrim(),
            duration: audioNode.duration || 0,
          };
        } else {
          audioTrack = {
            url: audioNode.audioUrl,
            fileName: audioNode.fileName || "audio-track",
            trim: getAudioTrim(),
            duration: audioNode.duration || 0,
          };
        }
      }
      const clipData = clips.map(c => ({
        url:       c.videoUrl,
        trimStart: node.trims?.[c.id]?.start || 0,
        trimEnd:   node.trims?.[c.id]?.end   || 0,
        duration:  getBaseDur(c),
        nodeId:    c.id,
      }));
      const mix = getAudioMix();
      const r = await fetch("/api/videoedit/export", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ clips: clipData, format: fmt, audioTrack, mix }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(err.error || r.statusText);
      }
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `export_${fmt}_${Date.now()}.mp4`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch(e) { alert(`Export failed: ${e.message}`); }
    finally   { setExporting(false); }
  };

  const renderVolumeControls = (compact = false) => {
    const mix = getAudioMix();
    const sliderW = compact ? 74 : 112;
    const labelSize = compact ? 6 : 10;
    const valueSize = compact ? 6 : 10;
    const rowGap = compact ? 8 : 12;
    const control = (label, value, key) => (
      <div style={{ display:"flex", alignItems:"center", gap:compact ? 5 : 7 }}>
        <span style={{ fontSize:labelSize, color:th.t3, fontWeight:700, letterSpacing:"0.08em", minWidth:compact ? 44 : 64 }}>
          {label}
        </span>
        <input
          type="range"
          min="0"
          max="2"
          step="0.01"
          value={value}
          onChange={e => {
            const next = parseFloat(e.target.value);
            upd({ audioMix: { ...mix, [key]: next } });
          }}
          style={{ width:sliderW, accentColor:"#0a0a0a", cursor:"pointer" }}
        />
        <span style={{ fontSize:valueSize, color:th.t2, fontVariantNumeric:"tabular-nums", minWidth:compact ? 26 : 34 }}>
          {value.toFixed(2)}
        </span>
      </div>
    );
    return (
      <div style={{ display:"flex", alignItems:"center", gap:rowGap, flexWrap:"wrap" }}>
        {control("VIDEO VOL", mix.videoVolume, "videoVolume")}
        {audioNode?.audioUrl && control("AUDIO VOL", mix.soundtrackVolume, "soundtrackVolume")}
      </div>
    );
  };

  const removeClip = (id) => upd({
    videoNodeIds: (node.videoNodeIds||[]).filter(x => x !== id),
    localClips:   (node.localClips||[]).filter(c => c.id !== id),
    clipOrder:    (node.clipOrder||[]).filter(x => x !== id),
    lastSplitAction: null,
  });

  const canUndoSplit = !!node.lastSplitAction;
  const undoLastSplit = () => {
    const action = node.lastSplitAction;
    if (!action) return;
    upd({
      localClips: action.localClips || [],
      clipOrder: action.clipOrder || [],
      trims: action.trims || {},
      lastSplitAction: null,
    });
  };

  // Split the clip under the playhead into two clips at the playhead position.
  // Both halves stay in the timeline — first half ends at playhead, second starts there.
  const splitAtPlayhead = () => {
    if (!clips.length || totalDur === 0) return;
    let elapsed = 0;
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const dur  = getClipDur(clip);
      // Only split if playhead is meaningfully inside this clip (not at its very edges)
      if (playheadTime > elapsed + 0.05 && playheadTime < elapsed + dur - 0.05) {
        const trimNow      = node.trims?.[clip.id] || {};
        const baseDur      = getBaseDur(clip);
        const offsetInClip = playheadTime - elapsed;  // seconds into the trimmed clip

        // Raw video position of the cut point
        const cutRaw = (trimNow.start || 0) + offsetInClip;

        // First half: keep original start trim, new end trim cuts at cutRaw
        const firstTrim  = { start: trimNow.start || 0, end: Math.max(0, baseDur - cutRaw) };
        // Second half: new start trim begins at cutRaw, keep original end trim
        const secondTrim = { start: cutRaw, end: trimNow.end || 0 };

        const newId   = `spl_${uid()}`;
        const newClip = {
          id:       newId,
          name:     clip.name || clip.type || "clip",
          videoUrl: clip.videoUrl,
          duration: baseDur,
          type:     "upload",
        };

        // Build new order: insert second half right after the original
        const order = clips.map(c => c.id);
        order.splice(i + 1, 0, newId);

        const prevTrims = Object.fromEntries(
          Object.entries(node.trims || {}).map(([k, v]) => [k, { ...(v || {}) }])
        );
        const prevLocalClips = [...(node.localClips || [])];
        const prevClipOrder = (node.clipOrder && node.clipOrder.length > 0)
          ? [...node.clipOrder]
          : clips.map(c => c.id);

        upd({
          localClips: [...prevLocalClips, newClip],
          clipOrder:  order,
          trims:      { ...(node.trims || {}), [clip.id]: firstTrim, [newId]: secondTrim },
          lastSplitAction: {
            sourceClipId: clip.id,
            newClipId: newId,
            localClips: prevLocalClips,
            clipOrder: prevClipOrder,
            trims: prevTrims,
          },
        });
        break;
      }
      elapsed += dur;
    }
  };

  // ── RENDER HELPERS ──────────────────────────────────────────────────────────

  const renderRuler = (pps) => {
    const ticks = [];
    for (let i = 0; i * 0.5 <= totalDur + 1; i++) {
      const t     = i * 0.5;
      const x     = t * pps;
      const isSec = Math.abs(t % 1) < 0.001;
      ticks.push(
        <div key={i} style={{ position:"absolute", left:x, top:0, pointerEvents:"none" }}>
          <div style={{ width:1, height:isSec?9:4, background:isSec?th.t2:th.t4 }}/>
          {isSec && (
            <span style={{ position:"absolute", top:10, left:0, transform:"translateX(-50%)",
              fontSize:5.5, color:th.t3, whiteSpace:"nowrap" }}>{t}s</span>
          )}
        </div>
      );
    }
    return (
      <div style={{ position:"relative", height:22, marginBottom:3 }}>
        {ticks}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:th.b0 }}/>
      </div>
    );
  };

  const renderVideoClip = (c, i, pps) => {
    const col   = clipCol(c);
    const clipW = Math.max(28, getClipDur(c) * pps);
    return (
      <div key={c.id} onMouseDown={e => startClipDrag(e, c.id)}
        style={{ position:"relative", width:clipW, flexShrink:0, height:"100%",
          background:`${col}22`, border:`1.5px solid ${col}88`, borderRadius:4, overflow:"hidden", cursor:"grab" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:col }}/>
        <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)",
          fontSize:6.5, color:col, letterSpacing:"0.06em", fontWeight:700, zIndex:2,
          whiteSpace:"nowrap", overflow:"hidden", pointerEvents:"none" }}>
          {c.type==="upload"?(c.name||"CLIP").replace(/\.[^.]+$/,"").slice(0,8).toUpperCase():c.type===T.VEO?`VEO ${i+1}`:`KLING ${i+1}`}
        </span>
        {/* Start trim handle — drag to trim clip start */}
        <div onMouseDown={e => startTrim(e, c.id, 'start')}
          style={{ position:"absolute", left:0, top:0, bottom:0, width:14, cursor:"col-resize", zIndex:3,
            background:`linear-gradient(to right,${col}dd,transparent)`,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1 }}>
          <span style={{ fontSize:7, color:"#fff", opacity:0.9, lineHeight:1, pointerEvents:"none" }}>✂</span>
          <div style={{ width:1.5, height:"40%", background:"#fff", opacity:0.7, borderRadius:1 }}/>
        </div>
        {/* End trim handle — drag to trim clip end */}
        <div onMouseDown={e => startTrim(e, c.id, 'end')}
          style={{ position:"absolute", right:0, top:0, bottom:0, width:14, cursor:"col-resize", zIndex:3,
            background:`linear-gradient(to left,${col}dd,transparent)`,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1 }}>
          <span style={{ fontSize:7, color:"#fff", opacity:0.9, lineHeight:1, pointerEvents:"none",
            transform:"scaleX(-1)", display:"inline-block" }}>✂</span>
          <div style={{ width:1.5, height:"40%", background:"#fff", opacity:0.7, borderRadius:1 }}/>
        </div>
      </div>
    );
  };

  const renderAudioClip = (c, pps) => {
    const col   = clipCol(c);
    const clipW = Math.max(28, getClipDur(c) * pps);
    return (
      <div key={c.id}
        style={{ position:"relative", width:clipW, flexShrink:0, height:"100%",
          background:`repeating-linear-gradient(90deg,${col}28 0,${col}50 2px,${col}14 3px,transparent 5px)`,
          border:`1.5px solid ${col}55`, borderRadius:3, overflow:"hidden" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:`${col}aa` }}/>
        <div onMouseDown={e => startTrim(e, c.id, 'start')}
          style={{ position:"absolute", left:0, top:0, bottom:0, width:9, cursor:"col-resize", zIndex:3,
            background:`linear-gradient(to right,${col}88,transparent)` }}/>
        <div onMouseDown={e => startTrim(e, c.id, 'end')}
          style={{ position:"absolute", right:0, top:0, bottom:0, width:9, cursor:"col-resize", zIndex:3,
            background:`linear-gradient(to left,${col}88,transparent)` }}/>
      </div>
    );
  };

  // ── Audio track lane trim/offset drag ────────────────────────────────────────
  // audioTrim: { start, end, offset } stored on the VideoEdit node
  const getAudioTrim   = () => node.audioTrim || { start:0, end:0, offset:0 };
  const getAudioVisW   = (pps) => audioNode
    ? Math.max(28, (audioNode.duration - (getAudioTrim().start||0) - (getAudioTrim().end||0)) * pps)
    : 0;

  const startAudioTrimDrag = (e, side) => {
    e.stopPropagation(); e.preventDefault();
    const startX  = e.clientX;
    const trim0   = getAudioTrim();
    const dur     = audioNode?.duration || 0;
    const pps     = expanded ? 32 : 20;
    const onMove  = (ev) => {
      const delta = (ev.clientX - startX) / pps;
      if (side === 'start') {
        const newStart = Math.max(0, Math.min(trim0.start + delta, dur - (trim0.end||0) - 0.5));
        upd({ audioTrim: { ...trim0, start: parseFloat(newStart.toFixed(3)) } });
      } else {
        const newEnd = Math.max(0, Math.min(trim0.end - delta, dur - (trim0.start||0) - 0.5));
        upd({ audioTrim: { ...trim0, end: parseFloat(newEnd.toFixed(3)) } });
      }
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startAudioOffsetDrag = (e) => {
    e.stopPropagation(); e.preventDefault();
    const startX   = e.clientX;
    const trim0    = getAudioTrim();
    const pps      = expanded ? 32 : 20;
    const onMove   = (ev) => {
      const delta     = (ev.clientX - startX) / pps;
      const newOffset = Math.max(0, parseFloat((trim0.offset + delta).toFixed(3)));
      upd({ audioTrim: { ...trim0, offset: newOffset } });
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const renderAudioTrackLane = (pps) => {
    if (!audioNode?.audioUrl) {
      // No soundtrack linked — show the per-clip audio stubs
      return (
        <>
          <div style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", marginBottom:3, userSelect:"none" }}>AUDIO</div>
          <div style={{ display:"flex", height:20, gap:3, marginBottom:4 }}>
            {clips.map(c => renderAudioClip(c, pps))}
          </div>
        </>
      );
    }

    const trim    = getAudioTrim();
    const visW    = getAudioVisW(pps);
    const offsetX = (trim.offset || 0) * pps;
    const dur     = audioNode.duration || 0;
    const visDur  = Math.max(0.5, dur - (trim.start||0) - (trim.end||0));
    const fmtT    = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

    return (
      <>
        <div style={{ fontSize:6, color:beatAc, letterSpacing:"0.12em", marginBottom:3, userSelect:"none", display:"flex", alignItems:"center", gap:6 }}>
          <span>AUDIO TRACK</span>
          {audioNode.bpm && <span style={{ color:th.t3 }}>{audioNode.bpm} BPM · {audioNode.beats?.length} beats</span>}
          {(trim.start > 0 || trim.end > 0 || trim.offset > 0) && (
            <button onMouseDown={e=>e.stopPropagation()}
              onClick={e=>{e.stopPropagation(); upd({ audioTrim:{ start:0, end:0, offset:0 } });}}
              style={{ background:"transparent", border:`1px solid ${th.b0}`, borderRadius:3, color:th.t3,
                fontSize:5.5, padding:"1px 5px", cursor:"pointer", letterSpacing:"0.08em" }}>RESET</button>
          )}
        </div>
        <div style={{ position:"relative", height:36, marginBottom:6 }}>
          {/* The audio track block */}
          <div
            onMouseDown={startAudioOffsetDrag}
            style={{ position:"absolute", left:offsetX, width:visW, top:0, bottom:0,
              background:`repeating-linear-gradient(90deg,${beatAc}18 0,${beatAc}30 2px,${beatAc}0a 3px,transparent 6px)`,
              border:`1.5px solid ${beatAc}88`, borderRadius:4, cursor:"grab", overflow:"hidden", userSelect:"none" }}>

            {/* Beat ticks overlaid on the track */}
            {audioNode.beats?.map((t, i) => {
              const beatX = ((t - (trim.start||0)) / visDur) * visW;
              if (beatX < 0 || beatX > visW) return null;
              return (
                <div key={i} style={{
                  position:"absolute", left:beatX, top:0, bottom:0, width:1,
                  background: i%4===0 ? `${beatAc}cc` : `${beatAc}44`, pointerEvents:"none"
                }}/>
              );
            })}

            {/* Track label */}
            <span style={{ position:"absolute", left:22, top:"50%", transform:"translateY(-50%)",
              fontSize:6, color:beatAc, fontWeight:700, letterSpacing:"0.08em",
              whiteSpace:"nowrap", overflow:"hidden", pointerEvents:"none", zIndex:2 }}>
              {audioNode.fileName?.replace(/\.[^.]+$/,"").slice(0,18) || "AUDIO"}{trim.start>0||trim.end>0 ? ` · ${fmtT(trim.start||0)}–${fmtT(dur-(trim.end||0))}` : ` · ${fmtT(dur)}`}
            </span>

            {/* Left trim handle */}
            <div onMouseDown={e => startAudioTrimDrag(e, 'start')}
              style={{ position:"absolute", left:0, top:0, bottom:0, width:14, cursor:"col-resize", zIndex:4,
                background:`linear-gradient(to right,${beatAc}dd,transparent)`,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1 }}>
              <span style={{ fontSize:7, color:"#fff", opacity:0.9, lineHeight:1, pointerEvents:"none" }}>✂</span>
              <div style={{ width:1.5, height:"40%", background:"#fff", opacity:0.7, borderRadius:1 }}/>
            </div>

            {/* Right trim handle */}
            <div onMouseDown={e => startAudioTrimDrag(e, 'end')}
              style={{ position:"absolute", right:0, top:0, bottom:0, width:14, cursor:"col-resize", zIndex:4,
                background:`linear-gradient(to left,${beatAc}dd,transparent)`,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1 }}>
              <span style={{ fontSize:7, color:"#fff", opacity:0.9, lineHeight:1, pointerEvents:"none",
                transform:"scaleX(-1)", display:"inline-block" }}>✂</span>
              <div style={{ width:1.5, height:"40%", background:"#fff", opacity:0.7, borderRadius:1 }}/>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderTimeline = (pps) => {
    const tlW  = Math.max(240, totalDur * pps + 40);
    const playX = Math.min(playheadTime * pps, tlW - 2);
    return (
      <div style={{ background:th.card2, border:`1px solid ${th.b0}`, borderRadius:6, padding:"8px 7px" }}>
        <div style={{ overflowX:"auto", paddingBottom:4 }}>
          <div onMouseDown={e => startTimelineSeek(e, pps)}
            style={{ width:tlW, position:"relative", cursor:"crosshair" }}>
            {renderRuler(pps)}
            {totalDur > 0 && (
              /* Playhead — full height from top of ruler, draggable handle in ruler strip */
              <div style={{ position:"absolute", left:playX, top:0, bottom:0, width:0, zIndex:11, pointerEvents:"none" }}>
                {/* Red needle line (below ruler) */}
                <div style={{ position:"absolute", left:0, top:22, bottom:0, width:1.5,
                  background:"#ef4444", pointerEvents:"none" }}/>
                {/* Drag handle — delta-based so it never jitters */}
                <div onMouseDown={e => {
                    e.stopPropagation();
                    const t0 = playheadTime, x0 = e.clientX;
                    const onMove = (ev) => seekTo(Math.max(0, Math.min(t0 + (ev.clientX - x0) / pps, totalDur)));
                    const onUp   = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                  style={{ position:"absolute", top:5, left:-5, width:10, height:10,
                    background:"#ef4444", borderRadius:1, transform:"rotate(45deg)",
                    cursor:"ew-resize", pointerEvents:"auto", zIndex:12 }}/>
              </div>
            )}
            <div style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", marginBottom:3, userSelect:"none" }}>VIDEO</div>
            <div style={{ display:"flex", height:34, marginBottom:6, gap:3 }}>
              {clips.map((c, i) => renderVideoClip(c, i, pps))}
            </div>
            {renderAudioTrackLane(pps)}
          </div>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
          {clips.map((c, i) => {
            const col = clipCol(c);
            return (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:4,
                background:`${col}15`, border:`1px solid ${col}55`, borderRadius:4, padding:"3px 7px" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:col, flexShrink:0 }}/>
                <span style={{ fontSize:6, color:col, fontWeight:700, letterSpacing:"0.06em",
                  maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {c.type==="upload" ? (c.name||"UPLOAD").replace(/\.[^.]+$/,"").toUpperCase().slice(0,12)
                    : c.type===T.VEO ? `VEO ${i+1}` : `KLING ${i+1}`}
                </span>
                <button onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); removeClip(c.id); }}
                  style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:8, padding:"0 1px", lineHeight:1 }}>✕</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const emptySlate = (
    <div style={{ background:th.card2, border:`1px dashed ${th.b0}`, borderRadius:6, padding:"18px 0", textAlign:"center" }}>
      <Ico icon={Scissors} size={16} color={th.t3}/>
      <div style={{ fontSize:7, color:th.t3, letterSpacing:"0.1em", marginTop:6 }}>Wire VEO or KLING nodes here</div>
      <div style={{ fontSize:6, color:th.t4, letterSpacing:"0.08em", marginTop:3 }}>or upload a video below</div>
    </div>
  );

  const exportButtons = (compact) => (
    <>
      {["720p","1080p"].map(fmt => (
        <button key={fmt} onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); doExport(fmt); }}
          disabled={exporting || !clips.length}
          style={{ background:"#0a0a0a", border:"none", color:"#fff", borderRadius:5,
            padding:compact?"5px 10px":"6px 14px",
            cursor:(exporting||!clips.length)?"not-allowed":"pointer",
            fontSize:compact?7:8, fontWeight:700,
            fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.1em",
            opacity:(exporting||!clips.length)?0.45:1 }}>
          {exporting ? "⌛" : fmt}
        </button>
      ))}
    </>
  );

  const cardW = isFullscreen ? "100%" : 300;
  const pps   = isFullscreen ? 64 : 20;

  // ── FULLSCREEN layout ────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column",
        fontFamily:"'Inter',system-ui,sans-serif", color:th.t0 }}>
        {/* Header */}
        <div style={{ height:50, flexShrink:0, borderBottom:`1px solid ${th.b0}`, background:th.card2,
          display:"flex", alignItems:"center", padding:"0 20px", gap:12 }}>
          <Ico icon={Scissors} size={13} color={ac}/>
          <span style={{ fontSize:11, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>VIDEO EDIT</span>
          <span style={{ fontSize:10, color:th.t3 }}>{clips.length} CLIPS · {totalDur.toFixed(1)}s</span>
          <div style={{ flex:1 }}/>
          <button onClick={e=>{e.stopPropagation();onOpenFullscreen?.();}}
            style={{ background:"transparent", border:`1px solid ${th.b1}`, color:th.t2,
              borderRadius:5, padding:"5px 14px", fontSize:10, fontWeight:700,
              fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em", cursor:"pointer" }}>
            ✕ EXIT
          </button>
        </div>

        {/* Body: video player on top, timeline below */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", gap:0, background:th.bg }}>

          {/* Top — video preview + transport controls */}
          <div style={{ padding:"20px 20px 14px", display:"flex", flexDirection:"column", gap:12, flexShrink:0 }}>
            <div style={{ width:"100%", maxWidth:1040, margin:"0 auto", display:"flex", flexDirection:"column", gap:12 }}>
            <video ref={cardVRef}
              style={{ width:"100%", maxHeight:"46vh", borderRadius:10, aspectRatio:"16/9", objectFit:"contain", background:"#000", display:"block", outline:"none" }}
              onEnded={handleStop}/>
            {audioNode?.audioUrl && (
              <audio ref={audioTrackRef} src={audioNode.audioUrl} style={{ display:"none" }}/>
            )}
            {/* Play controls — large */}
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              {playState === "playing" ? (
                <button onClick={e=>{e.stopPropagation();handlePause();}}
                  style={{ border:"none", color:"#fff", borderRadius:7, fontWeight:700, letterSpacing:"0.12em",
                    fontFamily:"'Inter',system-ui,sans-serif", padding:"9px 22px", fontSize:12,
                    background:"#374151", cursor:"pointer" }}>⏸ PAUSE</button>
              ) : playState === "paused" ? (
                <>
                  <button onClick={e=>{e.stopPropagation();handleResume();}}
                    style={{ border:"none", color:"#fff", borderRadius:7, fontWeight:700, letterSpacing:"0.12em",
                      fontFamily:"'Inter',system-ui,sans-serif", padding:"9px 22px", fontSize:12,
                      background:"#0a0a0a", cursor:"pointer" }}>▶ RESUME</button>
                  <button onClick={e=>{e.stopPropagation();handleStop();}}
                    style={{ border:`1px solid #374151`, color:th.t2, borderRadius:7, fontWeight:700,
                      fontFamily:"'Inter',system-ui,sans-serif", padding:"9px 18px", fontSize:12,
                      background:"transparent", cursor:"pointer" }}>⏹</button>
                </>
              ) : (
                <button onClick={e=>{e.stopPropagation();handlePlay();}}
                  disabled={!clips.length}
                  style={{ border:"none", color:"#fff", borderRadius:7, fontWeight:700, letterSpacing:"0.12em",
                    fontFamily:"'Inter',system-ui,sans-serif", padding:"9px 22px", fontSize:12,
                    background:"#0a0a0a", cursor:clips.length?"pointer":"not-allowed", opacity:clips.length?1:0.4 }}>
                  ▶ PLAY
                </button>
              )}
              <span style={{ fontSize:13, color:th.t2, fontVariantNumeric:"tabular-nums" }}>
                {playheadTime.toFixed(1)}s / {totalDur.toFixed(1)}s
              </span>
              <button onClick={e=>{e.stopPropagation();splitAtPlayhead();}}
                disabled={!clips.length||totalDur===0}
                style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2,
                  borderRadius:7, padding:"9px 14px", fontSize:11, fontWeight:700,
                  fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em",
                  cursor:clips.length?"pointer":"not-allowed", opacity:clips.length?1:0.4 }}>
                SPLIT
              </button>
              <button onClick={e=>{e.stopPropagation();undoLastSplit();}}
                disabled={!canUndoSplit}
                style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2,
                  borderRadius:7, padding:"9px 14px", fontSize:11, fontWeight:700,
                  fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em",
                  cursor:canUndoSplit?"pointer":"not-allowed", opacity:canUndoSplit?1:0.4 }}>
                UNDO SPLIT
              </button>
              {exportButtons(false)}
              <button onClick={e=>{e.stopPropagation();fileInputRef.current?.click();}}
                style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2,
                  borderRadius:7, padding:"9px 14px", fontSize:11, fontWeight:700,
                  fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em", cursor:"pointer" }}>
                UPLOAD
              </button>
              {audioNode?.audioUrl && (
                <span style={{ fontSize:11, color:"#10b981", display:"flex", alignItems:"center", gap:4 }}>
                  ♪ {audioNode.fileName ? audioNode.fileName.replace(/\.[^.]+$/,"").slice(0,20) : "TRACK"}
                </span>
              )}
              </div>
              {renderVolumeControls(false)}
            </div>
          </div>

          {/* Bottom — timeline */}
          <div style={{ flex:1, minHeight:220, display:"flex", flexDirection:"column", padding:"0 20px 20px", overflow:"hidden", background:th.card, borderTop:`1px solid ${th.b0}` }}>
            <input ref={fileInputRef} type="file" accept="video/*" style={{ display:"none" }} onChange={handleUpload}/>
            <div style={{ flex:1, width:"100%", maxWidth:1040, margin:"0 auto", overflow:"auto", paddingTop:16 }}>
              {clips.length > 0 ? renderTimeline(pps) : emptySlate}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── COMPACT card (on canvas) ──────────────────────────────────────────────────
  return (
    <div data-nodeid={node.id} data-nodetype={T.VIDEOEDIT} style={{ position:"relative", width:cardW }}>
      <div style={{ position:"absolute", left:-4, top:48, width:8, height:8, background:th.card,
        border:`1.5px solid ${clips.length>0?ac:th.b0}`, borderRadius:"50%", zIndex:10, pointerEvents:"none" }}/>

      <div style={{ width:cardW, background:th.card, border:`1px solid ${selected?ac:th.b0}`, borderRadius:16,
        overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}` }}>

        {/* ── HEADER ── */}
        <div style={{ padding:"10px 12px 6px", borderBottom:`1px solid ${th.b0}`,
          display:"flex", alignItems:"center", gap:7 }}>
          <Ico icon={Scissors} size={11} color={ac}/>
          <span style={{ fontSize:7, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>VIDEO EDIT</span>
          <span style={{ fontSize:6, color:th.t3, marginLeft:4 }}>{clips.length} CLIPS · {totalDur.toFixed(1)}s</span>
          {/* Beat-snap button — visible when an Audio Track is wired in */}
          {audioNode?.beats?.length > 0 && (
            <button onMouseDown={e=>e.stopPropagation()}
              onClick={e=>{e.stopPropagation();snapToBeat();}}
              title={`Snap ${clips.length} clip cuts to ${audioNode.beats.length} detected beats (${audioNode.bpm} BPM)`}
              style={{ border:`1px solid ${beatAc}`, borderRadius:5, background:`${beatAc}22`,
                color:beatAc, fontSize:6.5, fontWeight:700, padding:"3px 7px", cursor:"pointer",
                letterSpacing:"0.08em", fontFamily:"'Inter',system-ui,sans-serif", marginLeft:4 }}>
              ♩ SNAP TO BEAT
            </button>
          )}
          {/* Fullscreen / collapse toggle */}
          <button onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onOpenFullscreen?.(); }}
            style={{ background: isFullscreen ? "transparent" : "transparent", border: isFullscreen ? `1px solid ${th.b1}` : "none",
              color: isFullscreen ? th.t2 : th.t3, cursor:"pointer",
              fontSize: isFullscreen ? 12 : 13, padding: isFullscreen ? "3px 10px" : "0 3px",
              borderRadius: isFullscreen ? 5 : 0, lineHeight:1, marginLeft:"auto",
              fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em" }}
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Open fullscreen editor"}>
            {isFullscreen ? "✕ CLOSE" : "⤢"}
          </button>
          {onInspect && <InspectAction onClick={onInspect} th={th} />}
          <button onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDel(); }}
            style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer",
              fontSize:11, padding:"0 2px", lineHeight:1 }}>✕</button>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding:9, display:"flex", flexDirection:"column", gap:8 }}>

          {/* Video preview — always visible, gets larger when expanded */}
          <video ref={cardVRef}
            style={{ width:"100%", borderRadius:6, aspectRatio:"16/9", background:"#0a0a0a", display:"block", outline:"none" }}
            onEnded={handleStop}/>
          {/* Soundtrack — hidden audio element synced to the video timeline */}
          {audioNode?.audioUrl && (
            <audio ref={audioTrackRef} src={audioNode.audioUrl} style={{ display:"none" }}/>
          )}

          {/* Play controls */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {playState === "playing" ? (
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();handlePause();}}
                disabled={!clips.length}
                style={{ border:"none", color:"#fff", borderRadius:5, fontWeight:700, letterSpacing:"0.12em",
                  fontFamily:"'Inter',system-ui,sans-serif", padding:"5px 11px", fontSize:8,
                  background:"#374151", cursor:clips.length?"pointer":"not-allowed", opacity:clips.length?1:0.4 }}>
                ⏸ PAUSE
              </button>
            ) : playState === "paused" ? (
              <>
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();handleResume();}}
                  disabled={!clips.length}
                  style={{ border:"none", color:"#fff", borderRadius:5, fontWeight:700, letterSpacing:"0.12em",
                    fontFamily:"'Inter',system-ui,sans-serif", padding:"5px 11px", fontSize:8,
                    background:"#0a0a0a", cursor:clips.length?"pointer":"not-allowed", opacity:clips.length?1:0.4 }}>
                  ▶ RESUME
                </button>
                <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();handleStop();}}
                  disabled={!clips.length}
                  style={{ border:"1px solid #374151", color:th.t2, borderRadius:5, fontWeight:700,
                    fontFamily:"'Inter',system-ui,sans-serif", padding:"5px 11px", fontSize:8,
                    background:"transparent", cursor:clips.length?"pointer":"not-allowed", opacity:clips.length?1:0.4 }}>
                  ⏹
                </button>
              </>
            ) : (
              <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();handlePlay();}}
                disabled={!clips.length}
                style={{ border:"none", color:"#fff", borderRadius:5, fontWeight:700, letterSpacing:"0.12em",
                  fontFamily:"'Inter',system-ui,sans-serif", padding:"5px 11px", fontSize:8,
                  background:"#0a0a0a", cursor:clips.length?"pointer":"not-allowed", opacity:clips.length?1:0.4 }}>
                ▶ PLAY
              </button>
            )}
            <span style={{ fontSize:7, color:th.t3 }}>
              {playheadTime.toFixed(1)}s / {totalDur.toFixed(1)}s
            </span>
            {audioNode?.audioUrl && (
              <span style={{ fontSize:6, color:"#10b981", letterSpacing:"0.08em", display:"flex", alignItems:"center", gap:3 }}>
                <span>♪</span>
                <span>{audioNode.fileName ? audioNode.fileName.replace(/\.[^.]+$/,"").slice(0,14) : "TRACK"}</span>
              </span>
            )}
            <div style={{ flex:1 }}/>
            {/* Split clip at playhead — both halves stay in the timeline */}
            <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();splitAtPlayhead();}}
              disabled={!clips.length || totalDur===0}
              title="Split clip at playhead position"
              style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2,
                borderRadius:4, padding:"3px 7px", fontSize:7, fontWeight:700,
                fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em",
                cursor:clips.length?"pointer":"not-allowed", opacity:clips.length?1:0.4 }}>
              ✂ SPLIT
            </button>
            <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();undoLastSplit();}}
              disabled={!canUndoSplit}
              title="Undo the last split"
              style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2,
                borderRadius:4, padding:"3px 7px", fontSize:7, fontWeight:700,
                fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em",
                cursor:canUndoSplit?"pointer":"not-allowed", opacity:canUndoSplit?1:0.4 }}>
              UNDO SPLIT
            </button>
          </div>

          {renderVolumeControls(true)}

          {clips.length > 0 ? renderTimeline(pps) : emptySlate}

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="video/*"
            style={{ display:"none" }} onChange={handleUpload}/>

          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em" }}>EXPORT</span>
            <button onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2,
                borderRadius:5, padding:"5px 10px", fontSize:7, fontWeight:700,
                fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.1em", cursor:"pointer" }}>
              ↑ UPLOAD
            </button>
            <div style={{ flex:1 }}/>
            {exportButtons(true)}
          </div>

        </div>
      </div>
    </div>
  );
}


// ─── BIBLE POPUP ──────────────────────────────────────────────────────────────
function BiblePopup({ bible, setBible, onClose }) {
  const th = useTheme();
  const [tab,      setTab]      = useState("character");
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState({ name:"", tag:"", description:"", notes:"", _imgUrl:"" });
  const imgInputRef = useRef(null);

  // Auto-generate a tag suggestion from the name
  const autoTag = (name, kind) => {
    const prefix = kind==="character"?"@c":kind==="object"?"@o":"@l";
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,4) || uid().slice(0,4);
    return prefix + slug;
  };

  const TABS = [
    { key:"character", label:"Characters", icon:User    },
    { key:"object",    label:"Objects",    icon:Box     },
    { key:"location",  label:"Locations",  icon:MapPin  },
  ];

  const listKey   = tab==="character"?"characters":tab==="object"?"objects":"locations";
  const entries   = bible[listKey] || [];
  const updEntries= (fn) => setBible(prev => ({ ...prev, [listKey]: fn(prev[listKey]||[]) }));

  const startAdd  = () => { setForm({name:"",tag:"",description:"",notes:"",_imgUrl:""}); setEditId(null); setShowForm(true); };
  const startEdit = (e) => { setForm({name:e.name,tag:e.tag||"",description:e.description||"",notes:e.notes||"",_imgUrl:e._imgUrl||""}); setEditId(e.id); setShowForm(true); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editId) {
      updEntries(list => list.map(e => e.id===editId ? {...e,...form} : e));
    } else {
      updEntries(list => [...list, { id:uid(), kind:tab, ...form }]);
    }
    setShowForm(false); setEditId(null);
  };
  const del = (id) => updEntries(list => list.filter(e => e.id!==id));

  const handleImg = (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setForm(f => ({ ...f, _imgUrl: e.target.result }));
    reader.readAsDataURL(file);
    ev.target.value = "";
  };

  const inpStyle = { background: th.dark?"#1a1f2e":"#f3f4f6", border:`1px solid ${th.b0}`,
    color:th.t0, borderRadius:10, padding:"13px 16px", fontSize:14,
    fontFamily:"'Inter',system-ui,sans-serif", outline:"none",
    width:"100%", boxSizing:"border-box" };

  const currentTab = TABS.find(t=>t.key===tab);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500,
      background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Inter',system-ui,sans-serif" }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>

      <div style={{ width:680, maxHeight:"88vh", background:th.card,
        border:`1px solid ${th.b0}`, borderRadius:20,
        boxShadow:"0 32px 100px rgba(0,0,0,0.55)", display:"flex", flexDirection:"column",
        overflow:"hidden" }}>

        {/* ── HEADER ── */}
        <div style={{ padding:"22px 28px 16px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <Ico icon={BookOpen} size={18} color={th.t0}/>
          <span style={{ fontSize:20, fontWeight:700, color:th.t0, letterSpacing:"-0.01em" }}>
            {showForm ? (editId?"Edit Entry":"Add "+capitalize(tab)) : "World Bible"}
          </span>
          <div style={{ flex:1 }}/>
          <button onClick={onClose}
            style={{ background: th.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)",
              border:"none", color:th.t2, cursor:"pointer", width:34, height:34,
              borderRadius:10, fontSize:16, display:"flex", alignItems:"center",
              justifyContent:"center", lineHeight:1 }}>✕</button>
        </div>

        {/* ── TABS ── */}
        {!showForm && (
          <div style={{ display:"flex", gap:6, padding:"0 28px 14px", flexShrink:0 }}>
            {TABS.map(t => {
              const active = tab===t.key;
              const count  = (bible[t.key==="character"?"characters":t.key==="object"?"objects":"locations"]||[]).length;
              return (
                <button key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{ display:"flex", alignItems:"center", gap:7,
                    background: active ? (th.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.07)") : "transparent",
                    border: active ? `1px solid ${th.b0}` : "1px solid transparent",
                    color: active ? th.t0 : th.t3, cursor:"pointer",
                    padding:"9px 18px", borderRadius:10, fontSize:13,
                    fontFamily:"'Inter',system-ui,sans-serif", fontWeight: active?700:400,
                    transition:"all 0.12s" }}>
                  <Ico icon={t.icon} size={13} color={active?th.t0:th.t3}/>
                  {t.label}
                  {count>0 && (
                    <span style={{ background: th.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.08)",
                      borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:700, color:th.t2 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ height:1, background:th.b0, flexShrink:0 }}/>

        {/* ── LIST VIEW ── */}
        {!showForm && (
          <>
            <div style={{ flex:1, overflowY:"auto", padding:"20px 28px" }}>
              {entries.length===0 ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", padding:"60px 0", gap:14, color:th.t4 }}>
                  <Ico icon={currentTab?.icon||BookOpen} size={36} color={th.t4}/>
                  <div style={{ fontSize:14, letterSpacing:"0.01em" }}>No {tab}s yet</div>
                  <div style={{ fontSize:12, color:th.t4, opacity:0.7 }}>Click "Add {capitalize(tab)}" to create your first entry</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  {entries.map(e => (
                    <div key={e.id} style={{ background: th.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",
                      border:`1px solid ${th.b0}`, borderRadius:14, overflow:"hidden",
                      display:"flex", flexDirection:"column" }}>
                      {/* Image strip */}
                      {e._imgUrl ? (
                        <img src={e._imgUrl} alt={e.name}
                          style={{ width:"100%", height:120, objectFit:"contain", display:"block",
                            background: th.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)", padding:6, boxSizing:"border-box" }}/>
                      ) : (
                        <div style={{ width:"100%", height:90, background: th.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <Ico icon={currentTab?.icon||User} size={24} color={th.t4}/>
                        </div>
                      )}
                      {/* Info */}
                      <div style={{ padding:"12px 14px", flex:1 }}>
                        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:th.t0 }}>{e.name}</span>
                          {e.tag && <span style={{ fontSize:10, color:th.t4, fontFamily:"'Courier New',monospace" }}>{e.tag}</span>}
                        </div>
                        {e.description && (
                          <div style={{ fontSize:11, color:th.t2, lineHeight:1.6,
                            display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                            overflow:"hidden" }}>{e.description}</div>
                        )}
                        {e.notes && (
                          <div style={{ fontSize:10, color:th.t3, marginTop:5, fontStyle:"italic",
                            display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical",
                            overflow:"hidden" }}>{e.notes}</div>
                        )}
                      </div>
                      {/* Actions */}
                      <div style={{ display:"flex", borderTop:`1px solid ${th.b0}` }}>
                        <button onClick={() => startEdit(e)}
                          style={{ flex:1, background:"transparent", border:"none", borderRight:`1px solid ${th.b0}`,
                            color:th.t2, cursor:"pointer", padding:"9px", fontSize:12, display:"flex",
                            alignItems:"center", justifyContent:"center" }}>
                          <Ico icon={Pencil} size={11} color={th.t2}/>
                        </button>
                        <button onClick={() => del(e.id)}
                          style={{ flex:1, background:"transparent", border:"none",
                            color:"#f87171", cursor:"pointer", padding:"9px", fontSize:12, display:"flex",
                            alignItems:"center", justifyContent:"center" }}>
                          <Ico icon={X} size={11} color="#f87171"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer add button */}
            <div style={{ padding:"16px 28px", borderTop:`1px solid ${th.b0}`, flexShrink:0 }}>
              <button onClick={startAdd}
                style={{ display:"flex", alignItems:"center", gap:8, background:th.t0,
                  border:"none", color:th.bg, borderRadius:12, padding:"12px 24px",
                  fontSize:13, fontWeight:700, cursor:"pointer",
                  fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.02em" }}>
                <Ico icon={Plus} size={13} color={th.bg}/>
                Add {capitalize(tab)}
              </button>
            </div>
          </>
        )}

        {/* ── ADD / EDIT FORM ── */}
        {showForm && (
          <div style={{ flex:1, overflowY:"auto", padding:"24px 28px",
            display:"flex", flexDirection:"column", gap:18 }}>

            {/* Image upload */}
            <input ref={imgInputRef} type="file" accept="image/*"
              style={{ display:"none" }} onChange={handleImg}/>
            <div onClick={() => imgInputRef.current?.click()}
              style={{ width:"100%", height:200, borderRadius:14, overflow:"hidden",
                border:`2px dashed ${th.b0}`, cursor:"pointer", display:"flex",
                flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:10, background: th.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",
                transition:"border-color 0.15s", position:"relative" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=th.t2}
              onMouseLeave={e=>e.currentTarget.style.borderColor=th.b0}>
              {form._imgUrl ? (
                <img src={form._imgUrl} alt="preview"
                  style={{ width:"100%", height:"100%", objectFit:"contain", position:"absolute", inset:0, padding:8, boxSizing:"border-box" }}/>
              ) : (
                <>
                  <Ico icon={currentTab?.icon||User} size={30} color={th.t4}/>
                  <div style={{ fontSize:13, color:th.t3, fontWeight:500 }}>
                    Click to add reference image
                  </div>
                  <div style={{ fontSize:11, color:th.t4 }}>PNG, JPG or WEBP</div>
                </>
              )}
              {form._imgUrl && (
                <button onClick={e=>{e.stopPropagation();setForm(f=>({...f,_imgUrl:""}));}}
                  style={{ position:"absolute", top:10, right:10, background:"rgba(0,0,0,0.6)",
                    border:"none", color:"#fff", cursor:"pointer", width:28, height:28,
                    borderRadius:8, fontSize:14, display:"flex", alignItems:"center",
                    justifyContent:"center", zIndex:1 }}>✕</button>
              )}
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize:11, color:th.t3, letterSpacing:"0.1em",
                fontWeight:600, display:"block", marginBottom:7 }}>NAME</label>
              <input value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder={`${capitalize(tab)} name…`}
                style={inpStyle}/>
            </div>

            {/* Tag */}
            <div>
              <label style={{ fontSize:11, color:th.t3, letterSpacing:"0.1em",
                fontWeight:600, display:"block", marginBottom:7 }}>TAG
                <span style={{ fontWeight:400, color:th.t4, marginLeft:8, fontSize:10, letterSpacing:0 }}>
                  used to reference this entry in scene text (e.g. @cmaria)
                </span>
              </label>
              <div style={{ display:"flex", gap:8 }}>
                <input value={form.tag}
                  onChange={e=>setForm(f=>({...f,tag:e.target.value}))}
                  placeholder={`e.g. @${tab[0]}name`}
                  style={{ ...inpStyle, flex:1, fontFamily:"'Courier New',monospace",
                    letterSpacing:"0.04em" }}/>
                <button type="button"
                  onClick={()=>setForm(f=>({...f,tag:autoTag(f.name,tab)}))}
                  style={{ background: th.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)",
                    border:`1px solid ${th.b0}`, color:th.t2, borderRadius:10, padding:"0 16px",
                    fontSize:11, cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif",
                    whiteSpace:"nowrap", flexShrink:0 }}>Auto</button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize:11, color:th.t3, letterSpacing:"0.1em",
                fontWeight:600, display:"block", marginBottom:7 }}>DESCRIPTION</label>
              <textarea value={form.description}
                onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                placeholder={`Describe key visual features, personality traits, or defining characteristics…`}
                rows={3}
                style={{ ...inpStyle, resize:"none", lineHeight:1.65 }}/>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize:11, color:th.t3, letterSpacing:"0.1em",
                fontWeight:600, display:"block", marginBottom:7 }}>NOTES</label>
              <textarea value={form.notes}
                onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                placeholder="Story notes, relationships, backstory…"
                rows={2}
                style={{ ...inpStyle, resize:"none", lineHeight:1.65 }}/>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4, paddingBottom:4 }}>
              <button onClick={()=>{setShowForm(false);setEditId(null);}}
                style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2,
                  borderRadius:10, padding:"12px 28px", fontSize:13, cursor:"pointer",
                  fontFamily:"'Inter',system-ui,sans-serif", fontWeight:500 }}>Cancel</button>
              <button onClick={save}
                style={{ background:th.t0, border:"none", color:th.bg,
                  borderRadius:10, padding:"12px 32px", fontSize:13, fontWeight:700, cursor:"pointer",
                  fontFamily:"'Inter',system-ui,sans-serif" }}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── LEFT DRAWER ──────────────────────────────────────────────────────────────
function MusicDnaCard({ node, upd, onDel, sel: selected, allNodes, onInspect, onAnalyze, onGenerateBlueprint }) {
  const th = useTheme();
  const ac = "#ec4899";
  const audioNode = node.audioNodeId ? (allNodes || []).find(n => n.id === node.audioNodeId) : null;
  const analysis = node.analysis || null;
  const directionGuide = analysis ? buildMusicVideoBlueprintGuide(analysis, node) : null;
  const linkedStats = audioNode?.duration
    ? `${audioNode.duration.toFixed(1)}s${audioNode.bpm ? ` · ${audioNode.bpm} BPM` : ""}${audioNode.beats?.length ? ` · ${audioNode.beats.length} beats` : ""}`
    : "No analyzed audio linked yet";
  const portY = 44;

  return (
    <div data-nodeid={node.id} data-nodetype={T.MUSICDNA} style={{ position:"relative", width:320 }}>
      <div style={{ position:"absolute", left:-4, top:portY, width:8, height:8, background:th.card, border:`1.5px solid ${audioNode ? ac : th.b0}`, borderRadius:"50%", zIndex:10, pointerEvents:"none" }} />
      <div style={{ width:320, background:th.card, border:`1px solid ${selected ? ac : th.b0}`, borderRadius:16, overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", boxShadow:`0 4px 24px ${th.sh}` }}>
        <div style={{ padding:"10px 12px 6px", borderBottom:`1px solid ${th.b0}`, display:"flex", alignItems:"center", gap:7 }}>
          <Ico icon={Layers} size={11} color={ac}/>
          <span style={{ fontSize:7, letterSpacing:"0.2em", color:ac, fontWeight:700 }}>MUSIC DNA</span>
          {analysis?.sectionCount && <span style={{ fontSize:6, color:th.t3 }}>{analysis.sectionCount} SECTIONS</span>}
          <div style={{ flex:1 }} />
          {onInspect && <InspectAction onClick={onInspect} th={th} />}
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation(); onDel();}} style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", fontSize:11, padding:"0 2px", lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:10, display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ border:`1px solid ${audioNode ? `${ac}33` : th.b0}`, borderRadius:8, padding:"8px 10px", background:audioNode ? `${ac}10` : th.card2 }}>
            <div style={{ fontSize:6, color:audioNode ? ac : th.t3, letterSpacing:"0.12em", marginBottom:3 }}>
              {audioNode ? "AUDIO NODE LINKED" : "WIRE AN AUDIO NODE HERE"}
            </div>
            <div style={{ fontSize:8, color:th.t1, lineHeight:1.5 }}>
              {audioNode?.fileName || "Music DNA needs an analyzed audio track to read timing, beats, and section flow."}
            </div>
            <div style={{ fontSize:7, color:th.t3, marginTop:4 }}>{linkedStats}</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div>
              <label style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:4 }}>CLIP MODE</label>
              <select value={node.clipMode || "hybrid"} onChange={e=>upd({ clipMode:e.target.value })} style={{ ...mkSel(th), fontSize:8, padding:"7px 8px" }}>
                <option value="performance">PERFORMANCE</option>
                <option value="narrative">NARRATIVE</option>
                <option value="hybrid">HYBRID</option>
                <option value="abstract">ABSTRACT</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:4 }}>GENRE</label>
              <select value={node.genre || "auto"} onChange={e=>upd({ genre:e.target.value })} style={{ ...mkSel(th), fontSize:8, padding:"7px 8px" }}>
                {MUSIC_GENRES.map(opt => <option key={opt} value={opt}>{opt === "auto" ? "AUTO" : opt.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div>
              <label style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:4 }}>SECTIONS</label>
              <select value={node.preferredSections || "auto"} onChange={e=>upd({ preferredSections:e.target.value })} style={{ ...mkSel(th), fontSize:8, padding:"7px 8px" }}>
                <option value="auto">AUTO</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:4 }}>CONCEPT</label>
            <textarea value={node.concept || ""} onChange={e=>upd({ concept:e.target.value })} placeholder="Optional: describe the clip idea you want the song structure to drive." rows={3}
              style={{ ...mkInp(th), minHeight:66, resize:"vertical", lineHeight:1.6, fontSize:8 }} />
          </div>

          <div>
            <label style={{ fontSize:6, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:4 }}>LYRICS / KEY LINES</label>
            <textarea value={node.lyrics || ""} onChange={e=>upd({ lyrics:e.target.value })} placeholder="Optional: paste lyrics or key lines to shape section meaning." rows={4}
              style={{ ...mkInp(th), minHeight:88, resize:"vertical", lineHeight:1.6, fontSize:8 }} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation(); onAnalyze();}}
              style={{ background:`${ac}18`, border:`1px solid ${ac}44`, color:ac, borderRadius:8, padding:"9px 10px", fontSize:8, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer" }}>
              ANALYZE MUSIC
            </button>
            <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation(); onGenerateBlueprint();}} disabled={!analysis}
              style={{ background:analysis ? th.t0 : th.card2, border:"none", color:analysis ? "#fff" : th.t3, borderRadius:8, padding:"9px 10px", fontSize:8, fontWeight:700, letterSpacing:"0.1em", cursor:analysis ? "pointer" : "not-allowed", opacity:analysis ? 1 : 0.55 }}>
              GENERATE BLUEPRINT
            </button>
          </div>

          {analysis && (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              <div style={{ border:`1px solid ${th.b0}`, borderRadius:8, padding:"8px 10px", background:th.card2 }}>
                <div style={{ fontSize:6, color:ac, letterSpacing:"0.12em", marginBottom:4 }}>ANALYSIS SUMMARY</div>
                <div style={{ fontSize:8, color:th.t1, lineHeight:1.6 }}>{analysis.summary}</div>
                <div style={{ fontSize:7, color:th.t3, marginTop:5 }}>ENERGY CURVE · {analysis.energyCurve}</div>
              </div>

              {directionGuide && (
                <div style={{ border:`1px solid ${th.b0}`, borderRadius:8, padding:"8px 10px", background:th.card2 }}>
                  <div style={{ fontSize:6, color:ac, letterSpacing:"0.12em", marginBottom:4 }}>VIDEO BLUEPRINT GUIDE</div>
                  <div style={{ fontSize:8, color:th.t1, lineHeight:1.6 }}>
                    {directionGuide.overall.rhythmCharacter} · {directionGuide.overall.cutDensity} cut density
                  </div>
                  <div style={{ fontSize:7, color:th.t3, marginTop:4, lineHeight:1.5 }}>
                    {directionGuide.overall.movementBias}. {directionGuide.overall.imageBehavior}
                  </div>
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {analysis.sections.map((section, idx) => (
                  <div key={`${section.key}-${idx}`} style={{ border:`1px solid ${th.b0}`, borderRadius:8, padding:"7px 9px", background:th.card2 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                      <span style={{ fontSize:7, color:ac, letterSpacing:"0.12em", fontWeight:700 }}>{section.label}</span>
                      <span style={{ fontSize:6, color:th.t3 }}>{section.startSec.toFixed(1)}s–{section.endSec.toFixed(1)}s</span>
                    </div>
                    <div style={{ fontSize:7, color:th.t2, marginTop:4, lineHeight:1.5 }}>{section.visualRole}</div>
                    <div style={{ fontSize:6, color:th.t3, marginTop:4 }}>
                      {section.energy.toUpperCase()} · {section.estimatedBars || "?"} bars · {section.beatCount || "?"} beats
                    </div>
                    {directionGuide?.sections?.[idx] && (
                      <div style={{ fontSize:6, color:th.t3, marginTop:5, lineHeight:1.5 }}>
                        {directionGuide.sections[idx].rhythmCharacter} · {directionGuide.sections[idx].cutDensity} cuts · {directionGuide.sections[idx].movementBias}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ASSET_TABS = [
  { key:"images", label:"IMAGES", icon:ImageIcon, accept:"image/*"  },
  { key:"videos", label:"VIDEOS", icon:Video,     accept:"video/*"  },
  { key:"audio",  label:"AUDIO",  icon:Film,      accept:"audio/*"  },
  { key:"text",   label:"TEXT",   icon:FileText,  accept:null       },
];

// ─── SCRIPT CARD ──────────────────────────────────────────────────────────────
function ScriptCard({ node, sel, upd, onDel, onSplitScenes, onInspect }) {
  const th = useTheme();
  const [mode,          setMode]         = useState(node.scriptMode || "write"); // write | upload | generate
  const [script,        setScript]       = useState(node.script || "");
  const [title,         setTitle]        = useState(node.title  || "Untitled Script");
  const [idea,          setIdea]         = useState(node.idea   || "");
  const [format,        setFormat]       = useState(node.format || "screenplay"); // screenplay | treatment
  const [cinematicStyle,setCinematicStyle]= useState(node.cinematicStyle || "");
  const [loading,       setLoading]      = useState(false);
  const [splitting,     setSplitting]    = useState(false);
  const [error,         setError]        = useState("");
  const fileRef = useRef(null);

  // Sync to node state on changes
  useEffect(() => { upd({ script, title, idea, format, cinematicStyle, scriptMode: mode }); }, [script, title, idea, format, cinematicStyle, mode]);

  const generate = async () => {
    if (!idea.trim()) return;
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/script/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ idea, format, cinematicStyle: cinematicStyle || undefined }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setScript(d.script);
      setMode("write");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/script/extract", { method:"POST", body: fd });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setScript(d.text || "");
      setMode("write");
    } catch(err) { setError("Could not read file: " + err.message); }
    setLoading(false);
  };

  const splitScenes = async () => {
    if (!script.trim()) return;
    setError(""); setSplitting(true);
    try {
      const r = await fetch("/api/script/split", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ script }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      onSplitScenes(d.scenes);
    } catch(e) { setError(e.message); }
    setSplitting(false);
  };

  const MODES = [
    { key:"write",    label:"WRITE",    icon:Pencil    },
    { key:"upload",   label:"UPLOAD",   icon:Upload    },
    { key:"generate", label:"GENERATE", icon:Wand2     },
  ];

  const cardSt = {
    width:380, background:th.card, border:`2px solid ${sel ? th.t0 : th.b0}`,
    borderRadius:14, fontFamily:"'Inter',system-ui,sans-serif",
    boxShadow: sel ? `0 0 0 3px ${th.b1}` : `0 4px 24px ${th.sh}`,
    overflow:"hidden", display:"flex", flexDirection:"column",
  };

  const btnSt = (active) => ({
    flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5,
    background: active ? th.t0 : "transparent",
    border: "none",
    color: active ? "#fff" : th.t3,
    cursor:"pointer", padding:"8px 4px", fontSize:10, letterSpacing:"0.1em",
    fontWeight: active ? 700 : 400,
    fontFamily:"'Inter',system-ui,sans-serif", transition:"all 0.12s",
  });

  return (
    <div style={cardSt}>
      {/* Drag handle — only grabbable surface (no interactive children) */}
      <div style={{ padding:"6px 14px 5px", borderBottom:`1px solid ${th.b0}`, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"grab", background:th.card2, userSelect:"none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Ico icon={ScrollText} size={11} color={th.t3}/>
          <span style={{ fontSize:9, letterSpacing:"0.14em", color:th.t3, fontWeight:600 }}>SCRIPT</span>
        </div>
        <div style={{ display:"flex", gap:3 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <div style={{ width:2, height:2, borderRadius:1, background:th.t4 }}/>
              <div style={{ width:2, height:2, borderRadius:1, background:th.t4 }}/>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div style={{ padding:"10px 14px 10px", borderBottom:`1px solid ${th.b0}`, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:8, height:8, borderRadius:2, background:th.t2, flexShrink:0 }}/>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:12, fontWeight:700,
            color:th.t0, fontFamily:"'Inter',system-ui,sans-serif" }}
        />
        {onInspect && <InspectAction onClick={onInspect} th={th} />}
        <button onClick={onDel} style={{ background:"transparent", border:"none", color:th.t4, cursor:"pointer", fontSize:14, lineHeight:1 }}>✕</button>
      </div>

      {/* Mode tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${th.b0}` }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={btnSt(mode===m.key)}>
            <Ico icon={m.icon} size={10} color={mode===m.key ? "#fff" : th.t3}/>
            {m.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex:1, padding:12, display:"flex", flexDirection:"column", gap:10 }}>

        {/* WRITE mode */}
        {mode === "write" && (
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder={"Write your script here…\n\nINT. CAFÉ - DAY\n\nA woman sits alone, staring at an empty cup…"}
            style={{ flex:1, minHeight:280, background:th.card2, border:`1px solid ${th.b0}`, borderRadius:8,
              color:th.t0, fontSize:11, lineHeight:1.75, padding:"10px 12px", resize:"none",
              outline:"none", fontFamily:"'Courier New', monospace" }}
          />
        )}

        {/* UPLOAD mode */}
        {mode === "upload" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center", justifyContent:"center", minHeight:200 }}>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx,.odt,.md" style={{ display:"none" }} onChange={handleFile}/>
            <button onClick={() => fileRef.current?.click()}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"32px 40px",
                background:th.card2, border:`2px dashed ${th.b0}`, borderRadius:12,
                color:th.t3, cursor:"pointer", width:"100%", transition:"border-color 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=th.t2}
              onMouseLeave={e=>e.currentTarget.style.borderColor=th.b0}>
              {loading
                ? <Ico icon={Loader2} size={28} color={th.t3} style={{animation:"spin 1s linear infinite"}}/>
                : <Ico icon={Upload} size={28} color={th.t3}/>
              }
              <span style={{ fontSize:11, letterSpacing:"0.1em" }}>{loading ? "READING DOCUMENT…" : "CLICK TO UPLOAD DOCUMENT"}</span>
              <span style={{ fontSize:9, color:th.t4 }}>PDF · TXT · DOC · DOCX · ODT</span>
            </button>
            {script && !loading && (
              <div style={{ fontSize:10, color:th.t2 }}>
                ✓ Document loaded — {script.split("\n").length} lines. Switch to WRITE to review.
              </div>
            )}
          </div>
        )}

        {/* GENERATE mode */}
        {mode === "generate" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* Format toggle */}
            <div style={{ display:"flex", background:th.card2, border:`1px solid ${th.b0}`, borderRadius:8, padding:3, gap:3 }}>
              {[{k:"screenplay",l:"Screenplay"},{k:"treatment",l:"Treatment"}].map(f => (
                <button key={f.k} onClick={() => setFormat(f.k)}
                  style={{ flex:1, padding:"7px", fontSize:10, fontWeight:600, letterSpacing:"0.08em",
                    background: format===f.k ? th.t0 : "transparent",
                    border:"none", borderRadius:6,
                    color: format===f.k ? "#fff" : th.t3,
                    cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif", transition:"all 0.12s" }}>
                  {f.l.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Cinematic style picker */}
            <div>
              <div style={{ fontSize:9, color:th.t4, letterSpacing:"0.12em", marginBottom:5 }}>CINEMATIC STYLE <span style={{ color:th.t4, fontWeight:400 }}>(optional)</span></div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {CINEMATIC_STYLES.map(s => {
                  const active = cinematicStyle === s;
                  return (
                    <button key={s} onClick={() => setCinematicStyle(active ? "" : s)}
                      style={{ padding:"4px 10px", fontSize:9, fontWeight:700, letterSpacing:"0.1em",
                        textTransform:"uppercase", borderRadius:20,
                        background: active ? th.t0 : th.card2,
                        border: `1px solid ${active ? th.t0 : th.b0}`,
                        color: active ? "#fff" : th.t3,
                        cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif", transition:"all 0.12s" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <textarea
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder={"Describe your film idea…\n\nE.g. A detective in 1940s noir Paris discovers his missing client was himself all along."}
              rows={5}
              style={{ background:th.card2, border:`1px solid ${th.b0}`, borderRadius:8,
                color:th.t0, fontSize:11, lineHeight:1.75, padding:"10px 12px", resize:"vertical",
                outline:"none", fontFamily:"'Inter',system-ui,sans-serif" }}
            />
            <button onClick={generate} disabled={loading || !idea.trim()}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                background: loading ? th.card3 : th.t0, border:"none", borderRadius:8,
                color:"#fff", fontSize:11, fontWeight:700, letterSpacing:"0.1em",
                padding:"11px", cursor: loading ? "not-allowed" : "pointer",
                fontFamily:"'Inter',system-ui,sans-serif", opacity: !idea.trim() ? 0.5 : 1 }}>
              {loading
                ? <><Ico icon={Loader2} size={13} color="#fff" style={{animation:"spin 1s linear infinite"}}/> GENERATING…</>
                : <><Ico icon={Wand2} size={13} color="#fff"/> GENERATE SCRIPT</>
              }
            </button>
            {script && !loading && (
              <div style={{ fontSize:10, color:th.t2 }}>✓ Script generated. Switch to WRITE to review and edit.</div>
            )}
          </div>
        )}

        {error && <div style={{ fontSize:10, color:"#f87171", padding:"4px 0" }}>{error}</div>}
      </div>

      {/* Footer — split button */}
      <div style={{ padding:"10px 12px", borderTop:`1px solid ${th.b0}` }}>
        <button
          onClick={splitScenes}
          disabled={splitting || !script.trim()}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            background: splitting || !script.trim() ? th.card2 : th.t0,
            border:"none", borderRadius:8, color: !script.trim() ? th.t4 : "#fff",
            fontSize:11, fontWeight:700, letterSpacing:"0.1em", padding:"12px",
            cursor: splitting || !script.trim() ? "not-allowed" : "pointer",
            fontFamily:"'Inter',system-ui,sans-serif", transition:"opacity 0.15s",
            opacity: !script.trim() ? 0.5 : 1 }}>
          {splitting
            ? <><Ico icon={Loader2} size={13} color="#fff" style={{animation:"spin 1s linear infinite"}}/> SPLITTING INTO SCENES…</>
            : <><Ico icon={SplitSquareVertical} size={13} color={!script.trim() ? th.t4 : "#fff"}/> SPLIT INTO SCENES</>
          }
        </button>
        {script && !splitting && (
          <div style={{ fontSize:9, color:th.t4, textAlign:"center", marginTop:6, letterSpacing:"0.06em" }}>
            Creates Scene nodes on the canvas from the script
          </div>
        )}
      </div>
    </div>
  );
}

function LeftDrawer({ open, onToggle, bible }) {
  const th = useTheme();
  const [section,    setSection]    = useState("bible");
  const [assetTab,   setAssetTab]   = useState("images");
  const [assets,     setAssets]     = useState({ images:[], videos:[], audio:[], text:[] });
  const [loading,    setLoading]    = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [textForm,   setTextForm]   = useState({ name:"", content:"", kind:"scene" });
  const [addingText, setAddingText] = useState(false);
  const [viewText,   setViewText]   = useState(null); // { name, content }
  const fileRef = useRef(null);

  // Fetch assets from server
  const loadAssets = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/assets/list", { headers: await authHeaders() });
      if (r.ok) setAssets(await r.json());
    } catch(_) {}
    setLoading(false);
  };

  useEffect(() => { if (section === "assets") loadAssets(); }, [section]);

  // Upload binary file (images / videos / audio)
  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/assets/upload/${assetTab}`, { method:"POST", headers: await authHeaders(), body:fd });
      if (r.ok) await loadAssets();
      else alert("Upload failed: " + await r.text());
    } catch(err) { alert("Upload error: " + err.message); }
    setUploading(false);
  };

  // Save text asset
  const saveText = async () => {
    if (!textForm.name.trim() || !textForm.content.trim()) return;
    try {
      const r = await fetch("/api/assets/text", {
        method:"POST", headers:{ "Content-Type":"application/json", ...await authHeaders() },
        body: JSON.stringify({ name: textForm.name, content: textForm.content }),
      });
      if (r.ok) { await loadAssets(); setAddingText(false); setTextForm({ name:"", content:"", kind:"scene" }); }
      else alert("Save failed: " + await r.text());
    } catch(err) { alert(err.message); }
  };

  // Delete any asset
  const delAsset = async (type, id) => {
    try {
      await fetch(`/api/assets/${type}/${encodeURIComponent(id)}`, { method:"DELETE", headers: await authHeaders() });
      await loadAssets();
    } catch(_) {}
  };

  const SECTIONS = [
    { key:"bible",  label:"BIBLE",  icon:BookOpen  },
    { key:"assets", label:"ASSETS", icon:FolderOpen },
  ];

  const btnUpload = {
    background:"transparent", border:`1px dashed ${th.b0}`, color:th.t3, borderRadius:6,
    padding:"9px 12px", fontSize:11, cursor:"pointer", width:"100%", display:"flex",
    alignItems:"center", justifyContent:"center", gap:6, marginBottom:10,
    fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.08em",
  };

  const inpSt = { background:th.card2, border:`1px solid ${th.b0}`, color:th.t0, borderRadius:5,
    padding:"7px 10px", fontSize:11, fontFamily:"'Inter',system-ui,sans-serif", outline:"none",
    width:"100%", boxSizing:"border-box" };

  const TEXT_KINDS = ["scene prompt","shot prompt","script","notes","other"];

  return (
    <>
      {/* ── TEXT VIEWER MODAL ── */}
      {viewText && (
        <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,0.75)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}
          onClick={e=>{ if(e.target===e.currentTarget) setViewText(null); }}>
          <div style={{ background:th.card, border:`1px solid ${th.b0}`, borderRadius:16,
            width:640, maxHeight:"80vh", display:"flex", flexDirection:"column",
            boxShadow:"0 24px 80px rgba(0,0,0,0.5)", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${th.b0}`,
              display:"flex", alignItems:"center", gap:10 }}>
              <Ico icon={FileText} size={13} color={th.t2}/>
              <span style={{ fontSize:15, fontWeight:700, color:th.t0, flex:1 }}>{viewText.name}</span>
              <button onClick={()=>setViewText(null)}
                style={{ background:"transparent", border:"none", color:th.t3,
                  cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
            </div>
            <pre style={{ flex:1, overflowY:"auto", padding:"18px 20px", margin:0,
              fontSize:12, color:th.t1, lineHeight:1.75, whiteSpace:"pre-wrap",
              fontFamily:"'Inter',system-ui,sans-serif" }}>{viewText.content}</pre>
          </div>
        </div>
      )}

      {/* ── SLIDE-IN DRAWER ── */}
      <div style={{ position:"absolute", left: open?0:-264, top:0, bottom:0, width:264,
        background:th.card, borderRight:`1px solid ${th.b0}`, zIndex:150,
        transition:"left 0.22s ease", display:"flex", flexDirection:"column",
        overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif" }}>

        {/* Section tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${th.b0}`, flexShrink:0 }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)}
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                background: section===s.key ? th.card2 : "transparent", border:"none",
                borderBottom: section===s.key ? `2px solid ${th.t0}` : "2px solid transparent",
                color: section===s.key ? th.t0 : th.t3, cursor:"pointer",
                padding:"13px 6px", fontSize:11, letterSpacing:"0.12em",
                fontWeight: section===s.key ? 700 : 400,
                fontFamily:"'Inter',system-ui,sans-serif", transition:"color 0.12s" }}>
              <Ico icon={s.icon} size={13} color={section===s.key ? th.t0 : th.t3}/>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── BIBLE section ── */}
        {section==="bible" && (
          <div style={{ flex:1, overflowY:"auto", padding:12 }}>
            {["character","object","location"].every(k =>
              !(bible[k==="character"?"characters":k==="object"?"objects":"locations"]||[]).length) && (
              <div style={{ textAlign:"center", padding:"30px 0", color:th.t4, fontSize:11, lineHeight:2 }}>
                No bible entries yet.<br/>
                Click the <Ico icon={BookOpen} size={12} color={th.t4}/> icon in the toolbar.
              </div>
            )}
            {["character","object","location"].map(kind => {
              const lk   = kind==="character"?"characters":kind==="object"?"objects":"locations";
              const list = bible[lk]||[];
              if (!list.length) return null;
              return (
                <div key={kind} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
                    <KindIcon kind={kind} size={12} th={th}/>
                    <span style={{ fontSize:10, letterSpacing:"0.14em", color:th.t3, fontWeight:700 }}>
                      {kind.toUpperCase()}S
                    </span>
                  </div>
                  {list.map(e => (
                    <div key={e.id} style={{ background:th.card2, border:`1px solid ${th.b0}`,
                      borderRadius:8, marginBottom:5, overflow:"hidden", display:"flex", gap:0 }}>
                      {e._imgUrl && (
                        <img src={e._imgUrl} alt={e.name}
                          style={{ width:46, flexShrink:0, objectFit:"cover", display:"block" }}/>
                      )}
                      <div style={{ padding:"7px 9px", minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:th.t0 }}>{e.name}</span>
                          {e.tag && <span style={{ fontSize:9, color:th.t4, fontFamily:"monospace" }}>{e.tag}</span>}
                        </div>
                        {e.description && (
                          <div style={{ fontSize:10, color:th.t2, lineHeight:1.5, marginTop:3,
                            display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                            overflow:"hidden" }}>{e.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ASSETS section ── */}
        {section==="assets" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

            {/* Asset type tabs */}
            <div style={{ display:"flex", gap:2, padding:"6px 8px",
              borderBottom:`1px solid ${th.b0}`, flexShrink:0 }}>
              {ASSET_TABS.map(t => (
                <button key={t.key} onClick={() => setAssetTab(t.key)}
                  style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4,
                    background: assetTab===t.key ? th.card3 : "transparent",
                    border:`1px solid ${assetTab===t.key ? th.b0 : "transparent"}`,
                    color: assetTab===t.key ? th.t0 : th.t3,
                    cursor:"pointer", padding:"6px 2px", fontSize:9, borderRadius:5,
                    fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.06em",
                    fontWeight: assetTab===t.key ? 700 : 400 }}>
                  <Ico icon={t.icon} size={10} color={assetTab===t.key ? th.t0 : th.t3}/>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ flex:1, overflowY:"auto", padding:10 }}>
              {loading && (
                <div style={{ textAlign:"center", padding:"20px 0", color:th.t4, fontSize:11 }}>
                  Loading…
                </div>
              )}

              {/* IMAGES */}
              {!loading && assetTab==="images" && (
                <>
                  <input ref={fileRef} type="file" accept="image/*"
                    style={{ display:"none" }} onChange={handleUpload}/>
                  <button onClick={() => fileRef.current?.click()} style={btnUpload} disabled={uploading}>
                    <Ico icon={Plus} size={12} color={th.t3}/>
                    {uploading ? "UPLOADING…" : "UPLOAD IMAGE"}
                  </button>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {(assets.images||[]).map(a => (
                      <div key={a.id} style={{ position:"relative", borderRadius:7, overflow:"hidden",
                        border:`1px solid ${th.b0}`, background:th.card2 }}>
                        <img src={a.url} alt={a.name}
                          style={{ width:"100%", aspectRatio:"1", objectFit:"cover", display:"block" }}/>
                        <div style={{ padding:"4px 6px" }}>
                          <div style={{ fontSize:9, color:th.t3, overflow:"hidden",
                            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name.replace(/^\d+_/,"")}</div>
                        </div>
                        <button onClick={() => delAsset("images", a.id)}
                          style={{ position:"absolute", top:3, right:3, background:"rgba(0,0,0,0.6)",
                            border:"none", color:"#fff", cursor:"pointer", borderRadius:4,
                            width:18, height:18, fontSize:9, display:"flex",
                            alignItems:"center", justifyContent:"center" }}>✕</button>
                      </div>
                    ))}
                    {!(assets.images||[]).length && (
                      <div style={{ gridColumn:"span 2", textAlign:"center",
                        padding:"20px 0", color:th.t4, fontSize:11 }}>No images yet</div>
                    )}
                  </div>
                </>
              )}

              {/* VIDEOS */}
              {!loading && assetTab==="videos" && (
                <>
                  <input ref={fileRef} type="file" accept="video/*"
                    style={{ display:"none" }} onChange={handleUpload}/>
                  <button onClick={() => fileRef.current?.click()} style={btnUpload} disabled={uploading}>
                    <Ico icon={Plus} size={12} color={th.t3}/>
                    {uploading ? "UPLOADING…" : "UPLOAD VIDEO"}
                  </button>
                  {(assets.videos||[]).map(a => (
                    <div key={a.id} style={{ background:th.card2, border:`1px solid ${th.b0}`,
                      borderRadius:7, padding:"8px 10px", marginBottom:6,
                      display:"flex", alignItems:"center", gap:8 }}>
                      <Ico icon={Video} size={14} color={th.t3}/>
                      <span style={{ flex:1, fontSize:11, color:th.t1, overflow:"hidden",
                        textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name.replace(/^\d+_/,"")}</span>
                      <button onClick={() => delAsset("videos", a.id)}
                        style={{ background:"transparent", border:"none", color:th.t3,
                          cursor:"pointer", fontSize:13, lineHeight:1 }}>✕</button>
                    </div>
                  ))}
                  {!(assets.videos||[]).length && (
                    <div style={{ textAlign:"center", padding:"20px 0", color:th.t4, fontSize:11 }}>No videos yet</div>
                  )}
                </>
              )}

              {/* AUDIO */}
              {!loading && assetTab==="audio" && (
                <>
                  <input ref={fileRef} type="file" accept="audio/*"
                    style={{ display:"none" }} onChange={handleUpload}/>
                  <button onClick={() => fileRef.current?.click()} style={btnUpload} disabled={uploading}>
                    <Ico icon={Plus} size={12} color={th.t3}/>
                    {uploading ? "UPLOADING…" : "UPLOAD AUDIO"}
                  </button>
                  {(assets.audio||[]).map(a => (
                    <div key={a.id} style={{ background:th.card2, border:`1px solid ${th.b0}`,
                      borderRadius:7, padding:"8px 10px", marginBottom:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                        <Ico icon={Film} size={14} color={th.t3}/>
                        <span style={{ flex:1, fontSize:11, color:th.t1, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name.replace(/^\d+_/,"")}</span>
                        <button onClick={() => delAsset("audio", a.id)}
                          style={{ background:"transparent", border:"none", color:th.t3,
                            cursor:"pointer", fontSize:13, lineHeight:1 }}>✕</button>
                      </div>
                      <audio controls src={a.url}
                        style={{ width:"100%", height:30, accentColor:th.t0 }}/>
                    </div>
                  ))}
                  {!(assets.audio||[]).length && (
                    <div style={{ textAlign:"center", padding:"20px 0", color:th.t4, fontSize:11 }}>No audio yet</div>
                  )}
                </>
              )}

              {/* TEXT */}
              {!loading && assetTab==="text" && (
                <>
                  {!addingText && (
                    <button onClick={() => setAddingText(true)} style={btnUpload}>
                      <Ico icon={Plus} size={12} color={th.t3}/> ADD TEXT
                    </button>
                  )}
                  {addingText && (
                    <div style={{ background:th.card3, border:`1px solid ${th.b0}`, borderRadius:8,
                      padding:9, marginBottom:9, display:"flex", flexDirection:"column", gap:6 }}>
                      <input value={textForm.name}
                        onChange={e=>setTextForm(f=>({...f,name:e.target.value}))}
                        placeholder="Title (e.g. Act 1 Scene 3 prompt)…"
                        style={inpSt}/>
                      <select value={textForm.kind}
                        onChange={e=>setTextForm(f=>({...f,kind:e.target.value}))}
                        style={{ ...inpSt, fontSize:11 }}>
                        {TEXT_KINDS.map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                      </select>
                      <textarea value={textForm.content}
                        onChange={e=>setTextForm(f=>({...f,content:e.target.value}))}
                        placeholder="Paste your scene prompt, shot prompt, or full script here…"
                        rows={6} style={{ ...inpSt, resize:"vertical", lineHeight:1.6 }}/>
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={()=>{setAddingText(false);setTextForm({name:"",content:"",kind:"scene"});}}
                          style={{ flex:1, background:"transparent", border:`1px solid ${th.b0}`,
                            color:th.t3, borderRadius:5, padding:"7px", fontSize:11,
                            cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif" }}>Cancel</button>
                        <button onClick={saveText}
                          style={{ flex:1, background:th.t0, border:"none", color:th.bg,
                            borderRadius:5, padding:"7px", fontSize:11, fontWeight:700,
                            cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif" }}>SAVE</button>
                      </div>
                    </div>
                  )}
                  {(assets.text||[]).map(a => (
                    <div key={a.id} style={{ background:th.card2, border:`1px solid ${th.b0}`,
                      borderRadius:7, padding:"8px 9px", marginBottom:6,
                      cursor:"pointer" }}
                      onClick={() => setViewText({ name: a.name.replace(/^\d+_/,"").replace(/\.txt$/,""), content: a.content||"" })}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                        <Ico icon={FileText} size={13} color={th.t3}/>
                        <span style={{ flex:1, fontSize:11, fontWeight:700, color:th.t0,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {a.name.replace(/^\d+_/,"").replace(/\.txt$/,"")}
                        </span>
                        <button onClick={e=>{e.stopPropagation();delAsset("text",a.id);}}
                          style={{ background:"transparent", border:"none", color:th.t3,
                            cursor:"pointer", fontSize:13, lineHeight:1, padding:"0 2px" }}>✕</button>
                      </div>
                      {a.content && (
                        <div style={{ fontSize:10, color:th.t3, lineHeight:1.5,
                          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                          overflow:"hidden" }}>{a.content}</div>
                      )}
                    </div>
                  ))}
                  {!(assets.text||[]).length && !addingText && (
                    <div style={{ textAlign:"center", padding:"20px 0", color:th.t4, fontSize:7 }}>
                      No texts yet — save scene prompts,<br/>shot prompts or scripts here
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toggle pull-tab */}
      <div style={{ position:"absolute", left: open?264:0, top:"50%", transform:"translateY(-50%)",
        zIndex:160, transition:"left 0.22s ease" }}>
        <button onClick={onToggle} title={open?"Close sidebar":"Open sidebar"}
          style={{ background:th.card, border:`1px solid ${th.b0}`, borderLeft:"none",
            color:th.t2, cursor:"pointer", width:18, padding:"16px 2px",
            borderRadius:"0 6px 6px 0", display:"flex", alignItems:"center",
            justifyContent:"center", boxShadow:`2px 0 12px ${th.sh}` }}>
          <Ico icon={PanelLeft} size={10} color={th.t2}/>
        </button>
      </div>
    </>
  );
}


// ─── DRAGGABLE WRAPPER ────────────────────────────────────────────────────────
function Drag({ id, x, y, onMove, onFocus, children, z, zoom=1 }) {
  const onMD = (e) => {
    const tag = e.target.tagName;
    // Allow drag from anywhere except interactive form elements and links
    if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||tag==="BUTTON"||tag==="A") return;
    if(e.button!==0) return;
    e.preventDefault(); e.stopPropagation();
    onFocus();
    const ox=x, oy=y, mx=e.clientX, my=e.clientY;
    // Divide screen-space delta by zoom to get canvas-space delta
    const mv = (ev) => onMove(id, ox+(ev.clientX-mx)/zoom, oy+(ev.clientY-my)/zoom);
    const up = () => { window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",mv);
    window.addEventListener("mouseup",up);
  };
  return (
    <div onMouseDown={onMD} style={{ position:"absolute", left:x, top:y, zIndex:z, userSelect:"none", cursor:"grab" }}>
      {children}
    </div>
  );
}

// ─── EDGE SVG ─────────────────────────────────────────────────────────────────
function Edge({ fx, fy, tx, ty, color }) {
  const mx = fx+(tx-fx)*0.5;
  return <path d={`M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}`} stroke={color} strokeWidth="1.5" fill="none" strokeDasharray="6 3" opacity="0.6" />;
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode,     setMode]     = useState("login"); // "login" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");

  const submit = async () => {
    setError(""); setInfo("");
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true);
    if (mode === "signup") {
      const { error: e } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (e) setError(e.message);
      else setInfo("Account created! Check your email to confirm, then log in.");
    } else {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) setError(e.message);
      else onAuth(data.user);
    }
    setLoading(false);
  };

  const inp = {
    width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:8, padding:"12px 14px", fontSize:13, color:"#e2e8f0",
    fontFamily:"'Inter',system-ui,sans-serif", outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#0d0d0d", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;} body{margin:0;} input::placeholder{color:#4b5563;}`}</style>

      <div style={{ width:380, display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:36 }}>
          <div style={{ width:10, height:10, background:"#f87171", borderRadius:2, boxShadow:"0 0 14px #f87171" }}/>
          <span style={{ fontSize:15, letterSpacing:"0.22em", color:"#e2e8f0", fontWeight:700 }}>CINEMATIC GRAPH</span>
        </div>

        {/* Card */}
        <div style={{ width:"100%", background:"#1a1a1a", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, padding:"32px 32px 28px", boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
          {/* Tabs */}
          <div style={{ display:"flex", marginBottom:28, background:"rgba(255,255,255,0.04)", borderRadius:8, padding:3 }}>
            {["login","signup"].map(m => (
              <button key={m} onClick={()=>{ setMode(m); setError(""); setInfo(""); }}
                style={{ flex:1, padding:"8px", fontSize:12, fontWeight:600, letterSpacing:"0.1em",
                  background: mode===m ? "rgba(255,255,255,0.1)" : "transparent",
                  border:"none", borderRadius:6, color: mode===m ? "#e2e8f0" : "#6b7280",
                  cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif", transition:"all 0.15s" }}>
                {m === "login" ? "LOG IN" : "SIGN UP"}
              </button>
            ))}
          </div>

          {/* Google button */}
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: window.location.origin } })}
            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              background:"#fff", border:"none", borderRadius:8, padding:"12px 14px",
              fontSize:13, fontWeight:600, color:"#1a1a1a", cursor:"pointer",
              fontFamily:"'Inter',system-ui,sans-serif", marginBottom:16, transition:"opacity 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}
          >
            {/* Google G logo */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
            <span style={{ fontSize:10, color:"#4b5563", letterSpacing:"0.08em" }}>OR</span>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {mode === "signup" && (
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="Your name" style={inp}/>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Email address" type="email" style={inp}
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
            <input value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Password" type="password" style={inp}
              onKeyDown={e=>e.key==="Enter"&&submit()}/>

            {error && <div style={{ fontSize:11, color:"#f87171", padding:"6px 0" }}>{error}</div>}
            {info  && <div style={{ fontSize:11, color:"#4ade80", padding:"6px 0" }}>{info}</div>}

            <button onClick={submit} disabled={loading}
              style={{ marginTop:4, padding:"13px", background:"#f87171", border:"none", borderRadius:8,
                color:"#fff", fontSize:13, fontWeight:700, letterSpacing:"0.08em",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                fontFamily:"'Inter',system-ui,sans-serif", transition:"opacity 0.15s" }}>
              {loading ? "…" : mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
            </button>
          </div>
        </div>

        <div style={{ marginTop:20, fontSize:11, color:"#374151", letterSpacing:"0.06em" }}>
          Your data is stored securely in Supabase.
        </div>
      </div>
    </div>
  );
}

// ─── PROJECT PICKER ───────────────────────────────────────────────────────────
function ProjectPicker({ user, onOpen, onNew, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id,name,updated_at,created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setProjects(data || []);
      setLoading(false);
    })();
  }, [user.id]);

  const del = async (id) => {
    setDeleting(id);
    await supabase.from("projects").delete().eq("id", id);
    setProjects(p => p.filter(x => x.id !== id));
    setDeleting(null);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:800, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ width:520, maxHeight:"80vh", background:"#1a1a1a", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.5)", fontFamily:"'Inter',system-ui,sans-serif" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:10 }}>
          <Ico icon={FolderOpenIcon} size={16} color="#94a3b8"/>
          <span style={{ fontSize:14, fontWeight:700, color:"#e2e8f0", flex:1 }}>My Projects</span>
          <button onClick={onNew}
            style={{ background:"#f87171", border:"none", borderRadius:7, padding:"7px 16px", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:"0.08em", fontFamily:"'Inter',system-ui,sans-serif" }}>
            + NEW PROJECT
          </button>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#6b7280", cursor:"pointer", fontSize:18, padding:"0 4px" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:8 }}>
          {loading && <div style={{ textAlign:"center", padding:"30px 0", color:"#4b5563", fontSize:12 }}>Loading…</div>}
          {!loading && !projects.length && (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#4b5563", fontSize:12, lineHeight:2 }}>
              No projects yet.<br/>Click <strong style={{color:"#94a3b8"}}>+ NEW PROJECT</strong> to start.
            </div>
          )}
          {projects.map(p => (
            <div key={p.id}
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"background 0.12s" }}
              onClick={()=>onOpen(p)}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}>
              <Ico icon={Clapperboard} size={18} color="#6b7280"/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:3 }}>{p.name}</div>
                <div style={{ fontSize:10, color:"#4b5563" }}>Last saved {new Date(p.updated_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</div>
              </div>
              <Ico icon={ChevronRight} size={14} color="#374151"/>
              <button onClick={e=>{ e.stopPropagation(); del(p.id); }} disabled={deleting===p.id}
                style={{ background:"transparent", border:"none", color:"#4b5563", cursor:"pointer", fontSize:14, padding:"4px", opacity: deleting===p.id ? 0.4 : 1 }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ESC LISTENER ─────────────────────────────────────────────────────────────
function EscListener({ cb }) {
  useEffect(()=>{ const h=e=>{if(e.key==="Escape")cb();}; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); },[cb]);
  return null;
}


// ─── PROJECT TEMPLATES ────────────────────────────────────────────────────────
// Each template factory returns { nodes, pos, bible } — a fully-built project
// the user can open and immediately edit or generate from.

function makeActionShortFilmTemplate() {
  return makeActionNeoNoirShortFilmTemplate();
  // ── Shared entity definitions ──────────────────────────────────────────────
  const eHero    = { id:`e_${uid()}`, kind:"character", name:"Adrian Vale",   tag:"@hero",    description:"Professional killer, late 30s, black tailored suit, disciplined posture, unreadable face, economical movement", notes:"Protagonist", _imgUrl:"/character_Adrian_Vale.png", _prev:"/character_Adrian_Vale.png", assetId:"ref" };
  const eVillain = { id:`e_${uid()}`, kind:"character", name:"Gregor Sane",   tag:"@villain", description:"Crime broker, 50s, immaculate charcoal overcoat, calm authority, predatory stillness", notes:"Antagonist", _imgUrl:"/character_Gregor_Sane.png", _prev:"/character_Gregor_Sane.png", assetId:"ref" };
  const eDrive   = { id:`e_${uid()}`, kind:"object",    name:"Brass Marker",  tag:"@drive",   description:"Heavy brass blood-oath marker with engraved crest, small enough to vanish in a palm, priceless in the underworld", notes:"MacGuffin",  _imgUrl:"/object_Brass_Marker.png", _prev:"/object_Brass_Marker.png", assetId:"ref" };
  const eBunker  = { id:`e_${uid()}`, kind:"location",  name:"Hotel Lounge",  tag:"@bunker",  description:"Private hotel lounge with amber lamps, dark wood, velvet booths, hushed luxury, old-money menace", notes:"", _imgUrl:"/location_Hotel_Lounge.png", _prev:"/location_Hotel_Lounge.png", assetId:"ref" };
  const eStreets = { id:`e_${uid()}`, kind:"location",  name:"Neon Streets",  tag:"@streets", description:"Rain-slick city streets at night, neon reflections, steam vents, black cars, sodium-vapor spill on wet asphalt", notes:"", _imgUrl:"/location_Neon_Streets.png", _prev:"/location_Neon_Streets.png", assetId:"ref" };
  const eWarehouse={ id:`e_${uid()}`,kind:"location",  name:"Parking Garage", tag:"@warehouse",description:"Concrete parking garage, low ceiling, strip lights, echoing gunshots, pillars and parked sedans shaping the fight", notes:"Ambush point", _imgUrl:"/location_Parking_Garage.png", _prev:"/location_Parking_Garage.png", assetId:"ref" };

  // Trim to scene-bible shape (drop description)
  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||e._prev||"", assetId:e.assetId||"" });

  // ── Scene 1: THE BRIEFING ──────────────────────────────────────────────────
  const sc1id = `sc_${uid()}`;
  const sc1 = {
    id:sc1id, type:T.SCENE, cinematicStyle:"thriller", shotCount:2,
    bible:[ sbEntry(eHero), sbEntry(eDrive), sbEntry(eBunker) ],
    sceneText:`@hero sits alone in a velvet booth inside the @bunker. A waiter places the @drive on the table without a word and disappears. @hero opens it, sees the crest inside, and understands exactly who has called him back into the world he tried to leave. He closes his hand around the @drive, rises, and walks out before the music changes.`,
    directorCoherence:{ score:94, skippedBeats:[], overlapIssues:[], recommendation:"Scene establishes mission stakes cleanly. Both beats — briefing tension and departure resolve — are covered. Coherence is strong." },
  };
  const sh1a = { ...mkShot(sc1id,1), id:`sh_${uid()}`, sceneId:sc1id, index:1, how:"@hero leans forward over the mission dossier, jaw tight, eyes scanning every detail", where:"@bunker — briefing table under low red light", when:"pre-mission, final minutes", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"trap the audience inside his concentration — no escape, no comfort", entityTags:["@hero","@drive","@bunker"], directorNote:"Open on stillness — the danger is internal, not yet physical. Let the red light and tight frame do the threatening.", directorQuality:"good", directorIssue:"" };
  const sh1b = { ...mkShot(sc1id,2), id:`sh_${uid()}`, sceneId:sc1id, index:2, how:"@hero closes his fist around @drive, nods once to handler, turns toward the exit", where:"@bunker — standing at the edge of the briefing table", when:"departure", cameraSize:"medium", cameraAngle:"low-angle", cameraMovement:"static", lens:"50mm", lighting:"natural-soft", visualGoal:"make him look determined but alone — the weight is entirely his", entityTags:["@hero","@drive","@bunker"], directorNote:"The low angle transfers power to him — this is the last moment he is safe. The nod is the point of no return.", directorQuality:"good", directorIssue:"" };
  sh1a.compiledText = compileShotText(sh1a); sh1b.compiledText = compileShotText(sh1b);

  // ── Scene 2: THE PURSUIT ──────────────────────────────────────────────────
  const sc2id = `sc_${uid()}`;
  const sc2 = {
    id:sc2id, type:T.SCENE, cinematicStyle:"action", shotCount:3,
    bible:[ sbEntry(eHero), sbEntry(eDrive), sbEntry(eStreets) ],
    sceneText:`@hero moves fast through crowded @streets, @drive secure inside his jacket. Two of @villain's men spot him at the intersection and close in. @hero breaks into a sprint. He cuts through an alley, vaults a market stall, and disappears into the crowd — but the pursuers are gaining fast.`,
    directorCoherence:{ score:89, skippedBeats:[], overlapIssues:[], recommendation:"Pursuit escalation lands across all three beats. The vault ending leaves the scene open — good bridge into the warehouse trap." },
  };
  const sh2a = { ...mkShot(sc2id,1), id:`sh_${uid()}`, sceneId:sc2id, index:1, how:"@hero weaves through pedestrians, head down, eyes checking over shoulder without breaking pace", where:"@streets — crowded intersection, neon reflections on wet ground", when:"pursuit begins", cameraSize:"over-shoulder", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"35mm", lighting:"neon-lit", visualGoal:"put the audience in his body — claustrophobic crowd, danger invisible but everywhere", entityTags:["@hero","@streets"], directorNote:"Tracking over-shoulder makes the audience a fellow fugitive. The neon kills romantic beauty — this city is hostile.", directorQuality:"good", directorIssue:"" };
  const sh2b = { ...mkShot(sc2id,2), id:`sh_${uid()}`, sceneId:sc2id, index:2, how:"@hero ducks right into alley entrance, two figures enter frame behind him in pursuit", where:"@streets — mouth of a narrow side alley", when:"pursuit escalates", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"handheld", lens:"24mm", lighting:"available-light", visualGoal:"show the geometry closing in — the alley narrows his options as it narrows the frame", entityTags:["@hero","@streets"], directorNote:"Pull to wide here — after the intimacy of the OTS, the sudden space shows how exposed he is. The pursuers entering frame is the punch.", directorQuality:"good", directorIssue:"" };
  const sh2c = { ...mkShot(sc2id,3), id:`sh_${uid()}`, sceneId:sc2id, index:3, how:"@hero places one hand on market stall edge and vaults it in full stride, lands running", where:"@streets — open market section", when:"desperate escape", cameraSize:"full", cameraAngle:"low-angle", cameraMovement:"handheld", lens:"35mm", lighting:"hard-contrast", visualGoal:"pure kinetic release — he is still faster, still alive, the audience exhales", entityTags:["@hero","@streets"], directorNote:"Low angle on the vault is the scene's exhale. He is still ahead — let the audience feel it physically before the next threat arrives.", directorQuality:"good", directorIssue:"" };
  sh2a.compiledText = compileShotText(sh2a); sh2b.compiledText = compileShotText(sh2b); sh2c.compiledText = compileShotText(sh2c);

  // ── Scene 3: THE TRAP ─────────────────────────────────────────────────────
  const sc3id = `sc_${uid()}`;
  const sc3 = {
    id:sc3id, type:T.SCENE, cinematicStyle:"thriller", shotCount:3,
    bible:[ sbEntry(eHero), sbEntry(eVillain), sbEntry(eDrive), sbEntry(eWarehouse) ],
    sceneText:`@hero reaches the handoff point — the @warehouse. He steps inside. It is not empty. @villain stands at the far end, flanked by two armed men. He already knows about the @drive. He wants it. @hero has nowhere to run and five seconds to decide.`,
    directorCoherence:{ score:97, skippedBeats:[], overlapIssues:[], recommendation:"Best scene in the film. Reveal → power display → decision point is a textbook three-beat tension build. No notes." },
  };
  const sh3a = { ...mkShot(sc3id,1), id:`sh_${uid()}`, sceneId:sc3id, index:1, how:"@hero stops mid-step as he sees @villain waiting — reads the room in one second", where:"@warehouse — wide interior, @villain at far end", when:"trap revealed", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"24mm", lighting:"hard-contrast", visualGoal:"let the space between them do the work — distance is threat", entityTags:["@hero","@villain","@warehouse"], directorNote:"Stay static and wide. Do not cut. The stillness and the distance are the trap — movement would release the tension.", directorQuality:"good", directorIssue:"" };
  const sh3b = { ...mkShot(sc3id,2), id:`sh_${uid()}`, sceneId:sc3id, index:2, how:"@villain steps forward into the single overhead light, spreads his hands slightly", where:"@warehouse center — under harsh overhead lamp", when:"standoff begins", cameraSize:"medium", cameraAngle:"slight-low", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"the light crowns him — make the audience feel his complete confidence", entityTags:["@villain","@warehouse"], directorNote:"The overhead light is a crown, not a bulb. His open hands say 'I've already won' without a word. Play the slight-low angle hard.", directorQuality:"good", directorIssue:"" };
  const sh3c = { ...mkShot(sc3id,3), id:`sh_${uid()}`, sceneId:sc3id, index:3, how:"@hero's fingers tighten around the @drive inside his jacket without drawing it", where:"@warehouse — tight on jacket pocket", when:"decision point", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"the whole film compressed into one gesture — what happens next is his choice", entityTags:["@hero","@drive","@warehouse"], directorNote:"The ECU on his hand is the film's thesis. Five seconds of screen time that contain everything. Hold it long enough to hurt.", directorQuality:"good", directorIssue:"" };
  sh3a.compiledText = compileShotText(sh3a); sh3b.compiledText = compileShotText(sh3b); sh3c.compiledText = compileShotText(sh3c);

  // ── Scene 4: THE ESCAPE ───────────────────────────────────────────────────
  const sc4id = `sc_${uid()}`;
  const sc4 = {
    id:sc4id, type:T.SCENE, cinematicStyle:"action", shotCount:3,
    bible:[ sbEntry(eHero), sbEntry(eVillain), sbEntry(eWarehouse), sbEntry(eStreets) ],
    sceneText:`@hero makes his move. He throws a decoy case to draw eyes left. In the half-second of distraction he grabs the nearest guard, pivots him into @villain's line of fire. A shot rings out. The guard takes it. @hero runs. He hits the side door at full speed, bursts into open air, and does not stop.`,
    directorCoherence:{ score:91, skippedBeats:[], overlapIssues:[], recommendation:"Escape sequence covers all critical beats. The final static wide is a strong tonal close — contrast with Scene 2's chaos pays off." },
  };
  const sh4a = { ...mkShot(sc4id,1), id:`sh_${uid()}`, sceneId:sc4id, index:1, how:"@hero grabs guard's wrist, twists, pivots him into @villain's line of fire in one fluid motion", where:"@warehouse interior — close quarters near the side wall", when:"breakout", cameraSize:"medium-close", cameraAngle:"eye-level", cameraMovement:"handheld", lens:"35mm", lighting:"hard-contrast", visualGoal:"violent and fast — no grace, pure survival", entityTags:["@hero","@villain","@warehouse"], directorNote:"Handheld tight. This is not choreography, it's desperation. The violence must feel unplanned to stay believable.", directorQuality:"good", directorIssue:"" };
  const sh4b = { ...mkShot(sc4id,2), id:`sh_${uid()}`, sceneId:sc4id, index:2, how:"@hero sprints low toward the side exit door as a gunshot echoes behind him", where:"@warehouse — long interior, exit door at far end", when:"escape in motion", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"handheld", lens:"24mm", lighting:"available-light", visualGoal:"make the exit feel impossibly far — hold the tension until he hits the door", entityTags:["@hero","@warehouse"], directorNote:"The door should feel unreachable. Wide 24mm makes the space elastic. Don't cut — stay with the sprint.", directorQuality:"good", directorIssue:"" };
  const sh4c = { ...mkShot(sc4id,3), id:`sh_${uid()}`, sceneId:sc4id, index:3, how:"@hero emerges onto empty @streets at a dead run, figure shrinks into the darkness", where:"@streets — empty rain-slicked road at night", when:"escape complete", cameraSize:"extreme-wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"natural-soft", visualGoal:"release — the city swallows him back and the danger dissolves into distance", entityTags:["@hero","@streets"], directorNote:"Cut to static the moment he clears the door. The stillness after the chaos is the actual emotional release. Let him shrink. Let it breathe.", directorQuality:"good", directorIssue:"" };
  sh4a.compiledText = compileShotText(sh4a); sh4b.compiledText = compileShotText(sh4b); sh4c.compiledText = compileShotText(sh4c);

  // ── Assemble ───────────────────────────────────────────────────────────────
  const nodes = [ sc1, sc2, sc3, sc4, sh1a, sh1b, sh2a, sh2b, sh2c, sh3a, sh3b, sh3c, sh4a, sh4b, sh4c ];

  const sceneX    = 80;
  const shotStart = sceneX + 310 + 70; // scene width(310) + 70px gap = 460
  const shotGapX  = 340;               // shot width(268) + 72px gap
  const sceneGapY = 920;               // full scene card (header+textarea+3-4 bible entries+coherence) ≈ 840px + 80px gap
  const rowY = (row) => 80 + row * sceneGapY;
  const pos = {
    [sc1id]:  { x:sceneX, y:rowY(0) },
    [sc2id]:  { x:sceneX, y:rowY(1) },
    [sc3id]:  { x:sceneX, y:rowY(2) },
    [sc4id]:  { x:sceneX, y:rowY(3) },
    [sh1a.id]:{ x:shotStart,           y:rowY(0) },
    [sh1b.id]:{ x:shotStart+shotGapX,  y:rowY(0) },
    [sh2a.id]:{ x:shotStart,           y:rowY(1) },
    [sh2b.id]:{ x:shotStart+shotGapX,  y:rowY(1) },
    [sh2c.id]:{ x:shotStart+shotGapX*2,y:rowY(1) },
    [sh3a.id]:{ x:shotStart,           y:rowY(2) },
    [sh3b.id]:{ x:shotStart+shotGapX,  y:rowY(2) },
    [sh3c.id]:{ x:shotStart+shotGapX*2,y:rowY(2) },
    [sh4a.id]:{ x:shotStart,           y:rowY(3) },
    [sh4b.id]:{ x:shotStart+shotGapX,  y:rowY(3) },
    [sh4c.id]:{ x:shotStart+shotGapX*2,y:rowY(3) },
  };

  const bible = {
    characters: [ eHero, eVillain ],
    objects:    [ eDrive ],
    locations:  [ eBunker, eStreets, eWarehouse ],
  };

  return { nodes, pos, bible };
}

function makeActionNeoNoirShortFilmTemplate() {
  const eHero = { id:`e_${uid()}`, kind:"character", name:"Adrian Vale", tag:"@hero", description:"Professional killer, late 30s, black tailored suit, disciplined posture, unreadable face, economical movement", notes:"Protagonist", _imgUrl:"/character_Adrian_Vale.png", _prev:"/character_Adrian_Vale.png", assetId:"ref" };
  const eVillain = { id:`e_${uid()}`, kind:"character", name:"Gregor Sane", tag:"@villain", description:"Crime broker, 50s, immaculate charcoal overcoat, calm authority, predatory stillness", notes:"Antagonist", _imgUrl:"/character_Gregor_Sane.png", _prev:"/character_Gregor_Sane.png", assetId:"ref" };
  const eDrive = { id:`e_${uid()}`, kind:"object", name:"Brass Marker", tag:"@drive", description:"Heavy brass blood-oath marker with engraved crest, small enough to vanish in a palm, priceless in the underworld", notes:"MacGuffin", _imgUrl:"/object_Brass_Marker.png", _prev:"/object_Brass_Marker.png", assetId:"ref" };
  const eBunker = { id:`e_${uid()}`, kind:"location", name:"Hotel Lounge", tag:"@bunker", description:"Private hotel lounge with amber lamps, dark wood, velvet booths, hushed luxury, old-money menace", notes:"", _imgUrl:"/location_Hotel_Lounge.png", _prev:"/location_Hotel_Lounge.png", assetId:"ref" };
  const eStreets = { id:`e_${uid()}`, kind:"location", name:"Neon Streets", tag:"@streets", description:"Rain-slick city streets at night, neon reflections, steam vents, black cars, sodium-vapor spill on wet asphalt", notes:"", _imgUrl:"/location_Neon_Streets.png", _prev:"/location_Neon_Streets.png", assetId:"ref" };
  const eWarehouse = { id:`e_${uid()}`, kind:"location", name:"Parking Garage", tag:"@warehouse", description:"Concrete parking garage, low ceiling, strip lights, echoing gunshots, pillars and parked sedans shaping the fight", notes:"Ambush point", _imgUrl:"/location_Parking_Garage.png", _prev:"/location_Parking_Garage.png", assetId:"ref" };

  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||e._prev||"", assetId:e.assetId||"" });

  const sc1id = `sc_${uid()}`;
  const sc1 = {
    id:sc1id, type:T.SCENE, cinematicStyle:"thriller", shotCount:2,
    bible:[ sbEntry(eHero), sbEntry(eDrive), sbEntry(eBunker) ],
    sceneText:`@hero sits alone in a velvet booth inside the @bunker. A waiter places the @drive on the table without a word and disappears. @hero opens it, sees the crest inside, and understands exactly who has called him back into the world he tried to leave. He closes his hand around the @drive, rises, and walks out before the music changes.`,
    directorCoherence:{ score:95, skippedBeats:[], overlapIssues:[], recommendation:"Scene establishes the code, the history, and the point of no return with clean economy. The stillness is doing the work." },
  };
  const sh1a = { ...mkShot(sc1id,1), id:`sh_${uid()}`, sceneId:sc1id, index:1, sourceAnchor:"@hero opens it, sees the crest inside, and understands exactly who has called him back", how:"@hero studies the opened @drive in silence, amber lamp glow catching the brass while his expression barely changes", where:"@bunker - private booth beneath warm lamp light", when:"summons received", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"practical-warm", visualGoal:"make the ritual feel intimate and dangerous - all the history is inside one object and one face", entityTags:["@hero","@drive","@bunker"], directorNote:"Open on stillness and control. This world should feel luxurious and lethal at the same time. Let the brass and the eyes carry the tension.", visualHint:"tight locked-off close-up on brass object and face, shallow depth of field, zero camera movement, amber lamp as sole light source", directorQuality:"good", directorIssue:"" };
  const sh1b = { ...mkShot(sc1id,2), id:`sh_${uid()}`, sceneId:sc1id, index:2, sourceAnchor:"He closes his hand around the @drive, rises, and walks out before the music changes", how:"@hero closes the @drive, slips it inside his jacket, rises from the booth, and crosses the lounge without looking back", where:"@bunker - dark wood lounge toward the exit", when:"the decision is made", cameraSize:"medium", cameraAngle:"slight-low", cameraMovement:"slow-push-in", lens:"50mm", lighting:"practical-warm", visualGoal:"show commitment without speech - the body decides before the mind can hesitate", entityTags:["@hero","@drive","@bunker"], directorNote:"The push should feel like fate tightening. No flourish, no rush - just total commitment in one clean movement.", visualHint:"slow continuous push-in on subject walking away, steady pace matching his stride, no cuts, frame tightening as he reaches exit", directorQuality:"good", directorIssue:"" };
  sh1a.compiledText = compileShotText(sh1a); sh1b.compiledText = compileShotText(sh1b);

  const sc2id = `sc_${uid()}`;
  const sc2 = {
    id:sc2id, type:T.SCENE, cinematicStyle:"action", shotCount:3,
    bible:[ sbEntry(eHero), sbEntry(eDrive), sbEntry(eStreets) ],
    sceneText:`@hero exits onto the @streets, @drive hidden inside his jacket. A black sedan rolls past too slowly. Two shooters step out under neon and begin to close the distance. @hero does not panic. He changes direction once, cuts through a narrow service alley, and turns the chase into a series of controlled collisions through the wet city night.`,
    directorCoherence:{ score:92, skippedBeats:[], overlapIssues:[], recommendation:"The pursuit escalates through decision and geometry rather than generic running. Good bridge into the garage ambush." },
  };
  const sh2a = { ...mkShot(sc2id,1), id:`sh_${uid()}`, sceneId:sc2id, index:1, sourceAnchor:"A black sedan rolls past too slowly. Two shooters step out under neon and begin to close the distance", how:"@hero moves through the wet @streets at controlled speed, clocking the black sedan in the reflection before the shooters appear behind him", where:"@streets - neon storefronts and wet asphalt", when:"pursuit begins", cameraSize:"over-shoulder", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"35mm", lighting:"neon-lit", visualGoal:"put the audience inside his tactical awareness - danger arrives first as reflection and rhythm", entityTags:["@hero","@streets"], directorNote:"Track close and steady. The city should feel elegant and hostile, and the realization should happen before the audience fully catches up.", visualHint:"over-shoulder tracking shot, camera tight on subject, sedan and shooters visible only in wet window reflection before direct eye contact", directorQuality:"good", directorIssue:"" };
  const sh2b = { ...mkShot(sc2id,2), id:`sh_${uid()}`, sceneId:sc2id, index:2, sourceAnchor:"He changes direction once, cuts through a narrow service alley", how:"@hero cuts into a narrow service alley, one shooter following tight while another tries to flank from the far mouth", where:"@streets - tight alley framed by pipes, steam, and wet brick", when:"geometry closes", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"24mm", lighting:"available-light", visualGoal:"make the environment part of the fight - the alley is a tactical diagram closing around him", entityTags:["@hero","@streets"], directorNote:"The wide frame should clarify the trap, not scramble it. This is pressure through space, not just speed.", visualHint:"wide static frame showing full alley geometry, both entry points visible simultaneously, subject centred between closing threats, no handheld shake", directorQuality:"good", directorIssue:"" };
  const sh2c = { ...mkShot(sc2id,3), id:`sh_${uid()}`, sceneId:sc2id, index:3, sourceAnchor:"turns the chase into a series of controlled collisions through the wet city night", how:"@hero slams one pursuer into a metal shutter, redirects his momentum, and keeps moving without breaking stride", where:"@streets - service alley mouth back into the avenue", when:"precision violence", cameraSize:"full", cameraAngle:"slight-low", cameraMovement:"tracking", lens:"35mm", lighting:"hard-contrast", visualGoal:"show elegant brutality in motion - one efficient impact buys him one more second of life", entityTags:["@hero","@streets"], directorNote:"Treat the hit as choreography, not chaos. The motion should feel brutally clean and immediately useful.", visualHint:"full-body tracking shot, single clean impact into metal surface, subject immediately continues forward without pause, high contrast hard shadows", directorQuality:"good", directorIssue:"" };
  sh2a.compiledText = compileShotText(sh2a); sh2b.compiledText = compileShotText(sh2b); sh2c.compiledText = compileShotText(sh2c);

  const sc3id = `sc_${uid()}`;
  const sc3 = {
    id:sc3id, type:T.SCENE, cinematicStyle:"thriller", shotCount:3,
    bible:[ sbEntry(eHero), sbEntry(eVillain), sbEntry(eDrive), sbEntry(eWarehouse) ],
    sceneText:`@hero enters the @warehouse and immediately understands the mistake. The upper level lights flicker on one bank at a time. @villain is already there, leaning against a black sedan as if he has been waiting all night. Two gunmen hold the exits. @villain wants the @drive, but what he really wants is @hero back under his control. No one raises a weapon yet. The silence is the threat.`,
    directorCoherence:{ score:96, skippedBeats:[], overlapIssues:[], recommendation:"The ambush lands through stillness, hierarchy, and geography. The pause before violence makes the breakout hit harder." },
  };
  const sh3a = { ...mkShot(sc3id,1), id:`sh_${uid()}`, sceneId:sc3id, index:1, sourceAnchor:"@hero enters the @warehouse and immediately understands the mistake. The upper level lights flicker on one bank at a time", how:"@hero stops between concrete pillars as the lights rise in stages and reveal @villain waiting beside a black sedan", where:"@warehouse - open garage floor with pillars and parked cars", when:"ambush revealed", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"24mm", lighting:"hard-contrast", visualGoal:"let the space, the cars, and the distance establish the rules of the coming fight", entityTags:["@hero","@villain","@warehouse"], directorNote:"Stay wide and exact. The audience must understand the geometry before anyone moves.", visualHint:"locked-off wide frame, both figures separated by maximum distance, pillars and parked cars filling the space between them, lights activating from background to foreground", directorQuality:"good", directorIssue:"" };
  const sh3b = { ...mkShot(sc3id,2), id:`sh_${uid()}`, sceneId:sc3id, index:2, sourceAnchor:"@villain is already there, leaning against a black sedan as if he has been waiting all night", how:"@villain pushes off the sedan and steps into the strip light, calm enough to seem almost bored", where:"@warehouse - under cold ceiling light near the sedan", when:"control is asserted", cameraSize:"medium", cameraAngle:"slight-low", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"make his stillness more intimidating than a shouted threat", entityTags:["@villain","@warehouse"], directorNote:"He should feel untouchable here. The power is in the lack of hurry.", visualHint:"static slight-low medium shot, subject steps deliberately into single overhead strip light, deliberate unhurried movement, deep shadow behind him", directorQuality:"good", directorIssue:"" };
  const sh3c = { ...mkShot(sc3id,3), id:`sh_${uid()}`, sceneId:sc3id, index:3, sourceAnchor:"No one raises a weapon yet. The silence is the threat.", how:"@hero's hand settles over the @drive inside his jacket while his eyes measure the pillars, exits, and nearest body", where:"@warehouse - tight on jacket line and hand", when:"decision point", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"compress strategy, fear, and commitment into one tiny controlled gesture", entityTags:["@hero","@drive","@warehouse"], directorNote:"Hold until the audience feels the calculation. This is the breath before the storm.", visualHint:"extreme close-up on jacket and hand, locked frame, eyes scanning visible over shoulder, held on single still gesture with no cut", directorQuality:"good", directorIssue:"" };
  sh3a.compiledText = compileShotText(sh3a); sh3b.compiledText = compileShotText(sh3b); sh3c.compiledText = compileShotText(sh3c);

  const sc4id = `sc_${uid()}`;
  const sc4 = {
    id:sc4id, type:T.SCENE, cinematicStyle:"action", shotCount:3,
    bible:[ sbEntry(eHero), sbEntry(eVillain), sbEntry(eWarehouse), sbEntry(eStreets) ],
    sceneText:`@hero moves first. He flashes the @drive just long enough to pull every eye toward his hand, then crashes into the nearest gunman and turns the garage into a close-quarters maze of bodies, pillars, and muzzle flashes. One man drops. Another loses his weapon. @villain fires late. @hero uses the confusion to break for the ramp and burst back onto the wet @streets, leaving the echo of the fight behind him.`,
    directorCoherence:{ score:93, skippedBeats:[], overlapIssues:[], recommendation:"The breakout pays off the garage geometry and lands in precise close-quarters violence instead of generic panic. Strong tonal finish." },
  };
  const sh4a = { ...mkShot(sc4id,1), id:`sh_${uid()}`, sceneId:sc4id, index:1, sourceAnchor:"crashes into the nearest gunman and turns the garage into a close-quarters maze of bodies, pillars, and muzzle flashes", how:"@hero crashes into the nearest gunman, traps the weapon arm, redirects the body, and turns the first shot into cover", where:"@warehouse interior - close quarters between pillars and sedan", when:"breakout begins", cameraSize:"medium-close", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"35mm", lighting:"hard-contrast", visualGoal:"show elegant brutality - one precise chain of movement changes the whole room", entityTags:["@hero","@villain","@warehouse"], directorNote:"This should feel choreographed, not messy. Every beat must read: trap, turn, fire, release.", visualHint:"medium-close tracking shot following clean sequential body contact — grip, redirect, discharge — each phase distinct and fully visible before next begins", directorQuality:"good", directorIssue:"" };
  const sh4b = { ...mkShot(sc4id,2), id:`sh_${uid()}`, sceneId:sc4id, index:2, sourceAnchor:"@hero uses the confusion to break for the ramp and burst back onto the wet @streets", how:"@hero moves low and fast through the garage ramp while muzzle flashes burst behind him and concrete chips off the pillars", where:"@warehouse - ramp to street level", when:"escape in motion", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"24mm", lighting:"available-light", visualGoal:"make the route out feel long, exact, and barely survivable", entityTags:["@hero","@warehouse"], directorNote:"Keep orientation crystal clear. The audience should understand exactly how he is using the space to stay alive.", visualHint:"wide tracking shot following subject low along ramp centreline, entrance visible behind and exit visible ahead, muzzle flash bursts marking distance behind him", directorQuality:"good", directorIssue:"" };
  const sh4c = { ...mkShot(sc4id,3), id:`sh_${uid()}`, sceneId:sc4id, index:3, sourceAnchor:"burst back onto the wet @streets, leaving the echo of the fight behind him", how:"@hero bursts back onto the rain-slicked @streets, slows only once, and disappears into the neon darkness", where:"@streets - empty avenue washed in neon and sodium light", when:"escape complete", cameraSize:"extreme-wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"natural-soft", visualGoal:"end on lonely professionalism - the city takes him back like it was waiting", entityTags:["@hero","@streets"], directorNote:"Cut to stillness the instant he clears the ramp. Let the release come from distance, silence, and wet light.", visualHint:"extreme wide static frame, subject emerges from lower edge and decelerates to walk, neon-wet empty street, figure shrinking into distance before cut", directorQuality:"good", directorIssue:"" };
  sh4a.compiledText = compileShotText(sh4a); sh4b.compiledText = compileShotText(sh4b); sh4c.compiledText = compileShotText(sh4c);

  const nodes = [ sc1, sc2, sc3, sc4, sh1a, sh1b, sh2a, sh2b, sh2c, sh3a, sh3b, sh3c, sh4a, sh4b, sh4c ];

  const sceneX = 80;
  const shotStart = sceneX + 310 + 70;
  const shotGapX = 340;
  const sceneGapY = 920;
  const rowY = (row) => 80 + row * sceneGapY;
  const pos = {
    [sc1id]: { x:sceneX, y:rowY(0) },
    [sc2id]: { x:sceneX, y:rowY(1) },
    [sc3id]: { x:sceneX, y:rowY(2) },
    [sc4id]: { x:sceneX, y:rowY(3) },
    [sh1a.id]: { x:shotStart, y:rowY(0) },
    [sh1b.id]: { x:shotStart + shotGapX, y:rowY(0) },
    [sh2a.id]: { x:shotStart, y:rowY(1) },
    [sh2b.id]: { x:shotStart + shotGapX, y:rowY(1) },
    [sh2c.id]: { x:shotStart + shotGapX * 2, y:rowY(1) },
    [sh3a.id]: { x:shotStart, y:rowY(2) },
    [sh3b.id]: { x:shotStart + shotGapX, y:rowY(2) },
    [sh3c.id]: { x:shotStart + shotGapX * 2, y:rowY(2) },
    [sh4a.id]: { x:shotStart, y:rowY(3) },
    [sh4b.id]: { x:shotStart + shotGapX, y:rowY(3) },
    [sh4c.id]: { x:shotStart + shotGapX * 2, y:rowY(3) },
  };

  const bible = {
    characters: [ eHero, eVillain ],
    objects: [ eDrive ],
    locations: [ eBunker, eStreets, eWarehouse ],
  };

  return { nodes, pos, bible };
}

// ─── TEMPLATE: HIP HOP CAMPAIGN ───────────────────────────────────────────────
// Product campaign for a modern hip hop bomber jacket.
// Workflow: generate the two REFERENCE Image nodes first → Save as Bible Ref →
// then generate all scene shots with full visual consistency.
function makeHipHopCampaignTemplate() {
  // ── Global bible entities ────────────────────────────────────────────────────
  const eJacket  = { id:`e_${uid()}`, kind:"object",    name:"Bomber Jacket",    tag:"@jacket",  description:"Oversized baggy hip hop bomber jacket — the style worn by rap artists, NOT a motorcycle or biker jacket. Alpha Industries MA-1 silhouette: very roomy and boxy, olive green nylon shell, black faux-fur collar, silver front zipper, small sleeve zip pocket with red hanging tab, olive ribbed cuffs and waistband. Large bold white 'MC' letters on the back. Hip hop streetwear energy — big, loud, confident.", notes:"Hero product — oversized hip hop MA-1 olive bomber. NOT motorcycle style. Key: boxy fit, olive nylon, black fur collar, white MC back print.", _imgUrl:"", assetId:"" };
  const eTalent  = { id:`e_${uid()}`, kind:"character", name:"The Creative",     tag:"@talent",  description:"Young creative, early 20s, South London, relaxed confidence, sharp eyes, authentic streetwear energy — wears @jacket as natural extension of identity", notes:"Primary talent — generate reference portrait first and save to bible", _imgUrl:"", assetId:"" };
  const eCrew    = { id:`e_${uid()}`, kind:"character", name:"The Collective",   tag:"@crew",    description:"Group of 3–4 young creatives, diverse, unified by shared aesthetic and authentic urban energy, each styling @jacket individually", notes:"Supporting cast — appear in Scenes 3 and 4", _imgUrl:"", assetId:"" };
  const eStreet  = { id:`e_${uid()}`, kind:"location",  name:"East London Street",tag:"@street", description:"East London, brick walls with fading murals, wet pavement reflecting amber sodium lamps, evening after light rain, quiet between two moments of life", notes:"Primary urban location", _imgUrl:"", assetId:"" };
  const eRooftop = { id:`e_${uid()}`, kind:"location",  name:"Rooftop",          tag:"@rooftop", description:"Urban rooftop at golden hour, London skyline soft in haze, raw concrete, industrial HVAC units, open sky bleeding orange into blue", notes:"Collective / golden hour location", _imgUrl:"", assetId:"" };
  const eVenue   = { id:`e_${uid()}`, kind:"location",  name:"Underground Venue", tag:"@venue",  description:"Intimate underground music venue, low ceiling, exposed brick, warm amber and red stage lighting, wooden floor, smell of history", notes:"Night / energy location", _imgUrl:"", assetId:"" };

  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||e._prev||"", assetId:e.assetId||"" });

  // ── Scene 1: HERO REVEAL ─────────────────────────────────────────────────────
  const sc1id = `sc_${uid()}`;
  const sc1 = {
    id:sc1id, type:T.SCENE, cinematicStyle:"documentary", shotCount:2,
    bible:[ sbEntry(eJacket), sbEntry(eTalent), sbEntry(eStreet) ],
    sceneText:`@jacket is presented alone against @street. No performance, no context — just the object under a single directional light. The dark olive nylon shell sits heavy and military. The black fur collar frames the top. The white MC logo reads bold across the chest. Then @talent steps into frame from below, reaches up and pulls @jacket on in one fluid motion. The camera doesn't move. This is the identity moment — the product and the person become the same thing.`,
    directorCoherence:{ score:96, skippedBeats:[], overlapIssues:[], recommendation:"Two-beat structure is clean: product isolation → human adoption. No notes. The stillness is the strategy." },
  };
  const sh1a = { ...mkShot(sc1id,1), id:`sh_${uid()}`, sceneId:sc1id, index:1, how:"Camera holds on @jacket hung against a bare section of @street brick, lit from camera-left by a single amber sodium lamp, no movement", where:"@street — clean brick wall section, evening", when:"product isolation", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"Let the product speak before any personality arrives. The viewer should want to reach for it before they see anyone wearing it.", entityTags:["@jacket","@street"], directorNote:"85mm compression removes all environment except brick and light. The jacket must own the frame entirely. Do not cut. Do not move.", directorQuality:"good", directorIssue:"" };
  const sh1b = { ...mkShot(sc1id,2), id:`sh_${uid()}`, sceneId:sc1id, index:2, how:"@talent steps into frame from below, pulls @jacket on in one motion, faces camera — jacket settles, @talent holds still", where:"@street — same wall, @talent now occupying the frame", when:"identity reveal", cameraSize:"full", cameraAngle:"slight-low", cameraMovement:"static", lens:"50mm", lighting:"natural-soft", visualGoal:"Product and person are now one. The slight-low angle transfers ownership — this is their jacket, not a product shot.", entityTags:["@jacket","@talent","@street"], directorNote:"Keep it still. The action already happened — the jacket is on. Now just let them exist together in the same light. That's the ad.", directorQuality:"good", directorIssue:"" };
  sh1a.compiledText = compileShotText(sh1a); sh1b.compiledText = compileShotText(sh1b);

  // ── Scene 2: STREET ENERGY ───────────────────────────────────────────────────
  const sc2id = `sc_${uid()}`;
  const sc2 = {
    id:sc2id, type:T.SCENE, cinematicStyle:"action", shotCount:3,
    bible:[ sbEntry(eJacket), sbEntry(eTalent), sbEntry(eStreet) ],
    sceneText:`@talent moves through @street with complete natural confidence. @jacket is in motion — the dark olive nylon shell catching sodium light, the black fur collar up around the jaw, the white MC logo visible as the body turns. Military green silhouette reading sharp against the urban texture. This is not performance. @talent is not modelling. They are simply going somewhere, and @jacket is part of how they move through the world.`,
    directorCoherence:{ score:92, skippedBeats:[], overlapIssues:[], recommendation:"Three-beat movement arc — environment, product detail, presence — covers the scene brief. Handheld energy is the right call throughout." },
  };
  const sh2a = { ...mkShot(sc2id,1), id:`sh_${uid()}`, sceneId:sc2id, index:1, how:"@talent walks directly away from camera through @street, @jacket silhouette reading clean against amber reflections on wet pavement", where:"@street — wet section, neon and sodium reflections", when:"in motion", cameraSize:"full", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"35mm", lighting:"neon-lit", visualGoal:"Product silhouette and city texture together — this is the world the jacket belongs in, not a studio", entityTags:["@jacket","@talent","@street"], directorNote:"Track steady — not handheld, not Steadicam, just follow at a respectful distance. The city should feel lived-in, not art-directed.", directorQuality:"good", directorIssue:"" };
  const sh2b = { ...mkShot(sc2id,2), id:`sh_${uid()}`, sceneId:sc2id, index:2, how:"Extreme close-up on @jacket chest as @talent walks — white MC logo bold against the dark olive nylon, the black fur collar edge visible at top of frame, matte olive nylon fabric shifting with each step under the sodium lamp", where:"@street — in motion, tight on jacket chest, MC logo centred", when:"product detail", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"handheld", lens:"85mm macro", lighting:"available-light", visualGoal:"White MC logo on dark olive nylon. Black fur collar above it. Military green and white — the brand in one frame.", entityTags:["@jacket"], directorNote:"Fill the frame with the MC logo. White on olive green. Black fur collar just kissing the top edge. That contrast is the brand.", directorQuality:"good", directorIssue:"" };
  const sh2c = { ...mkShot(sc2id,3), id:`sh_${uid()}`, sceneId:sc2id, index:3, how:"@talent stops at a street corner, looks both ways with quiet confidence — @jacket collar up, hands in pockets", where:"@street — intersection, full environment visible", when:"presence moment", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"natural-soft", visualGoal:"Stillness after movement — @talent is completely at home in this environment and in this jacket. Neither is performing.", entityTags:["@jacket","@talent","@street"], directorNote:"Let them pause naturally. The city goes on around them. This is the shot that builds identity — not action, just being.", directorQuality:"good", directorIssue:"" };
  sh2a.compiledText = compileShotText(sh2a); sh2b.compiledText = compileShotText(sh2b); sh2c.compiledText = compileShotText(sh2c);

  // ── Scene 3: THE COLLECTIVE ──────────────────────────────────────────────────
  const sc3id = `sc_${uid()}`;
  const sc3 = {
    id:sc3id, type:T.SCENE, cinematicStyle:"drama", shotCount:3,
    bible:[ sbEntry(eJacket), sbEntry(eTalent), sbEntry(eCrew), sbEntry(eRooftop) ],
    sceneText:`@talent and @crew gather on @rooftop at golden hour. Each person styles @jacket differently — collar up or down, zipped or open, layered or worn alone. Unity through a shared piece, identity through individual expression. The skyline softens behind them. No one is looking at the camera. They are just together, which is the point.`,
    directorCoherence:{ score:94, skippedBeats:[], overlapIssues:[], recommendation:"Community beat lands in all three shots. The move from wide to individual to detail is textbook but works — do not skip the wide or the closing ECU." },
  };
  const sh3a = { ...mkShot(sc3id,1), id:`sh_${uid()}`, sceneId:sc3id, index:1, how:"@crew and @talent stand in a loose group on @rooftop, golden hour light raking across them from the right, skyline soft behind", where:"@rooftop — open sky, London skyline haze", when:"collective moment, golden hour", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"35mm", lighting:"natural-soft", visualGoal:"Community — the jacket connects these people. Wide enough to feel the environment, close enough to read faces.", entityTags:["@jacket","@talent","@crew","@rooftop"], directorNote:"Do not art-direct the group too much. The imperfect natural positioning is what makes it feel real. Golden light does the rest.", directorQuality:"good", directorIssue:"" };
  const sh3b = { ...mkShot(sc3id,2), id:`sh_${uid()}`, sceneId:sc3id, index:2, how:"Individual portraits — each member of @crew in their own frame, styled differently, confidence shared", where:"@rooftop — tight against the sky edge", when:"individual expression", cameraSize:"medium-close", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"natural-soft", visualGoal:"Four different people, one jacket, four different statements. Diversity of expression is the product's identity.", entityTags:["@jacket","@crew","@rooftop"], directorNote:"Cut these as a sequence — same framing, same angle, just different people. The repetition makes the point without saying it.", directorQuality:"good", directorIssue:"" };
  const sh3c = { ...mkShot(sc3id,3), id:`sh_${uid()}`, sceneId:sc3id, index:3, how:"@talent and one crew member shoulder to shoulder, looking at the skyline — @jacket details visible across both in the same light", where:"@rooftop — at the edge, skyline behind", when:"closing connection", cameraSize:"medium", cameraAngle:"slight-low", cameraMovement:"static", lens:"50mm", lighting:"natural-soft", visualGoal:"Two people, one aesthetic, shared world. This is the emotional close of the scene.", entityTags:["@jacket","@talent","@crew","@rooftop"], directorNote:"Slight-low keeps both figures strong against the sky. Don't talk. Don't move. Let the light do the last ten seconds.", directorQuality:"good", directorIssue:"" };
  sh3a.compiledText = compileShotText(sh3a); sh3b.compiledText = compileShotText(sh3b); sh3c.compiledText = compileShotText(sh3c);

  // ── Scene 4: NIGHT FREQUENCY ─────────────────────────────────────────────────
  const sc4id = `sc_${uid()}`;
  const sc4 = {
    id:sc4id, type:T.SCENE, cinematicStyle:"noir", shotCount:3,
    bible:[ sbEntry(eJacket), sbEntry(eTalent), sbEntry(eCrew), sbEntry(eVenue) ],
    sceneText:`@talent and @crew arrive at @venue. Warm amber light spills through the door as it opens. Inside, motion. The @jacket reads under stage lighting — dark olive nylon warming under amber beams, black fur collar catching the light at the jaw, white MC logo burning clean against the military green. End on quiet: @talent alone, @jacket open, fur collar framing the face, looking back at the camera before turning away. The night is just beginning.`,
    directorCoherence:{ score:95, skippedBeats:[], overlapIssues:[], recommendation:"Arrival → energy → closing portrait is the right arc. The final look-back is the campaign's emotional signature — protect it." },
  };
  const sh4a = { ...mkShot(sc4id,1), id:`sh_${uid()}`, sceneId:sc4id, index:1, how:"@venue door opens, warm amber light floods out — @talent steps in first, @crew follow, @jacket catching the light at the threshold", where:"@venue — doorway, exterior to interior transition", when:"arrival", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"24mm", lighting:"available-light", visualGoal:"The door opening is a reveal — the jacket crosses from cold street light into warm venue amber. That colour shift is the emotional transition.", entityTags:["@jacket","@talent","@crew","@venue"], directorNote:"Hold on the exterior as the door opens. Let the warmth come to camera. Don't follow inside immediately — make the viewer want to enter.", directorQuality:"good", directorIssue:"" };
  const sh4b = { ...mkShot(sc4id,2), id:`sh_${uid()}`, sceneId:sc4id, index:2, how:"@talent in @venue interior, stage light from above — dark olive nylon warming under the beam, white MC logo blazing against the military green, black fur collar catching the light at the jaw, motion blur from the energy all around", where:"@venue — interior, stage light zone", when:"peak energy", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"handheld", lens:"35mm", lighting:"neon-lit", visualGoal:"MA-1 olive bomber under performance lighting — white MC on dark green, black fur collar, energy. The jacket is the event.", entityTags:["@jacket","@talent","@venue"], directorNote:"Stage light warms the olive nylon. White MC logo on military green is the brand. Black fur collar frames the face. Motion blur is the energy.", directorQuality:"good", directorIssue:"" };
  const sh4c = { ...mkShot(sc4id,3), id:`sh_${uid()}`, sceneId:sc4id, index:3, how:"@talent alone at the edge of @venue's light, @jacket open, looks back once at camera — holds for two seconds — turns and walks into the dark", where:"@venue — edge of stage light", when:"closing portrait", cameraSize:"medium-close", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"The campaign's signature moment — acknowledgement without performance. @talent sees you, then moves on. That look is the brand's attitude.", entityTags:["@jacket","@talent","@venue"], directorNote:"Two seconds of eye contact then they're gone. Don't cut before they disappear into the dark. The darkness is the last thing the audience should see.", directorQuality:"good", directorIssue:"" };
  sh4a.compiledText = compileShotText(sh4a); sh4b.compiledText = compileShotText(sh4b); sh4c.compiledText = compileShotText(sh4c);

  // ── Reference Image nodes — one per bible entity ──────────────────────────────
  // Generate all 6 first → Save as Bible Ref on each → then generate scenes
  const refJacketId  = `img_${uid()}`;
  const refTalentId  = `img_${uid()}`;
  const refCrewId    = `img_${uid()}`;
  const refStreetId  = `img_${uid()}`;
  const refRooftopId = `img_${uid()}`;
  const refVenueId   = `img_${uid()}`;

  const refJacket  = { id:refJacketId,  type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"1:1", resolution:"2K",
    prompt:"Streetwear fashion product photo, ghost mannequin, white background. Oversized baggy hip hop MA-1 bomber jacket, the style worn by 90s and 2000s rap artists and hip hop musicians — NOT a motorcycle jacket, NOT a biker jacket, NOT fitted. This is a loose relaxed hip hop streetwear bomber. Olive green nylon shell, the kind Alpha Industries makes. Very oversized boxy silhouette, the jacket looks large and roomy. Black faux fur collar. Silver zipper down the front. Small zip pocket on the left sleeve with a hanging red tab. Olive green ribbed cuffs and waistband. Large white bold 'MC' letters printed on the back of the jacket. Flat soft studio lighting, full jacket visible, shot from slightly behind to show the MC back print. Hip hop streetwear style, NOT biker, NOT moto." };
  const refTalent  = { id:refTalentId,  type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"1:1", resolution:"2K",
    prompt:"REF · @talent — Character portrait reference. Young Black British creative, early 20s, South London aesthetic. Relaxed posture, sharp observant eyes, natural confidence without performance. Clean t-shirt, no distracting accessories. Neutral studio background, even lighting. Natural expression, not modelling." };
  const refCrew    = { id:refCrewId,    type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"16:9", resolution:"2K",
    prompt:"REF · @crew — Group portrait reference. Three young diverse creatives, South London streetwear aesthetic, authentic energy, relaxed and natural together. Not posed, just standing as a group. Studio or clean urban background. Consistent warm lighting across the group. Ages 19–26." };
  const refStreet  = { id:refStreetId,  type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"16:9", resolution:"2K",
    prompt:"REF · @street — Location reference. East London street, evening after light rain. Brick walls with fading murals, wet pavement reflecting amber sodium lamps, quiet residential street with a sense of urban life between moments. No people. Moody, authentic, not touristy." };
  const refRooftop = { id:refRooftopId, type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"16:9", resolution:"2K",
    prompt:"REF · @rooftop — Location reference. Urban London rooftop at golden hour. Raw concrete floor, industrial HVAC units, low parapet wall. London skyline soft in haze in the distance, sky bleeding orange into blue. No people. Open, industrial, beautiful." };
  const refVenue   = { id:refVenueId,   type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"16:9", resolution:"2K",
    prompt:"REF · @venue — Location reference. Small underground music venue interior, intimate, low ceiling, exposed brick walls, worn wooden floor. Warm amber and red stage lighting creating pools of light. Empty — no performers, no crowd. Atmospheric and real, not glamorous." };

  // ── Image nodes — one per shot, linked via shotId ────────────────────────────
  const mkImg = (shot, ar) => ({
    id:`img_${uid()}`, type:T.IMAGE, shotId:shot.id,
    sceneId:shot.sceneId, generatedUrl:"", resolution:"1K",
    aspect_ratio: ar,
    prompt: shot.compiledText || "",
  });
  const img1a = mkImg(sh1a, "16:9");
  const img1b = mkImg(sh1b, "9:16");
  const img2a = mkImg(sh2a, "9:16");
  const img2b = mkImg(sh2b, "1:1");
  const img2c = mkImg(sh2c, "16:9");
  const img3a = mkImg(sh3a, "16:9");
  const img3b = mkImg(sh3b, "1:1");
  const img3c = mkImg(sh3c, "16:9");
  const img4a = mkImg(sh4a, "16:9");
  const img4b = mkImg(sh4b, "16:9");
  const img4c = mkImg(sh4c, "1:1");

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const nodes = [
    sc1, sc2, sc3, sc4,
    sh1a, sh1b, sh2a, sh2b, sh2c, sh3a, sh3b, sh3c, sh4a, sh4b, sh4c,
    img1a, img1b, img2a, img2b, img2c, img3a, img3b, img3c, img4a, img4b, img4c,
    refJacket, refTalent, refCrew, refStreet, refRooftop, refVenue,
  ];

  const sceneX    = 80;
  const shotStart = sceneX + 310 + 70; // 460
  const shotGapX  = 340;
  // Shots occupy columns 0-2. Images occupy columns 3-5, same Y as their shot.
  // sceneGapY only needs to fit the scene card (~840px) since nothing stacks below.
  const sceneGapY = 940;
  const rowY      = (row) => 80 + row * sceneGapY;

  // Images sit in their own columns directly to the right of all shot columns.
  // shot col n  → x = shotStart + n*shotGapX
  // image col n → x = imgStart  + n*shotGapX   (same relative column, shifted right)
  const imgStart = shotStart + shotGapX * 3;  // 460 + 1020 = 1480
  const refColX  = imgStart  + shotGapX * 3 + 60; // reference column, far right
  const refGapY  = 440;

  const pos = {
    // ── Scenes ──
    [sc1id]: { x:sceneX, y:rowY(0) },
    [sc2id]: { x:sceneX, y:rowY(1) },
    [sc3id]: { x:sceneX, y:rowY(2) },
    [sc4id]: { x:sceneX, y:rowY(3) },
    // ── Shots ──
    [sh1a.id]: { x:shotStart,            y:rowY(0) },
    [sh1b.id]: { x:shotStart+shotGapX,   y:rowY(0) },
    [sh2a.id]: { x:shotStart,            y:rowY(1) },
    [sh2b.id]: { x:shotStart+shotGapX,   y:rowY(1) },
    [sh2c.id]: { x:shotStart+shotGapX*2, y:rowY(1) },
    [sh3a.id]: { x:shotStart,            y:rowY(2) },
    [sh3b.id]: { x:shotStart+shotGapX,   y:rowY(2) },
    [sh3c.id]: { x:shotStart+shotGapX*2, y:rowY(2) },
    [sh4a.id]: { x:shotStart,            y:rowY(3) },
    [sh4b.id]: { x:shotStart+shotGapX,   y:rowY(3) },
    [sh4c.id]: { x:shotStart+shotGapX*2, y:rowY(3) },
    // ── Image nodes: same Y as their shot, in mirrored columns to the right ──
    [img1a.id]: { x:imgStart,            y:rowY(0) },  // mirrors sh1a
    [img1b.id]: { x:imgStart+shotGapX,   y:rowY(0) },  // mirrors sh1b
    [img2a.id]: { x:imgStart,            y:rowY(1) },  // mirrors sh2a
    [img2b.id]: { x:imgStart+shotGapX,   y:rowY(1) },  // mirrors sh2b
    [img2c.id]: { x:imgStart+shotGapX*2, y:rowY(1) },  // mirrors sh2c
    [img3a.id]: { x:imgStart,            y:rowY(2) },  // mirrors sh3a
    [img3b.id]: { x:imgStart+shotGapX,   y:rowY(2) },  // mirrors sh3b
    [img3c.id]: { x:imgStart+shotGapX*2, y:rowY(2) },  // mirrors sh3c
    [img4a.id]: { x:imgStart,            y:rowY(3) },  // mirrors sh4a
    [img4b.id]: { x:imgStart+shotGapX,   y:rowY(3) },  // mirrors sh4b
    [img4c.id]: { x:imgStart+shotGapX*2, y:rowY(3) },  // mirrors sh4c
    // ── Reference column: one node per bible entity ──
    [refJacketId]:  { x:refColX, y:80 + refGapY*0 },
    [refTalentId]:  { x:refColX, y:80 + refGapY*1 },
    [refCrewId]:    { x:refColX, y:80 + refGapY*2 },
    [refStreetId]:  { x:refColX, y:80 + refGapY*3 },
    [refRooftopId]: { x:refColX, y:80 + refGapY*4 },
    [refVenueId]:   { x:refColX, y:80 + refGapY*5 },
  };

  const bible = {
    characters: [ eTalent, eCrew ],
    objects:    [ eJacket ],
    locations:  [ eStreet, eRooftop, eVenue ],
  };

  return { nodes, pos, bible };
}

// ─── TEMPLATE: JEWELLERY CAMPAIGN ────────────────────────────────────────────
// Minimalist product campaign for a gold signet ring.
// Workflow: generate the REFERENCE Image nodes first → Save as Bible Ref →
// then generate all scene shots with full visual consistency.
function makeJewelleryCampaignTemplate() {
  // ── Global bible entities ────────────────────────────────────────────────────
  const eRing   = { id:`e_${uid()}`, kind:"object",    name:"Gold Signet Ring",  tag:"@ring",   description:"Chunky 18k gold signet ring — heavy flat rectangular face, slightly bevelled edges, polished mirror finish. The ring face is engraved with a bold 'MC' monogram in a classic serif typeface. Wide solid gold band, substantial weight visible. No gemstones. Pure gold.", notes:"Hero product — always sharp and in focus when @ring appears. The engraved MC face and the mirror polish are the key visual signatures.", _imgUrl:"", assetId:"" };
  const eHand   = { id:`e_${uid()}`, kind:"character", name:"The Hand",          tag:"@hand",   description:"A single well-groomed hand — neutral skin, clean short nails, no nail polish. Natural skin texture. The hand is the canvas for @ring. Shot always clean and deliberate.", notes:"Ring must be prominently visible on the index or middle finger whenever @hand appears.", _imgUrl:"", assetId:"" };
  const eModel  = { id:`e_${uid()}`, kind:"character", name:"The Wearer",        tag:"@model",  description:"Understated, confident presence. Gender-neutral styling — minimal, clean clothing, neutral tones. Early 30s. The person who wears @ring is not trying to impress. They already arrived.", notes:"Never overdressed. The ring is the statement — everything else is quiet.", _imgUrl:"", assetId:"" };
  const eMarble = { id:`e_${uid()}`, kind:"location",  name:"Studio Surface",    tag:"@marble", description:"Pure white Carrara marble surface — smooth, cool, faint natural grey veining. Used as a product placement surface in studio. Always clean and uncluttered.", notes:"Hero surface — @ring is placed directly on @marble for product shots.", _imgUrl:"", assetId:"" };

  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||e._prev||"", assetId:e.assetId||"" });

  // ── Scene 1: THE OBJECT ──────────────────────────────────────────────────────
  const sc1id = `sc_${uid()}`;
  const sc1 = {
    id:sc1id, type:T.SCENE, cinematicStyle:"editorial", shotCount:2,
    bible:[ sbEntry(eRing), sbEntry(eMarble) ],
    sceneText:`@ring sits alone on @marble. Nothing else. No hand, no context, no story yet. Just the object under controlled studio light — the weight of the gold, the mirror finish catching a single directed beam, the MC engraving reading sharp and crisp. This is the product at its most honest. Let it earn attention on its own terms.`,
    directorCoherence:{ score:98, skippedBeats:[], overlapIssues:[], recommendation:"Two-shot product isolation is clean and sufficient. Overhead establishes the form; 45° reveals the depth and finish. No notes." },
  };
  const sh1a = { ...mkShot(sc1id,1), id:`sh_${uid()}`, sceneId:sc1id, index:1, how:"Directly overhead flat-lay — @ring centred on @marble, ring face perfectly parallel to camera, MC engraving fully legible", where:"@marble — pure white studio surface, overhead rig", when:"product reveal", cameraSize:"medium-close", cameraAngle:"overhead", cameraMovement:"static", lens:"100mm macro", lighting:"natural-soft", visualGoal:"The ring as architectural object. Symmetry, gold warmth against white marble. The MC reads like a stamp of authority.", entityTags:["@ring","@marble"], directorNote:"Level the camera plane perfectly. The MC engraving must be completely legible. No shadows obscuring the face. Soft diffused light from directly above.", directorQuality:"good", directorIssue:"" };
  const sh1b = { ...mkShot(sc1id,2), id:`sh_${uid()}`, sceneId:sc1id, index:2, how:"45° hero angle — @ring on @marble, single hard directional light from camera-left raking across the engraved face, casting a sharp shadow that reveals the depth of the cut", where:"@marble — angled studio setup", when:"product hero", cameraSize:"close-up", cameraAngle:"45-degree", cameraMovement:"static", lens:"100mm macro", lighting:"hard-contrast", visualGoal:"Gold catching light at the perfect angle. The engraving shadow reveals the craft. This is the frame that sells the ring.", entityTags:["@ring","@marble"], directorNote:"The raking light is everything — it makes the engraving dimensional. A hard single source from camera-left. Let the shadow do the storytelling.", directorQuality:"good", directorIssue:"" };
  sh1a.compiledText = compileShotText(sh1a); sh1b.compiledText = compileShotText(sh1b);

  // ── Scene 2: THE HAND ────────────────────────────────────────────────────────
  const sc2id = `sc_${uid()}`;
  const sc2 = {
    id:sc2id, type:T.SCENE, cinematicStyle:"editorial", shotCount:3,
    bible:[ sbEntry(eRing), sbEntry(eHand) ],
    sceneText:`@ring moves from marble to skin. @hand is the first human element — not a face, not a body, just the hand. The ring worn. The gold warm against skin. Three moments: the ring at rest on relaxed fingers, the ring in a deliberate gesture, and the ring in extreme close-up where the metal meets the knuckle and the engraving is everything.`,
    directorCoherence:{ score:95, skippedBeats:[], overlapIssues:[], recommendation:"Three-beat hand sequence — rest, gesture, macro — covers the product-on-skin story completely. The ECU closing shot is the strongest frame of the campaign." },
  };
  const sh2a = { ...mkShot(sc2id,1), id:`sh_${uid()}`, sceneId:sc2id, index:1, how:"@hand relaxed and flat on @marble, fingers slightly open, @ring on index finger, ring face centred and catching soft studio light", where:"@marble — hand resting on surface, overhead soft box", when:"ring at rest", cameraSize:"medium-close", cameraAngle:"overhead", cameraMovement:"static", lens:"85mm", lighting:"natural-soft", visualGoal:"The ring at home on a hand. Relaxed, natural, owned. The gold reads warm against marble and skin.", entityTags:["@ring","@hand","@marble"], directorNote:"The hand should look natural, not posed. Slightly curved fingers, not splayed or stiff. The ring face should be visible and the MC engraving legible.", directorQuality:"good", directorIssue:"" };
  const sh2b = { ...mkShot(sc2id,2), id:`sh_${uid()}`, sceneId:sc2id, index:2, how:"@hand raised, fingers loosely curled, @ring prominent — a deliberate but unhurried gesture, as if mid-thought", where:"neutral white background — hand lifted, studio light", when:"ring in gesture", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"natural-soft", visualGoal:"Confidence without performance. The ring is not being shown off — it is simply present, which is the point.", entityTags:["@ring","@hand"], directorNote:"The gesture must not feel modelled. Think of someone pausing mid-sentence, hand raised. The ring is incidental to the moment, which makes it everything.", directorQuality:"good", directorIssue:"" };
  const sh2c = { ...mkShot(sc2id,3), id:`sh_${uid()}`, sceneId:sc2id, index:3, how:"Extreme close-up on the ring face on @hand — the MC engraving fills the frame, skin texture visible at the edges, a single hard light source catches the mirror polish", where:"tight macro — ring face on finger, studio", when:"product detail", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"100mm macro", lighting:"hard-contrast", visualGoal:"The MC engraving at maximum resolution. Gold and skin and craft — this is the campaign's most intimate and powerful frame.", entityTags:["@ring","@hand"], directorNote:"Fill the frame with the ring face. The MC letters should be razor sharp. The skin at the edge grounds it in the human. One hard light from the side to make the engraving three-dimensional.", directorQuality:"good", directorIssue:"" };
  sh2a.compiledText = compileShotText(sh2a); sh2b.compiledText = compileShotText(sh2b); sh2c.compiledText = compileShotText(sh2c);

  // ── Scene 3: THE PERSON ──────────────────────────────────────────────────────
  const sc3id = `sc_${uid()}`;
  const sc3 = {
    id:sc3id, type:T.SCENE, cinematicStyle:"editorial", shotCount:3,
    bible:[ sbEntry(eRing), sbEntry(eHand), sbEntry(eModel) ],
    sceneText:`@model is in frame. The ring is still the subject, but now there is a person behind it. @model is not performing — not looking at the camera, not posing. The @ring on @hand moves through the world of the shot: resting on a surface, lifting to the jaw in thought, pulling slightly open the collar of a jacket. The ring is a habit, not a statement.`,
    directorCoherence:{ score:93, skippedBeats:[], overlapIssues:[], recommendation:"Person introduction sequence lands well. The medium-close cuts from hand-focused to person-contextual cleanly. Closing collar shot is the brand's attitude in one image." },
  };
  const sh3a = { ...mkShot(sc3id,1), id:`sh_${uid()}`, sceneId:sc3id, index:1, how:"@model seated, @hand resting on knee or table surface, @ring prominent — @model not looking at camera, gaze neutral and distant", where:"minimal white studio — clean chair or surface, soft light", when:"ring in context", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"natural-soft", visualGoal:"The ring belongs to a person who does not need to announce it. Quiet power. The ring is visible but the person is not performing it.", entityTags:["@ring","@hand","@model"], directorNote:"@model must not look at the ring or at the camera. The disinterest is the attitude. The ring is just there — which is the most aspirational thing it can be.", directorQuality:"good", directorIssue:"" };
  const sh3b = { ...mkShot(sc3id,2), id:`sh_${uid()}`, sceneId:sc3id, index:2, how:"Medium-close on @model, @hand raised to jaw or temple in a thinking pose — @ring face visible, resting lightly against the face", where:"white studio — tight on upper body and face", when:"ring near face", cameraSize:"medium-close", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"natural-soft", visualGoal:"The ring touching the face — the most intimate product moment. The MC engraving near the jaw is aspirational shorthand.", entityTags:["@ring","@hand","@model"], directorNote:"The ring should rest lightly, not be pressed hard into the face. The gesture is one of thought, not vanity. Keep both the MC engraving and the eye in the same focal plane if possible.", directorQuality:"good", directorIssue:"" };
  const sh3c = { ...mkShot(sc3id,3), id:`sh_${uid()}`, sceneId:sc3id, index:3, how:"@model's @hand pulls open a jacket lapel — the motion is casual, deliberate — @ring fully visible in the act", where:"minimal location — neutral jacket, clean background", when:"ring in motion", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"natural-soft", visualGoal:"The ring in action, not display. Someone who wears gold this way already knows. The campaign's attitude in one gesture.", entityTags:["@ring","@hand","@model"], directorNote:"The motion of pulling the lapel is everything — it must look completely natural, not staged. One take, real speed. The ring catches light in the movement.", directorQuality:"good", directorIssue:"" };
  sh3a.compiledText = compileShotText(sh3a); sh3b.compiledText = compileShotText(sh3b); sh3c.compiledText = compileShotText(sh3c);

  // ── Scene 4: CRAFT & LIGHT ───────────────────────────────────────────────────
  const sc4id = `sc_${uid()}`;
  const sc4 = {
    id:sc4id, type:T.SCENE, cinematicStyle:"abstract", shotCount:3,
    bible:[ sbEntry(eRing), sbEntry(eMarble) ],
    sceneText:`The final scene is not narrative — it is sensation. @ring on @marble, under a single moving light source. The gold changes character as the angle shifts. Light caustics scatter across the marble surface. The MC engraving catches and releases shadow. This is the ring as pure material experience — weight, warmth, craft, permanence.`,
    directorCoherence:{ score:96, skippedBeats:[], overlapIssues:[], recommendation:"Sensory close sequence is the correct campaign ending — pure product, pure craft. The caustics shot is a campaign signature frame." },
  };
  const sh4a = { ...mkShot(sc4id,1), id:`sh_${uid()}`, sceneId:sc4id, index:1, how:"Extreme close-up on the MC engraving — the camera so close that individual tool marks and the bevelled letter edges are visible, single raking light revealing every detail of the goldsmith's work", where:"@marble — macro studio setup, 1:1 reproduction ratio", when:"craft reveal", cameraSize:"extreme-close-up", cameraAngle:"45-degree", cameraMovement:"static", lens:"100mm macro", lighting:"hard-contrast", visualGoal:"Pure craft at maximum resolution. Every cut of the engraving tool visible. This is what makes the ring worth owning.", entityTags:["@ring","@marble"], directorNote:"This shot is about the craftsperson's work. Raking light from a hard source at near-parallel to the surface. The letters should look almost three-dimensional.", directorQuality:"good", directorIssue:"" };
  const sh4b = { ...mkShot(sc4id,2), id:`sh_${uid()}`, sceneId:sc4id, index:2, how:"@ring on @marble, a hard point light source causes gold light caustics to scatter across the white marble surface around the ring — the ring glowing at the centre of its own light field", where:"@marble — studio, hard point light above at a steep angle", when:"light play", cameraSize:"medium-close", cameraAngle:"45-degree", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"The ring as a source of light, not just a reflector of it. Gold caustics on white marble is the most beautiful frame in the campaign.", entityTags:["@ring","@marble"], directorNote:"A hard point source — not a softbox. The caustics only appear with a directional point light. Adjust angle until the gold light scatters across the marble. Do not retouch — this must be in-camera.", directorQuality:"good", directorIssue:"" };
  const sh4c = { ...mkShot(sc4id,3), id:`sh_${uid()}`, sceneId:sc4id, index:3, how:"The ring and its own perfect shadow — a very low side light casts the ring's silhouette long across the marble, the shadow as graphic and bold as the object itself", where:"@marble — extremely low side light from camera-left, long shadow cast", when:"closing image", cameraSize:"medium-close", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"Ring and shadow as equals — the object and its presence. A graphic, minimal, permanent image. The last thing the viewer should see.", entityTags:["@ring","@marble"], directorNote:"The shadow must be as sharp as the ring. A very low hard light — almost parallel to the marble surface. The shadow should be roughly the same length as the ring is tall. Do not move.", directorQuality:"good", directorIssue:"" };
  sh4a.compiledText = compileShotText(sh4a); sh4b.compiledText = compileShotText(sh4b); sh4c.compiledText = compileShotText(sh4c);

  // ── Reference image nodes — one per bible entity ─────────────────────────────
  const refRingId    = `img_${uid()}`;
  const refHandId    = `img_${uid()}`;
  const refModelId   = `img_${uid()}`;
  const refMarbleId  = `img_${uid()}`;

  const refRing  = { id:refRingId,   type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"1:1", resolution:"2K",
    prompt:"Professional jewellery product photography, ghost mannequin on white background. Chunky 18k yellow gold signet ring. Wide flat rectangular ring face with slightly bevelled edges and a mirror-polished surface. The face is engraved with a bold serif 'MC' monogram — deep clean engraving, fully legible. Heavy wide solid gold band. No gemstones. Shot at a 45° angle with a single hard directional studio light from camera-left to create a specular highlight along the band and reveal the dimensional engraving with shadow. White background. Ultra-detailed luxury jewellery photography quality." };
  const refHand  = { id:refHandId,   type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"1:1", resolution:"2K",
    prompt:"Clean studio photograph of a single well-groomed hand. Neutral skin tone, clean short nails, no nail polish, natural skin texture. The hand is relaxed with fingers slightly curved, palm facing down, resting on a white marble surface. The chunky 18k gold MC signet ring is on the index finger, ring face visible and facing camera. Soft white studio lighting. Minimal, clean, editorial jewellery campaign style." };
  const refModel = { id:refModelId,  type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"9:16", resolution:"2K",
    prompt:"Editorial fashion portrait, minimal studio. A gender-neutral person in their early 30s, understated and confident. Wearing simple clean neutral-toned clothing. One hand raised near the face or jaw — wearing a chunky gold signet ring with MC engraving on the index finger. Not looking at camera. Expression calm and disinterested. White or very light grey background. Soft natural studio lighting. High-end minimalist jewellery campaign aesthetic." };
  const refMarble = { id:refMarbleId, type:T.IMAGE, shotId:null, sceneId:null, generatedUrl:"", aspect_ratio:"16:9", resolution:"2K",
    prompt:"Studio product photography surface. Pure white Carrara marble slab — smooth, polished, with subtle natural grey veining running diagonally. Clean and uncluttered. Lit with soft even overhead studio lighting. The surface should look cool, clean, and premium. No objects on it. Shot from slightly above at a 30° angle. Luxury product photography background surface." };

  // ── Image nodes — one per shot ───────────────────────────────────────────────
  const mkImg = (shot, ar) => ({
    id:`img_${uid()}`, type:T.IMAGE, shotId:shot.id,
    sceneId:shot.sceneId, generatedUrl:"", resolution:"1K",
    aspect_ratio: ar,
    prompt: shot.compiledText || "",
  });

  const img1a = mkImg(sh1a, "1:1");
  const img1b = mkImg(sh1b, "1:1");
  const img2a = mkImg(sh2a, "1:1");
  const img2b = mkImg(sh2b, "1:1");
  const img2c = mkImg(sh2c, "1:1");
  const img3a = mkImg(sh3a, "16:9");
  const img3b = mkImg(sh3b, "9:16");
  const img3c = mkImg(sh3c, "9:16");
  const img4a = mkImg(sh4a, "1:1");
  const img4b = mkImg(sh4b, "1:1");
  const img4c = mkImg(sh4c, "16:9");

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const nodes = [
    sc1, sc2, sc3, sc4,
    sh1a, sh1b,
    sh2a, sh2b, sh2c,
    sh3a, sh3b, sh3c,
    sh4a, sh4b, sh4c,
    img1a, img1b,
    img2a, img2b, img2c,
    img3a, img3b, img3c,
    img4a, img4b, img4c,
    refRing, refHand, refModel, refMarble,
  ];

  const sceneX    = 80;
  const shotStart = sceneX + 310 + 70;  // 460
  const shotGapX  = 340;
  const sceneGapY = 940;
  const rowY      = (row) => 80 + row * sceneGapY;

  // Images mirror shot columns, inline on the same Y row
  const imgStart = shotStart + shotGapX * 3;  // 1480
  const refColX  = imgStart  + shotGapX * 3 + 60;
  const refGapY  = 460;

  const pos = {
    // ── Scenes ──
    [sc1id]: { x:sceneX, y:rowY(0) },
    [sc2id]: { x:sceneX, y:rowY(1) },
    [sc3id]: { x:sceneX, y:rowY(2) },
    [sc4id]: { x:sceneX, y:rowY(3) },
    // ── Shots ──
    [sh1a.id]: { x:shotStart,            y:rowY(0) },
    [sh1b.id]: { x:shotStart+shotGapX,   y:rowY(0) },
    [sh2a.id]: { x:shotStart,            y:rowY(1) },
    [sh2b.id]: { x:shotStart+shotGapX,   y:rowY(1) },
    [sh2c.id]: { x:shotStart+shotGapX*2, y:rowY(1) },
    [sh3a.id]: { x:shotStart,            y:rowY(2) },
    [sh3b.id]: { x:shotStart+shotGapX,   y:rowY(2) },
    [sh3c.id]: { x:shotStart+shotGapX*2, y:rowY(2) },
    [sh4a.id]: { x:shotStart,            y:rowY(3) },
    [sh4b.id]: { x:shotStart+shotGapX,   y:rowY(3) },
    [sh4c.id]: { x:shotStart+shotGapX*2, y:rowY(3) },
    // ── Image nodes: same Y as their shot, mirrored columns to the right ──
    [img1a.id]: { x:imgStart,            y:rowY(0) },
    [img1b.id]: { x:imgStart+shotGapX,   y:rowY(0) },
    [img2a.id]: { x:imgStart,            y:rowY(1) },
    [img2b.id]: { x:imgStart+shotGapX,   y:rowY(1) },
    [img2c.id]: { x:imgStart+shotGapX*2, y:rowY(1) },
    [img3a.id]: { x:imgStart,            y:rowY(2) },
    [img3b.id]: { x:imgStart+shotGapX,   y:rowY(2) },
    [img3c.id]: { x:imgStart+shotGapX*2, y:rowY(2) },
    [img4a.id]: { x:imgStart,            y:rowY(3) },
    [img4b.id]: { x:imgStart+shotGapX,   y:rowY(3) },
    [img4c.id]: { x:imgStart+shotGapX*2, y:rowY(3) },
    // ── Reference column ──
    [refRingId]:   { x:refColX, y:80 + refGapY*0 },
    [refHandId]:   { x:refColX, y:80 + refGapY*1 },
    [refModelId]:  { x:refColX, y:80 + refGapY*2 },
    [refMarbleId]: { x:refColX, y:80 + refGapY*3 },
  };

  const bible = {
    characters: [ eHand, eModel ],
    objects:    [ eRing ],
    locations:  [ eMarble ],
  };

  return { nodes, pos, bible };
}

// ─── TEMPLATE: TRAP MUSIC VIDEO CLIP ─────────────────────────────────────────
// A self-contained 60–90s trap music video clip.
// 4 scenes: cold open on the artist, street flex, studio cypher, cinematic close.
// Designed for use with the AUDIO + VIDEO EDIT nodes — drop the track, snap to beats.
function makeTrapMusicVideoTemplate() {
  // ── Bible entities ────────────────────────────────────────────────────────────
  const eArtist  = { id:`e_${uid()}`, kind:"character", name:"The Artist",       tag:"@artist",  description:"The rap artist. Hoodie up or off — always commanding the frame. Jewellery hot. Eyes communicate before the mouth does.", notes:"Primary talent — generate reference portrait first, save to bible before generating scenes", _imgUrl:"/character_The_Artist.png", _prev:"/character_The_Artist.png", assetId:"ref" };
  const eRide    = { id:`e_${uid()}`, kind:"object",    name:"The Whip",          tag:"@whip",    description:"Custom blacked-out SUV or muscle car — tinted windows, chrome rims catching whatever light is available, engine idle like a threat", notes:"Hero vehicle — featured in Scene 2", _imgUrl:"", assetId:"" };
  const eChain   = { id:`e_${uid()}`, kind:"object",    name:"Chain",             tag:"@chain",   description:"Thick cuban link gold chain, worn close to the collarbone. Heavy. Real. Every shot where @artist is above medium should show it.", notes:"Key product detail in all scenes", _imgUrl:"/object_Chain.png", _prev:"/object_Chain.png", assetId:"ref" };
  const eBlock   = { id:`e_${uid()}`, kind:"location",  name:"The Block",         tag:"@block",   description:"Corner of a residential urban street, night. Amber sodium lamps, concrete curb, a mix of steel shutters and old brick. The block that raised everyone here.", notes:"Primary location — cold open and street scenes", _imgUrl:"/location_The_Block.png", _prev:"/location_The_Block.png", assetId:"ref" };
  const eStudio  = { id:`e_${uid()}`, kind:"location",  name:"Recording Studio",  tag:"@studio",  description:"Small professional recording booth — acoustic foam walls, low purple and amber mood lighting from LED strips, one mic in the center, mixing desk visible through glass", notes:"Cypher / performance location", _imgUrl:"", assetId:"" };
  const eRooftop = { id:`e_${uid()}`, kind:"location",  name:"Rooftop",           tag:"@rooftop", description:"High-rise rooftop, cityscape behind. Night — city lights bleed orange into a dark sky. Parapet wall, open air, complete visual control of the skyline.", notes:"Cinematic close — final scene", _imgUrl:"", assetId:"" };

  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||e._prev||"", assetId:e.assetId||"" });

  // ── Scene 1: COLD OPEN — THE BLOCK ───────────────────────────────────────────
  const sc1id = `sc_${uid()}`;
  const sc1 = {
    id:sc1id, type:T.SCENE, cinematicStyle:"noir", shotCount:3,
    bible:[ sbEntry(eArtist), sbEntry(eChain), sbEntry(eBlock) ],
    sceneText:`@block at night. Empty — or almost. @artist stands at the corner under a sodium lamp, hoodie half up, @chain catching the amber light. No performance yet. Just presence. Camera finds @artist slowly, like the block itself is watching. First close-up lands on @chain. Cut to eyes. Then the wide — @artist small against the block, but the block belongs to them. This is the cold open: no lyrics, no movement. Just arrival.`,
    directorCoherence:{ score:97, skippedBeats:[], overlapIssues:[], recommendation:"Three-beat cold open: environment → product detail → full presence. Exactly right for a trap intro. Hold every shot longer than feels comfortable." },
  };
  const sh1a = {
    ...mkShot(sc1id,1), id:`sh_${uid()}`, sceneId:sc1id, index:1,
    how:"Slow push in toward @artist standing still under the sodium lamp — @chain barely visible, hoodie shadow cutting across the face", where:"@block — corner, lone sodium lamp overhead, night", when:"cold open, first seconds", cameraSize:"full", cameraAngle:"eye-level", cameraMovement:"slow-push-in", lens:"50mm", lighting:"practical-night", visualGoal:"Arrival before the song drops — establish that this person owns the space before they do anything",
    entityTags:["@artist","@block"], directorNote:"The push-in is the breath before the first bar. Move slowly enough that the audience is not sure if anything is happening. Then stop.", directorQuality:"good", directorIssue:"",
  };
  const sh1b = {
    ...mkShot(sc1id,2), id:`sh_${uid()}`, sceneId:sc1id, index:2,
    how:"Extreme close-up on @chain at chest — thick cuban links catching sodium amber, slight rise and fall with breathing", where:"@block — tight on chest", when:"product reveal beat", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"practical-night", visualGoal:"@chain is the thesis statement — wealth, status, weight. Let the light crawl across the links.",
    entityTags:["@artist","@chain"], directorNote:"Stay on the chain two beats longer than the edit wants you to. The longer you hold, the more expensive it feels.", directorQuality:"good", directorIssue:"",
  };
  const sh1c = {
    ...mkShot(sc1id,3), id:`sh_${uid()}`, sceneId:sc1id, index:3,
    how:"@artist looks directly into camera — still, no smile, sovereign — then the beat drops", where:"@block — same corner, tighter framing", when:"beat drop", cameraSize:"close-up", cameraAngle:"slight-low", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast", visualGoal:"The look is the hook. @artist sees the audience and does not blink. This frame is the thumbnail.",
    entityTags:["@artist","@chain","@block"], directorNote:"Slight-low is mandatory here. Eye contact with a slight-low camera is a power transfer to the subject. Do not move. Do not cut until the beat hits.", directorQuality:"good", directorIssue:"",
  };
  sh1a.compiledText = compileShotText(sh1a); sh1b.compiledText = compileShotText(sh1b); sh1c.compiledText = compileShotText(sh1c);

  // ── Scene 2: STREET FLEX ──────────────────────────────────────────────────────
  const sc2id = `sc_${uid()}`;
  const sc2 = {
    id:sc2id, type:T.SCENE, cinematicStyle:"action", shotCount:3,
    bible:[ sbEntry(eArtist), sbEntry(eRide), sbEntry(eChain), sbEntry(eBlock) ],
    sceneText:`@whip idles at the curb on @block. @artist leans against the hood — full fit, @chain out, unhurried. This is the flex scene. Shots cut to the beat: @whip detail, @artist walking the curb, wide of both together against the @block skyline. Energy is confident, not aggressive. This person has already won. The cars, the block, the light — all of it confirms it.`,
    directorCoherence:{ score:93, skippedBeats:[], overlapIssues:[], recommendation:"Three-beat flex arc: vehicle statement → movement → united wide. The confidence register is correct — never desperate, always earned." },
  };
  const sh2a = {
    ...mkShot(sc2id,1), id:`sh_${uid()}`, sceneId:sc2id, index:1,
    how:"Low wide on @whip at the curb — chrome rims close to camera, @artist visible leaning on the hood further back", where:"@block — curbside, @whip dominating the foreground", when:"opening flex beat", cameraSize:"wide", cameraAngle:"low-angle", cameraMovement:"static", lens:"24mm", lighting:"practical-night", visualGoal:"The car earns its own introduction before @artist becomes the subject — scale establishes the world",
    entityTags:["@artist","@whip","@block"], directorNote:"The 24mm low-angle makes chrome rims into architecture. @artist in soft focus background creates depth. Do not rush to the face.", directorQuality:"good", directorIssue:"",
  };
  const sh2b = {
    ...mkShot(sc2id,2), id:`sh_${uid()}`, sceneId:sc2id, index:2,
    how:"@artist walks slow along the curb past @whip — @chain in motion, eyes ahead, not performing for anyone", where:"@block — curb walk in front of @whip", when:"movement beat", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"35mm", lighting:"natural-soft", visualGoal:"Motion that feels like ownership — every step says the street is home",
    entityTags:["@artist","@whip","@chain","@block"], directorNote:"Tracking shot matches the walk cadence exactly. If the camera moves faster or slower than @artist it breaks the confidence register. Match the pace.", directorQuality:"good", directorIssue:"",
  };
  const sh2c = {
    ...mkShot(sc2id,3), id:`sh_${uid()}`, sceneId:sc2id, index:3,
    how:"Wide — @artist and @whip together against the full @block backdrop, city low behind, sodium light painting everything amber", where:"@block — full street width, pulling back", when:"establishing close", cameraSize:"extreme-wide", cameraAngle:"eye-level", cameraMovement:"pull-back", lens:"35mm", lighting:"practical-night", visualGoal:"Person, machine, block — the pull-back unites all three and closes the visual statement",
    entityTags:["@artist","@whip","@block"], directorNote:"The pull-back at scene close is deliberate release after the intimacy of the tracking shot. Let the city breathe behind the subject before cutting.", directorQuality:"good", directorIssue:"",
  };
  sh2a.compiledText = compileShotText(sh2a); sh2b.compiledText = compileShotText(sh2b); sh2c.compiledText = compileShotText(sh2c);

  // ── Scene 3: STUDIO CYPHER ────────────────────────────────────────────────────
  const sc3id = `sc_${uid()}`;
  const sc3 = {
    id:sc3id, type:T.SCENE, cinematicStyle:"documentary", shotCount:3,
    bible:[ sbEntry(eArtist), sbEntry(eChain), sbEntry(eStudio) ],
    sceneText:`@studio — @artist alone in the booth, @chain catching the purple LED strip light, mic at the jaw. This is work. The camera treats it like a document: close on the mouth delivering bars, wide of the booth showing the glass and the console, cut to an over-the-shoulder of the mixing desk with @artist in frame through the glass. The energy drops from the street flex to focused intensity.`,
    directorCoherence:{ score:96, skippedBeats:[], overlapIssues:[], recommendation:"Performance documentation done right — intimate, honest, not glamourised. The glass reflection shot is the scene's visual signature." },
  };
  const sh3a = {
    ...mkShot(sc3id,1), id:`sh_${uid()}`, sceneId:sc3id, index:1,
    how:"Close on @artist's face and jaw at the mic — @chain lit by purple LED strips, lips inches from the mic, eyes closed or locked on the horizon", where:"@studio — inside the recording booth, close to mic", when:"mid-verse, peak delivery", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"low-key", visualGoal:"Pure delivery — the audience hears the bars in this shot even if the music is loud",
    entityTags:["@artist","@chain","@studio"], directorNote:"85mm at close range compresses the background to a wash of purple. The mic and the face are everything. @chain catches the LED — that's your only colour accent.", directorQuality:"good", directorIssue:"",
  };
  const sh3b = {
    ...mkShot(sc3id,2), id:`sh_${uid()}`, sceneId:sc3id, index:2,
    how:"Medium shot from outside the booth glass looking in — @artist visible through the glass with the mic, mixing desk in the foreground", where:"@studio — shooting through the control room glass", when:"between bars, reflective", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"low-key", visualGoal:"The glass creates a frame within a frame — isolation inside the creative space reads as both power and vulnerability",
    entityTags:["@artist","@studio"], directorNote:"The reflection in the glass is the visual payoff. If the LED light is right you get @artist twice — once real, once reflected. That doubling is the shot.", directorQuality:"good", directorIssue:"",
  };
  const sh3c = {
    ...mkShot(sc3id,3), id:`sh_${uid()}`, sceneId:sc3id, index:3,
    how:"Wide of the full booth — @artist small inside the acoustic foam walls, mic stand a vertical line in the center, LED glow the only warm source", where:"@studio — full booth wide, from the corner", when:"post-verse stillness", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"35mm", lighting:"low-key", visualGoal:"Scale inversion — the artist who filled the block is now small inside the booth. That contrast is the scene's emotional point.",
    entityTags:["@artist","@studio"], directorNote:"After the intimacy of the close-ups, let the wide breathe. @artist is tiny — that's the point. The booth is where the real work happens, in silence, alone.", directorQuality:"good", directorIssue:"",
  };
  sh3a.compiledText = compileShotText(sh3a); sh3b.compiledText = compileShotText(sh3b); sh3c.compiledText = compileShotText(sh3c);

  // ── Scene 4: CINEMATIC CLOSE ──────────────────────────────────────────────────
  const sc4id = `sc_${uid()}`;
  const sc4 = {
    id:sc4id, type:T.SCENE, cinematicStyle:"drama", shotCount:2,
    bible:[ sbEntry(eArtist), sbEntry(eChain), sbEntry(eRooftop) ],
    sceneText:`@rooftop, night. @artist at the parapet wall — city lights behind, @chain catching what light is left in the sky. This scene has no action. It is the visual full stop of the clip. Wide to establish the scale. Close to end on the face. The song fades or cuts on the last frame. This image should be the last thing the viewer sees when they close their eyes.`,
    directorCoherence:{ score:99, skippedBeats:[], overlapIssues:[], recommendation:"Two-beat cinematic close is perfect. Resisting the urge to add a third shot is the correct call. The wide and the face are sufficient." },
  };
  const sh4a = {
    ...mkShot(sc4id,1), id:`sh_${uid()}`, sceneId:sc4id, index:1,
    how:"Wide of @rooftop — @artist at the parapet, cityscape stretching behind, @chain catching the last ambient sky glow", where:"@rooftop — parapet edge, full cityscape behind", when:"cinematic close, song winding down", cameraSize:"wide", cameraAngle:"low-angle", cameraMovement:"static", lens:"35mm", lighting:"backlit", visualGoal:"@artist silhouetted against the city they came from — the visual thesis of the entire clip in one frame",
    entityTags:["@artist","@chain","@rooftop"], directorNote:"Low angle against the sky. Let the city glow from below. If @chain catches the light, you have your hero frame. Do not add movement — the stillness is the statement.", directorQuality:"good", directorIssue:"",
  };
  const sh4b = {
    ...mkShot(sc4id,2), id:`sh_${uid()}`, sceneId:sc4id, index:2,
    how:"Final close-up — @artist looks directly at camera one last time, completely still, then the cut or fade", where:"@rooftop — close to face, city light from behind", when:"final frame", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"backlit", visualGoal:"End on the face. Always end on the face. This is the image that stays.",
    entityTags:["@artist","@chain","@rooftop"], directorNote:"Backlit close-up. The city is the rim light. Hold the look three seconds after you think you should cut. Then cut or fade — your call — but do not rush it.", directorQuality:"good", directorIssue:"",
  };
  sh4a.compiledText = compileShotText(sh4a); sh4b.compiledText = compileShotText(sh4b);

  // ── Per-scene pipeline nodes: Kling · Veo · Audio · VideoEdit × 4 ─────────────
  // Each scene gets its own isolated pipeline group — user picks Kling or Veo,
  // drops the track into Audio, wires both into VideoEdit.
  const p1Kling = mkKling(); const p1Veo = mkVeo(); const p1Audio = mkAudio();
  const p1Edit  = { ...mkVideoEdit(), audioNodeId: p1Audio.id };
  const p2Kling = mkKling(); const p2Veo = mkVeo(); const p2Audio = mkAudio();
  const p2Edit  = { ...mkVideoEdit(), audioNodeId: p2Audio.id };
  const p3Kling = mkKling(); const p3Veo = mkVeo(); const p3Audio = mkAudio();
  const p3Edit  = { ...mkVideoEdit(), audioNodeId: p3Audio.id };
  const p4Kling = mkKling(); const p4Veo = mkVeo(); const p4Audio = mkAudio();
  const p4Edit  = { ...mkVideoEdit(), audioNodeId: p4Audio.id };

  // ── Image nodes — one per shot ────────────────────────────────────────────────
  const mkImg = (shot, ar) => ({
    id:`img_${uid()}`, type:T.IMAGE, shotId:shot.id,
    sceneId:shot.sceneId, generatedUrl:"", resolution:"1K",
    aspect_ratio: ar, prompt: shot.compiledText || "",
  });
  const img1a = mkImg(sh1a,"9:16"); const img1b = mkImg(sh1b,"1:1");  const img1c = mkImg(sh1c,"9:16");
  const img2a = mkImg(sh2a,"16:9"); const img2b = mkImg(sh2b,"9:16"); const img2c = mkImg(sh2c,"16:9");
  const img3a = mkImg(sh3a,"16:9"); const img3b = mkImg(sh3b,"16:9"); const img3c = mkImg(sh3c,"16:9");
  const img4a = mkImg(sh4a,"16:9"); const img4b = mkImg(sh4b,"9:16");

  // ── Assemble ──────────────────────────────────────────────────────────────────
  const nodes = [
    sc1, sc2, sc3, sc4,
    sh1a, sh1b, sh1c, sh2a, sh2b, sh2c, sh3a, sh3b, sh3c, sh4a, sh4b,
    img1a, img1b, img1c, img2a, img2b, img2c, img3a, img3b, img3c, img4a, img4b,
    p1Kling, p1Veo, p1Audio, p1Edit,
    p2Kling, p2Veo, p2Audio, p2Edit,
    p3Kling, p3Veo, p3Audio, p3Edit,
    p4Kling, p4Veo, p4Audio, p4Edit,
  ];

  const sceneX    = 80;
  const shotStart = sceneX + 310 + 70;  // 460
  const shotGapX  = 340;
  const sceneGapY = 940;
  const rowY      = (row) => 80 + row * sceneGapY;
  const imgStart  = shotStart + shotGapX * 3;   // 1480

  // Pipeline group layout (per row):
  //   col A (pipeA): [Kling top] [Veo bottom]   — AI generators, pick one
  //   col B (pipeB): [Audio top] [Edit bottom]  — finish pipeline
  // Cols are separated by 380px. Rows within a group separated by 420px.
  // Groups are anchored to rowY(i) + 40 so they sit inside the scene's vertical band.
  const pipeA    = imgStart + shotGapX * 3 + 100;  // 2600
  const pipeB    = pipeA + 380;                     // 2980
  const pipeRowB = 420;  // vertical gap between top and bottom node within a group

  const pipePos = (row) => ({
    kling: { x:pipeA, y:rowY(row) + 40 },
    veo:   { x:pipeA, y:rowY(row) + 40 + pipeRowB },
    audio: { x:pipeB, y:rowY(row) + 40 },
    edit:  { x:pipeB, y:rowY(row) + 40 + pipeRowB },
  });
  const pp1 = pipePos(0), pp2 = pipePos(1), pp3 = pipePos(2), pp4 = pipePos(3);

  const pos = {
    [sc1id]:  { x:sceneX, y:rowY(0) },
    [sc2id]:  { x:sceneX, y:rowY(1) },
    [sc3id]:  { x:sceneX, y:rowY(2) },
    [sc4id]:  { x:sceneX, y:rowY(3) },
    [sh1a.id]:{ x:shotStart,            y:rowY(0) },
    [sh1b.id]:{ x:shotStart+shotGapX,   y:rowY(0) },
    [sh1c.id]:{ x:shotStart+shotGapX*2, y:rowY(0) },
    [sh2a.id]:{ x:shotStart,            y:rowY(1) },
    [sh2b.id]:{ x:shotStart+shotGapX,   y:rowY(1) },
    [sh2c.id]:{ x:shotStart+shotGapX*2, y:rowY(1) },
    [sh3a.id]:{ x:shotStart,            y:rowY(2) },
    [sh3b.id]:{ x:shotStart+shotGapX,   y:rowY(2) },
    [sh3c.id]:{ x:shotStart+shotGapX*2, y:rowY(2) },
    [sh4a.id]:{ x:shotStart,            y:rowY(3) },
    [sh4b.id]:{ x:shotStart+shotGapX,   y:rowY(3) },
    [img1a.id]:{ x:imgStart,            y:rowY(0) },
    [img1b.id]:{ x:imgStart+shotGapX,   y:rowY(0) },
    [img1c.id]:{ x:imgStart+shotGapX*2, y:rowY(0) },
    [img2a.id]:{ x:imgStart,            y:rowY(1) },
    [img2b.id]:{ x:imgStart+shotGapX,   y:rowY(1) },
    [img2c.id]:{ x:imgStart+shotGapX*2, y:rowY(1) },
    [img3a.id]:{ x:imgStart,            y:rowY(2) },
    [img3b.id]:{ x:imgStart+shotGapX,   y:rowY(2) },
    [img3c.id]:{ x:imgStart+shotGapX*2, y:rowY(2) },
    [img4a.id]:{ x:imgStart,            y:rowY(3) },
    [img4b.id]:{ x:imgStart+shotGapX,   y:rowY(3) },
    // Scene 1 pipeline
    [p1Kling.id]: pp1.kling, [p1Veo.id]: pp1.veo,
    [p1Audio.id]: pp1.audio, [p1Edit.id]: pp1.edit,
    // Scene 2 pipeline
    [p2Kling.id]: pp2.kling, [p2Veo.id]: pp2.veo,
    [p2Audio.id]: pp2.audio, [p2Edit.id]: pp2.edit,
    // Scene 3 pipeline
    [p3Kling.id]: pp3.kling, [p3Veo.id]: pp3.veo,
    [p3Audio.id]: pp3.audio, [p3Edit.id]: pp3.edit,
    // Scene 4 pipeline
    [p4Kling.id]: pp4.kling, [p4Veo.id]: pp4.veo,
    [p4Audio.id]: pp4.audio, [p4Edit.id]: pp4.edit,
  };

  const bible = {
    characters: [ eArtist ],
    objects:    [ eChain, eRide ],
    locations:  [ eBlock, eStudio, eRooftop ],
  };

  return { nodes, pos, bible };
}

// ─── TEMPLATE: PIRATE ANIMATION — ADULTS ─────────────────────────────────────
// Dark, cinematic pirate animation for adults — 4 scenes, 15 shots.
// A pirate captain hunts a cursed treasure, is betrayed by her navigator,
// and must choose between the gold and her crew's freedom.
function makeSteampunkWildWestTemplate() {
  const eHale = { id:`e_${uid()}`, kind:"character", name:"Sheriff Iron Hale", tag:"@hale", description:"A robotic sheriff built from brushed brass, steel, and dark leather. Human-sized but heavier in posture, with a faceplate shaped like a stern frontier lawman. One glowing blue ocular lens, one iron mechanical eye aperture. Long weathered duster coat, metal sheriff's badge bolted to the chest, articulated hands fast as pistons. He moves with deliberate restraint until violence starts.", notes:"Primary hero — brass faceplate, blue eye glow, heavy duster, and badge must stay consistent. He should feel lawful, intimidating, and almost mythic.", _imgUrl:"/character_Sheriff_Iron_Hale.png", _prev:"/character_Sheriff_Iron_Hale.png", assetId:"ref" };
  const eRourke = { id:`e_${uid()}`, kind:"character", name:"Rourke Flint", tag:"@rourke", description:"A lean human gunslinger in his late 30s. Dusty black hat, long dark coat, thin mustache, sun-cut face. He carries himself like a man who has won too many duels and wants the town to remember it. His revolver is polished steel with a carved bone grip. Smiles with contempt, not joy.", notes:"Antagonist — human, proud, sharp-featured. His confidence should contrast with Hale's mechanical stillness.", _imgUrl:"/character_Rourke_Flint.png", _prev:"/character_Rourke_Flint.png", assetId:"ref" };
  const eSaloon = { id:`e_${uid()}`, kind:"location", name:"The Brass Spur Saloon", tag:"@saloon", description:"A frontier saloon reimagined through steampunk machinery. Batwing doors, smoky amber light, brass pipes running along the walls, a self-playing steam piano hissing in the corner, ceiling fans driven by belts and gears. Whiskey glasses glow under warm practical lamps. The room feels tense even before anyone speaks.", notes:"Opening location — warm practical light, smoke, brass machinery, and old wood are key.", _imgUrl:"/location_The_Brass_Spur_Saloon.png", _prev:"/location_The_Brass_Spur_Saloon.png", assetId:"ref" };
  const eStreet = { id:`e_${uid()}`, kind:"location", name:"Gearwheel Street", tag:"@street", description:"A dusty frontier main street under hard noon light. Wood storefronts mixed with steam vents, hanging cables, pressure gauges, iron water towers, and rail tracks half-buried in dirt. Wind pushes dust in slow sheets. The street should feel wide, exposed, and perfect for a duel.", notes:"Duel location — harsh light, dust, distance between bodies, and steampunk infrastructure should define the frame.", _imgUrl:"/location_Gearwheel_Street.png", _prev:"/location_Gearwheel_Street.png", assetId:"ref" };
  const eRevolver = { id:`e_${uid()}`, kind:"object", name:"Hale's Steam Revolver", tag:"@revolver", description:"A heavy six-shot revolver with brass chambers, steel barrel, and a pressure valve that exhales a short burst of steam before firing. Built for fast draw and brutal stopping power. The weapon feels engineered, not ornamental.", notes:"Key prop — the steam venting before the winning shot is a signature visual beat.", _imgUrl:"/object_Hale's_Steam_Revolver.png", _prev:"/object_Hale's_Steam_Revolver.png", assetId:"ref" };
  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||"", assetId:e.assetId||"" });
  const liveActionWestern = "Live-action steampunk western, photoreal practical production design, not cartoon, not cel-shaded, not animation. Brass machinery, leather, wood, smoke, dust, hard noon sun, Sergio Leone-style western framing and anticipation.";
  const mkSceneNode = (id, text, dialogueLines, shotCount) => ({
    id, type:T.SCENE, cinematicStyle:"action", visualStyle:"none", shotCount,
    bible:[ sbEntry(eHale), sbEntry(eRourke), sbEntry(eSaloon), sbEntry(eStreet), sbEntry(eRevolver) ],
    dialogueLines,
    sceneText:`${liveActionWestern} ${text}`,
  });

  const sc1id = `sc_${uid()}`;
  const sc2id = `sc_${uid()}`;
  const sc3id = `sc_${uid()}`;

  const sc1 = mkSceneNode(
    sc1id,
    `@saloon, midday. The self-playing steam piano dies mid-note and the room goes silent. @hale stands at the back of the saloon, brass face half-lit through smoke, while a frightened townsman calls out that @rourke is waiting outside. @hale lowers one articulated hand toward @revolver and turns toward the batwing doors. This scene is about silence, machine restraint, and the threshold before the duel begins.`,
    [{ speaker:"Townsman", line:"Sheriff! Rourke Flint's waiting outside." }],
    2
  );
  sc1.directorCoherence = { score:98, skippedBeats:[], overlapIssues:[], recommendation:"Keep this scene spare. It only needs the saloon silence and Hale's acceptance of the challenge." };

  const sc2 = mkSceneNode(
    sc2id,
    `@street, brutal noon light. @rourke waits in the open street first, already owning the space. @hale then steps out of @saloon into the dust and stops. Steam leaks from valves, wind moves loose dirt across the road, and the whole town watches from porches and windows. The scene is pure duel anticipation: first the taunt, then the threshold crossing, then the wide geometry of two bodies holding still.`,
    [{ speaker:"Rourke Flint", line:"Come on out, tin lawman." }],
    2
  );
  sc2.directorCoherence = { score:98, skippedBeats:[], overlapIssues:[], recommendation:"Treat this scene like Leone anticipation. Hold the wide longer and reduce visible action to almost nothing." };

  const sc3 = mkSceneNode(
    sc3id,
    `@street, same noon light. The duel snaps from stillness into speed. First hold on @hale's unreadable mechanical calm. Then @rourke twitches first and draws. @hale clears @revolver with impossible mechanical precision, steam venting as the shot lands. @rourke drops into the dust and @hale remains standing in the center of the street, unshaken. This scene is about violent release after prolonged tension.`,
    [{ speaker:"Sheriff Iron Hale", line:"You came looking for judgment." }],
    2
  );
  sc3.directorCoherence = { score:98, skippedBeats:[], overlapIssues:[], recommendation:"This final scene must be brutally simple: twitch, draw, shot, aftermath. Do not add extra beats." };

  const baseShot = (sceneId, index, data) => {
    const shot = {
      ...mkShot(sceneId, index),
      id:`sh_${uid()}`,
      sceneId,
      index,
      visualStyle:"none",
      ...data,
    };
    shot.compiledText = compileShotText(shot);
    return shot;
  };

  const sh1 = baseShot(sc1id, 1, {
    durationSec:3,
    how:"Wide interior reveal of @saloon as the self-playing steam piano dies and every patron turns toward @hale at the back of the room",
    where:"@saloon interior, smoky amber light, live-action steampunk western",
    when:"opening beat, midday",
    cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"slow-push-in", lens:"35mm", lighting:"practical-fire",
    visualGoal:"Establish a photoreal steampunk saloon and the silence before violence, never cartoon or animated",
    entityTags:["@hale","@saloon"],
    dialogue:`TOWNSMAN (O.S.)\nSheriff! Rourke Flint's waiting outside.`,
    directorNote:"Practical brass, smoke, wood, and warm light. This must look like live-action production design, not illustration."
  });
  const sh2 = baseShot(sc1id, 2, {
    durationSec:3,
    how:"Tight close-up on @hale's brass faceplate and articulated hand lowering beside @revolver as hidden gears whisper under the duster",
    where:"@saloon, isolated close-up, live-action steampunk western",
    when:"accepting the challenge",
    cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"practical-fire",
    visualGoal:"Make Hale's restraint feel dangerous while preserving a photoreal robotic sheriff look",
    entityTags:["@hale","@revolver"],
    directorNote:"Zero cartoon exaggeration. Metal should feel heavy and practical, like a hero prop in a live-action western."
  });

  const sh3 = baseShot(sc2id, 1, {
    durationSec:4,
    how:"Medium portrait of @rourke alone in the street as he waits with one hand hovering near his revolver and throws the challenge toward @saloon",
    where:"@street under brutal noon light, dust and leaking steam, live-action steampunk western",
    when:"the taunt before @hale appears",
    cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"slow-push-in", lens:"50mm", lighting:"hard-contrast",
    visualGoal:"Let @rourke own the frame first so the threat feels human, arrogant, and deliberate",
    entityTags:["@hale","@rourke","@saloon","@street"],
    dialogue:`ROURKE\nCome on out, tin lawman.`,
    directorNote:"Hold on Rourke's confidence. The frame should feel like a classic bandit introduction, not a rushed transition."
  });
  const sh4 = baseShot(sc2id, 2, {
    durationSec:4,
    how:"Track with @hale as he pushes through the batwing doors, steps into the noon glare, then stop in an extreme-wide tableau once @hale and @rourke face each other across the full width of @street",
    where:"transition from @saloon threshold to @street main line, live-action steampunk western",
    when:"the threshold crossing into the standoff",
    cameraSize:"extreme-wide", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"24mm", lighting:"hard-contrast",
    visualGoal:"Make Hale's entrance feel ceremonial, then lock into the classic western geometry of the standoff",
    entityTags:["@hale","@rourke","@street"],
    directorNote:"This shot must earn the wide by first watching Hale enter the arena. Only then settle into the Leone frame."
  });

  const sh5 = baseShot(sc3id, 1, {
    durationSec:2,
    how:"Tight alternating anticipation beat on @hale's still mechanical hand beside @revolver and his unblinking brass face as he waits for @rourke to move first",
    where:"@street, isolated duel details, live-action steampunk western",
    when:"last instant before violence",
    cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"100mm", lighting:"hard-contrast",
    visualGoal:"Put the anticipation on Hale's restraint so the audience waits for the exact instant he decides to move",
    entityTags:["@hale","@revolver","@street"],
    directorNote:"This is the sheriff's held breath. No stylized distortion, just unbearable stillness."
  });
  const sh6 = baseShot(sc3id, 2, {
    durationSec:3,
    how:"Medium-low payoff shot as @rourke twitches and draws first, @hale clears @revolver with mechanical speed, steam vents from the cylinder, and @rourke collapses into the dust while @hale stays perfectly upright",
    where:"@street center line, duel finish, live-action steampunk western",
    when:"the draw and aftermath",
    cameraSize:"medium", cameraAngle:"low-angle", cameraMovement:"whip-pan", lens:"50mm", lighting:"hard-contrast",
    visualGoal:"Deliver the duel payoff with brutal clarity and leave Hale as the immovable victor",
    entityTags:["@hale","@rourke","@revolver","@street"],
    dialogue:`HALE\nYou came looking for judgment.`,
    directorNote:"The violence is sudden and over instantly. The steam vent is the single steampunk punctuation, not a cartoon effect."
  });

  const mkImg = (shot, ar = "16:9") => ({ id:`img_${uid()}`, type:T.IMAGE, shotId:shot.id, sceneId:shot.sceneId, generatedUrl:"", resolution:"1K", aspect_ratio:ar, prompt: shot.compiledText || "" });
  const img1 = mkImg(sh1), img2 = mkImg(sh2), img3 = mkImg(sh3), img4 = mkImg(sh4), img5 = mkImg(sh5), img6 = mkImg(sh6);

  const p1Kling = mkKling(), p1Veo = mkVeo(), p1Audio = mkAudio(), p1Edit = { ...mkVideoEdit(), audioNodeId: p1Audio.id };
  const p2Kling = mkKling(), p2Veo = mkVeo(), p2Audio = mkAudio(), p2Edit = { ...mkVideoEdit(), audioNodeId: p2Audio.id };
  const p3Kling = mkKling(), p3Veo = mkVeo(), p3Audio = mkAudio(), p3Edit = { ...mkVideoEdit(), audioNodeId: p3Audio.id };

  const nodes = [sc1, sc2, sc3, sh1, sh2, sh3, sh4, sh5, sh6, img1, img2, img3, img4, img5, img6, p1Kling, p1Veo, p1Audio, p1Edit, p2Kling, p2Veo, p2Audio, p2Edit, p3Kling, p3Veo, p3Audio, p3Edit];
  const sceneX = 80, shotStart = sceneX + 310 + 70, shotGapX = 340, sceneGapY = 860;
  const rowY = (row) => 80 + row * sceneGapY;
  const imgStart = shotStart + shotGapX * 2 + 80;
  const pipeA = imgStart + shotGapX * 2 + 80, pipeB = pipeA + 380, pipeRowB = 380;
  const pipePos = (row) => ({ kling:{ x:pipeA, y:rowY(row)+20 }, veo:{ x:pipeA, y:rowY(row)+20+pipeRowB }, audio:{ x:pipeB, y:rowY(row)+20 }, edit:{ x:pipeB, y:rowY(row)+20+pipeRowB } });
  const pp1 = pipePos(0), pp2 = pipePos(1), pp3 = pipePos(2);
  const pos = {
    [sc1.id]:{ x:sceneX, y:rowY(0) }, [sc2.id]:{ x:sceneX, y:rowY(1) }, [sc3.id]:{ x:sceneX, y:rowY(2) },
    [sh1.id]:{ x:shotStart, y:rowY(0) }, [sh2.id]:{ x:shotStart+shotGapX, y:rowY(0) },
    [sh3.id]:{ x:shotStart, y:rowY(1) }, [sh4.id]:{ x:shotStart+shotGapX, y:rowY(1) },
    [sh5.id]:{ x:shotStart, y:rowY(2) }, [sh6.id]:{ x:shotStart+shotGapX, y:rowY(2) },
    [img1.id]:{ x:imgStart, y:rowY(0) }, [img2.id]:{ x:imgStart+shotGapX, y:rowY(0) },
    [img3.id]:{ x:imgStart, y:rowY(1) }, [img4.id]:{ x:imgStart+shotGapX, y:rowY(1) },
    [img5.id]:{ x:imgStart, y:rowY(2) }, [img6.id]:{ x:imgStart+shotGapX, y:rowY(2) },
    [p1Kling.id]:pp1.kling,[p1Veo.id]:pp1.veo,[p1Audio.id]:pp1.audio,[p1Edit.id]:pp1.edit,
    [p2Kling.id]:pp2.kling,[p2Veo.id]:pp2.veo,[p2Audio.id]:pp2.audio,[p2Edit.id]:pp2.edit,
    [p3Kling.id]:pp3.kling,[p3Veo.id]:pp3.veo,[p3Audio.id]:pp3.audio,[p3Edit.id]:pp3.edit,
  };
  const bible = { characters:[eHale, eRourke], objects:[eRevolver], locations:[eSaloon, eStreet] };
  return { nodes, pos, bible };
}

function makePirateAnimationTemplate() {

  // ── Bible entities ─────────────────────────────────────────────────────────
  const eMara   = { id:`e_${uid()}`, kind:"character", name:"Captain Mara Vane",  tag:"@mara",    description:"A fearless pirate captain in her early 30s. Dark skin, silver-braided hair, a jagged scar through her left brow. She wears a stolen admiral's coat — deep navy, gold epaulettes, bullet holes patched with red thread. A pistol on each hip. Her eyes are amber and see through everything. Commands by presence alone — she never needs to raise her voice.", notes:"Primary hero — establish her face and coat as visual constants across all scenes. The admiral's coat is the key costume detail.", _imgUrl:"", assetId:"" };
  const eDrago  = { id:`e_${uid()}`, kind:"character", name:"First Mate Drago",   tag:"@drago",   description:"A massive man in his mid-40s. Polynesian features, neck-to-knuckle tattoos in a dark geometric pattern, shaved head. Hands the size of hammers. A voice like rolling thunder that he uses rarely. A weathered cutlass always drawn at half-mast. Completely loyal to Mara — his moral compass is the crew's survival.", notes:"Drago is the emotional anchor of the crew. When he is frightened, the audience should be terrified.", _imgUrl:"", assetId:"" };
  const eSilas  = { id:`e_${uid()}`, kind:"character", name:"Silas the Navigator", tag:"@silas",  description:"A lean, calculating man in his early 30s. Pale, sharp-featured, always a little too clean for a pirate ship. Expensive rings on his fingers. Eyes like coins — always counting. He wears a navigator's coat with too many pockets. His betrayal was planned from the first day he stepped aboard.", notes:"Antagonist — his elegance contrasts with the rest of the crew. Use tight close-ups on his hands to foreshadow his betrayal.", _imgUrl:"", assetId:"" };
  const eCompass = { id:`e_${uid()}`, kind:"object",   name:"The Vane Compass",   tag:"@compass", description:"A brass navigator's compass, old and heavy. But the needle never points north — it points southeast, always. The legend says it points toward whatever the holder desires most, not magnetic north. When held by Silas, it begins spinning. The glass face is cracked. Engraved on the back: 'Only the honest find what they seek.'", notes:"Key prop — must be visually consistent. Always close-up when featured. The spinning needle is the betrayal signal.", _imgUrl:"", assetId:"" };
  const eCove   = { id:`e_${uid()}`, kind:"location",  name:"The Black Cove",     tag:"@cove",    description:"A hidden sea cave carved into volcanic black rock. The ship, Vane's Fury, is anchored in dark water within. Torches burn in iron brackets on the cave walls — orange fire, deep shadows. The sound of water echoing. Stalactites above. A stone dock. The crew moves through the half-dark with practiced ease. Feels like a cathedral of crime.", notes:"Opening and closing location — visual bookend. Establish the ship in the first shot.", _imgUrl:"", assetId:"" };
  const eSea    = { id:`e_${uid()}`, kind:"location",  name:"The Open Sea",       tag:"@sea",     description:"Storm-grey Atlantic. Long deep swells, no land visible anywhere, horizon flat as a blade. The sky is iron and moving. A Royal Navy frigate on the horizon in pursuit — white sails, brass cannons. Vane's Fury cuts through the water ahead of it, sails full, hull leaning. The sea is alive and indifferent to both ships.", notes:"Action scene location — the scale of the ocean makes both ships feel small. The Navy frigate should always be visible in the background.", _imgUrl:"", assetId:"" };
  const eWreck  = { id:`e_${uid()}`, kind:"location",  name:"The Sunken Wreck",   tag:"@wreck",   description:"A merchant galleon resting at 40 feet on white sand. Turquoise light from above, shafts cutting through the water in god-rays. Schools of silver fish move through the rigging. Coral has claimed the hull. The captain's cabin is intact — inside it, a chest of cursed gold. Beautiful and haunting. Silent except for the sound of the deep.", notes:"Underwater scene — entirely different visual register from the other locations. Light is the key element.", _imgUrl:"", assetId:"" };

  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||"", assetId:e.assetId||"" });

  // ── Scene 1: THE BLACK COVE — THE PLAN ────────────────────────────────────
  const sc1id = `sc_${uid()}`;
  const sc1 = {
    id:sc1id, type:T.SCENE, cinematicStyle:"animated-dark",  shotCount:4,
    bible:[ sbEntry(eMara), sbEntry(eDrago), sbEntry(eSilas), sbEntry(eCompass), sbEntry(eCove) ],
    dialogueLines:[
      { speaker:"Captain Mara Vane", line:"The wreck is real. Three days south, forty feet down. Anyone who says otherwise is selling something." },
      { speaker:"Silas the Navigator", line:"I can get us there in two. I know the current." },
      { speaker:"First Mate Drago", line:"He always knows something." },
    ],
    sceneText:`@cove, deep night. Torchlight on salt-wet rock. @mara stands at a stone table — a map spread under her fists, @compass at its centre, needle pointing southeast as always. @drago to her left, arms crossed, watching @silas. @silas traces the route with one ring-heavy finger, too smooth, too certain. @mara looks at @compass, then at @silas. She picks up @compass and turns it over in her hand, reading the inscription. She sets it down and gives the order. The crew moves. Vane's Fury prepares to sail.`,
    directorCoherence:{ score:97, skippedBeats:[], overlapIssues:[], recommendation:"Four beats: world establishment → the map and compass → the tension between Drago and Silas → the order given. Let the silence between @drago and @silas do the work. This scene plants the betrayal." },
  };
  const sh1a = { ...mkShot(sc1id,1), id:`sh_${uid()}`, sceneId:sc1id, index:1,
    how:"Slow wide crane down from the cave mouth into @cove — Vane's Fury filling the frame below, torches reflecting in the black water, the crew small figures moving on deck in preparation", where:"@cove — aerial entry into the cave", when:"opening frame, deep night", cameraSize:"extreme-wide", cameraAngle:"high-angle", cameraMovement:"crane-down", lens:"24mm", lighting:"practical-fire",
    visualGoal:"The ship and the cave together establish this world's scale and secrecy — dark, beautiful, dangerous",
    entityTags:["@cove"], directorNote:"The crane reveals the ship last, emerging from the dark water. The torchlight should feel warm against the cold black rock. Let the audience find the crew before the camera does.", directorQuality:"good", directorIssue:"" };
  const sh1b = { ...mkShot(sc1id,2), id:`sh_${uid()}`, sceneId:sc1id, index:2,
    how:"Medium on @mara at the stone table — map spread under her fists, @compass at its centre. Her face lit from below by torchlight. She studies the map, then glances up at @silas with amber eyes that give nothing away.", where:"@cove — stone table, torchlight", when:"the plan", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"slow-push-in", lens:"50mm", lighting:"practical-fire",
    visualGoal:"@mara is the gravity of every scene — this push-in establishes her as someone who reads rooms and people, not just maps",
    dialogue:`MARA\nThe wreck is real. Three days south, forty feet down. Anyone who says otherwise is selling something.`,
    entityTags:["@mara","@compass","@cove"], directorNote:"The push-in stops when we're at a medium close-up. Her eyes move from the map to @silas before she speaks. The pause before the line is as important as the line itself.", directorQuality:"good", directorIssue:"" };
  const sh1c = { ...mkShot(sc1id,3), id:`sh_${uid()}`, sceneId:sc1id, index:3,
    how:"Over @mara's shoulder — @silas tracing the route on the map, finger moving too quickly, rings catching the torchlight. @drago in the background, watching @silas with flat, unreadable eyes.", where:"@cove — stone table, over @mara's shoulder", when:"@silas offers the route", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"practical-fire",
    visualGoal:"The three-way composition plants the triangle — @mara's back to us, @silas performing, @drago watching. The audience should sense danger before anyone speaks it.",
    dialogue:`SILAS\nI can get us there in two. I know the current.\n\nDRAGO\nHe always knows something.`,
    entityTags:["@mara","@silas","@drago","@cove"], directorNote:"@drago's line lands like a stone in still water — he doesn't move when he says it. @silas's smile in response is the first signal something is wrong. Hold the composition.", directorQuality:"good", directorIssue:"" };
  const sh1d = { ...mkShot(sc1id,4), id:`sh_${uid()}`, sceneId:sc1id, index:4,
    how:"Close on @compass in @mara's hand — she turns it over, reading the inscription. The needle swings southeast. She sets it down. Wide pull-back to reveal the whole crew watching her. She gives a single nod. The cave erupts in movement.", where:"@cove — wide reveal of the crew", when:"the order", cameraSize:"close-up then wide", cameraAngle:"eye-level", cameraMovement:"pull-back", lens:"85mm to 35mm", lighting:"practical-fire",
    visualGoal:"The compass close-up is the scene's pivot — the pull-back to the crew makes @mara's decision feel like it has weight and consequence",
    entityTags:["@mara","@compass","@cove"], directorNote:"The inscription read is the scene's hidden line — the audience should just catch it. The pull-back to the crew must be wide enough to feel the scale of the commitment she's just made.", directorQuality:"good", directorIssue:"" };
  sh1a.compiledText = compileShotText(sh1a); sh1b.compiledText = compileShotText(sh1b);
  sh1c.compiledText = compileShotText(sh1c); sh1d.compiledText = compileShotText(sh1d);

  // ── Scene 2: THE OPEN SEA — THE PURSUIT ───────────────────────────────────
  const sc2id = `sc_${uid()}`;
  const sc2 = {
    id:sc2id, type:T.SCENE, cinematicStyle:"animated-dark", shotCount:4,
    bible:[ sbEntry(eMara), sbEntry(eDrago), sbEntry(eSilas), sbEntry(eSea) ],
    dialogueLines:[
      { speaker:"First Mate Drago", line:"They're gaining. We go south now or we don't go at all." },
      { speaker:"Captain Mara Vane", line:"South. Full sail. Let them follow us to the bottom of the world." },
    ],
    sceneText:`@sea, midday, storm-light. Vane's Fury running hard before the wind, hull leaning, spray exploding from the bow. A Royal Navy frigate on the horizon behind her — closing. @drago at the helm, knuckles white. @mara on the bow, coat snapping in the wind, watching the frigate over her shoulder. @silas below decks with @compass — alone. The needle is spinning now, not pointing southeast anymore. @silas watches it and smiles. On deck, @mara calls the order. Full sail south. The crew leaps to it.`,
    directorCoherence:{ score:95, skippedBeats:[], overlapIssues:[], recommendation:"Four beats: the pursuit established → @drago at the helm under pressure → @silas below decks with the compass (the betrayal signal) → @mara's order. The below-decks cutaway is the scene's hidden knife." },
  };
  const sh2a = { ...mkShot(sc2id,1), id:`sh_${uid()}`, sceneId:sc2id, index:1,
    how:"Wide aerial over Vane's Fury — the ship cutting south through long grey swells, the Navy frigate a white smear on the horizon behind her, both tiny against the endless @sea", where:"@sea — aerial, both ships", when:"the chase, midday", cameraSize:"extreme-wide", cameraAngle:"high-angle", cameraMovement:"slow-track", lens:"24mm", lighting:"overcast",
    visualGoal:"Scale the danger — the ocean makes both ships feel fragile, but the closing gap is unmistakable",
    entityTags:["@sea"], directorNote:"The wide must show the gap between the ships clearly. Vane's Fury should be leading but not comfortably. The grey sea is the third character in this shot.", directorQuality:"good", directorIssue:"" };
  const sh2b = { ...mkShot(sc2id,2), id:`sh_${uid()}`, sceneId:sc2id, index:2,
    how:"Medium on @drago at the helm — both hands on the wheel, ship heeling, spray on his face. His eyes shift from the compass heading to the frigate behind. Behind him @mara watches, coat full of wind, utterly still against the chaos.", where:"@sea — helm deck, tight", when:"@drago under pressure", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"handheld", lens:"50mm", lighting:"overcast",
    visualGoal:"The contrast between @drago's physical effort and @mara's stillness defines both characters in a single frame",
    dialogue:`DRAGO\nThey're gaining. We go south now or we don't go at all.`,
    entityTags:["@drago","@mara","@sea"], directorNote:"Handheld should feel like the ship's motion — not queasy, but alive. @mara is an island of calm in the frame. @drago's hands never leave the wheel.", directorQuality:"good", directorIssue:"" };
  const sh2c = { ...mkShot(sc2id,3), id:`sh_${uid()}`, sceneId:sc2id, index:3,
    how:"Below decks — @silas alone in the navigation cabin. @compass on the table. The needle is spinning. @silas watches it with a small private smile. He closes his fist around @compass. A decision made. Cut before anyone sees him.", where:"@sea — below decks, navigation cabin", when:"the hidden betrayal", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"practical-fire",
    visualGoal:"The spinning compass is the audience's first clear signal — @silas's smile makes it unmistakable. This is the scene's hidden knife.",
    entityTags:["@silas","@compass"], directorNote:"This cutaway is the pivot of the entire story. The compass needle spinning is the visual payoff of the inscription from Scene 1. @silas's smile should be small — pleasure, not villainy. More dangerous that way.", directorQuality:"good", directorIssue:"" };
  const sh2d = { ...mkShot(sc2id,4), id:`sh_${uid()}`, sceneId:sc2id, index:4,
    how:"Wide on deck — @mara at the bow, face into the wind, looking south. She calls the order. Every crew member moves at once. Sails catch the wind and billow full. Vane's Fury surges forward. The frigate behind falls back a degree.", where:"@sea — full deck, bow", when:"the order, surge south", cameraSize:"wide", cameraAngle:"low-angle", cameraMovement:"static", lens:"35mm", lighting:"overcast",
    visualGoal:"The crew's unity in response to @mara's order is the emotional spine of the film — they move as one body",
    dialogue:`MARA\nSouth. Full sail. Let them follow us to the bottom of the world.`,
    entityTags:["@mara","@sea"], directorNote:"The wide low-angle makes the sails filling feel enormous and triumphant. @mara's line lands just as the sails go full. The surge forward is the payoff. Cut on the surge.", directorQuality:"good", directorIssue:"" };
  sh2a.compiledText = compileShotText(sh2a); sh2b.compiledText = compileShotText(sh2b);
  sh2c.compiledText = compileShotText(sh2c); sh2d.compiledText = compileShotText(sh2d);

  // ── Scene 3: THE SUNKEN WRECK — THE DIVE ──────────────────────────────────
  const sc3id = `sc_${uid()}`;
  const sc3 = {
    id:sc3id, type:T.SCENE, cinematicStyle:"animated-dark", shotCount:4,
    bible:[ sbEntry(eMara), sbEntry(eSilas), sbEntry(eCompass), sbEntry(eWreck) ],
    dialogueLines:[
      { speaker:"Captain Mara Vane", line:"That's not treasure. That's a warning." },
      { speaker:"Silas the Navigator", line:"Warnings are for people who can't afford what they're warning you about." },
    ],
    sceneText:`@wreck, forty feet down. @mara and @silas dive together — only the two of them. The @wreck is breathtaking — coral-crusted hull, god-rays from above, silver fish in the rigging. They find the chest in the captain's cabin. @mara opens it — gold coins, yes, but each one has a face pressed into it. The face of someone who died for it. She stares at one coin. @silas is already filling a sack. @mara reaches to stop him. He turns — @compass in his hand, needle spinning freely. His hand is on his knife. The standoff is underwater, silent, beautiful, deadly.`,
    directorCoherence:{ score:96, skippedBeats:[], overlapIssues:[], recommendation:"Four beats: the dive and arrival → the chest opened → the warning coins → the betrayal revealed underwater. The silence of the underwater setting makes every movement carry enormous weight." },
  };
  const sh3a = { ...mkShot(sc3id,1), id:`sh_${uid()}`, sceneId:sc3id, index:1,
    how:"Wide underwater — @mara and @silas descend toward @wreck below them, turquoise light from above, the ship's hull looming ahead, coral and fish making it look alive", where:"@wreck — descent, exterior", when:"the dive, underwater", cameraSize:"wide", cameraAngle:"low-angle", cameraMovement:"slow-push-in", lens:"24mm", lighting:"underwater-rays",
    visualGoal:"The beauty of the @wreck must be overwhelming — the audience should understand immediately why people die for this place",
    entityTags:["@mara","@silas","@wreck"], directorNote:"The underwater light rays are the primary visual element. @wreck should feel like a cathedral — ancient, beautiful, sacred. The two figures descending into it should feel like they're crossing a threshold.", directorQuality:"good", directorIssue:"" };
  const sh3b = { ...mkShot(sc3id,2), id:`sh_${uid()}`, sceneId:sc3id, index:2,
    how:"Inside the cabin — @mara's hands lifting the chest lid. Coins spill out in slow motion, tumbling in the water. She picks one up — extreme close-up on the face pressed into the gold. A human face, eyes closed, peaceful and terrible.", where:"@wreck — captain's cabin interior", when:"the chest opened", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"underwater-rays",
    visualGoal:"The coin face is the film's moral pivot — gold that cost someone everything. @mara's recognition of it is the heart of the scene.",
    entityTags:["@mara","@wreck"], directorNote:"The close-up on the face in the coin must be held long enough for the audience to understand what they're seeing. Slow motion on the spilling coins. @mara's face when she sees the face — hold that too.", directorQuality:"good", directorIssue:"" };
  const sh3c = { ...mkShot(sc3id,3), id:`sh_${uid()}`, sceneId:sc3id, index:3,
    how:"@mara reaches toward @silas, who is already filling his sack with coins, his back to her. She grabs his shoulder. He turns — close on his face, then her face, their words inaudible bubbles underwater.", where:"@wreck — cabin, underwater confrontation", when:"the warning, the disagreement", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"underwater-rays",
    visualGoal:"Dialogue rendered as mute underwater — the audience reads their faces and bodies. @silas's contempt, @mara's alarm.",
    dialogue:`MARA\nThat's not treasure. That's a warning.\n\nSILAS\nWarnings are for people who can't afford what they're warning you about.`,
    entityTags:["@mara","@silas","@wreck"], directorNote:"The dialogue bubbles underwater — we lip-read and read expressions. @silas's contempt is fully readable. The words appear as subtitles. His dismissal of her concern is the last beat before the betrayal.", directorQuality:"good", directorIssue:"" };
  const sh3d = { ...mkShot(sc3id,4), id:`sh_${uid()}`, sceneId:sc3id, index:4,
    how:"Low angle on @silas — @compass in one hand, sack of gold in the other, knife half-drawn. Framed against the god-rays from above. @mara faces him, unarmed, still. The standoff. Beautiful and deadly.", where:"@wreck — cabin, the standoff", when:"betrayal revealed", cameraSize:"medium", cameraAngle:"low-angle", cameraMovement:"static", lens:"35mm", lighting:"underwater-rays",
    visualGoal:"The betrayal is now visible — the choice @silas made in Scene 2 arrives here. The god-rays make the moment achingly beautiful.",
    entityTags:["@mara","@silas","@compass","@wreck"], directorNote:"@silas should look genuinely regretful — he liked @mara, which makes this worse. The god-rays behind him are almost saintly, which is the irony. @mara's stillness in response is her strength.", directorQuality:"good", directorIssue:"" };
  sh3a.compiledText = compileShotText(sh3a); sh3b.compiledText = compileShotText(sh3b);
  sh3c.compiledText = compileShotText(sh3c); sh3d.compiledText = compileShotText(sh3d);

  // ── Scene 4: THE BLACK COVE — THE RECKONING ───────────────────────────────
  const sc4id = `sc_${uid()}`;
  const sc4 = {
    id:sc4id, type:T.SCENE, cinematicStyle:"animated-dark", shotCount:3,
    bible:[ sbEntry(eMara), sbEntry(eDrago), sbEntry(eCompass), sbEntry(eCove) ],
    dialogueLines:[
      { speaker:"First Mate Drago", line:"Where's Silas?" },
      { speaker:"Captain Mara Vane", line:"Gone. And the gold with him." },
      { speaker:"First Mate Drago", line:"And the compass?" },
      { speaker:"Captain Mara Vane", line:"Right here. Still pointing southeast. Just like it always did." },
    ],
    sceneText:`@cove. Vane's Fury back at anchor, torches burning. @mara climbs aboard alone — no sack of gold, no @silas. @drago waits on deck, reads the situation in her face, says nothing for a long moment. Then he asks where @silas is. @mara's answer is flat: gone, gold with him. @drago asks about @compass. @mara pulls it from her coat. The needle points southeast — steady, not spinning. She holds it up in the torchlight. The crew watches. She closes her fist around it, turns and walks toward the captain's cabin. @drago looks at the crew. The crew looks at him. The ship is still theirs.`,
    directorCoherence:{ score:99, skippedBeats:[], overlapIssues:[], recommendation:"Three-beat close: @mara returns alone → the exchange with @drago → @mara keeps @compass and moves forward. The final frame must echo the first — the ship in the cove. What was lost was the gold. What was kept was everything else." },
  };
  const sh4a = { ...mkShot(sc4id,1), id:`sh_${uid()}`, sceneId:sc4id, index:1,
    how:"@cove — wide static. Vane's Fury at anchor, torches burning. @mara climbs up the side alone, no sack, water dripping from her coat. @drago at the rail watching her, the crew behind him. Nobody speaks.", where:"@cove — ship's rail, return", when:"@mara's return", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"35mm", lighting:"practical-fire",
    visualGoal:"The visual echo of Scene 1 — same ship, same cove, same torches. But @mara is alone now, and the crew can read the loss in how she moves.",
    entityTags:["@mara","@drago","@cove"], directorNote:"Mirror the wide from Scene 1 exactly — but the energy is completely different now. The absence of the gold sack speaks before any dialogue. The crew's silence is a held breath.", directorQuality:"good", directorIssue:"" };
  const sh4b = { ...mkShot(sc4id,2), id:`sh_${uid()}`, sceneId:sc4id, index:2,
    how:"Two-shot: @mara and @drago face to face on deck — torchlight between them. His question, her answer. Close enough to see the small muscle in @mara's jaw. She doesn't look away.", where:"@cove — deck, two-shot", when:"the exchange", cameraSize:"medium-close", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"practical-fire",
    visualGoal:"The exchange between @mara and @drago is the emotional close of the story — honesty between people who have earned it",
    dialogue:`DRAGO\nWhere's Silas?\n\nMARA\nGone. And the gold with him.\n\nDRAGO\nAnd the compass?\n\nMARA\nRight here. Still pointing southeast. Just like it always did.`,
    entityTags:["@mara","@drago","@cove"], directorNote:"Two-shot, static. No movement. Let the dialogue carry the scene. @drago's face when she says 'still pointing southeast' — the smallest possible smile. He understood what she chose.", directorQuality:"good", directorIssue:"" };
  const sh4c = { ...mkShot(sc4id,3), id:`sh_${uid()}`, sceneId:sc4id, index:3,
    how:"Slow crane-up from @mara's fist closed around @compass on the deck — pulling up and back to reveal the whole ship, the whole cove, the torches burning in the black rock. @mara walks toward the cabin. @drago turns to the crew. Wide holds until the cave mouth frames the ship like a painting.", where:"@cove — full reveal, closing frame", when:"the final frame", cameraSize:"extreme-wide", cameraAngle:"crane-up", cameraMovement:"crane-up", lens:"35mm", lighting:"practical-fire",
    visualGoal:"The mirror of the opening crane-down — the ship is still here, the crew is still together, the compass is in the right hands. Everything lost was replaceable. The final frame is the thesis.",
    entityTags:["@mara","@drago","@compass","@cove"], directorNote:"Echo the opening crane exactly. Down became up. The ship in the cove at the end must feel identical to the beginning — same composition, same torchlight — but the audience knows everything has changed. Fade on the cave mouth framing the ship.", directorQuality:"good", directorIssue:"" };
  sh4a.compiledText = compileShotText(sh4a); sh4b.compiledText = compileShotText(sh4b); sh4c.compiledText = compileShotText(sh4c);

  // ── Per-scene pipeline nodes ───────────────────────────────────────────────
  const m1Kling = mkKling(); const m1Veo = mkVeo(); const m1Audio = mkAudio();
  const m1Edit  = { ...mkVideoEdit(), audioNodeId: m1Audio.id };
  const m2Kling = mkKling(); const m2Veo = mkVeo(); const m2Audio = mkAudio();
  const m2Edit  = { ...mkVideoEdit(), audioNodeId: m2Audio.id };
  const m3Kling = mkKling(); const m3Veo = mkVeo(); const m3Audio = mkAudio();
  const m3Edit  = { ...mkVideoEdit(), audioNodeId: m3Audio.id };
  const m4Kling = mkKling(); const m4Veo = mkVeo(); const m4Audio = mkAudio();
  const m4Edit  = { ...mkVideoEdit(), audioNodeId: m4Audio.id };

  // ── Image nodes ────────────────────────────────────────────────────────────
  const mkImg = (shot, ar) => ({
    id:`img_${uid()}`, type:T.IMAGE, shotId:shot.id, sceneId:shot.sceneId,
    generatedUrl:"", resolution:"1K", aspect_ratio:ar, prompt: shot.compiledText || "",
  });
  const img1a = mkImg(sh1a,"16:9"); const img1b = mkImg(sh1b,"16:9");
  const img1c = mkImg(sh1c,"16:9"); const img1d = mkImg(sh1d,"16:9");
  const img2a = mkImg(sh2a,"16:9"); const img2b = mkImg(sh2b,"16:9");
  const img2c = mkImg(sh2c,"1:1");  const img2d = mkImg(sh2d,"16:9");
  const img3a = mkImg(sh3a,"16:9"); const img3b = mkImg(sh3b,"1:1");
  const img3c = mkImg(sh3c,"16:9"); const img3d = mkImg(sh3d,"16:9");
  const img4a = mkImg(sh4a,"16:9"); const img4b = mkImg(sh4b,"16:9"); const img4c = mkImg(sh4c,"16:9");

  // ── Assemble ───────────────────────────────────────────────────────────────
  const nodes = [
    sc1, sc2, sc3, sc4,
    sh1a, sh1b, sh1c, sh1d,
    sh2a, sh2b, sh2c, sh2d,
    sh3a, sh3b, sh3c, sh3d,
    sh4a, sh4b, sh4c,
    img1a, img1b, img1c, img1d,
    img2a, img2b, img2c, img2d,
    img3a, img3b, img3c, img3d,
    img4a, img4b, img4c,
    m1Kling, m1Veo, m1Audio, m1Edit,
    m2Kling, m2Veo, m2Audio, m2Edit,
    m3Kling, m3Veo, m3Audio, m3Edit,
    m4Kling, m4Veo, m4Audio, m4Edit,
  ];

  const sceneX    = 80;
  const shotStart = sceneX + 310 + 70;
  const shotGapX  = 340;
  const sceneGapY = 940;
  const rowY      = (row) => 80 + row * sceneGapY;
  const imgStart  = shotStart + shotGapX * 4 + 80;
  const pipeA     = imgStart + shotGapX * 4 + 100;
  const pipeB     = pipeA + 380;
  const pipeRowB  = 420;
  const pipePos   = (row) => ({
    kling: { x:pipeA, y:rowY(row) + 40 },
    veo:   { x:pipeA, y:rowY(row) + 40 + pipeRowB },
    audio: { x:pipeB, y:rowY(row) + 40 },
    edit:  { x:pipeB, y:rowY(row) + 40 + pipeRowB },
  });
  const pp1=pipePos(0), pp2=pipePos(1), pp3=pipePos(2), pp4=pipePos(3);

  const pos = {
    [sc1id]: { x:sceneX, y:rowY(0) }, [sc2id]: { x:sceneX, y:rowY(1) },
    [sc3id]: { x:sceneX, y:rowY(2) }, [sc4id]: { x:sceneX, y:rowY(3) },
    [sh1a.id]:{ x:shotStart,            y:rowY(0) },
    [sh1b.id]:{ x:shotStart+shotGapX,   y:rowY(0) },
    [sh1c.id]:{ x:shotStart+shotGapX*2, y:rowY(0) },
    [sh1d.id]:{ x:shotStart+shotGapX*3, y:rowY(0) },
    [sh2a.id]:{ x:shotStart,            y:rowY(1) },
    [sh2b.id]:{ x:shotStart+shotGapX,   y:rowY(1) },
    [sh2c.id]:{ x:shotStart+shotGapX*2, y:rowY(1) },
    [sh2d.id]:{ x:shotStart+shotGapX*3, y:rowY(1) },
    [sh3a.id]:{ x:shotStart,            y:rowY(2) },
    [sh3b.id]:{ x:shotStart+shotGapX,   y:rowY(2) },
    [sh3c.id]:{ x:shotStart+shotGapX*2, y:rowY(2) },
    [sh3d.id]:{ x:shotStart+shotGapX*3, y:rowY(2) },
    [sh4a.id]:{ x:shotStart,            y:rowY(3) },
    [sh4b.id]:{ x:shotStart+shotGapX,   y:rowY(3) },
    [sh4c.id]:{ x:shotStart+shotGapX*2, y:rowY(3) },
    [img1a.id]:{ x:imgStart,            y:rowY(0) },
    [img1b.id]:{ x:imgStart+shotGapX,   y:rowY(0) },
    [img1c.id]:{ x:imgStart+shotGapX*2, y:rowY(0) },
    [img1d.id]:{ x:imgStart+shotGapX*3, y:rowY(0) },
    [img2a.id]:{ x:imgStart,            y:rowY(1) },
    [img2b.id]:{ x:imgStart+shotGapX,   y:rowY(1) },
    [img2c.id]:{ x:imgStart+shotGapX*2, y:rowY(1) },
    [img2d.id]:{ x:imgStart+shotGapX*3, y:rowY(1) },
    [img3a.id]:{ x:imgStart,            y:rowY(2) },
    [img3b.id]:{ x:imgStart+shotGapX,   y:rowY(2) },
    [img3c.id]:{ x:imgStart+shotGapX*2, y:rowY(2) },
    [img3d.id]:{ x:imgStart+shotGapX*3, y:rowY(2) },
    [img4a.id]:{ x:imgStart,            y:rowY(3) },
    [img4b.id]:{ x:imgStart+shotGapX,   y:rowY(3) },
    [img4c.id]:{ x:imgStart+shotGapX*2, y:rowY(3) },
    [m1Kling.id]:pp1.kling, [m1Veo.id]:pp1.veo, [m1Audio.id]:pp1.audio, [m1Edit.id]:pp1.edit,
    [m2Kling.id]:pp2.kling, [m2Veo.id]:pp2.veo, [m2Audio.id]:pp2.audio, [m2Edit.id]:pp2.edit,
    [m3Kling.id]:pp3.kling, [m3Veo.id]:pp3.veo, [m3Audio.id]:pp3.audio, [m3Edit.id]:pp3.edit,
    [m4Kling.id]:pp4.kling, [m4Veo.id]:pp4.veo, [m4Audio.id]:pp4.audio, [m4Edit.id]:pp4.edit,
  };

  const bible = {
    characters: [ eMara, eDrago, eSilas ],
    objects:    [ eCompass ],
    locations:  [ eCove, eSea, eWreck ],
  };

  return { nodes, pos, bible };
}

// ─── TEMPLATE: MEDIEVAL FANTASY EPIC ─────────────────────────────────────────
// A Lord of the Rings-style epic fantasy short — 4 scenes, 14 shots.
// Fellowship, journey through ancient lands, a confrontation, and a sacrifice.
function makeMedievalFantasyTemplate() {

  // ── Bible entities ─────────────────────────────────────────────────────────
  const eHero     = { id:`e_${uid()}`, kind:"character", name:"The Ranger",      tag:"@ranger",   description:"A weathered ranger in his 40s. Long dark cloak, worn leather armour, a cracked sword hilt at the hip. Eyes that have seen too much. Face half-obscured by a hood. Moves like someone who has survived the wild alone for years.", notes:"Primary hero — generate portrait reference first. Establish face, cloak texture, sword hilt as visual constants.", _imgUrl:"/character_The_Ranger.png", _prev:"/character_The_Ranger.png", assetId:"ref" };
  const eWizard   = { id:`e_${uid()}`, kind:"character", name:"The Grey Wizard", tag:"@wizard",   description:"Ancient wizard, tall and lean. Grey robes weathered by wind and rain. Long white beard, bushy brows. Eyes that hold distant light. Carries a gnarled wooden staff topped with a pale crystal that glows faintly in shadow.", notes:"Supporting character — staff glow is the key visual identifier, use in dark scenes.", _imgUrl:"/character_The_Grey_Wizard.png", _prev:"/character_The_Grey_Wizard.png", assetId:"ref" };
  const eLord     = { id:`e_${uid()}`, kind:"character", name:"The Dark Lord",   tag:"@darklord", description:"A towering figure in black iron armour, no visible face — only darkness behind the visor. Robes bleed into shadow. Radiates cold authority. Every frame he appears, the environment darkens around him.", notes:"Antagonist — never fully lit, always partially in shadow or backlit. Reveal slowly across scenes.", _imgUrl:"", assetId:"" };
  const eRing     = { id:`e_${uid()}`, kind:"object",    name:"The Cursed Ring", tag:"@ring",     description:"A plain gold ring, unadorned. But in certain light — firelight, moonlight, the wizard's staff glow — dark script appears on its surface. It rests in the palm or on a chain. Small but always weighted with visual significance.", notes:"Key prop — must be visually consistent. Always close-up when featured. The script detail is the shot's payoff.", _imgUrl:"", assetId:"" };
  const eForest   = { id:`e_${uid()}`, kind:"location",  name:"The Ancient Forest", tag:"@forest", description:"A vast primordial forest of enormous oak and ash trees, roots like the walls of fortresses. Mist clings to the ground at all times. Shafts of light barely reach the floor. The trees are so old they feel sentient. Moss everywhere. The silence here has weight.", notes:"Established in Scene 1 — sets the world's tone. Return to it in the final scene.", _imgUrl:"", assetId:"" };
  const eMountain = { id:`e_${uid()}`, kind:"location",  name:"The Black Pass",  tag:"@pass",     description:"A narrow mountain pass between two sheer obsidian cliffs. Perpetual grey sky above — no stars, no sun. Wind screams through the gap. The path is ancient stone, cracked and tilted. Every step is a commitment. The pass feels like a throat.", notes:"Journey location — Scene 2. Wide shots emphasise the scale and hostility of the environment.", _imgUrl:"", assetId:"" };
  const eFortress = { id:`e_${uid()}`, kind:"location",  name:"The Dark Fortress", tag:"@fortress", description:"A massive iron fortress built into the side of a volcanic mountain. Towers like crooked fingers against a perpetually red sky. A moat of slow black lava. The gate is a single enormous iron door carved with screaming faces. Torchlight burns red inside every window.", notes:"Antagonist's seat of power — Scene 3 confrontation. Establish scale before going inside.", _imgUrl:"", assetId:"" };

  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||e._prev||"", assetId:e.assetId||"" });

  // ── Scene 1: THE ANCIENT FOREST — DEPARTURE ───────────────────────────────
  const sc1id = `sc_${uid()}`;
  const sc1 = {
    id:sc1id, type:T.SCENE, cinematicStyle:"epic-fantasy", shotCount:4,
    bible:[ sbEntry(eHero), sbEntry(eWizard), sbEntry(eRing), sbEntry(eForest) ],
    dialogueLines:[ { speaker:"The Grey Wizard", line:"The ring must go back into the dark — before the dark comes for all of them." }, { speaker:"The Ranger", line:"And if I refuse?" }, { speaker:"The Grey Wizard", line:"Then there is no one else." } ],
    sceneText:`@forest at dusk. The light is failing. @wizard stands at the base of a vast oak, @ring resting in his open palm, the ancient script catching the last amber light. @ranger watches from a distance, arms crossed, unconvinced. @wizard speaks without looking up: the @ring must go back into the dark before the dark comes for all of them. @ranger takes the @ring. Closes his fist around it. A long beat — the forest holds its breath. Then he nods. They leave together, vanishing into the mist between the ancient trees.`,
    directorCoherence:{ score:96, skippedBeats:[], overlapIssues:[], recommendation:"Four beats: world establishment → ring reveal → the decision → departure. Hold every beat longer than comfortable. This is a world that earns its silences." },
  };
  const sh1a = { ...mkShot(sc1id,1), id:`sh_${uid()}`, sceneId:sc1id, index:1,
    how:"Slow crane down through the forest canopy — shafts of amber dusk light breaking through enormous oak limbs, mist curling on the ground below, revealing @wizard as a small figure at the base of the oldest tree", where:"@forest — canopy to ground, establishing crane", when:"opening frame, dusk", cameraSize:"extreme-wide", cameraAngle:"high-angle", cameraMovement:"crane-down", lens:"24mm", lighting:"golden-hour",
    visualGoal:"Establish the world's ancient scale — the forest is a character before any person is",
    entityTags:["@wizard","@forest"], directorNote:"The crane reveals @wizard as the forest already dwarfs him. Do not rush the crane. Let the mist and light establish the world fully before any human drama begins.", directorQuality:"good", directorIssue:"" };
  const sh1b = { ...mkShot(sc1id,2), id:`sh_${uid()}`, sceneId:sc1id, index:2,
    how:"Extreme close-up on @ring in @wizard's open palm — ancient script catching amber light, glowing faintly, @wizard's gnarled fingers perfectly still", where:"@forest — close on @wizard's hand", when:"ring reveal", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"100mm",  lighting:"golden-hour",
    visualGoal:"The @ring is the thesis of the entire film — this close-up must make the audience feel its weight",
    entityTags:["@wizard","@ring","@forest"], directorNote:"Hold on the palm until the script text is unmistakable. The faint glow is practical — amber light, not VFX. Do not move.", directorQuality:"good", directorIssue:"" };
  const sh1c = { ...mkShot(sc1id,3), id:`sh_${uid()}`, sceneId:sc1id, index:3,
    how:"Over @wizard's shoulder — @ranger in the middle distance, half-shadow, watching. His face unreadable. Slow push toward him as @wizard speaks off-camera", where:"@forest — between the trees, soft depth", when:"the decision", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"slow-push-in", lens:"85mm", lighting:"practical-night",
    visualGoal:"The push-in makes @ranger's silence feel like a choice being made — we arrive at his face just as he decides",
    dialogue:`WIZARD (O.S.)\nThe ring must go back into the dark — before the dark comes for all of them.\n\nRANGER\nAnd if I refuse?\n\nWIZARD (O.S.)\nThen there is no one else.`,
    entityTags:["@ranger","@forest"], directorNote:"The push is the argument. We reach @ranger's face at the moment he takes the ring. Sync the push to the pace of @wizard's words — not too fast.", directorQuality:"good", directorIssue:"" };
  const sh1d = { ...mkShot(sc1id,4), id:`sh_${uid()}`, sceneId:sc1id, index:4,
    how:"Wide pull-back as @ranger and @wizard walk away through the mist — two silhouettes dissolving into the ancient @forest, the oak trees closing behind them", where:"@forest — wide, retreating figures", when:"departure", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"pull-back", lens:"35mm", lighting:"practical-night",
    visualGoal:"The world swallows them — this frame must feel like a door closing. It should feel both heroic and terrifying.",
    entityTags:["@ranger","@wizard","@forest"], directorNote:"Let the mist close around them before cutting. The forest reclaiming the frame is the punctuation. Hold until they are nearly gone.", directorQuality:"good", directorIssue:"" };
  sh1a.compiledText = compileShotText(sh1a); sh1b.compiledText = compileShotText(sh1b);
  sh1c.compiledText = compileShotText(sh1c); sh1d.compiledText = compileShotText(sh1d);

  // ── Scene 2: THE BLACK PASS — THE JOURNEY ─────────────────────────────────
  const sc2id = `sc_${uid()}`;
  const sc2 = {
    id:sc2id, type:T.SCENE, cinematicStyle:"epic-fantasy", shotCount:3,
    bible:[ sbEntry(eHero), sbEntry(eWizard), sbEntry(eRing), sbEntry(eMountain) ],
    dialogueLines:[ { speaker:"The Grey Wizard", line:"Hold on. It does not have you yet." }, { speaker:"The Ranger", line:"How do you know?" }, { speaker:"The Grey Wizard", line:"Because you are still asking." } ],
    sceneText:`@pass under a dead grey sky. @ranger leads, @wizard a step behind. Wind screams through the gap in the cliffs — both figures lean into it. Halfway through, @ranger stumbles — clutches his chest. Pulls out @ring on its chain, stares at it. The script on @ring pulses in the dark cold air of the pass. @wizard sees it and raises his staff — the pale crystal flares, and the script fades. @ranger tucks @ring away. They exchange a look. Neither speaks. They walk on.`,
    directorCoherence:{ score:94, skippedBeats:[], overlapIssues:[], recommendation:"Three-beat journey arc: hostile world → ring's pull on the bearer → recovery and resolve. The middle beat is the film's emotional core. Don't cut away from @ranger's face too quickly." },
  };
  const sh2a = { ...mkShot(sc2id,1), id:`sh_${uid()}`, sceneId:sc2id, index:1,
    how:"Wide low-angle looking up the length of @pass — @ranger and @wizard tiny figures midway through, sheer obsidian walls rising on both sides, grey sky a thin strip above", where:"@pass — full width, low angle", when:"midway through the pass", cameraSize:"extreme-wide", cameraAngle:"low-angle", cameraMovement:"static", lens:"24mm", lighting:"overcast",
    visualGoal:"The pass is a trap they chose — scale and hostility established before any drama",
    entityTags:["@ranger","@wizard","@pass"], directorNote:"The 24mm low angle makes the walls feel like they're leaning in. @ranger and @wizard must be tiny — the environment is the antagonist in this shot.", directorQuality:"good", directorIssue:"" };
  const sh2b = { ...mkShot(sc2id,2), id:`sh_${uid()}`, sceneId:sc2id, index:2,
    how:"Close on @ranger's face and chest — hand pressed to heart, eyes tight, @ring on its chain emerging from his fist. The script on @ring pulses faintly. His breath fogs in the cold air.", where:"@pass — tight on @ranger", when:"the ring's pull", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast",
    visualGoal:"The @ring is pulling at him — the audience must feel its gravity before @wizard intervenes",
    dialogue:`WIZARD\nHold on. It does not have you yet.\n\nRANGER\nHow do you know?\n\nWIZARD\nBecause you are still asking.`,
    entityTags:["@ranger","@ring","@pass"], directorNote:"Hold on his face. The pulse in @ring is practical — a prop light effect, not CG. His breath fog tells us how cold and hostile this place is. Do not cut.", directorQuality:"good", directorIssue:"" };
  const sh2c = { ...mkShot(sc2id,3), id:`sh_${uid()}`, sceneId:sc2id, index:3,
    how:"Medium two-shot — @wizard's staff crystal flaring pale light, @ranger tucking @ring away, both facing forward. A look between them. Then they walk on into the wind.", where:"@pass — two-shot, walking forward", when:"recovery and resolve", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"tracking", lens:"50mm", lighting:"hard-contrast",
    visualGoal:"No words needed — the look between them says everything. The tracking shot carries them forward despite everything.",
    entityTags:["@ranger","@wizard","@ring","@pass"], directorNote:"The tracking shot must match their pace exactly. The look is the scene's emotional close — hold it two beats, then let the wind carry them forward.", directorQuality:"good", directorIssue:"" };
  sh2a.compiledText = compileShotText(sh2a); sh2b.compiledText = compileShotText(sh2b); sh2c.compiledText = compileShotText(sh2c);

  // ── Scene 3: THE FORTRESS — CONFRONTATION ─────────────────────────────────
  const sc3id = `sc_${uid()}`;
  const sc3 = {
    id:sc3id, type:T.SCENE, cinematicStyle:"epic-fantasy", shotCount:4,
    bible:[ sbEntry(eHero), sbEntry(eLord), sbEntry(eRing), sbEntry(eFortress) ],
    dialogueLines:[ { speaker:"The Ranger", line:"Not for you." } ],
    sceneText:`Inside @fortress. A vast iron hall, lit by red torchfire. @darklord stands at the far end — enormous, motionless, armour bleeding into shadow. @ranger walks the length of the hall alone. He stops thirty feet away. @darklord extends one gauntleted hand. @ranger holds @ring between two fingers. A beat — the longest beat of the film. Then @ranger closes his fist and says: not for you. @darklord moves. The red light explodes outward. The hall erupts.`,
    directorCoherence:{ score:98, skippedBeats:[], overlapIssues:[], recommendation:"Four-beat confrontation: approach → standoff → the choice → eruption. The standoff beat is the film's climax. Hold it until the audience cannot breathe." },
  };
  const sh3a = { ...mkShot(sc3id,1), id:`sh_${uid()}`, sceneId:sc3id, index:1,
    how:"@ranger's POV walking the length of the hall — @darklord at the far end growing slowly larger with each step, red torchlight on iron walls, @darklord's armour absorbing all light around him", where:"@fortress — interior hall, walking toward @darklord", when:"approach", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"slow-push-in", lens:"35mm", lighting:"low-key",
    visualGoal:"@ranger walks toward the thing that cannot be defeated — the push-in makes it feel inevitable",
    entityTags:["@ranger","@darklord","@fortress"], directorNote:"This push must be slow enough that the audience dreads @darklord's growing size. Red torchlight should flicker — practical, not steady. @darklord never moves in this shot.", directorQuality:"good", directorIssue:"" };
  const sh3b = { ...mkShot(sc3id,2), id:`sh_${uid()}`, sceneId:sc3id, index:2,
    how:"Low angle on @darklord — gauntlet extended, enormous, palm up. Framed from below so the iron ceiling and red sky through the high windows press down above him. Completely still.", where:"@fortress — low angle on @darklord", when:"standoff, @darklord's demand", cameraSize:"medium", cameraAngle:"low-angle", cameraMovement:"static", lens:"35mm", lighting:"backlit",
    visualGoal:"@darklord must feel like a geological force, not a person. The backlit low angle strips all detail — he is pure silhouette and authority.",
    entityTags:["@darklord","@fortress"], directorNote:"Do not show @darklord's face at any point. Backlit silhouette only. The extended gauntlet is the only movement. Hold for as long as you can.", directorQuality:"good", directorIssue:"" };
  const sh3c = { ...mkShot(sc3id,3), id:`sh_${uid()}`, sceneId:sc3id, index:3,
    how:"Extreme close-up on @ring held between @ranger's finger and thumb — the script glowing red-gold in the fortress light, the choice visible in the trembling of his hand", where:"@fortress — tight on @ranger's hand and @ring", when:"the choice", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"100mm", lighting:"low-key",
    visualGoal:"The entire film arrives at this frame. @ring must glow. The trembling hand tells the audience everything about what it costs to refuse.",
    dialogue:`RANGER\nNot for you.`,
    entityTags:["@ranger","@ring","@fortress"], directorNote:"This is the film's emotional apex. Maximum close-up on @ring. The tremble is not weakness — it is the weight of choice. Do not cut early.", directorQuality:"good", directorIssue:"" };
  const sh3d = { ...mkShot(sc3id,4), id:`sh_${uid()}`, sceneId:sc3id, index:4,
    how:"Wide of the entire hall as @darklord surges forward — red light erupting from his armour, @ranger bracing, the hall's iron walls trembling, torches flaring outward in a shockwave", where:"@fortress — full hall width, eruption", when:"eruption", cameraSize:"wide", cameraAngle:"low-angle", cameraMovement:"static", lens:"24mm", lighting:"hard-contrast",
    visualGoal:"The refusal costs everything — the wide shot makes the scale of the consequence visceral",
    entityTags:["@ranger","@darklord","@fortress"], directorNote:"The explosion of red light is the cut point. Hold the wide just long enough to see @ranger's silhouette against the eruption, then cut to black or the final scene.", directorQuality:"good", directorIssue:"" };
  sh3a.compiledText = compileShotText(sh3a); sh3b.compiledText = compileShotText(sh3b);
  sh3c.compiledText = compileShotText(sh3c); sh3d.compiledText = compileShotText(sh3d);

  // ── Scene 4: THE FOREST — THE RETURN ──────────────────────────────────────
  const sc4id = `sc_${uid()}`;
  const sc4 = {
    id:sc4id, type:T.SCENE, cinematicStyle:"epic-fantasy", shotCount:3,
    bible:[ sbEntry(eHero), sbEntry(eWizard), sbEntry(eForest) ],
    sceneText:`@forest. Dawn — the first real light of the film. @ranger sits against the base of the ancient oak from Scene 1. He is wounded — one hand pressed to his side — but alive. @wizard kneels beside him, says nothing. @ranger opens his fist. His palm is empty. @ring is gone. @wizard rests a hand on @ranger's shoulder. Slowly, reluctantly, light returns to the @forest. The mist lifts. For the first time, we hear birds.`,
    directorCoherence:{ score:99, skippedBeats:[], overlapIssues:[], recommendation:"Three-beat resolution: survival → the empty hand → the world healing. Return to the oak from Scene 1 to close the visual circle. This is earned silence. Let it breathe." },
  };
  const sh4a = { ...mkShot(sc4id,1), id:`sh_${uid()}`, sceneId:sc4id, index:1,
    how:"Same oak from Scene 1 — but dawn light now. @ranger propped against the root, @wizard beside him. The @forest is slowly brightening. Static wide, watching from a distance.", where:"@forest — the ancient oak, dawn", when:"aftermath, dawn", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"golden-hour",
    visualGoal:"The visual echo of Scene 1 tells the audience the circle is closing — but everything has changed",
    entityTags:["@ranger","@wizard","@forest"], directorNote:"Hold the wide. Let the audience find @ranger and @wizard in the frame themselves. The light returning to the @forest is the quiet payoff. Do not underline it.", directorQuality:"good", directorIssue:"" };
  const sh4b = { ...mkShot(sc4id,2), id:`sh_${uid()}`, sceneId:sc4id, index:2,
    how:"Close on @ranger's open palm — empty. The chain is gone. Just a weathered hand, still trembling slightly, in the new morning light.", where:"@forest — close on @ranger's hand", when:"the empty hand", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"golden-hour",
    visualGoal:"The empty hand is the resolution — @ring's absence is as powerful as its presence was in Scene 1 and 3",
    entityTags:["@ranger","@forest"], directorNote:"Echo the close-up from Scene 1 and 3 — same hand, same lens, same framing. But now it is empty and lit by dawn. The contrast does the work. Hold the empty palm.", directorQuality:"good", directorIssue:"" };
  const sh4c = { ...mkShot(sc4id,3), id:`sh_${uid()}`, sceneId:sc4id, index:3,
    how:"@wizard's hand on @ranger's shoulder. Slow crane-up from the two figures into the brightening @forest canopy — mist lifting, first light coming through the leaves, the @forest alive again. Hold on the canopy as the figures below disappear.", where:"@forest — close to canopy pull-up", when:"the world healing, final frame", cameraSize:"wide", cameraAngle:"low-angle", cameraMovement:"crane-up", lens:"35mm", lighting:"golden-hour",
    visualGoal:"The mirror of the opening crane-down — the world is breathing again. This is the last image. Make it luminous.",
    entityTags:["@ranger","@wizard","@forest"], directorNote:"Mirror the crane from Shot 1 exactly — down became up, dusk became dawn, mist became light. The @forest has woken. Let the crane rise until the figures are gone and only the canopy remains. Fade.", directorQuality:"good", directorIssue:"" };
  sh4a.compiledText = compileShotText(sh4a); sh4b.compiledText = compileShotText(sh4b); sh4c.compiledText = compileShotText(sh4c);

  // ── Per-scene pipeline nodes ───────────────────────────────────────────────
  const m1Kling = mkKling(); const m1Veo = mkVeo(); const m1Audio = mkAudio();
  const m1Edit  = { ...mkVideoEdit(), audioNodeId: m1Audio.id };
  const m2Kling = mkKling(); const m2Veo = mkVeo(); const m2Audio = mkAudio();
  const m2Edit  = { ...mkVideoEdit(), audioNodeId: m2Audio.id };
  const m3Kling = mkKling(); const m3Veo = mkVeo(); const m3Audio = mkAudio();
  const m3Edit  = { ...mkVideoEdit(), audioNodeId: m3Audio.id };
  const m4Kling = mkKling(); const m4Veo = mkVeo(); const m4Audio = mkAudio();
  const m4Edit  = { ...mkVideoEdit(), audioNodeId: m4Audio.id };

  // ── Image nodes ────────────────────────────────────────────────────────────
  const mkImg = (shot, ar) => ({
    id:`img_${uid()}`, type:T.IMAGE, shotId:shot.id, sceneId:shot.sceneId,
    generatedUrl:"", resolution:"1K", aspect_ratio:ar, prompt: shot.compiledText || "",
  });
  const img1a = mkImg(sh1a,"16:9"); const img1b = mkImg(sh1b,"1:1");
  const img1c = mkImg(sh1c,"16:9"); const img1d = mkImg(sh1d,"16:9");
  const img2a = mkImg(sh2a,"16:9"); const img2b = mkImg(sh2b,"16:9"); const img2c = mkImg(sh2c,"16:9");
  const img3a = mkImg(sh3a,"16:9"); const img3b = mkImg(sh3b,"16:9");
  const img3c = mkImg(sh3c,"1:1");  const img3d = mkImg(sh3d,"16:9");
  const img4a = mkImg(sh4a,"16:9"); const img4b = mkImg(sh4b,"1:1"); const img4c = mkImg(sh4c,"16:9");

  // ── Assemble ───────────────────────────────────────────────────────────────
  const nodes = [
    sc1, sc2, sc3, sc4,
    sh1a, sh1b, sh1c, sh1d,
    sh2a, sh2b, sh2c,
    sh3a, sh3b, sh3c, sh3d,
    sh4a, sh4b, sh4c,
    img1a, img1b, img1c, img1d,
    img2a, img2b, img2c,
    img3a, img3b, img3c, img3d,
    img4a, img4b, img4c,
    m1Kling, m1Veo, m1Audio, m1Edit,
    m2Kling, m2Veo, m2Audio, m2Edit,
    m3Kling, m3Veo, m3Audio, m3Edit,
    m4Kling, m4Veo, m4Audio, m4Edit,
  ];

  const sceneX    = 80;
  const shotStart = sceneX + 310 + 70;
  const shotGapX  = 340;
  const sceneGapY = 940;
  const rowY      = (row) => 80 + row * sceneGapY;
  const imgStart  = shotStart + shotGapX * 4;
  const pipeA     = imgStart + shotGapX * 4 + 100;
  const pipeB     = pipeA + 380;
  const pipeRowB  = 420;
  const pipePos   = (row) => ({
    kling: { x:pipeA, y:rowY(row) + 40 },
    veo:   { x:pipeA, y:rowY(row) + 40 + pipeRowB },
    audio: { x:pipeB, y:rowY(row) + 40 },
    edit:  { x:pipeB, y:rowY(row) + 40 + pipeRowB },
  });
  const pp1=pipePos(0), pp2=pipePos(1), pp3=pipePos(2), pp4=pipePos(3);

  const pos = {
    [sc1id]: { x:sceneX, y:rowY(0) }, [sc2id]: { x:sceneX, y:rowY(1) },
    [sc3id]: { x:sceneX, y:rowY(2) }, [sc4id]: { x:sceneX, y:rowY(3) },
    [sh1a.id]:{ x:shotStart,            y:rowY(0) },
    [sh1b.id]:{ x:shotStart+shotGapX,   y:rowY(0) },
    [sh1c.id]:{ x:shotStart+shotGapX*2, y:rowY(0) },
    [sh1d.id]:{ x:shotStart+shotGapX*3, y:rowY(0) },
    [sh2a.id]:{ x:shotStart,            y:rowY(1) },
    [sh2b.id]:{ x:shotStart+shotGapX,   y:rowY(1) },
    [sh2c.id]:{ x:shotStart+shotGapX*2, y:rowY(1) },
    [sh3a.id]:{ x:shotStart,            y:rowY(2) },
    [sh3b.id]:{ x:shotStart+shotGapX,   y:rowY(2) },
    [sh3c.id]:{ x:shotStart+shotGapX*2, y:rowY(2) },
    [sh3d.id]:{ x:shotStart+shotGapX*3, y:rowY(2) },
    [sh4a.id]:{ x:shotStart,            y:rowY(3) },
    [sh4b.id]:{ x:shotStart+shotGapX,   y:rowY(3) },
    [sh4c.id]:{ x:shotStart+shotGapX*2, y:rowY(3) },
    [img1a.id]:{ x:imgStart,            y:rowY(0) },
    [img1b.id]:{ x:imgStart+shotGapX,   y:rowY(0) },
    [img1c.id]:{ x:imgStart+shotGapX*2, y:rowY(0) },
    [img1d.id]:{ x:imgStart+shotGapX*3, y:rowY(0) },
    [img2a.id]:{ x:imgStart,            y:rowY(1) },
    [img2b.id]:{ x:imgStart+shotGapX,   y:rowY(1) },
    [img2c.id]:{ x:imgStart+shotGapX*2, y:rowY(1) },
    [img3a.id]:{ x:imgStart,            y:rowY(2) },
    [img3b.id]:{ x:imgStart+shotGapX,   y:rowY(2) },
    [img3c.id]:{ x:imgStart+shotGapX*2, y:rowY(2) },
    [img3d.id]:{ x:imgStart+shotGapX*3, y:rowY(2) },
    [img4a.id]:{ x:imgStart,            y:rowY(3) },
    [img4b.id]:{ x:imgStart+shotGapX,   y:rowY(3) },
    [img4c.id]:{ x:imgStart+shotGapX*2, y:rowY(3) },
    [m1Kling.id]:pp1.kling, [m1Veo.id]:pp1.veo, [m1Audio.id]:pp1.audio, [m1Edit.id]:pp1.edit,
    [m2Kling.id]:pp2.kling, [m2Veo.id]:pp2.veo, [m2Audio.id]:pp2.audio, [m2Edit.id]:pp2.edit,
    [m3Kling.id]:pp3.kling, [m3Veo.id]:pp3.veo, [m3Audio.id]:pp3.audio, [m3Edit.id]:pp3.edit,
    [m4Kling.id]:pp4.kling, [m4Veo.id]:pp4.veo, [m4Audio.id]:pp4.audio, [m4Edit.id]:pp4.edit,
  };

  const bible = {
    characters: [ eHero, eWizard, eLord ],
    objects:    [ eRing ],
    locations:  [ eForest, eMountain, eFortress ],
  };

  return { nodes, pos, bible };
}

// ─── TEMPLATE: SCI-FI THRILLER — CGI CUTSCENE ────────────────────────────────
// A resource survey vessel enters an uncharted planet's atmosphere to extract
// minerals. The radar picks up hundreds of life forms surrounding the ship —
// but every visual sensor, camera, and viewport shows nothing. Only the radar.
// Visual style: CGI Cutscene (Unreal Engine 5 / AAA game quality).
function makeSciFiThrillerCGITemplate() {

  // ── Bible entities ─────────────────────────────────────────────────────────
  const eRena   = { id:`e_${uid()}`, kind:"character", name:"Captain Rena Solis",   tag:"@rena",   description:"Mission commander of the survey vessel Caldera, mid-40s. Weathered, pragmatic, 30 resource drops behind her. Broad shoulders, copper-brown skin, short grey-streaked hair under a survey helmet. She wears a bulky industrial EVA suit with the Caldera mission patch — orange and black. She has seen hostile planets, storms, equipment failure. She has never seen this.", notes:"Primary hero — generate portrait reference first. Industrial EVA suit, Caldera patch, and grey-streaked short hair are visual constants.", _imgUrl:"", assetId:"" };
  const eMako   = { id:`e_${uid()}`, kind:"character", name:"Mako Vey — Sensor Ops", tag:"@mako",  description:"Sensor and radar specialist, early 30s. Lean, precise, dark eyes always on a screen. He wears a lighter crew-spec suit with sensor array patches on the sleeves. He is the one watching the radar. He sees them first. He is trying very hard not to show how frightened he is.", notes:"Supporting character — the first to see the blips. His growing fear is the audience's thermometer for the danger level.", _imgUrl:"", assetId:"" };
  const eRadar  = { id:`e_${uid()}`, kind:"object",    name:"The Radar Display",    tag:"@radar",  description:"A circular tactical radar display — the survey vessel Caldera shown as a white triangle at centre. Around it, dozens of moving green blips, each tagged 'LIFE FORM — UNKNOWN'. The blips move in organised patterns. They are not random. The outer ring shows the planet surface terrain as a grey topographic overlay. The blips have been getting closer. The closest is now 40 metres.", notes:"@radar is the film's primary tension instrument. Every time it appears, the blips should be closer to centre than the last shot. The '40m' reading in Scene 4 is the climax.", _imgUrl:"", assetId:"" };
  const eBridge = { id:`e_${uid()}`, kind:"location",  name:"Caldera Command Deck",  tag:"@deck",   description:"The cramped command deck of an industrial survey vessel — this is not a military ship. Exposed conduit, worn grip-tape on handholds, scratched viewport glass showing a sulfurous orange-yellow alien sky. Holographic instrument panels everywhere, many still showing mineral survey data. Red emergency lighting has kicked in. The viewport is thick enough to withstand the atmosphere but the crew can see nothing through it except rock, mist, and haze.", notes:"Primary location — establish it as industrial, utilitarian, not heroic. The viewport showing the empty alien terrain despite the radar screaming is the central visual irony.", _imgUrl:"", assetId:"" };
  const eSurface = { id:`e_${uid()}`, kind:"location", name:"Planet Keris-9 Surface", tag:"@keris",  description:"The surface of an uncharted planet — Keris-9. Vast red-orange rock formations, low rolling sulfurous mist at ground level, no visible vegetation, fractured basalt plains stretching to a hazy horizon. The sky is a bruised yellow-orange with thick cloud cover and no sunlight, only diffuse atmospheric glow. It looks completely lifeless. There is nothing to see. The radar says otherwise.", notes:"Exterior reference location — used for drone feed shots and viewport views. Must look completely empty and hostile. The visual emptiness vs the radar data is the whole story.", _imgUrl:"", assetId:"" };
  const eSensor = { id:`e_${uid()}`, kind:"location",  name:"Sensor Bay",            tag:"@sensor", description:"A dedicated sensor operations room aboard the Caldera — smaller than the command deck, dominated by a large circular radar display mounted at chest height in the centre of the room. Green radar sweep glow illuminates everything. Additional screens show drone feeds of the empty surface. @mako works here. The chair in front of the radar is worn to the shape of him. This room is where the truth lives.", notes:"Scene 2 primary location — the green radar glow should bathe everything in a sickly light that feels wrong. The contrast between the empty drone feeds on the walls and the crowded radar centre is the scene's visual tension.", _imgUrl:"", assetId:"" };

  const sbEntry = (e) => ({ id:`sb_${uid()}`, kind:e.kind, name:e.name, tag:e.tag, notes:e.description, _prev:e._imgUrl||"", assetId:e.assetId||"" });

  // ── Scene 1: ENTRY — ATMOSPHERIC DESCENT ─────────────────────────────────
  const sc1id = `sc_${uid()}`;
  const sc1 = {
    id:sc1id, type:T.SCENE, cinematicStyle:"sci-fi", shotCount:4, visualStyle:"cgi-cutscene",
    bible:[ sbEntry(eRena), sbEntry(eMako), sbEntry(eBridge), sbEntry(eSurface) ],
    dialogueLines:[
      { speaker:"Mako Vey — Sensor Ops", line:"Mineral density confirmed. Sector seven is rich. We can start extraction in six hours." },
      { speaker:"Captain Rena Solis", line:"Log it. Begin surface mapping." },
      { speaker:"Mako Vey — Sensor Ops", line:"Captain. Something just appeared on secondary radar." },
    ],
    sceneText:`The survey vessel Caldera punches through the upper atmosphere of @keris — heat shields flaring orange, the ship shuddering against the planet's resistance, then breaking through into the sulfurous yellow haze below. @deck lights up with mineral data — the readings are exceptional, the best sector in eight years of survey work. @rena calls it in. @mako confirms the extraction window and begins surface mapping. The crew is focused, professional, excited. Then @mako pauses at his secondary screen. Something has appeared on the radar that was not there before.`,
    directorCoherence:{ score:97, skippedBeats:[], overlapIssues:[], recommendation:"Four beats: the entry and shudder → through the atmosphere to yellow haze → the mineral excitement → the pause. The pause is everything. Do not rush it." },
  };
  const sh1a = { ...mkShot(sc1id,1), id:`sh_${uid()}`, sceneId:sc1id, index:1, visualStyle:"inherit",
    how:"Extreme wide exterior — the Caldera punching through the upper atmosphere of @keris, heat shields ablaze in orange fire, the planet's bruised yellow-orange cloud layer below receiving the ship", where:"@keris — upper atmosphere, exterior", when:"atmospheric entry", cameraSize:"extreme-wide", cameraAngle:"low-angle", cameraMovement:"slow-track", lens:"24mm", lighting:"hard-contrast",
    visualGoal:"Establish the planet as vast, hostile, and beautiful — the ship is a tiny industrial object entering something enormous.",
    entityTags:["@keris"], directorNote:"The heat shield fire should dominate the frame. The cloud layer below should look like a lid closing. The ship's industrial bulk is intentional — this is not a sleek hero vessel.", directorQuality:"good", directorIssue:"" };
  const sh1b = { ...mkShot(sc1id,2), id:`sh_${uid()}`, sceneId:sc1id, index:2, visualStyle:"inherit",
    how:"Through the Caldera's viewport — the crew's faces lit by the orange re-entry glow transitioning to the sulfurous yellow of the lower atmosphere, the alien terrain resolving through the haze below, rock formations and mist", where:"@deck — viewport, crew faces during entry", when:"breaking through the cloud layer", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"hard-contrast",
    visualGoal:"The crew is competent and calm — this is routine for them. Their professionalism makes what's coming more frightening.",
    entityTags:["@rena","@mako","@deck"], directorNote:"Two faces in the viewport glow. @rena is reading data, not watching. @mako is watching the surface. This shot establishes who does what — and who will see it first.", directorQuality:"good", directorIssue:"" };
  const sh1c = { ...mkShot(sc1id,3), id:`sh_${uid()}`, sceneId:sc1id, index:3, visualStyle:"inherit",
    how:"Over @mako's shoulder — holographic mineral survey data filling the air, numbers spiking into the exceptional range, @rena leaning in to confirm the reading, both faces lit green by the data", where:"@deck — survey station, mineral data confirmation", when:"mineral discovery excitement", cameraSize:"medium-close", cameraAngle:"eye-level", cameraMovement:"slow-push-in", lens:"85mm", lighting:"hard-contrast",
    visualGoal:"The moment of professional satisfaction — they found what they came for. This warmth is what the radar destroys.",
    dialogue:`MAKO\nMineral density confirmed. Sector seven is rich. We can start extraction in six hours.\n\nRENA\nLog it. Begin surface mapping.`,
    entityTags:["@rena","@mako","@deck"], directorNote:"Let them have this moment. The push-in should arrive at both faces at the peak of their satisfaction. Then @mako looks back at his secondary screen.", directorQuality:"good", directorIssue:"" };
  const sh1d = { ...mkShot(sc1id,4), id:`sh_${uid()}`, sceneId:sc1id, index:4, visualStyle:"inherit",
    how:"Close on @mako's face as he notices something on the secondary screen — his expression shifting from professional satisfaction to a pause that is not quite concern yet, his eyes moving to the secondary display", where:"@deck — @mako at sensor station", when:"the pause — something appears", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"hard-contrast",
    visualGoal:"The pause is the scene's knife — the audience should feel it before @mako speaks it.",
    dialogue:`MAKO\nCaptain. Something just appeared on secondary radar.`,
    entityTags:["@mako","@deck"], directorNote:"Hold on his face before the line. The line should land quietly — @mako is not panicking yet. He is a professional noticing an anomaly. The audience should be more frightened than he is at this moment.", directorQuality:"good", directorIssue:"" };
  sh1a.compiledText = compileShotText(sh1a); sh1b.compiledText = compileShotText(sh1b);
  sh1c.compiledText = compileShotText(sh1c); sh1d.compiledText = compileShotText(sh1d);

  // ── Scene 2: THE SENSOR BAY — THE RADAR ───────────────────────────────────
  const sc2id = `sc_${uid()}`;
  const sc2 = {
    id:sc2id, type:T.SCENE, cinematicStyle:"sci-fi", shotCount:4, visualStyle:"cgi-cutscene",
    bible:[ sbEntry(eRena), sbEntry(eMako), sbEntry(eRadar), sbEntry(eSensor) ],
    dialogueLines:[
      { speaker:"Captain Rena Solis", line:"Run it again." },
      { speaker:"Mako Vey — Sensor Ops", line:"I've run it four times. They're real." },
      { speaker:"Captain Rena Solis", line:"How many?" },
      { speaker:"Mako Vey — Sensor Ops", line:"Two hundred and twelve. And they're moving." },
    ],
    sceneText:`@sensor. @rena and @mako stand at @radar. The display is unambiguous — 212 blips, each tagged LIFE FORM — UNKNOWN, arranged in a wide arc around the ship's position. They are moving slowly but with clear direction: toward the Caldera. @mako has run every diagnostic. The sensors are functioning perfectly. @rena asks if they can get a visual. @mako pulls up the drone feed on the wall screens. The surface of @keris is visible — red rock, low mist, nothing. Not a single visible organism. Just the blips, moving on @radar. Closer.`,
    directorCoherence:{ score:98, skippedBeats:[], overlapIssues:[], recommendation:"Four beats: the radar established → the numbers confirmed → the visual feeds showing nothing → the blips moving. Each beat should escalate. The silence on the drone feeds is as loud as the radar." },
  };
  const sh2a = { ...mkShot(sc2id,1), id:`sh_${uid()}`, sceneId:sc2id, index:1, visualStyle:"inherit",
    how:"Close on @radar display — the circular screen with the Caldera as a white triangle at centre, 212 green blips in an arc around it, each labeled LIFE FORM — UNKNOWN, the topographic overlay showing the empty terrain beneath them", where:"@sensor — @radar display, tight", when:"first view of the radar", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"slow-push-in", lens:"85mm", lighting:"low-key",
    visualGoal:"@radar must be immediately readable — the audience should understand the scale of what surrounds the ship before any character speaks it.",
    entityTags:["@radar","@sensor"], directorNote:"The push-in arrives at the blip count. 212 is visible as a number on the display. The LIFE FORM — UNKNOWN tags must be legible. The blips should be close enough to the centre ring to feel threatening.", directorQuality:"good", directorIssue:"" };
  const sh2b = { ...mkShot(sc2id,2), id:`sh_${uid()}`, sceneId:sc2id, index:2, visualStyle:"inherit",
    how:"Two-shot — @rena and @mako standing at @radar, the green glow on their faces, @rena with arms crossed, @mako's hands moving over the diagnostic panel, both looking at the display", where:"@sensor — @radar, two-shot", when:"@rena demands confirmation", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"low-key",
    visualGoal:"The green radar glow on their faces is the scene's defining image — everything that follows will be lit this way.",
    dialogue:`RENA\nRun it again.\n\nMAKO\nI've run it four times. They're real.\n\nRENA\nHow many?\n\nMAKO\nTwo hundred and twelve. And they're moving.`,
    entityTags:["@rena","@mako","@radar","@sensor"], directorNote:"@rena does not move when @mako confirms the number. Her stillness is control. @mako's hands keep working — because that is what he does when he is afraid. The number lands in silence.", directorQuality:"good", directorIssue:"" };
  const sh2c = { ...mkShot(sc2id,3), id:`sh_${uid()}`, sceneId:sc2id, index:3, visualStyle:"inherit",
    how:"Wide of the @sensor bay — drone feed screens covering the wall showing the @keris surface, red rock and mist, completely empty, while @radar at centre glows with 212 blips, @rena and @mako small between them", where:"@sensor — wide, drone feeds vs radar", when:"visual confirmation fails", cameraSize:"wide", cameraAngle:"eye-level", cameraMovement:"static", lens:"35mm", lighting:"low-key",
    visualGoal:"The central irony of the film in a single frame — empty screens on every wall, a crowded radar in the centre. What you can see, and what is there.",
    entityTags:["@rena","@mako","@radar","@sensor"], directorNote:"The composition is everything in this shot. Empty drone feeds on every wall. Crowded @radar at centre. The audience should feel the cognitive dissonance — two contradictory truths in one frame.", directorQuality:"good", directorIssue:"" };
  const sh2d = { ...mkShot(sc2id,4), id:`sh_${uid()}`, sceneId:sc2id, index:4, visualStyle:"inherit",
    how:"Extreme close-up on @radar — the blips visibly moving, several of the outer-arc blips now crossing the inner ring threshold, the distance readout on one blip ticking down: 180m... 175m... 170m...", where:"@sensor — @radar, extreme close, blips moving", when:"the blips getting closer", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"100mm", lighting:"low-key",
    visualGoal:"The closing distance is the scene's heartbeat — the audience watches the numbers count down and cannot look away.",
    entityTags:["@radar","@sensor"], directorNote:"Hold on the countdown. The blip movement should be slow enough to be measured but fast enough to feel inevitable. No dialogue. The numbers are the only sound that matters.", directorQuality:"good", directorIssue:"" };
  sh2a.compiledText = compileShotText(sh2a); sh2b.compiledText = compileShotText(sh2b);
  sh2c.compiledText = compileShotText(sh2c); sh2d.compiledText = compileShotText(sh2d);

  // ── Scene 3: THE SURFACE — THE SEARCH ─────────────────────────────────────
  const sc3id = `sc_${uid()}`;
  const sc3 = {
    id:sc3id, type:T.SCENE, cinematicStyle:"sci-fi", shotCount:4, visualStyle:"cgi-cutscene",
    bible:[ sbEntry(eRena), sbEntry(eMako), sbEntry(eRadar), sbEntry(eSurface) ],
    dialogueLines:[
      { speaker:"Captain Rena Solis", line:"Launch the external flood lights. Full sweep." },
      { speaker:"Mako Vey — Sensor Ops", line:"Captain — they stopped." },
      { speaker:"Captain Rena Solis", line:"All of them?" },
      { speaker:"Mako Vey — Sensor Ops", line:"All of them. At the same time." },
    ],
    sceneText:`@rena orders the external flood lights — the Caldera's survey lights activate, bathing the @keris surface in white industrial light for two hundred metres in every direction. Through the viewport and drone feeds: red rock, mist, nothing. No movement. No life. @mako watches @radar. The blips are still there. Still moving. @rena orders thermal. @mako runs thermal on the drone feed — the rocks glow at ambient temperature. No heat signatures. No life. Then @mako calls out: they stopped. All 212 blips, simultaneously, as if something gave a command. Then one blip separates from the arc and moves directly toward the ship. @radar shows it at 40 metres.`,
    directorCoherence:{ score:99, skippedBeats:[], overlapIssues:[], recommendation:"Four beats: flood lights and empty surface → thermal showing nothing → all blips stopping simultaneously → one blip moving toward the ship. The rhythm should accelerate after the simultaneous stop." },
  };
  const sh3a = { ...mkShot(sc3id,1), id:`sh_${uid()}`, sceneId:sc3id, index:1, visualStyle:"inherit",
    how:"Exterior wide — the Caldera sitting on the @keris surface, its survey flood lights blazing white in every direction, the alien rock and mist lit harshly, empty for as far as the light reaches, the sulfurous sky above", where:"@keris — exterior wide, flood lights active", when:"flood lights activated", cameraSize:"extreme-wide", cameraAngle:"low-angle", cameraMovement:"static", lens:"24mm", lighting:"hard-contrast",
    visualGoal:"Maximum visibility, maximum emptiness. The flood lights make the nothing more visible — and more impossible.",
    entityTags:["@keris"], directorNote:"The flood lights should cast long hard shadows from every rock formation. Every shadow is a potential hiding place the light exposes as empty. The emptiness should feel like a lie.", directorQuality:"good", directorIssue:"" };
  const sh3b = { ...mkShot(sc3id,2), id:`sh_${uid()}`, sceneId:sc3id, index:2, visualStyle:"inherit",
    how:"Close on the thermal drone feed screen — the @keris surface in false-colour thermal, rocks at ambient grey-blue, nothing warm, the temperature readout confirming: no biological heat signatures within sensor range", where:"@sensor — thermal drone feed screen, tight", when:"thermal scan confirms nothing", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"low-key",
    visualGoal:"The thermal screen showing nothing is the second confirmation — and the most frightening, because it means the blips are not hiding, they simply do not register.",
    entityTags:["@radar","@sensor"], directorNote:"The false-colour thermal image should be cold blues and purples — not a single warm pixel. @mako's hand enters frame to zoom in on one quadrant. Still nothing. Hold.", directorQuality:"good", directorIssue:"" };
  const sh3c = { ...mkShot(sc3id,3), id:`sh_${uid()}`, sceneId:sc3id, index:3, visualStyle:"inherit",
    how:"Close on @radar — all 212 blips stopping simultaneously, dead still on the display, the distance readouts freezing, the screen quiet for the first time since Scene 2", where:"@sensor — @radar, all blips stop", when:"simultaneous stop", cameraSize:"close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"85mm", lighting:"low-key",
    visualGoal:"212 things acting as one mind — the simultaneous stop is more frightening than the movement.",
    dialogue:`MAKO\nCaptain — they stopped.\n\nRENA\nAll of them?\n\nMAKO\nAll of them. At the same time.`,
    entityTags:["@rena","@mako","@radar","@sensor"], directorNote:"The stop must be visible — blips moving, then all frozen in a single frame cut. The dialogue should land over the frozen display. @rena's question and @mako's answer are both very quiet. Neither of them raises their voice.", directorQuality:"good", directorIssue:"" };
  const sh3d = { ...mkShot(sc3id,4), id:`sh_${uid()}`, sceneId:sc3id, index:4, visualStyle:"inherit",
    how:"Extreme close-up on @radar — one single blip separating from the arc and moving in a direct line toward the ship's centre marker, the distance readout: 40m... 38m... 35m... The rest of the 211 blips remain perfectly still.", where:"@sensor — @radar, single blip approaching", when:"one blip breaks from formation toward the ship", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"100mm", lighting:"low-key",
    visualGoal:"One thing, moving with intent, while 211 others watch. The countdown to 40 metres is the film's climax.",
    entityTags:["@radar","@sensor"], directorNote:"No dialogue. Just the numbers. The blip should be visibly deliberate — straight line, constant speed, no deviation. This is not animal movement. 40m. 38m. Hold.", directorQuality:"good", directorIssue:"" };
  sh3a.compiledText = compileShotText(sh3a); sh3b.compiledText = compileShotText(sh3b);
  sh3c.compiledText = compileShotText(sh3c); sh3d.compiledText = compileShotText(sh3d);

  // ── Scene 4: THE DECK — CONTACT ────────────────────────────────────────────
  const sc4id = `sc_${uid()}`;
  const sc4 = {
    id:sc4id, type:T.SCENE, cinematicStyle:"sci-fi", shotCount:3, visualStyle:"cgi-cutscene",
    bible:[ sbEntry(eRena), sbEntry(eMako), sbEntry(eRadar), sbEntry(eBridge), sbEntry(eSurface) ],
    dialogueLines:[
      { speaker:"Mako Vey — Sensor Ops", line:"It's at the hull. It's touching the hull." },
      { speaker:"Captain Rena Solis", line:"What does it want?" },
      { speaker:"Mako Vey — Sensor Ops", line:"I don't know. But the other 211 are still watching." },
    ],
    sceneText:`@deck. @rena stands at the viewport. Through the thick glass — nothing. Red rock, mist, the flood lights showing an empty surface. Then: a sound. A vibration in the hull. Not impact — contact. Something pressing gently against the exterior of the ship. @mako calls out from @sensor: the blip is at the hull. One metre. It is touching the ship. @rena puts her hand flat on the viewport glass. Still nothing to see. The surface is empty. But she can feel the vibration through the glass under her palm. The other 211 blips have not moved. They are waiting. Whatever is on the other side of the glass is making first contact with no visual form at all. @rena leaves her hand on the glass.`,
    directorCoherence:{ score:99, skippedBeats:[], overlapIssues:[], recommendation:"Three beats: @rena at the empty viewport → the vibration felt through the glass → @rena's hand on the glass with 211 blips watching. The hand on the glass is the final frame. Do not cut away from it." },
  };
  const sh4a = { ...mkShot(sc4id,1), id:`sh_${uid()}`, sceneId:sc4id, index:1, visualStyle:"inherit",
    how:"@rena at the viewport — her back to camera, looking out at the empty @keris surface, flood-lit rock and mist, nothing visible. Her posture is command-ready but still. Behind her, the @deck is dim and quiet.", where:"@deck — viewport, @rena watching the empty surface", when:"waiting — the blip at the hull", cameraSize:"medium", cameraAngle:"eye-level", cameraMovement:"static", lens:"50mm", lighting:"low-key",
    visualGoal:"@rena looking at nothing — and something is right outside. The frame carries the weight of what the viewport cannot show.",
    dialogue:`MAKO (O.S.)\nIt's at the hull. It's touching the hull.\n\nRENA\nWhat does it want?\n\nMAKO (O.S.)\nI don't know. But the other 211 are still watching.`,
    entityTags:["@rena","@deck"], directorNote:"@rena's back to camera for the whole exchange. The dialogue plays over her stillness and the empty viewport. The audience looks past her for something that is not visible. This is the scene's entire argument.", directorQuality:"good", directorIssue:"" };
  const sh4b = { ...mkShot(sc4id,2), id:`sh_${uid()}`, sceneId:sc4id, index:2, visualStyle:"inherit",
    how:"Extreme close-up on @rena's palm pressing flat against the viewport glass — the flood-lit empty @keris surface beyond, her hand creating a slight fog halo on the cold glass, and through the glass, nothing", where:"@deck — viewport glass, @rena's hand", when:"feeling the vibration through the glass", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"100mm", lighting:"low-key",
    visualGoal:"The hand on the glass is the film's central image — touching something that is touching back, across a barrier of glass and invisibility.",
    entityTags:["@rena","@deck"], directorNote:"The glass should fog slightly under her warm palm. Beyond it — rock, mist, light, nothing. Hold until the audience feels the vibration in the shot itself. Do not cut.", directorQuality:"good", directorIssue:"" };
  const sh4c = { ...mkShot(sc4id,3), id:`sh_${uid()}`, sceneId:sc4id, index:3, visualStyle:"inherit",
    how:"Back in @sensor — extreme close-up on @radar showing the single blip stopped at the hull, perfectly still, the distance readout locked at 0.8m. The 211 outer blips unchanged. The display glows green in the silence.", where:"@sensor — @radar final frame, blip at hull", when:"final frame — the contact", cameraSize:"extreme-close-up", cameraAngle:"eye-level", cameraMovement:"static", lens:"100mm", lighting:"low-key",
    visualGoal:"The radar is the last image. One blip at the hull. 211 watching. The film ends on what you can see — not on what is there.",
    entityTags:["@radar","@sensor"], directorNote:"No dialogue. No movement. The @radar glows. 0.8m. The number does not change. The 211 outer blips do not move. Hold until fade. This is the last frame of the film — a green screen showing contact that no eye can confirm.", directorQuality:"good", directorIssue:"" };
  sh4a.compiledText = compileShotText(sh4a); sh4b.compiledText = compileShotText(sh4b); sh4c.compiledText = compileShotText(sh4c);

  // ── Pipeline nodes ─────────────────────────────────────────────────────────
  const m1Kling = mkKling(); const m1Veo = mkVeo(); const m1Audio = mkAudio(); const m1Edit = { ...mkVideoEdit(), audioNodeId: m1Audio.id };
  const m2Kling = mkKling(); const m2Veo = mkVeo(); const m2Audio = mkAudio(); const m2Edit = { ...mkVideoEdit(), audioNodeId: m2Audio.id };
  const m3Kling = mkKling(); const m3Veo = mkVeo(); const m3Audio = mkAudio(); const m3Edit = { ...mkVideoEdit(), audioNodeId: m3Audio.id };
  const m4Kling = mkKling(); const m4Veo = mkVeo(); const m4Audio = mkAudio(); const m4Edit = { ...mkVideoEdit(), audioNodeId: m4Audio.id };

  // ── Image nodes ────────────────────────────────────────────────────────────
  const mkImg = (shot, ar) => ({ id:`img_${uid()}`, type:T.IMAGE, shotId:shot.id, sceneId:shot.sceneId, generatedUrl:"", resolution:"1K", aspect_ratio:ar, prompt: shot.compiledText||"" });
  const img1a=mkImg(sh1a,"16:9"); const img1b=mkImg(sh1b,"16:9"); const img1c=mkImg(sh1c,"16:9"); const img1d=mkImg(sh1d,"16:9");
  const img2a=mkImg(sh2a,"16:9"); const img2b=mkImg(sh2b,"1:1");  const img2c=mkImg(sh2c,"16:9"); const img2d=mkImg(sh2d,"1:1");
  const img3a=mkImg(sh3a,"16:9"); const img3b=mkImg(sh3b,"1:1");  const img3c=mkImg(sh3c,"1:1");  const img3d=mkImg(sh3d,"1:1");
  const img4a=mkImg(sh4a,"16:9"); const img4b=mkImg(sh4b,"1:1");  const img4c=mkImg(sh4c,"1:1");

  // ── Assemble ───────────────────────────────────────────────────────────────
  const nodes = [
    sc1, sc2, sc3, sc4,
    sh1a, sh1b, sh1c, sh1d,
    sh2a, sh2b, sh2c, sh2d,
    sh3a, sh3b, sh3c, sh3d,
    sh4a, sh4b, sh4c,
    img1a, img1b, img1c, img1d,
    img2a, img2b, img2c, img2d,
    img3a, img3b, img3c, img3d,
    img4a, img4b, img4c,
    m1Kling, m1Veo, m1Audio, m1Edit,
    m2Kling, m2Veo, m2Audio, m2Edit,
    m3Kling, m3Veo, m3Audio, m3Edit,
    m4Kling, m4Veo, m4Audio, m4Edit,
  ];

  const sceneX=80, shotStart=sceneX+310+70, shotGapX=340, sceneGapY=940;
  const rowY=(row)=>80+row*sceneGapY;
  const imgStart=shotStart+shotGapX*4+80;
  const pipeA=imgStart+shotGapX*4+100, pipeB=pipeA+380, pipeRowB=420;
  const pipePos=(row)=>({ kling:{x:pipeA,y:rowY(row)+40}, veo:{x:pipeA,y:rowY(row)+40+pipeRowB}, audio:{x:pipeB,y:rowY(row)+40}, edit:{x:pipeB,y:rowY(row)+40+pipeRowB} });
  const pp1=pipePos(0), pp2=pipePos(1), pp3=pipePos(2), pp4=pipePos(3);

  const pos = {
    [sc1id]:{x:sceneX,y:rowY(0)}, [sc2id]:{x:sceneX,y:rowY(1)}, [sc3id]:{x:sceneX,y:rowY(2)}, [sc4id]:{x:sceneX,y:rowY(3)},
    [sh1a.id]:{x:shotStart,y:rowY(0)}, [sh1b.id]:{x:shotStart+shotGapX,y:rowY(0)}, [sh1c.id]:{x:shotStart+shotGapX*2,y:rowY(0)}, [sh1d.id]:{x:shotStart+shotGapX*3,y:rowY(0)},
    [sh2a.id]:{x:shotStart,y:rowY(1)}, [sh2b.id]:{x:shotStart+shotGapX,y:rowY(1)}, [sh2c.id]:{x:shotStart+shotGapX*2,y:rowY(1)}, [sh2d.id]:{x:shotStart+shotGapX*3,y:rowY(1)},
    [sh3a.id]:{x:shotStart,y:rowY(2)}, [sh3b.id]:{x:shotStart+shotGapX,y:rowY(2)}, [sh3c.id]:{x:shotStart+shotGapX*2,y:rowY(2)}, [sh3d.id]:{x:shotStart+shotGapX*3,y:rowY(2)},
    [sh4a.id]:{x:shotStart,y:rowY(3)}, [sh4b.id]:{x:shotStart+shotGapX,y:rowY(3)}, [sh4c.id]:{x:shotStart+shotGapX*2,y:rowY(3)},
    [img1a.id]:{x:imgStart,y:rowY(0)}, [img1b.id]:{x:imgStart+shotGapX,y:rowY(0)}, [img1c.id]:{x:imgStart+shotGapX*2,y:rowY(0)}, [img1d.id]:{x:imgStart+shotGapX*3,y:rowY(0)},
    [img2a.id]:{x:imgStart,y:rowY(1)}, [img2b.id]:{x:imgStart+shotGapX,y:rowY(1)}, [img2c.id]:{x:imgStart+shotGapX*2,y:rowY(1)}, [img2d.id]:{x:imgStart+shotGapX*3,y:rowY(1)},
    [img3a.id]:{x:imgStart,y:rowY(2)}, [img3b.id]:{x:imgStart+shotGapX,y:rowY(2)}, [img3c.id]:{x:imgStart+shotGapX*2,y:rowY(2)}, [img3d.id]:{x:imgStart+shotGapX*3,y:rowY(2)},
    [img4a.id]:{x:imgStart,y:rowY(3)}, [img4b.id]:{x:imgStart+shotGapX,y:rowY(3)}, [img4c.id]:{x:imgStart+shotGapX*2,y:rowY(3)},
    [m1Kling.id]:pp1.kling,[m1Veo.id]:pp1.veo,[m1Audio.id]:pp1.audio,[m1Edit.id]:pp1.edit,
    [m2Kling.id]:pp2.kling,[m2Veo.id]:pp2.veo,[m2Audio.id]:pp2.audio,[m2Edit.id]:pp2.edit,
    [m3Kling.id]:pp3.kling,[m3Veo.id]:pp3.veo,[m3Audio.id]:pp3.audio,[m3Edit.id]:pp3.edit,
    [m4Kling.id]:pp4.kling,[m4Veo.id]:pp4.veo,[m4Audio.id]:pp4.audio,[m4Edit.id]:pp4.edit,
  };

  const bible = {
    characters: [ eRena, eMako ],
    objects:    [ eRadar ],
    locations:  [ eBridge, eSurface, eSensor ],
  };

  return { nodes, pos, bible };
}

const TEMPLATES = [
  {
    id:          "action-short-film",
    label:       "Action Short Film",
    emoji:       "🎬",
    description: "4-scene neo-noir action template - summons, pursuit, ambush, breakout. 11 shots pre-generated with Director annotations in a precise close-quarters style. Edit or generate images directly.",
    tags:        ["4 SCENES","11 SHOTS","WORLD BIBLE","READY TO GENERATE"],
    make:        makeActionNeoNoirShortFilmTemplate,
  },
  {
    id:          "hip-hop-campaign",
    label:       "Hip Hop Product Campaign",
    emoji:       "🧥",
    description: "4-scene streetwear campaign — hero reveal, street energy, collective, night frequency. 11 director-annotated shots + 6 reference Image nodes (one per bible entity). Generate all refs first → Save as Bible Ref → all shots inherit full visual consistency.",
    tags:        ["4 SCENES","11 SHOTS","6 REF IMAGES","SAVE TO BIBLE"],
    make:        makeHipHopCampaignTemplate,
  },
  {
    id:          "jewellery-campaign",
    label:       "Gold Signet Ring Campaign",
    emoji:       "💍",
    description: "4-scene minimalist jewellery campaign — product isolation, the hand, the person, craft & light. 11 director-annotated shots + 4 reference Image nodes. Generate refs first → Save as Bible Ref → all shots inherit visual consistency.",
    tags:        ["4 SCENES","11 SHOTS","4 REF IMAGES","SAVE TO BIBLE"],
    make:        makeJewelleryCampaignTemplate,
  },
  {
    id:          "trap-music-video",
    label:       "Trap Music Video Clip",
    emoji:       "🎤",
    description: "4-scene trap clip — cold open on the block, street flex with the whip, studio cypher, cinematic rooftop close. 15 director-annotated shots + 5 reference Image nodes. Add an AUDIO node with your track → wire into VIDEO EDIT → snap cuts to beats.",
    tags:        ["4 SCENES","15 SHOTS","5 REF IMAGES","BEAT SYNC READY"],
    make:        makeTrapMusicVideoTemplate,
  },
  {
    id:          "steampunk-wild-west-duel",
    label:       "Steampunk Wild West Duel",
    emoji:       "🤠",
    description: "Steampunk western starter — a robo sheriff is called out of a brass-and-smoke saloon to face a human gunslinger in a noon-street duel. 3 compact scenes, 6 director-annotated shots, and a live-action photoreal steampunk western look built around classic western anticipation and a fast mechanical payoff.",
    tags:        ["3 SCENES","6 SHOTS","STEAMPUNK","WESTERN"],
    make:        makeSteampunkWildWestTemplate,
  },
  {
    id:          "medieval-fantasy-epic",
    label:       "Medieval Fantasy Epic",
    emoji:       "⚔️",
    description: "4-scene Lord of the Rings-style epic — ancient forest departure, mountain pass journey, fortress confrontation, and a dawn return. 14 director-annotated shots. 3 characters, 3 locations, 1 cursed ring. Generate bible refs first for visual consistency across all scenes.",
    tags:        ["4 SCENES","14 SHOTS","WORLD BIBLE","EPIC FANTASY"],
    make:        makeMedievalFantasyTemplate,
  },
  {
    id:          "scifi-thriller-cgi",
    label:       "Sci-Fi Thriller — CGI Cutscene",
    emoji:       "🛰️",
    description: "4-scene sci-fi thriller in CGI Cutscene visual style — a survey crew enters an uncharted planet and detects 212 life forms on radar. The surface looks completely empty. The blips get closer. 15 director-annotated shots, CGI Cutscene style, 2 characters, radar as the central object. The film ends on first contact with no visible form.",
    tags:        ["4 SCENES","15 SHOTS","CGI CUTSCENE","SCI-FI THRILLER"],
    make:        makeSciFiThrillerCGITemplate,
  },
  {
    id:          "pirate-animation-adults",
    label:       "Pirates — Dark Animation",
    emoji:       "🏴‍☠️",
    description: "4-scene adult pirate animation — a secret cove briefing, a high-seas pursuit, an underwater dive for cursed gold, and a reckoning with betrayal. 15 director-annotated shots. Captain Mara Vane, her loyal first mate Drago, and the treacherous navigator Silas. A story about loyalty, greed, and what you choose to keep.",
    tags:        ["4 SCENES","15 SHOTS","ADULT ANIMATION","WORLD BIBLE"],
    make:        makePirateAnimationTemplate,
  },
];

// ─── SUPABASE STORAGE: bible image upload ─────────────────────────────────────
// Converts a data-URL to a Blob and stores it in the "bible-images" bucket.
// Returns the resulting public URL, or "" on failure (so callers degrade gracefully).
async function uploadBibleImage(userId, projectId, entryId, dataUrl, variantKey = "base") {
  try {
    // Ensure the bucket exists — no-op if it already does
    await supabase.storage.createBucket("bible-images", { public: true }).catch(() => {});
    // Decode data URL → Blob
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const ext  = mime.split("/")[1]?.split("+")[0] || "jpg";
    const safeVariant = String(variantKey || "base").replace(/[^a-z0-9_-]/gi, "_");
    const path = `${userId}/${projectId}/${entryId}_${safeVariant}.${ext}`;
    const { error } = await supabase.storage
      .from("bible-images")
      .upload(path, blob, { upsert: true, contentType: mime });
    if (error) { console.warn("Bible image upload failed:", error.message); return ""; }
    const { data } = supabase.storage.from("bible-images").getPublicUrl(path);
    return data?.publicUrl || "";
  } catch(e) {
    console.warn("Bible image upload error:", e.message);
    return "";
  }
}

// ─── ONBOARDING TOUR ─────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    accent: "#f97316",
    emoji: "🎬",
    badge: "WELCOME",
    title: "Welcome to Cartasis",
    body: "Cartasis is a node-based AI filmmaking canvas. You build your film visually — scenes, shots, images, and videos are all connected nodes on the canvas. Wire them together to build a complete production pipeline.",
    bullets: ["Drag nodes to arrange your workflow","Wire nodes together by dragging from output ports","Start from a template or build from scratch"],
  },
  {
    accent: "#64748b",
    emoji: "🎭",
    badge: "SCENE NODE",
    title: "Scene",
    body: "The foundation of your story. Each Scene holds the setting, cinematic style, scene text, and a World Bible of characters and locations. The AI reads the scene text to generate your shot breakdown.",
    bullets: ["Set cinematic style (noir, epic-fantasy, sci-fi…)","Write the scene text — action, dialogue, atmosphere","Attach characters and locations from your World Bible"],
  },
  {
    accent: "#38bdf8",
    emoji: "🎯",
    badge: "SHOT NODE",
    title: "Shot",
    body: "A single camera setup inside a scene. Define every technical parameter — size, angle, movement, lens, lighting, and the visual goal. The AI uses all of this to compile a precise generation prompt.",
    bullets: ["Generated automatically by the AI from scene text","Edit any field to redirect the visual result","Wire to an Image node to generate a still for that shot"],
  },
  {
    accent: "#a3e635",
    emoji: "🖼️",
    badge: "IMAGE NODE",
    title: "Image",
    body: "Generates an AI image from a shot prompt using Gemini. Wire it to a Shot to inherit all context automatically. Save the result to your World Bible as a character or location reference for visual consistency.",
    bullets: ["Auto-inherits prompt from wired Shot","Save to Bible → every future node uses it as reference","Use as start or end frame for Veo video generation"],
  },
  {
    accent: "#f97316",
    emoji: "🎞️",
    badge: "KLING NODE",
    title: "Kling Video",
    body: "Generates AI video using Kling AI. Wire Shot nodes for prompts and Image nodes as visual references. Supports multi-shot sequences, lipsync with TTS, and video extension (V1.6 model).",
    bullets: ["Wire multiple shots for a multi-shot sequence","Add image references for character consistency","V1.6 model unlocks EXTEND — add 5s at a time up to 3 min"],
  },
  {
    accent: "#a855f7",
    emoji: "✨",
    badge: "VEO NODE",
    title: "Veo Video",
    body: "Generates AI video using Google Veo 3.1. Wire a Shot for the prompt and Image nodes as start frame, end frame, or style references. Two modes: fast generation or high-quality standard.",
    bullets: ["Start + end frame = interpolation between two images","Reference images guide the visual style","Fast mode for iteration, Standard mode for finals"],
  },
  {
    accent: "#f87171",
    emoji: "🤖",
    badge: "AI NODE",
    title: "AI Assistant",
    body: "An AI connected directly to your canvas. In EDIT mode, apply natural language commands to any node. In COHERENCE mode, analyse multiple scenes together and patch continuity issues automatically.",
    bullets: ["EDIT mode: wire any node + type a command","COHERENCE mode: wire scenes to check story logic","Powered by Claude Sonnet — changes are applied live"],
  },
  {
    accent: "#e2e8f0",
    emoji: "✍️",
    badge: "SCRIPT NODE",
    title: "Script",
    body: "Write a full screenplay from an idea, or upload an existing script. The AI generates it in Hollywood format. One click splits it into Scene nodes on the canvas — your whole project is ready to shoot.",
    bullets: ["Generate: type an idea → full screenplay in seconds","Upload: import a .txt or .pdf script","Split: turns every scene into a wired Scene node"],
  },
  {
    accent: "#10b981",
    emoji: "🎵",
    badge: "AUDIO NODE",
    title: "Audio",
    body: "Generate original music from a text prompt, sync a track to a video, or upload your own audio. Wire to a VideoEdit node to use beat detection for snap cuts that hit exactly on the rhythm.",
    bullets: ["Prompt → music via ElevenLabs","Video → music: generates a score that matches the visuals","Beat snap: auto-trims clips to detected BPM beats"],
  },
  {
    accent: "#e2e8f0",
    emoji: "✂️",
    badge: "VIDEO EDIT NODE",
    title: "Video Edit",
    body: "Assemble your Kling and Veo clips into a sequence. Trim in/out points, reorder clips by dragging, scrub the timeline, and export. Click ⤢ to open the fullscreen editor for more precise control.",
    bullets: ["Wire Kling or Veo nodes directly into the timeline","Drag clip handles to trim start and end points","Export at 720p or 1080p"],
  },
  {
    accent: "#fbbf24",
    emoji: "📖",
    badge: "WORLD BIBLE",
    title: "World Bible",
    body: "The global reference layer for your entire project. Add characters, locations, and objects with descriptions and reference images. Every node inherits them — generating the same face or location consistently across all scenes.",
    bullets: ["Open with the 📖 button in the top toolbar","Generate a reference image once, use it everywhere","Entries flow automatically into every Scene and Shot"],
  },
  {
    accent: "#f97316",
    emoji: "🚀",
    badge: "LET'S GO",
    title: "You're ready to film",
    body: "Start from a template to see a complete pre-built project, or create your first Scene node. The help icon (?) in the top bar replays this tour any time.",
    bullets: ["Templates → open the drawer on the left","Add nodes → right-click the canvas or use the + menu","Save your project from the top bar"],
  },
];

function TourOverlay({ onClose }) {
  const th = useTheme();
  const [step, setStep] = useState(0);
  const s = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const finish = () => {
    try { localStorage.setItem("cartasis_tour_seen", "1"); } catch {}
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(0,0,0,0.88)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
      onKeyDown={e => { if(e.key==="Escape") finish(); if(e.key==="ArrowRight"&&!isLast) setStep(s=>s+1); if(e.key==="ArrowLeft"&&step>0) setStep(s=>s-1); }}
      tabIndex={-1}>

      <div style={{ background:th.card, border:`1px solid ${s.accent}44`, borderRadius:20,
        maxWidth:520, width:"100%", overflow:"hidden",
        boxShadow:`0 0 60px ${s.accent}22, 0 20px 60px rgba(0,0,0,0.5)` }}>

        {/* Colour bar */}
        <div style={{ height:4, background:`linear-gradient(90deg, ${s.accent}, ${s.accent}88)` }}/>

        {/* Body */}
        <div style={{ padding:"28px 32px 24px" }}>
          {/* Badge + step counter */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.16em", color:s.accent,
              background:`${s.accent}18`, border:`1px solid ${s.accent}44`,
              borderRadius:4, padding:"3px 9px" }}>{s.badge}</span>
            <span style={{ fontSize:10, color:th.t3 }}>{step+1} / {TOUR_STEPS.length}</span>
          </div>

          {/* Emoji + title */}
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
            <div style={{ fontSize:44, lineHeight:1, flexShrink:0 }}>{s.emoji}</div>
            <div style={{ fontSize:22, fontWeight:800, color:th.t0, lineHeight:1.2 }}>{s.title}</div>
          </div>

          {/* Description */}
          <p style={{ fontSize:13, color:th.t1, lineHeight:1.65, margin:"0 0 18px" }}>{s.body}</p>

          {/* Bullets */}
          <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:24 }}>
            {s.bullets.map((b,i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:s.accent, flexShrink:0, marginTop:5 }}/>
                <span style={{ fontSize:12, color:th.t2, lineHeight:1.5 }}>{b}</span>
              </div>
            ))}
          </div>

          {/* Step dots */}
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:24 }}>
            {TOUR_STEPS.map((_,i) => (
              <button key={i} onClick={()=>setStep(i)}
                style={{ width: i===step ? 20 : 6, height:6, borderRadius:3, border:"none",
                  background: i===step ? s.accent : th.b1, cursor:"pointer",
                  padding:0, transition:"all 0.2s" }}/>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display:"flex", gap:10 }}>
            {step > 0 && (
              <button onClick={()=>setStep(s=>s-1)}
                style={{ flex:1, padding:"10px 0", borderRadius:9, border:`1px solid ${th.b1}`,
                  background:"transparent", color:th.t2, fontSize:12, fontWeight:600,
                  fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer" }}>
                ← Back
              </button>
            )}
            {!isLast ? (
              <>
                <button onClick={finish}
                  style={{ padding:"10px 18px", borderRadius:9, border:`1px solid ${th.b0}`,
                    background:"transparent", color:th.t3, fontSize:12,
                    fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer" }}>
                  Skip tour
                </button>
                <button onClick={()=>setStep(s=>s+1)}
                  style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none",
                    background:s.accent, color:"#000", fontSize:12, fontWeight:700,
                    fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer", letterSpacing:"0.06em" }}>
                  Next →
                </button>
              </>
            ) : (
              <button onClick={finish}
                style={{ flex:1, padding:"11px 0", borderRadius:9, border:"none",
                  background:s.accent, color:"#000", fontSize:13, fontWeight:800,
                  fontFamily:"'Inter',system-ui,sans-serif", cursor:"pointer", letterSpacing:"0.06em" }}>
                Start Filming 🎬
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user,            setUser]            = useState(null);
  const [authChecked,     setAuthChecked]     = useState(false);
  const [currentProject,  setCurrentProject]  = useState(null); // { id, name }
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const saveTimer = useRef(null);

  // ── Credits / Billing ─────────────────────────────────────────────────────
  const [credits,         setCredits]         = useState(null); // { tier, credits_balance, credits_monthly, op_costs }
  const [showPricing,     setShowPricing]      = useState(false);
  const [outOfCredits,    setOutOfCredits]     = useState(null); // { needed, balance, op } or null
  const [showTopup,       setShowTopup]        = useState(false);
  const [pricingData,     setPricingData]      = useState(null);
  const [fullscreenVEId,  setFullscreenVEId]   = useState(null); // VideoEdit fullscreen overlay
  const [showTour,        setShowTour]         = useState(false);
  const [reviewingSceneId,setReviewingSceneId] = useState(null);
  const [repairingSceneId,setRepairingSceneId] = useState(null);
  const [inspectorBusy,   setInspectorBusy]    = useState(false);
  const [inspectorStatus, setInspectorStatus]  = useState("");

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
      // Show tour on first-ever visit (already logged in)
      if (session?.user && !localStorage.getItem("cartasis_tour_seen")) {
        setShowTour(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Show tour on first login
      if (session?.user && !localStorage.getItem("cartasis_tour_seen")) {
        setShowTour(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch credits whenever user changes
  const fetchCredits = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const r = await fetch("/api/user/credits", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (r.ok) setCredits(await r.json());
    } catch {}
  };
  useEffect(() => { if (user) fetchCredits(); else setCredits(null); }, [user]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stripe/public-pricing")
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { if (!cancelled) setPricingData(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Helper: check 402 responses from generation endpoints and show popup
  const handleApiResponse = async (res) => {
    if (res.status === 402) {
      const body = await res.json().catch(() => ({}));
      setOutOfCredits({
        needed:  body.credits_needed || 0,
        balance: body.credits_balance || 0,
        op:      body.error || "insufficient_credits",
      });
      fetchCredits();
      return false; // caller should abort
    }
    return true;
  };

  const _initScene = mkScene();
  const [nodes, setNodes] = useState([_initScene]);
  const [pos, setPos] = useState({ [_initScene.id]: { x: 80, y: 80 } });
  const [zMap, setZMap] = useState({});
  const [zTop, setZTop] = useState(10);
  const [selId, setSelId] = useState(null);
  const [inspectId, setInspectId] = useState(null);
  // wire dragging: { fromId, fromX, fromY, toX, toY }
  const [wire, setWire] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);

  const [isDark, setIsDark] = useState(false);
  const th = isDark ? DARK_TH : LIGHT_TH;

  // ── Bible & Assets ──────────────────────────────────────────────────────────
  const [bible, setBible] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cb_bible")) || { characters:[], objects:[], locations:[] }; }
    catch { return { characters:[], objects:[], locations:[] }; }
  });
  const [bibleOpen,          setBibleOpen]          = useState(false);
  const [sidebarOpen,        setSidebarOpen]        = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveTemplateOpen,   setSaveTemplateOpen]   = useState(false);
  const [templateSaveName,   setTemplateSaveName]   = useState("");
  const [templateSaveEmoji,  setTemplateSaveEmoji]  = useState("🎬");
  const [templateSaveDesc,   setTemplateSaveDesc]   = useState("");
  const [userTemplates,      setUserTemplates]      = useState([]);
  const [batchGenerating,    setBatchGenerating]    = useState(false);
  const [batchProgress,      setBatchProgress]      = useState({ total:0, done:0 });

  const loadTemplate = (template) => {
    const { nodes: tNodes, pos: tPos, bible: tBible } = template.make();
    const normalizedTemplateBible = {
      characters: (tBible?.characters || []).map(e => ({ ...e, _imgUrl: resolveEntryImage(e, "none"), _prev: resolveEntryImage(e, "none") })),
      objects: (tBible?.objects || []).map(e => ({ ...e, _imgUrl: resolveEntryImage(e, "none"), _prev: resolveEntryImage(e, "none") })),
      locations: (tBible?.locations || []).map(e => ({ ...e, _imgUrl: resolveEntryImage(e, "none"), _prev: resolveEntryImage(e, "none") })),
    };
    const allTemplateBible = [
      ...normalizedTemplateBible.characters,
      ...normalizedTemplateBible.objects,
      ...normalizedTemplateBible.locations,
    ];
    const tagToEntry = Object.fromEntries(allTemplateBible.filter(e => e.tag).map(e => [e.tag, e]));
    const syncedTemplateNodes = (tNodes || []).map(n => {
      if (n.type !== T.SCENE && n.type !== T.SHOT) return n;
      const syncedBible = (n.bible || []).map(b => {
        const src = tagToEntry[b.tag];
        if (!src) return b;
        return {
          ...b,
          _imgUrl: resolveEntryImage(src, "none"),
          _prev: resolveEntryImage(src, "none"),
          assetId: src.assetId || b.assetId || "",
        };
      });
      return { ...n, bible: syncedBible };
    });
    setNodes(syncedTemplateNodes);
    setPos(tPos);
    setBible(normalizedTemplateBible);
    setSelId(null);
    setTemplatePickerOpen(false);
    setPan({ x: 40, y: 40 });
    setZoom(0.55);
  };

  useEffect(() => {
    try {
      // Strip base64 image data before persisting — data: URLs can be several MB
      // and will exceed localStorage's ~5 MB quota, crashing the app.
      // Text metadata (name, tag, description, notes) is always saved; images are session-only.
      const strip = (list) => (list||[]).map(stripBibleEntryForStorage);
      const toSave = {
        characters: strip(bible.characters),
        objects:    strip(bible.objects),
        locations:  strip(bible.locations),
      };
      localStorage.setItem("cb_bible", JSON.stringify(toSave));
    } catch(e) {
      console.warn("Bible save to localStorage failed:", e.message);
    }
  }, [bible]);

  // Flatten global bible into a single array, normalising the image field so
  // bibleToRef() (which looks for _prev) works without any changes downstream.
  const globalBibleFlat = [
    ...(bible.characters||[]),
    ...(bible.objects||[]),
    ...(bible.locations||[]),
  ].map(e => ({ ...e, _prev: resolveEntryImage(e, "none") }));

  // ── Supabase: save project (debounced) ──────────────────────────────────────
  const saveProject = useCallback(async (nodesVal, posVal, bibleVal, projectId, projectName) => {
    if (!user || !projectId) return;
    setSaving(true);

    // Resolve img_url for a single entry:
    // - data URL  → upload to Supabase Storage, return public URL
    // - remote URL → pass through unchanged
    // - empty      → ""
    const resolveImgUrl = (url, entryId, variantKey = "base") => {
      if (!url) return Promise.resolve("");
      if (url.startsWith("data:")) return uploadBibleImage(user.id, projectId, entryId, url, variantKey);
      return Promise.resolve(url);
    };
    const resolveBibleEntry = async (entry) => {
      const resolvedBase = await resolveImgUrl(entry._imgUrl || entry._prev || "", entry.id, "base");
      const resolvedVariants = await Promise.all(
        Object.entries(entryStyleVariants(entry)).map(async ([style, variant]) => {
          const src = typeof variant === "string" ? variant : (variant?._imgUrl || variant?._prev || "");
          const resolved = await resolveImgUrl(src, entry.id, style);
          if (typeof variant === "string") return [style, resolved];
          return [style, { ...variant, _imgUrl: resolved, _prev: resolved }];
        })
      );
      return {
        ...entry,
        _imgUrl: resolvedBase,
        _prev: resolvedBase,
        _styleVariants: Object.fromEntries(resolvedVariants),
      };
    };

    const allKinds = [
      ...(bibleVal.characters||[]).map(e=>({ ...e, kind:"character" })),
      ...(bibleVal.objects||[]).map(e=>({ ...e, kind:"object"    })),
      ...(bibleVal.locations||[]).map(e=>({ ...e, kind:"location" })),
    ];
    const resolvedEntries = await Promise.all(allKinds.map(resolveBibleEntry));
    const resolvedBible = {
      characters: resolvedEntries.filter(e => e.kind === "character").map(({ kind, ...rest }) => rest),
      objects:    resolvedEntries.filter(e => e.kind === "object").map(({ kind, ...rest }) => rest),
      locations:  resolvedEntries.filter(e => e.kind === "location").map(({ kind, ...rest }) => rest),
    };
    const serializedNodes = (nodesVal || []).map(n =>
      n.bible?.length
        ? { ...n, bible: n.bible.map(stripBibleEntryForStorage) }
        : n
    );

    await supabase.from("projects").upsert({
      id:        projectId,
      user_id:   user.id,
      name:      projectName || "Untitled Project",
      nodes:     serializedNodes,
      positions: posVal,
      data:      { bible: resolvedBible },
    });

    await supabase.from("bible_entries").delete().eq("user_id", user.id).eq("project_id", projectId);
    const allEntries = allKinds.map((e, i) => {
      const { _imgUrl, _styleVariants, ...rest } = resolvedEntries[i];
      return { ...rest, user_id: user.id, project_id: projectId, img_url: _imgUrl || "" };
    });
    if (allEntries.length) await supabase.from("bible_entries").upsert(allEntries);
    setSaving(false);
  }, [user]);

  // Auto-save 3 s after any change (nodes, pos, bible)
  useEffect(() => {
    if (!user || !currentProject) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(nodes, pos, bible, currentProject.id, currentProject.name);
    }, 3000);
    return () => clearTimeout(saveTimer.current);
  }, [nodes, pos, bible, user, currentProject, saveProject]);

  // Load a project from Supabase
  const loadProject = async (project) => {
    const { data } = await supabase.from("projects").select("*").eq("id", project.id).single();
    if (!data) return;
    const rawNodes = data.nodes?.length ? data.nodes : [mkScene()];
    setPos(data.positions || {});
    const hydrateUrl = async (url) => {
      let nextUrl = url || "";
      if (nextUrl.startsWith("http")) {
        try {
          const resp = await fetch(nextUrl);
          const blob = await resp.blob();
          nextUrl = await new Promise(res => {
            const r = new FileReader();
            r.onload = ev => res(ev.target.result);
            r.readAsDataURL(blob);
          });
        } catch { /* keep the remote URL as fallback */ }
      }
      return nextUrl;
    };
    const hydrateEntry = async (entry) => {
      const baseUrl = await hydrateUrl(entry._imgUrl || entry._prev || "");
      const hydratedVariants = await Promise.all(
        Object.entries(entryStyleVariants(entry)).map(async ([style, variant]) => {
          const src = typeof variant === "string" ? variant : (variant?._imgUrl || variant?._prev || "");
          const hydrated = await hydrateUrl(src);
          if (typeof variant === "string") return [style, hydrated];
          return [style, { ...variant, _imgUrl: hydrated, _prev: hydrated }];
        })
      );
      return { ...entry, _imgUrl: baseUrl, _prev: baseUrl, _styleVariants: Object.fromEntries(hydratedVariants) };
    };
    if (data.data?.bible) {
      const projectBible = data.data.bible;
      const [characters, objects, locations] = await Promise.all([
        Promise.all((projectBible.characters||[]).map(hydrateEntry)),
        Promise.all((projectBible.objects||[]).map(hydrateEntry)),
        Promise.all((projectBible.locations||[]).map(hydrateEntry)),
      ]);
      setBible({ characters, objects, locations });

      const tagToEntry = {};
      [...characters, ...objects, ...locations].forEach(e => { if (e.tag) tagToEntry[e.tag] = e; });
      const syncedNodes = rawNodes.map(n => {
        if (!n.bible?.length) return n;
        const synced = n.bible.map(b => tagToEntry[b.tag]
          ? { ...b, ...tagToEntry[b.tag], _prev: resolveEntryImage(tagToEntry[b.tag], "none") }
          : b);
        return { ...n, bible: synced };
      });
      setNodes(syncedNodes);
      setCurrentProject({ id: project.id, name: project.name });
      setProjectPickerOpen(false);
      return;
    }
    // Load bible — fetch remote images and convert to data URLs so generation
    // code (which filters for "data:") works immediately after reload.
    const { data: bEntries } = await supabase.from("bible_entries").select("*").eq("project_id", project.id);
    if (bEntries) {
      const [characters, objects, locations] = await Promise.all([
        Promise.all(bEntries.filter(e=>e.kind==="character").map(hydrateEntry)),
        Promise.all(bEntries.filter(e=>e.kind==="object").map(hydrateEntry)),
        Promise.all(bEntries.filter(e=>e.kind==="location").map(hydrateEntry)),
      ]);
      setBible({ characters, objects, locations });

      // Sync scene/shot node bible entries with the freshly hydrated global bible.
      // Nodes store bible entries as snapshots — their _prev may be stale or empty.
      // Build a tag → hydrated _imgUrl map and patch every matching entry in-place.
      const tagToEntry = {};
      [...characters, ...objects, ...locations].forEach(e => {
        if (e.tag) tagToEntry[e.tag] = e;
      });
      const syncedNodes = rawNodes.map(n => {
        if (!n.bible?.length) return n;
        const synced = n.bible.map(b => tagToEntry[b.tag]
          ? { ...b, ...tagToEntry[b.tag], _prev: resolveEntryImage(tagToEntry[b.tag], "none") }
          : b);
        return { ...n, bible: synced };
      });
      setNodes(syncedNodes);
    } else {
      setNodes(rawNodes);
    }
    setCurrentProject({ id: project.id, name: project.name });
    setProjectPickerOpen(false);
  };

  // Create a brand-new project in Supabase
  const newProject = async (name = "Untitled Project") => {
    if (!user) return;
    const initScene = mkScene();
    const initNodes = [initScene];
    const initPos   = { [initScene.id]: { x: 80, y: 80 } };
    const { data } = await supabase.from("projects").insert({
      user_id: user.id, name, nodes: initNodes, positions: initPos,
    }).select().single();
    if (data) {
      setNodes(initNodes);
      setPos(initPos);
      setBible({ characters:[], objects:[], locations:[] });
      setCurrentProject({ id: data.id, name: data.name });
      setProjectPickerOpen(false);
    }
  };

  const [shotModel, setShotModel] = useState("gpt-5.4-mini");
  const [pan, setPan] = useState({x:40,y:40});
  const [zoom, setZoom] = useState(1);
  const cvRef = useRef(null);
  const panning = useRef(false);
  // Live refs so spawnNode always reads current nodes/pos even under rapid clicks
  const nodesRef = useRef(nodes);
  const posRef   = useRef(pos);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { posRef.current   = pos;   }, [pos]);

  // Wheel zoom — non-passive so we can preventDefault; zooms toward cursor position
  useEffect(() => {
    const el = cvRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 0.91 : 1.1;
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;   // cursor x in canvas space
      const my = e.clientY - r.top;    // cursor y in canvas space
      setZoom(z => {
        const nz = Math.max(0.25, Math.min(2.5, z * f));
        const scale = nz / z;
        // Shift pan so the point under the cursor stays fixed
        setPan(p => ({ x: mx + (p.x - mx) * scale, y: my + (p.y - my) * scale }));
        return nz;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  // Re-attach if cvRef.current changes (e.g. conditional render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvRef.current]);

  const front = useCallback((id)=>{ setZTop(z=>{ const nz=z+1; setZMap(m=>({...m,[id]:nz})); return nz; }); },[]);

  // ── Script: split scenes callback ──────────────────────────────────────────
  const placeScenesFromSource = useCallback((sourceId, scenes) => {
    const sourcePos = pos[sourceId] || { x:80, y:80 };
    const startX = sourcePos.x + 420;
    let cursor = sourcePos.y;
    const newNodes = [];
    const newPos = {};
    scenes.forEach(s => {
      const sc = mkScene();
      sc.sceneText      = s.sceneText      || "";
      sc.cinematicStyle = s.cinematicStyle || "drama";
      sc.visualStyle    = s.visualStyle    || "none";
      sc.shotCount      = s.shotCount      || 3;
      sc.sceneHeading   = s.heading        || s.sectionLabel || "";
      sc.dialogueLines  = s.dialogueLines  || [];
      newNodes.push(sc);
      newPos[sc.id] = { x: startX, y: cursor };

      let shotCursor = cursor + 220;
      (s.shots || []).forEach((shotData, shotIndex) => {
        const shot = {
          ...mkShot(sc.id, shotIndex + 1),
          ...shotData,
          id:`sh_${uid()}`,
          type:T.SHOT,
          sceneId:sc.id,
          index:shotIndex + 1,
        };
        shot.compiledText = compileShotText(shot);
        newNodes.push(shot);
        newPos[shot.id] = { x: startX + 430, y: shotCursor };
        shotCursor += 300;
      });

      cursor += Math.max(920, 280 + (s.shots?.length || 0) * 300);
    });
    setNodes(prev => [...prev, ...newNodes]);
    setPos(prev => ({ ...prev, ...newPos }));
  }, [pos]);

  const onSplitScenes = useCallback((scriptNodeId, scenes) => {
    placeScenesFromSource(scriptNodeId, scenes);
  }, [placeScenesFromSource]);

  const analyzeMusicNode = useCallback((musicNode) => {
    const latest = nodesRef.current.find(n => n.id === musicNode.id) || musicNode;
    const linkedAudio = nodesRef.current.find(n => n.id === latest.audioNodeId);
    if (!linkedAudio?.audioUrl) {
      alert("Wire an analyzed AUDIO node into Music DNA first.");
      return;
    }
    const analysis = buildMusicDNAAnalysis(linkedAudio, latest.preferredSections || "auto");
    if (!analysis) {
      alert("This audio track still needs duration and beat data before it can be analyzed.");
      return;
    }
    updNode(latest.id, { analysis });
  }, []);

  const generateMusicBlueprint = useCallback(async (musicNode) => {
    const latest = nodesRef.current.find(n => n.id === musicNode.id) || musicNode;
    const linkedAudio = nodesRef.current.find(n => n.id === latest.audioNodeId);
    if (!linkedAudio?.audioUrl) {
      alert("Wire an AUDIO node into Music DNA first.");
      return;
    }
    if (!latest.analysis?.sections?.length) {
      alert("Analyze the music first so the blueprint has timing and section data.");
      return;
    }
    try {
      const blueprint = await aiMusicBlueprint(latest, linkedAudio);
      const normalizedScenes = normalizeMusicBlueprintScenes(blueprint.scenes || []);
      if (!normalizedScenes.length) throw new Error("Blueprint returned no scenes.");
      updNode(latest.id, { lastBlueprint: { ...blueprint, scenes: normalizedScenes } });
      placeScenesFromSource(latest.id, normalizedScenes);
    } catch (e) {
      alert(`Music blueprint failed: ${e.message}`);
    }
  }, [placeScenesFromSource]);


  // ── wire drag: start from scene output port
  const startWire = useCallback((fromId, fromType, portX, portY) => {
    // portX/portY are in canvas space (already transformed)
    const w = { fromId, fromType, fromX: portX, fromY: portY, toX: portX, toY: portY };
    setWire(w);
    const onMove = (e) => {
      const r = cvRef.current.getBoundingClientRect();
      const cx = (e.clientX - r.left - pan.x) / zoom;
      const cy = (e.clientY - r.top  - pan.y) / zoom;
      setWire(prev => prev ? {...prev, toX: cx, toY: cy} : null);
    };
    const onUp = (e) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // check if dropped on a compatible node input port
      const target = e.target.closest("[data-nodeid]");
      if (target) {
        const targetId = target.getAttribute("data-nodeid");
        const targetType = target.getAttribute("data-nodetype");
        if (fromType === T.SCENE && (targetType === T.SHOT || targetType === T.IMAGE)) {
          setNodes(prev => prev.map(n => n.id === targetId ? {...n, sceneId: fromId} : n));
        } else if (fromType === T.SHOT && targetType === T.IMAGE) {
          setNodes(prev => prev.map(n => n.id === targetId ? {...n, shotId: fromId} : n));
        } else if (fromType === T.KLING && targetType === T.KLING && fromId !== targetId) {
          // Wire previous Kling output → next Kling input for continuity
          setNodes(prev => prev.map(n =>
            n.id === targetId ? {...n, prevKlingId: fromId} : n
          ));
        } else if (fromType === T.SHOT && targetType === T.KLING) {
          // Add shot to Kling node's ordered shotIds (prevent duplicates)
          setNodes(prev => prev.map(n =>
            n.id === targetId && !(n.shotIds||[]).includes(fromId)
              ? {...n, shotIds: [...(n.shotIds||[]), fromId]}
              : n
          ));
        } else if (fromType === T.SHOT && targetType === T.VEO) {
          // Veo accepts a single shot (replaces existing)
          setNodes(prev => prev.map(n =>
            n.id === targetId ? {...n, shotId: fromId} : n
          ));
        } else if (fromType === T.IMAGE && targetType === T.KLING) {
          // Add IMAGE as visual reference for Kling image-to-video
          setNodes(prev => prev.map(n => {
            if (n.id !== targetId) return n;
            const ids = n.imageRefIds || [];
            if (ids.includes(fromId)) return n;
            return {...n, imageRefIds: [...ids, fromId]};
          }));
        } else if (fromType === T.IMAGE && targetType === T.VEO) {
          // Add IMAGE as reference by default — user changes role via selector inside VeoCard
          setNodes(prev => prev.map(n => {
            if (n.id !== targetId) return n;
            const ids = n.refNodeIds || [];
            if (ids.includes(fromId)) return n; // no duplicate
            return {...n, refNodeIds: [...ids, fromId]};
          }));
        } else if (targetType === T.LLM) {
          // Append to targetNodeIds array (no duplicates); keep legacy targetNodeId for compat
          setNodes(prev => prev.map(n => {
            if (n.id !== targetId) return n;
            const ids = n.targetNodeIds || [];
            if (ids.includes(fromId)) return n;
            return { ...n, targetNodeIds: [...ids, fromId], targetNodeId: fromId };
          }));
        } else if ((fromType === T.VEO || fromType === T.KLING) && targetType === T.VIDEOEDIT) {
          // Add video node to VideoEdit's clip list (no duplicates)
          setNodes(prev => prev.map(n => {
            if (n.id !== targetId) return n;
            const ids = n.videoNodeIds || [];
            if (ids.includes(fromId)) return n;
            return {...n, videoNodeIds: [...ids, fromId]};
          }));
        } else if (fromType === T.AUDIO && targetType === T.VIDEOEDIT) {
          // Link Audio Track node to VideoEdit for beat-snap (one audio track per editor)
          setNodes(prev => prev.map(n =>
            n.id === targetId ? {...n, audioNodeId: fromId} : n
          ));
        } else if (fromType === T.AUDIO && targetType === T.MUSICDNA) {
          setNodes(prev => prev.map(n =>
            n.id === targetId ? { ...n, audioNodeId: fromId } : n
          ));
        } else if ((fromType === T.KLING || fromType === T.VEO || fromType === T.CLIP) && targetType === T.AUDIO) {
          // Wire a video into the Audio node for video-to-music analysis
          setNodes(prev => prev.map(n =>
            n.id === targetId ? {...n, videoNodeId: fromId} : n
          ));
        } else if (fromType === T.CLIP && targetType === T.VIDEOEDIT) {
          // Add uploaded clip node to VideoEdit's clip list
          setNodes(prev => prev.map(n => {
            if (n.id !== targetId) return n;
            const ids = n.videoNodeIds || [];
            if (ids.includes(fromId)) return n;
            return {...n, videoNodeIds: [...ids, fromId]};
          }));
        } else if (fromType === T.CLIP && targetType === T.KLING) {
          // Use uploaded clip as Kling continuity reference (prevVideoUrl)
          setNodes(prev => prev.map(n =>
            n.id === targetId ? {...n, prevKlingId: fromId} : n
          ));
        }
      }
      setWire(null);
      setHoverTarget(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pan, zoom]);

  const spawnNode = (type) => {
    const n = type===T.SCENE?mkScene():type===T.SHOT?mkShot(null):type===T.KLING?mkKling():type===T.VEO?mkVeo():type===T.LLM?mkLlm():type===T.VIDEOEDIT?mkVideoEdit():type===T.SCRIPT?mkScript():type===T.AUDIO?mkAudio():type===T.MUSICDNA?mkMusicDNA():type===T.CLIP?mkClip():mkImage(null);
    // Estimated card widths per node type
    const NODE_W = { [T.SCENE]:380, [T.SHOT]:300, [T.IMAGE]:220, [T.KLING]:290, [T.VEO]:290, [T.LLM]:280, [T.VIDEOEDIT]:420, [T.SCRIPT]:320, [T.AUDIO]:280, [T.MUSICDNA]:320, [T.CLIP]:260 };
    const GAP = 40;
    const cw = cvRef.current?.offsetWidth||800;
    const ch = cvRef.current?.offsetHeight||600;
    const centerX = (cw/2 - pan.x)/zoom;
    const centerY = (ch/2 - pan.y)/zoom;
    // Use refs so rapid successive clicks always see the latest nodes/pos
    const liveNodes = nodesRef.current;
    const livePos   = posRef.current;
    let x, y;
    if (liveNodes.length === 0) {
      // First node: canvas center
      x = centerX - 155;
      y = centerY - 100;
    } else {
      // Find the rightmost edge of every existing node and place to the right
      const rightEdge = (nd) => (livePos[nd.id]?.x ?? 0) + (NODE_W[nd.type] ?? 300);
      const maxRight = Math.max(...liveNodes.map(rightEdge));
      // Y: align to the topmost existing node so row stays tidy
      const minY = Math.min(...Object.values(livePos).map(p => p.y));
      x = maxRight + GAP;
      y = minY;
    }
    // Update refs immediately so the next rapid click sees the new node
    nodesRef.current = [...liveNodes, n];
    posRef.current   = { ...livePos, [n.id]: {x,y} };
    setNodes(prev=>[...prev,n]);
    setPos(prev=>({...prev,[n.id]:{x,y}}));
    front(n.id); setSelId(n.id);
  };

  const updNode = (id, patch) => setNodes(prev=>prev.map(n=>n.id===id?{...n,...patch}:n));
  const linkShot = (shotId, sceneId) => setNodes(prev=>prev.map(n=>n.id===shotId?{...n,sceneId}:n));

  // Save a generated image URL into a global bible entry as its visual reference
  const saveToBible = useCallback((entryId, imgUrl, visualStyle = "none") => {
    // Update global bible entry
    let savedTag = null;
    setBible(prev => {
      const upd = (list) => list.map(e => {
        if (e.id !== entryId) return e;
        savedTag = e.tag;
        return setEntryImageForStyle(e, visualStyle, imgUrl);
      });
      return { characters: upd(prev.characters||[]), objects: upd(prev.objects||[]), locations: upd(prev.locations||[]) };
    });
    // Immediately sync _prev on all scene/shot nodes that reference this tag
    if (savedTag) {
      setNodes(prev => prev.map(n => {
        if (!n.bible?.length) return n;
        const synced = n.bible.map(b => b.tag === savedTag ? setEntryImageForStyle(b, visualStyle, imgUrl) : b);
        return { ...n, bible: synced };
      }));
    }
  }, []);
  const delNode = (id) => {
    setNodes(prev=>prev.filter(n=>n.id!==id));
    setPos(p=>{const c={...p};delete c[id];return c;});
    if(selId===id)setSelId(null);
    if(inspectId===id)setInspectId(null);
  };
  const openInspector = useCallback((id) => {
    setInspectId(id);
    setSelId(id);
    front(id);
  }, [front]);
  useEffect(() => {
    if (inspectId && !nodes.some(n => n.id === inspectId)) setInspectId(null);
  }, [nodes, inspectId]);
  const inspectNode = inspectId ? (nodes.find(n => n.id === inspectId) || null) : null;

  const inspectorInput = {
    width:"100%",
    boxSizing:"border-box",
    background:th.bg,
    border:`1px solid ${th.b0}`,
    color:th.t0,
    borderRadius:8,
    padding:"10px 12px",
    fontSize:12,
    outline:"none",
    fontFamily:"'Inter',system-ui,sans-serif",
  };
  const inspectorText = { ...inspectorInput, resize:"vertical", lineHeight:1.6, minHeight:92 };
  const inspectorSelect = { ...inspectorInput, padding:"10px 10px" };
  const sectionTitle = { fontSize:10, letterSpacing:"0.14em", color:th.t3, fontFamily:"'Inter',system-ui,sans-serif", marginBottom:8 };
  const fieldLabel = { fontSize:10, letterSpacing:"0.08em", color:th.t2, fontFamily:"'Inter',system-ui,sans-serif", marginBottom:6, display:"block" };
  const inspectorSection = (title, content) => (
    <div style={{ border:`1px solid ${th.b0}`, borderRadius:12, padding:"14px 14px 12px", background:th.card2 }}>
      <div style={sectionTitle}>{title}</div>
      {content}
    </div>
  );
  const syncManualShotPatch = (shot, patch) => {
    const next = { ...shot, ...patch, promptOverride: false };
    return { ...patch, promptOverride: false, compiledText: compileShotText(next) };
  };
  const patchShotFromInspector = (shot, patch) => {
    updNode(shot.id, syncManualShotPatch(shot, patch));
  };
  const renderInspectorContent = (n) => {
    if (!n) return null;
    if (n.type === T.SCENE) {
      const coherence = n.directorCoherence || null;
      const coherenceIssues = (coherence?.skippedBeats?.length || 0) + (coherence?.overlapIssues?.length || 0);
      return (
        <>
          {inspectorSection("Scene Text", (
            <textarea
              value={n.sceneText || ""}
              onChange={e=>updNode(n.id, { sceneText:e.target.value })}
              style={{ ...inspectorText, minHeight:220 }}
            />
          ))}
          {inspectorSection("Style", (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={fieldLabel}>Cinematic Style</label>
                <select value={n.cinematicStyle || "drama"} onChange={e=>updNode(n.id, { cinematicStyle:e.target.value })} style={inspectorSelect}>
                  {Object.keys(styleColor).map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Visual Style</label>
                <select value={n.visualStyle || "none"} onChange={e=>updNode(n.id, { visualStyle:e.target.value })} style={inspectorSelect}>
                  {VISUAL_STYLES.map(s => <option key={s} value={s}>{VISUAL_STYLE_PRESETS[s].label}</option>)}
                </select>
              </div>
            </div>
          ))}
          {inspectorSection("Director Workflow", (
            <div style={{ display:"grid", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", border:`1px solid ${th.b0}`, borderRadius:10, background:th.card2 }}>
                <div>
                  <div style={{ fontSize:10, color:th.t3, letterSpacing:"0.12em", textTransform:"uppercase" }}>Coherence Score</div>
                  <div style={{ fontSize:18, color: coherence ? (coherence.score >= 85 ? "#4ade80" : coherence.score >= 60 ? "#fbbf24" : "#f87171") : th.t1, fontWeight:700, marginTop:4 }}>
                    {coherence ? `${coherence.score}/100` : "Not reviewed"}
                  </div>
                </div>
                <div style={{ fontSize:11, color:th.t2, textAlign:"right", maxWidth:260, lineHeight:1.5 }}>
                  {coherence?.recommendation || "Run a continuity pass to score beat coverage and flag overlaps before generating alternates."}
                </div>
              </div>
              {coherenceIssues > 0 && (
                <div style={{ display:"grid", gap:6 }}>
                  {coherence?.skippedBeats?.map((beat, i) => (
                    <div key={`skip-${i}`} style={{ fontSize:11, color:"#f87171", lineHeight:1.5 }}>Skipped beat: {beat}</div>
                  ))}
                  {coherence?.overlapIssues?.map((issue, i) => (
                    <div key={`overlap-${i}`} style={{ fontSize:11, color:"#fbbf24", lineHeight:1.5 }}>Overlap issue: {issue}</div>
                  ))}
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <button onClick={()=>runSceneDirectorReview(n)} disabled={reviewingSceneId===n.id || repairingSceneId===n.id}
                  style={{ background:th.t0, border:"none", color:"#fff", borderRadius:10, padding:"10px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", cursor:(reviewingSceneId===n.id || repairingSceneId===n.id)?"not-allowed":"pointer", opacity:(reviewingSceneId===n.id || repairingSceneId===n.id)?0.5:1 }}>
                  {reviewingSceneId===n.id ? "REVIEWING…" : "REVIEW CONTINUITY"}
                </button>
                <button onClick={()=>repairSceneCoherence(n)} disabled={repairingSceneId===n.id || reviewingSceneId===n.id}
                  style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t1, borderRadius:10, padding:"10px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", cursor:(repairingSceneId===n.id || reviewingSceneId===n.id)?"not-allowed":"pointer", opacity:(repairingSceneId===n.id || reviewingSceneId===n.id)?0.5:1 }}>
                  {repairingSceneId===n.id ? "REPAIRING…" : "REPAIR SCENE"}
                </button>
              </div>
              <button onClick={exportProductionPackage}
                style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2, borderRadius:10, padding:"10px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", cursor:"pointer" }}>
                EXPORT PRODUCTION PACKAGE
              </button>
            </div>
          ))}
        </>
      );
    }
    if (n.type === T.SHOT) {
      const sceneNode = nodes.find(x=>x.id===n.sceneId) || null;
      return (
        <>
          {inspectorSection("Shot Body", (
            <div style={{ display:"grid", gap:12 }}>
              <div>
                <label style={fieldLabel}>Action</label>
                <textarea value={n.how || ""} onChange={e=>patchShotFromInspector(n, { how:e.target.value })} style={inspectorText} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={fieldLabel}>Where</label>
                  <textarea value={n.where || ""} onChange={e=>patchShotFromInspector(n, { where:e.target.value })} style={{ ...inspectorText, minHeight:92 }} />
                </div>
                <div>
                  <label style={fieldLabel}>When</label>
                  <textarea value={n.when || ""} onChange={e=>patchShotFromInspector(n, { when:e.target.value })} style={{ ...inspectorText, minHeight:92 }} />
                </div>
              </div>
              <div>
                <label style={fieldLabel}>Visual Goal</label>
                <textarea value={n.visualGoal || ""} onChange={e=>patchShotFromInspector(n, { visualGoal:e.target.value })} style={inspectorText} />
              </div>
            </div>
          ))}
          {inspectorSection("Camera & Timing", (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={fieldLabel}>Duration (s)</label>
                <input type="number" min="1" max="15" value={n.durationSec || 1} onChange={e=>patchShotFromInspector(n, { durationSec: Math.max(1, Math.min(15, Number(e.target.value) || 1)) })} style={inspectorInput} />
              </div>
              <div>
                <label style={fieldLabel}>Lens</label>
                <input value={n.lens || ""} onChange={e=>patchShotFromInspector(n, { lens:e.target.value })} style={inspectorInput} />
              </div>
              <div>
                <label style={fieldLabel}>Camera Size</label>
                <select value={n.cameraSize || "medium"} onChange={e=>patchShotFromInspector(n, { cameraSize:e.target.value })} style={inspectorSelect}>
                  {CAMERA_SIZES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Camera Angle</label>
                <select value={n.cameraAngle || "eye-level"} onChange={e=>patchShotFromInspector(n, { cameraAngle:e.target.value })} style={inspectorSelect}>
                  {CAMERA_ANGLES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Movement</label>
                <select value={n.cameraMovement || "static"} onChange={e=>patchShotFromInspector(n, { cameraMovement:e.target.value })} style={inspectorSelect}>
                  {CAMERA_MOVEMENTS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Lighting</label>
                <select value={n.lighting || "natural-soft"} onChange={e=>patchShotFromInspector(n, { lighting:e.target.value })} style={inspectorSelect}>
                  {LIGHTING_STYLES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1 / -1" }}>
                <label style={fieldLabel}>Visual Style</label>
                <select value={n.visualStyle || "inherit"} onChange={e=>updNode(n.id, { visualStyle:e.target.value })} style={inspectorSelect}>
                  <option value="inherit">Inherit Scene Style</option>
                  {VISUAL_STYLES.filter(s => s !== "none").map(v => <option key={v} value={v}>{VISUAL_STYLE_PRESETS[v].label}</option>)}
                </select>
                <div style={{ fontSize:10, color:th.t3, marginTop:6 }}>Active: {VISUAL_STYLE_PRESETS[resolveVisualStyle(n, sceneNode)]?.label || "None"}</div>
              </div>
            </div>
          ))}
          {inspectorSection("Dialogue & Prompt", (
            <div style={{ display:"grid", gap:12 }}>
              <div>
                <label style={fieldLabel}>Dialogue</label>
                <textarea value={n.dialogue || ""} onChange={e=>patchShotFromInspector(n, { dialogue:e.target.value })} style={{ ...inspectorText, minHeight:120 }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <span style={fieldLabel}>Prompt Override</span>
                <button
                  onClick={()=>updNode(n.id, { promptOverride: !n.promptOverride, compiledText: n.promptOverride ? compileShotText(n) : (n.compiledText || compileShotText(n)) })}
                  style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t2, borderRadius:8, padding:"8px 10px", fontSize:10, letterSpacing:"0.08em", cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif" }}
                >
                  {n.promptOverride ? "DISABLE OVERRIDE" : "ENABLE OVERRIDE"}
                </button>
              </div>
              {n.promptOverride ? (
                <textarea value={n.compiledText || ""} onChange={e=>updNode(n.id, { compiledText:e.target.value })} style={{ ...inspectorText, minHeight:180 }} />
              ) : (
                <div style={{ ...inspectorText, minHeight:120, whiteSpace:"pre-wrap" }}>{n.compiledText || compileShotText(n)}</div>
              )}
            </div>
          ))}
          {inspectorSection("Director Critique", (
            <div style={{ display:"grid", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ padding:"10px 12px", border:`1px solid ${th.b0}`, borderRadius:10, background:th.card2 }}>
                  <div style={{ fontSize:10, color:th.t3, letterSpacing:"0.12em", textTransform:"uppercase" }}>Quality</div>
                  <div style={{ fontSize:18, fontWeight:700, marginTop:4, color:n.directorQuality === "good" ? "#4ade80" : n.directorQuality === "warn" ? "#fbbf24" : n.directorQuality === "flag" ? "#f87171" : th.t1 }}>
                    {(n.directorQuality || "not reviewed").toUpperCase()}
                  </div>
                </div>
                <button onClick={()=>critiqueSingleShot(n)} disabled={inspectorBusy}
                  style={{ background:th.t0, border:"none", color:"#fff", borderRadius:10, padding:"10px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.08em", cursor:inspectorBusy?"not-allowed":"pointer", opacity:inspectorBusy?0.5:1 }}>
                  {inspectorBusy ? "CRITIQUING…" : "CRITIQUE SHOT"}
                </button>
              </div>
              {n.directorIssue && <div style={{ fontSize:11, color:"#f87171", lineHeight:1.6 }}><strong>Issue:</strong> {n.directorIssue}</div>}
              {n.directorNote && <div style={{ fontSize:11, color:th.t2, lineHeight:1.6 }}><strong>Director Note:</strong> {n.directorNote}</div>}
              {n.visualHint && <div style={{ fontSize:11, color:th.t1, lineHeight:1.6 }}><strong>Visual Hint:</strong> {n.visualHint}</div>}
            </div>
          ))}
          {inspectorSection("Semantic Actions", (
            <div style={{ display:"grid", gap:10 }}>
              <div style={{ fontSize:11, color:th.t3, lineHeight:1.6 }}>
                Apply intent-level changes to this shot without manually rewriting every field.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  ["Tighten Tension", "Tighten this shot's tension while preserving story intent. Increase urgency, make the image cleaner, and keep it practical for AI video generation."],
                  ["Clarify Geography", "Clarify the physical geography of this shot so the audience immediately understands spatial relationships, eyelines, and movement paths."],
                  ["Make Reveal Beat", "Turn this shot into a stronger reveal beat while preserving continuity. Increase information delivery, staging clarity, and dramatic emphasis."],
                  ["Add Reaction Beat", "Refine this shot so it lands as a reaction beat. Favor readable emotion, timing, and subject behavior over spectacle."],
                  ["Simplify For AI", "Simplify this shot for AI video generation while preserving intent. Reduce ambiguity, compress actions, and favor visually direct staging."],
                ].map(([label, command]) => (
                  <button key={label} onClick={()=>runSemanticEdit(n, command)} disabled={inspectorBusy}
                    style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t1, borderRadius:10, padding:"10px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.06em", cursor:inspectorBusy?"not-allowed":"pointer", opacity:inspectorBusy?0.5:1 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      );
    }
    if (n.type === T.IMAGE) {
      return (
        <>
          {inspectorSection("Prompt", (
            <textarea value={n.prompt || ""} onChange={e=>updNode(n.id, { prompt:e.target.value })} style={{ ...inspectorText, minHeight:220 }} />
          ))}
          {inspectorSection("Image Settings", (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={fieldLabel}>Aspect Ratio</label>
                <select value={n.aspect_ratio || "1:1"} onChange={e=>updNode(n.id, { aspect_ratio:e.target.value })} style={inspectorSelect}>
                  {["1:1","16:9","9:16","4:3","3:4"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Resolution</label>
                <select value={n.resolution || "1K"} onChange={e=>updNode(n.id, { resolution:e.target.value })} style={inspectorSelect}>
                  {["1K","2K"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          ))}
        </>
      );
    }
    if (n.type === T.VEO) {
      return (
        <>
          {inspectorSection("Prompt", (
            <textarea value={n.manualPrompt || ""} onChange={e=>updNode(n.id, { manualPrompt:e.target.value })} style={{ ...inspectorText, minHeight:200 }} />
          ))}
          {inspectorSection("Veo Settings", (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={fieldLabel}>Aspect Ratio</label>
                <select value={n.aspect_ratio || "16:9"} onChange={e=>updNode(n.id, { aspect_ratio:e.target.value })} style={inspectorSelect}>
                  {["16:9","9:16"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Duration</label>
                <select value={n.duration || 8} onChange={e=>updNode(n.id, { duration:Number(e.target.value) })} style={inspectorSelect}>
                  {[4,6,8].map(v => <option key={v} value={v}>{v}s</option>)}
                </select>
              </div>
            </div>
          ))}
        </>
      );
    }
    if (n.type === T.KLING) {
      return (
        <>
          {inspectorSection("Kling Settings", (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={fieldLabel}>Aspect Ratio</label>
                <select value={n.aspect_ratio || "16:9"} onChange={e=>updNode(n.id, { aspect_ratio:e.target.value })} style={inspectorSelect}>
                  {["16:9","9:16","1:1"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Mode</label>
                <select value={n.mode || "pro"} onChange={e=>updNode(n.id, { mode:e.target.value })} style={inspectorSelect}>
                  <option value="pro">PRO</option>
                  <option value="std">STD</option>
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Sound</label>
                <select value={n.sound || "off"} onChange={e=>updNode(n.id, { sound:e.target.value })} style={inspectorSelect}>
                  <option value="off">OFF</option>
                  <option value="on">ON</option>
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Lipsync</label>
                <select value={n.lipsync ? "on" : "off"} onChange={e=>updNode(n.id, { lipsync:e.target.value === "on" })} style={inspectorSelect}>
                  <option value="off">OFF</option>
                  <option value="on">ON</option>
                </select>
              </div>
            </div>
          ))}
        </>
      );
    }
    if (n.type === T.LLM) {
      return (
        <>
          {inspectorSection("AI Command", (
            <div style={{ display:"grid", gap:12 }}>
              <div>
                <label style={fieldLabel}>Mode</label>
                <select value={n.llmMode || "edit"} onChange={e=>updNode(n.id, { llmMode:e.target.value })} style={inspectorSelect}>
                  <option value="edit">Edit</option>
                  <option value="coherence">Coherence</option>
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Instruction</label>
                <textarea value={n.command || ""} onChange={e=>updNode(n.id, { command:e.target.value })} style={{ ...inspectorText, minHeight:220 }} />
              </div>
            </div>
          ))}
        </>
      );
    }
    if (n.type === T.SCRIPT) {
      return (
        <>
          {inspectorSection("Script Meta", (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ gridColumn:"1 / -1" }}>
                <label style={fieldLabel}>Title</label>
                <input value={n.title || ""} onChange={e=>updNode(n.id, { title:e.target.value })} style={inspectorInput} />
              </div>
              <div>
                <label style={fieldLabel}>Format</label>
                <select value={n.format || "screenplay"} onChange={e=>updNode(n.id, { format:e.target.value })} style={inspectorSelect}>
                  <option value="screenplay">Screenplay</option>
                  <option value="treatment">Treatment</option>
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Cinematic Style</label>
                <select value={n.cinematicStyle || ""} onChange={e=>updNode(n.id, { cinematicStyle:e.target.value })} style={inspectorSelect}>
                  <option value="">None</option>
                  {Object.keys(styleColor).map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1 / -1" }}>
                <label style={fieldLabel}>Idea</label>
                <textarea value={n.idea || ""} onChange={e=>updNode(n.id, { idea:e.target.value })} style={{ ...inspectorText, minHeight:100 }} />
              </div>
            </div>
          ))}
          {inspectorSection("Script", (
            <textarea value={n.script || ""} onChange={e=>updNode(n.id, { script:e.target.value })} style={{ ...inspectorText, minHeight:320, fontFamily:"'Courier New',monospace" }} />
          ))}
        </>
      );
    }
    if (n.type === T.MUSICDNA) {
      const audioNode = nodes.find(x => x.id === n.audioNodeId) || null;
      return (
        <>
          {inspectorSection("Music DNA", (
            <div style={{ display:"grid", gap:12 }}>
              <div>
                <label style={fieldLabel}>Concept</label>
                <textarea value={n.concept || ""} onChange={e=>updNode(n.id, { concept:e.target.value })} style={{ ...inspectorText, minHeight:110 }} />
              </div>
              <div>
                <label style={fieldLabel}>Lyrics / Key Lines</label>
                <textarea value={n.lyrics || ""} onChange={e=>updNode(n.id, { lyrics:e.target.value })} style={{ ...inspectorText, minHeight:180 }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={fieldLabel}>Clip Mode</label>
                  <select value={n.clipMode || "hybrid"} onChange={e=>updNode(n.id, { clipMode:e.target.value })} style={inspectorSelect}>
                    <option value="performance">Performance</option>
                    <option value="narrative">Narrative</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="abstract">Abstract</option>
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>Genre</label>
                  <select value={n.genre || "auto"} onChange={e=>updNode(n.id, { genre:e.target.value })} style={inspectorSelect}>
                    {MUSIC_GENRES.map(opt => <option key={opt} value={opt}>{opt === "auto" ? "Auto" : capitalize(opt)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={fieldLabel}>Sections</label>
                  <select value={n.preferredSections || "auto"} onChange={e=>updNode(n.id, { preferredSections:e.target.value })} style={inspectorSelect}>
                    <option value="auto">Auto</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>
              </div>
              <div style={{ fontSize:11, color:th.t2, lineHeight:1.6 }}>
                Linked audio: {audioNode?.fileName || "none"} {audioNode?.duration ? `· ${audioNode.duration.toFixed(1)}s` : ""}
              </div>
            </div>
          ))}
        </>
      );
    }
    return inspectorSection("Node Content", (
      <div style={{ fontSize:12, color:th.t2, lineHeight:1.7 }}>
        This node does not have a dedicated inspector form yet. Its main editable content is still available in the card.
      </div>
    ));
  };

  const renderNodeCard = (n) => {
    const nodePosValue = pos[n.id] || { x: 80, y: 80 };
    const isSel = selId === n.id;
    const linkedShot = n.type===T.IMAGE ? (nodes.find(x=>x.id===n.shotId)||null) : null;
    const linkedScene = n.type===T.IMAGE ? (nodes.find(x=>x.id===(n.sceneId||(linkedShot && linkedShot.sceneId)))||null) : null;
    const sceneNode = n.type===T.SHOT ? (nodes.find(x=>x.id===n.sceneId)||null) : null;
    return (
      <>
        {n.type===T.SCENE&&<SceneCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onGenShots={onGenShots} onGenVersionB={onGenVersionB} onReviewContinuity={()=>runSceneDirectorReview(n)} onRepairScene={()=>repairSceneCoherence(n)} reviewBusy={reviewingSceneId===n.id} repairBusy={repairingSceneId===n.id} onDel={()=>delNode(n.id)} onStartWire={startWire} nodePos={nodePosValue} model={shotModel} sceneStats={getSceneShotStats(nodes,n.id)} onExport={()=>exportScene(n)} globalBible={globalBibleFlat} onInspect={()=>openInspector(n.id)} />}
        {n.type===T.SHOT&&<ShotCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onDel={()=>delNode(n.id)} sceneBible={sceneNode?.bible||[]} linkedScene={sceneNode} onLink={sceneId=>linkShot(n.id,sceneId)} onStartWire={startWire} nodePos={nodePosValue} sceneStats={getSceneShotStats(nodes,n.sceneId)} globalBible={globalBibleFlat} onRetrySingleShot={onRetrySingleShot} onInspect={()=>openInspector(n.id)} />}
        {n.type===T.IMAGE&&<ImageCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onDel={()=>delNode(n.id)} linkedShot={linkedShot} linkedScene={linkedScene} onUnlinkShot={()=>updNode(n.id,{shotId:null,prompt:""})} onStartWire={startWire} nodePos={nodePosValue} globalBible={globalBibleFlat} onSaveToBible={saveToBible} onInspect={()=>openInspector(n.id)} />}
        {n.type===T.KLING&&<KlingCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onDel={()=>delNode(n.id)} allNodes={nodes} onStartWire={startWire} nodePos={nodePosValue} globalBible={globalBibleFlat} onInspect={()=>openInspector(n.id)} credits={credits} onOutOfCredits={setOutOfCredits} />}
        {n.type===T.VEO&&<VeoCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onDel={()=>delNode(n.id)} allNodes={nodes} onStartWire={startWire} nodePos={nodePosValue} globalBible={globalBibleFlat} onInspect={()=>openInspector(n.id)} credits={credits} onOutOfCredits={setOutOfCredits} />}
        {n.type===T.LLM&&<LlmCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onDel={()=>delNode(n.id)} allNodes={nodes} onUpdateNode={updNode} onInspect={()=>openInspector(n.id)} />}
        {n.type===T.VIDEOEDIT&&<VideoEditCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onDel={()=>delNode(n.id)} allNodes={nodes} audioNode={nodes.find(x=>x.id===n.audioNodeId)||null} onInspect={()=>openInspector(n.id)} onOpenFullscreen={()=>setFullscreenVEId(n.id)} />}
        {n.type===T.AUDIO&&<AudioTrackCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onDel={()=>delNode(n.id)} onStartWire={startWire} nodePos={nodePosValue} allNodes={nodes} onInspect={()=>openInspector(n.id)} />}
        {n.type===T.MUSICDNA&&<MusicDnaCard node={n} sel={isSel} upd={p=>updNode(n.id,p)} onDel={()=>delNode(n.id)} allNodes={nodes} onInspect={()=>openInspector(n.id)} onAnalyze={()=>analyzeMusicNode(n)} onGenerateBlueprint={()=>generateMusicBlueprint(n)} />}
        {n.type===T.SCRIPT&&<ScriptCard node={n} sel={isSel} upd={pr=>updNode(n.id,pr)} onDel={()=>delNode(n.id)} onSplitScenes={scenes=>onSplitScenes(n.id,scenes)} onInspect={()=>openInspector(n.id)} />}
        {n.type===T.CLIP&&<ClipCard node={n} sel={isSel} upd={pr=>updNode(n.id,pr)} onDel={()=>delNode(n.id)} onStartWire={startWire} nodePos={nodePosValue} onInspect={()=>openInspector(n.id)} />}
      </>
    );
  };
  const moveNode = (id,x,y) => setPos(prev=>({...prev,[id]:{x,y}}));

  // ── Batch generate all empty Image nodes sequentially ─────────────────────────
  const batchGenerate = useCallback(async (targetNodes, targetPos, targetBible) => {
    const lNodes  = targetNodes || nodesRef.current;
    const lBible  = targetBible || bible;
    const imgNodes = lNodes.filter(n => n.type===T.IMAGE && !n.generatedUrl && n.prompt?.trim());
    if (!imgNodes.length) return;
    setBatchProgress({ total: imgNodes.length, done: 0 });
    setBatchGenerating(true);
    const flat = [
      ...(lBible.characters||[]),
      ...(lBible.objects||[]),
      ...(lBible.locations||[]),
    ].map(e => ({ ...e, _prev: resolveEntryImage(e, "none") }));
    for (const n of imgNodes) {
      try {
        const linkedShot  = n.shotId  ? lNodes.find(x=>x.id===n.shotId)  : null;
        const linkedScene = n.sceneId ? lNodes.find(x=>x.id===n.sceneId) : (linkedShot?.sceneId ? lNodes.find(x=>x.id===linkedShot.sceneId) : null);
        const activeVisualStyle = resolveVisualStyle(linkedShot, linkedScene);
        const sb = linkedScene?.bible || [];
        const shb = linkedShot?.bible || [];
        const allB = [
          ...shb,
          ...sb.filter(s=>!shb.find(b=>b.tag===s.tag)),
        ];
        const refs = allB.map(b => bibleToRef(b, activeVisualStyle)).filter(Boolean);
        let prompt = n.prompt;
        if (refs.length > 0) {
          const desc = refs.map(r=>`${r.tag} (${r.kind}: ${r.name})`).join(", ");
          prompt = `VISUAL REFERENCE IMAGES PROVIDED — maintain exact appearance of: ${desc}.\n\n${n.prompt}`;
        }
        prompt = applyVisualStylePrompt(prompt, activeVisualStyle, "image");
        const url = await aiImage(prompt, refs, n.aspect_ratio||"1:1", n.resolution||"1K");
        updNode(n.id, { generatedUrl: url });
      } catch(e) { console.warn("Batch gen failed for", n.id, e.message); }
      setBatchProgress(prev => ({ ...prev, done: prev.done+1 }));
    }
    setBatchGenerating(false);
  }, [bible, updNode]);

  // ── Save current canvas as a user template in Supabase ────────────────────────
  const loadUserTemplates = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, data, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error || !data) return;
      setUserTemplates(data.filter(p => p.data?.isTemplate === true).map(p => ({
        id:          p.id,
        label:       p.data?.templateMeta?.name  || p.name,
        emoji:       p.data?.templateMeta?.emoji || "📋",
        description: p.data?.templateMeta?.desc  || "",
        tags:        p.data?.templateMeta?.tags  || ["CUSTOM"],
        make: () => ({
          nodes:  p.data?.nodes     || [],
          pos:    p.data?.positions || {},
          bible:  p.data?.bible     || { characters:[], objects:[], locations:[] },
        }),
      })));
    } catch(e) { console.warn("Load user templates failed:", e.message); }
  }, [user]);

  useEffect(() => { if (templatePickerOpen) loadUserTemplates(); }, [templatePickerOpen]);

  const saveAsTemplate = useCallback(async () => {
    if (!user || !templateSaveName.trim()) return;
    const imgCount  = nodesRef.current.filter(n=>n.type===T.IMAGE).length;
    const shotCount = nodesRef.current.filter(n=>n.type===T.SHOT).length;
    const sceneCount= nodesRef.current.filter(n=>n.type===T.SCENE).length;
    const data = {
      isTemplate:   true,
      templateMeta: {
        name:  templateSaveName.trim(),
        emoji: templateSaveEmoji,
        desc:  templateSaveDesc.trim() || `${sceneCount} scenes · ${shotCount} shots · ${imgCount} images`,
        tags:  [`${sceneCount} SCENES`, `${shotCount} SHOTS`, `${imgCount} IMAGES`, "CUSTOM"],
      },
      nodes:     nodesRef.current,
      positions: posRef.current,
      bible,
    };
    try {
      const { error } = await supabase.from("projects").insert({
        user_id:    user.id,
        name:       `__TPL__${templateSaveName.trim()}`,
        data,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaveTemplateOpen(false);
      setTemplateSaveName("");
      setTemplateSaveDesc("");
      setTemplateSaveEmoji("🎬");
      await loadUserTemplates();
    } catch(e) { alert("Could not save template: " + e.message); }
  }, [user, templateSaveName, templateSaveEmoji, templateSaveDesc, bible, loadUserTemplates]);

  const onCanvasClick = (e) => {
    setSelId(null);
  };

  const onCanvasMD = (e) => {

    if(e.button===1||(e.button===0&&e.altKey)){
      e.preventDefault();
      panning.current=true;
      const spx=pan.x, spy=pan.y, smx=e.clientX, smy=e.clientY;
      const mv=(ev)=>{ if(!panning.current)return; setPan({x:spx+ev.clientX-smx,y:spy+ev.clientY-smy}); };
      const up=()=>{ panning.current=false; window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
      window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
    }
  };



  const exportScene = (sceneNode) => {
    const shots = nodes
      .filter(n => n.type === T.SHOT && n.sceneId === sceneNode.id)
      .sort((a, b) => (a.index || 0) - (b.index || 0));
    const content = formatSceneMd(sceneNode, shots);
    const slug = (sceneNode.sceneText || "scene").trim().slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase() || "scene";
    downloadMd(`scene-${slug}.txt`, content);
  };

  const exportProductionPackage = useCallback(() => {
    const projectName = currentProject?.name || "cartasis-project";
    const slug = projectName.trim().replace(/[^a-z0-9]/gi, "-").toLowerCase() || "project";
    const content = formatProductionPackageMd(nodesRef.current, projectName);
    downloadMd(`production-package-${slug}.md`, content);
  }, [currentProject]);

  const applyDirectorReviewResult = useCallback((sceneNode, sceneShots, result) => {
    const shotAnnotations = result?.shots || [];
    const coherence = result?.coherence || null;

    setNodes(prev => prev.map(n => {
      if (n.type !== T.SHOT || n.sceneId !== sceneNode.id) return n;
      const ann = shotAnnotations.find(d => d.index === n.index);
      if (!ann) return n;
      const patch = {
        directorNote: ann.directorNote || "",
        directorQuality: ann.quality || "good",
        directorIssue: ann.issue || "",
        visualHint: ann.visualHint || n.visualHint || "",
      };
      return { ...n, ...patch, ...(n.promptOverride ? {} : { compiledText: compileShotText({ ...n, ...patch }) }) };
    }));

    if (coherence) updNode(sceneNode.id, { directorCoherence: coherence });
  }, []);

  const runSceneDirectorReview = useCallback(async (sceneNode) => {
    const latestScene = nodesRef.current.find(n => n.id === sceneNode.id) || sceneNode;
    const sceneShots = nodesRef.current
      .filter(n => n.type === T.SHOT && n.sceneId === latestScene.id)
      .sort((a, b) => (a.index || 0) - (b.index || 0));
    if (!sceneShots.length) {
      alert("This scene has no shots to review yet.");
      return;
    }
    setReviewingSceneId(latestScene.id);
    try {
      const result = await aiDirectorPass(latestScene, sceneShots, shotModel);
      if (!result) throw new Error("Director review returned no result.");
      applyDirectorReviewResult(latestScene, sceneShots, result);
    } catch (e) {
      alert(`Director review failed: ${e.message}`);
    } finally {
      setReviewingSceneId(null);
    }
  }, [applyDirectorReviewResult, shotModel]);

  const repairSceneCoherence = useCallback(async (sceneNode) => {
    const latestScene = nodesRef.current.find(n => n.id === sceneNode.id) || sceneNode;
    const sceneShots = nodesRef.current
      .filter(n => n.type === T.SHOT && n.sceneId === latestScene.id)
      .sort((a, b) => (a.index || 0) - (b.index || 0));
    if (!sceneShots.length) {
      alert("This scene has no shots to repair yet.");
      return;
    }
    setRepairingSceneId(latestScene.id);
    try {
      const patches = await aiCoherenceCheck([latestScene, ...sceneShots], "Repair continuity, coverage, and shot viability issues while preserving the scene's intent and structure.");
      const filtered = Object.fromEntries(Object.entries(patches || {}).filter(([, v]) => v && Object.keys(v).length > 0));
      if (Object.keys(filtered).length === 0) {
        await runSceneDirectorReview(latestScene);
        return;
      }

      setNodes(prev => prev.map(n => {
        const patch = filtered[n.id];
        if (!patch) return n;
        const merged = { ...n, ...patch };
        return n.type === T.SHOT && !n.promptOverride
          ? { ...merged, compiledText: compileShotText(merged) }
          : merged;
      }));

      const repairedScene = { ...latestScene, ...(filtered[latestScene.id] || {}) };
      const repairedShots = sceneShots.map(s => {
        const patch = filtered[s.id] || {};
        const merged = { ...s, ...patch };
        return s.promptOverride ? merged : { ...merged, compiledText: compileShotText(merged) };
      });
      const result = await aiDirectorPass(repairedScene, repairedShots, shotModel);
      if (result) applyDirectorReviewResult(repairedScene, repairedShots, result);
    } catch (e) {
      alert(`Coherence repair failed: ${e.message}`);
    } finally {
      setRepairingSceneId(null);
    }
  }, [applyDirectorReviewResult, runSceneDirectorReview, shotModel]);

  const critiqueSingleShot = useCallback(async (shotNode) => {
    const latestShot = nodesRef.current.find(n => n.id === shotNode.id) || shotNode;
    const sceneNode = nodesRef.current.find(n => n.id === latestShot.sceneId) || { id:null, sceneText:"", cinematicStyle:"thriller" };
    setInspectorBusy(true);
    setInspectorStatus("Critiquing shot…");
    try {
      const result = await aiDirectorPass(sceneNode, [latestShot], shotModel);
      const ann = result?.shots?.[0];
      if (!ann) throw new Error("No critique returned.");
      const patch = {
        directorNote: ann.directorNote || "",
        directorQuality: ann.quality || "good",
        directorIssue: ann.issue || "",
        visualHint: ann.visualHint || latestShot.visualHint || "",
      };
      updNode(latestShot.id, {
        ...patch,
        ...(latestShot.promptOverride ? {} : { compiledText: compileShotText({ ...latestShot, ...patch }) }),
      });
    } catch (e) {
      alert(`Shot critique failed: ${e.message}`);
    } finally {
      setInspectorBusy(false);
      setInspectorStatus("");
    }
  }, [shotModel]);

  const runSemanticEdit = useCallback(async (targetNode, command) => {
    if (!targetNode || !command?.trim()) return;
    setInspectorBusy(true);
    setInspectorStatus("Applying semantic edit…");
    try {
      const latestTarget = nodesRef.current.find(n => n.id === targetNode.id) || targetNode;
      const patch = await aiLlm(command, latestTarget.type, getEditableNodeContent(latestTarget));
      if (!patch || Object.keys(patch).length === 0) return;
      const merged = { ...latestTarget, ...patch };
      updNode(latestTarget.id, latestTarget.type === T.SHOT && !latestTarget.promptOverride
        ? { ...patch, compiledText: compileShotText(merged) }
        : patch
      );
    } catch (e) {
      alert(`Semantic edit failed: ${e.message}`);
    } finally {
      setInspectorBusy(false);
      setInspectorStatus("");
    }
  }, []);

  const onGenShots = async (sceneNode) => {
    const raw = await aiShots(sceneNode, shotModel);
    const sp = pos[sceneNode.id]||{x:100,y:100};
    const newShots = raw.map((s,i)=>({
      ...mkShot(sceneNode.id, i+1), ...s,
      id:`sh_${uid()}`, type:T.SHOT, sceneId:sceneNode.id,
      compiledText:compileShotText(s)
    }));

    // Director pass — runs after breakdown, never touches story fidelity.
    // Annotates each shot with visual intent + checks scene coherence.
    const directorResult = await aiDirectorPass(sceneNode, newShots, shotModel);
    const shotAnnotations = directorResult?.shots || [];
    const coherence       = directorResult?.coherence || null;

    const finalShots = newShots.map(s => {
      const ann = shotAnnotations.find(d => d.index === s.index);
      if (!ann) return s;
      const patched = {
        ...s,
        directorNote:    ann.directorNote    || "",
        directorQuality: ann.quality         || "good",
        directorIssue:   ann.issue           || "",
        visualHint:      ann.visualHint      || s.visualHint || "",
      };
      return { ...patched, compiledText: compileShotText(patched) };
    });

    // Store coherence report on the scene node so SceneCard can display it
    if (coherence) updNode(sceneNode.id, { directorCoherence: coherence });

    // Create a paired Image node for each shot, pre-seeded with the compiled prompt
    const newImages = finalShots.map(s => ({
      ...mkImage(s.sceneId, s.id),
      prompt: s.compiledText || "",
    }));

    setNodes(prev=>[...prev,...finalShots,...newImages]);
    setPos(prev=>{
      const np={...prev};
      // Single row: scene(310px) + 70px gap = 380px offset, then 340px per shot (268 card + 72 gap)
      // Image node sits 300px to the right of its paired shot (268 shot width + 32 gap)
      finalShots.forEach((s,i)=>{ np[s.id]={x:sp.x+380+i*340, y:sp.y}; });
      newImages.forEach((img,i)=>{ np[img.id]={x:sp.x+380+i*340+300, y:sp.y+300}; });
      return np;
    });
    finalShots.forEach(s=>front(s.id));
    newImages.forEach(img=>front(img.id));
  };

  // Generate Version B — re-runs shot breakdown with Director critique injected.
  // New shots are placed to the right of the originals and tagged versionTag:"B".
  const onGenVersionB = async (sceneNode) => {
    const critique = sceneNode.directorCoherence;
    if (!critique) return;
    // Collect flagged shot issues so the retry knows which shots were problematic
    const shotIssues = nodes
      .filter(n => n.type===T.SHOT && n.sceneId===sceneNode.id && (n.directorQuality==="flag"||n.directorQuality==="warn"))
      .map(n => ({ index: n.index, issue: n.directorIssue }));
    const fullCritique = { ...critique, shotIssues };

    const raw = await aiVersionB(sceneNode, shotModel, fullCritique);
    const sp  = pos[sceneNode.id]||{x:100,y:100};
    // Offset Version B shots below Version A (60px gap below the row)
    const xOffset = 380 + (sceneNode.shotCount||3) * 340;
    const newShots = raw.map((s,i)=>({
      ...mkShot(sceneNode.id, i+1), ...s,
      id:`sh_${uid()}`, type:T.SHOT, sceneId:sceneNode.id,
      versionTag:"B",
      compiledText:compileShotText(s),
    }));

    const directorResult = await aiDirectorPass(sceneNode, newShots, shotModel);
    const shotAnnotations = directorResult?.shots||[];
    const coherenceB      = directorResult?.coherence||null;

    const finalShots = newShots.map(s => {
      const ann = shotAnnotations.find(d=>d.index===s.index);
      if (!ann) return s;
      const patched = { ...s, directorNote:ann.directorNote||"", directorQuality:ann.quality||"good", directorIssue:ann.issue||"", visualHint:ann.visualHint||s.visualHint||"" };
      return { ...patched, compiledText:compileShotText(patched) };
    });

    // Store Version B coherence on scene node under a separate key
    if (coherenceB) updNode(sceneNode.id, { directorCoherenceB: coherenceB });

    setNodes(prev=>[...prev,...finalShots]);
    setPos(prev=>{
      const np={...prev};
      finalShots.forEach((s,i)=>{ np[s.id]={ x:sp.x+380+i*340, y:sp.y+500 }; });
      return np;
    });
    finalShots.forEach(s=>front(s.id));
  };

  // Retry a single flagged shot — replaces it in-place with an improved version.
  const onRetrySingleShot = async (shotNode) => {
    const sceneNode = nodes.find(n=>n.id===shotNode.sceneId);
    if (!sceneNode) return;
    const improved = await aiRetrySingleShot(sceneNode, shotNode, shotNode.directorIssue||"improve this shot", shotModel);
    const patched = {
      ...improved,
      versionTag: "B",
      directorQuality: undefined,
      directorIssue:   undefined,
    };
    updNode(shotNode.id, { ...patched, compiledText: compileShotText({ ...shotNode, ...patched }) });
  };

  // Compute edges
  const sceneEdges = nodes.filter(n=>(n.type===T.SHOT||n.type===T.IMAGE)&&n.sceneId&&pos[n.sceneId]&&pos[n.id]).map(n=>{
    const fp=pos[n.sceneId], tp=pos[n.id];
    const sc=nodes.find(x=>x.id===n.sceneId);
    const color = th.dark ? (sc ? (styleColor[sc.cinematicStyle]||"#f87171")+"66" : "#2d374866") : "rgba(0,0,0,0.2)";
    return { id:`sc-${n.sceneId}-${n.id}`, fx:fp.x+310, fy:fp.y+70, tx:tp.x, ty:tp.y+50, color };
  });
  const shotEdges = nodes.filter(n=>n.type===T.IMAGE&&n.shotId&&pos[n.shotId]&&pos[n.id]).map(n=>{
    const fp=pos[n.shotId], tp=pos[n.id];
    return { id:`sh-${n.shotId}-${n.id}`, fx:fp.x+268, fy:fp.y+50, tx:tp.x, ty:tp.y+50, color: th.dark ? "#38bdf855" : "rgba(0,0,0,0.2)" };
  });
  const klingEdges = nodes.filter(n=>n.type===T.KLING).flatMap(kn=>
    (kn.shotIds||[]).filter(sid=>pos[sid]&&pos[kn.id]).map((sid,i)=>{
      const fp=pos[sid], tp=pos[kn.id];
      return { id:`kl-${sid}-${kn.id}-${i}`, fx:fp.x+268, fy:fp.y+50, tx:tp.x, ty:tp.y+44+i*26, color: th.dark ? "#f9731666" : "rgba(0,0,0,0.2)" };
    })
  );
  const veoEdges = nodes.filter(n=>n.type===T.VEO&&n.shotId&&pos[n.shotId]&&pos[n.id]).map(n=>{
    const fp=pos[n.shotId], tp=pos[n.id];
    return { id:`veo-${n.shotId}-${n.id}`, fx:fp.x+268, fy:fp.y+50, tx:tp.x, ty:tp.y+44, color: th.dark ? "#a855f766" : "rgba(0,0,0,0.2)" };
  });
  const veoFrameEdges = nodes.filter(n=>n.type===T.VEO).flatMap(vn=>{
    const out = [];
    if (vn.startFrameNodeId && pos[vn.startFrameNodeId] && pos[vn.id]) {
      const fp=pos[vn.startFrameNodeId], tp=pos[vn.id];
      out.push({ id:`veo-sf-${vn.id}`, fx:fp.x+220, fy:fp.y+50, tx:tp.x, ty:tp.y+95, color: th.dark ? "#a855f755" : "rgba(0,0,0,0.15)" });
    }
    if (vn.endFrameNodeId && pos[vn.endFrameNodeId] && pos[vn.id]) {
      const fp=pos[vn.endFrameNodeId], tp=pos[vn.id];
      out.push({ id:`veo-ef-${vn.id}`, fx:fp.x+220, fy:fp.y+50, tx:tp.x, ty:tp.y+125, color: th.dark ? "#a855f733" : "rgba(0,0,0,0.1)" });
    }
    (vn.refNodeIds||[]).forEach((rid,i) => {
      if (pos[rid] && pos[vn.id]) {
        const fp=pos[rid], tp=pos[vn.id];
        out.push({ id:`veo-ref-${vn.id}-${rid}`, fx:fp.x+220, fy:fp.y+50, tx:tp.x, ty:tp.y+155+i*16, color: th.dark ? "#a855f733" : "rgba(0,0,0,0.1)" });
      }
    });
    return out;
  });
  const videoEditEdges = nodes.filter(n=>n.type===T.VIDEOEDIT).flatMap(ve=>
    (ve.videoNodeIds||[]).filter((vid,i)=>pos[vid]&&pos[ve.id]).map((vid,i)=>{
      const fp=pos[vid], tp=pos[ve.id];
      const srcNode = nodes.find(x=>x.id===vid);
      const srcW = srcNode ? 290 : 220;
      return { id:`ved-${ve.id}-${vid}`, fx:fp.x+srcW, fy:fp.y+44, tx:tp.x, ty:tp.y+44+i*14, color: th.dark?"rgba(255,255,255,0.18)":"rgba(0,0,0,0.18)" };
    })
  );
  const audioEdges = nodes.filter(n=>n.type===T.VIDEOEDIT && n.audioNodeId && pos[n.audioNodeId] && pos[n.id]).map(ve=>{
    const ap=pos[ve.audioNodeId], vp=pos[ve.id];
    return { id:`aud-${ve.id}`, fx:ap.x+280, fy:ap.y+44, tx:vp.x, ty:vp.y+44, color:"#10b981" };
  });
  // Video node → Audio node edges (for video-to-music)
  const videoAudioEdges = nodes.filter(n=>n.type===T.AUDIO && n.videoNodeId && pos[n.videoNodeId] && pos[n.id]).map(an=>{
    const vp=pos[an.videoNodeId], ap=pos[an.id];
    const srcNode = nodes.find(x=>x.id===an.videoNodeId);
    const srcW = srcNode?.type===T.CLIP ? 260 : 290;
    return { id:`vidaud-${an.id}`, fx:vp.x+srcW, fy:vp.y+44, tx:ap.x, ty:ap.y+44, color:"#10b98177" };
  });
  // Clip node → VideoEdit edges
  const musicDNAEdges = nodes.filter(n=>n.type===T.MUSICDNA && n.audioNodeId && pos[n.audioNodeId] && pos[n.id]).map(md=>{
    const ap=pos[md.audioNodeId], mp=pos[md.id];
    return { id:`mdna-${md.id}`, fx:ap.x+280, fy:ap.y+44, tx:mp.x, ty:mp.y+44, color:"#ec489977" };
  });
  const clipEdges = nodes.filter(n=>n.type===T.VIDEOEDIT).flatMap(ve=>
    (ve.videoNodeIds||[]).filter(vid => {
      const src = nodes.find(x=>x.id===vid);
      return src?.type===T.CLIP && pos[vid] && pos[ve.id];
    }).map((vid,i)=>{
      const fp=pos[vid], tp=pos[ve.id];
      return { id:`clp-${ve.id}-${vid}`, fx:fp.x+260, fy:fp.y+44, tx:tp.x, ty:tp.y+44+i*14, color:`#3b82f677` };
    })
  );
  const edges = [...sceneEdges, ...shotEdges, ...klingEdges, ...veoEdges, ...veoFrameEdges, ...videoEditEdges, ...audioEdges, ...videoAudioEdges, ...musicDNAEdges, ...clipEdges];

  const TOOLS = [
    { type:T.MUSICDNA, icon:Layers,      label:"MUSIC DNA", color:"#ec4899", desc:"Analyze music structure and turn it into a clip blueprint" },
    { type:T.SCRIPT,   icon:ScrollText,  label:"SCRIPT", color:"#94a3b8", desc:"Script node — write, upload or generate a script and split into scenes" },
    { type:T.SCENE,    icon:Clapperboard,label:"SCENE",  color:"#f87171", desc:"Scene node" },
    { type:T.SHOT,     icon:Camera,      label:"SHOT",   color:"#38bdf8", desc:"Shot node" },
    { type:T.IMAGE,    icon:ImageIcon,   label:"IMAGE",  color:"#a3e635", desc:"Image prompt" },
    { type:T.KLING,    icon:null, brandText:"Kling", label:"KLING",  color:"#f97316", desc:"Kling video node" },
    { type:T.VEO,      icon:null, brandText:"Veo",   label:"VEO",    color:"#a855f7", desc:"Veo 3.1 video node" },
    { type:T.LLM,      icon:Bot,         label:"AI",     color:"#6366f1", desc:"AI command node — edits any connected node" },
    { type:T.VIDEOEDIT,icon:Scissors,    label:"EDIT",   color:"#64748b", desc:"Video Edit — trim, arrange and export clips" },
    { type:T.AUDIO,    icon:Music,       label:"AUDIO",  color:"#10b981", desc:"Audio Track — detect BPM and snap video cuts to beats" },
    { type:T.CLIP,     icon:Upload,      label:"CLIP",   color:"#3b82f6", desc:"Video Clip — upload a local video file onto the canvas" },
  ];

  const totalDur = nodes.filter(n=>n.type===T.SHOT).reduce((s,n)=>s+(n.durationSec||0),0);
  const shotCount = nodes.filter(n=>n.type===T.SHOT).length;

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!authChecked) return (
    <div style={{ width:"100vw", height:"100vh", background:"#0d0d0d", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Ico icon={Loader2} size={28} color="#374151" style={{ animation:"spin 1s linear infinite" }}/>
    </div>
  );
  if (window.location.pathname === "/features") return <FeaturesPage onAuth={() => window.location.href = "/workspace"} />;
  if (window.location.pathname === "/pricing") return <LandingPage onAuth={u => { setUser(u); window.location.href = "/workspace"; }} initialSection="pricing" />;
  if (window.location.pathname === "/kling-video-generation") return <KlingPage pageKey="kling-video-generation" onAuth={() => window.location.href = "/workspace"} />;
  if (window.location.pathname === "/kling-3-0") return <KlingPage pageKey="kling-3-0" onAuth={() => window.location.href = "/workspace"} />;
  if (window.location.pathname === "/kling-lipsync") return <KlingPage pageKey="kling-lipsync" onAuth={() => window.location.href = "/workspace"} />;
  if (!user) return <LandingPage onAuth={u => { setUser(u); window.location.href = "/workspace"; }} />;
  // Redirect bare / and /# to /workspace
  if (window.location.pathname === "/" || window.location.pathname === "") {
    window.history.replaceState({}, "", "/workspace");
  }

  // ── Billing helpers (needs user + credits in scope) ──────────────────────
  const startCheckout = async (tier) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ tier }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch (e) { alert("Checkout error: " + e.message); }
  };

  const startTopup = async (pack) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const r = await fetch("/api/stripe/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ pack }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch (e) { alert("Topup error: " + e.message); }
  };

  const openPortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const r = await fetch("/api/stripe/portal", {
        method: "POST", headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await r.json();
      if (d.url) window.open(d.url, "_blank");
    } catch (e) { alert("Portal error: " + e.message); }
  };

  // Handle Stripe redirect back (?payment=success etc.)
  (() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("payment") === "success" || p.get("payment") === "topup_success") {
      fetchCredits();
      window.history.replaceState({}, "", window.location.pathname);
    }
  })();

  const TIER_LABEL = { free: "Free", indie: "Indie", pro: "Pro", studio: "Studio" };
  const TIER_COLOR = { free: "#6b7280", indie: "#38bdf8", pro: "#a78bfa", studio: "#f59e0b" };
  const pricingTiers = pricingData?.tiers?.length ? pricingData.tiers : [
    { tier:"free",   label:"Free",   priceDisplay:"$0",  credits:80,   features:["80 credits/mo","Kling Standard","Watermark","2 projects"], interval:"month" },
    { tier:"indie",  label:"Indie",  priceDisplay:"$19", credits:900,  features:["900 credits/mo","All Kling + Lipsync","Veo Fast","10 projects","No watermark"], interval:"month" },
    { tier:"pro",    label:"Pro",    priceDisplay:"$49", credits:2500, features:["2500 credits/mo","All Kling + All Veo","30 projects","All AI features"], interval:"month" },
    { tier:"studio", label:"Studio", priceDisplay:"$99", credits:6000, features:["6000 credits/mo","Everything","Unlimited projects","All AI features"], interval:"month" },
  ];
  const pricingTopups = pricingData?.topups?.length ? pricingData.topups : [
    { pack:"500",  label:"500 credits",  priceDisplay:"$9.99",  description:"~25 Kling videos" },
    { pack:"1500", label:"1500 credits", priceDisplay:"$24.99", description:"~33 Veo Fast videos" },
    { pack:"4000", label:"4000 credits", priceDisplay:"$59.99", description:"Best value" },
  ];
  const credPct = credits ? Math.min(100, Math.round((credits.credits_balance / credits.credits_monthly) * 100)) : 0;
  const credLow = credits && credits.credits_balance < Math.round(credits.credits_monthly * 0.15);

  return (
    <ThemeCtx.Provider value={th}>

    {/* ── OUT-OF-CREDITS POPUP ─────────────────────────────────────────────── */}
    {outOfCredits && (
      <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:th.card, border:`1px solid ${th.b1}`, borderRadius:12, padding:32, maxWidth:440, width:"90%", boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>⚡</div>
          <div style={{ fontSize:18, fontWeight:700, color:th.t0, marginBottom:8 }}>Not enough credits</div>
          <div style={{ fontSize:14, color:th.t2, marginBottom:20 }}>
            This operation needs <strong style={{color:th.t0}}>{outOfCredits.needed} credits</strong> but you only have <strong style={{color:th.t0}}>{outOfCredits.balance}</strong> remaining.
          </div>
          {/* Top-up packs */}
          <div style={{ fontSize:12, fontWeight:600, color:th.t3, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Buy credit packs</div>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {pricingTopups.map((pack) => (
              <button key={pack.pack} onClick={() => { setOutOfCredits(null); startTopup(pack.pack); }}
                style={{ flex:1, padding:"10px 4px", borderRadius:8, border:`1px solid ${th.b1}`, background:th.bg,
                  color:th.t0, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                <div style={{ fontSize:15, fontWeight:700 }}>{pack.pack}</div>
                <div style={{ color:th.t3, fontSize:11 }}>credits</div>
                <div style={{ color:"#a78bfa", marginTop:2 }}>{pack.priceDisplay}</div>
              </button>
            ))}
          </div>
          {/* Upgrade plan */}
          {credits?.tier !== "studio" && (
            <>
              <div style={{ fontSize:12, fontWeight:600, color:th.t3, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Or upgrade your plan</div>
              <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                {credits?.tier === "free" && (
                  <button onClick={() => { setOutOfCredits(null); startCheckout("indie"); }}
                    style={{ flex:1, padding:"10px 8px", borderRadius:8, border:"1px solid #38bdf8", background:"rgba(56,189,248,0.08)",
                      color:"#38bdf8", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                    Indie — $19/mo<br/><span style={{color:th.t3,fontSize:11}}>900 credits/mo</span>
                  </button>
                )}
                {(credits?.tier === "free" || credits?.tier === "indie") && (
                  <button onClick={() => { setOutOfCredits(null); startCheckout("pro"); }}
                    style={{ flex:1, padding:"10px 8px", borderRadius:8, border:"1px solid #a78bfa", background:"rgba(167,139,250,0.08)",
                      color:"#a78bfa", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                    Pro — $49/mo<br/><span style={{color:th.t3,fontSize:11}}>2500 credits/mo</span>
                  </button>
                )}
                <button onClick={() => { setOutOfCredits(null); startCheckout("studio"); }}
                  style={{ flex:1, padding:"10px 8px", borderRadius:8, border:"1px solid #f59e0b", background:"rgba(245,158,11,0.08)",
                    color:"#f59e0b", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                  Studio — $99/mo<br/><span style={{color:th.t3,fontSize:11}}>6000 credits/mo</span>
                </button>
              </div>
            </>
          )}
          <button onClick={() => setOutOfCredits(null)}
            style={{ width:"100%", padding:"10px 0", borderRadius:8, border:`1px solid ${th.b1}`,
              background:"transparent", color:th.t2, cursor:"pointer", fontSize:13 }}>
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* ── ONBOARDING TOUR ─────────────────────────────────────────────────── */}
    {showTour && <TourOverlay onClose={() => setShowTour(false)} />}

    {/* ── VIDEO EDIT FULLSCREEN ────────────────────────────────────────────── */}
    {fullscreenVEId && (() => {
      const veNode = nodes.find(n => n.id === fullscreenVEId);
      const veAudio = nodes.find(x => x.id === veNode?.audioNodeId) || null;
      if (!veNode) { setFullscreenVEId(null); return null; }
      return (
        <div style={{ position:"fixed", inset:0, zIndex:9996, background:"rgba(0,0,0,0.97)", display:"flex", flexDirection:"column" }}
          onKeyDown={e => { if (e.key === "Escape") setFullscreenVEId(null); }} tabIndex={-1}>
          <VideoEditCard
            node={veNode}
            sel={true}
            upd={p => updNode(fullscreenVEId, p)}
            onDel={() => { delNode(fullscreenVEId); setFullscreenVEId(null); }}
            allNodes={nodes}
            audioNode={veAudio}
            onInspect={() => openInspector(fullscreenVEId)}
            onOpenFullscreen={() => setFullscreenVEId(null)}
            isFullscreen={true}
          />
        </div>
      );
    })()}

    {/* ── PRICING PAGE OVERLAY ─────────────────────────────────────────────── */}
    {showPricing && (
      <div style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", overflowY:"auto", padding:"40px 16px" }}>
        <div style={{ background:th.card, border:`1px solid ${th.b1}`, borderRadius:16, padding:40, maxWidth:880, width:"100%" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 }}>
            <div>
              <div style={{ fontSize:24, fontWeight:700, color:th.t0 }}>Upgrade your plan</div>
              <div style={{ fontSize:14, color:th.t2, marginTop:4 }}>Current plan: <strong style={{color:TIER_COLOR[credits?.tier||"free"]}}>{TIER_LABEL[credits?.tier||"free"]}</strong> · {credits?.credits_balance ?? 0} credits remaining</div>
            </div>
            <button onClick={() => setShowPricing(false)}
              style={{ background:"transparent", border:"none", color:th.t2, fontSize:22, cursor:"pointer" }}>✕</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:16 }}>
            {pricingTiers.map(t => {
              const color = TIER_COLOR[t.tier] || "#a78bfa";
              const popular = t.tier === "pro";
              return (
              <div key={t.tier} style={{ border:`2px solid ${credits?.tier===t.tier ? color : th.b1}`, borderRadius:12, padding:20, position:"relative" }}>
                {popular && <div style={{ position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)", background:color, color:"#000", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:20 }}>POPULAR</div>}
                <div style={{ fontSize:13, fontWeight:700, color:color, marginBottom:4 }}>{t.label}</div>
                <div style={{ fontSize:26, fontWeight:800, color:th.t0 }}>{t.priceDisplay}<span style={{fontSize:13,color:th.t3,fontWeight:400}}>/{t.interval === "year" ? "yr" : "mo"}</span></div>
                <div style={{ fontSize:12, color:th.t3, marginBottom:16 }}>{(t.credits || 0).toLocaleString()} credits/mo</div>
                {(t.features || []).map(f => (
                  <div key={f} style={{ fontSize:12, color:th.t1, marginBottom:6 }}>✓ {f}</div>
                ))}
                {credits?.tier === t.tier ? (
                  <div style={{ marginTop:16, fontSize:12, color:color, fontWeight:600, textAlign:"center" }}>Current plan</div>
                ) : t.tier === "free" ? null : (
                  <button onClick={() => { setShowPricing(false); startCheckout(t.tier); }}
                    style={{ marginTop:16, width:"100%", padding:"9px 0", borderRadius:8, border:`1px solid ${color}`,
                      background:`${color}18`, color:color, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                    {credits?.tier === "free" ? "Start free trial" : "Switch plan"}
                  </button>
                )}
              </div>
            )})}
          </div>
          {/* Credit top-ups */}
          <div style={{ marginTop:32, borderTop:`1px solid ${th.b1}`, paddingTop:24 }}>
            <div style={{ fontSize:14, fontWeight:600, color:th.t0, marginBottom:16 }}>Need more credits? Buy a top-up pack</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {pricingTopups.map((pack) => (
                <button key={pack.pack} onClick={() => { setShowPricing(false); startTopup(pack.pack); }}
                  style={{ flex:1, minWidth:140, padding:"12px 16px", borderRadius:10, border:`1px solid ${th.b1}`,
                    background:th.bg, color:th.t0, cursor:"pointer", textAlign:"left" }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{pack.label}</div>
                  <div style={{ fontSize:13, color:"#a78bfa", fontWeight:600 }}>{pack.priceDisplay}</div>
                  <div style={{ fontSize:11, color:th.t3, marginTop:2 }}>{pack.description}</div>
                </button>
              ))}
            </div>
          </div>
          {credits?.tier !== "free" && (
            <div style={{ marginTop:20, textAlign:"center" }}>
              <button onClick={() => { setShowPricing(false); openPortal(); }}
                style={{ background:"transparent", border:"none", color:th.t3, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>
                Manage or cancel subscription
              </button>
            </div>
          )}
        </div>
      </div>
    )}

    {projectPickerOpen && (
      <ProjectPicker
        user={user}
        onOpen={loadProject}
        onNew={() => { const n=prompt("Project name:","Untitled Project"); if(n) newProject(n); }}
        onClose={()=>setProjectPickerOpen(false)}
      />
    )}
    <div style={{ width:"100vw", height:"100vh", display:"flex", flexDirection:"column", background:th.bg, overflow:"hidden", fontFamily:"'Inter',system-ui,-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;} body{margin:0;}
        ::-webkit-scrollbar{width:3px;background:${th.bg};} ::-webkit-scrollbar-thumb{background:${th.b0};}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:.4}50%{opacity:1}}
        input::placeholder,textarea::placeholder{color:${th.t4};}
        option{background:${th.card2};color:${th.t0};}
        input[type=range]{cursor:pointer;height:3px;}
      `}</style>

      {/* TOP BAR */}
      <div style={{ height:50, background:th.card2, borderBottom:`1px solid ${th.b0}`, display:"flex", alignItems:"center", padding:"0 18px", gap:14, flexShrink:0, zIndex:300 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:8,height:8,background:"#f87171",borderRadius:2,boxShadow:"0 0 10px #f87171" }} />
          <span style={{ fontSize:13,letterSpacing:"0.18em",color:th.t0,fontWeight:700 }}>CINEMATIC GRAPH</span>
          <span style={{ fontSize:10,color:th.t4,letterSpacing:"0.1em",marginLeft:4 }}>v2</span>
        </div>
        <div style={{ width:1,height:22,background:th.b0 }} />
        {/* Assets button */}
        <button
          onClick={()=>setSidebarOpen(v=>!v)}
          title="Assets"
          style={{
            display:"flex", alignItems:"center", gap:7,
            background: sidebarOpen ? th.card4 : "transparent",
            border: `1px solid ${sidebarOpen ? th.b1 : "transparent"}`,
            color: sidebarOpen ? th.t0 : th.t2,
            fontFamily:"'Inter',system-ui,sans-serif",
            fontSize:11, letterSpacing:"0.1em", fontWeight:600,
            padding:"5px 12px", borderRadius:5, cursor:"pointer",
            transition:"all 0.15s",
          }}
          onMouseEnter={e=>{ if(!sidebarOpen){ e.currentTarget.style.background=th.card; e.currentTarget.style.color=th.t1; }}}
          onMouseLeave={e=>{ if(!sidebarOpen){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=th.t2; }}}
        >
          <Ico icon={FolderOpen} size={14} color={sidebarOpen?"#f97316":th.t2}/>
          ASSETS
        </button>
        {/* Project controls */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={()=>setProjectPickerOpen(true)}
            title="Open or switch project"
            style={{ display:"flex", alignItems:"center", gap:6, background:th.card, border:`1px solid ${th.b0}`,
              color:th.t1, fontFamily:"'Inter',system-ui,sans-serif", fontSize:11, letterSpacing:"0.08em",
              padding:"5px 12px", borderRadius:5, cursor:"pointer" }}>
            <Ico icon={FolderOpenIcon} size={13} color={th.t2}/>
            {currentProject ? currentProject.name : "Open Project"}
          </button>
          {!currentProject && (
            <button onClick={()=>newProject()}
              style={{ display:"flex", alignItems:"center", gap:6, background:"#f87171", border:"none",
                color:"#fff", fontFamily:"'Inter',system-ui,sans-serif", fontSize:11, fontWeight:700,
                padding:"5px 12px", borderRadius:5, cursor:"pointer" }}>
              + NEW
            </button>
          )}
          {saving && <span style={{ fontSize:10, color:th.t4, letterSpacing:"0.08em" }}>Saving…</span>}
          {!saving && currentProject && <span style={{ fontSize:10, color:th.t4, letterSpacing:"0.08em" }}>Auto-saved</span>}
          {/* Generate All Images */}
          {nodes.some(n=>n.type===T.IMAGE && !n.generatedUrl && n.prompt?.trim()) && (
            <button onClick={()=>batchGenerate()}
              disabled={batchGenerating}
              style={{ display:"flex", alignItems:"center", gap:6, background: batchGenerating ? th.card2 : th.t0,
                border:"none", color:"#fff", fontFamily:"'Inter',system-ui,sans-serif", fontSize:11,
                fontWeight:700, padding:"5px 12px", borderRadius:5, cursor: batchGenerating ? "not-allowed" : "pointer",
                letterSpacing:"0.08em", opacity: batchGenerating ? 0.7 : 1 }}>
              {batchGenerating
                ? <><Ico icon={Loader2} size={12} style={{animation:"spin 0.7s linear infinite"}}/> {batchProgress.done}/{batchProgress.total}</>
                : <><Ico icon={Sparkles} size={12} color="#fff"/> GENERATE ALL IMAGES</>}
            </button>
          )}
          {/* Save as Template */}
          <button onClick={()=>setSaveTemplateOpen(true)}
            title="Save current canvas as a reusable template"
            style={{ display:"flex", alignItems:"center", gap:6, background:"transparent",
              border:`1px solid ${th.b0}`, color:th.t2, fontFamily:"'Inter',system-ui,sans-serif",
              fontSize:11, padding:"5px 12px", borderRadius:5, cursor:"pointer", letterSpacing:"0.08em" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=th.t2;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=th.b0;}}>
            <Ico icon={LayoutTemplate} size={12} color={th.t2}/> SAVE AS TEMPLATE
          </button>
          <button onClick={exportProductionPackage}
            title="Export scenes, shots, bible, and director notes as a production package"
            style={{ display:"flex", alignItems:"center", gap:6, background:"transparent",
              border:`1px solid ${th.b0}`, color:th.t2, fontFamily:"'Inter',system-ui,sans-serif",
              fontSize:11, padding:"5px 12px", borderRadius:5, cursor:"pointer", letterSpacing:"0.08em" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=th.t2;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=th.b0;}}>
            <Ico icon={FileDown} size={12} color={th.t2}/> EXPORT PACKAGE
          </button>
        </div>
        <div style={{ width:1,height:22,background:th.b0 }} />

        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ fontSize:10,color:th.t3,letterSpacing:"0.08em" }}>SHOT MODEL</span>
          <select value={shotModel} onChange={e=>setShotModel(e.target.value)}
            style={{ background:th.card,border:`1px solid ${(SHOT_MODELS.find(m=>m.id===shotModel)||SHOT_MODELS[0]).color}44`,color:(SHOT_MODELS.find(m=>m.id===shotModel)||SHOT_MODELS[0]).color,fontFamily:"'Inter',system-ui,sans-serif",fontSize:11,padding:"5px 10px",borderRadius:4,outline:"none",cursor:"pointer" }}>
            {SHOT_MODELS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <div style={{ width:1,height:22,background:th.b0 }} />
          <span style={{ fontSize:11,color:th.t3 }}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>{setPan({x:40,y:40});setZoom(1);}} style={{ background:th.card,border:`1px solid ${th.b0}`,color:th.t2,fontFamily:"'Inter',system-ui,sans-serif",fontSize:11,padding:"5px 12px",borderRadius:4,cursor:"pointer",letterSpacing:"0.08em" }}>RESET VIEW</button>
          <div style={{ width:1,height:22,background:th.b0 }} />
          {/* Theme toggle */}
          <button onClick={()=>setIsDark(d=>!d)}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ background:th.card, border:`1px solid ${th.b0}`, color:th.t1, fontFamily:"'Inter',system-ui,sans-serif", fontSize:11, padding:"5px 12px", borderRadius:4, cursor:"pointer", letterSpacing:"0.08em", display:"flex", alignItems:"center", gap:6 }}>
            {isDark ? "☀ LIGHT" : "● DARK"}
          </button>
          <div style={{ width:1,height:22,background:th.b0 }} />
          {/* Credits bar */}
          {credits && (() => {
            const tierColors = { free:"#6b7280", indie:"#3b82f6", pro:"#8b5cf6", studio:"#f59e0b" };
            const tierColor = tierColors[credits.tier] || "#6b7280";
            const pct = credits.credits_monthly > 0 ? Math.max(0, Math.min(1, credits.credits_balance / credits.credits_monthly)) : 0;
            const credLow = pct < 0.15;
            return (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {/* Tier badge */}
                <span style={{ fontSize:10, fontWeight:700, color:tierColor, letterSpacing:"0.08em", border:`1px solid ${tierColor}44`, borderRadius:3, padding:"2px 6px", background:`${tierColor}11` }}>
                  {credits.tier.toUpperCase()}
                </span>
                {/* Credit count + bar */}
                <div style={{ display:"flex", flexDirection:"column", gap:2, minWidth:80 }}>
                  <span style={{ fontSize:10, color: credLow ? "#ef4444" : th.t3, fontFamily:"'Inter',system-ui,sans-serif" }}>
                    {credits.credits_balance} / {credits.credits_monthly} cr
                  </span>
                  <div style={{ width:80, height:3, background:th.b0, borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:`${pct*100}%`, height:"100%", background: credLow ? "#ef4444" : tierColor, borderRadius:2, transition:"width 0.3s" }} />
                  </div>
                </div>
                {/* Upgrade / Buy more */}
                {credits.tier === "free" ? (
                  <button onClick={()=>setShowPricing(true)}
                    style={{ background: tierColors.indie, border:"none", color:"#fff", fontFamily:"'Inter',system-ui,sans-serif", fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:4, cursor:"pointer", letterSpacing:"0.07em" }}>
                    UPGRADE
                  </button>
                ) : credLow ? (
                  <button onClick={()=>setShowTopup(true)}
                    style={{ background:"#ef4444", border:"none", color:"#fff", fontFamily:"'Inter',system-ui,sans-serif", fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:4, cursor:"pointer", letterSpacing:"0.07em" }}>
                    BUY MORE
                  </button>
                ) : null}
              </div>
            );
          })()}
          <div style={{ width:1,height:22,background:th.b0 }} />
          {/* User */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:"50%", background:"#f87171", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#fff" }}>{(user.email||"?")[0].toUpperCase()}</span>
            </div>
            <span style={{ fontSize:10, color:th.t3, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</span>
            <button onClick={()=>setShowTour(true)}
              title="Help — replay the tour"
              style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t3, borderRadius:"50%", width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, fontFamily:"'Inter',system-ui,sans-serif" }}>
              ?
            </button>
            <button onClick={()=>supabase.auth.signOut()}
              title="Log out"
              style={{ background:"transparent", border:`1px solid ${th.b0}`, color:th.t3, borderRadius:5, padding:"5px 9px", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:11, fontFamily:"'Inter',system-ui,sans-serif" }}>
              <Ico icon={LogOut} size={12} color={th.t3}/> LOG OUT
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex:1,display:"flex",overflow:"hidden",position:"relative" }}>

        {/* LEFT DRAWER */}
        <LeftDrawer open={sidebarOpen} onToggle={()=>setSidebarOpen(v=>!v)}
          bible={bible}/>

        {/* CANVAS */}
        <div ref={cvRef} onClick={onCanvasClick} onMouseDown={onCanvasMD} style={{ flex:1, position:"relative", overflow:"hidden",
          cursor:"default",
          background: th.bg,
          backgroundImage: th.dark
            ? `radial-gradient(circle,${th.b0} 1px,transparent 1px)`
            : `radial-gradient(circle,rgba(0,0,0,0.06) 1px,transparent 1px)`,
          backgroundSize:`${24*zoom}px ${24*zoom}px`,
          backgroundPosition:`${pan.x%(24*zoom)}px ${pan.y%(24*zoom)}px`
        }}>

          {/* Transform container */}
          <div style={{ position:"absolute",top:0,left:0,transformOrigin:"0 0",transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,width:0,height:0 }}>
            {/* Edges */}
            <svg style={{ position:"absolute",top:0,left:0,overflow:"visible",pointerEvents:"none",zIndex:1 }}>
              {edges.map(e=><Edge key={e.id} fx={e.fx} fy={e.fy} tx={e.tx} ty={e.ty} color={e.color} />)}
              {/* Live wire being dragged */}
              {wire && (() => {
                const mx = wire.fromX+(wire.toX-wire.fromX)*0.5;
                return <path d={`M${wire.fromX},${wire.fromY} C${mx},${wire.fromY} ${mx},${wire.toY} ${wire.toX},${wire.toY}`}
                  stroke="#38bdf8" strokeWidth="2" fill="none" strokeDasharray="6 3" opacity="0.8"
                  style={{ filter:"drop-shadow(0 0 4px #38bdf8)" }} />;
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map(n=>{
              const p=pos[n.id]||{x:80,y:80};
              const z=zMap[n.id]||10;
              return (
                <Drag key={n.id} id={n.id} x={p.x} y={p.y} onMove={moveNode} z={z} zoom={zoom} onFocus={()=>{setSelId(n.id);front(n.id);}}>
                  {renderNodeCard(n)}
                </Drag>
              );
            })}

            {/* Empty hint */}
            {nodes.length===0&&(
              <div style={{ position:"absolute",left:0,top:0,transform:`translate(${(cvRef.current?.offsetWidth||800)/2/zoom-160}px,${(cvRef.current?.offsetHeight||600)/2/zoom-60}px)`,pointerEvents:"none",textAlign:"center",width:320 }}>
                <div style={{ opacity:0.07,marginBottom:10 }}><Ico icon={Clapperboard} size={36} color={th.t0}/></div>
                <div style={{ fontSize:12,color:th.t4,letterSpacing:"0.12em",lineHeight:2.2 }}>
                  CLICK A NODE IN THE FLOATING TOOLBAR<br/>TO ADD NODES TO THE CANVAS
                </div>
              </div>
            )}
          </div>
        </div>

        {inspectNode && (
          <div style={{
            position:"absolute",
            top:0,
            right:0,
            width:560,
            height:"100%",
            background:th.card,
            borderLeft:`1px solid ${th.b0}`,
            boxShadow:`-16px 0 40px ${th.sh}`,
            zIndex:260,
            display:"flex",
            flexDirection:"column",
          }}>
            <div style={{
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              padding:"14px 16px",
              borderBottom:`1px solid ${th.b0}`,
              background:th.card2,
            }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.16em", color:th.t3, fontFamily:"'Inter',system-ui,sans-serif" }}>NODE INSPECTOR</div>
                <div style={{ fontSize:12, color:th.t1, fontWeight:700, marginTop:4, fontFamily:"'Inter',system-ui,sans-serif" }}>
                  {(inspectNode.type || "node").toUpperCase()} {inspectNode.index ? `#${inspectNode.index}` : ""}
                </div>
              </div>
              <button
                onClick={()=>setInspectId(null)}
                style={{
                  background:"transparent",
                  border:`1px solid ${th.b0}`,
                  color:th.t2,
                  cursor:"pointer",
                  borderRadius:6,
                  padding:"6px 10px",
                  fontSize:10,
                  letterSpacing:"0.1em",
                  fontFamily:"'Inter',system-ui,sans-serif",
                }}
              >
                CLOSE
              </button>
            </div>
            <div style={{ flex:1, overflow:"auto", padding:"18px 18px 40px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {inspectorStatus && (
                  <div style={{ fontSize:11, color:th.t2, letterSpacing:"0.08em", padding:"10px 12px", border:`1px solid ${th.b0}`, borderRadius:10, background:th.card2 }}>
                    {inspectorStatus}
                  </div>
                )}
                {renderInspectorContent(inspectNode)}
              </div>
            </div>
          </div>
        )}

        {/* FLOATING NODE TOOLBAR */}
        <div style={{ position:"absolute", bottom:28, left:"50%", transform:"translateX(-50%)", zIndex:200, display:"flex", flexDirection:"column", alignItems:"center", gap:6, pointerEvents:"none" }}>
          {/* Stats micro-pill */}
          <div style={{ display:"flex",gap:16,background:th.card,border:`1px solid ${th.b0}`,borderRadius:20,padding:"5px 18px",boxShadow:`0 2px 16px ${th.sh}`,pointerEvents:"auto" }}>
            {[`${nodes.filter(n=>n.type===T.SCENE).length} SCENES`,`${shotCount} SHOTS`,`${totalDur}s`,`${nodes.filter(n=>n.type===T.IMAGE).length} IMG`].map((t,i)=>(
              <span key={i} style={{ fontSize:10,color:th.t3,letterSpacing:"0.1em",fontFamily:"'Inter',system-ui,sans-serif" }}>{t}</span>
            ))}
          </div>
          {/* Main capsule toolbar */}
          <div style={{ display:"flex",alignItems:"center",gap:2,background:th.card,border:`1px solid ${th.b0}`,borderRadius:40,padding:"8px 16px",boxShadow:`0 8px 40px rgba(0,0,0,0.22),0 2px 10px rgba(0,0,0,0.10)`,pointerEvents:"auto" }}>
            {/* Bible / Elements icon — before Scene */}
            <button
              onClick={()=>setBibleOpen(v=>!v)}
              title="World Bible — Characters, Objects, Locations"
              style={{ display:"flex",alignItems:"center",justifyContent:"center",width:46,height:46,
                background: bibleOpen ? th.b1 : "transparent",
                border: bibleOpen ? `1px solid ${th.b0}` : "1px solid transparent",
                borderRadius:14,cursor:"pointer",outline:"none",
                transition:"background 0.15s, border-color 0.15s, transform 0.12s",padding:0 }}
              onMouseEnter={e=>{e.currentTarget.style.background=th.b1;e.currentTarget.style.borderColor=th.b0;e.currentTarget.style.transform="scale(1.08)";}}
              onMouseLeave={e=>{if(!bibleOpen){e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}e.currentTarget.style.transform="scale(1)";}}
            >
              <Ico icon={BookOpen} size={26} color={th.t0} sw={1.4}/>
            </button>
            {/* Templates button */}
            <button
              onClick={()=>setTemplatePickerOpen(v=>!v)}
              title="Start from a template"
              style={{ display:"flex",alignItems:"center",justifyContent:"center",width:46,height:46,
                background: templatePickerOpen ? th.b1 : "transparent",
                border: templatePickerOpen ? `1px solid ${th.b0}` : "1px solid transparent",
                borderRadius:14,cursor:"pointer",outline:"none",
                transition:"background 0.15s, border-color 0.15s, transform 0.12s",padding:0 }}
              onMouseEnter={e=>{e.currentTarget.style.background=th.b1;e.currentTarget.style.borderColor=th.b0;e.currentTarget.style.transform="scale(1.08)";}}
              onMouseLeave={e=>{if(!templatePickerOpen){e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}e.currentTarget.style.transform="scale(1)";}}
            >
              <Ico icon={LayoutTemplate} size={26} color={th.t0} sw={1.4}/>
            </button>
            <div style={{ width:1,height:26,background:th.b0,margin:"0 10px" }}/>

            {TOOLS.map((t,i)=>(
              <div key={t.type} style={{ display:"flex",alignItems:"center" }}>
                {i===1&&<div style={{ width:1,height:26,background:th.b0,margin:"0 10px" }} />}
                {i===4&&<div style={{ width:1,height:26,background:th.b0,margin:"0 10px" }} />}
                {i===6&&<div style={{ width:1,height:26,background:th.b0,margin:"0 10px" }} />}
                <button
                  onClick={()=>spawnNode(t.type)}
                  title={`${t.label} — ${t.desc}`}
                  style={{ display:"flex",alignItems:"center",justifyContent:"center",width:46,height:46,background:"transparent",border:"1px solid transparent",borderRadius:14,cursor:"pointer",outline:"none",transition:"background 0.15s, border-color 0.15s, transform 0.12s",padding:0 }}
                  onMouseEnter={e=>{e.currentTarget.style.background=th.b1;e.currentTarget.style.borderColor=th.b0;e.currentTarget.style.transform="scale(1.08)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";e.currentTarget.style.transform="scale(1)";}}
                >
                  {t.brandText
                    ? <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.04em", color:t.color, fontFamily:"'Inter',system-ui,sans-serif", lineHeight:1 }}>{t.brandText}</span>
                    : <Ico icon={t.icon} size={26} color={th.t0} sw={1.4}/>
                  }
                </button>
              </div>
            ))}
          </div>
          {/* Hint */}
          <span style={{ fontSize:10,color:th.t4,letterSpacing:"0.06em",fontFamily:"'Inter',system-ui,sans-serif",opacity:0.7,pointerEvents:"none" }}>ALT+DRAG · scroll to zoom · middle-click to pan</span>
        </div>

        {/* TEMPLATE PICKER */}
        {templatePickerOpen && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={()=>setTemplatePickerOpen(false)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:th.card, border:`1px solid ${th.b0}`, borderRadius:16, padding:28, width:520, maxWidth:"90vw", maxHeight:"80vh", overflowY:"auto", boxShadow:`0 24px 80px rgba(0,0,0,0.4)`, fontFamily:"'Inter',system-ui,sans-serif" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:th.t0, letterSpacing:"0.12em" }}>TEMPLATES</div>
                  <div style={{ fontSize:10, color:th.t3, marginTop:3 }}>Start from a complete pre-built project. You can edit everything.</div>
                </div>
                <button onClick={()=>setTemplatePickerOpen(false)} style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer", padding:4 }}>
                  <Ico icon={X} size={16} color={th.t3}/>
                </button>
              </div>
              {/* Built-in templates */}
              <div style={{ fontSize:9, color:th.t4, letterSpacing:"0.14em", marginBottom:8 }}>BUILT-IN</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                {TEMPLATES.map(t=>(
                  <div key={t.id}
                    style={{ border:`1px solid ${th.b0}`, borderRadius:10, padding:"14px 16px", cursor:"pointer", transition:"all 0.15s", background:th.card2 }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=th.t2; e.currentTarget.style.background=th.card3; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=th.b0;  e.currentTarget.style.background=th.card2; }}
                    onClick={()=>loadTemplate(t)}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <span style={{ fontSize:20 }}>{t.emoji}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:th.t0, letterSpacing:"0.08em" }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize:10, color:th.t3, lineHeight:1.6 }}>{t.description}</div>
                    <div style={{ marginTop:10, display:"flex", gap:6, flexWrap:"wrap" }}>
                      {(t.tags||[]).map(tag=>(
                        <span key={tag} style={{ fontSize:8, color:th.t2, border:`1px solid ${th.b0}`, borderRadius:20, padding:"2px 8px", letterSpacing:"0.08em" }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* User templates */}
              {userTemplates.length > 0 && (
                <>
                  <div style={{ fontSize:9, color:th.t4, letterSpacing:"0.14em", marginBottom:8 }}>MY TEMPLATES</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                    {userTemplates.map(t=>(
                      <div key={t.id}
                        style={{ border:`1px solid ${th.b0}`, borderRadius:10, padding:"14px 16px", cursor:"pointer", transition:"all 0.15s", background:th.card2 }}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor="#a855f7"; e.currentTarget.style.background=th.card3; }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor=th.b0; e.currentTarget.style.background=th.card2; }}
                        onClick={()=>loadTemplate(t)}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                          <span style={{ fontSize:20 }}>{t.emoji}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:th.t0, letterSpacing:"0.08em" }}>{t.label}</span>
                          <span style={{ marginLeft:"auto", fontSize:8, color:"#a855f7", border:"1px solid #a855f744", borderRadius:10, padding:"2px 7px" }}>MINE</span>
                        </div>
                        {t.description && <div style={{ fontSize:10, color:th.t3, lineHeight:1.6 }}>{t.description}</div>}
                        <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                          {(t.tags||[]).map(tag=>(
                            <span key={tag} style={{ fontSize:8, color:"#a855f7", border:`1px solid ${th.b0}`, borderRadius:20, padding:"2px 8px", letterSpacing:"0.08em" }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ fontSize:9, color:th.t4, textAlign:"center", lineHeight:1.6 }}>
                Loading a template replaces the current canvas. Save your work first.
              </div>
            </div>
          </div>
        )}

        {/* SAVE AS TEMPLATE DIALOG */}
        {saveTemplateOpen && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={()=>setSaveTemplateOpen(false)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:th.card, border:`1px solid ${th.b0}`, borderRadius:16, padding:28, width:420, maxWidth:"90vw", boxShadow:`0 24px 80px rgba(0,0,0,0.4)`, fontFamily:"'Inter',system-ui,sans-serif" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:th.t0, letterSpacing:"0.12em" }}>SAVE AS TEMPLATE</div>
                <button onClick={()=>setSaveTemplateOpen(false)} style={{ background:"transparent", border:"none", color:th.t3, cursor:"pointer" }}>
                  <Ico icon={X} size={16} color={th.t3}/>
                </button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <label style={{ fontSize:9, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:5 }}>EMOJI</label>
                  <input value={templateSaveEmoji} onChange={e=>setTemplateSaveEmoji(e.target.value)}
                    style={{ width:56, background:th.card2, border:`1px solid ${th.b0}`, borderRadius:6, color:th.t0, fontSize:20, padding:"6px 10px", outline:"none", textAlign:"center" }}/>
                </div>
                <div>
                  <label style={{ fontSize:9, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:5 }}>TEMPLATE NAME *</label>
                  <input value={templateSaveName} onChange={e=>setTemplateSaveName(e.target.value)}
                    placeholder="e.g. Hip Hop Campaign v2"
                    style={{ width:"100%", boxSizing:"border-box", background:th.card2, border:`1px solid ${th.b0}`, borderRadius:6, color:th.t0, fontSize:12, padding:"8px 10px", outline:"none", fontFamily:"'Inter',system-ui,sans-serif" }}/>
                </div>
                <div>
                  <label style={{ fontSize:9, color:th.t3, letterSpacing:"0.12em", display:"block", marginBottom:5 }}>DESCRIPTION</label>
                  <textarea value={templateSaveDesc} onChange={e=>setTemplateSaveDesc(e.target.value)}
                    placeholder="What is this template for?"
                    rows={3}
                    style={{ width:"100%", boxSizing:"border-box", background:th.card2, border:`1px solid ${th.b0}`, borderRadius:6, color:th.t0, fontSize:11, padding:"8px 10px", outline:"none", resize:"none", fontFamily:"'Inter',system-ui,sans-serif", lineHeight:1.6 }}/>
                </div>
                <div style={{ fontSize:9, color:th.t4, lineHeight:1.6 }}>
                  Saves the current canvas ({nodes.length} nodes) including all generated images. Load it any time from the Templates picker under MY TEMPLATES.
                </div>
                <button onClick={saveAsTemplate} disabled={!templateSaveName.trim()}
                  style={{ background: templateSaveName.trim() ? th.t0 : th.card2, border:"none", borderRadius:8, color:"#fff",
                    fontFamily:"'Inter',system-ui,sans-serif", fontWeight:700, fontSize:12, padding:"11px",
                    cursor: templateSaveName.trim() ? "pointer" : "not-allowed", letterSpacing:"0.1em",
                    opacity: templateSaveName.trim() ? 1 : 0.4 }}>
                  SAVE TEMPLATE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BIBLE POPUP */}
        {bibleOpen && (
          <BiblePopup bible={bible} setBible={setBible} onClose={()=>setBibleOpen(false)}/>
        )}
      </div>
    </div>
    </ThemeCtx.Provider>
  );
}
