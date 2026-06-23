// src/pages/games/top10.jsx
// Football "Top 10" Guess — Footbrawls edition
// Players get a category and try to guess the top 10 items with only 3 lives.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../../lib/user';
import { awardXP } from '../../lib/xpEngine.js';
import { TOP10_QUESTIONS } from '../../lib/questions.js';
import { PLAYERS } from "../../lib/players.js";
import { usePlayerWikiPhoto, useClubWikiLogo } from '../../lib/wikiAssets.jsx';
import { getActivePuzzleDate, getDailySeed } from '../../lib/dailySeed.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATS_KEY   = 'footbrawls_top10_stats';
const HISTORY_KEY = 'footbrawls_top10_history';

const POPULAR_CLUBS = [
  "Real Madrid", "Barcelona", "Bayern Munich", "Liverpool", "Manchester United",
  "Manchester City", "Chelsea", "Arsenal", "Juventus", "AC Milan", "Inter Milan",
  "Ajax", "Atletico Madrid", "Dortmund", "Paris Saint-Germain", "PSG", "Napoli",
  "Roma", "Benfica", "Porto", "Sporting CP", "Sunderland", "Aston Villa", "Everton",
  "Newcastle United", "Sheffield Wednesday", "Blackburn Rovers", "Tottenham Hotspur",
  "Tottenham", "West Ham", "Leicester City", "Brentford", "Nottingham Forest",
  "Leeds United", "Valencia", "Sevilla", "Villarreal"
];

// Helper to normalize strings for comparison (remove accents, punctuation, lowercase, spaces)
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s]/g, "") // alphanumeric only
    .replace(/\s+/g, " ")
    .trim();
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { played: 0, won: 0, bestScore: 0, avgScore: 0, streak: 0 }; }
  catch { return { played: 0, won: 0, bestScore: 0, avgScore: 0, streak: 0 }; }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; }
  catch { return {}; }
}

function saveStats(correctCount, today) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    history[today] = { correct: correctCount };
    const entries = Object.values(history);
    const stats = {
      played: entries.length,
      won: entries.filter(e => e.correct >= 6).length, // 6+ correct is a win
      bestScore: Math.max(...entries.map(e => e.correct)),
      avgScore: Math.round((entries.reduce((s, e) => s + e.correct, 0) / entries.length) * 10) / 10,
      streak: 0,
    };
    const check = new Date(today + 'T00:00:00');
    while (true) {
      const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,'0')}-${String(check.getDate()).padStart(2,'0')}`;
      if (history[k]) { stats.streak++; check.setDate(check.getDate() - 1); } else break;
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return { stats, history };
  } catch { return { stats: loadStats(), history: {} }; }
}

function calculateXP(correct, wrongCount) {
  if (correct === 10) {
    if (wrongCount === 0) return 25;
    if (wrongCount === 1) return 20;
    if (wrongCount === 2) return 15;
    return 10; // 3+ wrong guesses (e.g. ad continue)
  }
  if (correct >= 6) return 10;
  return 5;
}

function WikiAvatar({ name, isClub }) {
  const baseName = name.split(' (')[0];
  const playerPhoto = usePlayerWikiPhoto(baseName);
  const clubLogo = useClubWikiLogo(baseName);
  const src = isClub ? clubLogo : playerPhoto;

  return (
    <img
      src={src}
      alt={name}
      style={{
        width: 30,
        height: 30,
        borderRadius: isClub ? '6px' : '50%',
        objectFit: 'cover',
        border: '1px solid rgba(255,255,255,0.15)',
        marginRight: 10,
        background: 'rgba(255,255,255,0.05)',
        flexShrink: 0
      }}
    />
  );
}

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

// ─── Injected CSS ──────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700;9..40,900&display=swap');

:root {
  --bg:#05070f; --surface:rgba(255,255,255,.038); --border:rgba(255,255,255,.08);
  --border2:rgba(255,255,255,.14); --accent:#F7C344; --accent2:#E84040;
  --accent3:#EC4899; --green:#3DD68C; --text:#F0F0F0;
  --muted:rgba(240,240,240,.45); --orange:#F97316;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif}

.t10-page {
  background:var(--bg); color:var(--text); min-height:100vh;
  position:relative; overflow-x:hidden; font-family:'DM Sans',sans-serif;
}
.t10-bg-layer {
  position:absolute; inset:0; pointer-events:none; z-index:0;
  background:
    radial-gradient(circle at 12% 18%, rgba(249,115,22,0.05) 0%, transparent 42%),
    radial-gradient(circle at 88% 82%, rgba(236,72,153,0.04) 0%, transparent 46%);
}
.t10-noise {
  position:absolute; inset:0; pointer-events:none; z-index:1; opacity:.018;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* NAV */
.t10-nav {
  display:flex; align-items:center; justify-content:space-between;
  height:64px; padding:0 24px; position:relative; z-index:10;
  border-bottom:1px solid var(--border);
  background:rgba(5,7,15,0.7); backdrop-filter:blur(12px);
  box-shadow: 0 10px 30px rgba(236, 72, 153, 0.22);
}
.t10-nav-logo {
  font-family:'Bebas Neue',sans-serif; font-size:1.6rem; letter-spacing:2px;
  background:linear-gradient(135deg,var(--orange),var(--accent3));
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text; border:none; cursor:pointer; text-transform:uppercase;
}
.t10-nav-tag {
  font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:2px;
  color:var(--muted); border:1px solid var(--border); padding:5px 12px;
  border-radius:100px; display:flex; align-items:center; gap:6px;
  background:rgba(255,255,255,0.02);
}
.t10-fire-dot {
  width:6px; height:6px; border-radius:50%; background:var(--accent3);
  box-shadow:0 0 8px var(--accent3);
}
.t10-nav-right { display:flex; gap:8px; }
.t10-nav-btn {
  background:var(--surface); border:1px solid var(--border); color:#fff;
  padding:8px 14px; border-radius:10px; font-size:.8rem; font-weight:700;
  cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;
}
.t10-nav-btn:hover { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.2); }

/* MAIN */
.t10-main { width: 84%; max-width:980px; margin:0 auto; padding:28px 16px 80px; position:relative; z-index:5; }

/* START SCREEN */
.t10-start { text-align:left; padding:16px 8px; animation:fadeUp .5s ease both; }
.t10-start-title { font-family:'Bebas Neue',sans-serif; font-size:2.8rem; letter-spacing:1.5px; margin-bottom:12px; color:var(--accent3); }
.t10-start-desc { font-size:.85rem; color:var(--muted); line-height:1.7; margin-bottom:28px; max-width:450px; }
.t10-start-cta {
  background:var(--accent3); color:#fff; border:none; font-weight:900;
  padding:16px 52px; border-radius:15px; font-size:1rem; cursor:pointer;
  font-family:inherit; transition:opacity .2s, transform .15s;
  box-shadow: 0 4px 15px rgba(236,72,153,0.3);
}
.t10-start-cta:hover { opacity:.93; transform:translateY(-2px); }
.t10-start-stats {
  display:flex; gap:8px; justify-content:flex-start; margin-top:28px; flex-wrap:wrap;
}
.t10-start-stat {
  background:rgba(255,255,255,.025); border:1px solid var(--border); border-radius:12px;
  padding:12px 18px; text-align:center; min-width:100px;
}
.t10-start-stat-val { font-family:'Bebas Neue',sans-serif; font-size:1.6rem; letter-spacing:1px; color:#fff; }
.t10-start-stat-lbl { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--muted); margin-top:2px; }

/* GAME HUD */
.t10-hud {
  display:flex; align-items:center; justify-content:space-between;
  background:var(--surface); border:1px solid var(--border); border-radius:14px;
  padding:12px 18px; margin-bottom:16px; animation:fadeUp .4s ease both;
}
.t10-hud-item { text-align:center; }
.t10-hud-val { font-family:'Bebas Neue',sans-serif; font-size:1.85rem; letter-spacing:1px; line-height:1; }
.t10-hud-val.green { color:var(--green); }
.t10-hud-val.red   { color:var(--accent2); }
.t10-hud-val.pink  { color:var(--accent3); }
.t10-hud-lbl { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:1.2px; color:var(--muted); margin-top:2px; }
.t10-hud-sep { width:1px; height:36px; background:var(--border); }

/* QUESTION CARD */
.t10-q-card {
  background:rgba(255,255,255,.025); border:1px solid var(--border2);
  border-radius:18px; padding:22px; margin-bottom:16px; text-align:center;
  animation:cardIn .4s cubic-bezier(.34,1.56,.64,1) both;
}
.t10-q-meta { font-size:.62rem; font-weight:900; text-transform:uppercase; letter-spacing:1.5px; color:var(--accent3); margin-bottom:8px; }
.t10-q-title { font-size:1.15rem; font-weight:700; line-height:1.45; color:#fff; }

/* BOARD LIST */
.t10-board { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
.t10-row {
  display:flex; align-items:center; justify-content:space-between;
  background:rgba(255,255,255,.015); border:1px solid var(--border);
  border-radius:10px; padding:10px 14px; transition:all 0.3s ease;
  min-height:45px;
}
.t10-row.revealed {
  background:rgba(61,214,140,.06); border-color:rgba(61,214,140,.35);
  box-shadow: 0 0 8px rgba(61,214,140,0.1);
}
.t10-row.missed {
  background:rgba(232,64,64,.04); border-color:rgba(232,64,64,.25);
}
.t10-row-num {
  min-width:24px; font-family:'Bebas Neue',sans-serif; font-size:1.2rem; color:var(--muted);
}
.t10-row.revealed .t10-row-num { color:var(--green); }
.t10-row.missed .t10-row-num { color:var(--accent2); }
.t10-row-name { font-size:.86rem; font-weight:600; flex:1; text-align:left; }
.t10-row.locked .t10-row-name { color:var(--muted); font-family:monospace; letter-spacing:1.5px; opacity:0.4; }
.t10-row-val { font-size:.78rem; font-weight:700; color:var(--muted); }
.t10-row.revealed .t10-row-val { color:rgba(61,214,140,0.85); }
.t10-row.missed .t10-row-val { color:rgba(232,64,64,0.8); }

/* INPUT / GUESS ZONE */
.t10-guess-zone { position:relative; margin-bottom:24px; z-index:20; }
.t10-input-wrap { display:flex; gap:8px; }
.t10-input {
  flex:1; background:rgba(5,7,15,0.7); border:1px solid var(--border2);
  border-radius:12px; padding:14px 16px; font-size:.9rem; color:#fff;
  outline:none; transition:all 0.2s; font-family:inherit;
}
.t10-input:focus { border-color:var(--accent3); box-shadow:0 0 10px rgba(236,72,153,0.15); }
.t10-submit-btn {
  background:var(--accent3); color:#fff; border:none; border-radius:12px;
  padding:0 24px; font-size:.88rem; font-weight:700; cursor:pointer;
  transition:opacity 0.2s; font-family:inherit;
}
.t10-submit-btn:hover { opacity:0.9; }

/* SUGGESTIONS DROPDOWN */
.t10-suggestions {
  position:absolute; bottom:calc(100% + 6px); left:0; right:0;
  background:#0c1020; border:1px solid rgba(236,72,153,0.25);
  border-radius:12px; max-height:220px; overflow-y:auto;
  box-shadow: 0 -8px 24px rgba(0,0,0,0.4); z-index:100;
}
.t10-suggestion-item {
  padding:12px 16px; font-size:.85rem; text-align:left; cursor:pointer;
  transition:background 0.15s; border-bottom:1px solid rgba(255,255,255,0.03);
  display:flex; justify-content:space-between; align-items:center;
}
.t10-suggestion-item:hover { background:rgba(236,72,153,0.09); color:var(--accent3); }
.t10-suggestion-type { font-size:.65rem; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; }

/* FEEDBACK MSG */
.t10-feedback {
  text-align:center; font-size:.85rem; font-weight:700; padding:10px 18px;
  border-radius:11px; animation:feedIn .28s ease; margin-bottom:16px;
}
@keyframes feedIn { from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)} }
.t10-feedback.correct { background:rgba(61,214,140,.12); color:var(--green); border:1px solid rgba(61,214,140,.2); }
.t10-feedback.wrong   { background:rgba(232,64,64,.1); color:var(--accent2); border:1px solid rgba(232,64,64,.2); }
.t10-feedback.warn    { background:rgba(247,195,68,.1); color:var(--accent); border:1px solid rgba(247,195,68,.2); }

/* RESULT CARD */
.t10-result-card {
  background:rgba(255,255,255,.03); border:1px solid var(--border2);
  border-radius:20px; padding:36px 24px; text-align:center;
  animation:fadeUp .5s ease both; margin-bottom:24px;
}
.t10-result-badge {
  display:inline-block; padding:5px 14px; border-radius:100px;
  font-size:.62rem; font-weight:900; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px;
}
.t10-result-badge.great { background:rgba(61,214,140,.12); color:var(--green); border:1px solid rgba(61,214,140,.3); }
.t10-result-badge.ok    { background:rgba(247,195,68,.12); color:var(--accent); border:1px solid rgba(247,195,68,.3); }
.t10-result-badge.poor  { background:rgba(232,64,64,.12); color:var(--accent2); border:1px solid rgba(232,64,64,.3); }
.t10-result-title { font-family:'Bebas Neue',sans-serif; font-size:2.6rem; letter-spacing:1px; margin-bottom:4px; }
.t10-result-sub { font-size:.8rem; color:var(--muted); margin-bottom:22px; }
.t10-score-big { font-family:'Bebas Neue',sans-serif; font-size:4.8rem; letter-spacing:2px; color:var(--accent3); line-height:1; }
.t10-score-label { font-size:.72rem; color:var(--muted); font-weight:600; margin-bottom:24px; }
.t10-result-breakdown {
  display:grid; grid-template-columns:repeat(3,1fr); gap:10px;
  background:rgba(5,7,15,.4); border:1px solid var(--border); border-radius:14px;
  padding:14px 10px; margin-bottom:24px;
}
.t10-rb-item { text-align:center; }
.t10-rb-val { font-family:'Bebas Neue',sans-serif; font-size:1.55rem; letter-spacing:.5px; }
.t10-rb-val.green { color:var(--green); }
.t10-rb-val.red   { color:var(--accent2); }
.t10-rb-lbl { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); margin-top:2px; }

.t10-xp-badge {
  background:linear-gradient(135deg,rgba(236,72,153,0.12) 0%,rgba(249,115,22,0.12) 100%);
  border:1px solid rgba(236,72,153,0.25); border-radius:100px;
  padding:6px 16px; display:inline-flex; align-items:center; gap:6px;
  font-size:.78rem; font-weight:700; color:var(--accent3); margin-bottom:20px;
}
.t10-result-actions { display:flex; gap:9px; justify-content:center; }
.t10-btn {
  padding:12px 20px; border-radius:12px; font-size:.84rem; font-weight:700;
  cursor:pointer; font-family:inherit; transition:opacity .2s, transform .15s; border:none;
}
.t10-btn:hover { opacity:.9; transform:translateY(-1px); }
.t10-btn.primary   { background:var(--accent3); color:#fff; flex:1.2; box-shadow: 0 4px 12px rgba(236,72,153,0.25); }
.t10-btn.secondary { background:var(--surface); color:#fff; border:1px solid var(--border2); flex:1; }
.t10-btn.ghost     { background:transparent; color:var(--muted); border:1px solid transparent; }

/* MODAL */
.t10-modal-overlay {
  display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.84);
  backdrop-filter:blur(14px); justify-content:center; align-items:center; padding:20px;
}
.t10-modal-overlay.active { display:flex; animation:fadeIn .22s ease; }
@keyframes fadeIn { from{opacity:0}to{opacity:1} }
.t10-modal-box {
  background:#0c1020; border:1px solid rgba(236,72,153,.25); border-radius:24px;
  padding:40px 32px; max-width:480px; width:100%; max-height:88vh; overflow-y:auto;
  position:relative; animation:modalUp .3s cubic-bezier(.4,0,.2,1);
}
.t10-modal-box::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--orange),var(--accent3),var(--orange));
  border-radius:24px 24px 0 0;
}
@keyframes modalUp { from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none} }
.t10-modal-title { font-family:'Bebas Neue',sans-serif; font-size:2.2rem; letter-spacing:2px; text-align:center; margin-bottom:22px; }
.t10-rules-list { list-style:none; margin-bottom:22px; display:flex; flex-direction:column; gap:8px; }
.t10-rules-list li {
  background:var(--surface); border:1px solid var(--border); border-left:3px solid rgba(236,72,153,0.45);
  border-radius:12px; padding:12px 15px; font-size:.86rem; line-height:1.6;
  transition:border-color .2s, transform .2s;
}
.t10-rules-list li:hover { border-left-color:var(--accent3); transform:translateX(4px); }
.t10-modal-close {
  width:100%; padding:13px; font-size:.9rem; border-radius:12px; background:var(--accent3);
  color:#fff; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:700;
  transition:opacity .2s;
}
.t10-modal-close:hover { opacity:.88; }

/* SPINNER */
.t10-spinner { display:flex; align-items:center; justify-content:center; height:100vh; background:var(--bg); }
.t10-spinner-ring {
  width:28px; height:28px; border-radius:50%; border:3px solid rgba(255,255,255,.07);
  border-top-color:var(--accent3); animation:spin .7s linear infinite;
}
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }

/* MSG BANNER */
.t10-msg-banner {
  position:fixed; top:76px; left:50%; transform:translateX(-50%);
  padding:10px 20px; border-radius:10px; z-index:100000;
  font-size:.85rem; font-weight:700; box-shadow:0 8px 24px rgba(0,0,0,.3);
  pointer-events:none; animation:feedIn .25s ease;
}

/* ── PROGRESS / BOTTOM DASHBOARD ── */
.t10-bottom-section {
  margin-top: 50px;
  animation: fadeUp 0.5s ease 0.2s both;
}
.t10-section-divider {
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.t10-section-label {
  font-size: 0.65rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 2px; color: rgba(240,240,240,0.45);
}
.t10-section-line {
  flex: 1; height: 1px; background: linear-gradient(to right, rgba(236,72,153,0.18), transparent);
}
.t10-dashboard-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.t10-dash-card {
  background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 18px; display: flex; flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
.t10-dash-card-hdr {
  display: flex; align-items: center; gap: 6px; margin-bottom: 14px;
}
.t10-dash-icon { font-size: .95rem; }
.t10-dash-label {
  font-size: .68rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; color: rgba(240,240,240,0.45);
}
.t10-streak-dots {
  display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; margin-top: 4px; margin-bottom: 16px;
}
.t10-streak-dot {
  aspect-ratio: 1; border-radius: 4px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.05);
}
.t10-streak-dot.win {
  background: rgba(236,72,153,.18); border-color: rgba(236,72,153,.32);
  box-shadow: 0 0 6px rgba(236,72,153,0.15);
}
.t10-streak-dot.miss {
  background: rgba(232,64,64,.08); border-color: rgba(232,64,64,.18);
}
.t10-streak-dot.played {
  background: rgba(236,72,153,.14); border-color: var(--accent3); box-shadow:0 0 10px rgba(236,72,153,.2);
}
.t10-streak-dot.pending {
  background: rgba(236,72,153,.09); border-style: dashed; border-color: rgba(236,72,153,.38);
}
.t10-streak-legend {
  display: flex; gap: 13px; font-size: .68rem; color: rgba(240,240,240,0.45); align-items: center; flex-wrap: wrap;
  margin-top: auto;
}
.t10-dot-sample {
  display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 4px; vertical-align: middle;
}
.t10-dot-sample.win { background: rgba(236,72,153,.18); border: 1px solid #EC4899; }
.t10-dot-sample.miss { background: rgba(232,64,64,.08); border: 1px solid rgba(232,64,64,0.18); }
.t10-dot-sample.played { background: rgba(236,72,153,.14); border: 1px solid var(--accent3); }

.t10-stats-grid {
  flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px;
}
.t10-stat-item {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
  padding: 14px 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: border-color .2s, background .2s;
}
.t10-stat-item:hover {
  border-color: rgba(236,72,153,.22); background: rgba(236,72,153,.03);
}
.t10-stat-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 1px;
  background: linear-gradient(135deg,var(--accent3),#fff 80%); -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; margin-bottom: 3px;
}
.t10-stat-name {
  font-size: .62rem; font-weight: 700; color: rgba(240,240,240,0.45); text-transform: uppercase; letter-spacing: .5px; margin-top: 1px;
}

/* RESPONSIVE */
@media(max-width:700px){
  .t10-nav { padding:0 14px; height:54px; }
  .t10-main { width: 100%; padding:16px 12px 56px; }
  .t10-start-title { font-size:2.1rem; }
  .t10-result-breakdown { grid-template-columns: 1fr 1fr; }
  .t10-result-card { padding:28px 16px; }
  .t10-result-actions { flex-direction:column; align-items:stretch; }
  .t10-dashboard-grid { grid-template-columns: 1fr; }
}
`;

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Top10Guess() {
  const navigate = useNavigate();

  // States
  const [phase, setPhase]                 = useState('start'); // 'start' | 'game' | 'result'
  const [revealed, setRevealed]           = useState(Array(10).fill(false));
  const [lives, setLives]                 = useState(3);
  const [query, setQuery]                 = useState("");
  const [feedback, setFeedback]           = useState(null);
  const [wrongGuesses, setWrongGuesses]   = useState([]);
  const [xpAwarded, setXpAwarded]         = useState(null);
  const [showModal, setShowModal]         = useState(false);
  const [msg, setMsg]                     = useState(null);
  const [hasWatchedAd, setHasWatchedAd]   = useState(false);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const [isRaid, setIsRaid]               = useState(false);

  const [stats, setStats]                 = useState(loadStats);
  const [history, setHistory]             = useState(loadHistory);

  const inputRef = useRef(null);

  const puzzleDate = getActivePuzzleDate();

  const activeQuestion = useMemo(() => {
    let seed = getDailySeed(puzzleDate);
    const sessionSeed = localStorage.getItem('active_game_session_seed');
    if (sessionSeed) {
      seed = parseInt(sessionSeed);
    }
    const offset = 199;
    const idx = (seed + offset) % TOP10_QUESTIONS.length;
    return TOP10_QUESTIONS[idx];
  }, [puzzleDate]);

  const isClubQuestion = activeQuestion?.question.toLowerCase().includes('club');

  function persist(newRevealed, newLives, newWrongGuesses, newPhase, newXpAwarded = null) {
    if (isRaid) return;
    const key = `top10_${puzzleDate}_state`;
    localStorage.setItem(key, JSON.stringify({
      revealed: newRevealed,
      lives: newLives,
      wrongGuesses: newWrongGuesses,
      phase: newPhase,
      xpAwarded: newXpAwarded !== null ? newXpAwarded : xpAwarded,
      hasWatchedAd: hasWatchedAd
    }));
  }

  useEffect(() => {
    let isRaid = !!localStorage.getItem('active_game_session_id');

    setIsRaid(isRaid);

    if (isRaid) {
      setPhase('game');
      setRevealed(Array(10).fill(false));
      setLives(1);
      setWrongGuesses([]);
      setXpAwarded(null);
      setHasWatchedAd(false);
      return;
    }

    const key = `top10_${puzzleDate}_state`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const s = JSON.parse(saved);
      setRevealed(s.revealed || Array(10).fill(false));
      setLives(s.lives ?? 3);
      setWrongGuesses(s.wrongGuesses || []);
      setXpAwarded(s.xpAwarded ?? null);
      setHasWatchedAd(s.hasWatchedAd === true);
      setPhase(s.phase || 'start');
    } else {
      const hist = loadHistory();
      if (hist[puzzleDate]) {
        setPhase('result');
        setRevealed(Array(10).fill(true));
        setLives(3);
      }
    }
  }, [puzzleDate]);

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById('t10-injected-css')) {
      const s = document.createElement('style');
      s.id = 't10-injected-css';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  function showMsg(text, type = 'info', duration = 3000) {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), duration);
  }

  // Generate suggestions list based on text input
  const suggestions = useMemo(() => {
    const qNorm = normalize(query);
    if (qNorm.length < 2) return [];

    // Suggestions pool: 1. Active question answers (so they are always suggestible!)
    const activeQuestionAnswers = activeQuestion?.answers?.map(ans => ({
      name: ans?.name ? ans.name.split(' (')[0] : '',
      type: isClubQuestion ? 'club' : 'player'
    })).filter(item => item.name) || [];

    // 2. Player names and popular clubs
    const playerSuggestions = (PLAYERS || []).map(p => ({ name: p?.name || '', type: 'player' })).filter(item => item.name);
    const clubSuggestions = (POPULAR_CLUBS || []).map(c => ({ name: c || '', type: 'club' })).filter(item => item.name);
    const combined = [...activeQuestionAnswers, ...playerSuggestions, ...clubSuggestions];

    // Filter unique matches
    const matches = [];
    const seen = new Set();

    for (const item of combined) {
      if (!item || !item.name) continue;
      const normName = normalize(item.name);
      if (seen.has(normName)) continue;

      if (normName.includes(qNorm)) {
        matches.push(item);
        seen.add(normName);
      }
      if (matches.length >= 6) break; // cap suggestions at 6
    }

    return matches;
  }, [query, activeQuestion, isClubQuestion]);

  // Start a new session
  function startGame() {
    setRevealed(Array(10).fill(false));
    setLives(3);
    setQuery("");
    setWrongGuesses([]);
    setFeedback(null);
    setXpAwarded(null);
    setHasWatchedAd(false);
    setShowAdOverlay(false);
    setPhase('game');
    persist(Array(10).fill(false), 3, [], 'game', null);

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // Handle submissions
  function handleGuess(guessStr) {
    const norm = normalize(guessStr);
    if (!norm) return;

    // Search active question's answers accepts lists
    let foundIdx = -1;
    for (let i = 0; i < activeQuestion.answers.length; i++) {
      const ans = activeQuestion.answers[i];
      if (ans.accepts.some(alias => normalize(alias) === norm)) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx !== -1) {
      if (revealed[foundIdx]) {
        setFeedback({ text: `⚠️ "${activeQuestion.answers[foundIdx].name}" has already been revealed!`, cls: 'warn' });
        setQuery("");
      } else {
        const newRevealed = [...revealed];
        newRevealed[foundIdx] = true;
        setRevealed(newRevealed);
        setFeedback({ text: `✓ Correct! "${activeQuestion.answers[foundIdx].name}" is on the list!`, cls: 'correct' });
        setQuery("");
        persist(newRevealed, lives, wrongGuesses, 'game');

        // Check if won (all 10 revealed)
        if (newRevealed.every(Boolean)) {
          setTimeout(() => endGame(newRevealed, lives), 1500);
        }
      }
    } else {
      if (wrongGuesses.includes(norm)) {
        setFeedback({ text: `⚠️ You already guessed that incorrectly!`, cls: 'warn' });
        return;
      }
      const newWrong = [...wrongGuesses, norm];
      setWrongGuesses(newWrong);
      const newLives = lives - 1;
      setLives(newLives);
      setFeedback({ text: `✗ Incorrect! "${guessStr}" is not on the list. -1 Life`, cls: 'wrong' });
      setQuery("");
      persist(revealed, newLives, newWrong, 'game');

      if (newLives <= 0) {
        if (!hasWatchedAd && !isRaid) {
          setTimeout(() => setShowAdOverlay(true), 1500);
        } else {
          setTimeout(() => endGame(revealed, 0), 1500);
        }
      }
    }
  }

  function handleWatchAd() {
    setShowAdOverlay(false);
    adBreak({
      type: 'reward',
      name: 'top10-extra-life',
      beforeAd: () => {},
      adViewed: () => {},
      adBreakDone: () => {
        setLives(1);
        setHasWatchedAd(true);
        setFeedback({ text: "📺 Ad viewed! +1 Extra Life restored. Keep guessing!", cls: "correct" });
        localStorage.setItem(`top10_${puzzleDate}_state`, JSON.stringify({
          revealed: revealed,
          lives: 1,
          wrongGuesses: wrongGuesses,
          phase: 'game',
          xpAwarded: xpAwarded,
          hasWatchedAd: true
        }));
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    });
  }

  async function endGame(finalRevealed, finalLives) {
    setPhase('result');
    const correctCount = finalRevealed.filter(Boolean).length;
    if (!isRaid) {
      const { stats: newStats, history: newHistory } = saveStats(correctCount, puzzleDate);
      setStats(newStats);
      setHistory(newHistory);
    }

    const user = getUser();
    let awarded = 0;
    if (user?.userId) {
      try {
        const computedXP = calculateXP(correctCount, wrongGuesses.length);
        const res = await awardXP(user.userId, 'top10_complete', { rawXP: computedXP, correctCount: correctCount });
        awarded = res?.xpAwarded ?? 0;
      } catch (e) {
        console.error('[Top10Guess] awardXP failed:', e);
      }
    }
    setXpAwarded(awarded);
    if (!isRaid) {
      localStorage.setItem(`top10_${puzzleDate}_state`, JSON.stringify({
        revealed: finalRevealed,
        lives: finalLives,
        wrongGuesses: wrongGuesses,
        phase: 'result',
        xpAwarded: awarded,
        hasWatchedAd: hasWatchedAd
      }));
    }
  }

  function handleShare() {
    const correctCount = revealed.filter(Boolean).length;
    const blocks = revealed.map(r => r ? '🟢' : '🔴').join('');
    const text = [
      `📊 Footbrawls Top 10 Guess`,
      `Category: ${activeQuestion.question}`,
      `Guessed: ${correctCount}/10 correct`,
      `Remaining Lives: ${lives} ❤️`,
      `${blocks}`,
      `https://footbrawls.vercel.app/games/top10`,
    ].join('\n');
    if (navigator.share) { navigator.share({ text }).catch(() => {}); }
    else { navigator.clipboard?.writeText(text); showMsg('Result copied!', 'success'); }
  }

  // Render components
  const correctCount = revealed.filter(Boolean).length;
  const missedCount = 10 - correctCount;

  return (
    <>
      <div className="t10-page">
        <div className="t10-bg-layer" />
        <div className="t10-noise" />

        {msg && (
          <div
            className="t10-msg-banner"
            style={{
              background: msg.type === 'success'
                ? 'rgba(61,214,140,0.95)'
                : msg.type === 'error'
                  ? 'rgba(232,64,64,0.95)'
                  : 'rgba(247,195,68,0.95)',
              color: msg.type === 'success' ? '#fff' : '#000',
            }}
          >
            {msg.text}
          </div>
        )}

        <HowToPlayModal show={showModal} onClose={() => setShowModal(false)} />

        {showAdOverlay && (
          <div className="t10-modal-overlay active">
            <div className="t10-modal-box">
              <h2 className="t10-modal-title">📺 Out of Lives!</h2>
              <div style={{ textAlign: 'center', marginBottom: 24, fontSize: '.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                You ran out of hearts. Watch a quick video to get <strong style={{ color: 'var(--accent3)' }}>+1 Extra Life</strong> and continue guessing!
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="t10-modal-close" onClick={handleWatchAd} style={{ background: 'var(--accent3)' }}>
                  📺 Watch Video Ad
                </button>
                <button className="t10-btn secondary" onClick={() => { setShowAdOverlay(false); endGame(revealed, 0); }}>
                  No thanks, show results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NAV */}
        <nav className="t10-nav">
          {!isRaid && <button className="t10-nav-logo" onClick={() => navigate('/')}>←</button>}
          <div className="t10-nav-tag">
            <span className="t10-fire-dot" />
            Top 10 Guess
          </div>
          <div className="t10-nav-right">
            <button className="t10-nav-btn" onClick={() => setShowModal(true)}>❓ Help</button>
          </div>
        </nav>

        <main className="t10-main">

          {/* START PHASE */}
          {phase === 'start' && (
            <div className="t10-start">
              <div className="t10-start-title">Top 10 Guess</div>
              <div className="t10-start-desc">
                Can you name the top 10 items in different football statistics? 
                Type your guesses and reveal the board. You only have 3 lives!
              </div>
              <button className="t10-start-cta" onClick={startGame}>Start Guessing ⚡</button>
            </div>
          )}

          {/* GAMEPLAY PHASE */}
          {phase === 'game' && activeQuestion && (
            <>
              {/* HUD */}
              <div className="t10-hud">
                <div className="t10-hud-item">
                  <div className="t10-hud-val green">{correctCount}/10</div>
                  <div className="t10-hud-lbl">Correct</div>
                </div>
                <div className="t10-hud-sep" />
                <div className="t10-hud-item">
                  <div className="t10-hud-val pink">
                    {Array(3).fill(0).map((_, i) => (
                      <span key={i} style={{ opacity: i < lives ? 1 : 0.2, margin: '0 1px' }}>❤️</span>
                    ))}
                  </div>
                  <div className="t10-hud-lbl">Lives</div>
                </div>
                <div className="t10-hud-sep" />
                <div className="t10-hud-item">
                  <div className="t10-hud-val red">{wrongGuesses.length}</div>
                  <div className="t10-hud-lbl">Strikes</div>
                </div>
              </div>

              {/* Question */}
              <div className="t10-q-card">
                <div className="t10-q-meta">FOOTBALL STATISTIC</div>
                <div className="t10-q-title">Top 10: {activeQuestion.question}</div>
              </div>

              {/* Guess input */}
              <div className="t10-guess-zone">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (query.trim()) handleGuess(query.trim());
                  }}
                  className="t10-input-wrap"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    className="t10-input"
                    placeholder="Type a player name or club..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button type="submit" className="t10-submit-btn">Submit</button>
                </form>

                {/* Suggestions Dropdown */}
                {suggestions.length > 0 && (
                  <div className="t10-suggestions">
                    {suggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="t10-suggestion-item"
                        onClick={() => {
                          handleGuess(item.name);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <WikiAvatar name={item.name} isClub={item.type === 'club'} />
                          <span>{item.name}</span>
                        </div>
                        <span className="t10-suggestion-type">{item.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div className={`t10-feedback ${feedback.cls}`} key={feedback.text}>
                  {feedback.text}
                </div>
              )}

              {/* Top 10 Board */}
              <div className="t10-board">
                {activeQuestion.answers.map((ans, idx) => (
                  <div key={idx} className={`t10-row ${revealed[idx] ? 'revealed' : 'locked'}`}>
                    <span className="t10-row-num">#{idx + 1}</span>
                    {revealed[idx] ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <WikiAvatar name={ans.name} isClub={isClubQuestion} />
                          <span className="t10-row-name">{ans.name}</span>
                        </div>
                        <span className="t10-row-val">{ans.value}</span>
                      </>
                    ) : (
                      <span className="t10-row-name" style={{ color: 'var(--muted)', fontFamily: 'monospace', letterSpacing: '1.5px', opacity: 0.4 }}>
                        — — — — — — —
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* RESULT PHASE */}
          {phase === 'result' && activeQuestion && (() => {
            const pct = Math.round((correctCount / 10) * 100);
            let badgeCls, title, badgeText;
            if (pct >= 80)      { badgeCls = 'great'; title = 'World Class!'; badgeText = 'Elite knowledge'; }
            else if (pct >= 60) { badgeCls = 'ok';    title = 'Solid Score!'; badgeText = 'Good effort'; }
            else                { badgeCls = 'poor';   title = 'Room to Grow!'; badgeText = 'Keep studying'; }

            return (
              <>
                <div className="t10-result-card">
                  <div className={`t10-result-badge ${badgeCls}`}>{badgeText}</div>
                  <div className="t10-result-title">{title}</div>
                  <div className="t10-result-sub">Category: {activeQuestion.question}</div>

                  {xpAwarded != null && (
                    <div className="t10-xp-badge">
                      {xpAwarded > 0 ? `+${xpAwarded} XP earned` : 'Daily XP limit reached'}
                    </div>
                  )}

                  <div className="t10-score-big">{correctCount}</div>
                  <div className="t10-score-label">out of 10 guessed correctly</div>

                  <div className="t10-result-breakdown">
                    <div className="t10-rb-item">
                      <div className="t10-rb-val green">{correctCount}</div>
                      <div className="t10-rb-lbl">Revealed</div>
                    </div>
                    <div className="t10-rb-item">
                      <div className="t10-rb-val red">{missedCount}</div>
                      <div className="t10-rb-lbl">Missed</div>
                    </div>
                    <div className="t10-rb-item">
                      <div className="t10-rb-val" style={{ color: 'var(--accent3)' }}>{lives} ❤️</div>
                      <div className="t10-rb-lbl">Lives Left</div>
                    </div>
                  </div>

                  {!isRaid && (
                    <div className="t10-result-actions">
                      <button className="t10-btn primary" onClick={handleShare} style={{ flex: 1 }}>Share result 📤</button>
                    </div>
                  )}
                </div>

                {/* Revealing the full board */}
                <h3 style={{ fontSize: '.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', color: 'var(--muted)' }}>
                  Complete List Revealed
                </h3>
                <div className="t10-board">
                  {activeQuestion.answers.map((ans, idx) => {
                    const wasCorrect = revealed[idx];
                    return (
                      <div key={idx} className={`t10-row ${wasCorrect ? 'revealed' : 'missed'}`}>
                        <span className="t10-row-num">#{idx + 1}</span>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <WikiAvatar name={ans.name} isClub={isClubQuestion} />
                          <span className="t10-row-name" style={{ color: wasCorrect ? 'var(--green)' : '#ff6b6b' }}>
                            {ans.name} {!wasCorrect && <span style={{ fontSize: '.7rem', opacity: 0.5 }}>(Missed)</span>}
                          </span>
                        </div>
                        <span className="t10-row-val">{ans.value}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  {isRaid ? (
                    <button className="t10-btn ghost" onClick={() => navigate('/raid')}>⚔️ Return to Raid</button>
                  ) : (
                    <button className="t10-btn ghost" onClick={() => navigate('/')}>← Back to Home</button>
                  )}
                </div>
              </>
            );
          })()}

          {/* DASHBOARD PANEL */}
          <div className="t10-bottom-section">
            <div className="t10-section-divider">
              <span className="t10-section-label">Your Progress</span>
              <div className="t10-section-line" />
            </div>
            <div className="t10-dashboard-grid">
              <div className="t10-dash-card">
                <div className="t10-dash-card-hdr">
                  <span className="t10-dash-icon">📅</span>
                  <span className="t10-dash-label">Last 30 Days</span>
                </div>
                <StreakDots history={history} puzzleDate={puzzleDate} phase={phase} />
                <div className="t10-streak-legend">
                  <span><span className="t10-dot-sample win" />6+ Solved</span>
                  <span><span className="t10-dot-sample miss" />Under 6</span>
                  <span><span className="t10-dot-sample played" />Today</span>
                </div>
              </div>
              <div className="t10-dash-card">
                <div className="t10-dash-card-hdr">
                  <span className="t10-dash-icon">📊</span>
                  <span className="t10-dash-label">Your Stats</span>
                </div>
                <div className="t10-stats-grid">
                  <div className="t10-stat-item">
                    <div className="t10-stat-value">{stats.played || '—'}</div>
                    <div className="t10-stat-name">Played</div>
                  </div>
                  <div className="t10-stat-item">
                    <div className="t10-stat-value">{stats.bestScore != null ? `${stats.bestScore}/10` : '—'}</div>
                    <div className="t10-stat-name">Best Score</div>
                  </div>
                  <div className="t10-stat-item">
                    <div className="t10-stat-value">{stats.avgScore ? `${stats.avgScore}` : '—'}</div>
                    <div className="t10-stat-name">Avg Score</div>
                  </div>
                  <div className="t10-stat-item">
                    <div className="t10-stat-value">{stats.streak || '—'}</div>
                    <div className="t10-stat-name">Streak</div>
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
  const dots  = [];
  const base = new Date(puzzleDate + "T00:00:00Z");
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(base.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    const isToday = key === puzzleDate;
    let cls = '';
    if (isToday) {
      const e = history[key];
      if (e) {
        cls = e.correct >= 6 ? 'win' : 'miss';
      } else {
        cls = (phase === 'result') ? 'played' : 'pending';
      }
    } else {
      const e = history[key];
      cls = e ? (e.correct >= 6 ? 'win' : 'miss') : 'miss';
    }
    dots.push(cls);
  }
  return (
    <div className="t10-streak-dots">
      {dots.map((cls, i) => <div key={i} className={`t10-streak-dot ${cls}`} />)}
    </div>
  );
}

// ─── How to Play Modal ────────────────────────────────────────────────────────
function HowToPlayModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className={`t10-modal-overlay${show ? ' active' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t10-modal-box">
        <h2 className="t10-modal-title">⚡ How to Play</h2>
        <ul className="t10-rules-list">
          <li><strong>🎯 Goal:</strong> Guess the top 10 football items for the given category statistic</li>
          <li><strong>⌨️ Input:</strong> Type player or club names. Autocomplete suggestions will help with spelling</li>
          <li><strong>❤️ Lives:</strong> You start with 3 lives. Every incorrect guess costs you 1 life</li>
          <li><strong>🚫 Double Penalty:</strong> You won't be penalized twice for entering the same incorrect guess</li>
          <li><strong>🏆 Win Condition:</strong> Reveal all 10 items or exit with lives remaining. 6+ correct counts as a win</li>
          <li><strong>🎁 XP Rewards:</strong> Earn up to 25 XP based on how many correct items you guess</li>
        </ul>
        <button className="t10-modal-close" onClick={onClose}>🚀 Let's Go!</button>
      </div>
    </div>
  );
}
