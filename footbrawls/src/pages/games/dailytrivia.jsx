// src/pages/games/dailytrivia.jsx
// Football "Daily Trivia" — Footbrawls edition
// One 10-question quiz per day, seeded by date. Includes streak tracking,
// XP integration, AdBreak midrolls, and category scoring breakdown.
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivePuzzleDate } from '../../lib/dailySeed.js';
import { awardXP } from '../../lib/xpEngine.js';
import { getUser } from '../../lib/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { TRIVIA_QUESTIONS } from '../../lib/questions.js';
import { triggerWinConfetti, triggerLossHeartbreaks, autoScrollToResult } from '../../lib/effects.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const QUESTIONS_PER_DAY = 10;
const SECONDS_PER_Q     = 20;
const SAVE_KEY          = 'footbrawls_dailytrivia';
const STATS_KEY         = 'footbrawls_dailytrivia_stats';
const HISTORY_KEY       = 'footbrawls_dailytrivia_history';

function getMultiplier(consecutive) {
  if (consecutive <= 1) return 1.0;
  if (consecutive === 2) return 1.2;
  if (consecutive === 3) return 1.5;
  if (consecutive === 4) return 1.8;
  if (consecutive === 5) return 2.0;
  if (consecutive === 6) return 2.5;
  return 3.0; // 7+ capped
}

function getMaxPossibleScore(count) {
  let total = 0;
  for (let i = 1; i <= count; i++) {
    total += 1000 * getMultiplier(i);
  }
  return total;
}

function calculateXP(score, maxScore) {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 25;
  if (pct >= 70) return 22;
  if (pct >= 50) return 18;
  if (pct >= 30) return 12;
  if (pct >= 15) return 8;
  return 5;
}

const CATEGORY_META = {
  history:   { label: 'History',   icon: '🏆', color: '#F7C344', bg: 'rgba(247,195,68,.12)',  border: 'rgba(247,195,68,.3)'  },
  transfer:  { label: 'Transfers', icon: '💸', color: '#4F8EF7', bg: 'rgba(79,142,247,.12)',  border: 'rgba(79,142,247,.3)'  },
  records:   { label: 'Records',   icon: '📊', color: '#3DD68C', bg: 'rgba(61,214,140,.12)',  border: 'rgba(61,214,140,.3)'  },
  tactics:   { label: 'Tactics',   icon: '🧠', color: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.3)'  },
  players:   { label: 'Players',   icon: '⚽', color: '#E84040', bg: 'rgba(232,64,64,.12)',   border: 'rgba(232,64,64,.3)'   },
  stadiums:  { label: 'Stadiums',  icon: '🏟️', color: '#a78bfa', bg: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.3)' },
  managers:  { label: 'Managers',  icon: '🧥', color: '#22d3ee', bg: 'rgba(34,211,238,.12)',  border: 'rgba(34,211,238,.3)'  },
  rules:     { label: 'Rules',     icon: '📋', color: '#f472b6', bg: 'rgba(244,114,182,.12)', border: 'rgba(244,114,182,.3)' },
};

// ─── AdBreak shim ─────────────────────────────────────────────────────────────
const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    console.log('[AdSense H5 Mock] adBreak:', options.name);
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.adViewed)    options.adViewed();
      if (options.afterAd)     options.afterAd();
      if (options.adBreakDone) options.adBreakDone({ showStatus: 'mocked' });
    }, 600);
  }
};

if (typeof window !== 'undefined') {
  window.adConfig = window.adConfig || function () {
    (window.adConfig.q = window.adConfig.q || []).push(arguments);
  };
  window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
}

// ─── Date-seeded shuffle ──────────────────────────────────────────────────────
function seededRand(seed) {
  // Simple LCG seeded by date string
  let s = [...seed].reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function pickDailyQuestions(date) {
  const rand    = seededRand(date);
  const bank    = [...TRIVIA_QUESTIONS];
  // Shuffle using seeded random so the same date always picks the same 10
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }
  return bank.slice(0, QUESTIONS_PER_DAY);
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
function calcPoints(timeLeft, consecutive) {
  const elapsed = SECONDS_PER_Q - timeLeft;
  const base = Math.max(100, 1000 - elapsed * 50);
  const mult = getMultiplier(consecutive);
  return Math.round(base * mult);
}

// ─── Persistence ─────────────────────────────────────────────────────────────
function loadSave(date) {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); return s.date === date ? s : null; }
  catch { return null; }
}

function persist(date, data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ date, ...data })); } catch (_) {}
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { played: 0, won: 0, bestScore: 0, avgScore: 0, streak: 0 }; }
  catch { return { played: 0, won: 0, bestScore: 0, avgScore: 0, streak: 0 }; }
}

function saveStats(score, correct, date) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    history[date] = { score, correct };
    const entries = Object.values(history);
    const stats = {
      played:    entries.length,
      won:       entries.filter(e => e.correct >= 7).length,
      bestScore: Math.max(...entries.map(e => e.score)),
      avgScore:  Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length),
      streak:    0,
    };
    const check = new Date(date + 'T00:00:00');
    while (true) {
      const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,'0')}-${String(check.getDate()).padStart(2,'0')}`;
      if (history[k]) { stats.streak++; check.setDate(check.getDate() - 1); } else break;
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return { stats, history };
  } catch { return { stats: loadStats(), history: {} }; }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); }
  catch { return {}; }
}

// ─── Injected CSS ──────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700;9..40,900&display=swap');

:root {
  --bg:#05070f; --surface:rgba(255,255,255,.038); --border:rgba(255,255,255,.08);
  --border2:rgba(255,255,255,.14); --accent:#F7C344; --accent2:#E84040;
  --accent3:#0D9488; --green:#3DD68C; --text:#F0F0F0;
  --muted:rgba(240,240,240,.45); --orange:#F97316;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif}

.dt-page {
  background:var(--bg); color:var(--text); min-height:100vh;
  position:relative; overflow-x:hidden; font-family:'DM Sans',sans-serif;
}
.dt-bg {
  position:absolute; inset:0; pointer-events:none; z-index:0;
  background:
    radial-gradient(circle at 8% 15%, rgba(249,115,22,0.05) 0%, transparent 44%),
    radial-gradient(circle at 92% 85%, rgba(13,148,136,0.04) 0%, transparent 44%);
}
.dt-noise {
  position:absolute; inset:0; pointer-events:none; z-index:1; opacity:.017;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* NAV */
.dt-nav {
  display:flex; align-items:center; justify-content:space-between;
  height:64px; padding:0 24px; position:relative; z-index:10;
  border-bottom:1px solid var(--border); background:rgba(5,7,15,0.7); backdrop-filter:blur(12px);
}
.dt-nav-logo {
  font-family:'Bebas Neue',sans-serif; font-size:1.6rem; letter-spacing:2px;
  background:linear-gradient(135deg,var(--orange),var(--accent));
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text; border:none; cursor:pointer;
}
.dt-nav-tag {
  font-size:.68rem; font-weight:800; text-transform:uppercase; letter-spacing:2px;
  color:var(--muted); border:1px solid var(--border); padding:5px 12px;
  border-radius:100px; display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.02);
}
.dt-fire-dot { width:6px; height:6px; border-radius:50%; background:var(--accent3); box-shadow:0 0 8px var(--accent3); }
.dt-nav-right { display:flex; gap:8px; }
.dt-nav-btn {
  background:var(--surface); border:1px solid var(--border); color:#fff;
  padding:8px 14px; border-radius:10px; font-size:.8rem; font-weight:700;
  cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;
}
.dt-nav-btn:hover { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.2); }

/* MAIN */
.dt-main { max-width:700px; margin:0 auto; padding:28px 16px 80px; position:relative; z-index:5; }

/* PAGE HEADER */
.dt-page-header { text-align:left; margin-bottom:24px; }
.dt-page-header h1 {
  font-family:'Bebas Neue',sans-serif; font-size:2.6rem; letter-spacing:1.5px;
  background:linear-gradient(135deg, var(--accent3), #2dd4bf);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text; line-height:1; margin-bottom:4px;
}
.dt-page-header p { font-size:.82rem; color:var(--muted); font-weight:500; }
.dt-date-badge {
  display:inline-flex; align-items:center; gap:7px; margin-top:10px;
  background:var(--surface); border:1px solid var(--border); border-radius:100px;
  padding:6px 14px; font-size:.72rem; font-weight:700; color:var(--muted);
}
.dt-date-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); box-shadow:0 0 8px var(--accent); }

/* HUD */
.dt-hud {
  display:flex; align-items:center; justify-content:space-between;
  background:var(--surface); border:1px solid var(--border); border-radius:14px;
  padding:12px 18px; margin-bottom:12px;
}
.dt-hud-item { text-align:center; }
.dt-hud-val { font-family:'Bebas Neue',sans-serif; font-size:1.85rem; letter-spacing:1px; line-height:1; }
.dt-hud-val.green { color:var(--green); }
.dt-hud-val.amber { color:var(--accent); }
.dt-hud-val.red   { color:var(--accent2); }
.dt-hud-val.blue  { color:var(--accent3); }
.dt-hud-lbl { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:1.2px; color:var(--muted); margin-top:2px; }
.dt-hud-sep { width:1px; height:36px; background:var(--border); }

/* TIMER BAR */
.dt-timer-wrap { background:rgba(255,255,255,.06); border-radius:100px; height:5px; margin-bottom:14px; overflow:hidden; }
.dt-timer-bar { height:100%; border-radius:100px; transition:width .5s linear, background .4s; }

/* PROGRESS */
.dt-progress-dots { display:flex; gap:5px; justify-content:center; flex-wrap:wrap; margin-bottom:14px; }
.dt-pg-dot {
  width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.1);
  border:1px solid rgba(255,255,255,.14); transition:background .3s, transform .2s;
}
.dt-pg-dot.correct { background:var(--green); border-color:var(--green); }
.dt-pg-dot.wrong   { background:var(--accent2); border-color:var(--accent2); }
.dt-pg-dot.active  { background:var(--accent); border-color:var(--accent); transform:scale(1.4); }

/* QUESTION CARD */
.dt-q-card {
  background:rgba(255,255,255,.025); border:1px solid var(--border2);
  border-radius:18px; padding:26px 22px; margin-bottom:12px;
  animation:cardIn .4s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardIn { from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none} }
.dt-q-meta { display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
.dt-q-num { font-size:.6rem; font-weight:800; text-transform:uppercase; letter-spacing:1.3px; color:var(--muted); }
.dt-cat-badge {
  font-size:.6rem; font-weight:900; text-transform:uppercase; letter-spacing:.8px;
  padding:3px 10px; border-radius:100px; display:flex; align-items:center; gap:4px;
}
.dt-q-text { font-size:1.06rem; font-weight:700; line-height:1.55; color:#fff; }

/* OPTIONS */
.dt-options { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:18px; }
.dt-opt {
  background:rgba(255,255,255,.025); border:1px solid var(--border);
  border-radius:12px; padding:13px 14px; font-size:.84rem; font-weight:600;
  color:var(--text); cursor:pointer; text-align:left; font-family:inherit;
  display:flex; align-items:center; gap:8px;
  transition:background .15s, border-color .15s, transform .12s;
}
.dt-opt:hover:not(:disabled) { background:rgba(255,255,255,.07); border-color:rgba(247,195,68,.35); transform:translateY(-1px); }
.dt-opt:disabled { cursor:default; }
.dt-opt-letter {
  min-width:22px; height:22px; border-radius:6px; font-size:.66rem; font-weight:900;
  display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,.06); color:var(--muted); flex-shrink:0;
}
.dt-opt.correct { background:rgba(61,214,140,.16); border-color:rgba(61,214,140,.5); color:#fff; }
.dt-opt.correct .dt-opt-letter { background:rgba(61,214,140,.25); color:var(--green); }
.dt-opt.wrong   { background:rgba(232,64,64,.1); border-color:rgba(232,64,64,.35); color:var(--muted); }
.dt-opt.wrong   .dt-opt-letter { background:rgba(232,64,64,.2); color:var(--accent2); }

/* FEEDBACK */
.dt-feedback {
  text-align:center; font-size:.8rem; font-weight:700; padding:9px 18px;
  border-radius:11px; margin-bottom:4px; animation:feedIn .28s ease;
}
@keyframes feedIn { from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)} }
.dt-feedback.correct { background:rgba(61,214,140,.12); color:var(--green); }
.dt-feedback.wrong   { background:rgba(232,64,64,.1); color:var(--accent2); }
.dt-feedback.timeout { background:rgba(247,195,68,.1); color:var(--accent); }

/* ALREADY PLAYED TODAY */
.dt-already-card {
  background:rgba(255,255,255,.025); border:1px solid var(--border2);
  border-radius:18px; padding:30px 22px; text-align:center; animation:fadeUp .5s ease both;
}
.dt-already-icon { font-size:2.8rem; margin-bottom:12px; display:block; }
.dt-already-title { font-family:'Bebas Neue',sans-serif; font-size:1.9rem; letter-spacing:1px; margin-bottom:6px; }
.dt-already-sub { font-size:.82rem; color:var(--muted); margin-bottom:20px; line-height:1.6; }
.dt-countdown { font-family:'Bebas Neue',sans-serif; font-size:2.4rem; letter-spacing:2px; color:var(--accent); margin-bottom:6px; }
.dt-countdown-lbl { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); margin-bottom:22px; }

/* RESULT CARD */
.dt-result-card {
  background:rgba(255,255,255,.03); border:1px solid var(--border2);
  border-radius:20px; padding:34px 24px; text-align:center; animation:fadeUp .5s ease both;
}
.dt-result-badge {
  display:inline-block; padding:5px 14px; border-radius:100px;
  font-size:.62rem; font-weight:900; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px;
}
.dt-result-badge.great  { background:rgba(61,214,140,.12); color:var(--green); border:1px solid rgba(61,214,140,.3); }
.dt-result-badge.ok     { background:rgba(247,195,68,.12); color:var(--accent); border:1px solid rgba(247,195,68,.3); }
.dt-result-badge.poor   { background:rgba(232,64,64,.12); color:var(--accent2); border:1px solid rgba(232,64,64,.3); }
.dt-result-title { font-family:'Bebas Neue',sans-serif; font-size:2.4rem; letter-spacing:1px; margin-bottom:4px; }
.dt-result-sub { font-size:.8rem; color:var(--muted); margin-bottom:20px; }
.dt-score-big { font-family:'Bebas Neue',sans-serif; font-size:4.6rem; letter-spacing:2px; color:var(--accent); line-height:1; }
.dt-score-lbl { font-size:.72rem; color:var(--muted); font-weight:600; margin-bottom:22px; }
.dt-xp-badge {
  background:linear-gradient(135deg,rgba(247,195,68,0.12) 0%,rgba(249,115,22,0.12) 100%);
  border:1px solid rgba(247,195,68,0.25); border-radius:100px;
  padding:6px 16px; display:inline-flex; align-items:center; gap:6px;
  font-size:.78rem; font-weight:700; color:var(--accent); margin-bottom:18px;
  animation:pillPop .6s ease;
}
@keyframes pillPop { 0%{transform:scale(1)}45%{transform:scale(1.12)}100%{transform:scale(1)} }
.dt-result-breakdown {
  display:grid; grid-template-columns:repeat(3,1fr); gap:10px;
  background:rgba(5,7,15,.4); border:1px solid var(--border); border-radius:14px;
  padding:14px 10px; margin-bottom:20px;
}
.dt-rb-item { text-align:center; }
.dt-rb-val { font-family:'Bebas Neue',sans-serif; font-size:1.5rem; }
.dt-rb-val.green { color:var(--green); }
.dt-rb-val.red   { color:var(--accent2); }
.dt-rb-val.amber { color:var(--accent); }
.dt-rb-lbl { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); margin-top:2px; }

/* CATEGORY BREAKDOWN */
.dt-cat-section { margin-bottom:22px; }
.dt-cat-section-label {
  font-size:.62rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px;
  color:var(--muted); margin-bottom:10px; text-align:center;
}
.dt-cat-rows { display:flex; flex-direction:column; gap:6px; }
.dt-cat-row {
  display:flex; align-items:center; gap:10px;
  background:rgba(255,255,255,.02); border:1px solid var(--border); border-radius:10px;
  padding:9px 14px;
}
.dt-cat-row-icon { font-size:.9rem; }
.dt-cat-row-name { font-size:.76rem; font-weight:700; color:var(--text); flex:1; }
.dt-cat-row-bar-wrap { flex:2; background:rgba(255,255,255,.06); border-radius:100px; height:5px; overflow:hidden; }
.dt-cat-row-bar { height:100%; border-radius:100px; transition:width .6s ease; }
.dt-cat-row-frac { font-size:.7rem; font-weight:800; color:var(--muted); min-width:28px; text-align:right; }

/* STREAK DOTS */
.dt-bottom-section { animation:fadeUp .5s ease .2s both; }
.dt-section-divider { display:flex; align-items:center; gap:14px; margin-bottom:18px; }
.dt-section-label { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); white-space:nowrap; }
.dt-section-line { flex:1; height:1px; background:var(--border); }
.dt-dashboard-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.dt-dash-card {
  background:rgba(255,255,255,.02); border:1px solid var(--border);
  border-radius:16px; padding:18px; display:flex; flex-direction:column;
}
.dt-dash-card-hdr { display:flex; align-items:center; gap:6px; margin-bottom:14px; }
.dt-dash-icon { font-size:.95rem; }
.dt-dash-label { font-size:.68rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--muted); }
.dt-streak-dots {
  display: grid; grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(3, 42px); gap: 3px; margin-bottom: 12px;
}
.dt-streak-dot {
  width: 100%; height: 42px; border-radius: 5px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1px;
  transition: transform 0.15s; cursor: default;
}
.dt-streak-dot:hover { transform: translateY(-2px); }
.dt-streak-dot.win    { background: rgba(61,214,140,0.13);  border: 1px solid rgba(61,214,140,0.38); }
.dt-streak-dot.miss   { background: rgba(255,255,255,0.03);  border: 1px solid rgba(255,255,255,0.07); }
.dt-streak-dot.played { background: rgba(13,148,136,0.14);  border: 2px solid var(--accent3); box-shadow: 0 0 8px rgba(13,148,136,0.2); }
.dt-streak-dot.pending { background: rgba(247,195,68,0.08);  border: 2px dashed rgba(247,195,68,0.35); }
.dt-streak-legend { display:flex; gap:12px; font-size:.67rem; color:var(--muted); flex-wrap:wrap; margin-top:auto; }
.dt-dot-sample { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:4px; vertical-align:middle; }
.dt-dot-sample.win    { background:rgba(61,214,140,.18); border:1px solid var(--green); }
.dt-dot-sample.miss   { background:rgba(232,64,64,.08); border:1px solid rgba(232,64,64,.18); }
.dt-dot-sample.played { background:rgba(13,148,136,.14); border:1px solid var(--accent3); }
.dt-stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.dt-stat-item {
  background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:12px;
  padding:14px 12px; text-align:center; transition:border-color .2s, background .2s;
}
.dt-stat-item:hover { border-color:rgba(13,148,136,.22); background:rgba(13,148,136,.03); }
.dt-stat-value {
  font-family:'Bebas Neue',sans-serif; font-size:1.75rem; letter-spacing:1px;
  background:linear-gradient(135deg,var(--accent3),#fff 80%); -webkit-background-clip:text;
  -webkit-text-fill-color:transparent; background-clip:text; line-height:1; margin-bottom:3px;
}
.dt-stat-name { font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--muted); }

/* ACTIONS */
.dt-result-actions { display:flex; gap:9px; justify-content:center; margin-top:20px; }
.dt-btn {
  padding:12px 20px; border-radius:12px; font-size:.84rem; font-weight:700;
  cursor:pointer; font-family:inherit; transition:opacity .2s, transform .15s; border:none;
}
.dt-btn:hover { opacity:.9; transform:translateY(-1px); }
.dt-btn.primary   { background:var(--accent); color:#000; flex:1.2; }
.dt-btn.secondary { background:var(--surface); color:#fff; border:1px solid var(--border2); flex:1; }
.dt-btn.ghost     { background:transparent; color:var(--muted); border:1px solid transparent; }

/* MODAL */
.dt-modal-overlay {
  display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.84);
  backdrop-filter:blur(14px); justify-content:center; align-items:center; padding:20px;
}
.dt-modal-overlay.active { display:flex; animation:fadeIn .22s ease; }
@keyframes fadeIn { from{opacity:0}to{opacity:1} }
.dt-modal-box {
  background:#0c1020; border:1px solid rgba(79,142,247,.25); border-radius:24px;
  padding:40px 32px; max-width:480px; width:100%; max-height:88vh; overflow-y:auto;
  position:relative; animation:modalUp .3s cubic-bezier(.4,0,.2,1);
}
.dt-modal-box::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--accent3),var(--accent),var(--accent3));
  border-radius:24px 24px 0 0;
}
@keyframes modalUp { from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none} }
.dt-modal-title { font-family:'Bebas Neue',sans-serif; font-size:2.2rem; letter-spacing:2px; text-align:center; margin-bottom:22px; }
.dt-rules-list { list-style:none; margin-bottom:22px; display:flex; flex-direction:column; gap:8px; }
.dt-rules-list li {
  background:var(--surface); border:1px solid var(--border); border-left:3px solid rgba(79,142,247,0.45);
  border-radius:12px; padding:12px 15px; font-size:.86rem; line-height:1.6; transition:border-color .2s, transform .2s;
}
.dt-rules-list li:hover { border-left-color:var(--accent3); transform:translateX(4px); }
.dt-modal-close {
  width:100%; padding:13px; font-size:.9rem; border-radius:12px; background:var(--accent3);
  color:#fff; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:700; transition:opacity .2s;
}
.dt-modal-close:hover { opacity:.88; }

/* SPINNER */
.dt-spinner { display:flex; align-items:center; justify-content:center; height:100vh; background:var(--bg); }
.dt-spinner-ring { width:28px; height:28px; border-radius:50%; border:3px solid rgba(255,255,255,.07); border-top-color:var(--accent3); animation:spin .7s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }

/* MSG */
.dt-msg-banner {
  position:fixed; top:76px; left:50%; transform:translateX(-50%);
  padding:10px 20px; border-radius:10px; z-index:100000;
  font-size:.85rem; font-weight:700; box-shadow:0 8px 24px rgba(0,0,0,.3);
  pointer-events:none; animation:feedIn .25s ease;
}

/* RESPONSIVE */
@media(max-width:700px){
  .dt-nav { padding:0 14px; height:54px; }
  .dt-main { padding:16px 12px 56px; }
  .dt-page-header h1 { font-size:2rem; }
  .dt-options { grid-template-columns:1fr; }
  .dt-result-breakdown { grid-template-columns:1fr 1fr; }
  .dt-dashboard-grid { grid-template-columns:1fr; }
  .dt-result-card { padding:26px 16px; }
  .dt-result-actions { flex-direction:column; align-items:stretch; }
}
`;

const LETTERS = ['A', 'B', 'C', 'D'];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DailyTrivia() {
  const navigate = useNavigate();
  const puzzleDate   = getActivePuzzleDate();
  const puzzleNumber = Math.floor((new Date(puzzleDate) - new Date('2025-01-01')) / 86400000) + 1;

  const [questions, setQuestions]   = useState([]);
  const [current, setCurrent]       = useState(0);
  const [answers, setAnswers]       = useState([]);  // true/false per question
  const [score, setScore]           = useState(0);
  const [combo, setCombo]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(SECONDS_PER_Q);
  const [answered, setAnswered]     = useState(false);
  const [chosenIdx, setChosenIdx]   = useState(null);
  const [feedback, setFeedback]     = useState(null);
  const [phase, setPhase]           = useState('loading'); // loading | game | result | done
  const [xpAwarded, setXpAwarded]   = useState(null);
  const [stats, setStats]           = useState(loadStats);
  const [history, setHistory]       = useState(loadHistory);
  const [showModal, setShowModal]   = useState(false);
  const [countdown, setCountdown]   = useState('');
  const [msg, setMsg]               = useState(null);

  const timerRef  = useRef(null);
  const countRef  = useRef(null);

  // ── Inject CSS ──
  useEffect(() => {
    if (!document.getElementById('dt-injected-css')) {
      const s = document.createElement('style');
      s.id = 'dt-injected-css';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  // ── Load / resume ──
  useEffect(() => {
    const qs   = pickDailyQuestions(puzzleDate);
    const save = loadSave(puzzleDate);
    setQuestions(qs);

    if (save?.done) {
      setAnswers(save.answers || []);
      setScore(save.score || 0);
      setXpAwarded(save.xpAwarded ?? null);
      setPhase('done');
    } else if (save?.answers?.length > 0) {
      // Resume mid-game
      setAnswers(save.answers);
      setScore(save.score || 0);
      setCurrent(save.answers.length);
      // Calculate initial combo from trailing true values in save.answers
      let currentCombo = 0;
      for (let i = save.answers.length - 1; i >= 0; i--) {
        if (save.answers[i]) {
          currentCombo++;
        } else {
          break;
        }
      }
      setCombo(currentCombo);
      setPhase('game');
    } else {
      setPhase('game');
    }
  }, [puzzleDate]);

  // ── Midnight countdown for "done" state ──
  useEffect(() => {
    if (phase !== 'done') return;
    function tick() {
      const now  = new Date();
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      const diff = next - now;
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setCountdown(`${h}:${m}:${s}`);
    }
    tick();
    countRef.current = setInterval(tick, 1000);
    return () => clearInterval(countRef.current);
  }, [phase]);

  // ── Timer ──
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); timerRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    if (phase === 'game' && questions.length > 0 && !answered) startTimer();
    return stopTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current, answered, questions.length]);

  // Timeout
  useEffect(() => {
    if (phase !== 'game' || answered || timeLeft > 0) return;
    handleAnswer(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, answered]);

  useEffect(() => () => { stopTimer(); clearInterval(countRef.current); }, [stopTimer]);

  function showMsg(text, type = 'info', duration = 2500) {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), duration);
  }

  // ── Answer ──
  function handleAnswer(idx) {
    if (answered) return;
    stopTimer();
    setAnswered(true);
    setChosenIdx(idx);

    const q          = questions[current];
    const isTimeout  = idx === null;
    const isCorrect  = !isTimeout && idx === q.ans;
    
    let pts = 0;
    let newCombo = 0;
    if (isCorrect) {
      newCombo = combo + 1;
      pts = calcPoints(timeLeft, newCombo);
    }
    const newAnswers = [...answers, isCorrect];
    const newScore   = score + pts;

    let fb;
    if (isCorrect) {
      const mult = getMultiplier(newCombo);
      fb = { text: `✓ Correct! +${pts} pts (Combo ${mult}x)`, cls: 'correct' };
    } else if (isTimeout) {
      fb = { text: `⏱ Time's up! The answer was: ${q.opts[q.ans]} (Combo Broken)`, cls: 'timeout' };
    } else {
      fb = { text: `✗ Wrong. Correct: ${q.opts[q.ans]} (Combo Broken)`, cls: 'wrong' };
    }

    setCombo(newCombo);
    setFeedback(fb);
    setScore(newScore);
    setAnswers(newAnswers);

    persist(puzzleDate, { answers: newAnswers, score: newScore, done: false });

    // Midroll ad every 5 questions
    if ((current + 1) % 5 === 0 && current + 1 < QUESTIONS_PER_DAY) {
      adBreak({ type: 'next', name: `daily-trivia-q${current + 1}`, adBreakDone: () => {} });
    }

    setTimeout(() => advance(current + 1, newAnswers, newScore), 1500);
  }

  async function advance(nextIdx, allAnswers, finalScore) {
    if (nextIdx >= questions.length) {
      stopTimer();
      const correct  = allAnswers.filter(Boolean).length;
      const { stats: s, history: h } = saveStats(finalScore, correct, puzzleDate);
      setStats(s);
      setHistory(h);
      setPhase('result');

      const user = getUser();
      let awarded = 0;
      let sessionType = null;
      let sessionData = null; let nextActVal = null;
      if (user?.userId) {
        try {
          const maxPossible = getMaxPossibleScore(questions.length);
          const computedXP = calculateXP(finalScore, maxPossible);
          const res = await awardXP(user.userId, 'dailytrivia_complete', { rawXP: computedXP });
          awarded = res?.xpAwarded ?? 0;
          sessionType = res?.sessionType;
          sessionData = res?.session; nextActVal = res?.nextAct;
        } catch (e) { console.error('[DailyTrivia] awardXP error:', e); }
      }

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
            navigate('/vsfriends');
          }
        }, 2500);
      }
      // Single mode animations & scroll
      const isWin = correct >= 7;
      if (isWin) {
        triggerWinConfetti();
      } else {
        triggerLossHeartbreaks();
      }
      autoScrollToResult('.dt-result-card', false);

      setXpAwarded(awarded);
      persist(puzzleDate, { answers: allAnswers, score: finalScore, done: true, xpAwarded: awarded });
      return;
    }
    setCurrent(nextIdx);
    setTimeLeft(SECONDS_PER_Q);
    setAnswered(false);
    setChosenIdx(null);
    setFeedback(null);
  }

  function markDone() {
    persist(puzzleDate, { answers, score, done: true, xpAwarded });
    setPhase('done');
  }

  function handleShare() {
    const correct = answers.filter(Boolean).length;
    const blocks  = answers.map(a => a ? '🟢' : '🔴').join('');
    const text    = [
      `📋 Footbrawls Daily Trivia — #${puzzleNumber}`,
      `${blocks}`,
      `${correct}/${questions.length} correct · ${score} pts`,
      `https://footbrawls.vercel.app/games/dailytrivia`,
    ].join('\n');
    if (navigator.share) { navigator.share({ text }).catch(() => {}); }
    else { navigator.clipboard?.writeText(text); showMsg('Result copied!', 'success'); }
  }

  // ── Derived ──
  const timerPct   = (timeLeft / SECONDS_PER_Q) * 100;
  const timerColor = timerPct > 55
    ? 'linear-gradient(90deg,var(--accent3),#93c5fd)'
    : timerPct > 28
      ? 'linear-gradient(90deg,var(--accent2),var(--accent))'
      : 'var(--accent2)';
  const timeClass  = timerPct > 55 ? 'blue' : timerPct > 28 ? 'amber' : 'red';
  const correct    = answers.filter(Boolean).length;
  const accuracy   = answers.length ? Math.round((correct / answers.length) * 100) : 0;

  // Category breakdown for results
  const catBreakdown = Object.keys(CATEGORY_META).map(cat => {
    const catQs = questions.map((q, i) => ({ q, correct: answers[i] })).filter(x => x.q.cat === cat);
    return { cat, total: catQs.length, correct: catQs.filter(x => x.correct).length };
  }).filter(x => x.total > 0);

  if (phase === 'loading') {
    return <div className="dt-spinner"><div className="dt-spinner-ring" /></div>;
  }

  const todayLabel = new Date(puzzleDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <div className="dt-page">
        <div className="dt-bg" />
        <div className="dt-noise" />

        {msg && (
          <div className="dt-msg-banner" style={{
            background: msg.type === 'success' ? 'rgba(61,214,140,0.95)' : msg.type === 'error' ? 'rgba(232,64,64,0.95)' : 'rgba(247,195,68,0.95)',
            color: msg.type === 'success' ? '#fff' : '#000',
          }}>
            {msg.text}
          </div>
        )}

        <HowToPlayModal show={showModal} onClose={() => setShowModal(false)} />

        <nav className="dt-nav" style={{
          boxShadow: "0 10px 30px rgba(13, 148, 136, 0.22)",
          borderBottom: "1px solid rgba(13, 148, 136, 0.25)"
        }}>
          {!(isRaid || isVsFriends) && <button className="dt-nav-logo" onClick={() => navigate('/')}>←</button>}
          {isVsFriends ? (
          <div className="dt-nav-tag" style={{ background: 'rgba(61,214,140,0.15)', borderColor: '#3DD68C', color: '#3DD68C' }}>
            <span className="dt-fire-dot" style={{ background: '#3DD68C', boxShadow: '0 0 8px #3DD68C' }} />
            VS FRIENDS
          </div>
        ) : (
          <div className="dt-nav-tag">
            <span className="dt-fire-dot" />
            Daily Trivia
          </div>
        )}
          <div className="dt-nav-right">
            <button className="dt-nav-btn" onClick={() => setShowModal(true)}>❓ Help</button>
          </div>
        </nav>

        <main className="dt-main">
          <header className="dt-page-header">
            <h1>Daily Trivia</h1>
            <p>Daily Puzzle #{puzzleNumber} · 10 football questions · one chance per day</p>
          </header>

          {/* ── GAME ── */}
          {phase === 'game' && questions.length > 0 && (() => {
            const q = questions[current];
            const meta = CATEGORY_META[q.cat] || CATEGORY_META.history;
            return (
              <>
                <div className="dt-hud">
                  <div className="dt-hud-item">
                    <div className="dt-hud-val" style={{ color: '#fff' }}>{current + 1}/{questions.length}</div>
                    <div className="dt-hud-lbl">Question</div>
                  </div>
                  <div className="dt-hud-sep" />
                  <div className="dt-hud-item">
                    <div className={`dt-hud-val ${timeClass}`}>{timeLeft}s</div>
                    <div className="dt-hud-lbl">Time</div>
                  </div>
                  <div className="dt-hud-sep" />
                  <div className="dt-hud-item">
                    <div className="dt-hud-val green">{score}</div>
                    <div className="dt-hud-lbl">Score</div>
                  </div>
                  <div className="dt-hud-sep" />
                  <div className="dt-hud-item">
                    <div className="dt-hud-val" style={{ color: '#fff' }}>{correct}</div>
                    <div className="dt-hud-lbl">Correct</div>
                  </div>
                  <div className="dt-hud-sep" />
                  <div className="dt-hud-item">
                    <div className="dt-hud-val" style={{ color: combo > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                      {combo > 0 ? `${getMultiplier(combo)}x` : '—'}
                    </div>
                    <div className="dt-hud-lbl">Combo</div>
                  </div>
                </div>

                <div className="dt-timer-wrap">
                  <div className="dt-timer-bar" style={{ width: `${timerPct}%`, background: timerColor }} />
                </div>

                <div className="dt-progress-dots">
                  {questions.map((_, i) => {
                    let cls = '';
                    if (i < answers.length) cls = answers[i] ? 'correct' : 'wrong';
                    else if (i === current) cls = 'active';
                    return <div key={i} className={`dt-pg-dot ${cls}`} />;
                  })}
                </div>

                <div className="dt-q-card" key={current}>
                  <div className="dt-q-meta">
                    <span className="dt-q-num">Q{current + 1}</span>
                    <span
                      className="dt-cat-badge"
                      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                  <div className="dt-q-text">{q.q}</div>
                  <div className="dt-options">
                    {q.opts.map((opt, i) => {
                      let cls = '';
                      if (answered) {
                        if (i === q.ans) cls = 'correct';
                        else if (i === chosenIdx) cls = 'wrong';
                      }
                      return (
                        <button
                          key={i}
                          className={`dt-opt ${cls}`}
                          disabled={answered}
                          onClick={() => handleAnswer(i)}
                        >
                          <span className="dt-opt-letter">{LETTERS[i]}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {feedback && (
                  <div className={`dt-feedback ${feedback.cls}`} key={`fb-${current}`}>
                    {feedback.text}
                  </div>
                )}
              </>
            );
          })()}

          {/* ── RESULT (just finished today) ── */}
          {phase === 'result' && (() => {
            const pct = Math.round((correct / questions.length) * 100);
            const wrong = answers.filter(a => !a).length;
            let badgeCls, title, badgeText;
            if (pct >= 80)      { badgeCls = 'great'; title = 'World Class!';    badgeText = 'Elite knowledge'; }
            else if (pct >= 60) { badgeCls = 'ok';    title = 'Solid Session!';  badgeText = 'Good performance'; }
            else                { badgeCls = 'poor';   title = 'Keep Studying!'; badgeText = 'Room to grow'; }

            return (
              <div className="dt-result-card">
                <div className={`dt-result-badge ${badgeCls}`}>{badgeText}</div>
                <div className="dt-result-title">{title}</div>
                <div className="dt-result-sub">{correct} of {questions.length} correct today</div>

                {xpAwarded != null && (
                  <div className="dt-xp-badge">
                    {xpAwarded > 0 ? `+${xpAwarded} XP earned` : 'Daily XP limit reached'}
                  </div>
                )}

                <div className="dt-score-big">{score}</div>
                <div className="dt-score-lbl">out of {getMaxPossibleScore(QUESTIONS_PER_DAY)} max pts</div>

                <div className="dt-result-breakdown">
                  <div className="dt-rb-item">
                    <div className="dt-rb-val green">{correct}</div>
                    <div className="dt-rb-lbl">Correct</div>
                  </div>
                  <div className="dt-rb-item">
                    <div className="dt-rb-val red">{wrong}</div>
                    <div className="dt-rb-lbl">Wrong</div>
                  </div>
                  <div className="dt-rb-item">
                    <div className="dt-rb-val amber">{pct}%</div>
                    <div className="dt-rb-lbl">Accuracy</div>
                  </div>
                </div>

                {catBreakdown.length > 0 && (
                  <div className="dt-cat-section">
                    <div className="dt-cat-section-label">Category Breakdown</div>
                    <div className="dt-cat-rows">
                      {catBreakdown.map(({ cat, total, correct: c }) => {
                        const meta = CATEGORY_META[cat];
                        return (
                          <div className="dt-cat-row" key={cat}>
                            <span className="dt-cat-row-icon">{meta.icon}</span>
                            <span className="dt-cat-row-name">{meta.label}</span>
                            <div className="dt-cat-row-bar-wrap">
                              <div
                                className="dt-cat-row-bar"
                                style={{
                                  width: total ? `${Math.round((c / total) * 100)}%` : '0%',
                                  background: c === total ? 'var(--green)' : c === 0 ? 'var(--accent2)' : 'var(--accent)',
                                }}
                              />
                            </div>
                            <span className="dt-cat-row-frac">{c}/{total}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="dt-result-actions" style={{ justifyContent: 'center' }}>
                  <button className="dt-btn primary" onClick={markDone} style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), #ffd700)', color: '#060810', fontWeight: 'bold' }}>← Back to Home</button>
                </div>
              </div>
            );
          })()}

          {/* ── DONE (already played today) ── */}
          {phase === 'done' && (
            <div className="dt-already-card">
              <span className="dt-already-icon">📋</span>
              <div className="dt-already-title">Already played today!</div>
              <div className="dt-already-sub">
                You scored <strong style={{ color: 'var(--accent)' }}>{score} pts</strong> with {correct}/{questions.length} correct.<br />
                Come back tomorrow for a fresh set of questions.
              </div>
              <div className="dt-countdown">{countdown}</div>
              <div className="dt-countdown-lbl">Until next puzzle</div>
              <div className="dt-result-actions" style={{ justifyContent: 'center' }}>
                <button className="dt-btn primary" onClick={() => navigate('/')} style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), #ffd700)', color: '#060810', fontWeight: 'bold' }}>← Back to Home</button>
              </div>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          <div className="dt-bottom-section" style={{ marginTop: 28 }}>
            <div className="dt-section-divider">
              <span className="dt-section-label">Your Progress</span>
              <div className="dt-section-line" />
            </div>
            <div className="dt-dashboard-grid">
              <div className="dt-dash-card">
                <div className="dt-dash-card-hdr">
                  <span className="dt-dash-icon">📅</span>
                  <span className="dt-dash-label">Last 30 Days</span>
                </div>
                <StreakDots history={history} puzzleDate={puzzleDate} phase={phase} />
                <div className="dt-streak-legend">
                  <span><span className="dt-dot-sample win" />7+/10</span>
                  <span><span className="dt-dot-sample miss" />Under 7</span>
                  <span><span className="dt-dot-sample played" />Today</span>
                </div>
              </div>
              <div className="dt-dash-card">
                <div className="dt-dash-card-hdr">
                  <span className="dt-dash-icon">📊</span>
                  <span className="dt-dash-label">Your Stats</span>
                </div>
                <div className="dt-stats-grid">
                  <div className="dt-stat-item">
                    <div className="dt-stat-value">{stats.played || '—'}</div>
                    <div className="dt-stat-name">Played</div>
                  </div>
                  <div className="dt-stat-item">
                    <div className="dt-stat-value">{stats.won || '—'}</div>
                    <div className="dt-stat-name">7+ Correct</div>
                  </div>
                  <div className="dt-stat-item">
                    <div className="dt-stat-value">{stats.bestScore || '—'}</div>
                    <div className="dt-stat-name">Best Score</div>
                  </div>
                  <div className="dt-stat-item">
                    <div className="dt-stat-value">{stats.streak || '—'}</div>
                    <div className="dt-stat-name">Streak</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}

// ─── Streak Dots ──────────────────────────────────────────────────────────────
function StreakDots({ history, puzzleDate, phase }) {
  const today = new Date();
  const dots  = [];
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const isToday = key === puzzleDate;
    let cls = '';
    let xp = 0;
    const e = history[key];
    if (isToday) {
      cls = (phase === 'result' || phase === 'done') ? 'played' : 'pending';
      if (phase === 'result' || phase === 'done') {
        xp = e ? (e.xpAwarded ?? 25) : 25;
      }
    } else {
      cls = e ? (e.correct >= 7 ? 'win' : 'miss') : 'miss';
      if (e) {
        xp = e.xpAwarded ?? (e.correct >= 7 ? 25 : 0);
      }
    }
    dots.push({ key, cls, xp, hasPlayed: (e || (isToday && (phase === 'result' || phase === 'done'))) });
  }
  return (
    <div className="dt-streak-dots">
      {dots.map((d, i) => (
        <div key={d.key} className={`dt-streak-dot ${d.cls}`} title={`${d.key} ${d.xp ? `· ${d.xp} XP` : ''}`}>
          {d.hasPlayed && d.xp > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 800, lineWeight: 1, color: 'var(--green)' }}>{d.xp}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── How to Play Modal ────────────────────────────────────────────────────────
function HowToPlayModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className={`dt-modal-overlay${show ? ' active' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dt-modal-box">
        <h2 className="dt-modal-title">📋 How to Play</h2>
        <ul className="dt-rules-list">
          <li><strong>📅 Daily:</strong> A fresh set of 10 questions drops every day at midnight — one attempt only</li>
          <li><strong>⏱ Timer:</strong> You have 20 seconds per question. Answer fast for maximum points</li>
          <li><strong>⚡ Speed scoring:</strong> Scoring decays from 1000 points by 50 points per elapsed second (floor at 100 points)</li>
          <li><strong>🔥 Combo multiplier:</strong> Get consecutive correct answers to build a combo multiplier: 1st = 1x, 2nd = 1.2x, 3rd = 1.5x, 4th = 1.8x, 5th = 2x, 6th = 2.5x, 7th+ = 3.0x</li>
          <li><strong>🚫 Combo break:</strong> Wrong answers or timeouts reset your combo multiplier to 0</li>
          <li><strong>🏷️ Categories:</strong> History · Transfers · Records · Tactics · Players · Stadiums · Managers · Rules</li>
          <li><strong>🟢 / 🔴 Dots:</strong> Progress dots track each answer — green for correct, red for wrong</li>
          <li><strong>🏆 Win condition:</strong> 7 or more correct counts as a win and extends your streak</li>
        </ul>
        <button className="dt-modal-close" onClick={onClose}>🚀 Got It!</button>
      </div>
    </div>
  );
}