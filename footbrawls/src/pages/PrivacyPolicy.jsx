
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const C = {
  bg:       "#060810",
  border:   "rgba(255,255,255,0.07)",
  gold:     "#F7C344",
  goldGlow: "rgba(247,195,68,0.28)",
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
        <path d="M74 289C79 297 82 308 74 315C66 308 69 297 74 289Z" fill="#F7C344" opacity=".4"/>
        <ellipse cx="100" cy="350" rx="60" ry="7" fill="#F7C344" opacity=".05"/>
        <line x1="240" y1="272" x2="268" y2="255" stroke="#F7C344" strokeWidth="1.3" opacity=".2" strokeDasharray="4 7"/>
        <line x1="234" y1="285" x2="265" y2="274" stroke="#F7C344" strokeWidth=".9" opacity=".14" strokeDasharray="3 8"/>
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
        <path d="M136 26C141 34 144 45 136 52C128 45 131 34 136 26Z" fill="#F7C344" opacity=".4"/>
      </svg>
    </div>
  );
}

const PrivIcon = {
  File: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F7C344" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <path d="M14 2v6h6M9 13h6M9 17h4"/>
    </svg>
  ),
  Database: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v5c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 10v5c0 1.66 4.03 3 9 3s9-1.34 9-3v-5"/>
    </svg>
  ),
  Chart: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3DD68C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="14" width="4" height="7" rx="1"/>
      <rect x="10" y="9" width="4" height="12" rx="1"/>
      <rect x="17" y="4" width="4" height="17" rx="1"/>
      <line x1="2" y1="21" x2="22" y2="21"/>
    </svg>
  ),
  Lock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  ),
};

const sections = [
  {
    num: "01",
    IconComp: PrivIcon.File,
    accent: C.gold,
    accentBg: "rgba(247,195,68,0.07)",
    accentBorder: "rgba(247,195,68,0.16)",
    title: "Information We Collect",
    desc: "To provide you with the best gaming experience, we collect basic details such as your user nickname, home country guild selection, and game scores/history. When authenticating, we process account details through Firebase Authentication services.",
    chips: ["Nickname", "Guild", "Scores", "Firebase Auth"],
  },
  {
    num: "02",
    IconComp: PrivIcon.Database,
    accent: C.blue,
    accentBg: "rgba(79,142,247,0.07)",
    accentBorder: "rgba(79,142,247,0.16)",
    title: "Cookies and Local Storage",
    desc: "We use local storage (such as localStorage) to keep you signed in, persist your user profile, and temporarily store daily game completion states. This allows your score to load fast and correctly sync with the server database.",
    chips: ["localStorage", "Session", "Sync"],
  },
  {
    num: "03",
    IconComp: PrivIcon.Chart,
    accent: C.green,
    accentBg: "rgba(61,214,140,0.07)",
    accentBorder: "rgba(61,214,140,0.16)",
    title: "Data Usage Rules",
    desc: "Your data is solely used to maintain your player stats, calculate daily XP progress, manage your castle status inside your guild, and update the global/chat leaderboards. We do not sell or share your data with third-party advertisers.",
    chips: ["Player Stats", "XP", "Leaderboards", "No Ads"],
  },
  {
    num: "04",
    IconComp: PrivIcon.Lock,
    accent: "#A855F7",
    accentBg: "rgba(168,85,247,0.07)",
    accentBorder: "rgba(168,85,247,0.16)",
    title: "Data Security",
    desc: "We employ industry-standard secure storage practices using Firebase Firestore and Google Cloud infrastructure to protect your logs and profile data. However, no database transmission over the internet is completely risk-free.",
    chips: ["Firestore", "Google Cloud", "Encrypted"],
  },
];

export default function PrivacyPolicy() {
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
            background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.2)",
            borderRadius: "99px", padding: "5px 14px", marginBottom: "18px",
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: "#FF8C00", letterSpacing: "2px", textTransform: "uppercase" }}>
              June 2026
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "4.8rem", letterSpacing: "5px",
            background: "linear-gradient(110deg, #da8d19 0%, #ff8c00 50%, #cc7000 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: "0 0 6px 0", lineHeight: 1,
          }}>PRIVACY POLICY</h1>
          <p style={{
            fontFamily: "'Syne', sans-serif", fontSize: "0.95rem",
            color: C.muted, margin: 0, maxWidth: "440px", lineHeight: "1.6",
          }}>We keep things clean on the pitch and in our data practices.</p>
        </div>

        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {sections.map((s, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === idx ? s.accentBg : "rgba(10,13,24,0.6)",
                backdropFilter: "blur(24px)",
                border: `1px solid ${hovered === idx ? s.accentBorder : C.border}`,
                borderRadius: "18px", padding: "26px 30px",
                transition: "all 0.24s ease",
                boxShadow: hovered === idx
                  ? `0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px ${s.accentBorder}`
                  : "0 4px 20px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "18px" }}>
                <div style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: s.accentBg, border: `1px solid ${s.accentBorder}`,
                  borderRadius: "12px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "2px",
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: "0.62rem",
                    fontWeight: 700, color: s.accent, letterSpacing: "1px", lineHeight: 1,
                  }}>{s.num}</span>
                  <s.IconComp />
                </div>

                <div style={{ flex: 1 }}>
                  <h2 style={{
                    color: "#fff", fontSize: "1.12rem",
                    fontFamily: "'Syne', sans-serif", fontWeight: 800,
                    margin: "0 0 10px 0", letterSpacing: "-0.3px",
                  }}>{s.title}</h2>
                  <p style={{ margin: "0 0 14px 0", fontSize: "0.89rem", lineHeight: "1.68", color: C.muted }}>{s.desc}</p>

                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {s.chips.map((chip, ci) => (
                      <span key={ci} style={{
                        fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
                        fontWeight: 700, color: s.accent,
                        background: s.accentBg, border: `1px solid ${s.accentBorder}`,
                        borderRadius: "6px", padding: "3px 9px",
                        letterSpacing: "0.8px", textTransform: "uppercase",
                      }}>{chip}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        
        <div style={{
          marginTop: "32px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          padding: "14px 24px",
          background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.12)",
          borderRadius: "99px",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}` }}/>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", fontWeight: 700, color: C.green, letterSpacing: "1.5px" }}>
            YOUR DATA IS PROTECTED · NO ADS · NO SELLING
          </span>
        </div>
      </div>
    </div>
  );
}