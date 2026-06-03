import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, doc, onSnapshot, addDoc,
  query, where, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { getUser } from "../lib/user";
import { COUNTRIES } from "../lib/countries";
import CastleHP from "../components/CastleHP";
import CurseBanner from "../components/CurseBanner";
import GuildChat from "../components/GuildChat";
import { getGuildLevel, getLevelProgress, getHPDisplay, checkUpgrade, GUILD_LEVELS } from "../lib/guildLevels";
import { clearLevelUpNotification } from "../lib/xpEngine";

// ─── Same CSS vars / design tokens as Home.jsx ────────────────────────────────
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

  .fb-bg { position:fixed;inset:0;z-index:0;pointer-events:none; }
  .fb-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.055) 1px,transparent 1px);background-size:56px 56px;animation:fbGridPulse 6s ease-in-out infinite; }
  .fb-grid::after { content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(247,195,68,0.18) 1px,transparent 1px);background-size:56px 56px;background-position:-0.5px -0.5px;animation:fbGridPulse 6s ease-in-out infinite reverse; }
  .fb-blob { position:absolute;border-radius:50%;filter:blur(90px);opacity:0.45; }
  .fb-blob1 { width:700px;height:500px;top:-200px;left:-100px;background:radial-gradient(ellipse,rgba(168,85,247,0.22) 0%,rgba(79,142,247,0.1) 40%,transparent 70%);animation:fbDrift 20s ease-in-out infinite alternate; }
  .fb-blob2 { width:500px;height:400px;bottom:-80px;right:-100px;background:radial-gradient(ellipse,rgba(61,214,140,0.1) 0%,transparent 70%);animation:fbDrift 24s ease-in-out infinite alternate-reverse; }
  .fb-noise { position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.028;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:256px; }

  .fb-nav { position:sticky;top:0;z-index:200;height:64px;padding:0 max(20px,4vw);background:rgba(6,8,16,0.35);backdrop-filter:blur(16px) saturate(1.3);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between; }
  .fb-logo { font-family:'Bebas Neue',sans-serif;font-size:1.85rem;letter-spacing:3px;background:linear-gradient(110deg,#ffe680 0%,#F7C344 40%,#e8a800 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
  .fb-logo em { font-style:normal;-webkit-text-fill-color:#F2F2F4; }
  .fb-logo small { font-family:'Space Mono',monospace;font-size:0.55rem;font-weight:700;letter-spacing:1px;-webkit-text-fill-color:rgba(242,242,244,0.35); }
  .fb-nav-pill { display:flex;align-items:center;gap:7px;padding:7px 14px;border-radius:100px;border:1px solid var(--border2);background:var(--surface);color:var(--muted);font-family:'Space Mono',monospace;font-size:0.66rem;font-weight:700;letter-spacing:0.5px;cursor:pointer;transition:all 0.22s; }
  .fb-nav-pill:hover { background:var(--surface3);border-color:var(--border3);color:var(--text);transform:translateY(-1px); }

  .fb-tab-bar { display:flex;border-bottom:1px solid var(--border);background:rgba(6,8,16,0.6);backdrop-filter:blur(8px);position:sticky;top:64px;z-index:100; }
  .fb-tab { flex:1;padding:14px 4px;background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);font-family:'Space Mono',monospace;font-size:0.62rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all 0.18s; }
  .fb-tab.active { color:var(--accent);border-bottom-color:var(--accent); }
  .fb-tab:hover:not(.active) { color:var(--text); }

  .fb-section-hdr { display:flex;align-items:center;gap:14px;margin-bottom:18px; }
  .fb-section-label { font-family:'Space Mono',monospace;font-size:0.62rem;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;color:var(--muted2);white-space:nowrap; }
  .fb-section-line { flex:1;height:1px;background:linear-gradient(90deg,var(--border2),transparent); }

  .fb-stat-row { display:flex;gap:0;border:1px solid var(--border2);border-radius:14px;overflow:hidden;margin-bottom:24px; }
  .fb-stat-tile { display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 20px;background:var(--surface);border-right:1px solid var(--border2);flex:1; }
  .fb-stat-tile:last-child { border-right:none; }
  .fb-stat-num { font-family:'Bebas Neue',sans-serif;font-size:1.9rem;letter-spacing:1px;color:var(--accent);line-height:1; }
  .fb-stat-lbl { font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted); }

  .fb-bottom-nav { position:fixed;bottom:0;left:0;right:0;z-index:200;display:flex;background:rgba(6,8,16,0.96);backdrop-filter:blur(20px);border-top:1px solid var(--border);padding-bottom:env(safe-area-inset-bottom,0px); }
  .fb-nav-item { position:relative;flex:1;min-width:0;border:none;background:transparent;padding:9px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-family:'Syne',sans-serif;transition:color 0.15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation; }
  .fb-nav-indicator { position:absolute;top:0;left:50%;transform:translateX(-50%);width:26px;height:2px;border-radius:0 0 99px 99px;background:var(--green);box-shadow:0 0 8px var(--green); }

  .fb-member-row { display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);transition:background 0.18s;cursor:default; }
  .fb-member-row:last-child { border-bottom:none; }
  .fb-member-row:hover { background:var(--surface2); }

  .fb-raid-banner {
    position:relative;overflow:hidden;
    background:linear-gradient(135deg,rgba(168,85,247,0.13),rgba(79,142,247,0.06));
    border:1px solid rgba(168,85,247,0.28);border-radius:16px;
    padding:16px;display:flex;align-items:center;gap:14px;
    cursor:pointer;transition:transform 0.22s,box-shadow 0.22s,border-color 0.22s;
  }
  .fb-raid-banner:hover { transform:translateY(-3px);border-color:rgba(168,85,247,0.5);box-shadow:0 14px 40px rgba(168,85,247,0.15); }
  .fb-raid-icon { width:48px;height:48px;border-radius:14px;background:rgba(168,85,247,0.13);border:1px solid rgba(168,85,247,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1); }
  .fb-raid-banner:hover .fb-raid-icon { transform:scale(1.1) rotate(-5deg); }

  @keyframes fbDrift { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(36px,28px) scale(1.1)} }
  @keyframes fbGridPulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.6)} }

  @media(max-width:640px){
    .fb-nav { height:56px;padding:0 16px; }
    .fb-tab { font-size:0.55rem;letter-spacing:1px; }
    .fb-blob { filter:blur(40px);opacity:0.25; }
    .fb-grid { display:none; }
    .fb-stat-row { grid-template-columns:1fr 1fr;display:grid; }
    .fb-stat-tile:nth-child(2){border-right:none;}
    .fb-stat-tile:nth-child(3){border-top:1px solid var(--border2);}
    .fb-stat-tile:last-child{border-top:1px solid var(--border2);}
  }
`;

const TIERS = [
  { name:"lurker",  min:0,    color:"#6b7a99", label:"LURKER",  canChat:false },
  { name:"fan",     min:50,   color:"#4F8EF7", label:"FAN",     canChat:"own" },
  { name:"veteran", min:200,  color:"#3DD68C", label:"VETERAN", canChat:true  },
  { name:"ultra",   min:500,  color:"#F7C344", label:"ULTRA",   canChat:true  },
  { name:"legend",  min:9999, color:"#A855F7", label:"LEGEND",  canChat:true  },
];
function getTier(xp=0) { return [...TIERS].reverse().find(t=>xp>=t.min)||TIERS[0]; }

const FALLBACK_USER = {
  userId:"guest", nickname:"Guest", flag:"🏳️",
  homeCountry:"IND", supportTeam:"IND", totalXP:0, dailyXP:0,
};

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", border:"3px solid rgba(255,255,255,0.07)", borderTopColor:"#F7C344", animation:"spin 0.7s linear infinite" }} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function TopNav({ guildName, flag, members, navigate }) {
  return (
    <nav className="fb-nav">
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => navigate("/")} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:22, lineHeight:1, padding:0, display:"flex", alignItems:"center" }}>
          ‹
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:22 }}>{flag}</span>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.3rem", letterSpacing:2, color:"var(--text)", lineHeight:1 }}>{guildName}</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.55rem", color:"var(--muted2)", letterSpacing:1 }}>{members?.toLocaleString()||"—"} members</div>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <button onClick={() => navigate("/raid")} className="fb-nav-pill" style={{ background:"rgba(168,85,247,0.1)", borderColor:"rgba(168,85,247,0.3)", color:"#A855F7" }}>
          ⚔️ Raid
        </button>
      </div>
    </nav>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id:"chat",    label:"💬 Chat"    },
    { id:"castle",  label:"🏰 Castle"  },
    { id:"ranks",   label:"🏆 Ranks"   },
  ];
  return (
    <div className="fb-tab-bar">
      {tabs.map(t => (
        <button key={t.id} className={`fb-tab${active===t.id?" active":""}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function CastleTab({ guild, user }) {
  const hp              = guild?.castleHP         ?? 0;
  const guildLevel      = guild?.guildLevel       ?? 1;
  const levelConfig     = getGuildLevel(guildLevel);
  const maxHp           = levelConfig.hpCap;
  const levelPct        = getLevelProgress(hp, guildLevel);
  const hpDisplay       = getHPDisplay(hp, guildLevel);
  const curseStatus     = guild?.status           ?? "neutral";
  const blessedSecs     = guild?.blessedUntil
    ? Math.max(0, Math.floor((guild.blessedUntil.toMillis() - Date.now()) / 1000))
    : 18000;
  const raidWins        = guild?.curseRaidWins    ?? 0;
  const raidWinsNeeded  = guild?.curseRaidWinsNeeded ?? 3;
  const contributors    = (guild?.topContributors ?? []).slice(0, 3);
  const warRecord       = guild?.warRecord        ?? { wins:0, losses:0, draws:0 };
  const country         = COUNTRIES?.find(c => c.code === user.homeCountry);
  const teamName        = guild?.name || country?.name || user.homeCountry;
  const lastMatch       = guild?.lastMatch        ?? "—";
  const nextLevel       = guildLevel < 5 ? getGuildLevel(guildLevel + 1) : null;
  const LEVEL_COLORS    = ["#6b7280","#3b82f6","#10b981","#f59e0b","#8b5cf6"];

  return (
    <div style={{ padding:"24px max(16px,3vw)", display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.35s ease both" }}>
      <CurseBanner status={curseStatus} team={teamName} match={lastMatch} blessedSecs={blessedSecs} raidWins={raidWins} raidWinsNeeded={raidWinsNeeded} />
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:14 }}>
          {GUILD_LEVELS.map((lvl, i) => {
            const isActive = lvl.level === guildLevel;
            const isDone   = lvl.level < guildLevel;
            return (
              <div key={lvl.level} style={{ display:"flex", alignItems:"center", flex: i < 4 ? 1 : "unset" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ width:isActive?36:28, height:isActive?36:28, borderRadius:"50%", background:isDone?lvl.color:isActive?lvl.color:"rgba(255,255,255,0.06)", border:`2px solid ${isDone||isActive?lvl.color:"rgba(255,255,255,0.12)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:isActive?18:14, boxShadow:isActive?`0 0 16px ${lvl.color}55`:"none", transition:"all 0.3s ease", flexShrink:0 }}>
                    {isDone ? "✓" : lvl.emoji}
                  </div>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.52rem", fontWeight:700, letterSpacing:0.5, color:isActive?lvl.color:isDone?lvl.color+"aa":"rgba(242,242,244,0.25)", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                    {lvl.name}
                  </span>
                </div>
                {i < 4 && <div style={{ flex:1, height:2, margin:"0 4px", marginBottom:20, background:isDone?`linear-gradient(90deg,${lvl.color},${GUILD_LEVELS[i+1].color})`:"rgba(255,255,255,0.07)", borderRadius:99, transition:"background 0.3s" }}/>}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>{levelConfig.emoji}</span>
            <div>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.1rem", letterSpacing:2, color:levelConfig.color }}>Level {guildLevel} — {levelConfig.name}</span>
              {guildLevel < 5 && <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.54rem", color:"rgba(242,242,244,0.35)", marginTop:1 }}>{hpDisplay} · {levelPct}% to Level {guildLevel + 1}</div>}
              {guildLevel === 5 && <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.54rem", color:"#8b5cf6", marginTop:1 }}>MAX LEVEL REACHED 👑</div>}
            </div>
          </div>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.6rem", color:levelConfig.color, letterSpacing:1, lineHeight:1 }}>{levelPct}%</span>
        </div>
        <div style={{ height:8, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
          <div style={{ width:`${levelPct}%`, height:"100%", borderRadius:99, background:`linear-gradient(90deg,${levelConfig.color},${levelConfig.color}bb)`, boxShadow:`0 0 10px ${levelConfig.color}44`, transition:"width 0.6s ease" }}/>
        </div>
        {nextLevel && (
          <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:`${nextLevel.color}08`, border:`1px solid ${nextLevel.color}20`, borderRadius:10 }}>
            <span style={{ fontSize:16 }}>{nextLevel.emoji}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", fontWeight:700, color:nextLevel.color, letterSpacing:1 }}>NEXT: {nextLevel.name.toUpperCase()}</div>
              <div style={{ fontFamily:"'Syne',monospace", fontSize:"0.68rem", color:"rgba(242,242,244,0.45)", marginTop:2 }}>{nextLevel.perkLabels[0]}</div>
            </div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", color:"rgba(242,242,244,0.3)", textAlign:"right" }}>
              {(levelConfig.hpCap - hp).toLocaleString()}<br/><span style={{ fontSize:"0.5rem" }}>HP needed</span>
            </div>
          </div>
        )}
      </div>
      <CastleHP hp={hp} maxHp={maxHp} contributors={contributors} guildLevel={guildLevel} />
      <div>
        <div className="fb-section-hdr"><span className="fb-section-label">Level {guildLevel} Perks</span><div className="fb-section-line"/></div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {levelConfig.perkLabels.map((perk, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:`${levelConfig.color}08`, border:`1px solid ${levelConfig.color}20`, borderRadius:12 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:levelConfig.color, boxShadow:`0 0 6px ${levelConfig.color}`, flexShrink:0 }}/>
              <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"0.78rem", color:"rgba(242,242,244,0.75)" }}>{perk}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="fb-stat-row">
        {[
          { val:warRecord.wins,     lbl:"Raid Wins",   color:"var(--green)" },
          { val:warRecord.losses,   lbl:"Raid Losses", color:"var(--red)"   },
          { val:warRecord.draws??0, lbl:"Draws",       color:"var(--muted)" },
        ].map(s => (
          <div key={s.lbl} className="fb-stat-tile">
            <span className="fb-stat-num" style={{ color:s.color }}>{s.val}</span>
            <span className="fb-stat-lbl">{s.lbl}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="fb-section-hdr"><span className="fb-section-label">XP Split</span><div className="fb-section-line"/></div>
        <div style={{ display:"flex", gap:12 }}>
          {[
            { label:"Home Country", pct:"80%", color:"var(--green)", desc:"Your flag guild gets this" },
            { label:"Support Team", pct:"20%", color:"var(--blue)",  desc:"Club you support" },
          ].map(x => (
            <div key={x.label} style={{ flex:1, background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:14, padding:"16px 14px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"2.2rem", color:x.color, lineHeight:1 }}>{x.pct}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"var(--muted2)", marginTop:4 }}>{x.label}</div>
              <div style={{ fontSize:"0.7rem", color:"var(--muted)", marginTop:4 }}>{x.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="fb-section-hdr">
          <span className="fb-section-label">Raid Battles</span>
          <div className="fb-section-line"/>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", color:"var(--accent)", letterSpacing:1 }}>STAGE 5</span>
        </div>
        <div className="fb-raid-banner" onClick={() => navigate('/raid')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate('/raid')}>
          <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:60, opacity:0.06, pointerEvents:"none", userSelect:"none" }}>⚔️</div>
          <div className="fb-raid-icon">⚔️</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.2rem", letterSpacing:1.5, display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              Challenge Raid
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.5rem", fontWeight:700, border:"1px solid rgba(247,195,68,0.28)", borderRadius:999, padding:"2px 8px", color:"#F7C344", background:"rgba(247,195,68,0.09)" }}>2x XP on match day</span>
            </div>
            <p style={{ margin:0, fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.4 }}>Find a buddy · 3-act battle · Break curses · Swing castle HP</p>
          </div>
          <span style={{ color:"#A855F7", fontSize:24, fontWeight:900, flexShrink:0 }}>›</span>
        </div>
      </div>
    </div>
  );
}

function RanksTab({ leaderboard, currentUserId }) {
  const medals = ["🥇","🥈","🥉"];
  return (
    <div style={{ padding:"24px max(16px,3vw)", display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.35s ease both" }}>
      <div>
        <div className="fb-section-hdr"><span className="fb-section-label">Today's Top Earners</span><div className="fb-section-line"/></div>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:16, overflow:"hidden" }}>
          {leaderboard.length===0 && (
            <div style={{ padding:"32px 16px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🚀</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.65rem", color:"var(--muted)", letterSpacing:1 }}>No XP earned yet — be first!</div>
            </div>
          )}
          {leaderboard.map((m,i) => {
            const tier = getTier(m.totalXP);
            const isMe = m.userId===currentUserId;
            return (
              <div key={m.userId||i} className="fb-member-row" style={{ background:isMe?"rgba(61,214,140,0.05)":"transparent" }}>
                <span style={{ fontSize:i<3?18:12, width:24, textAlign:"center", flexShrink:0, fontFamily:"'Bebas Neue',sans-serif", color:"var(--accent)", letterSpacing:1 }}>{i<3?medals[i]:i+1}</span>
                <span style={{ fontSize:18, flexShrink:0 }}>{m.flag||"🏳️"}</span>
                <span style={{ flex:1, fontSize:"0.82rem", fontWeight:isMe?700:600, color:isMe?"var(--green)":"var(--text)", fontFamily:"'Syne',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.nickname}{isMe?" (you)":""}</span>
                <span style={{ fontSize:"0.58rem", fontWeight:700, padding:"2px 7px", borderRadius:99, color:tier.color, background:tier.color+"22", border:"1px solid "+tier.color+"44", fontFamily:"'Space Mono',monospace", flexShrink:0, letterSpacing:0.5 }}>{tier.label}</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.1rem", color:"var(--accent)", flexShrink:0, letterSpacing:1, marginLeft:8 }}>+{m.dailyXP??0}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="fb-section-hdr"><span className="fb-section-label">Tier Requirements</span><div className="fb-section-line"/></div>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:16, overflow:"hidden" }}>
          {TIERS.map((t) => (
            <div key={t.name} className="fb-member-row">
              <div style={{ width:10, height:10, borderRadius:"50%", background:t.color, boxShadow:`0 0 6px ${t.color}`, flexShrink:0 }} />
              <span style={{ flex:1, fontSize:"0.82rem", fontWeight:700, color:t.color, fontFamily:"'Syne',sans-serif" }}>{t.label}</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.62rem", color:"var(--muted)" }}>{t.min===0?"0 XP":t.min>=9999?"Top 1% active":`${t.min}+ XP`}</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.58rem", color:"var(--muted2)", marginLeft:12 }}>{t.canChat===false?"Read only":t.canChat==="own"?"Own guild":"All guilds"}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:"rgba(247,195,68,0.06)", border:"1px solid rgba(247,195,68,0.18)", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:24, flexShrink:0 }}>⚡</span>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1rem", letterSpacing:1.5, color:"var(--accent)", marginBottom:3 }}>Daily XP Cap: 200</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"0.73rem", color:"var(--muted)", lineHeight:1.4 }}>80% of your XP goes to your home country castle. 20% to your support team. Curses and blessings modify all XP earned.</div>
        </div>
      </div>
    </div>
  );
}

function ChatTab({ user, guild, tier, canChat }) {
  const memberCount = guild?.memberCount ?? 0;
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, padding:"16px max(16px,3vw)", animation:"fadeUp 0.35s ease both" }}>
      {canChat ? (
        <GuildChat guildCode={user.homeCountry} currentUid={user.userId} nickname={user.nickname} tier={tier.label} memberCount={memberCount} />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, gap:16, padding:"40px 0" }}>
          <span style={{ fontSize:48 }}>🔒</span>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.4rem", letterSpacing:2, color:"var(--text)", marginBottom:8 }}>Chat Locked</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"0.8rem", color:"var(--muted)", lineHeight:1.5, maxWidth:280 }}>Earn <span style={{ color:"var(--accent)", fontWeight:700 }}>50 XP</span> to unlock guild chat. Play games to climb tiers.</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:99, background:"rgba(247,195,68,0.09)", border:"1px solid rgba(247,195,68,0.2)" }}>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.65rem", color:"var(--accent)", fontWeight:700, letterSpacing:1 }}>YOU ARE: {tier.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bottom Nav — accepts toast/setToast as props (Option A) ──────────────────
function BottomNav({ navigate, toast, setToast }) {
  const items = [
    { id:"home",  label:"Games", icon:"⚽", route:"/"      },
    { id:"guild", label:"Guild", icon:"🏰", route:"/guild" },
    { id:"raids", label:"Raids", icon:"⚔️", route:"/raid"  },
    { id:"ranks", label:"Ranks", icon:"🏆", route:null     },
    { id:"me",    label:"Me",    icon:"👤", route:null     },
  ];
  function handleClick(item) {
    if (item.route) navigate(item.route);
    else { setToast("Coming soon ⚡"); setTimeout(() => setToast(""), 2000); }
  }
  return (
    <>
      <nav className="fb-bottom-nav">
        {items.map(item => {
          const active = item.id === "guild";
          return (
            <button key={item.id} className="fb-nav-item" onClick={() => handleClick(item)}
              style={{ color:active?"var(--green)":"rgba(242,242,244,0.38)" }}>
              {active && <span className="fb-nav-indicator"/>}
              <span style={{ fontSize:20, lineHeight:1 }}>{item.icon}</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {toast && (
        <div style={{ position:"fixed", bottom:76, left:"50%", transform:"translateX(-50%)", zIndex:300, background:"rgba(12,15,26,0.96)", border:"1px solid var(--border2)", borderRadius:999, color:"var(--text)", padding:"10px 18px", fontFamily:"'Space Mono',monospace", fontSize:"0.76rem", fontWeight:700, whiteSpace:"nowrap", pointerEvents:"none", animation:"fadeUp 0.22s ease" }}>
          {toast}
        </div>
      )}
    </>
  );
}

// ─── Main Guild Page ──────────────────────────────────────────────────────────
export default function Guild() {
  const navigate = useNavigate();
  const [user]                        = useState(() => getUser() || FALLBACK_USER);
  const [guild,          setGuild]    = useState(null);
  const [guildLoading,   setGuildLoading] = useState(true);
  const [leaderboard,    setLeaderboard]  = useState([]);
  const [tab,            setTab]          = useState("chat");
  const [toast,          setToast]        = useState(""); // ← lifted from BottomNav

  // Inject CSS once
  useEffect(() => {
    if (!document.getElementById("fb-guild-css")) {
      const s = document.createElement("style");
      s.id = "fb-guild-css";
      s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // Guild doc listener
  useEffect(() => {
    if (!user?.homeCountry) { setGuildLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "guilds", user.homeCountry),
      snap => { setGuild(snap.exists() ? {id:snap.id,...snap.data()} : null); setGuildLoading(false); },
      () => setGuildLoading(false),
    );
    return unsub;
  }, [user.homeCountry]);

  // Leaderboard listener
  useEffect(() => {
    if (!user?.homeCountry) return;
    const today = new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, "users"),
      where("homeCountry", "==", user.homeCountry),
      where("dailyXPDate", "==", today),
      orderBy("dailyXP", "desc"),
      limit(10),
    );
    const unsub = onSnapshot(q,
      snap => setLeaderboard(snap.docs.map(d => ({id:d.id,...d.data()}))),
      () => {},
    );
    return unsub;
  }, [user.homeCountry]);

  // Level-up celebration toast
  useEffect(() => {
    if (!guild?.levelUpPending) return;
    const config = getGuildLevel(guild.levelUpTo);
    setToast(`🎉 Guild upgraded to ${config.emoji} ${config.name}!`);
    setTimeout(() => setToast(""), 3000);
    clearLevelUpNotification(user.homeCountry);
  }, [guild?.levelUpPending]);

  const tier      = getTier(user.totalXP);
  const canChat   = tier.canChat === true || tier.canChat === "own";
  const country   = COUNTRIES?.find(c => c.code === user.homeCountry);
  const guildName = guild?.name || country?.name + " Guild" || user.homeCountry + " Guild";
  const guildFlag = guild?.flag || country?.flag || "🏳️";
  const members   = guild?.memberCount ?? 0;

  return (
    <div style={{ fontFamily:"'Syne',sans-serif", background:"#060810", color:"#F2F2F4", minHeight:"100vh", position:"relative", paddingBottom:80 }}>
      <div className="fb-bg">
        <div className="fb-grid"/>
        <div className="fb-blob fb-blob1"/>
        <div className="fb-blob fb-blob2"/>
      </div>
      <div className="fb-noise"/>

      <TopNav guildName={guildName} flag={guildFlag} members={members} navigate={navigate} />
      <TabBar active={tab} onChange={setTab} />

      <div style={{ position:"relative", zIndex:1 }}>
        {guildLoading ? <Spinner /> : (
          <>
            {tab==="chat"   && <ChatTab   user={user} guild={guild} tier={tier} canChat={canChat} />}
            {tab==="castle" && <CastleTab guild={guild} user={user} />}
            {tab==="ranks"  && <RanksTab  leaderboard={leaderboard} currentUserId={user.userId} />}
          </>
        )}
      </div>

      {/* BottomNav now receives toast state as props */}
      <BottomNav navigate={navigate} toast={toast} setToast={setToast} />
    </div>
  );
}