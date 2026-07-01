import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUser } from "../lib/user";
import { getGuildLevel } from "../lib/guildLevels";


const C = {
  bg:      "#060810",
  surface: "rgba(255,255,255,0.035)",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  accent:  "#F7C344",
  green:   "#3DD68C",
  red:     "#E84040",
  blue:    "#3b82f6",
  purple:  "#a855f7",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};


const PODIUM = [
  { border: "#FFD700", bg: "rgba(247,195,68,0.05)"   },
  { border: "#C0C0C0", bg: "rgba(168,180,192,0.04)"  },
  { border: "#CD7F32", bg: "rgba(205,127,50,0.04)"   },
];


const TIERS = [
  { min: 0,    color: C.muted,    bg: "rgba(242,242,244,0.06)", label: "LURKER",  dot: "○" },
  { min: 50,   color: C.blue,     bg: "rgba(59,130,246,0.1)",   label: "FAN",     dot: "◆" },
  { min: 200,  color: C.green,    bg: "rgba(61,214,140,0.1)",   label: "VETERAN", dot: "▲" },
  { min: 500,  color: C.accent,   bg: "rgba(247,195,68,0.1)",   label: "ULTRA",   dot: "★" },
  { min: 9999, color: C.purple,   bg: "rgba(168,85,247,0.1)",   label: "LEGEND",  dot: "◈" },
];

function getTier(xp = 0) {
  return [...TIERS].reverse().find(t => xp >= t.min) || TIERS[0];
}

function formatXP(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}


const Icons = {
  
  Crown: ({ rank }) => {
    const colors = ["#FFD700", "#C0C0C0", "#CD7F32"];
    const c = colors[rank] ?? C.muted;
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 18h18l-2-8-4 4-3-6-3 6-4-4-2 8z" fill={c} opacity="0.9" />
        <path d="M3 18h18" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="3"  cy="10" r="1.5" fill={c} />
        <circle cx="12" cy="4"  r="1.5" fill={c} />
        <circle cx="21" cy="10" r="1.5" fill={c} />
      </svg>
    );
  },

  Ball: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
      <path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill={color} opacity="0.7" />
      <path d="M2 12h4l2 3-2 3H2" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" />
      <path d="M22 12h-4l-2 3 2 3h4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" />
    </svg>
  ),

  Shield: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Swords: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 3l10 10M13 3l8 8-4 4-8-8V3h4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 13l8 8 4-4-8-8" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13.5 20.5l-2 2M20.5 13.5l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  Rank: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 20h18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 20V10"  stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path d="M12 20V4"  stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 20V14" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  ),

  Person: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5" />
      <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  PersonOutline: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
      <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),

  ShieldSmall: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z"
        stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};


const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

.rk-row-podium {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  position: relative;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  transition: background 0.15s;
}
.rk-row-podium:hover { background: rgba(255,255,255,0.025) !important; }
.rk-row-podium::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
}
.rk-row-podium.rank-1::before { background: linear-gradient(180deg,#FFD700,#F7C344); }
.rk-row-podium.rank-2::before { background: linear-gradient(180deg,#C0C0C0,#A8B4C0); }
.rk-row-podium.rank-3::before { background: linear-gradient(180deg,#CD9F3C,#A07020); }

.rk-row-normal {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.rk-row-normal:hover { background: rgba(255,255,255,0.02); }
.rk-row-normal:last-child { border-bottom: none; }

.rk-rank-num {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rk-rank-index {
  font-family: 'Space Mono', monospace;
  font-size: 0.68rem;
  font-weight: 700;
  color: rgba(242,242,244,0.25);
  letter-spacing: 0;
  width: 100%;
  text-align: center;
}
.rk-crown {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rk-flag {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  line-height: 1;
}
.rk-name-zone {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.rk-name {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.1px;
}
.rk-badge {
  font-family: 'Space Mono', monospace;
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  padding: 2px 7px;
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  text-transform: uppercase;
}
.rk-score {
  flex-shrink: 0;
  text-align: right;
}
.rk-score-primary {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.05rem;
  letter-spacing: 1px;
  color: #F7C344;
  line-height: 1.1;
}
.rk-score-sub {
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  color: rgba(242,242,244,0.28);
  letter-spacing: 0.5px;
  margin-top: 2px;
  text-align: right;
}
.rk-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.rk-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
.rk-divider-label {
  font-family: 'Space Mono', monospace;
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: rgba(242,242,244,0.25);
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .rk-row-podium { padding: 12px 12px !important; gap: 8px !important; }
  .rk-row-normal  { padding: 11px 12px !important; gap: 8px !important; }
  .rk-badge       { display: none !important; }
  .rk-name        { font-size: 0.78rem !important; }
  .rk-score-primary { font-size: 0.9rem !important; }
}
`;



function SectionDivider({ label }) {
  return (
    <div className="rk-divider">
      <div className="rk-divider-line" />
      <span className="rk-divider-label">{label}</span>
      <div className="rk-divider-line" />
    </div>
  );
}

function TierBadge({ tier }) {
  return (
    <span
      className="rk-badge"
      style={{
        color: tier.color,
        background: tier.bg,
        border: `1px solid ${tier.color}30`,
      }}
    >
      {tier.dot} {tier.label}
    </span>
  );
}

function GuildBadge({ lvlConfig }) {
  return (
    <span
      className="rk-badge"
      style={{
        color: lvlConfig.color,
        background: `${lvlConfig.color}18`,
        border: `1px solid ${lvlConfig.color}30`,
      }}
    >
      {lvlConfig.emoji} {lvlConfig.name.toUpperCase()}
    </span>
  );
}


function PodiumRow({ item, rank, isLast, renderBadge, renderScore }) {
  const pc = PODIUM[rank];
  return (
    <div
      className={`rk-row-podium rank-${rank + 1}`}
      style={{
        background: pc.bg,
        borderBottom: isLast ? "none" : undefined,
      }}
    >
      <div className="rk-crown">
        <Icons.Crown rank={rank} />
      </div>
      <div className="rk-flag">{item.flag || "🏳️"}</div>
      <div className="rk-name-zone">
        <span className="rk-name" style={{ color: item.nameColor || C.text }}>
          {item.name}{item.suffix ? ` · ${item.suffix}` : ""}
        </span>
        {renderBadge(item)}
      </div>
      <div className="rk-score">
        {renderScore(item, rank)}
      </div>
    </div>
  );
}


function NormalRow({ item, rank, isLast, renderBadge, renderScore }) {
  return (
    <div
      className="rk-row-normal"
      style={{ borderBottom: isLast ? "none" : undefined }}
    >
      <div className="rk-rank-num">
        <span className="rk-rank-index">{rank + 1}</span>
      </div>
      <div className="rk-flag">{item.flag || "🏳️"}</div>
      <div className="rk-name-zone">
        <span className="rk-name" style={{ color: item.nameColor || C.text }}>
          {item.name}{item.suffix ? ` · ${item.suffix}` : ""}
        </span>
        {renderBadge(item)}
      </div>
      <div className="rk-score">
        {renderScore(item, rank)}
      </div>
    </div>
  );
}


function IndividualsList({ users, currentUser }) {
  if (!users.length) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
        No players ranked yet
      </div>
    );
  }

  return users.map((u, i) => {
    const tier = getTier(u.totalXP);
    const isMe = u.userId === currentUser?.userId;

    const item = {
      flag: u.flag,
      name: u.nickname,
      suffix: isMe ? "You" : null,
      nameColor: isMe ? C.green : C.text,
    };

    const renderBadge = () => <TierBadge tier={tier} />;

    const renderScore = (_, rank) => (
      <>
        <div className="rk-score-primary">{formatXP(u.totalXP)} XP</div>
        {rank < 3 && (
          <div className="rk-score-sub">Rank #{rank + 1}</div>
        )}
      </>
    );

    if (i === 3) {
      return (
        <div key={u.userId || i}>
          <SectionDivider label="Contenders" />
          <NormalRow
            item={item}
            rank={i}
            isLast={i === users.length - 1}
            renderBadge={renderBadge}
            renderScore={renderScore}
          />
        </div>
      );
    }

    const RowComponent = i < 3 ? PodiumRow : NormalRow;
    return (
      <RowComponent
        key={u.userId || i}
        item={item}
        rank={i}
        isLast={i === users.length - 1}
        renderBadge={renderBadge}
        renderScore={renderScore}
      />
    );
  });
}


function GuildsList({ guilds, currentUser }) {
  if (!guilds.length) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
        No guilds ranked yet
      </div>
    );
  }

  return guilds.map((g, i) => {
    const lvl = g.guildLevel || 1;
    const lvlConfig = getGuildLevel(lvl);
    const isMyGuild = g.code === currentUser?.homeCountry;

    const item = {
      flag: g.flag,
      name: g.name,
      suffix: isMyGuild ? "Yours" : null,
      nameColor: isMyGuild ? C.accent : C.text,
    };

    const renderBadge = () => <GuildBadge lvlConfig={lvlConfig} />;

    const renderScore = (_, rank) => (
      <>
        <div className="rk-score-primary">LVL {lvl}</div>
        <div className="rk-score-sub">{(g.castleHP ?? 0).toLocaleString()} HP</div>
      </>
    );

    if (i === 3) {
      return (
        <div key={g.code || i}>
          <SectionDivider label="Challengers" />
          <NormalRow
            item={item}
            rank={i}
            isLast={i === guilds.length - 1}
            renderBadge={renderBadge}
            renderScore={renderScore}
          />
        </div>
      );
    }

    const RowComponent = i < 3 ? PodiumRow : NormalRow;
    return (
      <RowComponent
        key={g.code || i}
        item={item}
        rank={i}
        isLast={i === guilds.length - 1}
        renderBadge={renderBadge}
        renderScore={renderScore}
      />
    );
  });
}


const NAV_ITEMS = [
  { id: "home",    label: "Games",  route: "/",        color: "#F7C344", Icon: Icons.Ball    },
  { id: "guild",   label: "Guild",  route: "/guild",   color: "#3DD68C", Icon: Icons.Shield  },
  { id: "raids",   label: "Raids",  route: "/raid",    color: "#3b82f6", Icon: Icons.Swords  },
  { id: "ranks",   label: "Ranks",  route: "/ranks",   color: "#E84040", Icon: Icons.Rank    },
  { id: "profile", label: "Me",     route: "/profile", color: "#F7C344", Icon: Icons.Person  },
];

function BottomNav({ active, navigate, onUnavailable }) {
  const [pressed, setPressed] = useState(null);

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
      display: "flex",
      background: "rgba(5,8,15,0.97)",
      backdropFilter: "blur(32px) saturate(1.5)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      paddingBottom: "env(safe-area-inset-bottom,0px)",
      boxShadow: "0 -12px 40px rgba(0,0,0,0.7)",
    }}>
      
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg,transparent,rgba(247,195,68,0.15) 30%,rgba(247,195,68,0.35) 50%,rgba(247,195,68,0.15) 70%,transparent)",
      }} />

      {NAV_ITEMS.map(item => {
        const isActive  = item.id === active;
        const isPressed = pressed === item.id;
        const iconColor = isActive
          ? item.color
          : isPressed
          ? "rgba(242,242,244,0.6)"
          : "rgba(242,242,244,0.27)";

        return (
          <button
            key={item.id}
            type="button"
            onMouseDown={() => setPressed(item.id)}
            onMouseUp={() => setPressed(null)}
            onMouseLeave={() => setPressed(null)}
            onTouchStart={() => setPressed(item.id)}
            onTouchEnd={() => setPressed(null)}
            onClick={() => item.route ? navigate(item.route) : onUnavailable?.()}
            style={{
              flex: 1, minWidth: 0,
              border: "none",
              background: "transparent",
              padding: "10px 4px 8px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.48rem",
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: isActive ? item.color : isPressed ? "rgba(242,242,244,0.65)" : "rgba(242,242,244,0.27)",
              position: "relative",
              transition: "color 0.15s",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              transform: isPressed ? "scale(0.88)" : "scale(1)",
            }}
          >
            
            {isActive && (
              <div style={{
                position: "absolute", top: 0, left: "50%",
                transform: "translateX(-50%)",
                width: 28, height: 2,
                borderRadius: "0 0 4px 4px",
                background: item.color,
                boxShadow: `0 0 12px ${item.color}cc`,
              }} />
            )}
            
            {isActive && (
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(ellipse at 50% 20%,${item.color}20,transparent 70%)`,
                pointerEvents: "none",
              }} />
            )}

            
            <div style={{
              position: "relative",
              width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8,
              background: isActive ? `${item.color}18` : "transparent",
              border: isActive ? `1px solid ${item.color}33` : "1px solid transparent",
              transition: "all 0.18s",
            }}>
              <item.Icon color={iconColor} />
            </div>

            <span style={{ letterSpacing: 0.4, fontSize: "0.5rem" }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}


export default function Ranks() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("individuals"); 
  const [users, setUsers] = useState([]);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getUser();

  
  useEffect(() => {
    if (!document.getElementById("rk-styles")) {
      const s = document.createElement("style");
      s.id = "rk-styles";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  
  useEffect(() => {
    setLoading(true);

    
    const usersQuery = query(
      collection(db, "users"),
      orderBy("totalXP", "desc"),
      limit(250)
    );

    const unsubUsers = onSnapshot(usersQuery, snap => {
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .slice(0, 50);
      setUsers(list);
    });

    
    const unsubGuilds = onSnapshot(query(collection(db, "guilds")), snap => {
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const lvDiff = (b.guildLevel || 1) - (a.guildLevel || 1);
          return lvDiff !== 0 ? lvDiff : (b.castleHP || 0) - (a.castleHP || 0);
        })
        .slice(0, 50);
      setGuilds(list);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubGuilds();
    };
  }, []);

  return (
    <div style={{
      fontFamily: "'Syne', sans-serif",
      background: C.bg,
      color: C.text,
      minHeight: "100vh",
      padding: "28px max(12px, 4vw) 100px",
      boxSizing: "border-box",
    }}>
      
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 1, pointerEvents: "none",
        background: "linear-gradient(90deg,transparent,rgba(247,195,68,0.12),transparent)",
      }} />

      
      <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.6rem",
          letterSpacing: "3px",
          color: C.accent,
          textTransform: "uppercase",
          marginBottom: 8,
          opacity: 0.8,
        }}>
          Season 3 · Live Rankings
        </div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(2.2rem, 6vw, 3.4rem)",
          letterSpacing: "4px",
          color: C.text,
          margin: 0,
          lineHeight: 1,
          marginBottom: 6,
        }}>
          Global{" "}
          <span style={{ color: C.accent }}>Leaderboards</span>
        </h1>
        <p style={{ fontSize: "0.75rem", color: C.muted, letterSpacing: "0.3px" }}>
          Compete against active players and rival country guilds worldwide
        </p>
      </div>

      
      <div style={{
        display: "flex",
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 4,
        maxWidth: 420,
        margin: "0 auto 28px",
      }}>
        {[
          { id: "individuals", label: "Top Players", Icon: Icons.PersonOutline },
          { id: "guilds",      label: "Top Guilds",  Icon: Icons.ShieldSmall   },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: tab === t.id ? "rgba(247,195,68,0.1)" : "transparent",
              border: tab === t.id ? `1px solid rgba(247,195,68,0.2)` : "1px solid transparent",
              borderRadius: 10,
              color: tab === t.id ? C.accent : C.muted,
              padding: "10px 12px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.18s",
              fontFamily: "'Syne', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              letterSpacing: "0.3px",
            }}
          >
            <t.Icon color={tab === t.id ? C.accent : C.muted} />
            {t.label}
          </button>
        ))}
      </div>

      
      <div style={{
        background: "rgba(255,255,255,0.015)",
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        overflow: "hidden",
        maxWidth: 680,
        margin: "0 auto",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}>
        {loading ? (
          <div style={{
            padding: "56px 0",
            textAlign: "center",
            color: C.muted,
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.75rem",
            letterSpacing: "2px",
          }}>
            ⚡ LOADING STANDINGS...
          </div>
        ) : tab === "individuals" ? (
          <IndividualsList users={users} currentUser={currentUser} />
        ) : (
          <GuildsList guilds={guilds} currentUser={currentUser} />
        )}
      </div>

      <BottomNav
        active="ranks"
        navigate={navigate}
        onUnavailable={() => alert("Coming soon — stay tuned")}
      />
    </div>
  );
}