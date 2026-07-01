import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, orderBy, limit,
  onSnapshot, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const BAD_WORDS = ["fuck","shit","bitch","asshole","cunt","bastard"];
function sanitize(text) {
  let out = text;
  BAD_WORDS.forEach(w => { out = out.replace(new RegExp(w, "gi"), "*".repeat(w.length)); });
  return out;
}

const TIER_COLORS = {
  LURKER:"#6b7a99", FAN:"#4F8EF7", VETERAN:"#3DD68C", ULTRA:"#F7C344", LEGEND:"#A855F7",
};

function timeAgo(ts) {
  if (!ts) return "";
  const millis = ts?.toMillis ? ts.toMillis() : ts;
  const diff = Math.floor((Date.now() - millis) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function MessageBubble({ msg, isSelf }) {
  const tierColor = TIER_COLORS[msg.tier] || "rgba(242,242,244,0.4)";
  return (
    <div style={{ display:"flex", flexDirection:isSelf?"row-reverse":"row", alignItems:"flex-start", gap:8, marginBottom:10 }}>
      {!isSelf && (
        <div style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.05)", border:`2px solid ${tierColor}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
          {msg.flag || "🏳️"}
        </div>
      )}
      <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column", alignItems:isSelf?"flex-end":"flex-start" }}>
        <div style={{ background:isSelf?"#3DD68C":"rgba(255,255,255,0.06)", color:isSelf?"#060810":"#F2F2F4", padding:"8px 12px", borderRadius:isSelf?"14px 14px 4px 14px":"4px 14px 14px 14px", fontSize:13, lineHeight:1.45, fontFamily:"'Syne',sans-serif", fontWeight:isSelf?600:400, wordBreak:"break-word", border:isSelf?"none":"1px solid rgba(255,255,255,0.08)" }}>
          {!isSelf && (
            <span style={{ fontSize:12, fontWeight:800, color:tierColor, marginRight:8, display:"inline-block" }}>{msg.nickname}</span>
          )}
          {msg.text}
        </div>

        <span style={{ fontSize:9, color:"rgba(242,242,244,0.28)", marginTop:3, fontFamily:"'Space Mono',monospace" }}>{timeAgo(msg.timestamp)}</span>
      </div>
    </div>
  );
}

// ─── Locked input bar — shows XP progress and how to unlock ──────────────────
function LockedInput({ totalXP = 0 }) {
  const xpNeeded = Math.max(0, 50 - totalXP);
  const progress = Math.min(100, Math.round((totalXP / 50) * 100));
  return (
    <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
      {/* XP progress bar */}
      <div style={{ padding:"10px 14px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", color:"rgba(242,242,244,0.3)", letterSpacing:1 }}>CHAT UNLOCK PROGRESS</span>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", color:"#F7C344", fontWeight:700 }}>{totalXP} / 50 XP</span>
        </div>
        <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden", marginBottom:10 }}>
          <div style={{ width:`${progress}%`, height:"100%", borderRadius:99, background:"linear-gradient(90deg,#F7C344,#ffd700)", transition:"width 0.6s ease", boxShadow:"0 0 8px rgba(247,195,68,0.4)" }} />
        </div>
      </div>
      {/* Locked input */}
      <div style={{ padding:"0 12px 10px", display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ flex:1, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>🔒</span>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"0.78rem", fontWeight:600, color:"rgba(242,242,244,0.35)" }}>Chat locked</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.56rem", color:"rgba(242,242,244,0.22)", marginTop:1 }}>
              {xpNeeded > 0 ? `Earn ${xpNeeded} more XP to unlock` : "Play a game to finish unlocking!"}
            </div>
          </div>
        </div>
        <div style={{ width:42, height:42, borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"rgba(242,242,244,0.15)", flexShrink:0 }}>🔒</div>
      </div>
      {/* How to earn XP tip */}
      <div style={{ margin:"0 12px 12px", padding:"8px 12px", background:"rgba(247,195,68,0.06)", border:"1px solid rgba(247,195,68,0.14)", borderRadius:10, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:18, flexShrink:0 }}>⚡</span>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"0.72rem", color:"rgba(242,242,244,0.45)", lineHeight:1.4 }}>
          Play <span style={{ color:"#F7C344", fontWeight:700 }}>Who Are Ya</span> or <span style={{ color:"#F7C344", fontWeight:700 }}>Match Predictor</span> to earn XP fast
        </div>
      </div>
    </div>
  );
}

// ─── Main GuildChat ───────────────────────────────────────────────────────────
export default function GuildChat({
  guildCode   = "IND",
  currentUid  = "",
  nickname    = "Guest",
  tier        = "LURKER",
  memberCount = 0,
  currentFlag = "🏳️",
  totalXP     = 0,
  canChat     = false,
}) {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [draft,    setDraft]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState("");
  const [toast,    setToast]    = useState("");
  const containerRef = useRef(null);
  const isInitialRef = useRef(true);
  const inputRef  = useRef(null);

  // Everyone reads — no XP gate on the listener
  useEffect(() => {
    if (!guildCode) return;
    const q = query(
      collection(db, "chat"),
      where("guildCode", "==", guildCode),
      orderBy("timestamp", "asc"),
      limit(80),
    );
    const unsub = onSnapshot(q,
      snap => { setMessages(snap.docs.map(d => ({ id:d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false),
    );
    return unsub;
  }, [guildCode]);

  useEffect(() => {
    if (containerRef.current) {
      if (isInitialRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
        isInitialRef.current = false;
      } else {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    }
  }, [messages]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const handleSend = async () => {
    if (!canChat) {
      showToast(`🔒 Earn ${Math.max(0, 50 - totalXP)} more XP to chat`);
      return;
    }
    const text = sanitize(draft.trim());
    if (!text || sending || !currentUid || currentUid === "guest") return;
    setSending(true); setDraft(""); setError("");
    try {
      await addDoc(collection(db, "chat"), {
        guildCode, userId:currentUid, nickname,
        flag:currentFlag, tier, text,
        timestamp:serverTimestamp(), reportCount:0, reported:false,
      });
    } catch {
      setError("Failed to send — try again");
      setTimeout(() => setError(""), 3000);
    }
    setSending(false);
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, display:"flex", flexDirection:"column", height:480, overflow:"hidden", position:"relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"absolute", top:60, left:"50%", transform:"translateX(-50%)", zIndex:50, background:"rgba(12,15,26,0.97)", border:"1px solid rgba(247,195,68,0.35)", borderRadius:999, color:"#F7C344", padding:"9px 20px", fontFamily:"'Space Mono',monospace", fontSize:"0.68rem", fontWeight:700, whiteSpace:"nowrap", pointerEvents:"none", boxShadow:"0 8px 28px rgba(0,0,0,0.5)", animation:"toastIn 0.2s ease" }}>
          {toast}
          <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        </div>
      )}

      {/* Header */}
      <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>💬</span>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1rem", letterSpacing:2, color:"#F2F2F4", lineHeight:1 }}>GUILD CHAT</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.55rem", color:"rgba(242,242,244,0.35)", marginTop:2 }}>{memberCount.toLocaleString()} members</div>
          </div>
        </div>
        {!canChat ? (
          <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(247,195,68,0.08)", border:"1px solid rgba(247,195,68,0.2)", borderRadius:99, padding:"4px 10px" }}>
            <span style={{ fontSize:11 }}>👁️</span>
            <span style={{ fontSize:10, color:"#F7C344", fontWeight:700, fontFamily:"'Space Mono',monospace" }}>Read only</span>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(61,214,140,0.08)", border:"1px solid rgba(61,214,140,0.2)", borderRadius:99, padding:"4px 10px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#3DD68C", boxShadow:"0 0 5px #3DD68C" }} />
            <span style={{ fontSize:11, color:"#3DD68C", fontWeight:700, fontFamily:"'Space Mono',monospace" }}>Live</span>
          </div>
        )}
      </div>

      {/* Messages — visible to ALL users regardless of XP */}
      <div ref={containerRef} style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column" }}>
        {loading && (
          <div style={{ display:"flex", justifyContent:"center", padding:20 }}>
            <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.07)", borderTopColor:"#F7C344", animation:"spin 0.7s linear infinite" }} />
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 0", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>💬</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.65rem", color:"rgba(242,242,244,0.28)", letterSpacing:1 }}>No messages yet</div>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isSelf={msg.userId === currentUid} />
        ))}
      </div>

      {/* Error bar */}
      {error && (
        <div style={{ padding:"6px 16px", background:"rgba(232,64,64,0.1)", borderTop:"1px solid rgba(232,64,64,0.2)", fontFamily:"'Space Mono',monospace", fontSize:"0.62rem", color:"#E84040", fontWeight:600 }}>{error}</div>
      )}

      {/* Bottom — unlocked input OR locked progress bar */}
      {canChat ? (
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
          <div style={{ padding:"10px 12px 8px", display:"flex", gap:8, alignItems:"center" }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say something to your guild…"
              maxLength={200}
              style={{ flex:1, background:"rgba(255,255,255,0.05)", border:`1px solid ${draft?"rgba(255,255,255,0.13)":"rgba(255,255,255,0.07)"}`, borderRadius:12, padding:"10px 14px", fontSize:13, color:"#F2F2F4", outline:"none", fontFamily:"'Syne',sans-serif", transition:"border-color 0.2s" }}
            />
            <button onClick={handleSend} disabled={!draft.trim()||sending}
              style={{ width:42, height:42, borderRadius:12, background:draft.trim()?"#3DD68C":"rgba(255,255,255,0.06)", border:"none", cursor:draft.trim()?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, transition:"all 0.15s", flexShrink:0, color:draft.trim()?"#060810":"rgba(242,242,244,0.2)" }}>
              {sending ? "…" : "➤"}
            </button>
          </div>
          <div style={{ padding:"0 14px 8px", textAlign:"right" }}>
            <span style={{ fontSize:9, color:"rgba(242,242,244,0.2)", fontFamily:"'Space Mono',monospace" }}>{draft.length}/200</span>
          </div>
        </div>
      ) : (
        <LockedInput totalXP={totalXP} />
      )}
    </div>
  );
}