import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { awardXP } from '../../lib/xpEngine';
import { getUser } from '../../lib/user';

const ROUNDS = 5;
const SEED = 42;
const ZONE_SHORT = ['Far', 'Low L', 'Low R', 'Hi L', 'Hi R', 'Near'];
const ZONE_LABELS = ['Far post', 'Low left', 'Low right', 'High left', 'High right', 'Near post'];

const HISTORY_KEY = 'footbrawls_dribble_history';
const STATS_KEY   = 'footbrawls_dribble_stats';
const DAILY_KEY   = 'footbrawls_dribble';

function getTodayKey() { return new Date().toISOString().split("T")[0]; }

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || { played: 0, best: 0, avg: 0, streak: 0 };
  } catch {
    return { played: 0, best: 0, avg: 0, streak: 0 };
  }
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  } catch {
    return {};
  }
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
    results: [], // Array of { dribbleWon: boolean, goal: boolean }
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

// ─── StreakDots helper ────────────────

function StreakDots({ history, today }) {
  const dots = [];
  const start = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 30; i++) {
    const day = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = day.toISOString().split('T')[0];
    const entry = history[key];
    const isToday = key === today;

    let cls = 'dot-empty';
    let label = 'No attempt';
    let xp = 0;

    if (entry) {
      if (entry.completed) {
        cls = 'dot-won';
        xp = entry.xpAwarded ?? entry.xp ?? 0;
        label = `Scored: ${entry.score ?? entry.goals ?? 0}/5 (${xp} XP)`;
      } else {
        cls = 'dot-miss';
        label = 'Missed attempt';
      }
    }

    dots.push(
      <div
        key={key}
        className={`db-dot ${cls} ${isToday ? 'dot-today' : ''}`}
        title={`${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${label}`}
      />
    );
  }

  return <div className="db-streak-dots">{dots}</div>;
}

// ─── Main Component ────────────────

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

  useEffect(() => {
    repaint();
  }, [repaint]);

  // Load daily completed save and stats on mount
  useEffect(() => {
    if (!document.getElementById('db-css-injected')) {
      const s = document.createElement('style');
      s.id = 'db-css-injected';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    
    const u = getUser();
    if (u) {
      setUserXP(u.totalXP || 0);
    }
    
    const dailySave = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    if (dailySave[today] || history[today]) {
      setAlreadyPlayed(true);
      const entry = dailySave[today] || history[today];
      setXpAwarded(entry.xpAwarded ?? entry.xp ?? 0);
      
      // Setup state for results summary display
      const s = stRef.current;
      s.phase = 'summary';
      // Reconstruct mock round entries matching their scored goals count
      const wins = entry.score ?? entry.goals ?? 0;
      s.results = Array(wins).fill({ dribbleWon: true, goal: true })
        .concat(Array(Math.max(0, 5 - wins)).fill({ dribbleWon: false, goal: false }));
      repaint();
    }
  }, [history, today, repaint]);

  // Google AdBreak helper
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
      type: 'reward',
      name: 'dribble-gauntlet-retake',
      beforeAd: () => setIsAdLoading(true),
      afterAd: () => setIsAdLoading(false),
      adDismissed: () => setIsAdLoading(false),
      adViewed: () => {
        const s = stRef.current;
        if (s.results.length > 0) {
          s.results.pop();
        }
        
        Object.assign(s, {
          phase: 'dribble',
          aiDefPick: null,
          playerPick: null,
          zonePick: null,
          feedback: null,
          tackled: false,
          shotPhase: false,
          playerX: 280, playerY: 255,
          ballX: 280, ballY: 265,
          gkX: 280, gkY: 42,
          gkDiveX: 280, gkDiveY: 42,
          gkDiving: false,
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

  const animateGKDive = (tx, ty, dur, cb) => {
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
  };

  // Gameplay actions
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
        s.results = [...s.results, { dribbleWon: false, goal: false }];
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
        s.results = [...s.results, { dribbleWon: true, goal: !gkBlocked }];
        rerender();
      });
    }, 80);
  };

  const saveStatsAndXP = async (resultsArray) => {
    // Calculate total XP based on split: 2 XP per successful dribble, 3 XP per goal
    let calculatedXP = 0;
    let wins = 0;
    resultsArray.forEach(r => {
      if (r.dribbleWon) calculatedXP += 2;
      if (r.goal) {
        calculatedXP += 3;
        wins++;
      }
    });

    let earnedXP = 0;
    try {
      if (user?.userId) {
        const res = await awardXP(user.userId, 'dribble_correct', { rawXP: calculatedXP });
        earnedXP = res?.xpAwarded ?? calculatedXP;
      } else {
        earnedXP = calculatedXP;
      }
    } catch (err) {
      console.warn("Failed to award XP:", err);
      earnedXP = calculatedXP;
    }

    setXpAwarded(earnedXP);

    // Save daily completion
    const dailySave = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    dailySave[today] = { completed: true, xpAwarded: earnedXP, score: wins };
    localStorage.setItem(DAILY_KEY, JSON.stringify(dailySave));

    // Update history & stats
    const hist = loadHistory();
    hist[today] = { completed: true, xpAwarded: earnedXP, score: wins };
    const allEntries = Object.values(hist);

    const newStats = {
      played: allEntries.length,
      best:   Math.max(...allEntries.map(e => e.score ?? 0)),
      avg:    Math.round((allEntries.reduce((s, e) => s + (e.score ?? 0), 0) / allEntries.length) * 10) / 10,
      streak: 0,
    };

    // Calculate streak
    const check = new Date(today + "T00:00:00");
    while (true) {
      const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,"0")}-${String(check.getDate()).padStart(2,"0")}`;
      if (hist[k]) {
        newStats.streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }

    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));

    setHistory(hist);
    setStats(newStats);
  };

  const nextRound = () => {
    const s = stRef.current;
    if (s.results.length >= ROUNDS) {
      s.phase = 'summary';
      rerender();
      
      if (!alreadyPlayed) {
        saveStatsAndXP(s.results);
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

  const restart = () => {
    stRef.current = initState();
    setHasWatchedAd(false);
    rerender();
  };

  const s = stRef.current;
  const pw = s.results.filter(r => r.goal).length;
  const rv = Math.min(5, Math.max(0, 5 - pw));
  const yt = pw + botScores.buddy;
  const rt = rv + botScores.rival;
  const w = yt > rt ? 'you' : yt < rt ? 'rival' : 'draw';

  const feedbackMap = {
    tackled: { cls: 'tackled', text: 'Tackled! Defender read your lane' },
    beaten:  { cls: 'beaten',  text: 'Defender beaten! Select finishing zone' },
    goal:    { cls: 'goal',    text: 'GOAL! Past the keeper (+3 XP)' },
    saved:   { cls: 'saved',   text: 'Saved! GK diving blocked you' },
  };

  // Live XP calculations
  const getLiveXPGained = (resultsArray, currentRoundState) => {
    let xp = 0;
    resultsArray.forEach(r => {
      if (r.dribbleWon) xp += 2;
      if (r.goal) xp += 3;
    });
    if (currentRoundState.shotPhase || currentRoundState.phase === 'shot_result') {
      if (currentRoundState.phase !== 'shot_result') {
        xp += 2;
      }
    }
    return xp;
  };

  const liveXPGained = getLiveXPGained(s.results, s);
  const prevLiveXPRef = useRef(0);
  
  // Set initial ref to avoid mount trigger
  useEffect(() => {
    prevLiveXPRef.current = liveXPGained;
  }, []);

  useEffect(() => {
    const diff = liveXPGained - prevLiveXPRef.current;
    if (diff > 0) {
      setFloatingXP({ text: `+${diff} XP`, key: Math.random() });
    }
    prevLiveXPRef.current = liveXPGained;
  }, [liveXPGained]);

  useEffect(() => {
    if (floatingXP) {
      const timer = setTimeout(() => setFloatingXP(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [floatingXP]);

  return (
    <div className="db-wrapper">
      <div className="db-page">
        <div className="db-bg2" />
        <div className="db-noise" />

        {/* Modal */}
        {showModal && (
          <div className="db-modal-overlay active" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="db-modal-box">
              <h2 className="db-modal-title">⚽ Dribble Gauntlet</h2>
              <ul className="db-rules-list">
                <li><span className="db-rule-icon">🏃‍♂️</span><span><strong>Dribble Phase:</strong> Choose a lane (Left, Center, Right) to pass the defender. <strong>Beating them awards 2 XP.</strong></span></li>
                <li><span className="db-rule-icon">🥅</span><span><strong>Goal Phase:</strong> Once beaten, pick one of the 6 goal target zones to strike. <strong>Scoring awards 3 XP.</strong></span></li>
                <li><span className="db-rule-icon">🧤</span><span><strong>Keeper:</strong> Goalkeeper dives to cover 2 random zones. Score past them to make it a perfect attack!</span></li>
                <li><span className="db-rule-icon">📺</span><span><strong>Retake:</strong> If you get tackled or saved, you can watch an ad once per game to retake the round.</span></li>
              </ul>
              <button className="db-modal-close" onClick={() => setShowModal(false)}>Start Attack</button>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="db-nav">
          <button className="db-logo" onClick={() => navigate('/')}>←</button>
          <div className="db-nav-tag">
            <span className="db-tag-dot" />
            Dribble Gauntlet
          </div>
          <div className="db-nav-right">
            <button className="db-help-btn" onClick={() => setShowModal(true)}>❓ Help</button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="db-container">
          
          {/* Header Title with Live XP Pill */}
          <div className="db-page-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
              <div>
                <h1 className="db-page-title">Dribble Gauntlet</h1>
                <p className="db-page-subtitle">Navigate past defenders, strike past goalkeeper</p>
              </div>
              <div className="db-live-xp-pill">
                <span className="db-live-xp-icon">🏆</span>
                <span className="db-live-xp-val">{userXP + liveXPGained}</span>
                <span className="db-live-xp-lbl">XP</span>
                {floatingXP && (
                  <span key={floatingXP.key} className="db-xp-float">
                    {floatingXP.text}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="db-game-box">
            {s.phase === 'summary' ? (
              <div className="db-summary-card">
                <span className="db-sum-badge">Session Done</span>
                <h2 className="db-sum-title" style={{ color: w === 'you' ? 'var(--green)' : w === 'rival' ? 'var(--accent2)' : 'var(--muted)' }}>
                  {w === 'you' ? '🎉 Act 2 Won!' : w === 'rival' ? '💥 Act 2 Lost' : '🤝 Match Draw'}
                </h2>
                <div className="db-sum-score">{pw} Goals Scored</div>
                <p className="db-sum-phrase">
                  You scored {pw} goals and beat defenders in {s.results.filter(r => r.dribbleWon).length} rounds.
                </p>
                
                {xpAwarded !== null && (
                  <div className="db-sum-xp-badge">
                    {xpAwarded > 0 ? `+${xpAwarded} XP Earned` : 'Daily XP limit reached'}
                  </div>
                )}

                <div className="db-duo-grid">
                  <div className="db-duo-box" style={{ borderColor: w === 'you' ? 'rgba(61,214,140,0.3)' : 'var(--border)' }}>
                    <div className="db-duo-lbl">Your Duo</div>
                    <div className="db-duo-score" style={{ color: 'var(--green)' }}>{yt}</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>vs</div>
                  <div className="db-duo-box" style={{ borderColor: w === 'rival' ? 'rgba(232,64,64,0.3)' : 'var(--border)' }}>
                    <div className="db-duo-lbl">Rivals</div>
                    <div className="db-duo-score" style={{ color: 'var(--accent2)' }}>{rt}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.012)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                  {[
                    { label: 'Your goals scored', val: `${pw}/${ROUNDS}`, color: 'var(--green)' },
                    { label: 'Buddy bot goals',   val: `${botScores.buddy}/${ROUNDS}` },
                    { label: 'Rival player goals',val: `${rv}/${ROUNDS}` },
                    { label: 'Rival bot goals',   val: `${botScores.rival}/${ROUNDS}` },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.82rem', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span>{r.label}</span>
                      <span style={{ fontWeight: 700, color: r.color || '#fff' }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="db-action-btn db-btn-next" style={{ flex: 1 }} onClick={() => navigate('/')}>
                    ← Home
                  </button>
                  <button className="db-action-btn db-btn-go" style={{ flex: 1.5 }} onClick={restart}>
                    Play Again
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* HUD */}
                <div className="db-hud">
                  <div className="db-hud-info">
                    <span className="db-act-label">Act 2 · Standalone</span>
                    <span className="db-game-title">Attack {s.round + 1} of {ROUNDS}</span>
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

                {/* Canvas Wrapper */}
                <div className="db-canvas-wrapper">
                  <canvas ref={canvasRef} width={560} height={320} className="db-canvas" />
                </div>

                {/* Controls Area */}
                <div className="db-controls">
                  {s.feedback && (
                    <div className={`db-feedback db-fb-${feedbackMap[s.feedback]?.cls}`}>
                      {feedbackMap[s.feedback]?.text}
                    </div>
                  )}

                  {s.tackled || s.phase === 'shot_result' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {((s.tackled) || (s.phase === 'shot_result' && s.feedback === 'saved')) && !hasWatchedAd && !alreadyPlayed && (
                        <div className="db-ad-box">
                          <p>Tackled or saved? Watch a quick ad to retake this round!</p>
                          <button
                            className="db-ad-go-btn"
                            onClick={triggerRewardedAdToRetakeRound}
                            disabled={isAdLoading}
                          >
                            📺 {isAdLoading ? 'Loading Ad...' : 'Retake Round'}
                          </button>
                        </div>
                      )}
                      
                      <button className="db-action-btn db-btn-next" onClick={nextRound}>
                        Next Attack
                      </button>
                    </div>
                  ) : !s.shotPhase ? (
                    <>
                      <div className="db-ctrl-label">Choose a lane to dribble (+2 XP)</div>
                      <div className="db-btn-row">
                        {['← Left', '↑ Center', '→ Right'].map((lbl, i) => (
                          <button
                            key={i}
                            className={`db-dir-btn ${s.playerPick === i ? 'selected' : ''}`}
                            onClick={() => pickDir(i)}
                            disabled={!!s.feedback}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                      <button
                        className="db-action-btn db-btn-go"
                        onClick={dribble}
                        disabled={s.playerPick === null || !!s.feedback}
                      >
                        Dribble
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="db-ctrl-label">Pick Target Zone to Shoot (+3 XP)</div>
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
                      <button
                        className="db-action-btn db-btn-shoot"
                        onClick={shoot}
                        disabled={s.zonePick === null}
                      >
                        Shoot
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom section */}
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
                    { val: stats.played ?? 0, name: "Played" },
                    { val: stats.best   ?? 0, name: "Best Goals" },
                    { val: stats.avg    ?? 0, name: "Avg Goals" },
                    { val: stats.streak ?? 0, name: "Streak" },
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

// ─── Stylesheet ────────────────
const CSS = `
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
  --orange: #ffa400;
  --text: #F0F0F0;
  --muted: rgba(240,240,240,0.45);
  --muted2: rgba(240,240,240,0.25);
  --card-radius: 16px;
}

.db-page {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  font-family: "Twemoji Country Flags", 'DM Sans', sans-serif;
}

.db-bg2 {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
}
.db-bg2::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 8% -5%, rgba(132, 204, 22, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 95% 105%, rgba(61, 214, 140, 0.06) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(132, 204, 22, 0.03) 0%, transparent 65%);
}
.db-bg2::after {
  content: '';
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(
    -45deg, transparent, transparent 48px,
    rgba(255,255,255,0.008) 48px, rgba(255,255,255,0.008) 49px
  );
}

.db-noise {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

.db-nav {
  position: sticky; top: 0; z-index: 200;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px; height: 62px;
  background: rgba(5, 7, 15, 0.82);
  backdrop-filter: blur(24px) saturate(1.4);
  border-bottom: 1px solid rgba(132, 204, 22, 0.15);
  box-shadow: 0 4px 20px rgba(132, 204, 22, 0.15);
}

.db-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.6rem;
  letter-spacing: 2px;
  background: linear-gradient(135deg, var(--accent), #a3e635);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: none;
  cursor: pointer;
  outline: none;
  background-color: transparent;
}

.db-nav-tag {
  display: flex; align-items: center; gap: 7px;
  font-size: 0.72rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 2px;
  color: var(--accent3);
  background: rgba(132, 204, 22, 0.1);
  border: 1px solid rgba(132, 204, 22, 0.28);
  padding: 5px 14px; border-radius: 100px;
}

.db-tag-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent3); animation: dbBlink 1.5s ease infinite;
}
@keyframes dbBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }

.db-nav-right {
  display: flex; align-items: center; justify-content: flex-end;
}

.db-help-btn {
  background: var(--surface); border: 1px solid var(--border2); color: #fff;
  padding: 8px 14px; border-radius: 10px; font-size: .8rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
}
.db-help-btn:hover {
  background: rgba(255, 255, 255, .08); border-color: rgba(255, 255, 255, .2);
}

.db-container {
  max-width: 680px; margin: 0 auto;
  padding: 24px 16px 80px; position: relative; z-index: 10;
  box-sizing: border-box;
}

.db-page-header {
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding-bottom: 16px;
}
.db-page-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  letter-spacing: 2px;
  background: linear-gradient(135deg, var(--accent), #a3e635);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.1;
  text-transform: uppercase;
}
.db-page-subtitle {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 4px;
}

.db-live-xp-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(132, 204, 22, 0.12);
  border: 1px solid rgba(132, 204, 22, 0.28);
  padding: 6px 16px;
  border-radius: 100px;
  box-shadow: 0 0 15px rgba(132, 204, 22, 0.1);
  margin-bottom: 2px;
}
.db-live-xp-icon {
  font-size: 0.95rem;
}
.db-live-xp-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.25rem;
  letter-spacing: 0.5px;
  color: var(--accent);
}
.db-live-xp-lbl {
  font-size: 0.65rem;
  color: var(--muted);
  font-weight: 700;
  text-transform: uppercase;
}

@keyframes xpFloat {
  0% { transform: translateY(0) scale(0.8); opacity: 0; }
  20% { transform: translateY(-10px) scale(1.1); opacity: 1; }
  100% { transform: translateY(-30px) scale(0.9); opacity: 0; }
}
.db-xp-float {
  position: absolute;
  right: 12px;
  color: var(--green);
  font-weight: 900;
  font-size: 1.05rem;
  animation: xpFloat 1.2s forwards;
  pointer-events: none;
  z-index: 100;
}

.db-game-box {
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border);
  border-radius: 20px; padding: 20px;
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  margin-bottom: 24px;
}

.db-hud {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}

.db-hud-info {
  display: flex; flex-direction: column;
}

.db-act-label {
  font-size: 0.68rem; color: var(--muted);
  text-transform: uppercase; letter-spacing: .08em;
  font-weight: 700; margin-bottom: 2px;
}

.db-game-title {
  font-size: 1.15rem; font-weight: 700; color: var(--text);
}

.db-pips {
  display: flex; gap: 6px;
}
.db-pip {
  width: 24px; height: 5px; border-radius: 3px;
  transition: background .3s;
}

.db-canvas-wrapper {
  position: relative; border-radius: 16px; overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 15px rgba(132, 204, 22, 0.08);
  margin-bottom: 20px;
}

.db-canvas {
  display: block; width: 100%; height: auto;
}

.db-controls {
  display: flex; flex-direction: column;
}

.db-ctrl-label {
  font-size: 0.75rem; color: var(--muted); font-weight: 700;
  margin-bottom: 10px; text-transform: uppercase; letter-spacing: .07em;
  text-align: center;
}

.db-btn-row {
  display: flex; gap: 10px; margin-bottom: 16px;
}

.db-dir-btn {
  flex: 1; padding: 14px 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border2);
  border-radius: 12px; color: var(--text);
  cursor: pointer; font-size: 0.85rem; font-weight: 700;
  transition: all .2s; text-align: center;
}
.db-dir-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.2);
}
.db-dir-btn.selected {
  border-color: var(--accent);
  background: rgba(132, 204, 22, 0.12);
  color: var(--accent);
  box-shadow: 0 0 12px rgba(132, 204, 22, 0.15);
}

.db-finish-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px; margin-bottom: 16px;
}

.db-fin-btn {
  padding: 12px 6px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border2);
  border-radius: 10px; color: var(--text);
  cursor: pointer; font-size: 0.78rem; font-weight: 700;
  transition: all .2s; text-align: center;
}
.db-fin-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.2);
}
.db-fin-btn.selected {
  border-color: var(--green);
  background: rgba(61, 214, 140, 0.15);
  color: var(--green);
  box-shadow: 0 0 12px rgba(61, 214, 140, 0.12);
}

.db-action-btn {
  width: 100%; padding: 14px; border: none; border-radius: 12px;
  font-size: 0.92rem; font-weight: 800; cursor: pointer;
  transition: all 0.2s; letter-spacing: .04em; text-transform: uppercase;
}
.db-action-btn:hover:not(:disabled) {
  transform: translateY(-2px); filter: brightness(1.15);
}
.db-action-btn:active:not(:disabled) {
  transform: translateY(0);
}
.db-action-btn:disabled {
  opacity: 0.5; cursor: not-allowed; transform: none;
}

.db-btn-go {
  background: linear-gradient(135deg, var(--accent), #a3e635);
  color: #1a2e05;
  box-shadow: 0 6px 20px rgba(132, 204, 22, 0.25);
}
.db-btn-shoot {
  background: linear-gradient(135deg, var(--green), #10b981);
  color: #062f19;
  box-shadow: 0 6px 20px rgba(61, 214, 140, 0.25);
}
.db-btn-next {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text); border: 1px solid var(--border2);
}
.db-btn-next:hover {
  background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.3);
}

.db-feedback {
  text-align: center; font-size: 0.82rem; font-weight: 700;
  padding: 10px 14px; border-radius: 10px; margin-bottom: 12px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.db-fb-tackled {
  background: rgba(232, 64, 64, 0.12); color: #ff8080;
  border: 1px solid rgba(232, 64, 64, 0.25);
}
.db-fb-beaten {
  background: rgba(132, 204, 22, 0.1); color: var(--accent);
  border: 1px solid rgba(132, 204, 22, 0.22);
}
.db-fb-goal {
  background: rgba(61, 214, 140, 0.1); color: var(--green);
  border: 1px solid rgba(61, 214, 140, 0.22);
}
.db-fb-saved {
  background: rgba(232, 64, 64, 0.12); color: #ff8080;
  border: 1px solid rgba(232, 64, 64, 0.25);
}

.db-summary-card {
  text-align: center; padding: 16px 8px;
}
.db-sum-badge {
  display: inline-block; font-size: 0.65rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 2px;
  padding: 5px 12px; border-radius: 100px;
  background: rgba(132, 204, 22, 0.12); color: var(--accent);
  border: 1px solid rgba(132, 204, 22, 0.25); margin-bottom: 16px;
}
.db-sum-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem;
  letter-spacing: 2px; margin-bottom: 6px;
}
.db-sum-score {
  font-size: 2.4rem; font-weight: 900; margin: 12px 0;
  font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px;
}
.db-sum-phrase {
  font-size: 0.85rem; color: var(--muted); margin-bottom: 24px;
}
.db-sum-xp-badge {
  background: rgba(61, 214, 140, 0.12); color: var(--green);
  border: 1px solid rgba(61, 214, 140, 0.28);
  font-size: 0.82rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; padding: 8px 20px; border-radius: 12px;
  display: inline-block; margin-bottom: 28px;
}

.db-duo-grid {
  display: grid; grid-template-columns: 1fr auto 1fr;
  gap: 12px; align-items: center; margin-bottom: 20px;
}
.db-duo-box {
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border);
  border-radius: 12px; padding: 12px; text-align: center;
}
.db-duo-lbl {
  font-size: 0.65rem; color: var(--muted); text-transform: uppercase;
  letter-spacing: 1px; font-weight: 700; margin-bottom: 4px;
}
.db-duo-score {
  font-size: 1.6rem; font-weight: 800;
}

.db-modal-overlay {
  position: fixed; inset: 0; background: rgba(5, 7, 15, 0.88);
  backdrop-filter: blur(8px); display: flex; align-items: center;
  justify-content: center; z-index: 10000; opacity: 0;
  pointer-events: none; transition: opacity 0.3s ease;
}
.db-modal-overlay.active {
  opacity: 1; pointer-events: auto;
}
.db-modal-box {
  background: #080c1a; border: 1px solid var(--border2);
  padding: 32px; border-radius: 20px; max-width: 440px; width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6); text-align: center;
}
.db-modal-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem;
  letter-spacing: 2px; margin-bottom: 24px; color: var(--accent);
}
.db-rules-list {
  text-align: left; margin-bottom: 28px;
  display: flex; flex-direction: column; gap: 14px;
  list-style: none;
}
.db-rules-list li {
  display: flex; align-items: flex-start; gap: 12px;
  font-size: 0.88rem; color: var(--muted);
}
.db-rule-icon {
  font-size: 1.1rem; line-height: 1;
}
.db-rules-list strong {
  color: #fff;
}
.db-modal-close {
  background: linear-gradient(135deg, var(--accent), #a3e635);
  color: #1a2e05; border: none; padding: 12px 32px; border-radius: 12px;
  font-size: 0.95rem; font-weight: 800; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 6px 20px rgba(132, 204, 22, 0.25);
  text-transform: uppercase;
}
.db-modal-close:hover {
  transform: translateY(-2px); box-shadow: 0 10px 24px rgba(132, 204, 22, 0.35);
}

.db-bottom-section {
  margin-top: 24px;
}
.db-section-div {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}
.db-section-label {
  font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 2px; color: var(--accent3); white-space: nowrap;
}
.db-section-line {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, rgba(132, 204, 22, 0.25) 0%, transparent 100%);
}

.db-dash-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
@media (max-width: 600px) {
  .db-dash-grid { grid-template-columns: 1fr; }
}

.db-dash-card {
  background: rgba(255, 255, 255, 0.015); border: 1px solid var(--border);
  border-radius: 16px; padding: 16px; display: flex; flex-direction: column;
}
.db-dash-hdr {
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
}
.db-dash-icon {
  font-size: 1.1rem;
}
.db-dash-lbl {
  font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--muted);
}

.db-streak-dots {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 4px;
}
.db-dot {
  aspect-ratio: 1; border-radius: 6px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border);
  transition: all 0.25s;
}
.db-dot.dot-empty {
  background: rgba(255, 255, 255, 0.02);
}
.db-dot.dot-won {
  background: var(--green); border-color: rgba(61, 214, 140, 0.4);
  box-shadow: 0 0 8px rgba(61, 214, 140, 0.15);
}
.db-dot.dot-miss {
  background: var(--accent2); border-color: rgba(232, 64, 64, 0.4);
}
.db-dot.dot-today {
  border: 1.5px solid var(--accent); position: relative;
  animation: dbTodayPulse 2s ease infinite;
}
@keyframes dbTodayPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

.db-stats-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.db-stat-item {
  background: rgba(255, 255, 255, 0.012); border: 1px solid var(--border);
  padding: 10px; border-radius: 10px; text-align: center;
}
.db-stat-val {
  font-size: 1.2rem; font-weight: 800; color: var(--text); margin-bottom: 2px;
}
.db-stat-name {
  font-size: 0.6rem; color: var(--muted); text-transform: uppercase;
  letter-spacing: 1px; font-weight: 700;
}

.db-ad-box {
  background: rgba(132, 204, 22, 0.04); border: 1px dashed rgba(132, 204, 22, 0.25);
  padding: 12px; border-radius: 12px; text-align: center;
  font-size: 0.78rem; color: var(--muted); margin: 12px 0;
}
.db-ad-go-btn {
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border2);
  color: #fff; padding: 6px 14px; border-radius: 8px;
  font-size: 0.75rem; font-weight: 700; cursor: pointer;
  transition: all 0.2s; margin-top: 8px;
}
.db-ad-go-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3);
}
`;