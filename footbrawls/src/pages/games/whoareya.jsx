// src/pages/games/WhoAreYa.jsx
// Football "Who Are Ya?" — guess the mystery WC 2026 player
// UI updated to match Home.jsx / Guild.jsx design system

import { useState, useEffect, useRef } from 'react';
import { getDailyPlayer } from '../../lib/dailySeed.js';
import { awardXP } from '../../lib/xpEngine.js';
import { getUser } from '../../lib/user';

// ─── Player Database (WC 2026 players) ────────────────────────────────────────
const PLAYER_DB = [
  { name:'Lionel Messi',      country:'Argentina', countryCode:'ARG', position:'Forward',    club:'Inter Miami',      age:36, foot:'Left',  flag:'🇦🇷' },
  { name:'Lautaro Martinez',  country:'Argentina', countryCode:'ARG', position:'Forward',    club:'Inter Milan',      age:26, foot:'Right', flag:'🇦🇷' },
  { name:'Emiliano Martinez', country:'Argentina', countryCode:'ARG', position:'Goalkeeper', club:'Aston Villa',      age:31, foot:'Right', flag:'🇦🇷' },
  { name:'Kylian Mbappe',     country:'France',    countryCode:'FRA', position:'Forward',    club:'Real Madrid',      age:25, foot:'Right', flag:'🇫🇷' },
  { name:'Antoine Griezmann', country:'France',    countryCode:'FRA', position:'Forward',    club:'Atletico Madrid',  age:32, foot:'Left',  flag:'🇫🇷' },
  { name:'Aurelien Tchouameni',country:'France',   countryCode:'FRA', position:'Midfielder', club:'Real Madrid',      age:24, foot:'Right', flag:'🇫🇷' },
  { name:'Erling Haaland',    country:'Norway',    countryCode:'NOR', position:'Forward',    club:'Man City',         age:23, foot:'Left',  flag:'🇳🇴' },
  { name:'Vinicius Jr',       country:'Brazil',    countryCode:'BRA', position:'Forward',    club:'Real Madrid',      age:23, foot:'Right', flag:'🇧🇷' },
  { name:'Rodrygo',           country:'Brazil',    countryCode:'BRA', position:'Forward',    club:'Real Madrid',      age:23, foot:'Right', flag:'🇧🇷' },
  { name:'Alisson',           country:'Brazil',    countryCode:'BRA', position:'Goalkeeper', club:'Liverpool',        age:31, foot:'Right', flag:'🇧🇷' },
  { name:'Marquinhos',        country:'Brazil',    countryCode:'BRA', position:'Defender',   club:'PSG',              age:29, foot:'Right', flag:'🇧🇷' },
  { name:'Casemiro',          country:'Brazil',    countryCode:'BRA', position:'Midfielder', club:'Man United',       age:31, foot:'Right', flag:'🇧🇷' },
  { name:'Jude Bellingham',   country:'England',   countryCode:'ENG', position:'Midfielder', club:'Real Madrid',      age:20, foot:'Right', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Harry Kane',        country:'England',   countryCode:'ENG', position:'Forward',    club:'Bayern Munich',    age:30, foot:'Right', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Bukayo Saka',       country:'England',   countryCode:'ENG', position:'Forward',    club:'Arsenal',          age:22, foot:'Left',  flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Phil Foden',        country:'England',   countryCode:'ENG', position:'Midfielder', club:'Man City',         age:23, foot:'Left',  flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Declan Rice',       country:'England',   countryCode:'ENG', position:'Midfielder', club:'Arsenal',          age:25, foot:'Right', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name:'Robert Lewandowski',country:'Poland',    countryCode:'POL', position:'Forward',    club:'Barcelona',        age:35, foot:'Right', flag:'🇵🇱' },
  { name:'Pedri',             country:'Spain',     countryCode:'ESP', position:'Midfielder', club:'Barcelona',        age:21, foot:'Right', flag:'🇪🇸' },
  { name:'Gavi',              country:'Spain',     countryCode:'ESP', position:'Midfielder', club:'Barcelona',        age:19, foot:'Left',  flag:'🇪🇸' },
  { name:'Lamine Yamal',      country:'Spain',     countryCode:'ESP', position:'Forward',    club:'Barcelona',        age:16, foot:'Right', flag:'🇪🇸' },
  { name:'Alvaro Morata',     country:'Spain',     countryCode:'ESP', position:'Forward',    club:'AC Milan',         age:31, foot:'Right', flag:'🇪🇸' },
  { name:'Rodri',             country:'Spain',     countryCode:'ESP', position:'Midfielder', club:'Man City',         age:27, foot:'Right', flag:'🇪🇸' },
  { name:'Jamal Musiala',     country:'Germany',   countryCode:'GER', position:'Midfielder', club:'Bayern Munich',    age:21, foot:'Right', flag:'🇩🇪' },
  { name:'Florian Wirtz',     country:'Germany',   countryCode:'GER', position:'Midfielder', club:'Bayer Leverkusen', age:20, foot:'Left',  flag:'🇩🇪' },
  { name:'Manuel Neuer',      country:'Germany',   countryCode:'GER', position:'Goalkeeper', club:'Bayern Munich',    age:37, foot:'Right', flag:'🇩🇪' },
  { name:'Leroy Sane',        country:'Germany',   countryCode:'GER', position:'Forward',    club:'Bayern Munich',    age:27, foot:'Right', flag:'🇩🇪' },
  { name:'Joao Felix',        country:'Portugal',  countryCode:'POR', position:'Forward',    club:'Chelsea',          age:24, foot:'Right', flag:'🇵🇹' },
  { name:'Bruno Fernandes',   country:'Portugal',  countryCode:'POR', position:'Midfielder', club:'Man United',       age:29, foot:'Right', flag:'🇵🇹' },
  { name:'Ruben Dias',        country:'Portugal',  countryCode:'POR', position:'Defender',   club:'Man City',         age:26, foot:'Right', flag:'🇵🇹' },
  { name:'Cristiano Ronaldo', country:'Portugal',  countryCode:'POR', position:'Forward',    club:'Al Nassr',         age:39, foot:'Right', flag:'🇵🇹' },
  { name:'Raphinha',          country:'Brazil',    countryCode:'BRA', position:'Forward',    club:'Barcelona',        age:27, foot:'Left',  flag:'🇧🇷' },
  { name:'Achraf Hakimi',     country:'Morocco',   countryCode:'MAR', position:'Defender',   club:'PSG',              age:25, foot:'Right', flag:'🇲🇦' },
  { name:'Hakim Ziyech',      country:'Morocco',   countryCode:'MAR', position:'Midfielder', club:'Galatasaray',      age:30, foot:'Left',  flag:'🇲🇦' },
  { name:'Yassine Bounou',    country:'Morocco',   countryCode:'MAR', position:'Goalkeeper', club:'Al Hilal',         age:32, foot:'Right', flag:'🇲🇦' },
  { name:'Victor Osimhen',    country:'Nigeria',   countryCode:'NGA', position:'Forward',    club:'Galatasaray',      age:25, foot:'Right', flag:'🇳🇬' },
  { name:'Sadio Mane',        country:'Senegal',   countryCode:'SEN', position:'Forward',    club:'Al Nassr',         age:32, foot:'Right', flag:'🇸🇳' },
  { name:'Mohamed Salah',     country:'Egypt',     countryCode:'EGY', position:'Forward',    club:'Liverpool',        age:31, foot:'Left',  flag:'🇪🇬' },
  { name:'Son Heung-min',     country:'South Korea',countryCode:'KOR',position:'Forward',    club:'Tottenham',        age:31, foot:'Left',  flag:'🇰🇷' },
  { name:'Takumi Minamino',   country:'Japan',     countryCode:'JPN', position:'Midfielder', club:'Monaco',           age:29, foot:'Right', flag:'🇯🇵' },
  { name:'Ritsu Doan',        country:'Japan',     countryCode:'JPN', position:'Forward',    club:'Freiburg',         age:25, foot:'Right', flag:'🇯🇵' },
  { name:'Ivan Perisic',      country:'Croatia',   countryCode:'CRO', position:'Midfielder', club:'Hajduk Split',     age:34, foot:'Left',  flag:'🇭🇷' },
  { name:'Luka Modric',       country:'Croatia',   countryCode:'CRO', position:'Midfielder', club:'Real Madrid',      age:38, foot:'Right', flag:'🇭🇷' },
  { name:'Dominik Livakovic', country:'Croatia',   countryCode:'CRO', position:'Goalkeeper', club:'Fenerbahce',       age:28, foot:'Right', flag:'🇭🇷' },
  { name:'Memphis Depay',     country:'Netherlands',countryCode:'NED',position:'Forward',    club:'Atletico Madrid',  age:29, foot:'Right', flag:'🇳🇱' },
  { name:'Virgil van Dijk',   country:'Netherlands',countryCode:'NED',position:'Defender',   club:'Liverpool',        age:32, foot:'Right', flag:'🇳🇱' },
  { name:'Cody Gakpo',        country:'Netherlands',countryCode:'NED',position:'Forward',    club:'Liverpool',        age:24, foot:'Right', flag:'🇳🇱' },
  { name:'Frenkie de Jong',   country:'Netherlands',countryCode:'NED',position:'Midfielder', club:'Barcelona',        age:26, foot:'Right', flag:'🇳🇱' },
  { name:'Christian Pulisic', country:'USA',       countryCode:'USA', position:'Forward',    club:'AC Milan',         age:25, foot:'Right', flag:'🇺🇸' },
  { name:'Alphonso Davies',   country:'Canada',    countryCode:'CAN', position:'Defender',   club:'Bayern Munich',    age:23, foot:'Left',  flag:'🇨🇦' },
  { name:'Jonathan David',    country:'Canada',    countryCode:'CAN', position:'Forward',    club:'Lille',            age:24, foot:'Right', flag:'🇨🇦' },
  { name:'Hirving Lozano',    country:'Mexico',    countryCode:'MEX', position:'Forward',    club:'PSV',              age:28, foot:'Right', flag:'🇲🇽' },
  { name:'Edson Alvarez',     country:'Mexico',    countryCode:'MEX', position:'Midfielder', club:'West Ham',         age:26, foot:'Right', flag:'🇲🇽' },
  { name:'Paulo Dybala',      country:'Argentina', countryCode:'ARG', position:'Forward',    club:'Roma',             age:30, foot:'Left',  flag:'🇦🇷' },
  { name:'Julian Alvarez',    country:'Argentina', countryCode:'ARG', position:'Forward',    club:'Atletico Madrid',  age:24, foot:'Right', flag:'🇦🇷' },
  { name:'Darwin Nunez',      country:'Uruguay',   countryCode:'URU', position:'Forward',    club:'Liverpool',        age:24, foot:'Right', flag:'🇺🇾' },
  { name:'Federico Valverde', country:'Uruguay',   countryCode:'URU', position:'Midfielder', club:'Real Madrid',      age:25, foot:'Right', flag:'🇺🇾' },
  { name:'Luis Diaz',         country:'Colombia',  countryCode:'COL', position:'Forward',    club:'Liverpool',        age:27, foot:'Right', flag:'🇨🇴' },
  { name:'James Rodriguez',   country:'Colombia',  countryCode:'COL', position:'Midfielder', club:'Rayo Vallecano',   age:32, foot:'Right', flag:'🇨🇴' },
  { name:'Alexis Mac Allister',country:'Argentina',countryCode:'ARG', position:'Midfielder', club:'Liverpool',        age:25, foot:'Right', flag:'🇦🇷' },
  { name:'Granit Xhaka',      country:'Switzerland',countryCode:'CHE',position:'Midfielder', club:'Bayer Leverkusen', age:31, foot:'Left',  flag:'🇨🇭' },
  { name:'Xherdan Shaqiri',   country:'Switzerland',countryCode:'CHE',position:'Midfielder', club:'Chicago Fire',     age:32, foot:'Right', flag:'🇨🇭' },
  { name:'Romelu Lukaku',     country:'Belgium',   countryCode:'BEL', position:'Forward',    club:'Roma',             age:30, foot:'Right', flag:'🇧🇪' },
  { name:'Kevin De Bruyne',   country:'Belgium',   countryCode:'BEL', position:'Midfielder', club:'Man City',         age:32, foot:'Right', flag:'🇧🇪' },
  { name:'Thibaut Courtois',  country:'Belgium',   countryCode:'BEL', position:'Goalkeeper', club:'Real Madrid',      age:31, foot:'Right', flag:'🇧🇪' },
];

const MAX_ATTEMPTS = 8;
const SCORES = [25, 23, 20, 17, 14, 11, 8, 5];

const REGIONS = {
  ARG:'SouthAmerica', BRA:'SouthAmerica', URU:'SouthAmerica', COL:'SouthAmerica',
  FRA:'Europe', ESP:'Europe', GER:'Europe', ENG:'Europe', POR:'Europe',
  NED:'Europe', BEL:'Europe', CHE:'Europe', POL:'Europe', CRO:'Europe',
  USA:'NorthAmerica', CAN:'NorthAmerica', MEX:'NorthAmerica',
  MAR:'Africa', NGA:'Africa', SEN:'Africa',
  JPN:'Asia', KOR:'Asia', NOR:'Europe',
};
function getRegion(code) { return REGIONS[code] || 'Other'; }

const POS_COLORS = {
  Forward:    { bg:'rgba(232,64,64,0.12)',    border:'rgba(232,64,64,0.35)',    text:'#f87171' },
  Midfielder: { bg:'rgba(79,142,247,0.12)',   border:'rgba(79,142,247,0.35)',   text:'#93c5fd' },
  Defender:   { bg:'rgba(61,214,140,0.12)',   border:'rgba(61,214,140,0.35)',   text:'#6ee7b7' },
  Goalkeeper: { bg:'rgba(247,195,68,0.12)',   border:'rgba(247,195,68,0.35)',   text:'#fcd34d' },
};

// ─── Injected CSS (same design system as Home/Guild) ──────────────────────────
const INJECTED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

  :root {
    --bg:#060810; --bg2:#0c0f1a;
    --surface:rgba(255,255,255,0.04); --surface2:rgba(255,255,255,0.07); --surface3:rgba(255,255,255,0.11);
    --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.13); --border3:rgba(255,255,255,0.2);
    --accent:#F7C344; --accent-glow:rgba(247,195,68,0.35); --accent-dim:rgba(247,195,68,0.12);
    --green:#3DD68C; --blue:#4F8EF7; --red:#E84040; --purple:#A855F7; --teal:#06B6D4;
    --text:#F2F2F4; --muted:rgba(242,242,244,0.5); --muted2:rgba(242,242,244,0.28); --muted3:rgba(242,242,244,0.15);
  }

  .wya-page { min-height:100vh; background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; padding:0 0 100px; position:relative; overflow-x:hidden; }

  /* Background grid + blobs (identical to Home) */
  .wya-bg { position:fixed;inset:0;z-index:0;pointer-events:none; }
  .wya-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.055) 1px,transparent 1px);background-size:56px 56px;animation:fbGridPulse 6s ease-in-out infinite; }
  .wya-grid::after { content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(247,195,68,0.18) 1px,transparent 1px);background-size:56px 56px;background-position:-0.5px -0.5px;animation:fbGridPulse 6s ease-in-out infinite reverse; }
  .wya-blob1 { position:absolute;width:700px;height:500px;top:-200px;left:-100px;border-radius:50%;filter:blur(90px);opacity:0.4;background:radial-gradient(ellipse,rgba(168,85,247,0.22) 0%,rgba(79,142,247,0.1) 40%,transparent 70%);animation:fbDrift 20s ease-in-out infinite alternate; }
  .wya-blob2 { position:absolute;width:500px;height:400px;bottom:-80px;right:-100px;border-radius:50%;filter:blur(90px);opacity:0.3;background:radial-gradient(ellipse,rgba(61,214,140,0.1) 0%,transparent 70%);animation:fbDrift 24s ease-in-out infinite alternate-reverse; }
  .wya-noise { position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.028;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:256px; }

  /* Nav */
  .wya-nav { position:sticky;top:0;z-index:200;height:56px;padding:0 16px;background:rgba(6,8,16,0.35);backdrop-filter:blur(16px) saturate(1.3);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between; }
  .wya-nav-back { background:none;border:none;color:var(--muted);cursor:pointer;font-size:22px;padding:0;display:flex;align-items:center;line-height:1; }
  .wya-nav-title { font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:3px;background:linear-gradient(110deg,#ffe680 0%,#F7C344 40%,#e8a800 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .wya-nav-badge { font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;letter-spacing:1px;color:var(--accent);border:1px solid rgba(247,195,68,0.28);border-radius:999px;padding:3px 10px;background:rgba(247,195,68,0.09); }

  /* Content wrapper */
  .wya-content { position:relative;z-index:1;padding:20px 16px 0;max-width:520px;margin:0 auto; }

  /* Header */
  .wya-header { margin-bottom:20px;animation:fadeUp 0.3s ease both; }
  .wya-eyebrow { display:flex;align-items:center;gap:8px;margin-bottom:6px; }
  .wya-eyebrow-pill { display:inline-flex;align-items:center;padding:2px 10px;border-radius:999px;background:rgba(61,214,140,0.1);border:1px solid rgba(61,214,140,0.25);color:var(--green);font-family:'Space Mono',monospace;font-size:0.6rem;font-weight:700;letter-spacing:1px; }
  .wya-eyebrow-sep { color:var(--border2);font-size:14px; }
  .wya-eyebrow-status { font-family:'Space Mono',monospace;font-size:0.6rem;color:var(--muted); }
  .wya-title { font-family:'Bebas Neue',sans-serif;font-size:2.6rem;letter-spacing:3px;color:var(--text);margin:0 0 12px;line-height:1; }

  /* Attempt track */
  .wya-track { display:flex;gap:5px;align-items:center; }
  .wya-dot { width:10px;height:10px;border-radius:50%;transition:background 0.35s,box-shadow 0.35s; }

  /* Section label */
  .wya-section-hdr { display:flex;align-items:center;gap:12px;margin-bottom:12px; }
  .wya-section-label { font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--muted2);white-space:nowrap; }
  .wya-section-line { flex:1;height:1px;background:linear-gradient(90deg,var(--border2),transparent); }

  /* Hint strip */
  .wya-hints { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;animation:fadeUp 0.3s 0.05s ease both; }
  .wya-hint { display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--border);transition:all 0.3s; }
  .wya-hint.revealed { background:rgba(61,214,140,0.07);border-color:rgba(61,214,140,0.25); }
  .wya-hint-icon { font-size:16px;flex-shrink:0; }
  .wya-hint-label { font-family:'Space Mono',monospace;font-size:0.52rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted2);margin-bottom:3px; }
  .wya-hint-val { font-family:'Syne',sans-serif;font-size:0.72rem;font-weight:700;color:var(--green);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .wya-hint-lock { font-family:'Space Mono',monospace;font-size:0.58rem;color:var(--muted3); }

  /* Search */
  .wya-search-wrap { position:relative;margin-bottom:20px;animation:fadeUp 0.3s 0.1s ease both; }
  .wya-search-box { display:flex;align-items:center;gap:10px;background:var(--surface2);border:1px solid var(--border2);border-radius:14px;padding:0 14px;margin-bottom:10px;transition:border-color 0.2s; }
  .wya-search-box:focus-within { border-color:rgba(247,195,68,0.4); }
  .wya-search-glyph { font-size:15px;opacity:0.4;flex-shrink:0; }
  .wya-search-input { flex:1;background:transparent;border:none;color:var(--text);font-size:15px;padding:13px 0;outline:none;font-family:'Syne',sans-serif; }
  .wya-search-input::placeholder { color:var(--muted2); }
  .wya-clear { background:none;border:none;color:var(--muted2);cursor:pointer;font-size:13px;padding:4px;flex-shrink:0; }

  /* Dropdown */
  .wya-dropdown { position:absolute;top:60px;left:0;right:0;background:#0c0f1a;border:1px solid var(--border2);border-radius:14px;z-index:999;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.8);animation:wyaDropIn 0.18s ease both; }
  .wya-drop-row { display:flex;align-items:center;gap:12px;padding:11px 14px;cursor:pointer;transition:background 0.12s;border-bottom:1px solid rgba(255,255,255,0.04); }
  .wya-drop-row:last-child { border-bottom:none; }
  .wya-drop-row:hover { background:var(--surface3); }
  .wya-drop-flag { font-size:22px;flex-shrink:0; }
  .wya-drop-name { font-family:'Syne',sans-serif;font-size:0.85rem;font-weight:700;color:var(--text);display:block;margin-bottom:2px; }
  .wya-drop-meta { display:flex;align-items:center;flex-wrap:wrap;gap:3px;font-family:'Space Mono',monospace;font-size:0.6rem;color:var(--muted); }

  /* Guess button */
  .wya-btn { width:100%;padding:14px 20px;border-radius:14px;border:none;font-size:0.85rem;font-weight:700;font-family:'Space Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s; }
  .wya-btn-active { background:var(--accent);color:#060810;box-shadow:0 8px 24px rgba(247,195,68,0.25); }
  .wya-btn-active:hover { filter:brightness(1.08); }
  .wya-btn-active:active { transform:scale(0.98); }
  .wya-btn-inactive { background:var(--surface);color:var(--muted3);cursor:not-allowed;border:1px solid var(--border); }

  /* Column labels */
  .wya-col-labels { display:grid;grid-template-columns:2fr 1.5fr 1.2fr 1.5fr 0.7fr 0.7fr;gap:4px;margin-bottom:6px; }
  .wya-col-label { font-family:'Space Mono',monospace;font-size:0.52rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted2);text-align:center;padding:3px 0; }

  /* Guess grid */
  .wya-grid-rows { display:flex;flex-direction:column;gap:4px; }
  .wya-guess-row { display:grid;grid-template-columns:2fr 1.5fr 1.2fr 1.5fr 0.7fr 0.7fr;gap:4px; }
  .wya-row-enter { animation:wyaRowIn 0.32s cubic-bezier(0.34,1.56,0.64,1) both; }

  /* Cell */
  .wya-cell { position:relative;border-radius:10px;overflow:hidden;border:1px solid transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:64px;padding:8px 4px;text-align:center;word-break:break-word;gap:2px; }
  .wya-cell-top { position:absolute;top:0;left:0;right:0;height:2px; }
  .wya-cell-flag { font-size:18px; }
  .wya-cell-name { font-family:'Syne',sans-serif;font-size:0.65rem;font-weight:700;color:var(--text);line-height:1.3; }
  .wya-cell-val { font-family:'Space Mono',monospace;font-size:0.62rem;font-weight:700;color:var(--muted); }
  .wya-cell-arrow { font-size:13px;font-weight:900; }

  /* Legend */
  .wya-legend { display:flex;gap:16px;margin-top:14px;flex-wrap:wrap; }
  .wya-legend-item { display:flex;align-items:center;gap:6px;font-family:'Space Mono',monospace;font-size:0.58rem;color:var(--muted2); }
  .wya-legend-swatch { width:8px;height:8px;border-radius:2px;flex-shrink:0; }

  /* Result */
  .wya-result { margin-top:24px;padding:28px 24px;border-radius:20px;border:1px solid;text-align:center;animation:wyaResultPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
  .wya-result-win { background:rgba(61,214,140,0.05);border-color:rgba(61,214,140,0.2); }
  .wya-result-loss { background:rgba(232,64,64,0.04);border-color:rgba(232,64,64,0.15); }
  .wya-result-emoji { font-size:40px;margin-bottom:10px; }
  .wya-result-eyebrow { font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:var(--muted);margin-bottom:10px; }
  .wya-result-name { font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:2px;color:var(--text);margin-bottom:6px; }
  .wya-result-info { font-family:'Space Mono',monospace;font-size:0.62rem;color:var(--muted);margin-bottom:20px;letter-spacing:0.5px; }
  .wya-stats-row { display:inline-flex;align-items:center;gap:16px;background:var(--surface);border:1px solid var(--border2);border-radius:14px;padding:14px 22px;margin-bottom:16px; }
  .wya-stats-div { width:1px;height:30px;background:var(--border2); }
  .wya-stat-chip { display:flex;flex-direction:column;align-items:center;gap:2px; }
  .wya-stat-val { font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--text);line-height:1;letter-spacing:1px; }
  .wya-stat-val.xp { color:var(--green); }
  .wya-stat-label { font-family:'Space Mono',monospace;font-size:0.52rem;color:var(--muted2);text-transform:uppercase;letter-spacing:1.2px; }
  .wya-next-up { font-family:'Space Mono',monospace;font-size:0.62rem;color:var(--muted3);margin:0;letter-spacing:0.5px; }

  /* Pos badge */
  .wya-pos-badge { display:inline-block;padding:1px 7px;border-radius:100px;font-family:'Space Mono',monospace;font-size:0.52rem;font-weight:700;margin-right:4px; }

  /* Spinner */
  .wya-spinner { display:flex;align-items:center;justify-content:center;height:100vh; }
  .wya-spinner-ring { width:28px;height:28px;border-radius:50%;border:3px solid rgba(255,255,255,0.07);border-top-color:var(--accent);animation:spin 0.7s linear infinite; }

  /* Bottom nav */
  .wya-bottom-nav { position:fixed;bottom:0;left:0;right:0;z-index:200;display:flex;background:rgba(6,8,16,0.96);backdrop-filter:blur(20px);border-top:1px solid var(--border);padding-bottom:env(safe-area-inset-bottom,0px); }
  .wya-nav-item { flex:1;min-width:0;border:none;background:transparent;padding:9px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-family:'Syne',sans-serif;transition:color 0.15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;color:rgba(242,242,244,0.38); }
  .wya-nav-item.active { color:var(--green); }
  .wya-nav-icon { font-size:20px;line-height:1; }
  .wya-nav-label { font-family:'Space Mono',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px; }
  .wya-nav-indicator { position:absolute;top:0;left:50%;transform:translateX(-50%);width:26px;height:2px;border-radius:0 0 99px 99px;background:var(--green);box-shadow:0 0 8px var(--green); }

  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes fbDrift { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(36px,28px) scale(1.1)} }
  @keyframes fbGridPulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes wyaRowIn { from{opacity:0;transform:translateY(-10px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes wyaDropIn { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
  @keyframes wyaResultPop { 0%{opacity:0;transform:scale(0.94) translateY(12px)} 60%{transform:scale(1.02) translateY(0)} 100%{opacity:1;transform:scale(1)} }

  @media(max-width:640px){
    .wya-blob1,.wya-blob2{filter:blur(40px);opacity:0.25;}
    .wya-grid{display:none;}
    .wya-title{font-size:2rem;}
  }
`;

export default function WhoAreYa() {
  const [target, setTarget]             = useState(null);
  const [guesses, setGuesses]           = useState([]);
  const [guessedNames, setGuessedNames] = useState([]);
  const [search, setSearch]             = useState('');
  const [dropdown, setDropdown]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [gameOver, setGameOver]         = useState(false);
  const [won, setWon]                   = useState(false);
  const [xpAwarded, setXpAwarded]       = useState(null);
  const [hints, setHints]               = useState({ position:false, country:false, club:false });
  const [animKey, setAnimKey]           = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('wya-css')) {
      const s = document.createElement('style');
      s.id = 'wya-css';
      s.textContent = INJECTED_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    const player = getDailyPlayer(PLAYER_DB);
    setTarget(player);
    const today = new Date().toISOString().split('T')[0];
    const saved = JSON.parse(localStorage.getItem('footbrawls_whoareya') || '{}');
    if (saved.date === today) {
      setGuesses(saved.guesses || []);
      setGuessedNames((saved.guesses || []).map(g => g.cells[0].name));
      setGameOver(true);
      setWon(saved.won);
    }
  }, []);

  useEffect(() => {
    if (!search.trim()) { setDropdown([]); return; }
    const q = search.toLowerCase();
    setDropdown(
      PLAYER_DB.filter(p => p.name.toLowerCase().includes(q) && !guessedNames.includes(p.name)).slice(0, 8)
    );
  }, [search, guessedNames]);

  useEffect(() => {
    const c = guesses.length;
    setHints({ position:c>=2, country:c>=5, club:c>=7 });
  }, [guesses]);

  function evaluateGuess(guess) {
    const t = target;
    const sameCountry = guess.countryCode === t.countryCode;
    const sameRegion  = !sameCountry && getRegion(guess.countryCode) === getRegion(t.countryCode);
    return {
      cells: [
        { type:'name',     name:guess.name, flag:guess.flag, cls:guess.name===t.name?'correct':'wrong' },
        { type:'country',  val:`${guess.flag} ${guess.country}`, cls:sameCountry?'correct':sameRegion?'partial':'wrong' },
        { type:'position', val:guess.position, cls:guess.position===t.position?'correct':'wrong' },
        { type:'club',     val:guess.club, cls:guess.club===t.club?'correct':'wrong' },
        { type:'age',      val:guess.age,
          cls:guess.age===t.age?'correct':Math.abs(guess.age-t.age)<=3?'partial':'wrong',
          arrow:guess.age<t.age?'↑':guess.age>t.age?'↓':'' },
        { type:'foot',     val:guess.foot, cls:guess.foot===t.foot?'correct':'wrong' },
      ],
    };
  }

  async function submitGuess() {
    if (!selected || gameOver || !target) return;
    const result = evaluateGuess(selected);
    const newGuesses = [...guesses, result];
    const newNames   = [...guessedNames, selected.name];
    setAnimKey(k => k+1);
    setGuesses(newGuesses);
    setGuessedNames(newNames);
    setSelected(null); setSearch(''); setDropdown([]);
    const isWin  = selected.name === target.name;
    const isLoss = !isWin && newGuesses.length >= MAX_ATTEMPTS;
    if (isWin || isLoss) {
      setGameOver(true); setWon(isWin);
      const score = isWin ? SCORES[newGuesses.length-1] : 0;
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('footbrawls_whoareya', JSON.stringify({ date:today, guesses:newGuesses, won:isWin, score }));
      if (isWin) {
        const user = getUser();
        if (user) {
          const r = await awardXP(user.userId, 'whoareya_correct', { rawXP:score });
          setXpAwarded(r?.xpAwarded || score);
        }
      }
    }
  }

  if (!target) return (
    <div className="wya-spinner">
      <div className="wya-spinner-ring" />
    </div>
  );

  const attempts     = guesses.length;
  const attemptsLeft = MAX_ATTEMPTS - attempts;

  return (
    <>
      <div className="wya-page">
        {/* Background */}
        <div className="wya-bg">
          <div className="wya-grid" />
          <div className="wya-blob1" />
          <div className="wya-blob2" />
        </div>
        <div className="wya-noise" />

        {/* Nav */}
        <nav className="wya-nav">
          <button className="wya-nav-back" onClick={() => window.history.back()}>‹</button>
          <span className="wya-nav-title">Who Are Ya?</span>
          <span className="wya-nav-badge">WC 2026</span>
        </nav>

        {/* Content */}
        <div className="wya-content">

          {/* Header */}
          <header className="wya-header">
            <div className="wya-eyebrow">
              <span className="wya-eyebrow-pill">⚽ Daily Puzzle</span>
              <span className="wya-eyebrow-sep">·</span>
              <span className="wya-eyebrow-status">
                {gameOver
                  ? won ? `Solved in ${attempts} ${attempts===1?'guess':'guesses'}` : 'Better luck tomorrow'
                  : `${attemptsLeft} attempt${attemptsLeft!==1?'s':''} left`}
              </span>
            </div>
            <div className="wya-track">
              {Array.from({ length:MAX_ATTEMPTS }).map((_,i) => {
                const filled    = i < attempts;
                const isWinLast = won && i === attempts-1;
                return (
                  <div key={i} className="wya-dot" style={{
                    background: filled
                      ? isWinLast ? 'var(--green)' : 'var(--red)'
                      : 'rgba(255,255,255,0.07)',
                    boxShadow: filled
                      ? isWinLast ? '0 0 10px rgba(61,214,140,0.6)' : '0 0 6px rgba(232,64,64,0.35)'
                      : 'none',
                  }} />
                );
              })}
            </div>
          </header>

          {/* Hints */}
          <div className="wya-hints">
            <HintCard icon="🎽" label="Position" value={target.position} revealed={hints.position} unlockAt={2} />
            <HintCard icon="🌍" label="Country"  value={`${target.flag} ${target.country}`} revealed={hints.country}  unlockAt={5} />
            <HintCard icon="🏟️" label="Club"     value={target.club}     revealed={hints.club}     unlockAt={7} />
          </div>

          {/* Search */}
          {!gameOver && (
            <div className="wya-search-wrap">
              <div className="wya-search-box">
                <span className="wya-search-glyph">⚽</span>
                <input
                  ref={searchRef}
                  className="wya-search-input"
                  placeholder="Type a player name…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelected(null); }}
                  onKeyDown={e => e.key==='Enter' && selected && submitGuess()}
                  autoComplete="off"
                />
                {search && (
                  <button className="wya-clear" onClick={() => { setSearch(''); setSelected(null); setDropdown([]); }}>✕</button>
                )}
              </div>

              {dropdown.length > 0 && (
                <div className="wya-dropdown">
                  {dropdown.map(p => (
                    <div key={p.name} className="wya-drop-row" onClick={() => { setSelected(p); setSearch(p.name); setDropdown([]); }}>
                      <span className="wya-drop-flag">{p.flag}</span>
                      <div>
                        <span className="wya-drop-name">{p.name}</span>
                        <span className="wya-drop-meta">
                          <PosBadge pos={p.position} />
                          {p.country} · {p.club}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className={`wya-btn ${selected ? 'wya-btn-active' : 'wya-btn-inactive'}`}
                disabled={!selected}
                onClick={submitGuess}
              >
                Confirm Guess →
              </button>
            </div>
          )}

          {/* Column labels */}
          {guesses.length > 0 && (
            <div className="wya-col-labels">
              {['Player','Country','Position','Club','Age','Foot'].map(h => (
                <div key={h} className="wya-col-label">{h}</div>
              ))}
            </div>
          )}

          {/* Guess grid */}
          <div className="wya-grid-rows">
            {[...guesses].reverse().map((g, rowI) => (
              <div key={`${animKey}-${rowI}`} className={`wya-guess-row${rowI===0?' wya-row-enter':''}`}>
                {g.cells.map((cell, j) => <Cell key={j} cell={cell} />)}
              </div>
            ))}
          </div>

          {/* Legend */}
          {guesses.length > 0 && (
            <div className="wya-legend">
              {[['var(--green)','Correct'],['var(--accent)','Same region / ±3 yrs'],['rgba(255,255,255,0.08)','Wrong']].map(([color,label]) => (
                <span key={label} className="wya-legend-item">
                  <span className="wya-legend-swatch" style={{ background:color }} />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Result */}
          {gameOver && (
            <div className={`wya-result ${won?'wya-result-win':'wya-result-loss'}`}>
              <div className="wya-result-emoji">{won?'🏆':'💔'}</div>
              <div className="wya-result-eyebrow">{won?'Nailed it!':'Not this time'}</div>
              <div className="wya-result-name">{target.flag} {target.name}</div>
              <div className="wya-result-info">{target.country} · {target.position} · {target.club} · Age {target.age}</div>
              {won && (
                <div className="wya-stats-row">
                  <div className="wya-stat-chip">
                    <span className="wya-stat-val">{attempts}</span>
                    <span className="wya-stat-label">{attempts===1?'guess':'guesses'}</span>
                  </div>
                  <div className="wya-stats-div" />
                  <div className="wya-stat-chip">
                    <span className="wya-stat-val">{SCORES[attempts-1]}</span>
                    <span className="wya-stat-label">points</span>
                  </div>
                  {xpAwarded != null && (
                    <>
                      <div className="wya-stats-div" />
                      <div className="wya-stat-chip">
                        <span className="wya-stat-val xp">+{xpAwarded}</span>
                        <span className="wya-stat-label">XP</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              <p className="wya-next-up">New puzzle tomorrow ⏳</p>
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <BottomNav />
      </div>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function HintCard({ icon, label, value, revealed, unlockAt }) {
  const posC = POS_COLORS[value];
  return (
    <div className={`wya-hint${revealed?' revealed':''}`}
      style={revealed && posC ? { background:posC.bg, borderColor:posC.border } : {}}>
      <span className="wya-hint-icon">{icon}</span>
      <div>
        <div className="wya-hint-label">{label}</div>
        {revealed
          ? <div className="wya-hint-val" style={posC?{color:posC.text}:{}}>{value}</div>
          : <div className="wya-hint-lock">@ guess {unlockAt}</div>}
      </div>
    </div>
  );
}

function PosBadge({ pos }) {
  const c = POS_COLORS[pos] || {};
  return (
    <span className="wya-pos-badge" style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.text }}>
      {pos}
    </span>
  );
}

function Cell({ cell }) {
  const { cls, type, name, flag, val, arrow } = cell;
  const bg   = cls==='correct'?'rgba(61,214,140,0.1)' :cls==='partial'?'rgba(247,195,68,0.1)' :'rgba(255,255,255,0.025)';
  const brd  = cls==='correct'?'rgba(61,214,140,0.35)':cls==='partial'?'rgba(247,195,68,0.35)':'rgba(255,255,255,0.06)';
  const topC = cls==='correct'?'var(--green)'          :cls==='partial'?'var(--accent)'         :'transparent';
  const arrC = cls==='partial'?'var(--accent)':'rgba(255,255,255,0.2)';
  return (
    <div className="wya-cell" style={{ background:bg, borderColor:brd }}>
      <div className="wya-cell-top" style={{ background:topC }} />
      {type==='name' ? (
        <>
          <span className="wya-cell-flag">{flag}</span>
          <span className="wya-cell-name">{name}</span>
        </>
      ) : (
        <>
          <span className="wya-cell-val">{val}</span>
          {arrow && <span className="wya-cell-arrow" style={{ color:arrC }}>{arrow}</span>}
        </>
      )}
    </div>
  );
}

function BottomNav() {
  const items = [
    { id:'home',  label:'Games', icon:'⚽' },
    { id:'guild', label:'Guild', icon:'🏰' },
    { id:'raids', label:'Raids', icon:'⚔️' },
    { id:'ranks', label:'Ranks', icon:'🏆' },
    { id:'me',    label:'Me',    icon:'👤' },
  ];
  return (
    <nav className="wya-bottom-nav">
      {items.map(item => (
        <button key={item.id} className={`wya-nav-item${item.id==='home'?' active':''}`}
          onClick={() => item.id==='home' && window.history.back()}
          style={{ position:'relative' }}>
          {item.id==='home' && <span className="wya-nav-indicator" />}
          <span className="wya-nav-icon">{item.icon}</span>
          <span className="wya-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}