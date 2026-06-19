// src/pages/ContactUs.jsx
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const C = {
  bg:       "#060810",
  border:   "rgba(255,255,255,0.07)",
  gold:     "#F7C344",
  goldGlow: "rgba(247,195,68,0.28)",
  blue:     "#4F8EF7",
  green:    "#3DD68C",
  discord:  "#5865F2",
  twitter:  "#1DA1F2",
  text:     "#F2F2F4",
  muted:    "rgba(242,242,244,0.5)",
};

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const l = document.createElement("link"); l.id = "fb-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

function injectStyles() {
  if (document.getElementById("fb-contact-css")) return;
  const s = document.createElement("style");
  s.id = "fb-contact-css";
  s.textContent = `
    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 20px;
    }
    @media (max-width: 768px) {
      .contact-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }
    @media (max-width: 640px) {
      .contact-header-title {
        font-size: 3.2rem !important;
        letter-spacing: 3px !important;
      }
      .contact-header-desc {
        font-size: 0.88rem !important;
      }
    }
  `;
  document.head.appendChild(s);
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

const inputStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "10px",
  padding: "11px 14px",
  color: C.text,
  fontFamily: "'Syne', sans-serif",
  fontSize: "0.9rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

export default function ContactUs() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(null);

  useEffect(() => { injectFonts(); injectStyles(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
    setTimeout(() => setSubmitted(false), 4000);
  };

  const focusBorder = "rgba(247,195,68,0.35)";
  const blurBorder = "rgba(255,255,255,0.09)";

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

        {/* Header */}
        <div style={{ marginBottom: "52px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(247,195,68,0.08)", border: "1px solid rgba(247,195,68,0.2)",
            borderRadius: "99px", padding: "5px 14px", marginBottom: "18px",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}` }}/>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: C.gold, letterSpacing: "2px", textTransform: "uppercase" }}>
              Support · Online
            </span>
          </div>
          <h1 className="contact-header-title" style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "4.8rem", letterSpacing: "5px",
            background: "linear-gradient(110deg, #ffe680 0%, #F7C344 50%, #e8a800 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: "0 0 6px 0", lineHeight: 1,
          }}>CONTACT US</h1>
          <p className="contact-header-desc" style={{
            fontFamily: "'Syne', sans-serif", fontSize: "0.95rem",
            color: C.muted, margin: 0, maxWidth: "420px", lineHeight: "1.6",
          }}>Reach the Footbrawls Arena support team. We respond within 24 hours.</p>
        </div>

        {/* Two-col layout */}
        <div className="contact-grid">

          {/* Left: Email + Social */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Email card */}
            <div style={{
              background: "rgba(10,13,24,0.6)", backdropFilter: "blur(24px)",
              border: `1px solid ${C.border}`, borderRadius: "18px",
              padding: "24px 26px",
            }}>
              <div style={{
                width: 40, height: 40,
                background: "rgba(247,195,68,0.08)", border: "1px solid rgba(247,195,68,0.18)",
                borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "14px",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7C344" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M2 7l10 7 10-7"/>
                </svg>
              </div>
              <h2 style={{ color: "#fff", fontSize: "1rem", fontFamily: "'Syne', sans-serif", fontWeight: 800, margin: "0 0 8px 0" }}>
                Email Us
              </h2>
              <p style={{ margin: "0 0 12px 0", fontSize: "0.83rem", color: C.muted, lineHeight: "1.6" }}>
                Questions about guilds, matchmaking, or bugs?
              </p>
              <a
                href="mailto:support@footbrawls.com"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.85rem", color: C.gold,
                  textDecoration: "none", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.75"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                support@footbrawls.com
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </a>
            </div>

            {/* Community card */}
            <div style={{
              background: "rgba(10,13,24,0.6)", backdropFilter: "blur(24px)",
              border: `1px solid ${C.border}`, borderRadius: "18px",
              padding: "24px 26px", flex: 1,
            }}>
              <div style={{
                width: 40, height: 40,
                background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.18)",
                borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "14px",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                </svg>
              </div>
              <h2 style={{ color: "#fff", fontSize: "1rem", fontFamily: "'Syne', sans-serif", fontWeight: 800, margin: "0 0 8px 0" }}>
                Join the Community
              </h2>
              <p style={{ margin: "0 0 16px 0", fontSize: "0.83rem", color: C.muted, lineHeight: "1.6" }}>
                Connect with guild leaders, organise raids, get daily updates.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <a
                  href="https://discord.gg/footbrawls"
                  target="_blank" rel="noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "rgba(88,101,242,0.08)", border: "1px solid rgba(88,101,242,0.22)",
                    borderRadius: "10px", padding: "10px 14px",
                    color: C.discord, textDecoration: "none",
                    fontFamily: "'Space Mono', monospace", fontSize: "0.75rem",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(88,101,242,0.15)"; e.currentTarget.style.borderColor = "rgba(88,101,242,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(88,101,242,0.08)"; e.currentTarget.style.borderColor = "rgba(88,101,242,0.22)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  Discord Server
                </a>
                <a
                  href="https://twitter.com/footbrawls"
                  target="_blank" rel="noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "rgba(29,161,242,0.08)", border: "1px solid rgba(29,161,242,0.22)",
                    borderRadius: "10px", padding: "10px 14px",
                    color: C.twitter, textDecoration: "none",
                    fontFamily: "'Space Mono', monospace", fontSize: "0.75rem",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(29,161,242,0.15)"; e.currentTarget.style.borderColor = "rgba(29,161,242,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(29,161,242,0.08)"; e.currentTarget.style.borderColor = "rgba(29,161,242,0.22)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter / X
                </a>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div style={{
            background: "rgba(10,13,24,0.6)", backdropFilter: "blur(24px)",
            border: `1px solid ${C.border}`, borderRadius: "18px",
            padding: "28px 30px",
          }}>
            <div style={{
              width: 40, height: 40,
              background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.18)",
              borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "14px",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3DD68C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            </div>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontFamily: "'Syne', sans-serif", fontWeight: 800, margin: "0 0 20px 0" }}>
              Send a Message
            </h2>

            {submitted ? (
              <div style={{
                background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.25)",
                borderRadius: "12px", padding: "20px",
                color: C.green, fontFamily: "'Space Mono', monospace",
                fontSize: "0.82rem", fontWeight: 700, textAlign: "center",
                lineHeight: "1.7",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{display:"inline-block",verticalAlign:"middle",marginRight:8,marginBottom:2}}>
                  <circle cx="12" cy="12" r="10" stroke="#3DD68C" strokeWidth="1.8"/>
                  <path d="M8 12l3 3 5-5" stroke="#3DD68C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                MATCH RECEIVED!<br/>
                <span style={{ opacity: 0.65, fontWeight: 400 }}>We'll get back to you soon.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: "rgba(242,242,244,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Your Name</label>
                  <input
                    type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                    style={{ ...inputStyle, borderColor: focused === "name" ? focusBorder : blurBorder }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: "rgba(242,242,244,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Email Address</label>
                  <input
                    type="email" required value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    style={{ ...inputStyle, borderColor: focused === "email" ? focusBorder : blurBorder }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: "rgba(242,242,244,0.3)", letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Message</label>
                  <textarea
                    required rows="5" value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    onFocus={() => setFocused("msg")}
                    onBlur={() => setFocused(null)}
                    style={{ ...inputStyle, borderColor: focused === "msg" ? focusBorder : blurBorder, resize: "vertical" }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(135deg, #F7C344 0%, #e8a800 100%)",
                    border: "none", borderRadius: "10px",
                    color: "#060810", padding: "13px",
                    fontFamily: "'Space Mono', monospace", fontSize: "0.78rem",
                    fontWeight: 700, cursor: "pointer",
                    textTransform: "uppercase", letterSpacing: "1.5px",
                    boxShadow: "0 4px 20px rgba(247,195,68,0.28)",
                    transition: "all 0.2s", marginTop: "4px",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(247,195,68,0.45)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(247,195,68,0.28)"; e.currentTarget.style.transform = "none"; }}
                >
                  Send to Arena
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#060810" style={{display:"inline-block",verticalAlign:"middle",marginLeft:6}}>
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Response time note */}
        <div style={{
          marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          padding: "12px 20px",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{color:"rgba(242,242,244,0.25)",flexShrink:0}}>
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", fontWeight: 700, color: "rgba(242,242,244,0.25)", letterSpacing: "1px" }}>
            Average response time: &lt;24 hours · support@footbrawls.com
          </span>
        </div>
      </div>
    </div>
  );
}