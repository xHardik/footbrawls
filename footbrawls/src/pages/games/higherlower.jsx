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
import { PLAYERS } from "../../lib/players.js";

const GAME_ID = "higherLower";
const MAX_XP   = 25;

const ATTRIBUTES = [
  { key: "age",         label: "Age",          unit: "yrs",  format: (v) => v },
  { key: "caps",        label: "Int'l Caps",   unit: "",     format: (v) => v },
  { key: "goals",       label: "Career Goals", unit: "",     format: (v) => v },
  { key: "marketValue", label: "Market Value", unit: "M€",   format: (v) => `€${v}M` },
];

function getAttrForRound(roundIndex) {
  return ATTRIBUTES[roundIndex % ATTRIBUTES.length];
}

function getSequencedPlayer(players, roundOffset) {
  const seed = getDailySeed();
  const baseOffset = 67; // GAME_OFFSETS.higherLower
  return players[(seed + baseOffset + roundOffset) % players.length];
}

function formatValue(attr, player) {
  return attr.format(player[attr.key]);
}

function getPuzzleDateLabel() {
  const puzzleDate = new Date(getActivePuzzleDate() + 'T00:00:00');
  return puzzleDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getPuzzleNumber() {
  const launch = new Date('2025-01-01T00:00:00');
  const puzzleDate = new Date(getActivePuzzleDate() + 'T00:00:00');
  return Math.floor((puzzleDate - launch) / (1000 * 60 * 60 * 24)) + 1;
}

function getResultPhrase(streak) {
  if (streak === 0) return "Better luck next time — study those football stats!";
  if (streak < 3)  return "Decent start. Keep building that streak!";
  if (streak < 6)  return "Solid effort — you know your football!";
  if (streak < 9)  return "Impressive! You're a genuine football stats expert.";
  return "LEGENDARY! Almost a perfect run. Outstanding!";
}

// ─── Ad helper ────────────────────────────────────────────────────────────────

const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    console.log("[AdSense H5 Mock] Triggering ad placement:", options.name);
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.type === 'reward') {
        const confirmReward = window.confirm(`[TEST AD] Watch this rewarded ad to save your streak?`);
        if (confirmReward) {
          if (options.adViewed) options.adViewed();
        } else {
          if (options.adDismissed) options.adDismissed();
        }
      } else {
        if (options.adViewed) options.adViewed();
      }
      if (options.afterAd) options.afterAd();
      if (options.adBreakDone) options.adBreakDone({ showStatus: "mocked" });
    }, 1000);
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RulesModal({ onClose }) {
  return (
    <div className="hl-modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hl-modal-box">
        <h2 className="hl-modal-title">⚽ How to Play</h2>
        <ul className="hl-rules-list">
          <li><span className="hl-rule-icon">👀</span>The left player's stat is revealed — study it carefully</li>
          <li><span className="hl-rule-icon">🤔</span>Guess if the right player's stat is <strong>Higher</strong> or <strong>Lower</strong></li>
          <li><span className="hl-rule-icon">🔥</span>Build a streak — every correct answer keeps you alive</li>
          <li><span className="hl-rule-icon">❌</span>One wrong answer ends the game immediately</li>
          <li><span className="hl-rule-icon">🏆</span>Max {MAX_XP} XP — survive as long as you can!</li>
        </ul>
        <div className="hl-scoring-box">
          <h3>💰 XP System — Max {MAX_XP} XP</h3>
          <div className="hl-scoring-item"><span>Each Correct Answer</span><span className="hl-scoring-value">Streak +1</span></div>
          <div className="hl-scoring-item"><span>Streak of 10</span><span className="hl-scoring-value">{MAX_XP} XP</span></div>
          <div className="hl-scoring-item"><span>Wrong Answer</span><span className="hl-scoring-value">Game Over</span></div>
        </div>
        <button className="hl-btn-primary" onClick={onClose}>🚀 Start Playing</button>
      </div>
    </div>
  );
}

function PlayerCard({ player, attr, revealed, isRight, animState }) {
  let cardClass = "hl-player-card";
  if (!isRight) cardClass += " hl-player-card-left";
  if (revealed && animState === "correct") cardClass += " hl-correct";
  else if (revealed && animState === "wrong") cardClass += " hl-wrong";

  return (
    <div className={cardClass}>
      <div className="hl-player-emoji">{player?.flag || "⚽"}</div>
      <div className="hl-player-name">{player?.name}</div>
      <div className="hl-player-stat-type">{attr.label}</div>
      {revealed || !isRight ? (
        <div className="hl-player-value">{formatValue(attr, player)}</div>
      ) : (
        <div className="hl-hidden-value">???</div>
      )}
      <div className="hl-player-club">{player?.club}</div>
      <div className="hl-player-pos">{player?.position}</div>
    </div>
  );
}

function ResultMessage({ animState, revealed, playerA, playerB, attr }) {
  if (!revealed) return null;
  const isCorrect = animState === "correct";
  return (
    <div className={`hl-result-message hl-result-message-show ${isCorrect ? 'hl-result-correct' : 'hl-result-wrong'}`}>
      {isCorrect
        ? `✅ Correct! ${playerB?.name}: ${formatValue(attr, playerB)} vs ${playerA?.name}: ${formatValue(attr, playerA)}`
        : `❌ Wrong! ${playerB?.name}: ${formatValue(attr, playerB)} vs ${playerA?.name}: ${formatValue(attr, playerA)}`
      }
    </div>
  );
}

function StreakBar({ streak }) {
  const count = Math.max(10, streak + 1);
  return (
    <div className="hl-streak-bar-wrapper">
      <div className="hl-streak-dots-row">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`hl-streak-pip ${i < streak ? 'active' : ''}`} />
        ))}
      </div>
      <span className="hl-streak-text">Streak: {streak}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HigherLower({ players = PLAYERS, userId, onComplete }) {
  const [round, setRound]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [gameOver, setGameOver]   = useState(false);
  const [revealed, setRevealed]   = useState(false);
  const [animState, setAnimState] = useState(null); // "correct" | "wrong"
  const [xpAwarded, setXpAwarded] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Rewarded ad states
  const [hasWatchedReviveAd, setHasWatchedReviveAd] = useState(false);
  const [isAdLoading, setIsAdLoading]               = useState(false);

  function triggerRewardedAdToSaveStreak() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "higher-lower-save-streak",
      beforeAd: () => setIsAdLoading(true),
      afterAd:  () => setIsAdLoading(false),
      adDismissed: () => {
        // ad dismissed — do nothing
      },
      adViewed: () => {
        const nextRound = round + 1;
        setRound(nextRound);
        setRevealed(false);
        setAnimState(null);
        setGameOver(false);
        setHasWatchedReviveAd(true);
        persist({ round: nextRound, streak, gameOver: false, xpAwarded, hasWatchedReviveAd: true });
      },
      adBreakDone: () => setIsAdLoading(false),
    });
  }

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
      if (s.hasWatchedReviveAd) setHasWatchedReviveAd(s.hasWatchedReviveAd);
    }
  }, []);

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById("hl-css")) {
      const s = document.createElement("style");
      s.id = "hl-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  const playerA = getSequencedPlayer(players, round);
  const playerB = getSequencedPlayer(players, round + 1);
  const attr    = getAttrForRound(round);

  function persist(updates) {
    const puzzleDate = getActivePuzzleDate();
    const key = `hl_${puzzleDate}_state`;
    localStorage.setItem(key, JSON.stringify({ hasWatchedReviveAd, ...updates }));

    if (updates.gameOver) {
      const hlHistory = JSON.parse(localStorage.getItem('footbrawls_higherlower') || '{}');
      hlHistory[puzzleDate] = { completed: true, streak: updates.streak, xpAwarded: updates.xpAwarded };
      localStorage.setItem('footbrawls_higherlower', JSON.stringify(hlHistory));
    }
  }

  async function handleChoice(choice) {
    if (revealed || gameOver || !playerA || !playerB) return;

    const valA = playerA[attr.key];
    const valB = playerB[attr.key];

    let correct = false;
    if (choice === "higher")      correct = valB > valA;
    else if (choice === "lower")  correct = valB < valA;
    else if (choice === "equal")  correct = valB === valA;

    // Equal edge case — treat as correct
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
      const raw = Math.min(MAX_XP, Math.round((streak / 10) * MAX_XP));
      let xp = 0;
      const currentUser = getUser();
      const uid = userId || currentUser?.userId;
      if (uid && raw > 0) {
        const result = await awardXP(uid, "higherLower_correct", { rawXP: raw });
        xp = result?.xpAwarded ?? raw;
      } else {
        xp = raw;
      }
      setTimeout(() => {
        setGameOver(true);
        setXpAwarded(xp);
        persist({ round, streak, gameOver: true, xpAwarded: xp, hasWatchedReviveAd });
        if (onComplete) onComplete({ gameId: "higherLower", streak, xpAwarded: xp });
      }, 900);
    }
  }

  if (!playerA || !playerB) {
    return <div className="hl-page-loading">Loading…</div>;
  }

  return (
    <div className="hl-root">
      {/* Background layers */}
      <div className="hl-bg-layer" />
      <div className="hl-noise" />

      {/* Rules Modal */}
      {showModal && <RulesModal onClose={() => setShowModal(false)} />}

      {/* ── NAV ── */}
      <nav className="hl-nav">
        <button className="hl-nav-logo" onClick={() => window.history.back()}>←</button>
        <div className="hl-nav-center-tag">
          <span className="hl-tag-dot" />
          Higher or Lower
        </div>
        <div className="hl-nav-right">
          <button className="hl-nav-help-btn" onClick={() => setShowModal(true)}>❓ Help</button>
        </div>
      </nav>

      {/* ── PAGE ── */}
      <main className="hl-page">

        {/* Page header */}
        <div className="hl-page-header">
          <h1>Higher or Lower</h1>
          <p>Football Stats Edition — build the longest streak!</p>
        </div>

        {/* Puzzle bar */}
        <div className="hl-puzzle-bar">
          <div className="hl-puzzle-bar-item">📅 <strong>{getPuzzleDateLabel()}</strong></div>
          <div className="hl-puzzle-bar-sep" />
          <div className="hl-puzzle-bar-item">🧩 Puzzle <strong>#{getPuzzleNumber()}</strong></div>
        </div>

        {/* Score row */}
        <div className="hl-score-row">
          <div className="hl-score-card hl-score-current">
            <div className="hl-score-label">Current Streak</div>
            <div className="hl-score-value-current">{streak}</div>
          </div>
          <div className="hl-score-card hl-score-best">
            <div className="hl-score-label">Max XP</div>
            <div className="hl-score-value-best">{MAX_XP} XP</div>
          </div>
        </div>

        {/* ── GAME AREA ── */}
        {!gameOver && (
          <>
            {/* Attribute prompt */}
            <div className="hl-prompt-row">
              Does <strong className="hl-name-hl">{playerB?.name}</strong> have a{" "}
              <span className="hl-attr-badge">{attr.label}</span>{" "}
              higher or lower than <strong className="hl-name-hl">{playerA?.name}</strong>?
            </div>

            <div className="hl-game-area">
              <PlayerCard player={playerA} attr={attr} revealed={true}     isRight={false} animState={null} />
              <div className="hl-vs-divider">VS</div>
              <PlayerCard player={playerB} attr={attr} revealed={revealed} isRight={true}  animState={animState} />
            </div>

            <ResultMessage animState={animState} revealed={revealed} playerA={playerA} playerB={playerB} attr={attr} />

            <StreakBar streak={streak} />

            <div className="hl-buttons">
              <button
                className="hl-btn hl-btn-higher"
                onClick={() => handleChoice("higher")}
                disabled={revealed}
              >
                ⬆️ Higher
              </button>
              <button
                className="hl-btn hl-btn-lower"
                onClick={() => handleChoice("lower")}
                disabled={revealed}
              >
                ⬇️ Lower
              </button>
            </div>
          </>
        )}

        {/* ── RESULT CARD ── */}
        {gameOver && (
          <div className="hl-result-card">
            <div className="hl-result-badge">Game Complete</div>
            <div className="hl-result-title">Game Over!</div>
            <div className="hl-result-score">{streak}</div>
            <div className="hl-result-score-label">Streak</div>
            <div className="hl-result-phrase">{getResultPhrase(streak)}</div>

            {xpAwarded > 0 && (
              <div className="hl-xp-badge-earned">+{xpAwarded} XP EARNED</div>
            )}

            {/* ── REWARDED AD — Save Streak ── */}
            {!hasWatchedReviveAd && (
              <div className="hl-ad-section">
                <p className="hl-ad-hint">Streak ended? Watch an ad to save your streak and keep going!</p>
                <button
                  type="button"
                  className="hl-ad-btn"
                  onClick={triggerRewardedAdToSaveStreak}
                  disabled={isAdLoading}
                >
                  <span className="hl-ad-btn-icon">▶</span>
                  <span>{isAdLoading ? 'LOADING AD...' : 'SAVE STREAK'}</span>
                </button>
              </div>
            )}

            <div className="hl-result-actions">
              <button
                className="hl-btn hl-btn-restart"
                onClick={() => {
                  setRound(0); setStreak(0); setGameOver(false);
                  setRevealed(false); setAnimState(null); setXpAwarded(0); setHasWatchedReviveAd(false);
                }}
              >
                ↺ Play Again
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,900&display=swap');

/* ── ROOT & RESET ── */
.hl-root *, .hl-root *::before, .hl-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.hl-root {
  --bg: #05070f;
  --surface: rgba(255,255,255,0.038);
  --surface2: rgba(255,255,255,0.065);
  --border: rgba(255,255,255,0.08);
  --border2: rgba(255,255,255,0.13);
  --accent: #F7C344;
  --accent2: #E84040;
  --accent3: #4F8EF7;
  --green: #3DD68C;
  --text: #F0F0F0;
  --muted: rgba(240,240,240,0.45);
  --muted2: rgba(240,240,240,0.25);
  --card-radius: 16px;

  font-family: 'DM Sans', sans-serif;
  color: var(--text);
  min-height: 100vh;
  position: relative;
}

/* ── BACKGROUND ── */
.hl-bg-layer {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 80% 60% at 8% -5%,  rgba(232,64,64,0.1)   0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 95% 105%, rgba(247,195,68,0.08) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 50%,  rgba(79,142,247,0.05) 0%, transparent 65%),
    #05070f;
}
.hl-bg-layer::after {
  content: '';
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(
    -45deg, transparent, transparent 48px,
    rgba(255,255,255,0.008) 48px, rgba(255,255,255,0.008) 49px
  );
}
.hl-noise {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

.hl-page-loading {
  padding: 32px; text-align: center;
  color: var(--muted); font-family: 'DM Sans', sans-serif;
}

/* ── NAV ── */
.hl-nav {
  position: sticky; top: 0; z-index: 200;
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; padding: 0 32px; height: 62px;
  background: rgba(5,7,15,0.82);
  backdrop-filter: blur(24px) saturate(1.4);
  border-bottom: 1px solid rgba(232,64,64,0.12);
}

.hl-nav-logo {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 3px;
  background: linear-gradient(100deg, var(--accent) 0%, #ffe9a0 50%, var(--accent) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  text-decoration: none; white-space: nowrap;
  animation: hlLogoShimmer 4s linear infinite;
  background-color: transparent; border: none; outline: none; cursor: pointer;
}
@keyframes hlLogoShimmer { from{background-position:0% center} to{background-position:200% center} }

.hl-nav-center-tag {
  display: flex; align-items: center; gap: 7px;
  font-size: 0.72rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 2px;
  color: var(--accent2);
  background: rgba(232,64,64,0.1); border: 1px solid rgba(232,64,64,0.28);
  padding: 5px 14px; border-radius: 100px;
}
.hl-tag-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent2); animation: hlBlink 1.5s ease infinite;
  flex-shrink: 0;
}
@keyframes hlBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }

.hl-nav-right { display: flex; align-items: center; justify-content: flex-end; }
.hl-nav-help-wrap { position: relative; display: flex; align-items: center; }
.hl-nav-help-btn {
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid var(--border2); background: var(--surface);
  color: var(--muted); font-family: 'DM Sans', sans-serif;
  font-size: 1rem; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.hl-nav-help-btn:hover {
  background: rgba(232,64,64,0.12); border-color: rgba(232,64,64,0.4);
  color: var(--accent2); transform: scale(1.1);
}
.hl-nav-help-tooltip {
  position: absolute; right: calc(100% + 10px); top: 50%;
  transform: translateY(-50%) translateX(4px);
  background: rgba(10,14,30,0.96); border: 1px solid rgba(232,64,64,0.25);
  color: var(--accent2); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 5px 12px; border-radius: 8px;
  white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity 0.15s, transform 0.15s;
}
.hl-nav-help-tooltip::after {
  content: ''; position: absolute; left: 100%; top: 50%; transform: translateY(-50%);
  border: 5px solid transparent; border-left-color: rgba(232,64,64,0.25);
}
.hl-nav-help-wrap:hover .hl-nav-help-tooltip {
  opacity: 1; transform: translateY(-50%) translateX(0);
}

/* ── PAGE ── */
.hl-page {
  position: relative; z-index: 1;
  max-width: 1000px; margin: 0 auto;
  padding: 36px 36px 80px;
}

.hl-page-header { margin-bottom: 24px; animation: hlFadeUp 0.5s ease both; }
.hl-page-header h1 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  letter-spacing: 2px; line-height: 1; margin-bottom: 5px;
}
.hl-page-header p { color: var(--muted); font-size: 0.88rem; }

/* ── PUZZLE BAR ── */
.hl-puzzle-bar {
  display: flex; align-items: center; gap: 0;
  margin-bottom: 24px; width: fit-content;
  background: rgba(232,64,64,0.05); border: 1px solid rgba(232,64,64,0.15);
  border-radius: 12px; overflow: hidden;
  animation: hlFadeUp 0.5s ease 0.05s both;
}
.hl-puzzle-bar-item {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 16px; font-size: 0.77rem; color: var(--muted);
}
.hl-puzzle-bar-item strong { color: var(--accent2); font-weight: 700; }
.hl-puzzle-bar-sep { width: 1px; align-self: stretch; background: rgba(232,64,64,0.15); }

/* ── SCORE ROW ── */
.hl-score-row {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px; margin-bottom: 24px;
  animation: hlFadeUp 0.5s ease 0.08s both;
}
.hl-score-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 18px; padding: 18px 22px;
  position: relative; overflow: hidden;
}
.hl-score-current { border-left: 3px solid var(--accent2); }
.hl-score-current::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(232,64,64,0.06), transparent 60%);
  pointer-events: none;
}
.hl-score-best { border-left: 3px solid var(--accent); }
.hl-score-best::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(247,195,68,0.06), transparent 60%);
  pointer-events: none;
}
.hl-score-label {
  font-size: 0.65rem; color: var(--muted);
  text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 5px;
}
.hl-score-value-current {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; letter-spacing: 1px; line-height: 1;
  background: linear-gradient(135deg, var(--accent2), #ff8080);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.hl-score-value-best {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; letter-spacing: 1px; line-height: 1;
  background: linear-gradient(135deg, var(--accent), #ffd700);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* ── PROMPT ── */
.hl-prompt-row {
  text-align: center; padding: 12px 8px 18px;
  font-size: 0.95rem; color: var(--muted); font-weight: 500; line-height: 1.6;
  animation: hlFadeUp 0.5s ease 0.1s both;
}
.hl-name-hl { color: var(--text); }
.hl-attr-badge {
  color: var(--accent3); font-weight: 700;
  background: rgba(79,142,247,0.15); padding: 2px 10px;
  border-radius: 6px; border: 1px solid rgba(79,142,247,0.25); margin: 0 4px;
}

/* ── GAME AREA ── */
.hl-game-area {
  display: grid; grid-template-columns: 1fr 80px 1fr;
  gap: 16px; margin-bottom: 20px; align-items: center;
  animation: hlFadeUp 0.5s ease 0.12s both;
}

.hl-player-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 36px 28px; min-height: 360px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; text-align: center;
  position: relative; overflow: hidden;
  transition: transform 0.3s ease, border-color 0.3s, box-shadow 0.3s;
}
.hl-player-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(79,142,247,0.05), transparent 60%);
  pointer-events: none;
}
.hl-player-card-left { border-left: 3px solid var(--accent3); }
.hl-player-card-left::before { background: linear-gradient(135deg, rgba(79,142,247,0.08), transparent 60%); }

.hl-player-card.hl-correct {
  border-color: var(--green); box-shadow: 0 0 32px rgba(61,214,140,0.2);
  animation: hlCorrectPop 0.5s ease;
}
.hl-player-card.hl-wrong {
  border-color: var(--accent2); box-shadow: 0 0 32px rgba(232,64,64,0.25);
  animation: hlWrongShake 0.5s ease;
}

.hl-player-emoji { font-size: 3rem; animation: hlFloatEmoji 3s ease-in-out infinite; }
.hl-player-name {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.65rem; letter-spacing: 1px; line-height: 1;
}
.hl-player-stat-type {
  font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; font-weight: 700;
}
.hl-player-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--accent), #ffd700);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  filter: drop-shadow(0 0 14px rgba(247,195,68,0.3));
}
.hl-hidden-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem;
  letter-spacing: 6px; color: rgba(255,255,255,0.18);
}
.hl-player-club {
  font-size: 0.72rem; color: var(--muted2); text-transform: uppercase; letter-spacing: 0.5px;
}
.hl-player-pos {
  font-size: 0.72rem; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
}

/* ── VS DIVIDER ── */
.hl-vs-divider {
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 3px;
  color: rgba(255,255,255,0.25); position: relative;
}
.hl-vs-divider::before, .hl-vs-divider::after {
  content: ''; position: absolute; width: 1px; height: 44px;
  background: linear-gradient(to bottom, transparent, var(--border), transparent);
  top: 50%; transform: translateY(-50%);
}
.hl-vs-divider::before { left: -14px; }
.hl-vs-divider::after  { right: -14px; }

/* ── RESULT MESSAGE ── */
.hl-result-message {
  border-radius: 12px; padding: 13px 20px;
  font-size: 0.92rem; font-weight: 700; text-align: center;
  border: 1px solid; margin-bottom: 16px;
  animation: hlFadeUp 0.3s ease;
}
.hl-result-correct { background: rgba(61,214,140,0.1); color: var(--green); border-color: rgba(61,214,140,0.38); }
.hl-result-wrong   { background: rgba(232,64,64,0.1);  color: #ff8080;      border-color: rgba(232,64,64,0.38); }

/* ── STREAK BAR ── */
.hl-streak-bar-wrapper {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  margin-bottom: 24px;
}
.hl-streak-dots-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: center; }
.hl-streak-pip {
  width: 11px; height: 11px; border-radius: 50%;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  transition: all 0.3s ease;
}
.hl-streak-pip.active {
  width: 13px; height: 13px;
  background: var(--accent); border-color: var(--accent);
  box-shadow: 0 0 8px rgba(247,195,68,0.8);
}
.hl-streak-text {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--muted);
}

/* ── CHOICE BUTTONS ── */
.hl-buttons {
  display: flex; gap: 12px; justify-content: center;
  margin-bottom: 20px; animation: hlFadeUp 0.5s ease 0.18s both; flex-wrap: wrap;
}
.hl-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px 32px; border: none; border-radius: 12px;
  font-family: 'DM Sans', sans-serif; font-size: 0.92rem; font-weight: 800;
  cursor: pointer; transition: all 0.22s ease;
  text-transform: uppercase; letter-spacing: 1px;
  position: relative; overflow: hidden;
}
.hl-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

.hl-btn-higher {
  background: linear-gradient(135deg, #11998e, var(--green));
  color: #000; box-shadow: 0 6px 20px rgba(61,214,140,0.28);
}
.hl-btn-higher:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(61,214,140,0.42); }
.hl-btn-lower {
  background: linear-gradient(135deg, var(--accent2), #ff6a00);
  color: #fff; box-shadow: 0 6px 20px rgba(232,64,64,0.28);
}
.hl-btn-lower:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(232,64,64,0.42); }

.hl-btn-restart {
  background: rgba(61,214,140,0.12); color: var(--green);
  border: 1px solid rgba(61,214,140,0.28);
}
.hl-btn-restart:hover { background: rgba(61,214,140,0.22); transform: translateY(-2px); }

/* ── RESULT CARD ── */
.hl-result-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 22px; padding: 48px 40px; text-align: center;
  margin-bottom: 24px; animation: hlFadeUp 0.5s ease;
  position: relative; overflow: hidden;
}
.hl-result-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--accent2), var(--accent), var(--accent3));
  border-radius: 22px 22px 0 0;
}
.hl-result-badge {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(232,64,64,0.1); border: 1px solid rgba(232,64,64,0.3);
  color: var(--accent2); font-size: 0.7rem; font-weight: 800;
  letter-spacing: 2px; text-transform: uppercase;
  padding: 5px 14px; border-radius: 100px; margin-bottom: 14px;
}
.hl-result-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 3rem; letter-spacing: 2px; margin-bottom: 6px;
}
.hl-result-score {
  font-family: 'Bebas Neue', sans-serif; font-size: 5.5rem; letter-spacing: 2px;
  background: linear-gradient(135deg, var(--accent2), var(--accent) 60%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  line-height: 1; margin: 12px 0 0 0;
  filter: drop-shadow(0 0 22px rgba(232,64,64,0.4));
  animation: hlScorePulse 2.5s ease-in-out infinite;
}
.hl-result-score-label {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 2px; color: var(--muted); margin-bottom: 12px;
}
@keyframes hlScorePulse {
  0%,100%{filter:drop-shadow(0 0 20px rgba(232,64,64,0.4))}
  50%    {filter:drop-shadow(0 0 44px rgba(232,64,64,0.75))}
}
.hl-result-phrase { color: var(--muted); font-size: 1rem; margin-bottom: 28px; line-height: 1.6; }
.hl-result-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

.hl-xp-badge-earned {
  display: inline-flex; align-items: center;
  background: rgba(247,195,68,0.1); border: 1px solid rgba(247,195,68,0.3);
  border-radius: 99px; padding: 6px 18px;
  font-size: 0.8rem; font-weight: 800; color: var(--accent);
  letter-spacing: 1px; box-shadow: 0 0 10px rgba(247,195,68,0.1);
  margin-bottom: 20px;
}

/* ── AD SECTION ── */
.hl-ad-section {
  margin-top: 18px; padding-top: 18px;
  border-top: 1px solid var(--border); margin-bottom: 20px;
}
.hl-ad-hint { font-size: 0.8rem; color: var(--muted); margin: 0 0 12px 0; }
.hl-ad-btn {
  background: var(--accent); border: none; border-radius: 12px;
  color: #060810; padding: 12px 18px; font-weight: 900; cursor: pointer;
  font-size: 0.78rem; font-family: 'DM Sans', sans-serif;
  text-transform: uppercase; letter-spacing: 1.5px;
  box-shadow: 0 4px 14px rgba(247,195,68,0.25); width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s;
}
.hl-ad-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(247,195,68,0.4); background: #ffcf54; }
.hl-ad-btn:disabled { opacity: 0.5; cursor: default; }
.hl-ad-btn-icon { font-size: 0.85rem; }

/* ── MODAL ── */
.hl-modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.82); backdrop-filter: blur(14px);
  display: flex; justify-content: center; align-items: center; padding: 20px;
  animation: hlFadeIn 0.22s ease;
}
@keyframes hlFadeIn { from{opacity:0} to{opacity:1} }
.hl-modal-box {
  background: #0c1020; border: 1px solid rgba(232,64,64,0.18);
  border-radius: 24px; padding: 44px 36px;
  max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto;
  position: relative; animation: hlModalUp 0.32s cubic-bezier(0.4,0,0.2,1);
}
.hl-modal-box::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--accent2), var(--accent), var(--accent3));
  border-radius: 24px 24px 0 0;
}
@keyframes hlModalUp { from{opacity:0;transform:translateY(28px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
.hl-modal-box::-webkit-scrollbar { width: 5px; }
.hl-modal-box::-webkit-scrollbar-thumb { background: rgba(232,64,64,0.3); border-radius: 5px; }
.hl-modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 2.3rem; letter-spacing: 2px; text-align: center; margin-bottom: 26px; }
.hl-rules-list { list-style: none; margin-bottom: 22px; display: flex; flex-direction: column; gap: 9px; }
.hl-rules-list li {
  background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid rgba(232,64,64,0.45); border-radius: 12px;
  padding: 13px 16px; font-size: 0.9rem; line-height: 1.6;
  transition: border-color 0.2s, transform 0.2s;
}
.hl-rules-list li:hover { border-left-color: var(--accent2); transform: translateX(4px); }
.hl-rule-icon { margin-right: 8px; }
.hl-scoring-box {
  background: rgba(247,195,68,0.05); border: 1px solid rgba(247,195,68,0.18);
  border-radius: 14px; padding: 18px; margin-bottom: 22px;
}
.hl-scoring-box h3 { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 1px; color: var(--accent); margin-bottom: 12px; text-align: center; }
.hl-scoring-item { display: flex; justify-content: space-between; padding: 7px 0; font-size: 0.86rem; border-bottom: 1px solid var(--border); }
.hl-scoring-item:last-child { border-bottom: none; }
.hl-scoring-value { color: var(--accent); font-weight: 700; }
.hl-btn-primary {
  background: var(--accent2); color: #fff; font-weight: 800;
  width: 100%; justify-content: center; padding: 14px; font-size: 0.92rem;
  border-radius: 12px; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; text-transform: uppercase; letter-spacing: 1px;
  transition: all 0.22s ease; display: flex; align-items: center;
}
.hl-btn-primary:hover { background: #ff6060; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,64,64,0.3); }

/* ── ANIMATIONS ── */
@keyframes hlFadeUp    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes hlFloatEmoji{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes hlCorrectPop{ 0%,100%{transform:scale(1)} 40%{transform:scale(1.04)} }
@keyframes hlWrongShake{ 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 60%{transform:translateX(10px)} 80%{transform:translateX(-5px)} }

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .hl-nav { padding: 0 12px; height: 54px; }
  .hl-nav-logo { font-size: 1.3rem; }
  .hl-nav-center-tag { font-size: 0.58rem; padding: 4px 9px; gap: 4px; letter-spacing: 1.5px; }
  .hl-nav-help-btn { width: 30px; height: 30px; font-size: 0.88rem; }
  .hl-page { padding: 18px 16px 56px; }
  .hl-page-header h1 { font-size: 1.9rem; }
  .hl-game-area { grid-template-columns: 1fr; gap: 12px; }
  .hl-vs-divider { margin: 4px 0; }
  .hl-vs-divider::before, .hl-vs-divider::after { display: none; }
  .hl-player-card { min-height: 220px; padding: 24px 20px; }
  .hl-player-emoji { font-size: 2.2rem; }
  .hl-player-name  { font-size: 1.4rem; }
  .hl-player-value, .hl-hidden-value { font-size: 2.2rem; }
  .hl-buttons { flex-direction: column; }
  .hl-btn-higher, .hl-btn-lower { width: 100%; }
  .hl-result-card { padding: 28px 20px; }
  .hl-result-score { font-size: 3.8rem; }
  .hl-modal-box { padding: 28px 20px; }
}
@media (max-width: 480px) {
  .hl-page { padding: 14px 12px 52px; }
  .hl-score-row { grid-template-columns: 1fr 1fr; }
  .hl-result-actions { flex-direction: column; align-items: stretch; }
  .hl-result-actions .hl-btn { width: 100%; }
}
@media (max-width: 380px) {
  .hl-nav { height: 50px; }
  .hl-nav-logo { font-size: 1.25rem; letter-spacing: 2px; }
  .hl-nav-center-tag { font-size: 0.55rem; padding: 3px 8px; letter-spacing: 1px; }
  .hl-nav-help-btn { width: 26px; height: 26px; font-size: 0.8rem; }
  .hl-player-name { font-size: 1.2rem; }
}
`;