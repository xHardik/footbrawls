import { useState, useEffect } from "react";

const C = {
  pitch: "#060f1c",
  card: "#0d1a2d",
  border: "rgba(255,255,255,0.07)",
  gold: "#f0c040",
  goldBg: "rgba(240,192,64,0.12)",
  goldBorder: "rgba(240,192,64,0.28)",
  green: "#00d48a",
  greenBg: "rgba(0,212,138,0.11)",
  greenBorder: "rgba(0,212,138,0.3)",
  red: "#ff3d5c",
  redBg: "rgba(255,61,92,0.13)",
  redBorder: "rgba(255,61,92,0.3)",
  purple: "#8b5cf6",
  purpleBg: "rgba(139,92,246,0.13)",
  purpleBorder: "rgba(139,92,246,0.3)",
  text: "#dde6f5",
  muted: "rgba(180,205,240,0.4)",
  muted2: "rgba(180,205,240,0.65)",
};

// ─── State config per PRD §7.2 ────────────────────────────────────────────────
// blessed  → team won a real WC match → +25% XP for 24h
// cursed   → team lost a real WC match → -25% XP, lifted by 3 raid wins
// neutral  → no modifier active
const STATE_CONFIG = {
  blessed: {
    icon: "⚡",
    label: "BLESSED",
    modifier: "+25% XP",
    modifierColor: C.green,
    desc: (team) => `${team} won their match — your guild is blessed for 24 hours!`,
    bg: "linear-gradient(135deg,#00200f,#001a2a)",
    border: "rgba(0,212,138,0.4)",
    glow: "rgba(0,212,138,0.15)",
    badgeBg: C.greenBg,
    badgeBorder: C.greenBorder,
    badgeColor: C.green,
    timerLabel: "Blessing expires in",
    raidNote: null,
  },
  cursed: {
    icon: "💀",
    label: "CURSED",
    modifier: "−25% XP",
    modifierColor: C.red,
    desc: (team) => `${team} lost their match — your guild is cursed until 3 raid wins`,
    bg: "linear-gradient(135deg,#1a0008,#100614)",
    border: "rgba(255,61,92,0.4)",
    glow: "rgba(255,61,92,0.12)",
    badgeBg: C.redBg,
    badgeBorder: C.redBorder,
    badgeColor: C.red,
    timerLabel: "Curse lifts after",
    raidNote: "Win raids to lift the curse",
  },
  neutral: {
    icon: "🛡️",
    label: "PROTECTED",
    modifier: "Normal XP",
    modifierColor: C.muted2,
    desc: () => "No active modifiers — play games and earn full XP.",
    bg: "linear-gradient(135deg,#0a1220,#0d1a2d)",
    border: C.border,
    glow: "transparent",
    badgeBg: "rgba(255,255,255,0.05)",
    badgeBorder: "rgba(255,255,255,0.1)",
    badgeColor: C.muted2,
    timerLabel: null,
    raidNote: null,
  },
};

// ─── Animated pulse dot ───────────────────────────────────────────────────────
function PulseDot({ color }) {
  return (
    <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: color,
          animation: "pulse-ring 1.5s ease-out infinite",
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 2,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Raid wins progress (for cursed state) ────────────────────────────────────
function RaidWinsProgress({ winsNeeded = 3, winsEarned = 0 }) {
  const remaining = winsNeeded - winsEarned;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        background: C.redBg,
        border: `1px solid ${C.redBorder}`,
        borderRadius: 10,
        padding: "8px 12px",
      }}
    >
      <span style={{ fontSize: 14 }}>⚔️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: C.red, fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>
          {remaining} more raid win{remaining !== 1 ? "s" : ""} to lift the curse
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {[...Array(winsNeeded)].map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 99,
                background: i < winsEarned
                  ? `linear-gradient(90deg,#b8002e,${C.red})`
                  : C.border,
                boxShadow: i < winsEarned ? `0 0 6px ${C.red}66` : "none",
                transition: "all 0.4s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Countdown timer ──────────────────────────────────────────────────────────
function ExpiryTimer({ secondsLeft, label, color }) {
  const [secs, setSecs] = useState(secondsLeft);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const fmt = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: "'Outfit', sans-serif" }}>{label}</span>
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          color,
          letterSpacing: 1.5,
        }}
      >
        {fmt}
      </span>
    </div>
  );
}

// ─── Main CurseBanner ─────────────────────────────────────────────────────────
/**
 * Props:
 *   status      {"blessed"|"cursed"|"neutral"}
 *   team        {string}   — e.g. "India"
 *   match       {string}   — e.g. "India vs Brazil"
 *   blessedSecs {number}   — seconds remaining on blessing (blessed only)
 *   raidWins    {number}   — raid wins earned toward lifting curse (cursed only)
 *   raidWinsNeeded {number} — always 3 per PRD
 */
export default function CurseBanner({
  status = "blessed",
  team = "India",
  match = "India vs Brazil",
  blessedSecs = 18000,
  raidWins = 1,
  raidWinsNeeded = 3,
}) {
  const cfg = STATE_CONFIG[status] || STATE_CONFIG.neutral;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 18,
        padding: "16px 18px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: -30,
          left: "50%",
          transform: "translateX(-50%)",
          width: 260,
          height: 100,
          background: `radial-gradient(ellipse, ${cfg.glow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>{cfg.icon}</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900,
                  fontSize: 20,
                  color: C.text,
                  letterSpacing: 1,
                }}
              >
                {cfg.label}
              </span>
              {status !== "neutral" && (
                <PulseDot color={status === "blessed" ? C.green : C.red} />
              )}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{match}</div>
          </div>
        </div>

        {/* XP modifier badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: cfg.badgeBg,
            border: `1px solid ${cfg.badgeBorder}`,
            borderRadius: 99,
            padding: "5px 12px",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            color: cfg.modifierColor,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          {cfg.modifier}
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: C.muted2,
          lineHeight: 1.5,
          marginTop: 10,
          position: "relative",
        }}
      >
        {cfg.desc(team)}
      </p>

      {/* Blessed: countdown timer */}
      {status === "blessed" && (
        <ExpiryTimer secondsLeft={blessedSecs} label={cfg.timerLabel} color={C.green} />
      )}

      {/* Cursed: raid wins progress */}
      {status === "cursed" && (
        <RaidWinsProgress winsNeeded={raidWinsNeeded} winsEarned={raidWins} />
      )}

      {/* Neutral: next match nudge */}
      {status === "neutral" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            fontSize: 11,
            color: C.muted,
          }}
        >
          <span>📅</span>
          <span>Next {team} match result will change this status</span>
        </div>
      )}
    </div>
  );
}

// ─── Dev preview ─────────────────────────────────────────────────────────────
export function CurseBannerPreview() {
  const [status, setStatus] = useState("blessed");

  return (
    <div style={{ background: C.pitch, minHeight: "100vh", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <CurseBanner status="blessed" team="Argentina" match="Argentina vs France" blessedSecs={18000} />
      <CurseBanner status="cursed" team="India" match="India vs Brazil" raidWins={1} raidWinsNeeded={3} />
      <CurseBanner status="neutral" team="Japan" match="—" />

      {/* Toggle */}
      <div style={{ display: "flex", gap: 8 }}>
        {["blessed","cursed","neutral"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: `1px solid ${status === s ? C.green : C.border}`,
              background: status === s ? C.greenBg : "transparent",
              color: status === s ? C.green : C.muted2,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}