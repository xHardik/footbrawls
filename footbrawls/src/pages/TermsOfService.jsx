
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const C = {
  bg:       "#060810",
  border:   "rgba(255,255,255,0.07)",
  gold:     "#F7C344",
  goldGlow: "rgba(247,195,68,0.28)",
  red:      "#E84040",
  blue:     "#4F8EF7",
  green:    "#3DD68C",
  text:     "#F2F2F4",
  muted:    "rgba(242,242,244,0.5)",
};

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const l = document.createElement("link"); l.id = "fb-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

function FootballerRight() {
  return (
    <div style={{ position: 'fixed', right: 0, bottom: 0, width: 300, height: 460, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', right: -20, bottom: -20, width: 340, height: 380, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 60% 80%, rgba(247,195,68,.08) 0%, transparent 62%)',
        filter: 'blur(32px)',
      }}/>
      <svg viewBox="0 0 280 440" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', bottom: 0, right: 0, width: '100%', height: '100%', opacity: .12 }}>
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
        <line x1="240" y1="272" x2="268" y2="255" stroke="#F7C344" strokeWidth="1.3" opacity=".2" strokeDasharray="4 7"/>
      </svg>
    </div>
  );
}

function GoalkeeperLeft() {
  return (
    <div style={{ position: 'fixed', left: 0, bottom: 0, width: 300, height: 460, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', left: -20, bottom: -20, width: 340, height: 380, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 40% 80%, rgba(61,214,140,.07) 0%, transparent 62%)',
        filter: 'blur(32px)',
      }}/>
      <svg viewBox="0 0 280 440" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', opacity: .12 }}>
        <ellipse cx="116" cy="116" rx="21" ry="23" fill="#F7C344"/>
        <rect x="111" y="137" width="10" height="15" rx="3" fill="#F7C344"/>
        <path d="M96 150 C96 150 136 140 136 140 C136 140 176 150 176 150 L166 220 L136 225 L106 220 Z" fill="#F7C344"/>
        <path d="M96 155 C70 145 40 135 15 130 C8 128 3 124 5 118 C8 112 17 114 26 118 L86 145 Z" fill="#F7C344"/>
        <path d="M176 155 C202 145 232 135 257 130 C264 128 269 124 267 118 C264 112 255 114 246 118 L186 145 Z" fill="#F7C344"/>
        <ellipse cx="10" cy="125" rx="8" ry="12" fill="#F7C344"/>
        <ellipse cx="262" cy="125" rx="8" ry="12" fill="#F7C344"/>
        <path d="M106 220 C96 245 80 280 70 310 C66 316 68 322 75 324 C82 326 90 320 94 312 L121 240 Z" fill="#F7C344"/>
        <path d="M166 220 C176 245 192 280 202 310 C206 316 204 322 197 324 C190 326 182 320 178 312 L151 240 Z" fill="#F7C344"/>
        <circle cx="136" cy="50" r="24" fill="none" stroke="#F7C344" strokeWidth="2" opacity=".6"/>
      </svg>
    </div>
  );
}

const TermIcon = {
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F7C344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  Scale: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E84040" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 7l4 8H3m14-8l4 8h-4M3 21h18"/>
    </svg>
  ),
  Chat: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  Wrench: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3DD68C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
};

const terms = [
  {
    num: "01", IconComp: TermIcon.Check,
    accent: C.gold, accentBg: "rgba(247,195,68,0.07)", accentBorder: "rgba(247,195,68,0.16)",
    title: "Acceptance of Terms",
    desc: "By creating a Footbrawls profile, entering guilds, and playing any of the hosted football mini-games, you agree to comply with and be bound by these Terms of Service. If you do not agree, you must not access the platform.",
  },
  {
    num: "02", IconComp: TermIcon.Scale,
    accent: C.red, accentBg: "rgba(232,64,64,0.07)", accentBorder: "rgba(232,64,64,0.16)",
    title: "Fair Play & Anti-Cheating",
    desc: "Footbrawls is built around friendly sportsmanship and national guild castle defense. Any attempts to manipulate local storage values, script daily XP accumulation, exploit server security rules, or spoof scores will result in account suspension and deletion of guild contributions.",
    warning: true,
  },
  {
    num: "03", IconComp: TermIcon.Chat,
    accent: C.blue, accentBg: "rgba(79,142,247,0.07)", accentBorder: "rgba(79,142,247,0.16)",
    title: "Community Conduct",
    desc: "The World Chat and Guild Chat are provided for collaborative tactical discussions and friendly football banter. Harassment, hate speech, national insults, and spamming are strictly prohibited and will lead to an immediate chat ban.",
  },
  {
    num: "04", IconComp: TermIcon.Wrench,
    accent: C.green, accentBg: "rgba(61,214,140,0.07)", accentBorder: "rgba(61,214,140,0.16)",
    title: "Service Modifications",
    desc: "We reserve the right to patch gameplay mechanics, reset guild statuses, adjust daily XP caps, update castle HP capacities, or modify current curses and blessings at any time to balance game states and maintain competition integrity.",
  },
];

export default function TermsOfService() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  useEffect(() => { injectFonts(); }, []);

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "'Syne', sans-serif",
      padding: "50px 24px 120px",
      boxSizing: "border-box",
      display: "flex", flexDirection: "column", alignItems: "center",
      position: "relative", overflowX: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 130% 70% at 50% -10%, rgba(12,20,40,0.97) 0%, #060810 70%)",
        zIndex: 0, pointerEvents: "none",
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.018) 1px, transparent 0)',
        backgroundSize: '28px 28px', opacity: 0.9, pointerEvents: 'none', zIndex: 0,
      }} />

      <FootballerRight />
      <GoalkeeperLeft />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "720px" }}>

        <button
          onClick={() => navigate(-1)}
          style={{
            background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
            borderRadius: "10px", color: C.muted, padding: "9px 18px",
            fontFamily: "'Space Mono', monospace", fontSize: "0.72rem",
            fontWeight: 700, cursor: "pointer", marginBottom: "44px",
            transition: "all 0.22s", textTransform: "uppercase", letterSpacing: "1px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = C.gold;
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.boxShadow = `0 0 18px ${C.goldGlow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.muted;
            e.currentTarget.style.boxShadow = "none";
          }}
        >← BACK TO ARENA</button>

        
        <div style={{ marginBottom: "52px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(247,195,68,0.08)", border: "1px solid rgba(247,195,68,0.2)",
            borderRadius: "99px", padding: "5px 14px", marginBottom: "18px",
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: C.gold, letterSpacing: "2px", textTransform: "uppercase" }}>
              Last updated: June 2026
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "4.8rem", letterSpacing: "5px",
            background: "linear-gradient(110deg, #ffe680 0%, #F7C344 50%, #e8a800 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: "0 0 6px 0", lineHeight: 1,
          }}>TERMS OF SERVICE</h1>
          <p style={{
            fontFamily: "'Syne', sans-serif", fontSize: "0.95rem",
            color: C.muted, margin: 0, maxWidth: "440px", lineHeight: "1.6",
          }}>The rules of the arena. By playing, you agree to compete with honour.</p>
        </div>

        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {terms.map((t, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === idx ? t.accentBg : "rgba(10,13,24,0.6)",
                backdropFilter: "blur(24px)",
                border: `1px solid ${hovered === idx ? t.accentBorder : C.border}`,
                borderRadius: "18px", padding: "26px 30px",
                transition: "all 0.24s ease",
                boxShadow: hovered === idx
                  ? `0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px ${t.accentBorder}`
                  : "0 4px 20px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "18px" }}>
                <div style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: t.accentBg, border: `1px solid ${t.accentBorder}`,
                  borderRadius: "12px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "2px",
                }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", fontWeight: 700, color: t.accent, letterSpacing: "1px" }}>{t.num}</span>
                  <t.IconComp />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <h2 style={{
                      color: "#fff", fontSize: "1.12rem",
                      fontFamily: "'Syne', sans-serif", fontWeight: 800,
                      margin: 0, letterSpacing: "-0.3px",
                    }}>{t.title}</h2>
                    {t.warning && (
                      <span style={{
                        fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
                        fontWeight: 700, color: t.accent,
                        background: t.accentBg, border: `1px solid ${t.accentBorder}`,
                        borderRadius: "5px", padding: "2px 7px",
                        letterSpacing: "1px", textTransform: "uppercase",
                      }}>STRICT</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.89rem", lineHeight: "1.68", color: C.muted }}>{t.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        
        <div style={{
          marginTop: "32px", padding: "18px 24px",
          background: "rgba(247,195,68,0.04)", border: "1px solid rgba(247,195,68,0.1)",
          borderRadius: "14px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
            <circle cx="12" cy="12" r="10" stroke="#F7C344" strokeWidth="1.5"/>
            <path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill="#F7C344" opacity="0.5"/>
            <path d="M5 5.5l3 2.5 1 4-4-2-1.5-4z" fill="#F7C344" opacity="0.4"/>
            <path d="M19 5.5l-3 2.5-1 4 4-2 1.5-4z" fill="#F7C344" opacity="0.4"/>
          </svg>
          <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: "0.82rem", color: "rgba(242,242,244,0.38)", lineHeight: "1.6" }}>
            By accessing the Footbrawls arena, you acknowledge you have read and agreed to these terms. Continued use of the platform constitutes your binding acceptance.
          </p>
        </div>
      </div>
    </div>
  );
}