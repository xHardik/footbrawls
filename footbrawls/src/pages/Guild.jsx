// src/pages/Guild.jsx
// Guild room — chat, castle HP, curse/blessing, leaderboard
// Matches Home.jsx design system exactly (same C tokens, fonts, components)

import { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { getUser } from "../lib/user";
import {
  collection, doc, onSnapshot, addDoc, query,
  where, orderBy, limit, serverTimestamp, getDoc,
} from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

// ─── Color tokens (identical to Home.jsx) ────────────────────────────────────
const C = {
  pitch:        "#060f1c",
  card:         "#0d1a2d",
  card2:        "#111f35",
  border:       "rgba(255,255,255,0.07)",
  borderHover:  "rgba(255,255,255,0.14)",
  gold:         "#f0c040",
  goldBg:       "rgba(240,192,64,0.12)",
  goldBorder:   "rgba(240,192,64,0.28)",
  green:        "#00d48a",
  greenBg:      "rgba(0,212,138,0.11)",
  greenBorder:  "rgba(0,212,138,0.3)",
  red:          "#ff3d5c",
  redBg:        "rgba(255,61,92,0.12)",
  redBorder:    "rgba(255,61,92,0.3)",
  blue:         "#4a9eff",
  blueBg:       "rgba(74,158,255,0.11)",
  purple:       "#8b5cf6",
  purpleBg:     "rgba(139,92,246,0.13)",
  purpleBorder: "rgba(139,92,246,0.3)",
  text:         "#dde6f5",
  muted:        "rgba(180,205,240,0.4)",
  muted2:       "rgba(180,205,240,0.65)",
};

// ─── Font injection ───────────────────────────────────────────────────────────
const injectFonts = () => {
  if (document.getElementById("fb-fonts")) return;
  const link = document.createElement("link");
  link.id = "fb-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Outfit:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
};

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIERS = [
  { name: "lurker",  min: 0,    color: "#555566", label: "LURKER",  canChat: false },
  { name: "fan",     min: 50,   color: "#60a5fa", label: "FAN",     canChat: "own"  },
  { name: "veteran", min: 200,  color: "#00d48a", label: "VETERAN", canChat: true   },
  { name: "ultra",   min: 500,  color: "#f0c040", label: "ULTRA",   canChat: true   },
  { name: "legend",  min: 9999, color: "#8b5cf6", label: "LEGEND",  canChat: true   },
];

function getTier(totalXP = 0) {
  return [...TIERS].reverse().find(t => totalXP >= t.min) || TIERS[0];
}

// ─── Curse config ─────────────────────────────────────────────────────────────
const CURSE_CONFIG = {
  blessed:      { label: "BLESSED",      emoji: "✦", color: C.green,  bg: C.greenBg,  border: C.greenBorder,  xp: "+25% XP"  },
  cursed:       { label: "CURSED",       emoji: "💀", color: C.red,    bg: C.redBg,    border: C.redBorder,    xp: "−25% XP"  },
  double_cursed:{ label: "DOUBLE CURSE", emoji: "☠️", color: "#ff0033",bg:"rgba(255,0,51,0.12)",border:"rgba(255,0,51,0.3)", xp: "−50% XP" },
  death_curse:  { label: "DEATH CURSE",  emoji: "💔", color: "#660000",bg:"rgba(102,0,0,0.2)",  border:"rgba(102,0,0,0.4)",  xp: "−75% XP" },
};

// ─── Profanity filter (basic) ─────────────────────────────────────────────────
const BAD_WORDS = ["fuck","shit","bitch","asshole","cunt","nigger","faggot"];
function containsProfanity(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(w => lower.includes(w));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (diff < 60)  return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TopNav({ guildName, flag, navigate }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(6,15,28,0.95)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${C.border}`,
      padding: "0 16px",
      height: 52,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <button
        onClick={() => navigate && navigate("/")}
        style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, padding: "0 4px 0 0", lineHeight: 1 }}
      >
        ‹
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{flag}</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800, fontSize: 18,
          color: C.text, letterSpacing: 0.5,
        }}>{guildName}</span>
      </div>
      <button
        onClick={() => navigate && navigate("/raid")}
        style={{
          background: C.purpleBg, border: `1px solid ${C.purpleBorder}`,
          borderRadius: 99, padding: "5px 12px",
          fontSize: 11, fontWeight: 700,
          color: C.purple, cursor: "pointer",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        ⚔️ Raid
      </button>
    </nav>
  );
}

function CurseBanner({ curse }) {
  if (!curse || curse === "none") return null;
  const cfg = CURSE_CONFIG[curse];
  if (!cfg) return null;
  return (
    <div style={{
      margin: "12px 16px 0",
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 12,
      padding: "10px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800, fontSize: 15,
            color: cfg.color, letterSpacing: 0.8,
          }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Outfit', sans-serif" }}>
            Guild XP multiplier active
          </div>
        </div>
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800, fontSize: 18,
        color: cfg.color,
      }}>{cfg.xp}</div>
    </div>
  );
}

function CastleHPCard({ hp, maxHp, warRecord }) {
  const pct = Math.min(100, Math.round((hp / maxHp) * 100));
  const status = pct >= 70 ? "Fortress" : pct >= 30 ? "Standing" : "Weakened";
  const statusColor = pct >= 70 ? C.green : pct >= 30 ? C.gold : C.red;
  const barColor = pct >= 70
    ? `linear-gradient(90deg,#00a86b,${C.green})`
    : pct >= 30
    ? `linear-gradient(90deg,#b8860b,${C.gold})`
    : `linear-gradient(90deg,#8b0000,${C.red})`;

  return (
    <div style={{
      margin: "12px 16px 0",
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "14px 16px",
    }}>
      {/* HP row */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
          🏰 Castle HP
        </div>
        <div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: statusColor, letterSpacing: 1 }}>
            {hp.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 3, fontFamily: "'Outfit', sans-serif" }}>
            / {maxHp.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div style={{ background: C.borderHover, borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: barColor, transition: "width 0.8s ease" }} />
      </div>

      {/* Status + war record */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}`, flexShrink: 0 }} />
          <span style={{ color: statusColor, fontWeight: 600 }}>{status}</span>
        </div>
        {warRecord && (
          <div style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>
            <span style={{ color: C.green, fontWeight: 700 }}>{warRecord.wins}W</span>
            <span style={{ color: C.muted }}>·</span>
            <span style={{ color: C.red, fontWeight: 700 }}>{warRecord.losses}L</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardCard({ members }) {
  return (
    <div style={{
      margin: "12px 16px 0",
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "11px 14px 9px",
        borderBottom: `1px solid ${C.border}`,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800, fontSize: 14,
        color: C.text, letterSpacing: 1,
      }}>
        🏆 TODAY'S TOP EARNERS
      </div>
      {members.length === 0 && (
        <div style={{ padding: "16px 14px", fontSize: 12, color: C.muted, fontFamily: "'Outfit', sans-serif" }}>
          No XP earned yet today. Be the first!
        </div>
      )}
      {members.map((m, i) => {
        const tier = getTier(m.totalXP);
        const medals = ["🥇","🥈","🥉"];
        return (
          <div key={m.userId || i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 14px",
            borderBottom: i < members.length - 1 ? `1px solid ${C.border}` : "none",
          }}>
            <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>
              {i < 3 ? medals[i] : <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{i + 1}</span>}
            </span>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{m.flag || "🏳️"}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.nickname}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
              color: tier.color, background: `${tier.color}22`, border: `1px solid ${tier.color}44`,
              fontFamily: "'Outfit', sans-serif", flexShrink: 0,
            }}>{tier.label}</span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800, fontSize: 15, color: C.gold, flexShrink: 0,
            }}>+{m.dailyXP}</span>
          </div>
        );
      })}
    </div>
  );
}

function TierBadge({ tier }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700,
      padding: "2px 6px", borderRadius: 99,
      color: tier.color,
      background: `${tier.color}22`,
      border: `1px solid ${tier.color}44`,
      fontFamily: "'Outfit', sans-serif",
      flexShrink: 0,
    }}>{tier.label}</span>
  );
}

function ChatMessage({ msg, isOwn }) {
  const tier = getTier(msg.totalXP || 0);
  return (
    <div style={{
      display: "flex", gap: 8,
      flexDirection: isOwn ? "row-reverse" : "row",
      marginBottom: 10,
      alignItems: "flex-end",
    }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: C.card2, border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, flexShrink: 0,
      }}>{msg.flag || "🏳️"}</div>

      {/* Bubble */}
      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted2, fontFamily: "'Outfit', sans-serif" }}>
            {msg.nickname}
          </span>
          <TierBadge tier={tier} />
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "'Outfit', sans-serif" }}>
            {timeAgo(msg.timestamp)}
          </span>
        </div>
        <div style={{
          background: isOwn ? C.greenBg : C.card2,
          border: `1px solid ${isOwn ? C.greenBorder : C.border}`,
          borderRadius: isOwn ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          padding: "8px 12px",
          fontSize: 13, color: C.text,
          lineHeight: 1.45,
          fontFamily: "'Outfit', sans-serif",
          wordBreak: "break-word",
        }}>
          {msg.text}
        </div>
      </div>
    </div>
  );
}

function ChatInput({ onSend, canChat, tier }) {
  const [text, setText] = useState("");
  const [err, setErr]   = useState("");

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (containsProfanity(trimmed)) {
      setErr("Message blocked — keep it clean ✌️");
      setTimeout(() => setErr(""), 2500);
      return;
    }
    onSend(trimmed);
    setText("");
    setErr("");
  }

  if (!canChat) {
    return (
      <div style={{
        padding: "12px 16px",
        background: C.card,
        borderTop: `1px solid ${C.border}`,
        textAlign: "center",
        fontSize: 12, color: C.muted,
        fontFamily: "'Outfit', sans-serif",
      }}>
        Earn <span style={{ color: C.gold, fontWeight: 700 }}>50 XP</span> to unlock chat · You're on {tier.label}
      </div>
    );
  }

  return (
    <div style={{
      padding: "10px 16px",
      background: C.card,
      borderTop: `1px solid ${C.border}`,
    }}>
      {err && (
        <div style={{
          marginBottom: 6, fontSize: 11, color: C.red,
          fontFamily: "'Outfit', sans-serif", fontWeight: 600,
        }}>{err}</div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Say something to your guild…"
          maxLength={200}
          style={{
            flex: 1,
            background: C.card2,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            color: C.text,
            outline: "none",
            fontFamily: "'Outfit', sans-serif",
            transition: "border-color 0.15s",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          style={{
            background: text.trim() ? C.green : C.borderHover,
            border: "none",
            borderRadius: 12,
            width: 42, height: 42,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, cursor: text.trim() ? "pointer" : "default",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

function BottomNav({ navigate }) {
  const items = [
    { id: "home",    label: "Games", icon: "⚽", route: "/"            },
    { id: "guild",   label: "Guild", icon: "🏰", route: "/guild"       },
    { id: "raids",   label: "Raids", icon: "⚔️", route: "/raid"        },
    { id: "ranks",   label: "Ranks", icon: "🏆", route: "/leaderboard" },
    { id: "profile", label: "Me",    icon: "👤", route: "/profile"     },
  ];
  return (
    <nav style={{
      display: "flex",
      borderTop: `1px solid ${C.border}`,
      background: "rgba(6,15,28,0.98)",
      backdropFilter: "blur(16px)",
      position: "sticky", bottom: 0, zIndex: 50,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {items.map(item => {
        const isActive = item.id === "guild";
        return (
          <button key={item.id}
            onClick={() => navigate && navigate(item.route)}
            style={{
              flex: 1, minWidth: 0,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "10px 4px 9px",
              fontSize: 9, fontWeight: 600,
              color: isActive ? C.green : C.muted,
              cursor: "pointer", border: "none", background: "transparent",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: 0.4, textTransform: "uppercase",
              position: "relative", transition: "color 0.15s",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
            }}
          >
            {isActive && (
              <div style={{
                position: "absolute", top: 0, left: "50%",
                transform: "translateX(-50%)",
                width: 28, height: 2,
                background: C.green, borderRadius: "0 0 99px 99px",
                boxShadow: `0 0 8px ${C.green}`,
              }} />
            )}
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { id: "chat",  label: "💬 Chat"       },
    { id: "stats", label: "🏰 Castle"     },
    { id: "ranks", label: "🏆 Leaderboard"},
  ];
  return (
    <div style={{
      display: "flex",
      borderBottom: `1px solid ${C.border}`,
      background: C.card,
      padding: "0 16px",
      gap: 4,
    }}>
      {tabs.map(t => (
        <button key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1, padding: "11px 4px",
            background: "none", border: "none",
            borderBottom: active === t.id ? `2px solid ${C.green}` : "2px solid transparent",
            color: active === t.id ? C.green : C.muted,
            fontSize: 12, fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Outfit', sans-serif",
            transition: "color 0.15s",
            marginBottom: -1,
          }}
        >{t.label}</button>
      ))}
    </div>
  );
}

// ─── Main Guild Component ─────────────────────────────────────────────────────
export default function Guild({ navigate }) {
  const [user, setUser]           = useState(null);
  const [guild, setGuild]         = useState(null);
  const [messages, setMessages]   = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab]             = useState("chat");
  const [loading, setLoading]     = useState(true);
  const chatBottomRef             = useRef(null);

  // Load user
  useEffect(() => {
    injectFonts();
    const u = getUser();
    setUser(u);
  }, []);

  // Subscribe to guild doc
  useEffect(() => {
    if (!user?.homeCountry) return;
    const unsub = onSnapshot(doc(db, "guilds", user.homeCountry), snap => {
      if (snap.exists()) setGuild({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [user?.homeCountry]);

  // Subscribe to chat
  useEffect(() => {
    if (!user?.homeCountry) return;
    const q = query(
      collection(db, "chat"),
      where("guildCode", "==", user.homeCountry),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
    });
    return unsub;
  }, [user?.homeCountry]);

  // Subscribe to leaderboard (top daily XP in guild)
  useEffect(() => {
    if (!user?.homeCountry) return;
    const today = new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, "users"),
      where("homeCountry", "==", user.homeCountry),
      where("dailyXPDate", "==", today),
      orderBy("dailyXP", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, snap => {
      setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user?.homeCountry]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (tab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, tab]);

  async function handleSend(text) {
    if (!user) return;
    await addDoc(collection(db, "chat"), {
      guildCode:   user.homeCountry,
      userId:      user.userId,
      nickname:    user.nickname,
      flag:        user.flag || "🏳️",
      totalXP:     user.totalXP || 0,
      text,
      timestamp:   serverTimestamp(),
      reportCount: 0,
      reported:    false,
    });
  }

  if (loading || !user) {
    return (
      <div style={{ background: C.pitch, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2.5px solid #1e293b`, borderTopColor: C.green, animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const tier       = getTier(user.totalXP);
  const canChat    = tier.canChat === true || (tier.canChat === "own");
  const hp         = guild?.castleHP     || 0;
  const maxHp      = guild?.castleHPCap  || 10000;
  const curse      = guild?.currentCurse || guild?.currentBlessing || null;
  const warRecord  = guild?.warRecord    || { wins: 0, losses: 0 };
  const guildName  = guild?.name         || `${user.homeCountry} Guild`;
  const guildFlag  = guild?.flag         || user.flag || "🏳️";

  return (
    <div style={{
      background: C.pitch, minHeight: "100vh",
      maxWidth: 430, margin: "0 auto",
      fontFamily: "'Outfit', sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <TopNav guildName={guildName} flag={guildFlag} navigate={navigate} />

      {/* Curse/blessing banner */}
      <CurseBanner curse={curse} />

      {/* Tab bar */}
      <div style={{ marginTop: 12 }}>
        <TabBar active={tab} onChange={setTab} />
      </div>

      {/* ── CHAT TAB ── */}
      {tab === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "14px 16px 4px",
            display: "flex", flexDirection: "column",
          }}>
            {messages.length === 0 && (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 10, padding: "40px 0",
              }}>
                <span style={{ fontSize: 36 }}>💬</span>
                <div style={{ fontSize: 14, color: C.muted, fontFamily: "'Outfit', sans-serif", textAlign: "center" }}>
                  No messages yet.<br />Be the first to say something!
                </div>
              </div>
            )}
            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isOwn={msg.userId === user.userId}
              />
            ))}
            <div ref={chatBottomRef} />
          </div>
          <ChatInput onSend={handleSend} canChat={canChat} tier={tier} />
        </div>
      )}

      {/* ── CASTLE TAB ── */}
      {tab === "stats" && (
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
          <CastleHPCard hp={hp} maxHp={maxHp} warRecord={warRecord} />

          {/* Castle status explainer */}
          <div style={{ margin: "12px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { threshold: 70, label: "Fortress", desc: "Defender advantage in raids", color: C.green },
              { threshold: 30, label: "Standing", desc: "No raid bonus", color: C.gold },
              { threshold: 0,  label: "Weakened", desc: "Attacker advantage in raids", color: C.red },
            ].map(s => (
              <div key={s.label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "'Outfit', sans-serif" }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Outfit', sans-serif" }}> — {s.desc}</span>
                </div>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                  {s.threshold}%+
                </span>
              </div>
            ))}
          </div>

          {/* XP split info */}
          <div style={{
            margin: "12px 16px 0",
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 600, fontFamily: "'Outfit', sans-serif", marginBottom: 12 }}>
              ⚡ XP SPLIT
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "Home country", pct: "80%", color: C.green },
                { label: "Support team", pct: "20%", color: C.blue },
              ].map(x => (
                <div key={x.label} style={{
                  flex: 1, background: C.card2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: "10px 12px",
                  textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: x.color }}>{x.pct}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {tab === "ranks" && (
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
          <LeaderboardCard members={leaderboard} />

          {/* Tier legend */}
          <div style={{ margin: "12px 16px 0", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "11px 14px 9px", borderBottom: `1px solid ${C.border}`, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, color: C.text, letterSpacing: 1 }}>
              TIER REQUIREMENTS
            </div>
            {TIERS.map((t, i) => (
              <div key={t.name} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                borderBottom: i < TIERS.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, boxShadow: `0 0 6px ${t.color}`, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: t.color, fontFamily: "'Outfit', sans-serif" }}>{t.label}</span>
                <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Outfit', sans-serif" }}>
                  {t.min === 0 ? "0 XP" : t.min >= 9999 ? "Top 1% active" : `${t.min}+ XP`}
                </span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Outfit', sans-serif" }}>
                  {t.canChat === false ? "Read only" : t.canChat === "own" ? "Own guild" : "All guilds"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav navigate={navigate} />
    </div>
  );
}