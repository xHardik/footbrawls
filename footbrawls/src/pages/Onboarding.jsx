// src/pages/Onboarding.jsx
// 3-step onboarding: Nickname → Home Country → Support Team

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, getUser } from '../lib/user';
import { COUNTRIES, WC_2026_TEAMS } from '../lib/countries';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#060810',
  border:  'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',
  accent:  '#F7C344',
  green:   '#3DD68C',
  blue:    '#4F8EF7',
  red:     '#E84040',
  text:    '#F2F2F4',
  muted:   'rgba(242,242,244,0.5)',
  muted2:  'rgba(242,242,244,0.28)',
};

// ─── Google fonts ─────────────────────────────────────────────────────────────
function injectFonts() {
  if (document.getElementById('fb-ob-fonts')) return;
  const l = document.createElement('link');
  l.id = 'fb-ob-fonts';
  l.rel = 'stylesheet';
  l.href =
    'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap';
  document.head.appendChild(l);
}

// ─── Injected CSS (no class collisions with other pages) ──────────────────────
const CSS = `
@font-face {
  font-family: "TwemojiFlags";
  src: url("https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1.3/dist/CountryFlagEmojiPolyfill.ttf") format("truetype");
}
.ob-root *, .ob-root *::before, .ob-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.ob-root { font-family: "TwemojiFlags","Syne","Segoe UI",sans-serif; }
@keyframes ob-in   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes ob-pop  { from{opacity:0;transform:scale(.94)}        to{opacity:1;transform:scale(1)} }
@keyframes ob-grid { 0%,100%{opacity:.28} 50%{opacity:.5} }
@keyframes ob-shim { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }

/* step animation */
.ob-step-content { animation: ob-in .36s ease both; }

/* hover states */
.ob-item:hover        { background:rgba(255,255,255,.055)!important; border-color:rgba(247,195,68,.28)!important; }
.ob-item.ob-sel       { background:rgba(247,195,68,.08)!important;  border-color:rgba(247,195,68,.42)!important; }
.ob-cta:hover:not(:disabled) { opacity:.92; transform:translateY(-1px); box-shadow:0 0 38px rgba(247,195,68,.32)!important; }
.ob-back:hover        { color:rgba(242,242,244,.65)!important; }

/* scrollbar */
.ob-list::-webkit-scrollbar          { width:3px; }
.ob-list::-webkit-scrollbar-track    { background:transparent; }
.ob-list::-webkit-scrollbar-thumb    { background:rgba(255,255,255,.08); border-radius:99px; }
`;

// ─── SVG icon kit ─────────────────────────────────────────────────────────────
const Ic = {
  Person: (p={}) => (
    <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20v-1a8 8 0 0116 0v1"/>
    </svg>
  ),
  Globe: (p={}) => (
    <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
    </svg>
  ),
  Trophy: (p={}) => (
    <svg width={p.s||22} height={p.s||22} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 2h12v8a6 6 0 01-12 0V2z"/>
      <path d="M6 5H3a1 1 0 00-1 1v2a4 4 0 004 4M18 5h3a1 1 0 011 1v2a4 4 0 01-4 4"/>
      <path d="M12 16v4M8 20h8"/>
    </svg>
  ),
  Check: (p={}) => (
    <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="3" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  ChevR: (p={}) => (
    <svg width={p.s||13} height={p.s||13} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
  ArrR: (p={}) => (
    <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
  ArrL: (p={}) => (
    <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  Warn: (p={}) => (
    <svg width={p.s||13} height={p.s||13} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  ),
  Search: (p={}) => (
    <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  Star: (p={}) => (
    <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24"
      fill={p.c||'currentColor'} fillOpacity=".75" stroke={p.c||'currentColor'} strokeWidth="1.2">
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18.1l-6.2 3 1.2-6.9-5-4.9 6.9-1z"/>
    </svg>
  ),
  Users: (p={}) => (
    <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24" fill="none"
      stroke={p.c||'currentColor'} strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  Zap: (p={}) => (
    <svg width={p.s||14} height={p.s||14} viewBox="0 0 24 24"
      fill={p.c||'currentColor'} fillOpacity=".9">
      <path d="M13 2L3 14h9l-1 8 10-12h-9z"/>
    </svg>
  ),
  Lightning: (p={}) => (
    <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24"
      fill={p.c||'currentColor'} fillOpacity=".3"
      stroke={p.c||'currentColor'} strokeWidth="1.5" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9z"/>
    </svg>
  ),
};

// ─── Footballer silhouette ────────────────────────────────────────────────────
function Silhouette() {
  return (
    <div style={{
      position: 'fixed', right: 0, bottom: 0,
      width: 280, height: 440,
      zIndex: 1, pointerEvents: 'none',
    }}>
      {/* warm glow behind figure */}
      <div style={{
        position: 'absolute', right: -20, bottom: -20,
        width: 320, height: 360, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 60% 80%, rgba(247,195,68,.1) 0%, transparent 60%)',
        filter: 'blur(28px)',
      }}/>
      <svg viewBox="0 0 280 440" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', bottom: 0, right: 0, width: '100%', height: '100%', opacity: .15 }}>
        {/* head */}
        <ellipse cx="164" cy="46" rx="22" ry="24" fill="#F7C344"/>
        {/* neck */}
        <rect x="156" y="67" width="13" height="15" rx="4" fill="#F7C344"/>
        {/* torso */}
        <path d="M128 84C121 86 114 103 112 126L116 180L154 187L192 178L196 124C194 101 186 85 179 84L164 80L151 79Z" fill="#F7C344"/>
        {/* left arm raised */}
        <path d="M128 91C115 87 97 76 86 63C80 56 78 50 82 46C86 42 92 45 97 51L120 84Z" fill="#F7C344"/>
        {/* right arm */}
        <path d="M179 91C192 95 209 105 219 118C225 126 223 134 217 136C211 138 205 132 199 124L183 95Z" fill="#F7C344"/>
        {/* left leg planted */}
        <path d="M120 178C116 199 112 237 110 270L125 271L138 236L145 200Z" fill="#F7C344"/>
        {/* left boot */}
        <path d="M108 269C102 270 93 275 89 282C87 288 91 292 99 292L132 289L132 269Z" fill="#F7C344"/>
        {/* right leg raised for kick */}
        <path d="M163 178C169 199 180 235 195 258L209 251L192 223L181 193Z" fill="#F7C344"/>
        {/* right shin */}
        <path d="M193 255C205 271 220 286 230 298L240 288L222 275L207 249Z" fill="#F7C344"/>
        {/* right boot */}
        <path d="M228 298C223 308 219 317 223 324C227 329 238 329 247 322C255 316 257 308 251 303L241 291Z" fill="#F7C344"/>
        {/* ball */}
        <circle cx="74" cy="318" r="29" fill="none" stroke="#F7C344" strokeWidth="2" opacity=".6"/>
        <path d="M74 289C79 297 82 308 74 315C66 308 69 297 74 289Z" fill="#F7C344" opacity=".4"/>
        <path d="M45 305L56 312L55 322L45 325" stroke="#F7C344" strokeWidth="1.5" fill="none" opacity=".4"/>
        <path d="M103 305L92 312L93 322L103 325" stroke="#F7C344" strokeWidth="1.5" fill="none" opacity=".4"/>
        {/* ground shadow */}
        <ellipse cx="100" cy="350" rx="60" ry="7" fill="#F7C344" opacity=".05"/>
        {/* motion lines */}
        <line x1="240" y1="272" x2="268" y2="255" stroke="#F7C344" strokeWidth="1.3" opacity=".2" strokeDasharray="4 7"/>
        <line x1="234" y1="285" x2="265" y2="274" stroke="#F7C344" strokeWidth=".9" opacity=".14" strokeDasharray="3 8"/>
      </svg>
    </div>
  );
}

// ─── Goalkeeper silhouette ───────────────────────────────────────────────────
function GoalkeeperSilhouette() {
  return (
    <div style={{
      position: 'fixed', left: 0, bottom: 0,
      width: 280, height: 440,
      zIndex: 1, pointerEvents: 'none',
    }}>
      {/* cool glow behind figure */}
      <div style={{
        position: 'absolute', left: -20, bottom: -20,
        width: 320, height: 360, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 40% 80%, rgba(61,214,140,.1) 0%, transparent 60%)',
        filter: 'blur(28px)',
      }}/>
      <svg viewBox="0 0 280 440" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', opacity: .15 }}>
        {/* head */}
        <ellipse cx="116" cy="116" rx="21" ry="23" fill="#F7C344"/>
        {/* neck */}
        <rect x="111" y="137" width="10" height="15" rx="3" fill="#F7C344"/>
        {/* torso */}
        <path d="M96 150 C96 150 136 140 136 140 C136 140 176 150 176 150 L166 220 L136 225 L106 220 Z" fill="#F7C344"/>
        {/* left arm (reaching far left and slightly up) */}
        <path d="M96 155 C70 145 40 135 15 130 C8 128 3 124 5 118 C8 112 17 114 26 118 L86 145 Z" fill="#F7C344"/>
        {/* right arm (reaching far right and slightly up) */}
        <path d="M176 155 C202 145 232 135 257 130 C264 128 269 124 267 118 C264 112 255 114 246 118 L186 145 Z" fill="#F7C344"/>
        {/* left hand */}
        <ellipse cx="10" cy="125" rx="8" ry="12" fill="#F7C344"/>
        {/* right hand */}
        <ellipse cx="262" cy="125" rx="8" ry="12" fill="#F7C344"/>
        {/* left leg */}
        <path d="M106 220 C96 245 80 280 70 310 C66 316 68 322 75 324 C82 326 90 320 94 312 L121 240 Z" fill="#F7C344"/>
        {/* right leg */}
        <path d="M166 220 C176 245 192 280 202 310 C206 316 204 322 197 324 C190 326 182 320 178 312 L151 240 Z" fill="#F7C344"/>
        {/* ball */}
        <circle cx="136" cy="50" r="24" fill="none" stroke="#F7C344" strokeWidth="2" opacity=".6"/>
        <path d="M136 26C141 34 144 45 136 52C128 45 131 34 136 26Z" fill="#F7C344" opacity=".4"/>
        {/* motion lines */}
        <line x1="40" y1="272" x2="68" y2="255" stroke="#F7C344" strokeWidth="1.3" opacity=".2" strokeDasharray="4 7"/>
        <line x1="34" y1="285" x2="65" y2="274" stroke="#F7C344" strokeWidth=".9" opacity=".14" strokeDasharray="3 8"/>
      </svg>
    </div>
  );
}

// ─── Stadium BG ───────────────────────────────────────────────────────────────

function StadiumBg() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 140% 90% at 50% -10%, rgba(12,20,40,.98) 0%, ${C.bg} 55%)` }}/>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.5) 15%,rgba(0,0,0,.5) 85%,transparent 100%)',
        animation: 'ob-grid 7s ease-in-out infinite',
      }}/>
      <div style={{ position: 'absolute', width: 700, height: 400, top: -160, left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(247,195,68,.11) 0%,transparent 65%)', filter: 'blur(55px)' }}/>
      <div style={{ position: 'absolute', width: 450, height: 320, bottom: -80, right: -60, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(79,142,247,.07) 0%,transparent 70%)', filter: 'blur(60px)' }}/>
      <div style={{ position: 'absolute', width: 350, height: 280, bottom: -60, left: -40, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(61,214,140,.05) 0%,transparent 70%)', filter: 'blur(55px)' }}/>
    </div>
  );
}

// ─── Progress rail ────────────────────────────────────────────────────────────
function Rail({ step }) {
  const nodes = [
    { n: 1, lbl: 'Nickname', icon: <Ic.Person s={15} c="currentColor"/> },
    { n: 2, lbl: 'Nation',   icon: <Ic.Globe  s={15} c="currentColor"/> },
    { n: 3, lbl: 'Team',     icon: <Ic.Trophy s={15} c="currentColor"/> },
  ];
  return (
    <div style={{ width: '100%', maxWidth: 500, padding: '22px 20px 0', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {nodes.map((node, i) => (
          <div key={node.n} style={{ display: 'contents' }}>
            {/* node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid', transition: 'all .3s ease', position: 'relative', zIndex: 2,
                ...(node.n < step
                  ? { background: C.green,  borderColor: C.green,  color: C.bg    }
                  : node.n === step
                    ? { background: 'rgba(247,195,68,.12)', borderColor: C.accent, color: C.accent, boxShadow: '0 0 20px rgba(247,195,68,.28)' }
                    : { background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.13)', color: C.muted2 }),
              }}>
                {node.n < step ? <Ic.Check s={15} c={C.bg}/> : node.icon}
              </div>
              <span style={{
                fontFamily: "'Space Mono',monospace", fontSize: '.44rem',
                fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                color: node.n < step ? C.green : node.n === step ? C.accent : C.muted2,
                transition: 'color .3s',
              }}>{node.lbl}</span>
            </div>
            {/* connector */}
            {i < 2 && (
              <div style={{
                flex: 2, height: 2, position: 'relative', top: -14, borderRadius: 2, overflow: 'hidden',
                background: node.n < step
                  ? `linear-gradient(90deg,${C.green},rgba(61,214,140,.3))`
                  : 'rgba(255,255,255,.07)',
                transition: 'background .4s ease',
              }}>
                {node.n < step && (
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent)', animation: 'ob-shim 2.2s ease-in-out infinite' }}/>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step hero ────────────────────────────────────────────────────────────────
function Hero({ icon, rgb, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 36 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, flexShrink: 0,
        background: `rgba(${rgb},.08)`, border: `1.5px solid rgba(${rgb},.28)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 20px rgba(${rgb},.1)`,
      }}>{icon}</div>
      <div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.5rem', letterSpacing: 2, lineHeight: 1, color: C.text, marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: '0.95rem', color: C.muted, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: sub }}/>
      </div>
    </div>
  );
}

// ─── Bullet row ───────────────────────────────────────────────────────────────
function Bullet({ icon, ibg, iborder, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(255,255,255,.025)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: ibg, border: `1px solid ${iborder}` }}>{icon}</div>
      <span style={{ fontSize: '0.9rem', color: C.muted, lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: text }}/>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function Stat({ num, label, color, bg, border }) {
  return (
    <div style={{ padding: '16px 20px', background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', letterSpacing: 2, color, lineHeight: 1 }}>{num}</div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: '.44rem', fontWeight: 700, letterSpacing: .8, textTransform: 'uppercase', color: C.muted2, marginTop: 5, lineHeight: 1.5 }}>{label}</div>
    </div>
  );
}

// ─── Text input ───────────────────────────────────────────────────────────────
function TxtInput({ value, onChange, onKeyDown, placeholder, maxLength, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', marginBottom: 20 }}>
      <input
        value={value} onChange={onChange} onKeyDown={onKeyDown}
        placeholder={placeholder} maxLength={maxLength} autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '18px 52px 18px 20px',
          background: focused ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.05)',
          border: `1.5px solid ${focused ? 'rgba(247,195,68,.5)' : 'rgba(255,255,255,.1)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(247,195,68,.07)' : 'none',
          borderRadius: 13, color: C.text,
          fontFamily: "'Syne',sans-serif", fontSize: '1rem', fontWeight: 600,
          letterSpacing: .5, outline: 'none', transition: 'all .2s',
        }}
      />
      {maxLength && (
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: "'Space Mono',monospace", fontSize: '.52rem', fontWeight: 700, color: value.length > maxLength - 4 ? C.accent : C.muted2 }}>
          {maxLength - value.length}
        </span>
      )}
    </div>
  );
}

// ─── Search input ─────────────────────────────────────────────────────────────
function SrchInput({ value, onChange, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: .35, pointerEvents: 'none' }}>
        <Ic.Search s={14} c={C.text}/>
      </div>
      <input
        value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '14px 18px 14px 44px',
          background: focused ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.05)',
          border: `1.5px solid ${focused ? 'rgba(247,195,68,.38)' : 'rgba(255,255,255,.08)'}`,
          borderRadius: 11, color: C.text,
          fontFamily: "'Syne',sans-serif", fontSize: '1rem',
          outline: 'none', transition: 'all .2s',
        }}
      />
    </div>
  );
}

// ─── Country item ─────────────────────────────────────────────────────────────
function Item({ country, selected, onClick }) {
  return (
    <button
      className={`ob-item${selected ? ' ob-sel' : ''}`}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '14px 18px',
        background: selected ? 'rgba(247,195,68,.08)' : 'rgba(255,255,255,.025)',
        border: `1px solid ${selected ? 'rgba(247,195,68,.42)' : C.border2}`,
        borderRadius: 10, cursor: 'pointer', color: C.text,
        fontFamily: "'Syne',sans-serif", fontSize: '1rem', fontWeight: 600,
        textAlign: 'left', width: '100%', transition: 'all .15s',
      }}
    >
      <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{country.flag}</span>
      <span style={{ flex: 1 }}>{country.name}</span>
      {selected ? <Ic.Check s={14} c={C.accent}/> : <Ic.ChevR s={13} c={C.muted2}/>}
    </button>
  );
}

// ─── CTA button ───────────────────────────────────────────────────────────────
function CTA({ children, onClick, disabled, loading }) {
  return (
    <button
      className="ob-cta"
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        width: '100%', padding: '20px', border: 'none', borderRadius: 13,
        fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.25rem', letterSpacing: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .2s', marginTop: 20,
        background: disabled ? 'rgba(255,255,255,.07)' : C.accent,
        color: disabled ? C.muted2 : C.bg,
        boxShadow: disabled ? 'none' : '0 0 28px rgba(247,195,68,.2)',
      }}
    >
      {loading ? 'Setting up…' : children}
    </button>
  );
}

// ─── Error line ───────────────────────────────────────────────────────────────
function Err({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.red, fontFamily: "'Space Mono',monospace", fontSize: '.65rem', marginBottom: 10 }}>
      <Ic.Warn s={13} c={C.red}/>{msg}
    </div>
  );
}

// ─── WC country list ──────────────────────────────────────────────────────────
const WC_COUNTRIES = (COUNTRIES || []).filter(c => (WC_2026_TEAMS || []).includes(c.code));

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);
  const [nick, setNick]     = useState(() => 'Player_' + (Math.floor(Math.random() * 90000) + 10000));
  const [home, setHome]     = useState(null);
  const [team, setTeam]     = useState(null);
  const [loading, setLoad]  = useState(false);
  const [err, setErr]       = useState('');
  const [cSrch, setCSrch]   = useState('');
  const [tSrch, setTSrch]   = useState('');

  useEffect(() => { injectFonts(); }, []);

  if (getUser()) { navigate('/'); return null; }

  const filtC = (COUNTRIES || []).filter(c => c.name.toLowerCase().includes(cSrch.toLowerCase()));
  const filtT = WC_COUNTRIES.filter(c => c.name.toLowerCase().includes(tSrch.toLowerCase()));

  function goStep1Next() {
    const t = nick.trim();
    if (!t)          return setErr('Enter a nickname');
    if (t.length < 2) return setErr('Too short — at least 2 characters');
    if (t.length > 20) return setErr('Too long — max 20 characters');
    setErr(''); setCSrch(''); setStep(2);
  }

  function pickCountry(c) { setHome(c); setTSrch(''); setStep(3); }

  async function finish() {
    if (!team) return setErr('Pick a support team');
    setLoad(true);
    try {
      await createUser({ nickname: nick.trim(), homeCountry: home.code, supportTeam: team.code, flag: home.flag });
      navigate('/');
    } catch {
      setErr('Something went wrong. Try again.'); setLoad(false);
    }
  }

  return (
    <div className="ob-root" style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 64px', position: 'relative', overflowX: 'hidden' }}>
      {/* inject CSS once */}
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>

      <StadiumBg/>
      <Silhouette/>
      <GoalkeeperSilhouette/>

      {/* ── nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70, background: 'rgba(6,8,16,.85)', backdropFilter: 'blur(28px)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 32px', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(247,195,68,.75) 30%,rgba(255,220,100,.9) 50%,rgba(247,195,68,.75) 70%,transparent)' }}/>
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.5rem', letterSpacing: 4, background: 'linear-gradient(110deg,#ffe680,#F7C344 40%,#ffaa00 65%,#F7C344)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>FOOTBRAWLS</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.5rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.muted2 }}>Step {step} / 3</span>
      </nav>

      {/* ── rail ── */}
      <Rail step={step}/>

      {/* ── content — key forces remount + animation on step change ── */}
      <div
        key={'step-' + step}
        className="ob-step-content"
        style={{ width: '100%', maxWidth: 550, marginTop: 40, position: 'relative', zIndex: 5, padding: '0 20px', boxSizing: 'border-box' }}
      >

        {/* ════ STEP 1 ════ */}
        {step === 1 && (
          <div>
            <Hero
              icon={<Ic.Person s={22} c={C.accent}/>}
              rgb="247,195,68"
              title="Your Name"
              sub={`How the world will know you in every fortress, every raid, every leaderboard. <strong style="color:#F7C344">Choose wisely.</strong>`}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              <Bullet
                icon={<Ic.Star  s={14} c={C.accent}/>}
                ibg="rgba(247,195,68,.08)" iborder="rgba(247,195,68,.22)"
                text={`Appears on the <strong style="color:#F2F2F4">global leaderboard</strong> and pinned to your guild's fortress`}
              />
              <Bullet
                icon={<Ic.Users s={14} c={C.green}/>}
                ibg="rgba(61,214,140,.08)" iborder="rgba(61,214,140,.22)"
                text={`Shown in <strong style="color:#F2F2F4">World Chat</strong> and every guild-vs-guild raid`}
              />
              <Bullet
                icon={<Ic.Zap   s={14} c={C.blue}/>}
                ibg="rgba(79,142,247,.08)" iborder="rgba(79,142,247,.22)"
                text={`Tied to your <strong style="color:#F2F2F4">XP rank</strong> — climb from Lurker all the way to Legend`}
              />
            </div>

            <TxtInput
              value={nick}
              onChange={e => { setNick(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && goStep1Next()}
              placeholder="e.g. GoalMachine99"
              maxLength={20}
              autoFocus
            />

            {nick.trim().length >= 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'rgba(247,195,68,.05)', border: '1px solid rgba(247,195,68,.18)', borderRadius: 10, marginBottom: 20, animation: 'ob-pop .35s ease' }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.46rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(247,195,68,.55)' }}>Preview</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.15rem', letterSpacing: 2, color: C.accent }}>{nick.trim().toUpperCase()}</span>
              </div>
            )}

            <Err msg={err}/>
            <CTA onClick={goStep1Next}><Ic.ArrR s={16} c={C.bg}/>CONTINUE</CTA>
          </div>
        )}

        {/* ════ STEP 2 ════ */}
        {step === 2 && (
          <div>
            <Hero
              icon={<Ic.Globe s={22} c={C.blue}/>}
              rgb="79,142,247"
              title="Your Nation"
              sub={`Your home flag. Every XP you earn — <strong style="color:#F7C344">80% flows into your nation's fortress</strong>, building its walls against raiders.`}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <Stat
                num="80%" label="Fortress XP — strengthens your nation's castle every day"
                color={C.accent} bg="rgba(247,195,68,.06)" border="rgba(247,195,68,.18)"
              />
              <Stat
                num="20%" label="Support team XP — goes to your WC 2026 pick in step 3"
                color={C.blue} bg="rgba(79,142,247,.06)" border="rgba(79,142,247,.18)"
              />
            </div>

            <SrchInput value={cSrch} onChange={e => setCSrch(e.target.value)} placeholder="Search your country…" autoFocus/>

            <div className="ob-list" style={{ maxHeight: 268, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {filtC.slice(0, 200).map(c => (
                <Item key={c.code} country={c} selected={false} onClick={() => pickCountry(c)}/>
              ))}
              {filtC.length === 0 && <p style={{ color: C.muted, fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>No countries found</p>}
            </div>
          </div>
        )}

        {/* ════ STEP 3 ════ */}
        {step === 3 && (
          <div>
            <Hero
              icon={<Ic.Trophy s={22} c={C.green}/>}
              rgb="61,214,140"
              title="Pick a Side"
              sub={`Any WC 2026 qualifier. <strong style="color:#4F8EF7">20% of your daily XP</strong> goes directly to their castle — pick the team you bleed for.`}
            />

            {/* home nation reminder */}
            {home && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(247,195,68,.05)', border: '1px solid rgba(247,195,68,.14)', borderRadius: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.46rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(247,195,68,.5)' }}>Home</span>
                <span style={{ fontSize: '1.25rem' }}>{home.flag}</span>
                <span style={{ fontSize: '.85rem', fontWeight: 600, color: C.text }}>{home.name}</span>
              </div>
            )}

            {/* quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 14 }}>
              {[
                { n: '9',   l: 'Daily\nGames',    c: C.accent },
                { n: '250', l: 'Max XP\nper Day',  c: C.green  },
                { n: '48',  l: 'WC 2026\nNations', c: C.blue   },
              ].map(s => (
                <div key={s.l} style={{ padding: 10, background: 'rgba(255,255,255,.03)', border: `1px solid ${C.border}`, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.45rem', letterSpacing: 1, color: s.c, lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: '.38rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .7, color: C.muted2, marginTop: 3, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <SrchInput value={tSrch} onChange={e => setTSrch(e.target.value)} placeholder="Search WC 2026 nation…" autoFocus/>

            <div className="ob-list" style={{ maxHeight: 244, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 20 }}>
              {filtT.map(c => (
                <Item key={c.code} country={c} selected={team?.code === c.code} onClick={() => { setTeam(c); setErr(''); }}/>
              ))}
              {filtT.length === 0 && <p style={{ color: C.muted, fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>No teams found</p>}
            </div>

            <Err msg={err}/>
            <CTA onClick={finish} disabled={!team} loading={loading}>
              <Ic.Lightning s={16} c={C.bg}/>LET'S GO
            </CTA>

            <button
              className="ob-back"
              onClick={() => { setStep(2); setTSrch(''); setTeam(null); }}
              style={{ background: 'none', border: 'none', color: C.muted2, fontSize: '0.95rem', fontFamily: "'Syne',sans-serif", cursor: 'pointer', padding: '10px 0', marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, transition: 'color .2s' }}
            >
              <Ic.ArrL s={14} c="currentColor"/>Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}