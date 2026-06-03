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

  if (done) {
    return (
      <div style={s.wrap}>
        <div style={s.doneBox}>
          <div style={s.doneTitle}>{playerWins >= winsNeeded ? '🏆 Act Won!' : 'Act Lost'}</div>
          <div style={s.doneScore}>{playerWins} / {roundsTotal} rounds</div>
          {!raidMode && (
            <p style={s.muted}>Used in Challenge Raids — Act 2</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.title}>Dribble Gauntlet {raidMode ? '' : '⚡'}</h2>
        <p style={s.sub}>Round {round + 1}/{roundsTotal} · Wins: {playerWins}</p>
      </div>

      <div style={s.progressRow}>
        {Array.from({ length: roundsTotal }).map((_, i) => (
          <div key={i} style={{
            ...s.dot,
            background: roundLog[i] ? (roundLog[i].won ? C.green : C.red) : i === round ? C.accent : C.surface2,
          }} />
        ))}
      </div>

      {phase === 'dribble' && (
        <>
          <p style={s.instruction}>Beat the defender — pick a lane</p>
          <div style={s.defRow}>
            {DRIBBLE_DEFENDERS.map(d => (
              <button key={d.id} type="button" style={{
                ...s.defBtn,
                borderColor: dribblePick === d.id ? C.green : C.border,
                background:  dribblePick === d.id ? `${C.green}1F` : C.surface,
              }} onClick={() => tryDribble(d.id)}>
                <span style={{ fontSize: 28 }}>{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'shoot' && (
        <>
          <p style={s.instruction}>Past the defender! Pick your shot</p>
          <div style={s.shotGrid}>
            {DRIBBLE_SHOT_ZONES.map(z => (
              <button key={z.id} type="button" style={{
                ...s.shotZone,
                borderColor: shotPick === z.id ? C.green : C.border,
                background:  shotPick === z.id ? `${C.green}26` : C.surface,
              }} onClick={() => takeShot(z.id)}>
                {z.label}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'result' && feedback && (
        <div style={{
          ...s.feedback,
          color: feedback.includes('GOAL') ? C.green : C.red,
          borderColor: feedback.includes('GOAL') ? `${C.green}66` : `${C.red}66`,
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:        { color: C.text, fontFamily: "'Syne', sans-serif" },
  header:      { marginBottom: 16 },
  title:       { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: 2, margin: 0 },
  sub:         { fontSize: '0.75rem', color: C.muted, margin: '4px 0 0' },
  progressRow: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 },
  dot:         { width: 12, height: 12, borderRadius: '50%', transition: 'background 0.3s' },
  instruction: { textAlign: 'center', fontSize: '0.72rem', color: C.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 },
  defRow:      { display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 },
  defBtn:      { flex: 1, maxWidth: 110, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: '1px solid', borderRadius: 14, cursor: 'pointer', color: C.text, fontSize: '0.75rem', fontWeight: 700 },
  shotGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, maxWidth: 320, margin: '0 auto' },
  shotZone:    { padding: '20px 8px', border: '1px solid', borderRadius: 10, cursor: 'pointer', color: C.muted, fontSize: '0.7rem', fontWeight: 700 },
  feedback:    { marginTop: 16, padding: '12px 16px', borderRadius: 12, border: '1px solid', textAlign: 'center', fontWeight: 800, fontSize: '1rem' },
  doneBox:     { textAlign: 'center', padding: 24, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 },
  doneTitle:   { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: 2, marginBottom: 8 },
  doneScore:   { fontSize: '2rem', fontWeight: 800, color: C.green },
  muted:       { fontSize: '0.75rem', color: C.muted, marginTop: 12 },
};
