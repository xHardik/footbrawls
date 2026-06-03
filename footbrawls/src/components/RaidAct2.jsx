// src/components/RaidAct2.jsx
// Wraps DribbleGauntlet — best of 5 rounds + bot buddy/rival scores

import { useState } from 'react';
import DribbleGauntlet from '../pages/games/DribbleGauntlet';
import { simulateBotAct2Scores, determineActWinner, sumAct2Duo } from '../lib/raidEngine';

const C = {
  bg:      "#060810",
  surface: "rgba(255,255,255,0.04)",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#F7C344",
  green:   "#3DD68C",
  red:     "#E84040",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
};

export default function RaidAct2({ raidSeed, onComplete }) {
  const [phase, setPhase]       = useState('play');
  const [playerWins, setPlayerWins] = useState(0);
  const botScores = simulateBotAct2Scores(raidSeed);

  function handleGauntletDone({ playerRoundWins }) {
    setPlayerWins(playerRoundWins);
    setPhase('summary');

    const rivalPlayerWins = Math.min(5, Math.max(0, 5 - playerRoundWins));
    const yourTotal       = sumAct2Duo(playerRoundWins, botScores.buddyWins);
    const rivalTotal      = sumAct2Duo(rivalPlayerWins, botScores.rivalWins);
    const winner          = determineActWinner(yourTotal, rivalTotal);

    setTimeout(() => {
      onComplete?.({
        playerRoundWins,
        buddyRoundWins: botScores.buddyWins,
        rivalRoundWins: rivalPlayerWins,
        rivalBotWins:   botScores.rivalWins,
        yourTotal,
        rivalTotal,
        winner,
      });
    }, 1500);
  }

  if (phase === 'summary') {
    const rivalPlayerWins = Math.min(5, Math.max(0, 5 - playerWins));
    const yourTotal       = sumAct2Duo(playerWins, botScores.buddyWins);
    const rivalTotal      = sumAct2Duo(rivalPlayerWins, botScores.rivalWins);
    const winner          = determineActWinner(yourTotal, rivalTotal);

    return (
      <div style={s.wrap}>
        <div style={s.header}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <div>
            <div style={s.actLabel}>Act 2 — Dribble Gauntlet</div>
            <div style={s.gameName}>Best of 5</div>
          </div>
        </div>
        <div style={s.summary}>
          <div style={s.row}>
            <span>Your rounds</span>
            <strong style={{ color: C.green }}>{playerWins}</strong>
          </div>
          <div style={s.row}>
            <span>Buddy bot</span>
            <strong>{botScores.buddyWins}</strong>
          </div>
          <div style={{ ...s.row, borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 8 }}>
            <span>Duo total</span>
            <strong style={{ color: C.accent, fontSize: '1.4rem' }}>{yourTotal}</strong>
          </div>
          <div style={{ ...s.verdict, color: winner === 'you' ? C.green : winner === 'rival' ? C.red : C.muted }}>
            {winner === 'you' ? '✓ Act 2 Won' : winner === 'rival' ? '✗ Act 2 Lost' : '— Draw'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={{ fontSize: 28 }}>⚡</span>
        <div>
          <div style={s.actLabel}>Act 2 — Dribble Gauntlet</div>
          <div style={s.gameName}>Beat L/C/R · 6-zone finish</div>
        </div>
      </div>
      <DribbleGauntlet raidMode roundsTotal={5} seed={raidSeed} onComplete={handleGauntletDone} />
    </div>
  );
}

const s = {
  wrap:     { color: C.text },
  header:   { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  actLabel: { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: 2, color: C.muted, textTransform: 'uppercase' },
  gameName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: 1.5 },
  summary:  { padding: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 },
  row:      { display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', color: C.muted },
  verdict:  { textAlign: 'center', marginTop: 16, fontWeight: 800, fontSize: '1.1rem', letterSpacing: 1 },
};
