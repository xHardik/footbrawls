/**
 * HigherLower.jsx
 * Compare two players on age, caps, goals, and market value.
 * Streak-based — keep going until you get one wrong.
 * Daily seed determines the starting pair; each correct answer advances
 * to the next player in the seeded sequence.
 *
 * Usage:
 *   <HigherLower players={playersArray} userId={uid} onComplete={(result) => {}} />
 */

import { useState, useEffect } from "react";
import { getDailySeed, getDailyPlayer, getActivePuzzleDate } from "../../lib/dailySeed.js";
import { awardXP } from '../../lib/xpEngine.js';
import { getUser } from '../../lib/user';

const GAME_ID = "higherLower";
const MAX_XP   = 15;

const C = {
  bg:      "#060810",
  bg2:     "#0c0f1a",
  surface: "rgba(255,255,255,0.04)",
  surface2:"rgba(255,255,255,0.07)",
  surface3:"rgba(255,255,255,0.11)",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  accent:  "#F7C344",
  accentDim: "rgba(247,195,68,0.12)",
  green:   "#3DD68C",
  red:     "#E84040",
  blue:    "#4F8EF7",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};
// Attributes to compare — shown one at a time, randomly selected per round
const ATTRIBUTES = [
  { key: "age",         label: "Age",          unit: "yrs",  format: (v) => v },
  { key: "caps",        label: "Int'l Caps",   unit: "",     format: (v) => v },
  { key: "goals",       label: "Career Goals", unit: "",     format: (v) => v },
  { key: "marketValue", label: "Market Value", unit: "M€",   format: (v) => `€${v}M` },
];

function getAttrForRound(roundIndex) {
  return ATTRIBUTES[roundIndex % ATTRIBUTES.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSequencedPlayer(players, roundOffset) {
  const seed = getDailySeed();
  const baseOffset = 67; // GAME_OFFSETS.higherLower
  return players[(seed + baseOffset + roundOffset) % players.length];
}

function formatValue(attr, player) {
  return attr.format(player[attr.key]);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerCard({ player, attr, revealed, isRight, answer, animState }) {
  const bgColor = revealed
    ? animState === "correct" ? `${C.green}1F` : `${C.red}1F`
    : C.surface2;
  const borderColor = revealed
    ? animState === "correct" ? `${C.green}59` : `${C.red}59`
    : C.border2;

  return (
    <div
      style={{
        flex: 1,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: "16px 12px",
        textAlign: "center",
        transition: "all 0.3s",
        minHeight: 160,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ fontSize: 28 }}>{player?.flag || "🏳️"}</div>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: C.text,
          letterSpacing: 0.3,
          lineHeight: 1.2,
          textAlign: "center",
        }}
      >
        {player?.name}
      </div>
      <div style={{ fontSize: 11, color: C.muted2 }}>{player?.club}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{player?.position}</div>

      {/* Value */}
      <div
        style={{
          marginTop: 8,
          background: C.bg2,
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 700,
          color: revealed ? C.text : C.muted2,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: 1,
          minWidth: 80,
        }}
      >
        {revealed || !isRight ? formatValue(attr, player) : "???"}
      </div>
    </div>
  );
}

function ChoiceButtons({ onHigher, onLower, disabled }) {
  return (
    <div style={{ display: "flex", gap: 10, margin: "0 16px" }}>
      <button
        onClick={onHigher}
        disabled={disabled}
        style={{
          flex: 1,
          background: `${C.green}1A`,
          border: `1px solid ${C.green}4D`,
          borderRadius: 12,
          padding: "14px",
          color: C.green,
          fontSize: 15,
          fontWeight: 700,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
      >
        <span style={{ fontSize: 22 }}>↑</span>
        Higher
      </button>
      <button
        onClick={onLower}
        disabled={disabled}
        style={{
          flex: 1,
          background: `${C.red}1A`,
          border: `1px solid ${C.red}4D`,
          borderRadius: 12,
          padding: "14px",
          color: C.red,
          fontSize: 15,
          fontWeight: 700,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
      >
        <span style={{ fontSize: 22 }}>↓</span>
        Lower
      </button>
    </div>
  );
}

function StreakBar({ streak }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        color: C.muted,
      }}
    >
      {Array.from({ length: Math.max(5, streak + 1) }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i < streak ? 18 : 14,
            height: i < streak ? 18 : 14,
            borderRadius: "50%",
            background: i < streak ? C.accent : C.surface2,
            border: `2px solid ${i < streak ? C.accent : C.surface2}`,
            boxShadow: i < streak ? `0 0 6px ${C.accent}80` : "none",
            transition: "all 0.2s",
          }}
        />
      ))}
      <span style={{ marginLeft: 4 }}>Streak: {streak}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HigherLower({ players = [], userId, onComplete }) {
  const [round, setRound]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [gameOver, setGameOver]   = useState(false);
  const [revealed, setRevealed]   = useState(false);
  const [animState, setAnimState] = useState(null); // "correct" | "wrong"
  const [xpAwarded, setXpAwarded] = useState(0);

  // Load saved state
  useEffect(() => {
    const puzzleDate = getActivePuzzleDate();
    const key = `hl_${puzzleDate}_state`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const s = JSON.parse(saved);
      setRound(s.round);
      setStreak(s.streak);
      setGameOver(s.gameOver);
      setXpAwarded(s.xpAwarded);
    }
  }, []);

  const playerA = getSequencedPlayer(players, round);
  const playerB = getSequencedPlayer(players, round + 1);
  const attr    = getAttrForRound(round);

  function persist(updates) {
    const puzzleDate = getActivePuzzleDate();
    const key = `hl_${puzzleDate}_state`;
    localStorage.setItem(key, JSON.stringify(updates));
  }

  async function handleChoice(choice) {
    if (revealed || gameOver || !playerA || !playerB) return;

    const valA = playerA[attr.key];
    const valB = playerB[attr.key];

    let correct = false;
    if (choice === "higher") correct = valB > valA;
    else if (choice === "lower") correct = valB < valA;
    else if (choice === "equal") correct = valB === valA;

    // Handle equal edge case — equal = both higher and lower wrong, tell user
    if (valA === valB) correct = true;

    setRevealed(true);
    setAnimState(correct ? "correct" : "wrong");

    if (correct) {
      const newStreak = streak + 1;
      setTimeout(async () => {
        setStreak(newStreak);
        setRevealed(false);
        setAnimState(null);
        setRound((r) => r + 1);
        persist({ round: round + 1, streak: newStreak, gameOver: false, xpAwarded });
      }, 900);
    } else {
      // Game over
      const raw = Math.min(MAX_XP, Math.round((streak / 10) * MAX_XP));
      let xp = 0;
      const currentUser = getUser();
      const uid = userId || currentUser?.userId;
      if (uid && raw > 0) {
        const result = await awardXP(uid, "higherLower", { rawXP: raw });
        xp = result?.xpAwarded ?? raw;
      } else {
        xp = raw;
      }
      setTimeout(() => {
        setGameOver(true);
        setXpAwarded(xp);
        persist({ round, streak, gameOver: true, xpAwarded: xp });
        if (onComplete) onComplete({ gameId: "higherLower", streak, xpAwarded: xp });
      }, 900);
    }
  }

  if (!playerA || !playerB) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: C.muted2 }}>
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        maxWidth: 430,
        margin: "0 auto",
        paddingBottom: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${C.border2}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: C.text,
            }}
          >
            📊 HIGHER OR LOWER
          </div>
          <div style={{ fontSize: 11, color: C.muted2, marginTop: 2 }}>
            {gameOver ? `Final streak: ${streak}` : `Round ${round + 1} · Streak ${streak}`}
          </div>
        </div>
        <div
          style={{
            background: C.accentDim,
            border: `1px solid ${C.accent}40`,
            borderRadius: 99,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
            color: C.accent,
          }}
        >
          Max 15 XP
        </div>
      </div>

      {/* Attribute label */}
      <div
        style={{
          textAlign: "center",
          padding: "16px 16px 10px",
          fontSize: 13,
          color: C.muted,
          fontWeight: 500,
        }}
      >
        Does{" "}
        <strong style={{ color: C.text }}>{playerB?.name}</strong>
        {" "}have a{" "}
        <span
          style={{
            color: C.blue,
            fontWeight: 700,
            background: `${C.blue}1F`,
            padding: "1px 7px",
            borderRadius: 6,
          }}
        >
          {attr.label}
        </span>{" "}
        higher or lower than{" "}
        <strong style={{ color: C.text }}>{playerA?.name}</strong>?
      </div>

      {/* Cards */}
      <div style={{ display: "flex", gap: 10, padding: "0 16px", marginBottom: 16 }}>
        <PlayerCard
          player={playerA}
          attr={attr}
          revealed={true}
          isRight={false}
          animState={null}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 32,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: C.surface2,
          }}
        >
          VS
        </div>
        <PlayerCard
          player={playerB}
          attr={attr}
          revealed={revealed}
          isRight={true}
          animState={animState}
        />
      </div>

      {/* Streak */}
      <div style={{ marginBottom: 16 }}>
        <StreakBar streak={streak} />
      </div>

      {/* Buttons or result */}
      {!gameOver ? (
        <ChoiceButtons
          onHigher={() => handleChoice("higher")}
          onLower={() => handleChoice("lower")}
          disabled={revealed}
        />
      ) : (
        <div
          style={{
            margin: "0 16px",
            background: `${C.red}14`,
            border: `1px solid ${C.red}4D`,
            borderRadius: 14,
            padding: "20px 16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>
            {streak >= 8 ? "🔥" : streak >= 5 ? "⚡" : "💪"}
          </div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
              marginBottom: 4,
            }}
          >
            Streak of {streak}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            {playerB?.[attr.key]} vs {playerA?.[attr.key]} {attr.unit}
          </div>
          {xpAwarded > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: C.accentDim,
                border: `1px solid ${C.accent}4D`,
                borderRadius: 99,
                padding: "4px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: C.accent,
              }}
            >
              +{xpAwarded} XP earned
            </div>
          )}
        </div>
      )}
    </div>
  );
}