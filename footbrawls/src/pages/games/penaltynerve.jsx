// src/pages/games/PenaltyNerve.jsx
// Penalty Nerve — penalty shootout game
// Pick your corner, beat the goalkeeper 5 times in a row

import { useState, useEffect, useRef } from 'react';
import { awardXP } from '../../lib/xpEngine';
import { getUser } from '../../lib/user';

const HISTORY_KEY = 'footbrawls_penaltynerve';
const MAX_KICKS   = 5;
const XP_PER_GOAL = 6; // 5 goals = 30 XP max

// Goalkeeper AI — biased but not perfect
// Each difficulty level has different save probabilities per corner
const GK_PATTERNS = [
  // [topLeft, topRight, bottomLeft, bottomRight, center] save probability
  [0.15, 0.35, 0.25, 0.20, 0.40], // kick 1 — easy
  [0.25, 0.20, 0.35, 0.30, 0.45], // kick 2
  [0.30, 0.25, 0.20, 0.35, 0.50], // kick 3 — medium
  [0.35, 0.30, 0.40, 0.25, 0.55], // kick 4
  [0.40, 0.45, 0.35, 0.40, 0.60], // kick 5 — hardest
];

const CORNERS = [
  { id: 'topLeft',     label: 'Top Left',     emoji: '↖️', row: 0, col: 0 },
  { id: 'topRight',    label: 'Top Right',    emoji: '↗️', row: 0, col: 2 },
  { id: 'bottomLeft',  label: 'Bottom Left',  emoji: '↙️', row: 1, col: 0 },
  { id: 'bottomRight', label: 'Bottom Right', emoji: '↘️', row: 1, col: 2 },
  { id: 'center',      label: 'Center',       emoji: '⬆️', row: 0, col: 1 },
];

const GK_DIVES = {
  topLeft:     'dives left high',
  topRight:    'dives right high',
  bottomLeft:  'dives left low',
  bottomRight: 'dives right low',
  center:      'stays center',
};

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Seeded RNG for daily GK pattern
function seededRng(seed, index) {
  let s = (seed * 1664525 + index * 1013904223 + 1013904223) & 0x7fffffff;
  s = (s ^ (s >>> 16)) * 0x45d9f3b & 0x7fffffff;
  return (s >>> 0) / 0x7fffffff;
}

function getDailySeed() {
  const today = getTodayKey();
  const launch = new Date('2026-06-11T00:00:00Z');
  const thisDay = new Date(today + 'T00:00:00Z');
  return Math.max(0, Math.floor((thisDay - launch) / 86400000));
}

export default function PenaltyNerve() {
  const [kicks, setKicks]           = useState([]); // {corner, saved, gkDive}
  const [phase, setPhase]           = useState('aiming'); // aiming | result | gameover
  const [selected, setSelected]     = useState(null);
  const [lastResult, setLastResult] = useState(null); // {goal, gkDive, corner}
  const [score, setScore]           = useState(0);
  const [xpAwarded, setXpAwarded]   = useState(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [savedScore, setSavedScore] = useState(0);
  const [animating, setAnimating]   = useState(false);
  const seed = getDailySeed();

  useEffect(() => {
    const today = getTodayKey();
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    if (history[today]) {
      setAlreadyPlayed(true);
      setSavedScore(history[today].score);
      setPhase('gameover');
    }
  }, []);

  async function kick() {
    if (!selected || animating || phase !== 'aiming') return;

    setAnimating(true);

    // GK decision — seeded per day + kick number
    const kickIdx = kicks.length;
    const pattern = GK_PATTERNS[Math.min(kickIdx, GK_PATTERNS.length - 1)];
    const cornerIdx = CORNERS.findIndex(c => c.id === selected);
    const saveProbability = pattern[cornerIdx];

    // Add some daily variation using seed
    const rng = seededRng(seed, kickIdx * 10 + cornerIdx);
    const saved = rng < saveProbability;

    // GK dives to a random corner (slightly biased toward player's choice)
    const gkRng = seededRng(seed + 1, kickIdx * 7 + cornerIdx);
    let gkCorner;
    if (saved) {
      gkCorner = selected; // GK dives to where you shot
    } else {
      // GK dives somewhere else
      const others = CORNERS.filter(c => c.id !== selected);
      gkCorner = others[Math.floor(gkRng * others.length)].id;
    }

    const result = { corner: selected, saved, gkDive: gkCorner };
    const newKicks = [...kicks, result];
    const newScore = saved ? score : score + XP_PER_GOAL;

    setLastResult(result);
    setKicks(newKicks);
    setScore(newScore);
    setPhase('result');
    setSelected(null);

    // Check game over
    setTimeout(async () => {
      setAnimating(false);
      if (saved || newKicks.length >= MAX_KICKS) {
        // Game over
        const finalScore = newScore;
        setPhase('gameover');

        // Save
        const today = getTodayKey();
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
        history[today] = { score: finalScore, goals: newKicks.filter(k => !k.saved).length };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

        // Award XP
        if (finalScore > 0) {
          const user = getUser();
          if (user) {
            const res = await awardXP(user.userId, 'penaltyNerve_all5', { rawXP: finalScore });
            setXpAwarded(res?.xpAwarded || finalScore);
          }
        }
      } else {
        setPhase('aiming');
        setLastResult(null);
      }
    }, 2000);
  }

  const goals = kicks.filter(k => !k.saved).length;
  const currentKick = kicks.length + 1;

  if (alreadyPlayed && phase === 'gameover') {
    return (
      <div style={s.container}>
        <Header />
        <div style={s.result}>
          <div style={s.resultTitle}>Already played today!</div>
          <div style={s.resultScore}>{savedScore} XP</div>
          <p style={s.nextPuzzle}>New penalties tomorrow 📅</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <Header />

      {/* Progress */}
      <div style={s.progressRow}>
        {Array.from({ length: MAX_KICKS }).map((_, i) => {
          const kick = kicks[i];
          return (
            <div key={i} style={{
              ...s.progressDot,
              background: kick
                ? kick.saved ? '#ff4444' : '#00ff87'
                : i === kicks.length ? '#fff' : '#222',
              transform: i === kicks.length ? 'scale(1.2)' : 'scale(1)',
            }}>
              {kick ? (kick.saved ? '🧤' : '⚽') : i === kicks.length ? '🎯' : ''}
            </div>
          );
        })}
      </div>

      {/* Score */}
      <div style={s.scoreRow}>
        <div style={s.scoreItem}>
          <div style={s.scoreVal}>{goals}</div>
          <div style={s.scoreLabel}>Goals</div>
        </div>
        <div style={s.scoreItem}>
          <div style={s.scoreVal}>{score}</div>
          <div style={s.scoreLabel}>XP</div>
        </div>
        <div style={s.scoreItem}>
          <div style={s.scoreVal}>{phase === 'gameover' ? '—' : currentKick}/{MAX_KICKS}</div>
          <div style={s.scoreLabel}>Kick</div>
        </div>
      </div>

      {phase !== 'gameover' && (
        <>
          {/* Goal visual */}
          <div style={s.goalFrame}>
            {/* Crossbar */}
            <div style={s.crossbar} />
            {/* Posts */}
            <div style={s.postLeft} />
            <div style={s.postRight} />

            {/* Goal grid — 3x2 */}
            <div style={s.goalGrid}>
              {[
                { id: 'topLeft',    row: 0, col: 0 },
                { id: 'center',     row: 0, col: 1 },
                { id: 'topRight',   row: 0, col: 2 },
                { id: 'bottomLeft', row: 1, col: 0 },
                { id: 'bottomCenter', row: 1, col: 1 },
                { id: 'bottomRight',row: 1, col: 2 },
              ].map(zone => {
                const isSelected = selected === zone.id;
                const isGkZone   = lastResult?.gkDive === zone.id;
                const isBallZone = lastResult?.corner === zone.id;

                return (
                  <div
                    key={zone.id}
                    style={{
                      ...s.goalZone,
                      background: isSelected && phase === 'aiming'
                        ? 'rgba(0,255,135,0.15)'
                        : isGkZone && phase === 'result'
                        ? 'rgba(255,68,68,0.2)'
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected && phase === 'aiming'
                        ? '2px solid rgba(0,255,135,0.5)'
                        : '1px solid rgba(255,255,255,0.06)',
                      cursor: phase === 'aiming' && zone.id !== 'bottomCenter' ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (phase === 'aiming' && zone.id !== 'bottomCenter') {
                        setSelected(zone.id);
                      }
                    }}
                  >
                    {/* GK emoji */}
                    {isGkZone && phase === 'result' && (
                      <div style={s.gkEmoji}>🧤</div>
                    )}
                    {/* Ball emoji */}
                    {isBallZone && phase === 'result' && !lastResult.saved && (
                      <div style={s.ballEmoji}>⚽</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* GK standing */}
            {phase === 'aiming' && (
              <div style={s.gkStanding}>🧤</div>
            )}
          </div>

          {/* Feedback */}
          {phase === 'result' && lastResult && (
            <div style={{
              ...s.feedback,
              background: lastResult.saved ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,135,0.1)',
              borderColor: lastResult.saved ? 'rgba(255,68,68,0.4)' : 'rgba(0,255,135,0.4)',
              color: lastResult.saved ? '#ff6666' : '#00ff87',
            }}>
              {lastResult.saved
                ? `🧤 SAVED! Keeper ${GK_DIVES[lastResult.gkDive]}`
                : `⚽ GOAL! +${XP_PER_GOAL} XP`}
            </div>
          )}

          {/* Corner picker buttons */}
          {phase === 'aiming' && (
            <>
              <p style={s.instruction}>Pick your corner →</p>
              <div style={s.cornerGrid}>
                {CORNERS.map(corner => (
                  <button
                    key={corner.id}
                    style={{
                      ...s.cornerBtn,
                      borderColor: selected === corner.id ? '#00ff87' : '#1a1a1a',
                      background: selected === corner.id ? 'rgba(0,255,135,0.1)' : 'rgba(255,255,255,0.02)',
                      color: selected === corner.id ? '#00ff87' : '#888',
                    }}
                    onClick={() => setSelected(corner.id)}
                  >
                    <span style={{ fontSize: 20 }}>{corner.emoji}</span>
                    <span style={{ fontSize: 11 }}>{corner.label}</span>
                  </button>
                ))}
              </div>

              <button
                style={{
                  ...s.kickBtn,
                  opacity: selected ? 1 : 0.4,
                }}
                disabled={!selected || animating}
                onClick={kick}
              >
                ⚽ SHOOT!
              </button>
            </>
          )}
        </>
      )}

      {/* Game Over */}
      {phase === 'gameover' && !alreadyPlayed && (
        <div style={s.result}>
          <div style={s.resultTitle}>
            {goals === 5 ? '🏆 Perfect!' :
             goals >= 3 ? '👏 Great shooting!' :
             goals >= 1 ? '⚽ Not bad!' : '😅 No goals today!'}
          </div>
          <div style={s.resultScore}>{score} XP</div>
          <div style={s.resultInfo}>{goals} / {MAX_KICKS} goals scored</div>

          {/* Replay kicks */}
          <div style={s.kickReplay}>
            {kicks.map((k, i) => (
              <div key={i} style={s.kickReplayItem}>
                <span style={{ fontSize: 20 }}>{k.saved ? '🧤' : '⚽'}</span>
                <span style={{ fontSize: 12, color: k.saved ? '#ff6666' : '#00ff87' }}>
                  {k.saved ? `Saved (${k.corner})` : `Goal (${k.corner})`}
                </span>
              </div>
            ))}
          </div>

          {xpAwarded != null && (
            <div style={s.xpBadge}>+{xpAwarded} XP added to your guild!</div>
          )}
          <p style={s.nextPuzzle}>New penalties tomorrow 📅</p>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div style={s.header}>
      <h1 style={s.title}>Penalty Nerve ⚽</h1>
      <p style={s.subtitle}>Score 5 penalties · {XP_PER_GOAL} XP per goal · Max 30 XP</p>
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
    maxWidth: 600,
    margin: '0 auto',
  },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 800, margin: 0 },
  subtitle: { fontSize: 13, color: '#888', margin: '4px 0 0' },
  progressRow: {
    display: 'flex', gap: 10, justifyContent: 'center',
    marginBottom: 20,
  },
  progressDot: {
    width: 44, height: 44, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, transition: 'all 0.3s ease',
  },
  scoreRow: {
    display: 'flex', gap: 12, marginBottom: 24,
  },
  scoreItem: {
    flex: 1, textAlign: 'center', padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid #1a1a1a', borderRadius: 12,
  },
  scoreVal:   { fontSize: 24, fontWeight: 800, color: '#00ff87' },
  scoreLabel: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 },
  goalFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: '2 / 1',
    background: 'rgba(255,255,255,0.02)',
    border: '3px solid #333',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  crossbar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 3, background: '#555', zIndex: 2,
  },
  postLeft: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: 3, background: '#555', zIndex: 2,
  },
  postRight: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: 3, background: '#555', zIndex: 2,
  },
  goalGrid: {
    position: 'absolute', inset: 3,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gridTemplateRows: '1fr 1fr',
    gap: 2,
  },
  goalZone: {
    borderRadius: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
    position: 'relative',
  },
  gkEmoji:   { fontSize: 28, position: 'absolute' },
  ballEmoji: { fontSize: 24, position: 'absolute', animation: 'none' },
  gkStanding: {
    position: 'absolute',
    bottom: '10%', left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 32, zIndex: 3,
  },
  feedback: {
    padding: '12px 16px', borderRadius: 12,
    border: '1px solid', fontSize: 14,
    fontWeight: 700, textAlign: 'center',
    marginBottom: 16,
  },
  instruction: {
    textAlign: 'center', color: '#555',
    fontSize: 12, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 12,
  },
  cornerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8, marginBottom: 16,
  },
  cornerBtn: {
    padding: '10px 6px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4,
    border: '1px solid', borderRadius: 12,
    cursor: 'pointer', transition: 'all 0.15s',
    background: 'transparent',
  },
  kickBtn: {
    width: '100%', padding: '16px',
    background: 'linear-gradient(135deg, #00ff87, #00cc6a)',
    color: '#000', border: 'none', borderRadius: 14,
    fontSize: 18, fontWeight: 900, cursor: 'pointer',
    letterSpacing: 2, transition: 'opacity 0.2s',
  },
  result: {
    marginTop: 28, padding: 28,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid #1a1a1a', borderRadius: 20, textAlign: 'center',
  },
  resultTitle: { fontSize: 24, fontWeight: 800, marginBottom: 12 },
  resultScore: { fontSize: 52, fontWeight: 800, color: '#00ff87', marginBottom: 8 },
  resultInfo:  { fontSize: 16, color: '#888', marginBottom: 20 },
  kickReplay: {
    display: 'flex', flexDirection: 'column', gap: 8,
    marginBottom: 16, textAlign: 'left',
  },
  kickReplayItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid #1a1a1a', borderRadius: 8,
  },
  xpBadge: {
    display: 'inline-block', padding: '6px 16px', marginBottom: 12,
    background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.4)',
    borderRadius: 100, color: '#00ff87', fontWeight: 700, fontSize: 14,
  },
  nextPuzzle: { fontSize: 12, color: '#555', margin: 0 },
};