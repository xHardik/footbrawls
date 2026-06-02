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
    ? "rgba(0,229,160,0.15)"
    : isCurrent
    ? "rgba(79,163,255,0.15)"
    : isStart || isEnd
    ? "rgba(245,200,66,0.1)"
    : "#101f35";
  const border = isReached
    ? "rgba(0,229,160,0.4)"
    : isCurrent
    ? "rgba(79,163,255,0.4)"
    : isStart || isEnd
    ? "rgba(245,200,66,0.3)"
    : "#1a2f4a";
  const labelColor = isReached
    ? "#00e5a0"
    : isCurrent
    ? "#4fa3ff"
    : isStart || isEnd
    ? "#f5c842"
    : "#e8edf5";

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
        <div style={{ fontSize: 10, color: "#5a7090" }}>{player?.club}</div>
      </div>
      {(isStart || isEnd) && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: isEnd ? "rgba(245,200,66,0.2)" : "rgba(79,163,255,0.2)",
            color: isEnd ? "#f5c842" : "#4fa3ff",
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
        borderBottom: "1px solid #0c1a2e",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#1a2f4a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "#7b96b8",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "#7b96b8", marginBottom: 2 }}>
          via{" "}
          <span
            style={{
              color: "#4fa3ff",
              fontWeight: 600,
              background: "rgba(79,163,255,0.1)",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            {step.club}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8edf5" }}>
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
          color: "#7b96b8",
          marginBottom: 10,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Pick a club{" "}
        <strong style={{ color: "#e8edf5" }}>{player?.name}</strong> played for:
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {clubs.length === 0 ? (
          <div style={{ fontSize: 12, color: "#5a7090", fontFamily: "'DM Sans', sans-serif" }}>
            No clubs available — trail blocked!
          </div>
        ) : (
          clubs.map((club) => (
            <button
              key={club}
              onClick={() => onPick(club)}
              style={{
                background: "rgba(79,163,255,0.1)",
                border: "1px solid rgba(79,163,255,0.3)",
                borderRadius: 99,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "#4fa3ff",
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
          color: "#7b96b8",
          marginBottom: 10,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Pick a{" "}
        <span
          style={{
            color: "#4fa3ff",
            fontWeight: 700,
            background: "rgba(79,163,255,0.1)",
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
          background: "#101f35",
          border: "1px solid #1a2f4a",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 13,
          color: "#e8edf5",
          outline: "none",
          marginBottom: 10,
          fontFamily: "'DM Sans', sans-serif",
          boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.length === 0 && (
          <div style={{ fontSize: 12, color: "#5a7090", fontFamily: "'DM Sans', sans-serif" }}>
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
                background: isTarget ? "rgba(0,229,160,0.08)" : "#101f35",
                border: `1px solid ${isTarget ? "rgba(0,229,160,0.3)" : "#1a2f4a"}`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                transition: "border-color 0.15s",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "rgba(79,163,255,0.4)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = isTarget
                  ? "rgba(0,229,160,0.3)"
                  : "#1a2f4a")
              }
            >
              <span style={{ fontSize: 18 }}>{p.flag || "🏳️"}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isTarget ? "#00e5a0" : "#e8edf5",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: "#5a7090" }}>
                  {p.position} · {p.nationality}
                </div>
              </div>
              {isTarget && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#00e5a0",
                    background: "rgba(0,229,160,0.15)",
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
            🔗 TRANSFER TRAIL
          </div>
          <div style={{ fontSize: 11, color: "#5a7090", marginTop: 2 }}>
            {gameOver
              ? solved
                ? `Solved in ${trail.length} step${trail.length !== 1 ? "s" : ""}!`
                : "Out of steps"
              : `Step ${trail.length + 1} of ${MAX_STEPS}`}
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
          borderBottom: "1px solid #1a2f4a",
          flexWrap: "wrap",
        }}
      >
        <PlayerPill player={start} isStart />
        <div
          style={{
            fontSize: 18,
            color: "#1a2f4a",
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
          borderBottom: "1px solid #1a2f4a",
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
                    ? "#00e5a0"
                    : "#4fa3ff"
                  : "#1a2f4a",
              transition: "background 0.3s",
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: "#5a7090", whiteSpace: "nowrap" }}>
          {trail.length}/{MAX_STEPS}
        </span>
      </div>

      {/* Current player */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a2f4a" }}>
        <div style={{ fontSize: 11, color: "#5a7090", marginBottom: 6 }}>
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
        <div style={{ borderBottom: "1px solid #1a2f4a" }}>
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
            background: solved
              ? "rgba(0,229,160,0.08)"
              : "rgba(255,77,106,0.08)",
            border: `1px solid ${solved ? "rgba(0,229,160,0.3)" : "rgba(255,77,106,0.3)"}`,
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
              color: solved ? "#00e5a0" : "#ff4d6a",
              marginBottom: 4,
            }}
          >
            {solved
              ? `Connected in ${trail.length}!`
              : "Trail went cold"}
          </div>
          <div style={{ fontSize: 13, color: "#7b96b8", marginBottom: 12 }}>
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