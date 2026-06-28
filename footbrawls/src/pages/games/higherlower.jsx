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

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDailySeed, getDailyPlayer, getActivePuzzleDate, getRaidSeed } from "../../lib/dailySeed.js";
import { awardXP } from '../../lib/xpEngine.js';
import { getUser } from '../../lib/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { PLAYERS } from "../../lib/players.js";
import { usePlayerWikiPhoto } from "../../lib/wikiAssets.jsx";
import { triggerWinConfetti, triggerLossHeartbreaks, autoScrollToResult } from "../../lib/effects.js";

const GAME_ID = "higherLower";
const MAX_XP   = 25;
const STREAK_XP = [0, 2, 4, 6, 8, 10, 13, 16, 19, 22, 25];

const ATTRIBUTES = [
  { key: "age",         label: "Age",          unit: "yrs",  format: (v) => v },
  { key: "caps",        label: "Int'l Caps",   unit: "",     format: (v) => v },
  { key: "goals",       label: "Int'l Goals",  unit: "",     format: (v) => v },
  { key: "totGoals",    label: "Career Goals", unit: "",     format: (v) => v },
  { key: "marketValue", label: "Market Value", unit: "M€",   format: (v) => `€${v}M` },
];

function getAttrForRound(roundIndex) {
  return ATTRIBUTES[roundIndex % ATTRIBUTES.length];
}

function getSequencedPlayer(players, roundOffset) {
  let seed = getDailySeed();
  const raid = !!localStorage.getItem('active_game_session_id');
  const sessionId = localStorage.getItem('active_game_session_id');
  const sessionSeed = localStorage.getItem('active_game_session_seed');
  if (raid) {
    seed = getRaidSeed(sessionId, sessionSeed);
  }
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
  if (streak >= 10) return "PERFECT STREAK! You've reached the maximum cap of 10! Outstanding!";
  if (streak === 0) return "Better luck next time — study those football stats!";
  if (streak < 3)  return "Decent start. Keep building that streak!";
  if (streak < 6)  return "Solid effort — you know your football!";
  if (streak < 9)  return "Impressive! You're a genuine football stats expert.";
  return "LEGENDARY! Almost a perfect run. Outstanding!";
}

function loadHistoryAndStats() {
  try {
    const history = JSON.parse(localStorage.getItem('footbrawls_higherlower') || '{}');
    const allEntries = Object.values(history);
    
    const bestStreak = allEntries.length > 0 ? Math.max(...allEntries.map(e => e.streak || 0)) : 0;
    const avgStreak = allEntries.length > 0 ? Math.round(allEntries.reduce((s, e) => s + (e.streak || 0), 0) / allEntries.length * 10) / 10 : 0;
    
    let dayStreak = 0;
    const today = getActivePuzzleDate();
    const check = new Date(today + "T00:00:00");
    while (true) {
      const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,"0")}-${String(check.getDate()).padStart(2,"0")}`;
      if (history[k]) {
        dayStreak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    
    return {
      history,
      stats: {
        played: allEntries.length,
        bestStreak,
        avgStreak,
        dayStreak
      }
    };
  } catch (e) {
    return {
      history: {},
      stats: { played: 0, bestStreak: 0, avgStreak: 0, dayStreak: 0 }
    };
  }
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

function RulesModal({ show, onClose, isRaid }) {
  if (!show) return null;
  return (
    <div className={`hl-modal-overlay active`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hl-modal-box">
        <h2 className="hl-modal-title">⚽ How to Play</h2>
        <ul className="hl-rules-list">
          <li><strong>👀 Stat:</strong> The left player's stat is revealed — study it carefully</li>
          <li><strong>🤔 Guess:</strong> Choose if the right player's stat is <strong>Higher</strong> or <strong>Lower</strong></li>
          <li><strong>🔥 Streak:</strong> Build a streak — every correct answer keeps you alive</li>
          <li><strong>❌ Fail:</strong> One wrong answer ends the game immediately</li>
        </ul>
        {!isRaid && (
          <div className="hl-scoring-box">
            <h3>💰 XP System — Max {MAX_XP} XP</h3>
            <div className="hl-scoring-item"><span>Each Correct Answer</span><span className="hl-scoring-value">Streak +1</span></div>
            <div className="hl-scoring-item"><span>Streak of 10</span><span className="hl-scoring-value">{MAX_XP} XP</span></div>
            <div className="hl-scoring-item"><span>Wrong Answer</span><span className="hl-scoring-value">Game Over</span></div>
          </div>
        )}
        <button className="hl-btn-primary" onClick={onClose}>🚀 Let's Play!</button>
      </div>
    </div>
  );
}

function PlayerCard({ player, attr, revealed, isRight, animState }) {
  let cardClass = "hl-player-card";
  if (!isRight) cardClass += " hl-player-card-left";
  if (revealed && animState === "correct") cardClass += " hl-correct";
  else if (revealed && animState === "wrong") cardClass += " hl-wrong";

  const photo = usePlayerWikiPhoto(player?.name);

  return (
    <div className={cardClass}>
      <div className="hl-player-photo-wrapper">
        <img src={photo} alt={player?.name} className="hl-player-img" />
        <div className="hl-player-flag-badge">{player?.flag}</div>
      </div>
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

function StreakDots({ history, puzzleDate, gameOver, currentStreak }) {
  const today = new Date();
  const dots = [];
  
  for (let i = 29; i >= 0; i--) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,"0")}-${String(checkDate.getDate()).padStart(2,"0")}`;
    const isToday = checkKey === puzzleDate;

    let cls = 'miss';
    let label = '—';
    if (isToday) {
      if (gameOver) {
        const entry = history[checkKey];
        if (entry) {
          cls = entry.streak > 0 ? 'win' : 'miss';
          label = entry.streak || '0';
        } else {
          cls = currentStreak > 0 ? 'win' : 'miss';
          label = currentStreak || '0';
        }
      } else {
        cls = 'today-pending';
        label = null;
      }
    } else {
      const entry = history[checkKey];
      if (entry) {
        cls = entry.streak > 0 ? 'win' : 'miss';
        label = entry.streak || '0';
      } else {
        cls = 'miss';
        label = '0';
      }
    }
    dots.push({ cls, label });
  }

  const last30Dots = dots.slice(-30);

  return (
    <div className="hl-streak-dots">
      {last30Dots.map((dot, i) => (
        <div key={i} className={`hl-streak-dot ${dot.cls}`}>
          {dot.label !== null ? dot.label : ""}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HigherLower({ players = PLAYERS, userId, onComplete }) {
  const navigate = useNavigate();
  const [round, setRound]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [gameOver, setGameOver]   = useState(false);
  const [revealed, setRevealed]   = useState(false);
  const [animState, setAnimState] = useState(null); // "correct" | "wrong"
  const [xpAwarded, setXpAwarded] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [historyAndStats, setHistoryAndStats] = useState(() => loadHistoryAndStats());
  const [msg, setMsg] = useState(null);

  function showMsg(text, type = "info", duration = 2800) {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), duration);
  }

  // Rewarded ad states
  const [hasWatchedReviveAd, setHasWatchedReviveAd] = useState(false);
  const [isAdLoading, setIsAdLoading]               = useState(false);
  const [isRaid, setIsRaid]                         = useState(false);

  function triggerRewardedAdToSaveStreak() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "higher-lower-save-streak",
      beforeAd: () => setIsAdLoading(true),
      afterAd:  () => setIsAdLoading(false),
      adDismissed: () => {
        showMsg("Ad dismissed. Streak not saved.", "error");
      },
      adViewed: () => {
        const nextRound = round + 1;
        setRound(nextRound);
        setRevealed(false);
        setAnimState(null);
        setGameOver(false);
        setHasWatchedReviveAd(true);
        persist({ round: nextRound, streak, gameOver: false, xpAwarded, hasWatchedReviveAd: true });
        showMsg("Streak saved! Keep going!", "success");
      },
      adBreakDone: () => setIsAdLoading(false),
    });
  }

  // Load saved state
  useEffect(() => {
    let raid = !!localStorage.getItem('active_game_session_id');
    setIsRaid(raid);

    if (raid) {
      setRound(0);
      setStreak(0);
      setGameOver(false);
      setXpAwarded(null);
      setHasWatchedReviveAd(false);
      return;
    }

    const puzzleDate = getActivePuzzleDate();
    const key = `hl_${puzzleDate}_state`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const s = JSON.parse(saved);
      setRound(s.round);
      setStreak(s.streak);
      setGameOver(s.gameOver);
      setXpAwarded(s.xpAwarded);
      setHasWatchedReviveAd(s.hasWatchedReviveAd === true);
    }
  }, []);

  // Inject CSS & Config H5 games ads
  useEffect(() => {
    if (!document.getElementById("hl-css")) {
      const s = document.createElement("style");
      s.id = "hl-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    if (window.adConfig) {
      window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
    }
  }, []);

  const attr    = getAttrForRound(round);

  const { playerA, playerB } = useMemo(() => {
    const rawA = getSequencedPlayer(players, round);
    // If streak is high (streak >= 7), we want a "close call" for playerB
    if (streak >= 7) {
      const valA = rawA[attr.key];
      // Let's scan forward from round + 1 to find a player whose stat value is close to valA
      // We'll search up to 25 players to find one that is within a 15% difference range.
      for (let offset = 1; offset <= 25; offset++) {
        const candidate = getSequencedPlayer(players, round + offset);
        const valB = candidate[attr.key];
        if (valA === 0 || valB === 0) continue;
        const diffPercent = Math.abs(valA - valB) / Math.max(valA, valB);
        if (diffPercent <= 0.18) { // close call (within 18% difference)
          return { playerA: rawA, playerB: candidate };
        }
      }
    }
    const rawB = getSequencedPlayer(players, round + 1);
    return { playerA: rawA, playerB: rawB };
  }, [players, round, streak, attr]);

  function persist(updates) {
    const puzzleDate = getActivePuzzleDate();
    const key = `hl_${puzzleDate}_state`;
    const watchedAd = updates.hasOwnProperty('hasWatchedReviveAd') ? updates.hasWatchedReviveAd : hasWatchedReviveAd;
    localStorage.setItem(key, JSON.stringify({ hasWatchedReviveAd: watchedAd, ...updates }));

    if (updates.gameOver) {
      const hlHistory = JSON.parse(localStorage.getItem('footbrawls_higherlower') || '{}');
      hlHistory[puzzleDate] = { completed: true, streak: updates.streak, xpAwarded: updates.xpAwarded };
      localStorage.setItem('footbrawls_higherlower', JSON.stringify(hlHistory));
      setHistoryAndStats(loadHistoryAndStats());
    } else if (updates.hasOwnProperty('gameOver') && !updates.gameOver) {
      const hlHistory = JSON.parse(localStorage.getItem('footbrawls_higherlower') || '{}');
      if (hlHistory[puzzleDate]) {
        delete hlHistory[puzzleDate];
        localStorage.setItem('footbrawls_higherlower', JSON.stringify(hlHistory));
        setHistoryAndStats(loadHistoryAndStats());
      }
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
      if (newStreak >= 10) {
        const raw = MAX_XP;
        let xp = 0;
        const currentUser = getUser();
        const uid = userId || currentUser?.userId;
        if (uid && raw > 0) {
          try {
            const result = await awardXP(uid, "higherLower_correct", { rawXP: raw, streak: newStreak });
            xp = result?.xpAwarded ?? raw;
          } catch (e) {
            console.error('[HigherLower] awardXP failed:', e);
            xp = raw;
          }
        } else {
          xp = raw;
        }
        setTimeout(() => {
          setStreak(newStreak);
          setGameOver(true);
          setXpAwarded(xp);
          if (isRaid) {
            const activeId = localStorage.getItem('active_game_session_id');
            if (activeId) {
              localStorage.setItem(`raid_completed_act1_${activeId}`, 'true');
            }
          }
          persist({ round: round + 1, streak: newStreak, gameOver: true, xpAwarded: xp, hasWatchedReviveAd });
          if (onComplete) onComplete({ gameId: "higherLower", streak: newStreak, xpAwarded: xp });
        }, 900);
      } else {
        setTimeout(async () => {
          setStreak(newStreak);
          setRevealed(false);
          setAnimState(null);
          setRound((r) => r + 1);
          persist({ round: round + 1, streak: newStreak, gameOver: false, xpAwarded });
        }, 900);
      }
    } else {
      const raw = STREAK_XP[Math.min(10, streak)];
      let xp = 0;
      const currentUser = getUser();
      const uid = userId || currentUser?.userId;
      if (uid && (raw > 0 || isRaid)) {
        try {
          const result = await awardXP(uid, "higherLower_correct", { rawXP: raw, streak: streak });
          xp = result?.xpAwarded ?? raw;
        } catch (e) {
          console.error('[HigherLower] awardXP failed:', e);
          xp = raw;
        }
      } else {
        xp = raw;
      }
      setTimeout(() => {
        setGameOver(true);
        setXpAwarded(xp);
        if (isRaid) {
          const activeId = localStorage.getItem('active_game_session_id');
          if (activeId) {
            localStorage.setItem(`raid_completed_act1_${activeId}`, 'true');
          }
        } else {
          // Single mode animations & scroll
          const isWin = streak >= 10; // Max streak
          if (isWin) {
            triggerWinConfetti();
          } else {
            triggerLossHeartbreaks();
          }
          autoScrollToResult('.hl-result-card', isRaid);
        }
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

      <RulesModal show={showModal} onClose={() => setShowModal(false)} isRaid={isRaid} />

      {/* ── NAV ── */}
      <nav className="hl-nav">
        {!isRaid && <button className="hl-nav-logo" onClick={() => navigate('/')}>←</button>}
        <div className="hl-nav-tag">
          <span className="hl-tag-dot" />
          Higher or Lower
        </div>
        <div className="hl-nav-right">
          <button className="hl-nav-btn" onClick={() => setShowModal(true)}>❓ Help</button>
        </div>
      </nav>

      {/* ── PAGE ── */}
      <main className="hl-page">

        {/* Messages */}
        {msg && <div className={`hl-msg hl-msg-${msg.type}`}>{msg.text}</div>}

        {/* Page header */}
        <div className="hl-page-header">
          <h1>Higher or Lower</h1>
          <p>Football Stats Edition — build the longest streak!</p>
        </div>

        {/* Score row */}
        <div className="hl-score-row">
          <div className="hl-score-card hl-score-current" style={isRaid ? { width: '100%' } : {}}>
            <div className="hl-score-label">Current Streak</div>
            <div className="hl-score-value-current">{streak}</div>
          </div>
          {!isRaid && (
            <div className="hl-score-card hl-score-best">
              <div className="hl-score-label">XP Earned</div>
              <div className="hl-score-value-best">{STREAK_XP[Math.min(10, streak)]} XP</div>
            </div>
          )}
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
            <div className="hl-result-title">{streak >= 10 ? "Perfect!" : "Game Over!"}</div>
            <div className="hl-result-score">{streak}</div>
            <div className="hl-result-score-label">Streak</div>
            <div className="hl-result-phrase">{getResultPhrase(streak)}</div>

            {!isRaid && xpAwarded > 0 && (
              <div className="hl-xp-badge-earned">+{xpAwarded} XP EARNED</div>
            )}

            {/* ── REWARDED AD — Save Streak ── */}
            {!isRaid && !hasWatchedReviveAd && streak < 10 && (
              <div className="hl-ad-section">
                <p className="hl-ad-hint">Streak ended? Watch a quick ad to revive and keep your streak going!</p>
                <button
                  type="button"
                  className="hl-ad-btn"
                  onClick={triggerRewardedAdToSaveStreak}
                  disabled={isAdLoading}
                >
                  <span className="hl-ad-btn-icon">▶</span>
                  <span>{isAdLoading ? 'LOADING AD...' : 'WATCH AD TO REVIVE'}</span>
                </button>
              </div>
            )}

            <div className="hl-result-actions" style={{ display: "flex", gap: "10px", width: "100%", justifyContent: "center" }}>
              {isRaid ? (
                <button
                  className="hl-btn"
                  style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", flex: 1 }}
                  onClick={async () => {
                    const activeId = localStorage.getItem('active_game_session_id');
                    if (activeId) {
                      const snap = await getDoc(doc(db, 'gameSessions', activeId));
                      if (snap.exists() && snap.data().sessionType === 'vs_friends') {
                        navigate('/vsfriends');
                        return;
                      }
                    }
                    navigate('/raid');
                  }}
                >
                  ⚔️ Return to Lobby
                </button>
              ) : (
                <button
                  className="hl-btn"
                  style={{ background: "var(--accent3, #a855f7)", color: "#fff", border: "none", flex: 1, fontWeight: "bold" }}
                  onClick={() => navigate('/')}
                >
                  ← Home
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dashboard / Progress */}
        <div className="hl-bottom-section">
          <div className="hl-section-divider">
            <span className="hl-section-label">Your Progress</span>
            <div className="hl-section-line" />
          </div>
          <div className="hl-dashboard-grid">
            {/* Streak Card */}
            <div className="hl-dash-card">
              <div className="hl-dash-card-hdr">
                <span className="hl-dash-icon">📅</span>
                <span className="hl-dash-label">Last 30 Days</span>
              </div>
              <StreakDots history={historyAndStats.history} puzzleDate={getActivePuzzleDate()} gameOver={gameOver} currentStreak={streak} />
              <div className="hl-streak-legend">
                <span><span className="hl-dot-sample win" />Played</span>
                <span><span className="hl-dot-sample miss" />Missed</span>
                <span><span className="hl-dot-sample today" />Today</span>
              </div>
            </div>
            {/* Stats Card */}
            <div className="hl-dash-card">
              <div className="hl-dash-card-hdr">
                <span className="hl-dash-icon">📊</span>
                <span className="hl-dash-label">Your Stats</span>
              </div>
              <div className="hl-stats-grid">
                <div className="hl-stat-item"><div className="hl-stat-value">{historyAndStats.stats.played || '—'}</div><div className="hl-stat-name">Played</div></div>
                <div className="hl-stat-item"><div className="hl-stat-value">{historyAndStats.stats.bestStreak || '—'}</div><div className="hl-stat-name">Best Streak</div></div>
                <div className="hl-stat-item"><div className="hl-stat-value">{historyAndStats.stats.avgStreak || '—'}</div><div className="hl-stat-name">Avg Streak</div></div>
                <div className="hl-stat-item"><div className="hl-stat-value">{historyAndStats.stats.dayStreak || '—'}</div><div className="hl-stat-name">Day Streak</div></div>
              </div>
            </div>
          </div>
        </div>

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
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 80% 60% at 8% -5%,  rgba(61,214,140,0.22)   0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 95% 105%, rgba(61,214,140,0.15) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 50%,  rgba(61,214,140,0.1) 0%, transparent 65%),
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
  position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

.hl-page-loading {
  padding: 32px; text-align: center;
  color: var(--muted); font-family: 'DM Sans', sans-serif;
}

/* ── NAV ── */
.hl-nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 64px; padding: 0 24px; position: relative; z-index: 10;
  border-bottom: 1px solid rgba(61, 214, 140, 0.25);
  background: rgba(5,7,15,0.7); backdrop-filter: blur(12px);
  box-shadow: 0 4px 25px rgba(61, 214, 140, 0.28);
}

.hl-nav-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--green);
  border: none;
  cursor: pointer;
  background-color: transparent;
  outline: none;
  display: flex;
  align-items: center;
  text-shadow: 0 0 10px rgba(61, 214, 140, 0.5);
}

.hl-nav-tag {
  font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;
  color: var(--muted); border: 1px solid rgba(61, 214, 140, 0.28); padding: 5px 12px;
  border-radius: 100px; display: flex; align-items: center; gap: 6px;
  background: rgba(61, 214, 140, 0.02);
}

.hl-tag-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--green);
  box-shadow: 0 0 8px var(--green);
}

.hl-nav-right {
  display: flex; gap: 8px;
}

.hl-nav-btn {
  background: var(--surface); border: 1px solid var(--border); color: #fff;
  padding: 8px 14px; border-radius: 10px; font-size: .8rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
  outline: none;
}
.hl-nav-btn:hover {
  background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2);
}

/* ── PAGE ── */
.hl-page {
  position: relative; z-index: 1;
  max-width: 800px; margin: 0 auto;
  padding: 36px 5% 80px;
}

.hl-page-header { margin-bottom: 24px; animation: hlFadeUp 0.5s ease both; }
.hl-page-header h1 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  letter-spacing: 2px; line-height: 1; margin-bottom: 5px;
  color: var(--green);
  text-shadow: 0 0 10px rgba(61, 214, 140, 0.8), 0 0 25px rgba(61, 214, 140, 0.45);
}
.hl-page-header p { color: var(--muted); font-size: 0.88rem; }

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
.hl-score-current {
  border-left: 3px solid var(--green);
  box-shadow: 0 4px 20px rgba(61, 214, 140, 0.15), inset 0 0 12px rgba(255,255,255,0.01);
}
.hl-score-current::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(61,214,140,0.06), transparent 60%);
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
  background: linear-gradient(135deg, var(--green), #a3ffda);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  filter: drop-shadow(0 0 10px rgba(61,214,140,0.6));
}
.hl-score-value-best {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; letter-spacing: 1px; line-height: 1;
  background: linear-gradient(135deg, var(--accent), #ffd700);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  filter: drop-shadow(0 0 10px rgba(247,195,68,0.5));
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
  border-radius: 20px; padding: 36px 28px; min-height: 390px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; text-align: center;
  position: relative; overflow: hidden;
  transition: transform 0.3s ease, border-color 0.3s, box-shadow 0.3s;
}
.hl-player-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(61,214,140,0.03), transparent 60%);
  pointer-events: none;
}
.hl-player-card:hover {
  transform: translateY(-4px); border-color: rgba(61,214,140,0.25);
  box-shadow: 0 12px 30px rgba(0,0,0,0.4), 0 0 15px rgba(61,214,140,0.08);
}
.hl-player-card-left { border-left: 3px solid var(--accent3); }
.hl-player-card-left::before {
  background: linear-gradient(135deg, rgba(79,142,247,0.05), transparent 60%);
}
.hl-player-card-left:hover { border-color: rgba(79,142,247,0.3); }

.hl-correct { border-color: var(--green) !important; background: rgba(61,214,140,0.07) !important; animation: hlCorrectPop 0.4s ease; }
.hl-wrong   { border-color: var(--accent2) !important; background: rgba(232,64,64,0.07) !important; animation: hlWrongShake 0.4s ease; }

.hl-player-photo-wrapper {
  position: relative;
  width: 110px;
  height: 110px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.hl-player-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  background: var(--surface2);
}
.hl-player-flag-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 1.5rem;
  background: rgba(12, 16, 32, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.hl-player-name {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.65rem; letter-spacing: 1px; line-height: 1;
  color: var(--green);
  text-shadow: 0 0 10px rgba(61, 214, 140, 0.25);
}
.hl-player-stat-type {
  font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; font-weight: 700;
}
.hl-player-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--accent), #ffd700);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  filter: drop-shadow(0 0 14px rgba(247,195,68,0.3));
  line-height: 1.1;
  padding: 4px 10px;
}
.hl-hidden-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem;
  letter-spacing: 6px; color: rgba(255,255,255,0.18);
  line-height: 1.1;
  padding: 4px 10px;
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
  background: var(--green); border-color: var(--green);
  box-shadow: 0 0 12px rgba(61, 214, 140, 0.95);
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
  color: #000; box-shadow: 0 6px 22px rgba(61,214,140,0.45);
}
.hl-btn-higher:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(61,214,140,0.55); }
.hl-btn-lower {
  background: linear-gradient(135deg, var(--accent2), #ff6a00);
  color: #fff; box-shadow: 0 6px 22px rgba(232,64,64,0.45);
}
.hl-btn-lower:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(232,64,64,0.55); }

.hl-btn-restart {
  background: rgba(61,214,140,0.12); color: var(--green);
  border: 1px solid rgba(61,214,140,0.28);
}
.hl-btn-restart:hover { background: rgba(61,214,140,0.2); border-color: rgba(61,214,140,0.4); transform: translateY(-2px); }

/* ── RESULT CARD ── */
.hl-result-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 24px; padding: 48px 40px; text-align: center;
  position: relative; overflow: hidden; margin-bottom: 24px;
  animation: hlFadeUp 0.5s ease both;
}
.hl-result-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--green), var(--accent), var(--accent3));
  border-radius: 24px 24px 0 0;
}
.hl-result-badge {
  display: inline-block; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 2px; color: var(--green); background: rgba(61,214,140,0.12);
  padding: 5px 14px; border-radius: 100px; border: 1px solid rgba(61,214,140,0.25);
  margin-bottom: 18px;
}
.hl-result-title { font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem; letter-spacing: 1.5px; margin-bottom: 12px; color: #fff; }
.hl-result-score { font-family: 'Bebas Neue', sans-serif; font-size: 6rem; line-height: 0.9; color: var(--green); text-shadow: 0 0 20px rgba(61,214,140,0.4); }
.hl-result-score-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); margin-bottom: 24px; }
.hl-result-phrase { font-size: 0.95rem; color: var(--muted); max-width: 440px; margin: 0 auto 32px; line-height: 1.6; }
.hl-result-actions { display: flex; gap: 12px; justify-content: center; }

.hl-xp-badge-earned {
  font-family: 'Space Mono', monospace; font-size: 0.85rem; font-weight: 700;
  color: var(--green); border: 1px solid rgba(61,214,140,0.3);
  background: rgba(61,214,140,0.08); padding: 8px 18px; border-radius: 10px;
  width: fit-content; margin: 0 auto 24px;
}

/* ── MESSAGE ── */
.hl-msg {
  border-radius: var(--card-radius); padding: 13px 20px;
  font-size: 0.88rem; font-weight: 700; text-align: center;
  margin-bottom: 18px; animation: hlFadeUp 0.3s ease; border: 1px solid;
  position: relative; z-index: 5;
}
.hl-msg-error   { background: rgba(232,64,64,0.1);  color: #ff8080;        border-color: rgba(232,64,64,0.35); }
.hl-msg-success { background: rgba(61,214,140,0.1);  color: var(--green);   border-color: rgba(61,214,140,0.35); }
.hl-msg-info    { background: rgba(79,142,247,0.1);  color: var(--accent3); border-color: rgba(79,142,247,0.35); }

/* ── REWARDED AD AREA ── */
.hl-ad-section {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px; padding: 22px; margin-bottom: 28px;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}
.hl-ad-hint { font-size: 0.82rem; color: var(--muted); line-height: 1.5; text-align: center; }
.hl-ad-btn {
  background: var(--accent); color: #000; border: none; border-radius: 10px;
  padding: 11px 24px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 800;
  letter-spacing: 0.5px; cursor: pointer;
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
  background: #0c1020; border: 1px solid rgba(61,214,140,0.22);
  border-radius: 24px; padding: 44px 36px;
  max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto;
  position: relative; animation: hlModalUp 0.32s cubic-bezier(0.4,0,0.2,1);
}
.hl-modal-box::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--green), var(--accent), var(--accent3));
  border-radius: 24px 24px 0 0;
}
@keyframes hlModalUp { from{opacity:0;transform:translateY(28px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
.hl-modal-box::-webkit-scrollbar { width: 5px; }
.hl-modal-box::-webkit-scrollbar-thumb { background: rgba(61,214,140,0.3); border-radius: 5px; }
.hl-modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 2.3rem; letter-spacing: 2px; text-align: center; margin-bottom: 26px; }
.hl-rules-list { list-style: none; margin-bottom: 22px; display: flex; flex-direction: column; gap: 9px; }
.hl-rules-list li {
  background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid rgba(61,214,140,0.45); border-radius: 12px;
  padding: 13px 16px; font-size: 0.9rem; line-height: 1.6;
  transition: border-color 0.2s, transform 0.2s;
}
.hl-rules-list li:hover { border-left-color: var(--green); transform: translateX(4px); }
.hl-rule-icon { margin-right: 8px; }
.hl-scoring-box {
  background: rgba(255,255,255,0.02); border: 1px solid var(--border);
  border-radius: 16px; padding: 20px; margin-bottom: 28px;
}
.hl-scoring-box h3 { font-size: 0.77rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 14px; }
.hl-scoring-item { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid var(--border); }
.hl-scoring-item:last-child { border-bottom: none; }
.hl-scoring-value { font-weight: 700; color: var(--green); }
.hl-btn-primary {
  width: 100%; padding: 13px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #11998e, var(--green)); color: #000;
  font-family: 'DM Sans', sans-serif; font-size: 0.92rem; font-weight: 800;
  cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s;
}
.hl-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(61,214,140,0.4); }

/* ── DASHBOARD / BOTTOM SECTION ── */
.hl-bottom-section {
  margin-top: 50px;
  animation: hlFadeUp 0.5s ease 0.2s both;
}
.hl-section-divider {
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.hl-section-label {
  font-family: 'Space Mono', monospace; font-size: 0.65rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 2px; color: var(--muted);
}
.hl-section-line {
  flex: 1; height: 1px; background: linear-gradient(to right, rgba(61,214,140,0.18), transparent);
}
.hl-dashboard-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.hl-dash-card {
  background: rgba(255,255,255,.02); border: 1px solid var(--border);
  border-radius: 16px; padding: 18px; display: flex; flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
.hl-dash-card-hdr {
  display: flex; align-items: center; gap: 6px; margin-bottom: 14px;
}
.hl-dash-icon {
  font-size: .95rem;
}
.hl-dash-label {
  font-size: .68rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; color: var(--muted);
}
.hl-streak-dots {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 4px; margin-bottom: 16px;
}
.hl-streak-dot {
  aspect-ratio: 1; border-radius: 6px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.05);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Space Mono', monospace; font-size: 0.52rem; font-weight: 700;
}
.hl-streak-dot.win {
  background: rgba(61,214,140,.18); border-color: rgba(61,214,140,.32); color: #3DD68C;
  box-shadow: 0 0 6px rgba(61,214,140,0.15);
}
.hl-streak-dot.miss {
  background: rgba(232,64,64,.08); border-color: rgba(232,64,64,.18); color: #ff8080;
}
.hl-streak-dot.today-pending {
  background: rgba(79,142,247,.09); border-style: dashed; border-color: rgba(79,142,247,.38);
}
.hl-streak-legend {
  display: flex; gap: 13px; font-size: .68rem; color: var(--muted); align-items: center; flex-wrap: wrap;
  margin-top: auto;
}
.hl-dot-sample {
  display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 4px; vertical-align: middle;
}
.hl-dot-sample.win { background: rgba(61,214,140,.18); border: 1px solid var(--green); }
.hl-dot-sample.miss { background: rgba(232,64,64,.08); border: 1px solid rgba(232,64,64,0.18); }
.hl-dot-sample.today { background: rgba(79,142,247,.14); border: 1px solid var(--accent); }

.hl-stats-grid {
  flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px;
}
.hl-stat-item {
  background: rgba(255,255,255,.03); border: 1px solid var(--border); border-radius: 12px;
  padding: 14px 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: border-color .2s, background .2s;
}
.hl-stat-item:hover {
  border-color: rgba(61,214,140,.22); background: rgba(61,214,140,.03);
}
.hl-stat-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 1px; color: #fff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
}
.hl-stat-name {
  font-size: .62rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-top: 1px;
}

/* ── ANIMATIONS ── */
@keyframes hlFadeUp    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes hlFloatEmoji{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes hlCorrectPop{ 0%,100%{transform:scale(1)} 40%{transform:scale(1.04)} }
@keyframes hlWrongShake{ 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 60%{transform:translateX(10px)} 80%{transform:translateX(-5px)} }

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .hl-nav { padding: 0 12px; height: 54px; }
  .hl-nav-logo { font-size: 1.3rem; }
  .hl-nav-tag { font-size: 0.58rem; padding: 4px 9px; gap: 4px; letter-spacing: 1.5px; }
  .hl-nav-btn { font-size: 0.8rem; padding: 6px 12px; }
  .hl-page { padding: 18px 16px 56px; }
  .hl-page-header h1 { font-size: 1.9rem; }
  .hl-game-area { grid-template-columns: 1fr; gap: 12px; }
  .hl-vs-divider { margin: 4px 0; }
  .hl-vs-divider::before, .hl-vs-divider::after { display: none; }
  .hl-player-card { min-height: 240px; padding: 24px 20px; gap: 8px; }
  .hl-player-photo-wrapper { width: 80px; height: 80px; }
  .hl-player-flag-badge { font-size: 1.15rem; width: 26px; height: 26px; }
  .hl-player-emoji { font-size: 2.2rem; }
  .hl-player-name  { font-size: 1.4rem; }
  .hl-player-value, .hl-hidden-value { font-size: 2.2rem; line-height: 1.1; padding: 2px 6px; }
  .hl-buttons { flex-direction: column; }
  .hl-btn-higher, .hl-btn-lower { width: 100%; }
  .hl-result-card { padding: 28px 20px; }
  .hl-result-score { font-size: 3.8rem; }
  .hl-modal-box { padding: 28px 20px; }
}
@media (max-width: 600px) {
  .hl-dashboard-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .hl-dash-card {
    padding: 10px;
  }
  .hl-streak-dots {
    gap: 4px;
  }
  .hl-stats-grid {
    gap: 6px;
  }
  .hl-stat-item {
    padding: 8px 4px;
  }
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
  .hl-nav-tag { font-size: 0.55rem; padding: 3px 8px; letter-spacing: 1px; }
  .hl-nav-btn { font-size: 0.75rem; padding: 5px 10px; }
  .hl-player-name { font-size: 1.2rem; }
}
`;
