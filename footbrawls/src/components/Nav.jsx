


import { useState, useEffect } from "react";
import { getUser } from "../lib/user";

const C = {
  bg:      "rgba(6,8,16,0.92)",
  surface: "rgba(255,255,255,0.04)",
  border:  "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.07)",
  accent:  "#F7C344",
  green:   "#3DD68C",
  blue:    "#4F8EF7",
  purple:  "#A855F7",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};


const TIERS = [
  { name: "lurker",  min: 0,   color: C.muted,   bg: "rgba(242,242,244,0.05)", label: "LURKER"  },
  { name: "fan",     min: 50,  color: C.blue,    bg: "rgba(79,142,247,0.15)",  label: "FAN"     },
  { name: "veteran", min: 200, color: C.green,   bg: "rgba(61,214,140,0.15)",  label: "VETERAN" },
  { name: "ultra",   min: 500, color: C.accent,  bg: "rgba(247,195,68,0.15)",  label: "ULTRA"   },
  { name: "legend",  min: 9999,color: C.purple,  bg: "rgba(168,85,247,0.15)",  label: "LEGEND"  },
];

function getTier(totalXP = 0) {
  return [...TIERS].reverse().find(t => totalXP >= t.min) || TIERS[0];
}


function getMsUntilMidnightUTC() {
  const now = new Date();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight - now;
}

function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}


const DAILY_CAP = 200;

function XPBar({ dailyXP = 0, tier }) {
  const pct = Math.min(100, (dailyXP / DAILY_CAP) * 100);
  const isFull = dailyXP >= DAILY_CAP;

  return (
    <div style={s.xpWrap}>
      <div style={s.xpTrack}>
        <div
          style={{
            ...s.xpFill,
            width: `${pct}%`,
            background: isFull
              ? `linear-gradient(90deg, ${tier.color}, #ffffff88)`
              : `linear-gradient(90deg, ${tier.color}99, ${tier.color})`,
            boxShadow: isFull ? `0 0 8px ${tier.color}88` : "none",
          }}
        />
      </div>
      <span style={{ ...s.xpLabel, color: isFull ? tier.color : "#4a6080" }}>
        {isFull ? "MAX" : `${dailyXP}/${DAILY_CAP}`}
      </span>
    </div>
  );
}


export default function Nav() {
  const [user, setUser]           = useState(null);
  const [countdown, setCountdown] = useState(getMsUntilMidnightUTC());

  
  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(getMsUntilMidnightUTC());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const tier    = getTier(user?.totalXP);
  const dailyXP = user?.dailyXP || 0;
  const todayKey = new Date().toISOString().split("T")[0];
  const effectiveDailyXP = user?.dailyXPDate === todayKey ? dailyXP : 0;

  return (
    <>
      <style>{NAV_CSS}</style>
      <nav style={s.nav}>
        
        <a href="/" style={s.logo}>
          <span style={s.logoIcon}>⚽</span>
          <span style={s.logoText}>
            foot<span style={s.logoBrawls}>brawls</span>
            <span style={s.logoGg}>.gg</span>
          </span>
        </a>

        
        <div style={s.right}>
          
          <div style={s.countdown} title="Time until daily reset (UTC midnight)">
            <span style={s.countdownIcon}>🕛</span>
            <span style={s.countdownTime}>{formatCountdown(countdown)}</span>
          </div>

          
          {user ? (
            <div style={s.userChip}>
              
              <div style={s.xpSection}>
                <XPBar dailyXP={effectiveDailyXP} tier={tier} />
              </div>

              
              <div style={s.identity}>
                <span style={s.flag}>{user.flag || "🏳️"}</span>
                <span style={s.nickname}>{user.nickname || "Player"}</span>
                <span
                  style={{
                    ...s.tierBadge,
                    color: tier.color,
                    background: tier.bg,
                    border: `1px solid ${tier.color}44`,
                  }}
                >
                  {tier.label}
                </span>
              </div>
            </div>
          ) : (
            <a href="/onboarding" style={s.joinBtn}>
              Join Free →
            </a>
          )}
        </div>
      </nav>
    </>
  );
}


const s = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    height: 56,
    background: C.bg,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: `1px solid ${C.border}`,
  },

  
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    textDecoration: "none",
    flexShrink: 0,
  },
  logoIcon: { fontSize: 20 },
  logoText: {
    fontFamily: "'Barlow Condensed', 'DM Sans', sans-serif",
    fontWeight: 800,
    fontSize: 18,
    color: C.text,
    letterSpacing: 0.5,
    lineHeight: 1,
  },
  logoBrawls: { color: C.green },
  logoGg: { color: C.muted, fontSize: 14 },

  
  right: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  
  countdown: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: C.surface,
    border: `1px solid ${C.border2}`,
    borderRadius: 99,
    padding: "4px 10px",
    cursor: "default",
  },
  countdownIcon: { fontSize: 12 },
  countdownTime: {
    fontFamily: "'Barlow Condensed', monospace",
    fontWeight: 700,
    fontSize: 13,
    color: C.muted,
    letterSpacing: 1,
  },

  
  userChip: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    background: C.surface,
    border: `1px solid ${C.border2}`,
    borderRadius: 12,
    padding: "6px 10px",
    minWidth: 140,
  },

  
  xpSection: { width: "100%" },
  xpWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  xpTrack: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    background: C.border2,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
  },
  xpLabel: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    flexShrink: 0,
    minWidth: 36,
    textAlign: "right",
  },

  
  identity: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  flag: { fontSize: 14, flexShrink: 0 },
  nickname: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    color: C.text,
    maxWidth: 80,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tierBadge: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.2,
    padding: "2px 6px",
    borderRadius: 99,
    flexShrink: 0,
  },

  
  joinBtn: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 0.5,
    color: "#111",
    background: C.green,
    padding: "7px 14px",
    borderRadius: 99,
    textDecoration: "none",
    transition: "filter 0.15s",
  },
};

const NAV_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=DM+Sans:wght@400;700;800&display=swap');

  nav a.footbrawls-join:hover { filter: brightness(1.08); }

  @media (max-width: 400px) {
    .fb-countdown { display: none !important; }
  }
`;