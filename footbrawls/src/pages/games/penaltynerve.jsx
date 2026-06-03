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

export default function PenaltyNerve() {
  const [kicks, setKicks]           = useState([]);
  const [phase, setPhase]           = useState('aiming');
  const [selected, setSelected]     = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [xpAwarded, setXpAwarded]   = useState(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [savedScore, setSavedScore] = useState(0);
  const [animating, setAnimating]   = useState(false);

  // FIX: use a ref for score so setTimeout always reads current value
  const scoreRef = useRef(0);
  const [scoreDisplay, setScoreDisplay] = useState(0);

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

    // FIX: update ref immediately — no stale closure
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

        // FIX: read from ref — always the correct cumulative total
        const finalXP = scoreRef.current;
        const goals   = newKicks.filter(k => !k.saved).length;
        const today   = getTodayKey();

        // Save to localStorage
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
        history[today] = { score: finalXP, goals, xpAwarded: finalXP, date: today };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

        // Award XP — only if earned something
        if (finalXP > 0) {
          try {
            const user = getUser();
            if (!user?.userId) {
              console.warn('[PenaltyNerve] No user found — XP not awarded');
              setXpAwarded(finalXP);
              return;
            }
            const res = await awardXP(user.userId, 'penaltyNerve_all5', { rawXP: finalXP });
            // FIX: handle both cappedOut and normal response
            if (res?.cappedOut) {
              setXpAwarded(0);
            } else {
              setXpAwarded(res?.xpAwarded ?? finalXP);
            }
          } catch (err) {
            console.error('[PenaltyNerve] awardXP failed:', err);
            setXpAwarded(finalXP); // show locally even if Firestore fails
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

      {/* Progress dots */}
      <div style={s.progressRow}>
        {Array.from({ length: MAX_KICKS }).map((_, i) => {
          const k = kicks[i];
          return (
            <div key={i} style={{
              ...s.progressDot,
              background: k ? (k.saved ? '#ff4444' : '#00ff87') : i === kicks.length ? '#fff' : '#222',
              transform: i === kicks.length ? 'scale(1.2)' : 'scale(1)',
            }}>
              {k ? (k.saved ? '🧤' : '⚽') : i === kicks.length ? '🎯' : ''}
            </div>
          );
        })}
      </div>

      {/* Score row */}
      <div style={s.scoreRow}>
        <div style={s.scoreItem}>
          <div style={s.scoreVal}>{goals}</div>
          <div style={s.scoreLabel}>Goals</div>
        </div>
        <div style={s.scoreItem}>
          <div style={s.scoreVal}>{scoreDisplay}</div>
          <div style={s.scoreLabel}>XP</div>
        </div>
        <div style={s.scoreItem}>
          <div style={s.scoreVal}>{phase === 'gameover' ? '—' : currentKick}/{MAX_KICKS}</div>
          <div style={s.scoreLabel}>Kick</div>
        </div>
      </div>

      {phase !== 'gameover' && (
        <>
          {/* Goal frame */}
          <div style={s.goalFrame}>
            <div style={s.crossbar} />
            <div style={s.postLeft} />
            <div style={s.postRight} />
            <div style={s.goalGrid}>
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
                return (
                  <div key={zone.id} style={{
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
                    onClick={() => { if (phase === 'aiming' && zone.id !== 'bottomCenter') setSelected(zone.id); }}
                  >
                    {isGkZone  && phase === 'result' && <div style={s.gkEmoji}>🧤</div>}
                    {isBallZone && phase === 'result' && !lastResult.saved && <div style={s.ballEmoji}>⚽</div>}
                  </div>
                );
              })}
            </div>
            {phase === 'aiming' && <div style={s.gkStanding}>🧤</div>}
          </div>

          {/* Result feedback */}
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

          {/* Corner picker */}
          {phase === 'aiming' && (
            <>
              <p style={s.instruction}>Pick your corner →</p>
              <div style={s.cornerGrid}>
                {CORNERS.map(corner => (
                  <button key={corner.id} style={{
                    ...s.cornerBtn,
                    borderColor: selected === corner.id ? '#00ff87' : '#1a1a1a',
                    background:  selected === corner.id ? 'rgba(0,255,135,0.1)' : 'rgba(255,255,255,0.02)',
                    color:       selected === corner.id ? '#00ff87' : '#888',
                  }} onClick={() => setSelected(corner.id)}>
                    <span style={{ fontSize: 20 }}>{corner.emoji}</span>
                    <span style={{ fontSize: 11 }}>{corner.label}</span>
                  </button>
                ))}
              </div>
              <button style={{ ...s.kickBtn, opacity: selected ? 1 : 0.4 }}
                disabled={!selected || animating} onClick={kick}>
                ⚽ SHOOT!
              </button>
            </>
          )}
        </>
      )}

      {/* Game over */}
      {phase === 'gameover' && !alreadyPlayed && (
        <div style={s.result}>
          <div style={s.resultTitle}>
            {goals === 5 ? '🏆 Perfect!' : goals >= 3 ? '👏 Great shooting!' : goals >= 1 ? '⚽ Not bad!' : '😅 No goals today!'}
          </div>
          <div style={s.resultScore}>{scoreDisplay} XP</div>
          <div style={s.resultInfo}>{goals} / {MAX_KICKS} goals scored</div>

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
            <div style={s.xpBadge}>
              {xpAwarded > 0 ? `+${xpAwarded} XP added to your guild!` : 'Daily XP cap reached'}
            </div>
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

const s = {
  container:    { minHeight:'100vh', background:'#0a0a0a', color:'#fff', fontFamily:"'Segoe UI', sans-serif", padding:'20px 20px 60px', maxWidth:600, margin:'0 auto' },
  header:       { marginBottom:20 },
  title:        { fontSize:28, fontWeight:800, margin:0 },
  subtitle:     { fontSize:13, color:'#888', margin:'4px 0 0' },
  progressRow:  { display:'flex', gap:10, justifyContent:'center', marginBottom:20 },
  progressDot:  { width:44, height:44, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, transition:'all 0.3s ease' },
  scoreRow:     { display:'flex', gap:12, marginBottom:24 },
  scoreItem:    { flex:1, textAlign:'center', padding:12, background:'rgba(255,255,255,0.03)', border:'1px solid #1a1a1a', borderRadius:12 },
  scoreVal:     { fontSize:24, fontWeight:800, color:'#00ff87' },
  scoreLabel:   { fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:1, marginTop:3 },
  goalFrame:    { position:'relative', width:'100%', aspectRatio:'2/1', background:'rgba(255,255,255,0.02)', border:'3px solid #333', borderRadius:4, marginBottom:16, overflow:'hidden' },
  crossbar:     { position:'absolute', top:0, left:0, right:0, height:3, background:'#555', zIndex:2 },
  postLeft:     { position:'absolute', top:0, left:0, bottom:0, width:3, background:'#555', zIndex:2 },
  postRight:    { position:'absolute', top:0, right:0, bottom:0, width:3, background:'#555', zIndex:2 },
  goalGrid:     { position:'absolute', inset:3, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'1fr 1fr', gap:2 },
  goalZone:     { borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', position:'relative' },
  gkEmoji:      { fontSize:28, position:'absolute' },
  ballEmoji:    { fontSize:24, position:'absolute' },
  gkStanding:   { position:'absolute', bottom:'10%', left:'50%', transform:'translateX(-50%)', fontSize:32, zIndex:3 },
  feedback:     { padding:'12px 16px', borderRadius:12, border:'1px solid', fontSize:14, fontWeight:700, textAlign:'center', marginBottom:16 },
  instruction:  { textAlign:'center', color:'#555', fontSize:12, textTransform:'uppercase', letterSpacing:1, marginBottom:12 },
  cornerGrid:   { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 },
  cornerBtn:    { padding:'10px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, border:'1px solid', borderRadius:12, cursor:'pointer', transition:'all 0.15s', background:'transparent' },
  kickBtn:      { width:'100%', padding:16, background:'linear-gradient(135deg,#00ff87,#00cc6a)', color:'#000', border:'none', borderRadius:14, fontSize:18, fontWeight:900, cursor:'pointer', letterSpacing:2, transition:'opacity 0.2s' },
  result:       { marginTop:28, padding:28, background:'rgba(255,255,255,0.03)', border:'1px solid #1a1a1a', borderRadius:20, textAlign:'center' },
  resultTitle:  { fontSize:24, fontWeight:800, marginBottom:12 },
  resultScore:  { fontSize:52, fontWeight:800, color:'#00ff87', marginBottom:8 },
  resultInfo:   { fontSize:16, color:'#888', marginBottom:20 },
  kickReplay:   { display:'flex', flexDirection:'column', gap:8, marginBottom:16, textAlign:'left' },
  kickReplayItem:{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(255,255,255,0.02)', border:'1px solid #1a1a1a', borderRadius:8 },
  xpBadge:      { display:'inline-block', padding:'6px 16px', marginBottom:12, background:'rgba(0,255,135,0.1)', border:'1px solid rgba(0,255,135,0.4)', borderRadius:100, color:'#00ff87', fontWeight:700, fontSize:14 },
  nextPuzzle:   { fontSize:12, color:'#555', margin:0 },
};