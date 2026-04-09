import { useState, useEffect } from "react";
import { ScrollText, Clapperboard, Camera, Image as ImageIcon, Scissors, Music, Upload } from "lucide-react";
import { supabase } from "./supabase";

const ACCENT  = "#DC2626";
const DARK    = "#0D0D0D";
const MID     = "#374151";
const MUTED   = "#6B7280";
const BORDER  = "#E5E7EB";
const SURFACE = "#F9FAFB";
const WHITE   = "#FFFFFF";

// Unsplash image helper
const img = (id, w = 600, h = 400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=center&q=80`;

// Curated cinematic image sets
const STORYBOARD_IMGS = [
  { id:"1536440136628-849c177e76a1", label:"INT. STUDIO — NIGHT",   cam:"85mm · Static",       note:"Product hero shot" },
  { id:"1449824913935-59a10b8d2000", label:"EXT. STREET — NIGHT",   cam:"35mm · Tracking",     note:"@talent in motion" },
  { id:"1519681393784-d120267933ba", label:"EXT. ROOFTOP — DUSK",   cam:"50mm · Static",       note:"Collective moment" },
  { id:"1478720568477-152d9b164e26", label:"INT. VENUE — MIDNIGHT", cam:"24mm · Handheld",     note:"Peak energy" },
  { id:"1531746020798-e6953c6e8e04", label:"ECU — @talent",         cam:"85mm macro · Static", note:"Identity reveal" },
  { id:"1506905925346-21bda4d32df4", label:"EXT. CITY — DAWN",      cam:"35mm · Steadicam",    note:"Closing shot" },
];

const CHARACTER_REFS = [
  { id:"1507003211169-0a1dd7228f2d", tag:"@hero",    name:"Alex Mercer",  kind:"CHARACTER" },
  { id:"1438761681033-6461ffad8d80", tag:"@elena",   name:"Elena Vasquez",kind:"CHARACTER" },
  { id:"1500648767791-00dcc994a43e", tag:"@villain", name:"Viktor Rask",  kind:"CHARACTER" },
];

const SCENE_SHOTS = [
  { id:"1449824913935-59a10b8d2000", n:"01", size:"Full",    move:"Tracking" },
  { id:"1444703686981-a3abbc4d4fe3", n:"02", size:"ECU",     move:"Handheld" },
  { id:"1519681393784-d120267933ba", n:"03", size:"Medium",  move:"Static"   },
];

const PRODUCT_IMGS = [
  { id:"1515562141207-7a88fb7ce338", tag:"@ring",   name:"Gold Signet Ring",  kind:"OBJECT" },
  { id:"1520975954732-35dd22299614", tag:"@jacket", name:"MA-1 Bomber Jacket",kind:"OBJECT" },
  { id:"1441986300917-64674bd600d8", tag:"@venue",  name:"The Venue",         kind:"LOCATION" },
];

const VIDEO_FRAMES = [
  { id:"1536440136628-849c177e76a1", label:"FRAME 00:01", engine:"KLING" },
  { id:"1449824913935-59a10b8d2000", label:"FRAME 00:03", engine:"KLING" },
  { id:"1478720568477-152d9b164e26", label:"FRAME 00:05", engine:"VEO"   },
];

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { scroll-behavior: smooth; overflow: auto !important; height: auto !important; }
    body { font-family: 'Inter', system-ui, sans-serif; background: ${WHITE}; color: ${DARK}; }
    ::selection { background: ${ACCENT}22; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .fu  { animation: fadeUp 0.6s ease both; }
    .fu1 { animation-delay: 0.1s; }
    .fu2 { animation-delay: 0.22s; }
    .fu3 { animation-delay: 0.34s; }
    @keyframes kenburns {
      0%   { transform: scale(1.5) translateX(20%);  }
      45%  { transform: scale(1.5) translateX(-20%); }
      70%  { transform: scale(1.0) translateX(0%);   }
      100% { transform: scale(1.5) translateX(20%);  }
    }
    .lp-img-kenburns {
      overflow: hidden;
      border-radius: inherit;
    }
    .lp-img-kenburns img {
      width: 100%;
      display: block;
      animation: kenburns 12s ease-in-out infinite;
      transform-origin: center center;
    }
    a { text-decoration: none; }

    /* ── Responsive layout classes ── */
    .lp-inner  { max-width:1120px; margin:0 auto; padding:0 32px; }
    .lp-section { padding-top:96px; padding-bottom:96px; }
    .lp-nav-links { display:flex; align-items:center; gap:32px; }
    .lp-nav-actions { display:flex; align-items:center; gap:12px; }
    .lp-hero-ctas { display:flex; align-items:center; gap:16px; justify-content:center; flex-wrap:wrap; }
    .lp-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:72px; }
    .lp-grid-2-sm { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    .lp-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
    .lp-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .lp-steps  { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
    .lp-stats  { display:inline-flex; align-items:center; gap:16px; }

    @media (max-width: 1024px) {
      .lp-grid-2  { gap:40px; }
      .lp-grid-3  { grid-template-columns:repeat(2,1fr); }
      .lp-grid-4  { grid-template-columns:repeat(2,1fr); }
    }

    @media (max-width: 768px) {
      .lp-inner   { padding:0 20px; }
      .lp-section { padding-top:64px; padding-bottom:64px; }
      .lp-nav-links   { display:none; }
      .lp-grid-2  { grid-template-columns:1fr; gap:36px; }
      .lp-grid-2-sm { grid-template-columns:1fr; gap:16px; }
      .lp-grid-3  { grid-template-columns:1fr; gap:16px; }
      .lp-grid-4  { grid-template-columns:repeat(2,1fr); }
      .lp-steps   { grid-template-columns:1fr; }
      .lp-stats   { flex-direction:column; gap:12px; background:transparent !important; border:none !important; padding:0 !important; }
      .lp-stat-div { display:none !important; }
    }

    @media (max-width: 480px) {
      .lp-inner   { padding:0 16px; }
      .lp-section { padding-top:48px; padding-bottom:48px; }
      .lp-grid-4  { grid-template-columns:1fr; }
      .lp-nav-actions button:first-child { display:none; }
      .lp-node-grid { grid-template-columns:repeat(2,1fr) !important; }
    }
    @media (max-width: 768px) {
      .lp-node-grid { grid-template-columns:repeat(3,1fr) !important; }
    }
  `}</style>
);

const Tag = ({ children }) => (
  <span style={{ display:"inline-block", fontSize:11, fontWeight:700, letterSpacing:"0.14em", color:ACCENT,
    background:`${ACCENT}12`, border:`1px solid ${ACCENT}30`, borderRadius:100, padding:"4px 12px",
    textTransform:"uppercase", marginBottom:16 }}>{children}</span>
);

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:`1px solid ${BORDER}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"22px 0", textAlign:"left", gap:16 }}>
        <span style={{ fontSize:16, fontWeight:700, color:DARK, lineHeight:1.4 }}>{q}</span>
        <span style={{ fontSize:20, color:MUTED, flexShrink:0, transition:"transform 0.2s",
          transform: open ? "rotate(45deg)" : "rotate(0deg)", display:"inline-block" }}>+</span>
      </button>
      {open && (
        <div style={{ fontSize:15, color:MUTED, lineHeight:1.8, paddingBottom:22 }}>{a}</div>
      )}
    </div>
  );
}

const Section = ({ children, bg = WHITE, id, pt = 96, pb = 96 }) => (
  <section id={id} style={{ background:bg, paddingTop:pt, paddingBottom:pb }}
    className="lp-section">
    <div className="lp-inner">{children}</div>
  </section>
);

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ onAuth, onClose }) {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [info, setInfo]       = useState("");
  const inp = { width:"100%", background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:8,
    padding:"12px 14px", fontSize:14, color:DARK, fontFamily:"Inter,system-ui,sans-serif",
    outline:"none", transition:"border-color 0.15s" };
  const submit = async () => {
    setError(""); setInfo("");
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true);
    if (mode === "signup") {
      const { error:e } = await supabase.auth.signUp({ email, password, options:{ data:{ full_name:name } } });
      if (e) setError(e.message); else setInfo("Account created! Check your email to confirm, then log in.");
    } else {
      const { data, error:e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) setError(e.message); else onAuth(data.user);
    }
    setLoading(false);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:"100%", maxWidth:420, background:WHITE, borderRadius:20, padding:"36px 36px 32px",
        boxShadow:"0 32px 80px rgba(0,0,0,0.2)", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"none", border:"none",
          fontSize:18, color:MUTED, cursor:"pointer", padding:4 }}>✕</button>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:28 }}>
          <div style={{ width:9, height:9, background:ACCENT, borderRadius:2 }} />
          <span style={{ fontSize:13, fontWeight:800, letterSpacing:"0.18em", color:DARK }}>CINEMATIC GRAPH</span>
        </div>
        <div style={{ display:"flex", background:SURFACE, borderRadius:10, padding:4, marginBottom:24 }}>
          {["login","signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setInfo(""); }} style={{
              flex:1, padding:"9px", fontSize:12, fontWeight:700, letterSpacing:"0.08em",
              background:mode===m ? WHITE : "transparent", border:mode===m ? `1px solid ${BORDER}` : "1px solid transparent",
              borderRadius:7, color:mode===m ? DARK : MUTED, cursor:"pointer",
              fontFamily:"Inter,system-ui,sans-serif", boxShadow:mode===m ? "0 1px 4px rgba(0,0,0,0.07)" : "none" }}>
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo:window.location.origin } })}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            background:WHITE, border:`1px solid ${BORDER}`, borderRadius:9, padding:"12px 14px",
            fontSize:14, fontWeight:600, color:DARK, cursor:"pointer", fontFamily:"Inter,system-ui,sans-serif", marginBottom:18 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#9CA3AF"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.boxShadow="none"; }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
          <div style={{ flex:1, height:1, background:BORDER }} />
          <span style={{ fontSize:11, color:MUTED }}>or</span>
          <div style={{ flex:1, height:1, background:BORDER }} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode === "signup" && <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp}
            onFocus={e => e.target.style.borderColor=ACCENT} onBlur={e => e.target.style.borderColor=BORDER} />}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inp}
            onKeyDown={e => e.key==="Enter"&&submit()} onFocus={e => e.target.style.borderColor=ACCENT} onBlur={e => e.target.style.borderColor=BORDER} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={inp}
            onKeyDown={e => e.key==="Enter"&&submit()} onFocus={e => e.target.style.borderColor=ACCENT} onBlur={e => e.target.style.borderColor=BORDER} />
          {error && <div style={{ fontSize:12, color:ACCENT }}>{error}</div>}
          {info  && <div style={{ fontSize:12, color:"#16A34A" }}>{info}</div>}
          <button onClick={submit} disabled={loading} style={{ marginTop:4, padding:"13px", background:DARK, border:"none",
            borderRadius:9, color:WHITE, fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer",
            opacity:loading?0.6:1, fontFamily:"Inter,system-ui,sans-serif" }}
            onMouseEnter={e => !loading&&(e.currentTarget.style.background="#1F2937")}
            onMouseLeave={e => (e.currentTarget.style.background=DARK)}>
            {loading ? "…" : mode==="login" ? "Log in" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Storyboard Panel ─────────────────────────────────────────────────────────
const SBPanel = ({ id, label, cam, note, w = 340, h = 220 }) => (
  <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid #1e1e1e", background:"#0a0a0a", flexShrink:0, width:w }}>
    <div style={{ position:"relative", height:h, overflow:"hidden" }}>
      <img src={img(id, w * 2, h * 2)} alt={label}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"brightness(0.82)" }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.7))", padding:"20px 14px 10px" }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", color:"rgba(255,255,255,0.5)" }}>{cam}</div>
      </div>
    </div>
    <div style={{ padding:"10px 14px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", color:"#f87171", marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:10, color:"#6b7280" }}>{note}</div>
      </div>
      <div style={{ width:20, height:20, borderRadius:"50%", background:"#f87171", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="white"><polygon points="2,1 7,4 2,7"/></svg>
      </div>
    </div>
  </div>
);

// ─── Canvas Node Card (for node diagram) ──────────────────────────────────────
const NodeCard = ({ x, y, color, label, emoji, title, sub, accent, borderColor, badge }) => (
  <div style={{ position:"absolute", left:x, top:y, width:148, background:"#111", borderRadius:10,
    border:`1.5px solid ${borderColor||"rgba(255,255,255,0.1)"}`, boxShadow:`0 4px 24px rgba(0,0,0,0.5)`,
    overflow:"hidden", userSelect:"none" }}>
    <div style={{ padding:"8px 10px 7px", background:accent||"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.06)",
      display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ fontSize:11 }}>{emoji}</span>
        <span style={{ fontSize:8, fontWeight:800, letterSpacing:"0.12em", color, textTransform:"uppercase" }}>{label}</span>
      </div>
      {badge && <span style={{ fontSize:7, fontWeight:800, color:"#22c55e", background:"rgba(34,197,94,0.12)",
        border:"1px solid rgba(34,197,94,0.25)", borderRadius:4, padding:"2px 5px", letterSpacing:"0.06em" }}>{badge}</span>}
    </div>
    <div style={{ padding:"8px 10px 10px" }}>
      <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.8)", marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{title}</div>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", lineHeight:1.5 }}>{sub}</div>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage({ onAuth }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    return () => { document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden"; };
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const openAuth = () => setAuthOpen(true);

  return (
    <div style={{ fontFamily:"Inter,system-ui,sans-serif", color:DARK, background:WHITE }}>
      <GlobalStyle />

      {/* ── HEADER ── */}
      <header style={{ position:"sticky", top:0, zIndex:100,
        background:scrolled ? "rgba(255,255,255,0.92)" : WHITE,
        backdropFilter:scrolled ? "blur(12px)" : "none",
        borderBottom:`1px solid ${scrolled ? BORDER : "transparent"}`, transition:"all 0.2s" }}>
        <div className="lp-inner" style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:9, height:9, background:ACCENT, borderRadius:2 }} />
            <span style={{ fontSize:13, fontWeight:800, letterSpacing:"0.18em", color:DARK }}>CINEMATIC GRAPH</span>
          </div>
          <nav className="lp-nav-links">
            {[["#nodes","Node System"],["#storyboard","Scene & Shots"],["#bible","World Bible"],["#video","AI Video"],["#workflow","Script → Cut"]].map(([href,label]) => (
              <a key={href} href={href} style={{ fontSize:13, fontWeight:500, color:MID, transition:"color 0.15s" }}
                onMouseEnter={e => e.target.style.color=DARK} onMouseLeave={e => e.target.style.color=MID}>{label}</a>
            ))}
          </nav>
          <div className="lp-nav-actions">
            <button onClick={openAuth} style={{ background:"none", border:"none", fontSize:13, fontWeight:600, color:MID, cursor:"pointer", fontFamily:"inherit" }}
              onMouseEnter={e => e.target.style.color=DARK} onMouseLeave={e => e.target.style.color=MID}>Log in</button>
            <button onClick={openAuth} style={{ background:DARK, border:"none", borderRadius:9, padding:"9px 20px", fontSize:13, fontWeight:700, color:WHITE, cursor:"pointer", fontFamily:"inherit" }}
              onMouseEnter={e => e.currentTarget.style.background="#1F2937"} onMouseLeave={e => e.currentTarget.style.background=DARK}>Get started free</button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ background:DARK, paddingTop:96, paddingBottom:0, overflow:"hidden" }}>
        <div className="lp-inner" style={{ textAlign:"center" }}>
          <div className="fu" style={{ marginBottom:20 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:12, fontWeight:600,
              color:"rgba(255,255,255,0.5)", background:"rgba(255,255,255,0.06)",
              border:"1px solid rgba(255,255,255,0.12)", borderRadius:100, padding:"5px 16px" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#22C55E", display:"inline-block" }}/>
              Director's workflow, powered by AI
            </span>
          </div>
          <h1 className="fu fu1" style={{ fontSize:"clamp(40px,6vw,72px)", fontWeight:900, lineHeight:1.05,
            letterSpacing:"-0.03em", color:WHITE, marginBottom:24 }}>
            From Ideas<br /><span style={{ color:ACCENT }}>to Movies.</span>
          </h1>
          <p className="fu fu2" style={{ fontSize:"clamp(15px,1.8vw,19px)", color:"rgba(255,255,255,0.82)",
            lineHeight:1.7, maxWidth:600, margin:"0 auto 32px" }}>
            Build your visual story the way a director thinks — scene by scene, shot by shot.
            Write, visualize, generate, and edit, all wired together on one canvas.
          </p>
          {/* Node count callout */}
          <div className="fu fu2" style={{ display:"inline-flex", alignItems:"center", gap:16, background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"12px 24px", marginBottom:40 }}>
            {[["Script","to shot"],["Image","to video"],["Edit","to export"]].map(([n,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:900, color:WHITE, letterSpacing:"-0.02em" }}>{n}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>{l}</div>
              </div>
            ))}
            <div style={{ width:1, height:36, background:"rgba(255,255,255,0.08)" }} />
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.7)", marginBottom:2 }}>One connected canvas.</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>Every node in your story, always in sync.</div>
            </div>
          </div>
          <div className="fu fu3" style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:56 }}>
            <button onClick={openAuth} style={{ background:WHITE, border:"none", borderRadius:10, padding:"14px 32px",
              fontSize:15, fontWeight:700, color:DARK, cursor:"pointer", fontFamily:"inherit" }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.88"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>
              Start for free →
            </button>
            <a href="#nodes" style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)",
              borderRadius:10, padding:"14px 32px", fontSize:15, fontWeight:600, color:WHITE, display:"inline-block" }}
              onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.target.style.background="rgba(255,255,255,0.08)"}>
              See the node system ↓
            </a>
          </div>
        </div>

        {/* ── Hero product screenshot ── */}
        <div className="fu fu3" style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", position:"relative" }}>
          {/* Glow behind the screenshot */}
          <div style={{ position:"absolute", top:"10%", left:"50%", transform:"translateX(-50%)",
            width:"70%", height:"60%", background:"radial-gradient(ellipse,rgba(220,38,38,0.18) 0%,transparent 70%)",
            pointerEvents:"none", zIndex:0 }}/>
          <div className="lp-img-kenburns" style={{ position:"relative", zIndex:1, borderRadius:16,
            border:"1px solid rgba(255,255,255,0.10)",
            boxShadow:"0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)" }}>
            <img
              src="/node_scene_shots_system.png"
              alt="Cinematic Graph canvas — scene and shot nodes"
              style={{ borderRadius:15 }}
            />
          </div>
        </div>
      </section>

      {/* ── NODE SYSTEM ── */}
      <section id="nodes" style={{ background:"#0a0a0a", paddingTop:96, paddingBottom:96, overflow:"hidden", position:"relative" }}>
        {/* subtle grid background */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" }} />

        <div style={{ maxWidth:1120, margin:"0 auto", padding:"0 32px", position:"relative", zIndex:1 }}>
          {/* Heading */}
          <div style={{ textAlign:"center", marginBottom:72 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:11, fontWeight:700, letterSpacing:"0.16em",
              color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:100, padding:"5px 16px", textTransform:"uppercase", marginBottom:20 }}>Node System</span>
            <h2 style={{ fontSize:"clamp(30px,4.5vw,54px)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:1.08,
              color:"#ffffff", marginBottom:20 }}>
              Seven node types.<br /><span style={{ color:ACCENT }}>One infinite canvas.</span>
            </h2>
            <p style={{ fontSize:17, color:"rgba(255,255,255,0.4)", maxWidth:560, margin:"0 auto", lineHeight:1.7 }}>
              Every piece of your production lives as a node. Nodes connect, reference each other, and compose into a living graph — from first idea to final cut.
            </p>
          </div>

          {/* ── CANVAS SCREENSHOT ── */}
          <div className="lp-img-kenburns" style={{ borderRadius:20, border:"1px solid rgba(255,255,255,0.08)", marginBottom:64 }}>
            <img src="/seven_nodes_types_image.png" alt="Cinematic Graph — seven node types on canvas"
              style={{ animationDelay:"0s" }} />
          </div>

          {/* ── 7 NODE TYPE CARDS ── */}
          <div className="lp-grid-4 lp-node-grid" style={{ gridTemplateColumns:"repeat(7,1fr)", gap:10, marginBottom:40 }}>
            {[
              { icon: ScrollText,  brand:null,    label:"Script",     color:"#94a3b8", desc:"Write the screenplay. One click splits into Scene nodes." },
              { icon: Clapperboard,brand:null,    label:"Scene",      color:ACCENT,    desc:"Cinematic brief, bible refs, director coherence score." },
              { icon: Camera,      brand:null,    label:"Shot",       color:"#f87171", desc:"Full DoP metadata — size, angle, lens, move, lighting." },
              { icon: ImageIcon,   brand:null,    label:"Image",      color:"#818cf8", desc:"AI-generated still, bible-injected from shot metadata." },
              { icon: null,        brand:"Kling", label:"Kling",      color:"#f97316", desc:"Kling video clips, animated from image or prompt." },
              { icon: null,        brand:"Veo",   label:"Veo",        color:"#a855f7", desc:"Google Veo — cinematic motion for scene-level video generation." },
              { icon: Scissors,    brand:null,    label:"Video Edit", color:"#f59e0b", desc:"Sequence clips, trim, and build your edit on canvas." },
            ].map(n => (
              <div key={n.label} style={{ background:"#ffffff", border:`1px solid #e5e7eb`,
                borderRadius:14, padding:"18px 14px", borderTop:`3px solid ${n.color}` }}>
                <div style={{ marginBottom:10, display:"flex", alignItems:"center", justifyContent:"flex-start" }}>
                  {n.brand
                    ? <span style={{ fontSize:15, fontWeight:900, letterSpacing:"0.04em", color:n.color, fontFamily:"'Inter',system-ui,sans-serif", lineHeight:1 }}>{n.brand}</span>
                    : <n.icon size={20} color={n.color} strokeWidth={1.8} />
                  }
                </div>
                <div style={{ fontSize:11, fontWeight:800, color:"#111827", letterSpacing:"0.06em", marginBottom:6 }}>{n.label}</div>
                <div style={{ fontSize:10, color:"#6b7280", lineHeight:1.6 }}>{n.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCRIPT NODE ── */}
      <Section id="workflow" pt={96} pb={96}>
        {/* Row 1: headline + video */}
        <div className="lp-grid-2" style={{ alignItems:"start", marginBottom:48 }}>
          <div>
            <Tag>Script Node · AI Write Mode</Tag>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.2, marginBottom:20 }}>
              From a basic idea.<br />One click to<br />full storyboard.
            </h2>
            <p style={{ fontSize:16, color:MUTED, lineHeight:1.8 }}>
              Drop in a single paragraph. AI Write Mode develops it into a full structured screenplay consistent with a cinematic style. Every scene becomes its own node on the canvas, ready to turn into shots.
            </p>
          </div>
          <div style={{ borderRadius:16, overflow:"hidden",
            border:"1px solid rgba(0,0,0,0.08)",
            boxShadow:"0 24px 64px rgba(0,0,0,0.12)" }}>
            <video
              src="/generate_script_video.mp4"
              autoPlay loop muted playsInline
              style={{ width:"100%", display:"block" }}
            />
          </div>
        </div>

        {/* Row 2: AI Write Mode card (left) + 4 steps (right) — aligned */}
        <div className="lp-grid-2" style={{ alignItems:"start" }}>
          {/* AI Write Mode highlight */}
          <div style={{ background:DARK, borderRadius:14, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }} />
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", color:"rgba(255,255,255,0.5)" }}>AI WRITE MODE</span>
            </div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", lineHeight:1.7, marginBottom:16 }}>
              Choose a cinematic style — the AI rewrites your idea through that lens, building proper scene structure, atmosphere, and visual direction automatically.
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {[
                { label:"Drama",        emoji:"🎭", color:"#c084fc" },
                { label:"Thriller",     emoji:"🔪", color:"#f87171" },
                { label:"Action",       emoji:"💥", color:"#fb923c" },
                { label:"Noir",         emoji:"🌑", color:"#94a3b8" },
                { label:"Sci-Fi",       emoji:"🚀", color:"#38bdf8" },
                { label:"Epic Fantasy", emoji:"🐉", color:"#a3e635" },
                { label:"Documentary",  emoji:"🎥", color:"#fbbf24" },
                { label:"Comedy",       emoji:"😂", color:"#f472b6" },
              ].map(s => (
                <span key={s.label} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700,
                  color:s.color, background:`${s.color}12`, border:`1px solid ${s.color}30`,
                  borderRadius:100, padding:"4px 11px" }}>
                  {s.emoji} {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* 4 steps — aligned with card */}
          <div className="lp-grid-2-sm">
            {[
              ["01","Drop in your idea","A sentence, a paragraph, a mood board description — anything."],
              ["02","Pick a cinematic style","AI develops the full script through that visual and tonal lens."],
              ["03","Split into scenes","One click — every scene heading becomes a Scene node on the canvas."],
              ["04","Annotate & generate","Each Scene node is ready for shot breakdown and AI image generation."],
            ].map(([n,t,d]) => (
              <div key={n} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:26, height:26, borderRadius:7, background:DARK, border:`1px solid ${BORDER}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:9, fontWeight:800, color:"#94a3b8", flexShrink:0 }}>{n}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:DARK, marginBottom:3 }}>{t}</div>
                  <div style={{ fontSize:11, color:MUTED, lineHeight:1.5 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── STORYBOARD SECTION ── */}
      <Section id="storyboard" pt={96} pb={80}>
        <div style={{ marginBottom:80 }}>
          <Tag>Scene & Shot Nodes</Tag>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.2, marginBottom:20 }}>
            The language of real<br />production, built in.
          </h2>
          <p style={{ fontSize:16, color:MUTED, lineHeight:1.8, marginBottom:32, maxWidth:680 }}>
            Every Scene node holds a cinematic brief, world bible entities, and a director coherence score. Every Shot node carries the full metadata a DoP needs on day one — camera size, angle, movement, lens, lighting, and the director's note.
          </p>

          {/* 16:9 video */}
          <div style={{ position:"relative", width:"100%", paddingTop:"56.25%",
            borderRadius:16, overflow:"hidden",
            border:"1px solid rgba(0,0,0,0.08)",
            boxShadow:"0 24px 64px rgba(0,0,0,0.12)",
            marginBottom:36 }}>
            <video
              src="/generate_shots_video.mp4"
              autoPlay loop muted playsInline
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", objectFit:"cover" }}
            />
          </div>

          {/* Spec bullets — 2-column grid */}
          <div className="lp-grid-2-sm" style={{ gap:"10px 48px" }}>
            {[["Camera size","Extreme close-up · Close-up · Medium · Full · Wide"],
              ["Camera angle","Eye-level · Low · High · Overhead · 45°"],
              ["Movement","Static · Tracking · Handheld · Steadicam"],
              ["Lens","24mm to 100mm macro — matched to visual intent"],
              ["Lighting","Hard contrast · Natural soft · Neon-lit · Available light"],
              ["Director's note","The one thing that must not be lost on set."],
            ].map(([t,d]) => (
              <div key={t} style={{ display:"flex", gap:12, alignItems:"baseline" }}>
                <div style={{ width:3, height:3, borderRadius:"50%", background:ACCENT, flexShrink:0, marginTop:7 }} />
                <div><span style={{ fontSize:13, fontWeight:700, color:DARK }}>{t} — </span>
                  <span style={{ fontSize:13, color:MUTED }}>{d}</span></div>
              </div>
            ))}
          </div>
        </div>

      </Section>

      {/* ── WORLD BIBLE ── */}
      <Section id="bible" bg={DARK} pt={96} pb={96}>
        <div className="lp-grid-2" style={{ alignItems:"center" }}>
          {/* Left: character refs */}
          <div>
            <div style={{ marginBottom:20 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", color:"rgba(255,255,255,0.4)",
                background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
                borderRadius:100, padding:"4px 12px", textTransform:"uppercase" }}>World Bible</span>
            </div>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.2, marginBottom:20, color:WHITE }}>
              Define your world once.<br />Stay consistent<br />everywhere.
            </h2>
            <p style={{ fontSize:16, color:"rgba(255,255,255,0.45)", lineHeight:1.8, marginBottom:32 }}>
              Tag every character, object, and location with a <code style={{ background:"rgba(255,255,255,0.08)", borderRadius:4, padding:"1px 7px", fontSize:13, color:"rgba(255,255,255,0.7)" }}>@handle</code>. Reference those tags in any scene or shot node. When you generate an image, the bible is injected automatically.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                ["Characters","Tag your cast — description, notes, and a locked reference image. Every shot that mentions @talent gets the same face.","#818cf8"],
                ["Objects","Products, props, vehicles. Your @jacket looks the same in every shot, every scene, every campaign.","#f59e0b"],
                ["Locations","Define @street once. Every scene set there inherits the same visual DNA.","#34d399"],
              ].map(([t,d,c]) => (
                <div key={t} style={{ display:"flex", gap:14 }}>
                  <div style={{ width:3, borderRadius:2, background:c, flexShrink:0, alignSelf:"stretch", minHeight:40 }} />
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:WHITE, marginBottom:4 }}>{t}</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: one card per bible type */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[
              { kind:"CHARACTER", tag:"@alex",    name:"Alex Mercer",     color:"#818cf8", src:"/character_Alex_Mercer.png" },
              { kind:"OBJECT",    tag:"@drive",   name:"Encrypted Drive", color:"#f59e0b", src:"/object_Encrypted_Drive.png" },
              { kind:"LOCATION",  tag:"@ctrlroom",name:"Control Room",    color:"#34d399", src:"/location_Control_Room.png" },
            ].map(e => (
              <div key={e.tag} style={{ display:"flex", gap:0, alignItems:"stretch", background:"rgba(255,255,255,0.04)",
                border:`1px solid rgba(255,255,255,0.08)`, borderRadius:14, overflow:"hidden" }}>
                {/* image fills left side */}
                <img src={e.src} alt={e.name}
                  style={{ width:110, height:110, objectFit:"cover", flexShrink:0, display:"block" }} />
                {/* content */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"14px 18px" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", color:e.color,
                        background:`${e.color}15`, border:`1px solid ${e.color}35`, borderRadius:4, padding:"3px 8px" }}>{e.kind}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.4)" }}>{e.tag}</span>
                    </div>
                    <div style={{ fontSize:16, fontWeight:700, color:WHITE, letterSpacing:"-0.01em" }}>{e.name}</div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#22c55e", background:"#22c55e0f",
                    border:"1px solid #22c55e28", borderRadius:5, padding:"4px 10px", alignSelf:"flex-start",
                    letterSpacing:"0.08em" }}>REF LOCKED</div>
                </div>
                {/* accent bar */}
                <div style={{ width:3, background:e.color, flexShrink:0, opacity:0.6 }} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── AI IMAGE GENERATION — HIDDEN FOR NOW, RESTORE WHEN NEEDED ──
      <Section id="images" pt={96} pb={96}>
        ...full section removed temporarily...
      </Section>
      ── END HIDDEN ── */}

      {/* ── AI VIDEO ── */}
      <Section id="video" bg={SURFACE} pt={96} pb={96}>
        <Tag>AI Video Generation</Tag>
        <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.2, marginBottom:20 }}>
          From still to moving image.<br />Using the latest best<br />AI video generators.
        </h2>
        <p style={{ fontSize:16, color:MUTED, lineHeight:1.8, marginBottom:32, maxWidth:680 }}>
          Two dedicated video node types let you generate motion directly from your canvas. Animate an approved image, extend a scene, or deliver polished video for client review — without leaving the board.
        </p>

        {/* cycling video player */}
        {(() => {
          const VIDEO_CLIPS = [
            { src:"/trap_video_clip.mp4",      label:"Trap · Music Video" },
            { src:"/action_movie_clip.mp4",    label:"Action · Feature Film" },
            { src:"/fantasy_style_video.mp4",  label:"Fantasy · Epic" },
          ];
          const [vidIdx, setVidIdx] = useState(0);
          return (
            <div style={{ marginBottom:36 }}>
              {/* dot nav */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                {VIDEO_CLIPS.map((c,i) => (
                  <button key={i} onClick={() => setVidIdx(i)}
                    style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:7, padding:0 }}>
                    <div style={{ width: i===vidIdx ? 22 : 8, height:8, borderRadius:4,
                      background: i===vidIdx ? ACCENT : "rgba(0,0,0,0.18)",
                      transition:"all 0.3s ease" }} />
                    {i===vidIdx && <span style={{ fontSize:11, fontWeight:600, color:MUTED, letterSpacing:"0.04em" }}>{c.label}</span>}
                  </button>
                ))}
              </div>
              <div style={{ position:"relative", width:"100%", paddingTop:"56.25%",
                borderRadius:16, overflow:"hidden",
                border:"1px solid rgba(0,0,0,0.08)",
                boxShadow:"0 24px 64px rgba(0,0,0,0.12)" }}>
                <video key={VIDEO_CLIPS[vidIdx].src}
                  src={VIDEO_CLIPS[vidIdx].src}
                  autoPlay muted playsInline
                  onEnded={() => setVidIdx(i => (i + 1) % VIDEO_CLIPS.length)}
                  style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", objectFit:"cover" }}
                />
              </div>
            </div>
          );
        })()}

        {/* Feature list — 3 columns */}
        <div className="lp-grid-3" style={{ gap:24 }}>
          {[
            { label:"Kling Video Node",  color:"#818cf8", desc:"Generate high-quality motion clips from text or an Image node. Up to 10 seconds, multiple aspect ratios, motion intensity controls." },
            { label:"Veo Video Node",    color:"#34d399", desc:"Google's Veo model — cinematic quality and strong motion understanding, ideal for scene-level generation and mood reels." },
            { label:"Video Edit Node",   color:"#f59e0b", desc:"Trim, sequence and arrange generated clips on the canvas. Build a rough timeline without leaving pre-production." },
          ].map(v => (
            <div key={v.label} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:v.color, flexShrink:0, marginTop:5 }} />
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:DARK, marginBottom:4 }}>{v.label}</div>
                <div style={{ fontSize:13, color:MUTED, lineHeight:1.6 }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── FROM ZERO TO FINAL CUT ── */}
      <Section bg={SURFACE} pt={96} pb={96}>
        <div style={{ textAlign:"center", marginBottom:64 }}>
          <Tag>The Full Workflow</Tag>
          <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.15, marginBottom:16 }}>
            From zero to final cut.<br />Every step on one canvas.
          </h2>
          <p style={{ fontSize:17, color:MUTED, maxWidth:480, margin:"0 auto", lineHeight:1.7 }}>
            No more hopping between tools. Every node flows into the next — the canvas is the workflow.
          </p>
        </div>

        <div className="lp-steps">
          {[
            { step:"01", node:"Script Node", emoji:"📝", color:"#94a3b8",
              title:"Write your treatment or screenplay",
              body:"Open a Script node and write your full screenplay or brief. No formatting required — just write.", },
            { step:"02", node:"Scene Nodes", emoji:"🎬", color:ACCENT,
              title:"One click — script splits into scenes",
              body:"Hit Split. Every scene heading becomes a Scene node, auto-positioned on the canvas and pre-populated.", },
            { step:"03", node:"Shot Nodes", emoji:"🎥", color:"#f87171",
              title:"Break each scene into DoP-ready shots",
              body:"Add Shot nodes to each scene. Set camera size, angle, movement, lens, lighting, and a director's note.", },
            { step:"04", node:"World Bible", emoji:"🌐", color:"#34d399",
              title:"Tag your cast, props, and locations",
              body:"Define @talent, @jacket, @street once. Bible entities are injected automatically into every prompt.", },
            { step:"05", node:"Image Nodes", emoji:"🖼️", color:"#818cf8",
              title:"Generate production stills from shot briefs",
              body:"Every Shot node compiles into a prompt. Hit generate — the bible is injected. Approve and lock the result.", },
            { step:"06", node:"Kling & Veo Nodes", emoji:"📹", color:"#c084fc",
              title:"Animate your approved images into clips",
              body:"Add Kling or Veo nodes. Animate an approved still into a 5–10 second motion clip per shot.", },
            { step:"07", node:"Audio Node", emoji:"🎵", color:"#10b981",
              title:"Upload or generate your soundtrack",
              body:"Drop in your own track or generate one with ElevenLabs. Beat detection snaps every cut to the music automatically.", },
            { step:"08", node:"Video Edit Node", emoji:"✂️", color:"#f59e0b",
              title:"Sequence clips into a final edit",
              body:"Drag clips into a Video Edit node. Trim, reorder, and export your finished edit for client review.", },
          ].map((item, i) => (
            <div key={item.step} style={{ display:"flex", gap:20, background:WHITE, border:`1px solid ${BORDER}`, borderRadius:16, padding:"24px 24px",
              }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, flexShrink:0 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:`${item.color}10`,
                  border:`1.5px solid ${item.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                  {item.emoji}
                </div>
                {i < 7 && <div style={{ width:1.5, flex:1, background:BORDER, minHeight:16, marginTop:8 }} />}
              </div>
              <div style={{ paddingTop:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:9, fontWeight:800, color:item.color, letterSpacing:"0.1em" }}>{item.node.toUpperCase()}</span>
                  <span style={{ fontSize:9, color:MUTED, fontWeight:600 }}>STEP {item.step}</span>
                </div>
                <div style={{ fontSize:15, fontWeight:700, color:DARK, marginBottom:6 }}>{item.title}</div>
                <div style={{ fontSize:13, color:MUTED, lineHeight:1.7 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq" pt={96} pb={96}>
        <div style={{ maxWidth:760, margin:"0 auto" }}>
          <Tag>FAQ</Tag>
          <h2 style={{ fontSize:"clamp(26px,3.5vw,42px)", fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.2, marginBottom:48 }}>
            Questions, answered.
          </h2>
          {[
            {
              q: "Do I need to know filmmaking to use this?",
              a: "No. The app guides you through every step — you write your idea in plain language, pick a cinematic style, and the AI builds the shot breakdown for you. The director annotations explain every technical choice in plain terms, so you learn as you go.",
            },
            {
              q: "Which AI models does it use for video generation?",
              a: "Currently Kling 1.6 and Google Veo 3.1. Both are available from the same canvas — just drop a Kling or Veo node next to your shots and wire them up. You choose which one to use per scene.",
            },
            {
              q: "What is a World Bible and why does it matter?",
              a: "A World Bible is a set of reference entries — characters, locations, objects — that you define once and reuse across every scene. When you generate images or videos, the bible is injected automatically so your characters look the same in every shot without re-prompting.",
            },
            {
              q: "Can I upload my own reference images?",
              a: "Yes. You can add an Image node with any reference URL or upload directly, then save it to the bible. Once it's in the bible, every shot that references that entity will use it as a visual anchor for generation.",
            },
            {
              q: "How does beat-sync work with the Audio node?",
              a: "Drop an audio file into the Audio node and it detects the BPM automatically — no external tool needed. Wire the Audio node into your Video Edit node and cuts will snap to the detected beat grid, so your edit stays in time with the track.",
            },
            {
              q: "Is there a limit to how many nodes I can have on the canvas?",
              a: "The canvas is infinite and there's no hard node limit. Very large projects with hundreds of generated images may feel slower on lower-end machines, but there's no artificial cap.",
            },
            {
              q: "Can I save my work and come back to it?",
              a: "Yes. Projects auto-save to the cloud whenever you make a change. You can also save any canvas state as a custom template and reload it from the Templates picker at any time.",
            },
            {
              q: "What video formats can I export from the Video Edit node?",
              a: "Currently the editor sequences your Kling and Veo clips with trim and order applied. Export targets include 1080p and 4K. You can also download individual generated clips directly from each node.",
            },
          ].map(({ q, a }, i) => (
            <FAQItem key={i} q={q} a={a} />
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <section style={{ background:DARK, padding:"96px 0", position:"relative", overflow:"hidden" }}>
        {/* background image strip */}
        <div style={{ position:"absolute", inset:0, display:"flex", opacity:0.12 }}>
          {STORYBOARD_IMGS.map((p,i) => (
            <img key={i} src={img(p.id, 400, 400)} alt="" style={{ flex:1, objectFit:"cover", display:"block" }} />
          ))}
        </div>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 32px", textAlign:"center", position:"relative", zIndex:1 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.16em", color:"rgba(255,255,255,0.3)", marginBottom:20, textTransform:"uppercase" }}>Start building today</div>
          <h2 style={{ fontSize:"clamp(28px,4vw,52px)", fontWeight:900, letterSpacing:"-0.03em", color:WHITE, lineHeight:1.1, marginBottom:20 }}>
            Your first cinematic<br /><span style={{ color:ACCENT }}>project starts here.</span>
          </h2>
          <p style={{ fontSize:17, color:"rgba(255,255,255,0.4)", lineHeight:1.7, maxWidth:420, margin:"0 auto 36px" }}>
            Free to start. Build your bible, break down your scenes, generate images and videos — all in one canvas.
          </p>
          <button onClick={openAuth} style={{ background:WHITE, border:"none", borderRadius:12, padding:"16px 44px",
            fontSize:16, fontWeight:700, color:DARK, cursor:"pointer", fontFamily:"inherit" }}
            onMouseEnter={e => e.currentTarget.style.opacity="0.88"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>
            Start for free →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:`1px solid ${BORDER}`, padding:"36px 0" }}>
        <div style={{ maxWidth:1120, margin:"0 auto", padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:8, height:8, background:ACCENT, borderRadius:2 }} />
            <span style={{ fontSize:12, fontWeight:800, letterSpacing:"0.18em", color:DARK }}>CINEMATIC GRAPH</span>
          </div>
          <div style={{ fontSize:12, color:MUTED }}>Pre-production. Reimagined.</div>
          <button onClick={openAuth} style={{ background:"none", border:`1px solid ${BORDER}`, borderRadius:8,
            padding:"8px 18px", fontSize:12, fontWeight:600, color:MID, cursor:"pointer", fontFamily:"inherit" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="#9CA3AF"}
            onMouseLeave={e => e.currentTarget.style.borderColor=BORDER}>Log in</button>
        </div>
      </footer>

      {authOpen && <AuthModal onAuth={u => { setAuthOpen(false); onAuth(u); }} onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
