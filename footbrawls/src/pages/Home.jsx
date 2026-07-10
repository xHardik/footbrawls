import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUser, saveUserLocally } from "../lib/user";
import { COUNTRIES } from "../lib/countries";
import { getHPCap } from "../lib/guildLevels";

const DAILY_XP_CAP  = 250;
const CASTLE_HP_CAP = 10000;

const C = {
  bg:"#05080f", bg2:"#080c17",
  pitch:"rgba(255,255,255,0.025)", pitchLine:"rgba(255,255,255,0.045)",
  surface:"rgba(255,255,255,0.04)", surface2:"rgba(255,255,255,0.07)", surface3:"rgba(255,255,255,0.11)",
  border:"rgba(255,255,255,0.07)", border2:"rgba(255,255,255,0.12)", border3:"rgba(255,255,255,0.22)",
  gold:"#F7C344", goldGlow:"rgba(247,195,68,0.32)", goldDim:"rgba(247,195,68,0.1)",
  red:"#E84040", blue:"#4F8EF7", green:"#3DD68C", teal:"#06B6D4", purple:"#A855F7", orange:"#F97316", pink:"#EC4899", lime:"#A3E635",
  text:"#F2F2F4", muted:"rgba(242,242,244,0.5)", muted2:"rgba(242,242,244,0.28)", muted3:"rgba(242,242,244,0.15)",
};

const Icon = {
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
  Trophy: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 2h12v8a6 6 0 01-12 0V2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 5H3a1 1 0 00-1 1v2a4 4 0 004 4" stroke={color} strokeWidth="1.5"/>
      <path d="M18 5h3a1 1 0 011 1v2a4 4 0 01-4 4" stroke={color} strokeWidth="1.5"/>
      <path d="M12 16v4M8 20h8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
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
  Flame: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 22c4.4 0 8-3.3 8-7.4 0-2.4-1-4.4-2.6-5.9 0 1.4-.8 2.6-2 3.3C15.1 9.7 14 7 14 4c0 0-5 3-5 9.5 0 .8.1 1.5.3 2.2C8.5 15 8 13.6 8 12c-1.2 1.2-2 3-2 4.6C6 20.7 8.7 22 12 22z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="12" cy="17" r="2" stroke={color} strokeWidth="1.2"/>
    </svg>
  ),
  Puzzle: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Chart: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="14" width="4" height="7" rx="1" fill={color} opacity="0.5"/>
      <rect x="10" y="9" width="4" height="12" rx="1" fill={color} opacity="0.7"/>
      <rect x="17" y="4" width="4" height="17" rx="1" fill={color}/>
      <line x1="2" y1="21" x2="22" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
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
  Person: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5"/>
      <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Shield: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Swords: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 3l10 10M13 3l8 8-4 4-8-8V3h4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3 13l8 8 4-4-8-8" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M13.5 20.5l-2 2M20.5 13.5l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  ChevronRight: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Flag: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3v18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 3h14l-3 5 3 5H5" fill={color} opacity="0.5" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  Star: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18.1l-6.2 3 1.2-6.9-5-4.9 6.9-1L12 2z"/>
    </svg>
  ),
  Users: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke={color} strokeWidth="1.5"/>
      <path d="M3 20v-1a6 6 0 0112 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="7" r="2.5" stroke={color} strokeWidth="1.3" opacity="0.6"/>
      <path d="M21 20v-.5a5 5 0 00-4.3-4.9" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  Clock: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <path d="M12 7v5l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Send: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  Rank: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 20h18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 20V10" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <path d="M12 20V4" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M17 20V14" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  Home: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V21H3V10.5z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="9" y="14" width="6" height="7" rx="1" stroke={color} strokeWidth="1.3"/>
    </svg>
  ),
  Warning: ({size=14,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 20h20L12 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill={color}/>
    </svg>
  ),
  Lightning: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={color} fillOpacity="0.25"/>
    </svg>
  ),
  Question: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-1.5 2-2.5 3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill={color}/>
    </svg>
  ),
  Dribble: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="2.5" stroke={color} strokeWidth="1.4"/>
      <path d="M12 7.5c0 3-4 3-4 6s4 3 4 6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="11" r="1.5" fill={color} opacity="0.4"/>
      <circle cx="16" cy="14" r="1.5" fill={color} opacity="0.4"/>
    </svg>
  ),
  Play: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5l11 6.5-11 6.5V5.5z" fill={color} stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  Zap: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} fillOpacity="0.9">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  Castle: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="10" rx="1" stroke={color} strokeWidth="1.5"/>
      <path d="M3 11V7h3V9h2V7h3V9h2V7h3V11" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="9" y="15" width="6" height="6" rx="1" stroke={color} strokeWidth="1.3"/>
    </svg>
  ),
  Skull: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3a7 7 0 017 7c0 2.5-1.3 4.7-3.3 6L15 21H9l-.7-5C6.3 14.7 5 12.5 5 10a7 7 0 017-7z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="9" cy="11" r="1.5" fill={color}/>
      <circle cx="15" cy="11" r="1.5" fill={color}/>
      <path d="M9 17h6M10 19h4" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
};

const GAMES = [
  { id:"whoAreYa",      Icon:Icon.Person,   name:"Who Are Ya?",      tag:"Deduction",   desc:"Guess the mystery player from country, club, age, and position clues.",              xp:25,  route:"/games/whoareya",      color:C.orange, meta:["8 Attempts","Thinky"],       storageKey:"footbrawls_whoareya",       theme:"detective"   },
  { id:"matchPredictor",Icon:Icon.Target,   name:"Match Predictor",  tag:"Daily Pick",  desc:"Call today's result, top scorer, and exact scoreline — chase the season board.",    xp:50,  route:"/games/matchpredictor", color:C.gold,   meta:["Season Board","Max XP"],     storageKey:"footbrawls_matchpredictor", theme:"broadcast"   },
  { id:"penaltyNerve",  Icon:Icon.Flame,    name:"Penalty Nerve",    tag:"Pressure",    desc:"Beat the keeper across five high-stakes penalty kicks.",                              xp:25,  route:"/games/penaltynerve",   color:C.red,    meta:["5 Kicks","Keeper AI"],       storageKey:"footbrawls_penaltynerve",   theme:"penalty"     },
  { id:"wordle",        Icon:Icon.Puzzle,   name:"Player Wordle",    tag:"Word Game",   desc:"Wordle energy, football names. Narrow the attributes and land the player.",           xp:25,  route:"/games/wordle",         color:C.purple, meta:["6 Guesses","Sharable"],      storageKey:"footbrawls_wordle_history", theme:"scouting"    },
  { id:"higherLower",   Icon:Icon.Chart,    name:"Higher or Lower",  tag:"Stats",       desc:"Trust your stat instinct — call who ranks higher before the streak snaps.",           xp:25,  route:"/games/higherlower",    color:C.green,  meta:["10 Rounds","High Pressure"], storageKey:"footbrawls_higherlower",    theme:"stats"       },
  { id:"transferTrail", Icon:Icon.Network,  name:"Transfer Trail",   tag:"Career Trail",desc:"Connect two players through shared clubs in the fewest possible hops.",               xp:25,  route:"/games/transfertrail",  color:C.blue,   meta:["Fewest Steps","Mid Diff"],   storageKey:"footbrawls_transfertrail",  theme:"transfers"   },
  { id:"dailyTrivia",   Icon:Icon.Question, name:"Daily Trivia",     tag:"Knowledge",   desc:"10 football IQ questions, fresh every day. How much do you really know?",             xp:25,  route:"/games/dailytrivia",    color:C.teal,   meta:["10 Questions","Daily"],      storageKey:"footbrawls_dailytrivia",    theme:"trivia"      },
  { id:"top10",        Icon:Icon.Lightning, name:"Top 10 Guess",     tag:"Trivia List", desc:"Guess the top 10 list for a football category with only 3 lives.",  xp:25,  route:"/games/top10",          color:C.pink,   meta:["3 Lives","Top 10"],         storageKey:"footbrawls_top10_history",  theme:"rapid"       },
  { id:"dribbleGaunt", Icon:Icon.Dribble,  name:"Dribble Gauntlet", tag:"Arcade",      desc:"Navigate past defenders in this skill-based dribbling challenge. 5 levels of pain.",  xp:25,  route:"/games/dribble",        color:C.lime,   meta:["5 Levels","Arcade"],         storageKey:"footbrawls_dribble",        theme:"training"    },
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
    const data = JSON.parse(raw);
    const todayUTC = new Date().toISOString().split("T")[0];
    const d = new Date();
    const todayLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return data.date === todayUTC || data.date === todayLocal || Boolean(data[todayUTC]) || Boolean(data[todayLocal]);
  } catch { return false; }
}

function getDailyXP(user) {
  return user?.dailyXP || 0;
}

function clampPct(v,max){ return !max?0:Math.max(0,Math.min(100,Math.round((v/max)*100))); }
function pad(n){ return String(n).padStart(2,"0"); }
function fmtCountdown(s){ return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`; }

function useNextFixtures() {
  const [fixtures,setFixtures]=useState([]);
  useEffect(()=>{
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    
    const q=query(collection(db,"fixtures"),where("kickoffAt",">=",threeHoursAgo),orderBy("kickoffAt","asc"),limit(10));
    return onSnapshot(q,snap=>{
      if (snap.empty) {
        setFixtures([]);
      } else {
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        const incomplete = docs.filter(d => d.isComplete === false).slice(0, 2);
        setFixtures(incomplete);
      }
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

const GlobalStyles = () => (
  <style>{`
    @font-face {
      font-family: "Twemoji Country Flags";
      src: url("https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1.3/dist/CountryFlagEmojiPolyfill.ttf") format("truetype");
      unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
    }
    body, button, input, select, textarea {
      font-family: "Twemoji Country Flags", "DM Sans", "Segoe UI", sans-serif;
    }
    @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.65)}}
    @keyframes hpShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
    @keyframes chatRipple{0%{transform:scale(1);opacity:0.5}100%{transform:scale(3);opacity:0}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    @keyframes floodlightSweep{0%{opacity:0;transform:rotate(-8deg) translateX(-60px)}30%{opacity:0.7}70%{opacity:0.7}100%{opacity:0;transform:rotate(8deg) translateX(60px)}}
    @keyframes floodlightSweep2{0%{opacity:0;transform:rotate(8deg) translateX(60px)}30%{opacity:0.5}70%{opacity:0.5}100%{opacity:0;transform:rotate(-8deg) translateX(-60px)}}
    @keyframes pitchPulse{0%,100%{opacity:0.4}50%{opacity:0.65}}
    @keyframes heroBanner{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes xpGain{0%{transform:scale(1)}30%{transform:scale(1.18)}100%{transform:scale(1)}}
    @keyframes goalFlash{0%{opacity:0;transform:scaleX(0)}20%{opacity:1;transform:scaleX(1)}80%{opacity:1}100%{opacity:0}}
    @keyframes fbBounce{
      0%,100%{bottom:12px;transform:translateX(-50%) scaleY(0.78) scaleX(1.22);animation-timing-function:cubic-bezier(0.1,0.8,0.3,1)}
      50%{bottom:calc(100% - 76px);transform:translateX(-50%) scaleY(1.04) scaleX(0.96);animation-timing-function:cubic-bezier(0.7,0,0.9,0.2)}
    }
    @keyframes fbShadow{
      0%,100%{transform:translateX(-50%) scale(1.22);opacity:0.5;animation-timing-function:cubic-bezier(0.1,0.8,0.3,1)}
      50%{transform:translateX(-50%) scale(0.32);opacity:0.04;animation-timing-function:cubic-bezier(0.7,0,0.9,0.2)}
    }
    @keyframes cardFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes siegeFire{0%,100%{opacity:0.6;transform:scaleY(1)}50%{opacity:1;transform:scaleY(1.15)}}
    @keyframes fortressCrumble{0%{opacity:0.15}50%{opacity:0.35}100%{opacity:0.15}}
    @keyframes broadcastTicker{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
    @keyframes statCountUp{0%{transform:translateY(8px);opacity:0}100%{transform:translateY(0);opacity:1}}
    @keyframes stadiumZoom{0%{transform:scale(1)}100%{transform:scale(1.06)}}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
    .footer-link:hover {
      color: #F7C344 !important;
      text-shadow: 0 0 8px rgba(247, 195, 68, 0.35);
    }
    
    /* Responsive Footer Styles */
    .footer-container {
      position: relative;
      z-index: 1;
      backdrop-filter: blur(32px);
      padding: 52px 48px 36px;
    }
    .footer-stats-row {
      display: flex;
      justify-content: center;
      margin-bottom: 44px;
    }
    .footer-stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 44px;
      border-left: 1px solid rgba(255,255,255,0.06);
    }
    .footer-main-grid {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 60px;
      align-items: start;
      margin-bottom: 40px;
    }
    @media (max-width: 768px) {
      .footer-main-grid {
        grid-template-columns: 1fr;
        gap: 32px;
      }
    }
    @media (max-width: 640px) {
      .footer-container {
        padding: 36px 20px 24px;
      }
      .footer-stats-row {
        flex-direction: column;
        gap: 16px;
        align-items: center;
        margin-bottom: 28px;
      }
      .footer-stat-item {
        padding: 8px 16px;
        border-left: none;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        width: 100%;
      }
      .footer-stat-item:last-child {
        border-bottom: none;
      }
    }
  `}</style>
);


function StadiumBg() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 120% 80% at 50% -20%, rgba(12,20,40,0.95) 0%, ${C.bg} 60%)`}}/>

      
      <div style={{
        position:"absolute",inset:0,
        backgroundImage:`
          linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)
        `,
        backgroundSize:"80px 80px",
        maskImage:"linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.5) 15%,rgba(0,0,0,0.5) 85%,transparent 100%)",
        animation:"pitchPulse 6s ease-in-out infinite",
      }}/>

      
      <div style={{position:"absolute",width:600,height:600,top:"50%",left:"50%",transform:"translate(-50%,-50%)",borderRadius:"50%",border:"1px solid rgba(255,255,255,0.03)",opacity:0.7}}/>
      <div style={{position:"absolute",width:10,height:10,borderRadius:"50%",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(255,255,255,0.05)"}}/>

      
      <div style={{
        position:"absolute",
        top:"-10%", left:"8%",
        width:220, height:"140%",
        background:"linear-gradient(180deg, rgba(247,195,68,0.06) 0%, rgba(247,195,68,0.02) 40%, transparent 100%)",
        transformOrigin:"top left",
        filter:"blur(30px)",
        animation:"floodlightSweep 12s ease-in-out infinite",
      }}/>

      
      <div style={{
        position:"absolute",
        top:"-10%", right:"8%",
        width:220, height:"140%",
        background:"linear-gradient(180deg, rgba(79,142,247,0.05) 0%, rgba(79,142,247,0.015) 40%, transparent 100%)",
        transformOrigin:"top right",
        filter:"blur(30px)",
        animation:"floodlightSweep2 15s ease-in-out infinite",
        animationDelay:"3s",
      }}/>

      
      <div style={{position:"absolute",width:900,height:500,top:-200,left:"50%",transform:"translateX(-50%)",borderRadius:"50%",background:"radial-gradient(ellipse, rgba(247,195,68,0.09) 0%, transparent 65%)",filter:"blur(60px)"}}/>

      
      <div style={{position:"absolute",width:600,height:400,bottom:-100,right:-100,borderRadius:"50%",background:"radial-gradient(ellipse, rgba(79,142,247,0.06) 0%, transparent 70%)",filter:"blur(80px)"}}/>
      <div style={{position:"absolute",width:400,height:300,bottom:-80,left:-60,borderRadius:"50%",background:"radial-gradient(ellipse, rgba(61,214,140,0.04) 0%, transparent 70%)",filter:"blur(60px)"}}/>

      
      <div style={{position:"fixed",inset:0,opacity:0.022,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",backgroundSize:"256px"}}/>
    </div>
  );
}


function TopNav({ user, dailyXP, xpPct, navigate }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position:"sticky", top:0, zIndex:200,
      width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 20px", height:58, boxSizing:"border-box",
      background: scrolled ? "rgba(5,8,15,0.92)" : "rgba(5,8,15,0.55)",
      backdropFilter:"blur(32px) saturate(1.5)",
      borderBottom:`1px solid ${scrolled ? C.border2 : "rgba(255,255,255,0.04)"}`,
      boxShadow: scrolled ? "0 4px 40px rgba(0,0,0,0.7)" : "none",
      transition:"all 0.3s ease",
    }}>
      
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent 0%,${C.gold} 30%,rgba(255,220,100,0.9) 50%,${C.gold} 70%,transparent 100%)`,opacity:0.6}}/>

      
      <div onClick={() => navigate("/")} style={{
        display: "flex", alignItems: "center", gap: 8,
        cursor:"pointer", flexShrink:0,
      }}>
        <img src="/logo.png" alt="Logo" style={{ height: 32, filter:`drop-shadow(0 0 8px ${C.goldGlow})` }} />
        <span style={{
          fontFamily:"'Bebas Neue',sans-serif",
          fontSize:"1.65rem", letterSpacing:4,
          background:`linear-gradient(110deg, #ffe680, ${C.gold} 40%, #ffaa00 65%, ${C.gold})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
          filter:`drop-shadow(0 0 14px ${C.goldGlow})`,
        }}>FOOTBRAWLS</span>
      </div>

      
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        
        <div className="home-top-nav-xp" style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"6px 14px", borderRadius:100,
          border:"1px solid rgba(61,214,140,0.2)",
          background:"rgba(61,214,140,0.04)",
          fontFamily:"'Space Mono',monospace",
        }}>
          <div style={{position:"relative", width:52, height:5, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden"}}>
            <div style={{width:`${xpPct}%`, height:"100%", background:"linear-gradient(90deg,#3DD68C,#7fffcc)", borderRadius:99, transition:"width 0.8s cubic-bezier(0.22,1,0.36,1)"}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)",animation:"hpShimmer 2.5s ease-in-out infinite"}}/>
          </div>
          <span style={{fontSize:"0.6rem", fontWeight:700, letterSpacing:0.5, color:C.gold}}>{dailyXP}</span>
          <span style={{fontSize:"0.55rem", color:C.muted2}}>XP</span>
        </div>

        
        <div style={{
          display:"flex", alignItems:"center", gap:7,
          padding:"5px 13px", borderRadius:100,
          border:`1px solid ${C.border2}`, background:C.surface,
          fontSize:"0.72rem", fontWeight:700, color:C.text,
          fontFamily:"'Syne',sans-serif", letterSpacing:0.4,
          flexShrink:0, maxWidth:140, overflow:"hidden",
        }}>
          <span style={{flexShrink:0, fontSize:"1.05rem"}}>{user.flag || "🏴"}</span>
          <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{user.nickname}</span>
        </div>
      </div>
    </nav>
  );
}







function HeroSection({ user, dailyXP, xpPct, doneCount, gamesTotal, guild, navigate }) {
  return (
    <div style={{
      position:"relative",
      overflow:"hidden",
      minHeight:520,
      display:"flex",
      flexDirection:"column",
      justifyContent:"flex-end",
      padding:"0 28px 36px",
    }}>

      
      <img
        src="/stadium.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position:"absolute", inset:0,
          width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"center 28%",
          zIndex:0,
          
          animation:"stadiumZoom 18s ease-in-out infinite alternate",
        }}
      />

      
      
      <div style={{
        position:"absolute", inset:0, zIndex:1,
        background:"linear-gradient(180deg, rgba(5,8,15,0.28) 0%, rgba(5,8,15,0.52) 35%, rgba(5,8,15,0.88) 70%, rgba(5,8,15,0.97) 100%)",
      }}/>
      
      <div style={{
        position:"absolute", inset:0, zIndex:1,
        background:"linear-gradient(90deg, rgba(5,8,15,0.55) 0%, rgba(5,8,15,0.1) 55%, transparent 100%)",
      }}/>
      
      <div style={{
        position:"absolute", top:-80, left:"50%", transform:"translateX(-50%)",
        width:900, height:420, borderRadius:"50%", zIndex:1,
        background:"radial-gradient(ellipse, rgba(247,195,68,0.07) 0%, transparent 60%)",
        filter:"blur(40px)", pointerEvents:"none",
      }}/>

      
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:3, zIndex:3,
        background:"linear-gradient(90deg,transparent 0%,rgba(247,195,68,0.7) 30%,rgba(255,220,100,0.9) 50%,rgba(247,195,68,0.7) 70%,transparent 100%)",
      }}/>

      
      <div style={{position:"relative", zIndex:2}}>

        
        <div style={{
          position:"absolute", top:0, left:-28, bottom:0, width:4,
          background:`linear-gradient(180deg, ${C.gold}, transparent)`,
          opacity:0.55,
        }}/>

        <h1 style={{
          fontFamily:"'Bebas Neue',sans-serif",
          fontSize:"clamp(3.2rem,10vw,5.8rem)",
          lineHeight:0.88, letterSpacing:3, margin:"0 0 18px",
          paddingTop: 40,
        }}>
          <span style={{display:"block", color:C.text}}>YOUR</span>
          <span style={{
            display:"block",
            WebkitTextStroke:`2.5px ${C.gold}`,
            color:"transparent",
            filter:`drop-shadow(0 0 30px ${C.goldGlow})`,
          }}>FOOTBALL</span>
          <span style={{display:"block", color:C.text}}>HOME</span>
        </h1>

        <p style={{
          fontFamily:"'Syne',sans-serif", fontSize:"0.88rem",
          color:C.muted, lineHeight:1.8, margin:"0 0 24px", maxWidth:320,
        }}>
          Nine daily football games, one obsession. Earn XP, defend your guild's fortress, become a legend.
        </p>

        
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(3,1fr)",
          gap:10, marginBottom:18,
        }}>
          {[
            { num:`${doneCount}/${gamesTotal}`, label:"Today's Games", color:C.teal },
            { num:`${dailyXP}`, label:`of ${DAILY_XP_CAP} XP`, color:C.gold },
            { num:guild.flag, label:guild.name.split(" ").slice(0,2).join(" "), color:C.green, emoji:true },
          ].map(({ num, label, color, emoji }) => (
            <div key={label} style={{
              padding:"14px 12px",
              background:"rgba(5,8,15,0.55)",
              border:`1px solid rgba(255,255,255,0.1)`,
              borderRadius:12,
              backdropFilter:"blur(12px)",
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              position:"relative", overflow:"hidden",
            }}>
              <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 0%,${color}12,transparent 60%)`,pointerEvents:"none"}}/>
              <span style={{
                fontFamily: emoji ? "'Syne',sans-serif" : "'Bebas Neue',sans-serif",
                fontSize: emoji ? "1.5rem" : "1.8rem",
                letterSpacing: emoji ? 0 : 2,
                color, lineHeight:1,
                animation:"statCountUp 0.5s ease",
                textShadow:`0 0 20px ${color}55`,
              }}>{num}</span>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",fontWeight:700,letterSpacing:0.8,color:C.muted2,textTransform:"uppercase",textAlign:"center"}}>{label}</span>
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${color}55,transparent)`}}/>
            </div>
          ))}
        </div>

        
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,letterSpacing:1.5,color:C.muted2,textTransform:"uppercase"}}>Daily XP Progress</span>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.9rem",letterSpacing:1,color:C.gold}}>{xpPct}%</span>
          </div>
          <div style={{height:8,borderRadius:99,background:"rgba(255,255,255,0.08)",overflow:"hidden",position:"relative",backdropFilter:"blur(4px)"}}>
            <div style={{width:`${xpPct}%`,height:"100%",borderRadius:99,background:"linear-gradient(90deg,#3DD68C88,#3DD68C,#7fffcc)",boxShadow:"0 0 12px rgba(61,214,140,0.5)",transition:"width 1s cubic-bezier(0.22,1,0.36,1)"}}>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",animation:"hpShimmer 2.5s ease-in-out infinite"}}/>
            </div>
          </div>
        </div>

        
        <div style={{display:"flex", gap:10}}>
          <button
            onClick={() => navigate("/guild")}
            style={{
              flex:1, padding:"12px 16px", borderRadius:10,
              fontFamily:"'Bebas Neue',sans-serif", fontSize:"1rem", letterSpacing:2,
              background:"rgba(6,182,212,0.12)",
              border:"1px solid rgba(6,182,212,0.35)", color:C.teal,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"all 0.2s", backdropFilter:"blur(8px)",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(6,182,212,0.22)";e.currentTarget.style.boxShadow="0 0 24px rgba(6,182,212,0.2)"}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(6,182,212,0.12)";e.currentTarget.style.boxShadow="none"}}
          >
            <Icon.Shield size={16} color={C.teal}/> MY GUILD
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("games-section");
              if (el) el.scrollIntoView({ behavior:"smooth" });
            }}
            style={{
              flex:2, padding:"12px 16px", borderRadius:10,
              fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.05rem", letterSpacing:2.5,
              background:"linear-gradient(135deg,rgba(247,195,68,0.22),rgba(247,195,68,0.08))",
              border:"1px solid rgba(247,195,68,0.42)", color:C.gold,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"all 0.2s",
              boxShadow:"0 0 20px rgba(247,195,68,0.12)",
              backdropFilter:"blur(8px)",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(247,195,68,0.28)";e.currentTarget.style.boxShadow="0 0 32px rgba(247,195,68,0.25)"}}
            onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(247,195,68,0.22),rgba(247,195,68,0.08))";e.currentTarget.style.boxShadow="0 0 20px rgba(247,195,68,0.12)"}}
          >
            <Icon.Play size={16} color={C.gold}/> PLAY TODAY'S GAMES
          </button>
        </div>

      </div>
    </div>
  );
}


function BouncingFootball() {
  return (
    <div style={{position:"relative",width:88,flexShrink:0,alignSelf:"stretch",display:"flex",alignItems:"flex-end",justifyContent:"center",overflow:"visible"}}>
      <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",width:72,height:72,borderRadius:"50%",background:`radial-gradient(ellipse,${C.goldGlow} 0%,transparent 70%)`,filter:"blur(16px)"}}/>
      <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",animation:"fbBounce 1.2s linear infinite"}}>
        <svg viewBox="0 0 80 80" width="68" height="68" xmlns="http://www.w3.org/2000/svg" style={{filter:"drop-shadow(0 6px 18px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(247,195,68,0.22))"}}>
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
    </div>
  );
}


function MatchCard({ fixture, fallbackSecs }) {
  const [secs,setSecs]=useState(fallbackSecs);
  useEffect(()=>{
    if (!fixture?.kickoffAt){setSecs(fallbackSecs);return;}
    const ms=fixture.kickoffAt.toMillis?fixture.kickoffAt.toMillis():fixture.kickoffAt*1000;
    const tick=()=>setSecs(Math.max(0,Math.floor((ms-Date.now())/1000)));
    tick(); const t=setInterval(tick,1000); return ()=>clearInterval(t);
  },[fixture,fallbackSecs]);

  const name = fixture ? `${fixture.homeTeam} vs ${fixture.awayTeam}` : "No match scheduled today";
  const kickoffMs = fixture?.kickoffAt?.toMillis ? fixture.kickoffAt.toMillis() : (fixture?.kickoffAt ? fixture.kickoffAt*1000 : 0);
  const isLive = fixture?.isLive || (fixture && !fixture.isComplete && kickoffMs < Date.now() && kickoffMs >= Date.now() - 3*60*60*1000);
  const hasFixture = !!fixture;

  return (
    <div style={{
      position:"relative", overflow:"hidden",
      background: isLive
        ? "linear-gradient(135deg, rgba(232,64,64,0.12), rgba(232,64,64,0.04))"
        : "linear-gradient(135deg, rgba(247,195,68,0.06), rgba(255,255,255,0.02))",
      border:`1px solid ${isLive ? "rgba(232,64,64,0.4)" : C.border2}`,
      borderRadius:16, padding:"18px 20px",
      display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
      boxShadow: isLive ? "0 0 40px rgba(232,64,64,0.12), inset 0 1px 0 rgba(255,255,255,0.05)" : "inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>
      
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:isLive?"linear-gradient(90deg,transparent,rgba(232,64,64,0.8),transparent)":"linear-gradient(90deg,transparent,rgba(247,195,68,0.5),transparent)"}}/>

      <div style={{minWidth:0, flex:1}}>
        <div style={{
          fontFamily:"'Space Mono',monospace", fontSize:"0.55rem", fontWeight:700,
          letterSpacing:2, textTransform:"uppercase",
          color: isLive ? C.red : hasFixture ? C.gold : C.muted2,
          marginBottom:8, display:"flex", alignItems:"center", gap:8,
        }}>
          {isLive && <div style={{width:7,height:7,borderRadius:"50%",background:C.red,boxShadow:`0 0 10px ${C.red}`,animation:"livePulse 1.8s ease infinite"}}/>}
          <Icon.Clock size={12} color={isLive ? C.red : hasFixture ? C.gold : C.muted2}/>
          {isLive ? "Live Now" : hasFixture ? "Prediction Lock" : "Daily Reset"}
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:2,color:C.text,lineHeight:1,textShadow:isLive?`0 0 20px rgba(232,64,64,0.4)`:hasFixture?`0 0 20px rgba(247,195,68,0.2)`:""}}>{name}</div>
        {fixture?.stage && <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",color:C.muted2,marginTop:5,letterSpacing:0.6}}>{fixture.stage}</div>}
      </div>

      <div style={{textAlign:"right",flexShrink:0}}>
        {isLive
          ? <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.6rem",letterSpacing:4,color:C.red,lineHeight:1,textShadow:`0 0 30px rgba(232,64,64,0.6)`}}>{fixture.homeScore??0} – {fixture.awayScore??0}</div>
          : <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.1rem",letterSpacing:3,color:hasFixture?C.gold:C.muted2,lineHeight:1,textShadow:hasFixture?`0 0 20px ${C.goldGlow}`:""}}>{fmtCountdown(secs)}</div>
        }
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",color:C.muted,letterSpacing:1,marginTop:4}}>{isLive?"live score":hasFixture?"until lock":"until next day"}</div>
      </div>
    </div>
  );
}


function SectionDivider({ label, count, right, color = C.gold }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,marginTop:36}}>
      <div style={{width:3,height:18,borderRadius:2,background:`linear-gradient(180deg,${color},${color}33)`,flexShrink:0}}/>
      <span style={{
        fontFamily:"'Bebas Neue',sans-serif",
        fontSize:"1.0rem",letterSpacing:3,color:C.text,whiteSpace:"nowrap",
      }}>{label}</span>
      {count && <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,letterSpacing:1,color,padding:"2px 8px",background:`${color}12`,border:`1px solid ${color}28`,borderRadius:3}}>{count}</span>}
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${color}30,transparent)`}}/>
      {right && <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",color:C.muted3,letterSpacing:1,whiteSpace:"nowrap"}}>{right}</span>}
    </div>
  );
}


const GAME_THEMES = {
  detective:  { bg:"radial-gradient(ellipse at 70% 30%,rgba(249,115,22,0.18),rgba(5,8,15,0.95) 60%)", accent:"rgba(249,115,22,0.6)",  label:"DETECTIVE ROOM"   },
  broadcast:  { bg:"radial-gradient(ellipse at 70% 30%,rgba(247,195,68,0.2),rgba(5,8,15,0.95) 60%)",  accent:"rgba(247,195,68,0.6)",  label:"PREDICTION STUDIO" },
  penalty:    { bg:"radial-gradient(ellipse at 70% 30%,rgba(232,64,64,0.2),rgba(5,8,15,0.95) 60%)",   accent:"rgba(232,64,64,0.6)",   label:"NIGHT STADIUM"     },
  scouting:   { bg:"radial-gradient(ellipse at 70% 30%,rgba(168,85,247,0.18),rgba(5,8,15,0.95) 60%)", accent:"rgba(168,85,247,0.6)",  label:"SCOUT CENTRE"      },
  stats:      { bg:"radial-gradient(ellipse at 70% 30%,rgba(61,214,140,0.16),rgba(5,8,15,0.95) 60%)", accent:"rgba(61,214,140,0.6)",  label:"STAT ARENA"        },
  transfers:  { bg:"radial-gradient(ellipse at 70% 30%,rgba(79,142,247,0.18),rgba(5,8,15,0.95) 60%)", accent:"rgba(79,142,247,0.6)",  label:"WAR ROOM"          },
  trivia:     { bg:"radial-gradient(ellipse at 70% 30%,rgba(6,182,212,0.18),rgba(5,8,15,0.95) 60%)",  accent:"rgba(6,182,212,0.6)",   label:"QUIZ THEATRE"      },
  rapid:      { bg:"radial-gradient(ellipse at 70% 30%,rgba(236,72,153,0.18),rgba(5,8,15,0.95) 60%)", accent:"rgba(236,72,153,0.6)",  label:"ESPORTS ARENA"     },
  training:   { bg:"radial-gradient(ellipse at 70% 30%,rgba(163,230,53,0.15),rgba(5,8,15,0.95) 60%)", accent:"rgba(163,230,53,0.6)",  label:"TRAINING GROUND"   },
};

function GamePortalCard({ game, done, onPlay, index }) {
  const [hovered, setHovered] = useState(false);
  const ca = game.color;
  const theme = GAME_THEMES[game.theme] || GAME_THEMES.broadcast;
  const isActionBanner = index === 8;
  const hasBanner = index <= 8;

  let bgImage = "url('/assets/banners.jpg')";
  let bgSize = "200% 400%";
  let bgPos = "0% 0%";

  if (isActionBanner) {
    bgImage = "url('/assets/action_banners.jpg')";
    bgSize = "100% 300%";
    bgPos = "50% 1%"; // Top row (slightly adjusted)
  } else {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const yOffsets = ["0%", "35%", "69.5%", "100%"];
    const xOffset = col === 0 ? "1%" : "99%";
    bgPos = `${xOffset} ${yOffsets[row]}`;
  }

  return (
    <div
      onClick={() => onPlay(game)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:"relative", overflow:"hidden",
        display:"flex", flexDirection:"column",
        background: hovered ? theme.bg : "rgba(255,255,255,0.09)",
        border:`1px solid ${hovered ? ca + "cc" : C.border}`,
        borderRadius:16,
        cursor:"pointer",
        transform: hovered ? "translateY(-4px) scale(1.02)" : "none",
        boxShadow: hovered
          ? `0 24px 52px rgba(0,0,0,0.65), 0 0 0 1px ${ca}55, 0 0 40px ${ca}18`
          : "0 1px 0 rgba(255,255,255,0.03)",
        transition:"all 0.25s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div style={{position:"absolute",top:0,left:0,right:0,height:hovered?3:2,background:`linear-gradient(90deg,transparent,${ca},transparent)`,opacity:hovered?1:0.3,transition:"all 0.25s",zIndex:3}}/>
      <div style={{position:"absolute",top:0,left:hovered?"-5%":"-120%",width:"50%",height:"100%",background:`linear-gradient(105deg,transparent,${ca}14,transparent)`,transition:"left 0.5s ease",pointerEvents:"none",zIndex:3}}/>

      <div style={{
        position:"relative", 
        height:150, 
        width:"100%",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        overflow:"hidden",
        borderBottom:`1px solid ${C.border}`
      }}>
        {hasBanner ? (
          <div style={{
            position:"absolute", top:0, left:0, right:0, bottom:0,
            backgroundImage: bgImage,
            backgroundSize: bgSize,
            backgroundPosition: bgPos,
            transform: isActionBanner ? (hovered ? "scale(1.26)" : "scale(1.2)") : (hovered ? "scale(1.28)" : "scale(1.22)"),
            transition:"transform 0.5s ease"
          }} />
        ) : (
          <div style={{
            width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
            background: `radial-gradient(circle at center, ${ca}30, ${ca}10)`
          }}>
            <GameIcon size={48} color={ca}/>
          </div>
        )}

        <div style={{
          position:"absolute", top:10, right:10,
          display:"flex",alignItems:"center",gap:3,
          padding:"5px 10px",borderRadius:99,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
          border:`1px solid ${C.gold}66`,
          boxShadow: `0 0 14px ${C.gold}44`,
          zIndex:4
        }}>
          <Icon.Zap size={10} color={C.gold}/>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,color:C.gold,letterSpacing:0.5}}>+{game.xp}</span>
        </div>
      </div>

      <div style={{position:"relative",zIndex:2,width:"100%", padding:"12px 14px 16px", flex:1, display:"flex", flexDirection:"column", justifyContent:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <div style={{
            fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"1.1rem",letterSpacing:1.8,lineHeight:1,
            color:C.text,
            textShadow: hovered ? `0 0 20px ${ca}99` : "none",
            transition:"text-shadow 0.22s",
          }}>{game.name}</div>
          {done && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
              <circle cx="12" cy="12" r="10" fill="rgba(61,214,140,0.15)" stroke={C.green} strokeWidth="2"/>
              <path d="M8 12l3 3 5-5" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div style={{
          fontFamily:"'Syne',sans-serif", fontSize:"0.65rem",
          color: hovered ? "#ffffff" : "rgba(255,255,255,0.85)",
          lineHeight:1.5,
          overflow:"hidden", display:"-webkit-box",
          WebkitLineClamp:2, WebkitBoxOrient:"vertical",
          transition:"color 0.22s",
        }}>{game.desc}</div>
      </div>
    </div>
  );
}


function FortressGuildCard({ guild, navigate }) {
  const [hovered, setHovered] = useState(false);
  const hp = guild.castleHP ?? 0;
  const maxHp = getHPCap(guild.guildLevel ?? 1);
  const hpPct = clampPct(hp, maxHp);
  const hpColor = hpPct >= 70 ? C.green : hpPct >= 35 ? C.gold : C.red;
  const hpGlow = hpPct >= 70 ? "rgba(61,214,140,0.4)" : hpPct >= 35 ? "rgba(247,195,68,0.4)" : "rgba(232,64,64,0.4)";
  const fortressStatus = hpPct >= 70 ? "FORTIFIED" : hpPct >= 35 ? "HOLDING" : "UNDER SIEGE";
  const battlemarkers = [0, 25, 50, 75, 100];

  return (
    <div
      onClick={() => navigate("/guild")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:"relative", overflow:"hidden",
        background: hovered
          ? `radial-gradient(ellipse at 20% 50%,rgba(6,182,212,0.1),transparent 55%),rgba(255,255,255,0.04)`
          : "rgba(255,255,255,0.025)",
        border:`1px solid ${hovered ? "rgba(6,182,212,0.5)" : C.border2}`,
        borderRadius:18,
        cursor:"pointer",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 20px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(6,182,212,0.2)" : "none",
        transition:"all 0.22s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      
      <div style={{
        padding:"18px 20px 16px",
        background:"linear-gradient(180deg,rgba(255,255,255,0.03),transparent)",
        borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", gap:14,
      }}>
        
        <div style={{
          width:64, height:64, borderRadius:16, flexShrink:0,
          background:"rgba(6,182,212,0.06)",
          border:`2px solid ${hovered ? "rgba(6,182,212,0.55)" : "rgba(6,182,212,0.18)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"2rem",
          boxShadow: hovered ? "0 0 24px rgba(6,182,212,0.3)" : "none",
          transition:"all 0.22s",
          position:"relative",
        }}>
          {guild.flag}
          
          <div style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:C.gold,border:`2px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon.Star size={9} color="#000"/>
          </div>
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{
            fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.45rem",letterSpacing:2,lineHeight:1,
            color:C.text, marginBottom:6,
            textShadow: hovered ? "0 0 22px rgba(6,182,212,0.4)" : "none",
            transition:"text-shadow 0.2s",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
          }}>{guild.name}</div>

          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{display:"flex",alignItems:"center",gap:4,fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",color:C.muted2,letterSpacing:0.3}}>
              <Icon.Users size={11} color={C.muted2}/> {(guild.memberCount||0).toLocaleString()} members
            </span>
            <span style={{
              fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",fontWeight:700,
              color:hpColor, background:`${hpColor}12`, border:`1px solid ${hpColor}33`,
              borderRadius:4, padding:"2px 8px", letterSpacing:0.8, textTransform:"uppercase",
            }}>
              {fortressStatus}
            </span>
          </div>
        </div>

        <div style={{
          fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,
          letterSpacing:1, padding:"8px 14px", borderRadius:8,
          color:C.teal,
          background: hovered ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.05)",
          border:`1px solid rgba(6,182,212,${hovered ? 0.5 : 0.18})`,
          textTransform:"uppercase", flexShrink:0, whiteSpace:"nowrap",
          transition:"all 0.2s",
          boxShadow: hovered ? "0 0 16px rgba(6,182,212,0.25)" : "none",
        }}>ENTER →</div>
      </div>

      
      <div style={{padding:"16px 20px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Icon.Castle size={15} color={hpColor}/>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",fontWeight:700,color:C.muted,letterSpacing:1.5,textTransform:"uppercase"}}>Fortress Integrity</span>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1.5,color:hpColor,textShadow:`0 0 14px ${hpGlow}`}}>
            {hp.toLocaleString()} <span style={{color:C.muted2,fontSize:"0.72rem",fontFamily:"'Space Mono',monospace",fontWeight:400}}>/ {maxHp.toLocaleString()}</span>
          </span>
        </div>

        
        <div style={{position:"relative",height:12,borderRadius:99,background:"rgba(255,255,255,0.05)",overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
          
          <div style={{width:`${hpPct}%`,height:"100%",borderRadius:99,background:`linear-gradient(90deg,${hpColor}66,${hpColor})`,boxShadow:`0 0 10px ${hpGlow}`,transition:"width 1s cubic-bezier(0.22,1,0.36,1)",position:"relative"}}>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0.25),transparent)",borderRadius:99}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",animation:"hpShimmer 2.5s ease-in-out infinite"}}/>
          </div>
          
          {battlemarkers.slice(1,-1).map(p=>(
            <div key={p} style={{position:"absolute",top:0,left:`${p}%`,width:1,height:"100%",background:"rgba(0,0,0,0.5)"}}/>
          ))}
          
          {hpPct < 35 && (
            <>
              <div style={{position:"absolute",top:"20%",left:`${hpPct + 3}%`,width:1,height:"60%",background:"rgba(232,64,64,0.5)",animation:"fortressCrumble 1.5s ease infinite"}}/>
              <div style={{position:"absolute",top:"10%",left:`${hpPct + 8}%`,width:1,height:"80%",background:"rgba(232,64,64,0.3)",animation:"fortressCrumble 2s ease infinite",animationDelay:"0.4s"}}/>
            </>
          )}
        </div>

        
        <div style={{display:"flex",justifyContent:"space-between",marginTop:7,alignItems:"center"}}>
          <div style={{display:"flex",gap:12}}>
            {[{c:C.green,l:"70–100% Fortified"},{c:C.gold,l:"35–69% Holding"},{c:C.red,l:"0–34% Siege"}].map(({c,l})=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:c,boxShadow:`0 0 6px ${c}66`}}/>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.38rem",color:C.muted3,letterSpacing:0.3}}>{l}</span>
              </div>
            ))}
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.9rem",letterSpacing:1,color:hpColor,textShadow:`0 0 8px ${hpGlow}`}}>{hpPct}%</span>
        </div>
      </div>

      
      <div style={{position:"absolute",top:0,left:hovered?"-5%":"-130%",width:"55%",height:"100%",background:"linear-gradient(105deg,transparent,rgba(6,182,212,0.06),transparent)",transition:"left 0.55s ease",pointerEvents:"none"}}/>
    </div>
  );
}


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

  const TIER_META = {
    lurker:  { color:"#6b7a99", label:"LURKER"  },
    fan:     { color:C.blue,    label:"FAN"     },
    veteran: { color:C.green,   label:"VETERAN" },
    ultra:   { color:C.gold,    label:"ULTRA"   },
    legend:  { color:C.purple,  label:"LEGEND"  },
  };

  return (
    <div style={{
      background:"rgba(255,255,255,0.02)",
      border:`1px solid ${focused ? C.border3 : C.border2}`,
      borderRadius:18, overflow:"hidden",
      boxShadow: focused ? "0 0 0 1px rgba(255,255,255,0.05),0 8px 32px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.2)",
      transition:"box-shadow 0.2s, border-color 0.2s",
    }}>
      
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"14px 18px",borderBottom:`1px solid ${C.border}`,
        background:"linear-gradient(135deg,rgba(61,214,140,0.06),rgba(255,255,255,0.015))",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{position:"relative",width:10,height:10,flexShrink:0}}>
            <div style={{position:"absolute",inset:-3,borderRadius:"50%",background:"rgba(61,214,140,0.2)",animation:"chatRipple 2s ease-out infinite"}}/>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",background:C.green,boxShadow:`0 0 10px ${C.green}`}}/>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:3,color:C.text}}>WORLD CHAT</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",color:C.green,letterSpacing:1,padding:"2px 8px",background:"rgba(61,214,140,0.07)",border:"1px solid rgba(61,214,140,0.2)",borderRadius:3,fontWeight:700}}>LIVE</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",color:C.muted3,letterSpacing:0.5}}>{messages.length} messages</span>
        </div>
        <button onClick={()=>navigate("/guild")} style={{fontFamily:"'Space Mono',monospace",fontSize:"0.48rem",fontWeight:700,letterSpacing:0.8,color:C.teal,background:"rgba(6,182,212,0.06)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:6,padding:"5px 12px",cursor:"pointer",textTransform:"uppercase",transition:"all 0.18s",whiteSpace:"nowrap"}}>
          Guild Chat
        </button>
      </div>

      
      <div ref={containerRef} style={{
        height:"min(280px,50vh)",overflowY:"auto",
        padding:"14px 16px",
        scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.07) transparent",
        display:"flex",flexDirection:"column",gap:0,
        background:"linear-gradient(180deg,rgba(0,0,0,0.1),transparent 20%)",
      }}>
        {messages.length===0 && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,opacity:0.5,paddingTop:40}}>
            <Icon.Ball size={38} color={C.muted2}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.0rem",letterSpacing:2,color:C.muted,marginBottom:4}}>NO MESSAGES YET</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",color:C.muted2,letterSpacing:0.4}}>Be the first to start the banter</div>
            </div>
          </div>
        )}
        {messages.map((m,i) => {
          const isMe = m.userId === user.userId;
          const tmeta = TIER_META[m.tier || "lurker"] || TIER_META.lurker;
          const prevSameSender = i > 0 && messages[i-1].userId === m.userId;
          return (
            <div key={m.id||i} style={{
              display:"flex", alignItems:"flex-end", gap:8,
              flexDirection: isMe ? "row-reverse" : "row",
              marginTop: prevSameSender ? 2 : 10,
            }}>
              
              <div style={{
                width:28,height:28,borderRadius:8,
                background: isMe ? "rgba(61,214,140,0.1)" : "rgba(255,255,255,0.05)",
                border:`1px solid ${isMe ? "rgba(61,214,140,0.25)" : C.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"0.9rem",flexShrink:0,
                opacity: prevSameSender ? 0 : 1,
              }}>{m.flag||"🏴"}</div>

              
              <div style={{maxWidth:"72%",display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:2}}>
                {!prevSameSender && (
                  <div style={{display:"flex",alignItems:"center",gap:5,flexDirection:isMe?"row-reverse":"row"}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,color:isMe?C.green:tmeta.color,letterSpacing:0.3}}>{m.nickname}</span>
                    {m.tier && m.tier!=="lurker" && (
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.38rem",fontWeight:700,color:tmeta.color,background:`${tmeta.color}14`,border:`1px solid ${tmeta.color}28`,borderRadius:2,padding:"1px 5px",textTransform:"uppercase",letterSpacing:0.4}}>{tmeta.label}</span>
                    )}
                  </div>
                )}
                <div style={{
                  padding:"9px 13px",
                  borderRadius: isMe ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: isMe
                    ? "linear-gradient(135deg,rgba(61,214,140,0.17),rgba(61,214,140,0.09))"
                    : "rgba(255,255,255,0.055)",
                  border:`1px solid ${isMe ? "rgba(61,214,140,0.25)" : C.border}`,
                  boxShadow: isMe ? "0 2px 12px rgba(61,214,140,0.1)" : "0 2px 6px rgba(0,0,0,0.2)",
                }}>
                  <span style={{fontSize:"0.78rem",color:isMe?"rgba(242,242,244,0.95)":C.muted,lineHeight:1.55,wordBreak:"break-word",display:"block"}}>{m.text}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      
      {err && (
        <div style={{padding:"7px 18px",fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",color:C.red,background:"rgba(232,64,64,0.06)",borderTop:"1px solid rgba(232,64,64,0.1)",display:"flex",alignItems:"center",gap:6}}>
          <Icon.Warning size={12} color={C.red}/> {err}
        </div>
      )}

      
      <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,0.18)"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.95rem",flexShrink:0}}>{user.flag||"🏴"}</div>
          <div style={{flex:1,position:"relative"}}>
            <input
              value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
              placeholder="Say something to the world…" maxLength={120}
              style={{width:"100%",boxSizing:"border-box",background:focused?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.04)",border:`1px solid ${focused?C.border3:C.border2}`,borderRadius:9,padding:"9px 40px 9px 13px",color:C.text,fontSize:"0.79rem",fontFamily:"'Syne',sans-serif",outline:"none",caretColor:C.green,transition:"all 0.18s"}}
            />
            {input && <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontFamily:"'Space Mono',monospace",fontSize:"0.42rem",color:input.length>100?C.red:C.muted3,pointerEvents:"none"}}>{120-input.length}</span>}
          </div>
          <button onClick={handleSend} disabled={!input.trim()||sending}
            style={{width:38,height:38,borderRadius:9,background:input.trim()?C.green:"rgba(255,255,255,0.05)",border:`1px solid ${input.trim()?"rgba(61,214,140,0.6)":C.border}`,color:input.trim()?"#000":C.muted3,display:"flex",alignItems:"center",justifyContent:"center",cursor:input.trim()?"pointer":"default",transition:"all 0.18s",flexShrink:0,boxShadow:input.trim()?"0 0 16px rgba(61,214,140,0.4)":"none",transform:input.trim()?"scale(1)":"scale(0.95)"}}>
            {sending
              ? <div style={{width:14,height:14,border:"2px solid rgba(0,0,0,0.3)",borderTopColor:"#000",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              : <Icon.Send size={15} color={input.trim()?"#000":C.muted3}/>
            }
          </button>
        </div>
      </div>
    </div>
  );
}


function ActionButtons({ onRaid, onFriends }) {
  const [rH,setRH]=useState(false);
  const [fH,setFH]=useState(false);
  const btnBase = {
    position:"relative", overflow:"hidden",
    borderRadius:16, padding:"22px 14px 20px",
    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10,
    cursor:"pointer", textAlign:"center",
    transition:"all 0.22s cubic-bezier(0.22,1,0.36,1)",
  };
  return (
    <div className="action-buttons-grid">
      
      <div
        onClick={onRaid}
        onMouseEnter={()=>setRH(true)}
        onMouseLeave={()=>setRH(false)}
        style={{
          ...btnBase,
          border:`1px solid rgba(168,85,247,${rH?0.65:0.2})`,
          transform: rH ? "translateY(-3px)" : "none",
          boxShadow: rH ? "0 20px 44px rgba(0,0,0,0.55),0 0 36px rgba(168,85,247,0.12)" : "0 1px 0 rgba(255,255,255,0.03)",
          minHeight: 240,
        }}
      >
        <div style={{
          position:"absolute", top:0, left:0, right:0, bottom:0,
          backgroundImage: "url('/assets/action_banners.jpg')",
          backgroundSize: "100% 300%",
          backgroundPosition: "50% 102%", // Bottom row (moved up past 100% to crop top border)
          transform: rH ? "scale(1.26)" : "scale(1.2)",
          transition: "transform 0.5s ease",
          zIndex: 0
        }} />
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:rH?"linear-gradient(to top, rgba(168,85,247,0.3), rgba(0,0,0,0.15))":"linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.2))",zIndex:1,transition:"background 0.3s ease"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(168,85,247,0.7),transparent)",opacity:rH?1:0.35,transition:"opacity 0.2s",zIndex:2}}/>

        <div style={{position:"relative",zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:8}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:2,color:"#fff",lineHeight:1,textShadow:rH?"0 0 20px rgba(168,85,247,0.8)":"0 2px 4px rgba(0,0,0,0.8)",transition:"text-shadow 0.2s"}}>CHALLENGE RAID</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.55rem",color:"#fff",letterSpacing:1,opacity:rH?1:0.7,textShadow:"0 1px 3px rgba(0,0,0,0.8)",background:rH?"rgba(168,85,247,0.4)":"rgba(0,0,0,0.4)",padding:"4px 10px",borderRadius:6,border:`1px solid rgba(168,85,247,${rH?0.6:0.2})`}}>BUCKLE UP · TEAM UP</div>
        </div>
      </div>

      
      <div
        onClick={onFriends}
        onMouseEnter={()=>setFH(true)}
        onMouseLeave={()=>setFH(false)}
        style={{
          ...btnBase,
          border:`1px solid rgba(79,142,247,${fH?0.65:0.2})`,
          transform: fH ? "translateY(-3px)" : "none",
          boxShadow: fH ? "0 20px 44px rgba(0,0,0,0.55),0 0 36px rgba(79,142,247,0.12)" : "0 1px 0 rgba(255,255,255,0.03)",
          minHeight: 240,
        }}
      >
        <div style={{
          position:"absolute", top:0, left:0, right:0, bottom:0,
          backgroundImage: "url('/assets/action_banners.jpg')",
          backgroundSize: "100% 300%",
          backgroundPosition: "50% 53%", // Middle row (moved up)
          transform: fH ? "scale(1.22)" : "scale(1.15)",
          transition: "transform 0.5s ease",
          zIndex: 0
        }} />
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:fH?"linear-gradient(to top, rgba(79,142,247,0.3), rgba(0,0,0,0.15))":"linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.2))",zIndex:1,transition:"background 0.3s ease"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(79,142,247,0.7),transparent)",opacity:fH?1:0.35,transition:"opacity 0.2s",zIndex:2}}/>

        <div style={{position:"relative",zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:8}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:2,color:"#fff",lineHeight:1,textShadow:fH?"0 0 20px rgba(79,142,247,0.8)":"0 2px 4px rgba(0,0,0,0.8)",transition:"text-shadow 0.2s"}}>VS FRIENDS</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.55rem",color:"#fff",letterSpacing:1,opacity:fH?1:0.7,textShadow:"0 1px 3px rgba(0,0,0,0.8)",background:fH?"rgba(79,142,247,0.4)":"rgba(0,0,0,0.4)",padding:"4px 10px",borderRadius:6,border:`1px solid rgba(79,142,247,${fH?0.6:0.2})`}}>PRIVATE LOBBY · LIVE</div>
        </div>
      </div>
    </div>
  );
}



const FooterIcons = {
  Stadium: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <ellipse cx="12" cy="10" rx="9" ry="5"/>
      <path d="M3 10v6c0 2.76 4.03 5 9 5s9-2.24 9-5v-6"/>
      <path d="M8 10v8M16 10v8M12 10v9"/>
    </svg>
  ),
  Mail: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M2 7l10 7 10-7"/>
    </svg>
  ),
  Shield: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z"/>
    </svg>
  ),
  Scroll: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <path d="M14 2v6h6M9 13h6M9 17h4"/>
    </svg>
  ),
  Ball: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a10 10 0 000 20M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10M2 12h20"/>
      <path d="M4.9 6h14.2M4.9 18h14.2"/>
    </svg>
  ),
  ChevRight: () => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6"/>
    </svg>
  ),
  ArrowUpRight: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 17L17 7M17 7H7M17 7v10"/>
    </svg>
  ),
};

function Footer({ navigate }) {
  const [hoveredLink, setHoveredLink] = useState(null);
  const [hoveredSocial, setHoveredSocial] = useState(null);

  const navLinks = [
    { label: "About Us",         path: "/about",   Icon: FooterIcons.Stadium },
    { label: "Contact Us",       path: "/contact", Icon: FooterIcons.Mail    },
    { label: "Privacy Policy",   path: "/privacy", Icon: FooterIcons.Shield  },
    { label: "Terms of Service", path: "/terms",   Icon: FooterIcons.Scroll  },
  ];

  const socials = [
    {
      id: "discord", label: "Discord", href: "https://discord.gg/footbrawls",
      color: "#5865F2", bg: "rgba(88,101,242,0.12)", border: "rgba(88,101,242,0.35)",
      svg: (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>),
    },
    {
      id: "twitter", label: "Twitter / X", href: "https://twitter.com/footbrawls",
      color: "#1DA1F2", bg: "rgba(29,161,242,0.12)", border: "rgba(29,161,242,0.35)",
      svg: (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>),
    },
  ];

  const stats = [
    { val: "9",    label: "Daily\nGames",    color: C.gold  },
    { val: "195+", label: "Nations\nUnited", color: C.blue  },
    { val: "∞",    label: "XP\nDaily",       color: C.green },
  ];

  return (
    <>
      
      <div style={{
        marginTop: "0",
        position: "relative",
        width: "100%",
      }}>
        
        <div style={{
          height: "52px",
          background: "linear-gradient(180deg, rgba(5,8,15,0) 0%, rgba(247,195,68,0.04) 100%)",
          borderTop: "2px solid rgba(247,195,68,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          position: "relative",
          overflow: "hidden",
        }}>
          
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(247,195,68,0.18))", marginLeft: 24 }}/>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            border: "1px solid rgba(247,195,68,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(247,195,68,0.45)" }}/>
          </div>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.56rem", fontWeight: 700,
            color: "rgba(247,195,68,0.32)", letterSpacing: "5px",
            textTransform: "uppercase", whiteSpace: "nowrap",
          }}>FOOTBRAWLS ARENA</span>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            border: "1px solid rgba(247,195,68,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(247,195,68,0.45)" }}/>
          </div>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(247,195,68,0.18), transparent)", marginRight: 24 }}/>
        </div>
      </div>

      
      <footer style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(4,6,12,0.98) 0%, #03050d 100%)",
        borderTop: "1px solid rgba(255,255,255,0.03)",
      }}>
        
        <div style={{ position: "absolute", right: 0, bottom: 0, width: 240, height: 380, zIndex: 0, pointerEvents: "none" }}>
          <div style={{
            position: "absolute", right: -10, bottom: -10, width: 300, height: 320, borderRadius: "50%",
            background: "radial-gradient(ellipse at 60% 80%, rgba(247,195,68,.06) 0%, transparent 65%)",
            filter: "blur(32px)",
          }}/>
          <svg viewBox="0 0 280 440" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ position: "absolute", bottom: 0, right: 0, width: "100%", height: "100%", opacity: .07 }}>
            <ellipse cx="164" cy="46" rx="22" ry="24" fill="#F7C344"/>
            <rect x="156" y="67" width="13" height="15" rx="4" fill="#F7C344"/>
            <path d="M128 84C121 86 114 103 112 126L116 180L154 187L192 178L196 124C194 101 186 85 179 84L164 80L151 79Z" fill="#F7C344"/>
            <path d="M128 91C115 87 97 76 86 63C80 56 78 50 82 46C86 42 92 45 97 51L120 84Z" fill="#F7C344"/>
            <path d="M179 91C192 95 209 105 219 118C225 126 223 134 217 136C211 138 205 132 199 124L183 95Z" fill="#F7C344"/>
            <path d="M120 178C116 199 112 237 110 270L125 271L138 236L145 200Z" fill="#F7C344"/>
            <path d="M108 269C102 270 93 275 89 282C87 288 91 292 99 292L132 289L132 269Z" fill="#F7C344"/>
            <path d="M163 178C169 199 180 235 195 258L209 251L192 223L181 193Z" fill="#F7C344"/>
            <path d="M193 255C205 271 220 286 230 298L240 288L222 275L207 249Z" fill="#F7C344"/>
            <path d="M228 298C223 308 219 317 223 324C227 329 238 329 247 322C255 316 257 308 251 303L241 291Z" fill="#F7C344"/>
            <circle cx="74" cy="318" r="29" fill="none" stroke="#F7C344" strokeWidth="2" opacity=".5"/>
            <line x1="240" y1="272" x2="268" y2="255" stroke="#F7C344" strokeWidth="1.3" opacity=".18" strokeDasharray="4 7"/>
            <line x1="234" y1="285" x2="265" y2="274" stroke="#F7C344" strokeWidth=".9" opacity=".12" strokeDasharray="3 8"/>
          </svg>
        </div>

        
        <div style={{ position: "absolute", left: 0, bottom: 0, width: 240, height: 380, zIndex: 0, pointerEvents: "none" }}>
          <div style={{
            position: "absolute", left: -10, bottom: -10, width: 300, height: 320, borderRadius: "50%",
            background: "radial-gradient(ellipse at 40% 80%, rgba(61,214,140,.06) 0%, transparent 65%)",
            filter: "blur(32px)",
          }}/>
          <svg viewBox="0 0 280 440" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "100%", opacity: .07 }}>
            <ellipse cx="116" cy="116" rx="21" ry="23" fill="#F7C344"/>
            <rect x="111" y="137" width="10" height="15" rx="3" fill="#F7C344"/>
            <path d="M96 150 C96 150 136 140 136 140 C136 140 176 150 176 150 L166 220 L136 225 L106 220 Z" fill="#F7C344"/>
            <path d="M96 155 C70 145 40 135 15 130 C8 128 3 124 5 118 C8 112 17 114 26 118 L86 145 Z" fill="#F7C344"/>
            <path d="M176 155 C202 145 232 135 257 130 C264 128 269 124 267 118 C264 112 255 114 246 118 L186 145 Z" fill="#F7C344"/>
            <ellipse cx="10" cy="125" rx="8" ry="12" fill="#F7C344"/>
            <ellipse cx="262" cy="125" rx="8" ry="12" fill="#F7C344"/>
            <path d="M106 220 C96 245 80 280 70 310 C66 316 68 322 75 324 C82 326 90 320 94 312 L121 240 Z" fill="#F7C344"/>
            <path d="M166 220 C176 245 192 280 202 310 C206 316 204 322 197 324 C190 326 182 320 178 312 L151 240 Z" fill="#F7C344"/>
            <circle cx="136" cy="50" r="24" fill="none" stroke="#F7C344" strokeWidth="2" opacity=".5"/>
            <path d="M136 26C141 34 144 45 136 52C128 45 131 34 136 26Z" fill="#F7C344" opacity=".35"/>
          </svg>
        </div>

        
        <div className="footer-container">

          
          <div className="footer-stats-row">
            {stats.map((s, i) => (
              <div key={i} className="footer-stat-item">
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "2.2rem", letterSpacing: "3px",
                  color: s.color, lineHeight: 1,
                }}>{s.val}</span>
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.58rem", fontWeight: 700,
                  color: "rgba(242,242,244,0.25)",
                  textTransform: "uppercase", letterSpacing: "1.5px",
                  whiteSpace: "pre", textAlign: "center", marginTop: "5px", lineHeight: "1.5",
                }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", marginBottom: "40px" }} />

          
          <div className="footer-main-grid">

            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div
                onClick={() => navigate("/")}
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", width: "fit-content" }}
              >
                <div style={{
                  width: 36, height: 36,
                  background: "linear-gradient(135deg, rgba(247,195,68,0.16) 0%, rgba(247,195,68,0.04) 100%)",
                  border: "1px solid rgba(247,195,68,0.28)",
                  borderRadius: "9px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.gold,
                }}>
                  <FooterIcons.Ball />
                </div>
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "1.6rem", letterSpacing: "3px",
                  background: "linear-gradient(110deg, #ffe680 0%, #F7C344 50%, #e8a800 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>FOOTBRAWLS</span>
              </div>

              <p style={{
                margin: 0,
                color: "rgba(242,242,244,0.3)",
                fontSize: "0.82rem", lineHeight: "1.72",
                fontFamily: "'Syne', sans-serif", maxWidth: "300px",
              }}>
                The ultimate football guild battle simulator. Play daily seeded puzzles, earn XP, and defend your nation's castle in the global arena.
              </p>

              
            </div>

            
            <div>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.6rem", fontWeight: 700,
                letterSpacing: "2.5px", color: "rgba(242,242,244,0.18)",
                textTransform: "uppercase", marginBottom: "14px",
              }}>Arena</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {navLinks.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(link.path)}
                    onMouseEnter={() => setHoveredLink(idx)}
                    onMouseLeave={() => setHoveredLink(null)}
                    style={{
                      background: hoveredLink === idx ? "rgba(247,195,68,0.04)" : "none",
                      border: "1px solid",
                      borderColor: hoveredLink === idx ? "rgba(247,195,68,0.12)" : "transparent",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      display: "flex", alignItems: "center", gap: "10px",
                      cursor: "pointer", textAlign: "left", transition: "all 0.18s",
                    }}
                  >
                    <span style={{
                      color: hoveredLink === idx ? C.gold : "rgba(242,242,244,0.3)",
                      transition: "color 0.18s", display: "flex",
                    }}>
                      <link.Icon />
                    </span>
                    <span style={{
                      fontSize: "0.78rem",
                      fontFamily: "'Space Mono', monospace", fontWeight: 700,
                      color: hoveredLink === idx ? C.gold : "rgba(242,242,244,0.42)",
                      textTransform: "uppercase", letterSpacing: "0.8px",
                      transition: "color 0.18s", flex: 1,
                    }}>{link.label}</span>
                    {hoveredLink === idx && (
                      <span style={{ color: C.gold }}><FooterIcons.ChevRight /></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "20px",
            display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: "10px",
          }}>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.66rem", color: "rgba(242,242,244,0.18)",
              letterSpacing: "0.5px",
            }}>
              © {new Date().getFullYear()} Footbrawls · All rights reserved
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.62rem", color: "rgba(242,242,244,0.14)",
                letterSpacing: "1px", textTransform: "uppercase",
              }}>Made for Champions</span>
              <div style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "4px 10px",
                background: "rgba(61,214,140,0.05)",
                border: "1px solid rgba(61,214,140,0.14)",
                borderRadius: "99px",
              }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.6rem", color: C.green,
                  fontWeight: 700, letterSpacing: "0.5px",
                }}>LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function BottomNav({ active, navigate, onUnavailable }) {
  const [pressed,setPressed]=useState(null);
  const items=[
    {id:"home",    label:"Games",  IconC:Icon.Ball,    route:"/", color: C.gold, glow: C.goldGlow, bgGlow: "rgba(247,195,68,0.1)", bgRadial: "rgba(247,195,68,0.1)"},
    {id:"guild",   label:"Guild",  IconC:Icon.Shield,  route:"/guild", color: C.green, glow: "rgba(61,214,140,0.8)", bgGlow: "rgba(61,214,140,0.1)", bgRadial: "rgba(61,214,140,0.1)"},
    {id:"raids",   label:"Raids",  IconC:Icon.Swords,  route:"/raid", color: C.blue, glow: "rgba(79,142,247,0.8)", bgGlow: "rgba(79,142,247,0.1)", bgRadial: "rgba(79,142,247,0.1)"},
    {id:"ranks",   label:"Ranks",  IconC:Icon.Rank,    route:"/ranks", color: C.red, glow: "rgba(232,64,64,0.8)", bgGlow: "rgba(232,64,64,0.1)", bgRadial: "rgba(232,64,64,0.1)"},
    {id:"profile", label:"Me",     IconC:Icon.Person,  route:"/profile", color: C.gold, glow: C.goldGlow, bgGlow: "rgba(247,195,68,0.1)", bgRadial: "rgba(247,195,68,0.1)"},
  ];
  return (
    <nav style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:200,
      display:"flex",
      background:"rgba(5,8,15,0.97)",
      backdropFilter:"blur(32px) saturate(1.5)",
      borderTop:`1px solid ${C.border}`,
      paddingBottom:"env(safe-area-inset-bottom,0px)",
      boxShadow:"0 -1px 0 rgba(255,255,255,0.04),0 -12px 40px rgba(0,0,0,0.7)",
    }}>
      
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(247,195,68,0.15),rgba(247,195,68,0.3) 50%,rgba(247,195,68,0.15),transparent)"}}/>
      {items.map(item=>{
        const isActive = item.id === active;
        const isPressed = pressed === item.id;
        const NavIcon = item.IconC;
        const currentIconColor = isActive ? item.color : isPressed ? "rgba(242,242,244,0.6)" : "rgba(242,242,244,0.27)";
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
              color:isActive?item.color:isPressed?"rgba(242,242,244,0.65)":"rgba(242,242,244,0.27)",
              position:"relative",transition:"color 0.15s",
              WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
              transform:isPressed?"scale(0.88)":"scale(1)",
            }}
          >
            {isActive && <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:28,height:2,borderRadius:"0 0 4px 4px",background:item.color,boxShadow:`0 0 12px ${item.glow}`}}/>}
            {isActive && <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 25%,${item.bgRadial},transparent 70%)`,pointerEvents:"none"}}/>}
            <div style={{
              position:"relative",width:28,height:28,
              display:"flex",alignItems:"center",justifyContent:"center",
              borderRadius:8,
              background: isActive ? item.bgGlow : "transparent",
              border: isActive ? `1px solid ${item.color}33` : "1px solid transparent",
              transition:"all 0.18s",
            }}>
              <NavIcon size={18} color={currentIconColor}/>
            </div>
            <span style={{letterSpacing:0.4, fontSize: "0.55rem"}}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}


function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",zIndex:300,background:C.bg2,border:`1px solid ${C.border3}`,borderRadius:999,color:C.text,padding:"9px 20px",fontSize:"0.8rem",fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 12px 32px rgba(0,0,0,0.5)",pointerEvents:"none",fontFamily:"'Syne',sans-serif",animation:"fadeUp 0.2s ease"}}>
      {message}
    </div>
  );
}


export default function Home() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const [mockSecs, setMockSecs] = useState(() => {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1));
    return Math.max(0, Math.floor((midnight - now) / 1000));
  });
  const [localUser, setLocalUser] = useState(() => getUser());
  const [guildDoc, setGuildDoc] = useState(null);

  useEffect(() => {
    injectFonts();
    const u = getUser();
    if (!u) { navigate("/onboarding"); return; }
    setLocalUser(u);
    localStorage.removeItem('active_game_session_id');
    localStorage.removeItem('active_game_session_seed');
    localStorage.removeItem('active_vs_friends_session_id');
  }, []);

  useEffect(() => { const t = setInterval(() => setMockSecs(s => Math.max(0,s-1)), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!localUser?.homeCountry) return;
    return onSnapshot(doc(db, "guilds", localUser.homeCountry), snap => {
      if (!snap.exists()) { setGuildDoc(null); return; }
      const d = snap.data();
      setGuildDoc({ name:d.name??null, flag:d.flag??null, memberCount:d.memberCount??0, castleHP:d.castleHP??0, castleHPCap:d.castleHPCap??CASTLE_HP_CAP, guildLevel:d.guildLevel??1 });
    }, () => setGuildDoc(null));
  }, [localUser?.homeCountry]);

  const userIdRef = useRef(localUser?.userId);
  useEffect(() => { userIdRef.current = localUser?.userId; }, [localUser?.userId]);

  useEffect(() => {
    const uid = localUser?.userId;
    if (!uid || uid === "guest") return;
    return onSnapshot(doc(db, "users", uid), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const todayUTC = new Date().toISOString().split("T")[0];
      const dt = new Date();
      const todayLocal = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
      const isToday = d.dailyXPDate === todayUTC || d.dailyXPDate === todayLocal;
      setLocalUser(prev => {
        const fresh = { ...prev, ...d, totalXP:d.totalXP??prev?.totalXP??0, dailyXP:isToday?(d.dailyXP??0):0, dailyXPDate:d.dailyXPDate??null, tier:d.tier??prev?.tier??"lurker" };
        saveUserLocally(fresh);
        return fresh;
      });
    }, () => {});
  }, [localUser?.userId]);

  const nextFixtures = useNextFixtures();
  const worldChat = useWorldChat();

  if (!localUser) return null;

  const user = localUser;
  const country = COUNTRIES?.find(c => c.code === user.homeCountry);
  const guild = {
    name:        guildDoc?.name        || `${country?.name || user.homeCountry} Fan Guild`,
    flag:        guildDoc?.flag        || user.flag || country?.flag || "🏴",
    memberCount: guildDoc?.memberCount ?? 0,
    castleHP:    guildDoc?.castleHP    ?? 0,
    castleHPCap: guildDoc?.castleHPCap ?? CASTLE_HP_CAP,
    guildLevel:  guildDoc?.guildLevel  ?? 1,
  };

  const games     = GAMES.map(g => ({ ...g, done: isDoneToday(g) }));
  const doneCount = games.filter(g => g.done).length;
  const dailyXP   = getDailyXP(user);
  const xpPct     = clampPct(dailyXP, DAILY_XP_CAP);

  const showSoon = useCallback(() => {
    setToast("Coming soon — stay tuned");
    clearTimeout(showSoon._t);
    showSoon._t = setTimeout(() => setToast(""), 2200);
  }, []);

  return (
    <div style={{background:C.bg, color:C.text, minHeight:"100vh", width:"100%", maxWidth:"100vw", fontFamily:"'Syne',sans-serif", display:"flex", flexDirection:"column", overflowX:"hidden", boxSizing:"border-box"}}>
      <GlobalStyles/>
      <StadiumBg/>
      <TopNav user={user} dailyXP={dailyXP} xpPct={xpPct} navigate={navigate}/>

      <div style={{position:"relative", zIndex:1, flex:1, width:"100%", maxWidth:920, margin:"0 auto", boxSizing:"border-box"}}>


        
        <HeroSection user={user} dailyXP={dailyXP} xpPct={xpPct} doneCount={doneCount} gamesTotal={games.length} guild={guild} navigate={navigate}/>

        <div style={{padding:"0 24px 110px", boxSizing:"border-box"}}>

          
          <div style={{marginTop:8}}>
            {nextFixtures.length > 0
              ? nextFixtures.map(f => <div key={f.id} style={{marginBottom:10}}><MatchCard fixture={f} fallbackSecs={mockSecs}/></div>)
              : <MatchCard fixture={null} fallbackSecs={mockSecs}/>
            }
          </div>

          
          <div id="games-section">
            <SectionDivider label="Game Portals" count={`${doneCount}/${games.length} Complete`} color={C.gold}/>
            <div className="home-games-grid">
              {games.map((game, i) => (
                <GamePortalCard
                  key={game.id}
                  game={game}
                  done={game.done}
                  onPlay={() => navigate(game.route)}
                  index={i}
                />
              ))}
            </div>
          </div>

          
          <ActionButtons onRaid={() => navigate("/raid")} onFriends={() => navigate("/vs-friends")}/>

          
          <SectionDivider label="Your Nation" color={C.teal}/>
          <FortressGuildCard guild={guild} navigate={navigate}/>

          
          <SectionDivider label="World Chat" right="ALL NATIONS LIVE" color={C.green}/>
          <WorldChat messages={worldChat} user={user} navigate={navigate}/>

        </div>
      </div>

      <Footer navigate={navigate}/>

      <BottomNav active="home" navigate={navigate} onUnavailable={showSoon}/>
      <Toast message={toast}/>
    </div>
  );
}
