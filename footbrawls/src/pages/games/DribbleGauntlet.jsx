// src/pages/games/DribbleGauntlet.jsx
// Dribble past L/C/R defender, then pick a 6-zone shot.

import { useState, useCallback } from 'react';
import { DRIBBLE_DEFENDERS, DRIBBLE_SHOT_ZONES, R } from '../../lib/raidConstants';
import { seededRandom } from '../../lib/dailySeed';

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
            background: roundLog[i] ? (roundLog[i].won ? R.green : R.red) : i === round ? R.accent : '#222',
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
                borderColor: dribblePick === d.id ? R.green : R.border,
                background:  dribblePick === d.id ? 'rgba(61,214,140,0.12)' : R.surface,
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
                borderColor: shotPick === z.id ? R.green : 'rgba(255,255,255,0.08)',
                background:  shotPick === z.id ? 'rgba(61,214,140,0.15)' : 'rgba(255,255,255,0.02)',
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
          color: feedback.includes('GOAL') ? R.green : R.red,
          borderColor: feedback.includes('GOAL') ? `${R.green}66` : `${R.red}66`,
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:        { color: R.text, fontFamily: "'Syne', sans-serif" },
  header:      { marginBottom: 16 },
  title:       { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: 2, margin: 0 },
  sub:         { fontSize: '0.75rem', color: R.muted, margin: '4px 0 0' },
  progressRow: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 },
  dot:         { width: 12, height: 12, borderRadius: '50%', transition: 'background 0.3s' },
  instruction: { textAlign: 'center', fontSize: '0.72rem', color: R.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 },
  defRow:      { display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 },
  defBtn:      { flex: 1, maxWidth: 110, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: '1px solid', borderRadius: 14, cursor: 'pointer', color: R.text, fontSize: '0.75rem', fontWeight: 700 },
  shotGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, maxWidth: 320, margin: '0 auto' },
  shotZone:    { padding: '20px 8px', border: '1px solid', borderRadius: 10, cursor: 'pointer', color: R.muted, fontSize: '0.7rem', fontWeight: 700 },
  feedback:    { marginTop: 16, padding: '12px 16px', borderRadius: 12, border: '1px solid', textAlign: 'center', fontWeight: 800, fontSize: '1rem' },
  doneBox:     { textAlign: 'center', padding: 24, background: R.surface, border: `1px solid ${R.border}`, borderRadius: 16 },
  doneTitle:   { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: 2, marginBottom: 8 },
  doneScore:   { fontSize: '2rem', fontWeight: 800, color: R.green },
  muted:       { fontSize: '0.75rem', color: R.muted, marginTop: 12 },
};
