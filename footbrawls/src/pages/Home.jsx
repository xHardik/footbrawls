import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
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
  { id:"whoAreYa",      icon:"👤", name:"Who Are Ya?",     tag:"Guess",      desc:"Chase the mystery player using country, club, age, and position clues.",        xp:25,  route:"/games/whoareya",      color:C.orange, meta:["Deduction","8 Attempts","Thinky"],             storageKey:"footbrawls_whoareya"        },
  { id:"matchPredictor",icon:"🔮", name:"Match Predictor", tag:"Live Match",  desc:"Call today's result, top scorer, and exact scoreline. Chase the season board.", xp:100, route:"/games/matchpredictor", color:C.accent, meta:["Daily Picks","Season Board","Max XP"],          storageKey:"footbrawls_matchpredictor"  },
  { id:"penaltyNerve",  icon:"⚽", name:"Penalty Nerve",   tag:"Pressure",    desc:"Beat the keeper across five high-stakes penalty kicks.",                         xp:30,  route:"/games/penaltynerve",   color:C.red,    meta:["5 Kicks","Keeper AI","Nerve Test"],             storageKey:"footbrawls_penaltynerve"    },
  { id:"wordle",        icon:"🟩", name:"Player Wordle",   tag:"Word Game",   desc:"Wordle energy, football names. Narrow the attributes and land the player.",      xp:20,  route:"/games/wordle",         color:C.purple, meta:["Quick Round","6 Guesses","Sharable"],          storageKey:"footbrawls_wordle_history"  },
  { id:"higherLower",   icon:"📊", name:"Higher or Lower", tag:"Stats",       desc:"Trust your stat instinct — call who ranks higher before the streak snaps.",      xp:15,  route:"/games/higherlower",    color:C.green,  meta:["Stat Nerd","10 Rounds","High Pressure"],       storageKey:"footbrawls_higherlower"     },
  { id:"transferTrail", icon:"🔗", name:"Transfer Trail",  tag:"Journey",     desc:"Connect two players through shared clubs in the fewest possible hops.",          xp:20,  route:"/games/transfertrail",  color:C.blue,   meta:["Career Trail","Fewest Steps","Mid Difficulty"],storageKey:"footbrawls_transfertrail"   },
];

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const l = document.createElement("link"); l.id="fb-fonts"; l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

function getTodayKey() {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isDoneToday(game) {
  try {
    const raw=localStorage.getItem(game.storageKey); if (!raw) return false;
    const data=JSON.parse(raw); const today=getTodayKey();
    return data.date===today||Boolean(data[today]);
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
    const q=query(collection(db,"fixtures"),where("kickoffAt",">=",new Date()),where("isComplete","==",false),orderBy("kickoffAt","asc"),limit(1));
    return onSnapshot(q,snap=>{ setFixture(snap.empty?null:{id:snap.docs[0].id,...snap.docs[0].data()}); },()=>setFixture(null));
  },[]);
  return fixture;
}

function useGuildActivity(guildCode) {
  const [feed,setFeed]=useState([]);
  useEffect(()=>{
    if (!guildCode) return;
    const q=query(collection(db,"activity"),where("guildCode","==",guildCode),orderBy("createdAt","desc"),limit(4));
    return onSnapshot(q,snap=>setFeed(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>setFeed([]));
  },[guildCode]);
  return feed;
}

const STATIC_FEED=[
  {icon:"⚽",user:"Priya_10", action:"held nerve from the spot",      time:"2m"},
  {icon:"👤",user:"Arjun_CF", action:"solved Who Are Ya in 2",         time:"5m"},
  {icon:"🔮",user:"Vikram_7", action:"locked the exact scoreline",     time:"11m"},
  {icon:"🔗",user:"Sneha_11", action:"Transfer Trail done in 3 hops",  time:"18m"},
];

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

function TopNav({ user, xpPct, dailyXP, navigate }) {
  return (
    <nav style={{position:"sticky",top:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:60,background:"rgba(6,8,16,0.5)",backdropFilter:"blur(16px) saturate(1.3)",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.7rem",letterSpacing:3,background:"linear-gradient(110deg,#ffe680 0%,#F7C344 40%,#e8a800 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",cursor:"pointer"}} onClick={()=>navigate("/")}>
        FOOTBRAWLS
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:100,background:"rgba(61,214,140,0.1)",border:"1px solid rgba(61,214,140,0.3)",fontSize:"0.65rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:C.green,fontFamily:"'Space Mono',monospace"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`,animation:"fbPulse 1.8s ease infinite"}}/>
          Daily Live
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:100,border:`1px solid ${C.border2}`,background:C.surface,fontFamily:"'Space Mono',monospace",fontSize:"0.65rem",fontWeight:700,letterSpacing:1,color:C.muted}}>
          <div style={{width:48,height:4,borderRadius:99,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
            <div style={{width:`${xpPct}%`,height:"100%",background:`linear-gradient(90deg,${C.green},#7fffcc)`,borderRadius:99,transition:"width 0.6s ease"}}/>
          </div>
          <span style={{color:C.text}}>{dailyXP}</span>/{DAILY_XP_CAP} XP
        </div>
        <div style={{padding:"6px 14px",borderRadius:100,border:`1px solid ${C.border2}`,background:C.surface,fontSize:"0.74rem",fontWeight:700,color:C.text,fontFamily:"'Syne',sans-serif",letterSpacing:0.5}}>
          {user.flag||"🏳️"} {user.nickname}
        </div>
      </div>
      <style>{`@keyframes fbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.35;transform:scale(0.65)}}@keyframes fbShimmer{0%{left:-130%}100%{left:210%}}`}</style>
    </nav>
  );
}

function SectionHdr({ label, count, right }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,marginTop:24}}>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.62rem",fontWeight:700,letterSpacing:3.5,textTransform:"uppercase",color:C.muted2,whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${C.border2},transparent)`}}/>
      {(count||right)&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.58rem",color:C.muted3,letterSpacing:1}}>{count||right}</span>}
    </div>
  );
}

function GameCard({ game, done, onPlay }) {
  const [hovered,setHovered]=useState(false);
  const ca=game.color;
  return (
    <div
      onClick={()=>onPlay(game)}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{
        position:"relative",display:"flex",alignItems:"center",gap:16,
        color:C.text,background:C.surface,
        border:`1px solid ${hovered?`color-mix(in srgb,${ca} 40%,transparent)`:C.border}`,
        borderRadius:16,padding:"16px 18px",overflow:"hidden",cursor:"pointer",
        transform:hovered?"translateX(4px) translateY(-2px)":"none",
        boxShadow:hovered?`0 14px 40px rgba(0,0,0,0.45),0 0 0 1px ${ca}28`:"none",
        transition:"all 0.28s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div style={{position:"absolute",left:0,top:hovered?"0%":"10%",bottom:hovered?"0%":"10%",width:3,borderRadius:hovered?"0":"0 3px 3px 0",background:ca,opacity:hovered?1:0.55,transition:"all 0.25s"}}/>
      <div style={{position:"absolute",inset:0,borderRadius:16,background:`linear-gradient(110deg,${ca}10,transparent 60%)`,opacity:hovered?1:0,transition:"opacity 0.28s",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,borderRadius:16,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:0,left:"-130%",width:"65%",height:"100%",background:"linear-gradient(105deg,transparent,rgba(255,255,255,0.045),transparent)",animation:"fbShimmer 4s ease-in-out infinite"}}/>
      </div>
      <div style={{
        position:"relative",zIndex:2,flexShrink:0,width:54,height:54,display:"flex",alignItems:"center",justifyContent:"center",
        background:`${ca}14`,border:`1px solid ${ca}38`,borderRadius:14,fontSize:"1.6rem",
        transform:hovered?"scale(1.12) rotate(-5deg)":"scale(1)",
        boxShadow:hovered?`0 0 22px ${ca}40`:"none",
        transition:"all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {game.icon}
        {done&&<div style={{position:"absolute",inset:0,borderRadius:14,background:"rgba(61,214,140,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",color:C.green}}>✓</div>}
      </div>
      <div style={{flex:1,minWidth:0,position:"relative",zIndex:2}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:4}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:1.5,lineHeight:1}}>{game.name}</div>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,padding:"2px 9px",borderRadius:100,color:ca,background:`${ca}14`,border:`1px solid ${ca}44`,whiteSpace:"nowrap",flexShrink:0}}>{done?"DONE":game.tag}</span>
        </div>
        <p style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.45,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:8}}>{game.desc}</p>
        <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
          {game.meta.map(m=>(
            <span key={m} style={{display:"inline-flex",padding:"4px 8px",borderRadius:999,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",fontSize:"0.6rem",fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:C.muted,fontFamily:"'Space Mono',monospace"}}>{m}</span>
          ))}
          <span style={{display:"inline-flex",padding:"4px 8px",borderRadius:999,background:`${C.accent}14`,border:`1px solid ${C.accent}44`,fontSize:"0.6rem",fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:C.accent,fontFamily:"'Space Mono',monospace"}}>+{game.xp} XP</span>
        </div>
      </div>
      <div style={{
        position:"relative",zIndex:2,flexShrink:0,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",
        background:hovered?ca:C.surface2,border:`1px solid ${hovered?ca:C.border2}`,borderRadius:"50%",
        color:hovered?"#000":ca,fontSize:"1rem",
        transform:hovered?"translateX(4px) scale(1.12)":"none",
        transition:"all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}>→</div>
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
    <div style={{background:"radial-gradient(circle at top right,rgba(247,195,68,0.12),transparent 35%),rgba(255,255,255,0.03)",border:`1px solid ${C.border2}`,borderRadius:16,padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
      <div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.6rem",fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:isLive?C.red:hasFixture?C.accent:C.muted2,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
          {isLive&&<div style={{width:6,height:6,borderRadius:"50%",background:C.red,boxShadow:`0 0 8px ${C.red}`,animation:"fbPulse 1.8s ease infinite"}}/>}
          {isLive?"Live Now":hasFixture?"Prediction Lock":"Daily Reset"}
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:C.text,lineHeight:1}}>{name}</div>
      </div>
      <div style={{textAlign:"right"}}>
        {isLive
          ?<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:3,color:C.red,lineHeight:1}}>{fixture.homeScore??0} - {fixture.awayScore??0}</div>
          :<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",letterSpacing:3,color:hasFixture?C.accent:C.muted2,lineHeight:1}}>{fmtCountdown(secs)}</div>
        }
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.58rem",color:C.muted,letterSpacing:1,marginTop:4}}>{isLive?"live score":hasFixture?"until lock":"until next day"}</div>
      </div>
    </div>
  );
}

function GuildCard({ guild, navigate }) {
  const [hovered,setHovered]=useState(false);
  const hp=guild.castleHP??0, maxHp=guild.castleHPCap??CASTLE_HP_CAP, hpPct=clampPct(hp,maxHp);
  const hpColor=hpPct>=70?C.green:hpPct>=35?C.accent:C.red;
  return (
    <div onClick={()=>navigate("/guild")} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{background:C.surface,border:`1px solid ${hovered?C.border3:C.border2}`,borderRadius:16,padding:"16px 18px",cursor:"pointer",transform:hovered?"translateY(-2px)":"none",transition:"all 0.22s"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{width:42,height:32,borderRadius:8,background:C.surface2,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",flexShrink:0}}>{guild.flag}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.15rem",letterSpacing:1,lineHeight:1,color:C.text}}>{guild.name}</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.58rem",color:C.muted,letterSpacing:1,marginTop:3}}>{(guild.memberCount||0).toLocaleString()} MEMBERS</div>
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.58rem",fontWeight:700,letterSpacing:1,padding:"4px 10px",borderRadius:100,color:C.teal,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.25)"}}>VIEW GUILD</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.58rem",color:C.muted,letterSpacing:1,textTransform:"uppercase"}}>Castle HP</span>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.9rem",letterSpacing:1,color:hpColor}}>{hp.toLocaleString()} / {maxHp.toLocaleString()}</span>
      </div>
      <div style={{height:5,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
        <div style={{width:`${hpPct}%`,height:"100%",borderRadius:99,background:hpColor,transition:"width 0.8s ease"}}/>
      </div>
    </div>
  );
}

function ActivityFeed({ feed }) {
  const items=feed.length>0?feed:STATIC_FEED;
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
      {items.map((item,i)=>(
        <div key={item.id||`${item.user}-${i}`} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<items.length-1?`1px solid ${C.border}`:"none"}}>
          <div style={{width:30,height:30,borderRadius:8,background:C.surface2,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem",flexShrink:0}}>{item.icon||"⚽"}</div>
          <div style={{flex:1,minWidth:0,fontSize:"0.8rem",color:C.muted,lineHeight:1.3,fontFamily:"'Syne',sans-serif"}}>
            <strong style={{color:C.green}}>{item.user||item.nickname}</strong>{" "}{item.action}
          </div>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.58rem",color:C.muted2,flexShrink:0,letterSpacing:0.5}}>{item.time||""}</span>
        </div>
      ))}
      {feed.length===0&&<div style={{padding:"8px 14px 10px",fontSize:"0.6rem",color:C.muted3,fontFamily:"'Space Mono',monospace",letterSpacing:1,textAlign:"center"}}>No guild activity yet — sample shown above. Activity populates as members play.</div>}
    </div>
  );
}

function RaidBanner({ onPress }) {
  const [hovered,setHovered]=useState(false);
  return (
    <div onClick={onPress} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{position:"relative",overflow:"hidden",background:"radial-gradient(circle at top right,rgba(168,85,247,0.14),transparent 40%),rgba(255,255,255,0.025)",border:`1px solid ${hovered?"rgba(168,85,247,0.4)":"rgba(168,85,247,0.22)"}`,borderRadius:16,padding:"18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",transform:hovered?"translateY(-2px)":"none",boxShadow:hovered?"0 14px 40px rgba(0,0,0,0.4)":"none",transition:"all 0.25s ease"}}>
      <div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:60,opacity:0.06,pointerEvents:"none",userSelect:"none"}}>⚔️</div>
      <div style={{width:52,height:52,borderRadius:14,background:"rgba(168,85,247,0.14)",border:"1px solid rgba(168,85,247,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",flexShrink:0}}>⚔️</div>
      <div style={{flex:1,minWidth:0,position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.35rem",letterSpacing:1.5,color:C.text}}>CHALLENGE RAID</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",fontWeight:700,letterSpacing:1.5,padding:"2px 9px",borderRadius:100,color:C.accent,background:`${C.accent}14`,border:`1px solid ${C.accent}44`}}>STAGE 5</span>
        </div>
        <p style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.45,fontFamily:"'Syne',sans-serif",margin:0}}>Team up on match day to break curses and swing castle momentum.</p>
      </div>
      <div style={{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",background:hovered?"rgba(168,85,247,0.25)":C.surface2,border:"1px solid rgba(168,85,247,0.3)",borderRadius:"50%",color:C.purple,fontSize:"1.2rem",flexShrink:0,transition:"all 0.22s"}}>›</div>
    </div>
  );
}

function BottomNav({ active, navigate, onUnavailable }) {
  const items=[
    {id:"home",   label:"Games",  icon:"⚽",route:"/"},
    {id:"guild",  label:"Guild",  icon:"🏰",route:"/guild"},
    {id:"raids",  label:"Raids",  icon:"⚔️"},
    {id:"ranks",  label:"Ranks",  icon:"🏆"},
    {id:"profile",label:"Me",     icon:"👤"},
  ];
  return (
    <nav style={{position:"sticky",bottom:0,zIndex:200,display:"flex",background:"rgba(6,8,16,0.9)",backdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
      {items.map(item=>{
        const isActive=item.id===active;
        return (
          <button key={item.id} type="button" onClick={()=>item.route?navigate(item.route):onUnavailable()}
            style={{flex:1,minWidth:0,border:"none",background:"transparent",padding:"10px 4px 9px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:"0.52rem",fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:isActive?C.accent:C.muted2,position:"relative",transition:"color 0.15s",WebkitTapHighlightColor:"transparent"}}>
            {isActive&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:2,borderRadius:"0 0 99px 99px",background:C.accent,boxShadow:`0 0 8px ${C.accentGlow}`}}/>}
            <span style={{fontSize:"1.2rem",lineHeight:1}}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div style={{position:"fixed",bottom:76,left:"50%",transform:"translateX(-50%)",zIndex:300,background:C.bg2,border:`1px solid ${C.border3}`,borderRadius:999,color:C.text,padding:"10px 18px",fontSize:"0.82rem",fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 12px 30px rgba(0,0,0,0.4)",pointerEvents:"none",fontFamily:"'Syne',sans-serif"}}>{message}</div>;
}

export default function Home() {
  const navigate=useNavigate();
  const [toast,setToast]=useState("");
  // Real countdown to UTC midnight (when daily puzzles reset)
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
      setGuildDoc({
        name:d.name??null, flag:d.flag??null, memberCount:d.memberCount??0,
        castleHP:d.castleHP??0, castleHPCap:d.castleHPCap??CASTLE_HP_CAP,
      });
    },()=>setGuildDoc(null));
  },[localUser?.homeCountry]);

  useEffect(()=>{
    if (!localUser?.userId) return;
    return onSnapshot(doc(db,"users",localUser.userId), snap=>{
      if (!snap.exists()) return;
      const d=snap.data();
      const today=getTodayKey();
      const updates={
        totalXP:   d.totalXP??localUser.totalXP??0,
        dailyXP:   d.dailyXPDate===today?(d.dailyXP??0):0,
        dailyXPDate:d.dailyXPDate??null,
        tier:      d.tier??localUser.tier??"lurker",
      };
      const fresh={...localUser,...updates};
      saveUserLocally(fresh);
      setLocalUser(fresh);
    },()=>{});
  },[localUser?.userId]);

  const nextFixture=useNextFixture();
  const activityFeed=useGuildActivity(localUser?.homeCountry);

  if (!localUser) return null;

  const user=localUser;
  const country=COUNTRIES?.find(c=>c.code===user.homeCountry);
  const guild={
    name:guildDoc?.name||`${country?.name||user.homeCountry} Fan Guild`,
    flag:guildDoc?.flag||user.flag||country?.flag||"🏳️",
    memberCount:guildDoc?.memberCount??0,
    castleHP:guildDoc?.castleHP??0,
    castleHPCap:guildDoc?.castleHPCap??CASTLE_HP_CAP,
  };

  const games=useMemo(()=>GAMES.map(g=>({...g,done:isDoneToday(g)})),[]);
  const doneCount=games.filter(g=>g.done).length;
  const dailyXP=getDailyXP(user);
  const xpPct=clampPct(dailyXP,DAILY_XP_CAP);

  const showSoon=useCallback(()=>{
    setToast("Coming soon — stay tuned 🎮");
    clearTimeout(showSoon._t);
    showSoon._t=setTimeout(()=>setToast(""),2200);
  },[]);

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",width:"100%",fontFamily:"'Syne',sans-serif",display:"flex",flexDirection:"column",overflowX:"hidden"}}>
      <BgCanvas/>
      <TopNav user={user} xpPct={xpPct} dailyXP={dailyXP} navigate={navigate}/>

      <div style={{position:"relative",zIndex:1,flex:1,maxWidth:720,margin:"0 auto",width:"100%",padding:"24px max(16px,4vw) 80px"}}>

        {/* Eyebrow */}
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(247,195,68,0.09)",border:"1px solid rgba(247,195,68,0.25)",color:C.accent,fontSize:"0.68rem",fontWeight:700,letterSpacing:3,textTransform:"uppercase",padding:"5px 14px 5px 10px",borderRadius:100,marginBottom:20,fontFamily:"'Space Mono',monospace"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:"fbPulse 1.8s ease infinite",flexShrink:0}}/>
          Daily Games Active
        </div>

        {/* Hero title */}
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2.6rem,8vw,4.5rem)",lineHeight:0.92,letterSpacing:2,marginBottom:12,marginTop:0,paddingBottom:8}}>
          <span style={{display:"block"}}>YOUR DAILY</span>
          <span style={{display:"block",WebkitTextStroke:`2px ${C.accent}`,color:"transparent",paddingBottom:4}}>FOOTBALL HOME</span>
        </h1>

        <p style={{fontFamily:"'Syne',sans-serif",fontSize:"0.92rem",color:C.muted,lineHeight:1.7,marginBottom:24,marginTop:0}}>
          Six fast football games, one daily ritual. Chase the XP, hold your guild's castle.
        </p>

        {/* Stat bar */}
        <div style={{display:"flex",border:`1px solid ${C.border2}`,borderRadius:14,overflow:"hidden",marginBottom:20}}>
          {[
            {num:`${doneCount}/${games.length}`, lbl:"Today Done"},
            {num:`${dailyXP}/${DAILY_XP_CAP}`,  lbl:"Daily XP"},
            {num:(user.tier||"lurker").toUpperCase(), lbl:"Tier"},
            {num:guild.flag,                    lbl:guild.name, small:true},
          ].map(({num,lbl,small},i)=>(
            <div key={lbl} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"12px 16px",background:C.surface,borderRight:i<3?`1px solid ${C.border2}`:"none",flex:1}}>
              <span style={{fontFamily:small?"'Syne',sans-serif":"'Bebas Neue',sans-serif",fontSize:small?"1.3rem":"1.7rem",letterSpacing:small?0:1,color:C.accent,lineHeight:1}}>{num}</span>
              <span style={{fontSize:"0.58rem",fontWeight:700,letterSpacing:small?0:2,textTransform:"uppercase",color:C.muted,fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",textAlign:"center"}}>{lbl}</span>
            </div>
          ))}
        </div>

        {/* Match countdown */}
        <MatchCard fixture={nextFixture} fallbackSecs={mockSecs}/>

        {/* Games */}
        <SectionHdr label="Choose Your Challenge" count={`${doneCount}/${games.length} done`}/>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {games.map(game=><GameCard key={game.id} game={game} done={game.done} onPlay={()=>navigate(game.route)}/>)}
        </div>

        {/* Guild */}
        <SectionHdr label="Your Guild"/>
        <GuildCard guild={guild} navigate={navigate}/>

        {/* Guild Pulse */}
        <SectionHdr label="Guild Pulse" right={activityFeed.length>0?"LIVE":"SAMPLE"}/>
        <ActivityFeed feed={activityFeed}/>

        {/* Raid */}
        <SectionHdr label="Raid Battles"/>
        <RaidBanner onPress={showSoon}/>
      </div>

      <BottomNav active="home" navigate={navigate} onUnavailable={showSoon}/>
      <Toast message={toast}/>
    </div>
  );
}