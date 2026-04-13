import { useEffect, useState } from "react";

const ACCENT = "#DC2626";
const DARK = "#0D0D0D";
const MID = "#374151";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const SURFACE = "#F9FAFB";
const WHITE = "#FFFFFF";

const PAGES = {
  "kling-video-generation": {
    navLabel: "Kling Video",
    tag: "KLING VIDEO GENERATION",
    title: "Kling video generation, directed shot by shot.",
    description:
      "Use Cartasis to plan shots, compile prompts, inject world bible references, and generate Kling video clips from one connected canvas. Build scripted video with real shot language instead of loose prompts.",
    heroCta: "Open the canvas",
    heroMedia: { type: "video", src: "/generate_video_video.mp4", alt: "Cartasis Kling video generation workflow" },
    highlight: [
      "Plan every shot before generation",
      "Use world bible references for continuity",
      "Run Kling from scene, shot, or image context",
    ],
    sections: [
      {
        id: "workflow",
        tag: "WHY IT WORKS",
        title: "A Kling workflow built for directors, not prompt guesswork.",
        body:
          "Cartasis turns script structure into production structure. Scenes lead to shots. Shots carry camera size, angle, movement, lighting, dialogue, visual style, and director notes. When you run a Kling node, that information becomes a tighter generation brief than a raw text box.",
        items: [
          { title: "Script to shot pipeline", desc: "Break a scene into shots first, then send the right moment to Kling instead of prompting a whole sequence blindly." },
          { title: "Prompt compilation", desc: "Shot metadata, scene text, visual style, and bible entities are compiled into a generation-ready prompt automatically." },
          { title: "Reference-aware generation", desc: "Characters, objects, and locations from the world bible can travel into Kling generation without rebuilding context each time." },
        ],
        media: { type: "image", src: "/node_scene_shots_system.png", alt: "Cartasis scene and shot graph for Kling generation" },
      },
      {
        id: "multi-shot",
        tag: "MULTI SHOT",
        title: "Use Kling for single clips or chained shot sequences.",
        body:
          "Cartasis supports both focused shot generation and longer multi-shot sequences. That makes it easier to move from storyboard beats to motion tests, proof-of-concept scenes, and client-facing edits without leaving the same workflow.",
        items: [
          { title: "Single-shot control", desc: "Generate one clip from a directed shot prompt when you need precision and faster iteration." },
          { title: "Multi-shot planning", desc: "Group approved shots into a sequence and keep the visual language aligned across the whole beat." },
          { title: "Review and regenerate", desc: "Adjust the underlying scene or shot instead of rewriting from scratch every time a clip misses." },
        ],
        media: { type: "image", src: "/generate_multi_shot_video.png", alt: "Cartasis multi-shot workflow for Kling video generation" },
      },
      {
        id: "use-cases",
        tag: "USE CASES",
        title: "Good fit for image-to-video, pitch scenes, branded spots, and proof-of-concept film beats.",
        body:
          "Because Cartasis keeps script, shot, refs, and clips in the same graph, Kling becomes easier to use for repeatable production work instead of one-off prompt experiments.",
        items: [
          { title: "Storyboard to motion", desc: "Approve a still, then animate it with a Kling node attached to the same shot." },
          { title: "Brand and campaign work", desc: "Keep product props, locations, and talent references attached to scenes as you generate multiple variants." },
          { title: "Narrative development", desc: "Use shot planning plus Kling generation to test pacing, blocking, and transitions before full production." },
        ],
        media: { type: "video", src: "/action_movie_clip.mp4", alt: "Generated action clip created through the Cartasis Kling workflow" },
      },
    ],
    faq: [
      {
        q: "What makes Cartasis different from prompting Kling directly?",
        a: "Cartasis wraps Kling in a production workflow. Instead of starting from a blank prompt, you can build from script, scene, shot, bible, image references, and director notes.",
      },
      {
        q: "Can I use Kling for image-to-video inside Cartasis?",
        a: "Yes. Kling can be driven from a shot alone or from image-linked context, depending on how your scene graph is wired.",
      },
      {
        q: "Does Cartasis help keep Kling clips consistent?",
        a: "Yes. The world bible, shot metadata, and reusable references reduce drift across clips and scenes.",
      },
    ],
  },
  "kling-3-0": {
    navLabel: "Kling 3.0",
    tag: "KLING 3.0",
    title: "How Cartasis uses Kling 3.0 for guided video generation.",
    description:
      "Cartasis lets you use Kling 3.0 inside a scene-to-shot workflow. Define the story beat, direct the camera, attach references, and generate motion from a production-ready canvas instead of a blank prompt.",
    heroCta: "See Kling workflow",
    heroMedia: { type: "image", src: "/generate_multi_shot_video.png", alt: "Cartasis Kling 3.0 multi-shot planning" },
    highlight: [
      "Kling 3.0 in a node-based workflow",
      "Scene and shot context stays attached",
      "Built for repeatable video generation",
    ],
    sections: [
      {
        id: "inside-cartasis",
        tag: "INSIDE CARTASIS",
        title: "Kling 3.0 is stronger when the scene is already structured.",
        body:
          "In Cartasis, Kling 3.0 is not treated as an isolated prompt box. It sits next to your story graph. That means the model can be fed with cleaner intent from scenes, shots, visual style, and world bible references before generation begins.",
        items: [
          { title: "Scene context", desc: "Each scene carries the narrative brief, entities, dialogue, and cinematic intent that surround the shot." },
          { title: "Shot direction", desc: "Each shot adds camera grammar such as size, angle, movement, duration, and director notes." },
          { title: "Visual continuity", desc: "Character, object, and location references can be reused across multiple Kling generations." },
        ],
        media: { type: "video", src: "/generate_shots_video.mp4", alt: "Scene to shot planning before Kling 3.0 generation" },
      },
      {
        id: "benefits",
        tag: "WHY THIS HELPS",
        title: "Better for continuity, approvals, and iterative direction.",
        body:
          "The production graph matters because video generation is rarely a one-prompt problem. Most teams need to regenerate, compare, annotate, and chain clips while keeping the underlying story coherent.",
        items: [
          { title: "Approval-friendly", desc: "Review a scene, a shot, and the resulting clip in one place instead of passing context across multiple tools." },
          { title: "Regenerate with context", desc: "When a clip misses, adjust the shot or scene inputs and rerun with cleaner intent." },
          { title: "Prepare for edit", desc: "Generated clips remain connected to the story structure that produced them, making editorial handoff easier." },
        ],
        media: { type: "video", src: "/generate_video_video.mp4", alt: "Kling 3.0 clip generation in Cartasis" },
      },
      {
        id: "when-to-use",
        tag: "WHEN TO USE IT",
        title: "Best for production teams that want more control around Kling 3.0.",
        body:
          "If you need repeatable shot generation, scene continuity, and clearer collaboration around prompt decisions, Cartasis adds the production layer that raw video generation tools usually lack.",
        items: [
          { title: "Creative teams", desc: "Keep briefs, approvals, and versions in one shared canvas." },
          { title: "Directors and previs artists", desc: "Move from story idea to shot logic before committing to generation." },
          { title: "Agencies and client work", desc: "Show the reasoning behind each generated clip, not just the output." },
        ],
        media: { type: "image", src: "/seven_nodes_types_image.png", alt: "Cartasis node system supporting Kling 3.0 workflows" },
      },
    ],
    faq: [
      {
        q: "Is this page about Kling alone or Kling inside Cartasis?",
        a: "It is about how Cartasis uses Kling 3.0 inside a broader cinematic workflow.",
      },
      {
        q: "Why not just prompt Kling directly?",
        a: "Direct prompting is fine for isolated tests. Cartasis is meant for story structure, repeatability, and clip-to-scene organization.",
      },
      {
        q: "Can I combine Kling with other generators in Cartasis?",
        a: "Yes. Cartasis is built to let Kling sit alongside other nodes in the same graph, including image, edit, and alternate video generation nodes.",
      },
    ],
  },
  "kling-lipsync": {
    navLabel: "Kling Lipsync",
    tag: "KLING LIPSYNC",
    title: "Kling lipsync for dialogue-driven shots inside Cartasis.",
    description:
      "Use Cartasis to plan dialogue shots, split speaking turns, validate timing, and run Kling lipsync in the same scene graph you use for script, camera, and video generation.",
    heroCta: "Open dialogue workflow",
    heroMedia: { type: "video", src: "/trap_video_clip.mp4", alt: "Dialogue-driven generated shot in Cartasis" },
    highlight: [
      "Dialogue lives in the shot, not in a separate doc",
      "Speaker turns stay tied to the scene graph",
      "Prechecks help avoid wasted lipsync requests",
    ],
    sections: [
      {
        id: "dialogue-flow",
        tag: "DIALOGUE FLOW",
        title: "Keep dialogue, shot timing, and lipsync in the same production context.",
        body:
          "Cartasis stores dialogue inside the shot workflow, so a speaking beat is already tied to its scene, camera plan, and character references before lipsync runs. That makes it easier to reason about which shot should speak, for how long, and with which speaker turn.",
        items: [
          { title: "Speaker turns", desc: "Dialogue is split into speaker-level turns so the system can reason about each speaking beat instead of flattening the whole scene." },
          { title: "Shot-level timing", desc: "Dialogue belongs to the shot, which makes timing constraints visible before you spend credits on lipsync." },
          { title: "Character-aware flow", desc: "Character references from the world bible stay close to the same shots that need speaking performance." },
        ],
        media: { type: "video", src: "/generate_script_video.mp4", alt: "Dialogue and shot planning in Cartasis" },
      },
      {
        id: "validation",
        tag: "PRECHECKS",
        title: "Prechecks help catch invalid lipsync cases before they become wasted runs.",
        body:
          "Cartasis can stop known-bad advanced lipsync attempts when the returned audio or shot timing fails the documented limits. That keeps the lipsync flow more honest and reduces waste on impossible requests.",
        items: [
          { title: "Short audio detection", desc: "Very short returned audio can be caught before advanced lipsync is submitted." },
          { title: "Per-segment logic", desc: "Dialogue is handled per speaking segment rather than one giant speaker blob for the whole scene." },
          { title: "Fallback awareness", desc: "When advanced lipsync is not valid, the system can surface the reason instead of hiding it behind a vague failure." },
        ],
        media: { type: "image", src: "/node_scene_shots_system.png", alt: "Cartasis node graph used for Kling lipsync planning" },
      },
      {
        id: "why-cartasis",
        tag: "WHY CARTASIS",
        title: "Useful when lipsync has to stay attached to the rest of the scene.",
        body:
          "Lipsync gets much easier to manage when the shot, dialogue, references, and resulting video all live together. Cartasis keeps those pieces close so you can iterate without losing the context that created the result.",
        items: [
          { title: "Scene continuity", desc: "A speaking beat is not detached from the rest of the edit or story graph." },
          { title: "Better debugging", desc: "Timing, dialogue, shot duration, and generation state are easier to inspect in one canvas." },
          { title: "Production-ready handoff", desc: "The clip, scene, and dialogue history stay tied together for later review." },
        ],
        media: { type: "video", src: "/action_movie_clip.mp4", alt: "Generated cinematic clip representing Kling lipsync workflow" },
      },
    ],
    faq: [
      {
        q: "Does Cartasis replace Kling lipsync?",
        a: "No. Cartasis provides the workflow around Kling lipsync so dialogue, shot planning, and validation live in one place.",
      },
      {
        q: "Why does Cartasis matter for lipsync?",
        a: "Because dialogue timing, shot duration, and character context all affect whether a lipsync attempt makes sense.",
      },
      {
        q: "Can I use Kling lipsync without a full scene graph?",
        a: "Yes, but Cartasis is most useful when you want lipsync connected to scene planning, shot direction, and edit context.",
      },
    ],
  },
};

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { scroll-behavior: smooth; }
    body { font-family: 'Inter', system-ui, sans-serif; background: ${WHITE}; color: ${DARK}; }
    a { text-decoration: none; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .kp-inner { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
    .kp-nav-links { display: flex; align-items: center; gap: 28px; }
    .kp-grid-2 { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: center; }
    .kp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
    .kp-fade { animation: fadeUp 0.55s ease both; }
    @media (max-width: 900px) {
      .kp-grid-2, .kp-grid-3 { grid-template-columns: 1fr !important; }
      .kp-nav-links { display: none; }
    }
  `}</style>
);

function Media({ media, title }) {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${BORDER}`, background: WHITE, boxShadow: "0 24px 64px rgba(0,0,0,0.08)" }}>
      {media.type === "video" ? (
        <video src={media.src} autoPlay muted loop playsInline style={{ width: "100%", display: "block" }} />
      ) : (
        <img src={media.src} alt={media.alt || title} style={{ width: "100%", display: "block" }} />
      )}
    </div>
  );
}

export default function KlingPage({ pageKey, onAuth }) {
  const [scrolled, setScrolled] = useState(false);
  const page = PAGES[pageKey] || PAGES["kling-video-generation"];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "Inter,system-ui,sans-serif", color: DARK, background: WHITE }}>
      <GlobalStyle />

      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.92)" : WHITE,
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: `1px solid ${scrolled ? BORDER : "transparent"}`,
        transition: "all 0.2s"
      }}>
        <div className="kp-inner" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 9, height: 9, background: ACCENT, borderRadius: 2 }} />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", color: DARK }}>CINEMATIC GRAPH</span>
          </a>
          <nav className="kp-nav-links">
            <a href="/kling-video-generation" style={{ fontSize: 13, fontWeight: 600, color: pageKey === "kling-video-generation" ? DARK : MID }}>Kling Video</a>
            <a href="/kling-3-0" style={{ fontSize: 13, fontWeight: 600, color: pageKey === "kling-3-0" ? DARK : MID }}>Kling 3.0</a>
            <a href="/kling-lipsync" style={{ fontSize: 13, fontWeight: 600, color: pageKey === "kling-lipsync" ? DARK : MID }}>Kling Lipsync</a>
            <a href="/features" style={{ fontSize: 13, fontWeight: 500, color: MID }}>Features</a>
            <a href="/pricing" style={{ fontSize: 13, fontWeight: 500, color: MID }}>Pricing</a>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onAuth} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: MID, cursor: "pointer", fontFamily: "inherit" }}>Log in</button>
            <button onClick={onAuth} style={{ background: DARK, border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, color: WHITE, cursor: "pointer", fontFamily: "inherit" }}>Get started free</button>
          </div>
        </div>
      </header>

      <section style={{ background: DARK, padding: "96px 0 84px" }}>
        <div className="kp-inner kp-grid-2">
          <div className="kp-fade">
            <div style={{ marginBottom: 18 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700,
                color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 100, padding: "5px 16px"
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                {page.tag}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(38px,5vw,64px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", color: WHITE, marginBottom: 20 }}>
              {page.title}
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.78)", lineHeight: 1.75, maxWidth: 620, marginBottom: 28 }}>
              {page.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
              {page.highlight.map((item) => (
                <span key={item} style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: WHITE,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 999, padding: "9px 14px"
                }}>
                  {item}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={onAuth} style={{ background: WHITE, border: "none", borderRadius: 10, padding: "14px 26px", fontSize: 15, fontWeight: 800, color: DARK, cursor: "pointer", fontFamily: "inherit" }}>
                {page.heroCta} {"->"}
              </button>
              <a href="/features" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "14px 26px", fontSize: 15, fontWeight: 600, color: WHITE }}>
                Explore features
              </a>
            </div>
          </div>
          <div className="kp-fade" style={{ animationDelay: "0.06s" }}>
            <Media media={page.heroMedia} title={page.title} />
          </div>
        </div>
      </section>

      {page.sections.map((section, idx) => (
        <section key={section.id} id={section.id} style={{ background: idx % 2 ? SURFACE : WHITE, padding: "88px 0" }}>
          <div className="kp-inner kp-grid-2">
            <div style={{ order: idx % 2 ? 2 : 1 }}>
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: ACCENT, background: `${ACCENT}12`, border: `1px solid ${ACCENT}28`, borderRadius: 999, padding: "5px 12px" }}>
                  {section.tag}
                </span>
              </div>
              <h2 style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.025em", marginBottom: 16 }}>
                {section.title}
              </h2>
              <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.78, marginBottom: 28 }}>
                {section.body}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {section.items.map((item) => (
                  <div key={item.title} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 5 }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.65 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ order: idx % 2 ? 1 : 2 }}>
              <Media media={section.media} title={section.title} />
            </div>
          </div>
        </section>
      ))}

      <section style={{ background: WHITE, padding: "84px 0" }}>
        <div className="kp-inner">
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: ACCENT, background: `${ACCENT}12`, border: `1px solid ${ACCENT}28`, borderRadius: 999, padding: "5px 12px" }}>
              RELATED KLING PAGES
            </span>
          </div>
          <div className="kp-grid-3">
            {[
              { href: "/kling-video-generation", label: "Kling video generation", desc: "How Cartasis structures Kling generation around scenes, shots, and references." },
              { href: "/kling-3-0", label: "Kling 3.0", desc: "How Kling 3.0 fits inside the Cartasis production workflow." },
              { href: "/kling-lipsync", label: "Kling lipsync", desc: "How dialogue, timing, and lipsync live inside the same scene graph." },
            ].map((link) => (
              <a key={link.href} href={link.href} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "22px 20px", display: "block" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 8 }}>{link.label}</div>
                <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.65 }}>{link.desc}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: SURFACE, padding: "88px 0" }}>
        <div className="kp-inner">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: ACCENT, background: `${ACCENT}12`, border: `1px solid ${ACCENT}28`, borderRadius: 999, padding: "5px 12px" }}>
              FAQ
            </span>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.025em", marginTop: 16 }}>
              Common questions about {page.navLabel.toLowerCase()} in Cartasis.
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 860, margin: "0 auto" }}>
            {page.faq.map((item) => (
              <div key={item.q} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 8 }}>{item.q}</div>
                <div style={{ fontSize: 15, color: MUTED, lineHeight: 1.7 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: DARK, padding: "86px 0" }}>
        <div className="kp-inner" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(30px,4.5vw,52px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.03em", color: WHITE, marginBottom: 18 }}>
            Build Kling shots inside a full cinematic workflow.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, maxWidth: 680, margin: "0 auto 28px" }}>
            Use script, scene, shot, references, video, and edit context together instead of treating generation like isolated prompt experiments.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onAuth} style={{ background: WHITE, border: "none", borderRadius: 10, padding: "14px 26px", fontSize: 15, fontWeight: 800, color: DARK, cursor: "pointer", fontFamily: "inherit" }}>
              Start for free
            </button>
            <a href="/pricing" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "14px 26px", fontSize: 15, fontWeight: 600, color: WHITE }}>
              See pricing
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
