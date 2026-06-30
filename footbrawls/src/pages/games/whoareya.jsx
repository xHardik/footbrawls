// src/pages/games/whoareya.jsx
// Football "Who Are Ya?" — Footbrawls edition
// UI faithfully ported from cricket to football with Google AdBreak integration

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyPlayer, getActivePuzzleDate, getRaidSeed } from '../../lib/dailySeed.js';
import { awardXP } from '../../lib/xpEngine.js';
import { getUser } from '../../lib/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { PLAYERS } from '../../lib/players.js';
import { PlayerPhoto, ClubLogo } from '../../lib/wikiAssets.jsx';
import { triggerWinConfetti, triggerLossHeartbreaks, autoScrollToResult } from '../../lib/effects.js';

const MAX_ATTEMPTS = 8;
const SCORES = [25, 23, 21, 19, 17, 15, 13, 11];

const STATS_KEY = 'footbrawls_whoareya_stats';
const HISTORY_KEY = 'footbrawls_whoareya_history';

// ─── Continent/Region Map for Football Players ────────────────────────────────
const COUNTRY_REGIONS = {
  ARG: 'South America',
  BRA: 'South America',
  URU: 'South America',
  COL: 'South America',
  FRA: 'Europe',
  NOR: 'Europe',
  ENG: 'Europe',
  POL: 'Europe',
  ESP: 'Europe',
  GER: 'Europe',
  POR: 'Europe',
  CRO: 'Europe',
  NED: 'Europe',
  CHE: 'Europe',
  BEL: 'Europe',
  USA: 'North America',
  CAN: 'North America',
  MEX: 'North America',
  MAR: 'Africa',
  NGA: 'Africa',
  SEN: 'Africa',
  EGY: 'Africa',
  KOR: 'Asia',
  JPN: 'Asia'
};

// ─── Injected CSS ──────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,900&display=swap');

@font-face {
  font-family: "Twemoji Country Flags";
  src: url("https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1.3/dist/CountryFlagEmojiPolyfill.ttf") format("truetype");
}

:root {
  --bg:#05070f; --surface:rgba(255,255,255,.038); --border:rgba(255,255,255,.08);
  --border2:rgba(255,255,255,.13); --accent:#F7C344; --accent2:#E84040;
  --accent3:#4F8EF7; --green:#3DD68C; --text:#F0F0F0;
  --muted:rgba(240,240,240,.45); --muted2:rgba(240,240,240,.25);
  --card-radius:16px; --dd:#060a1a; --orange:#F97316;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:"Twemoji Country Flags", 'DM Sans',sans-serif}

/* MAIN LAYOUT */
.wya-page {
  background: var(--bg); color: var(--text); min-height: 100vh;
  position: relative; overflow-x: hidden;
  font-family: "Twemoji Country Flags", 'DM Sans', sans-serif;
}
.wya-bg-layer {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: 
    radial-gradient(circle at 10% 20%, rgba(249,115,22,0.04) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(247,195,68,0.035) 0%, transparent 45%);
}
.wya-noise {
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
  opacity: .018; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* NAV */
.wya-nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 64px; padding: 0 24px; position: relative; z-index: 10;
  border-bottom: 1px solid rgba(249, 115, 22, 0.15);
  background: rgba(5,7,15,0.7); backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(249, 115, 22, 0.15);
}
.wya-nav-logo {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 2px;
  background: linear-gradient(135deg, var(--orange), var(--accent));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; border: none; cursor: pointer; text-transform: uppercase;
}
.wya-nav-tag {
  font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;
  color: var(--muted); border: 1px solid var(--border); padding: 5px 12px;
  border-radius: 100px; display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.02);
}
.wya-fire-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--orange);
  box-shadow: 0 0 8px var(--orange);
}
.wya-nav-right {
  display: flex; gap: 8px;
}
.wya-nav-btn {
  background: var(--surface); border: 1px solid var(--border); color: #fff;
  padding: 8px 14px; border-radius: 10px; font-size: .8rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
}
.wya-nav-btn:hover {
  background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2);
}

/* MAIN CONTENT */
.wya-main {
  max-width: 580px; margin: 0 auto; padding: 32px 16px 80px;
  position: relative; z-index: 5;
}
.wya-page-header {
  text-align: left; margin-bottom: 28px;
}
.wya-page-header h1 {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.7rem; letter-spacing: 1.5px;
  color: var(--orange); margin-bottom: 4px; line-height: 1;
}
.wya-page-header p {
  font-size: .82rem; color: var(--muted); font-weight: 500;
}

/* ATTEMPTS INDICATOR */
.wya-attempts-indicator {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  margin-bottom: 20px;
}
.wya-attempts-label {
  font-size: .65rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--muted);
}
.wya-attempts-dots {
  display: flex; gap: 7px;
}
.wya-att-dot {
  width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.15); transition: background .3s,border-color .3s,transform .25s cubic-bezier(.34,1.56,.64,1);
}
.wya-att-dot.used {background: var(--accent2); border-color: var(--accent2)}
.wya-att-dot.correct {background: var(--green); border-color: var(--green); transform: scale(1.4)}

/* HINT STRIP */
.wya-hint-strip {
  display: flex; gap: 8px; flex-wrap: nowrap; justify-content: flex-start;
  margin-bottom: 16px; animation: fadeUp .5s ease .1s both; padding: 0 4px;
}
.wya-hint-pill {
  display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.08); border-radius: 100px; padding: 6px 14px 6px 10px;
  font-size: .73rem; font-weight: 600; color: var(--muted);
  transition: all .4s cubic-bezier(.34,1.56,.64,1); white-space: nowrap; cursor: default;
}
.wya-hint-pill .hp-icon {font-size: .8rem; opacity: .5; transition: opacity .3s}
.wya-hint-pill .hp-label {
  font-size: .58rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1.5px; opacity: .45; transition: opacity .3s; margin-right: 2px;
}
.wya-hint-pill .hp-val {font-weight: 700}
.wya-hint-pill.revealed {
  color: var(--accent); border-color: rgba(247,195,68,.5);
  background: rgba(247,195,68,0.08); box-shadow: 0 0 12px rgba(247,195,68,.12);
  animation: pillPop .55s cubic-bezier(.34,1.56,.64,1);
}
.wya-hint-pill.revealed .hp-icon {opacity: 1}
.wya-hint-pill.revealed .hp-label {opacity: .65}
.wya-hint-pill.clickable {cursor: pointer}
.wya-hint-pill.clickable:hover {
  background: rgba(255,255,255,.08); border-color: rgba(247,195,68,.35);
  color: #fff;
}
.wya-hint-pill.clickable:hover .hp-icon {opacity: 0.9}

@keyframes pillPop{0%{transform:scale(1)}45%{transform:scale(1.14)}100%{transform:scale(1)}}

/* LEGEND */
.wya-legend-bar {
  display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-start; margin-bottom: 18px;
  animation: fadeUp .5s ease .12s both; background: rgba(255,255,255,.025);
  border: 1px solid rgba(255,255,255,.06); border-radius: 100px;
  padding: 7px 16px; width: fit-content; margin-left: 0; margin-right: auto;
}
.wya-legend-item {
  display: flex; align-items: center; gap: 5px; font-size: .67rem; font-weight: 700;
  color: var(--muted); text-transform: uppercase; letter-spacing: .8px;
  padding: 0 8px; position: relative;
}
.wya-legend-item:not(:last-child)::after {
  content: ''; position: absolute; right: -4px; top: 25%; height: 50%;
  width: 1px; background: rgba(255,255,255,.08);
}
.wya-legend-dot {
  width: 7px; height: 7px; border-radius: 50%;
}
.wya-legend-dot.green {background: var(--green); box-shadow: 0 0 6px var(--green)}
.wya-legend-dot.yellow {background: var(--accent); box-shadow: 0 0 6px var(--accent)}
.wya-legend-dot.red {background: var(--accent2); box-shadow: 0 0 6px var(--accent2)}

/* SEARCHBOX & DROPDOWN */
.wya-search-wrapper {
  position: relative; margin-bottom: 30px; z-index: 100;
  animation: fadeUp .5s ease .15s both; display: flex; gap: 8px;
}
.wya-search-input {
  flex: 1; background: rgba(255,255,255,.03); border: 1px solid var(--border);
  color: #fff; padding: 14px 18px; border-radius: 14px; font-size: .92rem;
  font-family: inherit; font-weight: 500; outline: none; transition: all 0.2s;
}
.wya-search-input:focus {
  border-color: rgba(247,195,68,0.45); background: rgba(255,255,255,.05);
  box-shadow: 0 0 16px rgba(247,195,68,0.06);
}
.wya-btn-guess {
  background: var(--accent); color: #000; border: none; font-weight: 700;
  padding: 0 24px; border-radius: 14px; font-size: .88rem; cursor: pointer;
  transition: opacity .2s, transform .15s; font-family: inherit;
}
.wya-btn-guess:hover:not(:disabled) {
  opacity: .93; transform: translateY(-1px);
}
.wya-btn-guess:disabled {
  opacity: .35; cursor: not-allowed; background: rgba(255,255,255,.15); color: var(--muted);
}
.wya-dropdown {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  background: var(--dd); border: 1px solid var(--border2); border-radius: 14px;
  overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,.6); max-height: 280px;
  overflow-y: auto; z-index: 999; backdrop-filter: blur(20px);
}
.wya-di {
  display: flex; align-items: center; gap: 14px; padding: 11px 16px;
  border-bottom: 1px solid rgba(255,255,255,.03); cursor: pointer; transition: background .15s;
}
.wya-di:hover {
  background: rgba(255,255,255,.05);
}
.wya-di-flag {
  font-size: 1.5rem;
}
.wya-di-info {
  flex: 1;
}
.wya-di-name {
  font-size: .85rem; font-weight: 700; color: #fff; margin-bottom: 2px;
}
.wya-di-meta {
  font-size: .72rem; color: var(--muted); font-weight: 500;
}
.wya-role-badge {
  font-size: .6rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px;
  padding: 4px 8px; border-radius: 6px;
}
.wya-role-badge.batter   {background: rgba(247,195,68,.15); color: var(--accent); border: 1px solid rgba(247,195,68,.3)}
.wya-role-badge.bowler   {background: rgba(232,64,64,.12); color: var(--accent2); border: 1px solid rgba(232,64,64,.25)}
.wya-role-badge.allround {background: rgba(79,142,247,.12); color: var(--accent3); border: 1px solid rgba(79,142,247,.25)}
.wya-role-badge.wk       {background: rgba(61,214,140,.12); color: var(--green); border: 1px solid rgba(61,214,140,.25)}
.wya-no-results {
  padding: 16px; text-align: center; color: var(--muted); font-size: .82rem;
}

/* RESULTS GRID */
.wya-col-headers {
  display: grid; grid-template-columns: 2.2fr 1.3fr 1.3fr 1.3fr 1fr 1fr; gap: 6px;
  padding: 0 4px; margin-bottom: 8px; animation: fadeUp .5s ease .18s both;
}
.wya-col-hdr {
  font-size: .62rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; color: var(--muted); text-align: center;
}
.wya-guesses-wrap {
  display: flex; flex-direction: column; gap: 7px; margin-bottom: 30px;
}
.wya-guess-row {
  display: grid; grid-template-columns: 2.2fr 1.3fr 1.3fr 1.3fr 1fr 1fr; gap: 6px;
  animation: rowEntry 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}
@keyframes rowEntry {
  from {opacity: 0; transform: scale(.97) translateY(12px)}
  to {opacity: 1; transform: scale(1) translateY(0)}
}
.wya-cell {
  background: rgba(255,255,255,.02); border: 1px solid var(--border);
  border-radius: 12px; min-height: 62px; padding: 10px 6px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 600; text-align: center; position: relative;
  transition: transform .3s; overflow: hidden;
}
.wya-cell.correct {
  background: rgba(61,214,140,0.14); border-color: rgba(61,214,140,0.38); color: #fff;
  box-shadow: inset 0 0 10px rgba(61,214,140,0.08);
}
.wya-cell.partial {
  background: rgba(247,195,68,0.12); border-color: rgba(247,195,68,0.38); color: #fff;
  box-shadow: inset 0 0 10px rgba(247,195,68,0.06);
}
.wya-cell.wrong {
  background: rgba(232,64,64,0.08); border-color: rgba(232,64,64,0.24); color: var(--muted);
}
.wya-cell-tick {
  position: absolute; top: 3px; right: 4px; font-size: .55rem;
  color: var(--green); font-weight: 900; opacity: .8;
}
.wya-cell-flag {
  font-size: 1.4rem; line-height: 1.1;
}
.wya-cell-ctry {
  font-size: .52rem; font-weight: 800; text-transform: uppercase;
  color: var(--muted); letter-spacing: .5px; margin-top: 2px;
}
.wya-cell-name {
  font-size: .78rem; font-weight: 800; color: #fff; line-height: 1.2;
}
.wya-cell-sub {
  font-size: .52rem; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px;
}
.wya-cell .arrow {
  font-size: .75rem; font-weight: 900; margin-top: 1px; color: var(--accent);
}

/* RESULT CARD */
.wya-result-card {
  background: linear-gradient(180deg, rgba(255,255,255,.035) 0%, rgba(255,255,255,.015) 100%);
  border: 1px solid var(--border2); border-radius: 20px; padding: 36px 28px;
  text-align: center; margin-bottom: 34px; animation: fadeUp .5s ease both;
  backdrop-filter: blur(10px);
}
.wya-result-badge {
  display: inline-block; padding: 5px 14px; border-radius: 100px;
  font-size: .65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;
  margin-bottom: 16px;
}
.wya-result-badge.win {
  background: rgba(61,214,140,.12); color: var(--green); border: 1px solid rgba(61,214,140,.3);
}
.wya-result-badge.lose {
  background: rgba(232,64,64,.12); color: var(--accent2); border: 1px solid rgba(232,64,64,.3);
}
.wya-result-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; letter-spacing: 1px;
  margin-bottom: 4px;
}
.wya-result-player {
  font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 2px;
}
.wya-result-phrase {
  font-size: .78rem; color: var(--muted); margin-bottom: 22px; font-weight: 500;
}
.wya-result-breakdown {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
  background: rgba(5,7,15,0.4); border: 1px solid var(--border);
  border-radius: 14px; padding: 14px 10px; margin-bottom: 24px;
}
.wya-rb-item {
  text-align: center;
}
.wya-rb-label {
  font-size: .58rem; font-weight: 800; text-transform: uppercase;
  color: var(--muted); letter-spacing: .8px; margin-bottom: 3px;
}
.wya-rb-val {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 1px; color: #fff;
}
.wya-rb-val.green {
  color: var(--green);
}
.wya-result-actions {
  display: flex; gap: 8px; justify-content: center;
}
.wya-btn {
  padding: 12px 20px; border-radius: 12px; font-size: .82rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: opacity 0.2s, transform 0.15s;
}
.wya-btn:hover {
  opacity: .9; transform: translateY(-1px);
}
.wya-btn.primary {
  background: var(--accent); color: #000; border: none; flex: 1;
}
.wya-btn.share {
  background: var(--surface); color: #fff; border: 1px solid var(--border2); flex: 1;
}
.wya-btn.secondary {
  background: rgba(255, 255, 255, 0.06); color: #fff; border: 1px solid var(--border); flex: 1;
}

/* XP BADGE */
.pn-xp-badge {
  background: linear-gradient(135deg, rgba(247,195,68,0.12) 0%, rgba(249,115,22,0.12) 100%);
  border: 1px solid rgba(247,195,68,0.25); border-radius: 100px;
  padding: 6px 16px; display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.78rem; font-weight: 700; color: var(--accent);
  margin-bottom: 20px; animation: pillPop 0.6s ease;
}

/* DASHBOARD & STATS */
.wya-bottom-section {
  animation: fadeUp .5s ease .22s both;
}
.wya-section-divider {
  display: flex; align-items: center; gap: 14px; margin-bottom: 22px;
}
.wya-section-label {
  font-size: .65rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--muted); white-space: nowrap;
}
.wya-section-line {
  flex: 1; height: 1px; background: var(--border);
}
.wya-dashboard-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.wya-dash-card {
  background: rgba(255,255,255,.02); border: 1px solid var(--border);
  border-radius: 16px; padding: 18px; display: flex; flex-direction: column;
}
.wya-dash-card-hdr {
  display: flex; align-items: center; gap: 6px; margin-bottom: 14px;
}
.wya-dash-icon {
  font-size: .95rem;
}
.wya-dash-label {
  font-size: .68rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; color: var(--muted);
}
.wya-streak-dots {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 4px; margin-bottom: 16px;
}
.wya-streak-dot {
  aspect-ratio: 1; border-radius: 6px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.05);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Space Mono', monospace; font-size: 0.52rem; font-weight: 700;
}
.wya-streak-dot.win {
  background: rgba(61,214,140,.18); border-color: rgba(61,214,140,.32); color: #3DD68C;
}
.wya-streak-dot.miss {
  background: rgba(232,64,64,.08); border-color: rgba(232,64,64,.18); color: #ff8080;
}
.wya-streak-dot.today-played {
  background: rgba(247,195,68,.14); border-color: var(--accent); box-shadow: 0 0 10px rgba(247,195,68,.2);
}
.wya-streak-dot.today-pending {
  background: rgba(79,142,247,.09); border-style: dashed; border-color: rgba(79,142,247,.38);
}
.wya-streak-legend {
  display: flex; gap: 13px; font-size: .68rem; color: var(--muted); align-items: center; flex-wrap: wrap;
  margin-top: auto;
}
.wya-dot-sample {
  display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 4px; vertical-align: middle;
}
.wya-dot-sample.win {background: rgba(61,214,140,.18); border: 1px solid var(--green)}
.wya-dot-sample.miss {background: rgba(232,64,64,.08); border: 1px solid rgba(232,64,64,0.18)}
.wya-dot-sample.today {background: rgba(247,195,68,.14); border: 1px solid var(--accent)}
.wya-stats-grid {
  flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px;
}
.wya-stat-item {
  background: rgba(255,255,255,.03); border: 1px solid var(--border); border-radius: 12px;
  padding: 14px 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: border-color .2s,background .2s;
}
.wya-stat-item:hover {
  border-color: rgba(247,195,68,.22); background: rgba(247,195,68,.03);
}
.wya-stat-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--accent), #fff 80%); -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; margin-bottom: 3px;
}
.wya-stat-name {
  font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted);
}

/* MODAL */
.wya-modal-overlay {
  display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.84);
  backdrop-filter: blur(14px); justify-content: center; align-items: center; padding: 20px;
}
.wya-modal-overlay.active {
  display: flex; animation: fadeIn .22s ease;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.wya-modal-box {
  background: #0c1020; border: 1px solid rgba(249,115,22,.25); border-radius: 24px;
  padding: 44px 36px; max-width: 520px; width: 100%; max-height: 88vh; overflow-y: auto;
  position: relative; animation: modalUp .32s cubic-bezier(.4,0,.2,1);
}
.wya-modal-box::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--orange), var(--accent), var(--orange)); border-radius: 24px 24px 0 0;
}
@keyframes modalUp{from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.wya-modal-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.3rem; letter-spacing: 2px; text-align: center; margin-bottom: 26px;
}
.wya-rules-list {
  list-style: none; margin-bottom: 22px; display: flex; flex-direction: column; gap: 9px;
}
.wya-rules-list li {
  background: var(--surface); border: 1px solid var(--border); border-left: 3px solid rgba(249,115,22,0.45);
  border-radius: 12px; padding: 13px 16px; font-size: .88rem; line-height: 1.6; transition: border-color .2s,transform .2s;
}
.wya-rules-list li:hover {
  border-left-color: var(--orange); transform: translateX(4px);
}
.wya-modal-attrs {
  background: rgba(249,115,22,.06); border: 1px solid rgba(249,115,22,0.2); border-radius: 14px; padding: 18px; margin-bottom: 22px;
}
.wya-modal-attrs-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 1px; color: var(--orange); margin-bottom: 12px; text-align: center;
}
.wya-modal-attrs-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: .82rem; color: var(--muted);
}
.wya-modal-close {
  width: 100%; padding: 14px; font-size: .92rem; border-radius: 12px; background: var(--orange);
  color: #fff; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 700;
  transition: opacity .2s;
}
.wya-modal-close:hover {opacity: .88}

/* SPINNER */
.wya-spinner {display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg)}
.wya-spinner-ring {
  width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255,255,255,.07);
  border-top-color: var(--orange); animation: spin .7s linear infinite;
}
@keyframes spin {to{transform:rotate(360deg)}}

/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* RESPONSIVE */
@media(max-width:700px){
  .wya-nav {padding: 0 14px; height: 54px}
  .wya-nav-logo {font-size: 1.35rem}
  .wya-nav-tag {font-size: .6rem; padding: 4px 10px}
  .wya-main {padding: 18px 14px 56px}
  .wya-page-header h1 {font-size: 1.9rem}
  .wya-hint-strip {gap: 6px}
  .wya-hint-pill {padding: 5px 10px 5px 8px; font-size: .68rem}
  .wya-hint-pill .hp-label {display: none}
  .wya-legend-bar {padding: 6px 12px; gap: 4px}
  .wya-legend-item {font-size: .62rem; padding: 0 6px}
  .wya-col-headers, .wya-guess-row {grid-template-columns: 2fr 1.3fr 1.1fr 1.1fr .95fr .95fr; gap: 3px}
  .wya-cell {font-size: .62rem; min-height: 56px; padding: 8px 4px}
  .wya-cell:first-child {font-size: .72rem}
  .wya-cell-flag {font-size: 1.2rem}
  .wya-dashboard-grid {grid-template-columns: 1fr 1fr; gap: 8px}
  .wya-dash-card {padding: 12px}
  .wya-result-breakdown {grid-template-columns: 1fr 1fr}
  .wya-result-card {padding: 28px 18px}
}
@media(max-width:480px){
  .wya-col-headers, .wya-guess-row {grid-template-columns: 2fr 1.1fr 1fr 1fr .9fr .9fr}
}
`;

// Initialize Google AdBreak queue safely
const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    console.log("[AdSense H5 Mock] Triggering ad placement:", options.name);
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.type === 'reward') {
        const confirmReward = window.confirm(`[TEST AD] Watch this rewarded ad to unlock hint: ${options.name}?`);
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

if (typeof window !== "undefined") {
  window.adConfig = window.adConfig || function() {
    (window.adConfig.q = window.adConfig.q || []).push(arguments);
  };
  window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function roleBadgeClass(position) {
  if (!position) return '';
  const p = position.toLowerCase();
  if (p.includes('forward')) return 'batter';      // mapping to yellow badge CSS
  if (p.includes('midfielder')) return 'allround';  // mapping to blue badge CSS
  if (p.includes('defender')) return 'bowler';      // mapping to red badge CSS
  if (p.includes('goalkeeper')) return 'wk';        // mapping to green badge CSS
  return '';
}

function evaluateGuess(guess, target) {
  const sameCountry = guess.countryCode === target.countryCode;
  
  // Continent/Region determination
  const guessRegion = COUNTRY_REGIONS[guess.countryCode] || 'Other';
  const targetRegion = COUNTRY_REGIONS[target.countryCode] || 'Other';
  const sameRegion = !sameCountry && guessRegion === targetRegion;

  const samePosition = guess.position === target.position;
  const sameClub = guess.club === target.club;
  const ageDiff = Math.abs(guess.age - target.age);
  const sameFoot = guess.foot === target.foot;

  return {
    cells: [
      {
        type: 'name',
        name: guess.name,
        flag: guess.flag,
        cls: guess.name === target.name ? 'correct' : 'wrong',
      },
      {
        type: 'country',
        flag: guess.flag,
        val: guess.country,
        cls: sameCountry ? 'correct' : sameRegion ? 'partial' : 'wrong',
      },
      {
        type: 'position',
        val: guess.position,
        cls: samePosition ? 'correct' : 'wrong',
      },
      {
        type: 'club',
        val: guess.club,
        cls: sameClub ? 'correct' : 'wrong',
      },
      {
        type: 'age',
        val: guess.age,
        cls: guess.age === target.age ? 'correct' : ageDiff <= 3 ? 'partial' : 'wrong',
        arrow: guess.age < target.age ? '↑' : guess.age > target.age ? '↓' : '',
      },
      {
        type: 'foot',
        val: guess.foot,
        cls: sameFoot ? 'correct' : 'wrong',
      },
    ],
  };
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { played: 0, won: 0, avgPts: 0, streak: 0 }; }
  catch { return { played: 0, won: 0, avgPts: 0, streak: 0 }; }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; }
  catch { return {}; }
}

function saveResult(puzzleDate, won, score) {
  const today = new Date().toISOString().split('T')[0];
  const history = loadHistory();
  if (!history[puzzleDate] || score > (history[puzzleDate].score || 0)) {
    history[puzzleDate] = { won, score };
  }
  const allEntries = Object.values(history);
  const stats = {
    played: allEntries.length,
    won: allEntries.filter(e => e.won).length,
    avgPts: Math.round(allEntries.reduce((s, e) => s + (e.score || 0), 0) / allEntries.length),
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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WhoAreYa() {
  const navigate = useNavigate();
  const [target, setTarget]           = useState(null);
  const [guesses, setGuesses]         = useState([]);
  const [guessedNames, setGuessedNames] = useState([]);
  const [search, setSearch]           = useState('');
  const [dropdown, setDropdown]       = useState([]);
  const [selected, setSelected]       = useState(null);
  const [gameOver, setGameOver]       = useState(false);
  const [won, setWon]                 = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [animKey, setAnimKey]         = useState(0);
  const [xpAwarded, setXpAwarded]     = useState(null);
  const [isRaid, setIsRaid] = useState(false);
  const [isVsFriends, setIsVsFriends] = useState(false);
  
  // Rewarded ad hint state
  const [unlockedHints, setUnlockedHints] = useState({ position: false, country: false, club: false });
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState(null);
  const [msg, setMsg] = useState(null);

  const [stats, setStats]           = useState(loadStats);
  const [history, setHistory]       = useState(loadHistory);
  const searchRef = useRef(null);

  const puzzleDate = getActivePuzzleDate();
  const puzzleNumber = Math.floor((new Date(puzzleDate) - new Date('2025-01-01')) / 86400000) + 1;

  function showMsg(text, type = "info", duration = 3000) {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), duration);
  }

  // Inject CSS once
  useEffect(() => {
    if (!document.getElementById('wya-injected-css')) {
      const s = document.createElement('style');
      s.id = 'wya-injected-css';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    let raid = !!localStorage.getItem('active_game_session_id');
    const sessionId = localStorage.getItem('active_game_session_id');
    const sessionSeed = localStorage.getItem('active_game_session_seed');
    let player;
    if (isRaidSession || isVsFriendsSession) {
      const seedVal = getRaidSeed(sessionId, sessionSeed);
      const idx = (seedVal + 997) % PLAYERS.length;
      player = PLAYERS[idx];
    } else {
      player = getDailyPlayer(PLAYERS, 'whoAreYa', puzzleDate);
    }

    setTarget(player);
    setIsRaid(isRaidSession);
    setIsVsFriends(isVsFriendsSession);

    if (isRaidSession || isVsFriendsSession) {
      setGuesses([]);
      setGuessedNames([]);
      setGameOver(false);
      setWon(false);
      setXpAwarded(null);
      setUnlockedHints({ position: false, country: false, club: false });
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem('footbrawls_whoareya') || '{}');
        if (saved.date === puzzleDate) {
          setGuesses(saved.guesses || []);
          setGuessedNames((saved.guesses || []).map(g => g.cells[0].name));
          setGameOver(!!saved.gameOver);
          setWon(!!saved.won);
          setXpAwarded(saved.xpAwarded ?? null);
          setUnlockedHints(saved.unlockedHints || { position: false, country: false, club: false });
        }
      } catch (_) {}
    }
  }, [puzzleDate]);

  // Dropdown filtering
  useEffect(() => {
    if (!search.trim()) { setDropdown([]); return; }
    const q = search.toLowerCase();
    setDropdown(
      PLAYERS.filter(p => p.name.toLowerCase().includes(q) && !guessedNames.includes(p.name)).slice(0, 8)
    );
  }, [search, guessedNames]);

  function triggerRewardedAdForHint(hintKey) {
    if (gameOver) return;
    setIsAdLoading(true);
    setLoadingKey(hintKey);
    adBreak({
      type: "reward",
      name: `who-are-ya-hint-${hintKey}`,
      beforeAd: () => {
        setIsAdLoading(true);
      },
      afterAd: () => {
        setIsAdLoading(false);
        setLoadingKey(null);
      },
      adDismissed: () => {
        showMsg("Ad dismissed. Hint not unlocked.", "error");
      },
      adViewed: () => {
        setUnlockedHints(prev => {
          const updated = { ...prev, [hintKey]: true };
          const saved = JSON.parse(localStorage.getItem('footbrawls_whoareya') || '{}');
          saved.unlockedHints = updated;
          localStorage.setItem('footbrawls_whoareya', JSON.stringify({ ...saved, date: puzzleDate }));
          return updated;
        });
        showMsg("Hint unlocked successfully!", "success");
      },
      adBreakDone: () => {
        setIsAdLoading(false);
        setLoadingKey(null);
      }
    });
  }

  async function submitGuess() {
    if (!selected || gameOver || !target) return;
    const result     = evaluateGuess(selected, target);
    const newGuesses = [...guesses, result];
    const newNames   = [...guessedNames, selected.name];
    setAnimKey(k => k + 1);
    setGuesses(newGuesses);
    setGuessedNames(newNames);
    setSelected(null); setSearch(''); setDropdown([]);

    const isWin  = selected.name === target.name;
    const isLoss = !isWin && newGuesses.length >= MAX_ATTEMPTS;

    if (isWin || isLoss) {
      setGameOver(true); setWon(isWin);
      const rawScore = isWin ? SCORES[newGuesses.length - 1] : 0;
      let finalXP = 0;
      
      let sessionType = null;
      let sessionData = null; let nextActVal = null;
      const user = getUser();
      if ((isWin || isRaid || isVsFriends) && user?.userId) {
        try {
          const res = await awardXP(user.userId, 'whoareya_correct', { rawXP: rawScore, guessNumber: newGuesses.length, solved: isWin });
          finalXP = res?.xpAwarded ?? rawScore;
          sessionType = res?.sessionType;
          sessionData = res?.session; nextActVal = res?.nextAct;
        } catch (e) {
          console.error('[WhoAreYa] awardXP failed:', e);
          finalXP = rawScore;
        }
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

      if (isRaid) {
        const activeId = localStorage.getItem('active_game_session_id');
        if (activeId) {
          localStorage.setItem(`raid_completed_act1_${activeId}`, 'true');
        }
      } else {
        // Single mode animations & scroll
        if (isWin) {
          triggerWinConfetti();
        } else {
          triggerLossHeartbreaks();
        }
        autoScrollToResult('.wya-result-card', isRaid);
      }
      setXpAwarded(finalXP);

      if (!(isRaid || isVsFriends)) {
        try {
          localStorage.setItem('footbrawls_whoareya', JSON.stringify({
            date: puzzleDate, 
            guesses: newGuesses, 
            won: isWin, 
            score: rawScore, 
            gameOver: true,
            xpAwarded: finalXP,
            unlockedHints
          }));
        } catch (_) {}

        const { stats: s, history: h } = saveResult(puzzleDate, isWin, finalXP);
        setStats(s); setHistory(h);
      }
    } else {
      // Just save incremental progress
      if (!(isRaid || isVsFriends)) {
        try {
          localStorage.setItem('footbrawls_whoareya', JSON.stringify({
            date: puzzleDate,
            guesses: newGuesses,
            won: false,
            score: 0,
            gameOver: false,
            unlockedHints
          }));
        } catch (_) {}
      }
    }
  }

  function handleShare() {
    const attempts = guesses.length;
    const emoji    = won ? '🏆' : '💔';
    const text     = `${emoji} Footbrawls – Who Are Ya?\nPuzzle #${puzzleNumber} | ${won ? attempts + '/8' : 'X/8'}\nhttps://footbrawls.vercel.app/games/whoareya`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert('Result copied to clipboard!');
    }
  }

  if (!target) {
    return (
      <div className="wya-spinner">
        <div className="wya-spinner-ring" />
      </div>
    );
  }

  const attempts     = guesses.length;
  const attemptsLeft = MAX_ATTEMPTS - attempts;
  const score        = won ? SCORES[attempts - 1] : 0;

  return (
    <>
      <div className="wya-page">
        <div className="wya-bg-layer" />
        <div className="wya-noise" />

        {/* Msg Banner */}
        {msg && (
          <div style={{
            position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)",
            background: msg.type === "success" ? "rgba(61,214,140,0.95)" : msg.type === "error" ? "rgba(232,64,64,0.95)" : "rgba(247,195,68,0.95)",
            color: msg.type === "success" ? "#fff" : "#000",
            padding: "10px 20px", borderRadius: "10px", zIndex: 100000,
            fontSize: "0.85rem", fontWeight: "700", boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
          }}>
            {msg.text}
          </div>
        )}

        {/* How to Play Modal */}
        <HowToPlayModal show={showModal} onClose={() => setShowModal(false)} />

        {/* NAV */}
        <nav className="wya-nav">
          <div style={{display:'flex', alignItems:'center', gap:8}}><img src="/logo.png" alt="Logo" style={{ height: 24, filter: 'drop-shadow(0 0 6px rgba(247,195,68,0.4))' }} />{!(isRaid || isVsFriends) && <button className="wya-nav-logo" onClick={() => navigate('/')}>←</button>}</div>
          {isVsFriends ? (
          <div className="wya-nav-tag" style={{ background: 'rgba(61,214,140,0.15)', borderColor: '#3DD68C', color: '#3DD68C' }}>
            <span className="wya-fire-dot" style={{ background: '#3DD68C', boxShadow: '0 0 8px #3DD68C' }} />
            VS FRIENDS
          </div>
        ) : (
          <div className="wya-nav-tag">
            <span className="wya-fire-dot" />
            Who Are Ya?
          </div>
        )}
          <div className="wya-nav-right">
            <button className="wya-nav-btn" onClick={() => setShowModal(true)}>❓ Help</button>
          </div>
        </nav>

        {/* MAIN */}
        <main className="wya-main">
          <header className="wya-page-header">
            <h1>Who Are Ya?</h1>
            <p>Guess the mystery footballer in {MAX_ATTEMPTS} tries</p>
          </header>

          {/* Attempts Indicator */}
          <div className="wya-attempts-indicator">
            <div className="wya-attempts-label">
              {gameOver ? 'Game Finished' : `${attemptsLeft} guesses left`}
            </div>
            <div className="wya-attempts-dots">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
                let cls = '';
                if (i < attempts) {
                  cls = (won && i === attempts - 1) ? 'correct' : 'used';
                }
                return <div key={i} className={`wya-att-dot ${cls}`} />;
              })}
            </div>
          </div>

          {/* Hint Strip */}
          <div className="wya-hint-strip">
            <HintPill 
              icon="🧢" 
              label="Position"    
              value={target.position}    
              revealed={unlockedHints.position}    
              onClick={() => triggerRewardedAdForHint('position')}
              loading={loadingKey === 'position'}
              isRaid={isRaid || isVsFriends}
            />
            <HintPill 
              icon="🌍" 
              label="Country" 
              value={`${target.flag} ${target.country}`} 
              revealed={unlockedHints.country} 
              onClick={() => triggerRewardedAdForHint('country')}
              loading={loadingKey === 'country'}
              isRaid={isRaid || isVsFriends}
            />
            <HintPill 
              icon="🏢" 
              label="Club"   
              value={target.club}   
              revealed={unlockedHints.club}   
              onClick={() => triggerRewardedAdForHint('club')}
              loading={loadingKey === 'club'}
              isRaid={isRaid || isVsFriends}
            />
          </div>

          {/* Legend */}
          <div className="wya-legend-bar">
            <div className="wya-legend-item"><div className="wya-legend-dot green" />Correct</div>
            <div className="wya-legend-item"><div className="wya-legend-dot yellow" />Close</div>
            <div className="wya-legend-item"><div className="wya-legend-dot red" />Wrong</div>
          </div>

          {/* Search */}
          {!gameOver && (
            <div className="wya-search-wrapper">
              <input
                ref={searchRef}
                className="wya-search-input"
                placeholder="⚽ Type a player name…"
                autoComplete="off"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
                onKeyDown={e => e.key === 'Enter' && selected && submitGuess()}
              />
              {dropdown.length > 0 && (
                <div className="wya-dropdown">
                  {dropdown.map(p => (
                    <div
                      key={p.name}
                      className="wya-di"
                      onClick={() => { setSelected(p); setSearch(p.name); setDropdown([]); }}
                    >
                      <span className="wya-di-flag">{p.flag}</span>
                      <div className="wya-di-info">
                        <div className="wya-di-name">{p.name}</div>
                        <div className="wya-di-meta">{p.country} · {p.club}</div>
                      </div>
                      <span className={`wya-role-badge ${roleBadgeClass(p.position)}`}>{p.position}</span>
                    </div>
                  ))}
                  {dropdown.length === 0 && search.length > 1 && (
                    <div className="wya-no-results">No players found</div>
                  )}
                </div>
              )}
              <button className="wya-btn-guess" disabled={!selected} onClick={submitGuess}>
                Guess →
              </button>
            </div>
          )}

          {/* Column Headers */}
          {guesses.length > 0 && (
            <div className="wya-col-headers">
              {['Player', 'Country', 'Pos', 'Club', 'Age', 'Foot'].map(h => (
                <div key={h} className="wya-col-hdr">{h}</div>
              ))}
            </div>
          )}

          {/* Guess Rows */}
          <div className="wya-guesses-wrap">
            {[...guesses].reverse().map((g, rowI) => (
              <div key={`${animKey}-${rowI}`} className="wya-guess-row">
                {g.cells.map((cell, j) => <GuessCell key={j} cell={cell} />)}
              </div>
            ))}
          </div>

          {/* Result Card */}
          {gameOver && (
            <div className="wya-result-card">
              <div className={`wya-result-badge ${won ? 'win' : 'lose'}`}>
                {won ? '🏆 Correct!' : '💔 Game Over'}
              </div>
              <div className="wya-result-title">{won ? 'Well Played!' : 'Better Luck Tomorrow'}</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', margin: '24px 0' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <PlayerPhoto name={target.name} size={90} />
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '-4px', 
                    right: '-4px', 
                    background: '#0a0d1a', 
                    borderRadius: '50%', 
                    width: '36px', 
                    height: '36px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '2px solid #1a1f36',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    padding: '4px'
                  }}>
                    <ClubLogo club={target.club} size={26} />
                  </div>
                </div>
              </div>
              <div className="wya-result-player">{target.flag} {target.name}</div>
              <div className="wya-result-phrase">
                {target.country} · {target.position} · {target.club} · Age {target.age} · {target.foot}-footed
              </div>

              {!(isRaid || isVsFriends) && xpAwarded != null && (
                <div className="pn-xp-badge">
                  {xpAwarded > 0 ? `+${xpAwarded} XP earned` : 'Daily XP limit reached'}
                </div>
              )}

              <div className="wya-result-breakdown">
                <div className="wya-rb-item">
                  <div className="wya-rb-label">Attempts</div>
                  <div className={`wya-rb-val${won ? ' green' : ''}`}>{won ? attempts : 'X'}</div>
                </div>
                <div className="wya-rb-item">
                  <div className="wya-rb-label">Result</div>
                  <div className="wya-rb-val">{won ? 'Guessed ✓' : 'Missed'}</div>
                </div>
                <div className="wya-rb-item">
                  <div className="wya-rb-label">Score</div>
                  <div className="wya-rb-val">{score}</div>
                </div>
              </div>
              <div className="wya-result-actions">
                {isRaid ? (
                  <button 
                    className="wya-btn primary" 
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
                  <button className="wya-btn primary" onClick={() => navigate('/')} style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), #ffd700)', color: '#060810' }}>← Back to Home</button>
                )}
              </div>
            </div>
          )}

          {/* Dashboard */}
          <div className="wya-bottom-section">
            <div className="wya-section-divider">
              <span className="wya-section-label">Your Progress</span>
              <div className="wya-section-line" />
            </div>
            <div className="wya-dashboard-grid">
              {/* Streak Card */}
              <div className="wya-dash-card">
                <div className="wya-dash-card-hdr">
                  <span className="wya-dash-icon">📅</span>
                  <span className="wya-dash-label">Last 30 Days</span>
                </div>
                <StreakDots history={history} puzzleDate={puzzleDate} gameOver={gameOver} won={won} xpAwarded={xpAwarded} attempts={guesses.length} />
                <div className="wya-streak-legend">
                  <span><span className="wya-dot-sample win" />Guessed</span>
                  <span><span className="wya-dot-sample miss" />Missed</span>
                  <span><span className="wya-dot-sample today" />Today</span>
                </div>
              </div>
              {/* Stats Card */}
              <div className="wya-dash-card">
                <div className="wya-dash-card-hdr">
                  <span className="wya-dash-icon">📊</span>
                  <span className="wya-dash-label">Your Stats</span>
                </div>
                <div className="wya-stats-grid">
                  <div className="wya-stat-item"><div className="wya-stat-value">{stats.played || '—'}</div><div className="wya-stat-name">Played</div></div>
                  <div className="wya-stat-item"><div className="wya-stat-value">{stats.won || '—'}</div><div className="wya-stat-name">Won</div></div>
                  <div className="wya-stat-item"><div className="wya-stat-value">{stats.avgPts || '—'}</div><div className="wya-stat-name">Avg Pts</div></div>
                  <div className="wya-stat-item"><div className="wya-stat-value">{stats.streak || '—'}</div><div className="wya-stat-name">Streak</div></div>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function HintPill({ icon, label, value, revealed, onClick, loading, isRaid }) {
  const showClickable = !revealed && !loading && !(isRaid || isVsFriends);
  return (
    <div 
      className={`wya-hint-pill${revealed ? ' revealed' : (showClickable ? ' locked clickable' : ' locked')}`}
      onClick={showClickable ? onClick : undefined}
    >
      <span className="hp-icon">{icon}</span>
      <span className="hp-label">{label}</span>
      <span className="hp-val">
        {revealed ? value : (loading ? 'Loading...' : (isRaid ? 'Locked' : 'Tap to unlock 📺'))}
      </span>
    </div>
  );
}



function GuessCell({ cell }) {
  const { cls, type, name, flag, val, arrow } = cell;
  return (
    <div className={`wya-cell ${cls}`}>
      {cls === 'correct' && <span className="wya-cell-tick">✓</span>}
      {type === 'name' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', width: '100%' }}>
          <PlayerPhoto name={name} size={28} />
          <div className="wya-cell-name" style={{ fontSize: '0.62rem', textAlign: 'center', lineHeight: '1.1', wordBreak: 'break-word' }}>{name}</div>
        </div>
      ) : type === 'club' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', width: '100%' }}>
          <ClubLogo club={val} size={28} />
          <span style={{ fontSize: '0.58rem', opacity: 0.8, textAlign: 'center', lineHeight: '1.1', wordBreak: 'break-word' }}>{val}</span>
        </div>
      ) : type === 'country' ? (
        <div className="wya-cell-flag-wrap" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <span className="wya-cell-flag">{flag}</span>
          <span className="wya-cell-ctry">{val}</span>
        </div>
      ) : (
        <>
          <span>{val}</span>
          {arrow && <span className="arrow">{arrow}</span>}
        </>
      )}
    </div>
  );
}

function StreakDots({ history, puzzleDate, gameOver, won, xpAwarded, attempts }) {
  const today = new Date();
  const dots = [];
  
  for (let i = 29; i >= 0; i--) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,"0")}-${String(checkDate.getDate()).padStart(2,"0")}`;
    const isToday = checkKey === puzzleDate;

    let cls = 'miss';
    let xp = 0;
    if (isToday) {
      if (gameOver) {
        const entry = history[checkKey];
        if (entry) {
          cls = entry.won ? 'win' : 'miss';
          xp = entry.score || 0;
        } else {
          cls = won ? 'win' : 'miss';
          xp = xpAwarded !== null ? xpAwarded : (won ? (attempts ? (SCORES[attempts - 1] || 25) : 25) : 0);
        }
      } else {
        cls = 'today-pending';
        xp = null;
      }
    } else {
      const entry = history[checkKey];
      if (entry) {
        cls = entry.won ? 'win' : 'miss';
        xp = entry.score || 0;
      } else {
        cls = 'miss';
        xp = 0;
      }
    }
    dots.push({ cls, xp });
  }

  // Slice to last 30 entries
  const last30Dots = dots.slice(-30);

  return (
    <div className="wya-streak-dots">
      {last30Dots.map((dot, i) => (
        <div key={i} className={`wya-streak-dot ${dot.cls}`}>
          {dot.xp !== null ? dot.xp : ""}
        </div>
      ))}
    </div>
  );
}

function HowToPlayModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className={`wya-modal-overlay${show ? ' active' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wya-modal-box">
        <h2 className="wya-modal-title">⚽ How to Play</h2>
        <ul className="wya-rules-list">
          <li><strong>🎯 Goal:</strong> Identify the mystery footballer in 8 guesses</li>
          <li><strong>🟢 Green:</strong> Exact match for that attribute</li>
          <li><strong>🟡 Yellow:</strong> Close! Same continent/region, or within 3 years of age</li>
          <li><strong>🔴 Red:</strong> Wrong — not a match at all</li>
          <li><strong>↑ / ↓ Arrows:</strong> The real answer's age is higher or lower</li>
          <li><strong>🏳️ Flags:</strong> Each guess shows the player's country flag</li>
          <li><strong>📺 Hint ads:</strong> Tap on a hint pill to watch a rewarded ad to unlock it</li>
        </ul>
        <div className="wya-modal-attrs">
          <div className="wya-modal-attrs-title">📊 Attributes Revealed</div>
          <div className="wya-modal-attrs-grid">
            <div>🏳️ Country + Flag</div><div>🎭 Position</div>
            <div>🎂 Age</div><div>🏢 Club & Foot</div>
          </div>
        </div>
        <button className="wya-modal-close" onClick={onClose}>🚀 Let's Play!</button>
      </div>
    </div>
  );
}