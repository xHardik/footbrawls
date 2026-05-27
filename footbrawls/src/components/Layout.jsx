// src/components/Layout.jsx
// Persistent sidebar layout wrapping all game pages
// Shows guild HP, curse, XP progress, and game nav

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser } from '../lib/user';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const GAMES = [
  { name: 'Who Are Ya?',    path: '/games/whoareya',      icon: '🔍', xp: 25,  key: 'footbrawls_whoareya' },
  { name: 'Player Wordle',  path: '/games/wordle',        icon: '🔤', xp: 20,  key: 'footbrawls_wordle_history' },
  { name: 'Higher or Lower',path: '/games/higherlower',   icon: '📊', xp: 15,  key: 'footbrawls_higherlower' },
  { name: 'Transfer Trail', path: '/games/transfertrail', icon: '🔄', xp: 20,  key: 'footbrawls_transfertrail' },
  { name: 'Match Predictor',path: '/games/matchpredictor',icon: '🎯', xp: 100, key: 'footbrawls_matchpredictor' },
  { name: 'Daily Trivia',   path: '/games/trivia',        icon: '🧠', xp: 80,  key: 'footbrawls_trivia' },
  { name: 'Penalty Nerve',  path: '/games/penaltynerve',  icon: '⚽', xp: 30,  key: 'footbrawls_penaltynerve' },
  { name: 'Rapid Fire',     path: '/games/rapidfire',     icon: '⚡', xp: 20,  key: 'footbrawls_rapidfire' },
];

const CURSE_COLORS = {
  null:          { color: '#00ff87', label: 'No Curse',     icon: '✨' },
  blessed:       { color: '#00ff87', label: 'Blessed +25%', icon: '🌟' },
  cursed:        { color: '#f7c344', label: 'Cursed -25%',  icon: '💀' },
  double_cursed: { color: '#ff4444', label: 'Double Curse', icon: '💀💀' },
  death_curse:   { color: '#ff0000', label: 'Death Curse',  icon: '☠️' },
};

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isGameDoneToday(key) {
  try {
    const today = getTodayKey();
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    // WhoAreYa stores {date, won} — others store {[date]: ...}
    if (data.date === today) return true;
    if (data[today]) return true;
    return false;
  } catch { return false; }
}

export default function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = getUser();
  const [guild, setGuild]         = useState(null);
  const [userXP, setUserXP]       = useState(0);
  const [sidebarOpen, setSidebar] = useState(false);

  // ── Live guild data ──
  useEffect(() => {
    if (!user?.homeCountry) return;
    const ref = doc(db, 'guilds', user.homeCountry);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setGuild(snap.data());
    });
    return () => unsub();
  }, [user?.homeCountry]);

  // ── Daily XP from localStorage ──
  useEffect(() => {
    const today = getTodayKey();
    const userData = JSON.parse(localStorage.getItem('footbrawls_user') || '{}');
    if (userData.dailyXPDate === today) setUserXP(userData.dailyXP || 0);
  }, [location.pathname]);

  const curse      = guild?.currentCurse || guild?.currentBlessing || null;
  const curseInfo  = CURSE_COLORS[curse] || CURSE_COLORS[null];
  const hpPercent  = guild ? Math.min(100, (guild.castleHP / guild.castleHPCap) * 100) : 0;
  const xpPercent  = Math.min(100, (userXP / 200) * 100);

  return (
    <div style={s.root}>

      {/* ── Mobile Hamburger ── */}
      <button style={s.hamburger} onClick={() => setSidebar(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* ── Sidebar ── */}
      <div style={{
        ...s.sidebar,
        transform: sidebarOpen ? 'translateX(0)' : undefined,
      }}>

        {/* Logo */}
        <div style={s.logo} onClick={() => navigate('/')}>
          ⚽ <span style={s.logoText}>Footbrawls</span>
        </div>

        {/* User */}
        {user && (
          <div style={s.userCard}>
            <div style={s.userName}>{user.nickname}</div>
            <div style={s.userMeta}>
              {/* country flag from COUNTRIES */}
              <span style={s.tier}>{user.tier || 'lurker'}</span>
            </div>
          </div>
        )}

        {/* Daily XP */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Daily XP</div>
          <div style={s.xpRow}>
            <span style={s.xpVal}>{userXP}</span>
            <span style={s.xpMax}>/200</span>
          </div>
          <div style={s.barBg}>
            <div style={{ ...s.barFill, width: `${xpPercent}%`, background: '#00ff87' }} />
          </div>
        </div>

        {/* Guild */}
        {guild && (
          <div style={s.section}>
            <div style={s.sectionLabel}>Your Castle</div>
            <div style={s.guildName}>🏰 {guild.name}</div>
            <div style={s.barBg}>
              <div style={{
                ...s.barFill,
                width: `${hpPercent}%`,
                background: hpPercent > 60 ? '#00ff87' : hpPercent > 30 ? '#f7c344' : '#ff4444',
              }} />
            </div>
            <div style={s.hpLabel}>{guild.castleHP?.toLocaleString()} / {guild.castleHPCap?.toLocaleString()} HP</div>

            {/* Curse */}
            <div style={{ ...s.curseBadge, borderColor: curseInfo.color, color: curseInfo.color }}>
              {curseInfo.icon} {curseInfo.label}
            </div>
          </div>
        )}

        {/* Games */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Games</div>
          <div style={s.gameList}>
            {GAMES.map(game => {
              const done    = isGameDoneToday(game.key);
              const active  = location.pathname === game.path;
              return (
                <div
                  key={game.path}
                  style={{
                    ...s.gameItem,
                    background: active ? 'rgba(0,255,135,0.08)' : 'transparent',
                    borderColor: active ? 'rgba(0,255,135,0.3)' : 'rgba(255,255,255,0.05)',
                  }}
                  onClick={() => { navigate(game.path); setSidebar(false); }}
                >
                  <span style={s.gameIcon}>{game.icon}</span>
                  <span style={{ ...s.gameName, color: active ? '#00ff87' : done ? '#555' : '#ccc' }}>
                    {game.name}
                  </span>
                  <span style={s.gameXP}>
                    {done ? '✅' : `+${game.xp}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guild room link */}
        <div
          style={s.guildBtn}
          onClick={() => { navigate(`/guild/${user?.homeCountry}`); setSidebar(false); }}
        >
          🏰 Guild Room
        </div>

      </div>

      {/* ── Main Content ── */}
      <div style={s.main}>
        {children}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={s.overlay} onClick={() => setSidebar(false)} />
      )}

    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: "'Segoe UI', sans-serif",
  },
  sidebar: {
    width: 240,
    minHeight: '100vh',
    background: '#0d0d0d',
    borderRight: '1px solid #1a1a1a',
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flexShrink: 0,
    overflowY: 'auto',
    position: 'sticky',
    top: 0,
    height: '100vh',
    // Mobile: fixed overlay
    '@media(max-width:768px)': {
      position: 'fixed',
      zIndex: 100,
      transform: 'translateX(-100%)',
      transition: 'transform 0.3s ease',
    },
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 4px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #1a1a1a',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 18, fontWeight: 800, color: '#00ff87', letterSpacing: 1,
  },
  userCard: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid #1a1a1a',
    borderRadius: 10,
    marginBottom: 8,
  },
  userName: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  userMeta: { display: 'flex', alignItems: 'center', gap: 6 },
  tier: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1, color: '#f7c344',
    background: 'rgba(247,195,68,0.1)', padding: '2px 8px', borderRadius: 100,
  },
  section: {
    padding: '12px 0',
    borderBottom: '1px solid #1a1a1a',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: 1.5, color: '#444', marginBottom: 8,
  },
  xpRow: { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  xpVal: { fontSize: 22, fontWeight: 800, color: '#00ff87' },
  xpMax: { fontSize: 12, color: '#444' },
  barBg: {
    height: 6, background: '#1a1a1a', borderRadius: 3,
    overflow: 'hidden', marginBottom: 4,
  },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  guildName: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#ccc' },
  hpLabel: { fontSize: 10, color: '#444', marginTop: 4, marginBottom: 8 },
  curseBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 100, border: '1px solid',
    fontSize: 11, fontWeight: 700,
  },
  gameList: { display: 'flex', flexDirection: 'column', gap: 3 },
  gameItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
    border: '1px solid', transition: 'all 0.15s',
  },
  gameIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  gameName: { flex: 1, fontSize: 12, fontWeight: 600 },
  gameXP:   { fontSize: 10, color: '#00ff87', fontWeight: 700 },
  guildBtn: {
    marginTop: 8, padding: '10px 14px',
    background: 'rgba(0,255,135,0.06)',
    border: '1px solid rgba(0,255,135,0.2)',
    borderRadius: 10, fontSize: 13, fontWeight: 700,
    color: '#00ff87', cursor: 'pointer', textAlign: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
    overflowX: 'hidden',
  },
  hamburger: {
    display: 'none',
    position: 'fixed', top: 12, left: 12, zIndex: 200,
    background: '#111', border: '1px solid #222',
    color: '#fff', width: 38, height: 38,
    borderRadius: 8, fontSize: 16, cursor: 'pointer',
    alignItems: 'center', justifyContent: 'center',
    '@media(max-width:768px)': { display: 'flex' },
  },
  overlay: {
    display: 'none',
    position: 'fixed', inset: 0, zIndex: 99,
    background: 'rgba(0,0,0,0.7)',
    '@media(max-width:768px)': { display: 'block' },
  },
};