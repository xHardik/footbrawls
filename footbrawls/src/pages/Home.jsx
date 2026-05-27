import { useState, useEffect } from "react";

// ─── Color tokens ────────────────────────────────────────────────────────────
const C = {
  pitch: "#060f1c",
  card: "#0d1a2d",
  card2: "#111f35",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  gold: "#f0c040",
  goldBg: "rgba(240,192,64,0.12)",
  goldBorder: "rgba(240,192,64,0.28)",
  green: "#00d48a",
  greenBg: "rgba(0,212,138,0.11)",
  greenBorder: "rgba(0,212,138,0.3)",
  red: "#ff3d5c",
  blue: "#4a9eff",
  blueBg: "rgba(74,158,255,0.11)",
  purple: "#8b5cf6",
  purpleBg: "rgba(139,92,246,0.13)",
  purpleBorder: "rgba(139,92,246,0.3)",
  text: "#dde6f5",
  muted: "rgba(180,205,240,0.4)",
  muted2: "rgba(180,205,240,0.65)",
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

// ─── Game data ────────────────────────────────────────────────────────────────
const GAMES = [
  {
    id: "whoAreYa",
    emoji: "👤",
    name: "Who Are Ya?",
    desc: "Silhouette + hints — guess the mystery player in 8 tries",
    xp: 25,
    done: true,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.14)",
    border: "rgba(139,92,246,0.3)",
    route: "/games/who-are-ya",
  },
  {
    id: "matchPredictor",
    emoji: "🔮",
    name: "Match Predictor",
    desc: "Predict result, scorer & exact scoreline before kickoff",
    xp: 100,
    done: true,
    color: "#4a9eff",
    bg: "rgba(74,158,255,0.13)",
    border: "rgba(74,158,255,0.3)",
    route: "/games/match-predictor",
  },
  {
    id: "penaltyNerve",
    emoji: "⚽",
    name: "Penalty Nerve",
    desc: "9-zone penalty vs AI keeper with today's personality",
    xp: 30,
    done: false,
    color: "#ff3d5c",
    bg: "rgba(255,61,92,0.14)",
    border: "rgba(255,61,92,0.3)",
    route: "/games/penalty-nerve",
  },
  {
    id: "wordle",
    emoji: "🟩",
    name: "Player Wordle",
    desc: "Guess the player from attribute colour feedback",
    xp: 20,
    done: false,
    color: "#4cb847",
    bg: "rgba(76,184,71,0.14)",
    border: "rgba(76,184,71,0.3)",
    route: "/games/wordle",
  },
  {
    id: "higherLower",
    emoji: "📊",
    name: "Higher or Lower",
    desc: "Compare two players on age, caps, goals & market value",
    xp: 15,
    done: false,
    color: "#f5a623",
    bg: "rgba(245,166,35,0.14)",
    border: "rgba(245,166,35,0.3)",
    route: "/games/higher-lower",
  },
  {
    id: "transferTrail",
    emoji: "🔗",
    name: "Transfer Trail",
    desc: "Connect player A → B via shared clubs in fewest steps",
    xp: 20,
    done: false,
    color: "#00d48a",
    bg: "rgba(0,212,138,0.13)",
    border: "rgba(0,212,138,0.3)",
    route: "/games/transfer-trail",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pad(n) {
  return String(n).padStart(2, "0");
}
function fmtCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1a2f4a",
        color: C.text,
        fontSize: 13,
        fontWeight: 600,
        padding: "10px 20px",
        borderRadius: 99,
        border: `1px solid ${C.borderHover}`,
        whiteSpace: "nowrap",
        zIndex: 200,
        fontFamily: "'Outfit', sans-serif",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}

// ─── TopNav ───────────────────────────────────────────────────────────────────
function TopNav({ xp, maxXp, nickname }) {
  const pct = Math.round((xp / maxXp) * 100);
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(6,15,28,0.95)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: 2,
          lineHeight: 1,
          color: C.gold,
        }}
      >
        FOOT
        <span style={{ color: C.green }}>BRAWLS</span>
        <span style={{ color: C.muted, fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>.GG</span>
      </div>

      {/* XP + user */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ width: 80, height: 5, background: C.borderHover, borderRadius: 99, overflow: "hidden" }}>
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${C.green}, #00ffaa)`,
                borderRadius: 99,
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: C.muted2, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
            {xp} / {maxXp} XP
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 99,
            padding: "5px 11px 5px 8px",
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: C.blue,
              boxShadow: `0 0 8px ${C.blue}`,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
            {nickname}
          </span>
        </div>
      </div>
    </nav>
  );
}

// ─── Streak Banner ────────────────────────────────────────────────────────────
function StreakBanner({ streak }) {
  return (
    <div
      style={{
        margin: "14px 16px 0",
        background: "linear-gradient(135deg, #1a0e00, #2a1800)",
        border: `1px solid rgba(240,192,64,0.3)`,
        borderRadius: 14,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>🔥</span>
        <div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 20,
              color: C.gold,
              letterSpacing: 0.5,
              lineHeight: 1,
            }}
          >
            {streak} DAY STREAK
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: "'Outfit', sans-serif" }}>
            Play today to keep it alive!
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: i < streak % 7 ? C.gold : C.borderHover,
              boxShadow: i < streak % 7 ? `0 0 6px ${C.gold}` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Guild Hero ───────────────────────────────────────────────────────────────
function GuildHero({ flag, guildName, members, rank, blessed }) {
  return (
    <div style={{ padding: "14px 16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 34,
            borderRadius: 8,
            background: C.card2,
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {flag}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: C.text,
              letterSpacing: 0.3,
              lineHeight: 1.1,
            }}
          >
            {guildName}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: "'Outfit', sans-serif" }}>
            {members.toLocaleString()} members · #{rank} global
          </div>
        </div>
        {blessed && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: C.greenBg,
              border: `1px solid ${C.greenBorder}`,
              borderRadius: 99,
              padding: "4px 10px",
              fontSize: 10,
              color: C.green,
              fontWeight: 700,
              letterSpacing: 0.5,
              fontFamily: "'Outfit', sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            ✦ BLESSED +25%
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Castle Card ──────────────────────────────────────────────────────────────
function CastleCard({ hp, maxHp }) {
  const pct = Math.round((hp / maxHp) * 100);
  const status = pct >= 70 ? "Fortress" : pct >= 30 ? "Standing" : "Weakened";
  const statusColor = pct >= 70 ? C.green : pct >= 30 ? C.gold : C.red;

  return (
    <div
      style={{
        margin: "12px 16px 0",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "14px 16px",
      }}
    >
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
      <div style={{ background: C.borderHover, borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 8 }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 99,
            background: `linear-gradient(90deg, #00a86b, ${C.green})`,
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}`, flexShrink: 0 }} />
        <span style={{ color: statusColor, fontWeight: 600 }}>{status}</span>
        <span style={{ color: C.muted }}>— raid defence holding</span>
      </div>
    </div>
  );
}

// ─── Countdown Card ───────────────────────────────────────────────────────────
function CountdownCard({ matchName, secondsLeft }) {
  return (
    <div
      style={{
        margin: "10px 16px 0",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "13px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 3, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
          Next match
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
          {matchName}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 28,
            color: C.text,
            letterSpacing: 3,
            lineHeight: 1,
          }}
        >
          {fmtCountdown(secondsLeft)}
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 3, fontFamily: "'Outfit', sans-serif" }}>
          locks in {Math.floor(secondsLeft / 3600 - 1)}h {pad(Math.floor((secondsLeft % 3600) / 60))}m
        </div>
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
const FEED = [
  { user: "Priya_10", action: "scored 3/3 on Penalty Nerve", emoji: "⚽", time: "2m ago" },
  { user: "Arjun_CF", action: "guessed in 2 on Who Are Ya", emoji: "👤", time: "5m ago" },
  { user: "Vikram_7", action: "predicted the exact scoreline", emoji: "🔮", time: "11m ago" },
  { user: "Sneha_11", action: "completed Transfer Trail in 3 steps", emoji: "🔗", time: "18m ago" },
];

function ActivityFeed() {
  return (
    <div
      style={{
        margin: "0 16px",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {FEED.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: i < FEED.length - 1 ? `1px solid ${C.border}` : "none",
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.green, fontFamily: "'Outfit', sans-serif" }}>
              {item.user}
            </span>
            <span style={{ fontSize: 12, color: C.muted2, fontFamily: "'Outfit', sans-serif" }}>
              {" "}{item.action}
            </span>
          </div>
          <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}>
            {item.time}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 16px 10px",
      }}
    >
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: 17,
          letterSpacing: 1,
          color: C.text,
        }}
      >
        {title}
      </span>
      {right && (
        <span style={{ fontSize: 11, color: C.gold, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
          {right}
        </span>
      )}
    </div>
  );
}

// ─── Game Card ────────────────────────────────────────────────────────────────
function GameCard({ game, onPlay }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={() => onPlay(game)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: C.card,
        border: `1px solid ${pressed ? game.border : C.border}`,
        borderRadius: 14,
        padding: 13,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        transform: pressed ? "scale(0.975)" : "scale(1)",
        transition: "all 0.12s ease",
        position: "relative",
        overflow: "hidden",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 12,
          background: game.bg,
          border: `1px solid ${game.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {game.emoji}
        {game.done && (
          <div
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: C.green,
              border: `2px solid ${C.card}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              color: "#060f1c",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            ✓
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: C.text,
            marginBottom: 2,
            fontFamily: "'Outfit', sans-serif",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {game.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            lineHeight: 1.4,
            marginBottom: 7,
            fontFamily: "'Outfit', sans-serif",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {game.desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
              background: C.goldBg,
              color: C.gold,
              border: `1px solid ${C.goldBorder}`,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            +{game.xp} XP
          </span>
          {game.done && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 99,
                background: C.greenBg,
                color: C.green,
                border: `1px solid ${C.greenBorder}`,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              ✓ Done
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      {game.done ? (
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(game); }}
          style={{
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "'Outfit', sans-serif",
            color: C.green,
            background: C.greenBg,
            border: `1px solid ${C.greenBorder}`,
            transition: "transform 0.1s, opacity 0.1s",
          }}
        >
          ↺ Replay
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(game); }}
          style={{
            background: game.color,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "9px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: 0.3,
            lineHeight: 1,
            boxShadow: `0 4px 16px ${game.color}44`,
            transition: "transform 0.1s, filter 0.1s",
          }}
        >
          Play
        </button>
      )}
    </div>
  );
}

// ─── Raid Banner ──────────────────────────────────────────────────────────────
function RaidBanner({ navigate }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onClick={() => navigate && navigate("/raid")}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        margin: "0 16px 24px",
        background: "linear-gradient(135deg,#100623 0%,#0d1b36 55%,#0a1826 100%)",
        border: `1px solid ${C.purpleBorder}`,
        borderRadius: 18,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        transition: "all 0.15s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -8,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 72,
          opacity: 0.05,
          lineHeight: 1,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        ⚔️
      </div>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 13,
          background: C.purpleBg,
          border: `1px solid ${C.purpleBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          flexShrink: 0,
        }}
      >
        ⚔️
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 4,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 20,
            color: C.text,
            letterSpacing: 0.5,
          }}
        >
          CHALLENGE RAID
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 99,
              background: C.goldBg,
              color: C.gold,
              border: `1px solid ${C.goldBorder}`,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            2× XP
          </span>
        </div>
        <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.45, fontFamily: "'Outfit', sans-serif" }}>
          Match day active · Find a buddy · Battle rival guilds
        </p>
      </div>
      <div style={{ color: C.purple, fontSize: 24, flexShrink: 0 }}>›</div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ active, navigate }) {
  const items = [
    { id: "home", label: "Games", icon: "⚽", route: "/" },
    { id: "guild", label: "Guild", icon: "🏰", route: "/guild" },
    { id: "raids", label: "Raids", icon: "⚔️", route: "/raid" },
    { id: "ranks", label: "Ranks", icon: "🏆", route: "/leaderboard" },
    { id: "profile", label: "Me", icon: "👤", route: "/profile" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        borderTop: `1px solid ${C.border}`,
        background: "rgba(6,15,28,0.98)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        bottom: 0,
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => navigate && navigate(item.route)}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "10px 4px 9px",
              fontSize: 9,
              fontWeight: 600,
              color: isActive ? C.green : C.muted,
              cursor: "pointer",
              border: "none",
              background: "transparent",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: 0.4,
              textTransform: "uppercase",
              position: "relative",
              transition: "color 0.15s",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 2,
                  background: C.green,
                  borderRadius: "0 0 99px 99px",
                  boxShadow: `0 0 8px ${C.green}`,
                }}
              />
            )}
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: 0.4 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Main Home ────────────────────────────────────────────────────────────────
export default function Home({ navigate }) {
  const [toast, setToast] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(3 * 3600 + 42 * 60 + 19);

  useEffect(() => {
    injectFonts();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const handlePlay = (game) => {
    if (navigate) {
      navigate(game.route);
    } else {
      showToast(game.done ? `↺ Replaying ${game.name}...` : `▶ Loading ${game.name}...`);
    }
  };

  // Mock data — replace with real Firebase / localStorage reads
  const user = { nickname: "Rishi_7", xp: 124, maxXp: 200, tier: "Fan", streak: 7 };
  const guild = {
    flag: "🇮🇳",
    name: "India Fan Guild",
    members: 3241,
    rank: 47,
    blessed: true,
    castleHp: 6302,
    castleHpMax: 10000,
  };

  const doneCount = GAMES.filter((g) => g.done).length;

  return (
    <div
      style={{
        background: C.pitch,
        minHeight: "100vh",
        maxWidth: 430,
        margin: "0 auto",
        fontFamily: "'Outfit', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopNav xp={user.xp} maxXp={user.maxXp} nickname={user.nickname} />

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {/* Streak */}
        <StreakBanner streak={user.streak} />

        {/* Guild */}
        <GuildHero
          flag={guild.flag}
          guildName={guild.name}
          members={guild.members}
          rank={guild.rank}
          blessed={guild.blessed}
        />

        {/* Castle */}
        <CastleCard hp={guild.castleHp} maxHp={guild.castleHpMax} />

        {/* Countdown */}
        <CountdownCard matchName="Argentina vs France" secondsLeft={secondsLeft} />

        {/* Guild Activity */}
        <SectionHeader title="GUILD ACTIVITY" right="Live" />
        <ActivityFeed />

        {/* Games */}
        <SectionHeader
          title="TODAY'S GAMES"
          right={`${doneCount}/${GAMES.length} done · ${user.maxXp - user.xp} XP left`}
        />
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} onPlay={handlePlay} />
          ))}
        </div>

        {/* Raids */}
        <SectionHeader title="RAID BATTLES" />
        <RaidBanner navigate={navigate} />
      </div>

      <BottomNav active="home" navigate={navigate} />
      <Toast message={toast} />
    </div>
  );
}