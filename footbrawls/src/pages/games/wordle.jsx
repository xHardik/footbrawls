/**
 * Wordle.jsx
 * Player Wordle — guess the footballer from attribute colour feedback.
 * 6 guesses. Green = exact match, Yellow = close/partial, Grey = wrong.
 *
 * Attributes compared:
 *   nationality, position, age, caps, goals, club
 *
 * Usage:
 *   <Wordle players={playersArray} userId={uid} onComplete={(result) => {}} />
 */

import { useState, useEffect, useRef } from "react";
import { getDailyPlayer, getActivePuzzleDate } from '../../lib/dailySeed.js';
import { awardXP } from '../../lib/xpEngine.js';

// ─── XP table (PRD §9) ───────────────────────────────────────────────────────
const XP_BY_GUESS = { 1: 20, 2: 20, 3: 20, 4: 15, 5: 10, 6: 5 };
const MAX_GUESSES = 6;

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

const CLR = {
  correct:  { bg: C.green, text: C.bg },
  close:    { bg: C.accent, text: C.bg },
  wrong:    { bg: C.surface2, text: C.muted },
  empty:    { bg: C.surface, text: C.muted2 },
};

// ─── Attribute comparison helpers ────────────────────────────────────────────
function compareAge(guess, answer) {
  if (guess.age === answer.age) return "correct";
  if (Math.abs(guess.age - answer.age) <= 3) return "close";
  return "wrong";
}

function compareCaps(guess, answer) {
  if (guess.caps === answer.caps) return "correct";
  if (Math.abs(guess.caps - answer.caps) <= 15) return "close";
  return "wrong";
}

function compareGoals(guess, answer) {
  if (guess.goals === answer.goals) return "correct";
  if (Math.abs(guess.goals - answer.goals) <= 10) return "close";
  return "wrong";
}

/**
 * Returns a row of 6 cell results for a guess vs the answer player.
 * Each cell: { label, hint: "correct"|"close"|"wrong", arrow? }
 */
function evaluateGuess(guess, answer) {
  return [
    {
      key: "name",
      label: guess.name,
      hint: guess.name === answer.name ? "correct" : "wrong",
      isName: true,
    },
    {
      key: "nationality",
      label: guess.nationality,
      hint: guess.nationality === answer.nationality ? "correct" : "wrong",
    },
    {
      key: "position",
      label: guess.position,
      hint: guess.position === answer.position
        ? "correct"
        : guess.positionGroup === answer.positionGroup
        ? "close"
        : "wrong",
    },
    {
      key: "age",
      label: String(guess.age),
      hint: compareAge(guess, answer),
      arrow:
        guess.age < answer.age ? "↑" : guess.age > answer.age ? "↓" : null,
    },
    {
      key: "caps",
      label: String(guess.caps),
      hint: compareCaps(guess, answer),
      arrow:
        guess.caps < answer.caps ? "↑" : guess.caps > answer.caps ? "↓" : null,
    },
    {
      key: "club",
      label: guess.club,
      hint: guess.club === answer.club
        ? "correct"
        : guess.league === answer.league
        ? "close"
        : "wrong",
    },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Cell({ label, hint = "empty", arrow, isName }) {
  const c = CLR[hint];
  return (
    <div
      style={{
        flex: isName ? 2 : 1,
        background: c.bg,
        color: c.text,
        borderRadius: 8,
        padding: "6px 4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: isName ? 11 : 10,
        fontWeight: 700,
        minHeight: 44,
        textAlign: "center",
        lineHeight: 1.2,
        wordBreak: "break-word",
        gap: 2,
        fontFamily: "'DM Sans', sans-serif",
        transition: "background 0.3s",
      }}
    >
      <span>{label || "—"}</span>
      {arrow && (
        <span style={{ fontSize: 12, opacity: 0.8 }}>{arrow}</span>
      )}
    </div>
  );
}

function HeaderRow() {
  const cols = ["Player", "Nation", "Pos", "Age", "Caps", "Club"];
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 6, padding: "0 16px" }}>
      {cols.map((c, i) => (
        <div
          key={c}
          style={{
            flex: i === 0 ? 2 : 1,
            fontSize: 9,
            color: C.muted2,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
          }}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

function GuessRow({ cells, animating }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "0 16px",
        marginBottom: 4,
        opacity: animating ? 0 : 1,
        transform: animating ? "translateY(6px)" : "none",
        transition: "all 0.25s ease",
      }}
    >
      {cells.map((cell) => (
        <Cell key={cell.key} {...cell} />
      ))}
    </div>
  );
}

function EmptyRow() {
  const empties = [
    { key: "name", hint: "empty", isName: true },
    { key: "nat",  hint: "empty" },
    { key: "pos",  hint: "empty" },
    { key: "age",  hint: "empty" },
    { key: "caps", hint: "empty" },
    { key: "club", hint: "empty" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 16px", marginBottom: 4 }}>
      {empties.map((e) => (
        <Cell key={e.key} hint="empty" isName={e.isName} />
      ))}
    </div>
  );
}

// ─── Search dropdown ──────────────────────────────────────────────────────────

function PlayerSearch({ players, usedIds, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const results = query.length > 1
    ? players
        .filter(
          (p) =>
            !usedIds.has(p.id) &&
            p.name.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 6)
    : [];

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function pick(player) {
    onSelect(player);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative", padding: "0 16px" }}>
      <div
        style={{
          display: "flex",
          background: C.surface2,
          border: `1px solid ${C.border2}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search player name…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "12px 14px",
            fontSize: 14,
            color: C.text,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button
          onClick={() => {
            if (results.length > 0) pick(results[0]);
          }}
          style={{
            background: C.blue,
            color: "#fff",
            border: "none",
            padding: "0 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Guess
        </button>
      </div>

      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: "calc(100% + 4px)",
            background: C.bg2,
            border: `1px solid ${C.border2}`,
            borderRadius: 10,
            overflow: "hidden",
            zIndex: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {results.map((p) => (
            <div
              key={p.id}
              onClick={() => pick(p)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: 13,
                color: C.text,
                fontFamily: "'DM Sans', sans-serif",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surface3)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 16 }}>{p.flag || "🏳️"}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.muted2 }}>
                  {p.club} · {p.position}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Result screen ────────────────────────────────────────────────────────────

function ResultScreen({ solved, answer, guessCount, xpAwarded, onShare }) {
  return (
    <div
      style={{
        margin: "16px 16px 0",
        background: solved ? `${C.green}14` : `${C.red}14`,
        border: `1px solid ${solved ? `${C.green}4D` : `${C.red}4D`}`,
        borderRadius: 14,
        padding: "18px 16px",
        textAlign: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 8 }}>
        {solved ? "🎉" : "😔"}
      </div>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: solved ? C.green : C.red,
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        {solved ? `Solved in ${guessCount}!` : "Better luck tomorrow"}
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
        The answer was{" "}
        <strong style={{ color: C.text }}>{answer.name}</strong>
      </div>
      {solved && (
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
            marginBottom: 14,
          }}
        >
          +{xpAwarded} XP earned
        </div>
      )}
      <button
        onClick={onShare}
        style={{
          display: "block",
          width: "100%",
          background: C.surface2,
          border: `1px solid ${C.border2}`,
          borderRadius: 10,
          padding: "10px",
          color: C.text,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Share result 📤 (+15 XP)
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Wordle({ players = [], userId, onComplete }) {
  const puzzleDate = getActivePuzzleDate();
  const answer = getDailyPlayer(players, 'wordle', puzzleDate);

  const [guesses, setGuesses]     = useState([]); // array of evaluated rows
  const [usedIds]                 = useState(new Set());
  const [gameOver, setGameOver]   = useState(false);
  const [solved, setSolved]       = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Load today's saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wordle_${answer?.id}_state`);
    if (saved) {
      const { guesses: g, solved: s, xpAwarded: x } = JSON.parse(saved);
      setGuesses(g);
      setSolved(s);
      setXpAwarded(x);
      setGameOver(s || g.length >= MAX_GUESSES);
      g.forEach((row) => usedIds.add(row[0]?.playerId));
    }
  }, [answer]);

  async function handleGuess(player) {
    if (!answer || gameOver) return;

    setAnimating(true);
    setTimeout(() => setAnimating(false), 50);

    const evaluated = evaluateGuess(player, answer);
    evaluated[0].playerId = player.id;
    usedIds.add(player.id);

    const newGuesses = [...guesses, evaluated];
    const won = player.id === answer.id || player.name === answer.name;
    const lost = !won && newGuesses.length >= MAX_GUESSES;
    const over = won || lost;

    let xp = 0;
    if (won) {
      const raw = XP_BY_GUESS[newGuesses.length] ?? 5;
      if (userId) {
        const result = await awardXP(userId, "wordle", raw);
        xp = result.awarded;
      } else {
        xp = raw;
      }
    }

    setGuesses(newGuesses);
    setSolved(won);
    setGameOver(over);
    setXpAwarded(xp);

    // Persist
    localStorage.setItem(
      `wordle_${answer.id}_state`,
      JSON.stringify({ guesses: newGuesses, solved: won, xpAwarded: xp })
    );

    if (over && onComplete) {
      onComplete({
        gameId: "wordle",
        solved: won,
        guessNumber: newGuesses.length,
        xpAwarded: xp,
      });
    }
  }

  function handleShare() {
    const emoji = guesses
      .map((row) =>
        row
          .map((c) =>
            c.hint === "correct" ? "🟩" : c.hint === "close" ? "🟨" : "⬛"
          )
          .join("")
      )
      .join("\n");
    const text = `Footbrawls Wordle ${solved ? guesses.length : "X"}/${MAX_GUESSES}\n${emoji}\nfootbrawls.gg`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
    }
    if (userId) awardXP(userId, "wordle_share", 15);
  }

  if (!answer) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: C.muted2, fontFamily: "'DM Sans',sans-serif" }}>
        Loading today's player…
      </div>
    );
  }

  const remaining = MAX_GUESSES - guesses.length;

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
              letterSpacing: 0.5,
            }}
          >
            🟩 PLAYER WORDLE
          </div>
          <div style={{ fontSize: 11, color: C.muted2, marginTop: 2 }}>
            {gameOver
              ? solved
                ? "Solved!"
                : "Better luck tomorrow"
              : `${remaining} guess${remaining !== 1 ? "es" : ""} remaining`}
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
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Max 20 XP
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "10px 16px",
          borderBottom: `1px solid ${C.border2}`,
        }}
      >
        {[
          { color: "#00e5a0", label: "Correct" },
          { color: "#f5c842", label: "Close" },
          { color: "#1a2f4a", label: "Wrong" },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ paddingTop: 14 }}>
        <HeaderRow />

        {guesses.map((row, i) => (
          <GuessRow key={i} cells={row} animating={animating && i === guesses.length - 1} />
        ))}

        {/* Empty rows */}
        {!gameOver &&
          Array.from({ length: remaining }).map((_, i) => (
            <EmptyRow key={`empty-${i}`} />
          ))}
      </div>

      {/* Input or result */}
      <div style={{ marginTop: 16 }}>
        {!gameOver ? (
          <PlayerSearch
            players={players}
            usedIds={usedIds}
            onSelect={handleGuess}
          />
        ) : (
          <ResultScreen
            solved={solved}
            answer={answer}
            guessCount={guesses.length}
            xpAwarded={xpAwarded}
            onShare={handleShare}
          />
        )}
      </div>
    </div>
  );
}