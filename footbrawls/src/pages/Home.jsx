import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUser } from "../lib/user";
import { COUNTRIES } from "../lib/countries";

const DAILY_XP_CAP  = 200;
const CASTLE_HP_CAP = 10000;

// accent colours map exactly to Crickingo gc-* CSS vars
const GAME_META = [
  { id:"whoAreYa",      icon:"👤", name:"Who Are Ya?",     desc:"Guess the mystery player from silhouette and hints.",      xp:25,  route:"/games/whoareya",      storageKey:"footbrawls_whoareya",       gc:"gc-purple", accent:"#A855F7" },
  { id:"matchPredictor",icon:"🔮", name:"Match Predictor", desc:"Lock result and scorer picks before kickoff.",             xp:100, route:"/games/matchpredictor", storageKey:"footbrawls_matchpredictor", gc:"gc-blue",   accent:"#4F8EF7" },
  { id:"penaltyNerve",  icon:"⚽", name:"Penalty Nerve",   desc:"Beat the keeper across five pressure kicks.",              xp:30,  route:"/games/penaltynerve",   storageKey:"footbrawls_penaltynerve",   gc:"gc-red",    accent:"#E84040" },
  { id:"wordle",        icon:"🟩", name:"Player Wordle",   desc:"Use attribute colour feedback to find the footballer.",    xp:20,  route:"/games/wordle",         storageKey:"footbrawls_wordle_history", gc:"gc-green",  accent:"#3DD68C" },
  { id:"higherLower",   icon:"📊", name:"Higher or Lower", desc:"Compare age, caps, goals, and market value.",              xp:15,  route:"/games/higherlower",    storageKey:"footbrawls_higherlower",    gc:"gc-orange", accent:"#F97316" },
  { id:"transferTrail", icon:"🔗", name:"Transfer Trail",  desc:"Connect two players through shared clubs in fewest hops.", xp:20,  route:"/games/transfertrail",  storageKey:"footbrawls_transfertrail",  gc:"gc-teal",   accent:"#06B6D4" },
];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isDoneToday(game) {
  try {
    const today = getTodayKey(), raw = localStorage.getItem(game.storageKey);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.date === today || Boolean(data[today]);
  } catch { return false; }
}
function pad(n) { return String(n).padStart(2,"0"); }
function fmtCountdown(s) { return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`; }
function clampPct(v, max) { return !max ? 0 : Math.max(0, Math.min(100, Math.round((v/max)*100))); }

function useNextFixture() {
  const [fixture, setFixture] = useState(null);
  useEffect(() => {
    const q = query(collection(db,"fixtures"), where("kickoffAt",">=",new Date()), where("isComplete","==",false), orderBy("kickoffAt","asc"), limit(1));
    return onSnapshot(q, snap => setFixture(snap.empty ? null : { id:snap.docs[0].id, ...snap.docs[0].data() }), () => setFixture(null));
  },[]);
  return fixture;
}

function useGuildActivity(guildCode) {
  const [feed, setFeed] = useState([]);
  useEffect(() => {
    if (!guildCode) return;
    const q = query(collection(db,"activity"), where("guildCode","==",guildCode), orderBy("createdAt","desc"), limit(4));
    return onSnapshot(q, snap => setFeed(snap.docs.map(d => ({id:d.id,...d.data()}))), () => setFeed([]));
  },[guildCode]);
  return feed;
}

const STATIC_FEED = [
  { icon:"⚽", user:"Priya_10",  action:"held nerve from the spot",    time:"2m"  },
  { icon:"👤", user:"Arjun_CF",  action:"solved Who Are Ya in 2",       time:"5m"  },
  { icon:"🔮", user:"Vikram_7",  action:"locked a bold scoreline",      time:"11m" },
  { icon:"🔗", user:"Sneha_11",  action:"finished Transfer Trail in 3", time:"18m" },
];

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

  :root {
    --bg:#060810; --bg2:#0c0f1a;
    --surface:rgba(255,255,255,0.04); --surface2:rgba(255,255,255,0.07); --surface3:rgba(255,255,255,0.11);
    --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.13); --border3:rgba(255,255,255,0.2);
    --accent:#F7C344; --accent-glow:rgba(247,195,68,0.35); --accent-dim:rgba(247,195,68,0.12);
    --green:#3DD68C; --blue:#4F8EF7; --red:#E84040; --purple:#A855F7; --teal:#06B6D4; --orange:#F97316;
    --text:#F2F2F4; --muted:rgba(242,242,244,0.5); --muted2:rgba(242,242,244,0.28); --muted3:rgba(242,242,244,0.15);
  }
  body { background:var(--bg) !important; font-family:'Syne',sans-serif; }

  /* ── BACKGROUND ── */
  .fb-bg { position:fixed;inset:0;z-index:0;pointer-events:none; }
  .fb-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.055) 1px,transparent 1px);background-size:56px 56px;animation:fbGridPulse 6s ease-in-out infinite; }
  .fb-grid::after { content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(247,195,68,0.18) 1px,transparent 1px);background-size:56px 56px;background-position:-0.5px -0.5px;animation:fbGridPulse 6s ease-in-out infinite reverse; }
  .fb-blob { position:absolute;border-radius:50%;filter:blur(90px);opacity:0.55; }
  .fb-blob1 { width:900px;height:700px;top:-320px;left:-160px;background:radial-gradient(ellipse,rgba(247,195,68,0.38) 0%,rgba(247,195,68,0.14) 35%,transparent 70%);animation:fbDrift 18s ease-in-out infinite alternate; }
  .fb-blob2 { width:500px;height:400px;bottom:-80px;right:-120px;background:radial-gradient(ellipse,rgba(232,64,64,0.11) 0%,transparent 70%);animation:fbDrift 22s ease-in-out infinite alternate-reverse; }
  .fb-blob3 { width:420px;height:340px;top:40%;left:42%;background:radial-gradient(ellipse,rgba(79,142,247,0.07) 0%,transparent 70%);animation:fbDrift 16s ease-in-out infinite alternate; }
  .fb-noise { position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.028;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:256px; }

  /* ── GAME CARD — exact Crickingo pattern ── */
  .gc-fire{--ca:#F7C344;--cag:rgba(247,195,68,0.09);--cag2:rgba(247,195,68,0.18);--cas:rgba(247,195,68,0.25)}
  .gc-orange{--ca:#F97316;--cag:rgba(249,115,22,0.09);--cag2:rgba(249,115,22,0.18);--cas:rgba(249,115,22,0.25)}
  .gc-blue{--ca:#4F8EF7;--cag:rgba(79,142,247,0.09);--cag2:rgba(79,142,247,0.18);--cas:rgba(79,142,247,0.25)}
  .gc-purple{--ca:#A855F7;--cag:rgba(168,85,247,0.09);--cag2:rgba(168,85,247,0.18);--cas:rgba(168,85,247,0.25)}
  .gc-amber{--ca:#F59E0B;--cag:rgba(245,158,11,0.09);--cag2:rgba(245,158,11,0.18);--cas:rgba(245,158,11,0.25)}
  .gc-red{--ca:#E84040;--cag:rgba(232,64,64,0.09);--cag2:rgba(232,64,64,0.18);--cas:rgba(232,64,64,0.25)}
  .gc-green{--ca:#3DD68C;--cag:rgba(61,214,140,0.09);--cag2:rgba(61,214,140,0.18);--cas:rgba(61,214,140,0.25)}
  .gc-teal{--ca:#06B6D4;--cag:rgba(6,182,212,0.09);--cag2:rgba(6,182,212,0.18);--cas:rgba(6,182,212,0.25)}

  .game-card {
    position:relative; display:flex; align-items:center; gap:16px;
    color:var(--text); background:var(--surface); border:1px solid var(--border);
    border-radius:16px; padding:16px 18px; overflow:hidden;
    cursor:pointer; width:100%;
    transition:transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s, border-color 0.28s, background 0.28s;
  }
  .game-card::before {
    content:''; position:absolute; left:0; top:10%; bottom:10%;
    width:3px; border-radius:0 3px 3px 0;
    background:var(--ca,var(--accent)); opacity:0.55;
    transition:opacity 0.25s, top 0.25s, bottom 0.25s;
  }
  .card-glow {
    position:absolute; inset:0; pointer-events:none; border-radius:16px;
    background:linear-gradient(110deg,var(--cag,rgba(247,195,68,0.07)),transparent 60%);
    opacity:0; transition:opacity 0.28s;
  }
  .card-shimmer { position:absolute;inset:0;border-radius:16px;overflow:hidden;pointer-events:none; }
  .card-shimmer::before { content:'';position:absolute;top:0;left:-130%;width:65%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,0.05),transparent);animation:shimmer 4s ease-in-out infinite; }

  .game-card:hover {
    transform:translateX(4px) translateY(-3px);
    border-color:color-mix(in srgb,var(--ca,var(--accent)) 40%,transparent);
    box-shadow:0 14px 40px rgba(0,0,0,0.45), 0 0 0 1px color-mix(in srgb,var(--ca,var(--accent)) 18%,transparent), inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .game-card:hover::before { opacity:1; top:0; bottom:0; border-radius:0; }
  .game-card:hover .card-glow { opacity:1; }
  .game-card:active { transform:translateX(2px) translateY(-1px) scale(0.99); }

  .card-icon {
    position:relative; z-index:2; flex-shrink:0;
    width:54px; height:54px;
    display:flex; align-items:center; justify-content:center;
    background:var(--cag,rgba(247,195,68,0.08));
    border:1px solid color-mix(in srgb,var(--ca,var(--accent)) 22%,transparent);
    border-radius:14px; font-size:1.65rem;
    transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s;
  }
  .game-card:hover .card-icon { transform:scale(1.12) rotate(-5deg); box-shadow:0 0 22px var(--cas,rgba(247,195,68,0.22)); }

  .card-arrow {
    position:relative; z-index:2; flex-shrink:0;
    width:36px; height:36px;
    display:flex; align-items:center; justify-content:center;
    background:var(--surface2); border:1px solid var(--border2);
    border-radius:50%; color:var(--ca,var(--accent)); font-size:1rem;
    transition:all 0.28s cubic-bezier(0.34,1.56,0.64,1);
  }
  .game-card:hover .card-arrow { background:var(--ca,var(--accent)); border-color:var(--ca,var(--accent)); color:#000; transform:translateX(4px) scale(1.12); }

  .card-done-badge {
    position:absolute; top:10px; right:50px; z-index:3;
    font-family:'Space Mono',monospace; font-size:0.54rem; font-weight:700;
    letter-spacing:1.5px; text-transform:uppercase;
    padding:3px 9px; border-radius:100px;
    color:var(--green); background:rgba(61,214,140,0.1); border:1px solid rgba(61,214,140,0.25);
  }

  /* ── NAV ── */
  .fb-nav { position:sticky;top:0;z-index:200;height:64px;padding:0 max(20px,4vw);background:rgba(6,8,16,0.35);backdrop-filter:blur(16px) saturate(1.3);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between; }
  .fb-nav::after { content:'';position:absolute;top:100%;left:0;right:0;height:80px;pointer-events:none;background:linear-gradient(to bottom,rgba(247,195,68,0.05) 0%,transparent 100%);z-index:199; }
  .fb-logo { font-family:'Bebas Neue',sans-serif;font-size:1.85rem;letter-spacing:3px;background:linear-gradient(110deg,#ffe680 0%,#F7C344 40%,#e8a800 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .fb-logo em { font-style:normal;-webkit-text-fill-color:#F2F2F4; }
  .fb-logo small { font-family:'Space Mono',monospace;font-size:0.55rem;font-weight:700;letter-spacing:1px;-webkit-text-fill-color:rgba(242,242,244,0.35); }
  .fb-live-badge { display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:100px;background:rgba(61,214,140,0.1);border:1px solid rgba(61,214,140,0.3);font-family:'Space Mono',monospace;font-size:0.62rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--green); }
  .fb-live-dot { width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:fbPulse 1.8s ease infinite;display:inline-block; }
  .fb-nav-pill { display:flex;align-items:center;gap:7px;padding:7px 14px;border-radius:100px;border:1px solid var(--border2);background:var(--surface);color:var(--muted);font-family:'Space Mono',monospace;font-size:0.66rem;font-weight:700;letter-spacing:0.5px;cursor:pointer;transition:all 0.22s; }
  .fb-nav-pill:hover { background:var(--surface3);border-color:var(--border3);color:var(--text);transform:translateY(-1px); }
  .fb-xp-bar { display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:100px;background:rgba(247,195,68,0.08);border:1px solid rgba(247,195,68,0.2); }
  .fb-xp-track { width:60px;height:4px;border-radius:99px;background:rgba(255,255,255,0.1);overflow:hidden; }
  .fb-xp-fill { height:100%;border-radius:99px;background:linear-gradient(90deg,#F7C344,#ffe680);transition:width 0.4s ease; }

  /* ── HERO EYEBROW ── */
  .fb-eyebrow { display:inline-flex;align-items:center;gap:8px;background:rgba(247,195,68,0.09);border:1px solid rgba(247,195,68,0.25);color:var(--accent);font-family:'Space Mono',monospace;font-size:0.62rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:5px 14px 5px 10px;border-radius:100px;margin-bottom:22px; }
  .fb-eyebrow-dot { width:6px;height:6px;border-radius:50%;background:var(--accent);animation:fbPulse 1.8s ease infinite;display:inline-block; }

  /* ── SECTION HDR ── */
  .fb-section-hdr { display:flex;align-items:center;gap:14px;margin-bottom:18px; }
  .fb-section-label { font-family:'Space Mono',monospace;font-size:0.62rem;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;color:var(--muted2);white-space:nowrap; }
  .fb-section-line { flex:1;height:1px;background:linear-gradient(90deg,var(--border2),transparent); }
  .fb-section-right { font-family:'Space Mono',monospace;font-size:0.6rem;color:var(--accent);letter-spacing:1px; }

  /* ── SIDEBAR CARDS ── */
  .fb-match-card { background:rgba(79,142,247,0.08);border:1px solid rgba(79,142,247,0.22);border-radius:16px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:14px;transition:border-color 0.22s,box-shadow 0.22s; }
  .fb-match-card:hover { border-color:rgba(79,142,247,0.4);box-shadow:0 8px 28px rgba(0,0,0,0.3); }
  .fb-pulse-feed { background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden; }
  .fb-feed-row { display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);transition:background 0.18s; }
  .fb-feed-row:last-child { border-bottom:none; }
  .fb-feed-row:hover { background:var(--surface2); }
  .fb-feed-icon { width:30px;height:30px;border-radius:8px;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0; }

  /* ── RAID BANNER ── */
  .fb-raid {
    position:relative; overflow:hidden; width:100%;
    background:linear-gradient(135deg,rgba(168,85,247,0.13),rgba(79,142,247,0.06));
    border:1px solid rgba(168,85,247,0.28); border-radius:16px;
    padding:16px; display:flex; align-items:center; gap:14px;
    color:var(--text); text-align:left; cursor:pointer;
    transition:transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  }
  .fb-raid:hover { transform:translateY(-3px); border-color:rgba(168,85,247,0.5); box-shadow:0 14px 40px rgba(168,85,247,0.15),0 0 0 1px rgba(168,85,247,0.15); }
  .fb-raid:hover .fb-raid-icon { transform:scale(1.1) rotate(-5deg); box-shadow:0 0 20px rgba(168,85,247,0.35); }
  .fb-raid-icon { width:48px;height:48px;border-radius:14px;background:rgba(168,85,247,0.13);border:1px solid rgba(168,85,247,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.28s; }
  .fb-raid-arrow { color:var(--purple);font-size:24px;font-weight:900;flex-shrink:0;transition:transform 0.22s; }
  .fb-raid:hover .fb-raid-arrow { transform:translateX(4px); }

  /* ── STAT TILES ── */
  .fb-stat-row { display:flex;gap:0;border:1px solid var(--border2);border-radius:14px;overflow:hidden;margin-bottom:24px; }
  .fb-stat-tile { display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 20px;background:var(--surface);border-right:1px solid var(--border2);flex:1; }
  .fb-stat-tile:last-child { border-right:none; }
  .fb-stat-num { font-family:'Bebas Neue',sans-serif;font-size:1.9rem;letter-spacing:1px;color:var(--accent);line-height:1; }
  .fb-stat-lbl { font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted); }

  /* ── BOTTOM NAV ── */
  .fb-bottom-nav { position:fixed;bottom:0;left:0;right:0;z-index:200;display:flex;background:rgba(6,8,16,0.96);backdrop-filter:blur(20px);border-top:1px solid var(--border);padding-bottom:env(safe-area-inset-bottom,0px); }
  .fb-nav-item { position:relative;flex:1;min-width:0;border:none;background:transparent;padding:9px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-family:'Syne',sans-serif;transition:color 0.15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation; }
  .fb-nav-item:hover { color:#F2F2F4 !important; }
  .fb-nav-indicator { position:absolute;top:0;left:50%;transform:translateX(-50%);width:26px;height:2px;border-radius:0 0 99px 99px;background:var(--green);box-shadow:0 0 8px var(--green); }

  /* ── CASTLE HP ── */
  .fb-castle-wrap { display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:6px; }

  /* ── TOAST ── */
  .fb-toast { position:fixed;bottom:76px;left:50%;transform:translateX(-50%);z-index:300;max-width:calc(100vw - 32px);background:rgba(12,15,26,0.96);border:1px solid var(--border2);border-radius:999px;color:var(--text);padding:10px 18px;font-family:'Space Mono',monospace;font-size:0.76rem;font-weight:700;white-space:nowrap;box-shadow:0 12px 30px rgba(0,0,0,0.4);pointer-events:none;animation:fbFadeUp 0.22s ease; }

  /* ── KEYFRAMES ── */
  @keyframes fbDrift { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(36px,28px) scale(1.1)} }
  @keyframes fbGridPulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
  @keyframes fbFadeUp { from{opacity:0;transform:translateX(-50%) translateY(14px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes fbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.6)} }
  @keyframes shimmer { 0%{left:-130%} 100%{left:210%} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }

  /* ── RESPONSIVE ── */
  @media(max-width:900px){
    .fb-sidebar { display:none; }
    .fb-main-grid { grid-template-columns:1fr !important; }
  }
  @media(max-width:640px){
    .fb-nav { height:56px; padding:0 16px; }
    .fb-live-badge,.fb-xp-bar { display:none; }
    .fb-stat-row { display:grid; grid-template-columns:1fr 1fr; }
    .fb-stat-tile:nth-child(2) { border-right:none; }
    .fb-stat-tile:nth-child(3) { border-top:1px solid var(--border2); }
    .fb-stat-tile:nth-child(4) { border-top:1px solid var(--border2); border-right:none; }
    .fb-blob { filter:blur(40px); opacity:0.3; }
    .fb-grid { display:none; }
  }
`;

export default function Home() {
  const navigate = useNavigate();
  const [toast, setToast]         = useState("");
  const [mockSecs, setMockSecs]   = useState(3*3600+42*60+19);
  const [localUser, setLocalUser] = useState(() => getUser());
  const [guildDoc, setGuildDoc]   = useState(null);

  useEffect(() => {
    if (!document.getElementById("fb-global-css")) {
      const s = document.createElement("style");
      s.id = "fb-global-css";
      s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  },[]);

  useEffect(() => { setLocalUser(getUser()); },[]);
  useEffect(() => {
    const t = setInterval(() => setMockSecs(s => Math.max(0, s-1)), 1000);
    return () => clearInterval(t);
  },[]);
  useEffect(() => {
    if (!localUser?.homeCountry) return;
    return onSnapshot(doc(db,"guilds",localUser.homeCountry), snap => setGuildDoc(snap.exists() ? snap.data() : null), () => setGuildDoc(null));
  },[localUser?.homeCountry]);

  const nextFixture  = useNextFixture();
  const activityFeed = useGuildActivity(localUser?.homeCountry);

  const user    = localUser || { nickname:"Guest", homeCountry:"IND", dailyXP:0 };
  const country = COUNTRIES?.find(c => c.code === user.homeCountry);
  const guild   = {
    name:        guildDoc?.name        || `${country?.name || user.homeCountry} Guild`,
    flag:        guildDoc?.flag        || country?.flag || "🏳️",
    castleHP:    guildDoc?.castleHP    ?? 0,
    castleHPCap: guildDoc?.castleHPCap ?? CASTLE_HP_CAP,
  };

  const games     = useMemo(() => GAME_META.map(g => ({...g, done: isDoneToday(g)})),[]);
  const doneCount = games.filter(g => g.done).length;
  const xp        = user.dailyXP || 0;
  const xpPct     = clampPct(xp, DAILY_XP_CAP);
  const hpPct     = clampPct(guild.castleHP, guild.castleHPCap);
  const hpColor   = hpPct >= 70 ? "#3DD68C" : hpPct >= 35 ? "#F7C344" : "#E84040";
  const hpLabel   = hpPct >= 70 ? "Fortress" : hpPct >= 35 ? "Holding" : "Under Pressure";

  const isLive    = nextFixture?.isLive;
  const matchName = nextFixture ? `${nextFixture.homeTeam} vs ${nextFixture.awayTeam}` : "Argentina vs France";
  const feedItems = activityFeed.length > 0 ? activityFeed : STATIC_FEED;

  const showSoon = useCallback(() => {
    setToast("Coming soon — stay tuned ⚡");
    setTimeout(() => setToast(""), 2200);
  },[]);

  return (
    <div style={{ fontFamily:"'Syne',sans-serif", background:"#060810", color:"#F2F2F4", minHeight:"100vh", position:"relative" }}>

      {/* BG */}
      <div className="fb-bg">
        <div className="fb-grid"/>
        <div className="fb-blob fb-blob1"/>
        <div className="fb-blob fb-blob2"/>
        <div className="fb-blob fb-blob3"/>
      </div>
      <div className="fb-noise"/>

      {/* NAV */}
      <nav className="fb-nav">
        <div className="fb-logo">FOOT<em>BRAWLS</em><small>.GG</small></div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div className="fb-live-badge"><span className="fb-live-dot"/>Live</div>
          <button onClick={() => navigate("/guild")} className="fb-nav-pill">🏰 Guild</button>
          <div className="fb-xp-bar">
            <div className="fb-xp-track"><div className="fb-xp-fill" style={{ width:`${xpPct}%` }}/></div>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.62rem", fontWeight:700, color:"#F7C344", whiteSpace:"nowrap" }}>{xp}/{DAILY_XP_CAP} XP</span>
          </div>
          <div className="fb-nav-pill" style={{ gap:6, cursor:"default" }}>
            <span>{guild.flag}</span>
            <span style={{ maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.nickname}</span>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto", padding:"56px max(20px,4vw) 100px" }}>

        {/* Eyebrow */}
        <div className="fb-eyebrow" style={{ animation:"fadeUp 0.5s ease both" }}>
          <span className="fb-eyebrow-dot"/>⚡ Today's Campaign
        </div>

        {/* Hero title */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, marginBottom:28, animation:"fadeUp 0.5s 0.07s ease both" }}>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(3.6rem,7vw,6rem)", lineHeight:0.9, letterSpacing:2, margin:0 }}>
            <span style={{ display:"block", WebkitTextStroke:"2px #F7C344", color:"transparent" }}>Win XP.</span>
            <span style={{ display:"block" }}>Hold the Castle.</span>
          </h1>
          {/* Castle HP orb */}
          <div style={{ flexShrink:0, textAlign:"center" }}>
            <div style={{ position:"relative", width:88, height:88 }}>
              <svg width={88} height={88} viewBox="0 0 88 88">
                <circle cx={44} cy={44} r={36} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6}/>
                <circle cx={44} cy={44} r={36} fill="none" stroke={hpColor} strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*36*hpPct/100} ${2*Math.PI*36}`}
                  transform="rotate(-90 44 44)" style={{ transition:"stroke-dasharray 0.6s ease" }}/>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:"1.4rem" }}>🏰</span>
              </div>
            </div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", fontWeight:700, color:hpColor, letterSpacing:1.5, textTransform:"uppercase", marginTop:6 }}>{hpLabel}</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.54rem", color:"rgba(242,242,244,0.3)", marginTop:2 }}>{guild.castleHP.toLocaleString()} HP</div>
          </div>
        </div>

        {/* Stats row — exact Crickingo hero-stats pattern */}
        <div className="fb-stat-row" style={{ animation:"fadeUp 0.5s 0.12s ease both" }}>
          {[
            { val:`${xp}`,        lbl:"Daily XP"    },
            { val:`${DAILY_XP_CAP-xp}`, lbl:"XP Left" },
            { val:`${doneCount}/${games.length}`, lbl:"Done Today" },
            { val:guild.name,     lbl:"Your Guild",  small:true },
          ].map(({val,lbl,small}) => (
            <div key={lbl} className="fb-stat-tile">
              <span className="fb-stat-num" style={{ fontSize:small?14:undefined, letterSpacing:small?0:undefined }}>{val}</span>
              <span className="fb-stat-lbl">{lbl}</span>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="fb-section-hdr">
          <span className="fb-section-label">Today's Games</span>
          <div className="fb-section-line"/>
          <span className="fb-section-right">{doneCount}/{games.length} complete</span>
        </div>

        {/* Two col layout */}
        <div className="fb-main-grid" style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 300px", gap:20, alignItems:"start" }}>

          {/* Games list */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {games.map((game, i) => (
              <button key={game.id} onClick={() => navigate(game.route)}
                className={`game-card ${game.gc}`}
                style={{ animation:`fadeUp 0.5s ${0.18 + i*0.07}s ease both`, textAlign:"left", border:"none" }}
              >
                <div className="card-glow"/>
                <div className="card-shimmer"/>
                {game.done && <div className="card-done-badge">✓ Done</div>}
                <div className="card-icon">{game.icon}</div>
                <div style={{ flex:1, minWidth:0, position:"relative", zIndex:2 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:4 }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.22rem", letterSpacing:1.5, lineHeight:1 }}>{game.name}</span>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.54rem", fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, padding:"2px 9px", borderRadius:100, color:`var(--ca,${game.accent})`, background:`var(--cag)`, border:`1px solid color-mix(in srgb,var(--ca,${game.accent}) 32%,transparent)`, flexShrink:0, whiteSpace:"nowrap" }}>+{game.xp} XP</span>
                  </div>
                  <p style={{ margin:0, fontSize:"0.8rem", color:"rgba(242,242,244,0.5)", lineHeight:1.45, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{game.desc}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:9, flexWrap:"wrap" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 8px", borderRadius:999, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", fontWeight:700, letterSpacing:0.6, textTransform:"uppercase", color:"var(--muted)" }}>
                      ⏱ Daily
                    </span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 8px", borderRadius:999, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", fontWeight:700, letterSpacing:0.6, textTransform:"uppercase", color:"var(--muted)" }}>
                      {game.done ? "↺ Replay" : "▶ Play now"}
                    </span>
                  </div>
                </div>
                <div className="card-arrow">›</div>
              </button>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="fb-sidebar" style={{ display:"flex", flexDirection:"column", gap:16, position:"sticky", top:76 }}>

            {/* Match countdown */}
            <div className="fb-match-card">
              <div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", fontWeight:700, color:"rgba(242,242,244,0.38)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:5 }}>
                  {isLive ? "🔴 Live Now" : "⏱ Prediction Lock"}
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.1rem", letterSpacing:1 }}>{matchName}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"2rem", color: isLive ? "#E84040" : "#4F8EF7", letterSpacing:2, lineHeight:0.9 }}>
                  {isLive ? `${nextFixture?.homeScore??0}–${nextFixture?.awayScore??0}` : fmtCountdown(mockSecs)}
                </div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", color:"rgba(242,242,244,0.35)", marginTop:4 }}>{isLive ? "live score" : "until lock"}</div>
              </div>
            </div>

            {/* Guild Pulse */}
            <div>
              <div className="fb-section-hdr">
                <span className="fb-section-label">Guild Pulse</span>
                <div className="fb-section-line"/>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", color: activityFeed.length > 0 ? "#E84040" : "var(--muted2)", letterSpacing:1 }}>{activityFeed.length > 0 ? "🔴 Live" : "Sample"}</span>
              </div>
              <div className="fb-pulse-feed">
                {feedItems.map((item, i) => (
                  <div key={item.id||`feed-${i}`} className="fb-feed-row">
                    <div className="fb-feed-icon">{item.icon||"⚽"}</div>
                    <div style={{ flex:1, minWidth:0, fontSize:"0.76rem", color:"rgba(242,242,244,0.62)", lineHeight:1.3 }}>
                      <strong style={{ color:"#3DD68C" }}>{item.user||item.nickname}</strong>{" "}{item.action}
                    </div>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", color:"rgba(242,242,244,0.28)", flexShrink:0 }}>{item.time}</span>
                  </div>
                ))}
                {activityFeed.length === 0 && <div style={{ padding:"6px 14px 10px", fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", color:"rgba(242,242,244,0.28)", fontStyle:"italic" }}>Sample — yours appears live</div>}
              </div>
            </div>

            {/* Raid Banner */}
            <div>
              <div className="fb-section-hdr">
                <span className="fb-section-label">Raid Battles</span>
                <div className="fb-section-line"/>
              </div>
              <button onClick={showSoon} className="fb-raid">
                <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:54, opacity:0.06, pointerEvents:"none", userSelect:"none" }}>⚔️</div>
                <div className="fb-raid-icon">⚔️</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.15rem", letterSpacing:1.5, display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    Challenge Raid
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.5rem", fontWeight:700, border:"1px solid rgba(247,195,68,0.28)", borderRadius:999, padding:"2px 8px", color:"#F7C344", background:"rgba(247,195,68,0.09)" }}>STAGE 5</span>
                  </div>
                  <p style={{ margin:0, fontSize:"0.73rem", color:"rgba(242,242,244,0.45)", lineHeight:1.35 }}>Team up on match day. Break curses. Swing castle HP.</p>
                </div>
                <div className="fb-raid-arrow">›</div>
              </button>
            </div>

            {/* Castle bar */}
            <div className="fb-castle-wrap">
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", fontWeight:700, color:"rgba(242,242,244,0.38)", textTransform:"uppercase", letterSpacing:1.5, whiteSpace:"nowrap" }}>🏰 Castle HP</span>
              <div style={{ flex:1, height:5, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
                <div style={{ width:`${hpPct}%`, height:"100%", borderRadius:99, background:hpColor, transition:"width 0.5s ease" }}/>
              </div>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", fontWeight:700, color:hpColor, whiteSpace:"nowrap" }}>{hpLabel}</span>
            </div>
          </aside>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="fb-bottom-nav">
        {[
          { id:"home",    label:"Games", icon:"⚽", route:"/"      },
          { id:"guild",   label:"Guild", icon:"🏰", route:"/guild" },
          { id:"raids",   label:"Raids", icon:"⚔️"                },
          { id:"ranks",   label:"Ranks", icon:"🏆"                },
          { id:"me",      label:"Me",    icon:"👤"                },
        ].map(item => {
          const active = item.id === "home";
          return (
            <button key={item.id} className="fb-nav-item"
              onClick={() => item.route ? navigate(item.route) : showSoon()}
              style={{ color: active ? "#3DD68C" : "rgba(242,242,244,0.38)" }}
            >
              {active && <span className="fb-nav-indicator"/>}
              <span style={{ fontSize:20, lineHeight:1 }}>{item.icon}</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* TOAST */}
      {toast && <div className="fb-toast">{toast}</div>}
    </div>
  );
}