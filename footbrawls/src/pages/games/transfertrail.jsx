/**
 * TransferTrail.jsx
 * Connect player A → player B via shared clubs in fewest steps.
 * Each step: pick a club that the current player played for,
 * then pick a teammate at that club — that teammate becomes the new "current" player.
 * Reach the target player to win.
 *
 * players.json shape assumed:
 * {
 *   id, name, flag, nationality, club, position, clubs: ["Man Utd", "Real Madrid", ...]
 * }
 *
 * Usage:
 *   <TransferTrail players={playersArray} userId={uid} onComplete={(result) => {}} />
 */

import { useState, useEffect, useMemo } from "react";
import { getDailyTrail, getActivePuzzleDate } from '../../lib/dailySeed.js';
import { awardXP } from '../../lib/xpEngine.js';
import { getUser } from '../../lib/user';

const MAX_STEPS = 6;
const XP_BY_STEPS = { 1: 20, 2: 20, 3: 20, 4: 15, 5: 10, 6: 5 };

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
// ─── Build club → players index from players array ────────────────────────────
function buildClubIndex(players) {
  const index = {};
  players.forEach((p) => {
    const clubs = p.clubs || [p.club];
    clubs.forEach((club) => {
      if (!index[club]) index[club] = [];
      index[club].push(p);
    });
  });
  return index;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerPill({ player, isStart, isEnd, isCurrent, isReached }) {
  const bg = isReached
    ? `${C.green}26`
    : isCurrent
    ? `${C.blue}26`
    : isStart || isEnd
    ? C.accentDim
    : C.surface2;
  const border = isReached
    ? `${C.green}66`
    : isCurrent
    ? `${C.blue}66`
    : isStart || isEnd
    ? `${C.accent}4D`
    : C.border2;
  const labelColor = isReached
    ? C.green
    : isCurrent
    ? C.blue
    : isStart || isEnd
    ? C.accent
    : C.text;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 99,
        padding: "6px 12px 6px 8px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <span style={{ fontSize: 16 }}>{player?.flag || "🏳️"}</span>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: labelColor,
            lineHeight: 1.1,
          }}
        >
          {player?.name}
        </div>
        <div style={{ fontSize: 10, color: C.muted2 }}>{player?.club}</div>
      </div>
      {(isStart || isEnd) && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: isEnd ? C.accentDim : `${C.blue}33`,
            color: isEnd ? C.accent : C.blue,
            borderRadius: 4,
            padding: "1px 5px",
            marginLeft: 2,
          }}
        >
          {isStart ? "START" : "TARGET"}
        </span>
      )}
    </div>
  );
}

function TrailStep({ step, index }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderBottom: `1px solid ${C.border}`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: C.surface2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: C.muted,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>
          via{" "}
          <span
            style={{
              color: C.blue,
              fontWeight: 600,
              background: `${C.blue}1A`,
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            {step.club}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
          {step.player.name}
        </div>
      </div>
      <span style={{ fontSize: 16 }}>{step.player.flag || "🏳️"}</span>
    </div>
  );
}

// Phase A: pick a club from current player's history
function ClubPicker({ player, usedClubs, onPick }) {
  const clubs = (player?.clubs || [player?.club]).filter(
    (c) => c && !usedClubs.has(c)
  );

  return (
    <div style={{ padding: "12px 16px" }}>
      <div
        style={{
          fontSize: 12,
          color: C.muted,
          marginBottom: 10,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Pick a club{" "}
        <strong style={{ color: C.text }}>{player?.name}</strong> played for:
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {clubs.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted2, fontFamily: "'DM Sans', sans-serif" }}>
            No clubs available — trail blocked!
          </div>
        ) : (
          clubs.map((club) => (
            <button
              key={club}
              onClick={() => onPick(club)}
              style={{
                background: `${C.blue}1A`,
                border: `1px solid ${C.blue}4D`,
                borderRadius: 99,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: C.blue,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {club}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// Phase B: pick a teammate at the chosen club
function TeammatePicker({ club, players, clubIndex, usedPlayerIds, targetPlayer, onPick }) {
  const [query, setQuery] = useState("");
  const teammates = (clubIndex[club] || []).filter(
    (p) => !usedPlayerIds.has(p.id)
  );
  const results = query.length > 1
    ? teammates.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : teammates.slice(0, 8);

  return (
    <div style={{ padding: "12px 16px" }}>
      <div
        style={{
          fontSize: 12,
          color: C.muted,
          marginBottom: 10,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Pick a{" "}
        <span
          style={{
            color: C.blue,
            fontWeight: 700,
            background: `${C.blue}1A`,
            padding: "1px 6px",
            borderRadius: 4,
          }}
        >
          {club}
        </span>{" "}
        teammate to continue the trail:
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search teammate…"
        style={{
          width: "100%",
          background: C.surface2,
          border: `1px solid ${C.border2}`,
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 13,
          color: C.text,
          outline: "none",
          marginBottom: 10,
          fontFamily: "'DM Sans', sans-serif",
          boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.length === 0 && (
          <div style={{ fontSize: 12, color: C.muted2, fontFamily: "'DM Sans', sans-serif" }}>
            No results
          </div>
        )}
        {results.map((p) => {
          const isTarget = p.id === targetPlayer?.id;
          return (
            <div
              key={p.id}
              onClick={() => onPick(p)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: isTarget ? `${C.green}14` : C.surface2,
                border: `1px solid ${isTarget ? `${C.green}4D` : C.border2}`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                transition: "border-color 0.15s",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = `${C.blue}66`)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = isTarget
                  ? `${C.green}4D`
                  : C.border2)
              }
            >
              <span style={{ fontSize: 18 }}>{p.flag || "🏳️"}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isTarget ? C.green : C.text,
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: C.muted2 }}>
                  {p.position} · {p.nationality}
                </div>
              </div>
              {isTarget && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.green,
                    background: `${C.green}26`,
                    padding: "2px 7px",
                    borderRadius: 99,
                  }}
                >
                  TARGET
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransferTrail({ players = [], userId, onComplete }) {
  const { start, end } = useMemo(
    () => { const pd = getActivePuzzleDate(); return getDailyTrail(players, pd) || { start: players[0], end: players[11] }; },
    [players]
  );

  const clubIndex = useMemo(() => buildClubIndex(players), [players]);

  const [currentPlayer, setCurrentPlayer]   = useState(start);
  const [trail, setTrail]                   = useState([]); // [{club, player}]
  const [phase, setPhase]                   = useState("club"); // "club" | "teammate"
  const [selectedClub, setSelectedClub]     = useState(null);
  const [usedClubs]                         = useState(new Set());
  const [usedPlayerIds]                     = useState(new Set([start?.id]));
  const [gameOver, setGameOver]             = useState(false);
  const [solved, setSolved]                 = useState(false);
  const [xpAwarded, setXpAwarded]           = useState(0);

  // Load saved state
  useEffect(() => {
    const key = `tt_${start?.id}_${end?.id}_state`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const s = JSON.parse(saved);
      setTrail(s.trail);
      setGameOver(s.gameOver);
      setSolved(s.solved);
      setXpAwarded(s.xpAwarded);
      if (s.currentPlayerId) {
        const cp = players.find((p) => p.id === s.currentPlayerId);
        if (cp) setCurrentPlayer(cp);
      }
    }
  }, [start, end]);

  function persist(updates) {
    const key = `tt_${start?.id}_${end?.id}_state`;
    localStorage.setItem(key, JSON.stringify(updates));
  }

  function handleClubPick(club) {
    setSelectedClub(club);
    setPhase("teammate");
  }

  async function handleTeammatePick(player) {
    const newStep = { club: selectedClub, player };
    const newTrail = [...trail, newStep];
    usedClubs.add(selectedClub);
    usedPlayerIds.add(player.id);

    const won = player.id === end?.id;
    const lost = !won && newTrail.length >= MAX_STEPS;

    let xp = 0;
    if (won) {
      const raw = XP_BY_STEPS[newTrail.length] ?? 5;
      if (userId) {
        const result = await awardXP(userId, "transferTrail", raw);
        xp = result.awarded;
      } else {
        xp = raw;
      }
    }

    setTrail(newTrail);
    setCurrentPlayer(player);
    setSelectedClub(null);
    setPhase("club");

    if (won || lost) {
      setGameOver(true);
      setSolved(won);
      setXpAwarded(xp);
      persist({
        trail: newTrail,
        gameOver: true,
        solved: won,
        xpAwarded: xp,
        currentPlayerId: player.id,
      });
      if (onComplete) {
        onComplete({
          gameId: "transferTrail",
          solved: won,
          stepsUsed: newTrail.length,
          xpAwarded: xp,
        });
      }
    } else {
      persist({
        trail: newTrail,
        gameOver: false,
        solved: false,
        xpAwarded: 0,
        currentPlayerId: player.id,
      });
    }
  }

  if (!start || !end) {
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
            🔗 TRANSFER TRAIL
          </div>
          <div style={{ fontSize: 11, color: C.muted2, marginTop: 2 }}>
            {gameOver
              ? solved
                ? `Solved in ${trail.length} step${trail.length !== 1 ? "s" : ""}!`
                : "Out of steps"
              : `Step ${trail.length + 1} of ${MAX_STEPS}`}
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
          Max 20 XP
        </div>
      </div>

      {/* Start → End header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderBottom: `1px solid ${C.border2}`,
          flexWrap: "wrap",
        }}
      >
        <PlayerPill player={start} isStart />
        <div
          style={{
            fontSize: 18,
            color: C.surface2,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          →
        </div>
        <PlayerPill player={end} isEnd />
      </div>

      {/* Step progress dots */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border2}`,
          alignItems: "center",
        }}
      >
        {Array.from({ length: MAX_STEPS }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background:
                i < trail.length
                  ? solved && i === trail.length - 1
                    ? C.green
                    : C.blue
                  : C.surface2,
              transition: "background 0.3s",
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: C.muted2, whiteSpace: "nowrap" }}>
          {trail.length}/{MAX_STEPS}
        </span>
      </div>

      {/* Current player */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border2}` }}>
        <div style={{ fontSize: 11, color: C.muted2, marginBottom: 6 }}>
          Currently at:
        </div>
        <PlayerPill
          player={currentPlayer}
          isCurrent={!gameOver}
          isReached={solved && currentPlayer?.id === end?.id}
        />
      </div>

      {/* Trail history */}
      {trail.length > 0 && (
        <div style={{ borderBottom: `1px solid ${C.border2}` }}>
          {trail.map((step, i) => (
            <TrailStep key={i} step={step} index={i} />
          ))}
        </div>
      )}

      {/* Input phase or result */}
      {!gameOver ? (
        phase === "club" ? (
          <ClubPicker
            player={currentPlayer}
            usedClubs={usedClubs}
            onPick={handleClubPick}
          />
        ) : (
          <TeammatePicker
            club={selectedClub}
            players={players}
            clubIndex={clubIndex}
            usedPlayerIds={usedPlayerIds}
            targetPlayer={end}
            onPick={handleTeammatePick}
          />
        )
      ) : (
        <div
          style={{
            margin: "16px 16px 0",
            background: solved ? `${C.green}14` : `${C.red}14`,
            border: `1px solid ${
              solved ? `${C.green}4D` : `${C.red}4D`
            }`,
            borderRadius: 14,
            padding: "20px 16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>
            {solved ? "⛓️" : "😔"}
          </div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: solved ? C.green : C.red,
              marginBottom: 4,
            }}
          >
            {solved
              ? `Connected in ${trail.length}!`
              : "Trail went cold"}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            {solved
              ? `${start?.name} → ${end?.name}`
              : `Couldn't reach ${end?.name}`}
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