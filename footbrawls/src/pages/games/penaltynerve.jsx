/**
 * PenaltyNerve.jsx — Penalty Shootout for Footbrawls
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { awardXP } from '../../lib/xpEngine';
import { getUser } from '../../lib/user';

const HISTORY_KEY = 'footbrawls_penaltynerve_history';
const STATS_KEY   = 'footbrawls_penaltynerve_stats';
const MAX_KICKS   = 5;
const XP_PER_GOAL = 5;

const GK_PATTERNS = [
  [0.40, 0.30, 0.40, 0.20, 0.15, 0.20],
  [0.45, 0.35, 0.45, 0.25, 0.20, 0.25],
  [0.50, 0.40, 0.50, 0.30, 0.25, 0.30],
  [0.55, 0.45, 0.55, 0.35, 0.30, 0.35],
  [0.60, 0.50, 0.60, 0.40, 0.35, 0.40],
];

const CORNERS = [
  { id: 'topLeft',      label: 'Top Left',      symbol: '↖', row: 0, col: 0 },
  { id: 'topCenter',    label: 'Top Center',    symbol: '↑', row: 0, col: 1 },
  { id: 'topRight',     label: 'Top Right',     symbol: '↗', row: 0, col: 2 },
  { id: 'bottomLeft',   label: 'Bottom Left',   symbol: '↙', row: 1, col: 0 },
  { id: 'bottomCenter', label: 'Bottom Center', symbol: '↓', row: 1, col: 1 },
  { id: 'bottomRight',  label: 'Bottom Right',  symbol: '↘', row: 1, col: 2 },
];

const GK_DIVES = {
  topLeft:      'dives left high',
  topCenter:    'jumps up center',
  topRight:     'dives right high',
  bottomLeft:   'dives left low',
  bottomCenter: 'drops down center',
  bottomRight:  'dives right low',
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,900&display=swap');

.pn-wrapper {
  --bg: #05070f;
  --surface: rgba(255,255,255,0.038);
  --surface2: rgba(255,255,255,0.065);
  --border: rgba(255,255,255,0.08);
  --border2: rgba(255,255,255,0.13);
  --accent: #F7C344;
  --accent2: #E84040;
  --accent3: #E84040;
  --green: #3DD68C;
  --orange: #ffa400;
  --text: #F0F0F0;
  --muted: rgba(240,240,240,0.45);
  --muted2: rgba(240,240,240,0.25);
  --card-radius: 16px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

.pn-bg2 { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.pn-bg2::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 8% -5%,  rgba(232,64,64,0.1)  0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 95% 105%, rgba(247,195,68,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 50%,  rgba(168,85,247,0.04) 0%, transparent 65%);
}
.pn-bg2::after {
  content: ''; position: absolute; inset: 0;
  background-image: repeating-linear-gradient(-45deg, transparent, transparent 48px, rgba(255,255,255,0.008) 48px, rgba(255,255,255,0.008) 49px);
}
.pn-noise {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

.pn-nav {
  position: sticky; top: 0; z-index: 200;
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  padding: 0 32px; height: 62px;
  background: rgba(5,7,15,0.82); backdrop-filter: blur(24px) saturate(1.4);
  border-bottom: 1px solid rgba(232,64,64,0.15);
  box-shadow: 0 4px 20px rgba(232,64,64,0.15);
}
.pn-logo {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 3px;
  background: linear-gradient(100deg, var(--accent3) 0%, #ff9e9e 50%, var(--accent3) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  text-decoration: none; white-space: nowrap;
  animation: pnLogoShimmer 4s linear infinite;
  border: none; background: none; cursor: pointer; outline: none; padding: 0; justify-self: start;
}
@keyframes pnLogoShimmer { from{background-position:0% center} to{background-position:200% center} }
.pn-nav-tag {
  display: flex; align-items: center; gap: 7px;
  font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;
  color: var(--accent3); background: rgba(232,64,64,0.1);
  border: 1px solid rgba(232,64,64,0.28); padding: 5px 14px; border-radius: 100px;
}
.pn-tag-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent3); animation: pnBlink 1.5s ease infinite; }
@keyframes pnBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.pn-nav-right { display: flex; align-items: center; justify-content: flex-end; }
.pn-help-wrap { position: relative; display: flex; align-items: center; }
.pn-help-btn {
  background: var(--surface); border: 1px solid var(--border2); color: #fff;
  padding: 8px 14px; border-radius: 10px; font-size: .8rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
}
.pn-help-btn:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); }
.pn-help-tooltip {
  position: absolute; right: calc(100% + 10px); top: 50%;
  transform: translateY(-50%) translateX(4px);
  background: rgba(10,14,30,0.96); border: 1px solid rgba(232,64,64,0.25);
  color: var(--accent3); font-family: 'DM Sans', sans-serif;
  font-size: 0.72rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  padding: 5px 12px; border-radius: 8px; white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity 0.15s, transform 0.15s;
}
.pn-help-tooltip::after {
  content: ''; position: absolute; left: 100%; top: 50%; transform: translateY(-50%);
  border: 5px solid transparent; border-left-color: rgba(232,64,64,0.25);
}
.pn-help-wrap:hover .pn-help-tooltip { opacity: 1; transform: translateY(-50%) translateX(0); }

.pn-page2 {
  position: relative; z-index: 1; max-width: 680px; margin: 0 auto;
  padding: 36px 36px 80px; font-family: 'DM Sans', sans-serif;
}

.pn-score-box {
  background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid var(--accent); border-radius: 18px;
  padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; position: relative; overflow: hidden;
  animation: pnFadeUp 0.5s ease 0.08s both;
}
.pn-score-box::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(247,195,68,0.06), transparent 60%); pointer-events: none;
}
.pn-score-label { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 3px; }
.pn-score-value {
  font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--accent), #ffd700);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.pn-score-streak { font-size: 0.82rem; color: var(--muted); text-align: right; position: relative; z-index: 1; }

.pn-msg { border-radius: var(--card-radius); padding: 13px 20px; font-size: 0.88rem; font-weight: 700; text-align: center; margin-bottom: 18px; animation: pnFadeUp 0.3s ease; border: 1px solid; }
.pn-msg-error   { background: rgba(232,64,64,0.1);  color: #ff8080;        border-color: rgba(232,64,64,0.35); }
.pn-msg-success { background: rgba(61,214,140,0.1);  color: var(--green);   border-color: rgba(61,214,140,0.35); }
.pn-msg-info    { background: rgba(232,64,64,0.1);  color: var(--accent3); border-color: rgba(232,64,64,0.35); }

.pn-game-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--card-radius); padding: 32px 24px;
  margin-bottom: 20px; animation: pnFadeUp 0.5s ease 0.12s both;
  position: relative; overflow: hidden;
}
.pn-game-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(232,64,64,0.04), transparent 60%); pointer-events: none;
}

.pn-progress-row { display: flex; gap: 8px; justify-content: flex-start; margin-bottom: 24px; position: relative; z-index: 1; }
.pn-progress-dot {
  flex: 1; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  transition: all 0.3s ease; position: relative;
}
.pn-progress-dot.dot-current { background: rgba(255,255,255,0.08); border-color: var(--accent); box-shadow: 0 0 8px rgba(247,195,68,0.3); }
.pn-progress-dot.dot-win { background: rgba(61,214,140,0.15); border-color: var(--green); box-shadow: 0 0 10px rgba(61,214,140,0.2); }
.pn-progress-dot.dot-fail { background: rgba(232,64,64,0.15); border-color: var(--accent2); box-shadow: 0 0 10px rgba(232,64,64,0.25); }
.pn-dot-text { font-family: 'DM Sans', sans-serif; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px; }
.pn-progress-dot.dot-win .pn-dot-text  { color: var(--green); }
.pn-progress-dot.dot-fail .pn-dot-text { color: var(--accent2); }
.pn-progress-dot.dot-current .pn-dot-text { color: var(--accent); }

.pn-goal-frame {
  position: relative; width: 100%; aspect-ratio: 2/1;
  background: rgba(255,255,255,0.01);
  border: 3px solid rgba(255,255,255,0.15);
  border-bottom: 2px solid rgba(255,255,255,0.3);
  border-radius: 10px; margin-bottom: 24px; overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  background-image: linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
  background-size: 16px 16px; z-index: 1;
}
.pn-crossbar   { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #FFF; opacity: 0.8; z-index: 2; box-shadow: 0 2px 6px rgba(255,255,255,0.2); }
.pn-post-left  { position: absolute; top: 0; left: 0; bottom: 0; width: 4px; background: #FFF; opacity: 0.8; z-index: 2; box-shadow: 2px 0 6px rgba(255,255,255,0.2); }
.pn-post-right { position: absolute; top: 0; right: 0; bottom: 0; width: 4px; background: #FFF; opacity: 0.8; z-index: 2; box-shadow: -2px 0 6px rgba(255,255,255,0.2); }

.pn-goal-grid-net {
  position: absolute; inset: 4px; display: grid;
  grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px;
}
.pn-goal-zone {
  border-radius: 6px; display: flex; align-items: center; justify-content: center;
  transition: all 0.25s ease; position: relative;
  background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.06);
}
.pn-goal-zone.zone-aimed { background: rgba(232,64,64,0.1); border: 1px solid rgba(232,64,64,0.4); box-shadow: inset 0 0 15px rgba(232,64,64,0.2); }
.pn-goal-zone.zone-gk-dived { background: rgba(255,164,0,0.12); border: 1px solid rgba(255,164,0,0.45); box-shadow: inset 0 0 15px rgba(255,164,0,0.25); }
.pn-goal-zone.zone-ball-scored { background: rgba(61,214,140,0.18); border: 1px solid rgba(61,214,140,0.5); box-shadow: inset 0 0 20px rgba(61,214,140,0.3); }
.pn-goal-zone:hover { border-color: rgba(255,255,255,0.2); }
.pn-gk-dive-badge { background: var(--accent2); color: #FFF; font-family: 'DM Sans', sans-serif; font-size: 0.65rem; font-weight: 900; padding: 4px 8px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); letter-spacing: 0.5px; }
.pn-ball-goal-badge { background: var(--green); color: #060810; font-family: 'DM Sans', sans-serif; font-size: 0.65rem; font-weight: 900; padding: 4px 8px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); letter-spacing: 0.5px; }

/* ── GOALKEEPER — taller figure (52x88) ── */
.pn-goalkeeper {
  position: absolute;
  bottom: 2px;
  left: 50%;
  width: 52px;
  height: 88px;
  margin-left: -26px;
  z-index: 4;
  pointer-events: none;
  transform-origin: 50% 95%;
  will-change: transform;
  overflow: visible;
}
.pn-gk-svg { display: block; width: 52px; height: 88px; overflow: visible; }

.pn-gk-shadow { fill: rgba(0,0,0,0.4); }
.pn-gk-jersey  { fill: #E84040; stroke: #7a1f1f; stroke-width: 1.5; }
.pn-gk-shorts  { fill: #1a2236; stroke: rgba(255,255,255,0.15); stroke-width: 1; }
.pn-gk-skin    { fill: #e3a874; }
.pn-gk-hair    { fill: #2b1c12; }
.pn-gk-glove   { fill: #F7C344; stroke: #b9870e; stroke-width: 1; }
.pn-gk-boot    { fill: #16181f; }
.pn-gk-number  { fill: #ffffff; font-size: 7px; font-weight: 900; font-family: 'DM Sans', sans-serif; text-anchor: middle; }
.pn-gk-arm, .pn-gk-leg { transform-box: fill-box; transform-origin: center; }

/* ── IDLE sway ── */
.pn-goalkeeper.pn-gk-idle { animation: pnGkSway 2.4s ease-in-out infinite; }
@keyframes pnGkSway {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
.pn-goalkeeper.pn-gk-idle .pn-gk-arm-left  { transform: rotate(8deg); transition: transform 0.4s ease; }
.pn-goalkeeper.pn-gk-idle .pn-gk-arm-right { transform: rotate(-8deg); transition: transform 0.4s ease; }

/* ── DIVING — 4-stop physics: stance → weight-load → mid-flight → full extension
   translate3d keeps animation on the GPU compositor (no layout jank mid-frame) ── */
.pn-goalkeeper.pn-gk-diving { animation: none; }

.pn-goalkeeper.pn-gk-diving.dive-topLeft {
  animation: gkDiveTopLeft 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes gkDiveTopLeft {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  15%  { transform: translate3d(6px, 4px, 0) rotate(4deg); }
  40%  { transform: translate3d(-28px, -10px, 0) rotate(-28deg); }
  100% { transform: translate3d(-80px, -30px, 0) rotate(-58deg); }
}

.pn-goalkeeper.pn-gk-diving.dive-topCenter {
  animation: gkDiveTopCenter 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes gkDiveTopCenter {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  15%  { transform: translate3d(0, 5px, 0) scale(0.97); }
  40%  { transform: translate3d(0, -14px, 0) scale(1.02); }
  100% { transform: translate3d(0, -38px, 0) scale(1.06); }
}

.pn-goalkeeper.pn-gk-diving.dive-topRight {
  animation: gkDiveTopRight 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes gkDiveTopRight {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  15%  { transform: translate3d(-6px, 4px, 0) rotate(-4deg); }
  40%  { transform: translate3d(28px, -10px, 0) rotate(28deg); }
  100% { transform: translate3d(80px, -30px, 0) rotate(58deg); }
}

.pn-goalkeeper.pn-gk-diving.dive-bottomLeft {
  animation: gkDiveBottomLeft 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes gkDiveBottomLeft {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  12%  { transform: translate3d(4px, -4px, 0) rotate(3deg); }
  40%  { transform: translate3d(-32px, 0px, 0) rotate(-38deg); }
  100% { transform: translate3d(-80px, 6px, 0) rotate(-72deg); }
}

.pn-goalkeeper.pn-gk-diving.dive-bottomCenter {
  animation: gkDiveBottomCenter 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes gkDiveBottomCenter {
  0%   { transform: translate3d(0, 0, 0) scaleY(1); }
  12%  { transform: translate3d(0, -5px, 0) scaleY(1.04); }
  40%  { transform: translate3d(0, 2px, 0) scaleY(0.96); }
  100% { transform: translate3d(0, 8px, 0) scaleY(0.88); }
}

.pn-goalkeeper.pn-gk-diving.dive-bottomRight {
  animation: gkDiveBottomRight 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes gkDiveBottomRight {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  12%  { transform: translate3d(-4px, -4px, 0) rotate(-3deg); }
  40%  { transform: translate3d(32px, 0px, 0) rotate(38deg); }
  100% { transform: translate3d(80px, 6px, 0) rotate(72deg); }
}

/* ── ARM / LEG physics during dive ── */
.pn-goalkeeper.pn-gk-diving .pn-gk-arm-left {
  animation: gkArmReachLeft 0.58s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.pn-goalkeeper.pn-gk-diving .pn-gk-arm-right {
  animation: gkArmReachRight 0.58s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.pn-goalkeeper.pn-gk-diving .pn-gk-leg-left {
  animation: gkLegSplitLeft 0.52s ease-out forwards;
}
.pn-goalkeeper.pn-gk-diving .pn-gk-leg-right {
  animation: gkLegSplitRight 0.52s ease-out forwards;
}
@keyframes gkArmReachLeft {
  0%   { transform: rotate(8deg) translateY(0); }
  15%  { transform: rotate(3deg) translateY(1px); }
  40%  { transform: rotate(-30deg) translateY(-5px); }
  100% { transform: rotate(-65deg) translateY(-12px); }
}
@keyframes gkArmReachRight {
  0%   { transform: rotate(-8deg) translateY(0); }
  15%  { transform: rotate(-3deg) translateY(1px); }
  40%  { transform: rotate(-30deg) translateY(-5px); }
  100% { transform: rotate(-65deg) translateY(-12px); }
}
@keyframes gkLegSplitLeft {
  0%   { transform: rotate(0deg); }
  40%  { transform: rotate(12deg); }
  100% { transform: rotate(24deg); }
}
@keyframes gkLegSplitRight {
  0%   { transform: rotate(0deg); }
  40%  { transform: rotate(-12deg); }
  100% { transform: rotate(-24deg); }
}

/* ── RESPONSIVE ── */
@media (max-width: 480px) {
  .pn-goalkeeper { width: 40px; height: 68px; margin-left: -20px; }
  .pn-gk-svg { width: 40px; height: 68px; }

  .pn-goalkeeper.pn-gk-diving.dive-topLeft    { animation: gkDiveTopLeftSm    0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .pn-goalkeeper.pn-gk-diving.dive-topCenter  { animation: gkDiveTopCenterSm  0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .pn-goalkeeper.pn-gk-diving.dive-topRight   { animation: gkDiveTopRightSm   0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .pn-goalkeeper.pn-gk-diving.dive-bottomLeft  { animation: gkDiveBottomLeftSm  0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .pn-goalkeeper.pn-gk-diving.dive-bottomCenter{ animation: gkDiveBottomCenterSm 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .pn-goalkeeper.pn-gk-diving.dive-bottomRight { animation: gkDiveBottomRightSm  0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

  @keyframes gkDiveTopLeftSm {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
    15%  { transform: translate3d(4px, 3px, 0) rotate(4deg); }
    40%  { transform: translate3d(-20px, -8px, 0) rotate(-28deg); }
    100% { transform: translate3d(-58px, -22px, 0) rotate(-58deg); }
  }
  @keyframes gkDiveTopCenterSm {
    0%   { transform: translate3d(0, 0, 0) scale(1); }
    15%  { transform: translate3d(0, 4px, 0) scale(0.97); }
    40%  { transform: translate3d(0, -10px, 0) scale(1.02); }
    100% { transform: translate3d(0, -28px, 0) scale(1.05); }
  }
  @keyframes gkDiveTopRightSm {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
    15%  { transform: translate3d(-4px, 3px, 0) rotate(-4deg); }
    40%  { transform: translate3d(20px, -8px, 0) rotate(28deg); }
    100% { transform: translate3d(58px, -22px, 0) rotate(58deg); }
  }
  @keyframes gkDiveBottomLeftSm {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
    12%  { transform: translate3d(3px, -3px, 0) rotate(3deg); }
    40%  { transform: translate3d(-24px, 0px, 0) rotate(-38deg); }
    100% { transform: translate3d(-58px, 4px, 0) rotate(-72deg); }
  }
  @keyframes gkDiveBottomCenterSm {
    0%   { transform: translate3d(0, 0, 0) scaleY(1); }
    12%  { transform: translate3d(0, -4px, 0) scaleY(1.03); }
    40%  { transform: translate3d(0, 2px, 0) scaleY(0.96); }
    100% { transform: translate3d(0, 6px, 0) scaleY(0.88); }
  }
  @keyframes gkDiveBottomRightSm {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
    12%  { transform: translate3d(-3px, -3px, 0) rotate(-3deg); }
    40%  { transform: translate3d(24px, 0px, 0) rotate(38deg); }
    100% { transform: translate3d(58px, 4px, 0) rotate(72deg); }
  }
}

.pn-aim-section { display: flex; flex-direction: column; gap: 16px; position: relative; z-index: 1; }
.pn-instruction { text-align: left; color: var(--muted); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px 0; }
.pn-corner-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.pn-corner-btn { padding: 14px 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: 14px; cursor: pointer; transition: all 0.2s; background: var(--surface); color: var(--muted); font-family: 'DM Sans', sans-serif; }
.pn-corner-btn:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
.pn-corner-btn.active { border-color: var(--accent3); background: rgba(232,64,64,0.08); color: var(--accent3); }
.pn-corner-symbol { font-size: 1.3rem; font-weight: 800; }
.pn-corner-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
.pn-kick-btn { background: var(--accent3); color: #fff; padding: 13px 28px; width: 100%; border-radius: 12px; border: none; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: all 0.22s ease; box-shadow: 0 4px 16px rgba(232,64,64,0.28); }
.pn-kick-btn:hover:not(:disabled) { background: #f25c5c; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,64,64,0.42); }
.pn-kick-btn:disabled { background: var(--surface2); color: var(--muted); box-shadow: none; cursor: not-allowed; transform: none; }
.pn-attempt-counter { text-align: left; font-size: 0.73rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; position: relative; z-index: 1; }

.pn-feedback-banner { padding: 14px 16px; border-radius: 12px; font-size: 0.88rem; font-weight: 800; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid; position: relative; z-index: 1; }
.banner-saved { background: rgba(232,64,64,0.08); border-color: rgba(232,64,64,0.25); color: var(--accent2); }
.banner-goal  { background: rgba(61,214,140,0.08); border-color: rgba(61,214,140,0.35); color: var(--green); }

.pn-controls { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-start; margin-bottom: 20px; animation: pnFadeUp 0.5s ease 0.18s both; }
.pn-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.22s ease; text-transform: uppercase; letter-spacing: 0.5px; }
.pn-btn-back { background: var(--surface); color: var(--muted); border: 1px solid var(--border); }
.pn-btn-back:hover { color: var(--text); border-color: var(--border2); transform: translateY(-2px); }

.pn-result { background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 48px 40px; text-align: center; margin-bottom: 20px; animation: pnFadeUp 0.5s ease; position: relative; overflow: hidden; }
.pn-result::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--accent3), var(--accent), var(--accent2)); border-radius: 22px 22px 0 0; }
.pn-result-badge { display: inline-flex; align-items: center; gap: 7px; background: rgba(232,64,64,0.1); border: 1px solid rgba(232,64,64,0.3); color: var(--accent3); font-size: 0.7rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 5px 14px; border-radius: 100px; margin-bottom: 14px; }
.pn-result-title { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; letter-spacing: 2px; margin-bottom: 6px; }
.pn-result-score { font-family: 'Bebas Neue', sans-serif; font-size: 5.5rem; letter-spacing: 2px; background: linear-gradient(135deg, var(--accent3), #ffb3b3 60%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; margin: 12px 0; filter: drop-shadow(0 0 22px rgba(232,64,64,0.4)); animation: pnScorePulse 2.5s ease-in-out infinite; }
@keyframes pnScorePulse { 0%,100%{filter:drop-shadow(0 0 20px rgba(232,64,64,0.4))} 50%{filter:drop-shadow(0 0 44px rgba(232,64,64,0.75))} }
.pn-result-phrase { color: var(--muted); font-size: 1rem; margin-bottom: 28px; line-height: 1.6; }
.pn-result-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

.pn-kick-replay-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; text-align: left; }
.pn-replay-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; border: 1px solid; }
.pn-replay-row.replay-saved { background: rgba(232,64,64,0.03); border-color: rgba(232,64,64,0.15); }
.pn-replay-row.replay-goal  { background: rgba(61,214,140,0.03); border-color: rgba(61,214,140,0.15); }
.pn-replay-status-badge { font-family: 'DM Sans', sans-serif; font-size: 0.62rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; }
.replay-saved .pn-replay-status-badge { background: var(--accent2); color: #FFF; }
.replay-goal .pn-replay-status-badge  { background: var(--green); color: #060810; }
.pn-replay-details { font-size: 0.78rem; color: rgba(242,242,244,0.6); }

.pn-xp-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(247,195,68,0.12); border: 1px solid rgba(247,195,68,0.3); border-radius: 99px; padding: 4px 14px; font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 20px; }

.pn-ad-box { margin: 20px 0; padding: 16px; background: rgba(232,64,64,0.08); border: 1px solid rgba(232,64,64,0.2); border-radius: 12px; }
.pn-ad-box p { font-size: 0.85rem; color: var(--muted); margin-bottom: 12px; }
.pn-ad-go-btn { background: var(--accent3); color: #fff; width: 100%; justify-content: center; box-shadow: 0 4px 16px rgba(232,64,64,0.28); padding: 12px; display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; transition: all 0.22s ease; }
.pn-ad-go-btn:hover:not(:disabled) { background: #f25c5c; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,64,64,0.42); }
.pn-ad-go-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.pn-modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.82); backdrop-filter: blur(14px); display: flex; justify-content: center; align-items: center; padding: 20px; animation: pnFadeIn 0.22s ease; }
@keyframes pnFadeIn { from{opacity:0} to{opacity:1} }
.pn-modal-box { background: #0c1020; border: 1px solid rgba(232,64,64,0.18); border-radius: 24px; padding: 44px 36px; max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto; position: relative; animation: pnModalUp 0.32s cubic-bezier(0.4,0,0.2,1); }
.pn-modal-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--accent3), var(--accent), var(--accent2)); border-radius: 24px 24px 0 0; }
.pn-modal-box::-webkit-scrollbar { width: 5px; }
.pn-modal-box::-webkit-scrollbar-thumb { background: rgba(232,64,64,0.3); border-radius: 5px; }
@keyframes pnModalUp { from{opacity:0;transform:translateY(28px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
.pn-modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 2.3rem; letter-spacing: 2px; text-align: center; margin-bottom: 26px; }
.pn-rules-list { list-style: none; margin-bottom: 22px; display: flex; flex-direction: column; gap: 9px; }
.pn-rules-list li { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid rgba(232,64,64,0.45); border-radius: 12px; padding: 13px 16px; font-size: 0.9rem; line-height: 1.6; transition: border-color 0.2s, transform 0.2s; }
.pn-rules-list li:hover { border-left-color: var(--accent3); transform: translateX(4px); }
.pn-rule-icon { margin-right: 8px; }
.pn-scoring-box { background: rgba(247,195,68,0.05); border: 1px solid rgba(247,195,68,0.18); border-radius: 14px; padding: 18px; margin-bottom: 22px; }
.pn-scoring-box h3 { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 1px; color: var(--accent); margin-bottom: 12px; text-align: center; }
.pn-scoring-item { display: flex; justify-content: space-between; padding: 7px 0; font-size: 0.86rem; border-bottom: 1px solid var(--border); }
.pn-scoring-item:last-child { border-bottom: none; }
.pn-scoring-val { color: var(--accent); font-weight: 700; }
.pn-modal-btn { background: var(--accent3); color: #fff; font-weight: 800; width: 100%; justify-content: center; padding: 14px; font-size: 0.92rem; border-radius: 12px; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; text-transform: uppercase; letter-spacing: 1px; transition: all 0.22s ease; display: flex; align-items: center; }
.pn-modal-btn:hover { background: #f25c5c; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,64,64,0.3); }

.pn-bottom-section { margin-top: 44px; animation: pnFadeUp 0.6s ease 0.3s both; }
.pn-section-div { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.pn-section-label { font-size: 0.68rem; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
.pn-section-line { flex: 1; height: 1px; background: var(--border2); }
.pn-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.pn-dash-card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 22px 24px; position: relative; overflow: hidden; }
.pn-dash-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(232,64,64,0.03), transparent 60%); pointer-events: none; }
.pn-dash-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.pn-dash-icon { font-size: 1.1rem; }
.pn-dash-lbl { font-family: 'Bebas Neue', sans-serif; font-size: 1.05rem; letter-spacing: 2px; color: var(--accent3); }

.pn-streak-dots { display: grid; grid-template-columns: repeat(10, 1fr); grid-template-rows: repeat(3, 42px); gap: 3px; margin-bottom: 12px; }
.pn-sdot { width: 100%; height: 42px; border-radius: 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; transition: transform 0.15s; cursor: default; }
.pn-sdot:hover { transform: translateY(-2px); }
.pn-sdot.win           { background: rgba(61,214,140,0.13);  border: 1px solid rgba(61,214,140,0.38); }
.pn-sdot.miss          { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
.pn-sdot.today-played  { background: rgba(232,64,64,0.14);   border: 2px solid var(--accent3); box-shadow: 0 0 8px rgba(232,64,64,0.2); }
.pn-sdot.today-pending { background: rgba(247,195,68,0.08);  border: 2px dashed rgba(247,195,68,0.35); }
.pn-sdot-score { font-size: 0.65rem; font-weight: 800; line-height: 1; color: var(--green); }
.pn-sdot.today-played .pn-sdot-score { color: var(--accent3); }
.pn-streak-legend { display: flex; gap: 13px; font-size: 0.7rem; color: var(--muted); align-items: center; flex-wrap: wrap; }
.pn-dot-sample { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 4px; vertical-align: middle; }
.pn-ds-win  { background: rgba(61,214,140,0.5);  border: 1px solid var(--green); }
.pn-ds-miss { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
.pn-ds-today{ background: rgba(232,64,64,0.4);   border: 1px solid var(--accent3); }

.pn-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pn-stat-item { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 14px 12px; text-align: center; transition: border-color 0.2s, background 0.2s; }
.pn-stat-item:hover { border-color: rgba(232,64,64,0.22); background: rgba(232,64,64,0.03); }
.pn-stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 1px; background: linear-gradient(135deg, var(--accent3), #ffb3b3 80%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; margin-bottom: 3px; }
.pn-stat-name { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }

.pn-bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 200; display: flex; background: rgba(5,7,15,0.96); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.07); padding-bottom: env(safe-area-inset-bottom, 0px); }
.pn-nav-item { flex: 1; min-width: 0; border: none; background: transparent; padding: 9px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: color 0.15s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; color: rgba(240,240,240,0.35); position: relative; }
.pn-nav-item.active { color: var(--green); }
.pn-nav-indicator { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 26px; height: 2px; border-radius: 0 0 99px 99px; background: var(--green); box-shadow: 0 0 8px var(--green); }
.pn-nav-icon  { font-size: 20px; line-height: 1; }
.pn-nav-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

@keyframes pnFadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

@media (max-width: 768px) {
  .pn-nav { padding: 0 12px; height: 54px; }
  .pn-logo { font-size: 1.3rem; }
  .pn-nav-tag { font-size: 0.58rem; padding: 4px 9px; gap: 4px; letter-spacing: 1.5px; }
  .pn-tag-dot { width: 5px; height: 5px; }
  .pn-help-btn { width: 30px; height: 30px; font-size: 0.88rem; }
  .pn-page2 { padding: 18px 16px 56px; }
  .pn-dash-grid { grid-template-columns: 1fr; gap: 12px; }
  .pn-result { padding: 28px 20px; }
  .pn-result-title { font-size: 2.2rem; }
  .pn-result-score { font-size: 3.8rem; }
  .pn-result-actions { gap: 8px; }
  .pn-controls .pn-btn { flex: 1; }
  .pn-streak-dots { gap: 3px; }
  .pn-sdot { height: 38px; }
}
@media (max-width: 480px) {
  .pn-page2 { padding: 14px 12px 52px; }
  .pn-result-actions { flex-direction: column; align-items: stretch; }
  .pn-result-actions .pn-btn { width: 100%; }
  .pn-controls { flex-direction: column; align-items: stretch; }
  .pn-controls .pn-btn { width: 100%; }
  .pn-sdot { height: 34px; }
  .pn-sdot-score { font-size: 0.58rem; }
  .pn-corner-grid { gap: 8px; }
}
@media (max-width: 380px) {
  .pn-nav { height: 50px; }
  .pn-logo { font-size: 1.25rem; letter-spacing: 2px; }
  .pn-nav-tag { font-size: 0.55rem; padding: 3px 8px; letter-spacing: 1px; }
  .pn-help-btn { width: 26px; height: 26px; font-size: 0.8rem; }
  .pn-sdot { height: 30px; }
}
`;

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getTodayKey() { return getToday(); }

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

function loadStats()   { try { return JSON.parse(localStorage.getItem(STATS_KEY))   || {}; } catch { return {}; } }
function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; } catch { return {}; } }

function saveResult(today, goals, xp) {
  const history = loadHistory();
  history[today] = { goals, xp };
  const allEntries = Object.values(history);
  const stats = {
    played: allEntries.length,
    best:   Math.max(...allEntries.map(e => e.goals)),
    avg:    Math.round((allEntries.reduce((s, e) => s + e.goals, 0) / allEntries.length) * 10) / 10,
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

const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    console.log("[AdSense H5 Mock] Triggering ad placement:", options.name);
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.type === 'reward') {
        const confirmReward = window.confirm(`[TEST AD] Watch this rewarded ad to get your reward?`);
        if (confirmReward) { if (options.adViewed) options.adViewed(); }
        else               { if (options.adDismissed) options.adDismissed(); }
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

function HowToPlayModal({ onClose }) {
  return (
    <div className="pn-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pn-modal-box">
        <h2 className="pn-modal-title">⚽ How to Play</h2>
        <ul className="pn-rules-list">
          <li><span className="pn-rule-icon">🎯</span>Pick a corner and strike the ball past the keeper</li>
          <li><span className="pn-rule-icon">🧤</span>The keeper gets smarter — save chances rise each kick</li>
          <li><span className="pn-rule-icon">⚽</span>Score {MAX_KICKS} goals in a row for the perfect shootout</li>
          <li><span className="pn-rule-icon">🏆</span>Every goal scored earns XP — keep them coming!</li>
          <li><span className="pn-rule-icon">📺</span>If the keeper saves one, watch an ad to retake the kick</li>
        </ul>
        <div className="pn-scoring-box">
          <h3>💰 Scoring — {XP_PER_GOAL} XP per Goal · Max 25 XP</h3>
          {Array.from({ length: MAX_KICKS }).map((_, i) => (
            <div key={i} className="pn-scoring-item">
              <span>Goal #{i + 1}</span>
              <span className="pn-scoring-val">+{XP_PER_GOAL} XP</span>
            </div>
          ))}
          <div className="pn-scoring-item"><span>Saved</span><span className="pn-scoring-val">0 XP</span></div>
        </div>
        <button className="pn-modal-btn" onClick={onClose}>🚀 Start Playing</button>
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
    let cls = "pn-sdot ";
    if      (isToday && entry) cls += "today-played";
    else if (isToday)          cls += "today-pending";
    else if (entry)            cls += "win";
    else                       cls += "miss";
    const xp = entry ? (entry.xp ?? (entry.goals ? entry.goals * XP_PER_GOAL : 0)) : 0;
    dots.push(
      <div key={key} className={cls} title={entry ? `${key} · ${xp} XP earned` : key}>
        {entry && <span className="pn-sdot-score">{xp}</span>}
      </div>
    );
  }
  return (
    <div>
      <div className="pn-streak-dots">{dots}</div>
      <div className="pn-streak-legend">
        <span><span className="pn-dot-sample pn-ds-win" />Played</span>
        <span><span className="pn-dot-sample pn-ds-miss" />Missed</span>
        <span><span className="pn-dot-sample pn-ds-today" />Today</span>
      </div>
    </div>
  );
}

export default function PenaltyNerve({ onBack }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate('/'));

  const [kicks, setKicks]           = useState([]);
  const [phase, setPhase]           = useState('aiming');
  const [selected, setSelected]     = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [xpAwarded, setXpAwarded]   = useState(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [savedScore, setSavedScore] = useState(0);
  const [savedGoals, setSavedGoals] = useState(0);
  const [animating, setAnimating]   = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [msg, setMsg]               = useState(null);
  const [stats, setStats]           = useState(loadStats);
  const [history, setHistory]       = useState(loadHistory);
  const [gkKey, setGkKey]           = useState(0);

  const scoreRef = useRef(0);
  const [scoreDisplay, setScoreDisplay] = useState(0);

  const [hasWatchedAd, setHasWatchedAd] = useState(false);
  const [isAdLoading, setIsAdLoading]   = useState(false);

  const seed  = getDailySeed();
  const today = getToday();

  function showMsg(text, type = "info", duration = 3000) {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), duration);
  }

  function triggerRewardedAdToRetakeKick() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "penalty-nerve-retake",
      beforeAd: () => setIsAdLoading(true),
      afterAd:  () => setIsAdLoading(false),
      adDismissed: () => showMsg("Ad dismissed. Kick not retaken.", "error"),
      adViewed: () => {
        const newKicks = [...kicks];
        if (newKicks.length > 0 && newKicks[newKicks.length - 1].saved) newKicks.pop();
        setKicks(newKicks);
        setPhase('aiming');
        setLastResult(null);
        setHasWatchedAd(true);
        setGkKey(k => k + 1);
        showMsg("Retake granted! Pick your corner.", "success");
        const newGoals = newKicks.filter(k => !k.saved).length;
        scoreRef.current = newGoals * XP_PER_GOAL;
        setScoreDisplay(scoreRef.current);
        const hist = JSON.parse(localStorage.getItem('footbrawls_penaltynerve') || '{}');
        delete hist[today];
        localStorage.setItem('footbrawls_penaltynerve', JSON.stringify(hist));
      },
      adBreakDone: () => setIsAdLoading(false)
    });
  }

  useEffect(() => {
    const hist = JSON.parse(localStorage.getItem('footbrawls_penaltynerve') || '{}');
    if (hist[today]) {
      setAlreadyPlayed(true);
      setSavedScore(hist[today].xpAwarded ?? hist[today].score ?? 0);
      setSavedGoals(hist[today].goals ?? 0);
      setPhase('gameover');
      setShowModal(false);
    }
  }, []);

  useEffect(() => {
    if (!document.getElementById("pn-css")) {
      const s = document.createElement("style");
      s.id = "pn-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  async function kick() {
    if (!selected || animating || phase !== 'aiming') return;
    setAnimating(true);

    const kickIdx         = kicks.length;
    const pattern         = GK_PATTERNS[Math.min(kickIdx, GK_PATTERNS.length - 1)];
    const cornerIdx       = CORNERS.findIndex(c => c.id === selected);
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

    if (!saved) {
      scoreRef.current = scoreRef.current + XP_PER_GOAL;
      setScoreDisplay(scoreRef.current);
    }

    const result   = { corner: selected, saved, gkDive: gkCorner };
    const newKicks = [...kicks, result];

    setLastResult(result);
    setKicks(newKicks);
    setPhase('result');
    setSelected(null);
    setGkKey(k => k + 1);

    setTimeout(async () => {
      setAnimating(false);

      const isGameOver = saved || newKicks.length >= MAX_KICKS;

      if (isGameOver) {
        setPhase('gameover');

        const finalXP = scoreRef.current;
        const goals   = newKicks.filter(k => !k.saved).length;

        let finalAwarded = 0;
        if (finalXP > 0) {
          try {
            const user = getUser();
            if (!user?.userId) {
              console.warn('[PenaltyNerve] No user found — XP not awarded');
              finalAwarded = finalXP;
            } else {
              const res = await awardXP(user.userId, 'penaltyNerve_all5', { rawXP: finalXP });
              if (res?.cappedOut) finalAwarded = 0;
              else finalAwarded = res?.xpAwarded ?? finalXP;
            }
          } catch (err) {
            console.error('[PenaltyNerve] awardXP failed:', err);
            finalAwarded = finalXP;
          }
        }
        setXpAwarded(finalAwarded);

        const hist = JSON.parse(localStorage.getItem('footbrawls_penaltynerve') || '{}');
        hist[today] = { score: finalXP, goals, xpAwarded: finalAwarded, date: today };
        localStorage.setItem('footbrawls_penaltynerve', JSON.stringify(hist));

        const { stats: s, history: h } = saveResult(today, goals, finalAwarded);
        setStats(s); setHistory(h);
      } else {
        setPhase('aiming');
        setLastResult(null);
        setGkKey(k => k + 1);
      }
    }, 2000);
  }

  const goals        = kicks.filter(k => !k.saved).length;
  const currentKick  = kicks.length + 1;
  const displayGoals = alreadyPlayed ? savedGoals : goals;
  const displayXP    = alreadyPlayed ? savedScore : scoreDisplay;

  const getResultTitle = (g) => {
    if (g === 5) return '🎉 PERFECT SHOOTOUT!';
    if (g >= 3)  return '🔥 GREAT SHOT POWER!';
    if (g >= 1)  return '⚽ DECENT SHOT!';
    return '😞 KEEPER DOMINATED';
  };
  const getResultColor = (g) => {
    if (g === 5) return 'var(--accent)';
    if (g >= 3)  return 'var(--accent3)';
    if (g >= 1)  return 'var(--green)';
    return 'var(--muted)';
  };

  const gkPhaseClass = (phase === 'result' && lastResult) ? 'pn-gk-diving' : 'pn-gk-idle';
  const gkDiveClass  = (phase === 'result' && lastResult) ? `dive-${lastResult.gkDive}` : '';

  return (
    <div className="pn-wrapper" style={{ background: "var(--bg,#05070f)", minHeight: "100vh", color: "var(--text,#F0F0F0)", fontFamily: "'DM Sans',sans-serif" }}>
      <div className="pn-bg2" />
      <div className="pn-noise" />

      {showModal && <HowToPlayModal onClose={() => setShowModal(false)} />}

      <nav className="pn-nav">
        <button className="pn-logo" onClick={() => navigate('/')}>←</button>
        <div className="pn-nav-tag">
          <span className="pn-tag-dot" />
          Penalty Nerve
        </div>
        <div className="pn-nav-right">
          <button className="pn-help-btn" onClick={() => setShowModal(true)}>❓ Help</button>
        </div>
      </nav>

      <div className="pn-page2">

        <div style={{ marginBottom: 24, animation: "pnFadeUp 0.5s ease both" }}>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2.2rem,5vw,3.2rem)", letterSpacing: 2, lineHeight: 1, marginBottom: 5, color: "var(--accent3)" }}>
            Penalty Nerve
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Score {MAX_KICKS} penalties in a row · {XP_PER_GOAL} XP per goal · Max {MAX_KICKS * XP_PER_GOAL} XP
          </p>
        </div>

        <div className="pn-score-box">
          <div>
            <div className="pn-score-label">Current XP</div>
            <div className="pn-score-value">{displayXP} XP</div>
          </div>
          <div className="pn-score-streak">
            {stats.streak ? `🔥 ${stats.streak} day streak` : "Play to start streak"}
          </div>
        </div>

        {msg && <div className={`pn-msg pn-msg-${msg.type}`}>{msg.text}</div>}

        {alreadyPlayed ? (
          <div className="pn-result">
            <div className="pn-result-badge">Game Complete</div>
            <div className="pn-result-title" style={{ color: getResultColor(displayGoals) }}>
              {getResultTitle(displayGoals)}
            </div>
            <div className="pn-result-score">{displayXP} XP</div>
            <div className="pn-result-phrase">
              {displayGoals} of {MAX_KICKS} goals scored · New penalties tomorrow
            </div>
            <div className="pn-result-actions">
              <button className="pn-btn pn-btn-back" onClick={handleBack}>← Home</button>
            </div>
          </div>
        ) : (
          <>
            {phase !== 'gameover' && (
              <div className="pn-game-card">
                <div className="pn-progress-row">
                  {Array.from({ length: MAX_KICKS }).map((_, i) => {
                    const k = kicks[i];
                    let dotCls = "pn-progress-dot";
                    let dotText = "";
                    if (k) {
                      if (k.saved) { dotCls += " dot-fail"; dotText = "SAVED"; }
                      else         { dotCls += " dot-win";  dotText = "GOAL"; }
                    } else if (i === kicks.length) {
                      dotCls += " dot-current"; dotText = "AIM";
                    }
                    return (
                      <div key={i} className={dotCls}>
                        <span className="pn-dot-text">{dotText || (i + 1)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pn-goal-frame">
                  <div className="pn-crossbar" />
                  <div className="pn-post-left" />
                  <div className="pn-post-right" />
                  <div className="pn-goal-grid-net">
                    {CORNERS.map(zone => {
                      const isSelected = selected === zone.id;
                      const isGkZone   = lastResult?.gkDive === zone.id;
                      const isBallZone = lastResult?.corner === zone.id;
                      let zoneCls = "pn-goal-zone";
                      if (isSelected && phase === 'aiming') zoneCls += " zone-aimed";
                      else if (isGkZone && phase === 'result') zoneCls += " zone-gk-dived";
                      else if (isBallZone && phase === 'result' && !lastResult.saved) zoneCls += " zone-ball-scored";
                      return (
                        <div
                          key={zone.id}
                          className={zoneCls}
                          onClick={() => { if (phase === 'aiming') setSelected(zone.id); }}
                        >
                          {isGkZone && phase === 'result' && (
                            <div className="pn-gk-dive-badge">KEEPER BLOCKED</div>
                          )}
                          {isBallZone && phase === 'result' && !lastResult.saved && (
                            <div className="pn-ball-goal-badge">GOAL SCORED</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Goalkeeper — re-keyed each kick so animations restart cleanly */}
                  <div key={gkKey} className={`pn-goalkeeper ${gkPhaseClass} ${gkDiveClass}`}>
                    <svg viewBox="0 0 52 88" className="pn-gk-svg" xmlns="http://www.w3.org/2000/svg">
                      {/* Ground shadow */}
                      <ellipse className="pn-gk-shadow" cx="26" cy="86" rx="13" ry="2" />

                      {/* Right arm (behind torso) */}
                      <rect className="pn-gk-arm pn-gk-arm-right" x="37" y="28" width="8" height="20" rx="4" />
                      <circle className="pn-gk-glove" cx="41" cy="49" r="4.5" />

                      {/* Left arm (behind torso) */}
                      <rect className="pn-gk-arm pn-gk-arm-left" x="7" y="28" width="8" height="20" rx="4" />
                      <circle className="pn-gk-glove" cx="11" cy="49" r="4.5" />

                      {/* Legs */}
                      <rect className="pn-gk-leg pn-gk-leg-left"  x="18" y="54" width="7" height="24" rx="3" />
                      <rect className="pn-gk-leg pn-gk-leg-right" x="27" y="54" width="7" height="24" rx="3" />

                      {/* Boots */}
                      <ellipse className="pn-gk-boot" cx="21.5" cy="80" rx="6" ry="3" />
                      <ellipse className="pn-gk-boot" cx="30.5" cy="80" rx="6" ry="3" />

                      {/* Shorts */}
                      <rect className="pn-gk-shorts" x="16" y="44" width="20" height="13" rx="4" />

                      {/* Jersey */}
                      <rect className="pn-gk-jersey" x="14" y="20" width="24" height="27" rx="6" />
                      <text className="pn-gk-number" x="26" y="37">1</text>

                      {/* Neck + head */}
                      <rect className="pn-gk-skin" x="23" y="13" width="6" height="8" rx="2" />
                      <circle className="pn-gk-skin" cx="26" cy="10" r="8.5" />
                      <path className="pn-gk-hair" d="M17.5 10 a8.5 8.5 0 0 1 17 0 q-1.5 -4 -4 -4.5 q-2 2 -4.5 1.2 q-2.5 -1.2 -4.5 0 q-2.5 1.2 -4 3.3 Z" />
                    </svg>
                  </div>
                </div>

                {phase === 'result' && lastResult && (
                  <div className={`pn-feedback-banner ${lastResult.saved ? 'banner-saved' : 'banner-goal'}`}>
                    {lastResult.saved
                      ? `SAVED! Goalkeeper ${GK_DIVES[lastResult.gkDive]}`
                      : `GOAL! +${XP_PER_GOAL} XP Earned`}
                  </div>
                )}

                {phase === 'aiming' && (
                  <div className="pn-aim-section">
                    <p className="pn-instruction">PICK YOUR CORNER TARGET</p>
                    <div className="pn-corner-grid">
                      {CORNERS.map(corner => (
                        <button
                          key={corner.id}
                          className={`pn-corner-btn ${selected === corner.id ? 'active' : ''}`}
                          onClick={() => setSelected(corner.id)}
                        >
                          <span className="pn-corner-symbol">{corner.symbol}</span>
                          <span className="pn-corner-label">{corner.label}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      className="pn-kick-btn"
                      disabled={!selected || animating}
                      onClick={kick}
                    >
                      STRIKE BALL
                    </button>
                  </div>
                )}

                <div className="pn-attempt-counter">Kick {Math.min(currentKick, MAX_KICKS)} / {MAX_KICKS} · Goals: {goals}</div>
              </div>
            )}

            {phase !== 'gameover' && (
              <div className="pn-controls">
                <button className="pn-btn pn-btn-back" onClick={handleBack}>← Home</button>
              </div>
            )}

            {phase === 'gameover' && (
              <div className="pn-result">
                <div className="pn-result-badge">Game Complete</div>
                <div className="pn-result-title" style={{ color: getResultColor(goals) }}>
                  {getResultTitle(goals)}
                </div>
                <div className="pn-result-score">{scoreDisplay} XP</div>
                <div className="pn-result-phrase">{goals} of {MAX_KICKS} goals scored</div>

                <div className="pn-kick-replay-list">
                  {kicks.map((k, i) => (
                    <div key={i} className={`pn-replay-row ${k.saved ? 'replay-saved' : 'replay-goal'}`}>
                      <span className="pn-replay-status-badge">{k.saved ? 'SAVED' : 'GOAL'}</span>
                      <span className="pn-replay-details">
                        {k.saved ? `Corner ${k.corner} was blocked` : `Scored cleanly in ${k.corner}`}
                      </span>
                    </div>
                  ))}
                </div>

                {xpAwarded != null && (
                  <div className="pn-xp-badge">
                    {xpAwarded > 0 ? `+${xpAwarded} XP earned` : 'Daily XP limit reached'}
                  </div>
                )}

                {goals < MAX_KICKS && !hasWatchedAd && (
                  <div className="pn-ad-box">
                    <p>Missed a penalty? Watch a quick ad to save your progress and retake the missed kick!</p>
                    <button
                      className="pn-ad-go-btn"
                      onClick={triggerRewardedAdToRetakeKick}
                      disabled={isAdLoading}
                    >
                      📺 {isAdLoading ? 'Loading Ad...' : 'Retake Missed Kick'}
                    </button>
                  </div>
                )}

                <div className="pn-result-actions">
                  <button className="pn-btn pn-btn-back" onClick={handleBack}>← Home</button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="pn-bottom-section">
          <div className="pn-section-div">
            <span className="pn-section-label">Your Progress</span>
            <div className="pn-section-line" />
          </div>
          <div className="pn-dash-grid">
            <div className="pn-dash-card">
              <div className="pn-dash-hdr">
                <span className="pn-dash-icon">📅</span>
                <span className="pn-dash-lbl">Last 30 Days</span>
              </div>
              <StreakDots history={history} today={today} />
            </div>
            <div className="pn-dash-card">
              <div className="pn-dash-hdr">
                <span className="pn-dash-icon">📊</span>
                <span className="pn-dash-lbl">Your Stats</span>
              </div>
              <div className="pn-stats-grid">
                {[
                  { val: stats.played ?? 0, name: "Played" },
                  { val: stats.best   ?? 0, name: "Best Goals" },
                  { val: stats.avg    ?? 0, name: "Avg Goals" },
                  { val: stats.streak ?? 0, name: "Day Streak" },
                ].map(s => (
                  <div key={s.name} className="pn-stat-item">
                    <div className="pn-stat-val">{s.val}</div>
                    <div className="pn-stat-name">{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}