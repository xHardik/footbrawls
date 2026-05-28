import { useState, useEffect, useRef } from "react";

// In production, swap the mock helpers at the bottom for real Firebase calls:
//   import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
//   import { db } from "../firebase";

const C = {
  pitch: "#060f1c",
  card: "#0d1a2d",
  card2: "#111f35",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  gold: "#f0c040",
  goldBg: "rgba(240,192,64,0.12)",
  goldBorder: "rgba(240,192,64,0.28)",
  green: "#00d48a",
  greenBg: "rgba(0,212,138,0.11)",
  greenBorder: "rgba(0,212,138,0.3)",
  red: "#ff3d5c",
  blue: "#4a9eff",
  purple: "#8b5cf6",
  text: "#dde6f5",
  muted: "rgba(180,205,240,0.4)",
  muted2: "rgba(180,205,240,0.65)",
};

// ─── Tier colours (PRD §7.1) ──────────────────────────────────────────────────
const TIER_COLOR = {
  Lurker:  C.muted2,
  Fan:     C.blue,
  Veteran: C.green,
  Ultra:   C.gold,
  Legend:  "#a78bfa",
};

// ─── Profanity filter (PRD §13: "ships before any users") ────────────────────
// Replace with a proper word-list or API in production.
const BAD_WORDS = ["badword1", "badword2"]; // placeholder
function sanitize(text) {
  let out = text;
  BAD_WORDS.forEach((w) => {
    out = out.replace(new RegExp(w, "gi"), "*".repeat(w.length));
  });
  return out;
}

// ─── Mock data (replace with Firestore onSnapshot) ───────────────────────────
const MOCK_MESSAGES = [
  { id: "1", uid: "u1", nickname: "Rishi_7",  tier: "Fan",     text: "Let's gooo India!! 🇮🇳", ts: Date.now() - 240000 },
  { id: "2", uid: "u2", nickname: "Priya_10", tier: "Veteran", text: "Who Are Ya in 2 today 🔥", ts: Date.now() - 180000 },
  { id: "3", uid: "u3", nickname: "Arjun_CF", tier: "Ultra",   text: "Castle looking strong, 6k HP already", ts: Date.now() - 120000 },
  { id: "4", uid: "u4", nickname: "Sneha_11", tier: "Lurker",  text: "Anyone wanna raid? I need the curse lifted 💀", ts: Date.now() - 60000 },
  { id: "5", uid: "u2", nickname: "Priya_10", tier: "Veteran", text: "I'm in @Sneha_11, match predictor done ✅", ts: Date.now() - 30000 },
];

function mockSendMessage(guildCode, msg) {
  // In production: addDoc(collection(db, "chat"), { guildCode, ...msg, ts: serverTimestamp() })
  return Promise.resolve({ id: String(Date.now()), ...msg });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isSelf }) {
  const tierColor = TIER_COLOR[msg.tier] || C.muted2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isSelf ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 10,
      }}
    >
      {/* Avatar */}
      {!isSelf && (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: C.card2,
            border: `2px solid ${tierColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: tierColor,
            flexShrink: 0,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: 0.5,
          }}
        >
          {msg.nickname[0].toUpperCase()}
        </div>
      )}

      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
        {/* Nickname + tier */}
        {!isSelf && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: tierColor,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {msg.nickname}
            </span>
            <span
              style={{
                fontSize: 9,
                color: tierColor,
                background: `${tierColor}18`,
                border: `1px solid ${tierColor}33`,
                borderRadius: 99,
                padding: "1px 6px",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
              }}
            >
              {msg.tier}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          style={{
            background: isSelf ? C.green : C.card2,
            color: isSelf ? "#060f1c" : C.text,
            padding: "8px 12px",
            borderRadius: isSelf ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
            fontSize: 13,
            lineHeight: 1.45,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: isSelf ? 600 : 400,
            wordBreak: "break-word",
          }}
        >
          {msg.text}
        </div>

        {/* Timestamp */}
        <span style={{ fontSize: 9, color: C.muted, marginTop: 3, fontFamily: "'Outfit', sans-serif" }}>
          {timeAgo(msg.ts)}
        </span>
      </div>
    </div>
  );
}

// ─── System message (XP events, curse lifts, etc.) ───────────────────────────
function SystemMessage({ text }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        margin: "8px 0",
      }}
    >
      <div
        style={{
          background: C.goldBg,
          border: `1px solid ${C.goldBorder}`,
          borderRadius: 99,
          padding: "3px 12px",
          fontSize: 11,
          color: C.gold,
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 0 8px 8px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: C.muted,
            animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Main GuildChat ───────────────────────────────────────────────────────────
/**
 * Props:
 *   guildCode  {string}  — Firestore guildCode, used to filter /chat collection
 *   currentUid {string}  — current user's Firebase uid
 *   nickname   {string}  — current user's display name
 *   tier       {string}  — current user's tier label
 *   memberCount {number} — shown in header
 */
export default function GuildChat({
  guildCode = "IND",
  currentUid = "u1",
  nickname = "Rishi_7",
  tier = "Fan",
  memberCount = 3241,
}) {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(12); // mock online count
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── In production: replace with Firestore listener ──────────────────────────
  // useEffect(() => {
  //   const q = query(
  //     collection(db, "chat"),
  //     where("guildCode", "==", guildCode),
  //     orderBy("ts", "asc"),
  //     limit(100)
  //   );
  //   const unsub = onSnapshot(q, (snap) => {
  //     setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  //   });
  //   return unsub;
  // }, [guildCode]);

  const handleSend = async () => {
    const text = sanitize(draft.trim());
    if (!text || sending) return;
    setSending(true);
    setDraft("");

    const msg = { uid: currentUid, nickname, tier, text, ts: Date.now() };
    // Optimistic update
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, ...msg }]);
    await mockSendMessage(guildCode, msg);
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        height: 480,
        fontFamily: "'Outfit', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <div>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 16,
                color: C.text,
                letterSpacing: 0.5,
                lineHeight: 1,
              }}
            >
              GUILD CHAT
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              {memberCount.toLocaleString()} members
            </div>
          </div>
        </div>

        {/* Online pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: C.greenBg,
            border: `1px solid ${C.greenBorder}`,
            borderRadius: 99,
            padding: "4px 10px",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C.green,
              boxShadow: `0 0 5px ${C.green}`,
            }}
          />
          <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{online} online</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SystemMessage text="⚡ India is BLESSED — +25% XP for 18h" />

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isSelf={msg.uid === currentUid} />
        ))}

        <TypingDots />
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say something to your guild..."
          maxLength={200}
          style={{
            flex: 1,
            background: C.card2,
            border: `1px solid ${draft ? C.borderHover : C.border}`,
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            color: C.text,
            outline: "none",
            fontFamily: "'Outfit', sans-serif",
            transition: "border-color 0.2s",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: draft.trim() ? C.green : C.border,
            border: "none",
            cursor: draft.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          {sending ? "…" : "➤"}
        </button>
      </div>

      {/* Character count */}
      <div style={{ padding: "0 14px 8px", textAlign: "right" }}>
        <span style={{ fontSize: 9, color: C.muted }}>
          {draft.length}/200
        </span>
      </div>
    </div>
  );
}

// ─── Dev preview ─────────────────────────────────────────────────────────────
export function GuildChatPreview() {
  return (
    <div style={{ background: C.pitch, minHeight: "100vh", padding: 16 }}>
      <GuildChat
        guildCode="IND"
        currentUid="u1"
        nickname="Rishi_7"
        tier="Fan"
        memberCount={3241}
      />
    </div>
  );
}