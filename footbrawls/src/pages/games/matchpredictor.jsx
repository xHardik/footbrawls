// src/pages/games/MatchPredictor.jsx
// WC 2026 Match Predictor — predict winner, top scorer, and match result
// Converted from Crickingo IPL Match Predictor
// Reads live fixture data from Firestore (written by match-poller cron)

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, orderBy, limit } from 'firebase/firestore';
import { getUser } from '../../lib/user';
import { awardXP } from '../../lib/xpEngine';

// ─── WC 2026 Teams ────────────────────────────────────────────────────────────
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

// ─── Demo fixtures for when no live data available ────────────────────────────
const DEMO_FIXTURES = [
  {
    id: 'demo-1',
    homeTeam: 'ARG', awayTeam: 'FRA',
    stage: 'Group Stage', kickoffAt: new Date(),
    isLive: false, isComplete: false,
    homeScore: null, awayScore: null,
  }
];

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

  // ── Load fixtures from Firestore ──
  useEffect(() => {
    async function loadFixtures() {
      try {
        const today = getTodayKey();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

        const q = query(
          collection(db, 'fixtures'),
          where('isComplete', '==', false),
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

  // ── Load saved prediction for selected fixture ──
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
      const res = await awardXP(user.userId, 'prediction_result', { rawXP: 10 });
      setXpAwarded(res?.xpAwarded || 10);
    } catch (err) {
      console.error('Failed to submit prediction:', err);
      alert('Failed to save prediction. Please try again.');
    }
  }

  const homePlayers = selected ? (TEAM_PLAYERS[selected.homeTeam] || []) : [];
  const awayPlayers = selected ? (TEAM_PLAYERS[selected.awayTeam] || []) : [];
  const allPlayers  = [...homePlayers, ...awayPlayers];

  const isLocked = submitted || selected?.isLive || selected?.isComplete;

  if (loading) return <div style={s.loading}>Loading fixtures...</div>;

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Match Predictor 🎯</h1>
        <p style={s.subtitle}>Predict WC 2026 results · Up to 100 XP per match</p>
      </div>

      {/* Scoring rules */}
      <div style={s.rulesRow}>
        {[
          { label: 'Correct Result', pts: '+30 XP' },
          { label: 'Correct Scorer', pts: '+20 XP' },
          { label: 'Exact Score',    pts: '+50 XP' },
        ].map(r => (
          <div key={r.label} style={s.ruleCard}>
            <div style={s.rulePts}>{r.pts}</div>
            <div style={s.ruleLabel}>{r.label}</div>
          </div>
        ))}
      </div>

      <div style={s.layout}>

        {/* Left — prediction form */}
        <div>
          {/* Fixture selector */}
          {fixtures.length > 1 && (
            <div style={s.fixtureTabs}>
              {fixtures.map(f => (
                <div
                  key={f.id}
                  style={{
                    ...s.fixtureTab,
                    borderColor: selected?.id === f.id ? '#00ff87' : '#1a1a1a',
                    background: selected?.id === f.id ? 'rgba(0,255,135,0.06)' : 'rgba(255,255,255,0.02)',
                  }}
                  onClick={() => setSelected(f)}
                >
                  <div style={s.fixtureTabTeams}>
                    {TEAM_FLAGS[f.homeTeam]} vs {TEAM_FLAGS[f.awayTeam]}
                  </div>
                  <div style={s.fixtureTabStage}>{f.stage}</div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div style={s.card}>

              {/* Teams */}
              <div style={s.teamsRow}>
                <div style={s.team}>
                  <div style={s.teamFlag}>{TEAM_FLAGS[selected.homeTeam] || '🏳️'}</div>
                  <div style={s.teamName}>{TEAM_NAMES[selected.homeTeam] || selected.homeTeam}</div>
                  <div style={s.teamLabel}>Home</div>
                </div>
                <div style={s.vsBox}>
                  {selected.isComplete ? (
                    <div style={s.score}>
                      {selected.homeScore} - {selected.awayScore}
                    </div>
                  ) : (
                    <div style={s.vs}>VS</div>
                  )}
                  <div style={s.stage}>{selected.stage}</div>
                </div>
                <div style={s.team}>
                  <div style={s.teamFlag}>{TEAM_FLAGS[selected.awayTeam] || '🏳️'}</div>
                  <div style={s.teamName}>{TEAM_NAMES[selected.awayTeam] || selected.awayTeam}</div>
                  <div style={s.teamLabel}>Away</div>
                </div>
              </div>

              {selected.isLive && (
                <div style={s.liveBadge}>🔴 LIVE</div>
              )}
              {selected.isComplete && (
                <div style={s.completeBadge}>✅ Match Complete</div>
              )}

              {/* Section 1 — Result */}
              <div style={s.section}>
                <div style={s.sectionTitle}>
                  Who wins? <span style={s.pts}>+30 XP</span>
                </div>
                <div style={s.pickGrid}>
                  {[
                    { value: 'home', label: TEAM_NAMES[selected.homeTeam] || selected.homeTeam, flag: TEAM_FLAGS[selected.homeTeam] },
                    { value: 'draw', label: 'Draw',                                               flag: '🤝' },
                    { value: 'away', label: TEAM_NAMES[selected.awayTeam] || selected.awayTeam, flag: TEAM_FLAGS[selected.awayTeam] },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      style={{
                        ...s.pickBtn,
                        borderColor: pickedWinner === opt.value ? '#00ff87' : '#1a1a1a',
                        background: pickedWinner === opt.value ? 'rgba(0,255,135,0.1)' : 'rgba(255,255,255,0.02)',
                        opacity: isLocked && pickedWinner !== opt.value ? 0.4 : 1,
                      }}
                      onClick={() => !isLocked && setPickedWinner(opt.value)}
                      disabled={isLocked}
                    >
                      <span style={{ fontSize: 22 }}>{opt.flag}</span>
                      <span style={s.pickLabel}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2 — Top Scorer */}
              <div style={s.section}>
                <div style={s.sectionTitle}>
                  Top Scorer? <span style={s.pts}>+20 XP</span>
                </div>
                <select
                  style={s.select}
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

              {/* Submit */}
              {!submitted ? (
                <button
                  style={{
                    ...s.submitBtn,
                    opacity: (pickedWinner && pickedScorer) ? 1 : 0.4,
                  }}
                  disabled={!pickedWinner || !pickedScorer}
                  onClick={submitPrediction}
                >
                  🔒 Lock In Prediction
                </button>
              ) : (
                <div style={s.submittedBanner}>
                  {selected.isComplete
                    ? '✅ Match complete — check your score below'
                    : '🔒 Prediction locked in! Come back after the match'}
                </div>
              )}

              {xpAwarded != null && (
                <div style={s.xpBadge}>+{xpAwarded} XP added to your guild!</div>
              )}

              {/* Result reveal if match complete */}
              {selected.isComplete && predictions[selected.id] && (
                <div style={s.resultCard}>
                  <div style={s.resultTitle}>Match Result</div>
                  <div style={s.resultScore}>
                    {selected.homeScore} - {selected.awayScore}
                  </div>
                  <div style={s.resultTeams}>
                    {TEAM_FLAGS[selected.homeTeam]} {TEAM_NAMES[selected.homeTeam]} vs {TEAM_NAMES[selected.awayTeam]} {TEAM_FLAGS[selected.awayTeam]}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — leaderboard + rules */}
        <div>
          <div style={s.card}>
            <div style={s.leaderTitle}>🏆 Guild Leaderboard</div>
            <div style={s.leaderSub}>Top predictors this tournament</div>

            {leaderboard.length === 0 ? (
              <div style={s.leaderEmpty}>
                No predictions scored yet. Be the first to predict correctly!
              </div>
            ) : (
              leaderboard.slice(0, 10).map((entry, i) => (
                <div key={entry.userId} style={{
                  ...s.leaderRow,
                  borderColor: entry.userId === user?.userId ? 'rgba(0,255,135,0.3)' : '#1a1a1a',
                  background: entry.userId === user?.userId ? 'rgba(0,255,135,0.04)' : 'transparent',
                }}>
                  <div style={s.leaderPos}>#{i + 1}</div>
                  <div style={s.leaderName}>{entry.nickname}</div>
                  <div style={s.leaderPts}>{entry.xp} XP</div>
                </div>
              ))
            )}
          </div>

          {/* Rules */}
          <div style={{ ...s.card, marginTop: 16 }}>
            <div style={s.leaderTitle}>📋 Scoring Rules</div>
            {[
              { rule: 'Match result correct', pts: '+30 XP' },
              { rule: 'Top scorer correct',   pts: '+20 XP' },
              { rule: 'Exact score correct',  pts: '+50 XP' },
              { rule: 'All 3 correct bonus',  pts: '+50 XP' },
              { rule: 'Max per match',        pts: '150 XP' },
            ].map(r => (
              <div key={r.rule} style={s.ruleRow}>
                <span style={{ color: '#888', fontSize: 13 }}>{r.rule}</span>
                <span style={{ color: '#00ff87', fontWeight: 700, fontSize: 13 }}>{r.pts}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: "'Segoe UI', sans-serif",
    padding: '20px 20px 60px',
  },
  loading: { color: '#888', padding: 40, textAlign: 'center' },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 800, margin: 0 },
  subtitle: { fontSize: 13, color: '#888', margin: '4px 0 0' },
  rulesRow: { display: 'flex', gap: 10, marginBottom: 20 },
  ruleCard: {
    flex: 1, padding: '12px', textAlign: 'center',
    background: 'rgba(0,255,135,0.04)',
    border: '1px solid rgba(0,255,135,0.15)',
    borderRadius: 12,
  },
  rulePts:   { fontSize: 16, fontWeight: 800, color: '#00ff87' },
  ruleLabel: { fontSize: 11, color: '#555', marginTop: 3 },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) 300px',
    gap: 20, alignItems: 'start',
  },
  fixtureTabs: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  fixtureTab: {
    padding: '10px 14px', border: '1px solid',
    borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
  },
  fixtureTabTeams: { fontSize: 16, fontWeight: 700 },
  fixtureTabStage: { fontSize: 11, color: '#555', marginTop: 2 },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid #1a1a1a',
    borderRadius: 20, padding: 24,
    marginBottom: 0,
  },
  teamsRow: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
    marginBottom: 20,
  },
  team: { flex: 1, textAlign: 'center' },
  teamFlag: { fontSize: 44, marginBottom: 8 },
  teamName: { fontSize: 15, fontWeight: 800, lineHeight: 1.2 },
  teamLabel: { fontSize: 11, color: '#555', marginTop: 3 },
  vsBox: { textAlign: 'center', padding: '0 8px' },
  vs: { fontSize: 20, fontWeight: 800, color: '#333', letterSpacing: 2 },
  score: { fontSize: 28, fontWeight: 800, color: '#f7c344' },
  stage: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  liveBadge: {
    textAlign: 'center', padding: '6px', marginBottom: 16,
    background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)',
    borderRadius: 8, color: '#ff4444', fontWeight: 700, fontSize: 13,
  },
  completeBadge: {
    textAlign: 'center', padding: '6px', marginBottom: 16,
    background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)',
    borderRadius: 8, color: '#00ff87', fontWeight: 700, fontSize: 13,
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 800, marginBottom: 10 },
  pts: {
    display: 'inline-block', marginLeft: 8,
    fontSize: 11, fontWeight: 800, color: '#00ff87',
    background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)',
    borderRadius: 100, padding: '2px 8px',
  },
  pickGrid: { display: 'flex', gap: 8 },
  pickBtn: {
    flex: 1, padding: '14px 8px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6,
    border: '2px solid', borderRadius: 14,
    cursor: 'pointer', transition: 'all 0.2s',
    background: 'transparent',
  },
  pickLabel: { fontSize: 12, fontWeight: 700, color: '#ccc', textAlign: 'center' },
  select: {
    width: '100%', padding: '13px 14px',
    background: '#111', border: '1px solid #222',
    borderRadius: 12, color: '#fff',
    fontSize: 14, outline: 'none',
  },
  submitBtn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #f7c344, #e6a800)',
    color: '#000', border: 'none', borderRadius: 14,
    fontSize: 15, fontWeight: 900, cursor: 'pointer',
    transition: 'all 0.2s', marginTop: 4,
  },
  submittedBanner: {
    padding: '13px 16px', borderRadius: 12, marginTop: 8,
    background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)',
    color: '#00ff87', fontWeight: 700, fontSize: 13, textAlign: 'center',
  },
  xpBadge: {
    marginTop: 10, padding: '8px 16px',
    background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.3)',
    borderRadius: 100, color: '#00ff87', fontWeight: 700,
    fontSize: 13, textAlign: 'center',
  },
  resultCard: {
    marginTop: 16, padding: 20, textAlign: 'center',
    background: 'rgba(247,195,68,0.06)', border: '1px solid rgba(247,195,68,0.2)',
    borderRadius: 14,
  },
  resultTitle: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  resultScore: { fontSize: 36, fontWeight: 800, color: '#f7c344', marginBottom: 6 },
  resultTeams: { fontSize: 13, color: '#888' },
  leaderTitle: { fontSize: 16, fontWeight: 800, marginBottom: 4 },
  leaderSub:   { fontSize: 12, color: '#555', marginBottom: 14 },
  leaderEmpty: { color: '#555', fontSize: 13, textAlign: 'center', padding: '20px 0' },
  leaderRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 10,
    border: '1px solid', marginBottom: 6,
    transition: 'all 0.2s',
  },
  leaderPos:  { fontSize: 14, fontWeight: 800, color: '#555', width: 28 },
  leaderName: { flex: 1, fontSize: 13, fontWeight: 700 },
  leaderPts:  { fontSize: 14, fontWeight: 800, color: '#4F8EF7' },
  ruleRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '8px 0', borderBottom: '1px solid #1a1a1a',
  },
};