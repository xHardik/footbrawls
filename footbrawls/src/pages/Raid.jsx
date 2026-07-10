import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../lib/user';
import { findBuddy, createBotRivalDuo } from '../lib/matchmaking';
import { finalizeRaid, getRaidXpPreview } from '../lib/raidFinalize';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  pickAct1Game,
  simulateBotAct1Scores,
  simulateBotAct2Scores,
  simulateBotAct3Scores,
  determineActWinner,
  computeRaidOutcome,
  sumAct1Duo,
  sumAct1Rival,
  pickMvp,
  calculateCastleDamage,
} from '../lib/raidEngine';
import { RAID_TYPES, R, BUDDY_TIMEOUT_MS } from '../lib/raidConstants';


const ShieldIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z"
      stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SwordsIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 3l10 10M13 3l8 8-4 4-8-8V3h4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3 13l8 8 4-4-8-8" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M13.5 20.5l-2 2M20.5 13.5l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const StarIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ZapIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const BallIcon = ({ size = 20, color = 'currentColor', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
    <path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill={color} opacity="0.7" />
    <path d="M2 12h4l2 3-2 3H2" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" />
    <path d="M22 12h-4l-2 3 2 3h4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" />
    <path d="M5 5.5l3 2.5 1 4-4-2-1.5-4z" fill={color} opacity="0.6" />
    <path d="M19 5.5l-3 2.5-1 4 4-2 1.5-4z" fill={color} opacity="0.6" />
    <path d="M8 19l1-4 3-1 3 1 1 4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" />
  </svg>
);

const RankIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 20h18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 20V10" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    <path d="M12 20V4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M17 20V14" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

const PersonIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5" />
    <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);


const TrophyIcon = ({ size = 28, color = '#F7C344' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 2h12v8a6 6 0 01-12 0V2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M6 5H3a1 1 0 00-1 1v2a4 4 0 004 4M18 5h3a1 1 0 011 1v2a4 4 0 01-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 16v4M8 20h8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SkullIcon = ({ size = 28, color = '#FF4D6A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3a7 7 0 017 7c0 2.5-1.3 4.7-3.2 6H8.2C6.3 14.7 5 12.5 5 10a7 7 0 017-7z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 21v-2a1 1 0 011-1h6a1 1 0 011 1v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 16v3M12 16v3M15 16v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="9.5" cy="10.5" r="1.5" fill={color} />
    <circle cx="14.5" cy="10.5" r="1.5" fill={color} />
  </svg>
);

const HandshakeIcon = ({ size = 28, color = '#A855F7' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 10h4l3-3 4 4 3-2 4 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 10l2 8h6l2-8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HourglassIcon = ({ size = 40, color = '#F7C344' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 2h12M6 22h12M6 2v4l5 5-5 5v4M18 2v4l-5 5 5 5v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CastleIcon = ({ size = 20, color = '#A855F7' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 21V9l3-3V3h2v3h2V3h2v3h2V3h2v3l3 3v12H3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9 21v-6h6v6" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3 9h18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BoltIcon = ({ size = 22, color = '#F7C344' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const GlobeIcon = ({ size = 22, color = '#60A5FA' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
    <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SwordSingleIcon = ({ size = 36, color = '#F7C344' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M14.5 3l6.5 6.5-10 10L4 15.5 14.5 3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3 21l3-3M17.5 5.5l2 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);


function AttackerFigure() {
  return (
    <div style={{
      position: 'fixed', right: '10%', bottom: 0,
      width: 220, height: 400,
      zIndex: 0, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', right: -20, bottom: -20,
        width: 280, height: 320, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 60% 80%, rgba(247,195,68,.08) 0%, transparent 60%)',
        filter: 'blur(28px)',
      }} />
      <svg viewBox="0 0 220 400" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', bottom: 0, right: 0, width: '100%', height: '100%', opacity: 0.13 }}>
        
        <ellipse cx="148" cy="44" rx="22" ry="20" fill="#F7C344" />
        <path d="M126 44 Q126 24 148 22 Q170 24 170 44" fill="#e8a800" />
        
        <rect x="133" y="42" width="30" height="5" rx="2" fill="#04060f" opacity="0.6" />
        
        <rect x="141" y="62" width="14" height="12" rx="3" fill="#F7C344" />
        
        <path d="M118 74 C110 76 104 94 102 118 L106 170 L148 178 L190 168 L194 116 C192 92 186 76 178 74 L163 70 L148 68 L133 70 Z" fill="#F7C344" />
        
        <path d="M148 74 L148 170" stroke="#e8a800" strokeWidth="2" opacity="0.4" />
        <path d="M120 100 L176 100" stroke="#e8a800" strokeWidth="1.5" opacity="0.3" />
        
        <ellipse cx="113" cy="84" rx="14" ry="10" fill="#e8a800" />
        
        <ellipse cx="183" cy="84" rx="14" ry="10" fill="#e8a800" />
        
        <path d="M118 88 C105 84 88 72 76 55 C70 47 69 40 74 36 C79 32 86 36 91 43 L112 82 Z" fill="#F7C344" />
        
        <path d="M68 28 L52 8" stroke="#F7C344" strokeWidth="4" strokeLinecap="round" />
        <path d="M60 36 L44 20" stroke="#e8a800" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        
        <path d="M62 32 L74 20" stroke="#F7C344" strokeWidth="6" strokeLinecap="round" />
        
        <path d="M178 92 C192 98 210 112 218 128 C222 136 220 143 214 144 C208 145 202 138 197 130 L180 100 Z" fill="#F7C344" />
        
        <path d="M218 152 C218 152 234 140 240 128 C246 116 242 106 234 108 C228 110 220 120 218 132 C216 120 208 110 202 108 C194 106 190 116 196 128 C202 140 218 152 218 152 Z" fill="#e8a800" opacity="0.8" />
        
        <path d="M120 168 C116 192 112 228 110 260 L126 261 L138 226 L145 192 Z" fill="#F7C344" />
        
        <path d="M108 259 C102 260 93 265 89 272 C87 278 91 282 100 282 L132 279 L132 259 Z" fill="#e8a800" />
        
        <path d="M168 168 C174 190 184 226 198 248 L212 241 L194 214 L182 185 Z" fill="#F7C344" />
        
        <path d="M196 246 C208 260 222 274 232 284 L242 274 L224 262 L207 240 Z" fill="#e8a800" />
        
        <line x1="46" y1="10" x2="30" y2="4" stroke="#F7C344" strokeWidth="1.2" opacity="0.18" strokeDasharray="4 6" />
        <line x1="50" y1="18" x2="32" y2="14" stroke="#F7C344" strokeWidth="0.8" opacity="0.12" strokeDasharray="3 7" />
        
        <ellipse cx="140" cy="348" rx="55" ry="6" fill="#F7C344" opacity="0.04" />
      </svg>
    </div>
  );
}


function DefenderFigure() {
  return (
    <div style={{
      position: 'fixed', left: '10%', bottom: 0,
      width: 220, height: 400,
      zIndex: 0, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', left: -20, bottom: -20,
        width: 280, height: 320, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 40% 80%, rgba(168,85,247,.07) 0%, transparent 60%)',
        filter: 'blur(28px)',
      }} />
      <svg viewBox="0 0 220 400" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0.13 }}>
        
        <ellipse cx="72" cy="82" rx="21" ry="19" fill="#A855F7" />
        <path d="M51 82 Q51 63 72 61 Q93 63 93 82" fill="#7c3aed" />
        
        <path d="M72 63 C68 52 60 44 58 36 C62 38 68 46 72 52 C76 46 82 38 86 36 C84 44 76 52 72 63 Z" fill="#A855F7" opacity="0.6" />
        
        <rect x="57" y="80" width="30" height="5" rx="2" fill="#04060f" opacity="0.5" />
        
        <rect x="65" y="99" width="14" height="11" rx="3" fill="#A855F7" />
        
        <path d="M42 110 C34 112 28 130 26 154 L30 206 L72 214 L114 204 L118 152 C116 128 110 112 102 110 L87 106 L72 104 L57 106 Z" fill="#A855F7" />
        <path d="M72 110 L72 206" stroke="#7c3aed" strokeWidth="2" opacity="0.35" />
        <path d="M44 138 L100 138" stroke="#7c3aed" strokeWidth="1.5" opacity="0.25" />
        
        <ellipse cx="37" cy="122" rx="14" ry="10" fill="#7c3aed" />
        <ellipse cx="107" cy="122" rx="14" ry="10" fill="#7c3aed" />
        
        <path d="M42 126 C28 122 10 118 -4 118 C-12 118 -14 124 -10 130 C-6 136 6 138 18 136 L36 128 Z" fill="#A855F7" />
        
        <rect x="-18" y="104" width="32" height="52" rx="4" fill="#7c3aed" opacity="0.85" />
        <path d="M-18 156 L2 170 L22 156" fill="#7c3aed" opacity="0.85" />
        
        <path d="M2 116 L-6 130 L2 128 L2 142 L10 128 L2 130 Z" fill="#A855F7" opacity="0.6" />
        
        <path d="M102 128 C116 124 134 114 148 104 C154 100 155 94 150 90 C145 86 138 90 133 96 L106 120 Z" fill="#A855F7" />
        
        <path d="M150 86 L168 68" stroke="#A855F7" strokeWidth="4" strokeLinecap="round" />
        <path d="M144 90 L168 82" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
        
        <path d="M44 204 C40 228 36 264 34 296 L50 297 L62 262 L69 228 Z" fill="#A855F7" />
        <path d="M32 295 C26 296 17 300 13 308 C11 314 15 318 24 318 L56 315 L56 295 Z" fill="#7c3aed" />
        
        <path d="M92 204 C98 226 108 262 122 286 L136 279 L118 252 L107 222 Z" fill="#A855F7" />
        <path d="M120 284 C132 298 146 312 156 322 L166 312 L148 299 L131 278 Z" fill="#7c3aed" />
        
        <ellipse cx="72" cy="348" rx="52" ry="5" fill="#A855F7" opacity="0.04" />
        
        <line x1="-20" y1="116" x2="-38" y2="110" stroke="#A855F7" strokeWidth="1.2" opacity="0.16" strokeDasharray="4 6" />
        <line x1="-20" y1="128" x2="-40" y2="126" stroke="#A855F7" strokeWidth="0.8" opacity="0.1" strokeDasharray="3 7" />
      </svg>
    </div>
  );
}


const T = {
  bg:        '#04060f',
  bg2:       '#080b18',
  bg3:       '#0d1126',
  glass:     'rgba(255,255,255,0.04)',
  glass2:    'rgba(255,255,255,0.08)',
  glass3:    'rgba(255,255,255,0.12)',
  border:    'rgba(255,255,255,0.07)',
  border2:   'rgba(255,255,255,0.14)',
  border3:   'rgba(255,255,255,0.22)',
  gold:      '#F7C344',
  goldDim:   '#b8902e',
  goldGlow:  'rgba(247,195,68,0.35)',
  red:       '#FF4D6A',
  redGlow:   'rgba(255,77,106,0.3)',
  green:     '#3DF5A0',
  greenGlow: 'rgba(61,245,160,0.3)',
  purple:    '#A855F7',
  purpleGlow:'rgba(168,85,247,0.3)',
  blue:      '#60A5FA',
  blueGlow:  'rgba(96,165,250,0.3)',
  text:      '#F0F2FF',
  muted:     'rgba(240,242,255,0.45)',
  muted2:    'rgba(240,242,255,0.25)',
};


function injectStyles() {
  if (document.getElementById('raid-ui-v2')) return;
  const el = document.createElement('style');
  el.id = 'raid-ui-v2';
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap');

    @keyframes raid-spin   { to { transform: rotate(360deg); } }
    @keyframes raid-pulse  { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.06); } }
    @keyframes raid-fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes raid-glow   { 0%,100% { box-shadow:0 0 16px var(--glow,rgba(247,195,68,.4)); } 50% { box-shadow:0 0 36px var(--glow,rgba(247,195,68,.7)); } }
    @keyframes raid-scan   { 0% { background-position:0 -100%; } 100% { background-position:0 200%; } }
    @keyframes raid-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes raid-shimmer{ 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
    @keyframes raid-orb    { 0%,100%{transform:scale(1) translate(0,0)} 33%{transform:scale(1.15) translate(20px,-15px)} 66%{transform:scale(.9) translate(-10px,20px)} }
    @keyframes raid-bar    { from{width:0} to{width:var(--w,100%)} }
    @keyframes raid-crown-bob { 0%,100%{transform:translateY(0) rotate(-6deg)} 50%{transform:translateY(-4px) rotate(6deg)} }

    .raid-btn-primary {
      position:relative; overflow:hidden;
      background:linear-gradient(135deg,#F7C344,#e8a800);
      color:#111; border:none; border-radius:14px;
      font-family:'Orbitron',sans-serif; font-weight:700;
      letter-spacing:.5px; cursor:pointer;
      transition:transform .2s, box-shadow .2s;
    }
    .raid-btn-primary::before {
      content:''; position:absolute; inset:0;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);
      transform:translateX(-100%);
    }
    .raid-btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(247,195,68,.45); }
    .raid-btn-primary:hover::before { animation:raid-shimmer .6s ease; }
    .raid-btn-primary:active { transform:translateY(0) scale(.98); }

    .raid-btn-ghost {
      background:rgba(255,255,255,.05); color:${T.muted};
      border:1px solid ${T.border2}; border-radius:14px;
      font-family:'Inter',sans-serif; font-weight:500;
      cursor:pointer; transition:background .2s, color .2s, border-color .2s;
    }
    .raid-btn-ghost:hover { background:rgba(255,255,255,.09); color:${T.text}; border-color:${T.border3}; }

    .raid-card {
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.08);
      border-radius:20px; backdrop-filter:blur(20px);
      transition:border-color .25s, box-shadow .25s;
    }
    .raid-card:hover { border-color:rgba(255,255,255,.14); }

    .raid-mode-card {
      cursor:pointer; padding:20px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.08);
      border-radius:18px; text-align:left;
      transition:all .25s; position:relative; overflow:hidden;
    }
    .raid-mode-card::after {
      content:''; position:absolute; inset:0; opacity:0;
      background:radial-gradient(circle at 30% 50%,rgba(247,195,68,.08),transparent 70%);
      transition:opacity .3s;
    }
    .raid-mode-card:hover { transform:translateY(-3px); border-color:rgba(247,195,68,.35); box-shadow:0 12px 32px rgba(0,0,0,.4); }
    .raid-mode-card:hover::after { opacity:1; }
    .raid-mode-card:active { transform:translateY(-1px); }

    .raid-tag {
      display:inline-flex; align-items:center; gap:4px;
      font-size:10px; font-weight:700; letter-spacing:1px;
      text-transform:uppercase; padding:3px 8px;
      border-radius:99px; font-family:'Orbitron',sans-serif;
    }

    .raid-player-row {
      display:flex; align-items:center; gap:10px; padding:11px 14px;
      background:rgba(255,255,255,.04); border-radius:12px;
      border:1px solid rgba(255,255,255,.07);
      transition:background .2s;
    }
    .raid-player-row:hover { background:rgba(255,255,255,.07); }

    .raid-act-pill {
      display:inline-flex; align-items:center; gap:6px;
      padding:5px 14px; border-radius:99px;
      font-family:'Orbitron',sans-serif; font-size:10px; font-weight:700; letter-spacing:1px;
    }

    .raid-hp-bar {
      height:10px; background:rgba(255,255,255,.07); border-radius:99px; overflow:hidden;
    }
    .raid-hp-fill {
      height:100%; border-radius:99px;
      background:linear-gradient(90deg,${T.red},${T.purple});
      transition:width 1.8s cubic-bezier(.16,1,.3,1);
    }

    .raid-standing-row {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 18px; border-radius:14px;
      border:1px solid rgba(255,255,255,.06);
      transition:all .2s;
    }
    .raid-standing-row:hover { background:rgba(255,255,255,.05); }

    .raid-divider {
      height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);
      margin:20px 0;
    }

    .raid-section-label {
      font-family:'Orbitron',sans-serif; font-size:10px; font-weight:700;
      letter-spacing:2px; text-transform:uppercase;
      display:flex; align-items:center; gap:8px; margin-bottom:14px;
    }
    .raid-section-label::after {
      content:''; flex:1; height:1px;
      background:linear-gradient(90deg,rgba(255,255,255,.1),transparent);
    }
    .raid-bottom-nav {
      position:fixed;bottom:0;left:0;right:0;z-index:200;display:flex;
      background:rgba(6,8,16,0.97);backdrop-filter:blur(24px);
      border-top:1px solid ${T.border};
      padding-bottom:env(safe-area-inset-bottom,0px);
      box-shadow:0 -4px 24px rgba(0,0,0,0.4);
    }
    .raid-nav-item {
      position:relative;flex:1;min-width:0;border:none;background:transparent;
      padding:10px 4px 9px;display:flex;flex-direction:column;align-items:center;gap:3px;
      cursor:pointer;font-family:'Syne',sans-serif;transition:color 0.15s;
      -webkit-tap-highlight-color:transparent;touch-action:manipulation;
    }
    .raid-nav-indicator {
      position:absolute;top:0;left:50%;transform:translateX(-50%);
      width:32px;height:2px;border-radius:0 0 99px 99px;
      background:#4F8EF7;box-shadow:0 0 12px #4F8EF7;
    }
  `;
  document.head.appendChild(el);
}


function AmbientBg({ accent = T.gold }) {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <div style={{
        position:'absolute', width:500, height:500, borderRadius:'50%',
        background:`radial-gradient(circle,${accent}18 0%,transparent 70%)`,
        top:-100, left:-100, animation:'raid-orb 12s ease-in-out infinite',
      }} />
      <div style={{
        position:'absolute', width:400, height:400, borderRadius:'50%',
        background:`radial-gradient(circle,${T.purple}12 0%,transparent 70%)`,
        bottom:-80, right:-60, animation:'raid-orb 15s ease-in-out infinite reverse',
        animationDelay:'-5s',
      }} />
      <div style={{
        position:'absolute', width:300, height:300, borderRadius:'50%',
        background:`radial-gradient(circle,${T.blue}0a 0%,transparent 70%)`,
        top:'50%', left:'60%', animation:'raid-orb 18s ease-in-out infinite',
        animationDelay:'-9s',
      }} />
      
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.012) 2px,rgba(255,255,255,.012) 4px)',
        pointerEvents:'none',
      }} />
    </div>
  );
}


function Spinner({ size = 40, color = T.gold }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      border:`2px solid rgba(255,255,255,.07)`,
      borderTopColor:color,
      animation:'raid-spin .75s linear infinite',
      flexShrink:0,
    }} />
  );
}


function GlowBadge({ children, color = T.gold, glow }) {
  const g = glow || `${color}40`;
  return (
    <span className="raid-tag" style={{
      background:`${color}18`, color, border:`1px solid ${color}35`,
      boxShadow:`0 0 8px ${g}`,
    }}>
      {children}
    </span>
  );
}


function Section({ children, style = {} }) {
  return (
    <div style={{ animation:'raid-fadeUp .4s ease', ...style }}>
      {children}
    </div>
  );
}


function ActBadge({ winner }) {
  if (!winner) return <span style={{ color:T.muted2, fontSize:12 }}>—</span>;
  const cfg = {
    you:   { label:'WIN',  bg:`${T.green}18`,  color:T.green,  border:`${T.green}35` },
    rival: { label:'LOSS', bg:`${T.red}18`,    color:T.red,    border:`${T.red}35`   },
    draw:  { label:'DRAW', bg:`${T.muted}18`,  color:T.muted,  border:`${T.muted}35` },
  }[winner] || {};
  return (
    <span className="raid-act-pill" style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}


function ParticleEffect({ type }) {
  const canvasRef = useCallback(canvas => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let id;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const count = type === 'win' ? 120 : 45;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -400,
      size: type === 'win' ? Math.random() * 7 + 3 : Math.random() * 14 + 14,
      color: type === 'win' ? `hsla(${Math.random()*360},90%,60%,.9)` : null,
      vy: Math.random() * 2.5 + 1,
      vx: Math.random() * 1.6 - .8,
      rot: Math.random() * Math.PI,
      drot: Math.random() * .07 - .035,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y += p.vy; p.x += p.vx; p.rot += p.drot;
        if (p.y > canvas.height) { p.y = -30; p.x = Math.random() * canvas.width; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (type === 'win') {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size/2, -p.size, p.size, p.size*2);
        } else {
          ctx.fillStyle = 'rgba(150, 150, 170, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, [type]);

  return (
    <canvas ref={canvasRef} style={{
      position:'fixed', top:0, left:0, width:'100vw', height:'100vh',
      pointerEvents:'none', zIndex:9999,
    }} />
  );
}


function CastleDamageVisual({ damagePct, rivalName }) {
  const [hp, setHp] = useState(100);
  useEffect(() => {
    const t = setTimeout(() => setHp(100 - damagePct * 100), 600);
    return () => clearTimeout(t);
  }, [damagePct]);

  const hpColor = hp > 60 ? T.green : hp > 30 ? T.gold : T.red;

  return (
    <div className="raid-card" style={{ padding:'18px 20px', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <CastleIcon size={20} color={T.purple} />
        <span style={{
          fontFamily:"'Orbitron',sans-serif", fontSize:10, letterSpacing:2,
          color:T.purple, textTransform:'uppercase', fontWeight:700,
        }}>Rival castle sieged</span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, fontWeight:600, color:T.text }}>
          {rivalName || 'Rival'} Guild
        </span>
        <span style={{
          fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:700, color:hpColor,
          textShadow:`0 0 12px ${hpColor}`,
        }}>
          {Math.round(hp)}% HP
        </span>
      </div>

      <div className="raid-hp-bar">
        <div className="raid-hp-fill" style={{ width:`${hp}%` }} />
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:12, color:T.muted }}>
        <span style={{ fontFamily:"'Inter',sans-serif" }}>Damage dealt</span>
        <span style={{ color:T.red, fontWeight:600, fontFamily:"'Orbitron',sans-serif", fontSize:11 }}>
          -{Math.round(damagePct * 100)}%
        </span>
      </div>
    </div>
  );
}


function fmtSecs(ms) { return Math.ceil(ms / 1000); }


export default function Raid() {
  const navigate = useNavigate();
  const user     = useMemo(() => getUser(), []);
  const botTimerRef = useRef(null);

  const [phase, setPhase]                     = useState('lobby');
  const [raidType, setRaidType]               = useState('normal');
  const [raidSeed, setRaidSeed]               = useState(() => Date.now());
  const [searchRemaining, setSearchRemaining] = useState(BUDDY_TIMEOUT_MS);
  const [match, setMatch]                     = useState(null);
  const [act1Game, setAct1Game]               = useState(null);
  const [acts, setActs]                       = useState({});
  const [scores, setScores]                   = useState({});
  const [actWinners, setActWinners]           = useState([]);
  const [outcome, setOutcome]                 = useState(null);
  const [finalizing, setFinalizing]           = useState(false);
  const [hasFinishedAct1, setHasFinishedAct1] = useState(false);
  const [hasFinishedAct2, setHasFinishedAct2] = useState(false);
  const [hasFinishedAct3, setHasFinishedAct3] = useState(false);
  const [finalizeResult, setFinalizeResult]   = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('active_game_session_id'));
  const [toast, setToast]                     = useState("");
  const [showHelp, setShowHelp]               = useState(false);
  const [castleRaidEntries, setCastleRaidEntries] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return parseInt(localStorage.getItem(`castle_raid_entries_${today}`) || '0', 10);
  });

  useEffect(() => { injectStyles(); }, []);

  
  const finalizingRef = useRef(false);
  const finalizeRaidFromState = useCallback(async (currentActs, raidOutcome, currentMatch, currentRaidType, scores) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setFinalizing(true);
    try {
      if (currentRaidType === 'challenge') {
        const today = new Date().toISOString().split('T')[0];
        const key = `castle_raid_entries_${today}`;
        const current = parseInt(localStorage.getItem(key) || '0', 10);
        const nextCount = current + 1;
        localStorage.setItem(key, String(nextCount));
        setCastleRaidEntries(nextCount);
      }

      
      const uScores = scores?.[user.userId] || {};
      const calculateScore = (s) => {
        const act1 = s.act1?.normalized || 0;
        let act2 = s.act2?.wins || 0;
        if (act2 <= 5) act2 *= 20;
        let act3 = s.act3?.goals || 0;
        if (act3 <= 5) act3 *= 20;
        return act1 + act2 + act3;
      };
      const userScore = calculateScore(uScores);

      let buddyScore = 0;
      if (currentMatch?.buddy?.userId && currentMatch.buddy.userId !== user.userId) {
        if (currentMatch.isBotMatch) {
          
          buddyScore = ((currentActs.act1?.buddyScore || 0) * 100) +
            ((currentActs.act2?.buddyRoundWins || 0) * 20) +
            ((currentActs.act3?.buddyGoals || 0) * 20);
        } else {
          const bScores = scores?.[currentMatch.buddy.userId] || {};
          buddyScore = ((bScores.act1?.normalized || 0) * 100) +
            ((bScores.act2?.wins || 0) * 20) +
            ((bScores.act3?.goals || 0) * 20);
        }
      }

      const isUserMvp = userScore > buddyScore && userScore > 0;
      const isBuddyMvp = buddyScore > userScore && buddyScore > 0;

      const perf = {
        [user.userId]: userScore,
      };
      if (currentMatch?.buddy?.userId) {
        perf[currentMatch.buddy.userId] = buddyScore;
      }

      const res = await finalizeRaid({
        raidType: currentRaidType, outcome: raidOutcome,
        isMvp: isUserMvp, acts: currentActs, match: currentMatch,
        rivalGuildCode: currentMatch?.rivals?.[0]?.homeCountry,
        playerPerformance: perf,
      });
      setFinalizeResult({ ...res, isBuddyMvp });
    } catch (err) { console.error('[Raid] finalize:', err); }
    finally { setFinalizing(false); finalizingRef.current = false; }
  }, [user]);

  
  useEffect(() => {
    if (!activeSessionId) { setPhase('lobby'); return; }
    const sessionRef = doc(db,'gameSessions',activeSessionId);
    let unmounted = false;

    const unsub = onSnapshot(sessionRef, async snap => {
      try {
        if (!snap.exists()) {
          localStorage.removeItem('active_game_session_id');
          setActiveSessionId(null); setPhase('lobby'); return;
        }
        const s = snap.data();
        setRaidType(s.raidType || 'normal');
        setRaidSeed(s.raidSeed || Date.now());
        localStorage.setItem('active_game_session_seed', String(s.raidSeed || ''));

        const buddyObj  = s.players?.find(p => p.userId !== user.userId) || null;
        const isBotBuddy = !buddyObj || buddyObj.userId.startsWith('bot_') ||
                           s.disconnectedPlayers?.[buddyObj?.userId] === true;
        const currentMatch = {
          buddy: buddyObj, rivals: s.rivals || [],
          isBotMatch: isBotBuddy, matchedAt: s.createdAt?.toMillis() || Date.now()
        };
        setMatch(currentMatch);

        const gameObj = s.act1Game || pickAct1Game(s.raidSeed);
        setAct1Game(gameObj);

        const newActs     = { ...s.acts };
        const newWinners  = [...(s.actWinners||[])];
        let   updated     = false;
        const p1Scores    = s.scores?.[user.userId] || {};
        const p2Scores    = buddyObj ? (s.scores?.[buddyObj.userId] || {}) : {};
        const bots1 = simulateBotAct1Scores(gameObj.id, s.raidSeed);
        const bots2 = simulateBotAct2Scores(s.raidSeed);
        const baseBots3 = simulateBotAct3Scores(s.raidSeed);

        if (p1Scores.act1 && !newActs.act1) {
          const p1v = p1Scores.act1.normalized || 0;
          const bv  = isBotBuddy ? bots1.buddy : (p2Scores.act1?.normalized || 0);
          const yt = sumAct1Duo(p1v, bv);
          const rt = sumAct1Rival(bots1.rival1, bots1.rival2);
          newActs.act1 = { gameId:gameObj.id, playerScore:p1v, buddyScore:bv, rivalTotal:rt, yourTotal:yt, winner:determineActWinner(yt,rt) };
          newWinners[0] = newActs.act1.winner; updated = true;
        }
        if (p1Scores.act2 && newActs.act1 && !newActs.act2) {
          const p1w = p1Scores.act2.wins || 0;
          const is1v1 = s.raidType === 'training';
          const bw  = isBotBuddy ? (is1v1 ? 0 : bots2.buddyWins) : (p2Scores.act2?.wins || 0);
          const yt = p1w + bw;
          const rt = is1v1 ? Math.min(3, bots2.rivalWins) : bots2.rivalWins; 
          newActs.act2 = { winner:determineActWinner(yt,rt), playerRoundWins:p1w, buddyRoundWins:bw, rivalBotWins:rt, yourTotal:yt, rivalTotal:rt };
          newWinners[1] = newActs.act2.winner; updated = true;
        }
        if (p1Scores.act3 && newActs.act2 && !newActs.act3) {
          const p1g = p1Scores.act3.goals || 0;
          const is1v1 = s.raidType === 'training';
          const duo1 = [user,buddyObj].filter(Boolean).sort((a,b)=>(b.totalXP||0)-(a.totalXP||0));
          const duo2 = [...(s.rivals||[])].sort((a,b)=>(b.totalXP||0)-(a.totalXP||0));
          const isHigher = user?.userId === duo1[0]?.userId;
          const buddy = duo1.find(p=>p.userId!==user?.userId)||buddyObj;
          const buddyOpp = isHigher ? duo2[0] : duo2[1];
          const off = Math.round(((buddy?.totalXP||0)-(buddyOpp?.totalXP||0))/2500);
          const bg  = isBotBuddy ? (is1v1 ? 0 : Math.max(0,Math.min(5,baseBots3.buddyGoals+off))) : (p2Scores.act3?.goals||0);
          const yt = p1g + bg;
          const rt = is1v1 ? Math.min(5, baseBots3.rivalGoals) : baseBots3.rivalGoals;
          newActs.act3 = { winner:determineActWinner(yt,rt), playerGoals:p1g, playerSaves:5-p1g, buddyGoals:bg, rivalBotGoals:rt, yourTotal:yt, rivalTotal:rt };
          newWinners[2] = newActs.act3.winner; updated = true;
        }

        if (updated) {
          let next = s.currentAct;
          if (newActs.act3) next=4; else if (newActs.act2) next=3; else if (newActs.act1) next=2;
          
          if (isBotBuddy && next > s.currentAct) {
            if (!botTimerRef.current) {
              botTimerRef.current = setTimeout(() => {
                updateDoc(sessionRef,{ acts:newActs, actWinners:newWinners, currentAct:next }).catch(()=>{});
                botTimerRef.current = null;
              }, 4000);
            }
          } else {
            await updateDoc(sessionRef,{ acts:newActs, actWinners:newWinners, currentAct:next });
          }
        }

        const l1 = localStorage.getItem(`raid_completed_act1_${activeSessionId}`)==='true';
        const l2 = localStorage.getItem(`raid_completed_act2_${activeSessionId}`)==='true';
        const l3 = localStorage.getItem(`raid_completed_act3_${activeSessionId}`)==='true';

        
        if (l1&&!s.scores?.[user.userId]?.act1&&s.status==='active')
          updateDoc(sessionRef,{[`scores.${user.userId}.act1`]:{gameId:gameObj?.id||'unknown',rawScore:0,normalized:0}});
        if (l2&&!s.scores?.[user.userId]?.act2&&s.status==='active')
          updateDoc(sessionRef,{[`scores.${user.userId}.act2`]:{gameId:'dribble_correct',rawScore:0,wins:0}});
        if (l3&&!s.scores?.[user.userId]?.act3&&s.status==='active')
          updateDoc(sessionRef,{[`scores.${user.userId}.act3`]:{gameId:'penaltyNerve_all5',rawScore:0,goals:0}});

        setActs(newActs); setActWinners(newWinners); setScores(s.scores || {});
        setHasFinishedAct1(!!s.scores?.[user.userId]?.act1||l1);
        setHasFinishedAct2(!!s.scores?.[user.userId]?.act2||l2);
        setHasFinishedAct3(!!s.scores?.[user.userId]?.act3||l3);

        const buddyAct1Done = isBotBuddy || !!s.scores?.[buddyObj?.userId]?.act1;
        const buddyAct2Done = isBotBuddy || !!s.scores?.[buddyObj?.userId]?.act2;
        const buddyAct3Done = isBotBuddy || !!s.scores?.[buddyObj?.userId]?.act3;

        const bothAct1Done = myAct1Done && buddyAct1Done;
        const bothAct2Done = myAct2Done && buddyAct2Done;
        const bothAct3Done = myAct3Done && buddyAct3Done;

        const raidDone = s.currentAct === 4 || bothAct3Done;

        if (raidDone) {
          const out = computeRaidOutcome(newActs);
          setOutcome(out); setPhase('results');
          await finalizeRaidFromState(newActs,out,currentMatch,s.raidType, s.scores);
          await updateDoc(sessionRef,{status:'completed'});
          localStorage.removeItem('active_game_session_id');
        } else {
          // Teammate act sync routing
          if (!myAct1Done) {
            setPhase('matched');
          } else if (myAct1Done && !buddyAct1Done) {
            setPhase('waiting_teammate');
          } else if (bothAct1Done && !myAct2Done) {
            setPhase('starting_act2');
          } else if (myAct2Done && !buddyAct2Done) {
            setPhase('waiting_teammate');
          } else if (bothAct2Done && !myAct3Done) {
            setPhase('starting_act3');
          } else {
            setPhase('waiting_teammate');
          }
        }
      } catch(err) {
        console.error('[Raid] snapshot error:', err);
        localStorage.removeItem('active_game_session_id');
        setActiveSessionId(null); setPhase('lobby');
      }
    }, err => {
      console.error('[Raid] subscribe error:', err);
      localStorage.removeItem('active_game_session_id');
      setActiveSessionId(null); setPhase('lobby');
    });

    const handleUnload = () => {
      const id = localStorage.getItem('active_game_session_id');
      if (id && user?.userId) {
        const url = `https://firestore.googleapis.com/v1/projects/footbrawls/databases/(default)/documents/gameSessions/${id}?updateMask.fieldPaths=disconnectedPlayers.${user.userId}`;
        const payload = JSON.stringify({ fields:{ [`disconnectedPlayers.${user.userId}`]:{ booleanValue:true } } });
        try { navigator.sendBeacon ? navigator.sendBeacon(url,payload) : (() => { const x=new XMLHttpRequest();x.open('PATCH',url,false);x.setRequestHeader('Content-Type','application/json');x.send(payload); })(); } catch(e){}
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => { unsub(); window.removeEventListener('beforeunload',handleUnload); };
  }, [activeSessionId, user, navigate, finalizeRaidFromState]);

  
  const act1Route = act1Game?.route;
  useEffect(() => {
    let t;
    if (phase === 'matched' && act1Route) {
      t = setTimeout(() => navigate(act1Route), 2200);
    } else if (phase === 'starting_act2') {
      t = setTimeout(() => navigate('/games/dribble'), 2500);
    } else if (phase === 'starting_act3') {
      t = setTimeout(() => navigate('/games/penaltynerve'), 2500);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [phase, navigate, act1Route]);

  const startSearch = useCallback(async type => {
    if (!user) return;

    if (type === 'challenge') {
      const today = new Date().toISOString().split('T')[0];
      const key = `castle_raid_entries_${today}`;
      const current = parseInt(localStorage.getItem(key) || '0', 10);
      if (current >= 3) {
        alert('Daily limit reached! You can only play 3 Castle Raids per day.');
        return;
      }
    }

    if (type === 'training') {
      setRaidType(type);
      const sid = `bot_raid_${Date.now()}`;
      const seed = Date.now();
      const g = pickAct1Game(seed);
      const botDuo = createBotRivalDuo(user, seed);
      
      const mockMatch = {
        buddy: null,
        rivals: [botDuo.rivals[0]],
        yourDuo: [user],
        rivalDuo: [botDuo.rivals[0]],
        isBotMatch: true,
        matchedAt: seed,
        sessionId: sid,
      };

      try {
        await setDoc(doc(db,'gameSessions',sid), {
          sessionId:sid, sessionType:'raid', raidType:type, raidSeed:seed,
          players:[
            { userId:user.userId, nickname:user.nickname, flag:user.flag||'', homeCountry:user.homeCountry, totalXP:user.totalXP||0 }
          ],
          rivals: [botDuo.rivals[0]], act1Game:g, currentAct:1,
          scores:{}, acts:{}, actWinners:[], status:'active',
        });
        localStorage.setItem('active_game_session_id', sid);
        localStorage.setItem('active_game_session_seed', String(seed));
        setMatch(mockMatch);
        setPhase('matched');
        setActiveSessionId(sid);
      } catch (err) {
        console.error('[Raid] Direct bot search fail:', err);
      }
      return;
    }

    setRaidType(type); setPhase('searching'); setSearchRemaining(BUDDY_TIMEOUT_MS);
    try {
      const result = await findBuddy(user, type, ({ remaining }) => setSearchRemaining(remaining));
      if (result.sessionId) {
        localStorage.setItem('active_game_session_id', result.sessionId);
        localStorage.setItem('active_game_session_seed', String(result.matchedAt||Date.now()));
        setActiveSessionId(result.sessionId);
      } else {
        const sid = `bot_raid_${Date.now()}`;
        const seed = result.matchedAt || Date.now();
        const g = pickAct1Game(seed);
        await setDoc(doc(db,'gameSessions',sid), {
          sessionId:sid, sessionType:'raid', raidType:type, raidSeed:seed,
          players:[
            { userId:user.userId, nickname:user.nickname, flag:user.flag||'', homeCountry:user.homeCountry, totalXP:user.totalXP||0 },
            { userId:result.buddy.userId, nickname:result.buddy.nickname, flag:result.buddy.flag||'', homeCountry:result.buddy.homeCountry, totalXP:result.buddy.totalXP||0, isBot:true }
          ],
          rivals:result.rivals||[], act1Game:g, currentAct:1,
          scores:{}, acts:{}, actWinners:[], status:'active',
        });
        localStorage.setItem('active_game_session_id', sid);
        localStorage.setItem('active_game_session_seed', String(seed));
        setActiveSessionId(sid);
      }
    } catch(err) { console.error('[Raid] search:', err); setPhase('lobby'); }
  }, [user]);

  
  const standings = useMemo(() => {
    if (!match) return [];
    const a1b = acts.act1?.gameId ? simulateBotAct1Scores(acts.act1.gameId, raidSeed) : { rival1:0, rival2:0 };
    const a2t = (acts.act2?.rivalBotWins||0)*20;
    const a2r1 = Math.round(a2t/2), a2r2 = a2t-a2r1;
    const a3t = (acts.act3?.rivalBotGoals||0)*20;
    const a3r1 = Math.round(a3t/2), a3r2 = a3t-a3r1;

    const myScores = scores[user.userId] || {};
    const buddyObj = match.buddy;
    const buddyScores = buddyObj ? (scores[buddyObj.userId] || {}) : {};
    const isBotBuddy = !buddyObj || buddyObj.userId.startsWith('bot_');

    const myAct1 = myScores.act1?.normalized || 0;
    const myAct2 = (myScores.act2?.wins || 0) * 20;
    const myAct3 = (myScores.act3?.goals || 0) * 20;

    let buddyAct1 = isBotBuddy ? (acts.act1?.buddyScore || 0) : (buddyScores.act1?.normalized || 0);
    let buddyAct2 = isBotBuddy ? (acts.act2?.buddyRoundWins || 0) * 20 : (buddyScores.act2?.wins || 0) * 20;
    let buddyAct3 = isBotBuddy ? (acts.act3?.buddyGoals || 0) * 20 : (buddyScores.act3?.goals || 0) * 20;

    const list = [
      { userId: user.userId, nickname:user.nickname, flag:user.flag||'', act1:myAct1, act2:myAct2, act3:myAct3, isUser:true, team:'you' },
    ];
    if (buddyObj) {
      list.push({ userId: buddyObj.userId, nickname:buddyObj.nickname||'Buddy', flag:buddyObj.flag||'', act1:buddyAct1, act2:buddyAct2, act3:buddyAct3, isUser:false, team:'you' });
    }
    list.push(
      { userId: 'rival_1', nickname:match.rivals?.[0]?.nickname||'Rival 1', flag:match.rivals?.[0]?.flag||'', act1:a1b.rival1, act2:a2r1, act3:a3r1, isUser:false, team:'rival' },
      { userId: 'rival_2', nickname:match.rivals?.[1]?.nickname||'Rival 2', flag:match.rivals?.[1]?.flag||'', act1:a1b.rival2, act2:a2r2, act3:a3r2, isUser:false, team:'rival' }
    );
    const finalList = list.map(p => ({ ...p, total:Math.round(p.act1+p.act2+p.act3) }));
    return finalList.sort((a,b)=>b.total-a.total);
  }, [user, match, acts, raidSeed, scores]);

  const xpPreview   = getRaidXpPreview(raidType, outcome);
  const isTraining  = raidType === 'training';
  const damagePreview = outcome==='win'&&!isTraining ? calculateCastleDamage(raidType,1) : 0;

  if (!user) return (
    <div style={css.page}>
      <AmbientBg />
      <AttackerFigure />
      <DefenderFigure />
      <p style={{ color:T.muted, position:'relative', zIndex:1 }}>Please complete onboarding first.</p>
      <button className="raid-btn-ghost" style={{ padding:'12px 28px', marginTop:12, position:'relative', zIndex:1 }} onClick={() => navigate('/onboarding')}>
        Go to Onboarding
      </button>
    </div>
  );

  
  return (
    <div style={css.page}>
      <AmbientBg accent={outcome==='win' ? T.green : outcome==='loss' ? T.red : T.gold} />
      <AttackerFigure />
      <DefenderFigure />

      
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 24px', height: 58,
        background: 'rgba(5,7,15,0.85)', backdropFilter: 'blur(24px) saturate(1.4)',
        borderBottom: `1px solid ${T.gold}25`,
        boxShadow: `0 4px 20px ${T.gold}15`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'start' }}>
          <button onClick={() => navigate('/')} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: 'none', cursor: 'pointer', outline: 'none', backgroundColor: 'transparent',
          }}>
            <img src="/logo.png" alt="Logo" style={{ height: 26, filter:`drop-shadow(0 0 8px ${T.goldGlow})` }} />
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: 2,
              background: `linear-gradient(135deg, ${T.gold}, #e8a800)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              RAIDS
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button style={{
            background: 'rgba(255,255,255,0.038)', border: '1px solid rgba(255,255,255,0.13)', color: '#fff',
            padding: '7px 14px', borderRadius: 10, fontSize: '.78rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s'
          }} onClick={() => setShowHelp(true)}>
            <span style={{ fontSize: '1rem' }}>?</span> Help
          </button>
        </div>
      </nav>

      <main style={css.main}>

        
        {phase === 'lobby' && (
          <Section>
            
            <div style={{ textAlign:'center', marginBottom:36 }}>
              <div style={{
                width:80, height:80, borderRadius:20, margin:'0 auto 20px',
                background:`linear-gradient(135deg,${T.gold}22,${T.gold}08)`,
                border:`1px solid ${T.gold}35`,
                display:'flex', alignItems:'center', justifyContent:'center',
                animation:'raid-float 3s ease-in-out infinite',
                boxShadow:`0 0 40px ${T.goldGlow}`,
              }}>
                <SwordsIcon size={36} color={T.gold} />
              </div>
              <h1 style={css.heroTitle}>CHALLENGE RAID</h1>
              <p style={{ color:T.muted, fontSize:14, lineHeight:1.7, maxWidth:280, margin:'0 auto', fontFamily:"'Inter',sans-serif" }}>
                Team up with a buddy. Win 2 of 3 acts to raid a rival guild's castle.
              </p>
            </div>

            
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {Object.values(RAID_TYPES).map(mode => {
                const isChallenge = mode.id === 'challenge';
                const isNormal    = mode.id === 'normal';
                const accentColor = isChallenge ? T.gold : isNormal ? T.blue : T.muted;

                const today = new Date().toISOString().split('T')[0];
                const key = `castle_raid_entries_${today}`;
                const attemptsUsed = isChallenge ? parseInt(localStorage.getItem(key) || '0', 10) : 0;
                const isLimitReached = isChallenge && attemptsUsed >= 3;

                const ModeIcon = isChallenge
                  ? <SwordsIcon size={20} color={accentColor} />
                  : isNormal
                    ? <ShieldIcon size={20} color={accentColor} />
                    : <GlobeIcon size={20} color={accentColor} />;

                return (
                  <button
                    key={mode.id}
                    className="raid-mode-card"
                    onClick={() => !isLimitReached && startSearch(mode.id)}
                    disabled={isLimitReached}
                    style={{
                      opacity: isLimitReached ? 0.5 : 1,
                      cursor: isLimitReached ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isChallenge && (
                      <div style={{ position:'absolute', top:12, right:12, display:'flex', gap:6 }}>
                        <GlowBadge color={isLimitReached ? T.red : T.gold}>
                          {isLimitReached ? 'LIMIT REACHED' : `${attemptsUsed}/3 ATTEMPTS`}
                        </GlowBadge>
                      </div>
                    )}

                    <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{
                        width:44, height:44, borderRadius:12, flexShrink:0,
                        background:`${accentColor}15`, border:`1px solid ${accentColor}30`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {ModeIcon}
                      </div>

                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{
                            fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:700,
                            letterSpacing:1.5, color:accentColor,
                            textShadow: isChallenge ? `0 0 14px ${T.goldGlow}` : 'none',
                          }}>
                            {mode.label}
                          </span>
                        </div>

                        <div style={{ fontSize:13, color:T.muted, fontFamily:"'Inter',sans-serif", marginBottom:6 }}>
                          {mode.id === 'training'
                            ? 'Practice mode — no stakes, no XP'
                            : `Win +${mode.winXP} XP · Loss +${mode.lossXP} XP`}
                        </div>

                        {mode.castleDamagePct > 0 && (
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <ZapIcon size={11} />
                            <span style={{ fontSize:11, color:T.purple, fontFamily:"'Orbitron',sans-serif", fontWeight:600, letterSpacing:.5 }}>
                              {Math.round(mode.castleDamagePct * 100)}% castle damage on win
                            </span>
                          </div>
                        )}
                      </div>

                      <div style={{ color:T.muted2, fontSize:20, alignSelf:'center' }}>›</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        
        {phase === 'searching' && (
          <Section>
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              
              <div style={{ position:'relative', width:120, height:120, margin:'0 auto 28px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    position:'absolute', inset:0, borderRadius:'50%',
                    border:`1px solid ${T.gold}`,
                    opacity: 0.6 - i*0.2,
                    transform:`scale(${1 + i*0.25})`,
                    animation:`raid-pulse ${1.4 + i*.3}s ease-in-out infinite`,
                    animationDelay:`${i*.2}s`,
                  }} />
                ))}
                <div style={{
                  position:'absolute', inset:0, display:'flex',
                  alignItems:'center', justifyContent:'center',
                }}>
                  <SwordsIcon size={44} color={T.gold} />
                </div>
              </div>

              <h2 style={css.searchTitle}>Finding a buddy…</h2>
              <p style={{ color:T.muted, fontSize:13, fontFamily:"'Inter',sans-serif", marginBottom:20 }}>
                Matchmaking in progress
              </p>

              
              <div style={{
                width:200, height:4, background:'rgba(255,255,255,.08)',
                borderRadius:99, margin:'0 auto 10px', overflow:'hidden',
              }}>
                <div style={{
                  height:'100%', borderRadius:99,
                  background:`linear-gradient(90deg,${T.gold},${T.purple})`,
                  width:`${(searchRemaining/BUDDY_TIMEOUT_MS)*100}%`,
                  transition:'width .5s linear',
                }} />
              </div>
              <span style={{
                fontFamily:"'Orbitron',sans-serif", fontSize:12,
                color:T.gold, letterSpacing:1,
              }}>
                {fmtSecs(searchRemaining)}s remaining
              </span>
            </div>
          </Section>
        )}

        
        {phase === 'waiting_teammate' && (
          <Section>
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:20, animation:'raid-float 2s ease-in-out infinite' }}>
                <HourglassIcon size={52} color={T.gold} />
              </div>
              <h2 style={css.searchTitle}>Stage Complete!</h2>
              <p style={{ color:T.muted, fontSize:13, fontFamily:"'Inter',sans-serif", marginTop:8 }}>
                Waiting for your teammate to finish…
              </p>
              <div style={{ marginTop:28, display:'flex', justifyContent:'center' }}>
                <Spinner size={36} />
              </div>
            </div>
          </Section>
        )}

        
        {phase === 'matched' && match && (
          <Section>
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <GlowBadge color={T.green}>Squad Locked</GlowBadge>
              <h2 style={{ ...css.searchTitle, marginTop:12 }}>Ready to raid!</h2>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', marginBottom:24 }}>
              
              <div className="raid-card" style={{ padding:16 }}>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9, letterSpacing:2, color:T.green, marginBottom:12, textTransform:'uppercase' }}>
                  {raidType === 'training' ? 'You' : 'Your Duo'}
                </div>
                {[user, match.buddy].filter(Boolean).sort((a,b) => a.userId.localeCompare(b.userId)).map(p => (
                  <div key={p.userId} className="raid-player-row" style={{ marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{p.flag}</span>
                    <span style={{ fontSize:13, fontFamily:"'Inter',sans-serif", fontWeight:500, color:T.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.nickname}
                    </span>
                    {p.isBot && <GlowBadge color={T.gold}>BOT</GlowBadge>}
                  </div>
                ))}
              </div>

              
              <div style={{
                fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900,
                color:T.muted2, letterSpacing:2, textAlign:'center',
              }}>VS</div>

              
              <div className="raid-card" style={{ padding:16 }}>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9, letterSpacing:2, color:T.red, marginBottom:12, textTransform:'uppercase' }}>
                  Rivals
                </div>
                {match.rivals.map(p => (
                  <div key={p.userId} className="raid-player-row" style={{ marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{p.flag}</span>
                    <span style={{ fontSize:13, fontFamily:"'Inter',sans-serif", fontWeight:500, color:T.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.nickname}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign:'center' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16 }}>
                <Spinner size={22} />
                <span style={{ color:T.muted, fontSize:13, fontFamily:"'Inter',sans-serif" }}>Launching Act 1…</span>
              </div>
              {act1Game && (
                <button className="raid-btn-primary" style={{ width:'100%', padding:16, fontSize:15 }} onClick={() => navigate(act1Game.route)}>
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <SwordsIcon size={16} color="#111" /> Enter Stage 1 — {act1Game.label}
                  </span>
                </button>
              )}
            </div>
          </Section>
        )}

        {phase === 'starting_act2' && (
          <Section>
            <div style={{ textAlign:'center', padding:'60px 0', animation:'ttFadeUp 0.3s ease' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:20, animation:'raid-pulse 1.5s infinite' }}>
                <BoltIcon size={52} color={T.gold} />
              </div>
              <h2 style={css.searchTitle}>Act 2 is starting...</h2>
              <p style={{ color:T.muted, fontSize:14, fontFamily:"'Inter',sans-serif", marginTop:8 }}>
                Get ready for Dribble Gauntlet!
              </p>
            </div>
          </Section>
        )}

        {phase === 'starting_act3' && (
          <Section>
            <div style={{ textAlign:'center', padding:'60px 0', animation:'ttFadeUp 0.3s ease' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:20, animation:'raid-pulse 1.5s infinite' }}>
                <SwordSingleIcon size={52} color={T.red} />
              </div>
              <h2 style={css.searchTitle}>Act 3 is starting...</h2>
              <p style={{ color:T.muted, fontSize:14, fontFamily:"'Inter',sans-serif", marginTop:8 }}>
                The Final Showdown: Penalty Nerve!
              </p>
            </div>
          </Section>
        )}

        
        {phase === 'results' && (
          <Section style={{ position:'relative' }}>
            <ParticleEffect type={outcome === 'win' ? 'win' : 'loss'} />

            
            <div style={{
              position:'relative', zIndex:2, textAlign:'center', padding:'28px 20px',
              border:`2px solid ${outcome==='win' ? T.green : outcome==='loss' ? T.red : T.muted}`,
              borderRadius:20, marginBottom:20,
              background:`linear-gradient(180deg, ${outcome==='win' ? T.green : T.red}12, transparent)`,
              boxShadow:`0 0 40px ${outcome==='win' ? T.greenGlow : T.redGlow}`,
              animation:'raid-glow 2.5s ease-in-out infinite',
              '--glow': outcome==='win' ? T.greenGlow : T.redGlow,
            }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                {outcome==='win'
                  ? <TrophyIcon size={44} color={T.green} />
                  : outcome==='loss'
                    ? <SkullIcon size={44} color={T.red} />
                    : <HandshakeIcon size={44} color={T.purple} />
                }
              </div>
              <div style={{
                fontFamily:"'Orbitron',sans-serif", fontSize:24, fontWeight:900, letterSpacing:3,
                color: outcome==='win' ? T.green : outcome==='loss' ? T.red : T.muted,
                textShadow:`0 0 20px ${outcome==='win' ? T.greenGlow : T.redGlow}`,
              }}>
                {outcome==='win' ? 'RAID VICTORIOUS' : outcome==='loss' ? 'RAID DEFEATED' : 'POINTS DRAWN'}
              </div>

              
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:18 }}>
                {['Act 1','Act 2','Act 3'].map((label,i) => (
                  <div key={i} style={{ textAlign:'center' }}>
                    <div style={{
                      fontFamily:"'Orbitron',sans-serif", fontSize:9,
                      letterSpacing:1.5, color:T.muted2, marginBottom:5,
                      textTransform:'uppercase',
                    }}>{label}</div>
                    <ActBadge winner={actWinners[i]} />
                  </div>
                ))}
              </div>
            </div>

            
            {(() => {
              const yourTotal = standings.filter(p => p.team === 'you').reduce((s,p)=>s+p.total,0);
              const rivalTotal = standings.filter(p => p.team === 'rival').reduce((s,p)=>s+p.total,0);
              const sum = Math.max(1, yourTotal + rivalTotal);
              const yourPct = (yourTotal / sum) * 100;
              return (
                <div className="raid-card" style={{ padding:'18px 20px', marginBottom:16, position:'relative', zIndex:2 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <div>
                      <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:10, letterSpacing:1.5, color:T.gold, textTransform:'uppercase', fontWeight:700 }}>
                        Your Team
                      </div>
                      <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:26, fontWeight:800, color:T.gold, textShadow:`0 0 12px ${T.goldGlow}` }}>
                        {yourTotal}
                      </div>
                    </div>
                    <div style={{ alignSelf:'center', fontFamily:"'Orbitron',sans-serif", fontSize:11, color:T.muted2, fontWeight:700 }}>VS</div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:10, letterSpacing:1.5, color:T.red, textTransform:'uppercase', fontWeight:700 }}>
                        Rivals
                      </div>
                      <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:26, fontWeight:800, color:T.red, textShadow:`0 0 12px ${T.redGlow}` }}>
                        {rivalTotal}
                      </div>
                    </div>
                  </div>
                  <div style={{ height:10, borderRadius:99, overflow:'hidden', background:`${T.red}30`, display:'flex' }}>
                    <div style={{
                      width:`${yourPct}%`, background:`linear-gradient(90deg,${T.gold},#e8a800)`,
                      transition:'width 1s cubic-bezier(.16,1,.3,1)',
                    }} />
                  </div>
                </div>
              );
            })()}

            
            <div className="raid-card" style={{ padding:'18px 20px', marginBottom:16, position:'relative', zIndex:2 }}>
              <div style={{
                fontFamily:"'Orbitron',sans-serif", fontSize:10, letterSpacing:2,
                color:T.purple, textTransform:'uppercase', marginBottom:14, fontWeight:700,
                display:'flex', alignItems:'center', gap:6,
              }}>
                <StarIcon size={12} /> Player Standings
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {standings.map((p, idx) => {
                  const teamColor = p.team === 'you' ? T.green : T.red;
                  // Compute true rank based on ties
                  const trueRank = standings.filter(other => other.total > p.total).length + 1;
                  return (
                    <div key={p.userId || (p.nickname + idx)} className="raid-standing-row" style={{
                      background: p.isUser ? `${T.purple}14` : 'rgba(255,255,255,.02)',
                      border:`1px solid ${p.isUser ? T.purple+'45' : 'rgba(255,255,255,.06)'}`,
                      boxShadow: p.isUser ? `0 0 14px ${T.purpleGlow}` : 'none',
                      alignItems:'center',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{
                          fontFamily:"'Orbitron',sans-serif", fontSize:12, fontWeight:800,
                          color: trueRank===1 ? T.gold : T.muted, minWidth:20, textAlign:'center',
                          position:'relative',
                        }}>
                          {trueRank===1 && (
                            <span style={{ position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)', fontSize:14, animation:'raid-crown-bob 1.8s ease-in-out infinite' }}>👑</span>
                          )}
                          #{trueRank}
                        </span>
                        <span style={{ fontSize:20 }}>{p.flag}</span>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                            <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, color:T.text }}>
                              {p.nickname}
                            </span>
                            {p.isUser && <GlowBadge color={T.purple}>YOU</GlowBadge>}
                            <span style={{ fontSize:9, fontFamily:"'Orbitron',sans-serif", color:teamColor, letterSpacing:1, opacity:0.8 }}>
                              {p.team === 'you' ? '· ALLY' : '· RIVAL'}
                            </span>
                          </div>
                          <div style={{ display:'flex', gap:6, marginTop:5 }}>
                            {[['A1',p.act1],['A2',p.act2],['A3',p.act3]].map(([lbl,val]) => (
                              <span key={lbl} style={{
                                fontSize:10, fontFamily:"'Orbitron',sans-serif", fontWeight:600,
                                color:T.muted, background:'rgba(255,255,255,.05)',
                                border:`1px solid rgba(255,255,255,.08)`, borderRadius:6, padding:'2px 6px',
                              }}>{lbl} {Math.round(val)}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:800,
                        color: idx===0 ? T.gold : T.text,
                        textShadow: idx===0 ? `0 0 10px ${T.goldGlow}` : 'none',
                      }}>
                        {p.total}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            
            {outcome==='win' && !isTraining && raidType==='challenge' && (
              <div style={{ position:'relative', zIndex:2 }}>
                <CastleDamageVisual
                  damagePct={RAID_TYPES[raidType]?.castleDamagePct ?? 0.03}
                  rivalName={match?.rivals?.[0]?.homeCountry}
                />
              </div>
            )}

            
            {!isTraining && (
              <div style={{
                position:'relative', zIndex:2,
                padding:'18px 20px',
                background:'rgba(255,255,255,0.02)', border:`1px solid ${T.border}`,
                borderRadius:16, marginBottom:16,
              }}>
                <div style={{
                  fontFamily:"'Orbitron',sans-serif", fontSize:10, letterSpacing:2,
                  color:T.purple, textTransform:'uppercase', marginBottom:12, fontWeight:700,
                  display:'flex', alignItems:'center', gap:6,
                }}>
                  <ZapIcon size={12} /> XP Rewards Earned
                </div>

                {finalizing ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'10px 0' }}>
                    <Spinner size={20} color={T.green} />
                    <span style={{ color:T.muted, fontSize:13, fontFamily:"'Inter',sans-serif" }}>Calculating XP rewards…</span>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    
                    <div className="raid-player-row" style={{ justifyContent:'space-between' }}>
                      <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:600, color:T.text, display:'flex', alignItems:'center', gap:8 }}>
                        <PersonIcon size={14} color={T.text} /> You ({user.nickname})
                      </span>
                      <span style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, color:T.green }}>
                        +{(finalizeResult?.xpResults?.win?.xpAwarded ?? (outcome === 'win' ? xpPreview.win : outcome === 'draw' ? 100 : xpPreview.loss)) + (finalizeResult?.xpResults?.mvp?.xpAwarded || 0)} XP
                        {finalizeResult?.xpResults?.mvp?.xpAwarded > 0 && <span style={{ fontSize:9, color:T.gold, marginLeft:4 }}>👑 MVP</span>}
                      </span>
                    </div>

                    
                    {!isTraining && match?.buddy && match.buddy.userId !== user.userId && (
                      <div className="raid-player-row" style={{ justifyContent:'space-between' }}>
                        <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:600, color:T.muted, display:'flex', alignItems:'center', gap:8 }}>
                          <HandshakeIcon size={14} color={T.muted} /> {match?.buddy?.nickname || 'Buddy'}
                        </span>
                        <span style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, color:T.green }}>
                          +{(outcome === 'win' ? xpPreview.win : outcome === 'draw' ? 100 : xpPreview.loss) + (finalizeResult?.isBuddyMvp ? 50 : 0)} XP
                          {finalizeResult?.isBuddyMvp && <span style={{ fontSize:9, color:T.gold, marginLeft:4 }}>👑 MVP</span>}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isTraining && (
              <p style={{ color:T.muted, textAlign:'center', fontSize:13, fontFamily:"'Inter',sans-serif", marginBottom:16, position:'relative', zIndex:2 }}>
                Training mode — no XP awarded
              </p>
            )}

            {finalizeResult?.serverResult?.curseLifted && (
              <div style={{
                position:'relative', zIndex:2,
                textAlign:'center', padding:14,
                background:`${T.gold}0f`, border:`1px solid ${T.gold}35`,
                borderRadius:14, color:T.gold, marginBottom:16,
                fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                <TrophyIcon size={18} color={T.gold} />
                Curse lifted! 3 raid wins achieved
              </div>
            )}

            <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:10 }}>
              <button className="raid-btn-primary" style={{ width:'100%', padding:16, fontSize:15 }} onClick={() => navigate('/guild')}>
                Back to Guild Castle
              </button>
              <button className="raid-btn-ghost" style={{ width:'100%', padding:14, fontSize:14 }} onClick={() => { setPhase('lobby'); setActs({}); setActWinners([]); setOutcome(null); setMatch(null); }}>
                Raid Again
              </button>
            </div>
          </Section>
        )}

      </main>

      
      <nav className="raid-bottom-nav">
        {[
          { id: "home",  label: "Games", IconC: BallIcon,   route: "/" },
          { id: "guild", label: "Guild", IconC: ShieldIcon, route: "/guild" },
          { id: "ranks", label: "Ranks", IconC: RankIcon,   route: "/ranks" },
          { id: "me",    label: "Profile", IconC: PersonIcon, route: "/profile" },
        ].map(item => {
          const active = false;
          const NavIcon = item.IconC;
          return (
            <button key={item.id} className="raid-nav-item" onClick={() => {
              if (item.route) navigate(item.route);
              else { setToast("Coming soon ⚡"); setTimeout(() => setToast(""), 2000); }
            }}
              style={{ color:active?"#4F8EF7":"rgba(242,242,244,0.38)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              {active && <span className="raid-nav-indicator"/>}
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
                <NavIcon size={18} color={active?"#4F8EF7":"rgba(242,242,244,0.38)"} />
              </span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {toast && (
        <div style={{ position:"fixed", bottom:76, left:"50%", transform:"translateX(-50%)", zIndex:300, background:"rgba(12,15,26,0.96)", border:"1px solid var(--border2)", borderRadius:999, color:"var(--text)", padding:"10px 18px", fontFamily:"'Space Mono',monospace", fontSize:"0.76rem", fontWeight:700, whiteSpace:"nowrap", pointerEvents:"none", animation:"fadeUp 0.22s ease" }}>
          {toast}
        </div>
      )}

      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}


const css = {
  page: {
    minHeight:'100vh',
    background:T.bg,
    color:T.text,
    fontFamily:"'Inter',sans-serif",
    paddingBottom:60,
  },
  nav: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'0 20px', height:60,
    borderBottom:`1px solid ${T.border}`,
    background:'rgba(4,6,15,0.85)', backdropFilter:'blur(24px)',
    position:'sticky', top:0, zIndex:100,
  },
  logo: {
    fontFamily:"'Orbitron',sans-serif", fontSize:'1.1rem',
    fontWeight:900, letterSpacing:4, color:T.gold,
    textShadow:`0 0 16px ${T.goldGlow}`,
  },
  main: {
    maxWidth:520, margin:'0 auto', padding:'28px 20px',
    position:'relative', zIndex:1,
  },
  heroTitle: {
    fontFamily:"'Orbitron',sans-serif", fontSize:'1.8rem', fontWeight:900,
    letterSpacing:4, margin:'0 0 12px', color:T.text,
    textShadow:`0 0 24px rgba(240,242,255,.15)`,
  },
  searchTitle: {
    fontFamily:"'Orbitron',sans-serif", fontSize:'1.4rem', fontWeight:700,
    letterSpacing:2, margin:'0 0 8px', color:T.text,
  },
};


function HelpModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(5,7,15,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div style={{
        background: '#0c0f1a', border: `1px solid ${T.gold}40`,
        borderRadius: 20, width: '100%', maxWidth: 500,
        maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.3s ease-out',
        position: 'relative', padding: 24,
      }} className="help-modal-content">
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)',
          border: 'none', borderRadius: '50%', width: 32, height: 32,
          color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>✕</button>

        <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 24, color: T.gold, marginBottom: 20, textAlign: 'center' }}>
          Guild Raids Intel
        </h2>

        
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, color: T.text, marginBottom: 12, borderBottom: `1px solid ${T.border2}`, paddingBottom: 6 }}>
            1. Raid Types
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, border: `1px solid ${T.border2}` }}>
              <strong style={{ color: T.text, display: 'block', marginBottom: 4 }}>Training Raids (Practice)</strong>
              <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                Practice mode with bots. No stakes, no XP, and no entries consumed. Perfect for mastering the mini-games and testing strategies.
              </span>
            </div>
            <div style={{ background: 'rgba(79,142,247,0.05)', padding: 12, borderRadius: 12, border: `1px solid rgba(79,142,247,0.3)` }}>
              <strong style={{ color: T.blue, display: 'block', marginBottom: 4 }}>Normal Raids (Free)</strong>
              <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                Raid lower tier castles for basic resources. Unlimited entries, great for warming up and grinding base XP for your guild.
              </span>
            </div>
            <div style={{ background: 'rgba(247,195,68,0.05)', padding: 12, borderRadius: 12, border: `1px solid ${T.gold}40` }}>
              <strong style={{ color: T.gold, display: 'block', marginBottom: 4 }}>Challenge Raids (Costly)</strong>
              <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                Costs 1 Entry (max 3/day). Target high-tier enemy castles for massive XP multipliers. Requires strategic plays and perfect communication.
              </span>
            </div>
          </div>
        </section>

        
        <section style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(247,195,68,0.1)', border: `1px solid ${T.gold}`, borderRadius: 16, padding: '12px 20px' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>👑</div>
            <strong style={{ color: T.gold, fontSize: 14 }}>MVP Title</strong>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              Outscore your buddy to claim the MVP crown and earn bonus standing!
            </div>
          </div>
        </section>

        
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, color: T.text, marginBottom: 12, borderBottom: `1px solid ${T.border2}`, paddingBottom: 6 }}>
            2. How To Raid
          </h3>
          <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li><strong>Act 1 (Mini-Game):</strong> Compete in a quick reflex challenge. Your combined score determines base damage.</li>
            <li><strong>Act 2 (Matchups):</strong> Face defenders in a 1v1 duel. Pick the correct stat advantage to break their guard.</li>
            <li><strong>Act 3 (Siege):</strong> The final push! Complete the puzzle or timing challenge to unleash your ultimate combo on the castle.</li>
            <li><strong>Synergy:</strong> If you and your buddy perfectly sync during Acts, you'll trigger a damage multiplier!</li>
          </ul>
        </section>
        
        
        <button className="raid-btn-primary" style={{ width: '100%', padding: 14 }} onClick={onClose}>
          Understood, Commander
        </button>
      </div>

      <style>{`
        .help-modal-content::-webkit-scrollbar { width: 6px; }
        .help-modal-content::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 8px; }
        .help-modal-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 8px; }
      `}</style>
    </div>
  );
}
