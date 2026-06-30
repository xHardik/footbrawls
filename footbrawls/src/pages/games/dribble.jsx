import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { awardXP } from '../../lib/xpEngine';
import { getUser } from '../../lib/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { triggerWinConfetti, triggerLossHeartbreaks, autoScrollToResult } from '../../lib/effects.js';

const ROUNDS = 5;
const SEED = 42;
const ZONE_SHORT = ['Far', 'Low L', 'Low R', 'Hi L', 'Hi R', 'Near'];
const ZONE_LABELS = ['Far post', 'Low left', 'Low right', 'High left', 'High right', 'Near post'];

const HISTORY_KEY = 'footbrawls_dribble_history';
const STATS_KEY   = 'footbrawls_dribble_stats';
const DAILY_KEY   = 'footbrawls_dribble';

function getTodayKey() { return new Date().toISOString().split("T")[0]; }

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { played: 0, best: 0, avg: 0, streak: 0 }; }
  catch { return { played: 0, best: 0, avg: 0, streak: 0 }; }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; }
  catch { return {}; }
}

function rand(s, n) {
  const x = Math.sin(s * 9301 + n * 49297 + 233720923) * 10000;
  return x - Math.floor(x);
}

function simBot(seed, who) {
  let w = 0;
  for (let i = 0; i < ROUNDS; i++) if (rand(seed + (who === 'buddy' ? 1 : 2), i) > 0.45) w++;
  return Math.min(ROUNDS, w);
}

// ── FIX: always pick two ADJACENT zones so far-right never wraps to far-left ──
function getGKZones(round) {
  // Pick a start index 0–4 so the pair [z, z+1] is always adjacent, never wraps
  const z1 = Math.floor(rand(SEED + round * 17, 2) * 5); // 0-4
  const z2 = z1 + 1;                                      // always z1+1, max = 5
  return [z1, z2];
}

// Zone X positions inside the goal (6 zones across 138 px starting at 211)
// Each zone is 23 px wide; centre = 211 + i*23 + 11
function zoneScreenX(i) { return 211 + i * 23 + 11; }
function zoneScreenY()  { return 18; } // mid-height of goal bar

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
    gkDiveDir: 0, // -1 left, 0 center, +1 right — for arm draw
  };
}

// ─── Canvas draw helpers ────────────────────────────────────────────────────

function drawField(ctx) {
  const W = 560, H = 320;
  ctx.canvas.width = W; ctx.canvas.height = H;
  // Striped grass
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#4a9e4a' : '#459645';
    ctx.fillRect(i * 94, 0, 94, H);
  }
  // Pitch boundary
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  ctx.strokeRect(150, 10, 260, 300);
  // Goal box fill
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(210, 10, 140, 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  ctx.strokeRect(210, 10, 140, 10);
  // Goal posts
  ctx.fillStyle = '#fff';
  ctx.fillRect(208, 10, 4, 18); ctx.fillRect(348, 10, 4, 18);
  ctx.fillRect(210, 10, 140, 3);
  // Centre arc
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(280, 320, 70, Math.PI, 0); ctx.stroke();
  // Halfway line
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, 210); ctx.lineTo(560, 210); ctx.stroke();
}

function drawGoalZones(ctx, st) {
  const revealed = st.phase === 'shot_result';
  for (let i = 0; i < 6; i++) {
    const x = 211 + i * 23;
    const gkBlocked = st.gkZones.includes(i);
    const isChosen  = st.zonePick === i;

    let bg, stroke, lw;
    if (revealed && gkBlocked && isChosen) {
      // Player chose a blocked zone
      bg = 'rgba(232,64,64,0.55)'; stroke = '#E84040'; lw = 2;
    } else if (revealed && gkBlocked) {
      bg = 'rgba(232,64,64,0.38)'; stroke = '#E84040'; lw = 1.5;
    } else if (isChosen) {
      bg = 'rgba(61,214,140,0.45)'; stroke = '#3DD68C'; lw = 2;
    } else {
      bg = 'rgba(255,255,255,0.08)'; stroke = 'rgba(255,255,255,0.25)'; lw = 0.5;
    }

    ctx.fillStyle = bg; ctx.fillRect(x, 10, 22, 18);
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(x, 10, 22, 18);

    // Zone label
    ctx.fillStyle = revealed && gkBlocked ? '#ffaaaa' : isChosen ? '#3DD68C' : 'rgba(255,255,255,0.75)';
    ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ZONE_SHORT[i], x + 11, 19);
  }
}

// ── FIX: draw GK covering BOTH blocked zones with arms extending to each ──
function drawGK(ctx, st) {
  if (st.gkDiving) {
    // GK body sits between the two blocked zone centres
    const x1 = zoneScreenX(st.gkZones[0]);
    const x2 = zoneScreenX(st.gkZones[1]);
    const midX = (x1 + x2) / 2;
    const bodyY = st.gkDiveY;

    // Draw arms reaching to each blocked zone
    ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(midX, bodyY); ctx.lineTo(x1, bodyY - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX, bodyY); ctx.lineTo(x2, bodyY - 4); ctx.stroke();

    // Body circle
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.arc(midX, bodyY, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(midX, bodyY, 13, 0, Math.PI * 2); ctx.stroke();

    // Gloves at zone endpoints
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x1, bodyY - 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x2, bodyY - 4, 5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#1a1a2e'; ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GK', midX, bodyY);
  } else {
    // Idle — centred in goal
    const x = st.gkX, y = st.gkY;
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'white'; ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GK', x, y - 2);
    // Idle arms out
    ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x - 28, y - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 15, y); ctx.lineTo(x + 28, y - 5); ctx.stroke();
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

function StreakDots({ history, today }) {
  const dots = [];
  const start = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  for (let i = 0; i < 30; i++) {
    const day = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = day.toISOString().split('T')[0];
    const entry = history[key];
    const isToday = key === today;
    let cls = 'dot-empty', label = 'No attempt';
    let xp = 0;
    if (entry) {
      if (entry.completed) {
        cls = 'dot-won';
        xp = entry.xpAwarded ?? entry.xp ?? 0;
        label = `Scored: ${entry.score ?? entry.goals ?? 0}/5 (${xp} XP)`;
      } else {
        cls = 'dot-miss'; label = 'Missed attempt';
      }
    }
    dots.push(
      <div key={key} className={`db-dot ${cls} ${isToday ? 'dot-today' : ''}`}
        title={`${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${label}`}
      >
        {entry && entry.completed && xp > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--green)' }}>{xp}</span>}
      </div>
    );
  }
  return <div className="db-streak-dots">{dots}</div>;
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function DribbleGauntlet() {
  const navigate = useNavigate();
  const user = getUser();
  const canvasRef = useRef(null);
  const stRef = useRef(initState());
  const rafRef = useRef(null);
  const [, forceRender] = useState(0);

  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [stats, setStats] = useState(loadStats);
  const [hasWatchedAd, setHasWatchedAd] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [userXP, setUserXP] = useState(0);
  const [floatingXP, setFloatingXP] = useState(null);
  const [isRaid, setIsRaid] = useState(false);
  const [isVsFriends, setIsVsFriends] = useState(false);

  const today = getTodayKey();

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
    if (!document.getElementById('db-css-injected')) {
      const s = document.createElement('style');
      s.id = 'db-css-injected';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    const u = getUser();
    if (u) setUserXP(u.totalXP || 0);

    let raid = !!localStorage.getItem('active_game_session_id');
    setIsRaid(raid);

    if (raid) {
      setAlreadyPlayed(false);
      setXpAwarded(null);
      const s = stRef.current;
      s.phase = 'rules';
      s.results = [];
      repaint();
      return;
    }

    const dailySave = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    if (dailySave[today] || history[today]) {
      setAlreadyPlayed(true);
      const entry = dailySave[today] || history[today];
      setXpAwarded(entry.xpAwarded ?? entry.xp ?? 0);
      const s = stRef.current;
      s.phase = 'summary';
      const wins = entry.score ?? entry.goals ?? 0;
      s.results = Array(wins).fill({ dribbleWon: true, goal: true })
        .concat(Array(Math.max(0, 5 - wins)).fill({ dribbleWon: false, goal: false }));
      repaint();
    }
  }, [history, today, repaint]);

  const adBreak = (options) => {
    if (window.adBreak) {
      window.adBreak(options);
    } else {
      if (options.beforeAd) options.beforeAd();
      setTimeout(() => {
        if (options.type === 'reward') {
          const ok = window.confirm(`[TEST AD] Watch ad to retake round?`);
          if (ok) { if (options.adViewed) options.adViewed(); }
          else    { if (options.adDismissed) options.adDismissed(); }
        } else {
          if (options.adViewed) options.adViewed();
        }
        if (options.afterAd) options.afterAd();
        if (options.adBreakDone) options.adBreakDone({ showStatus: 'mocked' });
      }, 800);
    }
  };

  const triggerRewardedAdToRetakeRound = () => {
    setIsAdLoading(true);
    adBreak({
      type: 'reward', name: 'dribble-gauntlet-retake',
      beforeAd: () => setIsAdLoading(true),
      afterAd:  () => setIsAdLoading(false),
      adDismissed: () => setIsAdLoading(false),
      adViewed: () => {
        const s = stRef.current;
        if (s.results.length > 0) s.results.pop();
        Object.assign(s, {
          phase: 'dribble', aiDefPick: null, playerPick: null,
          zonePick: null, feedback: null, tackled: false, shotPhase: false,
          playerX: 280, playerY: 255, ballX: 280, ballY: 265,
          gkX: 280, gkY: 42, gkDiveX: 280, gkDiveY: 42, gkDiving: false,
        });
        setHasWatchedAd(true);
        rerender();
      },
      adBreakDone: () => setIsAdLoading(false)
    });
  };

  // Animation helpers
  const animateTo = (tx, ty, dur, cb) => {
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
  };

  const animateBallOnly = (tx, ty, dur, cb) => {
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
  };

  // ── FIX: GK dives to midpoint between the TWO blocked zones ──
  const animateGKDive = (dur, cb) => {
    const s = stRef.current;
    const x1 = zoneScreenX(s.gkZones[0]);
    const x2 = zoneScreenX(s.gkZones[1]);
    const targetX = (x1 + x2) / 2;
    const targetY = 20; // dive up to bar level
    const sx = s.gkX, sy = s.gkY;
    s.gkDiving = true;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 2);
      s.gkDiveX = sx + (targetX - sx) * e;
      s.gkDiveY = sy + (targetY - sy) * e;
      repaint();
      rafRef.current = p < 1 ? requestAnimationFrame(step) : (cb?.(), null);
    }
    rafRef.current = requestAnimationFrame(step);
  };

  const pickDir  = (d) => { const s = stRef.current; if (s.feedback || s.tackled) return; s.playerPick = d; rerender(); };
  const pickZone = (z) => { const s = stRef.current; if (s.phase === 'shot_result') return; s.zonePick = z; rerender(); };

  const dribble = () => {
    const s = stRef.current;
    if (s.playerPick === null || s.feedback) return;
    const ai = Math.floor(rand(SEED + s.round * 7, 3) * 3);
    s.aiDefPick = ai;
    const tackled = ai === s.playerPick;
    const tx = [140, 280, 420][s.playerPick];

    if (tackled) {
      s.feedback = 'tackled'; s.tackled = true; rerender();
      animateTo(tx, s.defY[s.playerPick] + 5, 380, () => {
        s.results = [...s.results, { dribbleWon: false, goal: false }]; rerender();
      });
    } else {
      s.feedback = 'beaten'; s.defBeaten[s.playerPick] = true;
      animateTo(tx, s.defY[s.playerPick] - 40, 380, () => {
        setTimeout(() => {
          s.feedback = null; s.shotPhase = true; s.playerPick = null; rerender();
        }, 250);
      });
    }
  };

  const shoot = () => {
    const s = stRef.current;
    if (s.zonePick === null) return;
    const gkBlocked = s.gkZones.includes(s.zonePick);
    // GK dives to cover its two adjacent zones
    animateGKDive(340, () => {});
    setTimeout(() => {
      animateBallOnly(zoneScreenX(s.zonePick), 15, 420, async () => {
        s.phase = 'shot_result';
        s.feedback = gkBlocked ? 'saved' : 'goal';
        s.results = [...s.results, { dribbleWon: true, goal: !gkBlocked }];
        rerender();
      });
    }, 80);
  };

  const saveStatsAndXP = async (resultsArray) => {
    let calculatedXP = 0, wins = 0;
    resultsArray.forEach(r => {
      if (r.dribbleWon) calculatedXP += 2;
      if (r.goal) { calculatedXP += 3; wins++; }
    });
    let earnedXP = 0;
    let sessionType = null;
    let sessionData = null;
    try {
      if (user?.userId) {
        const res = await awardXP(user.userId, 'dribble_correct', { rawXP: calculatedXP });
        earnedXP = res?.xpAwarded ?? calculatedXP;
        sessionType = res?.sessionType;
        sessionData = res?.session;
      } else { earnedXP = calculatedXP; }
    } catch { earnedXP = calculatedXP; }

    if (sessionType === 'vs_friends') {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="vs-friends-loading" style="position:fixed;inset:0;background:rgba(5,7,15,0.95);backdrop-filter:blur(8px);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;animation:fadeUp 0.3s ease;">
          <div style="font-size:3rem;color:#3DD68C;margin-bottom:16px;text-shadow:0 0 20px rgba(61,214,140,0.4);">MATCH COMPLETE!</div>
          <div style="font-size:1.5rem;color:rgba(255,255,255,0.6);">Loading next act...</div>
        </div>
      `);
      setTimeout(() => {
        const el = document.getElementById('vs-friends-loading');
        if (el) el.remove();
        const uid = getUser()?.userId;
          let userActCount = 0;
          while (sessionData?.scores?.[uid]?.["act" + (userActCount + 1)] !== undefined) { userActCount++; }
          const nextGame = sessionData?.gamesList?.[userActCount + 1];
        if (nextGame) {
          navigate(nextGame.route);
        } else {
          navigate('/vsfriends');
        }
      }, 2500);
    }

    if (isRaid) {
      const activeId = localStorage.getItem('active_game_session_id');
      if (activeId) {
        localStorage.setItem(`raid_completed_act2_${activeId}`, 'true');
      }
    }
    setXpAwarded(earnedXP);
    if (!isRaid) {
      const dailySave = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
      dailySave[today] = { completed: true, xpAwarded: earnedXP, score: wins };
      localStorage.setItem(DAILY_KEY, JSON.stringify(dailySave));
      const hist = loadHistory();
      hist[today] = { completed: true, xpAwarded: earnedXP, score: wins };
      const allEntries = Object.values(hist);
      const newStats = {
        played: allEntries.length,
        best:   Math.max(...allEntries.map(e => e.score ?? 0)),
        avg:    Math.round((allEntries.reduce((s, e) => s + (e.score ?? 0), 0) / allEntries.length) * 10) / 10,
        streak: 0,
      };
      const check = new Date(today + "T00:00:00");
      while (true) {
        const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,"0")}-${String(check.getDate()).padStart(2,"0")}`;
        if (hist[k]) { newStats.streak++; check.setDate(check.getDate() - 1); } else break;
      }
      setStats(newStats);
      setHistory(hist);
      localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    }
  };

  const nextRound = () => {
    const s = stRef.current;
    if (s.results.length >= ROUNDS) {
      s.phase = 'summary'; rerender();
      if (!alreadyPlayed) {
        saveStatsAndXP(s.results);
      }
      
      // Single mode animations & scroll
      const wins = s.results.filter(r => r.goal).length;
      if (!isRaid) {
        if (wins >= 3) {
          triggerWinConfetti();
        } else {
          triggerLossHeartbreaks();
        }
        autoScrollToResult('.db-summary-card', isRaid);
      }
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

  const restart = () => { stRef.current = initState(); setHasWatchedAd(false); rerender(); };

  const s = stRef.current;
  const pw = s.results.filter(r => r.goal).length;
  const rv = Math.min(5, Math.max(0, 5 - pw));
  const yt = pw + botScores.buddy;
  const rt = rv + botScores.rival;
  const w  = yt > rt ? 'you' : yt < rt ? 'rival' : 'draw';

  const feedbackMap = {
    tackled: { cls: 'tackled', icon: '🛡️', text: 'Tackled! Defender read your lane' },
    beaten:  { cls: 'beaten',  icon: '✅', text: 'Defender beaten! Pick your finish zone' },
    goal:    { cls: 'goal',    icon: '⚽', text: 'GOAL! Past the keeper (+3 XP)' },
    saved:   { cls: 'saved',   icon: '🧤', text: 'Saved! GK blocked that zone' },
  };

  const getLiveXP = (results, state) => {
    let xp = 0;
    results.forEach(r => { if (r.dribbleWon) xp += 2; if (r.goal) xp += 3; });
    if ((state.shotPhase || state.phase === 'shot_result') && state.phase !== 'shot_result') xp += 2;
    return xp;
  };

  const liveXPGained = getLiveXP(s.results, s);
  const prevLiveXPRef = useRef(0);
  useEffect(() => { prevLiveXPRef.current = liveXPGained; }, []);
  useEffect(() => {
    const diff = liveXPGained - prevLiveXPRef.current;
    if (diff > 0) setFloatingXP({ text: `+${diff} XP`, key: Math.random() });
    prevLiveXPRef.current = liveXPGained;
  }, [liveXPGained]);
  useEffect(() => {
    if (floatingXP) { const t = setTimeout(() => setFloatingXP(null), 1200); return () => clearTimeout(t); }
  }, [floatingXP]);

  // Blocked zone labels for hint text
  const blockedHint = s.gkZones.map(i => ZONE_SHORT[i]).join(' & ');

  return (
    <div className="db-wrapper">
      <div className="db-page">
        <div className="db-bg2" />
        <div className="db-noise" />

        {/* Modal */}
        {showModal && (
          <div className="db-modal-overlay active" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="db-modal-box">
              <h2 className="db-modal-title">⚽ How to Play</h2>
              <ul className="db-rules-list">
                <li><strong>🛡️ Dribble:</strong> Pick a lane — Left, Center, or Right — to get past the defender</li>
                <li><strong>🥅 Shoot:</strong> Choose one of 6 goal zones to strike. The GK blocks <strong>2 adjacent zones</strong></li>
                <li><strong>🔁 5 Rounds:</strong> Play 5 complete dribble + shoot sequences each game</li>
                <li><strong>📺 Retake:</strong> Tackled or saved? Watch a short ad <strong>once per game</strong> to replay</li>
              </ul>
              {!(isRaid || isVsFriends) && (
                <div className="db-scoring-box">
                  <h3>💰 XP System</h3>
                  <div className="db-scoring-item"><span>Beat the Defender</span><span className="db-scoring-value">+2 XP</span></div>
                  <div className="db-scoring-item"><span>Score a Goal</span><span className="db-scoring-value">+3 XP</span></div>
                  <div className="db-scoring-item"><span>Perfect Game (5/5)</span><span className="db-scoring-value">Bonus XP</span></div>
                </div>
              )}
              <button className="db-modal-close" onClick={() => setShowModal(false)}>🚀 Let's Play!</button>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="db-nav">
          {!(isRaid || isVsFriends) && <button className="db-logo" onClick={() => navigate('/')}>←</button>}
          {isVsFriends ? (
          <div className="db-nav-tag" style={{ background: 'rgba(61,214,140,0.15)', borderColor: '#3DD68C', color: '#3DD68C' }}>
            <span className="db-tag-dot" style={{ background: '#3DD68C', boxShadow: '0 0 8px #3DD68C' }} />
            VS FRIENDS
          </div>
        ) : (
          <div className="db-nav-tag"><span className="db-tag-dot" />Dribble Gauntlet</div>
        )}
          <div className="db-nav-right">
            <button className="db-help-btn" onClick={() => setShowModal(true)}>❓ Help</button>
          </div>
        </nav>

        {/* Main */}
        <div className="db-container">

          {/* Header */}
          <div className="db-page-header">
            <div className="db-header-row">
              <div>
                <h1 className="db-page-title">Dribble Gauntlet</h1>
                <p className="db-page-subtitle">Navigate past defenders · Strike past the keeper</p>
              </div>
              {!(isRaid || isVsFriends) && (
                <div className="db-live-xp-pill">
                  <span className="db-live-xp-icon">🏆</span>
                  <span className="db-live-xp-val">{alreadyPlayed ? xpAwarded : liveXPGained}</span>
                  <span className="db-live-xp-lbl">XP</span>
                  {floatingXP && <span key={floatingXP.key} className="db-xp-float">{floatingXP.text}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="db-game-box">
            {s.phase === 'summary' ? (
              /* ── SUMMARY ── */
              <div className="db-summary-card">
                <span className="db-sum-badge">Session Complete</span>
                <h2 className="db-sum-title" style={{ color: w === 'you' ? 'var(--green)' : w === 'rival' ? 'var(--accent2)' : 'var(--muted)' }}>
                  {w === 'you' ? '🎉 You Won!' : w === 'rival' ? '💥 Rivals Won' : '🤝 Draw'}
                </h2>
                <div className="db-sum-score-row">
                  <div className="db-sum-score-big">{pw}<span>/5</span></div>
                  <div className="db-sum-score-sub">Goals Scored</div>
                </div>

                 {!(isRaid || isVsFriends) && xpAwarded !== null && (
                  <div className="db-sum-xp-badge">
                    {xpAwarded > 0 ? `+${xpAwarded} XP Earned` : 'Daily XP cap reached'}
                  </div>
                )}

                <div className="db-duo-grid">
                  <div className="db-duo-box" style={{ borderColor: w === 'you' ? 'rgba(61,214,140,0.35)' : 'var(--border)' }}>
                    <div className="db-duo-lbl">Your Duo</div>
                    <div className="db-duo-score" style={{ color: 'var(--green)' }}>{yt}</div>
                  </div>
                  <div className="db-duo-vs">vs</div>
                  <div className="db-duo-box" style={{ borderColor: w === 'rival' ? 'rgba(232,64,64,0.35)' : 'var(--border)' }}>
                    <div className="db-duo-lbl">Rivals</div>
                    <div className="db-duo-score" style={{ color: 'var(--accent2)' }}>{rt}</div>
                  </div>
                </div>

                <div className="db-breakdown">
                  {[
                    { label: 'Your goals', val: `${pw}/${ROUNDS}`, color: 'var(--green)' },
                    { label: 'Buddy bot', val: `${botScores.buddy}/${ROUNDS}` },
                    { label: 'Rival player', val: `${rv}/${ROUNDS}` },
                    { label: 'Rival bot', val: `${botScores.rival}/${ROUNDS}` },
                  ].map(r => (
                    <div key={r.label} className="db-breakdown-row">
                      <span>{r.label}</span>
                      <span style={{ fontWeight: 700, color: r.color || '#fff' }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div className="db-summary-actions">
                  {isRaid ? (
                    <button 
                      className="db-action-btn db-btn-go" 
                      onClick={async () => {
                        const activeId = localStorage.getItem('active_game_session_id');
                        if (activeId) {
                          const snap = await getDoc(doc(db, 'gameSessions', activeId));
                          if (snap.exists() && snap.data().sessionType === 'vs_friends') {
                            navigate('/vsfriends');
                            return;
                          }
                        }
                        navigate('/raid');
                      }} 
                      style={{ width: '100%' }}
                    >
                      ⚔️ Return to Lobby
                    </button>
                  ) : (
                    <button className="db-action-btn db-btn-go" onClick={() => navigate('/')} style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), #ffd700)', color: '#060810' }}>← Back to Home</button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* HUD */}
                <div className="db-hud">
                  <div className="db-hud-left">
                    <span className="db-act-label">Act 2 · Standalone</span>
                    <span className="db-game-title">Attack {s.round + 1} / {ROUNDS}</span>
                  </div>
                  <div className="db-pips">
                    {Array.from({ length: ROUNDS }, (_, i) => {
                      const res = s.results[i];
                      let bg = 'rgba(255,255,255,0.08)';
                      if (res) {
                        if (res.goal) bg = 'var(--green)';
                        else if (res.dribbleWon) bg = 'var(--accent)';
                        else bg = 'var(--accent2)';
                      }
                      return <div key={i} className="db-pip" style={{ background: bg }} />;
                    })}
                  </div>
                </div>

                {/* Canvas */}
                <div className="db-canvas-wrapper">
                  <canvas ref={canvasRef} width={560} height={320} className="db-canvas" />
                </div>

                {/* Controls */}
                <div className="db-controls">
                  {/* Feedback banner */}
                  {s.feedback && (
                    <div className={`db-feedback db-fb-${feedbackMap[s.feedback]?.cls}`}>
                      <span className="db-fb-icon">{feedbackMap[s.feedback]?.icon}</span>
                      {feedbackMap[s.feedback]?.text}
                    </div>
                  )}

                  {s.tackled || s.phase === 'shot_result' ? (
                    <div className="db-post-round">
                      {((s.tackled) || (s.phase === 'shot_result' && s.feedback === 'saved')) && !hasWatchedAd && !alreadyPlayed && !isRaid && (
                        <div className="db-ad-box">
                          <div className="db-ad-box-text">Watch a short ad to retake this round</div>
                          <button className="db-ad-go-btn" onClick={triggerRewardedAdToRetakeRound} disabled={isAdLoading}>
                            📺 {isAdLoading ? 'Loading…' : 'Retake Round'}
                          </button>
                        </div>
                      )}
                      <button className="db-action-btn db-btn-next" onClick={nextRound}>
                        {s.results.length >= ROUNDS ? 'See Results →' : 'Next Attack →'}
                      </button>
                    </div>
                  ) : !s.shotPhase ? (
                    /* Dribble phase */
                    <div className="db-phase-block">
                      <div className="db-ctrl-label">
                        <span className="db-phase-badge dribble">Dribble</span>
                        Choose a lane to beat the defender <span className="db-xp-hint">+2 XP</span>
                      </div>
                      <div className="db-btn-row">
                        {[{ label: '← Left', icon: '↙' }, { label: '↑ Center', icon: '↑' }, { label: '→ Right', icon: '↘' }].map((b, i) => (
                          <button
                            key={i}
                            className={`db-dir-btn ${s.playerPick === i ? 'selected' : ''}`}
                            onClick={() => pickDir(i)}
                            disabled={!!s.feedback}
                          >
                            <span className="db-dir-icon">{b.icon}</span>
                            <span className="db-dir-label">{['Left', 'Center', 'Right'][i]}</span>
                          </button>
                        ))}
                      </div>
                      <button className="db-action-btn db-btn-go" onClick={dribble} disabled={s.playerPick === null || !!s.feedback}>
                        Dribble
                      </button>
                    </div>
                  ) : (
                    /* Shot phase */
                    <div className="db-phase-block">
                      <div className="db-ctrl-label">
                        <span className="db-phase-badge shoot">Shoot</span>
                        Pick a goal zone <span className="db-xp-hint">+3 XP</span>
                      </div>
                      <div className="db-finish-grid">
                        {ZONE_LABELS.map((_, i) => (
                          <button
                            key={i}
                            className={`db-fin-btn ${s.zonePick === i ? 'selected' : ''}`}
                            onClick={() => pickZone(i)}
                          >
                            {ZONE_SHORT[i]}
                          </button>
                        ))}
                      </div>
                      <button className="db-action-btn db-btn-shoot" onClick={shoot} disabled={s.zonePick === null}>
                        Shoot
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Dashboard */}
          <div className="db-bottom-section">
            <div className="db-section-div">
              <span className="db-section-label">Your Progress</span>
              <div className="db-section-line" />
            </div>
            <div className="db-dash-grid">
              <div className="db-dash-card">
                <div className="db-dash-hdr">
                  <span className="db-dash-icon">📅</span>
                  <span className="db-dash-lbl">Last 30 Days</span>
                </div>
                <StreakDots history={history} today={today} />
              </div>
              <div className="db-dash-card">
                <div className="db-dash-hdr">
                  <span className="db-dash-icon">📊</span>
                  <span className="db-dash-lbl">Your Stats</span>
                </div>
                <div className="db-stats-grid">
                  {[
                    { val: stats.played ?? 0, name: 'Played' },
                    { val: stats.best ?? 0,   name: 'Best Goals' },
                    { val: stats.avg ?? 0,    name: 'Avg Goals' },
                    { val: stats.streak ?? 0, name: 'Streak' },
                  ].map(item => (
                    <div key={item.name} className="db-stat-item">
                      <div className="db-stat-val">{item.val}</div>
                      <div className="db-stat-name">{item.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Stylesheet ─────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;900&display=swap');

.db-wrapper {
  --bg: #05070f;
  --surface: rgba(255,255,255,0.038);
  --surface2: rgba(255,255,255,0.065);
  --border: rgba(255,255,255,0.08);
  --border2: rgba(255,255,255,0.13);
  --accent: #84CC16;
  --accent2: #E84040;
  --accent3: #84CC16;
  --green: #3DD68C;
  --text: #F0F0F0;
  --muted: rgba(240,240,240,0.45);
  --card-radius: 16px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.db-page {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-family: 'DM Sans', sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* backgrounds */
.db-bg2 { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.db-bg2::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 8% -5%, rgba(132,204,22,0.08) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 95% 105%, rgba(61,214,140,0.06) 0%, transparent 55%);
}
.db-bg2::after {
  content: ''; position: absolute; inset: 0;
  background-image: repeating-linear-gradient(-45deg, transparent, transparent 48px, rgba(255,255,255,0.008) 48px, rgba(255,255,255,0.008) 49px);
}
.db-noise {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

/* nav */
.db-nav {
  position: sticky; top: 0; z-index: 200;
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  padding: 0 24px; height: 58px;
  background: rgba(5,7,15,0.85); backdrop-filter: blur(24px) saturate(1.4);
  border-bottom: 1px solid rgba(132,204,22,0.15);
  box-shadow: 0 4px 20px rgba(132,204,22,0.1);
}
.db-logo {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 2px;
  background: linear-gradient(135deg, var(--accent), #a3e635);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  border: none; cursor: pointer; outline: none; background-color: transparent;
  justify-self: start;
}
.db-nav-tag {
  display: flex; align-items: center; gap: 7px;
  font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;
  color: var(--accent3); background: rgba(132,204,22,0.1);
  border: 1px solid rgba(132,204,22,0.28); padding: 5px 14px; border-radius: 100px;
}
.db-tag-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent3); animation: dbBlink 1.5s ease infinite; }
@keyframes dbBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.db-nav-right { display: flex; align-items: center; justify-content: flex-end; }
.db-help-btn {
  background: var(--surface); border: 1px solid var(--border2); color: #fff;
  padding: 7px 14px; border-radius: 10px; font-size: .78rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
}
.db-help-btn:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.22); }

/* container */
.db-container {
  max-width: 680px; margin: 0 auto;
  padding: 24px 16px 80px; position: relative; z-index: 10;
}

/* header */
.db-page-header { margin-bottom: 18px; }
.db-header-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.db-page-title {
  font-family: 'Bebas Neue', sans-serif; font-size: clamp(1.8rem, 5vw, 2.4rem);
  letter-spacing: 2px; text-transform: uppercase; line-height: 1;
  background: linear-gradient(135deg, var(--accent), #a3e635);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.db-page-subtitle { font-size: 0.78rem; color: var(--muted); margin-top: 4px; }

/* xp pill */
.db-live-xp-pill {
  position: relative; display: flex; align-items: center; gap: 6px;
  background: rgba(132,204,22,0.1); border: 1px solid rgba(132,204,22,0.28);
  padding: 6px 16px; border-radius: 100px; white-space: nowrap; flex-shrink: 0;
}
.db-live-xp-icon { font-size: 0.9rem; }
.db-live-xp-val { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 0.5px; color: var(--accent); }
.db-live-xp-lbl { font-size: 0.62rem; color: var(--muted); font-weight: 700; text-transform: uppercase; }
@keyframes xpFloat {
  0%   { transform: translateY(0) scale(0.8); opacity: 0; }
  20%  { transform: translateY(-10px) scale(1.1); opacity: 1; }
  100% { transform: translateY(-30px) scale(0.9); opacity: 0; }
}
.db-xp-float {
  position: absolute; right: 12px; color: var(--green); font-weight: 900;
  font-size: 1rem; animation: xpFloat 1.2s forwards; pointer-events: none; z-index: 100;
}

/* game box */
.db-game-box {
  background: rgba(255,255,255,0.015); border: 1px solid var(--border);
  border-radius: 20px; padding: 18px;
  backdrop-filter: blur(8px); box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  margin-bottom: 24px;
}

/* hud */
.db-hud { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.db-hud-left { display: flex; flex-direction: column; gap: 2px; }
.db-act-label { font-size: 0.64rem; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; font-weight: 700; }
.db-game-title { font-size: 1.1rem; font-weight: 700; color: var(--text); }
.db-pips { display: flex; gap: 5px; }
.db-pip { width: 26px; height: 5px; border-radius: 3px; transition: background .3s; }

/* canvas */
.db-canvas-wrapper {
  position: relative; border-radius: 14px; overflow: hidden;
  border: 2px solid rgba(255,255,255,0.12);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 15px rgba(132,204,22,0.07);
  margin-bottom: 18px;
}
.db-canvas { display: block; width: 100%; height: auto; }

/* controls */
.db-controls { display: flex; flex-direction: column; gap: 0; }

.db-feedback {
  display: flex; align-items: center; gap: 8px;
  text-align: center; font-size: 0.82rem; font-weight: 700;
  padding: 10px 16px; border-radius: 10px; margin-bottom: 14px;
  text-transform: uppercase; letter-spacing: 0.5px; justify-content: center;
}
.db-fb-icon { font-size: 1rem; }
.db-fb-tackled { background: rgba(232,64,64,0.1); color: #ff8080; border: 1px solid rgba(232,64,64,0.25); }
.db-fb-beaten  { background: rgba(132,204,22,0.1); color: var(--accent); border: 1px solid rgba(132,204,22,0.22); }
.db-fb-goal    { background: rgba(61,214,140,0.1); color: var(--green); border: 1px solid rgba(61,214,140,0.22); }
.db-fb-saved   { background: rgba(232,64,64,0.1); color: #ff8080; border: 1px solid rgba(232,64,64,0.25); }

.db-phase-block { display: flex; flex-direction: column; gap: 12px; }

.db-ctrl-label {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  font-size: 0.75rem; color: var(--muted); font-weight: 600;
}
.db-phase-badge {
  font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
  padding: 3px 10px; border-radius: 100px;
}
.db-phase-badge.dribble { background: rgba(132,204,22,0.15); color: var(--accent); border: 1px solid rgba(132,204,22,0.3); }
.db-phase-badge.shoot   { background: rgba(61,214,140,0.15); color: var(--green); border: 1px solid rgba(61,214,140,0.3); }
.db-xp-hint { color: var(--accent); font-weight: 800; }
.db-gk-hint { margin-left: auto; font-size: 0.7rem; color: var(--muted); }
.db-gk-hint strong { color: #ffb3b3; }

.db-btn-row { display: flex; gap: 8px; }
.db-dir-btn {
  flex: 1; padding: 14px 8px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: rgba(255,255,255,0.02); border: 1px solid var(--border2); border-radius: 12px;
  color: var(--text); cursor: pointer; font-size: 0.8rem; font-weight: 700;
  transition: all .2s;
}
.db-dir-btn:hover:not(:disabled) { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }
.db-dir-btn.selected { border-color: var(--accent); background: rgba(132,204,22,0.12); color: var(--accent); box-shadow: 0 0 12px rgba(132,204,22,0.12); }
.db-dir-icon { font-size: 1.2rem; }
.db-dir-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.5px; }

.db-finish-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.db-fin-btn {
  padding: 13px 6px; background: rgba(255,255,255,0.02); border: 1px solid var(--border2);
  border-radius: 10px; color: var(--text); cursor: pointer; font-size: 0.78rem; font-weight: 700;
  transition: all .2s; text-align: center;
}
.db-fin-btn:hover:not(:disabled) { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }
.db-fin-btn.selected { border-color: var(--green); background: rgba(61,214,140,0.15); color: var(--green); box-shadow: 0 0 12px rgba(61,214,140,0.1); }

.db-action-btn {
  width: 100%; padding: 14px; border: none; border-radius: 12px;
  font-size: 0.9rem; font-weight: 800; cursor: pointer;
  transition: all 0.2s; letter-spacing: .04em; text-transform: uppercase;
  font-family: 'DM Sans', sans-serif;
}
.db-action-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.12); }
.db-action-btn:active:not(:disabled) { transform: translateY(0); }
.db-action-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; filter: none; }
.db-btn-go     { background: linear-gradient(135deg, var(--accent), #a3e635); color: #1a2e05; box-shadow: 0 6px 20px rgba(132,204,22,0.22); }
.db-btn-shoot  { background: linear-gradient(135deg, var(--green), #10b981); color: #062f19; box-shadow: 0 6px 20px rgba(61,214,140,0.22); }
.db-btn-next   { background: rgba(255,255,255,0.05); color: var(--text); border: 1px solid var(--border2); }
.db-btn-next:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }

.db-post-round { display: flex; flex-direction: column; gap: 10px; }

.db-ad-box {
  background: rgba(132,204,22,0.04); border: 1px dashed rgba(132,204,22,0.22);
  padding: 12px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.db-ad-box-text { font-size: 0.76rem; color: var(--muted); }
.db-ad-go-btn {
  background: rgba(255,255,255,0.06); border: 1px solid var(--border2); color: #fff;
  padding: 7px 14px; border-radius: 8px; font-size: 0.74rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
}
.db-ad-go-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.3); }
.db-ad-go-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* summary */
.db-summary-card { text-align: center; padding: 8px 0; }
.db-sum-badge {
  display: inline-block; font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 2px; padding: 4px 12px; border-radius: 100px;
  background: rgba(132,204,22,0.12); color: var(--accent);
  border: 1px solid rgba(132,204,22,0.25); margin-bottom: 14px;
}
.db-sum-title { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 2px; margin-bottom: 12px; }
.db-sum-score-row { margin-bottom: 16px; }
.db-sum-score-big {
  font-family: 'Bebas Neue', sans-serif; font-size: 4rem; letter-spacing: 1px;
  color: var(--green); line-height: 1;
}
.db-sum-score-big span { font-size: 2rem; color: var(--muted); }
.db-sum-score-sub { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
.db-sum-xp-badge {
  display: inline-block; background: rgba(61,214,140,0.12); color: var(--green);
  border: 1px solid rgba(61,214,140,0.28); font-size: 0.8rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 1px; padding: 7px 20px;
  border-radius: 12px; margin-bottom: 22px;
}
.db-duo-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; margin-bottom: 18px; }
.db-duo-box { background: rgba(255,255,255,0.015); border: 1px solid var(--border); border-radius: 12px; padding: 12px; text-align: center; transition: border-color 0.3s; }
.db-sum-xp-lbl { font-size: 0.6rem; color: rgba(240,240,240,0.5); text-transform: uppercase; margin-top: -2px; }

@media (max-width: 600px) {
  .db-container { padding: 12px 6px 80px; }
  .db-game-box { padding: 12px 8px; border-radius: 12px; }
  .db-canvas-wrapper { margin-bottom: 12px; border-radius: 8px; }
  .db-nav { padding: 0 16px; }
}

.db-duo-lbl { font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px; }
.db-duo-score { font-size: 1.8rem; font-weight: 800; font-family: 'Bebas Neue', sans-serif; }
.db-duo-vs { font-size: 0.75rem; color: var(--muted); text-align: center; }
.db-breakdown { background: rgba(255,255,255,0.012); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; margin-bottom: 20px; text-align: left; }
.db-breakdown-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.8rem; color: var(--muted); border-bottom: 1px solid rgba(255,255,255,0.04); }
.db-breakdown-row:last-child { border-bottom: none; }
.db-summary-actions { display: flex; gap: 12px; }
.db-summary-actions .db-action-btn { flex: 1; }

/* modal */
.db-modal-overlay {
  position: fixed; inset: 0; background: rgba(5,7,15,0.88); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000; opacity: 0; pointer-events: none; transition: opacity 0.25s;
}
.db-modal-overlay.active { opacity: 1; pointer-events: auto; }
.db-modal-box {
  background: #0c1020; border: 1px solid rgba(132,204,22,0.22);
  border-radius: 24px; padding: 44px 36px;
  max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto;
  position: relative; animation: dbModalUp 0.32s cubic-bezier(0.4,0,0.2,1);
}
.db-modal-box::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--accent), var(--green), #a3e635);
  border-radius: 24px 24px 0 0;
}
@keyframes dbModalUp { from{opacity:0;transform:translateY(28px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
.db-modal-box::-webkit-scrollbar { width: 5px; }
.db-modal-box::-webkit-scrollbar-thumb { background: rgba(132,204,22,0.3); border-radius: 5px; }
.db-modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 2.3rem; letter-spacing: 2px; text-align: center; margin-bottom: 26px; }
.db-rules-list { list-style: none; margin-bottom: 22px; display: flex; flex-direction: column; gap: 9px; }
.db-rules-list li {
  background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid rgba(132,204,22,0.45); border-radius: 12px;
  padding: 13px 16px; font-size: 0.9rem; line-height: 1.6;
  transition: border-color 0.2s, transform 0.2s;
}
.db-rules-list li:hover { border-left-color: var(--accent); transform: translateX(4px); }
.db-scoring-box {
  background: rgba(255,255,255,0.02); border: 1px solid var(--border);
  border-radius: 16px; padding: 20px; margin-bottom: 28px;
}
.db-scoring-box h3 { font-size: 0.77rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 14px; }
.db-scoring-item { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid var(--border); }
.db-scoring-item:last-child { border-bottom: none; }
.db-scoring-value { font-weight: 700; color: var(--accent); }
.db-modal-close {
  width: 100%; padding: 13px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), #a3e635); color: #1a2e05;
  font-family: 'DM Sans', sans-serif; font-size: 0.92rem; font-weight: 800;
  cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s;
}
.db-modal-close:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(132,204,22,0.4); }

/* bottom dashboard */
.db-bottom-section { margin-top: 8px; }
.db-section-div { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.db-section-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: var(--accent3); white-space: nowrap; }
.db-section-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(132,204,22,0.25), transparent); }
.db-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 560px) { .db-dash-grid { grid-template-columns: 1fr; } }
.db-dash-card {
  background: rgba(255,255,255,0.015); border: 1px solid var(--border);
  border-radius: 16px; padding: 16px; display: flex; flex-direction: column;
}
.db-dash-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.db-dash-icon { font-size: 1rem; }
.db-dash-lbl { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); }

.db-streak-dots {
  display: grid; grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(3, 42px); gap: 3px; margin-bottom: 12px;
}
.db-dot {
  width: 100%; height: 42px; border-radius: 5px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1px;
  transition: transform 0.15s; cursor: default;
}
.db-dot:hover { transform: translateY(-2px); }
.db-dot.dot-empty { background: rgba(255,255,255,0.03); border: 1px solid var(--border); }
.db-dot.dot-won { background: rgba(61,214,140,0.13); border: 1px solid rgba(61,214,140,0.38); }
.db-dot.dot-miss { background: rgba(232,64,64,0.08); border: 1px solid rgba(232,64,64,0.18); }
.db-dot.dot-today { border: 2px solid var(--accent); box-shadow: 0 0 8px rgba(247,195,68,0.2); }

.db-stats-grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; }
.db-stat-item {
  background: rgba(255,255,255,0.012); border: 1px solid var(--border);
  padding: 10px; border-radius: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center;
  transition: border-color 0.2s;
}
.db-stat-item:hover { border-color: rgba(132,204,22,0.2); }
.db-stat-val { font-size: 1.3rem; font-weight: 800; color: var(--accent); margin-bottom: 2px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.5px; }
.db-stat-name { font-size: 0.58rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }

/* responsive */
@media (max-width: 480px) {
  .db-nav { padding: 0 14px; height: 52px; }
  .db-container { padding: 16px 12px 80px; }
  .db-btn-row { gap: 6px; }
  .db-finish-grid { gap: 6px; }
  .db-header-row { flex-wrap: wrap; }
  .db-ad-box { flex-direction: column; text-align: center; }
  .db-summary-actions { flex-direction: column; }
}
`;