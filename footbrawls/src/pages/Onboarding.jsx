// src/pages/Onboarding.jsx
// 3-step onboarding: Nickname → Home Country → Support Team
// Redesigned to match Footbrawls stadium aesthetic

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, getUser } from '../lib/user';
import { COUNTRIES, WC_2026_TEAMS } from '../lib/countries';

const C = {
  bg:       "#060810",
  bg2:      "#0c0f1a",
  surface:  "rgba(255,255,255,0.04)",
  surface2: "rgba(255,255,255,0.07)",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.13)",
  accent:   "#F7C344",
  accentDim:"rgba(247,195,68,0.12)",
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
    body, button, input { font-family: "Twemoji Country Flags", "Syne", "Segoe UI", sans-serif; }
    @keyframes ob-stepIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes ob-pillPop { 0%{transform:scale(1)} 45%{transform:scale(1.06)} 100%{transform:scale(1)} }
    @keyframes ob-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
    @keyframes ob-pitchPulse { 0%,100%{opacity:0.3} 50%{opacity:0.55} }
    @keyframes ob-glow { 0%,100%{opacity:0.5} 50%{opacity:0.9} }
    .ob-country-item:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(247,195,68,0.3) !important; }
    .ob-country-item.selected { background: rgba(247,195,68,0.1) !important; border-color: rgba(247,195,68,0.45) !important; }
    .ob-btn-primary:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
    .ob-back-btn:hover { color: rgba(242,242,244,0.7) !important; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
    @media (max-width: 480px) {
      .ob-xp-pill-num { font-size: 1.1rem !important; }
    }
  `}</style>
);

const WC_COUNTRIES = COUNTRIES.filter(c => WC_2026_TEAMS.includes(c.code));

// ── Stadium Background ────────────────────────────────────────────────────────
function StadiumBg() {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 120% 80% at 50% -10%, rgba(12,20,40,0.95) 0%, ${C.bg} 60%)` }}/>
      <div style={{
        position:"absolute", inset:0,
        backgroundImage:`linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)`,
        backgroundSize:"70px 70px",
        maskImage:"linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.5) 20%,rgba(0,0,0,0.5) 80%,transparent 100%)",
        animation:"ob-pitchPulse 7s ease-in-out infinite",
      }}/>
      {/* Centre circle */}
      <div style={{ position:"absolute", width:500, height:500, top:"50%", left:"50%", transform:"translate(-50%,-50%)", borderRadius:"50%", border:"1px solid rgba(255,255,255,0.025)" }}/>
      {/* Gold bloom top */}
      <div style={{ position:"absolute", width:800, height:400, top:-160, left:"50%", transform:"translateX(-50%)", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(247,195,68,0.1) 0%, transparent 60%)", filter:"blur(50px)" }}/>
      {/* Blue glow bottom-right */}
      <div style={{ position:"absolute", width:500, height:350, bottom:-80, right:-80, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(79,142,247,0.06) 0%, transparent 70%)", filter:"blur(70px)" }}/>
    </div>
  );
}

// ── Progress Rail ─────────────────────────────────────────────────────────────
function ProgressRail({ step }) {
  const steps = [
    { n:1, label:"Nickname" },
    { n:2, label:"Country"  },
    { n:3, label:"Team"     },
  ];
  return (
    <div style={{ width:"100%", maxWidth:480, padding:"24px 0 0", boxSizing:"border-box" }}>
      <div style={{ display:"flex", alignItems:"center" }}>
        {steps.map((s, i) => (
          <>
            <div key={s.n} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Space Mono',monospace", fontSize:"0.72rem", fontWeight:700,
                border:"2px solid",
                transition:"all 0.3s ease",
                ...(s.n < step
                  ? { background:C.green, borderColor:C.green, color:C.bg }
                  : s.n === step
                    ? { background:"rgba(247,195,68,0.12)", borderColor:C.accent, color:C.accent, boxShadow:"0 0 20px rgba(247,195,68,0.25)" }
                    : { background:C.surface, borderColor:C.border2, color:C.muted2 }
                ),
              }}>
                {s.n < step ? "✓" : s.n}
              </div>
              <span style={{
                fontFamily:"'Space Mono',monospace", fontSize:"0.44rem", fontWeight:700,
                letterSpacing:1, textTransform:"uppercase",
                color: s.n < step ? C.green : s.n === step ? C.accent : C.muted2,
                transition:"color 0.3s",
              }}>{s.label}</span>
            </div>
            {i < 2 && (
              <div key={`conn-${i}`} style={{
                flex:2, height:2,
                background: s.n < step
                  ? `linear-gradient(90deg, ${C.green}, rgba(61,214,140,0.3))`
                  : C.surface2,
                borderRadius:2, position:"relative", top:-10,
                transition:"background 0.4s ease",
              }}>
                {s.n < step && (
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)", borderRadius:2, animation:"ob-shimmer 2s ease-in-out infinite" }}/>
                )}
              </div>
            )}
          </>
        ))}
      </div>
    </div>
  );
}

// ── Step Hero ─────────────────────────────────────────────────────────────────
function StepHero({ emoji, color, title, subtitle }) {
  const colorMap = {
    gold:  { bg:"rgba(247,195,68,0.08)",  border:"rgba(247,195,68,0.28)",  glow:"rgba(247,195,68,0.12)"  },
    blue:  { bg:"rgba(79,142,247,0.08)",  border:"rgba(79,142,247,0.28)",  glow:"rgba(79,142,247,0.1)"   },
    green: { bg:"rgba(61,214,140,0.08)",  border:"rgba(61,214,140,0.28)",  glow:"rgba(61,214,140,0.1)"   },
  };
  const t = colorMap[color] || colorMap.gold;
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:24 }}>
      <div style={{
        width:56, height:56, borderRadius:16, flexShrink:0,
        background:t.bg, border:`1.5px solid ${t.border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"1.6rem", boxShadow:`0 0 24px ${t.glow}`,
      }}>{emoji}</div>
      <div>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"2rem", letterSpacing:2, margin:"0 0 4px", lineHeight:1, color:C.text }}>{title}</h2>
        <p style={{ fontSize:"0.78rem", color:C.muted, margin:0, lineHeight:1.65 }} dangerouslySetInnerHTML={{ __html: subtitle }}/>
      </div>
    </div>
  );
}

// ── Shared Input ──────────────────────────────────────────────────────────────
function FancyInput({ value, onChange, onKeyDown, placeholder, maxLength, autoFocus }) {
  return (
    <div style={{ position:"relative", marginBottom:12 }}>
      <input
        style={{
          width:"100%", boxSizing:"border-box",
          padding:"14px 52px 14px 18px",
          background:"rgba(255,255,255,0.05)",
          border:`1.5px solid rgba(255,255,255,0.1)`,
          borderRadius:14, color:C.text,
          fontFamily:"'Syne',sans-serif", fontSize:"1rem", fontWeight:600,
          letterSpacing:0.5, outline:"none", transition:"all 0.2s",
        }}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        onFocus={e => {
          e.currentTarget.style.borderColor = "rgba(247,195,68,0.5)";
          e.currentTarget.style.background = "rgba(255,255,255,0.07)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(247,195,68,0.08)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {maxLength && (
        <span style={{
          position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
          fontFamily:"'Space Mono',monospace", fontSize:"0.52rem", fontWeight:700,
          color: value.length > maxLength - 4 ? C.accent : C.muted2,
        }}>{maxLength - value.length}</span>
      )}
    </div>
  );
}

// ── Search Input ──────────────────────────────────────────────────────────────
function SearchInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ position:"relative", marginBottom:10 }}>
      <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:"0.9rem", opacity:0.35, pointerEvents:"none" }}>🔍</span>
      <input
        style={{
          width:"100%", boxSizing:"border-box",
          padding:"11px 14px 11px 36px",
          background:"rgba(255,255,255,0.05)",
          border:`1.5px solid rgba(255,255,255,0.08)`,
          borderRadius:12, color:C.text,
          fontFamily:"'Syne',sans-serif", fontSize:"0.88rem",
          outline:"none", transition:"all 0.2s",
        }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={e => { e.currentTarget.style.borderColor = "rgba(247,195,68,0.38)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
      />
    </div>
  );
}

// ── Country / Team Item ───────────────────────────────────────────────────────
function CountryItem({ country, selected, onClick }) {
  return (
    <button
      className={`ob-country-item${selected ? " selected" : ""}`}
      onClick={onClick}
      style={{
        display:"flex", alignItems:"center", gap:12,
        padding:"11px 14px",
        background: selected ? "rgba(247,195,68,0.1)" : "rgba(255,255,255,0.025)",
        border:`1px solid ${selected ? "rgba(247,195,68,0.45)" : C.border2}`,
        borderRadius:11, cursor:"pointer",
        fontFamily:"'Syne',sans-serif", fontSize:"0.88rem",
        color:C.text, textAlign:"left", width:"100%",
        transition:"all 0.15s",
      }}
    >
      <span style={{ fontSize:"1.25rem", lineHeight:1 }}>{country.flag}</span>
      <span style={{ flex:1, fontWeight:600 }}>{country.name}</span>
      {selected && <span style={{ color:C.accent, fontSize:"0.85rem", fontWeight:700 }}>✓</span>}
    </button>
  );
}

// ── Primary Button ────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled, loading }) {
  return (
    <button
      className="ob-btn-primary"
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        width:"100%", padding:"16px",
        background: disabled ? "rgba(255,255,255,0.07)" : C.accent,
        color: disabled ? C.muted2 : C.bg,
        border:"none", borderRadius:14,
        fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.1rem", letterSpacing:3,
        cursor: disabled ? "not-allowed" : "pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        transition:"all 0.2s",
        boxShadow: disabled ? "none" : "0 0 28px rgba(247,195,68,0.2)",
        marginTop:4,
      }}
    >{loading ? "Setting up…" : children}</button>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep]               = useState(1);
  const [nickname, setNickname]       = useState('');
  const [homeCountry, setHomeCountry] = useState(null);
  const [supportTeam, setSupportTeam] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [teamSearch, setTeamSearch]   = useState('');

  useEffect(() => { injectFonts(); }, []);

  if (getUser()) { navigate('/'); return null; }

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredWC = WC_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  function handleNicknameNext() {
    const t = nickname.trim();
    if (!t) return setError('Enter a nickname');
    if (t.length < 2) return setError('Too short — at least 2 characters');
    if (t.length > 20) return setError('Too long — max 20 characters');
    setError('');
    setCountrySearch('');
    setStep(2);
  }

  function handleCountrySelect(country) {
    setHomeCountry(country);
    setTeamSearch('');
    setStep(3);
  }

  async function handleFinish() {
    if (!supportTeam) return setError('Pick a support team');
    setLoading(true);
    try {
      await createUser({
        nickname: nickname.trim(),
        homeCountry: homeCountry.code,
        supportTeam: supportTeam.code,
        flag: homeCountry.flag,
      });
      navigate('/');
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Syne',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", padding:"0 16px 48px", position:"relative", overflowX:"hidden" }}>
      <GlobalStyles/>
      <StadiumBg/>

      {/* ── Top Nav ── */}
      <nav style={{
        position:"sticky", top:0, zIndex:200,
        width:"100%", maxWidth:480,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        height:56, padding:"0 0", boxSizing:"border-box",
        background:"rgba(6,8,16,0.75)", backdropFilter:"blur(24px)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Gold top line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(247,195,68,0.75) 30%,rgba(255,220,100,0.9) 50%,rgba(247,195,68,0.75) 70%,transparent)", opacity:0.7 }}/>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.5rem", letterSpacing:4, background:"linear-gradient(110deg, #ffe680, #F7C344 40%, #ffaa00 65%, #F7C344)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>FOOTBRAWLS</span>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.52rem", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.muted2 }}>Step {step} / 3</span>
      </nav>

      {/* ── Progress Rail ── */}
      <ProgressRail step={step}/>

      {/* ── Step Cards (animated) ── */}
      <div key={step} style={{ width:"100%", maxWidth:480, marginTop:28, animation:"ob-stepIn 0.35s ease" }}>

        {/* ── STEP 1: Nickname ── */}
        {step === 1 && (
          <>
            <StepHero emoji="⚽" color="gold" title="Your Name" subtitle="How the world will know you — choose wisely, legend."/>

            <FancyInput
              value={nickname}
              onChange={e => { setNickname(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleNicknameNext()}
              placeholder="e.g. GoalMachine99"
              maxLength={20}
              autoFocus
            />

            {/* Live name preview */}
            {nickname.trim().length >= 2 && (
              <div style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"10px 14px", marginBottom:12,
                background:"rgba(247,195,68,0.05)", border:"1px solid rgba(247,195,68,0.18)",
                borderRadius:10, animation:"ob-pillPop 0.4s ease",
              }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.48rem", fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"rgba(247,195,68,0.6)" }}>Preview</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.1rem", letterSpacing:2, color:C.accent }}>{nickname.trim().toUpperCase()}</span>
              </div>
            )}

            {error && <p style={{ color:C.red, fontSize:"0.72rem", fontFamily:"'Space Mono',monospace", margin:"0 0 10px", display:"flex", alignItems:"center", gap:6 }}>⚠ {error}</p>}
            <PrimaryBtn onClick={handleNicknameNext}>CONTINUE →</PrimaryBtn>
          </>
        )}

        {/* ── STEP 2: Home Country ── */}
        {step === 2 && (
          <>
            <StepHero emoji="🌍" color="blue" title="Your Nation" subtitle={`Your home flag. <strong style="color:#F7C344">80%</strong> of XP goes to your nation's fortress.`}/>

            {/* XP split pills */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                { pct:"80%", label:"Home nation XP", col:C.accent, bg:"rgba(247,195,68,0.06)", border:"rgba(247,195,68,0.2)" },
                { pct:"20%", label:"Support team XP", col:C.blue, bg:"rgba(79,142,247,0.06)", border:"rgba(79,142,247,0.2)" },
              ].map(x => (
                <div key={x.label} style={{ padding:"12px 14px", background:x.bg, border:`1px solid ${x.border}`, borderRadius:12 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.6rem", letterSpacing:2, color:x.col, lineHeight:1 }}>{x.pct}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.44rem", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", color:C.muted2, marginTop:4 }}>{x.label}</div>
                </div>
              ))}
            </div>

            <SearchInput value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder="Search country…" autoFocus/>

            <div style={{ maxHeight:280, overflowY:"auto", display:"flex", flexDirection:"column", gap:3 }}>
              {filteredCountries.slice(0, 200).map(c => (
                <CountryItem key={c.code} country={c} selected={false} onClick={() => handleCountrySelect(c)}/>
              ))}
              {filteredCountries.length === 0 && <p style={{ color:C.muted, fontSize:"0.8rem", textAlign:"center", padding:20 }}>No countries found</p>}
            </div>
          </>
        )}

        {/* ── STEP 3: Support Team ── */}
        {step === 3 && (
          <>
            <StepHero emoji="🏆" color="green" title="Pick a Team" subtitle={`Any WC 2026 side. <strong style="color:#4F8EF7">20% XP</strong> boosts their castle.`}/>

            {/* Home country badge */}
            {homeCountry && (
              <div style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"9px 14px", marginBottom:12,
                background:"rgba(247,195,68,0.05)", border:"1px solid rgba(247,195,68,0.15)",
                borderRadius:10,
              }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.48rem", fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"rgba(247,195,68,0.55)" }}>Home</span>
                <span style={{ fontSize:"1.1rem" }}>{homeCountry.flag}</span>
                <span style={{ fontSize:"0.85rem", fontWeight:600, color:C.text }}>{homeCountry.name}</span>
              </div>
            )}

            <SearchInput value={teamSearch} onChange={e => setTeamSearch(e.target.value)} placeholder="Search WC 2026 team…" autoFocus/>

            <div style={{ maxHeight:280, overflowY:"auto", display:"flex", flexDirection:"column", gap:3, marginBottom:14 }}>
              {filteredWC.map(c => (
                <CountryItem key={c.code} country={c} selected={supportTeam?.code === c.code} onClick={() => { setSupportTeam(c); setError(''); }}/>
              ))}
              {filteredWC.length === 0 && <p style={{ color:C.muted, fontSize:"0.8rem", textAlign:"center", padding:20 }}>No teams found</p>}
            </div>

            {error && <p style={{ color:C.red, fontSize:"0.72rem", fontFamily:"'Space Mono',monospace", margin:"0 0 10px", display:"flex", alignItems:"center", gap:6 }}>⚠ {error}</p>}

            <PrimaryBtn onClick={handleFinish} disabled={!supportTeam} loading={loading}>LET'S GO 🚀</PrimaryBtn>

            <button
              className="ob-back-btn"
              onClick={() => { setStep(2); setTeamSearch(''); setSupportTeam(null); }}
              style={{ background:"none", border:"none", color:C.muted2, fontSize:"0.78rem", fontFamily:"'Syne',sans-serif", cursor:"pointer", padding:"10px 0", marginTop:4, display:"block", transition:"color 0.2s" }}
            >← Back</button>
          </>
        )}

      </div>
    </div>
  );
}