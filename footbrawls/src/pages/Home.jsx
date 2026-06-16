import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUser, saveUserLocally } from "../lib/user";
import { COUNTRIES } from "../lib/countries";

const DAILY_XP_CAP  = 200;
const CASTLE_HP_CAP = 10000;

const C = {
  bg:"#05080f", bg2:"#080c17",
  pitch:"rgba(255,255,255,0.025)", pitchLine:"rgba(255,255,255,0.045)",
  surface:"rgba(255,255,255,0.04)", surface2:"rgba(255,255,255,0.07)", surface3:"rgba(255,255,255,0.11)",
  border:"rgba(255,255,255,0.07)", border2:"rgba(255,255,255,0.12)", border3:"rgba(255,255,255,0.22)",
  gold:"#F7C344", goldGlow:"rgba(247,195,68,0.32)", goldDim:"rgba(247,195,68,0.1)",
  red:"#E84040", blue:"#4F8EF7", green:"#3DD68C", teal:"#06B6D4", purple:"#A855F7", orange:"#F97316",
  text:"#F2F2F4", muted:"rgba(242,242,244,0.5)", muted2:"rgba(242,242,244,0.28)", muted3:"rgba(242,242,244,0.15)",
};

// ── SVG ICON LIBRARY (no emoji) ──────────────────────────────────────────────
const Icon = {
  // Football / soccer ball
  Ball: ({size=20,color="currentColor",style={}}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
      <path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill={color} opacity="0.7"/>
      <path d="M2 12h4l2 3-2 3H2" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
      <path d="M22 12h-4l-2 3 2 3h4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
      <path d="M5 5.5l3 2.5 1 4-4-2-1.5-4z" fill={color} opacity="0.6"/>
      <path d="M19 5.5l-3 2.5-1 4 4-2 1.5-4z" fill={color} opacity="0.6"/>
      <path d="M8 19l1-4 3-1 3 1 1 4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
    </svg>
  ),
  // Trophy / cup
  Trophy: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 2h12v8a6 6 0 01-12 0V2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 5H3a1 1 0 00-1 1v2a4 4 0 004 4" stroke={color} strokeWidth="1.5"/>
      <path d="M18 5h3a1 1 0 011 1v2a4 4 0 01-4 4" stroke={color} strokeWidth="1.5"/>
      <path d="M12 16v4M8 20h8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 12.5c0 0 1 1.5 3 1.5s3-1.5 3-1.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  // Crosshair / target — for prediction
  Target: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="1.5" fill={color}/>
      <line x1="12" y1="2" x2="12" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2" y1="12" x2="5" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="19" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Flame — penalty nerve
  Flame: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 22c4.4 0 8-3.3 8-7.4 0-2.4-1-4.4-2.6-5.9 0 1.4-.8 2.6-2 3.3C15.1 9.7 14 7 14 4c0 0-5 3-5 9.5 0 .8.1 1.5.3 2.2C8.5 15 8 13.6 8 12c-1.2 1.2-2 3-2 4.6C6 20.7 8.7 22 12 22z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="12" cy="17" r="2" stroke={color} strokeWidth="1.2"/>
    </svg>
  ),
  // Puzzle / brain — wordle
  Puzzle: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Bar chart — higher/lower
  Chart: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="14" width="4" height="7" rx="1" fill={color} opacity="0.5"/>
      <rect x="10" y="9" width="4" height="12" rx="1" fill={color} opacity="0.7"/>
      <rect x="17" y="4" width="4" height="17" rx="1" fill={color}/>
      <line x1="2" y1="21" x2="22" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Network / transfer trail
  Network: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2.5" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="5" r="2.5" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="19" r="2.5" stroke={color} strokeWidth="1.5"/>
      <line x1="7.2" y1="11" x2="16.8" y2="6.4" stroke={color} strokeWidth="1.3"/>
      <line x1="7.2" y1="13" x2="16.8" y2="17.6" stroke={color} strokeWidth="1.3"/>
      <line x1="19" y1="7.5" x2="19" y2="16.5" stroke={color} strokeWidth="1.3" strokeDasharray="2 2"/>
    </svg>
  ),
  // Person / silhouette — who are ya
  Person: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5"/>
      <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 21h6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Shield — guild
  Shield: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // Swords / raid
  Swords: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 3l10 10M13 3l8 8-4 4-8-8V3h4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3 13l8 8 4-4-8-8" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M13.5 20.5l-2 2M20.5 13.5l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Chevron right
  ChevronRight: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // Flag / pennant
  Flag: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3v18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 3h14l-3 5 3 5H5" fill={color} opacity="0.5" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  // Live dot / pulse already inline, but also:
  Star: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18.1l-6.2 3 1.2-6.9-5-4.9 6.9-1L12 2z"/>
    </svg>
  ),
  // Users
  Users: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke={color} strokeWidth="1.5"/>
      <path d="M3 20v-1a6 6 0 0112 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="7" r="2.5" stroke={color} strokeWidth="1.3" opacity="0.6"/>
      <path d="M21 20v-.5a5 5 0 00-4.3-4.9" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  // Clock
  Clock: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <path d="M12 7v5l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // Send arrow (chat)
  Send: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  // Rank
  Rank: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 20h18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 20V10" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <path d="M12 20V4" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M17 20V14" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  // Home / pitch
  Home: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V21H3V10.5z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="9" y="14" width="6" height="7" rx="1" stroke={color} strokeWidth="1.3"/>
    </svg>
  ),
  // Warning
  Warning: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 20h20L12 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill={color}/>
    </svg>
  ),
};

const GAMES = [
  { id:"whoAreYa",      Icon:Icon.Person,  name:"Who Are Ya?",     tag:"Deduction",   desc:"Guess the mystery player from country, club, age, and position clues.",         xp:25,  route:"/games/whoareya",      color:C.orange, meta:["8 Attempts","Thinky"],              storageKey:"footbrawls_whoareya"        },
  { id:"matchPredictor",Icon:Icon.Target,  name:"Match Predictor", tag:"Daily Pick",   desc:"Call today's result, top scorer, and exact scoreline — chase the season board.", xp:100, route:"/games/matchpredictor", color:C.gold,   meta:["Season Board","Max XP"],           storageKey:"footbrawls_matchpredictor"  },
  { id:"penaltyNerve",  Icon:Icon.Flame,   name:"Penalty Nerve",   tag:"Pressure",     desc:"Beat the keeper across five high-stakes penalty kicks.",                          xp:30,  route:"/games/penaltynerve",   color:C.red,    meta:["5 Kicks","Keeper AI"],              storageKey:"footbrawls_penaltynerve"    },
  { id:"wordle",        Icon:Icon.Puzzle,  name:"Player Wordle",   tag:"Word Game",    desc:"Wordle energy, football names. Narrow the attributes and land the player.",       xp:20,  route:"/games/wordle",         color:C.purple, meta:["6 Guesses","Sharable"],           storageKey:"footbrawls_wordle_history"  },
  { id:"higherLower",   Icon:Icon.Chart,   name:"Higher or Lower", tag:"Stats",        desc:"Trust your stat instinct — call who ranks higher before the streak snaps.",       xp:15,  route:"/games/higherlower",    color:C.green,  meta:["10 Rounds","High Pressure"],        storageKey:"footbrawls_higherlower"     },
  { id:"transferTrail", Icon:Icon.Network, name:"Transfer Trail",  tag:"Career Trail", desc:"Connect two players through shared clubs in the fewest possible hops.",           xp:20,  route:"/games/transfertrail",  color:C.blue,   meta:["Fewest Steps","Mid Difficulty"], storageKey:"footbrawls_transfertrail"   },
];

const BAD_WORDS = ["spam","fuck","shit","ass","bitch","dick","cunt"];
function containsBadWord(text) {
  return BAD_WORDS.some(w => text.toLowerCase().includes(w));
}

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const l = document.createElement("link"); l.id="fb-fonts"; l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

function getTodayKey() { return new Date().toISOString().split("T")[0]; }

function isDoneToday(game) {
  try {
    const raw = localStorage.getItem(game.storageKey); if (!raw) return false;
    const data = JSON.parse(raw); const today = getTodayKey();
    return data.date === today || Boolean(data[today]);
  } catch { return false; }
}

function getDailyXP(user) {
  const today = getTodayKey();
  if (user?.dailyXPDate === today) return user.dailyXP || 0;
  return 0;
}

function clampPct(v,max){ return !max?0:Math.max(0,Math.min(100,Math.round((v/max)*100))); }
function pad(n){ return String(n).padStart(2,"0"); }
function fmtCountdown(s){ return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`; }

function useNextFixtures() {
  const [fixtures,setFixtures]=useState([]);
  useEffect(()=>{
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const q=query(collection(db,"fixtures"),where("isComplete","==",false),where("kickoffAt",">=",threeHoursAgo),orderBy("kickoffAt","asc"),limit(2));
    return onSnapshot(q,snap=>{
      setFixtures(snap.empty?[]:snap.docs.map(d=>({id:d.id,...d.data()})));
    },(err)=>{ console.error("Fixtures query failed:",err); setFixtures([]); });
  },[]);
  return fixtures;
}

function useWorldChat() {
  const [messages,setMessages]=useState([]);
  useEffect(()=>{
    const q=query(collection(db,"chat"),where("guildCode","==","__world__"),orderBy("timestamp","asc"),limit(40));
    return onSnapshot(q,snap=>{ setMessages(snap.docs.map(d=>({id:d.id,...d.data()}))); },()=>setMessages([]));
  },[]);
  return messages;
}

// ── PITCH GRID BACKGROUND ─────────────────────────────────────────────────────
function BgCanvas() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      {/* Subtle pitch-line grid — vertical stripes like a broadcast overlay */}
      <div style={{
        position:"absolute",inset:0,
        backgroundImage:`
          linear-gradient(${C.pitchLine} 1px, transparent 1px),
          linear-gradient(90deg, ${C.pitchLine} 1px, transparent 1px)
        `,
        backgroundSize:"72px 72px",
        maskImage:"linear-gradient(180deg,transparent,rgba(0,0,0,0.4) 20%,rgba(0,0,0,0.4) 80%,transparent)"
      }}/>
      {/* Centre circle hint */}
      <div style={{
        position:"absolute",
        width:520,height:520,
        top:"50%",left:"50%",
        transform:"translate(-50%,-50%)",
        borderRadius:"50%",
        border:`1px solid ${C.pitchLine}`,
        opacity:0.5,
      }}/>
      <div style={{position:"absolute",width:10,height:10,borderRadius:"50%",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:C.pitchLine}}/>
      {/* Gold atmosphere top-left */}
      <div style={{position:"absolute",width:800,height:600,top:-280,left:-200,borderRadius:"50%",background:`radial-gradient(ellipse,rgba(247,195,68,0.22) 0%,transparent 70%)`,filter:"blur(100px)"}}/>
      {/* Subtle red bottom-right */}
      <div style={{position:"absolute",width:500,height:400,bottom:-120,right:-120,borderRadius:"50%",background:`radial-gradient(ellipse,rgba(232,64,64,0.08) 0%,transparent 70%)`,filter:"blur(80px)"}}/>
      {/* Film grain */}
      <div style={{position:"fixed",inset:0,opacity:0.025,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",backgroundSize:"256px 256px"}}/>
    </div>
  );
}

// ── ANIMATED FOOTBALL ─────────────────────────────────────────────────────────
function BouncingFootball() {
  return (
    <div style={{position:"relative",width:92,flexShrink:0,alignSelf:"stretch",display:"flex",alignItems:"flex-end",justifyContent:"center",overflow:"visible"}}>
      <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",width:72,height:72,borderRadius:"50%",background:`radial-gradient(ellipse,${C.goldGlow} 0%,transparent 70%)`,filter:"blur(16px)"}}/>
      <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",animation:"fbBounce 1.2s linear infinite"}}>
        <svg viewBox="0 0 80 80" width="68" height="68" xmlns="http://www.w3.org/2000/svg" style={{filter:"drop-shadow(0 6px 18px rgba(0,0,0,0.6)) drop-shadow(0 0 10px rgba(247,195,68,0.18))"}}>
          <defs>
            <radialGradient id="ballGrad" cx="38%" cy="32%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
              <stop offset="40%" stopColor="#e8e8e8"/>
              <stop offset="100%" stopColor="#aaaaaa"/>
            </radialGradient>
            <radialGradient id="ballShine" cx="30%" cy="28%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.85)"/>
              <stop offset="60%" stopColor="rgba(255,255,255,0)"/>
            </radialGradient>
            <clipPath id="ballClip"><circle cx="40" cy="40" r="36"/></clipPath>
          </defs>
          <circle cx="40" cy="40" r="36" fill="url(#ballGrad)"/>
          <g clipPath="url(#ballClip)" fill="#111" opacity="0.82">
            <polygon points="40,20 51,28 47,41 33,41 29,28"/>
            <polygon points="22,18 29,28 20,35 10,28 12,17"/>
            <polygon points="58,18 68,17 70,28 60,35 51,28"/>
            <polygon points="10,42 20,35 24,47 16,55 6,50"/>
            <polygon points="70,42 74,50 64,55 56,47 60,35"/>
            <polygon points="24,57 33,51 40,58 36,68 24,66"/>
            <polygon points="56,57 56,66 44,68 40,58 47,51"/>
          </g>
          <ellipse cx="32" cy="30" rx="11" ry="8" fill="url(#ballShine)"/>
        </svg>
      </div>
      <div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:42,height:7,borderRadius:"50%",background:"rgba(0,0,0,0.45)",filter:"blur(4px)",animation:"fbShadow 1.2s linear infinite"}}/>
      <style>{`
        @keyframes fbBounce {
          0%,100%{bottom:12px;transform:translateX(-50%) scaleY(0.78) scaleX(1.22);animation-timing-function:cubic-bezier(0.1,0.8,0.3,1)}
          50%{bottom:calc(100% - 76px);transform:translateX(-50%) scaleY(1.04) scaleX(0.96);animation-timing-function:cubic-bezier(0.7,0,0.9,0.2)}
        }
        @keyframes fbShadow {
          0%,100%{transform:translateX(-50%) scale(1.22);opacity:0.5;animation-timing-function:cubic-bezier(0.1,0.8,0.3,1)}
          50%{transform:translateX(-50%) scale(0.32);opacity:0.04;animation-timing-function:cubic-bezier(0.7,0,0.9,0.2)}
        }
      `}</style>
    </div>
  );
}

// ── TOP NAV ───────────────────────────────────────────────────────────────────
function TopNav({ user, dailyXP, xpPct, navigate }) {
  return (
    <nav style={{
      position:"sticky",top:0,zIndex:200,
      width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"0 20px",height:58,boxSizing:"border-box",
      background:"rgba(5,8,15,0.7)",
      backdropFilter:"blur(28px) saturate(1.4)",
      borderBottom:`1px solid ${C.border}`,
      boxShadow:"0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
    }}>
      {/* Gold top bar */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${C.gold} 40%,${C.gold} 60%,transparent)`,opacity:0.55}}/>

      {/* Logo */}
      <div onClick={()=>navigate("/")} style={{
        fontFamily:"'Bebas Neue',sans-serif",
        fontSize:"1.55rem",letterSpacing:3,
        background:`linear-gradient(110deg,#ffe680,${C.gold} 45%,#e8a800)`,
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
        cursor:"pointer",flexShrink:0,
        filter:`drop-shadow(0 0 10px ${C.goldGlow})`,
      }}>
        FOOTBRAWLS
      </div>

      {/* Right: XP + user */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {/* XP pill */}
        <div style={{
          display:"flex",alignItems:"center",gap:7,
          padding:"5px 12px",borderRadius:100,
          border:"1px solid rgba(61,214,140,0.22)",
          background:"rgba(61,214,140,0.05)",
          fontFamily:"'Space Mono',monospace",
          fontSize:"0.58rem",fontWeight:700,letterSpacing:1,color:C.muted,
        }}>
          <div style={{width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
            <div style={{width:`${xpPct}%`,height:"100%",background:"linear-gradient(90deg,#3DD68C,#7fffcc)",borderRadius:99,transition:"width 0.6s ease"}}/>
          </div>
          <span style={{color:C.gold,fontWeight:800}}>{dailyXP}</span>
          <span style={{color:C.muted2}}>XP</span>
        </div>

        {/* User pill */}
        <div style={{
          display:"flex",alignItems:"center",gap:6,
          padding:"5px 12px",borderRadius:100,
          border:`1px solid ${C.border2}`,background:C.surface,
          fontSize:"0.72rem",fontWeight:700,color:C.text,
          fontFamily:"'Syne',sans-serif",letterSpacing:0.4,
          flexShrink:0,maxWidth:130,overflow:"hidden",
        }}>
          <span style={{flexShrink:0,fontSize:"1rem"}}>{user.flag||"🏴"}</span>
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nickname}</span>
        </div>
      </div>
      <style>{`@keyframes xpFill{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </nav>
  );
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
function SectionHdr({ label, count, right }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,marginTop:32}}>
      {/* Small pitch-corner accent */}
      <div style={{width:3,height:14,borderRadius:2,background:`linear-gradient(180deg,${C.gold},${C.gold}44)`,flexShrink:0}}/>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.58rem",fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.muted2,whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.border2},transparent)`}}/>
      {(count||right)&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.54rem",color:C.muted3,letterSpacing:1,whiteSpace:"nowrap"}}>{count||right}</span>}
    </div>
  );
}

// ── GAME CARD ─────────────────────────────────────────────────────────────────
function GameCard({ game, done, onPlay }) {
  const [hovered,setHovered]=useState(false);
  const ca = game.color;
  const GameIcon = game.Icon;
  return (
    <div
      onClick={()=>onPlay(game)}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{
        position:"relative",display:"flex",alignItems:"center",gap:14,
        color:C.text,
        background:hovered?`linear-gradient(115deg,${ca}10,rgba(5,8,15,0.92))`:"rgba(255,255,255,0.03)",
        border:`1px solid ${hovered?ca+"99":C.border}`,
        borderRadius:14,padding:"14px 14px",overflow:"hidden",
        cursor:"pointer",
        transform:hovered?"translateY(-2px)":"none",
        boxShadow:hovered?`0 18px 44px rgba(0,0,0,0.5),0 0 0 1px ${ca}33,0 0 28px ${ca}1a`:"0 1px 0 rgba(255,255,255,0.03)",
        transition:"all 0.2s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Left accent stripe */}
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:hovered?3:2,borderRadius:"0 2px 2px 0",background:`linear-gradient(180deg,${ca},${ca}55)`,opacity:hovered?1:0.35,transition:"all 0.2s"}}/>

      {/* Radial glow */}
      <div style={{position:"absolute",inset:0,borderRadius:14,background:`radial-gradient(ellipse at 18% 50%,${ca}14,transparent 60%)`,opacity:hovered?1:0,transition:"opacity 0.22s",pointerEvents:"none"}}/>

      {/* Icon box */}
      <div style={{
        position:"relative",zIndex:2,flexShrink:0,
        width:50,height:50,
        display:"flex",alignItems:"center",justifyContent:"center",
        background:hovered?`${ca}22`:`${ca}0e`,
        border:`1px solid ${hovered?ca+"66":ca+"22"}`,
        borderRadius:12,
        transform:hovered?"scale(1.08) rotate(-4deg)":"scale(1)",
        boxShadow:hovered?`0 0 24px ${ca}55,inset 0 0 10px ${ca}18`:"none",
        transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <GameIcon size={22} color={ca} style={{filter:hovered?`drop-shadow(0 0 5px ${ca})`:"none",transition:"filter 0.2s"}}/>
        {done && (
          <div style={{position:"absolute",inset:0,borderRadius:12,background:"rgba(61,214,140,0.28)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{flex:1,minWidth:0,position:"relative",zIndex:2}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.15rem",letterSpacing:1.5,lineHeight:1,textShadow:hovered?`0 0 18px ${ca}77`:"none",transition:"text-shadow 0.2s"}}>{game.name}</span>
          <span style={{
            fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",fontWeight:700,
            textTransform:"uppercase",letterSpacing:1.5,padding:"3px 8px",borderRadius:3,
            color:ca,background:`${ca}15`,border:`1px solid ${ca}44`,
            boxShadow:hovered?`0 0 8px ${ca}33`:"none",transition:"box-shadow 0.2s",
          }}>{done?"DONE":game.tag}</span>
        </div>
        <p style={{fontSize:"0.73rem",color:C.muted,lineHeight:1.5,marginBottom:7,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{game.desc}</p>
        <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
          {game.meta.map(m=>(
            <span key={m} style={{display:"inline-flex",padding:"2px 7px",borderRadius:3,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",fontSize:"0.5rem",fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:C.muted2,fontFamily:"'Space Mono',monospace"}}>{m}</span>
          ))}
          <span style={{display:"inline-flex",padding:"2px 7px",borderRadius:3,background:`${C.gold}14`,border:`1px solid ${C.gold}44`,fontSize:"0.5rem",fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:C.gold,fontFamily:"'Space Mono',monospace",boxShadow:hovered?`0 0 10px ${C.gold}33`:"none",transition:"box-shadow 0.2s"}}>+{game.xp} XP</span>
        </div>
      </div>

      {/* Arrow */}
      <div style={{
        position:"relative",zIndex:2,flexShrink:0,
        width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",
        background:hovered?ca:"transparent",
        border:`1.5px solid ${hovered?ca:ca+"44"}`,
        borderRadius:8,
        color:hovered?"#000":ca,
        transform:hovered?"translateX(2px) scale(1.06)":"none",
        boxShadow:hovered?`0 0 16px ${ca}66`:"none",
        transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <Icon.ChevronRight size={14} color={hovered?"#000":ca}/>
      </div>
    </div>
  );
}

// ── MATCH CARD ────────────────────────────────────────────────────────────────
function MatchCard({ fixture, fallbackSecs }) {
  const [secs,setSecs]=useState(fallbackSecs);
  useEffect(()=>{
    if (!fixture?.kickoffAt){setSecs(fallbackSecs);return;}
    const ms=fixture.kickoffAt.toMillis?fixture.kickoffAt.toMillis():fixture.kickoffAt*1000;
    const tick=()=>setSecs(Math.max(0,Math.floor((ms-Date.now())/1000)));
    tick(); const t=setInterval(tick,1000); return ()=>clearInterval(t);
  },[fixture,fallbackSecs]);
  const name=fixture?`${fixture.homeTeam} vs ${fixture.awayTeam}`:"No match scheduled today";
  const kickoffMs=fixture?.kickoffAt?.toMillis?fixture.kickoffAt.toMillis():(fixture?.kickoffAt?fixture.kickoffAt*1000:0);
  const isLive=fixture?.isLive||(fixture&&!fixture.isComplete&&kickoffMs<Date.now()&&kickoffMs>=Date.now()-3*60*60*1000);
  const hasFixture=!!fixture;
  return (
    <div style={{
      background:`radial-gradient(circle at top right,rgba(247,195,68,0.1),transparent 40%),rgba(255,255,255,0.025)`,
      border:`1px solid ${isLive?"rgba(232,64,64,0.35)":C.border2}`,
      borderRadius:16,padding:"16px 18px",
      display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",
      boxShadow:isLive?"0 0 28px rgba(232,64,64,0.12)":"none",
    }}>
      <div style={{minWidth:0,flex:1}}>
        <div style={{
          fontFamily:"'Space Mono',monospace",fontSize:"0.56rem",fontWeight:700,
          letterSpacing:2,textTransform:"uppercase",
          color:isLive?C.red:hasFixture?C.gold:C.muted2,
          marginBottom:6,display:"flex",alignItems:"center",gap:8,
        }}>
          {isLive && <div style={{width:6,height:6,borderRadius:"50%",background:C.red,boxShadow:`0 0 8px ${C.red}`,animation:"livePulse 1.8s ease infinite"}}/>}
          <Icon.Clock size={12} color={isLive?C.red:hasFixture?C.gold:C.muted2}/>
          {isLive?"Live Now":hasFixture?"Prediction Lock":"Daily Reset"}
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.22rem",letterSpacing:1,color:C.text,lineHeight:1}}>{name}</div>
        {fixture?.stage&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",color:C.muted2,marginTop:4,letterSpacing:0.4}}>{fixture.stage}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        {isLive
          ?<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:3,color:C.red,lineHeight:1}}>{fixture.homeScore??0} – {fixture.awayScore??0}</div>
          :<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.85rem",letterSpacing:3,color:hasFixture?C.gold:C.muted2,lineHeight:1}}>{fmtCountdown(secs)}</div>
        }
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.54rem",color:C.muted,letterSpacing:1,marginTop:4}}>{isLive?"live score":hasFixture?"until lock":"until next day"}</div>
      </div>
      <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.65)}}`}</style>
    </div>
  );
}

// ── GUILD CARD ────────────────────────────────────────────────────────────────
function GuildCard({ guild, navigate }) {
  const [hovered,setHovered]=useState(false);
  const hp=guild.castleHP??0, maxHp=guild.castleHPCap??CASTLE_HP_CAP, hpPct=clampPct(hp,maxHp);
  const hpColor=hpPct>=70?C.green:hpPct>=35?C.gold:C.red;
  const hpGlow=hpPct>=70?"rgba(61,214,140,0.3)":hpPct>=35?"rgba(247,195,68,0.3)":"rgba(232,64,64,0.3)";
  const statusLabel=hpPct>=70?"Fortified":hpPct>=35?"Holding":"Under Pressure";
  return (
    <div onClick={()=>navigate("/guild")} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{
        position:"relative",overflow:"hidden",
        background:hovered?`radial-gradient(ellipse at 10% 50%,rgba(6,182,212,0.08),transparent 55%),rgba(255,255,255,0.04)`:`rgba(255,255,255,0.03)`,
        border:`1px solid ${hovered?"rgba(6,182,212,0.45)":C.border2}`,
        borderRadius:16,padding:"18px 16px",
        cursor:"pointer",
        transform:hovered?"translateY(-2px)":"none",
        boxShadow:hovered?"0 18px 44px rgba(0,0,0,0.5),0 0 0 1px rgba(6,182,212,0.18),0 0 28px rgba(6,182,212,0.07)":"0 1px 0 rgba(255,255,255,0.03)",
        transition:"all 0.2s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Sweep shimmer */}
      <div style={{position:"absolute",top:0,left:hovered?"-5%":"-130%",width:"55%",height:"100%",background:"linear-gradient(105deg,transparent,rgba(6,182,212,0.07),transparent)",transition:"left 0.55s ease",pointerEvents:"none"}}/>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{position:"relative",flexShrink:0}}>
          <div style={{
            width:48,height:48,borderRadius:13,
            background:"rgba(6,182,212,0.07)",
            border:`1.5px solid ${hovered?"rgba(6,182,212,0.48)":"rgba(6,182,212,0.18)"}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"1.55rem",
            transition:"all 0.22s",
            boxShadow:hovered?"0 0 18px rgba(6,182,212,0.3)":"none",
            transform:hovered?"scale(1.05)":"scale(1)",
          }}>{guild.flag}</div>
          <div style={{position:"absolute",bottom:-3,right:-3,width:13,height:13,borderRadius:"50%",background:hpColor,border:`2px solid ${C.bg}`,boxShadow:`0 0 8px ${hpGlow}`}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1.5,lineHeight:1,color:C.text,marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textShadow:hovered?"0 0 18px rgba(6,182,212,0.35)":"none",transition:"text-shadow 0.2s"}}>{guild.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{display:"flex",alignItems:"center",gap:4,fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",color:C.muted2,letterSpacing:0.3}}>
              <Icon.Users size={11} color={C.muted2}/> {(guild.memberCount||0).toLocaleString()} members
            </span>
            <span style={{
              display:"flex",alignItems:"center",gap:4,
              fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",fontWeight:700,
              color:hpColor,background:`${hpColor}12`,border:`1px solid ${hpColor}33`,
              borderRadius:3,padding:"2px 7px",letterSpacing:0.8,textTransform:"uppercase",
            }}>
              <Icon.Shield size={10} color={hpColor}/> {statusLabel}
            </span>
          </div>
        </div>
        <div style={{
          fontFamily:"'Space Mono',monospace",fontSize:"0.48rem",fontWeight:700,letterSpacing:0.8,
          padding:"6px 10px",borderRadius:7,
          color:C.teal,background:hovered?"rgba(6,182,212,0.14)":"rgba(6,182,212,0.06)",
          border:`1px solid rgba(6,182,212,${hovered?0.45:0.18})`,
          textTransform:"uppercase",flexShrink:0,whiteSpace:"nowrap",
          transition:"all 0.2s",boxShadow:hovered?"0 0 12px rgba(6,182,212,0.25)":"none",
        }}>ENTER</div>
      </div>

      <div style={{height:1,background:"linear-gradient(90deg,rgba(6,182,212,0.18),rgba(255,255,255,0.04),transparent)",marginBottom:14}}/>

      {/* Castle HP */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Icon.Shield size={13} color={C.muted}/>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,color:C.muted,letterSpacing:1.5,textTransform:"uppercase"}}>Castle HP</span>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.95rem",letterSpacing:1,color:hpColor,textShadow:`0 0 10px ${hpGlow}`}}>{hp.toLocaleString()} <span style={{color:C.muted2,fontSize:"0.68rem",fontFamily:"'Space Mono',monospace"}}>/ {maxHp.toLocaleString()}</span></span>
        </div>
        <div style={{height:7,borderRadius:99,background:"rgba(255,255,255,0.06)",overflow:"hidden",position:"relative"}}>
          <div style={{width:`${hpPct}%`,height:"100%",borderRadius:99,background:`linear-gradient(90deg,${hpColor}88,${hpColor})`,boxShadow:`0 0 8px ${hpGlow}`,transition:"width 0.9s cubic-bezier(0.22,1,0.36,1)"}}>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",animation:"hpShimmer 2.5s ease-in-out infinite"}}/>
          </div>
          {[25,50,75].map(p=><div key={p} style={{position:"absolute",top:0,left:`${p}%`,width:1,height:"100%",background:"rgba(0,0,0,0.35)"}}/>)}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.46rem",color:hpColor,fontWeight:700}}>{hpPct}% integrity</span>
        </div>
      </div>
      <style>{`@keyframes hpShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );
}

// ── WORLD CHAT ────────────────────────────────────────────────────────────────
function WorldChat({ messages, user, navigate }) {
  const [input,setInput]=useState("");
  const [sending,setSending]=useState(false);
  const [focused,setFocused]=useState(false);
  const [err,setErr]=useState("");
  const containerRef=useRef(null);
  const isInitialRef=useRef(true);

  useEffect(()=>{
    if (containerRef.current) {
      if (isInitialRef.current) { containerRef.current.scrollTop=containerRef.current.scrollHeight; isInitialRef.current=false; }
      else { containerRef.current.scrollTo({top:containerRef.current.scrollHeight,behavior:"smooth"}); }
    }
  },[messages]);

  async function handleSend() {
    const text=input.trim();
    if (!text||sending) return;
    if (containsBadWord(text)) { setErr("Message contains inappropriate content."); setTimeout(()=>setErr(""),2500); return; }
    if (text.length>120) { setErr("Max 120 characters."); setTimeout(()=>setErr(""),2000); return; }
    setSending(true);
    try {
      await addDoc(collection(db,"chat"),{guildCode:"__world__",userId:user.userId,nickname:user.nickname,flag:user.flag||"🏴",tier:user.tier||"lurker",text,timestamp:serverTimestamp()});
      setInput("");
    } catch(e) { console.error(e); setErr("Failed to send."); setTimeout(()=>setErr(""),2000); }
    setSending(false);
  }

  function handleKey(e){ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} }

  const TIER_COLORS={lurker:"#6b7a99",fan:"#4F8EF7",veteran:"#3DD68C",ultra:"#F7C344",legend:"#A855F7"};

  return (
    <div style={{
      background:"rgba(255,255,255,0.02)",
      border:`1px solid ${focused?C.border3:C.border2}`,
      borderRadius:16,overflow:"hidden",
      boxShadow:focused?"0 0 0 1px rgba(255,255,255,0.05),0 8px 28px rgba(0,0,0,0.35)":"0 4px 20px rgba(0,0,0,0.2)",
      transition:"box-shadow 0.2s, border-color 0.2s",
    }}>
      {/* Chat header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${C.border}`,background:"linear-gradient(135deg,rgba(61,214,140,0.05),rgba(255,255,255,0.015))"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Live dot */}
          <div style={{position:"relative",width:10,height:10,flexShrink:0}}>
            <div style={{position:"absolute",inset:-3,borderRadius:"50%",background:"rgba(61,214,140,0.22)",animation:"chatRipple 2s ease-out infinite"}}/>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`}}/>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.05rem",letterSpacing:3,color:C.text}}>WORLD CHAT</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",color:C.green,letterSpacing:1,padding:"2px 7px",background:"rgba(61,214,140,0.07)",border:"1px solid rgba(61,214,140,0.18)",borderRadius:3,fontWeight:700}}>LIVE</span>
        </div>
        <button onClick={()=>navigate("/guild")}
          style={{fontFamily:"'Space Mono',monospace",fontSize:"0.48rem",fontWeight:700,letterSpacing:0.8,color:C.teal,background:"rgba(6,182,212,0.06)",border:"1px solid rgba(6,182,212,0.18)",borderRadius:6,padding:"5px 10px",cursor:"pointer",textTransform:"uppercase",transition:"all 0.18s",whiteSpace:"nowrap"}}>
          My Guild
        </button>
      </div>

      {/* Messages */}
      <div ref={containerRef} style={{height:"min(260px,48vh)",overflowY:"auto",padding:"12px 14px",scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.07) transparent",display:"flex",flexDirection:"column",gap:2}}>
        {messages.length===0&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,opacity:0.5}}>
            <Icon.Ball size={36} color={C.muted2}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.95rem",letterSpacing:2,color:C.muted,marginBottom:3}}>NO MESSAGES YET</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",color:C.muted2,letterSpacing:0.4}}>Be the first to start the banter</div>
            </div>
          </div>
        )}
        {messages.map((m,i)=>{
          const isMe=m.userId===user.userId;
          const tierColor=TIER_COLORS[m.tier||"lurker"]||C.muted2;
          const prevSameSender=i>0&&messages[i-1].userId===m.userId;
          return (
            <div key={m.id||i} style={{display:"flex",alignItems:"flex-end",gap:8,flexDirection:isMe?"row-reverse":"row",marginTop:prevSameSender?1:8}}>
              <div style={{width:26,height:26,borderRadius:7,background:isMe?"rgba(61,214,140,0.1)":"rgba(255,255,255,0.05)",border:`1px solid ${isMe?"rgba(61,214,140,0.22)":C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",flexShrink:0,opacity:prevSameSender?0:1}}>
                {m.flag||"🏴"}
              </div>
              <div style={{maxWidth:"72%",display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:3}}>
                {!prevSameSender&&(
                  <div style={{display:"flex",alignItems:"center",gap:5,flexDirection:isMe?"row-reverse":"row"}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,color:isMe?C.green:tierColor,letterSpacing:0.4}}>{m.nickname}</span>
                    {m.tier&&m.tier!=="lurker"&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.38rem",fontWeight:700,color:tierColor,background:`${tierColor}14`,border:`1px solid ${tierColor}28`,borderRadius:2,padding:"1px 5px",textTransform:"uppercase",letterSpacing:0.4}}>{m.tier}</span>}
                  </div>
                )}
                <div style={{padding:"8px 12px",borderRadius:isMe?"12px 12px 3px 12px":"12px 12px 12px 3px",background:isMe?"linear-gradient(135deg,rgba(61,214,140,0.16),rgba(61,214,140,0.09))":"rgba(255,255,255,0.055)",border:`1px solid ${isMe?"rgba(61,214,140,0.22)":C.border}`,boxShadow:isMe?"0 2px 10px rgba(61,214,140,0.08)":"0 2px 6px rgba(0,0,0,0.18)"}}>
                  <span style={{fontSize:"0.78rem",color:isMe?"rgba(242,242,244,0.95)":C.muted,lineHeight:1.5,wordBreak:"break-word",display:"block"}}>{m.text}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {err&&(
        <div style={{padding:"7px 16px",fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",color:C.red,background:"rgba(232,64,64,0.06)",borderTop:"1px solid rgba(232,64,64,0.1)",display:"flex",alignItems:"center",gap:6}}>
          <Icon.Warning size={12} color={C.red}/> {err}
        </div>
      )}

      {/* Input */}
      <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem",flexShrink:0}}>{user.flag||"🏴"}</div>
          <div style={{flex:1,position:"relative"}}>
            <input
              value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
              placeholder="Say something to the world…" maxLength={120}
              style={{width:"100%",boxSizing:"border-box",background:focused?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.04)",border:`1px solid ${focused?C.border3:C.border2}`,borderRadius:9,padding:"9px 38px 9px 13px",color:C.text,fontSize:"0.79rem",fontFamily:"'Syne',sans-serif",outline:"none",caretColor:C.green,transition:"all 0.18s"}}
            />
            {input&&<span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontFamily:"'Space Mono',monospace",fontSize:"0.42rem",color:input.length>100?C.red:C.muted3,pointerEvents:"none"}}>{120-input.length}</span>}
          </div>
          <button onClick={handleSend} disabled={!input.trim()||sending}
            style={{width:36,height:36,borderRadius:9,background:input.trim()?C.green:"rgba(255,255,255,0.05)",border:`1px solid ${input.trim()?"rgba(61,214,140,0.55)":C.border}`,color:input.trim()?"#000":C.muted3,display:"flex",alignItems:"center",justifyContent:"center",cursor:input.trim()?"pointer":"default",transition:"all 0.18s",flexShrink:0,boxShadow:input.trim()?"0 0 14px rgba(61,214,140,0.35)":"none",transform:input.trim()?"scale(1)":"scale(0.95)"}}>
            {sending?<div style={{width:14,height:14,border:"2px solid rgba(0,0,0,0.3)",borderTopColor:"#000",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>:<Icon.Send size={15} color={input.trim()?"#000":C.muted3}/>}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes chatRipple{0%{transform:scale(1);opacity:0.5}100%{transform:scale(3);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

// ── RAID BANNER ───────────────────────────────────────────────────────────────
function RaidBanner({ onPress }) {
  const [hovered,setHovered]=useState(false);
  return (
    <div onClick={onPress} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{
        position:"relative",overflow:"hidden",
        background:hovered?"radial-gradient(circle at 30% 50%,rgba(168,85,247,0.2),transparent 55%),rgba(168,85,247,0.05)":"radial-gradient(circle at top right,rgba(168,85,247,0.08),transparent 50%),rgba(255,255,255,0.02)",
        border:`1px solid rgba(168,85,247,${hovered?0.65:0.18})`,
        borderRadius:14,padding:"16px 16px",
        display:"flex",alignItems:"center",gap:14,
        cursor:"pointer",
        transform:hovered?"translateY(-2px)":"none",
        boxShadow:hovered?"0 18px 44px rgba(0,0,0,0.5),0 0 32px rgba(168,85,247,0.18)":"0 1px 0 rgba(255,255,255,0.03)",
        transition:"all 0.2s cubic-bezier(0.22,1,0.36,1)",
        marginTop:24,
      }}
    >
      {/* Sweep */}
      <div style={{position:"absolute",top:0,left:hovered?"-10%":"-130%",width:"60%",height:"100%",background:"linear-gradient(105deg,transparent,rgba(168,85,247,0.1),transparent)",transition:"left 0.6s ease",pointerEvents:"none"}}/>

      {/* Icon */}
      <div style={{
        width:48,height:48,borderRadius:11,
        background:hovered?"rgba(168,85,247,0.22)":"rgba(168,85,247,0.09)",
        border:`1.5px solid rgba(168,85,247,${hovered?0.65:0.24})`,
        display:"flex",alignItems:"center",justifyContent:"center",
        flexShrink:0,
        boxShadow:hovered?"0 0 20px rgba(168,85,247,0.45)":"none",
        transform:hovered?"scale(1.06) rotate(-3deg)":"none",
        transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <Icon.Swords size={22} color={C.purple}/>
      </div>

      <div style={{flex:1,minWidth:0,position:"relative",zIndex:2}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.35rem",letterSpacing:2,color:C.text,textShadow:hovered?"0 0 20px rgba(168,85,247,0.7)":"none",transition:"text-shadow 0.2s"}}>CHALLENGE RAID</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",fontWeight:700,letterSpacing:1.5,padding:"3px 8px",borderRadius:3,color:C.purple,background:"rgba(168,85,247,0.12)",border:`1px solid rgba(168,85,247,${hovered?0.6:0.26})`,boxShadow:hovered?"0 0 8px rgba(168,85,247,0.4)":"none",transition:"all 0.2s"}}>STAGE 5</span>
        </div>
        <p style={{fontSize:"0.76rem",color:hovered?C.muted:C.muted2,lineHeight:1.5,fontFamily:"'Syne',sans-serif",margin:0,transition:"color 0.2s"}}>Team up on match day to break curses and swing castle momentum.</p>
      </div>

      <div style={{
        width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",
        background:hovered?"rgba(168,85,247,0.3)":C.surface2,
        border:`1.5px solid rgba(168,85,247,${hovered?0.75:0.26})`,
        borderRadius:7,color:C.purple,
        transform:hovered?"translateX(2px) scale(1.08)":"none",
        boxShadow:hovered?"0 0 14px rgba(168,85,247,0.5)":"none",
        transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <Icon.ChevronRight size={14} color={C.purple}/>
      </div>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({ active, navigate, onUnavailable }) {
  const [pressed,setPressed]=useState(null);
  const items=[
    {id:"home",    label:"Games",  IconC:Icon.Ball,    route:"/"},
    {id:"guild",   label:"Guild",  IconC:Icon.Shield,  route:"/guild"},
    {id:"raids",   label:"Raids",  IconC:Icon.Swords},
    {id:"ranks",   label:"Ranks",  IconC:Icon.Rank},
    {id:"profile", label:"Me",     IconC:Icon.Person},
  ];
  return (
    <nav style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:200,
      display:"flex",
      background:"rgba(5,8,15,0.98)",
      backdropFilter:"blur(28px) saturate(1.5)",
      borderTop:`1px solid ${C.border}`,
      paddingBottom:"env(safe-area-inset-bottom,0px)",
      boxShadow:"0 -1px 0 rgba(255,255,255,0.04),0 -10px 36px rgba(0,0,0,0.6)",
    }}>
      {items.map(item=>{
        const isActive=item.id===active;
        const isPressed=pressed===item.id;
        const NavIcon=item.IconC;
        return (
          <button key={item.id} type="button"
            onMouseDown={()=>setPressed(item.id)}
            onMouseUp={()=>setPressed(null)}
            onMouseLeave={()=>setPressed(null)}
            onTouchStart={()=>setPressed(item.id)}
            onTouchEnd={()=>setPressed(null)}
            onClick={()=>item.route?navigate(item.route):onUnavailable()}
            style={{
              flex:1,minWidth:0,border:"none",background:"transparent",
              padding:"10px 4px 8px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:4,
              cursor:"pointer",
              fontFamily:"'Space Mono',monospace",fontSize:"0.45rem",fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",
              color:isActive?C.gold:isPressed?"rgba(242,242,244,0.65)":"rgba(242,242,244,0.28)",
              position:"relative",transition:"color 0.15s",
              WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
              transform:isPressed?"scale(0.9)":"scale(1)",
            }}
          >
            {isActive&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:2,borderRadius:"0 0 3px 3px",background:C.gold,boxShadow:`0 0 10px ${C.goldGlow}`}}/>}
            {isActive&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 25%,${C.goldDim},transparent 70%)`,pointerEvents:"none"}}/>}
            <div style={{
              position:"relative",width:26,height:26,
              display:"flex",alignItems:"center",justifyContent:"center",
              borderRadius:7,
              background:isActive?`rgba(247,195,68,0.09)`:"transparent",
              border:isActive?`1px solid rgba(247,195,68,0.18)`:"1px solid transparent",
              transition:"all 0.18s",
            }}>
              <NavIcon size={17} color={isActive?C.gold:isPressed?"rgba(242,242,244,0.6)":"rgba(242,242,244,0.28)"}/>
            </div>
            <span style={{letterSpacing:0.4}}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{position:"fixed",bottom:84,left:"50%",transform:"translateX(-50%)",zIndex:300,background:C.bg2,border:`1px solid ${C.border3}`,borderRadius:999,color:C.text,padding:"9px 18px",fontSize:"0.8rem",fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 12px 28px rgba(0,0,0,0.4)",pointerEvents:"none",fontFamily:"'Syne',sans-serif",animation:"fadeUp 0.2s ease"}}>
      {message}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate=useNavigate();
  const [toast,setToast]=useState("");
  const [mockSecs,setMockSecs]=useState(()=>{
    const now=new Date();
    const midnight=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1));
    return Math.max(0,Math.floor((midnight-now)/1000));
  });
  const [localUser,setLocalUser]=useState(()=>getUser());
  const [guildDoc,setGuildDoc]=useState(null);

  useEffect(()=>{
    injectFonts();
    const u=getUser();
    if (!u) { navigate("/onboarding"); return; }
    setLocalUser(u);
  },[]);

  useEffect(()=>{ const t=setInterval(()=>setMockSecs(s=>Math.max(0,s-1)),1000); return()=>clearInterval(t); },[]);

  useEffect(()=>{
    if (!localUser?.homeCountry) return;
    return onSnapshot(doc(db,"guilds",localUser.homeCountry),snap=>{
      if (!snap.exists()) { setGuildDoc(null); return; }
      const d=snap.data();
      setGuildDoc({name:d.name??null,flag:d.flag??null,memberCount:d.memberCount??0,castleHP:d.castleHP??0,castleHPCap:d.castleHPCap??CASTLE_HP_CAP});
    },()=>setGuildDoc(null));
  },[localUser?.homeCountry]);

  const userIdRef=useRef(localUser?.userId);
  useEffect(()=>{ userIdRef.current=localUser?.userId; },[localUser?.userId]);

  useEffect(()=>{
    const uid=localUser?.userId;
    if (!uid||uid==="guest") return;
    return onSnapshot(doc(db,"users",uid),snap=>{
      if (!snap.exists()) return;
      const d=snap.data();
      const today=new Date().toISOString().split("T")[0];
      setLocalUser(prev=>{
        const fresh={...prev,totalXP:d.totalXP??prev?.totalXP??0,dailyXP:d.dailyXPDate===today?(d.dailyXP??0):0,dailyXPDate:d.dailyXPDate??null,tier:d.tier??prev?.tier??"lurker"};
        saveUserLocally(fresh);
        return fresh;
      });
    },()=>{});
  },[localUser?.userId]);

  const nextFixtures=useNextFixtures();
  const worldChat=useWorldChat();

  if (!localUser) return null;

  const user=localUser;
  const country=COUNTRIES?.find(c=>c.code===user.homeCountry);
  const guild={
    name:       guildDoc?.name        || `${country?.name||user.homeCountry} Fan Guild`,
    flag:       guildDoc?.flag        || user.flag || country?.flag || "🏴",
    memberCount:guildDoc?.memberCount ?? 0,
    castleHP:   guildDoc?.castleHP    ?? 0,
    castleHPCap:guildDoc?.castleHPCap ?? CASTLE_HP_CAP,
  };

  const games    =useMemo(()=>GAMES.map(g=>({...g,done:isDoneToday(g)})),[]);
  const doneCount=games.filter(g=>g.done).length;
  const dailyXP  =getDailyXP(user);
  const xpPct    =clampPct(dailyXP,DAILY_XP_CAP);

  const showSoon=useCallback(()=>{
    setToast("Coming soon — stay tuned");
    clearTimeout(showSoon._t);
    showSoon._t=setTimeout(()=>setToast(""),2200);
  },[]);

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",width:"100%",maxWidth:"100vw",fontFamily:"'Syne',sans-serif",display:"flex",flexDirection:"column",overflowX:"hidden",boxSizing:"border-box"}}>
      <BgCanvas/>
      <TopNav user={user} dailyXP={dailyXP} xpPct={xpPct} navigate={navigate}/>

      <div style={{position:"relative",zIndex:1,flex:1,width:"100%",maxWidth:900,margin:"0 auto",boxSizing:"border-box"}}>

        {/* ── HERO ── */}
        <div style={{display:"flex",alignItems:"stretch",justifyContent:"space-between",paddingTop:30,paddingLeft:32,paddingRight:26,gap:16}}>
          <div style={{flex:1,minWidth:0,paddingRight:8}}>
            <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2.8rem,9vw,5rem)",lineHeight:0.88,letterSpacing:2,margin:0}}>
              <span style={{display:"block"}}>YOUR</span>
              <span style={{display:"block",WebkitTextStroke:`2px ${C.gold}`,color:"transparent"}}>FOOTBALL</span>
              <span style={{display:"block"}}>HOME</span>
            </h1>
            <p style={{fontFamily:"'Syne',sans-serif",fontSize:"0.9rem",color:C.muted,lineHeight:1.75,margin:"16px 0 0",maxWidth:330}}>
              Six fast football games, one daily ritual. Chase the XP, hold your guild's castle.
            </p>
          </div>
          <BouncingFootball/>
        </div>

        {/* ── STAT BAR ── */}
        <div style={{padding:"0 32px",boxSizing:"border-box",marginTop:22,marginBottom:26}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",border:`1px solid ${C.border2}`,borderRadius:14,overflow:"hidden"}}>
            {[
              {num:`${doneCount}/${games.length}`, lbl:"Done"},
              {num:`${dailyXP}/${DAILY_XP_CAP}`,  lbl:"Daily XP"},
              {num:(user.tier||"lurker").toUpperCase(), lbl:"Tier"},
              {num:guild.flag, lbl:guild.name, small:true},
            ].map(({num,lbl,small},i)=>(
              <div key={lbl} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"12px 6px",background:C.surface,borderRight:i<3?`1px solid ${C.border2}`:"none",minWidth:0}}>
                <span style={{fontFamily:small?"'Syne',sans-serif":"'Bebas Neue',sans-serif",fontSize:small?"1.3rem":"1.55rem",letterSpacing:small?0:1,color:C.gold,lineHeight:1}}>{num}</span>
                <span style={{fontSize:"0.48rem",fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:C.muted,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",textAlign:"center"}}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── REST ── */}
        <div style={{padding:"0 32px 100px",boxSizing:"border-box"}}>
          {nextFixtures.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {nextFixtures.map(f=><MatchCard key={f.id} fixture={f} fallbackSecs={mockSecs}/>)}
            </div>
          ):(
            <MatchCard fixture={null} fallbackSecs={mockSecs}/>
          )}
          <SectionHdr label="Choose Your Challenge" count={`${doneCount}/${games.length} done`}/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {games.map(game=><GameCard key={game.id} game={game} done={game.done} onPlay={()=>navigate(game.route)}/>)}
          </div>
          <RaidBanner onPress={showSoon}/>
          <SectionHdr label="Your Guild"/>
          <GuildCard guild={guild} navigate={navigate}/>
          <SectionHdr label="World Chat" right="ALL GUILDS"/>
          <WorldChat messages={worldChat} user={user} navigate={navigate}/>
          <div style={{height:8}}/>
        </div>
      </div>

      <BottomNav active="home" navigate={navigate} onUnavailable={showSoon}/>
      <Toast message={toast}/>
    </div>
  );
}