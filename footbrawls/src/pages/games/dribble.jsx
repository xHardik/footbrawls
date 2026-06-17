import { useEffect, useRef, useState, useCallback } from 'react';

const ROUNDS = 5;
const SEED = 42;
const ZONE_SHORT = ['Far', 'Low L', 'Low R', 'Hi L', 'Hi R', 'Near'];
const ZONE_LABELS = ['Far post', 'Low left', 'Low right', 'High left', 'High right', 'Near post'];

function rand(s, n) {
  const x = Math.sin(s * 9301 + n * 49297 + 233720923) * 10000;
  return x - Math.floor(x);
}
function simBot(seed, who) {
  let w = 0;
  for (let i = 0; i < ROUNDS; i++) if (rand(seed + (who === 'buddy' ? 1 : 2), i) > 0.45) w++;
  return Math.min(ROUNDS, w);
}
function getGKZones(round) {
  const z1 = Math.floor(rand(SEED + round * 17, 2) * 6);
  let z2 = Math.floor(rand(SEED + round * 17, 3) * 6);
  if (z2 === z1) z2 = (z1 + 1) % 6;
  return [z1, z2];
}
function zoneScreenX(i) { return 217 + i * 23 + 11; }

const botScores = { buddy: simBot(SEED, 'buddy'), rival: simBot(SEED, 'rival') };

function initState() {
  return {
    phase: 'dribble',
    round: 0,
    results: [],
    aiDefPick: null,
    playerPick: null,
    zonePick: null,
    gkZones: getGKZones(0),
    feedback: null,
    tackled: false,
    shotPhase: false,
    playerX: 280, playerY: 255,
    ballX: 280, ballY: 265,
    defX: [140, 280, 420], defY: [130, 130, 130],
    defBeaten: [false, false, false],
    gkX: 280, gkY: 42,
    gkDiveX: 280, gkDiveY: 42,
    gkDiving: false,
  };
}

// ─── Canvas draw helpers (pure functions, take ctx + state) ────────────────

function drawField(ctx) {
  ctx.canvas.width = 560; ctx.canvas.height = 320;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#4a9e4a' : '#459645';
    ctx.fillRect(i * 94, 0, 94, 320);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  ctx.strokeRect(150, 10, 260, 300);
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(210, 10, 140, 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  ctx.strokeRect(210, 10, 140, 10);
  ctx.fillStyle = '#fff';
  ctx.fillRect(208, 10, 4, 18); ctx.fillRect(348, 10, 4, 18);
  ctx.fillRect(210, 10, 140, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(280, 320, 70, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, 210); ctx.lineTo(560, 210); ctx.stroke();
}

function drawGoalZones(ctx, st) {
  for (let i = 0; i < 6; i++) {
    const x = 217 + i * 23;
    const gkBlocked = st.gkZones.includes(i);
    const reveal = st.phase === 'shot_result';
    ctx.fillStyle = reveal && gkBlocked
      ? 'rgba(232,64,64,0.45)'
      : st.zonePick === i ? 'rgba(61,214,140,0.45)' : 'rgba(255,255,255,0.1)';
    ctx.fillRect(x, 10, 22, 18);
    ctx.strokeStyle = reveal && gkBlocked ? '#E84040' : st.zonePick === i ? '#3DD68C' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = st.zonePick === i ? 1.5 : 0.5;
    ctx.strokeRect(x, 10, 22, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ZONE_SHORT[i], x + 11, 19);
  }
}

function drawGK(ctx, st) {
  const x = st.gkDiving ? st.gkDiveX : st.gkX;
  const y = st.gkDiving ? st.gkDiveY : st.gkY;
  ctx.fillStyle = '#ff9f1c';
  ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'white'; ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('GK', x, y - 3);
  if (st.gkDiving) {
    ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 34, y - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 16, y); ctx.lineTo(x + 34, y - 8); ctx.stroke();
  }
}

function drawDefender(ctx, x, y, beaten, isAI) {
  if (beaten) {
    ctx.fillStyle = 'rgba(61,214,140,0.2)';
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3DD68C'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#3DD68C'; ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✓', x, y);
    return;
  }
  ctx.fillStyle = isAI ? 'rgba(232,64,64,0.9)' : 'rgba(200,50,50,0.75)';
  ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'white'; ctx.font = '600 11px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(x < 200 ? 'L' : x > 360 ? 'R' : 'C', x, y - 4);
  ctx.font = '9px sans-serif'; ctx.fillText('DEF', x, y + 7);
}

function drawPlayer(ctx, x, y) {
  ctx.fillStyle = '#4A90E2';
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'white'; ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('YOU', x, y);
}

function drawBall(ctx, x, y) {
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x - 3, y - 5); ctx.bezierCurveTo(x, y - 2, x + 3, y - 5, x + 3, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 3, y + 5); ctx.bezierCurveTo(x, y + 2, x + 3, y + 5, x + 3, y); ctx.stroke();
}

function drawScene(ctx, st) {
  drawField(ctx);
  if (st.shotPhase || st.phase === 'shot_result') drawGoalZones(ctx, st);
  drawGK(ctx, st);
  st.defX.forEach((x, i) =>
    drawDefender(ctx, x, st.defY[i], st.defBeaten[i],
      st.aiDefPick === i && st.feedback === 'tackled'));
  drawPlayer(ctx, st.playerX, st.playerY);
  drawBall(ctx, st.ballX, st.ballY);
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function RaidAct2({ onComplete }) {
  const canvasRef = useRef(null);
  const stRef = useRef(initState());
  const rafRef = useRef(null);
  const [, forceRender] = useState(0);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawScene(canvas.getContext('2d'), stRef.current);
  }, []);

  const rerender = useCallback(() => {
    repaint();
    forceRender(n => n + 1);
  }, [repaint]);

  useEffect(() => { repaint(); }, [repaint]);

  useEffect(() => {
    if (!document.getElementById('db-css')) {
      const s = document.createElement('style');
      s.id = 'db-css';
      s.textContent = `
        .db-nav {
          display: flex; align-items: center; justify-content: space-between;
          height: 64px; padding: 0 24px; position: relative; z-index: 10;
          border-bottom: 1px solid rgba(61, 214, 140, 0.12);
          background: rgba(5,7,15,0.7); backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(61, 214, 140, 0.15);
        }
        .db-nav-logo {
          font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 2px;
          background: linear-gradient(135deg, #3DD68C, #10B981);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; border: none; cursor: pointer; background-color: transparent; outline: none;
        }
        .db-nav-tag {
          font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;
          color: rgba(242, 242, 244, 0.5); border: 1px solid rgba(255, 255, 255, 0.07); padding: 5px 12px;
          border-radius: 100px; display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.02);
        }
        .db-fire-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #3DD68C;
          box-shadow: 0 0 8px #3DD68C;
        }
        .db-nav-right {
          display: flex; gap: 8px;
        }
        .db-nav-btn {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255, 255, 255, 0.07); color: #fff;
          padding: 8px 14px; border-radius: 10px; font-size: .8rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
        }
        .db-nav-btn:hover {
          background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2);
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  // ── Animation helpers ────────────────────────────────────────────────────

  function animateTo(tx, ty, dur, cb) {
    const s = stRef.current;
    const sx = s.ballX, sy = s.ballY, spx = s.playerX, spy = s.playerY;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      s.ballX = sx + (tx - sx) * e; s.ballY = sy + (ty - sy) * e;
      s.playerX = spx + (tx - spx) * e; s.playerY = spy + (ty - spy) * e;
      repaint();
      rafRef.current = p < 1 ? requestAnimationFrame(step) : (cb?.(), null);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function animateBallOnly(tx, ty, dur, cb) {
    const s = stRef.current;
    const sx = s.ballX, sy = s.ballY;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      s.ballX = sx + (tx - sx) * e; s.ballY = sy + (ty - sy) * e;
      repaint();
      rafRef.current = p < 1 ? requestAnimationFrame(step) : (cb?.(), null);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function animateGKDive(tx, ty, dur, cb) {
    const s = stRef.current;
    const sx = s.gkX, sy = s.gkY;
    s.gkDiving = true;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 2);
      s.gkDiveX = sx + (tx - sx) * e; s.gkDiveY = sy + (ty - sy) * e;
      repaint();
      rafRef.current = p < 1 ? requestAnimationFrame(step) : (cb?.(), null);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  const pickDir = (d) => {
    const s = stRef.current;
    if (s.feedback || s.tackled) return;
    s.playerPick = d;
    rerender();
  };

  const pickZone = (z) => {
    const s = stRef.current;
    if (s.phase === 'shot_result') return;
    s.zonePick = z;
    rerender();
  };

  const dribble = () => {
    const s = stRef.current;
    if (s.playerPick === null || s.feedback) return;
    const ai = Math.floor(rand(SEED + s.round * 7, 3) * 3);
    s.aiDefPick = ai;
    const tackled = ai === s.playerPick;
    const tx = [140, 280, 420][s.playerPick];

    if (tackled) {
      s.feedback = 'tackled';
      s.tackled = true;
      rerender();
      animateTo(tx, s.defY[s.playerPick] + 5, 380, () => {
        s.results = [...s.results, false];
        rerender();
      });
    } else {
      s.feedback = 'beaten';
      s.defBeaten[s.playerPick] = true;
      animateTo(tx, s.defY[s.playerPick] - 40, 380, () => {
        setTimeout(() => {
          s.feedback = null;
          s.shotPhase = true;
          s.playerPick = null;
          rerender();
        }, 250);
      });
    }
  };

  const shoot = () => {
    const s = stRef.current;
    if (s.zonePick === null) return;
    const gkBlocked = s.gkZones.includes(s.zonePick);
    const diveTargetX = (zoneScreenX(s.gkZones[0]) + zoneScreenX(s.gkZones[1])) / 2;
    animateGKDive(diveTargetX, 38, 350, () => {});
    setTimeout(() => {
      animateBallOnly(zoneScreenX(s.zonePick), 18, 420, () => {
        s.phase = 'shot_result';
        s.feedback = gkBlocked ? 'saved' : 'goal';
        s.results = [...s.results, !gkBlocked];
        rerender();
      });
    }, 80);
  };

  const nextRound = () => {
    const s = stRef.current;
    if (s.results.length >= ROUNDS) {
      const pw = s.results.filter(Boolean).length;
      const rv = Math.min(5, Math.max(0, 5 - pw));
      const yt = pw + botScores.buddy;
      const rt = rv + botScores.rival;
      const winner = yt > rt ? 'you' : yt < rt ? 'rival' : 'draw';
      s.phase = 'summary';
      rerender();
      onComplete?.({ playerRoundWins: pw, buddyRoundWins: botScores.buddy,
        rivalRoundWins: rv, rivalBotWins: botScores.rival,
        yourTotal: yt, rivalTotal: rt, winner });
      return;
    }
    s.round++;
    Object.assign(stRef.current, {
      phase: 'dribble', aiDefPick: null, playerPick: null, zonePick: null,
      gkZones: getGKZones(s.round), feedback: null, tackled: false, shotPhase: false,
      playerX: 280, playerY: 255, ballX: 280, ballY: 265,
      defX: [140, 280, 420], defY: [130, 130, 130],
      defBeaten: [false, false, false],
      gkX: 280, gkY: 42, gkDiveX: 280, gkDiveY: 42, gkDiving: false,
    });
    rerender();
  };

  const restart = () => {
    stRef.current = initState();
    rerender();
  };

  // ── Derived state for render ──────────────────────────────────────────────

  const s = stRef.current;
  const pw = s.results.filter(Boolean).length;
  const rv = Math.min(5, Math.max(0, 5 - pw));
  const yt = pw + botScores.buddy;
  const rt = rv + botScores.rival;
  const w = yt > rt ? 'you' : yt < rt ? 'rival' : 'draw';

  const feedbackMap = {
    tackled: { cls: 'tackled', text: 'Tackled! Defender read your move' },
    beaten:  { cls: 'beaten',  text: 'Defender beaten! Now pick your shot' },
    goal:    { cls: 'goal',    text: 'GOAL! GK couldn\'t reach it' },
    saved:   { cls: 'saved',   text: 'Saved! GK covered that zone' },
  };

  return (
    <>
      {/* Nav */}
      <nav className="db-nav">
        <button className="db-nav-logo" onClick={() => window.history.back()}>←</button>
        <div className="db-nav-tag">
          <span className="db-fire-dot" />
          Dribble Gauntlet
        </div>
        <div className="db-nav-right">
          <button className="db-nav-btn" onClick={() => alert("How to Play Dribble Gauntlet:\n\nDribble past the defender by picking a direction (Left, Center, Right), then try to score a goal by choosing a shooting zone.")}>❓ Help</button>
        </div>
      </nav>

      <div style={styles.wrap}>
        {/* HUD */}
      <div style={styles.hud}>
        <div>
          <div style={styles.actLabel}>Act 2 — Dribble Gauntlet</div>
          <div style={styles.gameTitle}>
            {s.phase === 'summary' ? 'Results' : `Round ${s.round + 1} of ${ROUNDS}`}
          </div>
        </div>
        <div style={styles.pips}>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <div key={i} style={{
              ...styles.pip,
              background: s.results[i] === true ? '#3DD68C'
                : s.results[i] === false ? '#E84040'
                : 'rgba(255,255,255,0.1)',
            }} />
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <canvas ref={canvasRef} width={560} height={320} style={styles.canvas} />

      {/* Controls */}
      <div style={styles.controls}>
        {s.phase === 'summary' ? (
          <>
            <div style={styles.duoGrid}>
              <div style={styles.duoBox}>
                <div style={styles.duoLbl}>Your duo</div>
                <div style={{ ...styles.duoScore, color: '#3DD68C' }}>{yt}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(242,242,244,0.5)' }}>vs</div>
              <div style={styles.duoBox}>
                <div style={styles.duoLbl}>Rivals</div>
                <div style={{ ...styles.duoScore, color: '#E84040' }}>{rt}</div>
              </div>
            </div>
            <div style={styles.summary}>
              {[
                { label: 'Your rounds', val: `${pw}/${ROUNDS}`, color: '#3DD68C' },
                { label: 'Buddy bot',   val: `${botScores.buddy}/${ROUNDS}` },
                { label: 'Rival player',val: `${rv}/${ROUNDS}` },
                { label: 'Rival bot',   val: `${botScores.rival}/${ROUNDS}` },
              ].map(r => (
                <div key={r.label} style={styles.sumRow}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight: 500, color: r.color || '#f2f2f4' }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div style={{
              ...styles.verdict,
              background: w === 'you' ? 'rgba(61,214,140,.12)' : w === 'rival' ? 'rgba(232,64,64,.1)' : 'rgba(255,255,255,.05)',
              color: w === 'you' ? '#3DD68C' : w === 'rival' ? '#ff8080' : 'rgba(242,242,244,0.6)',
              border: `1px solid ${w === 'you' ? 'rgba(61,214,140,.25)' : w === 'rival' ? 'rgba(232,64,64,.2)' : 'rgba(255,255,255,.1)'}`,
            }}>
              {w === 'you' ? '✓ Act 2 Won' : w === 'rival' ? '✗ Act 2 Lost' : '— Draw'}
            </div>
            <button style={{ ...styles.actionBtn, ...styles.restartBtn }} onClick={restart}>Play again</button>
          </>
        ) : (
          <>
            {s.feedback && (
              <div style={{ ...styles.feedback, ...styles[`fb_${feedbackMap[s.feedback]?.cls}`] }}>
                {feedbackMap[s.feedback]?.text}
              </div>
            )}

            {s.tackled || s.phase === 'shot_result' ? (
              <button style={{ ...styles.actionBtn, ...styles.restartBtn }} onClick={nextRound}>
                Next round
              </button>
            ) : !s.shotPhase ? (
              <>
                <div style={styles.ctrlLabel}>Pick a lane to dribble through</div>
                <div style={styles.btnRow}>
                  {['← Left', '↑ Centre', '→ Right'].map((lbl, i) => (
                    <button
                      key={i}
                      style={{
                        ...styles.dirBtn,
                        ...(s.playerPick === i ? styles.dirBtnSel : {}),
                      }}
                      onClick={() => pickDir(i)}
                      disabled={!!s.feedback}
                    >{lbl}</button>
                  ))}
                </div>
                <button
                  style={{ ...styles.actionBtn, ...styles.goBtn }}
                  onClick={dribble}
                  disabled={s.playerPick === null || !!s.feedback}
                >Dribble</button>
              </>
            ) : (
              <>
                <div style={styles.ctrlLabel}>Pick a finish zone — GK covers 2 zones</div>
                <div style={styles.gkHint}>The keeper will dive to block 2 zones simultaneously</div>
                <div style={styles.finishGrid}>
                  {ZONE_LABELS.map((_, i) => (
                    <button
                      key={i}
                      style={{
                        ...styles.finBtn,
                        ...(s.zonePick === i ? styles.finBtnSel : {}),
                      }}
                      onClick={() => pickZone(i)}
                    >{ZONE_SHORT[i]}</button>
                  ))}
                </div>
                <button
                  style={{ ...styles.actionBtn, ...styles.shootBtn }}
                  onClick={shoot}
                  disabled={s.zonePick === null}
                >Shoot</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  </>
);
}

const C = {
  surface: '#1c2a1c',
  border:  'rgba(255,255,255,0.28)',
  muted:   'rgba(242,242,244,0.6)',
  text:    '#f2f2f4',
};

const styles = {
  wrap:       { color: C.text, fontFamily: 'inherit', maxWidth: 450, margin: '0 auto', padding: '16px 16px 80px', boxSizing: 'border-box', position: 'relative', zIndex: 1 },
  hud:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  actLabel:   { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em' },
  gameTitle:  { fontSize: 16, fontWeight: 500, color: C.text },
  pips:       { display: 'flex', gap: 5 },
  pip:        { width: 28, height: 5, borderRadius: 3, transition: 'background .3s' },
  canvas:     { display: 'block', borderRadius: 12, border: '2px solid rgba(255,255,255,0.25)', width: '100%' },
  controls:   { marginTop: 12 },
  ctrlLabel:  { fontSize: 12, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.07em' },
  gkHint:     { fontSize: 11, color: 'rgba(242,242,244,0.4)', textAlign: 'center', marginBottom: 6 },
  btnRow:     { display: 'flex', gap: 8, marginBottom: 10 },
  dirBtn:     { flex: 1, padding: '13px 8px', background: '#1e2e1e', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 10, color: '#f2f2f4', cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'all .15s', textAlign: 'center' },
  dirBtnSel:  { borderColor: '#F7C344', background: 'rgba(247,195,68,.2)', color: '#F7C344' },
  finishGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 },
  finBtn:     { padding: '10px 6px', background: '#1e2e1e', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#d0d0d0', cursor: 'pointer', fontSize: 12, transition: 'all .15s', textAlign: 'center' },
  finBtnSel:  { borderColor: '#3DD68C', background: 'rgba(61,214,140,.18)', color: '#3DD68C' },
  actionBtn:  { width: '100%', padding: 13, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s', letterSpacing: '.04em', marginTop: 0 },
  goBtn:      { background: '#F7C344', color: '#3d2e00' },
  shootBtn:   { background: '#3DD68C', color: '#0d3d22' },
  restartBtn: { background: '#1e2e1e', color: C.text, border: '1.5px solid rgba(255,255,255,0.3)' },
  feedback:   { textAlign: 'center', fontSize: 13, fontWeight: 500, padding: '9px 14px', borderRadius: 8, marginBottom: 10 },
  fb_tackled: { background: 'rgba(232,64,64,.15)', color: '#ff8080', border: '1px solid rgba(232,64,64,.3)' },
  fb_beaten:  { background: 'rgba(247,195,68,.12)', color: '#F7C344', border: '1px solid rgba(247,195,68,.25)' },
  fb_goal:    { background: 'rgba(61,214,140,.12)', color: '#3DD68C', border: '1px solid rgba(61,214,140,.3)' },
  fb_saved:   { background: 'rgba(232,64,64,.12)', color: '#ff8080', border: '1px solid rgba(232,64,64,.25)' },
  duoGrid:    { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 12 },
  duoBox:     { background: '#1e2e1e', border: '1.5px solid rgba(255,255,255,0.28)', borderRadius: 10, padding: 12, textAlign: 'center' },
  duoLbl:     { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 },
  duoScore:   { fontSize: 26, fontWeight: 500 },
  summary:    { background: '#1a281a', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 12 },
  sumRow:     { display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, color: C.muted, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  verdict:    { textAlign: 'center', padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 600, marginBottom: 10 },
};