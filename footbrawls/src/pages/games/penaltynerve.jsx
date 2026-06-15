// src/pages/games/PenaltyNerve.jsx
// Penalty Nerve — penalty shootout game
// Pick your corner, beat the goalkeeper 5 times in a row

import { useState, useEffect, useRef } from 'react';
import { awardXP } from '../../lib/xpEngine';
import { getUser } from '../../lib/user';

const HISTORY_KEY = 'footbrawls_penaltynerve';
const MAX_KICKS   = 5;
const XP_PER_GOAL = 6; // 5 goals = 30 XP max

const GK_PATTERNS = [
  [0.15, 0.35, 0.25, 0.20, 0.40],
  [0.25, 0.20, 0.35, 0.30, 0.45],
  [0.30, 0.25, 0.20, 0.35, 0.50],
  [0.35, 0.30, 0.40, 0.25, 0.55],
  [0.40, 0.45, 0.35, 0.40, 0.60],
];

const CORNERS = [
  { id: 'topLeft',     label: 'Top Left',     symbol: '↖', row: 0, col: 0 },
  { id: 'topRight',    label: 'Top Right',    symbol: '↗', row: 0, col: 2 },
  { id: 'bottomLeft',  label: 'Bottom Left',  symbol: '↙', row: 1, col: 0 },
  { id: 'bottomRight', label: 'Bottom Right', symbol: '↘', row: 1, col: 2 },
  { id: 'center',      label: 'Center',       symbol: '↑', row: 0, col: 1 },
];

const GK_DIVES = {
  topLeft:     'dives left high',
  topRight:    'dives right high',
  bottomLeft:  'dives left low',
  bottomRight: 'dives right low',
  center:      'stays center',
};

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function seededRng(seed, index) {
  let s = (seed * 1664525 + index * 1013904223 + 1013904223) & 0x7fffffff;
  s = (s ^ (s >>> 16)) * 0x45d9f3b & 0x7fffffff;
  return (s >>> 0) / 0x7fffffff;
}

function getDailySeed() {
  const launch = new Date('2026-06-11T00:00:00Z');
  const today  = new Date(getTodayKey() + 'T00:00:00Z');
  return Math.max(0, Math.floor((today - launch) / 86400000));
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

export default function PenaltyNerve() {
  const [kicks, setKicks]           = useState([]);
  const [phase, setPhase]           = useState('aiming');
  const [selected, setSelected]     = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [xpAwarded, setXpAwarded]   = useState(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [savedScore, setSavedScore] = useState(0);
  const [animating, setAnimating]   = useState(false);

  const scoreRef = useRef(0);
  const [scoreDisplay, setScoreDisplay] = useState(0);

  // Rewarded ad states
  const [hasWatchedAd, setHasWatchedAd] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  function triggerRewardedAdToRetakeKick() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "penalty-nerve-retake",
      beforeAd: () => setIsAdLoading(true),
      afterAd: () => setIsAdLoading(false),
      adDismissed: () => {
        // ad dismissed
      },
      adViewed: () => {
        const newKicks = [...kicks];
        if (newKicks.length > 0 && newKicks[newKicks.length - 1].saved) {
          newKicks.pop();
        }
        setKicks(newKicks);
        setPhase('aiming');
        setLastResult(null);
        setHasWatchedAd(true);
        
        // Update score ref and display back to pre-save values if needed
        const newGoals = newKicks.filter(k => !k.saved).length;
        scoreRef.current = newGoals * XP_PER_GOAL;
        setScoreDisplay(scoreRef.current);

        // Remove today's entry from history to reactivate the session
        const today   = getTodayKey();
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
        delete history[today];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      },
      adBreakDone: () => setIsAdLoading(false)
    });
  }

  const seed = getDailySeed();

  useEffect(() => {
    const today   = getTodayKey();
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    if (history[today]) {
      setAlreadyPlayed(true);
      setSavedScore(history[today].xpAwarded || history[today].score || 0);
      setPhase('gameover');
    }
  }, []);

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById("pn-css")) {
      const s = document.createElement("style");
      s.id = "pn-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  async function kick() {
    if (!selected || animating || phase !== 'aiming') return;
    setAnimating(true);

    const kickIdx    = kicks.length;
    const pattern    = GK_PATTERNS[Math.min(kickIdx, GK_PATTERNS.length - 1)];
    const cornerIdx  = CORNERS.findIndex(c => c.id === selected);
    const saveProbability = pattern[cornerIdx];

    const rng   = seededRng(seed, kickIdx * 10 + cornerIdx);
    const saved = rng < saveProbability;

    const gkRng = seededRng(seed + 1, kickIdx * 7 + cornerIdx);
    let gkCorner;
    if (saved) {
      gkCorner = selected;
    } else {
      const others = CORNERS.filter(c => c.id !== selected);
      gkCorner = others[Math.floor(gkRng * others.length)].id;
    }

    if (!saved) {
      scoreRef.current = scoreRef.current + XP_PER_GOAL;
      setScoreDisplay(scoreRef.current);
    }

    const result    = { corner: selected, saved, gkDive: gkCorner };
    const newKicks  = [...kicks, result];

    setLastResult(result);
    setKicks(newKicks);
    setPhase('result');
    setSelected(null);

    setTimeout(async () => {
      setAnimating(false);

      const isGameOver = saved || newKicks.length >= MAX_KICKS;

      if (isGameOver) {
        setPhase('gameover');

        const finalXP = scoreRef.current;
        const goals   = newKicks.filter(k => !k.saved).length;
        const today   = getTodayKey();

        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
        history[today] = { score: finalXP, goals, xpAwarded: finalXP, date: today };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

        if (finalXP > 0) {
          try {
            const user = getUser();
            if (!user?.userId) {
              console.warn('[PenaltyNerve] No user found — XP not awarded');
              setXpAwarded(finalXP);
              return;
            }
            const res = await awardXP(user.userId, 'penaltyNerve_all5', { rawXP: finalXP });
            if (res?.cappedOut) {
              setXpAwarded(0);
            } else {
              setXpAwarded(res?.xpAwarded ?? finalXP);
            }
          } catch (err) {
            console.error('[PenaltyNerve] awardXP failed:', err);
            setXpAwarded(finalXP);
          }
        } else {
          setXpAwarded(0);
        }
      } else {
        setPhase('aiming');
        setLastResult(null);
      }
    }, 2000);
  }

  const goals       = kicks.filter(k => !k.saved).length;
  const currentKick = kicks.length + 1;

  const getGameOverStickerClass = (g) => {
    if (g === 5) return 'sticker-perfect';
    if (g >= 3) return 'sticker-great';
    if (g >= 1) return 'sticker-good';
    return 'sticker-poor';
  };

  const getGameOverStickerText = (g) => {
    if (g === 5) return 'PERFECT SHOOTOUT';
    if (g >= 3) return 'GREAT SHOT POWER';
    if (g >= 1) return 'DECENT SHOT';
    return 'KEEPER DOMINATED';
  };

  if (alreadyPlayed && phase === 'gameover') {
    return (
      <div className="pn-page">
        <div className="pn-bg" />
        <div className="pn-grid" />
        
        <div className="pn-header">
          <h1 className="pn-title">PENALTY NERVE</h1>
          <p className="pn-subtitle">Score 5 penalties · {XP_PER_GOAL} XP per goal</p>
        </div>

        <div className="pn-result-card">
          <div className="pn-result-title">ALREADY PLAYED TODAY!</div>
          <div className="pn-result-score">{savedScore} XP</div>
          <p className="pn-next-puzzle-hint">New penalties tomorrow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pn-page">
      <div className="pn-bg" />
      <div className="pn-grid" />

      {/* Header */}
      <div className="pn-header">
        <h1 className="pn-title">PENALTY NERVE</h1>
        <p className="pn-subtitle">Score 5 penalties · {XP_PER_GOAL} XP per goal · Max 30 XP</p>
      </div>

      {/* Progress dots */}
      <div className="pn-progress-row">
        {Array.from({ length: MAX_KICKS }).map((_, i) => {
          const k = kicks[i];
          let dotCls = "pn-progress-dot";
          let dotText = "";
          
          if (k) {
            if (k.saved) {
              dotCls += " dot-fail";
              dotText = "SAVED";
            } else {
              dotCls += " dot-win";
              dotText = "GOAL";
            }
          } else if (i === kicks.length) {
            dotCls += " dot-current";
            dotText = "AIM";
          }
          
          return (
            <div key={i} className={dotCls}>
              <span className="pn-dot-indicator-text">{dotText || (i + 1)}</span>
            </div>
          );
        })}
      </div>

      {/* Score row */}
      <div className="pn-score-row">
        <div className="pn-score-item">
          <div className="pn-score-val">{goals}</div>
          <div className="pn-score-label">Goals</div>
        </div>
        <div className="pn-score-item">
          <div className="pn-score-val highlight-green">{scoreDisplay}</div>
          <div className="pn-score-label">XP</div>
        </div>
        <div className="pn-score-item">
          <div className="pn-score-val">
            {phase === 'gameover' ? '—' : `${currentKick}/${MAX_KICKS}`}
          </div>
          <div className="pn-score-label">Kick</div>
        </div>
      </div>

      {phase !== 'gameover' && (
        <>
          {/* Goal net frame */}
          <div className="pn-goal-frame">
            <div className="pn-crossbar" />
            <div className="pn-post-left" />
            <div className="pn-post-right" />
            <div className="pn-goal-grid-net">
              {[
                { id: 'topLeft',      row: 0, col: 0 },
                { id: 'center',       row: 0, col: 1 },
                { id: 'topRight',     row: 0, col: 2 },
                { id: 'bottomLeft',   row: 1, col: 0 },
                { id: 'bottomCenter', row: 1, col: 1 },
                { id: 'bottomRight',  row: 1, col: 2 },
              ].map(zone => {
                const isSelected = selected === zone.id;
                const isGkZone   = lastResult?.gkDive === zone.id;
                const isBallZone = lastResult?.corner === zone.id;
                let zoneCls = "pn-goal-zone";
                if (isSelected && phase === 'aiming') zoneCls += " zone-aimed";
                else if (isGkZone && phase === 'result') zoneCls += " zone-gk-dived";
                else if (isBallZone && phase === 'result' && !lastResult.saved) zoneCls += " zone-ball-scored";
                else if (zone.id === 'bottomCenter') zoneCls += " zone-disabled";

                return (
                  <div 
                    key={zone.id} 
                    className={zoneCls}
                    onClick={() => { if (phase === 'aiming' && zone.id !== 'bottomCenter') setSelected(zone.id); }}
                  >
                    {isGkZone  && phase === 'result' && (
                      <div className="pn-gk-dive-badge">KEEPER BLOCKED</div>
                    )}
                    {isBallZone && phase === 'result' && !lastResult.saved && (
                      <div className="pn-ball-goal-badge">GOAL SCORED</div>
                    )}
                  </div>
                );
              })}
            </div>
            {phase === 'aiming' && (
              <div className="pn-gk-standing-avatar">
                <div className="pn-gk-silhouette">
                  <div className="pn-gk-head" />
                  <div className="pn-gk-shoulders">GK</div>
                </div>
              </div>
            )}
          </div>

          {/* Result feedback banner */}
          {phase === 'result' && lastResult && (
            <div className={`pn-feedback-banner ${lastResult.saved ? 'banner-saved' : 'banner-goal'}`}>
              {lastResult.saved
                ? `SAVED! Goalkeeper ${GK_DIVES[lastResult.gkDive]}`
                : `GOAL! +${XP_PER_GOAL} XP Earned`}
            </div>
          )}

          {/* Corner picker UI */}
          {phase === 'aiming' && (
            <div className="pn-aim-section">
              <p className="pn-instruction">PICK YOUR CORNER TARGET</p>
              <div className="pn-corner-grid">
                {CORNERS.map(corner => (
                  <button 
                    key={corner.id} 
                    className={`pn-corner-btn ${selected === corner.id ? 'active' : ''}`}
                    onClick={() => setSelected(corner.id)}
                  >
                    <span className="pn-corner-symbol">{corner.symbol}</span>
                    <span className="pn-corner-label">{corner.label}</span>
                  </button>
                ))}
              </div>
              <button 
                className="pn-kick-btn"
                disabled={!selected || animating} 
                onClick={kick}
              >
                STRIKE BALL
              </button>
            </div>
          )}
        </>
      )}

      {/* Game over card */}
      {phase === 'gameover' && !alreadyPlayed && (
        <div className="pn-result-card">
          <div className="pn-sticker-container">
            <span className={`pn-sticker ${getGameOverStickerClass(goals)}`}>
              {getGameOverStickerText(goals)}
            </span>
          </div>

          <div className="pn-result-score">{scoreDisplay} XP</div>
          <div className="pn-result-info">{goals} of {MAX_KICKS} goals scored</div>

          <div className="pn-kick-replay-list">
            {kicks.map((k, i) => (
              <div key={i} className={`pn-replay-row ${k.saved ? 'replay-saved' : 'replay-goal'}`}>
                <span className="pn-replay-status-badge">{k.saved ? 'SAVED' : 'GOAL'}</span>
                <span className="pn-replay-details">
                  {k.saved ? `Corner ${k.corner} was blocked` : `Scored cleanly in ${k.corner}`}
                </span>
              </div>
            ))}
          </div>

          {xpAwarded != null && (
            <div className="pn-xp-added-badge">
              {xpAwarded > 0 ? `+${xpAwarded} XP ADDED TO GUILD` : 'DAILY XP LIMIT REACHED'}
            </div>
          )}

          {goals < 5 && !hasWatchedAd && (
            <div className="pn-ad-recovery-block">
              <p className="pn-ad-recovery-text">
                Missed a penalty? Save your progress and retake the missed kick!
              </p>
              <button
                type="button"
                className="pn-ad-btn"
                onClick={triggerRewardedAdToRetakeKick}
                disabled={isAdLoading}
              >
                <span className="pn-ad-btn-icon">▶</span>
                <span>{isAdLoading ? 'LOADING AD...' : 'RETAKE MISSED KICK'}</span>
              </button>
            </div>
          )}
          <p className="pn-next-puzzle-hint">New penalties tomorrow</p>
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@0,9..40,400;0,9..40,700;0,9..40,900&display=swap');

.pn-page {
  position: relative;
  z-index: 1;
  max-width: 500px;
  margin: 0 auto;
  padding: 32px 16px 80px;
  font-family: 'DM Sans', sans-serif;
  color: #F0F0F0;
  box-sizing: border-box;
}

.pn-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% -10%, rgba(16, 185, 129, 0.1) 0%, transparent 60%), #05070f;
}

.pn-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.03;
  background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Header */
.pn-header {
  margin-bottom: 24px;
}

.pn-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.8rem;
  letter-spacing: 2px;
  line-height: 1;
  margin: 0 0 6px 0;
  background: linear-gradient(135deg, #10B981, #A855F7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.pn-subtitle {
  color: rgba(240,240,240,0.45);
  font-size: 0.88rem;
  margin: 0;
}

/* Progress Dots Row */
.pn-progress-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}

.pn-progress-dot {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  transition: all 0.3s ease;
  position: relative;
}

.pn-progress-dot.dot-current {
  background: rgba(255, 255, 255, 0.08);
  border-color: #F7C344;
  box-shadow: 0 0 8px rgba(247, 195, 68, 0.3);
}

.pn-progress-dot.dot-win {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10B981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}

.pn-progress-dot.dot-fail {
  background: rgba(232, 64, 64, 0.15);
  border-color: #E84040;
  box-shadow: 0 0 10px rgba(232, 64, 64, 0.25);
}

.pn-dot-indicator-text {
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.pn-progress-dot.dot-win .pn-dot-indicator-text {
  color: #10B981;
}

.pn-progress-dot.dot-fail .pn-dot-indicator-text {
  color: #E84040;
}

.pn-progress-dot.dot-current .pn-dot-indicator-text {
  color: #F7C344;
}

/* Score stats row */
.pn-score-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.pn-score-item {
  flex: 1;
  text-align: center;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  backdrop-filter: blur(8px);
}

.pn-score-val {
  font-family: 'Space Mono', monospace;
  font-size: 1.5rem;
  font-weight: 800;
  color: #F0F0F0;
}

.pn-score-val.highlight-green {
  color: #10B981;
  text-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
}

.pn-score-label {
  font-size: 0.68rem;
  color: rgba(242, 242, 244, 0.35);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-top: 4px;
}

/* Goal frame visual */
.pn-goal-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 2/1;
  background: rgba(255, 255, 255, 0.01);
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  /* Net grid overlay */
  background-image: 
    linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
  background-size: 16px 16px;
}

.pn-crossbar {
  position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #FFF; opacity: 0.8; z-index: 2;
  box-shadow: 0 2px 6px rgba(255,255,255,0.2);
}

.pn-post-left {
  position: absolute; top: 0; left: 0; bottom: 0; width: 4px; background: #FFF; opacity: 0.8; z-index: 2;
  box-shadow: 2px 0 6px rgba(255,255,255,0.2);
}

.pn-post-right {
  position: absolute; top: 0; right: 0; bottom: 0; width: 4px; background: #FFF; opacity: 0.8; z-index: 2;
  box-shadow: -2px 0 6px rgba(255,255,255,0.2);
}

.pn-goal-grid-net {
  position: absolute; inset: 4px; display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px;
}

.pn-goal-zone {
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.06);
}

.pn-goal-zone.zone-aimed {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.4);
  box-shadow: inset 0 0 15px rgba(16, 185, 129, 0.2);
}

.pn-goal-zone.zone-gk-dived {
  background: rgba(232, 64, 64, 0.12);
  border: 1px solid rgba(232, 64, 64, 0.4);
  box-shadow: inset 0 0 15px rgba(232, 64, 64, 0.25);
}

.pn-goal-zone.zone-ball-scored {
  background: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(16, 185, 129, 0.5);
  box-shadow: inset 0 0 20px rgba(16, 185, 129, 0.3);
}

.pn-goal-zone.zone-disabled {
  opacity: 0.1;
  cursor: default;
}

.pn-goal-zone:not(.zone-disabled):hover {
  border-color: rgba(255,255,255,0.2);
}

/* Custom visual badges inside zones instead of emojis */
.pn-gk-dive-badge {
  background: #E84040;
  color: #FFF;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
}

.pn-ball-goal-badge {
  background: #10B981;
  color: #060810;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
}

/* Goalkeeper Standing avatar */
.pn-gk-standing-avatar {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  pointer-events: none;
}

.pn-gk-silhouette {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px 10px 0 0;
  padding: 8px 12px;
  width: 70px;
  box-shadow: 0 -4px 15px rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
}

.pn-gk-head {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  margin-bottom: 6px;
  border: 1px solid rgba(255,255,255,0.4);
}

.pn-gk-shoulders {
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
}

/* Feedback banner */
.pn-feedback-banner {
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.banner-saved {
  background: rgba(232, 64, 64, 0.08);
  border: 1px solid rgba(232, 64, 64, 0.25);
  color: #E84040;
}

.banner-goal {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #10B981;
}

/* Corner Pickers */
.pn-aim-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pn-instruction {
  text-align: center;
  color: rgba(242, 242, 244, 0.4);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 4px 0;
}

.pn-corner-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.pn-corner-btn {
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.02);
  color: rgba(242, 242, 244, 0.5);
}

.pn-corner-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.pn-corner-btn.active {
  border-color: #10B981;
  background: rgba(16, 185, 129, 0.08);
  color: #10B981;
}

.pn-corner-symbol {
  font-size: 1.3rem;
  font-weight: 800;
}

.pn-corner-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

/* Strike Button */
.pn-kick-btn {
  width: 100%;
  padding: 16px;
  background: #10B981;
  color: #060810;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  letter-spacing: 1.5px;
  transition: all 0.22s;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
  text-transform: uppercase;
}

.pn-kick-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  background: #34d399;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
}

.pn-kick-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* GameOver Card & Stickers */
.pn-result-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 28px 20px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
}

.pn-result-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent 60%); pointer-events: none;
  border-radius: 20px;
}

.pn-sticker-container {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.pn-sticker {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 8px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.15rem;
  letter-spacing: 1.5px;
  transform: rotate(-3deg);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  border: 2px solid;
}

.sticker-perfect {
  background: linear-gradient(135deg, #F7C344, #F59E0B);
  color: #060810;
  border-color: #FFF;
  box-shadow: 0 0 15px rgba(247, 195, 68, 0.4);
}

.sticker-great {
  background: linear-gradient(135deg, #10B981, #06B6D4);
  color: #FFF;
  border-color: #AAE2FF;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
}

.sticker-good {
  background: linear-gradient(135deg, #4F8EF7, #A855F7);
  color: #FFF;
  border-color: #E2AAFF;
}

.sticker-poor {
  background: linear-gradient(135deg, #E84040, #0F172A);
  color: #FFF;
  border-color: #FFAAAA;
}

.pn-result-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  color: #F2F2F4;
  letter-spacing: 1.5px;
  margin-bottom: 12px;
}

.pn-result-score {
  font-family: 'Space Mono', monospace;
  font-size: 3rem;
  font-weight: 900;
  color: #10B981;
  margin-bottom: 6px;
  text-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
}

.pn-result-info {
  font-size: 0.88rem;
  color: rgba(242, 242, 244, 0.5);
  margin-bottom: 24px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Replay stats list */
.pn-kick-replay-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.pn-replay-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid;
  text-align: left;
}

.pn-replay-row.replay-saved {
  background: rgba(232, 64, 64, 0.03);
  border-color: rgba(232, 64, 64, 0.15);
}

.pn-replay-row.replay-goal {
  background: rgba(16, 185, 129, 0.03);
  border-color: rgba(16, 185, 129, 0.15);
}

.pn-replay-status-badge {
  font-family: 'Space Mono', monospace;
  font-size: 0.62rem;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
}

.replay-saved .pn-replay-status-badge {
  background: #E84040;
  color: #FFF;
}

.replay-goal .pn-replay-status-badge {
  background: #10B981;
  color: #060810;
}

.pn-replay-details {
  font-size: 0.78rem;
  color: rgba(242, 242, 244, 0.6);
}

/* XP Badge */
.pn-xp-added-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.22);
  border-radius: 99px;
  padding: 6px 16px;
  font-size: 0.75rem;
  font-weight: 800;
  color: #10B981;
  font-family: 'Space Mono', monospace;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

/* Ad Recovery Section */
.pn-ad-recovery-block {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.pn-ad-recovery-text {
  font-size: 0.75rem;
  color: rgba(242, 242, 244, 0.45);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.pn-ad-btn {
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

.pn-ad-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(247, 195, 68, 0.4);
  background: #ffcf54;
}

.pn-ad-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.pn-ad-btn-icon {
  font-size: 0.85rem;
}

.pn-next-puzzle-hint {
  font-size: 0.72rem;
  color: rgba(242, 242, 244, 0.3);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
`;