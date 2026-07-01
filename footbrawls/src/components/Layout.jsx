



import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isCurseExpired } from '../lib/guildLevels';
import { getUser, saveUserLocally } from '../lib/user';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { awardXP } from '../lib/xpEngine';

const C = {
  bg:      "#060810",
  bg2:     "#0c0f1a",
  surface: "rgba(255,255,255,0.04)",
  surface2:"rgba(255,255,255,0.07)",
  surface3:"rgba(255,255,255,0.11)",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  border3: "rgba(255,255,255,0.2)",
  accent:  "#F7C344",
  accentDim: "rgba(247,195,68,0.12)",
  red:     "#E84040",
  green:   "#3DD68C",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  muted2:  "rgba(242,242,244,0.28)",
};

const Icon = {
  Person: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5"/>
      <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Puzzle: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Chart: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="14" width="4" height="7" rx="1" fill={color} opacity="0.5"/>
      <rect x="10" y="9" width="4" height="12" rx="1" fill={color} opacity="0.7"/>
      <rect x="17" y="4" width="4" height="17" rx="1" fill={color}/>
      <line x1="2" y1="21" x2="22" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Network: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2.5" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="5" r="2.5" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="19" r="2.5" stroke={color} strokeWidth="1.5"/>
      <line x1="7.2" y1="11" x2="16.8" y2="6.4" stroke={color} strokeWidth="1.3"/>
      <line x1="7.2" y1="13" x2="16.8" y2="17.6" stroke={color} strokeWidth="1.3"/>
      <line x1="19" y1="7.5" x2="19" y2="16.5" stroke={color} strokeWidth="1.3" strokeDasharray="2 2"/>
    </svg>
  ),
  Target: ({size=16,color="currentColor"}) => (
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
  Question: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-1.5 2-2.5 3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill={color}/>
    </svg>
  ),
  Flame: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 22c4.4 0 8-3.3 8-7.4 0-2.4-1-4.4-2.6-5.9 0 1.4-.8 2.6-2 3.3C15.1 9.7 14 7 14 4c0 0-5 3-5 9.5 0 .8.1 1.5.3 2.2C8.5 15 8 13.6 8 12c-1.2 1.2-2 3-2 4.6C6 20.7 8.7 22 12 22z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="12" cy="17" r="2" stroke={color} strokeWidth="1.2"/>
    </svg>
  ),
  Dribble: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="2.5" stroke={color} strokeWidth="1.4"/>
      <path d="M12 7.5c0 3-4 3-4 6s4 3 4 6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="11" r="1.5" fill={color} opacity="0.4"/>
      <circle cx="16" cy="14" r="1.5" fill={color} opacity="0.4"/>
    </svg>
  ),
  Lightning: ({size=16,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={color} fillOpacity="0.25"/>
    </svg>
  ),
};

const GAMES = [
  { name: 'Who Are Ya?',    path: '/games/whoareya',      IconC: Icon.Person,    xp: 25,  key: 'footbrawls_whoareya',      color: '#F97316' },
  { name: 'Player Wordle',  path: '/games/wordle',        IconC: Icon.Puzzle,    xp: 25,  key: 'footbrawls_wordle_history', color: '#A855F7' },
  { name: 'Higher or Lower',path: '/games/higherlower',   IconC: Icon.Chart,     xp: 25,  key: 'footbrawls_higherlower',   color: '#3DD68C' },
  { name: 'Transfer Trail', path: '/games/transfertrail', IconC: Icon.Network,   xp: 25,  key: 'footbrawls_transfertrail', color: '#1A6FFF' },
  { name: 'Match Predictor',path: '/games/matchpredictor',IconC: Icon.Target,    xp: 50,  key: 'footbrawls_matchpredictor', color: '#F7C344' },
  { name: 'Daily Trivia',   path: '/games/dailytrivia',   IconC: Icon.Question,  xp: 25,  key: 'footbrawls_dailytrivia',   color: '#0D9488' },
  { name: 'Penalty Nerve',  path: '/games/penaltynerve',  IconC: Icon.Flame,     xp: 25,  key: 'footbrawls_penaltynerve',   color: '#E84040' },
  { name: 'Dribble Gauntlet',path: '/games/dribble',       IconC: Icon.Dribble,   xp: 25,  key: 'footbrawls_dribble',        color: '#84CC16' },
  { name: 'Top 10 Guess',   path: '/games/top10',         IconC: Icon.Lightning, xp: 25,  key: 'footbrawls_top10_history',  color: '#EC4899' },
];

const CURSE_COLORS = {
  null:          { color: C.green, label: 'No Curse',     icon: '✨' },
  blessed:       { color: C.green, label: 'Blessed +25%', icon: '🌟' },
  cursed:        { color: C.accent, label: 'Cursed -25%',  icon: '💀' },
  double_cursed: { color: C.red, label: 'Double Curse', icon: '💀💀' },
  death_curse:   { color: C.red, label: 'Death Curse',  icon: '☠️' },
};

function injectFonts() {
  if (document.getElementById("fb-fonts")) return;
  const l = document.createElement("link"); l.id="fb-fonts"; l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap";
  document.head.appendChild(l);
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function isGameDoneToday(key) {
  try {
    const raw = localStorage.getItem(key); if (!raw) return false;
    const data = JSON.parse(raw);
    const todayUTC = new Date().toISOString().split("T")[0];
    const d = new Date();
    const todayLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return data.date === todayUTC || data.date === todayLocal || Boolean(data[todayUTC]) || Boolean(data[todayLocal]);
  } catch { return false; }
}

export default function Layout({ children, hideMobileNav }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser] = useState(() => getUser());
  const [guild, setGuild]         = useState(null);
  const [userXP, setUserXP]       = useState(0);
  const [completedGames, setCompletedGames] = useState({});
  const [timer, setTimer] = useState(60);
  const [sessionData, setSessionData] = useState(null);

  const isVsFriends = typeof window !== 'undefined' && !!localStorage.getItem('active_vs_friends_session_id');

  if (isVsFriends) {
    return <>{children}</>;
  }

  const handleTimeout = useCallback(async (activeId) => {
    const path = location.pathname.toLowerCase();
    const user = getUser();
    if (!user?.userId) {
      navigate('/raid');
      return;
    }

    try {
      if (path.includes('dribble')) {
        localStorage.setItem(`raid_completed_act2_${activeId}`, 'true');
        await awardXP(user.userId, 'dribble_correct', { rawXP: 0 });
      } else if (path.includes('penaltynerve')) {
        localStorage.setItem(`raid_completed_act3_${activeId}`, 'true');
        await awardXP(user.userId, 'penaltyNerve_all5', { rawXP: 0 });
      } else {
        localStorage.setItem(`raid_completed_act1_${activeId}`, 'true');
        let gameId = 'whoareya_correct';
        let opts = { rawXP: 0, guessNumber: 8, solved: false };
        if (path.includes('wordle')) {
          gameId = 'wordle_correct';
          opts = { rawXP: 0, guessNumber: 6, solved: false };
        } else if (path.includes('higherlower')) {
          gameId = 'higherLower_correct';
          opts = { rawXP: 0, streak: 0 };
        } else if (path.includes('transfertrail')) {
          gameId = 'transferTrail_correct';
          opts = { rawXP: 0 };
        } else if (path.includes('top10')) {
          gameId = 'top10_complete';
          opts = { rawXP: 0, correctCount: 0 };
        }
        await awardXP(user.userId, gameId, opts);
      }
    } catch (e) {
      console.error('[Layout Raid Timer] Timeout submission failed:', e);
    }
    navigate('/raid');
  }, [location.pathname, navigate]);

  
  useEffect(() => {
    const isRaid = !!localStorage.getItem('active_game_session_id');
    const activeId = localStorage.getItem('active_game_session_id');
    if (!isRaid || !activeId || !location.pathname.startsWith('/games/')) return;

    setTimer(60);

    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleTimeout(activeId);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const docRef = doc(db, 'gameSessions', activeId);
    const unsub = onSnapshot(docRef, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setSessionData(data);

        
        const uid = getUser()?.userId;
        const act = data.currentAct || 1;
        const hasScoreLocally = localStorage.getItem(`raid_completed_act${act}_${activeId}`) === 'true';
        const hasScoreInDb = !!data.scores?.[uid]?.[`act${act}`];
        if (uid && (hasScoreLocally || hasScoreInDb)) {
          navigate('/raid');
        }
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [location.pathname, handleTimeout, navigate]);

  
  useEffect(() => {
    injectFonts();
    if (!user?.homeCountry) return;
    const ref = doc(db, 'guilds', user.homeCountry);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setGuild(snap.data());
    });
    return () => unsub();
  }, [user?.homeCountry]);

  
  useEffect(() => {
    if (!user?.userId) return;
    const ref = doc(db, 'users', user.userId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        const today = getTodayKey();
        const fresh = {
          ...user,
          totalXP: data.totalXP ?? user?.totalXP ?? 0,
          dailyXP: data.dailyXPDate === today ? (data.dailyXP ?? 0) : 0,
          dailyXPDate: data.dailyXPDate ?? null,
          tier: data.tier ?? user?.tier ?? "lurker",
        };
        saveUserLocally(fresh);
        setUser(fresh);
        setUserXP(fresh.dailyXP);
      }
    }, () => {});
    return () => unsub();
  }, [user?.userId]);

  
  useEffect(() => {
    const syncState = () => {
      const today = getTodayKey();
      const freshUser = getUser();
      
      let freshXP = 0;
      if (freshUser && freshUser.dailyXPDate === today) {
        freshXP = freshUser.dailyXP || 0;
      }
      
      const newCompletions = {};
      GAMES.forEach(game => {
        newCompletions[game.key] = isGameDoneToday(game.key);
      });

      const completionsChanged = GAMES.some(game => newCompletions[game.key] !== completedGames[game.key]);
      const userXPChanged = freshXP !== userXP;
      const userChanged = 
        freshUser?.totalXP !== user?.totalXP ||
        freshUser?.dailyXP !== user?.dailyXP ||
        freshUser?.dailyXPDate !== user?.dailyXPDate ||
        freshUser?.tier !== user?.tier;

      if (completionsChanged) {
        setCompletedGames(newCompletions);
      }
      if (userXPChanged) {
        setUserXP(freshXP);
      }
      if (userChanged) {
        setUser(freshUser);
      }
    };

    syncState();

    const intervalId = setInterval(syncState, 1000);
    
    
    window.addEventListener('focus', syncState);
    document.addEventListener('visibilitychange', syncState);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', syncState);
      document.removeEventListener('visibilitychange', syncState);
    };
  }, [completedGames, userXP, user, location.pathname]);

  
  useEffect(() => {
    if (!document.getElementById("ly-css")) {
      const s = document.createElement("style");
      s.id = "ly-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  
  useEffect(() => {
    localStorage.removeItem('active_raid_session');
  }, []);
 
    const isExpired = isCurseExpired(guild);
const effectiveCurse = (isExpired && guild?.currentCurse !== 'death_curse') ? null : (guild?.currentCurse || null);
    const effectiveBlessing = isExpired ? null : (guild?.currentBlessing || null);
    const curse      = effectiveCurse || effectiveBlessing || null;
    const curseInfo  = CURSE_COLORS[curse] || CURSE_COLORS[null];
   const hpPercent  = guild ? Math.min(100, (guild.castleHP / guild.castleHPCap) * 100) : 0;
   const xpPercent  = Math.min(100, (userXP / 200) * 100);

  const isRaidMode = !!localStorage.getItem('active_game_session_id') && location.pathname.startsWith('/games/');
  if (isRaidMode) {
    const buddy = sessionData?.players?.find(p => p.userId !== user?.userId) || null;
    const teammateName = buddy ? buddy.nickname : 'Teammate';
    let teammateStatus = 'Playing...';
    if (sessionData && buddy) {
      const act = sessionData.currentAct || 1;
      const scores = sessionData.scores?.[buddy.userId] || {};
      if (act === 1) {
        teammateStatus = scores.act1 ? `${scores.act1.normalized} pts` : 'Playing...';
      } else if (act === 2) {
        teammateStatus = scores.act2 ? `${scores.act2.wins * 20} pts` : 'Playing...';
      } else if (act === 3) {
        teammateStatus = scores.act3 ? `${scores.act3.goals * 20} pts` : 'Playing...';
      }
    }

    return (
      <div className="ly-raid-layout" style={{ minHeight: '100vh', background: '#04080f', color: '#f2f2f4', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{
          background: 'rgba(6, 8, 16, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>⚔️</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: 0.5, color: '#F7C344' }}>CO-OP RAID</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(242, 242, 244, 0.5)' }}>Stage {sessionData?.currentAct || 1}</div>
            </div>
          </div>

          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', letterSpacing: 1.5, color: 'rgba(242, 242, 244, 0.5)', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>Time Remaining</div>
            <div style={{
              fontSize: '1.55rem',
              fontWeight: 800,
              fontFamily: "'Space Mono', monospace",
              color: timer <= 15 ? '#E84040' : '#f2f2f4',
              animation: timer <= 15 ? 'pulse 1s infinite' : 'none'
            }}>
              {timer}s
            </div>
          </div>

          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.62rem', letterSpacing: 1, color: 'rgba(242, 242, 244, 0.5)', textTransform: 'uppercase' }}>Teammate Status</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 'bold' }}>
              👤 {teammateName}: <span style={{ color: teammateStatus.includes('Playing') ? '#F7C344' : '#3DD68C' }}>{teammateStatus}</span>
            </div>
          </div>
        </div>

        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="ly-root">

      
      {!hideMobileNav && !location.pathname.startsWith('/games/') && !location.pathname.startsWith('/guild/') && (
        <div className="ly-mobile-nav">
          <button className="ly-back-btn" onClick={() => navigate('/')}>
            ← BACK
          </button>
          <div className="ly-mobile-title">FOOTBRAWLS</div>
          <div style={{ width: 62 }}></div> 
        </div>
      )}

      
      <div className="ly-sidebar">
        
        <div className="ly-logo" onClick={() => navigate('/')}>
          <span className="ly-logo-text">Footbrawls</span>
        </div>

        
        {user && (
          <div className="ly-user-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div className="ly-user-name" style={{ margin: 0 }}>{user.nickname}</div>
              <span className="ly-tier" style={{ margin: 0 }}>{user.tier || 'lurker'}</span>
            </div>
          </div>
        )}

        
        <div className="ly-section">
          <div className="ly-section-label">Daily XP</div>
          <div className="ly-xp-row">
            <span className="ly-xp-val">{userXP}</span>
            <span className="ly-xp-max">/200</span>
          </div>
          <div className="ly-bar-bg">
            <div className="ly-bar-fill xp-fill" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>

        
        {guild && (
          <div className="ly-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className="ly-section-label" style={{ alignSelf: 'stretch', textAlign: 'left' }}>Your Castle</div>
            <div className="ly-guild-name">🏰 {guild.name}</div>
            <div className="ly-bar-bg" style={{ width: '100%' }}>
              <div 
                className="ly-bar-fill hp-fill" 
                style={{ 
                  width: `${hpPercent}%`,
                  background: hpPercent > 60 ? C.green : hpPercent > 30 ? C.accent : C.red 
                }} 
              />
            </div>
            <div className="ly-hp-label">{guild.castleHP?.toLocaleString()} / {guild.castleHPCap?.toLocaleString()} HP</div>

            <div className="ly-curse-badge" style={{ borderColor: curseInfo.color, color: curseInfo.color, display: 'inline-flex', justifyContent: 'center', margin: '8px auto 0' }}>
              {curseInfo.icon} {curseInfo.label}
            </div>
          </div>
        )}

        
        <div className="ly-section">
          <div className="ly-section-label">Games</div>
          <div className="ly-game-list">
            {GAMES.map(game => {
              const done    = !!completedGames[game.key];
              const active  = location.pathname === game.path;
              const NavIcon = game.IconC;
              const textColor = game.color;
              const activeColor = game.color || '#F7C344';
              return (
                <div
                  key={game.path}
                  className={`ly-game-item ${active ? 'active' : ''}`}
                  onClick={() => navigate(game.path)}
                  style={active ? {
                    backgroundColor: `${activeColor}1a`,
                    borderColor: activeColor
                  } : {}}
                >
                  <span className="ly-game-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}>
                    <NavIcon size={16} color={textColor || (active ? C.accent : 'rgba(242,242,244,0.5)')} />
                  </span>
                  <span 
                    className={`ly-game-name ${active ? 'active' : done ? 'done' : ''}`}
                    style={textColor ? { color: textColor } : {}}
                  >
                    {game.name}
                  </span>
                  <span className="ly-game-xp">
                    {done ? '✅' : `+${game.xp}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        
        <div
          className="ly-guild-btn"
          onClick={() => navigate(`/guild/${user?.homeCountry}`)}
        >
          🏰 Guild Room
        </div>
      </div>

      
      <div className={`ly-main ${hideMobileNav ? 'no-mobile-nav' : ''}`}>
        {children}
      </div>

    </div>
  );
}

const CSS = `
.ly-root {
  display: flex;
  min-height: 100vh;
  background: #060810;
  color: #F2F2F4;
  font-family: 'Syne', sans-serif;
  width: 100%;
}

/* Sidebar Styling */
.ly-sidebar {
  width: 260px;
  min-height: 100vh;
  background: #0c0f1a;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
  box-sizing: border-box;
}

.ly-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 4px 16px;
  cursor: pointer;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.7rem;
  letter-spacing: 3px;
  margin-bottom: 8px;
}

.ly-logo-text {
  background: linear-gradient(110deg, #ffe680 0%, #F7C344 40%, #e8a800 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.ly-user-card {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.13);
  borderRadius: 10px;
  margin-bottom: 8px;
}

.ly-user-name {
  font-size: 14px;
  fontWeight: 700;
  marginBottom: 4px;
  color: #3DD68C;
}

.ly-user-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ly-tier {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #F7C344;
  background: rgba(247, 195, 68, 0.12);
  padding: 2px 8px;
  border-radius: 100px;
}

.ly-section {
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 4px;
}

.ly-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 3.5px;
  text-transform: uppercase;
  color: rgba(242, 242, 244, 0.28);
  margin-bottom: 12px;
}

.ly-xp-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 6px;
}

.ly-xp-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #3DD68C;
  letter-spacing: 1px;
}

.ly-xp-max {
  font-size: 12px;
  color: rgba(242, 242, 244, 0.28);
}

.ly-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.ly-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.ly-bar-fill.xp-fill {
  background: #00ff87;
}

.ly-guild-name {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  color: rgba(242, 242, 244, 0.5);
}

.ly-hp-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: rgba(242, 242, 244, 0.28);
  margin-top: 4px;
  margin-bottom: 8px;
}

.ly-curse-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 100px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Space Mono', monospace;
}

.ly-game-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ly-game-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: all 0.2s ease;
}

.ly-game-item:hover {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.15);
}

.ly-game-item.active {
  background: rgba(247, 195, 68, 0.12);
  border-color: #F7C344;
}

.ly-game-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

.ly-game-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
}

.ly-game-name.active {
  color: #F7C344;
}

.ly-game-name.done {
  color: rgba(242, 242, 244, 0.28);
}

.ly-game-xp {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #3DD68C;
  font-weight: 700;
}

.ly-guild-btn {
  margin-top: auto;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #F2F2F4;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.ly-guild-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Main Content Area */
.ly-main {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
}

/* Mobile Nav Bar Header (Hidden on Desktop) */
.ly-mobile-nav {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: rgba(12, 15, 26, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
  box-sizing: border-box;
}

.ly-back-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #F2F2F4;
  padding: 6px 14px;
  font-family: 'Space Mono', monospace;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.2s;
}

.ly-back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
}

.ly-mobile-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.6rem;
  letter-spacing: 2.5px;
  color: #F7C344;
  line-height: 1;
}

/* Responsive Media Queries to disable side table when playing a game */
@media (max-width: 768px) {
  .ly-sidebar {
    display: none !important;
  }
  
  .ly-mobile-nav {
    display: flex !important;
  }
  
  .ly-main {
    padding-top: 56px;
  }
  
  .ly-main.no-mobile-nav {
    padding-top: 0 !important;
  }
}
`;