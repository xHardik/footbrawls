import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { awardXP } from '../../lib/xpEngine';
import { getUser } from '../../lib/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { triggerWinConfetti, triggerLossHeartbreaks, autoScrollToResult } from '../../lib/effects.js';
import RewardedAd from '../../components/RewardedAd';

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


function getGKZones(round) {
  
  const z1 = Math.floor(rand(SEED + round * 17, 2) * 5); 
  const z2 = z1 + 1;                                      
  return [z1, z2];
}



function zoneScreenX(i) { return 211 + i * 23 + 11; }
function zoneScreenY()  { return 18; } 

function drawShadow(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrowdAndLights(ctx, t) {
  const H = 320;
  [[0, 150], [410, 560]].forEach(([sx, ex]) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1c2733');
    grad.addColorStop(1, '#0d141c');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, 0, ex - sx, H);
    ctx.save();
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 6; col++) {
        const px = sx + 8 + col * ((ex - sx - 16) / 5);
        const py = 6 + row * 30 + (col % 2 === 0 ? 4 : 0);
        const flicker = 0.35 + 0.3 * Math.abs(Math.sin(t / 900 + px * 0.13 + py * 0.07));
        ctx.globalAlpha = flicker;
        ctx.fillStyle = '#ffe1aa';
        ctx.fillRect(px, py, 3, 3);
      }
    }
    ctx.restore();
  });
  [80, 480].forEach(fx => {
    const glow = ctx.createRadialGradient(fx, 0, 0, fx, 0, 130);
    glow.addColorStop(0, 'rgba(255,250,220,0.32)');
    glow.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(fx - 130, 0, 260, 160);
  });
}

function drawGoalNet(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.6;
  for (let x = 205; x <= 355; x += 8) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 10); ctx.stroke();
  }
  for (let y = 0; y <= 10; y += 4) {
    ctx.beginPath(); ctx.moveTo(205, y); ctx.lineTo(355, y); ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws a stylized human player figure: boots + legs, shorts, arms, jersey torso,
 * and a head, so each figure reads as an actual person on the pitch rather than
 * a labeled blob. (x, y) is the torso anchor point.
 */
function drawFigure(ctx, x, y, o) {
  const stride = o.stride || 0;
  const armSwing = o.armSwing || 0;

  // legs + boots
  ctx.strokeStyle = '#161616'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 4, y + 2); ctx.lineTo(x - 4 + stride, y + 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 4, y + 2); ctx.lineTo(x + 4 - stride, y + 16); ctx.stroke();
  ctx.fillStyle = '#101010';
  ctx.beginPath(); ctx.ellipse(x - 4 + stride, y + 17.5, 3.6, 2, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 4 - stride, y + 17.5, 3.6, 2, -0.2, 0, Math.PI * 2); ctx.fill();

  // shorts
  ctx.fillStyle = o.shorts;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 4); ctx.lineTo(x + 8, y - 4);
  ctx.lineTo(x + 6, y + 4); ctx.lineTo(x - 6, y + 4);
  ctx.closePath(); ctx.fill();

  // arms
  ctx.strokeStyle = o.jersey; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 9, y - 12); ctx.lineTo(x - 13 + armSwing, y - 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 9, y - 12); ctx.lineTo(x + 13 - armSwing, y - 1); ctx.stroke();
  ctx.fillStyle = o.skin;
  ctx.beginPath(); ctx.arc(x - 13 + armSwing, y - 1, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 13 - armSwing, y - 1, 2.4, 0, Math.PI * 2); ctx.fill();

  // torso / jersey
  ctx.fillStyle = o.jersey;
  roundRect(ctx, x - 10, y - 16, 20, 14, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
  roundRect(ctx, x - 10, y - 16, 20, 14, 5); ctx.stroke();
  if (o.number) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.number, x, y - 9);
  }

  // neck + head
  ctx.fillStyle = o.skin;
  ctx.fillRect(x - 2, y - 18, 4, 4);
  ctx.beginPath(); ctx.arc(x, y - 22, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = o.hair;
  ctx.beginPath(); ctx.arc(x, y - 24, 6.2, Math.PI, 0); ctx.fill();
  if (o.cap) {
    ctx.fillStyle = o.jersey;
    ctx.beginPath(); ctx.arc(x, y - 24.5, 6.6, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  }
}

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
    gkDiveDir: 0,
    animClock: 0,
    ballTrail: [],
    ballRot: 0,
    playerMoving: false,
  };
}



function drawField(ctx, t) {
  const W = 560, H = 320;
  ctx.canvas.width = W; ctx.canvas.height = H;

  drawCrowdAndLights(ctx, t || 0);

  ctx.fillStyle = '#3f8f3f'; ctx.fillRect(150, 0, 260, H);
  const stripeW = 260 / 6;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#4a9e4a' : '#459645';
    ctx.fillRect(150 + i * stripeW, 0, stripeW, H);
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
  ctx.beginPath(); ctx.moveTo(150, 210); ctx.lineTo(410, 210); ctx.stroke();

  const vg = ctx.createRadialGradient(280, 190, 60, 280, 190, 260);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.24)');
  ctx.fillStyle = vg;
  ctx.fillRect(150, 0, 260, H);
}

function drawGoalZones(ctx, st) {
  drawGoalNet(ctx);
  const revealed = st.phase === 'shot_result';
  for (let i = 0; i < 6; i++) {
    const x = 211 + i * 23;
    const gkBlocked = st.gkZones.includes(i);
    const isChosen  = st.zonePick === i;

    let bg, stroke, lw;
    if (revealed && gkBlocked && isChosen) {
      
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

    
    ctx.fillStyle = revealed && gkBlocked ? '#ffaaaa' : isChosen ? '#3DD68C' : 'rgba(255,255,255,0.75)';
    ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ZONE_SHORT[i], x + 11, 19);
  }
}


function drawGK(ctx, st) {
  const t = st.animClock || 0;
  if (st.gkDiving) {
    
    const x1 = zoneScreenX(st.gkZones[0]);
    const x2 = zoneScreenX(st.gkZones[1]);
    const midX = (x1 + x2) / 2;
    const bodyY = st.gkDiveY;

    drawShadow(ctx, midX, 30, 16, 4);
    
    ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(midX, bodyY); ctx.lineTo(x1, bodyY - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX, bodyY); ctx.lineTo(x2, bodyY - 4); ctx.stroke();

    
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.arc(midX, bodyY, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(midX, bodyY, 13, 0, Math.PI * 2); ctx.stroke();

    
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x1, bodyY - 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x2, bodyY - 4, 5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#1a1a2e'; ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GK', midX, bodyY);
  } else {
    
    const sway = Math.sin(t / 600) * 3;
    const x = st.gkX + sway, y = st.gkY;
    drawShadow(ctx, x, y + 15, 13, 4);
    const breathe = Math.sin(t / 700) * 1;
    drawFigure(ctx, x, y + breathe, {
      jersey: '#ff9f1c', shorts: '#2b1a00', skin: '#e8b48c', hair: '#111',
      number: 'GK', cap: true, armSwing: Math.sin(t / 600) * 3,
    });
  }
}

function drawDefender(ctx, x, y, beaten, isAI, t) {
  t = t || 0;
  const bob = beaten ? 0 : Math.sin(t / 480 + x) * 1.4;
  y = y + bob;
  drawShadow(ctx, x, y + 18, 16, 5);
  const lane = x < 200 ? 'L' : x > 360 ? 'R' : 'C';

  if (beaten) {
    ctx.save(); ctx.globalAlpha = 0.4;
    drawFigure(ctx, x, y, {
      jersey: '#E84040', shorts: '#2b0d0d', skin: '#c99', hair: 'rgba(30,20,15,0.4)', number: lane,
    });
    ctx.restore();
    ctx.fillStyle = 'rgba(61,214,140,0.22)';
    ctx.beginPath(); ctx.arc(x, y - 8, 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3DD68C'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 8, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#3DD68C'; ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✓', x, y - 8);
    return;
  }

  if (isAI) {
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#E84040';
    ctx.beginPath(); ctx.arc(x, y - 8, 25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  drawFigure(ctx, x, y, {
    jersey: '#E84040', shorts: '#2b0d0d', skin: '#dba374', hair: '#161616', number: lane,
    armSwing: Math.sin(t / 480 + x) * 2,
  });
}

function drawPlayer(ctx, x, y, t, moving) {
  t = t || 0;
  drawShadow(ctx, x, y + 18, 15, 5);
  const stride = moving ? Math.sin(t / 65) * 11 : Math.sin(t / 550) * 1.5;
  const armSwing = moving ? Math.sin(t / 65 + Math.PI) * 7 : Math.sin(t / 550) * 1;
  drawFigure(ctx, x, y, {
    jersey: '#4A90E2', shorts: '#182a42', skin: '#e8b48c', hair: '#2b1b12',
    number: '9', stride, armSwing,
  });
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('YOU', x, y + 28);
}

function drawBall(ctx, x, y, rot) {
  drawShadow(ctx, x, y + 9, 7, 2.5);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(-3, -5); ctx.bezierCurveTo(0, -2, 3, -5, 3, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3, 5); ctx.bezierCurveTo(0, 2, 3, 5, 3, 0); ctx.stroke();
  ctx.restore();
}

function drawBallTrail(ctx, trail) {
  trail.forEach((p, i) => {
    ctx.save();
    ctx.globalAlpha = ((i + 1) / (trail.length + 1)) * 0.32;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

function drawScene(ctx, st) {
  const t = st.animClock || 0;
  drawField(ctx, t);
  if (st.shotPhase || st.phase === 'shot_result') drawGoalZones(ctx, st);
  drawGK(ctx, st);
  st.defX.forEach((x, i) =>
    drawDefender(ctx, x, st.defY[i], st.defBeaten[i],
      st.aiDefPick === i && st.feedback === 'tackled', t));
  drawPlayer(ctx, st.playerX, st.playerY, t, !!st.playerMoving);
  if (st.ballTrail && st.ballTrail.length) drawBallTrail(ctx, st.ballTrail);
  drawBall(ctx, st.ballX, st.ballY, st.ballRot || 0);
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
  const [isAdOpen, setIsAdOpen] = useState(false);
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

  const [fx, setFx] = useState(null);
  useEffect(() => {
    let raf;
    const loop = (t) => {
      stRef.current.animClock = t;
      repaint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [repaint]);

  useEffect(() => {
    if (!document.getElementById('db-css-injected')) {
      const s = document.createElement('style');
      s.id = 'db-css-injected';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    const u = getUser();
    if (u) setUserXP(u.totalXP || 0);

    let isRaidSession = !!localStorage.getItem('active_game_session_id');
    let isVsFriendsSession = !!localStorage.getItem('active_vs_friends_session_id');
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {
      setAlreadyPlayed(false);
      setXpAwarded(null);
      const s = stRef.current;
      s.phase = 'dribble';
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

  const triggerRewardedAdToRetakeRound = () => {
    setIsAdLoading(true);
    setIsAdOpen(true);
  };

  const handleAdComplete = () => {
    setIsAdOpen(false);
    setIsAdLoading(false);
    const s = stRef.current;
    if (s.results.length > 0) s.results.pop();
    Object.assign(s, {
      phase: 'dribble', aiDefPick: null, playerPick: null,
      zonePick: null, feedback: null, tackled: false, shotPhase: false,
      playerX: 280, playerY: 255, ballX: 280, ballY: 265,
      gkX: 280, gkY: 42, gkDiveX: 280, gkDiveY: 42, gkDiving: false,
      ballTrail: [], ballRot: 0, playerMoving: false,
    });
    setHasWatchedAd(true);
    rerender();
  };

  const handleAdError = () => {
    setIsAdOpen(false);
    setIsAdLoading(false);
  };

  
  const animateTo = (tx, ty, dur, cb) => {
    const s = stRef.current;
    const sx = s.ballX, sy = s.ballY, spx = s.playerX, spy = s.playerY;
    const start = performance.now();
    s.playerMoving = true;
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const nx = sx + (tx - sx) * e, ny = sy + (ty - sy) * e;
      s.ballRot = (s.ballRot || 0) + Math.hypot(nx - s.ballX, ny - s.ballY) * 0.15;
      s.ballTrail = [...(s.ballTrail || []).slice(-4), { x: s.ballX, y: s.ballY }];
      s.ballX = nx; s.ballY = ny;
      s.playerX = spx + (tx - spx) * e; s.playerY = spy + (ty - spy) * e;
      repaint();
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        s.playerMoving = false; s.ballTrail = []; rafRef.current = null; cb?.();
      }
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
      const nx = sx + (tx - sx) * e, ny = sy + (ty - sy) * e;
      s.ballRot = (s.ballRot || 0) + Math.hypot(nx - s.ballX, ny - s.ballY) * 0.15;
      s.ballTrail = [...(s.ballTrail || []).slice(-4), { x: s.ballX, y: s.ballY }];
      s.ballX = nx; s.ballY = ny;
      repaint();
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        s.ballTrail = []; rafRef.current = null; cb?.();
      }
    }
    rafRef.current = requestAnimationFrame(step);
  };

  
  const animateGKDive = (dur, cb) => {
    const s = stRef.current;
    const x1 = zoneScreenX(s.gkZones[0]);
    const x2 = zoneScreenX(s.gkZones[1]);
    const targetX = (x1 + x2) / 2;
    const targetY = 20; 
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
        setFx('shake'); setTimeout(() => setFx(null), 420);
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
    
    animateGKDive(340, () => {});
    setTimeout(() => {
      animateBallOnly(zoneScreenX(s.zonePick), 15, 420, async () => {
        s.phase = 'shot_result';
        s.feedback = gkBlocked ? 'saved' : 'goal';
        s.results = [...s.results, { dribbleWon: true, goal: !gkBlocked }];
        rerender();
        setFx(gkBlocked ? 'shake' : 'goal');
        setTimeout(() => setFx(null), gkBlocked ? 420 : 700);
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
    let sessionData = null; let nextActVal = null;
    try {
      if (user?.userId) {
        const res = await awardXP(user.userId, 'dribble_correct', { rawXP: calculatedXP });
        earnedXP = res?.xpAwarded ?? calculatedXP;
        sessionType = res?.sessionType;
        sessionData = res?.session; nextActVal = res?.nextAct;
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
        const nextGame = sessionData?.gamesList?.[nextActVal - 1];
        if (nextGame) {
          navigate(nextGame.route);
        } else {
          navigate('/vs-friends');
        }
      }, 2500);
    }

    if (isRaid) {
      const activeId = localStorage.getItem('active_game_session_id');
      if (activeId) {
        localStorage.setItem(`raid_completed_act2_${activeId}`, 'true');
      }
      setTimeout(() => {
        navigate('/raid');
      }, 2000);
    }
    setXpAwarded(earnedXP);
    if (!(isRaid || isVsFriends)) {
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
      
      
      const wins = s.results.filter(r => r.goal).length;
      if (!(isRaid || isVsFriends)) {
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
      ballTrail: [], ballRot: 0, playerMoving: false,
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

  
  const blockedHint = s.gkZones.map(i => ZONE_SHORT[i]).join(' & ');

  return (
    <div className="db-wrapper">
      <RewardedAd isOpen={isAdOpen} onComplete={handleAdComplete} onError={handleAdError} onClose={handleAdError} />
      <div className="db-page">
        <div className="db-bg2" />
        <div className="db-noise" />

        
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

        
        <nav className="db-nav">
          {!(isRaid || isVsFriends) ? <button className="db-logo" onClick={() => navigate('/')}>←</button> : <div style={{width:32}}></div>}
          {isVsFriends ? (
          <div className="db-nav-tag" style={{ background: 'rgba(61,214,140,0.15)', borderColor: '#3DD68C', color: '#3DD68C' }}>
            <span className="db-tag-dot" style={{ background: '#3DD68C', boxShadow: '0 0 8px #3DD68C' }} />
            VS FRIENDS
          </div>
        ) : isRaid ? (
          <div className="db-nav-tag" style={{ background: 'rgba(168,85,247,0.15)', borderColor: '#a855f7', color: '#a855f7' }}>
            <span className="db-tag-dot" style={{ background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
            RAID
          </div>
        ) : (
          <div className="db-nav-tag"><span className="db-tag-dot" />Dribble Gauntlet</div>
        )}
          <div className="db-nav-right">
            <button className="db-help-btn" onClick={() => setShowModal(true)}>❓ Help</button>
          </div>
        </nav>

        
        <div className="db-container">

          
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
                    <div style={{color:'var(--muted)', fontSize:'0.9rem', textAlign:'center', marginTop:16}}>
                      {isVsFriends ? "Loading next act..." : "Returning to Raid..."}
                    </div>
                  ) : (
                    <button className="db-action-btn db-btn-go" onClick={() => navigate('/')} style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), #ffd700)', color: '#060810' }}>← Back to Home</button>
                  )}
                </div>
              </div>
            ) : (
              <>
                
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

                
                <div className={`db-canvas-wrapper ${fx ? `fx-${fx}` : ''}`}>
                  <canvas ref={canvasRef} width={560} height={320} className="db-canvas" />
                </div>

                
                <div className="db-controls">
                  
                  {s.feedback && (
                    <div className={`db-feedback db-fb-${feedbackMap[s.feedback]?.cls}`}>
                      <span className="db-fb-icon">{feedbackMap[s.feedback]?.icon}</span>
                      {feedbackMap[s.feedback]?.text}
                    </div>
                  )}

                  {s.tackled || s.phase === 'shot_result' ? (
                    <div className="db-post-round">
                      {((s.tackled) || (s.phase === 'shot_result' && s.feedback === 'saved')) && !hasWatchedAd && !alreadyPlayed && !(isRaid || isVsFriends) && (
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

@keyframes dbShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px) rotate(-0.3deg); }
  40% { transform: translateX(5px) rotate(0.3deg); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(3px); }
}
.fx-shake { animation: dbShake 0.42s ease; }

@keyframes dbGoalFlash {
  0% { box-shadow: 0 0 0 0 rgba(61,214,140,0.65), 0 8px 32px rgba(0,0,0,0.4); }
  40% { box-shadow: 0 0 46px 12px rgba(61,214,140,0.55), 0 8px 32px rgba(0,0,0,0.4); }
  100% { box-shadow: 0 0 0 0 rgba(61,214,140,0), 0 8px 32px rgba(0,0,0,0.4); }
}
.fx-goal { animation: dbGoalFlash 0.7s ease; }

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
  .db-container { padding: 0px 0px 120px; }
  .db-game-box { padding: 12px 0px; border-radius: 0px; border: none; }
  .db-canvas-wrapper { margin-bottom: 12px; border-radius: 0px; border-left: none; border-right: none; }
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