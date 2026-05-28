import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { getUser } from "../lib/user";
import { collection, doc, onSnapshot, addDoc, query, where, orderBy, limit, serverTimestamp } from "firebase/firestore";

const C = {
  pitch:"#060f1c", card:"#0d1a2d", card2:"#111f35",
  border:"rgba(255,255,255,0.07)", borderHover:"rgba(255,255,255,0.14)",
  gold:"#f0c040", goldBg:"rgba(240,192,64,0.12)", goldBorder:"rgba(240,192,64,0.28)",
  green:"#00d48a", greenBg:"rgba(0,212,138,0.11)", greenBorder:"rgba(0,212,138,0.3)",
  red:"#ff3d5c", redBg:"rgba(255,61,92,0.12)", redBorder:"rgba(255,61,92,0.3)",
  blue:"#4a9eff", purple:"#8b5cf6", purpleBg:"rgba(139,92,246,0.13)", purpleBorder:"rgba(139,92,246,0.3)",
  text:"#dde6f5", muted:"rgba(180,205,240,0.4)", muted2:"rgba(180,205,240,0.65)",
};

const injectFonts = () => {
  if (document.getElementById("fb-fonts")) return;
  const link = document.createElement("link");
  link.id = "fb-fonts"; link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Outfit:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
};

const TIERS = [
  { name:"lurker",  min:0,    color:"#555566", label:"LURKER",  canChat:false },
  { name:"fan",     min:50,   color:"#60a5fa", label:"FAN",     canChat:"own" },
  { name:"veteran", min:200,  color:"#00d48a", label:"VETERAN", canChat:true  },
  { name:"ultra",   min:500,  color:"#f0c040", label:"ULTRA",   canChat:true  },
  { name:"legend",  min:9999, color:"#8b5cf6", label:"LEGEND",  canChat:true  },
];
function getTier(xp=0) { return [...TIERS].reverse().find(t=>xp>=t.min)||TIERS[0]; }

const BAD_WORDS = ["fuck","shit","bitch","asshole","cunt"];
function containsProfanity(text) { return BAD_WORDS.some(w=>text.toLowerCase().includes(w)); }

function timeAgo(ts) {
  if (!ts) return "";
  const d = Math.floor((Date.now()-ts.toMillis())/1000);
  if (d<60) return d+"s";
  if (d<3600) return Math.floor(d/60)+"m";
  return Math.floor(d/3600)+"h";
}

// ─── FALLBACK USER (so the page never gets stuck on spinner) ─────────────────
const FALLBACK_USER = {
  userId: "guest",
  nickname: "Guest",
  flag: "🏳️",
  homeCountry: "IND",
  supportTeam: "IND",
  totalXP: 0,
  dailyXP: 0,
};

function TopNav({ guildName, flag, navigate }) {
  return (
    <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(6,15,28,0.95)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"0 16px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <button onClick={()=>navigate("/")} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:22, lineHeight:1, padding:"0 8px 0 0", display:"flex", alignItems:"center" }}>‹</button>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:20 }}>{flag}</span>
        <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, color:C.text, letterSpacing:0.5 }}>{guildName}</span>
      </div>
      <button onClick={()=>navigate("/raid")} style={{ background:C.purpleBg, border:"1px solid rgba(139,92,246,0.3)", borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:700, color:C.purple, cursor:"pointer", fontFamily:"'Outfit', sans-serif" }}>Raid</button>
    </nav>
  );
}

function CastleHPCard({ hp, maxHp, warRecord }) {
  const pct = Math.min(100, Math.round((hp/maxHp)*100));
  const status = pct>=70?"Fortress":pct>=30?"Standing":"Weakened";
  const sc = pct>=70?C.green:pct>=30?C.gold:C.red;
  const bar = pct>=70?"linear-gradient(90deg,#00a86b,#00d48a)":pct>=30?"linear-gradient(90deg,#b8860b,#f0c040)":"linear-gradient(90deg,#8b0000,#ff3d5c)";
  return (
    <div style={{ margin:"12px 16px 0", background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"14px 16px" }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:0.7, fontWeight:600, fontFamily:"'Outfit', sans-serif" }}>🏰 Castle HP</div>
        <div>
          <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:26, color:sc, letterSpacing:1 }}>{hp.toLocaleString()}</span>
          <span style={{ fontSize:12, color:C.muted, marginLeft:3, fontFamily:"'Outfit', sans-serif" }}>/ {maxHp.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ background:C.borderHover, borderRadius:99, height:8, overflow:"hidden", marginBottom:8 }}>
        <div style={{ width:pct+"%", height:"100%", borderRadius:99, background:bar, transition:"width 0.8s ease" }} />
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontFamily:"'Outfit', sans-serif" }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:sc, flexShrink:0 }} />
          <span style={{ color:sc, fontWeight:600 }}>{status}</span>
        </div>
        {warRecord && (
          <div style={{ display:"flex", gap:8, fontSize:11, fontFamily:"'Outfit', sans-serif" }}>
            <span style={{ color:C.green, fontWeight:700 }}>{warRecord.wins}W</span>
            <span style={{ color:C.muted }}>·</span>
            <span style={{ color:C.red, fontWeight:700 }}>{warRecord.losses}L</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardCard({ members }) {
  return (
    <div style={{ margin:"12px 16px 0", background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" }}>
      <div style={{ padding:"11px 14px 9px", borderBottom:"1px solid rgba(255,255,255,0.07)", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14, color:C.text, letterSpacing:1 }}>TODAY TOP EARNERS</div>
      {members.length===0 && (
        <div style={{ padding:"16px 14px", fontSize:12, color:C.muted, fontFamily:"'Outfit', sans-serif" }}>No XP earned yet today. Be the first!</div>
      )}
      {members.map((m,i) => {
        const tier = getTier(m.totalXP);
        return (
          <div key={m.userId||i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderBottom:i<members.length-1?"1px solid rgba(255,255,255,0.07)":"none" }}>
            <span style={{ fontSize:11, width:20, textAlign:"center", flexShrink:0, color:C.gold, fontWeight:700, fontFamily:"'Barlow Condensed', sans-serif" }}>{i+1}</span>
            <span style={{ fontSize:16, flexShrink:0 }}>{m.flag||"?"}</span>
            <span style={{ flex:1, fontSize:13, fontWeight:600, color:C.text, fontFamily:"'Outfit', sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.nickname}</span>
            <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:99, color:tier.color, background:tier.color+"22", border:"1px solid "+tier.color+"44", fontFamily:"'Outfit', sans-serif", flexShrink:0 }}>{tier.label}</span>
            <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:15, color:C.gold, flexShrink:0 }}>+{m.dailyXP}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChatMessage({ msg, isOwn }) {
  const tier = getTier(msg.totalXP||0);
  return (
    <div style={{ display:"flex", gap:8, flexDirection:isOwn?"row-reverse":"row", marginBottom:10, alignItems:"flex-end" }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:C.card2, border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{msg.flag||"?"}</div>
      <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column", alignItems:isOwn?"flex-end":"flex-start", gap:3 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.muted2, fontFamily:"'Outfit', sans-serif" }}>{msg.nickname}</span>
          <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:99, color:tier.color, background:tier.color+"22", border:"1px solid "+tier.color+"44", fontFamily:"'Outfit', sans-serif" }}>{tier.label}</span>
          <span style={{ fontSize:10, color:C.muted, fontFamily:"'Outfit', sans-serif" }}>{timeAgo(msg.timestamp)}</span>
        </div>
        <div style={{ background:isOwn?C.greenBg:C.card2, border:"1px solid "+(isOwn?C.greenBorder:"rgba(255,255,255,0.07)"), borderRadius:isOwn?"14px 14px 4px 14px":"14px 14px 14px 4px", padding:"8px 12px", fontSize:13, color:C.text, lineHeight:1.45, fontFamily:"'Outfit', sans-serif", wordBreak:"break-word" }}>
          {msg.text}
        </div>
      </div>
    </div>
  );
}

function ChatInput({ onSend, canChat, tier }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  function handleSend() {
    const t = text.trim();
    if (!t) return;
    if (containsProfanity(t)) { setErr("Message blocked — keep it clean 🧹"); setTimeout(()=>setErr(""),2500); return; }
    onSend(t); setText(""); setErr("");
  }
  if (!canChat) return (
    <div style={{ padding:"12px 16px", background:C.card, borderTop:"1px solid rgba(255,255,255,0.07)", textAlign:"center", fontSize:12, color:C.muted, fontFamily:"'Outfit', sans-serif" }}>
      Earn <span style={{ color:C.gold, fontWeight:700 }}>50 XP</span> to unlock chat · You are <span style={{ color:tier.color, fontWeight:700 }}>{tier.label}</span>
    </div>
  );
  return (
    <div style={{ padding:"10px 16px 12px", background:C.card, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
      {err && <div style={{ marginBottom:6, fontSize:11, color:C.red, fontFamily:"'Outfit', sans-serif", fontWeight:600 }}>{err}</div>}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()} placeholder="Say something to your guild…" maxLength={200}
          style={{ flex:1, background:C.card2, border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"10px 14px", fontSize:13, color:C.text, outline:"none", fontFamily:"'Outfit', sans-serif" }} />
        <button onClick={handleSend} disabled={!text.trim()}
          style={{ background:text.trim()?C.green:"rgba(255,255,255,0.07)", border:"none", borderRadius:12, width:42, height:42, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, cursor:text.trim()?"pointer":"default", flexShrink:0, color:text.trim()?"#060f1c":C.muted, fontFamily:"'Outfit', sans-serif", transition:"all 0.15s" }}>
          GO
        </button>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [{id:"chat",label:"💬 Chat"},{id:"stats",label:"🏰 Castle"},{id:"ranks",label:"🏆 Ranks"}];
  return (
    <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.07)", background:C.card, padding:"0 16px", gap:4 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>onChange(t.id)}
          style={{ flex:1, padding:"11px 4px", background:"none", border:"none", borderBottom:active===t.id?`2px solid ${C.green}`:"2px solid transparent", color:active===t.id?C.green:C.muted, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'Outfit', sans-serif", marginBottom:-1, transition:"color 0.15s" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function BottomNav({ navigate }) {
  const items = [
    {id:"home",  label:"Games", icon:"⚽", route:"/"},
    {id:"guild", label:"Guild", icon:"🏰", route:"/guild"},
    {id:"raids", label:"Raids", icon:"⚔️", route:"/raid"},
    {id:"ranks", label:"Ranks", icon:"🏆", route:"/leaderboard"},
    {id:"profile",label:"Me",  icon:"👤", route:"/profile"},
  ];
  return (
    <nav style={{ display:"flex", borderTop:"1px solid rgba(255,255,255,0.07)", background:"rgba(6,15,28,0.98)", backdropFilter:"blur(16px)", position:"sticky", bottom:0, zIndex:50, paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
      {items.map(item => {
        const isActive = item.id==="guild";
        return (
          <button key={item.id} onClick={()=>navigate(item.route)}
            style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"10px 4px 9px", fontSize:9, fontWeight:600, color:isActive?C.green:C.muted, cursor:"pointer", border:"none", background:"transparent", fontFamily:"'Outfit', sans-serif", letterSpacing:0.4, textTransform:"uppercase", position:"relative", transition:"color 0.15s", WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>
            {isActive && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:28, height:2, background:C.green, borderRadius:"0 0 99px 99px", boxShadow:`0 0 8px ${C.green}` }} />}
            <span style={{ fontSize:20, lineHeight:1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Spinner (used only while Firestore guild data loads, NOT for user) ───────
function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ width:24, height:24, borderRadius:"50%", border:"2.5px solid #1e293b", borderTopColor:C.green, animation:"spin 0.7s linear infinite" }} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

export default function Guild() {
  const navigate = useNavigate();

  // FIX 1: user loads synchronously from getUser() — if null use fallback so
  // the page always renders instead of spinning forever.
  const [user] = useState(() => getUser() || FALLBACK_USER);

  const [guild, setGuild] = useState(null);
  const [guildLoading, setGuildLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab] = useState("chat");
  const chatBottomRef = useRef(null);

  useEffect(() => { injectFonts(); }, []);

  // FIX 2: subscribe to guild using user.homeCountry (always available now)
  useEffect(() => {
    if (!user?.homeCountry) { setGuildLoading(false); return; }
    const unsub = onSnapshot(doc(db, "guilds", user.homeCountry), snap => {
      setGuild(snap.exists() ? { id:snap.id, ...snap.data() } : null);
      setGuildLoading(false);
    }, () => setGuildLoading(false)); // FIX 3: handle Firestore errors gracefully
    return unsub;
  }, [user.homeCountry]);

  useEffect(() => {
    if (!user?.homeCountry) return;
    const q = query(
      collection(db, "chat"),
      where("guildCode", "==", user.homeCountry),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})).reverse());
    }, () => {}); // silence errors if index not ready yet
    return unsub;
  }, [user.homeCountry]);

  useEffect(() => {
    if (!user?.homeCountry) return;
    const today = new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, "users"),
      where("homeCountry", "==", user.homeCountry),
      where("dailyXPDate", "==", today),
      orderBy("dailyXP", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, snap => {
      setLeaderboard(snap.docs.map(d=>({id:d.id,...d.data()})));
    }, () => {});
    return unsub;
  }, [user.homeCountry]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (tab==="chat") chatBottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, tab]);

  async function handleSend(text) {
    if (!user || user.userId==="guest") return;
    await addDoc(collection(db, "chat"), {
      guildCode: user.homeCountry,
      userId: user.userId,
      nickname: user.nickname,
      flag: user.flag || "?",
      totalXP: user.totalXP || 0,
      text,
      timestamp: serverTimestamp(),
      reportCount: 0,
      reported: false,
    });
  }

  const tier       = getTier(user.totalXP);
  const canChat    = tier.canChat===true || tier.canChat==="own";
  const hp         = guild?.castleHP || 0;
  const maxHp      = guild?.castleHPCap || 10000;
  const warRecord  = guild?.warRecord || { wins:0, losses:0 };
  const guildName  = guild?.name || user.homeCountry + " Guild";
  const guildFlag  = guild?.flag || user.flag || "🏳️";

  return (
    <div style={{ background:C.pitch, minHeight:"100vh", maxWidth:"100%" ,padding:"0", margin:"0 auto", fontFamily:"'Outfit', sans-serif", display:"flex", flexDirection:"column" }}>
      <TopNav guildName={guildName} flag={guildFlag} navigate={navigate} />
      <TabBar active={tab} onChange={setTab} />

      {tab==="chat" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 16px 4px", display:"flex", flexDirection:"column" }}>
            {messages.length===0 && !guildLoading && (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>💬</div>
                  <div style={{ fontSize:13, color:C.muted, fontFamily:"'Outfit', sans-serif" }}>No messages yet. Be the first!</div>
                </div>
              </div>
            )}
            {guildLoading && <Spinner />}
            {messages.map(msg => (
              <ChatMessage key={msg.id} msg={msg} isOwn={msg.userId===user.userId} />
            ))}
            <div ref={chatBottomRef} />
          </div>
          <ChatInput onSend={handleSend} canChat={canChat} tier={tier} />
        </div>
      )}

      {tab==="stats" && (
        <div style={{ flex:1, overflowY:"auto", paddingBottom:16 }}>
          {guildLoading ? <Spinner /> : (
            <>
              <CastleHPCard hp={hp} maxHp={maxHp} warRecord={warRecord} />
              <div style={{ margin:"12px 16px 0", display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  {label:"Fortress", desc:"Defender advantage in raids",   color:C.green},
                  {label:"Standing", desc:"No raid bonus",                  color:C.gold},
                  {label:"Weakened", desc:"Attacker advantage in raids",    color:C.red},
                ].map(s => (
                  <div key={s.label} style={{ background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:s.color, fontFamily:"'Outfit', sans-serif" }}>{s.label}</span>
                      <span style={{ fontSize:12, color:C.muted, fontFamily:"'Outfit', sans-serif" }}> — {s.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ margin:"12px 16px 0", background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"14px 16px" }}>
                <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:0.7, fontWeight:600, fontFamily:"'Outfit', sans-serif", marginBottom:12 }}>XP SPLIT</div>
                <div style={{ display:"flex", gap:10 }}>
                  {[{label:"Home country",pct:"80%",color:C.green},{label:"Support team",pct:"20%",color:C.blue}].map(x => (
                    <div key={x.label} style={{ flex:1, background:C.card2, border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
                      <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:24, color:x.color }}>{x.pct}</div>
                      <div style={{ fontSize:11, color:C.muted, fontFamily:"'Outfit', sans-serif", marginTop:2 }}>{x.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab==="ranks" && (
        <div style={{ flex:1, overflowY:"auto", paddingBottom:16 }}>
          {guildLoading ? <Spinner /> : <LeaderboardCard members={leaderboard} />}
          <div style={{ margin:"12px 16px 0", background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"11px 14px 9px", borderBottom:"1px solid rgba(255,255,255,0.07)", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14, color:C.text, letterSpacing:1 }}>TIER REQUIREMENTS</div>
            {TIERS.map((t,i) => (
              <div key={t.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:i<TIERS.length-1?"1px solid rgba(255,255,255,0.07)":"none" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:t.color, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:13, fontWeight:700, color:t.color, fontFamily:"'Outfit', sans-serif" }}>{t.label}</span>
                <span style={{ fontSize:12, color:C.muted, fontFamily:"'Outfit', sans-serif" }}>{t.min===0?"0 XP":t.min>=9999?"Top 1%":t.min+"+ XP"}</span>
                <span style={{ fontSize:11, color:C.muted, fontFamily:"'Outfit', sans-serif" }}>{t.canChat===false?"Read only":t.canChat==="own"?"Own guild":"All guilds"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav navigate={navigate} />
    </div>
  );
}