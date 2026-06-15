// src/pages/games/DribbleGauntlet.jsx
// Dribble past L/C/R defender, then pick a 6-zone shot.

import { useState, useCallback } from 'react';
import { DRIBBLE_DEFENDERS, DRIBBLE_SHOT_ZONES } from '../../lib/raidConstants';
import { seededRandom } from '../../lib/dailySeed';

const C = {
  bg:      "#060810",
  surface: "rgba(255,255,255,0.04)",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  accent:  "#F7C344",
  green:   "#3DD68C",
  red:     "#E84040",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
};

function pickDefender(seed, round) {
  const r = seededRandom(seed, round * 13);
  return DRIBBLE_DEFENDERS[Math.floor(r * 3)].id;
}

function pickGkZone(seed, round) {
  const r = seededRandom(seed, round * 19 + 7);
  return DRIBBLE_SHOT_ZONES[Math.floor(r * DRIBBLE_SHOT_ZONES.length)].id;
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

/**
 * @param {Object} props
 * @param {boolean} [props.raidMode] — compact UI for raid Act 2
 * @param {number} [props.roundsTotal=5] — best-of rounds
 * @param {number} [props.seed] — deterministic bot behaviour
 * @param {Function} [props.onComplete] — ({ playerRoundWins, roundsPlayed, rounds })
 */
export default function DribbleGauntlet({
  raidMode = false,
  roundsTotal = 5,
  seed = Date.now(),
  onComplete,
}) {
  const [round, setRound]           = useState(0);
  const [phase, setPhase]           = useState('dribble');
  const [playerWins, setPlayerWins] = useState(0);
  const [roundLog, setRoundLog]     = useState([]);
  const [dribblePick, setDribblePick] = useState(null);
  const [shotPick, setShotPick]     = useState(null);
  const [feedback, setFeedback]     = useState(null);
  const [done, setDone]             = useState(false);

  // Rewarded ad states
  const [hasWatchedAd, setHasWatchedAd] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  function triggerRewardedAdToRetry() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "dribble-gauntlet-retry",
      beforeAd: () => setIsAdLoading(true),
      afterAd: () => setIsAdLoading(false),
      adDismissed: () => {
        // ad dismissed
      },
      adViewed: () => {
        const failedIndex = roundLog.findIndex(r => !r.won);
        if (failedIndex !== -1) {
          const newLog = [...roundLog];
          newLog.splice(failedIndex, 1);
          setRoundLog(newLog);
          setRound(newLog.length);
          setPhase('dribble');
          setDone(false);
          setHasWatchedAd(true);
        }
      },
      adBreakDone: () => setIsAdLoading(false)
    });
  }

  const finishRound = useCallback((won, detail) => {
    const newWins = won ? playerWins + 1 : playerWins;
    const log     = [...roundLog, { round: round + 1, won, ...detail }];
    setRoundLog(log);
    setPlayerWins(newWins);
    setFeedback(won ? '⚽ GOAL!' : '🧤 BLOCKED');
    setPhase('result');

    setTimeout(() => {
      setFeedback(null);
      setDribblePick(null);
      setShotPick(null);

      const nextRound = round + 1;
      if (nextRound >= roundsTotal) {
        setDone(true);
        onComplete?.({ playerRoundWins: newWins, roundsPlayed: roundsTotal, rounds: log });
      } else {
        setRound(nextRound);
        setPhase('dribble');
      }
    }, 1200);
  }, [round, playerWins, roundLog, roundsTotal, onComplete]);

  function tryDribble(dir) {
    if (phase !== 'dribble') return;
    setDribblePick(dir);
    const defender = pickDefender(seed, round);
    if (dir === defender) {
      finishRound(false, { dribblePick: dir, defender, failedAt: 'dribble' });
    } else {
      setPhase('shoot');
    }
  }

  function takeShot(zone) {
    if (phase !== 'shoot') return;
    setShotPick(zone);
    const gkZone = pickGkZone(seed, round);
    const scored = zone !== gkZone;
    finishRound(scored, { dribblePick, shotPick: zone, gkZone, failedAt: scored ? null : 'shot' });
  }

  const winsNeeded = Math.ceil(roundsTotal / 2);

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById("dg-css")) {
      const s = document.createElement("style");
      s.id = "dg-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  if (done) {
    return (
      <div className="dg-page">
        <div className="dg-bg" />
        <div className="dg-grid" />
        <div className="dg-card" style={{ textAlign: 'center' }}>
          <div className="dg-title" style={{ fontSize: '2.5rem', marginBottom: 12 }}>
            {playerWins >= winsNeeded ? 'Act Won!' : 'Act Lost'}
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: C.green, marginBottom: 16 }}>
            {playerWins} / {roundsTotal} Wins
          </div>
          {!raidMode && (
            <p className="dg-sub" style={{ margin: 0 }}>Used in Challenge Raids — Act 2</p>
          )}
          {playerWins < winsNeeded && !hasWatchedAd && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '0.8rem', color: 'rgba(240,240,240,0.5)', marginBottom: 14 }}>
                Failed the gauntlet? Watch an ad to replay a failed round!
              </p>
              <button
                type="button"
                className="dg-btn"
                style={{ width: '100%' }}
                onClick={triggerRewardedAdToRetry}
                disabled={isAdLoading}
              >
                {isAdLoading ? 'Loading...' : 'Retry Failed Round'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dg-page">
      <div className="dg-bg" />
      <div className="dg-grid" />
      <div className="dg-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 className="dg-title">Dribble Gauntlet</h2>
            <p className="dg-sub" style={{ margin: 0 }}>Round {round + 1} of {roundsTotal} · Wins: {playerWins}</p>
          </div>
          <div className="dg-badge" style={{ background: 'rgba(247,195,68,0.1)', border: '1px solid rgba(247,195,68,0.25)', color: '#F7C344' }}>
            ACT 2
          </div>
        </div>

        <div className="dg-progress">
          {Array.from({ length: roundsTotal }).map((_, i) => {
            let cls = 'dg-dot';
            if (roundLog[i]) {
              cls += roundLog[i].won ? ' win' : ' fail';
            } else if (i === round) {
              cls += ' current';
            }
            return <div key={i} className={cls} />;
          })}
        </div>

        {phase === 'dribble' && (
          <>
            <p className="dg-instruction">Beat the defender — pick a lane</p>
            <div className="dg-def-row">
              {DRIBBLE_DEFENDERS.map(d => (
                <button 
                  key={d.id} 
                  type="button" 
                  className={`dg-def-btn${dribblePick === d.id ? ' selected' : ''}`}
                  onClick={() => tryDribble(d.id)}
                >
                  <span style={{ fontSize: 22, color: C.accent, fontWeight: 900 }}>
                    {d.id === 'left' ? '←' : d.id === 'center' ? '↑' : '→'}
                  </span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'shoot' && (
          <>
            <p className="dg-instruction">Past the defender! Pick your shot</p>
            <div className="dg-shot-grid">
              {DRIBBLE_SHOT_ZONES.map(z => (
                <button 
                  key={z.id} 
                  type="button" 
                  className={`dg-shot-zone${shotPick === z.id ? ' selected' : ''}`}
                  onClick={() => takeShot(z.id)}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'result' && feedback && (
          <div className={`dg-feedback ${feedback.includes('GOAL') ? 'goal' : 'blocked'}`}>
            {feedback.includes('GOAL') ? 'GOAL!' : 'BLOCKED'}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@0,9..40,400;0,9..40,700;0,9..40,900&display=swap');

.dg-page {
  position: relative;
  z-index: 1;
  max-width: 500px;
  margin: 0 auto;
  padding: 32px 16px 80px;
  font-family: 'DM Sans', sans-serif;
  color: #F0F0F0;
}
.dg-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% -10%, rgba(61,214,140,0.1) 0%, transparent 60%), #05070f;
}
.dg-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.03;
  background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}
.dg-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 28px 20px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
}
.dg-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(61,214,140,0.04), transparent 60%); pointer-events: none;
}
.dg-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  letter-spacing: 2px;
  line-height: 1;
  margin-bottom: 4px;
  background: linear-gradient(135deg, #3DD68C, #A855F7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.dg-sub {
  color: rgba(240,240,240,0.45);
  font-size: 0.82rem;
  margin-bottom: 20px;
}
.dg-progress {
  display: flex; gap: 8px; justify-content: center; margin-bottom: 24px;
}
.dg-dot {
  width: 12px; height: 12px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  transition: all 0.3s;
}
.dg-dot.current {
  background: #F7C344;
  box-shadow: 0 0 8px #F7C344;
  border-color: #F7C344;
}
.dg-dot.win {
  background: #3DD68C;
  box-shadow: 0 0 8px #3DD68C;
  border-color: #3DD68C;
}
.dg-dot.fail {
  background: #E84040;
  box-shadow: 0 0 8px #E84040;
  border-color: #E84040;
}
.dg-instruction {
  text-align: center; font-size: 0.75rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px;
  color: rgba(240,240,240,0.45); margin-bottom: 18px;
}
.dg-def-row {
  display: flex; gap: 12px; justify-content: center; margin-bottom: 20px;
}
.dg-def-btn {
  flex: 1; max-width: 120px; padding: 18px 10px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; cursor: pointer; color: #F0F0F0;
  font-size: 0.85rem; font-weight: 700;
  transition: all 0.22s ease;
}
.dg-def-btn:hover {
  transform: translateY(-2px);
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.15);
}
.dg-def-btn.selected {
  border-color: #3DD68C;
  background: rgba(61,214,140,0.08);
}
.dg-shot-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px;
  max-width: 320px; margin: 0 auto;
}
.dg-shot-zone {
  padding: 16px 8px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; cursor: pointer; color: rgba(240,240,240,0.6);
  font-size: 0.72rem; font-weight: 700; text-align: center;
  transition: all 0.22s ease;
}
.dg-shot-zone:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.15);
}
.dg-shot-zone.selected {
  border-color: #3DD68C;
  background: rgba(61,214,140,0.08);
}
.dg-feedback {
  margin-top: 20px; padding: 14px; border-radius: 12px;
  text-align: center; font-weight: 800; font-size: 1.1rem;
  letter-spacing: 1px;
}
.dg-feedback.goal {
  background: rgba(61,214,140,0.08);
  border: 1px solid rgba(61,214,140,0.3);
  color: #3DD68C;
  box-shadow: 0 0 12px rgba(61,214,140,0.15);
}
.dg-feedback.blocked {
  background: rgba(232,64,64,0.08);
  border: 1px solid rgba(232,64,64,0.3);
  color: #E84040;
  box-shadow: 0 0 12px rgba(232,64,64,0.15);
}
.dg-btn {
  background: #A855F7; color: #fff; padding: 12px 24px;
  border-radius: 12px; border: none;
  font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 700;
  cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;
  transition: all 0.22s ease; box-shadow: 0 4px 16px rgba(168,85,247,0.28);
}
.dg-btn:hover {
  background: #be7af5; transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(168,85,247,0.38);
}
.dg-badge {
  display: inline-block; padding: 4px 12px; border-radius: 99px;
  font-family: 'Space Mono', monospace; font-size: 0.65rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px;
}
`;
