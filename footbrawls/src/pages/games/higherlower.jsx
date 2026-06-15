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
const MAX_XP   = 15;

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerCard({ player, attr, revealed, isRight, animState }) {
  let cardClass = "hl-player-card";
  if (revealed) {
    if (animState === "correct") cardClass += " hl-correct";
    else if (animState === "wrong") cardClass += " hl-wrong";
  }

  return (
    <div className={cardClass}>
      <div className="hl-player-flag-container">
        <span className="hl-player-flag-sticker">{player?.flag || "🏳️"}</span>
      </div>
      <div className="hl-player-name">{player?.name}</div>
      <div className="hl-player-club">{player?.club}</div>
      <div className="hl-player-pos">{player?.position}</div>

      {/* Value */}
      <div className={`hl-player-value ${revealed || !isRight ? 'revealed' : 'hidden'}`}>
        {revealed || !isRight ? formatValue(attr, player) : "???"}
      </div>
    </div>
  );
}

function ChoiceButtons({ onHigher, onLower, disabled }) {
  return (
    <div className="hl-choice-row">
      <button
        onClick={onHigher}
        disabled={disabled}
        className="hl-choice-btn hl-higher-btn"
      >
        <span className="hl-choice-icon">↑</span>
        <span className="hl-choice-label">Higher</span>
      </button>
      <button
        onClick={onLower}
        disabled={disabled}
        className="hl-choice-btn hl-lower-btn"
      >
        <span className="hl-choice-icon">↓</span>
        <span className="hl-choice-label">Lower</span>
      </button>
    </div>
  );
}

function StreakBar({ streak }) {
  return (
    <div className="hl-streak-container">
      <div className="hl-streak-dots">
        {Array.from({ length: Math.max(5, streak + 1) }).map((_, i) => (
          <div
            key={i}
            className={`hl-streak-dot ${i < streak ? 'active' : ''}`}
          />
        ))}
      </div>
      <span className="hl-streak-text">Streak: {streak}</span>
    </div>
  );
}

// Initialize Google AdBreak queue safely
const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    console.log("[AdSense H5 Mock] Triggering ad placement:", options.name);
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.type === 'reward') {
        const confirmReward = window.confirm(`[TEST AD] Watch this rewarded ad to get your reward?`);
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function HigherLower({ players = PLAYERS, userId, onComplete }) {
  const [round, setRound]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [gameOver, setGameOver]   = useState(false);
  const [revealed, setRevealed]   = useState(false);
  const [animState, setAnimState] = useState(null); // "correct" | "wrong"
  const [xpAwarded, setXpAwarded] = useState(0);

  // Rewarded ad states
  const [hasWatchedReviveAd, setHasWatchedReviveAd] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  function triggerRewardedAdToSaveStreak() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "higher-lower-save-streak",
      beforeAd: () => setIsAdLoading(true),
      afterAd: () => setIsAdLoading(false),
      adDismissed: () => {
        // ad dismissed
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
      adBreakDone: () => setIsAdLoading(false)
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
    localStorage.setItem(key, JSON.stringify({
      hasWatchedReviveAd,
      ...updates
    }));

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

  const getStreakStickerClass = (strk) => {
    if (strk >= 8) return 'sticker-legendary';
    if (strk >= 5) return 'sticker-hot';
    return 'sticker-good';
  };

  const getStreakStickerText = (strk) => {
    if (strk >= 8) return 'LEGENDARY STREAK';
    if (strk >= 5) return 'HOT STREAK';
    return 'GREAT ATTEMPT';
  };

  if (!playerA || !playerB) {
    return (
      <div className="hl-page-loading">
        Loading…
      </div>
    );
  }

  return (
    <div className="hl-page">
      <div className="hl-bg" />
      <div className="hl-grid" />

      {/* Header */}
      <div className="hl-header">
        <div>
          <h2 className="hl-title">HIGHER OR LOWER</h2>
          <div className="hl-sub">
            {gameOver ? `Final streak: ${streak}` : `Round ${round + 1} · Streak ${streak}`}
          </div>
        </div>
        <div className="hl-badge-xp">
          MAX 15 XP
        </div>
      </div>

      {/* Attribute label */}
      <div className="hl-prompt-row">
        Does <strong className="hl-name-highlight">{playerB?.name}</strong> have a <span className="hl-attr-badge">{attr.label}</span> higher or lower than <strong className="hl-name-highlight">{playerA?.name}</strong>?
      </div>

      {/* Cards */}
      <div className="hl-cards-row">
        <PlayerCard
          player={playerA}
          attr={attr}
          revealed={true}
          isRight={false}
          animState={null}
        />
        <div className="hl-vs-badge">VS</div>
        <PlayerCard
          player={playerB}
          attr={attr}
          revealed={revealed}
          isRight={true}
          animState={animState}
        />
      </div>

      {/* Streak */}
      <div className="hl-streak-bar-wrapper">
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
        <div className="hl-gameover-card">
          <div className="hl-sticker-container">
            <span className={`hl-sticker ${getStreakStickerClass(streak)}`}>
              {getStreakStickerText(streak)}
            </span>
          </div>

          <div className="hl-result-title">
            Streak of {streak}
          </div>
          <div className="hl-result-details">
            {playerB?.[attr.key]} vs {playerA?.[attr.key]} {attr.unit}
          </div>
          
          {xpAwarded > 0 && (
            <div className="hl-xp-badge-earned">
              +{xpAwarded} XP EARNED
            </div>
          )}

          {!hasWatchedReviveAd && (
            <div className="hl-ad-section">
              <p className="hl-ad-hint">
                Streak ended? Save your streak and continue!
              </p>
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
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@0,9..40,400;0,9..40,700;0,9..40,900&display=swap');

.hl-page {
  position: relative;
  z-index: 1;
  max-width: 430px;
  margin: 0 auto;
  padding: 24px 16px 80px;
  font-family: 'DM Sans', sans-serif;
  color: #F0F0F0;
  min-height: 100vh;
  box-sizing: border-box;
}

.hl-page-loading {
  padding: 32px;
  text-align: center;
  color: rgba(242, 242, 244, 0.28);
  font-family: 'DM Sans', sans-serif;
}

.hl-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% -10%, rgba(79, 142, 247, 0.1) 0%, transparent 60%), #05070f;
}

.hl-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.03;
  background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Header */
.hl-header {
  padding: 16px 0 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.hl-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  letter-spacing: 2px;
  line-height: 1;
  margin: 0 0 4px 0;
  background: linear-gradient(135deg, #4F8EF7, #E84040);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hl-sub {
  color: rgba(240,240,240,0.45);
  font-size: 0.8rem;
  margin: 0;
}

.hl-badge-xp {
  background: rgba(247, 195, 68, 0.1);
  border: 1px solid rgba(247, 195, 68, 0.25);
  border-radius: 99px;
  padding: 4px 12px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  color: #F7C344;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Attribute label prompt */
.hl-prompt-row {
  text-align: center;
  padding: 12px 8px 18px;
  font-size: 0.88rem;
  color: rgba(242, 242, 244, 0.5);
  font-weight: 500;
  line-height: 1.5;
}

.hl-name-highlight {
  color: #F2F2F4;
}

.hl-attr-badge {
  color: #4F8EF7;
  font-weight: 700;
  background: rgba(79, 142, 247, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(79, 142, 247, 0.25);
  margin: 0 4px;
}

/* Cards Row */
.hl-cards-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.hl-player-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px 12px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  min-height: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
}

.hl-player-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent 60%); pointer-events: none;
  border-radius: 16px;
}

.hl-player-card.hl-correct {
  background: rgba(61, 214, 140, 0.06);
  border-color: rgba(61, 214, 140, 0.35);
  box-shadow: 0 0 16px rgba(61, 214, 140, 0.1);
  transform: scale(1.02);
}

.hl-player-card.hl-wrong {
  background: rgba(232, 64, 64, 0.06);
  border-color: rgba(232, 64, 64, 0.35);
  box-shadow: 0 0 16px rgba(232, 64, 64, 0.1);
}

.hl-player-flag-container {
  margin-bottom: 8px;
}

.hl-player-flag-sticker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  font-size: 1.6rem;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

.hl-player-name {
  font-family: 'Bebas Neue', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: #F2F2F4;
  letter-spacing: 0.5px;
  line-height: 1.1;
  margin-bottom: 4px;
}

.hl-player-club {
  font-size: 0.7rem;
  color: rgba(242, 242, 244, 0.3);
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hl-player-pos {
  font-size: 0.72rem;
  color: rgba(242, 242, 244, 0.5);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.hl-player-value {
  margin-top: auto;
  border-radius: 10px;
  padding: 6px 14px;
  font-size: 0.88rem;
  font-weight: 900;
  font-family: 'Space Mono', monospace;
  letter-spacing: 1px;
  min-width: 80px;
  transition: all 0.3s;
}

.hl-player-value.revealed {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #F2F2F4;
}

.hl-player-value.hidden {
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  color: rgba(242, 242, 244, 0.25);
}

/* VS Badge */
.hl-vs-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #F7C344;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem;
  letter-spacing: 1px;
  box-shadow: 0 0 15px rgba(247, 195, 68, 0.15);
  flex-shrink: 0;
  z-index: 2;
}

/* Streak Bar */
.hl-streak-bar-wrapper {
  margin-bottom: 24px;
}

.hl-streak-container {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 0.78rem;
  color: rgba(242, 242, 244, 0.5);
  font-weight: 700;
}

.hl-streak-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.hl-streak-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  transition: all 0.3s ease;
}

.hl-streak-dot.active {
  width: 12px;
  height: 12px;
  background: #F7C344;
  border-color: #F7C344;
  box-shadow: 0 0 8px rgba(247, 195, 68, 0.8);
}

.hl-streak-text {
  margin-left: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.7rem;
}

/* Choice Buttons */
.hl-choice-row {
  display: flex;
  gap: 12px;
}

.hl-choice-btn {
  flex: 1;
  border-radius: 14px;
  padding: 16px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hl-choice-btn:disabled {
  opacity: 0.4;
  cursor: default;
  transform: none !important;
}

.hl-higher-btn {
  background: rgba(61, 214, 140, 0.08);
  border: 1px solid rgba(61, 214, 140, 0.35);
  color: #3DD68C;
}

.hl-higher-btn:not(:disabled):hover {
  transform: translateY(-2px);
  background: rgba(61, 214, 140, 0.15);
  box-shadow: 0 4px 20px rgba(61, 214, 140, 0.25);
}

.hl-lower-btn {
  background: rgba(232, 64, 64, 0.08);
  border: 1px solid rgba(232, 64, 64, 0.35);
  color: #E84040;
}

.hl-lower-btn:not(:disabled):hover {
  transform: translateY(-2px);
  background: rgba(232, 64, 64, 0.15);
  box-shadow: 0 4px 20px rgba(232, 64, 64, 0.25);
}

.hl-choice-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.hl-choice-label {
  font-size: 0.78rem;
  font-weight: 800;
}

/* Gameover Card */
.hl-gameover-card {
  background: rgba(232, 64, 64, 0.04);
  border: 1px solid rgba(232, 64, 64, 0.25);
  border-radius: 16px;
  padding: 24px 20px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  animation: fadeUp 0.4s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.hl-sticker-container {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

/* Custom Stickers instead of emojis */
.hl-sticker {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 8px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem;
  letter-spacing: 1.5px;
  transform: rotate(-3deg);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  border: 2px solid;
}

.sticker-legendary {
  background: linear-gradient(135deg, #F7C344, #F59E0B);
  color: #05070f;
  border-color: #FFF;
  box-shadow: 0 0 15px rgba(247, 195, 68, 0.4);
}

.sticker-hot {
  background: linear-gradient(135deg, #E84040, #A855F7);
  color: #FFF;
  border-color: #FFAAAA;
  box-shadow: 0 0 15px rgba(232, 64, 64, 0.4);
}

.sticker-good {
  background: linear-gradient(135deg, #4F8EF7, #06B6D4);
  color: #FFF;
  border-color: #AAE2FF;
}

.hl-result-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #F2F2F4;
  margin-bottom: 4px;
  letter-spacing: 1px;
}

.hl-result-details {
  font-size: 0.82rem;
  color: rgba(242, 242, 244, 0.5);
  margin-bottom: 16px;
}

.hl-xp-badge-earned {
  display: inline-flex;
  align-items: center;
  background: rgba(247, 195, 68, 0.1);
  border: 1px solid rgba(247, 195, 68, 0.3);
  border-radius: 99px;
  padding: 6px 18px;
  font-size: 0.8rem;
  font-weight: 800;
  color: #F7C344;
  font-family: 'Space Mono', monospace;
  letter-spacing: 1px;
  box-shadow: 0 0 10px rgba(247, 195, 68, 0.1);
}

/* Ad recovery section */
.hl-ad-section {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.hl-ad-hint {
  font-size: 0.75rem;
  color: rgba(242, 242, 244, 0.45);
  margin: 0 0 12px 0;
}

.hl-ad-btn {
  background: #F7C344;
  border: none;
  border-radius: 12px;
  color: #060810;
  padding: 12px 18px;
  font-weight: 900;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: 'Space Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  box-shadow: 0 4px 14px rgba(247, 195, 68, 0.25);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.hl-ad-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(247, 195, 68, 0.4);
  background: #ffcf54;
}

.hl-ad-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.hl-ad-btn-icon {
  font-size: 0.85rem;
}
`;