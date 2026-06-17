/**
 * TransferTrail.jsx
 * Show a player's club transfer history — user guesses WHO the player is.
 * 3 players per session, scoring system, streak bonuses.
 * Matches the transfer.html (Crickingo) mechanic adapted for FootBrawls.
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

// ── Config ────────────────────────────────────────────────────────────────────
const PLAYERS_PER_GAME = 3;
const MAX_ATTEMPTS     = 3;           // guesses per player
const SCORE_TABLE      = [250, 300, 350]; // per correct player (streak-based)
const PERFECT_BONUS    = 100;
const TOTAL_XP         = 20;

// ── Seeded daily puzzle — pick 3 players deterministically ───────────────────
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function getDailyPlayers(players, dateStr) {
  // Only include players that actually have a clubs array with 2+ entries
  const eligible = players.filter(p => Array.isArray(p.clubs) && p.clubs.length >= 2);
  if (eligible.length < PLAYERS_PER_GAME) return eligible.slice(0, PLAYERS_PER_GAME);

  const seed = dateStr.split("-").reduce((a, n) => a * 100 + parseInt(n), 0);
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
  if (document.getElementById("tt2-fonts")) return;
  const l = document.createElement("link");
  l.id = "tt2-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      "#05070f",
  surface: "rgba(255,255,255,0.038)",
  surf2:   "rgba(255,255,255,0.065)",
  border:  "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.13)",
  gold:    "#F7C344",
  red:     "#E84040",
  blue:    "#4F8EF7",
  green:   "#3DD68C",
  teal:    "#2DD4BF",
  purple:  "#A855F7",
  text:    "#F0F0F0",
  muted:   "rgba(240,240,240,0.45)",
  muted2:  "rgba(240,240,240,0.25)",
};

// ── CSS keyframes (injected once) ─────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes tt2FadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes tt2Shimmer  { from{background-position:0% center} to{background-position:200% center} }
  @keyframes tt2Blink    { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes tt2Spin     { to{transform:rotate(360deg)} }
  @keyframes tt2ScorePop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
  @keyframes tt2Correct  { 0%{background:rgba(61,214,140,0.25)} 100%{background:rgba(61,214,140,0.07)} }
  @keyframes tt2Wrong    { 0%,20%,40%,60%,80%{transform:translateX(-6px)} 10%,30%,50%,70%,90%{transform:translateX(6px)} 100%{transform:translateX(0)} }
  @keyframes tt2DropDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes tt2ScorePulse { 0%,100%{filter:drop-shadow(0 0 18px rgba(79,142,247,0.4))} 50%{filter:drop-shadow(0 0 38px rgba(79,142,247,0.75))} }
`;

// ── Background ────────────────────────────────────────────────────────────────
function BgLayers() {
  return (
    <>
      <div style={{
        position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        background:`
          radial-gradient(ellipse 80% 60% at 8% -5%,  rgba(247,195,68,0.07) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 95% 105%,rgba(79,142,247,0.08) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 50%, rgba(232,64,64,0.04)  0%, transparent 65%),
          ${T.bg}
        `,
      }}/>
      <div style={{
        position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(-45deg,transparent,transparent 48px,rgba(255,255,255,0.007) 48px,rgba(255,255,255,0.007) 49px)",
      }}/>
      <div style={{
        position:"fixed",inset:0,zIndex:0,pointerEvents:"none",opacity:0.02,
        backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize:"200px",
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
        animation:"tt2FadeUp 0.22s ease",
      }}
    >
      <div style={{
        background:"#0c1020",border:"1px solid rgba(79,142,247,0.18)",
        borderRadius:24,padding:"40px 32px",
        maxWidth:520,width:"100%",maxHeight:"88vh",overflowY:"auto",
        position:"relative",animation:"tt2FadeUp 0.32s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Top bar */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#4F8EF7,#F7C344,#E84040)",borderRadius:"24px 24px 0 0"}}/>

        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",letterSpacing:2,textAlign:"center",marginBottom:24,color:T.text}}>
          🔄 How to Play
        </h2>

        <ul style={{listStyle:"none",padding:0,margin:"0 0 20px",display:"flex",flexDirection:"column",gap:8}}>
          {[
            ["📋","A player's club transfer history is shown — teams they played for"],
            ["🔍","Search and select the player's name from the dropdown"],
            ["✅","Submit your guess to see if you're correct"],
            ["🔥","Get all 3 correct for streak bonuses and max score!"],
            ["⏭️","Skip if you don't know — but you'll lose your streak"],
            ["🏆","3 players per puzzle — new puzzle every day!"],
          ].map(([icon, text]) => (
            <li key={text} style={{
              background:T.surface,border:`1px solid ${T.border}`,
              borderLeft:"3px solid rgba(79,142,247,0.45)",
              borderRadius:12,padding:"12px 16px",
              fontSize:"0.88rem",lineHeight:1.6,color:T.muted,
            }}>
              <span style={{marginRight:8}}>{icon}</span>{text}
            </li>
          ))}
        </ul>

        <div style={{background:"rgba(79,142,247,0.05)",border:"1px solid rgba(79,142,247,0.18)",borderRadius:14,padding:18,marginBottom:22}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:1,color:T.blue,marginBottom:12,textAlign:"center"}}>
            💰 SCORING — MAX 1000 PTS
          </div>
          {[
            ["1st Correct Guess",        "+250 pts"],
            ["2nd Correct (Streak)",     "+300 pts"],
            ["3rd Correct (Streak)",     "+350 pts"],
            ["Perfect Completion (3/3)", "+100 pts"],
          ].map(([label, val]) => (
            <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontSize:"0.85rem",borderBottom:`1px solid ${T.border}`,color:T.muted}}>
              <span>{label}</span>
              <span style={{color:T.blue,fontWeight:700}}>{val}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width:"100%",padding:"14px",background:T.blue,border:"none",
            borderRadius:12,color:"#fff",fontFamily:"'DM Sans',sans-serif",
            fontSize:"0.92rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1,
            cursor:"pointer",transition:"all 0.22s",
            boxShadow:"0 6px 20px rgba(79,142,247,0.28)",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="#70a8ff"}
          onMouseLeave={e=>e.currentTarget.style.background=T.blue}
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
      borderRadius:16,padding:22,
      maxHeight:420,overflowY:"auto",
    }}>
      <div style={{
        fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.05rem",letterSpacing:2,
        color:T.blue,marginBottom:18,display:"flex",alignItems:"center",gap:8,
      }}>
        <span>📋</span> Transfer History
      </div>

      {clubs.map((entry, i) => {
        const clubName = typeof entry === "string" ? entry : entry.club;
        const years    = typeof entry === "object" && entry.years ? entry.years : null;
        return (
          <div
            key={i}
            style={{
              background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,
              borderLeft:"3px solid rgba(79,142,247,0.4)",
              borderRadius:12,padding:"14px 16px",marginBottom:10,
              transition:"border-color 0.2s,transform 0.2s,background 0.2s",
              animation:`tt2FadeUp 0.35s ease ${i * 0.06}s both`,
              cursor:"default",
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.borderLeftColor=T.blue;
              e.currentTarget.style.background="rgba(79,142,247,0.06)";
              e.currentTarget.style.transform="translateX(4px)";
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.borderLeftColor="rgba(79,142,247,0.4)";
              e.currentTarget.style.background="rgba(255,255,255,0.04)";
              e.currentTarget.style.transform="translateX(0)";
            }}
          >
            {years && (
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.05rem",letterSpacing:1,color:T.gold,marginBottom:3}}>
                {years}
              </div>
            )}
            <div style={{fontSize:"0.9rem",color:T.text,fontWeight:500}}>{clubName}</div>
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

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pick(player) {
    onSelect(player);
    setQuery(player.name);
    setOpen(false);
  }

  return (
    <div ref={dropRef} style={{position:"relative",width:"100%"}}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="🔍 Type player name..."
        disabled={disabled}
        style={{
          width:"100%",boxSizing:"border-box",
          padding:"14px 18px",
          fontFamily:"'DM Sans',sans-serif",fontSize:"0.95rem",
          background:focused ? T.surf2 : T.surface,
          border:`1px solid ${focused ? T.blue : T.border2}`,
          borderRadius:16,color:T.text,outline:"none",
          boxShadow:focused?"0 0 0 3px rgba(79,142,247,0.12)":"none",
          transition:"all 0.2s",
          opacity:disabled?0.5:1,
          cursor:disabled?"not-allowed":"text",
        }}
      />

      {open && (
        <div style={{
          position:"absolute",top:"calc(100% + 6px)",left:0,right:0,
          background:"#0b0e1a",
          border:"1px solid rgba(79,142,247,0.4)",
          borderRadius:16,
          boxShadow:"0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(79,142,247,0.15)",
          zIndex:999,maxHeight:260,overflowY:"auto",
          animation:"tt2DropDown 0.18s ease",
        }}>
          {results.map(p => (
            <div
              key={p.id}
              onMouseDown={() => pick(p)}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding:"12px 16px",cursor:"pointer",
                color:T.text,fontSize:"0.9rem",
                borderBottom:`1px solid rgba(255,255,255,0.06)`,
                background:hovered===p.id?"#131b36":"#0b0e1a",
                paddingLeft:hovered===p.id?22:16,
                transition:"all 0.15s",
                display:"flex",alignItems:"center",gap:10,
              }}
            >
              <span style={{fontSize:"1.1rem"}}>{p.flag || "🏳️"}</span>
              <div>
                <div style={{fontWeight:700}}>{p.name}</div>
                <div style={{fontSize:"0.7rem",color:T.muted2}}>{p.position} · {p.nationality}</div>
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
      marginTop:16,padding:"13px 20px",borderRadius:12,
      fontSize:"0.92rem",fontWeight:700,textAlign:"center",
      background:isCorrect?"rgba(61,214,140,0.1)":"rgba(232,64,64,0.1)",
      color:isCorrect?T.green:"#ff8080",
      border:`1px solid ${isCorrect?"rgba(61,214,140,0.38)":"rgba(232,64,64,0.38)"}`,
      animation:isCorrect?"tt2FadeUp 0.3s ease":"tt2Wrong 0.4s ease",
    }}>
      {message}
    </div>
  );
}

// ── Result / Game Over card ───────────────────────────────────────────────────
function ResultCard({ score, correctCount, players: puzzlePlayers, onPlayAgain }) {
  const perfect = correctCount === PLAYERS_PER_GAME;
  const pct     = Math.round((score / (1000)) * 100);

  return (
    <div style={{
      position:"relative",overflow:"hidden",
      background:perfect?"rgba(61,214,140,0.04)":"rgba(79,142,247,0.04)",
      border:`1px solid ${perfect?"rgba(61,214,140,0.3)":"rgba(79,142,247,0.28)"}`,
      borderRadius:22,padding:"48px 32px",textAlign:"center",
      animation:"tt2FadeUp 0.5s ease",
      boxShadow:perfect?"0 8px 40px rgba(61,214,140,0.08)":"0 8px 40px rgba(79,142,247,0.08)",
    }}>
      {/* Top gradient bar */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#4F8EF7,#F7C344,#E84040)",borderRadius:"22px 22px 0 0"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,255,255,0.025),transparent 60%)",borderRadius:22,pointerEvents:"none"}}/>

      {/* Badge */}
      <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(79,142,247,0.1)",border:"1px solid rgba(79,142,247,0.3)",color:T.blue,fontSize:"0.7rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",padding:"5px 14px",borderRadius:100,marginBottom:14}}>
        Game Complete
      </div>

      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.8rem",letterSpacing:2,marginBottom:8,color:T.text}}>
        {perfect ? "PERFECT SCORE!" : "GAME OVER!"}
      </div>

      {/* Score */}
      <div style={{
        fontFamily:"'Bebas Neue',sans-serif",
        fontSize:"5rem",letterSpacing:2,lineHeight:1,margin:"12px 0",
        background:"linear-gradient(135deg,#4F8EF7,#a0d0ff 60%)",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
        filter:"drop-shadow(0 0 22px rgba(79,142,247,0.4))",
        animation:"tt2ScorePulse 2.5s ease-in-out infinite, tt2ScorePop 0.5s ease",
      }}>
        {score} <span style={{fontSize:"2.5rem",opacity:0.6}}>/</span> 1000
      </div>

      <div style={{fontSize:"1rem",color:T.muted,marginBottom:28,lineHeight:1.6}}>
        {correctCount} of {PLAYERS_PER_GAME} players guessed correctly
        {perfect && " — FLAWLESS!"}
      </div>

      {/* Player reveal */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"18px 20px",marginBottom:24,textAlign:"left"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.95rem",letterSpacing:2,color:T.muted2,marginBottom:14}}>TODAY'S PLAYERS</div>
        {puzzlePlayers.map((p, i) => (
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<puzzlePlayers.length-1?`1px solid ${T.border}`:"none"}}>
            <span style={{fontSize:"1.2rem"}}>{p.flag || "🏳️"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:"0.9rem",color:T.text}}>{p.name}</div>
              <div style={{fontSize:"0.68rem",color:T.muted2}}>{p.position} · {p.nationality}</div>
            </div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:"0.65rem",fontWeight:700,padding:"3px 10px",borderRadius:99,background:SCORE_TABLE[i]>0?"rgba(61,214,140,0.1)":"rgba(232,64,64,0.1)",color:SCORE_TABLE[i]>0?T.green:"#ff8080"}}>
              {i === 0 ? "+250" : i === 1 ? "+300" : "+350"} pts
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button
          onClick={onPlayAgain}
          style={{
            background:"rgba(61,214,140,0.12)",color:T.green,
            border:"1px solid rgba(61,214,140,0.28)",borderRadius:12,
            padding:"13px 28px",fontFamily:"'DM Sans',sans-serif",
            fontSize:"0.9rem",fontWeight:700,cursor:"pointer",
            transition:"all 0.22s",textTransform:"uppercase",letterSpacing:0.5,
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(61,214,140,0.22)";e.currentTarget.style.transform="translateY(-2px)"}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(61,214,140,0.12)";e.currentTarget.style.transform="none"}}
        >↺ Play Again</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TransferTrail({ players = PLAYERS, userId, onComplete }) {
  const navigate = useNavigate();
  const puzzleDate  = getActivePuzzleDate();
  const storageKey  = "footbrawls_transfertrail";
  const stateKey    = `tt2_state_${puzzleDate}`;

  // Daily puzzle players
  const puzzlePlayers = useMemo(() => getDailyPlayers(players, puzzleDate), [players, puzzleDate]);

  // Game state
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [selected, setSelected]         = useState(null);   // player object from dropdown
  const [attempts, setAttempts]         = useState(0);      // guesses for current player
  const [feedback, setFeedback]         = useState(null);   // "correct" | "wrong" | null
  const [feedbackMsg, setFeedbackMsg]   = useState("");
  const [score, setScore]               = useState(0);
  const [streak, setStreak]             = useState(0);      // consecutive correct
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver]         = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [xpAwarded, setXpAwarded]       = useState(0);

  // Revealed player flags (when skipped or out of attempts)
  const [revealed, setRevealed]         = useState({});

  useEffect(() => { injectFonts(); }, []);

  // Inject keyframes
  useEffect(() => {
    if (document.getElementById("tt2-keyframes")) return;
    const s = document.createElement("style");
    s.id = "tt2-keyframes"; s.textContent = KEYFRAMES;
    document.head.appendChild(s);
  }, []);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem(stateKey);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setCurrentIdx(s.currentIdx ?? 0);
        setScore(s.score ?? 0);
        setStreak(s.streak ?? 0);
        setCorrectCount(s.correctCount ?? 0);
        setGameOver(s.gameOver ?? false);
        setRevealed(s.revealed ?? {});
        setXpAwarded(s.xpAwarded ?? 0);
      } catch {}
    }
  }, [stateKey]);

  function persist(updates) {
    localStorage.setItem(stateKey, JSON.stringify(updates));
    // Mark as completed in the main storage key
    if (updates.gameOver) {
      const hist = JSON.parse(localStorage.getItem(storageKey) || "{}");
      hist[puzzleDate] = { date: puzzleDate, completed: true, score: updates.score, xpAwarded: updates.xpAwarded };
      localStorage.setItem(storageKey, JSON.stringify(hist));
    }
  }

  const currentPlayer = puzzlePlayers[currentIdx];

  async function submitGuess() {
    if (!selected) return;

    const isCorrect = selected.id === currentPlayer.id;
    const newAttempts = attempts + 1;

    if (isCorrect) {
      // Award score based on streak position
      const points = SCORE_TABLE[streak] ?? 250;
      const newScore     = score + points;
      const newStreak    = streak + 1;
      const newCorrect   = correctCount + 1;
      const isLast       = currentIdx === PLAYERS_PER_GAME - 1;
      const newPerfect   = isLast && newCorrect === PLAYERS_PER_GAME;
      const finalScore   = newPerfect ? newScore + PERFECT_BONUS : newScore;

      setFeedback("correct");
      setFeedbackMsg(`✅ Correct! +${points} pts${newPerfect ? ` +${PERFECT_BONUS} bonus!` : ""}`);
      setScore(newPerfect ? finalScore : newScore);
      setStreak(newStreak);
      setCorrectCount(newCorrect);

      if (isLast) {
        // Game over — award XP
        let xp = 0;
        const user = getUser();
        const uid  = userId || user?.userId;
        if (uid) {
          const res = await awardXP(uid, "transferTrail_correct", { rawXP: TOTAL_XP });
          xp = res?.xpAwarded ?? TOTAL_XP;
        } else {
          xp = TOTAL_XP;
        }
        setXpAwarded(xp);
        setTimeout(() => {
          setGameOver(true);
          persist({ currentIdx: currentIdx + 1, score: newPerfect ? finalScore : newScore, streak: newStreak, correctCount: newCorrect, gameOver: true, revealed, xpAwarded: xp });
          if (onComplete) onComplete({ gameId: "transferTrail", solved: true, score: newPerfect ? finalScore : newScore, xpAwarded: xp });
        }, 1200);
      } else {
        setTimeout(() => {
          setCurrentIdx(i => i + 1);
          setSelected(null);
          setAttempts(0);
          setFeedback(null);
          setFeedbackMsg("");
          persist({ currentIdx: currentIdx + 1, score: newScore, streak: newStreak, correctCount: newCorrect, gameOver: false, revealed, xpAwarded: 0 });
        }, 1200);
      }
    } else {
      // Wrong guess
      const isLastAttempt = newAttempts >= MAX_ATTEMPTS;
      const isLastPlayer  = currentIdx === PLAYERS_PER_GAME - 1;

      setFeedback("wrong");
      setFeedbackMsg(isLastAttempt ? `❌ It was ${currentPlayer.name}!` : `❌ Wrong! ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? "s" : ""} left`);
      setAttempts(newAttempts);
      setStreak(0); // reset streak on wrong

      if (isLastAttempt) {
        const newRevealed = { ...revealed, [currentPlayer.id]: true };
        setRevealed(newRevealed);
        if (isLastPlayer) {
          setTimeout(() => {
            setGameOver(true);
            persist({ currentIdx: currentIdx + 1, score, streak: 0, correctCount, gameOver: true, revealed: newRevealed, xpAwarded: 0 });
            if (onComplete) onComplete({ gameId: "transferTrail", solved: false, score, xpAwarded: 0 });
          }, 1500);
        } else {
          setTimeout(() => {
            setCurrentIdx(i => i + 1);
            setSelected(null);
            setAttempts(0);
            setFeedback(null);
            setFeedbackMsg("");
            persist({ currentIdx: currentIdx + 1, score, streak: 0, correctCount, gameOver: false, revealed: newRevealed, xpAwarded: 0 });
          }, 1500);
        }
      } else {
        setSelected(null);
      }
    }
  }

  function skipPlayer() {
    const newRevealed = { ...revealed, [currentPlayer.id]: true };
    setRevealed(newRevealed);
    setStreak(0);
    const isLast = currentIdx === PLAYERS_PER_GAME - 1;
    if (isLast) {
      setGameOver(true);
      persist({ currentIdx: currentIdx + 1, score, streak: 0, correctCount, gameOver: true, revealed: newRevealed, xpAwarded: 0 });
      if (onComplete) onComplete({ gameId: "transferTrail", solved: false, score, xpAwarded: 0 });
    } else {
      setFeedback("wrong");
      setFeedbackMsg(`⏭ Skipped — it was ${currentPlayer.name}`);
      setTimeout(() => {
        setCurrentIdx(i => i + 1);
        setSelected(null);
        setAttempts(0);
        setFeedback(null);
        setFeedbackMsg("");
        persist({ currentIdx: currentIdx + 1, score, streak: 0, correctCount, gameOver: false, revealed: newRevealed, xpAwarded: 0 });
      }, 1400);
    }
  }

  function handlePlayAgain() {
    localStorage.removeItem(stateKey);
    setCurrentIdx(0); setScore(0); setStreak(0); setCorrectCount(0);
    setGameOver(false); setRevealed({}); setSelected(null);
    setAttempts(0); setFeedback(null); setFeedbackMsg(""); setXpAwarded(0);
  }

  if (!puzzlePlayers.length) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,color:T.muted,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:18,height:18,border:`2px solid ${T.blue}`,borderTopColor:"transparent",borderRadius:"50%",animation:"tt2Spin 0.8s linear infinite"}}/>
          Loading puzzle…
        </div>
      </div>
    );
  }

  // Date display
  const dateStr = new Date(puzzleDate + "T00:00:00").toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
  const launch  = new Date("2026-01-01T00:00:00");
  const diff    = Math.max(1, Math.floor((new Date(puzzleDate + "T00:00:00") - launch) / 86400000) + 1);

  const clubs = currentPlayer
    ? (currentPlayer.clubs || [currentPlayer.club]).filter(Boolean)
    : [];

  return (
    <div style={{position:"relative",minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans',sans-serif",color:T.text,overflowX:"hidden"}}>
      <BgLayers/>
      {showModal && <RulesModal onClose={() => setShowModal(false)}/>}

      {/* ── NAV ── */}
      <nav style={{
        position:"sticky",top:0,zIndex:200,
        display:"grid",gridTemplateColumns:"1fr auto 1fr",
        alignItems:"center",padding:"0 28px",height:62,
        background:"rgba(5,7,15,0.85)",
        backdropFilter:"blur(24px) saturate(1.4)",
        borderBottom:"1px solid rgba(79,142,247,0.12)",
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.7rem",letterSpacing:3,
            background:"linear-gradient(100deg,#F7C344 0%,#ffe9a0 50%,#F7C344 100%)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
            animation:"tt2Shimmer 4s linear infinite",cursor:"pointer",
            border:"none",outline:"none",textAlign:"left",padding:0
          }}
        >←</button>

        <div style={{
          display:"flex",alignItems:"center",gap:7,
          fontSize:"0.7rem",fontWeight:800,textTransform:"uppercase",letterSpacing:2,
          color:T.blue,background:"rgba(79,142,247,0.1)",
          border:"1px solid rgba(79,142,247,0.28)",
          padding:"5px 14px",borderRadius:100,
        }}>
          <div style={{width:6,height:6,borderRadius:"50%",background:T.blue,animation:"tt2Blink 1.5s ease infinite"}}/>
          Transfer Trail
        </div>

        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: T.surface,
              border: `1px solid ${T.border2 || 'rgba(255,255,255,0.1)'}`,
              color: "#fff",
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: ".8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"}}
            onMouseLeave={e=>{e.currentTarget.style.background=T.surface;e.currentTarget.style.borderColor=T.border2}}
          >
            ❓ Help
          </button>
        </div>
      </nav>

      {/* ── PAGE ── */}
      <main style={{position:"relative",zIndex:1,maxWidth:1000,margin:"0 auto",padding:"36px 24px 80px",boxSizing:"border-box"}}>

        {/* Page header */}
        <div style={{marginBottom:24,animation:"tt2FadeUp 0.5s ease"}}>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(2.2rem,5vw,3.2rem)",letterSpacing:2,lineHeight:1,marginBottom:5,color:T.text}}>
            Transfer History
          </h1>
          <p style={{color:T.muted,fontSize:"0.88rem",margin:0}}>
            {gameOver ? "Today's puzzle complete — come back tomorrow!" : "Guess the player from their club transfer history"}
          </p>
        </div>

        {/* Puzzle bar */}
        <div style={{
          display:"flex",alignItems:"center",marginBottom:24,width:"fit-content",
          background:"rgba(79,142,247,0.05)",border:"1px solid rgba(79,142,247,0.15)",
          borderRadius:12,overflow:"hidden",animation:"tt2FadeUp 0.5s ease 0.05s both",
        }}>
          {[
            { icon:"📅", label: dateStr },
            { icon:"🧩", label: `Puzzle #${diff}` },
          ].map(({icon, label}, i) => (
            <div key={label} style={{
              display:"flex",alignItems:"center",gap:7,
              padding:"9px 16px",fontSize:"0.77rem",color:T.muted,
              borderRight:i===0?"1px solid rgba(79,142,247,0.15)":"none",
            }}>
              {icon} <strong style={{color:T.blue,fontWeight:700}}>{label}</strong>
            </div>
          ))}
        </div>

        {gameOver ? (
          <ResultCard
            score={score}
            correctCount={correctCount}
            players={puzzlePlayers}
            onPlayAgain={handlePlayAgain}
          />
        ) : (
          <>
            {/* Player X of 3 box */}
            <div style={{
              marginBottom:20,animation:"tt2FadeUp 0.5s ease 0.08s both",
            }}>
              <div style={{
                background:T.surface,border:`1px solid ${T.border}`,
                borderLeft:`3px solid ${T.blue}`,borderRadius:18,
                padding:"20px 24px",position:"relative",overflow:"hidden",
              }}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(79,142,247,0.06),transparent 60%)",pointerEvents:"none"}}/>
                <div style={{display:"flex",alignItems:"center",gap:16,position:"relative",zIndex:1}}>
                  <div style={{
                    width:52,height:52,borderRadius:"50%",
                    background:"rgba(79,142,247,0.12)",border:"2px solid rgba(79,142,247,0.3)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"1.5rem",flexShrink:0,
                    boxShadow:"0 0 16px rgba(79,142,247,0.15)",
                  }}>🔄</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.65rem",letterSpacing:1,lineHeight:1,marginBottom:4,color:T.text}}>
                      Who is this player?
                    </div>
                    <div style={{fontSize:"0.72rem",color:T.muted,textTransform:"uppercase",letterSpacing:1}}>
                      Player {currentIdx + 1} of {PLAYERS_PER_GAME}
                      {attempts > 0 && ` · Attempt ${attempts}/${MAX_ATTEMPTS}`}
                    </div>
                  </div>
                  {/* Score */}
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",letterSpacing:1,color:T.blue,lineHeight:1}}>{score}</div>
                    <div style={{fontSize:"0.58rem",color:T.muted2,letterSpacing:1,textTransform:"uppercase"}}>pts</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Player progress dots */}
            <div style={{display:"flex",gap:8,marginBottom:20,alignItems:"center"}}>
              {puzzlePlayers.map((p, i) => (
                <div key={p.id} style={{
                  flex:1,height:6,borderRadius:99,
                  background: i < currentIdx
                    ? revealed[p.id] ? "rgba(232,64,64,0.5)" : "linear-gradient(90deg,#3DD68C,#2DD4BF)"
                    : i === currentIdx
                    ? "linear-gradient(90deg,#4F8EF7,#a0d0ff)"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: i === currentIdx ? "0 0 8px rgba(79,142,247,0.4)" : "none",
                  transition:"all 0.35s ease",
                }}/>
              ))}
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.68rem",fontWeight:700,color:T.muted2,whiteSpace:"nowrap"}}>{currentIdx + 1}/{PLAYERS_PER_GAME}</span>
            </div>

            {/* Main 2-col layout */}
            <div style={{
              display:"grid",
              gridTemplateColumns:"300px 1fr",
              gap:20,marginBottom:20,
              animation:"tt2FadeUp 0.5s ease 0.12s both",
            }}>
              {/* Left: Transfer history */}
              <TransferHistory clubs={clubs}/>

              {/* Right: Guess area */}
              <div style={{
                background:T.surface,border:`1px solid ${T.border}`,
                borderRadius:16,padding:28,
                display:"flex",flexDirection:"column",
                justifyContent:"center",alignItems:"center",
                minHeight:380,position:"relative",overflow:"visible",
              }}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(79,142,247,0.04),transparent 60%)",pointerEvents:"none",borderRadius:16}}/>

                <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.35rem",letterSpacing:2,color:T.text,marginBottom:22,position:"relative",zIndex:1}}>
                  Who is this player?
                </h3>

                <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:9999,isolation:"isolate"}}>
                  <SearchDropdown
                    players={players}
                    onSelect={setSelected}
                    disabled={!!feedback && feedback === "correct"}
                  />
                </div>

                <button
                  onClick={submitGuess}
                  disabled={!selected}
                  style={{
                    marginTop:16,
                    background:selected?"#4F8EF7":"rgba(79,142,247,0.15)",
                    color:selected?"#fff":"rgba(255,255,255,0.3)",
                    border:"none",borderRadius:12,
                    fontFamily:"'DM Sans',sans-serif",
                    fontSize:"0.92rem",fontWeight:800,
                    padding:"13px 40px",cursor:selected?"pointer":"default",
                    textTransform:"uppercase",letterSpacing:1,
                    boxShadow:selected?"0 6px 20px rgba(79,142,247,0.28)":"none",
                    transition:"all 0.22s ease",
                    position:"relative",zIndex:1,
                  }}
                  onMouseEnter={e=>{ if(selected){e.currentTarget.style.background="#70a8ff";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 28px rgba(79,142,247,0.42)"} }}
                  onMouseLeave={e=>{ if(selected){e.currentTarget.style.background="#4F8EF7";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 6px 20px rgba(79,142,247,0.28)"} }}
                >
                  Submit Guess
                </button>

                <Feedback state={feedback} message={feedbackMsg}/>

                {attempts > 0 && !feedback && (
                  <div style={{marginTop:12,fontSize:"0.78rem",color:T.muted2,textTransform:"uppercase",letterSpacing:1}}>
                    {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",animation:"tt2FadeUp 0.5s ease 0.18s both"}}>
              <button
                onClick={skipPlayer}
                style={{
                  background:"rgba(247,195,68,0.12)",color:T.gold,
                  border:"1px solid rgba(247,195,68,0.28)",borderRadius:12,
                  padding:"13px 28px",fontFamily:"'DM Sans',sans-serif",
                  fontSize:"0.9rem",fontWeight:700,cursor:"pointer",
                  transition:"all 0.22s",textTransform:"uppercase",letterSpacing:0.5,
                  minWidth:150,
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(247,195,68,0.22)";e.currentTarget.style.borderColor="rgba(247,195,68,0.5)";e.currentTarget.style.transform="translateY(-2px)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(247,195,68,0.12)";e.currentTarget.style.borderColor="rgba(247,195,68,0.28)";e.currentTarget.style.transform="none"}}
              >⏭ Skip Player</button>

              <button
                onClick={() => setShowModal(true)}
                style={{
                  background:T.surface,color:T.muted,
                  border:`1px solid ${T.border}`,borderRadius:12,
                  padding:"13px 28px",fontFamily:"'DM Sans',sans-serif",
                  fontSize:"0.9rem",fontWeight:700,cursor:"pointer",
                  transition:"all 0.22s",textTransform:"uppercase",letterSpacing:0.5,
                  minWidth:150,
                }}
                onMouseEnter={e=>{e.currentTarget.style.color=T.text;e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.transform="translateY(-2px)"}}
                onMouseLeave={e=>{e.currentTarget.style.color=T.muted;e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="none"}}
              >? How to Play</button>
            </div>
          </>
        )}

      </main>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .tt2-layout { grid-template-columns: 1fr !important; }
        }
        @keyframes tt2ScorePulse { 0%,100%{filter:drop-shadow(0 0 18px rgba(79,142,247,0.4))} 50%{filter:drop-shadow(0 0 38px rgba(79,142,247,0.75))} }
      `}</style>
    </div>
  );
}