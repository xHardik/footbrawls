import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUser, saveUserLocally } from "../lib/user";
import { COUNTRIES } from "../lib/countries";

const DAILY_XP_CAP  = 200;
const CASTLE_HP_CAP = 10000;

const C = {
  bg:"#060810", bg2:"#0c0f1a",
  surface:"rgba(255,255,255,0.04)", surface2:"rgba(255,255,255,0.07)", surface3:"rgba(255,255,255,0.11)",
  border:"rgba(255,255,255,0.07)", border2:"rgba(255,255,255,0.13)", border3:"rgba(255,255,255,0.2)",
  accent:"#F7C344", accentGlow:"rgba(247,195,68,0.35)", accentDim:"rgba(247,195,68,0.12)",
  red:"#E84040", blue:"#4F8EF7", green:"#3DD68C", teal:"#06B6D4", purple:"#A855F7", orange:"#F97316",
  text:"#F2F2F4", muted:"rgba(242,242,244,0.5)", muted2:"rgba(242,242,244,0.28)", muted3:"rgba(242,242,244,0.15)",
};

const GAMES = [
  { id:"whoAreYa",      icon:"👤", name:"Who Are Ya?",     tag:"Guess",      desc:"Chase the mystery player using country, club, age, and position clues.",        xp:25,  route:"/games/whoareya",      color:C.orange, meta:["Deduction","8 Attempts","Thinky"],              storageKey:"footbrawls_whoareya"        },
  { id:"matchPredictor",icon:"🔮", name:"Match Predictor", tag:"Live Match",  desc:"Call today's result, top scorer, and exact scoreline. Chase the season board.", xp:100, route:"/games/matchpredictor", color:C.accent, meta:["Daily Picks","Season Board","Max XP"],           storageKey:"footbrawls_matchpredictor"  },
  { id:"penaltyNerve",  icon:"⚽", name:"Penalty Nerve",   tag:"Pressure",    desc:"Beat the keeper across five high-stakes penalty kicks.",                         xp:30,  route:"/games/penaltynerve",   color:C.red,    meta:["5 Kicks","Keeper AI","Nerve Test"],              storageKey:"footbrawls_penaltynerve"    },
  { id:"wordle",        icon:"🟩", name:"Player Wordle",   tag:"Word Game",   desc:"Wordle energy, football names. Narrow the attributes and land the player.",      xp:20,  route:"/games/wordle",         color:C.purple, meta:["Quick Round","6 Guesses","Sharable"],           storageKey:"footbrawls_wordle_history"  },
  { id:"higherLower",   icon:"📊", name:"Higher or Lower", tag:"Stats",       desc:"Trust your stat instinct — call who ranks higher before the streak snaps.",      xp:15,  route:"/games/higherlower",    color:C.green,  meta:["Stat Nerd","10 Rounds","High Pressure"],        storageKey:"footbrawls_higherlower"     },
  { id:"transferTrail", icon:"🔗", name:"Transfer Trail",  tag:"Journey",     desc:"Connect two players through shared clubs in the fewest possible hops.",          xp:20,  route:"/games/transfertrail",  color:C.blue,   meta:["Career Trail","Fewest Steps","Mid Difficulty"], storageKey:"footbrawls_transfertrail"   },
];

const BAD_WORDS = ["spam","fuck","shit","ass","bitch","dick","cunt"];
function containsBadWord(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(w => lower.includes(w));
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

function useNextFixture() {
  const [fixture,setFixture]=useState(null);
  useEffect(()=>{
    const q=query(collection(db,"fixtures"),where("isComplete","==",false),orderBy("kickoffAt","asc"),limit(1));
    return onSnapshot(q,snap=>{
      setFixture(snap.empty?null:{id:snap.docs[0].id,...snap.docs[0].data()});
    },(err)=>{ console.error("Fixture query failed:",err); setFixture(null); });
  },[]);
  return fixture;
}

function useWorldChat() {
  const [messages,setMessages]=useState([]);
  useEffect(()=>{
    const q=query(collection(db,"chat"),where("guildCode","==","__world__"),orderBy("timestamp","asc"),limit(40));
    return onSnapshot(q,snap=>{
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
    },()=>setMessages([]));
  },[]);
  return messages;
}

function BgCanvas() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.055) 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
      <div style={{position:"absolute",width:900,height:700,top:-300,left:-180,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(247,195,68,0.28) 0%,rgba(247,195,68,0.1) 35%,transparent 70%)",filter:"blur(90px)",opacity:0.55}}/>
      <div style={{position:"absolute",width:500,height:400,bottom:-100,right:-150,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(232,64,64,0.1) 0%,transparent 70%)",filter:"blur(90px)",opacity:0.55}}/>
      <div style={{position:"fixed",inset:0,opacity:0.03,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",backgroundSize:"256px 256px"}}/>
    </div>
  );
}

function FifaTrophy() {
  return (
    <div style={{position:"relative",width:110,height:160,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",overflow:"visible"}}>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(247,195,68,0.38) 0%,rgba(247,195,68,0.14) 45%,transparent 70%)",filter:"blur(18px)",animation:"trophyGlow 3s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:140,height:140,borderRadius:"50%",border:"1px solid rgba(247,195,68,0.15)",animation:"trophyOrbit1 9s linear infinite",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:-4,left:"50%",marginLeft:-4,width:8,height:8,borderRadius:"50%",background:"rgba(247,195,68,0.7)",boxShadow:"0 0 8px rgba(247,195,68,0.9)"}}/>
      </div>
      <div style={{position:"absolute",width:180,height:180,borderRadius:"50%",border:"1px solid rgba(247,195,68,0.08)",animation:"trophyOrbit2 13s linear infinite reverse",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:-3,left:"50%",marginLeft:-3,width:6,height:6,borderRadius:"50%",background:"rgba(247,195,68,0.5)",boxShadow:"0 0 6px rgba(247,195,68,0.7)"}}/>
      </div>
      <svg viewBox="0 0 100 170" width="95" height="145" style={{animation:"trophyFloat 3.8s ease-in-out infinite",filter:"drop-shadow(0 8px 24px rgba(247,195,68,0.55)) drop-shadow(0 0 6px rgba(247,195,68,0.4))",position:"relative",zIndex:2}} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldMain" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ffe680"/><stop offset="30%" stopColor="#F7C344"/><stop offset="60%" stopColor="#c8860a"/><stop offset="80%" stopColor="#F7C344"/><stop offset="100%" stopColor="#a86600"/></linearGradient>
          <linearGradient id="goldDark" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#d4a017"/><stop offset="50%" stopColor="#8a5500"/><stop offset="100%" stopColor="#d4a017"/></linearGradient>
          <linearGradient id="goldLight" x1="0%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stopColor="#fff5b0"/><stop offset="40%" stopColor="#F7C344"/><stop offset="100%" stopColor="#b87800"/></linearGradient>
          <linearGradient id="greenBand" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#2d7a3a"/><stop offset="100%" stopColor="#1a4d24"/></linearGradient>
          <radialGradient id="trophyShine" cx="35%" cy="30%"><stop offset="0%" stopColor="rgba(255,255,255,0.6)"/><stop offset="60%" stopColor="rgba(255,255,255,0)"/></radialGradient>
        </defs>
        <ellipse cx="50" cy="155" rx="34" ry="7" fill="url(#goldDark)" opacity="0.5"/>
        <rect x="22" y="148" width="56" height="8" rx="3" fill="url(#goldMain)"/>
        <rect x="20" y="144" width="60" height="5" rx="2.5" fill="url(#goldDark)"/>
        <rect x="22" y="143" width="56" height="3" rx="1.5" fill="url(#greenBand)"/>
        <text x="50" y="153" textAnchor="middle" fontSize="3.5" fill="rgba(100,60,0,0.7)" fontFamily="serif" letterSpacing="1.5">WORLD CUP</text>
        <rect x="26" y="136" width="48" height="8" rx="2" fill="url(#goldMain)"/>
        <rect x="28" y="134" width="44" height="4" rx="2" fill="url(#goldLight)"/>
        <path d="M38 134 Q37 120 36 108 L64 108 Q63 120 62 134 Z" fill="url(#goldMain)"/>
        <path d="M44 134 Q43 120 43 108 L47 108 Q47 120 47 134 Z" fill="rgba(255,255,255,0.15)"/>
        <path d="M58 134 Q59 120 60 108 L64 108 Q63 120 62 134 Z" fill="rgba(0,0,0,0.15)"/>
        <ellipse cx="50" cy="107" rx="16" ry="7" fill="url(#goldMain)"/>
        <ellipse cx="50" cy="104" rx="14" ry="5" fill="url(#goldLight)"/>
        <ellipse cx="46" cy="103" rx="5" ry="2.5" fill="rgba(255,255,255,0.25)"/>
        <path d="M40 104 Q38 92 36 78 L64 78 Q62 92 60 104 Z" fill="url(#goldMain)"/>
        <path d="M46 104 Q45 92 44 78 L48 78 Q48 92 48 104 Z" fill="rgba(255,255,255,0.12)"/>
        <path d="M36 78 Q24 72 18 56 Q14 42 20 30 Q28 14 50 10 Q72 14 80 30 Q86 42 82 56 Q76 72 64 78 Z" fill="url(#goldMain)"/>
        <path d="M40 78 Q32 72 28 58 Q24 44 30 32 Q38 18 50 15 Q62 18 70 32 Q76 44 72 58 Q68 72 60 78 Z" fill="url(#goldDark)" opacity="0.5"/>
        <path d="M34 45 Q40 38 50 36 Q60 38 66 45 Q60 55 50 57 Q40 55 34 45 Z" fill="rgba(180,120,0,0.3)"/>
        <path d="M22 42 Q28 35 34 38 Q32 48 26 50 Z" fill="rgba(180,120,0,0.2)"/>
        <path d="M78 42 Q72 35 66 38 Q68 48 74 50 Z" fill="rgba(180,120,0,0.2)"/>
        <path d="M30 30 Q38 22 50 20 Q62 22 70 30 Q65 25 50 23 Q35 25 30 30 Z" fill="rgba(255,230,100,0.2)"/>
        <path d="M20 40 Q24 30 34 24" stroke="rgba(100,60,0,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M80 40 Q76 30 66 24" stroke="rgba(100,60,0,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M18 52 Q20 62 28 68" stroke="rgba(100,60,0,0.25)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M82 52 Q80 62 72 68" stroke="rgba(100,60,0,0.25)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <ellipse cx="40" cy="30" rx="9" ry="7" fill="url(#trophyShine)" opacity="0.7"/>
        <ellipse cx="50" cy="12" rx="14" ry="5" fill="url(#goldLight)"/>
        <ellipse cx="50" cy="11" rx="12" ry="3.5" fill="rgba(255,255,200,0.3)"/>
        <rect x="35" y="76" width="30" height="4" rx="2" fill="url(#greenBand)"/>
      </svg>
      <div style={{position:"absolute",bottom:-8,left:"50%",transform:"translateX(-50%)",width:60,height:10,borderRadius:"50%",background:"rgba(247,195,68,0.2)",filter:"blur(6px)",animation:"trophyGlow 3.8s ease-in-out infinite"}}/>
      <style>{`
        @keyframes trophyFloat { 0%,100%{transform:translateY(0px) rotate(-1deg)} 50%{transform:translateY(-14px) rotate(1deg)} }
        @keyframes trophyGlow  { 0%,100%{opacity:0.7;transform:translateX(-50%) scale(1)} 50%{opacity:1;transform:translateX(-50%) scale(1.15)} }
        @keyframes trophyOrbit1 { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes trophyOrbit2 { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function TopNav({ user, dailyXP, xpPct, navigate }) {
  return (
    <nav style={{position:"sticky",top:0,zIndex:200,width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:58,background:"rgba(6,8,16,0.55)",backdropFilter:"blur(18px) saturate(1.3)",borderBottom:`1px solid ${C.border}`,boxSizing:"border-box"}}>
      <div onClick={()=>navigate("/")} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:3,background:"linear-gradient(110deg,#ffe680 0%,#F7C344 40%,#e8a800 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",cursor:"pointer",flexShrink:0}}>
        FOOTBRAWLS
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:100,border:`1px solid ${C.border2}`,background:C.surface,fontFamily:"'Space Mono',monospace",fontSize:"0.6rem",fontWeight:700,letterSpacing:1,color:C.muted,flexShrink:0}}>
          <div style={{width:36,height:4,borderRadius:99,background:"rgba(255,255,255,0.08)",overflow:"hidden"}}>
            <div style={{width:`${xpPct}%`,height:"100%",background:`linear-gradient(90deg,${C.green},#7fffcc)`,borderRadius:99,transition:"width 0.6s ease"}}/>
          </div>
          <span style={{color:C.accent,fontWeight:800}}>{dailyXP}</span>
          <span style={{color:C.muted2}}>/{DAILY_XP_CAP}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:100,border:`1px solid ${C.border2}`,background:C.surface,fontSize:"0.72rem",fontWeight:700,color:C.text,fontFamily:"'Syne',sans-serif",letterSpacing:0.5,flexShrink:0,maxWidth:120,overflow:"hidden"}}>
          <span style={{flexShrink:0}}>{user.flag||"🏳️"}</span>
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nickname}</span>
        </div>
      </div>
      <style>{`@keyframes fbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.35;transform:scale(0.65)}}@keyframes fbShimmer{0%{left:-130%}100%{left:210%}}`}</style>
    </nav>
  );
}

function SectionHdr({ label, count, right }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,marginTop:32}}>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.6rem",fontWeight:700,letterSpacing:3.5,textTransform:"uppercase",color:C.muted2,whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.border2},transparent)`}}/>
      {(count||right)&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.56rem",color:C.muted3,letterSpacing:1,whiteSpace:"nowrap"}}>{count||right}</span>}
    </div>
  );
}

function GameCard({ game, done, onPlay }) {
  const [hovered,setHovered]=useState(false);
  const ca=game.color;
  return (
    <div onClick={()=>onPlay(game)} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{position:"relative",display:"flex",alignItems:"center",gap:14,color:C.text,background:hovered?`linear-gradient(115deg,${ca}0d,rgba(6,8,16,0.9))`:"rgba(255,255,255,0.035)",border:`1px solid ${hovered?ca+"88":C.border}`,borderRadius:16,padding:"14px 14px",overflow:"hidden",cursor:"pointer",transform:hovered?"translateY(-3px)":"none",boxShadow:hovered?`0 20px 50px rgba(0,0,0,0.55),0 0 0 1px ${ca}44,0 0 32px ${ca}22`:"0 1px 0 rgba(255,255,255,0.04)",transition:"all 0.22s cubic-bezier(0.22,1,0.36,1)"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:hovered?4:3,borderRadius:"0 2px 2px 0",background:`linear-gradient(180deg,${ca},${ca}88)`,opacity:hovered?1:0.4,boxShadow:hovered?`0 0 12px ${ca}88`:"none",transition:"all 0.2s"}}/>
      <div style={{position:"absolute",inset:0,borderRadius:16,background:`radial-gradient(ellipse at 20% 50%,${ca}18,transparent 65%)`,opacity:hovered?1:0,transition:"opacity 0.22s",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,borderRadius:16,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:0,left:"-130%",width:"55%",height:"100%",background:`linear-gradient(105deg,transparent,${ca}12,transparent)`,animation:"fbShimmer 3.5s ease-in-out infinite"}}/>
      </div>
      <div style={{position:"relative",zIndex:2,flexShrink:0,width:50,height:50,display:"flex",alignItems:"center",justifyContent:"center",background:hovered?`${ca}22`:`${ca}10`,border:`1px solid ${hovered?ca+"66":ca+"28"}`,borderRadius:13,fontSize:"1.5rem",transform:hovered?"scale(1.14) rotate(-6deg)":"scale(1)",boxShadow:hovered?`0 0 28px ${ca}66,inset 0 0 12px ${ca}22`:"none",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)"}}>
        <span style={{filter:hovered?`drop-shadow(0 0 6px ${ca}) saturate(1.4)`:"none",transition:"filter 0.22s"}}>{game.icon}</span>
        {done&&<div style={{position:"absolute",inset:0,borderRadius:13,background:"rgba(61,214,140,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",color:C.green,backdropFilter:"blur(2px)"}}>✓</div>}
      </div>
      <div style={{flex:1,minWidth:0,position:"relative",zIndex:2}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1.5,lineHeight:1,textShadow:hovered?`0 0 20px ${ca}88`:"none",transition:"text-shadow 0.22s"}}>{game.name}</div>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.46rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,padding:"3px 8px",borderRadius:4,color:ca,background:`${ca}18`,border:`1px solid ${ca}55`,whiteSpace:"nowrap",flexShrink:0,boxShadow:hovered?`0 0 8px ${ca}44`:"none",transition:"box-shadow 0.22s"}}>{done?"DONE":game.tag}</span>
        </div>
        <p style={{fontSize:"0.74rem",color:C.muted,lineHeight:1.5,marginBottom:7,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{game.desc}</p>
        <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
          {game.meta.map(m=>(
            <span key={m} style={{display:"inline-flex",padding:"2px 7px",borderRadius:4,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",fontSize:"0.52rem",fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:C.muted2,fontFamily:"'Space Mono',monospace"}}>{m}</span>
          ))}
          <span style={{display:"inline-flex",padding:"2px 7px",borderRadius:4,background:`${C.accent}18`,border:`1px solid ${C.accent}55`,fontSize:"0.52rem",fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:C.accent,fontFamily:"'Space Mono',monospace",boxShadow:hovered?`0 0 10px ${C.accent}44`:"none",transition:"box-shadow 0.22s"}}>+{game.xp} XP</span>
        </div>
      </div>
      <div style={{position:"relative",zIndex:2,flexShrink:0,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:hovered?ca:"transparent",border:`1.5px solid ${hovered?ca:ca+"44"}`,borderRadius:8,color:hovered?"#000":ca,fontSize:"0.9rem",fontWeight:700,transform:hovered?"translateX(2px) scale(1.08)":"none",boxShadow:hovered?`0 0 18px ${ca}77`:"none",transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)"}}>→</div>
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
  const name=fixture?`${fixture.homeTeam} vs ${fixture.awayTeam}`:"No match scheduled today";
  const isLive=fixture?.isLive;
  const hasFixture=!!fixture;
  return (
    <div style={{background:"radial-gradient(circle at top right,rgba(247,195,68,0.12),transparent 35%),rgba(255,255,255,0.03)",border:`1px solid ${C.border2}`,borderRadius:18,padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
      <div style={{minWidth:0,flex:1}}>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.58rem",fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:isLive?C.red:hasFixture?C.accent:C.muted2,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
          {isLive&&<div style={{width:6,height:6,borderRadius:"50%",background:C.red,boxShadow:`0 0 8px ${C.red}`,animation:"fbPulse 1.8s ease infinite"}}/>}
          {isLive?"Live Now":hasFixture?"Prediction Lock":"Daily Reset"}
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.25rem",letterSpacing:1,color:C.text,lineHeight:1}}>{name}</div>
        {fixture?.stage&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.54rem",color:C.muted2,marginTop:4,letterSpacing:0.5}}>{fixture.stage}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        {isLive
          ?<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:3,color:C.red,lineHeight:1}}>{fixture.homeScore??0} - {fixture.awayScore??0}</div>
          :<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.85rem",letterSpacing:3,color:hasFixture?C.accent:C.muted2,lineHeight:1}}>{fmtCountdown(secs)}</div>
        }
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.56rem",color:C.muted,letterSpacing:1,marginTop:4}}>{isLive?"live score":hasFixture?"until lock":"until next day"}</div>
      </div>
    </div>
  );
}

function GuildCard({ guild, navigate }) {
  const [hovered,setHovered]=useState(false);
  const hp=guild.castleHP??0, maxHp=guild.castleHPCap??CASTLE_HP_CAP, hpPct=clampPct(hp,maxHp);
  const hpColor=hpPct>=70?C.green:hpPct>=35?C.accent:C.red;
  const hpGlow=hpPct>=70?"rgba(61,214,140,0.35)":hpPct>=35?"rgba(247,195,68,0.35)":"rgba(232,64,64,0.35)";
  const statusLabel=hpPct>=70?"Fortified":hpPct>=35?"Holding":"Under Attack";
  const statusIcon=hpPct>=70?"🛡️":hpPct>=35?"⚔️":"🔥";
  return (
    <div onClick={()=>navigate("/guild")} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{position:"relative",overflow:"hidden",background:hovered?`radial-gradient(ellipse at 10% 50%,rgba(6,182,212,0.09),transparent 60%),rgba(255,255,255,0.04)`:`rgba(255,255,255,0.035)`,border:`1px solid ${hovered?"rgba(6,182,212,0.5)":C.border2}`,borderRadius:18,padding:"18px 16px",cursor:"pointer",transform:hovered?"translateY(-3px)":"none",boxShadow:hovered?"0 20px 50px rgba(0,0,0,0.5),0 0 0 1px rgba(6,182,212,0.2),0 0 30px rgba(6,182,212,0.08)":"0 1px 0 rgba(255,255,255,0.04)",transition:"all 0.22s cubic-bezier(0.22,1,0.36,1)"}}>
      <div style={{position:"absolute",inset:0,overflow:"hidden",borderRadius:18,pointerEvents:"none"}}>
        <div style={{position:"absolute",top:0,left:hovered?"-5%":"-130%",width:"55%",height:"100%",background:"linear-gradient(105deg,transparent,rgba(6,182,212,0.07),transparent)",transition:"left 0.55s ease"}}/>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{position:"relative",flexShrink:0}}>
          <div style={{width:48,height:48,borderRadius:14,background:"rgba(6,182,212,0.08)",border:`1.5px solid ${hovered?"rgba(6,182,212,0.5)":"rgba(6,182,212,0.2)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",transition:"all 0.22s",boxShadow:hovered?"0 0 20px rgba(6,182,212,0.35)":"none",transform:hovered?"scale(1.05)":"scale(1)"}}>{guild.flag}</div>
          <div style={{position:"absolute",bottom:-3,right:-3,width:14,height:14,borderRadius:"50%",background:hpColor,border:`2px solid ${C.bg}`,boxShadow:`0 0 8px ${hpGlow}`}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.25rem",letterSpacing:1.5,lineHeight:1,color:C.text,marginBottom:5,textShadow:hovered?"0 0 20px rgba(6,182,212,0.4)":"none",transition:"text-shadow 0.22s",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{guild.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",color:C.muted2,letterSpacing:0.5}}>👥 {(guild.memberCount||0).toLocaleString()} members</span>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.46rem",fontWeight:700,color:hpColor,background:`${hpColor}14`,border:`1px solid ${hpColor}44`,borderRadius:4,padding:"2px 7px",letterSpacing:0.8,textTransform:"uppercase"}}>{statusIcon} {statusLabel}</span>
          </div>
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,letterSpacing:0.8,padding:"6px 10px",borderRadius:8,color:C.teal,background:hovered?"rgba(6,182,212,0.15)":"rgba(6,182,212,0.07)",border:`1px solid ${hovered?"rgba(6,182,212,0.5)":"rgba(6,182,212,0.2)"}`,textTransform:"uppercase",transition:"all 0.2s",boxShadow:hovered?"0 0 14px rgba(6,182,212,0.3)":"none",flexShrink:0,whiteSpace:"nowrap"}}>ENTER →</div>
      </div>
      <div style={{height:1,background:"linear-gradient(90deg,rgba(6,182,212,0.2),rgba(255,255,255,0.05),transparent)",marginBottom:14}}/>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:"0.75rem"}}>🏰</span>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",fontWeight:700,color:C.muted,letterSpacing:1.5,textTransform:"uppercase"}}>Castle HP</span>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:1,color:hpColor,textShadow:`0 0 12px ${hpGlow}`}}>{hp.toLocaleString()} <span style={{color:C.muted2,fontSize:"0.7rem",fontFamily:"'Space Mono',monospace",letterSpacing:0}}>/ {maxHp.toLocaleString()}</span></span>
        </div>
        <div style={{height:8,borderRadius:99,background:"rgba(255,255,255,0.06)",overflow:"hidden",position:"relative"}}>
          <div style={{width:`${hpPct}%`,height:"100%",borderRadius:99,background:`linear-gradient(90deg,${hpColor}88,${hpColor})`,boxShadow:`0 0 10px ${hpGlow}`,transition:"width 0.9s cubic-bezier(0.22,1,0.36,1)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",animation:"hpBarShimmer 2.5s ease-in-out infinite"}}/>
          </div>
          {[25,50,75].map(p=>(
            <div key={p} style={{position:"absolute",top:0,left:`${p}%`,width:1,height:"100%",background:"rgba(0,0,0,0.4)"}}/>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:5}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.48rem",color:hpColor,fontWeight:700,letterSpacing:0.5}}>{hpPct}% integrity</span>
        </div>
      </div>
      <style>{`@keyframes hpBarShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );
}

function WorldChat({ messages, user, navigate }) {
  const [input,setInput]     = useState("");
  const [sending,setSending] = useState(false);
  const [focused,setFocused] = useState(false);
  const [err,setErr]         = useState("");
  const bottomRef            = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  async function handleSend() {
    const text=input.trim();
    if (!text||sending) return;
    if (containsBadWord(text)) { setErr("Message contains inappropriate content."); setTimeout(()=>setErr(""),2500); return; }
    if (text.length>120) { setErr("Max 120 characters."); setTimeout(()=>setErr(""),2000); return; }
    setSending(true);
    try {
      await addDoc(collection(db,"chat"),{ guildCode:"__world__", userId:user.userId, nickname:user.nickname, flag:user.flag||"🏳️", tier:user.tier||"lurker", text, timestamp:serverTimestamp() });
      setInput("");
    } catch(e) { console.error(e); setErr("Failed to send."); setTimeout(()=>setErr(""),2000); }
    setSending(false);
  }

  function handleKey(e) { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); handleSend(); } }

  const TIER_COLORS={ lurker:"#6b7a99", fan:"#4F8EF7", veteran:"#3DD68C", ultra:"#F7C344", legend:"#A855F7" };

  return (
    <div style={{background:"rgba(255,255,255,0.025)",border:`1px solid ${focused?C.border3:C.border2}`,borderRadius:18,overflow:"hidden",boxShadow:focused?"0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.35)":"0 4px 20px rgba(0,0,0,0.25)",transition:"box-shadow 0.2s,border-color 0.2s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",borderBottom:`1px solid ${C.border}`,background:"linear-gradient(135deg,rgba(61,214,140,0.06),rgba(255,255,255,0.02))"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{position:"relative",width:10,height:10,flexShrink:0}}>
            <div style={{position:"absolute",inset:-3,borderRadius:"50%",background:"rgba(61,214,140,0.25)",animation:"chatRipple 2s ease-out infinite"}}/>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`}}/>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:3,color:C.text}}>WORLD CHAT</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.48rem",color:C.green,letterSpacing:1,padding:"2px 8px",background:"rgba(61,214,140,0.08)",border:"1px solid rgba(61,214,140,0.2)",borderRadius:4,fontWeight:700}}>🟢 LIVE</span>
        </div>
        <button onClick={()=>navigate("/guild")}
          style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",fontWeight:700,letterSpacing:0.8,color:C.teal,background:"rgba(6,182,212,0.07)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:7,padding:"6px 10px",cursor:"pointer",textTransform:"uppercase",transition:"all 0.18s",whiteSpace:"nowrap"}}>
          MY GUILD →
        </button>
      </div>
      <div style={{height:"min(270px,50vh)",overflowY:"auto",padding:"12px 14px",scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.08) transparent",display:"flex",flexDirection:"column",gap:2}}>
        {messages.length===0&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,opacity:0.6}}>
            <div style={{width:48,height:48,borderRadius:14,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem"}}>💬</div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:2,color:C.muted,marginBottom:3}}>NO MESSAGES YET</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",color:C.muted2,letterSpacing:0.5}}>Be the first to start the banter</div>
            </div>
          </div>
        )}
        {messages.map((m,i)=>{
          const isMe=m.userId===user.userId;
          const tierColor=TIER_COLORS[m.tier||"lurker"]||C.muted2;
          const prevSameSender=i>0&&messages[i-1].userId===m.userId;
          return (
            <div key={m.id||i} style={{display:"flex",alignItems:"flex-end",gap:8,flexDirection:isMe?"row-reverse":"row",marginTop:prevSameSender?1:8}}>
              <div style={{width:28,height:28,borderRadius:8,background:isMe?"rgba(61,214,140,0.12)":"rgba(255,255,255,0.06)",border:`1px solid ${isMe?"rgba(61,214,140,0.25)":C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem",flexShrink:0,opacity:prevSameSender?0:1,transition:"opacity 0.1s"}}>{m.flag||"🏳️"}</div>
              <div style={{maxWidth:"72%",display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:3}}>
                {!prevSameSender&&(
                  <div style={{display:"flex",alignItems:"center",gap:5,flexDirection:isMe?"row-reverse":"row"}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",fontWeight:700,color:isMe?C.green:tierColor,letterSpacing:0.5}}>{m.nickname}</span>
                    {m.tier&&m.tier!=="lurker"&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.4rem",fontWeight:700,color:tierColor,background:`${tierColor}18`,border:`1px solid ${tierColor}33`,borderRadius:3,padding:"1px 5px",textTransform:"uppercase",letterSpacing:0.5}}>{m.tier}</span>}
                  </div>
                )}
                <div style={{padding:"8px 12px",borderRadius:isMe?"12px 12px 3px 12px":"12px 12px 12px 3px",background:isMe?"linear-gradient(135deg,rgba(61,214,140,0.18),rgba(61,214,140,0.1))":"rgba(255,255,255,0.06)",border:`1px solid ${isMe?"rgba(61,214,140,0.25)":C.border}`,boxShadow:isMe?"0 2px 12px rgba(61,214,140,0.1)":"0 2px 8px rgba(0,0,0,0.2)"}}>
                  <span style={{fontSize:"0.8rem",color:isMe?"rgba(242,242,244,0.95)":C.muted,lineHeight:1.5,wordBreak:"break-word",display:"block"}}>{m.text}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      {err&&(
        <div style={{padding:"7px 16px",fontFamily:"'Space Mono',monospace",fontSize:"0.54rem",color:C.red,background:"rgba(232,64,64,0.07)",borderTop:`1px solid rgba(232,64,64,0.1)`,display:"flex",alignItems:"center",gap:6}}>
          ⚠ {err}
        </div>
      )}
      <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,background:"rgba(0,0,0,0.18)"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:9,background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",flexShrink:0}}>{user.flag||"🏳️"}</div>
          <div style={{flex:1,position:"relative"}}>
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={()=>setFocused(true)}
              onBlur={()=>setFocused(false)}
              placeholder="Message the world…"
              maxLength={120}
              style={{width:"100%",boxSizing:"border-box",background:focused?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.04)",border:`1px solid ${focused?C.border3:C.border2}`,borderRadius:10,padding:"9px 40px 9px 14px",color:C.text,fontSize:"0.8rem",fontFamily:"'Syne',sans-serif",outline:"none",caretColor:C.green,transition:"all 0.18s"}}
            />
            {input&&<span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontFamily:"'Space Mono',monospace",fontSize:"0.44rem",color:input.length>100?C.red:C.muted3,pointerEvents:"none"}}>{120-input.length}</span>}
          </div>
          <button onClick={handleSend} disabled={!input.trim()||sending}
            style={{width:38,height:38,borderRadius:10,background:input.trim()?C.green:"rgba(255,255,255,0.05)",border:`1px solid ${input.trim()?"rgba(61,214,140,0.6)":C.border}`,color:input.trim()?"#000":C.muted3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",cursor:input.trim()?"pointer":"default",transition:"all 0.18s",flexShrink:0,boxShadow:input.trim()?"0 0 16px rgba(61,214,140,0.4)":"none",transform:input.trim()?"scale(1)":"scale(0.95)"}}>
            {sending?"…":"↑"}
          </button>
        </div>
      </div>
      <style>{`@keyframes chatRipple{0%{transform:scale(1);opacity:0.5}100%{transform:scale(3);opacity:0}}`}</style>
    </div>
  );
}

function RaidBanner({ onPress }) {
  const [hovered,setHovered]=useState(false);
  return (
    <div onClick={onPress} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{position:"relative",overflow:"hidden",background:hovered?"radial-gradient(circle at 30% 50%,rgba(168,85,247,0.22),transparent 55%),rgba(168,85,247,0.06)":"radial-gradient(circle at top right,rgba(168,85,247,0.1),transparent 50%),rgba(255,255,255,0.02)",border:`1px solid ${hovered?"rgba(168,85,247,0.7)":"rgba(168,85,247,0.2)"}`,borderRadius:16,padding:"18px 16px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",transform:hovered?"translateY(-4px)":"none",boxShadow:hovered?"0 24px 60px rgba(0,0,0,0.6),0 0 40px rgba(168,85,247,0.25),0 0 0 1px rgba(168,85,247,0.3)":"0 1px 0 rgba(255,255,255,0.03)",transition:"all 0.2s cubic-bezier(0.22,1,0.36,1)",marginTop:24}}>
      <div style={{position:"absolute",right:14,top:"50%",transform:hovered?"translateY(-50%) scale(1.15) rotate(5deg)":"translateY(-50%) rotate(0deg)",fontSize:72,opacity:hovered?0.12:0.05,pointerEvents:"none",userSelect:"none",transition:"all 0.25s ease",filter:hovered?"drop-shadow(0 0 20px rgba(168,85,247,0.8))":"none"}}>⚔️</div>
      <div style={{position:"absolute",inset:0,overflow:"hidden",borderRadius:16,pointerEvents:"none"}}>
        <div style={{position:"absolute",top:0,left:hovered?"-10%":"-130%",width:"60%",height:"100%",background:"linear-gradient(105deg,transparent,rgba(168,85,247,0.12),transparent)",transition:"left 0.6s ease",pointerEvents:"none"}}/>
      </div>
      {hovered&&<div style={{position:"absolute",inset:0,borderRadius:16,boxShadow:"inset 0 0 30px rgba(168,85,247,0.15)",pointerEvents:"none"}}/>}
      <div style={{width:50,height:50,borderRadius:12,background:hovered?"rgba(168,85,247,0.25)":"rgba(168,85,247,0.1)",border:`1.5px solid ${hovered?"rgba(168,85,247,0.7)":"rgba(168,85,247,0.28)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",flexShrink:0,boxShadow:hovered?"0 0 24px rgba(168,85,247,0.5)":"none",transform:hovered?"scale(1.08) rotate(-4deg)":"none",transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",filter:hovered?"drop-shadow(0 0 8px rgba(168,85,247,0.9))":"none"}}>⚔️</div>
      <div style={{flex:1,minWidth:0,position:"relative",zIndex:2}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",letterSpacing:2,color:C.text,textShadow:hovered?"0 0 24px rgba(168,85,247,0.8)":"none",transition:"text-shadow 0.22s"}}>CHALLENGE RAID</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.48rem",fontWeight:700,letterSpacing:1.5,padding:"3px 9px",borderRadius:4,color:C.purple,background:"rgba(168,85,247,0.15)",border:`1px solid rgba(168,85,247,${hovered?0.7:0.3})`,boxShadow:hovered?"0 0 10px rgba(168,85,247,0.5)":"none",transition:"all 0.2s"}}>STAGE 5</span>
        </div>
        <p style={{fontSize:"0.78rem",color:hovered?C.muted:C.muted2,lineHeight:1.5,fontFamily:"'Syne',sans-serif",margin:0,transition:"color 0.2s"}}>Team up on match day to break curses and swing castle momentum.</p>
      </div>
      <div style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:hovered?"rgba(168,85,247,0.35)":C.surface2,border:`1.5px solid rgba(168,85,247,${hovered?0.8:0.3})`,borderRadius:8,color:C.purple,fontSize:"1rem",fontWeight:700,flexShrink:0,transform:hovered?"translateX(3px) scale(1.1)":"none",boxShadow:hovered?"0 0 16px rgba(168,85,247,0.6)":"none",transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>›</div>
    </div>
  );
}

function BottomNav({ active, navigate, onUnavailable }) {
  const [pressed,setPressed]=useState(null);
  const items=[
    {id:"home",    label:"Games",  icon:"⚽", route:"/"},
    {id:"guild",   label:"Guild",  icon:"🏰", route:"/guild"},
    {id:"raids",   label:"Raids",  icon:"⚔️"},
    {id:"ranks",   label:"Ranks",  icon:"🏆"},
    {id:"profile", label:"Me",     icon:"👤"},
  ];
  return (
    <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,display:"flex",background:"rgba(6,8,16,0.98)",backdropFilter:"blur(24px) saturate(1.6)",borderTop:"1px solid rgba(255,255,255,0.08)",paddingBottom:"env(safe-area-inset-bottom,0px)",boxShadow:"0 -1px 0 rgba(255,255,255,0.05),0 -12px 40px rgba(0,0,0,0.6)"}}>
      {items.map(item=>{
        const isActive=item.id===active;
        const isPressed=pressed===item.id;
        return (
          <button key={item.id} type="button"
            onMouseDown={()=>setPressed(item.id)}
            onMouseUp={()=>setPressed(null)}
            onMouseLeave={()=>setPressed(null)}
            onTouchStart={()=>setPressed(item.id)}
            onTouchEnd={()=>setPressed(null)}
            onClick={()=>item.route?navigate(item.route):onUnavailable()}
            style={{flex:1,minWidth:0,border:"none",background:"transparent",padding:"11px 4px 9px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"0.48rem",fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:isActive?C.accent:isPressed?"rgba(242,242,244,0.7)":"rgba(242,242,244,0.3)",position:"relative",transition:"color 0.15s",WebkitTapHighlightColor:"transparent",touchAction:"manipulation",transform:isPressed?"scale(0.92)":"scale(1)"}}>
            {isActive&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:28,height:2.5,borderRadius:"0 0 3px 3px",background:C.accent,boxShadow:`0 0 12px ${C.accentGlow},0 0 4px ${C.accent}`}}/>}
            {isActive&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 30%,${C.accentDim},transparent 70%)`,pointerEvents:"none"}}/>}
            <div style={{position:"relative",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:isActive?"rgba(247,195,68,0.1)":"transparent",border:isActive?`1px solid rgba(247,195,68,0.2)`:"1px solid transparent",transition:"all 0.18s",fontSize:"1.15rem",lineHeight:1}}>
              <span style={{filter:isActive?`drop-shadow(0 0 4px ${C.accent})`:"none",transition:"filter 0.18s"}}>{item.icon}</span>
            </div>
            <span style={{letterSpacing:0.5}}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{position:"fixed",bottom:84,left:"50%",transform:"translateX(-50%)",zIndex:300,background:C.bg2,border:`1px solid ${C.border3}`,borderRadius:999,color:C.text,padding:"10px 20px",fontSize:"0.82rem",fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 12px 30px rgba(0,0,0,0.4)",pointerEvents:"none",fontFamily:"'Syne',sans-serif",animation:"fadeUp 0.2s ease"}}>
      {message}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

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
    return onSnapshot(doc(db,"guilds",localUser.homeCountry), snap=>{
      if (!snap.exists()) { setGuildDoc(null); return; }
      const d=snap.data();
      setGuildDoc({ name:d.name??null, flag:d.flag??null, memberCount:d.memberCount??0, castleHP:d.castleHP??0, castleHPCap:d.castleHPCap??CASTLE_HP_CAP });
    },()=>setGuildDoc(null));
  },[localUser?.homeCountry]);

  const userIdRef = useRef(localUser?.userId);
  useEffect(()=>{ userIdRef.current = localUser?.userId; }, [localUser?.userId]);
  useEffect(()=>{
    const uid = localUser?.userId;
    if (!uid || uid==="guest") return;
    return onSnapshot(doc(db,"users",uid), snap=>{
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

  const nextFixture = useNextFixture();
  const worldChat   = useWorldChat();

  if (!localUser) return null;

  const user    = localUser;
  const country = COUNTRIES?.find(c=>c.code===user.homeCountry);
  const guild   = {
    name:        guildDoc?.name        || `${country?.name||user.homeCountry} Fan Guild`,
    flag:        guildDoc?.flag        || user.flag || country?.flag || "🏳️",
    memberCount: guildDoc?.memberCount ?? 0,
    castleHP:    guildDoc?.castleHP    ?? 0,
    castleHPCap: guildDoc?.castleHPCap ?? CASTLE_HP_CAP,
  };

  const games     = useMemo(()=>GAMES.map(g=>({...g,done:isDoneToday(g)})),[]);
  const doneCount = games.filter(g=>g.done).length;
  const dailyXP   = getDailyXP(user);
  const xpPct     = clampPct(dailyXP,DAILY_XP_CAP);

  const showSoon=useCallback(()=>{
    setToast("Coming soon — stay tuned 🎮");
    clearTimeout(showSoon._t);
    showSoon._t=setTimeout(()=>setToast(""),2200);
  },[]);

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",width:"100%",maxWidth:"100vw",fontFamily:"'Syne',sans-serif",display:"flex",flexDirection:"column",overflowX:"hidden",boxSizing:"border-box"}}>
      <BgCanvas/>
      <TopNav user={user} dailyXP={dailyXP} xpPct={xpPct} navigate={navigate}/>

<div style={{position:"relative",zIndex:1,flex:1,width:"100%",maxWidth:900,margin:"0 auto",boxSizing:"border-box"}}>

        {/* Hero: text left + 24px, trophy in-flow right */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",paddingTop:28,paddingLeft:24,paddingRight:16}}>
          <div style={{flex:1,minWidth:0}}>
            <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2.6rem,8vw,4.5rem)",lineHeight:0.88,letterSpacing:2,margin:0}}>
              <span style={{display:"block"}}>YOUR</span>
              <span style={{display:"block",WebkitTextStroke:`2px ${C.accent}`,color:"transparent"}}>FOOTBALL</span>
              <span style={{display:"block"}}>HOME</span>
            </h1>
            <p style={{fontFamily:"'Syne',sans-serif",fontSize:"0.9rem",color:C.muted,lineHeight:1.7,margin:"16px 0 0",maxWidth:360}}>
              Six fast football games, one daily ritual. Chase the XP, hold your guild's castle.
            </p>
          </div>
          <FifaTrophy/>
        </div>

        {/* ── STAT BAR ── */}
        <div style={{padding:"0 24px",boxSizing:"border-box",marginBottom:28}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",border:`1px solid ${C.border2}`,borderRadius:16,overflow:"hidden"}}>
            {[
              {num:`${doneCount}/${games.length}`, lbl:"Done"},
              {num:`${dailyXP}/${DAILY_XP_CAP}`,  lbl:"Daily XP"},
              {num:(user.tier||"lurker").toUpperCase(), lbl:"Tier"},
              {num:guild.flag, lbl:guild.name, small:true},
            ].map(({num,lbl,small},i)=>(
              <div key={lbl} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"12px 6px",background:C.surface,borderRight:i<3?`1px solid ${C.border2}`:"none",minWidth:0}}>
                <span style={{fontFamily:small?"'Syne',sans-serif":"'Bebas Neue',sans-serif",fontSize:small?"1.35rem":"1.6rem",letterSpacing:small?0:1,color:C.accent,lineHeight:1}}>{num}</span>
                <span style={{fontSize:"0.5rem",fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:C.muted,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",textAlign:"center"}}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── REST OF CONTENT ── */}
        <div style={{padding:"0 24px 100px",boxSizing:"border-box"}}>
          <MatchCard fixture={nextFixture} fallbackSecs={mockSecs}/>
          <SectionHdr label="Choose Your Challenge" count={`${doneCount}/${games.length} done`}/>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {games.map(game=><GameCard key={game.id} game={game} done={game.done} onPlay={()=>navigate(game.route)}/>)}
          </div>
          <RaidBanner onPress={showSoon}/>
          <SectionHdr label="Your Guild"/>
          <GuildCard guild={guild} navigate={navigate}/>
          <SectionHdr label="World Chat" right={worldChat.length>0?"🟢 LIVE":"🌍 ALL GUILDS"}/>
          <WorldChat messages={worldChat} user={user} navigate={navigate}/>
          <div style={{height:8}}/>
        </div>
      </div>

      <BottomNav active="home" navigate={navigate} onUnavailable={showSoon}/>
      <Toast message={toast}/>
    </div>
  );
}