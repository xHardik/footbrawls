import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/user";
import { COUNTRIES } from "../lib/countries";

const C = {
  bg:      "#05080f",
  bg2:     "#080c17",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  gold:    "#F7C344",
  goldGlow:"rgba(247,195,68,0.3)",
  green:   "#3DD68C",
  red:     "#E84040",
  blue:    "#4F8EF7",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};

const TIERS = [
  { name: "lurker",  min: 0,   color: C.muted,   label: "LURKER"  },
  { name: "fan",     min: 50,  color: "#3b82f6", label: "FAN"     },
  { name: "veteran", min: 200, color: C.green,   label: "VETERAN" },
  { name: "ultra",   min: 500, color: C.gold,    label: "ULTRA"   },
  { name: "legend",  min: 9999,color: "#a855f7", label: "LEGEND"  },
];

function getTier(totalXP = 0) {
  return [...TIERS].reverse().find(t => totalXP >= t.min) || TIERS[0];
}

const KIT_COLORS = {
  FR:  { shirt: "#0a26b1", shirtDark: "#061880", shorts: "#0a26b1", shortsDark: "#061880", socks: "#e1000f", pattern: "plain",    flag: "🇫🇷", name: "FRANCE" },
  BR:  { shirt: "#ffdf00", shirtDark: "#d4b800", shorts: "#002776", shortsDark: "#001655", socks: "#009b3a", pattern: "plain",    flag: "🇧🇷", name: "BRAZIL" },
  AR:  { shirt: "#74acdf", shirtDark: "#4e8ec7", shorts: "#0a0a2e", shortsDark: "#050518", socks: "#74acdf", pattern: "stripes", flag: "🇦🇷", name: "ARGENTINA" },
  DE:  { shirt: "#ffffff", shirtDark: "#d8d8d8", shorts: "#1a1a1a", shortsDark: "#000000", socks: "#ffffff", pattern: "plain",    flag: "🇩🇪", name: "GERMANY" },
  IT:  { shirt: "#003f8a", shirtDark: "#002d63", shorts: "#ffffff", shortsDark: "#e0e0e0", socks: "#003f8a", pattern: "plain",    flag: "🇮🇹", name: "ITALY" },
  ES:  { shirt: "#c1121f", shirtDark: "#8f0c16", shorts: "#c1121f", shortsDark: "#8f0c16", socks: "#ffdf00", pattern: "plain",    flag: "🇪🇸", name: "SPAIN" },
  GB:  { shirt: "#ffffff", shirtDark: "#e0e0e0", shorts: "#0a26b1", shortsDark: "#061880", socks: "#ffffff", pattern: "plain",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "ENGLAND" },
  US:  { shirt: "#ffffff", shirtDark: "#e0e0e0", shorts: "#002776", shortsDark: "#001655", socks: "#bf0a30", pattern: "plain",    flag: "🇺🇸", name: "USA" },
};

/* ─────────────────────────────────────────────────────────────
   HOLOGRAPHIC PLAYER CARD
───────────────────────────────────────────────────────────── */
function PlayerCard({ kit, user, tier }) {
  const cardRef = useRef(null);
  
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };
  
  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  const ovr = Math.floor((user?.totalXP || 0) / 100) + 50;
  
  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: 260,
        height: 380,
        borderRadius: 20,
        background: `linear-gradient(135deg, ${kit.shirtDark} 0%, ${kit.shirt} 100%)`,
        border: `2px solid ${kit.shirtDark}`,
        boxShadow: `0 20px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.2)`,
        transition: 'transform 0.15s ease-out',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 20,
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.3) 0%, transparent 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.1) 100%)', pointerEvents: 'none' }} />
      <div style={{ fontSize: 48, marginBottom: 12, marginTop: 10 }}>{kit.flag}</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        {user?.nickname || "GUEST"}
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: '#fff', opacity: 0.9, marginBottom: 24 }}>
        {kit.name} KIT
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '12px 24px', width: '100%', display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "'Space Mono', monospace" }}>OVR</div>
          <div style={{ fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", color: tier.color }}>{ovr > 99 ? 99 : ovr}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "'Space Mono', monospace" }}>POS</div>
          <div style={{ fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", color: '#fff' }}>ST</div>
        </div>
      </div>
    </div>
  );
}

const icons = {
    Ball: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
        <path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill={color} opacity="0.7"/>
        <path d="M2 12h4l2 3-2 3H2" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
        <path d="M22 12h-4l-2 3 2 3h4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
        <path d="M5 5.5l3 2.5 1 4-4-2-1.5-4z" fill={color} opacity="0.6"/>
        <path d="M19 5.5l-3 2.5-1 4 4-2 1.5-4z" fill={color} opacity="0.6"/>
        <path d="M8 19l1-4 3-1 3 1 1 4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
      </svg>
    ),
    Shield: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    Swords: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 3l10 10M13 3l8 8-4 4-8-8V3h4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M3 13l8 8 4-4-8-8" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M13.5 20.5l-2 2M20.5 13.5l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    Rank: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 20h18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 20V10" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <path d="M12 20V4" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M17 20V14" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
      </svg>
    ),
    Person: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5"/>
        <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),

    Fire: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8 6 6 9 6 13C6 17 9 21 12 21C15 21 18 17 18 13C18 9 16 6 12 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 11C12 11 13 13 13 15C13 17 12 18 12 18C12 18 10.5 17 10.5 14C10.5 11 12 11 12 11Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    Target: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="1.5" fill={color}/>
      </svg>
    ),
    Brain: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M9 5C7 5 5 7 5 9C5 11 6.5 12.5 8 13.5V17C8 18 9 19 10.5 19H13.5C15 19 16 18 16 17V13.5C17.5 12.5 19 11 19 9C19 7 17 5 15 5C14.5 5 14 5.2 13.5 5.5C13 4.5 12 4 12 4C12 4 11 4.5 10.5 5.5C10 5.2 9.5 5 9 5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    Crown: ({size=18, color="currentColor"}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 19L5 8L9 11L12 5L15 11L19 8L20 19H4Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    };

export default function Profile() {
  const navigate = useNavigate();
  const user = getUser();

  const countryCode = user?.homeCountry || "FR";
  const kit = KIT_COLORS[countryCode] || KIT_COLORS.FR;
  const countryObj = COUNTRIES.find(c => c.code === countryCode);
  const currentTier = getTier(user?.totalXP || 0);

  const userStats = user?.stats || {};
  const userAchievements = user?.achievements || {};

  const getProgress = (id) => {
    if (userAchievements[id]) return "Completed";
    switch (id) {
      case 'strikerHero': return `${user?.dailyXP || 0} / 1000 XP`;
      case 'dedicatedAthlete': return `${userStats.consecutiveDaysPlayed || 0} / 15 Days`;
      case 'oracle': return `${user?.predictionStreak || 0} / 5 Streak`;
      case 'triviaGod': return `${userStats.totalTriviaCorrect || 0} / 100 Qs`;
      case 'consulMvp': return `${userStats.raidMvpCount || 0} / 50 MVPs`;
      case 'guildWarlord': return `${Math.floor((userStats.totalRaidDamage || 0)/1000)}k / 100k Dmg`;
      default: return "";
    }
  };

  const achievements = [
    { id: "strikerHero",      title: "Striker Hero",      desc: "Accumulate 1,000 XP within a single 24-hour period",  unlocked: !!userAchievements.strikerHero,      IconC: icons.Fire },
    { id: "dedicatedAthlete", title: "Dedicated Athlete", desc: "Play all 9 daily games for 15 consecutive days",      unlocked: !!userAchievements.dedicatedAthlete, IconC: icons.Shield },
    { id: "oracle",           title: "Oracle",            desc: "Maintain a flawless 5-match prediction streak",       unlocked: !!userAchievements.oracle,           IconC: icons.Target },
    { id: "triviaGod",        title: "Trivia God",        desc: "Answer 100 Trivia questions correctly overall",       unlocked: !!userAchievements.triviaGod,        IconC: icons.Brain },
    { id: "consulMvp",        title: "Consul MVP",        desc: "Achieve Raid MVP 50 times in a single season",        unlocked: !!userAchievements.consulMvp,        IconC: icons.Crown },
    { id: "guildWarlord",     title: "Guild Warlord",     desc: "Deal 100,000 Total Raid Damage for your Guild",       unlocked: !!userAchievements.guildWarlord,     IconC: icons.Swords },
  ];

  const userBreakdown = user?.xpBreakdown || {};
  const totalBreakdownXP = Object.values(userBreakdown).reduce((sum, val) => sum + (val || 0), 0);
  
  const statsBreakdown = [
    { key: "raids", label: "Guild Raids", color: "#3b82f6" },
    { key: "predictor", label: "Match Predictor", color: "#3DD68C" },
    { key: "trivia", label: "Daily Trivia", color: "#F7C344" },
    { key: "social", label: "Social & Bonuses", color: "#a855f7" },
    { key: "games", label: "Other Games", color: "#E84040" },
  ].map(item => {
    const xp = userBreakdown[item.key] || 0;
    const percent = totalBreakdownXP > 0 ? (xp / totalBreakdownXP) * 100 : 0;
    return { ...item, xp, percent };
  }).sort((a, b) => b.xp - a.xp); // Sort by highest XP first

  return (
    <div style={{
      fontFamily:   "'Syne', sans-serif",
      backgroundImage: "url(/locker_room_bg.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      color:        C.text,
      minHeight:    "100vh",
      padding:      "24px max(12px, 4vw) 100px",
      boxSizing:    "border-box",
      position:     "relative",
    }}>
      {/* Dark overlay for locker room background */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(5, 8, 15, 0.82)", zIndex: 0 }} />
      
      <div style={{ position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28, position: "relative" }}>
        <img src="/logo.png" alt="Logo" style={{ position: "absolute", top: 0, right: 0, height: 28, filter:`drop-shadow(0 0 8px ${C.gold}40)` }} />
        <h1 style={{
          fontFamily:    "'Bebas Neue', sans-serif",
          fontSize:      "3rem",
          letterSpacing: "3px",
          color:         C.gold,
          margin:        0,
        }}>
          👤 ATHLETE DOSSIER
        </h1>
        <p style={{ fontSize: "0.85rem", color: C.muted, marginTop: 4 }}>
          Inspect your athlete career standings, custom national kit, and unlocked accolades
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr !important;
            padding: 0 4px !important;
          }
        }
      `}</style>
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 1.2fr",
        gap:                 28,
        maxWidth:            820,
        margin:              "0 auto",
      }} className="profile-grid">

        {/* LEFT COLUMN: 3D Jersey Mannequin */}
        <div style={{
          alignSelf:    "start",
          background:   "rgba(25, 28, 38, 0.65)",
          backdropFilter: "blur(12px)",
          border:       `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 18,
          padding:      24,
          textAlign:    "center",
          display:      "flex",
          flexDirection:"column",
          alignItems:   "center",
          position:     "relative",
          boxShadow:    "0 8px 32px rgba(0,0,0,0.3)",
          overflow:     "hidden",
        }}>
          <div style={{
            fontFamily:    "'Space Mono', monospace",
            fontSize:      10,
            color:         C.gold,
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom:  16,
          }}>
            HOLOGRAPHIC PLAYER CARD
          </div>

          <PlayerCard kit={kit} user={user} tier={currentTier} />

          {/* Stats Breakdown */}
          <div style={{ marginTop: 32, width: "100%", textAlign: "left" }}>
            <div style={{
              fontFamily:    "'Space Mono', monospace",
              fontSize:      10,
              color:         C.text,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom:  16,
              textAlign:     "center"
            }}>
              📊 Career XP Breakdown
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {statsBreakdown.map((stat, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#ffffff", fontWeight: 500, marginBottom: 4 }}>
                    <span>{stat.label}</span>
                    <strong style={{ color: "#ffffff" }}>{stat.xp} XP</strong>
                  </div>
                  {/* Progress Bar Background */}
                  <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
                    {/* Progress Fill */}
                    <div style={{
                      width: `${stat.percent}%`,
                      height: "100%",
                      background: stat.color,
                      borderRadius: 4,
                      boxShadow: `0 0 8px ${stat.color}88`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Player Bio & Accolades */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats card */}
          <div style={{
            background:   "rgba(25, 28, 38, 0.65)",
            backdropFilter: "blur(12px)",
            border:       `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 18,
            padding:      20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: 1.5, color: C.text }}>
                {user?.nickname || "Guest Challenger"}
              </h3>
              <span style={{
                fontSize:    10,
                fontWeight:  800,
                color:       currentTier.color,
                background:  `${currentTier.color}15`,
                border:      `1px solid ${currentTier.color}35`,
                padding:     "2px 8px",
                borderRadius:99,
                fontFamily:  "'Space Mono', monospace",
              }}>
                {currentTier.label}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.muted }}>
              <div>Total Standing Career XP: <strong style={{ color: C.gold }}>{user?.totalXP || 0} XP</strong></div>
              <div>Represented Nation: <strong style={{ color: C.text }}>{kit.flag} {countryCode}</strong></div>
            </div>

          </div>

          {/* Achievements */}
          <div style={{
            background:   "rgba(25, 28, 38, 0.65)",
            backdropFilter: "blur(12px)",
            border:       `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 18,
            padding:      20,
          }}>
            <div style={{
              fontFamily:    "'Space Mono', monospace",
              fontSize:      10,
              color:         C.gold,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom:  16,
            }}>
              🏆 Trophies & Milestones
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {achievements.map((ach, idx) => (
                <div key={idx} style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         12,
                  padding:     "10px 14px",
                  background:  ach.unlocked ? "rgba(61,214,140,0.04)" : "rgba(255,255,255,0.01)",
                  border:      `1px solid ${ach.unlocked ? "rgba(61,214,140,0.15)" : C.border}`,
                  borderRadius:12,
                  opacity:     ach.unlocked ? 1 : 0.4,
                }}>
                  <span><ach.IconC size={24} color={ach.unlocked ? C.green : C.muted} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ach.unlocked ? C.green : C.text }}>{ach.title}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{ach.desc}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: ach.unlocked ? C.green : C.muted }}>
                      {ach.unlocked ? "UNLOCKED" : "LOCKED"}
                    </div>
                    {!ach.unlocked && (
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                        {getProgress(ach.id)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>      </div>

      <BottomNav active="profile" navigate={navigate} onUnavailable={() => alert("Coming soon — stay tuned")} />
    </div>
  );
}

function BottomNav({ active, navigate, onUnavailable }) {
  const [pressed, setPressed] = useState(null);

  
  const items = [
    { id: "home",    label: "Games",  IconC: icons.Ball,   route: "/",        color: "#F7C344", glow: "rgba(247,195,68,0.8)",   bgGlow: "rgba(247,195,68,0.1)",   bgRadial: "rgba(247,195,68,0.2)"   },
    { id: "guild",   label: "Guild",  IconC: icons.Shield, route: "/guild",   color: "#3DD68C", glow: "rgba(61,214,140,0.8)",   bgGlow: "rgba(61,214,140,0.1)",   bgRadial: "rgba(61,214,140,0.2)"   },
    { id: "raids",   label: "Raids",  IconC: icons.Swords, route: "/raid",    color: "#3b82f6", glow: "rgba(59,130,246,0.8)",   bgGlow: "rgba(59,130,246,0.1)",   bgRadial: "rgba(59,130,246,0.2)"   },
    { id: "ranks",   label: "Ranks",  IconC: icons.Rank,   route: "/ranks",   color: "#E84040", glow: "rgba(232,64,64,0.8)",    bgGlow: "rgba(232,64,64,0.1)",    bgRadial: "rgba(232,64,64,0.2)"    },
    { id: "profile", label: "Me",     IconC: icons.Person, route: "/profile", color: "#F7C344", glow: "rgba(247,195,68,0.8)",   bgGlow: "rgba(247,195,68,0.1)",   bgRadial: "rgba(247,195,68,0.2)"   },
  ];

  return (
      <nav style={{
      position:       "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
      display:        "flex",
      background:     "rgba(5,8,15,0.97)",
      backdropFilter: "blur(32px) saturate(1.5)",
      borderTop:      `1px solid rgba(255,255,255,0.07)`,
      paddingBottom:  "env(safe-area-inset-bottom,0px)",
      boxShadow:      "0 -1px 0 rgba(255,255,255,0.04),0 -12px 40px rgba(0,0,0,0.7)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(247,195,68,0.15),rgba(247,195,68,0.3) 50%,rgba(247,195,68,0.15),transparent)" }} />
      {items.map(item => {
        const isActive  = item.id === active;
        const isPressed = pressed === item.id;
        const NavIcon   = item.IconC;
        const col       = isActive ? item.color : isPressed ? "rgba(242,242,244,0.6)" : "rgba(242,242,244,0.27)";
        return (
          <button key={item.id} type="button"
            onMouseDown={() => setPressed(item.id)}
            onMouseUp={() => setPressed(null)}
            onMouseLeave={() => setPressed(null)}
            onTouchStart={() => setPressed(item.id)}
            onTouchEnd={() => setPressed(null)}
            onClick={() => item.route ? navigate(item.route) : onUnavailable()}
            style={{
              flex: 1, minWidth: 0, border: "none", background: "transparent",
              padding: "10px 4px 8px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              cursor: "pointer",
              fontFamily: "'Space Mono',monospace", fontSize: "0.45rem", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
              color: col,
              position: "relative", transition: "color 0.15s",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
              transform: isPressed ? "scale(0.88)" : "scale(1)",
            }}
          >
            {isActive && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 2, borderRadius: "0 0 4px 4px", background: item.color, boxShadow: `0 0 12px ${item.glow}` }} />}
            {isActive && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 25%,${item.bgRadial},transparent 70%)`, pointerEvents: "none" }} />}
            <div style={{
              position: "relative", width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8,
              background: isActive ? item.bgGlow : "transparent",
              border: isActive ? `1px solid ${item.color}33` : "1px solid transparent",
              transition: "all 0.18s",
            }}>
              <NavIcon color={col} />
            </div>
            <span style={{ letterSpacing: 0.4, fontSize: "0.55rem" }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}