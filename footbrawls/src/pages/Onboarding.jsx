
// src/pages/Onboarding.jsx
// 3-step onboarding: Nickname → Home Country → Support Team
// v3: SVG icons, footballer silhouette, rich content per step

import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { createUser, getUser } from '../lib/user';
import { COUNTRIES, WC_2026_TEAMS } from '../lib/countries';

const C = {
  bg:       "#060810",
  surface:  "rgba(255,255,255,0.04)",
  surface2: "rgba(255,255,255,0.055)",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.13)",
  accent:   "#F7C344",
  green:    "#3DD68C",
  blue:     "#4F8EF7",
  red:      "#E84040",
  text:     "#F2F2F4",
  muted:    "rgba(242,242,244,0.5)",
  muted2:   "rgba(242,242,244,0.28)",
  muted3:   "rgba(242,242,244,0.15)",
};

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const l = document.createElement("link");
  l.id = "fb-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

const GlobalStyles = () => (
  <style>{`
    @font-face {
      font-family: "Twemoji Country Flags";
      src: url("https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1.3/dist/CountryFlagEmojiPolyfill.ttf") format("truetype");
    }
    body, button, input { font-family: "Twemoji Country Flags","Syne","Segoe UI",sans-serif; }
    @keyframes ob-stepIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ob-popIn  { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
    @keyframes ob-shimmer{ 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
    @keyframes ob-pulse  { 0%,100%{opacity:0.3} 50%{opacity:0.55} }
    .ob-country-item:hover { background:rgba(255,255,255,0.055) !important; border-color:rgba(247,195,68,0.28) !important; }
    .ob-country-item.sel   { background:rgba(247,195,68,0.08)  !important; border-color:rgba(247,195,68,0.42) !important; }
    .ob-btn-p:hover:not(:disabled) { opacity:0.92; transform:translateY(-1px); box-shadow:0 0 38px rgba(247,195,68,0.32) !important; }
    .ob-back-btn:hover { color:rgba(242,242,244,0.65) !important; }
    ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:99px}
  `}</style>
);

const WC_COUNTRIES = COUNTRIES.filter(c => WC_2026_TEAMS.includes(c.code));

// SVG Icons
const Icon = {
  Person: ({size=22,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0116 0v1"/>
    </svg>
  ),
  Globe: ({size=22,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
    </svg>
  ),
  Trophy: ({size=22,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 2h12v8a6 6 0 01-12 0V2z"/><path d="M6 5H3a1 1 0 00-1 1v2a4 4 0 004 4M18 5h3a1 1 0 011 1v2a4 4 0 01-4 4"/><path d="M12 16v4M8 20h8"/>
    </svg>
  ),
  Star: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} fillOpacity="0.7" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18.1l-6.2 3 1.2-6.9-5-4.9 6.9-1L12 2z"/>
    </svg>
  ),
  Users: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  Zap: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} fillOpacity="0.9">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  Check: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  ChevronRight: ({size=13,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
  ArrowRight: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
  ArrowLeft: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  Warning: ({size=13,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  ),
  Search: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  Lightning: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={color} fillOpacity="0.3">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  Shield: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
};

// Footballer silhouette — right edge of screen
function FootballerSilhouette() {
  return (
    <div style={{ position:"fixed", right:0, bottom:0, width:280, height:440, zIndex:1, pointerEvents:"none" }}>
      <div style={{ position:"absolute", right:-20, bottom:-20, width:320, height:360, borderRadius:"50%", background:"radial-gradient(ellipse at 60% 80%,rgba(247,195,68,0.09) 0%,transparent 60%)", filter:"blur(28px)" }}/>
      <svg viewBox="0 0 280 440" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position:"absolute", bottom:0, right:0, width:"100%", height:"100%", opacity:0.13 }}>
        <ellipse cx="164" cy="46" rx="22" ry="24" fill="#F7C344"/>
        <rect x="156" y="67" width="13" height="15" rx="4" fill="#F7C344"/>
        <path d="M128 84C121 86 114 103 112 126L116 180L154 187L192 178L196 124C194 101 186 85 179 84L164 80L151 79Z" fill="#F7C344"/>
        <path d="M128 91C115 87 97 76 86 63C80 56 78 50 82 46C86 42 92 45 97 51L120 84Z" fill="#F7C344"/>
        <path d="M179 91C192 95 209 105 219 118C225 126 223 134 217 136C211 138 205 132 199 124L183 95Z" fill="#F7C344"/>
        <path d="M120 178C116 199 112 237 110 270L125 271L138 236L145 200Z" fill="#F7C344"/>
        <path d="M108 269C102 270 93 275 89 282C87 288 91 292 99 292L132 289L132 269Z" fill="#F7C344"/>
        <path d="M163 178C169 199 180 235 195 258L209 251L192 223L181 193Z" fill="#F7C344"/>
        <path d="M193 255C205 271 220 286 230 298L240 288L222 275L207 249Z" fill="#F7C344"/>
        <path d="M228 298C223 308 219 317 223 324C227 329 238 329 247 322C255 316 257 308 251 303L241 291Z" fill="#F7C344"/>
        <circle cx="74" cy="318" r="29" fill="none" stroke="#F7C344" strokeWidth="2" opacity="0.6"/>
        <path d="M74 289C79 297 82 308 74 315C66 308 69 297 74 289Z" fill="#F7C344" opacity="0.4"/>
        <path d="M45 305L56 312L55 322L45 325" stroke="#F7C344" strokeWidth="1.5" fill="none" opacity="0.4"/>
        <path d="M103 305L92 312L93 322L103 325" stroke="#F7C344" strokeWidth="1.5" fill="none" opacity="0.4"/>
        <ellipse cx="100" cy="350" rx="60" ry="7" fill="#F7C344" opacity="0.05"/>
        <line x1="240" y1="272" x2="268" y2="255" stroke="#F7C344" strokeWidth="1.3" opacity="0.2" strokeDasharray="4 7"/>
        <line x1="234" y1="285" x2="265" y2="274" stroke="#F7C344" strokeWidth="0.9" opacity="0.14" strokeDasharray="3 8"/>
      </svg>
    </div>
  );
}

// Stadium background
function StadiumBg() {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 140% 90% at 50% -10%,rgba(12,20,40,0.98) 0%,${C.bg} 55%)` }}/>
      <div style={{
        position:"absolute", inset:0,
        backgroundImage:`linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)`,
        backgroundSize:"64px 64px",
        maskImage:"linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.5) 15%,rgba(0,0,0,0.5) 85%,transparent 100%)",
        animation:"ob-pulse 7s ease-in-out infinite",
      }}/>
      <div style={{ position:"absolute", width:700, height:400, top:-160, left:"50%", transform:"translateX(-50%)", borderRadius:"50%", background:"radial-gradient(ellipse,rgba(247,195,68,0.11) 0%,transparent 65%)", filter:"blur(55px)" }}/>
      <div style={{ position:"absolute", width:450, height:320, bottom:-80, right:-60, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(79,142,247,0.07) 0%,transparent 70%)", filter:"blur(60px)" }}/>
      <div style={{ position:"absolute", width:350, height:280, bottom:-60, left:-40, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(61,214,140,0.05) 0%,transparent 70%)", filter:"blur(55px)" }}/>
    </div>
  );
}

// Progress rail
function ProgressRail({ step }) {
  const nodes = [
    { n:1, label:"Nickname", icon:<Icon.Person size={15}/> },
    { n:2, label:"Nation",   icon:<Icon.Globe  size={15}/> },
    { n:3, label:"Team",     icon:<Icon.Trophy size={15}/> },
  ];
  return (
    <div style={{ width:"100%", maxWidth:500, padding:"22px 0 0", boxSizing:"border-box" }}>
      <div style={{ display:"flex", alignItems:"center" }}>
        {nodes.map((s, i) => (
          <div key={s.n} style={{ display:"contents" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7, flex:1 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                border:"2px solid", transition:"all 0.3s ease", position:"relative", zIndex:2,
                ...(s.n < step
                  ? { background:C.green, borderColor:C.green, color:C.bg }
                  : s.n === step
                    ? { background:"rgba(247,195,68,0.12)", borderColor:C.accent, color:C.accent, boxShadow:"0 0 20px rgba(247,195,68,0.28)" }
                    : { background:C.surface, borderColor:C.border2, color:C.muted2 }),
              }}>
                {s.n < step ? <Icon.Check size={15} color={C.bg}/> : s.icon}
              </div>
              <span style={{
                fontFamily:"'Space Mono',monospace", fontSize:"0.44rem", fontWeight:700,
                letterSpacing:1, textTransform:"uppercase", transition:"color 0.3s",
                color: s.n < step ? C.green : s.n === step ? C.accent : C.muted2,
              }}>{s.label}</span>
            </div>
            {i < 2 && (
              <div style={{
                flex:2, height:2, position:"relative", top:-14, borderRadius:2,
                background: s.n < step ? `linear-gradient(90deg,${C.green},rgba(61,214,140,0.3))` : "rgba(255,255,255,0.07)",
                transition:"background 0.4s ease", overflow:"hidden",
              }}>
                {s.n < step && <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)", animation:"ob-shimmer 2.2s ease-in-out infinite" }}/>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Step hero header
function StepHero({ icon, colorRgb, title, subtitle }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:20 }}>
      <div style={{
        width:52, height:52, borderRadius:14, flexShrink:0,
        background:`rgba(${colorRgb},0.08)`, border:`1.5px solid rgba(${colorRgb},0.28)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:`0 0 20px rgba(${colorRgb},0.1)`,
      }}>{icon}</div>
      <div>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"2rem", letterSpacing:2, margin:"0 0 4px", lineHeight:1, color:C.text }}>{title}</h2>
        <p style={{ fontSize:"0.78rem", color:C.muted, margin:0, lineHeight:1.65 }} dangerouslySetInnerHTML={{ __html:subtitle }}/>
      </div>
    </div>
  );
}

// Feature bullet row
function Bullet({ icon, iconBg, iconBorder, text }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"rgba(255,255,255,0.025)", border:`1px solid ${C.border}`, borderRadius:10 }}>
      <div style={{ width:28, height:28, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:iconBg, border:`1px solid ${iconBorder}` }}>{icon}</div>
      <span style={{ fontSize:"0.8rem", color:C.muted, lineHeight:1.45 }} dangerouslySetInnerHTML={{ __html:text }}/>
    </div>
  );
}

// Stat card
function StatPill({ num, label, color, bg, border }) {
  return (
    <div style={{ padding:"12px 14px", background:bg, border:`1px solid ${border}`, borderRadius:12 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.7rem", letterSpacing:2, color, lineHeight:1 }}>{num}</div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.44rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:C.muted2, marginTop:5, lineHeight:1.5 }}>{label}</div>
    </div>
  );
}

// Text input with char count
function FancyInput({ value, onChange, onKeyDown, placeholder, maxLength, autoFocus }) {
  return (
    <div style={{ position:"relative", marginBottom:12 }}>
      <input
        value={value} onChange={onChange} onKeyDown={onKeyDown}
        placeholder={placeholder} maxLength={maxLength} autoFocus={autoFocus}
        style={{ width:"100%", boxSizing:"border-box", padding:"14px 52px 14px 16px", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.1)", borderRadius:13, color:C.text, fontFamily:"'Syne',sans-serif", fontSize:"1rem", fontWeight:600, letterSpacing:0.5, outline:"none", transition:"all 0.2s" }}
        onFocus={e => { e.currentTarget.style.borderColor="rgba(247,195,68,0.5)"; e.currentTarget.style.background="rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(247,195,68,0.07)"; }}
        onBlur={e  => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.boxShadow="none"; }}
      />
      {maxLength && (
        <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontFamily:"'Space Mono',monospace", fontSize:"0.52rem", fontWeight:700, color:value.length > maxLength-4 ? C.accent : C.muted2 }}>
          {maxLength - value.length}
        </span>
      )}
    </div>
  );
}

// Search input
function SearchInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ position:"relative", marginBottom:8 }}>
      <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", opacity:0.35, pointerEvents:"none" }}>
        <Icon.Search size={14} color={C.text}/>
      </div>
      <input
        value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
        style={{ width:"100%", boxSizing:"border-box", padding:"11px 14px 11px 36px", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.08)", borderRadius:11, color:C.text, fontFamily:"'Syne',sans-serif", fontSize:"0.88rem", outline:"none", transition:"all 0.2s" }}
        onFocus={e => { e.currentTarget.style.borderColor="rgba(247,195,68,0.38)"; e.currentTarget.style.background="rgba(255,255,255,0.07)"; }}
        onBlur={e  => { e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; e.currentTarget.style.background="rgba(255,255,255,0.05)"; }}
      />
    </div>
  );
}

// Country/team list item
function CountryItem({ country, selected, onClick }) {
  return (
    <button
      className={`ob-country-item${selected ? " sel" : ""}`}
      onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 13px", background:"rgba(255,255,255,0.025)", border:`1px solid ${selected ? "rgba(247,195,68,0.42)" : C.border2}`, borderRadius:10, cursor:"pointer", color:C.text, fontFamily:"'Syne',sans-serif", fontSize:"0.87rem", fontWeight:600, textAlign:"left", width:"100%", transition:"all 0.15s" }}
    >
      <span style={{ fontSize:"1.2rem", lineHeight:1, flexShrink:0 }}>{country.flag}</span>
      <span style={{ flex:1 }}>{country.name}</span>
      {selected ? <Icon.Check size={14} color={C.accent}/> : <Icon.ChevronRight size={13} color={C.muted2}/>}
    </button>
  );
}

// CTA button
function PrimaryBtn({ children, onClick, disabled, loading }) {
  return (
    <button
      className="ob-btn-p"
      disabled={disabled || loading}
      onClick={onClick}
      style={{ width:"100%", padding:"15px", border:"none", borderRadius:13, fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.1rem", letterSpacing:3, cursor:disabled?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s", marginTop:4,
        background: disabled ? "rgba(255,255,255,0.07)" : C.accent,
        color: disabled ? C.muted2 : C.bg,
        boxShadow: disabled ? "none" : "0 0 28px rgba(247,195,68,0.2)",
      }}
    >{loading ? "Setting up…" : children}</button>
  );
}

// Main component
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep]                   = useState(1);
  const [nickname, setNickname]           = useState('');
  const [homeCountry, setHomeCountry]     = useState(null);
  const [supportTeam, setSupportTeam]     = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [teamSearch, setTeamSearch]       = useState('');

  useEffect(() => { injectFonts(); }, []);
  if (getUser()) return <Navigate to="/" replace />;

  const filteredCountries = COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
  const filteredWC        = WC_COUNTRIES.filter(c => c.name.toLowerCase().includes(teamSearch.toLowerCase()));

  function handleNicknameNext() {
    const t = nickname.trim();
    if (!t)          return setError('Enter a nickname');
    if (t.length < 2) return setError('Too short — at least 2 characters');
    if (t.length > 20) return setError('Too long — max 20 characters');
    setError(''); setCountrySearch(''); setStep(2);
  }

  function handleCountrySelect(country) {
    setHomeCountry(country); setTeamSearch(''); setStep(3);
  }

  async function handleFinish() {
    if (!supportTeam) return setError('Pick a support team');
    setLoading(true);
    try {
      await createUser({ nickname:nickname.trim(), homeCountry:homeCountry.code, supportTeam:supportTeam.code, flag:homeCountry.flag });
      navigate('/');
    } catch {
      setError('Something went wrong. Try again.'); setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Syne',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", padding:"0 16px 56px", position:"relative", overflowX:"hidden" }}>
      <GlobalStyles/>
      <StadiumBg/>
      <FootballerSilhouette/>

      {/* Top nav */}
      <nav style={{ position:"sticky", top:0, zIndex:200, width:"100%", maxWidth:500, display:"flex", alignItems:"center", justifyContent:"space-between", height:56, boxSizing:"border-box", background:"rgba(6,8,16,0.82)", backdropFilter:"blur(28px)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(247,195,68,0.75) 30%,rgba(255,220,100,0.9) 50%,rgba(247,195,68,0.75) 70%,transparent)" }}/>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.5rem", letterSpacing:4, background:"linear-gradient(110deg,#ffe680,#F7C344 40%,#ffaa00 65%,#F7C344)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>FOOTBRAWLS</span>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.5rem", fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.muted2 }}>Step {step} / 3</span>
      </nav>

      {/* Progress rail */}
      <ProgressRail step={step}/>

      {/* Step content */}
      <div key={step} style={{ width:"100%", maxWidth:500, marginTop:28, animation:"ob-stepIn 0.38s ease", boxSizing:"border-box" }}>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <StepHero
              icon={<Icon.Person size={22} color={C.accent}/>}
              colorRgb="247,195,68"
              title="Your Name"
              subtitle={`How the world will know you in every fortress, every raid, every leaderboard. <strong style="color:#F7C344">Choose wisely.</strong>`}
            />
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18 }}>
              <Bullet
                icon={<Icon.Star size={14} color={C.accent}/>}
                iconBg="rgba(247,195,68,0.08)" iconBorder="rgba(247,195,68,0.22)"
                text={`Appears on the <strong style="color:#F2F2F4">global leaderboard</strong> and in your guild's fortress`}
              />
              <Bullet
                icon={<Icon.Users size={14} color={C.green}/>}
                iconBg="rgba(61,214,140,0.08)" iconBorder="rgba(61,214,140,0.22)"
                text={`Seen by every fan in <strong style="color:#F2F2F4">World Chat</strong> and during guild raids`}
              />
              <Bullet
                icon={<Icon.Zap size={14} color={C.blue}/>}
                iconBg="rgba(79,142,247,0.08)" iconBorder="rgba(79,142,247,0.22)"
                text={`Tied to your <strong style="color:#F2F2F4">XP rank</strong> — from Lurker all the way to Legend`}
              />
            </div>
            <FancyInput
              value={nickname}
              onChange={e => { setNickname(e.target.value); setError(''); }}
              onKeyDown={e => e.key==='Enter' && handleNicknameNext()}
              placeholder="e.g. GoalMachine99"
              maxLength={20}
              autoFocus
            />
            {nickname.trim().length >= 2 && (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", background:"rgba(247,195,68,0.05)", border:"1px solid rgba(247,195,68,0.18)", borderRadius:10, marginBottom:12, animation:"ob-popIn 0.35s ease" }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.46rem", fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"rgba(247,195,68,0.55)" }}>Preview</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.15rem", letterSpacing:2, color:C.accent }}>{nickname.trim().toUpperCase()}</span>
              </div>
            )}
            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:7, color:C.red, fontFamily:"'Space Mono',monospace", fontSize:"0.65rem", marginBottom:10 }}>
                <Icon.Warning size={13} color={C.red}/>{error}
              </div>
            )}
            <PrimaryBtn onClick={handleNicknameNext}>
              <Icon.ArrowRight size={16} color={C.bg}/>CONTINUE
            </PrimaryBtn>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <StepHero
              icon={<Icon.Globe size={22} color={C.blue}/>}
              colorRgb="79,142,247"
              title="Your Nation"
              subtitle={`Your home flag. Every XP you earn — <strong style="color:#F7C344">80% flows into your nation's fortress</strong>, building its walls against raiders.`}
            />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
              <StatPill num="80%" label="Fortress XP — strengthens your nation's castle every day" color={C.accent} bg="rgba(247,195,68,0.06)" border="rgba(247,195,68,0.18)"/>
              <StatPill num="20%" label="Support team XP — goes to the WC side you pick next" color={C.blue} bg="rgba(79,142,247,0.06)" border="rgba(79,142,247,0.18)"/>
            </div>
            <SearchInput value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder="Search your country…" autoFocus/>
            <div style={{ maxHeight:268, overflowY:"auto", display:"flex", flexDirection:"column", gap:3 }}>
              {filteredCountries.slice(0, 200).map(c => (
                <CountryItem key={c.code} country={c} selected={false} onClick={() => handleCountrySelect(c)}/>
              ))}
              {filteredCountries.length === 0 && <p style={{ color:C.muted, fontSize:"0.8rem", textAlign:"center", padding:20 }}>No countries found</p>}
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <StepHero
              icon={<Icon.Trophy size={22} color={C.green}/>}
              colorRgb="61,214,140"
              title="Pick a Side"
              subtitle={`Any WC 2026 qualifier. <strong style="color:#4F8EF7">20% of your daily XP</strong> goes directly to their castle — pick the team you bleed for.`}
            />
            {homeCountry && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 13px", background:"rgba(247,195,68,0.05)", border:"1px solid rgba(247,195,68,0.14)", borderRadius:10, marginBottom:10 }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.46rem", fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"rgba(247,195,68,0.5)" }}>Home</span>
                <span style={{ fontSize:"1.1rem" }}>{homeCountry.flag}</span>
                <span style={{ fontSize:"0.85rem", fontWeight:600, color:C.text }}>{homeCountry.name}</span>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:14 }}>
              {[
                { n:"9",   l:"Daily\nGames",   c:C.accent },
                { n:"250", l:"Max XP\nper Day", c:C.green  },
                { n:"32",  l:"WC 2026\nNations", c:C.blue  },
              ].map(s => (
                <div key={s.l} style={{ padding:"10px", background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:10, textAlign:"center" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.45rem", letterSpacing:1, color:s.c, lineHeight:1 }}>{s.n}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.38rem", fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:C.muted2, marginTop:3, whiteSpace:"pre-line", lineHeight:1.5 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <SearchInput value={teamSearch} onChange={e => setTeamSearch(e.target.value)} placeholder="Search WC 2026 nation…" autoFocus/>
            <div style={{ maxHeight:244, overflowY:"auto", display:"flex", flexDirection:"column", gap:3, marginBottom:12 }}>
              {filteredWC.map(c => (
                <CountryItem key={c.code} country={c} selected={supportTeam?.code === c.code} onClick={() => { setSupportTeam(c); setError(''); }}/>
              ))}
              {filteredWC.length === 0 && <p style={{ color:C.muted, fontSize:"0.8rem", textAlign:"center", padding:20 }}>No teams found</p>}
            </div>
            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:7, color:C.red, fontFamily:"'Space Mono',monospace", fontSize:"0.65rem", marginBottom:10 }}>
                <Icon.Warning size={13} color={C.red}/>{error}
              </div>
            )}
            <PrimaryBtn onClick={handleFinish} disabled={!supportTeam} loading={loading}>
              <Icon.Lightning size={16} color={C.bg}/>LET'S GO
            </PrimaryBtn>
            <button
              className="ob-back-btn"
              onClick={() => { setStep(2); setTeamSearch(''); setSupportTeam(null); }}
              style={{ background:"none", border:"none", color:C.muted2, fontSize:"0.78rem", fontFamily:"'Syne',sans-serif", cursor:"pointer", padding:"10px 0", marginTop:4, display:"flex", alignItems:"center", gap:6, transition:"color 0.2s" }}
            >
              <Icon.ArrowLeft size={14} color="currentColor"/>Back
            </button>
          </>
        )}

      </div>
    </div>
  );
}