import { useState, useEffect } from "react";

// ─── Shared tokens (copy from your tokens.js) ─────────────────────────────────
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
  redBg: "rgba(255,61,92,0.13)",
  redBorder: "rgba(255,61,92,0.3)",
  blue: "#4a9eff",
  text: "#dde6f5",
  muted: "rgba(180,205,240,0.4)",
  muted2: "rgba(180,205,240,0.65)",
};

// ─── Tier bands ───────────────────────────────────────────────────────────────
// PRD §7.3: >7000 = Fortress, <3000 = Weakened, else Standing
function getTier(hp, maxHp = 10000) {
  if (hp >= 7000) return { label: "Fortress", color: C.green, barGrad: `linear-gradient(90deg,#00a86b,${C.green})` };
  if (hp >= 3000) return { label: "Standing", color: C.gold,  barGrad: `linear-gradient(90deg,#c08a00,${C.gold})` };
  return            { label: "Weakened",  color: C.red,   barGrad: `linear-gradient(90deg,#b8002e,${C.red})` };
}

// ─── Segment dots (7 pips = visual milestones every ~1428 HP) ────────────────
function SegmentPips({ hp, maxHp }) {
  const steps = 7;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
      {[...Array(steps)].map((_, i) => {
        const threshold = ((i + 1) / steps) * maxHp;
        const filled = hp >= threshold;
        const { color } = getTier(threshold, maxHp);
        return (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: filled ? color : C.borderHover,
              boxShadow: filled ? `0 0 5px ${color}` : "none",
              transition: "all 0.4s",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Animated HP bar ──────────────────────────────────────────────────────────
function HPBar({ pct, grad }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div
      style={{
        background: C.borderHover,
        borderRadius: 99,
        height: 10,
        overflow: "hidden",
        margin: "10px 0 4px",
        position: "relative",
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          borderRadius: 99,
          background: grad,
          transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}
      >
        {/* Shimmer */}
        <div
          style={{
            position: "absolute",
            right: 3,
            top: 2,
            bottom: 2,
            width: 4,
            borderRadius: 99,
            background: "rgba(255,255,255,0.45)",
          }}
        />
      </div>
      {/* Fortress line at 70% */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "70%",
          width: 1,
          background: `${C.green}55`,
        }}
      />
      {/* Weakened line at 30% */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "30%",
          width: 1,
          background: `${C.red}55`,
        }}
      />
    </div>
  );
}

// ─── Contributor list ─────────────────────────────────────────────────────────
function TopContributors({ contributors }) {
  if (!contributors?.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          fontWeight: 600,
          marginBottom: 7,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        Top builders today
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {contributors.map((c, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <span style={{ color: C.muted2, width: 14, textAlign: "center", fontSize: 10 }}>
              #{i + 1}
            </span>
            <span style={{ color: C.text, fontWeight: 600, flex: 1 }}>{c.nickname}</span>
            <span style={{ color: C.gold, fontWeight: 700 }}>+{c.hpContrib} HP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Raid advantage tooltip ───────────────────────────────────────────────────
function RaidAdvantage({ tier }) {
  const map = {
    Fortress: { icon: "🛡️", text: "Defender advantage in raids", color: C.green },
    Standing: { icon: "⚖️", text: "Balanced — no raid advantage", color: C.gold },
    Weakened: { icon: "⚠️", text: "Attacker advantage — rebuild fast!", color: C.red },
  };
  const { icon, text, color } = map[tier] || map.Standing;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        background: `${color}14`,
        border: `1px solid ${color}33`,
        borderRadius: 8,
        padding: "6px 10px",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, color, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
        {text}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * Props:
 *   hp          {number}  — current HP (from Firestore guildDoc.castleHp)
 *   maxHp       {number}  — always 10 000 per PRD
 *   contributors {Array}  — [{ nickname, hpContrib }] top 3
 *   resetSecs   {number}  — seconds until midnight UTC reset
 */
export default function CastleHP({ hp = 6302, maxHp = 10000, contributors = [], resetSecs = 0 }) {
  const pct = Math.min(100, Math.round((hp / maxHp) * 100));
  const { label, color, barGrad } = getTier(hp, maxHp);

  // Countdown to midnight UTC reset
  const [secsLeft, setSecsLeft] = useState(resetSecs || (() => {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.floor((midnight - now) / 1000);
  }));

  useEffect(() => {
    const t = setInterval(() => setSecsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  function fmtReset(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: "16px 18px",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 20 }}>🏰</span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: C.text,
              letterSpacing: 0.5,
            }}
          >
            CASTLE HP
          </span>
        </div>

        {/* Reset timer */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 }}>
            Resets in
          </div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: C.muted2,
              letterSpacing: 1,
            }}
          >
            {fmtReset(secsLeft)}
          </div>
        </div>
      </div>

      {/* HP number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 38,
            color,
            letterSpacing: 1,
            lineHeight: 1,
            transition: "color 0.4s",
          }}
        >
          {hp.toLocaleString()}
        </span>
        <span style={{ fontSize: 14, color: C.muted }}>/ {maxHp.toLocaleString()} HP</span>
        <span
          style={{
            marginLeft: 4,
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 9px",
            borderRadius: 99,
            background: `${color}18`,
            color,
            border: `1px solid ${color}44`,
            letterSpacing: 0.5,
            alignSelf: "center",
          }}
        >
          {label}
        </span>
      </div>

      {/* Bar */}
      <HPBar pct={pct} grad={barGrad} />

      {/* Threshold labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.muted, marginBottom: 2 }}>
        <span style={{ color: `${C.red}88` }}>0</span>
        <span style={{ color: `${C.red}88`, marginLeft: "27%" }}>Weakened</span>
        <span style={{ color: `${C.green}88`, marginLeft: "auto" }}>Fortress</span>
        <span style={{ color: C.muted }}>10k</span>
      </div>

      {/* Segment pips */}
      <SegmentPips hp={hp} maxHp={maxHp} />

      {/* Raid advantage */}
      <RaidAdvantage tier={label} />

      {/* Top contributors */}
      {contributors.length > 0 && <TopContributors contributors={contributors} />}
    </div>
  );
}

// ─── Dev preview ─────────────────────────────────────────────────────────────
// Remove this if using as imported component
export function CastleHPPreview() {
  const mockContributors = [
    { nickname: "Rishi_7", hpContrib: 160 },
    { nickname: "Priya_10", hpContrib: 140 },
    { nickname: "Arjun_CF", hpContrib: 120 },
  ];

  const [hp, setHp] = useState(6302);

  return (
    <div style={{ background: C.pitch, minHeight: "100vh", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Fortress */}
      <CastleHP hp={8200} maxHp={10000} contributors={mockContributors} />
      {/* Standing */}
      <CastleHP hp={hp} maxHp={10000} contributors={mockContributors} />
      {/* Weakened */}
      <CastleHP hp={1800} maxHp={10000} contributors={[]} />

      {/* Simulate XP coming in */}
      <button
        onClick={() => setHp((h) => Math.min(10000, h + 200))}
        style={{
          background: C.green,
          color: "#060f1c",
          border: "none",
          borderRadius: 10,
          padding: "12px",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        +200 XP (simulate award)
      </button>
    </div>
  );
}