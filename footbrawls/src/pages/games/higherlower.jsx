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
    ? animState === "correct"
      ? "rgba(0,229,160,0.12)"
      : "rgba(255,77,106,0.12)"
    : "#101f35";
  const borderColor = revealed
    ? animState === "correct"
      ? "rgba(0,229,160,0.35)"
      : "rgba(255,77,106,0.35)"
    : "#1a2f4a";

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
          color: "#e8edf5",
          letterSpacing: 0.3,
          lineHeight: 1.2,
          textAlign: "center",
        }}
      >
        {player?.name}
      </div>
      <div style={{ fontSize: 11, color: "#5a7090" }}>{player?.club}</div>
      <div style={{ fontSize: 11, color: "#7b96b8" }}>{player?.position}</div>

      {/* Value */}
      <div
        style={{
          marginTop: 8,
          background: "#0c1a2e",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 700,
          color: revealed ? "#e8edf5" : "#5a7090",
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
          background: "rgba(0,229,160,0.1)",
          border: "1px solid rgba(0,229,160,0.3)",
          borderRadius: 12,
          padding: "14px",
          color: "#00e5a0",
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
          background: "rgba(255,77,106,0.1)",
          border: "1px solid rgba(255,77,106,0.3)",
          borderRadius: 12,
          padding: "14px",
          color: "#ff4d6a",
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
        color: "#7b96b8",
      }}
    >
      {Array.from({ length: Math.max(5, streak + 1) }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i < streak ? 18 : 14,
            height: i < streak ? 18 : 14,
            borderRadius: "50%",
            background: i < streak ? "#f5c842" : "#1a2f4a",
            border: `2px solid ${i < streak ? "#f5c842" : "#1a2f4a"}`,
            boxShadow: i < streak ? "0 0 6px rgba(245,200,66,0.5)" : "none",
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
      if (userId && raw > 0) {
        const result = await awardXP(userId, "higherLower", raw);
        xp = result.awarded;
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
      <div style={{ padding: 32, textAlign: "center", color: "#5a7090" }}>
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#07111f",
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
          borderBottom: "1px solid #1a2f4a",
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
              color: "#e8edf5",
            }}
          >
            📊 HIGHER OR LOWER
          </div>
          <div style={{ fontSize: 11, color: "#5a7090", marginTop: 2 }}>
            {gameOver ? `Final streak: ${streak}` : `Round ${round + 1} · Streak ${streak}`}
          </div>
        </div>
        <div
          style={{
            background: "rgba(245,200,66,0.12)",
            border: "1px solid rgba(245,200,66,0.25)",
            borderRadius: 99,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
            color: "#f5c842",
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
          color: "#7b96b8",
          fontWeight: 500,
        }}
      >
        Does{" "}
        <strong style={{ color: "#e8edf5" }}>{playerB?.name}</strong>
        {" "}have a{" "}
        <span
          style={{
            color: "#4fa3ff",
            fontWeight: 700,
            background: "rgba(79,163,255,0.12)",
            padding: "1px 7px",
            borderRadius: 6,
          }}
        >
          {attr.label}
        </span>{" "}
        higher or lower than{" "}
        <strong style={{ color: "#e8edf5" }}>{playerA?.name}</strong>?
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
            color: "#1a2f4a",
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
            background: "rgba(255,77,106,0.08)",
            border: "1px solid rgba(255,77,106,0.3)",
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
              color: "#e8edf5",
              marginBottom: 4,
            }}
          >
            Streak of {streak}
          </div>
          <div style={{ fontSize: 13, color: "#7b96b8", marginBottom: 12 }}>
            {playerB?.[attr.key]} vs {playerA?.[attr.key]} {attr.unit}
          </div>
          {xpAwarded > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(245,200,66,0.15)",
                border: "1px solid rgba(245,200,66,0.3)",
                borderRadius: 99,
                padding: "4px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "#f5c842",
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