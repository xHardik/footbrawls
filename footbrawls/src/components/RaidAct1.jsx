// src/components/RaidAct1.jsx
// Random solo-game mini UI — scores normalised via scoreNorm.js

import { useState, useMemo } from 'react';
import { normScore } from '../lib/scoreNorm';
import { seededRandom, getDailySeed } from '../lib/dailySeed';

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

const MINI_DATA = {
  whoAreYa: {
    prompt: 'Which country does this player represent?',
    player: 'M. Salah',
    options: ['🇪🇬 Egypt', '🇳🇬 Nigeria', '🇲🇦 Morocco', '🇸🇳 Senegal'],
    correct: 0,
  },
  wordle: {
    prompt: 'Guess today\'s mystery player',
    options: ['Haaland', 'Mbappé', 'Vinícius', 'Bellingham'],
    correct: 1,
  },
  higherLower: {
    prompt: 'Who has MORE international caps?',
    a: { name: 'Messi', caps: 189 },
    b: { name: 'Ronaldo', caps: 212 },
    higherIs: 'b',
  },
  transferTrail: {
    prompt: 'Shortest path: Neymar → Mbappé',
    options: ['Barcelona → PSG', 'Santos → Barcelona', 'PSG → Real Madrid'],
    correct: 0,
  },
  matchPredictor: {
    prompt: 'Predict the result',
    fixture: 'Brazil vs France',
    options: ['Brazil Win', 'Draw', 'France Win', 'Exact 2-1 Brazil'],
    xpMap: [30, 15, 30, 100],
    correct: 3,
  },
  penaltyNerve: {
    kicks: 3,
    zones: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'],
  },
};

function seededGkSave(seed, kickIdx, zoneIdx) {
  return seededRandom(seed, kickIdx * 11 + zoneIdx) < 0.38;
}

export default function RaidAct1({ game, raidSeed, onComplete }) {
  const gameId = game?.id || 'whoAreYa';
  const seed   = getDailySeed() + (raidSeed % 500);
  const mini   = MINI_DATA[gameId];

  const [hlChoice, setHlChoice]   = useState(null);
  const [penKicks, setPenKicks]   = useState([]);
  const [penPhase, setPenPhase]   = useState('aim');
  const [selected, setSelected]   = useState(null);
  const [done, setDone]           = useState(false);
  const [result, setResult]       = useState(null);

  const finish = (rawResult) => {
    const normalized = normScore(gameId, rawResult);
    setResult({ rawResult, normalized });
    setDone(true);
    setTimeout(() => onComplete?.({ gameId, result: rawResult, normalized }), 800);
  };

  const handlePick = (idx, solvedField = 'solved') => {
    if (done) return;
    const solved = idx === mini.correct;
    if (gameId === 'whoAreYa') finish({ guessNumber: solved ? 2 : 6, solved });
    else if (gameId === 'wordle') finish({ guessNumber: solved ? 2 : 6, solved });
    else if (gameId === 'transferTrail') finish({ stepsUsed: solved ? 2 : 6, solved });
    else if (gameId === 'matchPredictor') finish({ xpAwarded: mini.xpMap[idx] || 0 });
  };

  const handleHigherLower = (pick) => {
    if (done) return;
    setHlChoice(pick);
    const correct = pick === mini.higherIs;
    finish({ streak: correct ? 7 : 2 });
  };

  const handlePenaltyKick = () => {
    if (!selected || penPhase !== 'aim') return;
    const kickIdx   = penKicks.length;
    const zoneIdx   = mini.zones.indexOf(selected);
    const saved     = seededGkSave(seed, kickIdx, zoneIdx);
    const kick      = { zone: selected, saved, goal: !saved };
    const newKicks  = [...penKicks, kick];
    setPenKicks(newKicks);
    setSelected(null);
    setPenPhase('result');

    setTimeout(() => {
      if (newKicks.length >= mini.kicks || saved) {
        finish({ goalsScored: newKicks.filter(k => k.goal).length, totalKicks: mini.kicks });
      } else {
        setPenPhase('aim');
      }
    }, 900);
  };

  const header = useMemo(() => (
    <div style={s.header}>
      <span style={{ fontSize: 28 }}>{game?.icon}</span>
      <div>
        <div style={s.actLabel}>Act 1 — Solo Showdown</div>
        <div style={s.gameName}>{game?.label}</div>
      </div>
    </div>
  ), [game]);

  if (done && result) {
    return (
      <div style={s.wrap}>
        {header}
        <div style={s.scoreBox}>
          <div style={s.scoreVal}>{result.normalized.toFixed(1)}</div>
          <div style={s.scoreLbl}>Normalised / 10</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {header}

      {gameId === 'higherLower' && (
        <>
          <p style={s.prompt}>{mini.prompt}</p>
          <div style={s.hlRow}>
            {[['a', mini.a], ['b', mini.b]].map(([key, p]) => (
              <button key={key} type="button" style={{
                ...s.hlCard,
            borderColor: hlChoice === key ? C.green : C.border,
              }} onClick={() => handleHigherLower(key)}>
                <div style={s.hlName}>{p.name}</div>
                <div style={s.hlCaps}>{p.caps} caps</div>
              </button>
            ))}
          </div>
        </>
      )}

      {(gameId === 'whoAreYa' || gameId === 'wordle' || gameId === 'transferTrail' || gameId === 'matchPredictor') && (
        <>
          <p style={s.prompt}>{mini.prompt}</p>
          {mini.player && <div style={s.playerName}>{mini.player}</div>}
          {mini.fixture && <div style={s.playerName}>{mini.fixture}</div>}
          <div style={s.optGrid}>
            {(mini.options || []).map((opt, i) => (
              <button key={opt} type="button" style={s.optBtn} onClick={() => handlePick(i)}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {gameId === 'penaltyNerve' && (
        <>
          <p style={s.prompt}>Score {mini.kicks} penalties — pick your corner</p>
          <div style={s.penRow}>
            {penKicks.map((k, i) => (
              <span key={i} style={{ fontSize: 22 }}>{k.goal ? '⚽' : '🧤'}</span>
            ))}
          </div>
          {penPhase === 'aim' && (
            <>
              <div style={s.penZones}>
                {['↖️ TL', '↗️ TR', '↙️ BL', '↘️ BR', '⬆️ C'].map((lbl, i) => (
                  <button key={lbl} type="button" style={{
                    ...s.penZone,
                borderColor: selected === mini.zones[i] ? C.green : C.border,
                  }} onClick={() => setSelected(mini.zones[i])}>
                    {lbl}
                  </button>
                ))}
              </div>
              <button type="button" style={{ ...s.shootBtn, opacity: selected ? 1 : 0.4 }}
                disabled={!selected} onClick={handlePenaltyKick}>
                SHOOT
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  wrap:      { color: C.text },
  header:    { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 },
  actLabel:  { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: 2, color: C.muted, textTransform: 'uppercase' },
  gameName:  { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: 1.5 },
  prompt:    { fontSize: '0.85rem', color: C.muted, marginBottom: 16, lineHeight: 1.5 },
  playerName:{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
  optGrid:   { display: 'flex', flexDirection: 'column', gap: 8 },
  optBtn:    { padding: '14px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', textAlign: 'left' },
  hlRow:     { display: 'flex', gap: 12 },
  hlCard:    { flex: 1, padding: 20, background: C.surface, border: '1px solid', borderRadius: 14, cursor: 'pointer', color: C.text },
  hlName:    { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: 1 },
  hlCaps:    { fontSize: '0.75rem', color: C.muted, marginTop: 6 },
  penRow:    { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 },
  penZones:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 },
  penZone:   { padding: 14, background: C.surface, border: '1px solid', borderRadius: 10, cursor: 'pointer', fontSize: '0.75rem' },
  shootBtn:  { width: '100%', padding: 14, background: `linear-gradient(135deg, ${C.green}, #2bb872)`, color: '#000', border: 'none', borderRadius: 12, fontWeight: 900, cursor: 'pointer', letterSpacing: 2 },
  scoreBox:  { textAlign: 'center', padding: 28, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 },
  scoreVal:  { fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', color: C.green, letterSpacing: 2 },
  scoreLbl:  { fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
};
