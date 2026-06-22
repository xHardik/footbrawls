import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUser } from "../lib/user";
import { getGuildLevel } from "../lib/guildLevels";

const C = {
  bg:      "#060810",
  surface: "rgba(255,255,255,0.04)",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  accent:  "#F7C344",
  green:   "#3DD68C",
  red:     "#E84040",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};

const TIERS = [
  { name: "lurker",  min: 0,   color: C.muted,   label: "LURKER"  },
  { name: "fan",     min: 50,  color: "#3b82f6", label: "FAN"     },
  { name: "veteran", min: 200, color: C.green,   label: "VETERAN" },
  { name: "ultra",   min: 500, color: C.accent,  label: "ULTRA"   },
  { name: "legend",  min: 9999,color: "#a855f7", label: "LEGEND"  },
];

function getTier(totalXP = 0) {
  return [...TIERS].reverse().find(t => totalXP >= t.min) || TIERS[0];
}

export default function Ranks() {
  const [tab, setTab] = useState("individuals"); // "individuals" | "guilds"
  const [users, setUsers] = useState([]);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getUser();

  // Load Leaderboards
  useEffect(() => {
    setLoading(true);
    
    // 1. Query Top 50 Users
    const usersQuery = query(
      collection(db, "users"),
      orderBy("totalXP", "desc"),
      limit(50)
    );
    
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      const userList = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    });

    // 2. Query Guilds (all of them, then sort & slice top 50 in JS to avoid index requirement)
    const guildsQuery = query(collection(db, "guilds"));
    const unsubGuilds = onSnapshot(guildsQuery, (snap) => {
      const guildList = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        const levelA = a.guildLevel || 1;
        const levelB = b.guildLevel || 1;
        if (levelB !== levelA) return levelB - levelA;
        return (b.castleHP || 0) - (a.castleHP || 0);
      })
      .slice(0, 50);
      
      setGuilds(guildList);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubGuilds();
    };
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{
      fontFamily: "'Syne', sans-serif",
      background: C.bg,
      color: C.text,
      minHeight: "100vh",
      padding: "24px max(16px, 4vw) 100px",
      boxSizing: "border-box",
    }}>
      {/* Decorative Background Glows */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(247,195,68,0.1), transparent)" }} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "3rem",
          letterSpacing: "3px",
          color: C.accent,
          margin: 0,
          textShadow: "0 0 15px rgba(247, 195, 68, 0.15)"
        }}>
          🏆 GLOBAL LEADERBOARDS
        </h1>
        <p style={{ fontSize: "0.85rem", color: C.muted, marginTop: 4 }}>
          Compare performance and rank against active players and rival country guilds
        </p>
      </div>

      {/* Switcher Tab Bar */}
      <div style={{
        display: "flex",
        background: "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 4,
        marginBottom: 24,
        maxWidth: 450,
        margin: "0 auto 24px",
      }}>
        <button
          onClick={() => setTab("individuals")}
          style={{
            flex: 1,
            background: tab === "individuals" ? C.surface : "transparent",
            border: "none",
            borderRadius: 10,
            color: tab === "individuals" ? C.accent : C.muted,
            padding: "10px 16px",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "'Syne', sans-serif"
          }}
        >
          👤 Top Players
        </button>
        <button
          onClick={() => setTab("guilds")}
          style={{
            flex: 1,
            background: tab === "guilds" ? C.surface : "transparent",
            border: "none",
            borderRadius: 10,
            color: tab === "guilds" ? C.accent : C.muted,
            padding: "10px 16px",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "'Syne', sans-serif"
          }}
        >
          🏰 Top Guilds
        </button>
      </div>

      {/* Leaderboard Table Container */}
      <div style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        overflow: "hidden",
        maxWidth: 680,
        margin: "0 auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
      }}>
        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: C.muted, fontFamily: "'Space Mono', monospace", fontSize: "0.8rem" }}>
            ⚡ LOADING STANDINGS...
          </div>
        ) : tab === "individuals" ? (
          /* INDIVIDUALS LIST */
          users.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>No players ranked yet</div>
          ) : (
            users.map((m, i) => {
              const tier = getTier(m.totalXP);
              const isMe = m.userId === currentUser?.userId;
              return (
                <div
                  key={m.userId || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 18px",
                    borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : "none",
                    background: isMe ? "rgba(61,214,140,0.06)" : "transparent",
                    transition: "background 0.2s"
                  }}
                >
                  <span style={{
                    fontSize: i < 3 ? 20 : 13,
                    width: 28,
                    textAlign: "center",
                    flexShrink: 0,
                    fontFamily: "'Bebas Neue', sans-serif",
                    color: C.accent,
                    letterSpacing: 1
                  }}>
                    {i < 3 ? medals[i] : i + 1}
                  </span>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{m.flag || "🏳️"}</span>
                  <span style={{
                    flex: 1,
                    fontSize: "0.85rem",
                    fontWeight: isMe ? 800 : 600,
                    color: isMe ? C.green : C.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {m.nickname} {isMe && "(you)"}
                  </span>
                  <span style={{
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 99,
                    color: tier.color,
                    background: `${tier.color}15`,
                    border: `1px solid ${tier.color}35`,
                    fontFamily: "'Space Mono', monospace",
                    flexShrink: 0,
                    letterSpacing: 0.5
                  }}>
                    {tier.label}
                  </span>
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "1.15rem",
                    color: C.accent,
                    flexShrink: 0,
                    letterSpacing: 1,
                    marginLeft: 8
                  }}>
                    {m.totalXP ?? 0} XP
                  </span>
                </div>
              );
            })
          )
        ) : (
          /* GUILDS LIST */
          guilds.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>No guilds ranked yet</div>
          ) : (
            guilds.map((g, i) => {
              const lvl = g.guildLevel || 1;
              const lvlConfig = getGuildLevel(lvl);
              const isMyGuild = g.code === currentUser?.homeCountry;
              
              return (
                <div
                  key={g.code || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 18px",
                    borderBottom: i < guilds.length - 1 ? `1px solid ${C.border}` : "none",
                    background: isMyGuild ? "rgba(247,195,68,0.06)" : "transparent",
                    transition: "background 0.2s"
                  }}
                >
                  <span style={{
                    fontSize: i < 3 ? 20 : 13,
                    width: 28,
                    textAlign: "center",
                    flexShrink: 0,
                    fontFamily: "'Bebas Neue', sans-serif",
                    color: C.accent,
                    letterSpacing: 1
                  }}>
                    {i < 3 ? medals[i] : i + 1}
                  </span>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{g.flag || "🏳️"}</span>
                  <span style={{
                    flex: 1,
                    fontSize: "0.85rem",
                    fontWeight: isMyGuild ? 800 : 600,
                    color: isMyGuild ? C.accent : C.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {g.name} {isMyGuild && "(your guild)"}
                  </span>
                  <span style={{
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 99,
                    color: lvlConfig.color,
                    background: `${lvlConfig.color}15`,
                    border: `1px solid ${lvlConfig.color}35`,
                    fontFamily: "'Space Mono', monospace",
                    flexShrink: 0,
                    letterSpacing: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    {lvlConfig.emoji} {lvlConfig.name.toUpperCase()}
                  </span>
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "1.15rem",
                    color: C.accent,
                    flexShrink: 0,
                    letterSpacing: 1,
                    marginLeft: 8
                  }}>
                    LVL {lvl} · {g.castleHP ?? 0} HP
                  </span>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
