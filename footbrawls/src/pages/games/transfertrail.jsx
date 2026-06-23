/**
 * TransferTrail.jsx
 * Show a player's club transfer history — user guesses WHO the player is.
 * 3 players per session, scoring system, streak bonuses.
 * Royal blue theme for FootBrawls.
 *
 * Storage key: footbrawls_transfertrail
 * Props: players (default PLAYERS), userId, onComplete
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getActivePuzzleDate } from "../../lib/dailySeed.js";
import { awardXP } from "../../lib/xpEngine.js";
import { getUser } from "../../lib/user";
import { PLAYERS } from "../../lib/players.js";
import { ClubLogo } from "../../lib/wikiAssets.jsx";

// Initialize Google AdBreak queue safely
const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    console.log("[AdSense H5 Mock] Triggering ad placement:", options.name);
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.type === 'reward') {
        const confirmReward = window.confirm(`[TEST AD] Watch this rewarded ad to unlock hint: ${options.name}?`);
        if (confirmReward) {
          if (options.adViewed) options.adViewed();
        } else {
          if (options.adDismissed) options.adDismissed();
        }
      } else {
        if (options.adViewed) options.adViewed();
      }
      if (options.afterAd) options.afterAd();
      if (options.adBreakDone) options.adBreakDone({ showStatus: "mocked" });
    }, 1000);
  }
};

// ── Config ────────────────────────────────────────────────────────────────────
const PLAYERS_PER_GAME = 3;
const MAX_ATTEMPTS     = 3;
const XP_TABLE         = [5, 10, 10];
const PERFECT_BONUS_XP = 5;
const TOTAL_XP         = 25;

// ── Seeded daily puzzle ───────────────────────────────────────────────────────
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function getDailyPlayers(players, dateStr) {
  const eligible = players.filter(p => Array.isArray(p.clubs) && p.clubs.length >= 2);
  if (eligible.length < PLAYERS_PER_GAME) return eligible.slice(0, PLAYERS_PER_GAME);
  let seed = dateStr.split("-").reduce((a, n) => a * 100 + parseInt(n), 0);
    const sessionSeed = localStorage.getItem('active_game_session_seed');
    if (sessionSeed) {
      seed = parseInt(sessionSeed) + 221;
    }
  const rng  = seededRandom(seed);
  const pool = [...eligible];
  const picked = [];
  while (picked.length < PLAYERS_PER_GAME && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// ── Font injection ────────────────────────────────────────────────────────────
function injectFonts() {
  if (document.getElementById("tt-fonts")) return;
  const l = document.createElement("link");
  l.id = "tt-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900&display=swap";
  document.head.appendChild(l);
}

// ── Design tokens — Royal Blue theme ─────────────────────────────────────────
const T = {
  bg:      "#04080f",
  surface: "rgba(255,255,255,0.035)",
  surf2:   "rgba(255,255,255,0.06)",
  border:  "rgba(20,80,200,0.2)",
  border2: "rgba(20,80,200,0.35)",
  royal:   "#1a6fff",
  royalHover: "#3a85ff",
  royalLight: "#7ab8ff",
  gold:    "#f7c344",
  red:     "#e84040",
  green:   "#3dd68c",
  teal:    "#2dd4bf",
  text:    "#f0f0f0",
  muted:   "rgba(240,240,240,0.45)",
  muted2:  "rgba(240,240,240,0.28)",
};

// ── CSS keyframes ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes ttFadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ttShimmer  { from{background-position:0% center} to{background-position:200% center} }
  @keyframes ttBlink    { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes ttSpin     { to{transform:rotate(360deg)} }
  @keyframes ttScorePop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
  @keyframes ttWrong    { 0%,20%,40%,60%,80%{transform:translateX(-6px)} 10%,30%,50%,70%,90%{transform:translateX(6px)} 100%{transform:translateX(0)} }
  @keyframes ttDropDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ttPulse    { 0%,100%{filter:drop-shadow(0 0 18px rgba(26,111,255,0.4))} 50%{filter:drop-shadow(0 0 38px rgba(26,111,255,0.75))} }
`;

// ── Background ────────────────────────────────────────────────────────────────
function BgLayers() {
  return (
    <>
      <div style={{
        position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
        background:`
          radial-gradient(ellipse 70% 50% at 15% 0%,  rgba(16,80,200,0.18)  0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 90% 105%,rgba(0,60,180,0.14)   0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 50%, rgba(26,111,255,0.05) 0%, transparent 65%),
          ${T.bg}
        `,
      }}/>
      <div style={{
        position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(-45deg,transparent,transparent 48px,rgba(255,255,255,0.006) 48px,rgba(255,255,255,0.006) 49px)",
      }}/>
    </>
  );
}

// ── How to Play Modal ─────────────────────────────────────────────────────────
function RulesModal({ onClose }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:"fixed",inset:0,zIndex:9999,
        background:"rgba(0,0,0,0.82)",backdropFilter:"blur(14px)",
        display:"flex",alignItems:"center",justifyContent:"center",padding:20,
        animation:"ttFadeUp 0.22s ease",
      }}
    >
      <div className="tt-modal-box" style={{
        background:"#0c1020",border:`1px solid ${T.border2}`,
        borderRadius:22,padding:"40px 30px",
        maxWidth:500,width:"100%",maxHeight:"88vh",overflowY:"auto",
        position:"relative",animation:"ttFadeUp 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#1a6fff,#f7c344,#e84040)",borderRadius:"22px 22px 0 0"}}/>

        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.1rem",letterSpacing:2,textAlign:"center",marginBottom:22,color:T.text}}>
          🔄 How to Play
        </h2>

        {[
          ["📋","A player's club transfer history is shown — teams they played for over their career."],
          ["🔍","Search and select the player's name from the dropdown list."],
          ["✅","Submit your guess — you get 3 attempts per player!"],
          ["🔥","Get all 3 correct for streak bonuses and the maximum score!"],
          ["⏭️","Skip if you're stuck — but you'll lose your current streak."],
          ["🏆","3 players per puzzle — a new puzzle drops every day!"],
        ].map(([icon, text]) => (
          <div key={text} style={{
            background:T.surface,border:`1px solid ${T.border}`,
            borderLeft:`3px solid rgba(26,111,255,0.45)`,
            borderRadius:10,padding:"11px 14px",marginBottom:8,
            fontSize:"0.85rem",lineHeight:1.6,color:T.muted,
          }}>
            <span style={{marginRight:8}}>{icon}</span>{text}
          </div>
        ))}

        {!isRaid && (
          <div style={{background:"rgba(26,111,255,0.05)",border:`1px solid ${T.border2}`,borderRadius:14,padding:18,margin:"18px 0 20px"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:1,color:T.royal,marginBottom:12,textAlign:"center"}}>
              🌟 XP REWARDS — MAX 30 XP
            </div>
            {[
              ["1st Correct Guess",        "+5 XP"],
              ["2nd Correct (Streak)",     "+10 XP"],
              ["3rd Correct (Streak)",     "+10 XP"],
              ["Perfect Completion (3/3)", "+5 XP"],
            ].map(([label, val]) => (
              <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:"0.82rem",borderBottom:`1px solid ${T.border}`,color:T.muted}}>
                <span>{label}</span>
                <span style={{color:T.royal,fontWeight:700}}>{val}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width:"100%",padding:"13px",background:T.royal,border:"none",
            borderRadius:12,color:"#fff",fontFamily:"'DM Sans',sans-serif",
            fontSize:"0.9rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1,
            cursor:"pointer",boxShadow:"0 6px 20px rgba(26,111,255,0.3)",transition:"all 0.22s",
          }}
          onMouseEnter={e=>e.currentTarget.style.background=T.royalHover}
          onMouseLeave={e=>e.currentTarget.style.background=T.royal}
        >
          🚀 Start Playing
        </button>
      </div>
    </div>
  );
}

// ── Transfer History List ─────────────────────────────────────────────────────
function TransferHistory({ clubs }) {
  return (
    <div style={{
      background:T.surface,border:`1px solid ${T.border}`,
      borderRadius:14,padding:20,
      maxHeight:400,overflowY:"auto",
    }}>
      <div style={{
        fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.95rem",letterSpacing:2,
        color:T.royal,marginBottom:16,display:"flex",alignItems:"center",gap:8,
      }}>
        <span>📋</span> Transfer History
      </div>

      {clubs.map((entry, i) => {
        const clubName = typeof entry === "string" ? entry : entry.club;
        const years    = typeof entry === "object" && entry.years ? entry.years : null;
        const cleanClubName = clubName.replace(/\s*\(loan\)\s*/i, "").trim();
        return (
          <div
            key={i}
            style={{
              display:"flex",alignItems:"center",gap:12,
              background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,
              borderLeft:`3px solid rgba(26,111,255,0.35)`,
              borderRadius:10,padding:"10px 14px",marginBottom:8,
              transition:"border-color 0.2s,transform 0.2s,background 0.2s",
              animation:`ttFadeUp 0.35s ease ${i * 0.06}s both`,
              cursor:"default",
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.borderLeftColor=T.royal;
              e.currentTarget.style.background="rgba(26,111,255,0.07)";
              e.currentTarget.style.transform="translateX(4px)";
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.borderLeftColor="rgba(26,111,255,0.35)";
              e.currentTarget.style.background="rgba(255,255,255,0.04)";
              e.currentTarget.style.transform="translateX(0)";
            }}
          >
            <ClubLogo club={cleanClubName} size={30} style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }} />
            <div style={{ flex:1, minWidth:0 }}>
              {years && (
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.95rem",letterSpacing:1,color:T.gold,marginBottom:2}}>
                  {years}
                </div>
              )}
              <div style={{fontSize:"0.88rem",color:T.text,fontWeight:500,wordBreak:"break-word"}}>{clubName}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Search Dropdown ───────────────────────────────────────────────────────────
function SearchDropdown({ players, onSelect, disabled }) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(null);
  const inputRef              = useRef(null);
  const dropRef               = useRef(null);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    return players
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [query, players]);

  useEffect(() => {
    setOpen(results.length > 0 && focused);
  }, [results, focused]);

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pick(player) {
    onSelect(player);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={dropRef} style={{position:"relative",width:"100%"}}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="🔍 Type player name..."
        disabled={disabled}
        style={{
          width:"100%",boxSizing:"border-box",
          padding:"13px 16px",
          fontFamily:"'DM Sans',sans-serif",fontSize:"0.92rem",
          background:focused ? T.surf2 : T.surface,
          border:`1px solid ${focused ? T.royal : T.border2}`,
          borderRadius:14,color:T.text,outline:"none",
          boxShadow:focused?"0 0 0 3px rgba(26,111,255,0.14)":"none",
          transition:"all 0.2s",
          opacity:disabled?0.5:1,
          cursor:disabled?"not-allowed":"text",
        }}
      />

      {open && (
        <div style={{
          position:"absolute",top:"calc(100% + 6px)",left:0,right:0,
          background:"#0b0e1a",
          border:`1px solid rgba(26,111,255,0.4)`,
          borderRadius:14,
          boxShadow:"0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(26,111,255,0.12)",
          zIndex:999,maxHeight:240,overflowY:"auto",
          animation:"ttDropDown 0.18s ease",
        }}>
          {results.map(p => (
            <div
              key={p.name}
              onMouseDown={() => pick(p)}
              onMouseEnter={() => setHovered(p.name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding:"11px 14px",cursor:"pointer",
                color:T.text,fontSize:"0.88rem",
                borderBottom:`1px solid rgba(255,255,255,0.05)`,
                background:hovered===p.name?"#131b36":"#0b0e1a",
                paddingLeft:hovered===p.name?20:14,
                transition:"all 0.14s",
                display:"flex",alignItems:"center",gap:10,
              }}
            >
              <span style={{fontSize:"1.1rem"}}>{p.flag || "🏳️"}</span>
              <div>
                <div style={{fontWeight:700}}>{p.name}</div>
                <div style={{fontSize:"0.68rem",color:T.muted2}}>{p.position} · {p.country || p.nationality}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Feedback banner ───────────────────────────────────────────────────────────
function Feedback({ state, message }) {
  if (!state) return null;
  const isCorrect = state === "correct";
  return (
    <div style={{
      marginTop:14,padding:"12px 18px",borderRadius:10,
      fontSize:"0.9rem",fontWeight:700,textAlign:"center",
      background:isCorrect?"rgba(61,214,140,0.1)":"rgba(232,64,64,0.1)",
      color:isCorrect?T.green:"#ff8080",
      border:`1px solid ${isCorrect?"rgba(61,214,140,0.35)":"rgba(232,64,64,0.35)"}`,
      animation:isCorrect?"ttFadeUp 0.3s ease":"ttWrong 0.4s ease",
    }}>
      {message}
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────────────────────────
function ResultCard({ xpEarned, correctCount, players: puzzlePlayers, onPlayAgain, isRaid }) {
  const navigate = useNavigate();
  const perfect = correctCount === PLAYERS_PER_GAME;

  return (
    <div className="tt-result-card" style={{
      position:"relative",overflow:"hidden",
      background:perfect?"rgba(61,214,140,0.04)":"rgba(26,111,255,0.04)",
      border:`1px solid ${perfect?"rgba(61,214,140,0.28)":"rgba(26,111,255,0.28)"}`,
      borderRadius:20,padding:"44px 28px",textAlign:"center",
      animation:"ttFadeUp 0.5s ease",
      boxShadow:perfect?"0 8px 40px rgba(61,214,140,0.07)":"0 8px 40px rgba(26,111,255,0.07)",
    }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#1a6fff,#f7c344,#e84040)",borderRadius:"20px 20px 0 0"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,255,255,0.02),transparent 60%)",borderRadius:20,pointerEvents:"none"}}/>

      <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(26,111,255,0.1)",border:`1px solid rgba(26,111,255,0.3)`,color:T.royal,fontSize:"0.68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",padding:"5px 14px",borderRadius:100,marginBottom:14}}>
        Game Complete
      </div>

      <div className="tt-result-title" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.6rem",letterSpacing:2,marginBottom:8,color:T.text}}>
        {perfect ? "FLAWLESS GUESSING!" : "GAME OVER!"}
      </div>

      {!isRaid ? (
        <div className="tt-result-score" style={{
          fontFamily:"'Bebas Neue',sans-serif",fontSize:"4.8rem",letterSpacing:2,lineHeight:1,margin:"10px 0",
          background:`linear-gradient(135deg,${T.royal},${T.royalLight} 60%)`,
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
          animation:"ttPulse 2.5s ease-in-out infinite, ttScorePop 0.5s ease",
        }}>
          +{xpEarned} <span style={{fontSize:"2.4rem",opacity:0.55}}>XP</span>
        </div>
      ) : (
        <div className="tt-result-score" style={{
          fontFamily:"'Bebas Neue',sans-serif",fontSize:"3rem",letterSpacing:2,lineHeight:1,margin:"24px 0",
          background:`linear-gradient(135deg,${T.royal},${T.royalLight} 60%)`,
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
        }}>
          SCORE SUBMITTED
        </div>
      )}

      <div style={{fontSize:"0.92rem",color:T.muted,marginBottom:26,lineHeight:1.6}}>
        {correctCount} of {PLAYERS_PER_GAME} players guessed correctly
        {!isRaid && perfect && " — +5 XP FLAWLESS BONUS!"}
      </div>

      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 18px",marginBottom:22,textAlign:"left"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.88rem",letterSpacing:2,color:T.muted2,marginBottom:12}}>TODAY'S PLAYERS</div>
        {puzzlePlayers.map((p, i) => (
          <div key={p.name} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<puzzlePlayers.length-1?`1px solid ${T.border}`:"none"}}>
            <span style={{fontSize:"1.2rem"}}>{p.flag || "🏳️"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:"0.88rem",color:T.text}}>{p.name}</div>
              <div style={{fontSize:"0.67rem",color:T.muted2}}>{p.position} · {p.nationality}</div>
            </div>
            {!isRaid && (
              <div style={{fontFamily:"monospace",fontSize:"0.65rem",fontWeight:700,padding:"3px 10px",borderRadius:99,background:"rgba(61,214,140,0.1)",color:T.green}}>
                {i === 0 ? "+5" : i === 1 ? "+10" : "+10"} XP
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Play Again button removed to enforce once-per-day play limit */}
      <div style={{ marginTop: 18 }}>
        {isRaid ? (
          <button 
            className="tt-btn" 
            onClick={() => navigate('/raid')}
            style={{
              background: `linear-gradient(135deg, ${T.royal}, ${T.royalLight})`,
              color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12,
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: 1.5,
              cursor: 'pointer', width: '100%'
            }}
          >
            ⚔️ Return to Raid
          </button>
        ) : (
          <button 
            className="tt-btn" 
            onClick={() => navigate('/')}
            style={{
              background: T.surface, border: `1px solid ${T.border}`, color: T.text,
              padding: '12px 24px', borderRadius: 12,
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: 1.5,
              cursor: 'pointer', width: '100%'
            }}
          >
            ← Back to Home
          </button>
        )}
      </div>
    </div>
  );
}

// ── Stats History Loader ──────────────────────────────────────────────────────
function loadHistoryAndStats(storageKey, puzzleDate) {
  try {
    const history = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const allEntries = Object.values(history);
    const bestXP = allEntries.length > 0 ? Math.max(...allEntries.map(e => e.xpEarned ?? e.xpAwarded ?? 0)) : 0;
    const avgXP = allEntries.length > 0 ? Math.round(allEntries.reduce((s, e) => s + (e.xpEarned ?? e.xpAwarded ?? 0), 0) / allEntries.length) : 0;
    
    let dayStreak = 0;
    const check = new Date(puzzleDate + "T00:00:00");
    while (true) {
      const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,"0")}-${String(check.getDate()).padStart(2,"0")}`;
      if (history[k]) {
        dayStreak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return {
      history,
      stats: {
        played: allEntries.length,
        bestScore: bestXP,
        avgScore: avgXP,
        dayStreak
      }
    };
  } catch (e) {
    return {
      history: {},
      stats: { played: 0, bestScore: 0, avgScore: 0, dayStreak: 0 }
    };
  }
}

// ── StreakDots Subcomponent ───────────────────────────────────────────────────
function StreakDots({ history, puzzleDate, gameOver, currentXP, currentSolved }) {
  const today = new Date();
  const dots = [];
  
  for (let i = 29; i >= 0; i--) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,"0")}-${String(checkDate.getDate()).padStart(2,"0")}`;
    const isToday = checkKey === puzzleDate;

    let cls = 'miss';
    let label = '—';
    if (isToday) {
      if (gameOver) {
        const entry = history[checkKey];
        const earned = entry ? (entry.xpEarned ?? entry.xpAwarded ?? 0) : currentXP;
        cls = earned > 0 ? 'win' : 'miss';
        label = String(earned);
      } else {
        cls = 'today-pending';
        label = null;
      }
    } else {
      const entry = history[checkKey];
      if (entry) {
        const earned = entry.xpEarned ?? entry.xpAwarded ?? 0;
        cls = earned > 0 ? 'win' : 'miss';
        label = String(earned);
      } else {
        cls = 'miss';
        label = '—';
      }
    }
    dots.push({ cls, label });
  }

  const last30Dots = dots.slice(-30);

  return (
    <div className="tt-streak-dots">
      {last30Dots.map((dot, i) => (
        <div key={i} className={`tt-streak-dot ${dot.cls}`}>
          {dot.label !== null ? dot.label : ""}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TransferTrail({ players = PLAYERS, userId, onComplete }) {
  const navigate = useNavigate();
  const puzzleDate  = getActivePuzzleDate();
  const storageKey  = "footbrawls_transfertrail";
  const stateKey    = `tt_state_${puzzleDate}`;
  const [historyAndStats, setHistoryAndStats] = useState(() => loadHistoryAndStats(storageKey, puzzleDate));

  const puzzlePlayers = useMemo(() => getDailyPlayers(players, puzzleDate), [players, puzzleDate]);

  const [currentIdx, setCurrentIdx]     = useState(0);
  const [selected, setSelected]         = useState(null);
  const [attempts, setAttempts]         = useState(0);
  const [feedback, setFeedback]         = useState(null);
  const [feedbackMsg, setFeedbackMsg]   = useState("");
  const [xpEarned, setXpEarned]         = useState(0);
  const [streak, setStreak]             = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver]         = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [xpAwarded, setXpAwarded]       = useState(0);
  const [revealed, setRevealed]         = useState({});
  const [unlockedHints, setUnlockedHints] = useState({});
  const [isAdLoading, setIsAdLoading]   = useState(false);
  const [isRaid, setIsRaid]             = useState(false);

  useEffect(() => { injectFonts(); }, []);

  useEffect(() => {
    if (document.getElementById("tt-keyframes")) return;
    const s = document.createElement("style");
    s.id = "tt-keyframes"; s.textContent = KEYFRAMES;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    let raid = !!localStorage.getItem('active_game_session_id');
    setIsRaid(raid);

    if (raid) {
      setCurrentIdx(0);
      setXpEarned(0);
      setStreak(0);
      setCorrectCount(0);
      setGameOver(false);
      setRevealed({});
      setXpAwarded(0);
      setUnlockedHints({});
      return;
    }

    const saved = localStorage.getItem(stateKey);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setCurrentIdx(s.currentIdx ?? 0);
        setXpEarned(s.xpEarned ?? 0);
        setStreak(s.streak ?? 0);
        setCorrectCount(s.correctCount ?? 0);
        setGameOver(s.gameOver ?? false);
        setRevealed(s.revealed ?? {});
        setXpAwarded(s.xpAwarded ?? 0);
        setUnlockedHints(s.unlockedHints ?? {});
      } catch {}
    }
  }, [stateKey]);

  function persist(updates) {
    if (isRaid) return;
    const fullState = {
      currentIdx: updates.currentIdx ?? currentIdx,
      xpEarned: updates.xpEarned ?? xpEarned,
      streak: updates.streak ?? streak,
      correctCount: updates.correctCount ?? correctCount,
      gameOver: updates.gameOver ?? gameOver,
      revealed: updates.revealed ?? revealed,
      xpAwarded: updates.xpAwarded ?? xpAwarded,
      unlockedHints: updates.unlockedHints ?? unlockedHints,
    };
    localStorage.setItem(stateKey, JSON.stringify(fullState));
    if (fullState.gameOver) {
      const hist = JSON.parse(localStorage.getItem(storageKey) || "{}");
      hist[puzzleDate] = { 
        date: puzzleDate, 
        completed: true, 
        xpEarned: fullState.xpEarned, 
        xpAwarded: fullState.xpAwarded,
        score: fullState.correctCount
      };
      localStorage.setItem(storageKey, JSON.stringify(hist));
      setHistoryAndStats(loadHistoryAndStats(storageKey, puzzleDate));
    }
  }

  const currentPlayer = puzzlePlayers[currentIdx];

  function triggerRewardedAdForHint() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: `transfer-trail-hint-p${currentIdx}`,
      beforeAd: () => {
        setIsAdLoading(true);
      },
      afterAd: () => {
        setIsAdLoading(false);
      },
      adDismissed: () => {
        console.log("Ad dismissed. Hint not unlocked.");
      },
      adViewed: () => {
        const updated = { ...unlockedHints, [currentIdx]: true };
        setUnlockedHints(updated);
        persist({
          currentIdx,
          xpEarned,
          streak,
          correctCount,
          gameOver,
          revealed,
          xpAwarded,
          unlockedHints: updated,
        });
      },
      adBreakDone: () => {
        setIsAdLoading(false);
      }
    });
  }

  async function endGame(finalXpVal) {
    let xp = 0;
    const user = getUser();
    const uid  = userId || user?.userId;
    if (uid) {
      const res = await awardXP(uid, "transferTrail_correct", { rawXP: finalXpVal });
      xp = res?.xpAwarded ?? finalXpVal;
    } else {
      xp = finalXpVal;
    }
    if (isRaid) {
      const activeId = localStorage.getItem('active_game_session_id');
      if (activeId) {
        localStorage.setItem(`raid_completed_act1_${activeId}`, 'true');
      }
    }
    setXpAwarded(xp);
    setGameOver(true);
    persist({ 
      currentIdx: currentIdx + 1, 
      xpEarned: finalXpVal, 
      streak: 0, 
      correctCount, 
      gameOver: true, 
      revealed, 
      xpAwarded: xp 
    });
    if (onComplete) onComplete({ gameId: "transferTrail", solved: finalXpVal > 0, xpAwarded: xp });
  }

  async function submitGuess() {
    if (!selected) return;
    const isCorrect = selected.name.toLowerCase() === currentPlayer.name.toLowerCase();
    const newAttempts = attempts + 1;

    if (isCorrect) {
      const xpPoints   = XP_TABLE[streak] ?? 5;
      const newXpEarned = xpEarned + xpPoints;
      const newStreak = streak + 1;
      const newCorrect = correctCount + 1;
      const isLast    = currentIdx === PLAYERS_PER_GAME - 1;
      const newPerfect = isLast && newCorrect === PLAYERS_PER_GAME;
      const finalXp = newPerfect ? newXpEarned + PERFECT_BONUS_XP : newXpEarned;

      setFeedback("correct");
      setFeedbackMsg(isRaid ? `✅ Correct!` : `✅ Correct! +${xpPoints} XP${newPerfect ? ` +${PERFECT_BONUS_XP} XP bonus!` : ""}`);
      setXpEarned(newPerfect ? finalXp : newXpEarned);
      setStreak(newStreak);
      setCorrectCount(newCorrect);

      if (isLast) {
        setTimeout(() => {
          endGame(finalXp);
        }, 1200);
      } else {
        setTimeout(() => {
          setCurrentIdx(i => i + 1);
          setSelected(null);
          setAttempts(0);
          setFeedback(null);
          setFeedbackMsg("");
          persist({ currentIdx: currentIdx + 1, xpEarned: newXpEarned, streak: newStreak, correctCount: newCorrect, gameOver: false, revealed, xpAwarded: 0 });
        }, 1200);
      }
    } else {
      const isLastAttempt = newAttempts >= MAX_ATTEMPTS;
      const isLastPlayer  = currentIdx === PLAYERS_PER_GAME - 1;

      setFeedback("wrong");
      setFeedbackMsg(isLastAttempt ? `❌ It was ${currentPlayer.name}!` : `❌ Wrong! ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? "s" : ""} left`);
      setAttempts(newAttempts);
      setStreak(0);

      if (isLastAttempt) {
        const newRevealed = { ...revealed, [currentPlayer.name]: true };
        setRevealed(newRevealed);
        if (isLastPlayer) {
          setTimeout(() => {
            endGame(xpEarned);
          }, 1500);
        } else {
          setTimeout(() => {
            setCurrentIdx(i => i + 1);
            setSelected(null);
            setAttempts(0);
            setFeedback(null);
            setFeedbackMsg("");
            persist({ currentIdx: currentIdx + 1, xpEarned, streak: 0, correctCount, gameOver: false, revealed: newRevealed, xpAwarded: 0 });
          }, 1500);
        }
      } else {
        setSelected(null);
      }
    }
  }

  function skipPlayer() {
    const newRevealed = { ...revealed, [currentPlayer.name]: true };
    setRevealed(newRevealed);
    setStreak(0);
    const isLast = currentIdx === PLAYERS_PER_GAME - 1;
    if (isLast) {
      endGame(xpEarned);
    } else {
      setFeedback("wrong");
      setFeedbackMsg(`⏭ Skipped — it was ${currentPlayer.name}`);
      setTimeout(() => {
        setCurrentIdx(i => i + 1);
        setSelected(null);
        setAttempts(0);
        setFeedback(null);
        setFeedbackMsg("");
        persist({ currentIdx: currentIdx + 1, xpEarned, streak: 0, correctCount, gameOver: false, revealed: newRevealed, xpAwarded: 0 });
      }, 1400);
    }
  }

  function handlePlayAgain() {
    localStorage.removeItem(stateKey);
    setCurrentIdx(0); setXpEarned(0); setStreak(0); setCorrectCount(0);
    setGameOver(false); setRevealed({}); setSelected(null);
    setAttempts(0); setFeedback(null); setFeedbackMsg(""); setXpAwarded(0);
  }

  if (!puzzlePlayers.length) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,color:T.muted,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:18,height:18,border:`2px solid ${T.royal}`,borderTopColor:"transparent",borderRadius:"50%",animation:"ttSpin 0.8s linear infinite"}}/>
          Loading puzzle…
        </div>
      </div>
    );
  }

  const dateStr = new Date(puzzleDate + "T00:00:00").toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
  const launch  = new Date("2026-01-01T00:00:00");
  const diff    = Math.max(1, Math.floor((new Date(puzzleDate + "T00:00:00") - launch) / 86400000) + 1);
  const clubs   = currentPlayer ? (currentPlayer.clubs || [currentPlayer.club]).filter(Boolean) : [];

  return (
    <div style={{position:"relative",minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans',sans-serif",color:T.text,overflowX:"hidden"}}>
      <BgLayers/>
      {showModal && <RulesModal onClose={() => setShowModal(false)}/>}

      {/* ── NAV ── */}
      <nav className="tt-nav" style={{
        position:"sticky",top:0,zIndex:200,
        display:"grid",gridTemplateColumns:"1fr auto 1fr",
        alignItems:"center",padding:"0 28px",height:60,
        background:"rgba(4,8,15,0.88)",
        backdropFilter:"blur(22px) saturate(1.4)",
        borderBottom:`1px solid rgba(26,111,255,0.25)`,
        boxShadow:"0 10px 30px rgba(26,111,255,0.22)",
      }}>
        {!isRaid && (
          <button
            className="tt-nav-logo"
            onClick={() => navigate("/")}
            style={{
              fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:3,
              background:`linear-gradient(90deg,${T.royal} 0%,${T.royalLight} 50%,${T.royal} 100%)`,
              backgroundSize:"200% auto",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
              animation:"ttShimmer 4s linear infinite",cursor:"pointer",
              border:"none",outline:"none",textAlign:"left",padding:0,
            }}
          >←</button>
        )}

        <div className="tt-nav-tag" style={{
          display:"flex",alignItems:"center",gap:7,
          fontSize:"0.68rem",fontWeight:800,textTransform:"uppercase",letterSpacing:2,
          color:T.royal,background:"rgba(26,111,255,0.1)",
          border:`1px solid rgba(26,111,255,0.28)`,
          padding:"5px 14px",borderRadius:100,
        }}>
          <div style={{width:5,height:5,borderRadius:"50%",background:T.royal,animation:"ttBlink 1.5s ease infinite"}}/>
          Transfer Trail
        </div>

        <div className="tt-nav-right" style={{display:"flex",justifyContent:"flex-end"}}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background:T.surface,border:`1px solid ${T.border2}`,
              color:"#fff",padding:"7px 13px",borderRadius:9,
              fontSize:"0.78rem",fontWeight:700,cursor:"pointer",
              display:"flex",alignItems:"center",gap:5,transition:"all 0.2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background=T.surf2}}
            onMouseLeave={e=>{e.currentTarget.style.background=T.surface}}
          >
            ❓ Help
          </button>
        </div>
      </nav>

      {/* ── PAGE ── */}
      <main className="tt-main" style={{position:"relative",zIndex:1,maxWidth:980,margin:"0 auto",padding:"32px 22px 80px",boxSizing:"border-box"}}>

        {/* Header */}
        <div style={{marginBottom:22,animation:"ttFadeUp 0.45s ease"}}>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2rem,5vw,3rem)",letterSpacing:2,lineHeight:1,marginBottom:4,color:T.text}}>
            Transfer History
          </h1>
          <p style={{color:T.muted,fontSize:"0.85rem",margin:0}}>
            {gameOver ? "Today's puzzle complete — come back tomorrow!" : "Guess the player from their club transfer history"}
          </p>
        </div>



        {gameOver ? (
          <ResultCard
            xpEarned={xpEarned}
            correctCount={correctCount}
            players={puzzlePlayers}
            onPlayAgain={handlePlayAgain}
            isRaid={isRaid}
          />
        ) : (
          <>
            {/* Player strip */}
            <div className="tt-player-strip" style={{
              background:T.surface,border:`1px solid ${T.border}`,
              borderLeft:`3px solid ${T.royal}`,borderRadius:16,
              padding:"18px 22px",marginBottom:18,position:"relative",overflow:"hidden",
              animation:"ttFadeUp 0.45s ease 0.07s both",
            }}>
              <div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,rgba(26,111,255,0.07),transparent 60%)`,pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:14,position:"relative",zIndex:1}}>
                <div style={{
                  width:48,height:48,borderRadius:"50%",
                  background:"rgba(26,111,255,0.12)",border:`2px solid rgba(26,111,255,0.3)`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"1.4rem",flexShrink:0,
                }}>🔄</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:1,lineHeight:1,marginBottom:3,color:T.text}}>
                    Who is this player?
                  </div>
                  <div style={{fontSize:"0.7rem",color:T.muted,textTransform:"uppercase",letterSpacing:1}}>
                    Player {currentIdx + 1} of {PLAYERS_PER_GAME}
                    {attempts > 0 && ` · Attempt ${attempts}/${MAX_ATTEMPTS}`}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.75rem",letterSpacing:1,color:T.royal,lineHeight:1}}>{xpEarned}</div>
                  <div style={{fontSize:"0.56rem",color:T.muted2,letterSpacing:1,textTransform:"uppercase"}}>XP</div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{display:"flex",gap:8,marginBottom:18,alignItems:"center"}}>
              {puzzlePlayers.map((p, i) => (
                <div key={p.name} style={{
                  flex:1,height:5,borderRadius:99,
                  background: i < currentIdx
                    ? revealed[p.name] ? "rgba(232,64,64,0.5)" : "linear-gradient(90deg,#3dd68c,#2dd4bf)"
                    : i === currentIdx
                    ? `linear-gradient(90deg,${T.royal},${T.royalLight})`
                    : "rgba(255,255,255,0.06)",
                  boxShadow: i === currentIdx ? `0 0 7px rgba(26,111,255,0.45)` : "none",
                  transition:"all 0.35s ease",
                }}/>
              ))}
              <span style={{fontFamily:"monospace",fontSize:"0.66rem",fontWeight:700,color:T.muted2,whiteSpace:"nowrap"}}>{currentIdx + 1}/{PLAYERS_PER_GAME}</span>
            </div>

            {/* Main grid */}
            <div className="tt-main-grid" style={{
              display:"grid",
              gridTemplateColumns:"280px 1fr",
              gap:16,marginBottom:16,
              animation:"ttFadeUp 0.45s ease 0.1s both",
            }}>
              <TransferHistory clubs={clubs}/>

              <div className="tt-guessing-box" style={{
                background:T.surface,border:`1px solid ${T.border}`,
                borderRadius:14,padding:26,
                display:"flex",flexDirection:"column",
                justifyContent:"center",alignItems:"center",
                minHeight:360,position:"relative",overflow:"visible",
              }}>
                <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,rgba(26,111,255,0.04),transparent 60%)`,pointerEvents:"none",borderRadius:14}}/>

                <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.25rem",letterSpacing:2,color:T.text,marginBottom:20,position:"relative",zIndex:1}}>
                  Who is this player?
                </h3>

                <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:9999,isolation:"isolate"}}>
                  <SearchDropdown
                    players={players}
                    onSelect={setSelected}
                    disabled={feedback === "correct"}
                  />
                  {selected && (
                    <div style={{
                      marginTop: 10,
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: "rgba(26,111,255,0.08)",
                      border: "1px solid rgba(26,111,255,0.22)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      width: "100%",
                      boxSizing: "border-box",
                      animation: "ttFadeUp 0.3s ease"
                    }}>
                      <span style={{ fontSize: "0.85rem", color: "#fff" }}>
                        🎯 Selected: <strong>{selected.name}</strong>
                      </span>
                      <button
                        onClick={() => setSelected(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "rgba(255,255,255,0.6)",
                          fontSize: "1.1rem",
                          cursor: "pointer",
                          padding: "0 4px",
                          lineHeight: 1
                        }}
                        title="Clear selection"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={submitGuess}
                  disabled={!selected}
                  style={{
                    marginTop:14,
                    background:selected?T.royal:"rgba(26,111,255,0.15)",
                    color:selected?"#fff":"rgba(255,255,255,0.3)",
                    border:"none",borderRadius:12,
                    fontFamily:"'DM Sans',sans-serif",
                    fontSize:"0.9rem",fontWeight:800,
                    padding:"12px 38px",cursor:selected?"pointer":"default",
                    textTransform:"uppercase",letterSpacing:1,
                    boxShadow:selected?"0 6px 20px rgba(26,111,255,0.3)":"none",
                    transition:"all 0.22s ease",
                    position:"relative",zIndex:1,
                  }}
                  onMouseEnter={e=>{ if(selected){e.currentTarget.style.background=T.royalHover;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 28px rgba(26,111,255,0.44)"} }}
                  onMouseLeave={e=>{ if(selected){e.currentTarget.style.background=T.royal;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 6px 20px rgba(26,111,255,0.3)"} }}
                >
                  Submit Guess
                </button>

                <Feedback state={feedback} message={feedbackMsg}/>

                {attempts > 0 && !feedback && (
                  <div style={{marginTop:10,fontSize:"0.75rem",color:T.muted2,textTransform:"uppercase",letterSpacing:1}}>
                    {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining
                  </div>
                )}

                {/* Hint Section */}
                {!gameOver && currentPlayer && !isRaid && (
                  <div style={{ marginTop: 20, width: "100%", maxWidth: 400, display: "flex", justifyContent: "center" }}>
                    {unlockedHints[currentIdx] ? (
                      <div style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: "rgba(247,195,68,0.08)",
                        border: `1px solid ${T.gold}`,
                        color: T.gold,
                        fontSize: "0.85rem",
                        textAlign: "center",
                        fontWeight: 700,
                        animation: "ttFadeUp 0.3s ease"
                      }}>
                        💡 HINT: {currentPlayer.flag} {currentPlayer.country || currentPlayer.nationality} · {currentPlayer.position}
                      </div>
                    ) : (
                      <button
                        onClick={triggerRewardedAdForHint}
                        disabled={isAdLoading}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: "rgba(255,255,255,0.03)",
                          border: `1px dashed ${T.border2}`,
                          color: T.muted,
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          cursor: isAdLoading ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => { if(!isAdLoading) { e.currentTarget.style.background = "rgba(26,111,255,0.08)"; e.currentTarget.style.borderColor = T.royal; e.currentTarget.style.color = "#fff"; } }}
                        onMouseLeave={e => { if(!isAdLoading) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.muted; } }}
                      >
                        {isAdLoading ? "⏳ Loading Ad..." : "📺 Watch Ad for Hint"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="tt-controls" style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",animation:"ttFadeUp 0.45s ease 0.15s both"}}>
              <button
                className="tt-control-btn"
                onClick={() => setShowModal(true)}
                style={{
                  background:T.surface,color:T.muted,
                  border:`1px solid ${T.border}`,borderRadius:10,
                  padding:"12px 26px",fontFamily:"'DM Sans',sans-serif",
                  fontSize:"0.88rem",fontWeight:700,cursor:"pointer",
                  transition:"all 0.22s",textTransform:"uppercase",letterSpacing:0.5,
                  minWidth:140,
                }}
                onMouseEnter={e=>{e.currentTarget.style.color=T.text;e.currentTarget.style.transform="translateY(-2px)"}}
                onMouseLeave={e=>{e.currentTarget.style.color=T.muted;e.currentTarget.style.transform="none"}}
              >? How to Play</button>
            </div>
          </>
        )}

        {/* Dashboard / Progress */}
        <div className="tt-bottom-section">
          <div className="tt-section-divider">
            <span className="tt-section-label">Your Progress</span>
            <div className="tt-section-line" />
          </div>
          <div className="tt-dashboard-grid">
            {/* Streak Card */}
            <div className="tt-dash-card">
              <div className="tt-dash-card-hdr">
                <span className="tt-dash-icon">📅</span>
                <span className="tt-dash-label">Last 30 Days</span>
              </div>
              <StreakDots 
                history={historyAndStats.history} 
                puzzleDate={puzzleDate} 
                gameOver={gameOver} 
                currentXP={xpEarned}
                currentSolved={correctCount > 0} 
              />
              <div className="tt-streak-legend">
                <span><span className="tt-dot-sample win" />Solved</span>
                <span><span className="tt-dot-sample miss" />Missed</span>
                <span><span className="tt-dot-sample today" />Today</span>
              </div>
            </div>
            {/* Stats Card */}
            <div className="tt-dash-card">
              <div className="tt-dash-card-hdr">
                <span className="tt-dash-icon">📊</span>
                <span className="tt-dash-label">Your Stats</span>
              </div>
              <div className="tt-stats-grid">
                <div className="tt-stat-item"><div className="tt-stat-value">{historyAndStats.stats.played || '—'}</div><div className="tt-stat-name">Played</div></div>
                <div className="tt-stat-item"><div className="tt-stat-value">{historyAndStats.stats.bestScore !== undefined ? `${historyAndStats.stats.bestScore} XP` : '—'}</div><div className="tt-stat-name">Best XP</div></div>
                <div className="tt-stat-item"><div className="tt-stat-value">{historyAndStats.stats.avgScore !== undefined ? `${historyAndStats.stats.avgScore} XP` : '—'}</div><div className="tt-stat-name">Avg XP</div></div>
                <div className="tt-stat-item"><div className="tt-stat-value">{historyAndStats.stats.dayStreak || '—'}</div><div className="tt-stat-name">Day Streak</div></div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Responsive & Dashboard Styling */}
      <style>{`
        @media (max-width: 700px) {
          .tt-main-grid { grid-template-columns: 1fr !important; }
          .tt-nav {
            padding: 0 12px !important;
            height: 54px !important;
            grid-template-columns: auto 1fr auto !important;
            gap: 10px !important;
          }
          .tt-nav-logo {
            font-size: 1.3rem !important;
            letter-spacing: 1.5px !important;
          }
          .tt-nav-tag {
            font-size: 0.62rem !important;
            padding: 4px 10px !important;
            letter-spacing: 1px !important;
            justify-self: center;
          }
          .tt-nav-right {
            justify-content: flex-end !important;
          }
          .tt-nav-right button {
            padding: 5px 10px !important;
            font-size: 0.7rem !important;
          }
          .tt-main {
            padding: 16px 12px 60px !important;
          }
          .tt-player-strip {
            padding: 14px 16px !important;
            border-radius: 12px !important;
          }
          .tt-guessing-box {
            padding: 20px 16px !important;
            min-height: 300px !important;
            border-radius: 12px !important;
          }
          .tt-controls {
            gap: 8px !important;
          }
          .tt-control-btn {
            flex: 1 !important;
            min-width: 120px !important;
            padding: 10px 16px !important;
            font-size: 0.8rem !important;
          }
          .tt-result-card {
            padding: 30px 16px !important;
            border-radius: 16px !important;
          }
          .tt-result-title {
            font-size: 1.9rem !important;
          }
          .tt-result-score {
            font-size: 3.2rem !important;
          }
          .tt-modal-box {
            padding: 28px 18px !important;
            border-radius: 16px !important;
          }
        }
        
        /* ── DASHBOARD / BOTTOM SECTION ── */
        .tt-bottom-section {
          margin-top: 50px;
          animation: ttFadeUp 0.5s ease 0.2s both;
        }
        .tt-section-divider {
          display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
        }
        .tt-section-label {
          font-family: 'Space Mono', monospace; font-size: 0.65rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 2px; color: rgba(240,240,240,0.45);
        }
        .tt-section-line {
          flex: 1; height: 1px; background: linear-gradient(to right, rgba(26,111,255,0.18), transparent);
        }
        .tt-dashboard-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        .tt-dash-card {
          background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 18px; display: flex; flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }
        .tt-dash-card-hdr {
          display: flex; align-items: center; gap: 6px; margin-bottom: 14px;
        }
        .tt-dash-icon {
          font-size: .95rem;
        }
        .tt-dash-label {
          font-size: .68rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 1px; color: rgba(240,240,240,0.45);
        }
        .tt-streak-dots {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 4px; margin-bottom: 16px;
        }
        .tt-streak-dot {
          aspect-ratio: 1; border-radius: 6px; background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.05);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Space Mono', monospace; font-size: 0.52rem; font-weight: 700;
        }
        .tt-streak-dot.win {
          background: rgba(61,214,140,.18); border-color: rgba(61,214,140,.32); color: #3dd68c;
          box-shadow: 0 0 6px rgba(61,214,140,0.15);
        }
        .tt-streak-dot.miss {
          background: rgba(232,64,64,.08); border-color: rgba(232,64,64,.18); color: #ff8080;
        }
        .tt-streak-dot.today-pending {
          background: rgba(26,111,255,.09); border-style: dashed; border-color: rgba(26,111,255,.38);
        }
        .tt-streak-legend {
          display: flex; gap: 13px; font-size: .68rem; color: rgba(240,240,240,0.45); align-items: center; flex-wrap: wrap;
          margin-top: auto;
        }
        .tt-dot-sample {
          display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 4px; vertical-align: middle;
        }
        .tt-dot-sample.win { background: rgba(61,214,140,.18); border: 1px solid #3dd68c; }
        .tt-dot-sample.miss { background: rgba(232,64,64,.08); border: 1px solid rgba(232,64,64,0.18); }
        .tt-dot-sample.today { background: rgba(26,111,255,.14); border: 1px solid #1a6fff; }
        
        .tt-stats-grid {
          flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px;
        }
        .tt-stat-item {
          background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
          padding: 14px 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: border-color .2s, background .2s;
        }
        .tt-stat-item:hover {
          border-color: rgba(26,111,255,.22); background: rgba(26,111,255,.03);
        }
        .tt-stat-value {
          font-family: 'Bebas Neue', sans-serif; font-size: 1.75rem; letter-spacing: 1px; color: #fff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
        }
        .tt-stat-name {
          font-size: .62rem; font-weight: 700; color: rgba(240,240,240,0.45); text-transform: uppercase; letter-spacing: .5px; margin-top: 1px;
        }
        @media (max-width: 768px) {
          .tt-dashboard-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}