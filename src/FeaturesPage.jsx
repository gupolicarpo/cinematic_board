import { useState, useEffect } from "react";

const ACCENT  = "#DC2626";
const DARK    = "#0D0D0D";
const MID     = "#374151";
const MUTED   = "#6B7280";
const BORDER  = "#E5E7EB";
const SURFACE = "#F9FAFB";
const WHITE   = "#FFFFFF";

const FEATURES = [
  {
    id: "nodes",
    tag: "NODE SYSTEM",
    title: "Everything is a node.",
    subtitle: "Build your world as a visual graph — not a document.",
    description:
      "Scenes, shots, characters, locations, objects, scripts, and video clips all live as nodes on a canvas. Connect them however your story demands. No folders. No hierarchy. Just relationships.",
    items: [
      { icon: "🎬", label: "Scene nodes", desc: "Each scene carries its own shots, tone, bible, and AI context." },
      { icon: "📷", label: "Shot nodes", desc: "Camera size, angle, movement, lens, and lighting — all in one node." },
      { icon: "🧑", label: "Character nodes", desc: "Tag characters anywhere and maintain visual consistency automatically." },
      { icon: "📍", label: "Location nodes", desc: "Define your world once, reference it everywhere." },
      { icon: "📦", label: "Object nodes", desc: "Props and objects that travel with your characters across shots." },
      { icon: "✂️", label: "Clip nodes", desc: "Attach generated video directly to any scene or shot node." },
    ],
    dark: true,
    img: "node_scene_shots_system.png",
  },
  {
    id: "script",
    tag: "SCRIPT → SHOTS",
    title: "Write a scene. Get a shot list.",
    subtitle: "AI reads your script and recommends the full camera breakdown.",
    description:
      "Paste your scene description and the AI analyzes pacing, mood, and action to suggest the optimal number of shots, camera moves, and durations. Edit anything, accept what works.",
    items: [
      { icon: "📝", label: "Script input", desc: "Plain text or structured scene description — the AI handles both." },
      { icon: "🤖", label: "AI shot recommendations", desc: "Camera size, movement, lens, and timing suggested automatically." },
      { icon: "⚡", label: "One-click generation", desc: "Accept the whole breakdown or cherry-pick individual shots." },
      { icon: "🎯", label: "Director's intent", desc: "Add a director note to each shot to guide the AI video generation." },
    ],
    dark: false,
    img: "generate_shots_video.mp4",
    video: true,
  },
  {
    id: "bible",
    tag: "WORLD BIBLE",
    title: "Your story's memory.",
    subtitle: "Characters, locations, and objects — defined once, consistent everywhere.",
    description:
      "The World Bible is a living reference that travels with every scene and shot. Tag an entity and every AI prompt automatically includes its description, keeping faces, places, and props consistent across your entire film.",
    items: [
      { icon: "🔗", label: "Entity tagging", desc: "Use @character, @location, or @object in any text field to link them." },
      { icon: "🔄", label: "Auto-context injection", desc: "Bible entries are injected into every AI prompt automatically." },
      { icon: "🎨", label: "Reference images", desc: "Attach visual references to any entity for image-guided generation." },
      { icon: "📋", label: "Scene inheritance", desc: "Shot-level entities inherit from their parent scene's bible." },
    ],
    dark: true,
    img: "seven_nodes_types_image.png",
  },
  {
    id: "video",
    tag: "AI VIDEO",
    title: "Generate shots with KLING & VEO.",
    subtitle: "Two AI video engines, one workflow.",
    description:
      "Submit any shot node to KLING or VEO for AI video generation. The prompt is compiled automatically from your camera settings, world bible, and director notes. Review, regenerate, or accept — then drag clips into your timeline.",
    items: [
      { icon: "🎞️", label: "KLING integration", desc: "Up to 6 shots, 15 seconds per sequence. High motion fidelity." },
      { icon: "🌐", label: "VEO integration", desc: "Google's model for cinematic quality and lighting." },
      { icon: "🧠", label: "Auto-prompt compilation", desc: "Your shot data becomes a precise AI prompt — no manual writing." },
      { icon: "🔁", label: "Regeneration control", desc: "Adjust any parameter and regenerate individual shots instantly." },
    ],
    dark: false,
    img: "generate_video_video.mp4",
    video: true,
  },
  {
    id: "storyboard",
    tag: "STORYBOARD",
    title: "Visualize your film before you shoot.",
    subtitle: "A frame-by-frame preview of your visual story.",
    description:
      "The storyboard view arranges all your generated frames in sequence — scene by scene, shot by shot. See the full arc of your film, spot continuity issues, and present your vision to collaborators before a single camera rolls.",
    items: [
      { icon: "🖼️", label: "Frame grid", desc: "Every generated image and video frame laid out in shooting order." },
      { icon: "🎬", label: "Scene grouping", desc: "Frames are organized by scene with metadata visible at a glance." },
      { icon: "👁️", label: "Continuity check", desc: "Spot visual inconsistencies across scenes before production." },
      { icon: "📤", label: "Export ready", desc: "Download your storyboard for pitches, presentations, and on-set use." },
    ],
    dark: true,
    img: "generate_multi_shot_video.png",
  },
  {
    id: "workflow",
    tag: "FULL WORKFLOW",
    title: "Script to cut in one tool.",
    subtitle: "No more switching between apps.",
    description:
      "Cinematic Graph is the only tool that takes you from a blank script to a video edit without leaving the canvas. Write, visualize, generate video, and arrange your cut — all connected, all in one place.",
    items: [
      { icon: "✍️", label: "Script writing", desc: "Write scenes and shot descriptions directly on the canvas." },
      { icon: "🎨", label: "Visual development", desc: "Generate stills and animatics to explore your visual language." },
      { icon: "🎥", label: "Video generation", desc: "Go from shot node to AI-generated clip in seconds." },
      { icon: "✂️", label: "Edit assembly", desc: "Arrange your clips into a rough cut without leaving the tool." },
    ],
    dark: false,
    img: "edit_video_video.mp4",
    video: true,
  },
];

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { scroll-behavior: smooth; }
    body { font-family: 'Inter', system-ui, sans-serif; background: ${WHITE}; color: ${DARK}; }
    a { text-decoration: none; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .fu { animation: fadeUp 0.6s ease both; }
    .fp-inner { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
    .fp-nav-links { display:flex; align-items:center; gap:32px; }
    @media (max-width: 768px) {
      .fp-nav-links { display: none; }
      .fp-feature-grid { grid-template-columns: 1fr !important; }
      .fp-feature-media { display: none !important; }
    }
  `}</style>
);

function FeatureSection({ feature, onAuth }) {
  const { tag, title, subtitle, description, items, dark, img, video } = feature;
  const bg = dark ? DARK : WHITE;
  const textColor = dark ? WHITE : DARK;
  const mutedColor = dark ? "rgba(255,255,255,0.55)" : MUTED;
  const borderColor = dark ? "rgba(255,255,255,0.08)" : BORDER;
  const cardBg = dark ? "rgba(255,255,255,0.04)" : SURFACE;

  return (
    <section id={feature.id} style={{ background: bg, padding: "96px 0" }}>
      <div className="fp-inner">
        {/* Tag */}
        <div style={{ marginBottom: 16 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
            color: ACCENT, background: `${ACCENT}15`,
            border: `1px solid ${ACCENT}30`,
            borderRadius: 100, padding: "4px 14px"
          }}>{tag}</span>
        </div>

        {/* Title + subtitle */}
        <h2 style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.025em", color: textColor, marginBottom: 12 }}>
          {title}
        </h2>
        <p style={{ fontSize: "clamp(15px,1.6vw,19px)", color: mutedColor, maxWidth: 600, lineHeight: 1.65, marginBottom: 56 }}>
          {description}
        </p>

        {/* Grid: items + media */}
        <div className="fp-feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          {/* Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((item) => (
              <div key={item.label} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                background: cardBg, border: `1px solid ${borderColor}`,
                borderRadius: 12, padding: "16px 20px"
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.55 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Media */}
          <div className="fp-feature-media" style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${borderColor}`, background: cardBg }}>
            {video ? (
              <video
                src={`/${img}`}
                autoPlay muted loop playsInline
                style={{ width: "100%", display: "block" }}
              />
            ) : (
              <img
                src={`/${img}`}
                alt={title}
                style={{ width: "100%", display: "block" }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function FeaturesPage({ onAuth }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "Inter,system-ui,sans-serif", color: DARK, background: WHITE }}>
      <GlobalStyle />

      {/* ── HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.92)" : WHITE,
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: `1px solid ${scrolled ? BORDER : "transparent"}`,
        transition: "all 0.2s"
      }}>
        <div className="fp-inner" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 9, height: 9, background: ACCENT, borderRadius: 2 }} />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", color: DARK }}>CINEMATIC GRAPH</span>
          </a>
          <nav className="fp-nav-links">
            {FEATURES.map(f => (
              <a key={f.id} href={`#${f.id}`} style={{ fontSize: 13, fontWeight: 500, color: MID, transition: "color 0.15s" }}
                onMouseEnter={e => e.target.style.color = DARK}
                onMouseLeave={e => e.target.style.color = MID}>{f.tag.split(" ").slice(-1)[0]}</a>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onAuth} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: MID, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => e.target.style.color = DARK} onMouseLeave={e => e.target.style.color = MID}>Log in</button>
            <button onClick={onAuth} style={{ background: DARK, border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, color: WHITE, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => e.currentTarget.style.background = "#1F2937"} onMouseLeave={e => e.currentTarget.style.background = DARK}>Get started free</button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ background: DARK, padding: "96px 0 80px" }}>
        <div className="fp-inner" style={{ textAlign: "center" }}>
          <div className="fu" style={{ marginBottom: 20 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600,
              color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 100, padding: "5px 16px"
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
              Everything you need to make a film
            </span>
          </div>
          <h1 className="fu" style={{
            fontSize: "clamp(36px,6vw,68px)", fontWeight: 900, lineHeight: 1.05,
            letterSpacing: "-0.03em", color: WHITE, marginBottom: 24
          }}>
            Built for directors.<br /><span style={{ color: ACCENT }}>Every feature.</span>
          </h1>
          <p style={{
            fontSize: "clamp(15px,1.8vw,19px)", color: "rgba(255,255,255,0.65)",
            lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px"
          }}>
            From the first scene description to the final cut — every tool you need, wired together on one canvas.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onAuth} style={{
              background: ACCENT, border: "none", borderRadius: 10, padding: "13px 28px",
              fontSize: 14, fontWeight: 700, color: WHITE, cursor: "pointer", fontFamily: "inherit"
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#B91C1C"}
              onMouseLeave={e => e.currentTarget.style.background = ACCENT}>
              Start for free
            </button>
            <a href="/" style={{
              display: "inline-flex", alignItems: "center",
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 600, color: WHITE
            }}>See it in action →</a>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      {FEATURES.map(f => (
        <FeatureSection key={f.id} feature={f} onAuth={onAuth} />
      ))}

      {/* ── CTA ── */}
      <section style={{ background: DARK, padding: "96px 0", textAlign: "center" }}>
        <div className="fp-inner">
          <h2 style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, color: WHITE, letterSpacing: "-0.025em", marginBottom: 16 }}>
            Ready to direct?
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", marginBottom: 36 }}>
            Join filmmakers building their stories on Cinematic Graph.
          </p>
          <button onClick={onAuth} style={{
            background: ACCENT, border: "none", borderRadius: 10, padding: "14px 32px",
            fontSize: 15, fontWeight: 700, color: WHITE, cursor: "pointer", fontFamily: "inherit"
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#B91C1C"}
            onMouseLeave={e => e.currentTarget.style.background = ACCENT}>
            Get started free
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: DARK, borderTop: "1px solid rgba(255,255,255,0.07)", padding: "32px 0" }}>
        <div className="fp-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 8, height: 8, background: ACCENT, borderRadius: 2 }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>CINEMATIC GRAPH</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Home</a>
            <a href="/features" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Features</a>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>© 2026 Cinematic Graph</span>
        </div>
      </footer>
    </div>
  );
}
