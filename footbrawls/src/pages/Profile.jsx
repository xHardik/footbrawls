import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/user";
import { COUNTRIES } from "../lib/countries";

const C = {
  bg:       "#05080f",
  bg2:      "#0b0f1c",
  card:     "rgba(255,255,255,0.04)",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.14)",
  gold:     "#F7C344",
  goldGlow: "rgba(247,195,68,0.25)",
  green:    "#3DD68C",
  red:      "#E84040",
  blue:     "#4F8EF7",
  text:     "#F2F2F4",
  muted:    "rgba(242,242,244,0.45)",
  muted2:   "rgba(242,242,244,0.22)",
};

const TIERS = [
  { name: "lurker",  min: 0,    color: C.muted,   label: "LURKER",  icon: "👤" },
  { name: "fan",     min: 50,   color: "#3b82f6", label: "FAN",     icon: "⚡" },
  { name: "veteran", min: 200,  color: C.green,   label: "VETERAN", icon: "🛡️" },
  { name: "ultra",   min: 500,  color: C.gold,    label: "ULTRA",   icon: "⭐" },
  { name: "legend",  min: 9999, color: "#a855f7", label: "LEGEND",  icon: "👑" },
];

function getTier(xp = 0) {
  return [...TIERS].reverse().find(t => xp >= t.min) || TIERS[0];
}

const KIT_COLORS = {
  FR: { shirt: "#0a26b1", shirtDark: "#061880", shorts: "#0a26b1", shortsDark: "#061880", socks: "#e1000f", flag: "🇫🇷", name: "FRANCE" },
  BR: { shirt: "#ffdf00", shirtDark: "#d4b800", shorts: "#002776", shortsDark: "#001655", socks: "#009b3a", flag: "🇧🇷", name: "BRAZIL" },
  AR: { shirt: "#74acdf", shirtDark: "#4e8ec7", shorts: "#0a0a2e", shortsDark: "#050518", socks: "#74acdf", flag: "🇦🇷", name: "ARGENTINA" },
  DE: { shirt: "#ffffff", shirtDark: "#d8d8d8", shorts: "#1a1a1a", shortsDark: "#000000", socks: "#ffffff", flag: "🇩🇪", name: "GERMANY" },
  IT: { shirt: "#003f8a", shirtDark: "#002d63", shorts: "#ffffff", shortsDark: "#e0e0e0", socks: "#003f8a", flag: "🇮🇹", name: "ITALY" },
  ES: { shirt: "#c1121f", shirtDark: "#8f0c16", shorts: "#c1121f", shortsDark: "#8f0c16", socks: "#ffdf00", flag: "🇪🇸", name: "SPAIN" },
  GB: { shirt: "#ffffff", shirtDark: "#e0e0e0", shorts: "#0a26b1", shortsDark: "#061880", socks: "#ffffff", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "ENGLAND" },
  US: { shirt: "#ffffff", shirtDark: "#e0e0e0", shorts: "#002776", shortsDark: "#001655", socks: "#bf0a30", flag: "🇺🇸", name: "USA" },
};

function getIsoCode(flag) {
  if (!flag) return "fr";
  const pts = [...flag].map(c => c.codePointAt(0));
  if (pts[0] === 0x1f3f4) {
    const s = pts.slice(1,-1).map(p => String.fromCharCode(p - 0xe0000)).join('');
    return s === 'gbeng' ? 'gb-eng' : s === 'gbsct' ? 'gb-sct' : s === 'gbwls' ? 'gb-wls' : s;
  }
  return pts.map(p => String.fromCharCode(p - 127397)).join('').toLowerCase();
}

/* ── PLAYER CARD ── */
function PlayerCard({ kit, user, tier }) {
  const ref = useRef(null);
  const onMove = e => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -20;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 20;
    ref.current.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.03,1.03,1.03)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = "perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)"; };

  const ovr = Math.min(99, Math.floor((user?.totalXP || 0) / 100) + 50);
  const flagUrl = `https://flagcdn.com/w320/${getIsoCode(kit.flag)}.png`;
  const ub = user?.xpBreakdown || {};
  const calcStat = (xp, max) => Math.min(99, 50 + Math.floor(Math.sqrt(xp) * (49 / Math.sqrt(max))));
  const stats = [
    { l: "PAC", v: calcStat(ub.games || 0, 10000) },
    { l: "DRI", v: calcStat(ub.predictor || 0, 15000) },
    { l: "SHO", v: calcStat(ub.raids || 0, 20000) },
    { l: "DEF", v: calcStat(ub.trivia || 0, 10000) },
    { l: "PAS", v: calcStat(ub.social || 0, 5000) },
    { l: "PHY", v: calcStat(user?.totalXP || 0, 50000) },
  ];

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{
      width: 240, height: 360,
      transition: "transform 0.12s ease-out",
      cursor: "pointer",
      position: "relative",
      filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.6))",
    }}>
      {/* Card shape */}
      <div style={{
        position: "absolute", inset: 0,
        clipPath: "polygon(8% 0, 92% 0, 100% 6%, 100% 93%, 50% 100%, 0 93%, 0 6%)",
        background: "#080c18",
        overflow: "hidden",
      }}>
        {/* Flag bg */}
        <img src={flagUrl} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.55 }} />
        {/* Gradient overlay */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(5,8,15,0.15) 0%, rgba(5,8,15,0.92) 60%)" }} />
        {/* Shimmer */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(130deg, rgba(255,255,255,0.18) 0%, transparent 45%)", pointerEvents:"none" }} />

        {/* Content */}
        <div style={{ position:"relative", zIndex:2, height:"100%", display:"flex", flexDirection:"column", padding:"18px 16px 16px" }}>
          {/* OVR */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:38, lineHeight:1, color:tier.color, textShadow:`0 0 20px ${tier.color}66` }}>{ovr}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", fontFamily:"'Space Mono',monospace", marginTop:2 }}>ST</div>
            </div>
            <div style={{ fontSize:20, lineHeight:1 }}>{tier.icon}</div>
          </div>

          <div style={{ flex:1 }} />

          {/* Name */}
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:22, letterSpacing:1.5, color:"#fff", textShadow:"0 2px 8px rgba(0,0,0,0.8)", marginBottom:2 }}>
            {(user?.nickname || "GUEST").slice(0,10)}
          </div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", fontFamily:"'Space Mono',monospace", letterSpacing:2, marginBottom:12 }}>
            {kit.name}
          </div>

          {/* Divider */}
          <div style={{ height:0.5, background:"rgba(255,255,255,0.15)", marginBottom:12 }} />

          {/* Stats grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px" }}>
            {stats.map(s => (
              <div key={s.l} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:16, fontFamily:"'Orbitron',sans-serif", color:"#fff", textShadow:"0 1px 3px rgba(0,0,0,0.8)", lineHeight:1 }}>{s.v}</span>
                <span style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,0.55)" }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── XP BAR ── */
function XPBar({ label, xp, max, color }) {
  const pct = Math.min(100, (xp / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:11, color:C.muted, fontFamily:"'Space Mono',monospace" }}>{label}</span>
        <span style={{ fontSize:11, color:color, fontFamily:"'Space Mono',monospace", fontWeight:700 }}>{xp} XP</span>
      </div>
      <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:2, transition:"width 1s ease", boxShadow:`0 0 8px ${color}66` }} />
      </div>
    </div>
  );
}

/* ── ICONS ── */
const Icon = {
  Ball:   ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={c} strokeWidth="1.5"/><path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill={c} opacity="0.7"/><path d="M2 12h4l2 3-2 3H2M22 12h-4l-2 3 2 3h4" stroke={c} strokeWidth="1.2" fill="none" opacity="0.6"/><path d="M5 5.5l3 2.5 1 4-4-2-1.5-4zM19 5.5l-3 2.5-1 4 4-2 1.5-4zM8 19l1-4 3-1 3 1 1 4" stroke={c} strokeWidth="1.2" fill="none" opacity="0.6"/></svg>,
  Shield: ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Swords: ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 3l10 10M13 3l8 8-4 4-8-8V3h4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><path d="M3 13l8 8 4-4-8-8" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><path d="M13.5 20.5l-2 2M20.5 13.5l2-2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Rank:   ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 20h18" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M7 20V10M12 20V4M17 20V14" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/></svg>,
  Person: ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="4" stroke={c} strokeWidth="1.5"/><path d="M4 21v-1a8 8 0 0116 0v1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Fire:   ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2C8 6 6 9 6 13C6 17 9 21 12 21C15 21 18 17 18 13C18 9 16 6 12 2Z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 11C12 11 13 13 13 15C13 17 12 18 12 18C12 18 10.5 17 10.5 14C10.5 11 12 11 12 11Z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Target: ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke={c} strokeWidth="1.5"/><circle cx="12" cy="12" r="1.5" fill={c}/></svg>,
  Brain:  ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 5C7 5 5 7 5 9C5 11 6.5 12.5 8 13.5V17C8 18 9 19 10.5 19H13.5C15 19 16 18 16 17V13.5C17.5 12.5 19 11 19 9C19 7 17 5 15 5C14.5 5 14 5.2 13.5 5.5C13 4.5 12 4 12 4C12 4 11 4.5 10.5 5.5C10 5.2 9.5 5 9 5Z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Crown:  ({s=18,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 19L5 8L9 11L12 5L15 11L19 8L20 19H4Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
};

/* ── MAIN COMPONENT ── */
export default function Profile() {
  const navigate = useNavigate();
  const user = getUser();

  const countryCode = user?.homeCountry || "FR";
  const countryObj = COUNTRIES.find(c => c.code === countryCode) || { name: "FRANCE", flag: "🇫🇷" };
  const kit = KIT_COLORS[countryCode] || { ...KIT_COLORS.FR, flag: countryObj.flag, name: countryObj.name.toUpperCase() };
  const tier = getTier(user?.totalXP || 0);

  const userBreakdown = user?.xpBreakdown || {};
  const totalBreakdownXP = Object.values(userBreakdown).reduce((a, b) => a + b, 0);
  const totalXP = user?.totalXP || 0;

  const ALL_CATEGORIES = [
    { key: "raids", label: "Guild Raids", color: "#3b82f6" },
    { key: "matchpredictor", label: "Match Predictor", color: "#3DD68C" },
    { key: "dailytrivia", label: "Daily Trivia", color: "#F7C344" },
    { key: "dribble", label: "Dribble", color: "#ef4444" },
    { key: "higherlower", label: "Higher Lower", color: "#8b5cf6" },
    { key: "penaltynerve", label: "Penalty Nerve", color: "#f97316" },
    { key: "top10", label: "Top 10", color: "#06b6d4" },
    { key: "transfertrail", label: "Transfer Trail", color: "#ec4899" },
    { key: "whoareya", label: "Who Are Ya", color: "#84cc16" },
    { key: "wordle", label: "Wordle", color: "#14b8a6" },
    { key: "social", label: "Social & Bonuses", color: "#64748b" },
    { key: "games", label: "Legacy Games", color: "#a8a29e" },
    { key: "other", label: "Other", color: "#78716c" },
    { key: "predictor", label: "Legacy Predictor", color: "#3DD68C" },
    { key: "trivia", label: "Legacy Trivia", color: "#F7C344" },
  ];

  const statsBreakdown = ALL_CATEGORIES.map(item => {
    const xp = userBreakdown[item.key] || 0;
    const percent = totalBreakdownXP > 0 ? (xp / totalBreakdownXP) * 100 : 0;
    return { ...item, xp, percent };
  }).filter(item => item.xp > 0).sort((a, b) => b.xp - a.xp);

  let currentPct = 0;
  const conicStops = statsBreakdown.map(stat => {
    if (stat.percent === 0) return null;
    const start = currentPct;
    currentPct += stat.percent;
    return `${stat.color} ${start}% ${currentPct}%`;
  }).filter(Boolean).join(", ");
  
  const hasData = currentPct > 0;

  const achievements = [
    { id: "strikerHero",      title: "Striker Hero",    desc: "1,000 XP in 24 hours",            icon: Icon.Fire,   xp: user?.dailyXP||0,                                max: 1000  },
    { id: "dedicatedAthlete", title: "Dedicated Player",desc: "15 consecutive days",              icon: Icon.Shield, xp: user?.stats?.consecutiveDaysPlayed||0,           max: 15    },
    { id: "oracle",           title: "Oracle",          desc: "5-match prediction streak",        icon: Icon.Target, xp: user?.predictionStreak||0,                       max: 5     },
    { id: "triviaGod",        title: "Trivia God",      desc: "100 trivia correct",               icon: Icon.Brain,  xp: user?.stats?.totalTriviaCorrect||0,              max: 100   },
    { id: "consulMvp",        title: "Consul MVP",      desc: "50 Raid MVPs",                     icon: Icon.Crown,  xp: user?.stats?.raidMvpCount||0,                   max: 50    },
    { id: "guildWarlord",     title: "Guild Warlord",   desc: "100k total raid damage",           icon: Icon.Swords, xp: Math.floor((user?.stats?.totalRaidDamage||0)/1000), max: 100 },
  ].map(a => ({ ...a, unlocked: !!(user?.achievements?.[a.id]) }));

  // Next tier progress
  const tierIdx = TIERS.findIndex(t => t.name === tier.name);
  const nextTier = TIERS[tierIdx + 1];
  const tierPct = nextTier ? Math.min(100, ((totalXP - tier.min) / (nextTier.min - tier.min)) * 100) : 100;

  return (
    <div style={{
      fontFamily: "'Syne', sans-serif",
      backgroundImage: "url(/locker_room_bg.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      color: C.text,
      minHeight: "100vh",
      padding: "72px max(16px, 4vw) 96px",
      boxSizing: "border-box",
      position: "relative",
    }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(5,8,15,0.85)", zIndex:0 }} />

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .profile-col { animation: fadeUp 0.4s ease both; }
        .profile-col:nth-child(2) { animation-delay: 0.1s; }
        @media (max-width: 720px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .profile-col { padding: 0 !important; }
        }
      `}</style>

      <div style={{ position:"relative", zIndex:1, maxWidth:860, margin:"0 auto" }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:12,
            background:"rgba(247,195,68,0.06)", border:`1px solid rgba(247,195,68,0.15)`,
            borderRadius:32, padding:"6px 18px" }}>
            <span style={{ fontSize:14, fontFamily:"'Orbitron',sans-serif", color:C.gold, letterSpacing:2 }}>✦ PROFILE</span>
          </div>
          <h1 style={{ fontFamily:"'Orbitron',sans-serif", fontSize:"clamp(1.6rem,4vw,2.4rem)",
            letterSpacing:2, color:C.text, margin:0 }}>
            {user?.nickname || "Guest Challenger"}
          </h1>
          <p style={{ fontSize:13, color:C.muted, marginTop:6 }}>
            {kit.flag} {kit.name} · <span style={{ color:tier.color }}>{tier.icon} {tier.label}</span>
          </p>
        </div>

        {/* ── TIER PROGRESS BAR ── */}
        <div style={{ maxWidth:500, margin:"0 auto 32px", padding:"16px 20px",
          background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`,
          borderRadius:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12 }}>
            <span style={{ color:tier.color, fontFamily:"'Space Mono',monospace", fontWeight:700 }}>{tier.icon} {tier.label}</span>
            {nextTier
              ? <span style={{ color:C.muted, fontFamily:"'Space Mono',monospace" }}>{totalXP} / {nextTier.min} XP → {nextTier.label}</span>
              : <span style={{ color:C.gold, fontFamily:"'Space Mono',monospace" }}>MAX RANK</span>
            }
          </div>
          <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${tierPct}%`, background:`linear-gradient(90deg, ${tier.color}88, ${tier.color})`,
              borderRadius:3, transition:"width 1.2s ease", boxShadow:`0 0 12px ${tier.color}55` }} />
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="profile-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1.25fr", gap:20 }}>

          {/* LEFT: Card + XP Breakdown */}
          <div className="profile-col" style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Player Card */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`,
              borderRadius:16, padding:24, display:"flex", flexDirection:"column", alignItems:"center" }}>
              <div style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:C.muted,
                letterSpacing:2, marginBottom:20, textTransform:"uppercase" }}>Holographic Card</div>
              <PlayerCard kit={kit} user={user} tier={tier} />
            </div>

            {/* XP Breakdown Pie Chart */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`,
              borderRadius:16, padding:20 }}>
              <div style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:C.gold,
                letterSpacing:2, marginBottom:20, textTransform:"uppercase" }}>📊 XP Breakdown</div>
              
              {hasData ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
                  <div style={{
                    width: 140, height: 140, borderRadius: "50%",
                    background: `conic-gradient(${conicStops})`,
                    boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                    position: "relative"
                  }}>
                    <div style={{
                      position: "absolute", inset: 12, background: "#05080f",
                      borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Orbitron',sans-serif", fontSize: 18, color: C.text, fontWeight: 700
                    }}>
                      XP
                    </div>
                  </div>
                  
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                    {statsBreakdown.map(stat => (
                      <div key={stat.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: stat.color }} />
                          <span style={{ color: C.muted }}>{stat.label}</span>
                        </div>
                        <div style={{ fontFamily: "'Space Mono',monospace", color: C.text, fontWeight: 700 }}>
                          {stat.xp}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize:12, color:C.muted, textAlign:"center", margin:"8px 0 0" }}>
                  Play games to earn XP
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: Stats + Achievements */}
          <div className="profile-col" style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Quick Stats */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`,
              borderRadius:16, padding:20 }}>
              <div style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:C.gold,
                letterSpacing:2, marginBottom:16, textTransform:"uppercase" }}>⚡ Quick Stats</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { label:"Total XP",       value: totalXP,                              color: C.gold  },
                  { label:"Prediction Streak", value: user?.predictionStreak||0,         color: C.green },
                  { label:"Trivia Correct", value: user?.stats?.totalTriviaCorrect||0,   color: C.blue  },
                  { label:"Raid MVPs",      value: user?.stats?.raidMvpCount||0,         color: "#a855f7" },
                ].map((s,i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`,
                    borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:22,
                      color:s.color, textShadow:`0 0 12px ${s.color}55` }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`,
              borderRadius:16, padding:20 }}>
              <div style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:C.gold,
                letterSpacing:2, marginBottom:16, textTransform:"uppercase" }}>🏆 Trophies & Milestones</div>

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {achievements.map((a, i) => {
                  const pct = Math.min(100, (a.xp / a.max) * 100);
                  const Ic = a.icon;
                  return (
                    <div key={i} style={{
                      padding:"12px 14px",
                      background: a.unlocked ? "rgba(61,214,140,0.05)" : "rgba(255,255,255,0.02)",
                      border:`1px solid ${a.unlocked ? "rgba(61,214,140,0.18)" : C.border}`,
                      borderRadius:12,
                      opacity: a.unlocked ? 1 : 0.55,
                      transition:"opacity 0.2s",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: a.unlocked ? 0 : 8 }}>
                        <Ic s={20} c={a.unlocked ? C.green : C.muted} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700,
                            color:a.unlocked ? C.green : C.text }}>{a.title}</div>
                          <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{a.desc}</div>
                        </div>
                        <div style={{
                          fontSize:10, fontFamily:"'Space Mono',monospace", fontWeight:700,
                          padding:"2px 8px", borderRadius:20,
                          background: a.unlocked ? "rgba(61,214,140,0.12)" : "rgba(255,255,255,0.05)",
                          color: a.unlocked ? C.green : C.muted,
                          whiteSpace:"nowrap",
                        }}>
                          {a.unlocked ? "DONE" : `${a.xp}/${a.max}`}
                        </div>
                      </div>
                      {!a.unlocked && (
                        <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:C.blue,
                            borderRadius:2, transition:"width 1s ease" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      <BottomNav active="profile" navigate={navigate} />
    </div>
  );
}

/* ── BOTTOM NAV ── */
function BottomNav({ active, navigate }) {
  const [pressed, setPressed] = useState(null);
  const items = [
    { id:"home",    label:"Games",  I:Icon.Ball,   route:"/",        color:"#F7C344" },
    { id:"guild",   label:"Guild",  I:Icon.Shield, route:"/guild",   color:"#3DD68C" },
    { id:"raids",   label:"Raids",  I:Icon.Swords, route:"/raid",    color:"#4F8EF7" },
    { id:"ranks",   label:"Ranks",  I:Icon.Rank,   route:"/ranks",   color:"#E84040" },
    { id:"profile", label:"Me",     I:Icon.Person, route:"/profile", color:"#F7C344" },
  ];
  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:200,
      display:"flex",
      background:"rgba(5,8,15,0.98)",
      backdropFilter:"blur(24px)",
      borderTop:`1px solid rgba(255,255,255,0.07)`,
      paddingBottom:"env(safe-area-inset-bottom,0px)",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
        background:"linear-gradient(90deg,transparent,rgba(247,195,68,0.25) 50%,transparent)" }} />
      {items.map(item => {
        const on = item.id === active;
        const pr = pressed === item.id;
        const col = on ? item.color : pr ? "rgba(242,242,244,0.5)" : "rgba(242,242,244,0.22)";
        return (
          <button key={item.id} type="button"
            onPointerDown={() => setPressed(item.id)}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            onClick={() => navigate(item.route)}
            style={{
              flex:1, border:"none", background:"transparent",
              padding:"10px 4px 8px",
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              cursor:"pointer", color:col, position:"relative",
              transition:"color 0.15s, transform 0.1s",
              transform: pr ? "scale(0.88)" : "scale(1)",
              WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
              fontFamily:"'Space Mono',monospace", fontSize:"0.5rem", fontWeight:700,
              letterSpacing:0.8, textTransform:"uppercase",
            }}>
            {on && <>
              <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                width:24, height:2, borderRadius:"0 0 3px 3px", background:item.color,
                boxShadow:`0 0 10px ${item.color}` }} />
              <div style={{ position:"absolute", inset:0,
                background:`radial-gradient(ellipse at 50% 20%, ${item.color}18, transparent 70%)`,
                pointerEvents:"none" }} />
            </>}
            <div style={{
              width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center",
              borderRadius:8, position:"relative",
              background: on ? `${item.color}14` : "transparent",
              border: on ? `1px solid ${item.color}28` : "1px solid transparent",
              transition:"all 0.18s",
            }}>
              <item.I s={18} c={col} />
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}