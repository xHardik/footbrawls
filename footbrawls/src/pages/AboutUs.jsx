
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const C = {
  bg:      "#060810",
  bg2:     "#0c0f1a",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  gold:    "#F7C344",
  goldGlow:"rgba(247,195,68,0.3)",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const l = document.createElement("link"); l.id="fb-fonts"; l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

function Silhouette() {
  return (
    <div style={{
      position: 'fixed', right: 0, bottom: 0,
      width: 280, height: 440,
      zIndex: 0, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', right: -20, bottom: -20,
        width: 320, height: 360, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 60% 80%, rgba(247,195,68,.06) 0%, transparent 60%)',
        filter: 'blur(28px)',
      }}/>
      <svg viewBox="0 0 280 440" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', bottom: 0, right: 0, width: '100%', height: '100%', opacity: .07 }}>
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
        <circle cx="74" cy="318" r="29" fill="none" stroke="#F7C344" strokeWidth="2" opacity=".6"/>
        <path d="M74 289C79 297 82 308 74 315C66 308 69 297 74 289Z" fill="#F7C344" opacity=".4"/>
        <path d="M45 305L56 312L55 322L45 325" stroke="#F7C344" strokeWidth="1.5" fill="none" opacity=".4"/>
        <path d="M103 305L92 312L93 322L103 325" stroke="#F7C344" strokeWidth="1.5" fill="none" opacity=".4"/>
        <ellipse cx="100" cy="350" rx="60" ry="7" fill="#F7C344" opacity=".05"/>
        <line x1="240" y1="272" x2="268" y2="255" stroke="#F7C344" strokeWidth="1.3" opacity=".2" strokeDasharray="4 7"/>
        <line x1="234" y1="285" x2="265" y2="274" stroke="#F7C344" strokeWidth=".9" opacity=".14" strokeDasharray="3 8"/>
      </svg>
    </div>
  );
}

const AboutIcon = {
  Ball: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#F7C344" strokeWidth="1.5"/>
      <path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill="#F7C344" opacity="0.6"/>
      <path d="M5 5.5l3 2.5 1 4-4-2-1.5-4z" fill="#F7C344" opacity="0.5"/>
      <path d="M19 5.5l-3 2.5-1 4 4-2 1.5-4z" fill="#F7C344" opacity="0.5"/>
      <path d="M8 19l1-4 3-1 3 1 1 4" stroke="#F7C344" strokeWidth="1.2" fill="none" opacity="0.5"/>
    </svg>
  ),
  Castle: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F7C344" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="1"/>
      <path d="M3 11V7h3V9h2V7h3V9h2V7h3V11"/>
      <rect x="9" y="15" width="6" height="6" rx="1"/>
    </svg>
  ),
  Controller: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F7C344" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="12" rx="4"/>
      <path d="M8 11v4M6 13h4"/>
      <circle cx="16" cy="12" r="1" fill="#F7C344"/>
      <circle cx="18" cy="14" r="1" fill="#F7C344"/>
    </svg>
  ),
  Lightning: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#F7C344" fillOpacity="0.85">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
};

const sections = [
  {
    IconComp: AboutIcon.Ball,
    title: "What is Footbrawls?",
    desc: "Footbrawls is an immersive daily web-based football gaming platform built for tactical players and trivia masters. We merge daily puzzle games with a gamified guild battle system, allowing you to showcase your football knowledge and battle for global dominance.",
  },
  {
    IconComp: AboutIcon.Castle,
    title: "Guilds & Castle Raids",
    desc: "Players align with their chosen countries to join national Guilds. Earning XP from daily games helps reinforce your guild's Castle HP, while tactical players can participate in Castle Raids to demolish rival fortresses. Every score counts towards national glory!",
  },
  {
    IconComp: AboutIcon.Controller,
    title: "Core Games Arena",
    desc: "Test your skills across a diverse array of football puzzle challenges. From attribute-guessing inside Who Are Ya and caps estimation in Higher-Lower, to transfer link-building inside Transfer Trail, gauntlet dribbling simulators, and trivia board challenges—we have games for every type of expert.",
  },
  {
    IconComp: AboutIcon.Lightning,
    title: "Deterministic Play Arena",
    desc: "Every user on earth gets the exact same daily seeded puzzles each day. Work together with your friends, share your results, build your streaks, and stack up daily XP achievements.",
  },
];

export default function AboutUs() {
  const navigate = useNavigate();

  useEffect(() => {
    injectFonts();
  }, []);

  return (
    <div style={{
      background: C.bg,
      color: C.text,
      minHeight: "100vh",
      fontFamily: "'Syne', sans-serif",
      padding: "50px 20px 100px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      position: "relative",
      overflowX: "hidden"
    }}>
      
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(12,20,40,0.95) 0%, #060810 80%)",
        zIndex: 0,
        pointerEvents: "none"
      }} />

      
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 0)',
        backgroundSize: '24px 24px',
        opacity: 0.8, pointerEvents: 'none', zIndex: 0
      }} />

      <Silhouette />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "700px" }}>

        
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${C.border}`,
            borderRadius: "10px",
            color: C.muted,
            padding: "10px 20px",
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: "36px",
            transition: "all 0.25s",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = C.gold;
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.boxShadow = `0 0 15px ${C.goldGlow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.muted;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          ← BACK TO ARENA
        </button>

        
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "4.2rem",
          letterSpacing: "5px",
          background: "linear-gradient(110deg, #ffe680 0%, #F7C344 50%, #e8a800 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: "0 0 4px 0",
          lineHeight: "1"
        }}>
          ABOUT FOOTBRAWLS
        </h1>

        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.82rem",
          color: C.gold,
          textTransform: "uppercase",
          letterSpacing: "3px",
          margin: "0 0 48px 0",
          opacity: 0.95
        }}>
          The Ultimate Football Gaming Arena
        </p>

        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {sections.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(12, 15, 26, 0.45)",
                backdropFilter: "blur(20px)",
                border: `1px solid ${C.border}`,
                borderRadius: "16px",
                padding: "24px 28px",
                transition: "all 0.22s",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "flex-start",
                gap: "18px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(247,195,68,0.22)";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(247,195,68,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = "rgba(12,15,26,0.45)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.2)";
              }}
            >
              
              <div style={{
                width: 44, height: 44, flexShrink: 0,
                background: "rgba(247,195,68,0.07)",
                border: "1px solid rgba(247,195,68,0.16)",
                borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <item.IconComp />
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{
                  color: "#fff",
                  fontSize: "1.12rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  margin: "0 0 10px 0",
                  letterSpacing: "-0.3px",
                }}>
                  {item.title}
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: "0.89rem",
                  lineHeight: "1.68",
                  color: C.muted,
                }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}