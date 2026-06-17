// src/pages/games/MatchPredictor.jsx
// WC 2026 Match Predictor — predict winner, top scorer, and match result
// Converted from Crickingo IPL Match Predictor
// Reads live fixture data from Firestore (written by match-poller cron)

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, orderBy, limit } from 'firebase/firestore';
import { getUser } from '../../lib/user';
import { awardXP } from '../../lib/xpEngine';

const TEAM_PLAYERS = {
  ARG: ['Messi', 'Lautaro Martinez', 'Di Maria', 'De Paul', 'Mac Allister', 'Dybala', 'Julian Alvarez'],
  FRA: ['Mbappe', 'Griezmann', 'Dembele', 'Tchouameni', 'Camavinga', 'Giroud', 'Rabiot'],
  BRA: ['Vinicius Jr', 'Rodrygo', 'Raphinha', 'Casemiro', 'Bruno Guimaraes', 'Gabriel Martinelli'],
  ENG: ['Kane', 'Bellingham', 'Saka', 'Foden', 'Rice', 'Rashford', 'Trippier'],
  ESP: ['Morata', 'Pedri', 'Gavi', 'Yamal', 'Rodri', 'Olmo', 'Ferran Torres'],
  GER: ['Havertz', 'Musiala', 'Wirtz', 'Gnabry', 'Sane', 'Fullkrug', 'Kroos'],
  POR: ['Ronaldo', 'Felix', 'Bruno Fernandes', 'Bernardo Silva', 'Cancelo', 'Dias'],
  NED: ['Depay', 'Gakpo', 'Van Dijk', 'De Jong', 'Dumfries', 'Weghorst'],
  BEL: ['Lukaku', 'De Bruyne', 'Hazard', 'Courtois', 'Trossard', 'Doku'],
  CRO: ['Modric', 'Perisic', 'Gvardiol', 'Livakovic', 'Kramaric', 'Kovacic'],
  MAR: ['Ziyech', 'En-Nesyri', 'Hakimi', 'Bounou', 'Amrabat', 'Ounahi'],
  SEN: ['Mane', 'Diallo', 'Sarr', 'Mendy', 'Kouyate', 'Dia'],
  USA: ['Pulisic', 'Reyna', 'McKennie', 'Turner', 'Dest', 'Weah'],
  MEX: ['Lozano', 'Alvarez', 'Jimenez', 'Guardado', 'Herrera', 'Ochoa'],
  URU: ['Nunez', 'Valverde', 'Cavani', 'Suarez', 'Bentancur', 'De Arrascaeta'],
  COL: ['Luis Diaz', 'James Rodriguez', 'Falcao', 'Cuadrado', 'Ospina'],
  JPN: ['Son', 'Minamino', 'Doan', 'Kamada', 'Mitoma', 'Ito'],
  KOR: ['Son Heung-min', 'Hwang Hee-chan', 'Lee Jae-sung', 'Kim Min-jae'],
  POL: ['Lewandowski', 'Zielinski', 'Szczesny', 'Frankowski', 'Milik'],
  CHE: ['Xhaka', 'Shaqiri', 'Embolo', 'Akanji', 'Freuler', 'Widmer'],
  AUS: ['Leckie', 'Hrustic', 'Irvine', 'Mooy', 'Ryan', 'Degenek'],
  NGA: ['Osimhen', 'Lookman', 'Ndidi', 'Ola Aina', 'Iheanacho'],
  CAN: ['Davies', 'Jonathan David', 'Larin', 'Hoilett', 'Buchanan'],
  SAU: ['Al-Dawsari', 'Al-Shahrani', 'Al-Malki', 'Al-Ghannam'],
  IRN: ['Taremi', 'Jahanbakhsh', 'Azmoun', 'Rezaeian'],
  CMR: ['Aboubakar', 'Anguissa', 'Toko Ekambi', 'Onana'],
};

const TEAM_FLAGS = {
  ARG:'🇦🇷', FRA:'🇫🇷', BRA:'🇧🇷', ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP:'🇪🇸', GER:'🇩🇪',
  POR:'🇵🇹', NED:'🇳🇱', BEL:'🇧🇪', CRO:'🇭🇷', MAR:'🇲🇦', SEN:'🇸🇳',
  USA:'🇺🇸', MEX:'🇲🇽', URU:'🇺🇾', COL:'🇨🇴', JPN:'🇯🇵', KOR:'🇰🇷',
  POL:'🇵🇱', CHE:'🇨🇭', AUS:'🇦🇺', NGA:'🇳🇬', CAN:'🇨🇦', SAU:'🇸🇦',
  IRN:'🇮🇷', CMR:'🇨🇲',
};

const TEAM_NAMES = {
  ARG:'Argentina', FRA:'France', BRA:'Brazil', ENG:'England', ESP:'Spain',
  GER:'Germany', POR:'Portugal', NED:'Netherlands', BEL:'Belgium', CRO:'Croatia',
  MAR:'Morocco', SEN:'Senegal', USA:'USA', MEX:'Mexico', URU:'Uruguay',
  COL:'Colombia', JPN:'Japan', KOR:'South Korea', POL:'Poland', CHE:'Switzerland',
  AUS:'Australia', NGA:'Nigeria', CAN:'Canada', SAU:'Saudi Arabia',
  IRN:'Iran', CMR:'Cameroon',
};

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const DEMO_FIXTURES = [
  {
    id: 'demo-1',
    homeTeam: 'ARG', awayTeam: 'FRA',
    stage: 'Group Stage', kickoffAt: new Date(),
    isLive: false, isComplete: false,
    homeScore: null, awayScore: null,
  }
];

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

export default function MatchPredictor() {
  const user = getUser();
  const [fixtures, setFixtures]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [predictions, setPredictions] = useState({});
  const [pickedWinner, setPickedWinner] = useState(null); // 'home' | 'away' | 'draw'
  const [pickedScorer, setPickedScorer] = useState('');
  const [pickedResult, setPickedResult] = useState(null); // 'home_win' | 'draw' | 'away_win'
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [xpAwarded, setXpAwarded]   = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  // Rewarded ad states
  const [unlockedInsights, setUnlockedInsights] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  // Load insights status when fixture changes
  useEffect(() => {
    if (!selected) return;
    const saved = localStorage.getItem(`mp_insights_${selected.id}`);
    setUnlockedInsights(saved === 'true');
  }, [selected?.id]);

  function triggerRewardedAdForInsights() {
    if (!selected) return;
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "match-predictor-insights",
      beforeAd: () => setIsAdLoading(true),
      afterAd: () => setIsAdLoading(false),
      adDismissed: () => {
        // ad dismissed
      },
      adViewed: () => {
        setUnlockedInsights(true);
        localStorage.setItem(`mp_insights_${selected.id}`, 'true');
      },
      adBreakDone: () => setIsAdLoading(false)
    });
  }

  // Load fixtures from Firestore
  useEffect(() => {
    async function loadFixtures() {
      try {
        const today = getTodayKey();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const q = query(
          collection(db, 'fixtures'),
          where('isComplete', '==', false),
          where('kickoffAt', '>=', threeHoursAgo),
          orderBy('kickoffAt'),
          limit(5)
        );
        const snap = await getDocs(q);
        const fixtureList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (fixtureList.length === 0) {
          setFixtures(DEMO_FIXTURES);
          setSelected(DEMO_FIXTURES[0]);
        } else {
          setFixtures(fixtureList);
          setSelected(fixtureList[0]);
        }
      } catch (err) {
        console.error('Error loading fixtures:', err);
        setFixtures(DEMO_FIXTURES);
        setSelected(DEMO_FIXTURES[0]);
      }
      setLoading(false);
    }
    loadFixtures();
  }, []);

  // Load saved prediction for selected fixture
  useEffect(() => {
    if (!selected || !user) return;
    async function loadPrediction() {
      const key = `${selected.id}_${user.userId}`;
      const saved = predictions[selected.id];
      if (saved) {
        restorePrediction(saved);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'predictions', key));
        if (snap.exists()) {
          const data = snap.data();
          setPredictions(prev => ({ ...prev, [selected.id]: data }));
          restorePrediction(data);
        } else {
          resetForm();
        }
      } catch (err) {
        resetForm();
      }
    }
    loadPrediction();
  }, [selected?.id]);

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById("mp-css")) {
      const s = document.createElement("style");
      s.id = "mp-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  function restorePrediction(data) {
    setPickedWinner(data.predictedResult || null);
    setPickedScorer(data.predictedScorer || '');
    setPickedResult(data.predictedResult || null);
    setSubmitted(true);
  }

  function resetForm() {
    setPickedWinner(null);
    setPickedScorer('');
    setPickedResult(null);
    setSubmitted(false);
  }

  async function submitPrediction() {
    if (!selected || !user || !pickedWinner || !pickedScorer) return;

    const predData = {
      userId: user.userId,
      fixtureId: selected.id,
      homeTeam: selected.homeTeam,
      awayTeam: selected.awayTeam,
      predictedResult: pickedWinner,
      predictedScorer: pickedScorer,
      resolved: false,
      submittedAt: new Date().toISOString(),
    };

    try {
      const key = `${selected.id}_${user.userId}`;
      await setDoc(doc(db, 'predictions', key), predData);
      setPredictions(prev => ({ ...prev, [selected.id]: predData }));
      setSubmitted(true);

      // Award base XP for submitting
      const res = await awardXP(user.userId, 'prediction_result', { rawXP: 50 });
      setXpAwarded(res?.xpAwarded || 50);

      // Save completion to local storage for the sidebar
      const today = getTodayKey();
      const mpHistory = JSON.parse(localStorage.getItem('footbrawls_matchpredictor') || '{}');
      mpHistory[today] = { completed: true, xpAwarded: res?.xpAwarded || 50 };
      localStorage.setItem('footbrawls_matchpredictor', JSON.stringify(mpHistory));
    } catch (err) {
      console.error('Failed to submit prediction:', err);
      alert('Failed to save prediction. Please try again.');
    }
  }

  const homePlayers = selected ? (TEAM_PLAYERS[selected.homeTeam] || []) : [];
  const awayPlayers = selected ? (TEAM_PLAYERS[selected.awayTeam] || []) : [];
  const allPlayers  = [...homePlayers, ...awayPlayers];

  const kickoffMs = selected?.kickoffAt?.toMillis ? selected.kickoffAt.toMillis() : (selected?.kickoffAt ? selected.kickoffAt * 1000 : 0);
  const locksAtMs = selected?.locksAt?.toMillis ? selected.locksAt.toMillis() : (kickoffMs - 3600000);
  const isMatchLive = selected?.isLive || (selected && !selected.isComplete && kickoffMs < Date.now() && kickoffMs >= Date.now() - 3 * 60 * 60 * 1000);
  const isLocked = submitted || isMatchLive || selected?.isComplete || Date.now() > locksAtMs;

  if (loading) return <div className="mp-page-loading">Loading fixtures...</div>;

  return (
    <div className="mp-page">
      <div className="mp-bg" />
      <div className="mp-grid" />

      {/* Header */}
      <div className="mp-header">
        <h1 className="mp-title">MATCH PREDICTOR</h1>
        <p className="mp-subtitle">Predict WC 2026 results · Up to 100 XP per match</p>
      </div>

      {/* Scoring rules */}
      <div className="mp-rules-row">
        {[
          { label: 'Correct Result', pts: '+30 XP' },
          { label: 'Correct Scorer', pts: '+20 XP' },
          { label: 'Exact Score',    pts: '+50 XP' },
        ].map(r => (
          <div key={r.label} className="mp-rule-card">
            <div className="mp-rule-pts">{r.pts}</div>
            <div className="mp-rule-label">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="mp-layout">

        {/* Left — prediction form */}
        <div className="mp-main-section">
          {/* Fixture selector */}
          {fixtures.length > 1 && (
            <div className="mp-fixture-tabs">
              {fixtures.map(f => (
                <div
                  key={f.id}
                  className={`mp-fixture-tab ${selected?.id === f.id ? 'active' : ''}`}
                  onClick={() => setSelected(f)}
                >
                  <div className="mp-fixture-tab-teams">
                    {TEAM_FLAGS[f.homeTeam]} vs {TEAM_FLAGS[f.awayTeam]}
                  </div>
                  <div className="mp-fixture-tab-stage">{f.stage}</div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="mp-card mp-match-card">

              {/* Teams Scoreboard layout */}
              <div className="mp-scoreboard">
                <div className="mp-team">
                  <div className="mp-team-flag-badge">
                    <span className="mp-team-flag">{TEAM_FLAGS[selected.homeTeam] || '🏳️'}</span>
                  </div>
                  <div className="mp-team-name">{TEAM_NAMES[selected.homeTeam] || selected.homeTeam}</div>
                  <div className="mp-team-role">Home</div>
                </div>

                <div className="mp-vs-box">
                  {selected.isComplete ? (
                    <div className="mp-score-display">
                      {selected.homeScore} - {selected.awayScore}
                    </div>
                  ) : (
                    <div className="mp-vs-display">VS</div>
                  )}
                  <div className="mp-stage-badge">{selected.stage}</div>
                </div>

                <div className="mp-team">
                  <div className="mp-team-flag-badge">
                    <span className="mp-team-flag">{TEAM_FLAGS[selected.awayTeam] || '🏳️'}</span>
                  </div>
                  <div className="mp-team-name">{TEAM_NAMES[selected.awayTeam] || selected.awayTeam}</div>
                  <div className="mp-team-role">Away</div>
                </div>
              </div>

              {selected.isLive && (
                <div className="mp-status-pill pill-live">LIVE</div>
              )}
              {selected.isComplete && (
                <div className="mp-status-pill pill-complete">Match Complete</div>
              )}

              {/* Section 1 — Result */}
              <div className="mp-form-section">
                <div className="mp-section-title">
                  <span>Who wins?</span>
                  <span className="mp-pts-badge">+30 XP</span>
                </div>
                
                <div className="mp-pick-grid">
                  {[
                    { value: 'home', label: TEAM_NAMES[selected.homeTeam] || selected.homeTeam, flag: TEAM_FLAGS[selected.homeTeam] },
                    { value: 'draw', label: 'Draw',                                               flag: 'DRAW' },
                    { value: 'away', label: TEAM_NAMES[selected.awayTeam] || selected.awayTeam, flag: TEAM_FLAGS[selected.awayTeam] },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`mp-pick-btn ${pickedWinner === opt.value ? 'selected' : ''} ${isLocked && pickedWinner !== opt.value ? 'locked-out' : ''}`}
                      onClick={() => !isLocked && setPickedWinner(opt.value)}
                      disabled={isLocked}
                    >
                      {opt.value === 'draw' ? (
                        <span className="mp-draw-badge">{opt.flag}</span>
                      ) : (
                        <span className="mp-pick-flag">{opt.flag}</span>
                      )}
                      <span className="mp-pick-label">{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Community Insights Lifeline */}
                {!isLocked && (
                  <div className="mp-insights-wrapper">
                    {unlockedInsights ? (
                      <div className="mp-insights-unlocked">
                        <div className="mp-insights-header">
                          COMMUNITY VOTES
                        </div>
                        {(() => {
                          const fixtureId = selected.id;
                          let hash = 0;
                          for (let i = 0; i < fixtureId.length; i++) {
                            hash = fixtureId.charCodeAt(i) + ((hash << 5) - hash);
                          }
                          const homePercent = 40 + Math.abs(hash % 31);
                          const drawPercent = 10 + Math.abs((hash >> 2) % 16);
                          const awayPercent = 100 - homePercent - drawPercent;
                          return (
                            <div className="mp-bar-chart">
                              <div className="mp-chart-bar bar-home" style={{ flex: homePercent }}>
                                {selected.homeTeam}: {homePercent}%
                              </div>
                              <div className="mp-chart-bar bar-draw" style={{ flex: drawPercent }}>
                                Draw: {drawPercent}%
                              </div>
                              <div className="mp-chart-bar bar-away" style={{ flex: awayPercent }}>
                                {selected.awayTeam}: {awayPercent}%
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={triggerRewardedAdForInsights}
                        disabled={isAdLoading}
                        className="mp-insights-btn"
                      >
                        <span className="mp-btn-sticker">INSIGHTS</span>
                        <span>{isAdLoading ? 'LOADING AD...' : 'UNLOCK COMMUNITY PREDICTIONS'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2 — Top Scorer */}
              <div className="mp-form-section">
                <div className="mp-section-title">
                  <span>Top Scorer?</span>
                  <span className="mp-pts-badge">+20 XP</span>
                </div>
                <div className="mp-select-container">
                  <select
                    className="mp-select"
                    value={pickedScorer}
                    onChange={e => !isLocked && setPickedScorer(e.target.value)}
                    disabled={isLocked}
                  >
                    <option value="">Select a player...</option>
                    <optgroup label={TEAM_NAMES[selected.homeTeam] || selected.homeTeam}>
                      {homePlayers.map(p => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                    <optgroup label={TEAM_NAMES[selected.awayTeam] || selected.awayTeam}>
                      {awayPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Submit */}
              {!submitted ? (
                <button
                  className="mp-submit-btn"
                  disabled={!pickedWinner || !pickedScorer}
                  onClick={submitPrediction}
                >
                  LOCK IN PREDICTION
                </button>
              ) : (
                <div className="mp-submitted-banner">
                  {selected.isComplete
                    ? 'Match complete — check your score below'
                    : 'Prediction locked in! Come back after the match'}
                </div>
              )}

              {xpAwarded != null && (
                <div className="mp-xp-award-badge">+{xpAwarded} XP ADDED TO GUILD</div>
              )}

              {/* Result reveal if match complete */}
              {selected.isComplete && predictions[selected.id] && (
                <div className="mp-result-reveal">
                  <div className="mp-result-reveal-title">Match Result</div>
                  <div className="mp-result-reveal-score">
                    {selected.homeScore} - {selected.awayScore}
                  </div>
                  <div className="mp-result-reveal-teams">
                    {TEAM_FLAGS[selected.homeTeam]} {TEAM_NAMES[selected.homeTeam]} vs {TEAM_NAMES[selected.awayTeam]} {TEAM_FLAGS[selected.awayTeam]}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — leaderboard + rules */}
        <div className="mp-sidebar">
          <div className="mp-card">
            <h2 className="mp-sidebar-title">LEADERBOARD</h2>
            <div className="mp-sidebar-sub">Top tournament predictors</div>

            {leaderboard.length === 0 ? (
              <div className="mp-leaderboard-empty">
                No predictions scored yet. Be the first to predict correctly!
              </div>
            ) : (
              <div className="mp-leaderboard-list">
                {leaderboard.slice(0, 10).map((entry, i) => {
                  let rankClass = "mp-rank-badge";
                  if (i === 0) rankClass += " rank-gold";
                  else if (i === 1) rankClass += " rank-silver";
                  else if (i === 2) rankClass += " rank-bronze";
                  
                  return (
                    <div key={entry.userId} className={`mp-leader-row ${entry.userId === user?.userId ? 'current-user' : ''}`}>
                      <div className={rankClass}>#{i + 1}</div>
                      <div className="mp-leader-name">{entry.nickname}</div>
                      <div className="mp-leader-pts">{entry.xp} XP</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rules */}
          <div className="mp-card mp-rules-card">
            <h2 className="mp-sidebar-title">SCORING RULES</h2>
            <div className="mp-rules-list">
              {[
                { rule: 'Match result correct', pts: '+30 XP' },
                { rule: 'Top scorer correct',   pts: '+20 XP' },
                { rule: 'Exact score correct',  pts: '+50 XP' },
                { rule: 'All 3 correct bonus',  pts: '+50 XP' },
                { rule: 'Max per match',        pts: '150 XP' },
              ].map(r => (
                <div key={r.rule} className="mp-rule-row">
                  <span className="mp-rule-text">{r.rule}</span>
                  <span className="mp-rule-pts-val">{r.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@0,9..40,400;0,9..40,700;0,9..40,900&display=swap');

.mp-page {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 16px 80px;
  font-family: 'DM Sans', sans-serif;
  color: #F0F0F0;
  box-sizing: border-box;
}

.mp-page-loading {
  padding: 80px 32px;
  text-align: center;
  color: rgba(242, 242, 244, 0.28);
  font-family: 'DM Sans', sans-serif;
  font-size: 1.1rem;
}

.mp-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% -10%, rgba(168, 85, 247, 0.1) 0%, transparent 60%), #05070f;
}

.mp-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.03;
  background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Header */
.mp-header {
  margin-bottom: 24px;
}

.mp-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.8rem;
  letter-spacing: 2px;
  line-height: 1;
  margin: 0 0 6px 0;
  background: linear-gradient(135deg, #A855F7, #F7C344);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mp-subtitle {
  color: rgba(240,240,240,0.45);
  font-size: 0.9rem;
  margin: 0;
}

/* Scoring rules summary */
.mp-rules-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.mp-rule-card {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: rgba(168, 85, 247, 0.04);
  border: 1px solid rgba(168, 85, 247, 0.15);
  border-radius: 12px;
}

.mp-rule-pts {
  font-size: 1.1rem;
  font-weight: 800;
  color: #A855F7;
  font-family: 'Space Mono', monospace;
}

.mp-rule-label {
  font-size: 0.72rem;
  color: rgba(242, 242, 244, 0.4);
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Layout */
.mp-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  align-items: start;
}

@media (max-width: 768px) {
  .mp-layout {
    grid-template-columns: 1fr;
  }
}

.mp-main-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Fixture Tab selector */
.mp-fixture-tabs {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
}

.mp-fixture-tab {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.22s ease;
  min-width: 120px;
  flex-shrink: 0;
}

.mp-fixture-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.mp-fixture-tab.active {
  border-color: #3DD68C;
  background: rgba(61, 214, 140, 0.06);
  box-shadow: 0 0 12px rgba(61, 214, 140, 0.15);
}

.mp-fixture-tab-teams {
  font-size: 0.95rem;
  font-weight: 700;
}

.mp-fixture-tab-stage {
  font-size: 0.7rem;
  color: rgba(242, 242, 244, 0.3);
  margin-top: 4px;
}

/* Cards */
.mp-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
}

.mp-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent 60%); pointer-events: none;
  border-radius: 18px;
}

/* Stadium Scoreboard */
.mp-scoreboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 20px 16px;
}

.mp-team {
  flex: 1;
  text-align: center;
}

.mp-team-flag-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
}

.mp-team-flag {
  font-size: 2rem;
}

.mp-team-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
  color: #F2F2F4;
  letter-spacing: 0.5px;
}

.mp-team-role {
  font-size: 0.72rem;
  color: rgba(242, 242, 244, 0.3);
  margin-top: 3px;
  text-transform: uppercase;
}

.mp-vs-box {
  text-align: center;
  padding: 0 10px;
}

.mp-vs-display {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  color: rgba(242, 242, 244, 0.2);
  letter-spacing: 2px;
}

.mp-score-display {
  font-family: 'Space Mono', monospace;
  font-size: 2.2rem;
  font-weight: 900;
  color: #F7C344;
  text-shadow: 0 0 12px rgba(247, 195, 68, 0.4);
}

.mp-stage-badge {
  font-size: 0.68rem;
  color: rgba(242, 242, 244, 0.35);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-block;
  white-space: nowrap;
}

/* Status Pill */
.mp-status-pill {
  text-align: center;
  padding: 6px 12px;
  margin-bottom: 20px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pill-live {
  background: rgba(232, 64, 64, 0.08);
  border: 1px solid rgba(232, 64, 64, 0.35);
  color: #E84040;
  box-shadow: 0 0 12px rgba(232, 64, 64, 0.15);
}

.pill-complete {
  background: rgba(61, 214, 140, 0.08);
  border: 1px solid rgba(61, 214, 140, 0.35);
  color: #3DD68C;
}

/* Prediction Form Sections */
.mp-form-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.mp-form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 16px;
}

.mp-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  font-weight: 800;
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mp-pts-badge {
  font-size: 0.68rem;
  font-weight: 800;
  color: #3DD68C;
  background: rgba(61, 214, 140, 0.12);
  border: 1px solid rgba(61, 214, 140, 0.25);
  border-radius: 6px;
  padding: 2px 8px;
  font-family: 'Space Mono', monospace;
}

/* Pick Winner buttons */
.mp-pick-grid {
  display: flex;
  gap: 10px;
}

.mp-pick-btn {
  flex: 1;
  padding: 18px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1);
  color: #F2F2F4;
}

.mp-pick-btn:not(:disabled):hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}

.mp-pick-btn.selected {
  border-color: #3DD68C;
  background: rgba(61, 214, 140, 0.08);
  box-shadow: 0 4px 16px rgba(61, 214, 140, 0.15);
}

.mp-pick-btn.locked-out {
  opacity: 0.35;
  transform: none !important;
}

.mp-pick-flag {
  font-size: 1.8rem;
}

.mp-draw-badge {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: rgba(242, 242, 244, 0.6);
}

.mp-pick-label {
  font-size: 0.78rem;
  font-weight: 800;
  text-align: center;
  line-height: 1.2;
}

/* Dropdown select */
.mp-select-container {
  position: relative;
}

.mp-select {
  width: 100%;
  padding: 14px;
  background: #0c0f1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #F2F2F4;
  font-size: 0.88rem;
  outline: none;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  transition: all 0.22s;
}

.mp-select:focus {
  border-color: #A855F7;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.15);
}

.mp-select:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Submit prediction button */
.mp-submit-btn {
  width: 100%;
  padding: 16px;
  background: #F7C344;
  color: #060810;
  border: none;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 900;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  letter-spacing: 1px;
  transition: all 0.22s;
  box-shadow: 0 4px 16px rgba(247, 195, 68, 0.25);
}

.mp-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  background: #ffd05c;
  box-shadow: 0 6px 20px rgba(247, 195, 68, 0.35);
}

.mp-submit-btn:disabled {
  opacity: 0.4;
  cursor: default;
  box-shadow: none;
}

.mp-submitted-banner {
  padding: 14px 18px;
  border-radius: 12px;
  margin-top: 8px;
  background: rgba(61, 214, 140, 0.08);
  border: 1px solid rgba(61, 214, 140, 0.25);
  color: #3DD68C;
  font-weight: 800;
  font-size: 0.82rem;
  text-align: center;
}

.mp-xp-award-badge {
  margin-top: 12px;
  padding: 10px;
  background: rgba(61, 214, 140, 0.06);
  border: 1px solid rgba(61, 214, 140, 0.22);
  border-radius: 30px;
  color: #3DD68C;
  font-weight: 900;
  font-size: 0.8rem;
  font-family: 'Space Mono', monospace;
  text-align: center;
  letter-spacing: 0.5px;
}

/* Complete result card */
.mp-result-reveal {
  margin-top: 20px;
  padding: 20px;
  text-align: center;
  background: rgba(247, 195, 68, 0.04);
  border: 1px solid rgba(247, 195, 68, 0.2);
  border-radius: 14px;
}

.mp-result-reveal-title {
  font-size: 0.72rem;
  color: rgba(242, 242, 244, 0.4);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 8px;
}

.mp-result-reveal-score {
  font-family: 'Space Mono', monospace;
  font-size: 2.2rem;
  font-weight: 900;
  color: #F7C344;
  margin-bottom: 6px;
}

.mp-result-reveal-teams {
  font-size: 0.82rem;
  color: rgba(242, 242, 244, 0.5);
}

/* Sidebar Leaderboard */
.mp-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.mp-sidebar-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.6rem;
  letter-spacing: 1.5px;
  margin: 0 0 4px 0;
  color: #F2F2F4;
}

.mp-sidebar-sub {
  font-size: 0.75rem;
  color: rgba(242, 242, 244, 0.35);
  margin-bottom: 16px;
  text-transform: uppercase;
}

.mp-leaderboard-empty {
  color: rgba(242, 242, 244, 0.3);
  font-size: 0.8rem;
  text-align: center;
  padding: 24px 0;
}

.mp-leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mp-leader-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.2s;
}

.mp-leader-row.current-user {
  border-color: rgba(61, 214, 140, 0.3);
  background: rgba(61, 214, 140, 0.04);
}

/* Leader positions / custom medal stickers */
.mp-rank-badge {
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  font-weight: 900;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(242, 242, 244, 0.4);
}

.mp-rank-badge.rank-gold {
  background: #F7C344;
  color: #060810;
  box-shadow: 0 0 10px rgba(247, 195, 68, 0.3);
}

.mp-rank-badge.rank-silver {
  background: #E5E7EB;
  color: #060810;
}

.mp-rank-badge.rank-bronze {
  background: #CD7F32;
  color: #FFF;
}

.mp-leader-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 700;
}

.mp-leader-pts {
  font-family: 'Space Mono', monospace;
  font-size: 0.85rem;
  font-weight: 800;
  color: #4F8EF7;
}

/* Sidebar Rules */
.mp-rules-card {
  background: rgba(255, 255, 255, 0.02);
}

.mp-rules-list {
  display: flex;
  flex-direction: column;
}

.mp-rule-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.mp-rule-row:last-of-type {
  border-bottom: none;
}

.mp-rule-text {
  color: rgba(242, 242, 244, 0.5);
  font-size: 0.82rem;
}

.mp-rule-pts-val {
  color: #3DD68C;
  font-weight: 800;
  font-size: 0.82rem;
  font-family: 'Space Mono', monospace;
}

/* Insights unlock styling */
.mp-insights-wrapper {
  margin-top: 14px;
}

.mp-insights-unlocked {
  background: rgba(168, 85, 247, 0.04);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 12px;
  padding: 14px;
}

.mp-insights-header {
  font-family: 'Space Mono', monospace;
  font-size: 0.72rem;
  font-weight: 900;
  color: #F7C344;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.mp-bar-chart {
  display: flex;
  gap: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #FFF;
}

.mp-chart-bar {
  padding: 8px;
  border-radius: 8px;
  text-align: center;
  box-sizing: border-box;
}

.bar-home {
  background: rgba(61, 214, 140, 0.15);
  border: 1px solid rgba(61, 214, 140, 0.25);
  color: #3DD68C;
}

.bar-draw {
  background: rgba(79, 142, 247, 0.15);
  border: 1px solid rgba(79, 142, 247, 0.25);
  color: #4F8EF7;
}

.bar-away {
  background: rgba(232, 64, 64, 0.15);
  border: 1px solid rgba(232, 64, 64, 0.25);
  color: #E84040;
}

.mp-insights-btn {
  background: rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 12px;
  color: #F7C344;
  padding: 12px;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
  font-family: 'Space Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s;
}

.mp-insights-btn:hover:not(:disabled) {
  background: rgba(168, 85, 247, 0.12);
  border-color: rgba(168, 85, 247, 0.5);
  transform: translateY(-1px);
}

.mp-insights-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.mp-btn-sticker {
  background: #A855F7;
  color: #FFF;
  font-size: 0.62rem;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}
`;