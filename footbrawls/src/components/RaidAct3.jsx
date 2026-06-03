// src/components/RaidAct3.jsx
// 9-zone penalty shootout — striker phase then GK phase

import { useState } from 'react';
import { PENALTY_ZONES } from '../lib/raidConstants';
import { seededRandom } from '../lib/dailySeed';
import { simulateBotAct3Scores, determineActWinner, sumAct3Duo } from '../lib/raidEngine';
import { R } from '../lib/raidConstants';

const KICKS = 5;

function botPickZone(seed, kickIdx, role) {
  const r = seededRandom(seed, kickIdx * 23 + (role === 'gk' ? 100 : 0));
  return PENALTY_ZONES[Math.floor(r * PENALTY_ZONES.length)].id;
}

export default function RaidAct3({ raidSeed, onComplete }) {
  const [phase, setPhase]         = useState('striker');
  const [kickIdx, setKickIdx]     = useState(0);
  const [selected, setSelected]   = useState(null);
  const [playerGoals, setPlayerGoals] = useState(0);
  const [playerSaves, setPlayerSaves] = useState(0);
  const [log, setLog]             = useState([]);
  const [feedback, setFeedback]   = useState(null);
  const [done, setDone]           = useState(false);

  const botScores = simulateBotAct3Scores(raidSeed);

  function handleStrikerShot(zone) {
    if (phase !== 'striker' || done) return;
    setSelected(zone);
    const gkZone = botPickZone(raidSeed, kickIdx, 'gk');
    const goal   = zone !== gkZone;
    const entry  = { role: 'striker', zone, gkZone, goal };
    const goals  = goal ? playerGoals + 1 : playerGoals;
    setPlayerGoals(goals);
    setLog(l => [...l, entry]);
    setFeedback(goal ? '⚽ GOAL!' : '🧤 SAVED');

    setTimeout(() => {
      setFeedback(null);
      setSelected(null);
      const next = kickIdx + 1;
      if (next >= KICKS) {
        setKickIdx(0);
        setPhase('keeper');
      } else {
        setKickIdx(next);
      }
    }, 900);
  }

  function handleGkSave(zone) {
    if (phase !== 'keeper' || done) return;
    setSelected(zone);
    const shotZone = botPickZone(raidSeed, kickIdx, 'striker');
    const saved    = zone === shotZone;
    const entry    = { role: 'keeper', saveZone: zone, shotZone, saved };
    const saves    = saved ? playerSaves + 1 : playerSaves;
    setPlayerSaves(saves);
    setLog(l => [...l, entry]);
    setFeedback(saved ? '🧤 SAVE!' : '⚽ CONCEDED');

    setTimeout(() => {
      setFeedback(null);
      setSelected(null);
      const next = kickIdx + 1;
      if (next >= KICKS) {
        setDone(true);
        setPlayerSaves(saves);
        const finalGoals   = playerGoals;
        const finalSaves   = saves;
        const rivalScored  = KICKS - finalSaves;
        const yourTotal    = sumAct3Duo(finalGoals, botScores.buddyGoals);
        const rivalTotal   = sumAct3Duo(rivalScored, botScores.rivalGoals);
        const winner       = determineActWinner(yourTotal, rivalTotal);

        setTimeout(() => {
          onComplete?.({
            playerGoals:   finalGoals,
            playerSaves:   finalSaves,
            buddyGoals:    botScores.buddyGoals,
            rivalBotGoals: botScores.rivalGoals,
            yourTotal,
            rivalTotal,
            winner,
            log: [...log, entry],
          });
        }, 1200);
      } else {
        setKickIdx(next);
      }
    }, 900);
  }

  if (done) {
    const rivalConceded = KICKS - playerSaves;
    const yourTotal     = sumAct3Duo(playerGoals, botScores.buddyGoals);
    const rivalTotal    = sumAct3Duo(rivalConceded, botScores.rivalGoals);
    const winner        = determineActWinner(yourTotal, rivalTotal);

    return (
      <div style={s.wrap}>
        <div style={s.header}>
          <span style={{ fontSize: 28 }}>🧤</span>
          <div>
            <div style={s.actLabel}>Act 3 — Penalty Shootout</div>
            <div style={s.gameName}>9-Zone Battle</div>
          </div>
        </div>
        <div style={s.summary}>
          <div style={s.scoreLine}>
            <span>Your duo</span>
            <strong style={{ color: R.green, fontSize: '1.6rem' }}>{yourTotal}</strong>
          </div>
          <div style={s.scoreLine}>
            <span>Rival duo</span>
            <strong style={{ color: R.red, fontSize: '1.6rem' }}>{rivalTotal}</strong>
          </div>
          <div style={{ ...s.verdict, color: winner === 'you' ? R.green : winner === 'rival' ? R.red : R.muted }}>
            {winner === 'you' ? '✓ Act 3 Won' : winner === 'rival' ? '✗ Act 3 Lost' : '— Draw'}
          </div>
        </div>
      </div>
    );
  }

  const isStriker = phase === 'striker';

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={{ fontSize: 28 }}>{isStriker ? '⚽' : '🧤'}</span>
        <div>
          <div style={s.actLabel}>Act 3 — {isStriker ? 'Striker' : 'Goalkeeper'}</div>
          <div style={s.gameName}>Kick {kickIdx + 1} / {KICKS}</div>
        </div>
      </div>

      <div style={s.stats}>
        <span>Goals: {playerGoals}</span>
        <span>Saves: {playerSaves}</span>
      </div>

      <p style={s.instruction}>
        {isStriker ? 'Pick your shot zone' : 'Pick where to dive'}
      </p>

      <div style={s.grid}>
        {PENALTY_ZONES.map(z => (
          <button key={z.id} type="button" style={{
            ...s.zone,
            borderColor: selected === z.id ? R.green : 'rgba(255,255,255,0.08)',
            background:  selected === z.id ? 'rgba(61,214,140,0.12)' : 'rgba(255,255,255,0.02)',
          }} onClick={() => isStriker ? handleStrikerShot(z.id) : handleGkSave(z.id)}>
            {z.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div style={{
          ...s.feedback,
          color: feedback.includes('GOAL') || feedback.includes('CONCEDED') ? R.red : R.green,
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:        { color: R.text },
  header:      { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  actLabel:    { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: 2, color: R.muted, textTransform: 'uppercase' },
  gameName:    { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: 1.5 },
  stats:       { display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 16, fontSize: '0.8rem', color: R.muted },
  instruction: { textAlign: 'center', fontSize: '0.72rem', color: R.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxWidth: 340, margin: '0 auto' },
  zone:        { padding: '18px 6px', border: '1px solid', borderRadius: 8, cursor: 'pointer', color: R.muted, fontSize: '0.68rem', fontWeight: 700 },
  feedback:    { marginTop: 16, textAlign: 'center', fontWeight: 800, fontSize: '1rem' },
  summary:     { padding: 24, background: R.surface, border: `1px solid ${R.border}`, borderRadius: 16, textAlign: 'center' },
  scoreLine:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: '0.85rem', color: R.muted },
  verdict:     { marginTop: 16, fontWeight: 800, fontSize: '1.1rem', letterSpacing: 1 },
};
