/**
 * Wordle.jsx — Player Wordle for Footbrawls
 * UI theme ported from Crickingo wordle.html/wordle.js
 * Letter-by-letter guess: green = correct position, orange = wrong position, grey = absent
 */

import { useState, useEffect, useRef } from "react";
import { getDailyPlayer, getActivePuzzleDate } from "../../lib/dailySeed.js";
import { awardXP } from "../../lib/xpEngine.js";
import { getUser } from "../../lib/user";

// ─── XP table ────────────────────────────────────────────────────────────────
const XP_BY_GUESS = { 1:20, 2:20, 3:20, 4:15, 5:10, 6:5 };
const MAX_GUESSES = 6;
const STATS_KEY   = "footbrawls_wordle_stats";
const HISTORY_KEY = "footbrawls_wordle_history";

// ─── Injected CSS (Crickingo theme) ──────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700;9..40,900&display=swap');
:root {
  --bg:#05070f; --surface:rgba(255,255,255,0.038); --surface2:rgba(255,255,255,0.065);
  --border:rgba(255,255,255,0.08); --border2:rgba(255,255,255,0.13);
  --accent:#F7C344; --accent2:#E84040; --accent3:#A855F7;
  --green:#3DD68C; --orange:#ffa400;
  --text:#F0F0F0; --muted:rgba(240,240,240,0.45); --muted2:rgba(240,240,240,0.25);
}
.wdl-bg { position:fixed;inset:0;z-index:0;pointer-events:none; }
.wdl-bg::before {
  content:'';position:absolute;inset:0;
  background:
    radial-gradient(ellipse 80% 60% at 8% -5%, rgba(168,85,247,0.1) 0%,transparent 55%),
    radial-gradient(ellipse 60% 50% at 95% 105%,rgba(247,195,68,0.07) 0%,transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(61,214,140,0.04) 0%,transparent 65%);
}
.wdl-bg::after {
  content:'';position:absolute;inset:0;
  background-image:repeating-linear-gradient(-45deg,transparent,transparent 48px,rgba(255,255,255,0.008) 48px,rgba(255,255,255,0.008) 49px);
}
.wdl-noise { position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.022;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:200px 200px; }

/* NAV */
.wdl-nav { position:sticky;top:0;z-index:200;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 20px;height:58px;background:rgba(5,7,15,0.82);backdrop-filter:blur(24px) saturate(1.4);border-bottom:1px solid rgba(168,85,247,0.12); }
.wdl-logo { font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:3px;background:linear-gradient(100deg,#F7C344 0%,#ffe9a0 50%,#F7C344 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:logoShimmer 4s linear infinite; }
@keyframes logoShimmer{from{background-position:0% center}to{background-position:200% center}}
.wdl-nav-tag { display:flex;align-items:center;gap:7px;font-family:'DM Sans',sans-serif;font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--accent3);background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.28);padding:5px 14px;border-radius:100px; }
.wdl-tag-dot { width:6px;height:6px;border-radius:50%;background:var(--accent3);animation:blink 1.5s ease infinite; }
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
.wdl-help-btn { width:34px;height:34px;border-radius:50%;border:1px solid var(--border2);background:var(--surface);color:var(--muted);font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;margin-left:auto; }
.wdl-help-btn:hover { background:rgba(168,85,247,0.12);border-color:rgba(168,85,247,0.4);color:var(--accent3);transform:scale(1.1); }

/* PAGE */
.wdl-page { position:relative;z-index:1;max-width:520px;margin:0 auto;padding:28px 20px 100px;font-family:'DM Sans',sans-serif; }

/* PUZZLE BAR */
.wdl-puzzle-bar { display:flex;align-items:center;gap:0;margin-bottom:20px;width:fit-content;background:rgba(168,85,247,0.05);border:1px solid rgba(168,85,247,0.15);border-radius:12px;overflow:hidden;animation:fadeUp 0.5s ease 0.05s both; }
.wdl-puzzle-item { display:flex;align-items:center;gap:7px;padding:9px 16px;font-size:0.77rem;color:var(--muted);font-family:'DM Sans',sans-serif; }
.wdl-puzzle-item strong { color:var(--accent3);font-weight:700; }
.wdl-puzzle-sep { width:1px;background:rgba(168,85,247,0.15);align-self:stretch; }

/* SCORE BOX */
.wdl-score-box { background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:18px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;position:relative;overflow:hidden;animation:fadeUp 0.5s ease 0.08s both; }
.wdl-score-box::before { content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(247,195,68,0.06),transparent 60%);pointer-events:none; }
.wdl-score-label { font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:3px; }
.wdl-score-value { font-family:'Bebas Neue',sans-serif;font-size:1.9rem;letter-spacing:1px;background:linear-gradient(135deg,var(--accent),#ffd700);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }

/* HINT BOX */
.wdl-hint { background:rgba(168,85,247,0.07);border:1px solid rgba(168,85,247,0.22);border-radius:14px;padding:12px 16px;display:flex;align-items:center;gap:12px;margin-bottom:16px;animation:fadeUp 0.3s ease; }
.wdl-hint-icon { font-size:1.2rem; }
.wdl-hint-text { font-size:0.86rem;color:var(--text);line-height:1.5; }
.wdl-hint-text strong { color:var(--accent); }

/* MESSAGE */
.wdl-msg { border-radius:14px;padding:11px 18px;font-size:0.86rem;font-weight:700;text-align:center;margin-bottom:16px;animation:fadeUp 0.3s ease;border:1px solid; }
.wdl-msg-error   { background:rgba(232,64,64,0.1);color:#ff8080;border-color:rgba(232,64,64,0.35); }
.wdl-msg-success { background:rgba(61,214,140,0.1);color:var(--green);border-color:rgba(61,214,140,0.35); }
.wdl-msg-info    { background:rgba(168,85,247,0.1);color:var(--accent3);border-color:rgba(168,85,247,0.35); }

/* GAME CARD */
.wdl-game-card { background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px 20px;margin-bottom:18px;animation:fadeUp 0.5s ease 0.12s both;position:relative;overflow:hidden; }
.wdl-game-card::before { content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(168,85,247,0.04),transparent 60%);pointer-events:none; }

/* LEGEND */
.wdl-legend { display:flex;gap:16px;justify-content:center;margin-bottom:22px;flex-wrap:wrap; }
.wdl-legend-item { display:flex;align-items:center;gap:6px;font-size:0.72rem;color:var(--muted); }
.wdl-legend-dot { width:12px;height:12px;border-radius:3px;flex-shrink:0; }

/* BOARD */
.wdl-board { display:flex;flex-direction:column;gap:8px;margin-bottom:24px;align-items:center; }
.wdl-row { display:flex;gap:8px;justify-content:center; }

/* TILES */
.wdl-tile { width:52px;height:52px;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:1.35rem;font-weight:800;text-transform:uppercase;border-radius:10px;transition:all 0.22s cubic-bezier(0.4,0,0.2,1);background:var(--surface);color:var(--text);font-family:'DM Sans',sans-serif; }
.wdl-tile.filled { border-color:rgba(168,85,247,0.4);background:rgba(168,85,247,0.08);animation:tilePop 0.2s cubic-bezier(0.4,0,0.2,1); }
.wdl-tile.correct { background:rgba(61,214,140,0.18);border-color:var(--green);color:var(--green);box-shadow:0 0 14px rgba(61,214,140,0.2);font-weight:900; }
.wdl-tile.present { background:rgba(255,164,0,0.15);border-color:var(--orange);color:var(--orange);box-shadow:0 0 14px rgba(255,164,0,0.18);font-weight:900; }
.wdl-tile.absent  { background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);color:var(--muted); }
@keyframes tilePop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes tileReveal{0%{transform:rotateX(0)}50%{transform:rotateX(-90deg)}100%{transform:rotateX(0)}}
.wdl-tile.revealing { animation:tileReveal 0.4s ease forwards; }

/* INPUT */
.wdl-input-row { display:flex;gap:10px;position:relative;z-index:1; }
.wdl-input { flex:1;padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:0.95rem;font-weight:600;background:var(--surface2);border:1px solid var(--border2);border-radius:12px;color:var(--text);text-transform:uppercase;transition:border-color 0.2s,box-shadow 0.2s;outline:none; }
.wdl-input::placeholder { color:var(--muted);text-transform:none;font-weight:400; }
.wdl-input:focus { border-color:var(--accent3);box-shadow:0 0 0 3px rgba(168,85,247,0.12); }
.wdl-submit { background:var(--accent3);color:#fff;padding:13px 24px;border-radius:12px;border:none;font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:800;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.22s ease;box-shadow:0 4px 16px rgba(168,85,247,0.28);white-space:nowrap; }
.wdl-submit:hover { background:#be7af5;transform:translateY(-2px);box-shadow:0 8px 24px rgba(168,85,247,0.42); }
.wdl-submit:disabled { background:var(--surface2);color:var(--muted);box-shadow:none;cursor:not-allowed;transform:none; }

.wdl-attempt-counter { text-align:center;font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:14px;position:relative;z-index:1; }

/* CONTROLS */
.wdl-controls { display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:18px;animation:fadeUp 0.5s ease 0.18s both; }
.wdl-btn { display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.83rem;font-weight:700;cursor:pointer;transition:all 0.22s ease;text-transform:uppercase;letter-spacing:0.5px; }
.wdl-btn-restart { background:rgba(61,214,140,0.12);color:var(--green);border:1px solid rgba(61,214,140,0.28); }
.wdl-btn-restart:hover { background:rgba(61,214,140,0.22);transform:translateY(-2px); }
.wdl-btn-back { background:var(--surface);color:var(--muted);border:1px solid var(--border); }
.wdl-btn-back:hover { color:var(--text);border-color:var(--border2);transform:translateY(-2px); }
.wdl-btn-share { background:linear-gradient(135deg,rgba(168,85,247,0.18),rgba(79,142,247,0.18));color:var(--accent3);border:1px solid rgba(168,85,247,0.3);position:relative;overflow:hidden; }
.wdl-btn-share:hover { background:linear-gradient(135deg,rgba(168,85,247,0.28),rgba(79,142,247,0.28));border-color:rgba(168,85,247,0.55);transform:translateY(-2px); }

/* RESULT CARD */
.wdl-result { background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:40px 28px;text-align:center;margin-bottom:18px;animation:fadeUp 0.5s ease;position:relative;overflow:hidden; }
.wdl-result::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent3),var(--accent),var(--accent2));border-radius:22px 22px 0 0; }
.wdl-result-badge { display:inline-flex;align-items:center;gap:7px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);color:var(--accent3);font-size:0.68rem;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:14px; }
.wdl-result-title { font-family:'Bebas Neue',sans-serif;font-size:2.6rem;letter-spacing:2px;margin-bottom:6px; }
.wdl-result-score { font-family:'Bebas Neue',sans-serif;font-size:5rem;letter-spacing:2px;background:linear-gradient(135deg,var(--accent3),#d4a0ff 60%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin:10px 0;filter:drop-shadow(0 0 20px rgba(168,85,247,0.4));animation:scorePulse 2.5s ease-in-out infinite; }
@keyframes scorePulse{0%,100%{filter:drop-shadow(0 0 20px rgba(168,85,247,0.4))}50%{filter:drop-shadow(0 0 44px rgba(168,85,247,0.75))}}
.wdl-result-phrase { color:var(--muted);font-size:0.95rem;margin-bottom:24px;line-height:1.6; }
.wdl-result-actions { display:flex;gap:10px;justify-content:center;flex-wrap:wrap; }

/* DASHBOARD */
.wdl-section-div { display:flex;align-items:center;gap:14px;margin-bottom:20px;margin-top:32px; }
.wdl-section-label { font-size:0.66rem;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--muted);white-space:nowrap; }
.wdl-section-line { flex:1;height:1px;background:var(--border2); }
.wdl-dash-grid { display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px; }
.wdl-dash-card { background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px;position:relative;overflow:hidden; }
.wdl-dash-card::before { content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(168,85,247,0.03),transparent 60%);pointer-events:none; }
.wdl-dash-hdr { display:flex;align-items:center;gap:8px;margin-bottom:16px; }
.wdl-dash-icon { font-size:1.1rem; }
.wdl-dash-lbl { font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:2px;color:var(--accent3); }

/* STREAK DOTS */
.wdl-streak-dots { display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(3,38px);gap:3px;margin-bottom:10px; }
.wdl-sdot { width:100%;height:38px;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:default;transition:transform 0.15s; }
.wdl-sdot:hover { transform:translateY(-2px); }
.wdl-sdot.win { background:rgba(61,214,140,0.13);border:1px solid rgba(61,214,140,0.38); }
.wdl-sdot.miss { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07); }
.wdl-sdot.today-played { background:rgba(168,85,247,0.14);border:2px solid var(--accent3);box-shadow:0 0 8px rgba(168,85,247,0.2); }
.wdl-sdot.today-pending { background:rgba(247,195,68,0.08);border:2px dashed rgba(247,195,68,0.35); }
.wdl-sdot-score { font-size:0.58rem;font-weight:800;color:var(--green);line-height:1; }
.wdl-sdot.today-played .wdl-sdot-score { color:var(--accent3); }
.wdl-streak-legend { display:flex;gap:12px;font-size:0.68rem;color:var(--muted);flex-wrap:wrap; }
.wdl-dot-sample { display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:4px;vertical-align:middle; }
.wdl-ds-win { background:rgba(61,214,140,0.5);border:1px solid var(--green); }
.wdl-ds-miss { background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1); }
.wdl-ds-today { background:rgba(168,85,247,0.4);border:1px solid var(--accent3); }

/* STATS */
.wdl-stats-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
.wdl-stat-item { background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:14px 10px;text-align:center;transition:border-color 0.2s,background 0.2s; }
.wdl-stat-item:hover { border-color:rgba(168,85,247,0.22);background:rgba(168,85,247,0.03); }
.wdl-stat-val { font-family:'Bebas Neue',sans-serif;font-size:1.7rem;letter-spacing:1px;background:linear-gradient(135deg,var(--accent3),#d4a0ff 80%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:3px; }
.wdl-stat-name { font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted); }

/* MODAL */
.wdl-modal-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.82);backdrop-filter:blur(14px);display:flex;justify-content:center;align-items:center;padding:20px;animation:fadeIn 0.22s ease; }
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.wdl-modal-box { background:#0c1020;border:1px solid rgba(168,85,247,0.18);border-radius:24px;padding:36px 28px;max-width:480px;width:100%;max-height:88vh;overflow-y:auto;position:relative;animation:modalUp 0.32s cubic-bezier(0.4,0,0.2,1); }
.wdl-modal-box::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent3),var(--accent),var(--accent2));border-radius:24px 24px 0 0; }
@keyframes modalUp{from{opacity:0;transform:translateY(28px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.wdl-modal-title { font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:2px;text-align:center;margin-bottom:22px; }
.wdl-rules-list { list-style:none;margin-bottom:20px;display:flex;flex-direction:column;gap:8px; }
.wdl-rules-list li { background:var(--surface);border:1px solid var(--border);border-left:3px solid rgba(168,85,247,0.45);border-radius:12px;padding:12px 14px;font-size:0.88rem;line-height:1.6;transition:border-color 0.2s,transform 0.2s; }
.wdl-rules-list li:hover { border-left-color:var(--accent3);transform:translateX(4px); }
.wdl-color-demo { display:flex;gap:14px;justify-content:center;margin:16px 0;flex-wrap:wrap; }
.wdl-demo-tile { width:46px;height:46px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:900;border-radius:10px;font-family:'DM Sans',sans-serif; }
.wdl-demo-tile.correct { background:rgba(61,214,140,0.18);border:2px solid var(--green);color:var(--green); }
.wdl-demo-tile.present { background:rgba(255,164,0,0.15);border:2px solid var(--orange);color:var(--orange); }
.wdl-demo-tile.absent  { background:rgba(255,255,255,0.04);border:2px solid rgba(255,255,255,0.15);color:var(--muted); }
.wdl-scoring-box { background:rgba(247,195,68,0.05);border:1px solid rgba(247,195,68,0.18);border-radius:14px;padding:16px;margin-bottom:20px; }
.wdl-scoring-box h3 { font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:1px;color:var(--accent);margin-bottom:10px;text-align:center; }
.wdl-scoring-item { display:flex;justify-content:space-between;padding:6px 0;font-size:0.84rem;border-bottom:1px solid var(--border); }
.wdl-scoring-item:last-child { border-bottom:none; }
.wdl-scoring-val { color:var(--accent);font-weight:700; }
.wdl-modal-btn { background:var(--accent3);color:#fff;font-weight:800;width:100%;justify-content:center;padding:14px;font-size:0.9rem;border-radius:12px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;text-transform:uppercase;letter-spacing:1px;transition:all 0.22s ease;display:flex;align-items:center;margin-top:4px; }
.wdl-modal-btn:hover { background:#be7af5;transform:translateY(-2px);box-shadow:0 8px 24px rgba(168,85,247,0.3); }

/* BOTTOM NAV */
.wdl-bottom-nav { position:fixed;bottom:0;left:0;right:0;z-index:200;display:flex;background:rgba(5,7,15,0.96);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,0.07);padding-bottom:env(safe-area-inset-bottom,0px); }
.wdl-nav-item { flex:1;min-width:0;border:none;background:transparent;padding:9px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:color 0.15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;color:rgba(240,240,240,0.35);position:relative; }
.wdl-nav-item.active { color:var(--green); }
.wdl-nav-indicator { position:absolute;top:0;left:50%;transform:translateX(-50%);width:26px;height:2px;border-radius:0 0 99px 99px;background:var(--green);box-shadow:0 0 8px var(--green); }
.wdl-nav-icon { font-size:20px;line-height:1; }
.wdl-nav-label { font-family:'DM Sans',sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px; }

@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:480px){
  .wdl-tile{width:44px;height:44px;font-size:1.2rem;}
  .wdl-input-row{flex-direction:column;}
  .wdl-submit{width:100%;}
  .wdl-result-score{font-size:3.5rem;}
  .wdl-result-actions{flex-direction:column;align-items:stretch;}
  .wdl-dash-grid{grid-template-columns:1fr;}
}
`;

// ─── Stat helpers ─────────────────────────────────────────────────────────────
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; } catch { return {}; }
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; } catch { return {}; }
}
function saveResult(puzzleDate, score) {
  const today = getToday();
  const history = loadHistory();
  if (!history[puzzleDate] || score > history[puzzleDate].score) history[puzzleDate] = { score };
  const allEntries = Object.values(history);
  const stats = {
    played: allEntries.length,
    best:   Math.max(...allEntries.map(e => e.score)),
    avg:    Math.round(allEntries.reduce((s,e) => s+e.score, 0) / allEntries.length),
    streak: 0,
  };
  const check = new Date(today + "T00:00:00");
  while (true) {
    const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,"0")}-${String(check.getDate()).padStart(2,"0")}`;
    if (history[k]) { stats.streak++; check.setDate(check.getDate()-1); } else break;
  }
  localStorage.setItem(STATS_KEY,   JSON.stringify(stats));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return { stats, history };
}

// ─── Tile evaluation (letter-by-letter Wordle logic) ─────────────────────────
function evaluateGuess(guess, target) {
  const g = guess.toUpperCase().split("");
  const t = target.toUpperCase().split("");
  const letterCount = {};
  t.forEach(l => { letterCount[l] = (letterCount[l]||0)+1; });
  const results = new Array(g.length).fill("absent");
  g.forEach((l,i) => { if (l===t[i]) { results[i]="correct"; letterCount[l]--; } });
  g.forEach((l,i) => {
    if (results[i]!=="correct" && t.includes(l) && letterCount[l]>0) {
      results[i]="present"; letterCount[l]--;
    }
  });
  return results;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HowToPlayModal({ onClose }) {
  return (
    <div className="wdl-modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="wdl-modal-box">
        <h2 className="wdl-modal-title">⚽ How to Play</h2>
        <ul className="wdl-rules-list">
          <li>🎯 Guess the footballer's last name in {MAX_GUESSES} attempts</li>
          <li>🔤 Each guess must match the correct number of letters</li>
          <li>🎨 After each guess, tile colors show how close you are</li>
          <li>🏆 Earlier correct guesses earn more XP!</li>
          <li>💡 Get a <strong style={{color:"var(--accent)"}}>hint</strong> after 3rd attempt</li>
        </ul>
        <div className="wdl-color-demo">
          <div style={{textAlign:"center"}}>
            <div className="wdl-demo-tile correct">K</div>
            <p style={{marginTop:8,fontSize:"0.72rem",color:"var(--green)",fontWeight:700}}>Correct Position</p>
          </div>
          <div style={{textAlign:"center"}}>
            <div className="wdl-demo-tile present">O</div>
            <p style={{marginTop:8,fontSize:"0.72rem",color:"var(--orange)",fontWeight:700}}>Wrong Position</p>
          </div>
          <div style={{textAlign:"center"}}>
            <div className="wdl-demo-tile absent">X</div>
            <p style={{marginTop:8,fontSize:"0.72rem",color:"var(--muted)",fontWeight:700}}>Not in Name</p>
          </div>
        </div>
        <div className="wdl-scoring-box">
          <h3>💰 XP Scoring — Max 20 XP</h3>
          {Object.entries(XP_BY_GUESS).map(([attempt, xp]) => (
            <div key={attempt} className="wdl-scoring-item">
              <span>Guess {attempt}</span><span className="wdl-scoring-val">+{xp} XP</span>
            </div>
          ))}
          <div className="wdl-scoring-item"><span>Failed</span><span className="wdl-scoring-val">0 XP</span></div>
        </div>
        <button className="wdl-modal-btn" onClick={onClose}>🚀 Start Playing</button>
      </div>
    </div>
  );
}

function StreakDots({ history, today }) {
  const dots = [];
  const base = new Date(today + "T00:00:00");
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate()-i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const entry = history[key];
    const isToday = key === today;
    let cls = "wdl-sdot ";
    if      (isToday && entry) cls += "today-played";
    else if (isToday)          cls += "today-pending";
    else if (entry)            cls += "win";
    else                       cls += "miss";
    dots.push(
      <div key={key} className={cls} title={entry ? `${key} · ${entry.score} pts` : `${key}`}>
        {entry && <span className="wdl-sdot-score">{entry.score}</span>}
      </div>
    );
  }
  return (
    <div>
      <div className="wdl-streak-dots">{dots}</div>
      <div className="wdl-streak-legend">
        <span><span className="wdl-dot-sample wdl-ds-win"/>Played</span>
        <span><span className="wdl-dot-sample wdl-ds-miss"/>Missed</span>
        <span><span className="wdl-dot-sample wdl-ds-today"/>Today</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Wordle({ players = [], onBack }) {
  const puzzleDate = getActivePuzzleDate();
  const target     = players.length ? getDailyPlayer(players, "wordle", puzzleDate) : null;
  const targetName = (target?.name || "").toUpperCase().replace(/\s.*/, ""); // last name or full

  const [guesses,    setGuesses]    = useState([]); // array of {letters, results}
  const [input,      setInput]      = useState("");
  const [gameOver,   setGameOver]   = useState(false);
  const [solved,     setSolved]     = useState(false);
  const [xpAwarded,  setXpAwarded]  = useState(0);
  const [score,      setScore]      = useState(0);
  const [msg,        setMsg]        = useState(null); // {text, type}
  const [hint,       setHint]       = useState(null);
  const [showModal,  setShowModal]  = useState(true);
  const [stats,      setStats]      = useState(loadStats);
  const [history,    setHistory]    = useState(loadHistory);
  const [revealing,  setRevealing]  = useState(false);
  const inputRef = useRef(null);

  // Puzzle number
  const launch = new Date("2026-06-01T00:00:00");
  const puzzleNum = Math.max(1, Math.floor((new Date(puzzleDate+"T00:00:00") - launch) / 86400000) + 1);
  const dateLabel = new Date(puzzleDate+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById("wdl-css")) {
      const s = document.createElement("style"); s.id="wdl-css"; s.textContent=CSS;
      document.head.appendChild(s);
    }
  }, []);

  // Load saved state
  useEffect(() => {
    if (!targetName) return;
    const saved = JSON.parse(localStorage.getItem(`footbrawls_wordle_${puzzleDate}`) || "null");
    if (saved) {
      setGuesses(saved.guesses || []);
      setSolved(saved.solved);
      setScore(saved.score || 0);
      setXpAwarded(saved.xpAwarded || 0);
      setGameOver(true);
      setShowModal(false);
    }
  }, [targetName, puzzleDate]);

  function showMsg(text, type="info", duration=3000) {
    setMsg({text, type});
    setTimeout(() => setMsg(null), duration);
  }

  async function handleSubmit() {
    if (gameOver || revealing) return;
    const guess = input.toUpperCase().trim();
    if (!guess) { showMsg("Enter a name!", "error"); return; }
    if (guess.length !== targetName.length) {
      showMsg(`Must be ${targetName.length} letters (${targetName.length}-letter name)`, "error");
      return;
    }
    if (guesses.some(g => g.letters.join("")===guess)) {
      showMsg("Already guessed that!", "error"); return;
    }

    const results = evaluateGuess(guess, targetName);
    const newGuess = { letters: guess.split(""), results };
    setRevealing(true);
    setTimeout(() => setRevealing(false), results.length * 100 + 400);

    const newGuesses = [...guesses, newGuess];
    const won  = results.every(r => r==="correct");
    const lost = !won && newGuesses.length >= MAX_GUESSES;
    const over = won || lost;

    setGuesses(newGuesses);
    setInput("");

    // Hints
    if (newGuesses.length === 3 && target?.country) setHint(`Hint: ${target.flag||""} ${target.country}`);
    if (newGuesses.length === 4 && target?.position) setHint(`Hint: ${target.flag||""} ${target.country} · ${target.position}`);

    if (over) {
      const pts = won ? (XP_BY_GUESS[newGuesses.length] ?? 5) : 0;
      const calcScore = won ? ({ 1:1000,2:800,3:600,4:400,5:200,6:100 }[newGuesses.length]??0) : 0;
      let xp = pts;
      if (won) {
        const user = getUser();
        if (user?.userId) {
          const r = await awardXP(user.userId, "wordle", pts);
          xp = r?.xpAwarded ?? pts;
        }
      }
      setGameOver(true); setSolved(won); setScore(calcScore); setXpAwarded(xp);
      const { stats:s, history:h } = saveResult(puzzleDate, calcScore);
      setStats(s); setHistory(h);
      localStorage.setItem(`footbrawls_wordle_${puzzleDate}`, JSON.stringify({ guesses:newGuesses, solved:won, score:calcScore, xpAwarded:xp }));
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleShare() {
    const emoji = guesses.map(g =>
      g.results.map(r => r==="correct"?"🟩":r==="present"?"🟨":"⬛").join("")
    ).join("\n");
    const text = `Footbrawls Wordle ${solved?guesses.length:"X"}/${MAX_GUESSES}\n${emoji}\nfootbrawls.gg`;
    if (navigator.share) navigator.share({text});
    else navigator.clipboard.writeText(text).then(() => showMsg("Copied to clipboard!", "success"));
  }

  const remaining = MAX_GUESSES - guesses.length;

  return (
    <div style={{background:"var(--bg,#05070f)", minHeight:"100vh", color:"var(--text,#F0F0F0)", fontFamily:"'DM Sans',sans-serif"}}>
      <div className="wdl-bg" />
      <div className="wdl-noise" />

      {showModal && <HowToPlayModal onClose={() => { setShowModal(false); inputRef.current?.focus(); }} />}

      {/* Nav */}
      <nav className="wdl-nav">
        <span className="wdl-logo">⚽ Footbrawls</span>
        <div className="wdl-nav-tag">
          <span className="wdl-tag-dot" />
          Player Wordle
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button className="wdl-help-btn" onClick={() => setShowModal(true)}>?</button>
        </div>
      </nav>

      <div className="wdl-page" style={{position:"relative",zIndex:1}}>

        {/* Header */}
        <div style={{marginBottom:20,animation:"fadeUp 0.5s ease both"}}>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2rem,5vw,2.8rem)",letterSpacing:2,lineHeight:1,marginBottom:5}}>
            Player Wordle
          </h1>
          <p style={{color:"var(--muted)",fontSize:"0.86rem"}}>Guess the footballer's name in {MAX_GUESSES} tries</p>
        </div>

        {/* Puzzle bar */}
        <div className="wdl-puzzle-bar">
          <div className="wdl-puzzle-item">📅 <strong>{dateLabel}</strong></div>
          <div className="wdl-puzzle-sep" />
          <div className="wdl-puzzle-item">🧩 Puzzle <strong>#{puzzleNum}</strong></div>
        </div>

        {/* Score box */}
        <div className="wdl-score-box">
          <div>
            <div className="wdl-score-label">Current Score</div>
            <div className="wdl-score-value">{score} pts</div>
          </div>
          <div style={{fontSize:"0.82rem",color:"var(--muted)",textAlign:"right",position:"relative",zIndex:1}}>
            {stats.streak ? `🔥 ${stats.streak} day streak` : "Play to start streak"}
          </div>
        </div>

        {/* Hint */}
        {hint && (
          <div className="wdl-hint">
            <span className="wdl-hint-icon">💡</span>
            <span className="wdl-hint-text" dangerouslySetInnerHTML={{__html:`<strong>Hint:</strong> ${hint.replace("Hint: ","")}`}} />
          </div>
        )}

        {/* Message */}
        {msg && <div className={`wdl-msg wdl-msg-${msg.type}`}>{msg.text}</div>}

        {/* Game card */}
        <div className="wdl-game-card">
          {/* Legend */}
          <div className="wdl-legend">
            <div className="wdl-legend-item"><div className="wdl-legend-dot" style={{background:"var(--green)"}} /> Correct position</div>
            <div className="wdl-legend-item"><div className="wdl-legend-dot" style={{background:"var(--orange)"}} /> Wrong position</div>
            <div className="wdl-legend-item"><div className="wdl-legend-dot" style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)"}} /> Not in name</div>
          </div>

          {/* Board */}
          <div className="wdl-board">
            {/* Filled rows */}
            {guesses.map((g, ri) => (
              <div key={ri} className="wdl-row">
                {g.letters.map((letter, ci) => (
                  <div key={ci} className={`wdl-tile ${g.results[ci]} ${ri===guesses.length-1&&revealing?"revealing":""}`}
                    style={{animationDelay: revealing ? `${ci*80}ms` : "0ms"}}>
                    {letter}
                  </div>
                ))}
              </div>
            ))}
            {/* Empty rows */}
            {!gameOver && Array.from({length:remaining}).map((_,ri) => (
              <div key={`e-${ri}`} className="wdl-row">
                {Array.from({length:targetName.length}).map((_,ci) => (
                  <div key={ci} className="wdl-tile" />
                ))}
              </div>
            ))}
          </div>

          {/* Input */}
          {!gameOver && (
            <div className="wdl-input-row">
              <input
                ref={inputRef}
                className="wdl-input"
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g,""))}
                onKeyDown={e => e.key==="Enter" && handleSubmit()}
                placeholder="Enter player name…"
                maxLength={targetName.length || 15}
                autoComplete="off"
                disabled={gameOver}
              />
              <button className="wdl-submit" onClick={handleSubmit} disabled={!input.trim()||gameOver}>
                Submit
              </button>
            </div>
          )}

          <div className="wdl-attempt-counter">
            Attempts: {guesses.length} / {MAX_GUESSES}
          </div>
        </div>

        {/* Controls */}
        <div className="wdl-controls">
          <button className="wdl-btn wdl-btn-back" onClick={onBack}>← Home</button>
          {gameOver && <button className="wdl-btn wdl-btn-share" onClick={handleShare}>📤 Share Score</button>}
        </div>

        {/* Result card */}
        {gameOver && (
          <div className="wdl-result">
            <div className="wdl-result-badge">Game Complete</div>
            <div className="wdl-result-title" style={{color:solved?"var(--green)":"var(--accent2)"}}>
              {solved ? `🎉 ${targetName}!` : "😞 Game Over!"}
            </div>
            <div className="wdl-result-score">{score} pts</div>
            <div className="wdl-result-phrase">
              {solved
                ? `Guessed correctly in ${guesses.length} ${guesses.length===1?"try":"tries"}!`
                : `The answer was ${targetName}`}
            </div>
            {solved && xpAwarded > 0 && (
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(247,195,68,0.12)",border:"1px solid rgba(247,195,68,0.3)",borderRadius:99,padding:"4px 14px",fontSize:13,fontWeight:700,color:"var(--accent)",marginBottom:20}}>
                +{xpAwarded} XP earned
              </div>
            )}
            <div className="wdl-result-actions">
              <button className="wdl-btn wdl-btn-share" onClick={handleShare}>📤 Share</button>
              <button className="wdl-btn wdl-btn-back" onClick={onBack}>← Home</button>
            </div>
          </div>
        )}

        {/* Dashboard */}
        <div style={{animation:"fadeUp 0.6s ease 0.3s both"}}>
          <div className="wdl-section-div">
            <span className="wdl-section-label">Your Progress</span>
            <div className="wdl-section-line" />
          </div>
          <div className="wdl-dash-grid">
            <div className="wdl-dash-card">
              <div className="wdl-dash-hdr">
                <span className="wdl-dash-icon">📅</span>
                <span className="wdl-dash-lbl">Last 30 Days</span>
              </div>
              <StreakDots history={history} today={getToday()} />
            </div>
            <div className="wdl-dash-card">
              <div className="wdl-dash-hdr">
                <span className="wdl-dash-icon">📊</span>
                <span className="wdl-dash-lbl">Your Stats</span>
              </div>
              <div className="wdl-stats-grid">
                {[
                  {val:stats.played??0,  name:"Played"},
                  {val:stats.best??0,    name:"Best Score"},
                  {val:stats.avg??0,     name:"Avg Score"},
                  {val:stats.streak??0,  name:"Day Streak"},
                ].map(s => (
                  <div key={s.name} className="wdl-stat-item">
                    <div className="wdl-stat-val">{s.val}</div>
                    <div className="wdl-stat-name">{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="wdl-bottom-nav">
        {[
          {id:"home",  label:"Games", icon:"⚽"},
          {id:"guild", label:"Guild", icon:"🏰"},
          {id:"raids", label:"Raids", icon:"⚔️"},
          {id:"ranks", label:"Ranks", icon:"🏆"},
          {id:"me",    label:"Me",    icon:"👤"},
        ].map(item => (
          <button key={item.id} className={`wdl-nav-item${item.id==="home"?" active":""}`}
            onClick={() => item.id==="home" && onBack?.()}>
            {item.id==="home" && <span className="wdl-nav-indicator"/>}
            <span className="wdl-nav-icon">{item.icon}</span>
            <span className="wdl-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}