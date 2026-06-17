// src/pages/games/rapidfire.jsx
// Football "Rapid Fire" — Footbrawls edition
// Timed multi-choice quiz with difficulty modes & Google AdBreak integration

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../../lib/user';
import { awardXP } from '../../lib/xpEngine.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATS_KEY   = 'footbrawls_rapidfire_stats';
const HISTORY_KEY = 'footbrawls_rapidfire';

const DIFFICULTY = {
  easy:   { count: 8,  time: 20, label: '8Q · 20s', xpMultiplier: 1   },
  medium: { count: 12, time: 14, label: '12Q · 14s', xpMultiplier: 1.5 },
  hard:   { count: 16, time: 9,  label: '16Q · 9s',  xpMultiplier: 2   },
};
const LETTERS = ['A', 'B', 'C', 'D'];
const PTS_CORRECT  = 10;
const PTS_SPEED_BONUS = 3; // bonus per second remaining when answered fast

// ─── AdBreak shim ─────────────────────────────────────────────────────────────
const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    console.log('[AdSense H5 Mock] adBreak:', options.name);
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.adViewed) options.adViewed();
      if (options.afterAd) options.afterAd();
      if (options.adBreakDone) options.adBreakDone({ showStatus: 'mocked' });
    }, 800);
  }
};

if (typeof window !== 'undefined') {
  window.adConfig = window.adConfig || function () {
    (window.adConfig.q = window.adConfig.q || []).push(arguments);
  };
  window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
}

// ─── Question Bank ────────────────────────────────────────────────────────────
// All questions are harder — niche stats, exact seasons, lesser-known facts.
const ALL_QUESTIONS = [
  // Nationality / country
  { q: 'Achraf Hakimi was born in Madrid but represents which nation?', type: 'country', opts: ['Spain', 'Morocco', 'Algeria', 'France'], ans: 1 },
  { q: 'Lautaro Martínez wears the armband for which national team?', type: 'country', opts: ['Uruguay', 'Colombia', 'Chile', 'Argentina'], ans: 3 },
  { q: 'João Félix holds a passport from which country?', type: 'country', opts: ['Spain', 'Brazil', 'Portugal', 'Cape Verde'], ans: 2 },
  { q: 'Khvicha Kvaratskhelia represents which former Soviet republic?', type: 'country', opts: ['Armenia', 'Azerbaijan', 'Ukraine', 'Georgia'], ans: 3 },
  { q: 'Florian Wirtz plays international football for which nation?', type: 'country', opts: ['Austria', 'Switzerland', 'Germany', 'Netherlands'], ans: 2 },
  { q: 'Rúben Dias plays international football for which country?', type: 'country', opts: ['Spain', 'Brazil', 'Portugal', 'Angola'], ans: 2 },
  { q: 'Which nation does Julián Álvarez represent?', type: 'country', opts: ['Mexico', 'Colombia', 'Uruguay', 'Argentina'], ans: 3 },
  { q: 'Wataru Endō captains which national side?', type: 'country', opts: ['South Korea', 'China', 'Japan', 'Australia'], ans: 2 },
  { q: 'Federico Valverde was born in Montevideo and represents…', type: 'country', opts: ['Argentina', 'Uruguay', 'Paraguay', 'Chile'], ans: 1 },
  { q: 'Brahim Díaz switched international allegiance from Spain to which country?', type: 'country', opts: ['Algeria', 'Tunisia', 'Senegal', 'Morocco'], ans: 3 },

  // Club / transfer
  { q: 'Erling Haaland left Borussia Dortmund for Manchester City in which year?', type: 'club', opts: ['2021', '2022', '2023', '2024'], ans: 1 },
  { q: 'From which club did Chelsea sign Enzo Fernández in January 2023?', type: 'club', opts: ['River Plate', 'Ajax', 'Benfica', 'PSV'], ans: 2 },
  { q: 'Before joining Arsenal, Declan Rice was captain of which club?', type: 'club', opts: ['Tottenham', 'West Ham United', 'Everton', 'Leicester City'], ans: 1 },
  { q: 'Jude Bellingham moved to Real Madrid from which Bundesliga club?', type: 'club', opts: ['RB Leipzig', 'Bayern Munich', 'Bayer Leverkusen', 'Borussia Dortmund'], ans: 3 },
  { q: 'Which club sold Gavi through its famous La Masia academy?', type: 'club', opts: ['Real Madrid', 'Atlético Madrid', 'Barcelona', 'Valencia'], ans: 2 },
  { q: 'Alejandro Garnacho joined Manchester United\'s academy from which city\'s club?', type: 'club', opts: ['Barcelona', 'Atlético Madrid', 'Real Madrid', 'Getafe'], ans: 1 },
  { q: 'Kylian Mbappé spent a loan season early in his career at which club?', type: 'club', opts: ['Nice', 'Monaco', 'Caen', 'Lens'], ans: 1 },
  { q: 'Mohamed Salah was at which Italian club before joining Liverpool?', type: 'club', opts: ['Inter Milan', 'AC Milan', 'Juventus', 'Roma'], ans: 3 },
  { q: 'Victor Osimhen joined Napoli from which French club?', type: 'club', opts: ['Marseille', 'Lyon', 'Lille', 'Nice'], ans: 2 },
  { q: 'Which club did Pedri leave to join Barcelona as a 17-year-old?', type: 'club', opts: ['Villarreal', 'Las Palmas', 'Sporting Gijón', 'Granada'], ans: 1 },
  { q: 'Lamine Yamal is a product of which club\'s academy?', type: 'club', opts: ['Real Madrid', 'Atlético Madrid', 'Espanyol', 'Barcelona'], ans: 3 },
  { q: 'Which English club did Ivan Toney leave to join Al-Ahli in 2024?', type: 'club', opts: ['Crystal Palace', 'Brentford', 'Nottingham Forest', 'Fulham'], ans: 1 },

  // Position / role
  { q: 'What position does Trent Alexander-Arnold typically play for Liverpool?', type: 'position', opts: ['Left-back', 'Centre-back', 'Right-back', 'Defensive midfielder'], ans: 2 },
  { q: 'Rodri plays as what kind of midfielder for Manchester City?', type: 'position', opts: ['Attacking midfielder', 'Defensive midfielder', 'Box-to-box', 'Second striker'], ans: 1 },
  { q: 'In what position does Lautaro Martínez play at Inter Milan?', type: 'position', opts: ['False 9', 'Centre-forward', 'Left winger', 'Attacking midfielder'], ans: 1 },
  { q: 'Dani Carvajal plays in which position for Real Madrid?', type: 'position', opts: ['Left-back', 'Right-back', 'Central midfielder', 'Left winger'], ans: 1 },
  { q: 'Joshua Kimmich can play right-back but predominantly plays as what at Bayern Munich?', type: 'position', opts: ['Attacking midfielder', 'Winger', 'Defensive midfielder', 'Sweeper'], ans: 2 },
  { q: 'Rúben Dias is an elite practitioner of which position?', type: 'position', opts: ['Goalkeeper', 'Defensive midfielder', 'Centre-back', 'Right-back'], ans: 2 },
  { q: 'Bukayo Saka usually starts from which flank for Arsenal?', type: 'position', opts: ['Left wing', 'Right wing', 'Left-back', 'Centre-forward'], ans: 1 },
  { q: 'What is Casemiro\'s primary position?', type: 'position', opts: ['Centre-back', 'Right midfielder', 'Defensive midfielder', 'Attacking midfielder'], ans: 2 },

  // Facts / stats / records
  { q: 'How many Ballon d\'Or awards has Lionel Messi won as of 2024?', type: 'fact', opts: ['6', '7', '8', '9'], ans: 2 },
  { q: 'Erling Haaland scored how many Premier League goals in his debut season (2022-23)?', type: 'fact', opts: ['30', '33', '36', '38'], ans: 2 },
  { q: 'Which player won the 2023 Ballon d\'Or?', type: 'fact', opts: ['Kylian Mbappé', 'Erling Haaland', 'Vinicius Jr.', 'Lionel Messi'], ans: 3 },
  { q: 'Which player won the 2024 Ballon d\'Or?', type: 'fact', opts: ['Vinicius Jr.', 'Rodri', 'Erling Haaland', 'Kylian Mbappé'], ans: 1 },
  { q: 'In which year did Man City complete an unprecedented English treble?', type: 'fact', opts: ['2019', '2021', '2022', '2023'], ans: 3 },
  { q: 'Which club has won the most UEFA Champions League titles?', type: 'fact', opts: ['Barcelona', 'AC Milan', 'Real Madrid', 'Bayern Munich'], ans: 2 },
  { q: 'Who holds the record for most goals scored in a single World Cup tournament?', type: 'fact', opts: ['Ronaldo (Brazil)', 'Miroslav Klose', 'Gerd Müller', 'Just Fontaine'], ans: 3 },
  { q: 'What is the maximum squad size allowed in a FIFA World Cup final tournament?', type: 'fact', opts: ['23', '25', '26', '28'], ans: 2 },
  { q: 'Who was the first player ever to win five Ballon d\'Or awards?', type: 'fact', opts: ['Cristiano Ronaldo', 'Lionel Messi', 'Ronaldo (Brazil)', 'Zinedine Zidane'], ans: 1 },
  { q: 'Which stadium has the largest official capacity in world football?', type: 'fact', opts: ['Camp Nou', 'Wembley', 'Narendra Modi Stadium', 'Rungrado 1st of May'], ans: 3 },
  { q: 'Kylian Mbappé became the youngest French player to score at a World Cup at what age?', type: 'fact', opts: ['18', '19', '20', '21'], ans: 1 },
  { q: 'Who scored the fastest hat-trick in Premier League history (2 min 56 sec)?', type: 'fact', opts: ['Robbie Fowler', 'Sadio Mané', 'Sergio Agüero', 'Michael Owen'], ans: 1 },
  { q: 'Which country has won the Copa América the most times?', type: 'fact', opts: ['Brazil', 'Argentina', 'Uruguay', 'Chile'], ans: 1 },
  { q: 'VAR was introduced at which FIFA World Cup?', type: 'fact', opts: ['2014', '2018', '2022', '2010'], ans: 1 },
  { q: 'Which league does Al-Nassr compete in?', type: 'fact', opts: ['UAE Pro League', 'Saudi Pro League', 'Qatar Stars League', 'Egyptian Premier League'], ans: 1 },
  { q: 'Lamine Yamal became the youngest scorer in Euro history at what age at Euro 2024?', type: 'fact', opts: ['16', '17', '18', '15'], ans: 0 },
  { q: 'Which club did Bayer Leverkusen go the entire 2023-24 Bundesliga season unbeaten to deny?', type: 'fact', opts: ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Stuttgart'], ans: 0 },
  { q: 'How many times has Cristiano Ronaldo won the UEFA Champions League?', type: 'fact', opts: ['4', '5', '6', '7'], ans: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(count) {
  return shuffle(ALL_QUESTIONS).slice(0, Math.min(count, ALL_QUESTIONS.length));
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { played: 0, bestScore: 0, avgAcc: 0, streak: 0 }; }
  catch { return { played: 0, bestScore: 0, avgAcc: 0, streak: 0 }; }
}

function saveStats(score, accuracy) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    history[today] = { score, accuracy };
    const entries = Object.values(history);
    const stats = {
      played: entries.length,
      bestScore: Math.max(...entries.map(e => e.score)),
      avgAcc: Math.round(entries.reduce((s, e) => s + e.accuracy, 0) / entries.length),
      streak: 0,
    };
    const check = new Date(today + 'T00:00:00');
    while (true) {
      const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,'0')}-${String(check.getDate()).padStart(2,'0')}`;
      if (history[k]) { stats.streak++; check.setDate(check.getDate() - 1); } else break;
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return stats;
  } catch { return loadStats(); }
}

// ─── Injected CSS ──────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700;9..40,900&display=swap');

:root {
  --bg:#05070f; --surface:rgba(255,255,255,.038); --border:rgba(255,255,255,.08);
  --border2:rgba(255,255,255,.14); --accent:#F7C344; --accent2:#E84040;
  --accent3:#4F8EF7; --green:#3DD68C; --text:#F0F0F0;
  --muted:rgba(240,240,240,.45); --muted2:rgba(240,240,240,.25);
  --card-radius:16px; --dd:#060a1a; --orange:#F97316;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif}

.rf-page {
  background:var(--bg); color:var(--text); min-height:100vh;
  position:relative; overflow-x:hidden; font-family:'DM Sans',sans-serif;
}
.rf-bg-layer {
  position:absolute; inset:0; pointer-events:none; z-index:0;
  background:
    radial-gradient(circle at 12% 18%, rgba(249,115,22,0.05) 0%, transparent 42%),
    radial-gradient(circle at 88% 82%, rgba(247,195,68,0.04) 0%, transparent 46%);
}
.rf-noise {
  position:absolute; inset:0; pointer-events:none; z-index:1; opacity:.018;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* NAV */
.rf-nav {
  display:flex; align-items:center; justify-content:space-between;
  height:64px; padding:0 24px; position:relative; z-index:10;
  border-bottom:1px solid var(--border);
  background:rgba(5,7,15,0.7); backdrop-filter:blur(12px);
}
.rf-nav-logo {
  font-family:'Bebas Neue',sans-serif; font-size:1.6rem; letter-spacing:2px;
  background:linear-gradient(135deg,var(--orange),var(--accent));
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text; border:none; cursor:pointer; text-transform:uppercase;
}
.rf-nav-tag {
  font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:2px;
  color:var(--muted); border:1px solid var(--border); padding:5px 12px;
  border-radius:100px; display:flex; align-items:center; gap:6px;
  background:rgba(255,255,255,0.02);
}
.rf-fire-dot {
  width:6px; height:6px; border-radius:50%; background:var(--orange);
  box-shadow:0 0 8px var(--orange);
}
.rf-nav-right { display:flex; gap:8px; }
.rf-nav-btn {
  background:var(--surface); border:1px solid var(--border); color:#fff;
  padding:8px 14px; border-radius:10px; font-size:.8rem; font-weight:700;
  cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;
}
.rf-nav-btn:hover { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.2); }

/* MAIN */
.rf-main { max-width:580px; margin:0 auto; padding:28px 16px 80px; position:relative; z-index:5; }

/* START SCREEN */
.rf-start { text-align:center; padding:16px 8px; animation:fadeUp .5s ease both; }
.rf-start-emoji { font-size:3.4rem; margin-bottom:14px; display:block; }
.rf-start-title { font-family:'Bebas Neue',sans-serif; font-size:2.8rem; letter-spacing:1.5px; margin-bottom:6px; }
.rf-start-desc { font-size:.85rem; color:var(--muted); line-height:1.7; margin-bottom:28px; max-width:400px; margin-left:auto; margin-right:auto; }
.rf-diff-label { font-size:.62rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); margin-bottom:12px; }
.rf-diff-grid { display:flex; gap:10px; justify-content:center; margin-bottom:28px; flex-wrap:wrap; }
.rf-diff-btn {
  background:var(--surface); border:1px solid var(--border); border-radius:13px;
  padding:14px 22px; font-size:.82rem; font-weight:700; color:var(--text);
  cursor:pointer; font-family:inherit; transition:all .2s; text-align:center; min-width:110px;
}
.rf-diff-btn span { display:block; font-size:.62rem; font-weight:500; color:var(--muted); margin-top:3px; }
.rf-diff-btn.active,
.rf-diff-btn:hover { border-color:var(--accent); color:var(--accent); background:rgba(247,195,68,.07); }
.rf-diff-btn.active span { color:rgba(247,195,68,.65); }
.rf-start-cta {
  background:var(--accent); color:#000; border:none; font-weight:900;
  padding:16px 52px; border-radius:15px; font-size:1rem; cursor:pointer;
  font-family:inherit; transition:opacity .2s, transform .15s;
}
.rf-start-cta:hover { opacity:.93; transform:translateY(-2px); }
.rf-start-stats {
  display:flex; gap:8px; justify-content:center; margin-top:28px; flex-wrap:wrap;
}
.rf-start-stat {
  background:rgba(255,255,255,.025); border:1px solid var(--border); border-radius:12px;
  padding:12px 18px; text-align:center;
}
.rf-start-stat-val { font-family:'Bebas Neue',sans-serif; font-size:1.5rem; letter-spacing:1px; color:#fff; }
.rf-start-stat-lbl { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--muted); margin-top:2px; }

/* HUD */
.rf-hud {
  display:flex; align-items:center; justify-content:space-between;
  background:var(--surface); border:1px solid var(--border); border-radius:14px;
  padding:12px 18px; margin-bottom:14px; animation:fadeUp .4s ease both;
}
.rf-hud-item { text-align:center; }
.rf-hud-val { font-family:'Bebas Neue',sans-serif; font-size:1.85rem; letter-spacing:1px; line-height:1; }
.rf-hud-val.green { color:var(--green); }
.rf-hud-val.amber { color:var(--accent); }
.rf-hud-val.red   { color:var(--accent2); }
.rf-hud-val.white { color:#fff; }
.rf-hud-lbl { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:1.2px; color:var(--muted); margin-top:2px; }
.rf-hud-sep { width:1px; height:36px; background:var(--border); }

/* TIMER BAR */
.rf-timer-bar-wrap {
  background:rgba(255,255,255,.06); border-radius:100px; height:5px;
  margin-bottom:16px; overflow:hidden;
}
.rf-timer-bar {
  height:100%; border-radius:100px;
  transition:width .45s linear, background .35s;
}

/* PROGRESS DOTS */
.rf-progress-dots { display:flex; gap:5px; justify-content:center; flex-wrap:wrap; margin-bottom:16px; }
.rf-pg-dot {
  width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.1);
  border:1px solid rgba(255,255,255,.15); transition:background .3s, border-color .3s, transform .2s;
}
.rf-pg-dot.correct { background:var(--green); border-color:var(--green); }
.rf-pg-dot.wrong   { background:var(--accent2); border-color:var(--accent2); }
.rf-pg-dot.skipped { background:rgba(255,255,255,.2); border-color:rgba(255,255,255,.3); }
.rf-pg-dot.active  { background:var(--accent); border-color:var(--accent); transform:scale(1.4); }

/* QUESTION CARD */
.rf-q-card {
  background:rgba(255,255,255,.025); border:1px solid var(--border2);
  border-radius:18px; padding:26px 22px; margin-bottom:14px;
  animation:cardIn .4s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardIn { from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none} }
.rf-q-meta { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.rf-q-num-label { font-size:.6rem; font-weight:800; text-transform:uppercase; letter-spacing:1.3px; color:var(--muted); }
.rf-q-type-badge {
  font-size:.58rem; font-weight:900; text-transform:uppercase; letter-spacing:.8px;
  padding:3px 10px; border-radius:100px;
}
.rf-q-type-badge.fact     { background:rgba(79,142,247,.14); color:#7aaaff; border:1px solid rgba(79,142,247,.3); }
.rf-q-type-badge.club     { background:rgba(247,195,68,.12); color:var(--accent); border:1px solid rgba(247,195,68,.3); }
.rf-q-type-badge.country  { background:rgba(61,214,140,.12); color:var(--green); border:1px solid rgba(61,214,140,.3); }
.rf-q-type-badge.position { background:rgba(249,115,22,.12); color:var(--orange); border:1px solid rgba(249,115,22,.3); }
.rf-q-text { font-size:1.05rem; font-weight:700; line-height:1.55; color:#fff; }

/* OPTIONS */
.rf-options { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:18px; }
.rf-opt {
  background:rgba(255,255,255,.025); border:1px solid var(--border);
  border-radius:12px; padding:13px 14px; font-size:.84rem; font-weight:600;
  color:var(--text); cursor:pointer; text-align:left; font-family:inherit;
  display:flex; align-items:center; gap:8px;
  transition:background .15s, border-color .15s, transform .12s;
}
.rf-opt:hover:not(:disabled) { background:rgba(255,255,255,.07); border-color:rgba(247,195,68,.35); transform:translateY(-1px); }
.rf-opt:disabled { cursor:default; }
.rf-opt-letter {
  min-width:22px; height:22px; border-radius:6px; font-size:.66rem; font-weight:900;
  text-transform:uppercase; display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,.06); color:var(--muted); flex-shrink:0; transition:all .2s;
}
.rf-opt.correct { background:rgba(61,214,140,.16); border-color:rgba(61,214,140,.5); color:#fff; }
.rf-opt.correct .rf-opt-letter { background:rgba(61,214,140,.25); color:var(--green); }
.rf-opt.wrong   { background:rgba(232,64,64,.1); border-color:rgba(232,64,64,.35); color:var(--muted); }
.rf-opt.wrong   .rf-opt-letter { background:rgba(232,64,64,.2); color:var(--accent2); }
.rf-opt.missed  { background:rgba(61,214,140,.08); border-color:rgba(61,214,140,.3); color:var(--muted); }

/* FEEDBACK */
.rf-feedback {
  text-align:center; font-size:.8rem; font-weight:700; padding:9px 18px;
  border-radius:11px; animation:feedIn .28s ease; margin-bottom:4px;
}
@keyframes feedIn { from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)} }
.rf-feedback.correct { background:rgba(61,214,140,.12); color:var(--green); }
.rf-feedback.wrong   { background:rgba(232,64,64,.1); color:var(--accent2); }
.rf-feedback.timeout { background:rgba(247,195,68,.1); color:var(--accent); }

/* RESULT CARD */
.rf-result-card {
  background:rgba(255,255,255,.03); border:1px solid var(--border2);
  border-radius:20px; padding:36px 24px; text-align:center;
  animation:fadeUp .5s ease both;
}
.rf-result-badge {
  display:inline-block; padding:5px 14px; border-radius:100px;
  font-size:.62rem; font-weight:900; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px;
}
.rf-result-badge.great { background:rgba(61,214,140,.12); color:var(--green); border:1px solid rgba(61,214,140,.3); }
.rf-result-badge.ok    { background:rgba(247,195,68,.12); color:var(--accent); border:1px solid rgba(247,195,68,.3); }
.rf-result-badge.poor  { background:rgba(232,64,64,.12); color:var(--accent2); border:1px solid rgba(232,64,64,.3); }
.rf-result-title { font-family:'Bebas Neue',sans-serif; font-size:2.6rem; letter-spacing:1px; margin-bottom:4px; }
.rf-result-sub { font-size:.8rem; color:var(--muted); margin-bottom:22px; }
.rf-score-big { font-family:'Bebas Neue',sans-serif; font-size:4.8rem; letter-spacing:2px; color:var(--accent); line-height:1; }
.rf-score-label { font-size:.72rem; color:var(--muted); font-weight:600; margin-bottom:24px; }
.rf-result-breakdown {
  display:grid; grid-template-columns:repeat(4,1fr); gap:10px;
  background:rgba(5,7,15,.4); border:1px solid var(--border); border-radius:14px;
  padding:14px 10px; margin-bottom:24px;
}
.rf-rb-item { text-align:center; }
.rf-rb-val { font-family:'Bebas Neue',sans-serif; font-size:1.55rem; letter-spacing:.5px; }
.rf-rb-val.green { color:var(--green); }
.rf-rb-val.red   { color:var(--accent2); }
.rf-rb-val.amber { color:var(--accent); }
.rf-rb-lbl { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); margin-top:2px; }
.rf-result-actions { display:flex; gap:9px; justify-content:center; }
.rf-btn {
  padding:12px 20px; border-radius:12px; font-size:.84rem; font-weight:700;
  cursor:pointer; font-family:inherit; transition:opacity .2s,transform .15s; border:none;
}
.rf-btn:hover { opacity:.9; transform:translateY(-1px); }
.rf-btn.primary   { background:var(--accent); color:#000; flex:1.2; }
.rf-btn.secondary { background:var(--surface); color:#fff; border:1px solid var(--border2); flex:1; }
.rf-btn.ghost     { background:transparent; color:var(--muted); border:1px solid transparent; }

/* XP BADGE */
.rf-xp-badge {
  background:linear-gradient(135deg,rgba(247,195,68,0.12) 0%,rgba(249,115,22,0.12) 100%);
  border:1px solid rgba(247,195,68,0.25); border-radius:100px;
  padding:6px 16px; display:inline-flex; align-items:center; gap:6px;
  font-size:.78rem; font-weight:700; color:var(--accent); margin-bottom:18px;
  animation:pillPop .6s ease;
}
@keyframes pillPop { 0%{transform:scale(1)}45%{transform:scale(1.12)}100%{transform:scale(1)} }

/* MODAL */
.rf-modal-overlay {
  display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.84);
  backdrop-filter:blur(14px); justify-content:center; align-items:center; padding:20px;
}
.rf-modal-overlay.active { display:flex; animation:fadeIn .22s ease; }
@keyframes fadeIn { from{opacity:0}to{opacity:1} }
.rf-modal-box {
  background:#0c1020; border:1px solid rgba(249,115,22,.25); border-radius:24px;
  padding:40px 32px; max-width:480px; width:100%; max-height:88vh; overflow-y:auto;
  position:relative; animation:modalUp .3s cubic-bezier(.4,0,.2,1);
}
.rf-modal-box::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--orange),var(--accent),var(--orange));
  border-radius:24px 24px 0 0;
}
@keyframes modalUp { from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none} }
.rf-modal-title { font-family:'Bebas Neue',sans-serif; font-size:2.2rem; letter-spacing:2px; text-align:center; margin-bottom:22px; }
.rf-rules-list { list-style:none; margin-bottom:22px; display:flex; flex-direction:column; gap:8px; }
.rf-rules-list li {
  background:var(--surface); border:1px solid var(--border); border-left:3px solid rgba(249,115,22,0.45);
  border-radius:12px; padding:12px 15px; font-size:.86rem; line-height:1.6;
  transition:border-color .2s,transform .2s;
}
.rf-rules-list li:hover { border-left-color:var(--orange); transform:translateX(4px); }
.rf-modal-close {
  width:100%; padding:13px; font-size:.9rem; border-radius:12px; background:var(--orange);
  color:#fff; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:700;
  transition:opacity .2s;
}
.rf-modal-close:hover { opacity:.88; }

/* SPINNER */
.rf-spinner { display:flex; align-items:center; justify-content:center; height:100vh; background:var(--bg); }
.rf-spinner-ring {
  width:28px; height:28px; border-radius:50%; border:3px solid rgba(255,255,255,.07);
  border-top-color:var(--orange); animation:spin .7s linear infinite;
}
@keyframes spin { to{transform:rotate(360deg)} }

@keyframes fadeUp { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }

/* MSG BANNER */
.rf-msg-banner {
  position:fixed; top:76px; left:50%; transform:translateX(-50%);
  padding:10px 20px; border-radius:10px; z-index:100000;
  font-size:.85rem; font-weight:700; box-shadow:0 8px 24px rgba(0,0,0,.3);
  pointer-events:none; animation:feedIn .25s ease;
}

/* RESPONSIVE */
@media(max-width:700px){
  .rf-nav { padding:0 14px; height:54px; }
  .rf-main { padding:16px 12px 56px; }
  .rf-start-title { font-size:2.1rem; }
  .rf-options { grid-template-columns:1fr; }
  .rf-result-breakdown { grid-template-columns:1fr 1fr; }
  .rf-result-card { padding:28px 16px; }
  .rf-result-actions { flex-direction:column; align-items:stretch; }
}
@media(max-width:400px){
  .rf-diff-grid { flex-direction:column; align-items:center; }
}
`;

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RapidFire() {
  const navigate = useNavigate();
  // Game phases: 'start' | 'game' | 'result'
  const [phase, setPhase]           = useState('start');
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions]   = useState([]);
  const [current, setCurrent]       = useState(0);
  const [score, setScore]           = useState(0);
  const [answers, setAnswers]       = useState([]); // true/false/null per question
  const [timeLeft, setTimeLeft]     = useState(14);
  const [answered, setAnswered]     = useState(false);
  const [chosenIdx, setChosenIdx]   = useState(null);
  const [feedback, setFeedback]     = useState(null); // { text, cls }
  const [gameOver, setGameOver]     = useState(false);
  const [xpAwarded, setXpAwarded]   = useState(null);
  const [stats, setStats]           = useState(loadStats);
  const [showModal, setShowModal]   = useState(false);
  const [msg, setMsg]               = useState(null);

  const timerRef = useRef(null);

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById('rf-injected-css')) {
      const s = document.createElement('style');
      s.id = 'rf-injected-css';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  function showMsg(text, type = 'info', duration = 2800) {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), duration);
  }

  // ─── Timer ──────────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback((cfg) => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  // Timeout handler
  useEffect(() => {
    if (phase !== 'game' || answered || timeLeft > 0) return;
    handleAnswer(null); // timed out
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, answered]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ─── Game actions ────────────────────────────────────────────────────────────
  function startGame() {
    const cfg = DIFFICULTY[difficulty];

    // Interstitial before new game
    adBreak({
      type: 'start',
      name: 'rapid-fire-game-start',
      adBreakDone: () => {
        const qs = buildQuestions(cfg.count);
        setQuestions(qs);
        setCurrent(0);
        setScore(0);
        setAnswers([]);
        setTimeLeft(cfg.time);
        setAnswered(false);
        setChosenIdx(null);
        setFeedback(null);
        setXpAwarded(null);
        setPhase('game');
        setTimeout(() => startTimer(cfg), 80);
      },
    });
  }

  function handleAnswer(idx) {
    if (answered) return;
    stopTimer();
    setAnswered(true);
    setChosenIdx(idx);

    const cfg  = DIFFICULTY[difficulty];
    const q    = questions[current];
    const isTimeout = idx === null;
    const isCorrect = !isTimeout && idx === q.ans;

    let pts = 0;
    let fb  = null;

    if (isCorrect) {
      const speedBonus = Math.floor(timeLeft * PTS_SPEED_BONUS / cfg.time);
      pts = PTS_CORRECT + speedBonus;
      fb  = { text: `✓ Correct! +${pts} pts${speedBonus > 0 ? ` (${speedBonus} speed bonus)` : ''}`, cls: 'correct' };
    } else if (isTimeout) {
      fb = { text: `⏱ Time's up! The answer was: ${q.opts[q.ans]}`, cls: 'timeout' };
    } else {
      fb = { text: `✗ Wrong. Correct answer: ${q.opts[q.ans]}`, cls: 'wrong' };
    }

    setFeedback(fb);
    setScore(prev => prev + pts);
    setAnswers(prev => [...prev, isCorrect]);

    setTimeout(() => advanceQuestion(current + 1, [...answers, isCorrect], score + pts), 1600);
  }

  async function advanceQuestion(nextIdx, allAnswers, finalScore) {
    const cfg = DIFFICULTY[difficulty];

    if (nextIdx >= questions.length) {
      // Game complete
      stopTimer();
      const correct  = allAnswers.filter(Boolean).length;
      const accuracy = Math.round((correct / questions.length) * 100);
      const newStats = saveStats(finalScore, accuracy);
      setStats(newStats);

      const user = getUser();
      let awarded = 0;
      if (user?.userId) {
        try {
          const res = await awardXP(user.userId, 'rapidFire_complete', {
            rawXP: 25,
          });
          awarded = res?.xpAwarded ?? 0;
        } catch (e) {
          console.error('[RapidFire] awardXP failed:', e);
        }
      }
      setXpAwarded(awarded);
      setPhase('result');
      return;
    }

    // Rewarded ad every 5 questions
    if (nextIdx % 5 === 0) {
      adBreak({ type: 'next', name: `rapid-fire-q${nextIdx}`, adBreakDone: () => {} });
    }

    setCurrent(nextIdx);
    setAnswered(false);
    setChosenIdx(null);
    setFeedback(null);
    setTimeLeft(cfg.time);
    setTimeout(() => startTimer(cfg), 80);
  }

  function handleShare() {
    const correct  = answers.filter(Boolean).length;
    const accuracy = Math.round((correct / questions.length) * 100);
    const text = [
      `⚡ Footbrawls – Rapid Fire`,
      `${correct}/${questions.length} correct · ${score} pts · ${accuracy}% accuracy`,
      `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
      `https://footbrawls.vercel.app/games/rapidfire`,
    ].join('\n');
    if (navigator.share) { navigator.share({ text }).catch(() => {}); }
    else { navigator.clipboard?.writeText(text); showMsg('Result copied!', 'success'); }
  }

  // ─── Derived state ───────────────────────────────────────────────────────────
  const cfg        = DIFFICULTY[difficulty];
  const timerPct   = questions.length ? (timeLeft / cfg.time) * 100 : 100;
  const timerColor = timerPct > 50
    ? 'linear-gradient(90deg,var(--green),#8fffcb)'
    : timerPct > 25
      ? 'linear-gradient(90deg,var(--accent2),var(--accent))'
      : 'var(--accent2)';
  const timeClass  = timerPct > 50 ? 'green' : timerPct > 25 ? 'amber' : 'red';

  const correct  = answers.filter(Boolean).length;
  const accuracy = questions.length ? Math.round((correct / questions.length) * 100) : 0;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="rf-page">
        <div className="rf-bg-layer" />
        <div className="rf-noise" />

        {/* Msg Banner */}
        {msg && (
          <div
            className="rf-msg-banner"
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

        {/* Modal */}
        <HowToPlayModal show={showModal} onClose={() => setShowModal(false)} />

        {/* NAV */}
        <nav className="rf-nav">
          <button className="rf-nav-logo" onClick={() => navigate('/')}>←</button>
          <div className="rf-nav-tag">
            <span className="rf-fire-dot" />
            Rapid Fire
          </div>
          <div className="rf-nav-right">
            <button className="rf-nav-btn" onClick={() => setShowModal(true)}>❓ Help</button>
          </div>
        </nav>

        <main className="rf-main">

          {/* ── START SCREEN ── */}
          {phase === 'start' && (
            <div className="rf-start">
              <span className="rf-start-emoji">⚡</span>
              <div className="rf-start-title">Rapid Fire</div>
              <div className="rf-start-desc">
                Hard football questions. Tight clock. Every correct answer earns speed bonuses —
                the faster you answer, the more points you pocket.
              </div>
              <div className="rf-diff-label">Difficulty</div>
              <div className="rf-diff-grid">
                {Object.entries(DIFFICULTY).map(([key, d]) => (
                  <button
                    key={key}
                    className={`rf-diff-btn${difficulty === key ? ' active' : ''}`}
                    onClick={() => setDifficulty(key)}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
              <button className="rf-start-cta" onClick={startGame}>Kick Off ⚡</button>
              <div className="rf-start-stats">
                {[
                  { val: stats.played || '—', lbl: 'Games' },
                  { val: stats.bestScore || '—', lbl: 'Best Score' },
                  { val: stats.avgAcc ? `${stats.avgAcc}%` : '—', lbl: 'Avg Accuracy' },
                  { val: stats.streak || '—', lbl: 'Streak' },
                ].map(s => (
                  <div className="rf-start-stat" key={s.lbl}>
                    <div className="rf-start-stat-val">{s.val}</div>
                    <div className="rf-start-stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GAME SCREEN ── */}
          {phase === 'game' && questions.length > 0 && (() => {
            const q = questions[current];
            const typeLabel = { fact: 'Fact', club: 'Club', country: 'Country', position: 'Position' }[q.type];

            return (
              <>
                {/* HUD */}
                <div className="rf-hud">
                  <div className="rf-hud-item">
                    <div className="rf-hud-val white">{current + 1}/{questions.length}</div>
                    <div className="rf-hud-lbl">Question</div>
                  </div>
                  <div className="rf-hud-sep" />
                  <div className="rf-hud-item">
                    <div className={`rf-hud-val ${timeClass}`}>{timeLeft}s</div>
                    <div className="rf-hud-lbl">Time</div>
                  </div>
                  <div className="rf-hud-sep" />
                  <div className="rf-hud-item">
                    <div className="rf-hud-val green">{score}</div>
                    <div className="rf-hud-lbl">Score</div>
                  </div>
                  <div className="rf-hud-sep" />
                  <div className="rf-hud-item">
                    <div className="rf-hud-val white">{correct}</div>
                    <div className="rf-hud-lbl">Correct</div>
                  </div>
                </div>

                {/* Timer bar */}
                <div className="rf-timer-bar-wrap">
                  <div
                    className="rf-timer-bar"
                    style={{ width: `${timerPct}%`, background: timerColor }}
                  />
                </div>

                {/* Progress dots */}
                <div className="rf-progress-dots">
                  {questions.map((_, i) => {
                    let cls = '';
                    if (i < answers.length) {
                      cls = answers[i] === true ? 'correct' : answers[i] === false ? 'wrong' : 'skipped';
                    } else if (i === current) {
                      cls = 'active';
                    }
                    return <div key={i} className={`rf-pg-dot ${cls}`} />;
                  })}
                </div>

                {/* Question card */}
                <div className="rf-q-card" key={current}>
                  <div className="rf-q-meta">
                    <span className="rf-q-num-label">Q{current + 1}</span>
                    <span className={`rf-q-type-badge ${q.type}`}>{typeLabel}</span>
                  </div>
                  <div className="rf-q-text">{q.q}</div>
                  <div className="rf-options">
                    {q.opts.map((opt, i) => {
                      let cls = '';
                      if (answered) {
                        if (i === q.ans) cls = 'correct';
                        else if (i === chosenIdx) cls = 'wrong';
                      }
                      return (
                        <button
                          key={i}
                          className={`rf-opt ${cls}`}
                          disabled={answered}
                          onClick={() => handleAnswer(i)}
                        >
                          <span className="rf-opt-letter">{LETTERS[i]}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback */}
                {feedback && (
                  <div className={`rf-feedback ${feedback.cls}`} key={`fb-${current}`}>
                    {feedback.text}
                  </div>
                )}
              </>
            );
          })()}

          {/* ── RESULT SCREEN ── */}
          {phase === 'result' && (() => {
            const pct = accuracy;
            let badgeCls, title, badgeText;
            if (pct >= 80) { badgeCls = 'great'; title = 'World Class!'; badgeText = 'Elite knowledge'; }
            else if (pct >= 55) { badgeCls = 'ok'; title = 'Solid Effort!'; badgeText = 'Good performance'; }
            else { badgeCls = 'poor'; title = 'Keep Studying!'; badgeText = 'Room to grow'; }
            const wrong = answers.filter(a => a === false).length;

            return (
              <div className="rf-result-card">
                <div className={`rf-result-badge ${badgeCls}`}>{badgeText}</div>
                <div className="rf-result-title">{title}</div>
                <div className="rf-result-sub">
                  You answered {correct} of {questions.length} questions correctly
                </div>

                {xpAwarded != null && (
                  <div className="rf-xp-badge">
                    {xpAwarded > 0 ? `+${xpAwarded} XP earned` : 'Daily XP limit reached'}
                  </div>
                )}

                <div className="rf-score-big">{score}</div>
                <div className="rf-score-label">out of {questions.length * (PTS_CORRECT + PTS_SPEED_BONUS)} max pts</div>

                <div className="rf-result-breakdown">
                  <div className="rf-rb-item">
                    <div className="rf-rb-val green">{correct}</div>
                    <div className="rf-rb-lbl">Correct</div>
                  </div>
                  <div className="rf-rb-item">
                    <div className="rf-rb-val red">{wrong}</div>
                    <div className="rf-rb-lbl">Wrong</div>
                  </div>
                  <div className="rf-rb-item">
                    <div className="rf-rb-val amber">{pct}%</div>
                    <div className="rf-rb-lbl">Accuracy</div>
                  </div>
                  <div className="rf-rb-item">
                    <div className="rf-rb-val white">{difficulty.slice(0,1).toUpperCase()}</div>
                    <div className="rf-rb-lbl">Difficulty</div>
                  </div>
                </div>

                <div className="rf-result-actions">
                  <button className="rf-btn primary" onClick={() => { setPhase('start'); }}>Play Again ⚡</button>
                  <button className="rf-btn secondary" onClick={handleShare}>Share 📤</button>
                  <button className="rf-btn ghost" onClick={() => window.history.back()}>← Home</button>
                </div>
              </div>
            );
          })()}

        </main>
      </div>
    </>
  );
}

// ─── How to Play Modal ────────────────────────────────────────────────────────
function HowToPlayModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className={`rf-modal-overlay${show ? ' active' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rf-modal-box">
        <h2 className="rf-modal-title">⚡ How to Play</h2>
        <ul className="rf-rules-list">
          <li><strong>🎯 Goal:</strong> Answer as many football questions correctly as possible before time runs out on each one</li>
          <li><strong>⏱ Timer:</strong> Each question has a countdown — if it hits zero, you get no points and the answer is revealed</li>
          <li><strong>⚡ Speed bonus:</strong> Answer quickly to earn bonus points on top of the base 10 pts per correct answer</li>
          <li><strong>🚫 No penalties:</strong> Wrong answers don't subtract points, but you lose the chance at a speed bonus</li>
          <li><strong>📺 Categories:</strong> Questions cover nationality, current clubs, player positions, and hard football facts</li>
          <li><strong>🏆 Difficulty:</strong> Easy = more time, fewer questions. Hard = tight clock, longer run</li>
        </ul>
        <button className="rf-modal-close" onClick={onClose}>🚀 Let's Go!</button>
      </div>
    </div>
  );
}