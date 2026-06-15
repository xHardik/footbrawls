/**
 * Wordle.jsx — Player Wordle for Footbrawls
 * UI theme ported from Crickingo wordle.html/wordle.js
 * Fully synced to Crickingo HTML fidelity: spacing, modal, responsive, nav tooltip
 */

import { useState, useEffect, useRef } from "react";
import { getDailyPlayer, getActivePuzzleDate } from "../../lib/dailySeed.js";
import { awardXP } from "../../lib/xpEngine.js";
import { getUser } from "../../lib/user";
import { PLAYERS } from "../../lib/players.js";

// ─── XP table ────────────────────────────────────────────────────────────────
const XP_BY_GUESS  = { 1:20, 2:20, 3:20, 4:15, 5:10, 6:5 };
const SCORE_BY_GUESS = { 1:1000, 2:800, 3:600, 4:400, 5:200, 6:100 };
const MAX_GUESSES  = 6;
const STATS_KEY    = "footbrawls_wordle_stats";
const HISTORY_KEY  = "footbrawls_wordle_history";

// ─── Injected CSS (1-to-1 with Crickingo wordle.html) ────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,900&display=swap');

:root {
  --bg: #05070f;
  --surface: rgba(255,255,255,0.038);
  --surface2: rgba(255,255,255,0.065);
  --border: rgba(255,255,255,0.08);
  --border2: rgba(255,255,255,0.13);
  --accent: #F7C344;
  --accent2: #E84040;
  --accent3: #A855F7;
  --green: #3DD68C;
  --orange: #ffa400;
  --text: #F0F0F0;
  --muted: rgba(240,240,240,0.45);
  --muted2: rgba(240,240,240,0.25);
  --card-radius: 16px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

/* ── BACKGROUND ── */
.wdl-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
}
.wdl-bg::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 8% -5%,  rgba(168,85,247,0.1)  0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 95% 105%, rgba(247,195,68,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 50%,  rgba(61,214,140,0.04) 0%, transparent 65%);
}
.wdl-bg::after {
  content: '';
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(
    -45deg, transparent, transparent 48px,
    rgba(255,255,255,0.008) 48px, rgba(255,255,255,0.008) 49px
  );
}
.wdl-noise {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

/* ── NAV ── */
.wdl-nav {
  position: sticky; top: 0; z-index: 200;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 32px; height: 62px;
  background: rgba(5,7,15,0.82);
  backdrop-filter: blur(24px) saturate(1.4);
  border-bottom: 1px solid rgba(168,85,247,0.12);
}
.wdl-logo {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 3px;
  background: linear-gradient(100deg, var(--accent) 0%, #ffe9a0 50%, var(--accent) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  text-decoration: none; white-space: nowrap;
  animation: logoShimmer 4s linear infinite;
}
@keyframes logoShimmer { from{background-position:0% center} to{background-position:200% center} }

.wdl-nav-tag {
  display: flex; align-items: center; gap: 7px;
  font-size: 0.72rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 2px;
  color: var(--accent3);
  background: rgba(168,85,247,0.1);
  border: 1px solid rgba(168,85,247,0.28);
  padding: 5px 14px; border-radius: 100px;
}
.wdl-tag-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent3); animation: blink 1.5s ease infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

.wdl-nav-right { display: flex; align-items: center; justify-content: flex-end; }
.wdl-help-wrap { position: relative; display: flex; align-items: center; }
.wdl-help-btn {
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid var(--border2);
  background: var(--surface);
  color: var(--muted);
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem; font-weight: 700;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.wdl-help-btn:hover {
  background: rgba(168,85,247,0.12);
  border-color: rgba(168,85,247,0.4);
  color: var(--accent3);
  transform: scale(1.1);
}
.wdl-help-tooltip {
  position: absolute;
  right: calc(100% + 10px); top: 50%;
  transform: translateY(-50%) translateX(4px);
  background: rgba(10,14,30,0.96);
  border: 1px solid rgba(168,85,247,0.25);
  color: var(--accent3);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.72rem; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 5px 12px; border-radius: 8px;
  white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity 0.15s, transform 0.15s;
}
.wdl-help-tooltip::after {
  content: '';
  position: absolute; left: 100%; top: 50%; transform: translateY(-50%);
  border: 5px solid transparent;
  border-left-color: rgba(168,85,247,0.25);
}
.wdl-help-wrap:hover .wdl-help-tooltip {
  opacity: 1; transform: translateY(-50%) translateX(0);
}

/* ── PAGE ── */
.wdl-page {
  position: relative; z-index: 1;
  max-width: 680px; margin: 0 auto;
  padding: 36px 36px 80px;
  font-family: 'DM Sans', sans-serif;
}

/* ── PUZZLE BAR ── */
.wdl-puzzle-bar {
  display: flex; align-items: center; gap: 0;
  margin-bottom: 24px; width: fit-content;
  background: rgba(168,85,247,0.05);
  border: 1px solid rgba(168,85,247,0.15);
  border-radius: 12px; overflow: hidden;
  animation: fadeUp 0.5s ease 0.05s both;
}
.wdl-puzzle-item {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 16px; font-size: 0.77rem; color: var(--muted);
  font-family: 'DM Sans', sans-serif;
}
.wdl-puzzle-item strong { color: var(--accent3); font-weight: 700; }
.wdl-puzzle-sep { width: 1px; height: 100%; background: rgba(168,85,247,0.15); align-self: stretch; }

/* ── SCORE BOX ── */
.wdl-score-box {
  background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid var(--accent); border-radius: 18px;
  padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; position: relative; overflow: hidden;
  animation: fadeUp 0.5s ease 0.08s both;
}
.wdl-score-box::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(247,195,68,0.06), transparent 60%); pointer-events: none;
}
.wdl-score-label { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 3px; }
.wdl-score-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--accent), #ffd700);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.wdl-score-streak { font-size: 0.82rem; color: var(--muted); text-align: right; position: relative; z-index: 1; }

/* ── HINT BOX ── */
.wdl-hint {
  background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.22);
  border-radius: var(--card-radius); padding: 13px 18px;
  display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
  animation: fadeUp 0.3s ease;
}
.wdl-hint-icon { font-size: 1.3rem; }
.wdl-hint-text { font-size: 0.88rem; color: var(--text); line-height: 1.5; }
.wdl-hint-text strong { color: var(--accent); }

/* ── MESSAGE ── */
.wdl-msg {
  border-radius: var(--card-radius); padding: 13px 20px;
  font-size: 0.88rem; font-weight: 700; text-align: center;
  margin-bottom: 18px; animation: fadeUp 0.3s ease; border: 1px solid;
}
.wdl-msg-error   { background: rgba(232,64,64,0.1);  color: #ff8080;        border-color: rgba(232,64,64,0.35); }
.wdl-msg-success { background: rgba(61,214,140,0.1);  color: var(--green);   border-color: rgba(61,214,140,0.35); }
.wdl-msg-info    { background: rgba(168,85,247,0.1);  color: var(--accent3); border-color: rgba(168,85,247,0.35); }

/* ── GAME CARD ── */
.wdl-game-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--card-radius); padding: 32px 24px;
  margin-bottom: 20px; animation: fadeUp 0.5s ease 0.12s both;
  position: relative; overflow: hidden;
}
.wdl-game-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(168,85,247,0.04), transparent 60%); pointer-events: none;
}

/* ── LEGEND ── */
.wdl-legend { display: flex; gap: 16px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap; }
.wdl-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: var(--muted); }
.wdl-legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }

/* ── BOARD ── */
.wdl-board {
  display: flex; flex-direction: column; gap: 8px;
  margin-bottom: 28px; align-items: center; position: relative; z-index: 1;
}
.wdl-row { display: flex; gap: 8px; justify-content: center; }

/* ── TILES ── */
.wdl-tile {
  width: 52px; height: 52px;
  border: 2px solid var(--border2);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; font-weight: 800; text-transform: uppercase;
  border-radius: 10px; transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
  background: var(--surface); color: var(--text);
  font-family: 'DM Sans', sans-serif;
}
.wdl-tile.filled  { border-color: rgba(168,85,247,0.4); background: rgba(168,85,247,0.08); animation: tilePop 0.2s cubic-bezier(0.4,0,0.2,1); }
.wdl-tile.correct { background: rgba(61,214,140,0.18);  border-color: var(--green);  color: var(--green);  box-shadow: 0 0 14px rgba(61,214,140,0.2);  font-weight: 900; }
.wdl-tile.present { background: rgba(255,164,0,0.15);   border-color: var(--orange); color: var(--orange); box-shadow: 0 0 14px rgba(255,164,0,0.18);   font-weight: 900; }
.wdl-tile.absent  { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); color: var(--muted); }
@keyframes tilePop { 0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)} }
@keyframes tileReveal { 0%{transform:rotateX(0)} 50%{transform:rotateX(-90deg)} 100%{transform:rotateX(0)} }
.wdl-tile.revealing { animation: tileReveal 0.4s ease forwards; }

/* ── INPUT ROW ── */
.wdl-input-row { display: flex; gap: 10px; position: relative; z-index: 1; }
.wdl-input {
  flex: 1; padding: 13px 18px;
  font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 600;
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: 12px; color: var(--text); text-transform: uppercase;
  transition: border-color 0.2s, box-shadow 0.2s; outline: none;
}
.wdl-input::placeholder { color: var(--muted); text-transform: none; font-weight: 400; }
.wdl-input:focus { border-color: var(--accent3); box-shadow: 0 0 0 3px rgba(168,85,247,0.12); }

.wdl-submit {
  background: var(--accent3); color: #fff; padding: 13px 28px;
  border-radius: 12px; border: none;
  font-family: 'DM Sans', sans-serif; font-size: 0.92rem; font-weight: 800;
  cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;
  transition: all 0.22s ease; box-shadow: 0 4px 16px rgba(168,85,247,0.28); white-space: nowrap;
}
.wdl-submit:hover  { background: #be7af5; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(168,85,247,0.42); }
.wdl-submit:disabled { background: var(--surface2); color: var(--muted); box-shadow: none; cursor: not-allowed; transform: none; }

.wdl-attempt-counter {
  text-align: center; font-size: 0.73rem; color: var(--muted);
  text-transform: uppercase; letter-spacing: 1px;
  margin-top: 16px; position: relative; z-index: 1;
}

/* ── CONTROLS ── */
.wdl-controls {
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
  margin-bottom: 20px; animation: fadeUp 0.5s ease 0.18s both;
}
.wdl-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 20px; border: none; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
  cursor: pointer; transition: all 0.22s ease;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.wdl-btn-back    { background: var(--surface); color: var(--muted); border: 1px solid var(--border); }
.wdl-btn-back:hover { color: var(--text); border-color: var(--border2); transform: translateY(-2px); }
.wdl-btn-share {
  background: linear-gradient(135deg, rgba(168,85,247,0.18), rgba(79,142,247,0.18));
  color: var(--accent3); border: 1px solid rgba(168,85,247,0.3);
  position: relative; overflow: hidden;
}
.wdl-btn-share:hover {
  background: linear-gradient(135deg, rgba(168,85,247,0.28), rgba(79,142,247,0.28));
  border-color: rgba(168,85,247,0.55); transform: translateY(-2px);
}
.wdl-share-copied {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(61,214,140,0.92); color: #000; font-weight: 800; font-size: 0.78rem;
  border-radius: 10px; opacity: 0; pointer-events: none; transition: opacity 0.2s;
}
.wdl-share-copied.show { opacity: 1; }

/* ── RESULT CARD ── */
.wdl-result {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 22px; padding: 48px 40px;
  text-align: center; margin-bottom: 20px;
  animation: fadeUp 0.5s ease; position: relative; overflow: hidden;
}
.wdl-result::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--accent3), var(--accent), var(--accent2));
  border-radius: 22px 22px 0 0;
}
.wdl-result-badge {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3);
  color: var(--accent3); font-size: 0.7rem; font-weight: 800;
  letter-spacing: 2px; text-transform: uppercase;
  padding: 5px 14px; border-radius: 100px; margin-bottom: 14px;
}
.wdl-result-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 3rem; letter-spacing: 2px; margin-bottom: 6px;
}
.wdl-result-score {
  font-family: 'Bebas Neue', sans-serif; font-size: 5.5rem; letter-spacing: 2px;
  background: linear-gradient(135deg, var(--accent3), #d4a0ff 60%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  line-height: 1; margin: 12px 0;
  filter: drop-shadow(0 0 22px rgba(168,85,247,0.4));
  animation: scorePulse 2.5s ease-in-out infinite;
}
@keyframes scorePulse {
  0%,100% { filter: drop-shadow(0 0 20px rgba(168,85,247,0.4)); }
  50%     { filter: drop-shadow(0 0 44px rgba(168,85,247,0.75)); }
}
.wdl-result-phrase { color: var(--muted); font-size: 1rem; margin-bottom: 28px; line-height: 1.6; }
.wdl-result-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

/* ── MODAL ── */
.wdl-modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.82); backdrop-filter: blur(14px);
  display: flex; justify-content: center; align-items: center; padding: 20px;
  animation: fadeIn 0.22s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.wdl-modal-box {
  background: #0c1020; border: 1px solid rgba(168,85,247,0.18);
  border-radius: 24px; padding: 44px 36px;
  max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto;
  position: relative; animation: modalUp 0.32s cubic-bezier(0.4,0,0.2,1);
}
.wdl-modal-box::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--accent3), var(--accent), var(--accent2));
  border-radius: 24px 24px 0 0;
}
.wdl-modal-box::-webkit-scrollbar { width: 5px; }
.wdl-modal-box::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 5px; }
@keyframes modalUp { from{opacity:0;transform:translateY(28px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
.wdl-modal-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.3rem; letter-spacing: 2px;
  text-align: center; margin-bottom: 26px;
}
.wdl-rules-list { list-style: none; margin-bottom: 22px; display: flex; flex-direction: column; gap: 9px; }
.wdl-rules-list li {
  background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid rgba(168,85,247,0.45); border-radius: 12px;
  padding: 13px 16px; font-size: 0.9rem; line-height: 1.6;
  transition: border-color 0.2s, transform 0.2s;
}
.wdl-rules-list li:hover { border-left-color: var(--accent3); transform: translateX(4px); }
.wdl-rule-icon { margin-right: 8px; }

.wdl-color-demo { display: flex; gap: 14px; justify-content: center; margin: 18px 0; flex-wrap: wrap; }
.wdl-demo-tile {
  width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 900; border-radius: 10px; font-family: 'DM Sans', sans-serif;
}
.wdl-demo-tile.correct { background: rgba(61,214,140,0.18); border: 2px solid var(--green);  color: var(--green); }
.wdl-demo-tile.present { background: rgba(255,164,0,0.15);  border: 2px solid var(--orange); color: var(--orange); }
.wdl-demo-tile.absent  { background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.15); color: var(--muted); }

.wdl-scoring-box {
  background: rgba(247,195,68,0.05); border: 1px solid rgba(247,195,68,0.18);
  border-radius: 14px; padding: 18px; margin-bottom: 22px;
}
.wdl-scoring-box h3 {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 1px;
  color: var(--accent); margin-bottom: 12px; text-align: center;
}
.wdl-scoring-item { display: flex; justify-content: space-between; padding: 7px 0; font-size: 0.86rem; border-bottom: 1px solid var(--border); }
.wdl-scoring-item:last-child { border-bottom: none; }
.wdl-scoring-val { color: var(--accent); font-weight: 700; }
.wdl-modal-btn {
  background: var(--accent3); color: #fff; font-weight: 800;
  width: 100%; justify-content: center; padding: 14px; font-size: 0.92rem;
  border-radius: 12px; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; text-transform: uppercase; letter-spacing: 1px;
  transition: all 0.22s ease; display: flex; align-items: center;
}
.wdl-modal-btn:hover { background: #be7af5; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(168,85,247,0.3); }

/* ── DASHBOARD ── */
.wdl-bottom-section { margin-top: 44px; animation: fadeUp 0.6s ease 0.3s both; }
.wdl-section-div { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.wdl-section-label {
  font-size: 0.68rem; font-weight: 800;
  letter-spacing: 3px; text-transform: uppercase; color: var(--muted); white-space: nowrap;
}
.wdl-section-line { flex: 1; height: 1px; background: var(--border2); }

.wdl-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.wdl-dash-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 18px; padding: 22px 24px; position: relative; overflow: hidden;
}
.wdl-dash-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(168,85,247,0.03), transparent 60%); pointer-events: none;
}
.wdl-dash-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.wdl-dash-icon { font-size: 1.1rem; }
.wdl-dash-lbl { font-family: 'Bebas Neue', sans-serif; font-size: 1.05rem; letter-spacing: 2px; color: var(--accent3); }

/* ── STREAK DOTS ── */
.wdl-streak-dots {
  display: grid; grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(3, 42px); gap: 3px; margin-bottom: 12px;
}
.wdl-sdot {
  width: 100%; height: 42px; border-radius: 5px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1px;
  transition: transform 0.15s; cursor: default;
}
.wdl-sdot:hover { transform: translateY(-2px); }
.wdl-sdot.win          { background: rgba(61,214,140,0.13);  border: 1px solid rgba(61,214,140,0.38); }
.wdl-sdot.miss         { background: rgba(255,255,255,0.03);  border: 1px solid rgba(255,255,255,0.07); }
.wdl-sdot.today-played { background: rgba(168,85,247,0.14);  border: 2px solid var(--accent3); box-shadow: 0 0 8px rgba(168,85,247,0.2); }
.wdl-sdot.today-pending{ background: rgba(247,195,68,0.08);  border: 2px dashed rgba(247,195,68,0.35); }
.wdl-sdot-score { font-size: 0.65rem; font-weight: 800; line-height: 1; color: var(--green); }
.wdl-sdot.today-played .wdl-sdot-score { color: var(--accent3); }

.wdl-streak-legend { display: flex; gap: 13px; font-size: 0.7rem; color: var(--muted); align-items: center; flex-wrap: wrap; }
.wdl-dot-sample { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 4px; vertical-align: middle; }
.wdl-ds-win  { background: rgba(61,214,140,0.5);  border: 1px solid var(--green); }
.wdl-ds-miss { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
.wdl-ds-today{ background: rgba(168,85,247,0.4);  border: 1px solid var(--accent3); }

/* ── STATS ── */
.wdl-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wdl-stat-item {
  background: rgba(255,255,255,0.03); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 12px; text-align: center;
  transition: border-color 0.2s, background 0.2s;
}
.wdl-stat-item:hover { border-color: rgba(168,85,247,0.22); background: rgba(168,85,247,0.03); }
.wdl-stat-val {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--accent3), #d4a0ff 80%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  line-height: 1; margin-bottom: 3px;
}
.wdl-stat-name { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }

/* ── BOTTOM NAV ── */
.wdl-bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
  display: flex;
  background: rgba(5,7,15,0.96); backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.07);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.wdl-nav-item {
  flex: 1; min-width: 0; border: none; background: transparent;
  padding: 9px 4px 8px; display: flex; flex-direction: column;
  align-items: center; gap: 3px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; transition: color 0.15s;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  color: rgba(240,240,240,0.35); position: relative;
}
.wdl-nav-item.active { color: var(--green); }
.wdl-nav-indicator {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 26px; height: 2px; border-radius: 0 0 99px 99px;
  background: var(--green); box-shadow: 0 0 8px var(--green);
}
.wdl-nav-icon  { font-size: 20px; line-height: 1; }
.wdl-nav-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

/* ── XP BADGE ── */
.wdl-xp-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(247,195,68,0.12); border: 1px solid rgba(247,195,68,0.3);
  border-radius: 99px; padding: 4px 14px;
  font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 20px;
}

/* ── ANIMATIONS ── */
@keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .wdl-nav { padding: 0 12px; height: 54px; }
  .wdl-logo { font-size: 1.3rem; }
  .wdl-nav-tag { font-size: 0.58rem; padding: 4px 9px; gap: 4px; letter-spacing: 1.5px; }
  .wdl-tag-dot { width: 5px; height: 5px; }
  .wdl-help-btn { width: 30px; height: 30px; font-size: 0.88rem; }
  .wdl-page { padding: 18px 16px 56px; }
  .wdl-dash-grid { grid-template-columns: 1fr; gap: 12px; }
  .wdl-result { padding: 28px 20px; }
  .wdl-result-title { font-size: 2.2rem; }
  .wdl-result-score { font-size: 3.8rem; }
  .wdl-result-actions { gap: 8px; }
  .wdl-controls .wdl-btn { flex: 1; }
  .wdl-streak-dots { gap: 3px; }
  .wdl-sdot { height: 38px; }
}
@media (max-width: 480px) {
  .wdl-page { padding: 14px 12px 52px; }
  .wdl-tile { width: 44px; height: 44px; font-size: 1.2rem; }
  .wdl-row { gap: 6px; }
  .wdl-input-row { flex-direction: column; }
  .wdl-submit { width: 100%; }
  .wdl-result-actions { flex-direction: column; align-items: stretch; }
  .wdl-result-actions .wdl-btn { width: 100%; }
  .wdl-controls { flex-direction: column; align-items: stretch; }
  .wdl-controls .wdl-btn { width: 100%; }
  .wdl-sdot { height: 34px; }
  .wdl-sdot-score { font-size: 0.58rem; }
}
@media (max-width: 380px) {
  .wdl-nav { height: 50px; }
  .wdl-logo { font-size: 1.25rem; letter-spacing: 2px; }
  .wdl-nav-tag { font-size: 0.55rem; padding: 3px 8px; letter-spacing: 1px; }
  .wdl-help-btn { width: 26px; height: 26px; font-size: 0.8rem; }
  .wdl-tile { width: 38px; height: 38px; font-size: 1rem; }
  .wdl-row { gap: 5px; }
  .wdl-sdot { height: 30px; }
}
`;

// ─── Stat helpers ─────────────────────────────────────────────────────────────
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function loadStats()   { try { return JSON.parse(localStorage.getItem(STATS_KEY))   || {}; } catch { return {}; } }
function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; } catch { return {}; } }

function saveResult(puzzleDate, score) {
  const today   = getToday();
  const history = loadHistory();
  if (!history[puzzleDate] || score > history[puzzleDate].score) history[puzzleDate] = { score };
  const allEntries = Object.values(history);
  const stats = {
    played: allEntries.length,
    best:   Math.max(...allEntries.map(e => e.score)),
    avg:    Math.round(allEntries.reduce((s, e) => s + e.score, 0) / allEntries.length),
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

// ─── Tile evaluation ──────────────────────────────────────────────────────────
function evaluateGuess(guess, target) {
  const g = guess.toUpperCase().split("");
  const t = target.toUpperCase().split("");
  const letterCount = {};
  t.forEach(l => { letterCount[l] = (letterCount[l] || 0) + 1; });
  const results = new Array(g.length).fill("absent");
  g.forEach((l, i) => { if (l === t[i]) { results[i] = "correct"; letterCount[l]--; } });
  g.forEach((l, i) => {
    if (results[i] !== "correct" && t.includes(l) && letterCount[l] > 0) {
      results[i] = "present"; letterCount[l]--;
    }
  });
  return results;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function HowToPlayModal({ onClose }) {
  const scoring = [
    [1, 1000], [2, 800], [3, 600], [4, 400], [5, 200], [6, 100],
  ];
  return (
    <div className="wdl-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wdl-modal-box">
        <h2 className="wdl-modal-title">⚽ How to Play</h2>
        <ul className="wdl-rules-list">
          <li><span className="wdl-rule-icon">🎯</span>Guess the footballer's last name in {MAX_GUESSES} attempts</li>
          <li><span className="wdl-rule-icon">🔤</span>Each guess must match the correct number of letters</li>
          <li><span className="wdl-rule-icon">🎨</span>After each guess, tile colors show how close you are</li>
          <li><span className="wdl-rule-icon">🏆</span>Earlier correct guesses earn more points!</li>
          <li><span className="wdl-rule-icon">💡</span>Get a <strong>country hint</strong> after 3rd attempt and a <strong>position hint</strong> after 4th</li>
        </ul>
        <div className="wdl-color-demo">
          <div style={{textAlign:"center"}}>
            <div className="wdl-demo-tile correct">K</div>
            <p style={{marginTop:8,fontSize:"0.75rem",color:"var(--green)",fontWeight:700}}>Correct Position</p>
          </div>
          <div style={{textAlign:"center"}}>
            <div className="wdl-demo-tile present">O</div>
            <p style={{marginTop:8,fontSize:"0.75rem",color:"var(--orange)",fontWeight:700}}>Wrong Position</p>
          </div>
          <div style={{textAlign:"center"}}>
            <div className="wdl-demo-tile absent">X</div>
            <p style={{marginTop:8,fontSize:"0.75rem",color:"rgba(255,255,255,0.35)",fontWeight:700}}>Not in Name</p>
          </div>
        </div>
        <div className="wdl-scoring-box">
          <h3>💰 Scoring System — Max 1000 pts</h3>
          {scoring.map(([attempt, pts]) => (
            <div key={attempt} className="wdl-scoring-item">
              <span>{attempt === 1 ? "1st" : attempt === 2 ? "2nd" : attempt === 3 ? "3rd" : `${attempt}th`} Try</span>
              <span className="wdl-scoring-val">{pts} pts</span>
            </div>
          ))}
          <div className="wdl-scoring-item"><span>Failed</span><span className="wdl-scoring-val">0 pts</span></div>
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
    const d   = new Date(base); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const entry   = history[key];
    const isToday = key === today;
    let cls = "wdl-sdot ";
    if      (isToday && entry) cls += "today-played";
    else if (isToday)          cls += "today-pending";
    else if (entry)            cls += "win";
    else                       cls += "miss";
    dots.push(
      <div key={key} className={cls} title={entry ? `${key} · ${entry.score} pts` : key}>
        {entry && <span className="wdl-sdot-score">{entry.score}</span>}
      </div>
    );
  }
  return (
    <div>
      <div className="wdl-streak-dots">{dots}</div>
      <div className="wdl-streak-legend">
        <span><span className="wdl-dot-sample wdl-ds-win" />Played</span>
        <span><span className="wdl-dot-sample wdl-ds-miss" />Missed</span>
        <span><span className="wdl-dot-sample wdl-ds-today" />Today</span>
      </div>
    </div>
  );
}

// Initialize Google AdBreak queue safely
const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    // Fallback/Mock for local testing when AdSense is not loaded or in sandbox
    console.log("[AdSense H5 Mock] Triggering ad placement:", options.name);
    if (options.beforeAd) options.beforeAd();
    
    // Simulate user behavior: automatically grant reward in development
    setTimeout(() => {
      if (options.type === 'reward') {
        const confirmReward = window.confirm(`[TEST AD] Watch this rewarded ad to get your reward?`);
        if (confirmReward) {
          if (options.adViewed) options.adViewed();
        } else {
          if (options.adDismissed) options.adDismissed();
        }
      } else {
        if (options.adViewed) options.adViewed();
      }
      if (options.afterAd) options.afterAd();
      if (options.adBreakDone) options.adBreakDone({ showStatus: "mocked" });
    }, 1000);
  }
};

// Initialize AdConfig safely
if (typeof window !== "undefined") {
  window.adConfig = window.adConfig || function() {
    (window.adConfig.q = window.adConfig.q || []).push(arguments);
  };
  window.adConfig({
    preloadAdBreaks: 'on',
    sound: 'on'
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Wordle({ players = PLAYERS, onBack }) {
  const puzzleDate = getActivePuzzleDate();
  const target     = players.length ? getDailyPlayer(players, "wordle", puzzleDate) : null;
  const targetName = (target?.name || "").toUpperCase().replace(/\s.*/, "");

  const handleBack = onBack || (() => window.history.back());

  const [guesses,   setGuesses]   = useState([]);
  const [input,     setInput]     = useState("");
  const [gameOver,  setGameOver]  = useState(false);
  const [solved,    setSolved]    = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [score,     setScore]     = useState(0);
  const [msg,       setMsg]       = useState(null);
  const [hint,      setHint]      = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [stats,     setStats]     = useState(loadStats);
  const [history,   setHistory]   = useState(loadHistory);
  const [revealing, setRevealing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  
  // Rewarded ad states
  const [maxGuesses, setMaxGuesses] = useState(MAX_GUESSES);
  const [rewardHints, setRewardHints] = useState([]);
  const [hasWatchedExtraTryAd, setHasWatchedExtraTryAd] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  
  const inputRef = useRef(null);

  const launch     = new Date("2026-06-01T00:00:00");
  const puzzleNum  = Math.max(1, Math.floor((new Date(puzzleDate + "T00:00:00") - launch) / 86400000) + 1);
  const dateLabel  = new Date(puzzleDate + "T00:00:00").toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById("wdl-css")) {
      const s = document.createElement("style"); s.id = "wdl-css"; s.textContent = CSS;
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
      setGameOver(saved.gameOver !== undefined ? saved.gameOver : true);
      setShowModal(false);
      if (saved.maxGuesses) setMaxGuesses(saved.maxGuesses);
      if (saved.hasWatchedExtraTryAd) setHasWatchedExtraTryAd(saved.hasWatchedExtraTryAd);
      if (saved.rewardHints) setRewardHints(saved.rewardHints);
    }
  }, [targetName, puzzleDate]);

  function showMsg(text, type = "info", duration = 3000) {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), duration);
  }

  async function handleSubmit() {
    if (gameOver || revealing) return;
    const guess = input.toUpperCase().trim();
    if (!guess) { showMsg("Enter a name!", "error"); return; }
    if (guess.length !== targetName.length) {
      showMsg(`Must be ${targetName.length} letters`, "error"); return;
    }
    if (guesses.some(g => g.letters.join("") === guess)) {
      showMsg("Already guessed that!", "error"); return;
    }

    const results   = evaluateGuess(guess, targetName);
    const newGuess  = { letters: guess.split(""), results };
    setRevealing(true);
    setTimeout(() => setRevealing(false), results.length * 100 + 400);

    const newGuesses = [...guesses, newGuess];
    const won  = results.every(r => r === "correct");
    const lost = !won && newGuesses.length >= maxGuesses;
    const over = won || lost;

    setGuesses(newGuesses);
    setInput("");

    if (newGuesses.length === 3 && target?.country)  setHint(`${target.flag || ""} ${target.country}`);
    if (newGuesses.length === 4 && target?.position) setHint(`${target.flag || ""} ${target.country} · ${target.position}`);

    if (over) {
      const calcScore = won ? (SCORE_BY_GUESS[newGuesses.length] ?? 0) : 0;
      const pts       = won ? (XP_BY_GUESS[newGuesses.length] ?? 5) : 0;
      let xp = pts;
      if (won) {
        const user = getUser();
        if (user?.userId) {
          const r = await awardXP(user.userId, "wordle_correct", { rawXP: pts });
          xp = r?.xpAwarded ?? pts;
        }
      }
      setGameOver(true); setSolved(won); setScore(calcScore); setXpAwarded(xp);
      const { stats: s, history: h } = saveResult(puzzleDate, calcScore);
      setStats(s); setHistory(h);
      localStorage.setItem(`footbrawls_wordle_${puzzleDate}`, JSON.stringify({
        guesses: newGuesses,
        solved: won,
        score: calcScore,
        xpAwarded: xp,
        gameOver: true,
        maxGuesses,
        hasWatchedExtraTryAd,
        rewardHints
      }));
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function unlockNextPremiumHint() {
    if (!target) return;
    const hints = [];
    if (target.club) hints.push(`Plays for ${target.club}`);
    if (target.age && target.foot) hints.push(`Age: ${target.age} · Foot: ${target.foot}`);
    if (targetName) hints.push(`First letter of name is "${targetName[0]}"`);

    // Find the first hint not yet in rewardHints
    const nextHint = hints.find(h => !rewardHints.includes(h));
    if (nextHint) {
      const newRewardHints = [...rewardHints, nextHint];
      setRewardHints(newRewardHints);
      showMsg("Hint unlocked successfully!", "success");

      // Update local storage save state if game is already saved
      const saved = JSON.parse(localStorage.getItem(`footbrawls_wordle_${puzzleDate}`) || "null");
      if (saved) {
        localStorage.setItem(`footbrawls_wordle_${puzzleDate}`, JSON.stringify({
          ...saved,
          rewardHints: newRewardHints
        }));
      }
    } else {
      showMsg("No more hints available for this player!", "info");
    }
  }

  function triggerRewardedAdForHint() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "get-premium-hint",
      beforeAd: () => {
        setIsAdLoading(true);
      },
      afterAd: () => {
        setIsAdLoading(false);
      },
      adDismissed: () => {
        showMsg("Ad dismissed. No hint unlocked.", "error");
      },
      adViewed: () => {
        unlockNextPremiumHint();
      },
      adBreakDone: () => {
        setIsAdLoading(false);
      }
    });
  }

  function triggerRewardedAdForExtraTry() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "get-extra-try",
      beforeAd: () => {
        setIsAdLoading(true);
      },
      afterAd: () => {
        setIsAdLoading(false);
      },
      adDismissed: () => {
        showMsg("Ad dismissed. No extra attempt granted.", "error");
      },
      adViewed: () => {
        const newMaxGuesses = maxGuesses + 1;
        setMaxGuesses(newMaxGuesses);
        setGameOver(false);
        setHasWatchedExtraTryAd(true);
        showMsg("Granted 1 Extra Attempt! Keep guessing!", "success");

        // Update local storage to reflect game is active again
        localStorage.setItem(`footbrawls_wordle_${puzzleDate}`, JSON.stringify({
          guesses,
          solved: false,
          score: 0,
          xpAwarded: 0,
          gameOver: false,
          maxGuesses: newMaxGuesses,
          hasWatchedExtraTryAd: true,
          rewardHints
        }));

        setTimeout(() => inputRef.current?.focus(), 100);
      },
      adBreakDone: () => {
        setIsAdLoading(false);
      }
    });
  }

  function handleShare() {
    const attemptsLabel = solved ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`;
    const emoji = guesses.map(g =>
      g.results.map(r => r === "correct" ? "🟩" : r === "present" ? "🟨" : "⬛").join("")
    ).join("\n");
    const text = `Footbrawls Wordle ${attemptsLabel}\n${emoji}\nfootbrawls.gg`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  }

  const remaining = maxGuesses - guesses.length;

  return (
    <div style={{ background: "var(--bg,#05070f)", minHeight: "100vh", color: "var(--text,#F0F0F0)", fontFamily: "'DM Sans',sans-serif" }}>
      <div className="wdl-bg" />
      <div className="wdl-noise" />

      {showModal && (
        <HowToPlayModal onClose={() => { setShowModal(false); inputRef.current?.focus(); }} />
      )}

      {/* ── NAV ── */}
      <nav className="wdl-nav">
        <span className="wdl-logo">⚽ Footbrawls</span>
        <div className="wdl-nav-tag">
          <span className="wdl-tag-dot" />
          Player Wordle
        </div>
        <div className="wdl-nav-right">
          <div className="wdl-help-wrap">
            <button className="wdl-help-btn" onClick={() => setShowModal(true)} aria-label="How to play">?</button>
            <div className="wdl-help-tooltip">Rules / How to Play</div>
          </div>
        </div>
      </nav>

      <div className="wdl-page">

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 24, animation: "fadeUp 0.5s ease both" }}>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2.2rem,5vw,3.2rem)", letterSpacing: 2, lineHeight: 1, marginBottom: 5 }}>
            Player Wordle
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Guess the footballer's name in {maxGuesses} tries</p>
        </div>

        {/* ── PUZZLE BAR ── */}
        <div className="wdl-puzzle-bar">
          <div className="wdl-puzzle-item">📅 <strong>{dateLabel}</strong></div>
          <div className="wdl-puzzle-sep" />
          <div className="wdl-puzzle-item">🧩 Puzzle <strong>#{puzzleNum}</strong></div>
        </div>

        {/* ── SCORE BOX ── */}
        <div className="wdl-score-box">
          <div>
            <div className="wdl-score-label">Current Score</div>
            <div className="wdl-score-value">{score} pts</div>
          </div>
          <div className="wdl-score-streak">
            {stats.streak ? `🔥 ${stats.streak} day streak` : "Play to start streak"}
          </div>
        </div>

        {/* ── HINTS ── */}
        {(hint || rewardHints.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {hint && (
              <div className="wdl-hint">
                <span className="wdl-hint-icon">💡</span>
                <span className="wdl-hint-text"><strong>Hint:</strong> {hint}</span>
              </div>
            )}
            {rewardHints.map((rh, idx) => (
              <div key={idx} className="wdl-hint" style={{ borderLeft: "3px solid var(--accent3)", background: "rgba(168,85,247,0.12)" }}>
                <span className="wdl-hint-icon">🎁</span>
                <span className="wdl-hint-text"><strong>Ad Reward Hint:</strong> {rh}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── MESSAGE ── */}
        {msg && <div className={`wdl-msg wdl-msg-${msg.type}`}>{msg.text}</div>}

        {/* ── GAME CARD ── */}
        <div className="wdl-game-card">
          <div className="wdl-legend">
            <div className="wdl-legend-item">
              <div className="wdl-legend-dot" style={{ background: "var(--green)" }} /> Correct position
            </div>
            <div className="wdl-legend-item">
              <div className="wdl-legend-dot" style={{ background: "var(--orange)" }} /> Wrong position
            </div>
            <div className="wdl-legend-item">
              <div className="wdl-legend-dot" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }} /> Not in name
            </div>
          </div>

          {/* Board */}
          <div className="wdl-board">
            {guesses.map((g, ri) => (
              <div key={ri} className="wdl-row">
                {g.letters.map((letter, ci) => (
                  <div
                    key={ci}
                    className={`wdl-tile ${g.results[ci]}${ri === guesses.length - 1 && revealing ? " revealing" : ""}`}
                    style={{ animationDelay: revealing ? `${ci * 80}ms` : "0ms" }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            ))}
            {!gameOver && Array.from({ length: remaining }).map((_, ri) => (
              <div key={`e-${ri}`} className="wdl-row">
                {Array.from({ length: targetName.length }).map((_, ci) => (
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
                onChange={e => setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Enter player name…"
                maxLength={targetName.length || 15}
                autoComplete="off"
                disabled={gameOver || isAdLoading}
              />
              <button className="wdl-submit" onClick={handleSubmit} disabled={!input.trim() || gameOver || isAdLoading}>
                Submit
              </button>
            </div>
          )}

          {!gameOver && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <button
                className="wdl-btn"
                style={{
                  background: "linear-gradient(135deg, rgba(247,195,68,0.15), rgba(168,85,247,0.15))",
                  border: "1px solid rgba(168,85,247,0.3)",
                  color: "var(--accent)",
                  fontSize: "0.8rem",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                onClick={triggerRewardedAdForHint}
                disabled={isAdLoading}
              >
                <span>{isAdLoading ? "⏳" : "📺"}</span> Watch Ad for Hint
              </button>
            </div>
          )}

          <div className="wdl-attempt-counter">Attempts: {guesses.length} / {maxGuesses}</div>
        </div>

        {/* ── CONTROLS ── */}
        <div className="wdl-controls">
          <button className="wdl-btn wdl-btn-back" onClick={handleBack}>← Home</button>
          {gameOver && (
            <button className="wdl-btn wdl-btn-share" onClick={handleShare}>
              📤 Share Score
              <span className={`wdl-share-copied${shareCopied ? " show" : ""}`}>✓ Copied!</span>
            </button>
          )}
        </div>

        {/* ── RESULT CARD ── */}
        {gameOver && (
          <div className="wdl-result">
            <div className="wdl-result-badge">Game Complete</div>
            <div className="wdl-result-title" style={{ color: solved ? "var(--green)" : "var(--accent2)" }}>
              {solved ? `🎉 ${targetName}!` : "😞 Game Over!"}
            </div>
            <div className="wdl-result-score">{score} pts</div>
            <div className="wdl-result-phrase">
              {solved
                ? `Guessed correctly in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}!`
                : `The answer was ${targetName}`}
            </div>
            {solved && xpAwarded > 0 && (
              <div className="wdl-xp-badge">+{xpAwarded} XP earned</div>
            )}
            
            {!solved && !hasWatchedExtraTryAd && (
              <div style={{ margin: "20px 0", padding: 16, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 12 }}>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 12 }}>
                  Want another try? Watch a quick ad to get <strong>1 extra attempt</strong>!
                </p>
                <button
                  className="wdl-btn"
                  style={{
                    background: "var(--accent3)",
                    color: "#fff",
                    width: "100%",
                    justifyContent: "center",
                    boxShadow: "0 4px 16px rgba(168,85,247,0.28)",
                    padding: "12px"
                  }}
                  onClick={triggerRewardedAdForExtraTry}
                  disabled={isAdLoading}
                >
                  📺 {isAdLoading ? "Loading Ad..." : "Watch Ad for +1 Try"}
                </button>
              </div>
            )}

            <div className="wdl-result-actions">
              <button className="wdl-btn wdl-btn-share" onClick={handleShare}>📤 Share</button>
              <button className="wdl-btn wdl-btn-back" onClick={handleBack}>← Home</button>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        <div className="wdl-bottom-section">
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
                  { val: stats.played ?? 0, name: "Played" },
                  { val: stats.best   ?? 0, name: "Best Score" },
                  { val: stats.avg    ?? 0, name: "Avg Score" },
                  { val: stats.streak ?? 0, name: "Day Streak" },
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

      </div>{/* end .wdl-page */}

      {/* ── BOTTOM NAV ── */}
      <nav className="wdl-bottom-nav">
        {[
          { id: "home",  label: "Games", icon: "⚽" },
          { id: "guild", label: "Guild", icon: "🏰" },
          { id: "raids", label: "Raids", icon: "⚔️" },
          { id: "ranks", label: "Ranks", icon: "🏆" },
          { id: "me",    label: "Me",    icon: "👤" },
        ].map(item => (
          <button
            key={item.id}
            className={`wdl-nav-item${item.id === "home" ? " active" : ""}`}
            onClick={() => item.id === "home" && handleBack()}
          >
            {item.id === "home" && <span className="wdl-nav-indicator" />}
            <span className="wdl-nav-icon">{item.icon}</span>
            <span className="wdl-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}