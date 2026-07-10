
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../lib/user';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const C = {
  bg:      "#060810",
  bg2:     "#0c0f1a",
  surface: "rgba(255,255,255,0.04)",
  surface2:"rgba(255,255,255,0.07)",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  accent:  "#F7C344",
  red:     "#E84040",
  green:   "#3DD68C",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
  gold:    "#F7C344",
  goldGlow:"rgba(247,195,68,0.3)"
};

const Icon = {
  Person: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5"/>
      <path d="M4 21v-1a8 8 0 0116 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Puzzle: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5"/>
      <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Chart: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="14" width="4" height="7" rx="1" fill={color} opacity="0.5"/>
      <rect x="10" y="9" width="4" height="12" rx="1" fill={color} opacity="0.7"/>
      <rect x="17" y="4" width="4" height="17" rx="1" fill={color}/>
      <line x1="2" y1="21" x2="22" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Network: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2.5" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="5" r="2.5" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="19" r="2.5" stroke={color} strokeWidth="1.5"/>
      <line x1="7.2" y1="11" x2="16.8" y2="6.4" stroke={color} strokeWidth="1.3"/>
      <line x1="7.2" y1="13" x2="16.8" y2="17.6" stroke={color} strokeWidth="1.3"/>
      <line x1="19" y1="7.5" x2="19" y2="16.5" stroke={color} strokeWidth="1.3" strokeDasharray="2 2"/>
    </svg>
  ),
  Trophy: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 2h12v8a6 6 0 01-12 0V2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 5H3a1 1 0 00-1 1v2a4 4 0 004 4" stroke={color} strokeWidth="1.5"/>
      <path d="M18 5h3a1 1 0 011 1v2a4 4 0 01-4 4" stroke={color} strokeWidth="1.5"/>
      <path d="M12 16v4M8 20h8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Question: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  Ball: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
      <path d="M12 2c0 0-2.5 3-2.5 5s2.5 5 2.5 5 2.5-2 2.5-5S12 2 12 2z" fill={color} opacity="0.7"/>
      <path d="M2 12h4l2 3-2 3H2" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
      <path d="M22 12h-4l-2 3 2 3h4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
      <path d="M5 5.5l3 2.5 1 4-4-2-1.5-4z" fill={color} opacity="0.6"/>
      <path d="M19 5.5l-3 2.5-1 4 4-2 1.5-4z" fill={color} opacity="0.6"/>
      <path d="M8 19l1-4 3-1 3 1 1 4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
    </svg>
  ),
  Flame: ({size=18,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 22c4.4 0 8-3.3 8-7.4 0-2.4-1-4.4-2.6-5.9 0 1.4-.8 2.6-2 3.3C15.1 9.7 14 7 14 4c0 0-5 3-5 9.5 0 .8.1 1.5.3 2.2C8.5 15 8 13.6 8 12c-1.2 1.2-2 3-2 4.6C6 20.7 8.7 22 12 22z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="12" cy="17" r="2" stroke={color} strokeWidth="1.2"/>
    </svg>
  ),
};

const GAMES_POOL = [
  { id: 'whoareya_correct', label: 'Who Are Ya?', route: '/games/whoareya', IconC: Icon.Person },
  { id: 'wordle_correct', label: 'Player Wordle', route: '/games/wordle', IconC: Icon.Puzzle },
  { id: 'higherLower_correct', label: 'Higher or Lower', route: '/games/higherlower', IconC: Icon.Chart },
  { id: 'transferTrail_correct', label: 'Transfer Trail', route: '/games/transfertrail', IconC: Icon.Network },
  { id: 'top10', label: 'Top 10 Guess', route: '/games/top10', IconC: Icon.Trophy },
  { id: 'dailyTrivia', label: 'Daily Trivia', route: '/games/dailytrivia', IconC: Icon.Question },
  { id: 'dribble_correct', label: 'Dribble Gauntlet', route: '/games/dribble', IconC: Icon.Ball },
  { id: 'penaltyNerve_all5', label: 'Penalty Shootout', route: '/games/penaltynerve', IconC: Icon.Flame }
];

export default function VsFriends() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);

  const [mode, setMode] = useState('menu'); 
  const [inviteCode, setInviteCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('active_vs_friends_session_id'));
  const [session, setSession] = useState(null);
  const [selectedGames, setSelectedGames] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  
  useEffect(() => {
    if (!sessionId) return;
    const ref = doc(db, 'gameSessions', sessionId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.sessionType === 'vs_friends') {
          setSession(data);
          if (data.status === 'completed') {
            setMode('results');
          } else {
            setMode('lobby');
          }
        }
      } else {
        localStorage.removeItem('active_vs_friends_session_id');
        setSessionId(null);
        setMode('menu');
      }
    });
    return () => unsub();
  }, [sessionId]);

  const toggleGameSelect = (gameId) => {
    if (selectedGames.includes(gameId)) {
      setSelectedGames(selectedGames.filter(id => id !== gameId));
    } else {
      if (selectedGames.length < 5) {
        setSelectedGames([...selectedGames, gameId]);
      }
    }
  };

  const generateInviteCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); 
  };

  const startHosting = async () => {
    if (!user) return;
    if (selectedGames.length !== 5) {
      setErrorMsg('Please select exactly 5 games for the custom tournament playlist!');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    const code = generateInviteCode();
    const sid = `vs_${Date.now()}`;
    const playlist = selectedGames.map(id => {
      const match = GAMES_POOL.find(g => g.id === id);
      return { id: match.id, label: match.label, route: match.route };
    });

    
    const uniqueSessionSeed = String(Math.floor(100000 + Math.random() * 900000));

    const sessionData = {
      sessionId: sid,
      sessionType: 'vs_friends',
      hostId: user.userId,
      hostName: user.nickname,
      hostFlag: user.flag || '🛡️',
      guestId: null,
      guestName: null,
      guestFlag: null,
      inviteCode: code,
      gamesList: playlist,
      currentAct: 1,
      scores: {},
      status: 'waiting',
      raidSeed: uniqueSessionSeed,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'gameSessions', sid), sessionData);
      localStorage.setItem('active_vs_friends_session_id', sid);
      localStorage.setItem('active_vs_friends_session_seed', uniqueSessionSeed);
      setSessionId(sid);
      setInviteCode(code);
      setSession(sessionData);
      setMode('lobby');
    } catch (err) {
      setErrorMsg('Failed to host lobby: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinLobby = async () => {
    if (!user || !inputCode) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const q = query(
        collection(db, 'gameSessions'),
        where('inviteCode', '==', inputCode.trim()),
        where('status', '==', 'waiting')
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setErrorMsg('Lobby not found. Double check code or ask friend to host.');
        setLoading(false);
        return;
      }

      const matchDoc = snap.docs[0];
      const sid = matchDoc.id;
      const data = matchDoc.data();

      await updateDoc(doc(db, 'gameSessions', sid), {
        guestId: user.userId,
        guestName: user.nickname,
        guestFlag: user.flag || '🛡️',
        status: 'active',
      });

      localStorage.setItem('active_vs_friends_session_id', sid);
      localStorage.setItem('active_vs_friends_session_seed', data.raidSeed || String(Date.now()));
      setSessionId(sid);
      setMode('lobby');
    } catch (err) {
      setErrorMsg('Failed to join lobby: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  
  useEffect(() => {
    if (session && session.isBotMatch && session.hostId === user?.userId && session.status === 'active') {
      let changed = false;
      const updates = {};
      
      for (let i = 1; i <= session.currentAct; i++) {
        const hScore = session.scores?.[session.hostId]?.[`act${i}`];
        const bScore = session.scores?.[session.guestId]?.[`act${i}`];
        
        if (hScore && !bScore) {
          const hostPoints = hScore.normalized || hScore.wins || hScore.goals || 0;
          let botPoints = Math.round(hostPoints + Math.floor(Math.random() * 31) - 15);
          botPoints = Math.max(0, Math.min(100, botPoints));
          
          updates[`scores.${session.guestId}.act${i}`] = {
            normalized: botPoints,
            display: `${botPoints} pts (Bot)`
          };
          changed = true;
        }
      }
      
      if (changed) {
        updateDoc(doc(db, 'gameSessions', session.sessionId), updates).catch(console.error);
      }
    }
  }, [session, user]);

  const handlePlayVsBot = async () => {
    if (!session || loading) return;
    setLoading(true);
    try {
      const BOT_NAMES = ["MessiGoat10", "Pessi_L", "Penaldo", "CR7_Siuu", "EngIsBest", "Selecao_Pride", "ViniBaller", "Mbappe_Speed", "HaalandRobot", "Bellingham_99"];
      const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const botId = "bot_" + Math.floor(Math.random() * 99999);
      
      await updateDoc(doc(db, 'gameSessions', session.sessionId), {
        guestId: botId,
        guestName: botName,
        guestFlag: '🤖',
        status: 'active',
        isBotMatch: true
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  

  const handleStartGame = () => {
    if (!session) return;
    const currentGameIndex = session.currentAct - 1;
    const currentGame = session.gamesList?.[currentGameIndex];
    if (currentGame) {
      navigate(currentGame.route);
    }
  };

  
  const isMyScoreSubmitted = useMemo(() => {
    if (!session || !user) return false;
    return !!session.scores?.[user.userId]?.[`act${session.currentAct}`];
  }, [session, user]);

  const leaveLobby = async () => {
    localStorage.removeItem('active_vs_friends_session_id');
    localStorage.removeItem('active_vs_friends_session_seed');
    setSessionId(null);
    setSession(null);
    setMode('menu');
  };

  const hostTotalPoints = useMemo(() => {
    if (!session || !session.scores) return 0;
    let sum = 0;
    for (let i = 1; i <= 5; i++) {
      const scoreObj = session.scores[session.hostId]?.[`act${i}`];
      if (scoreObj) {
        sum += scoreObj.normalized || scoreObj.wins || scoreObj.goals || 0;
      }
    }
    return Math.round(sum);
  }, [session]);

  const guestTotalPoints = useMemo(() => {
    if (!session || !session.scores) return 0;
    let sum = 0;
    for (let i = 1; i <= 5; i++) {
      const scoreObj = session.scores[session.guestId]?.[`act${i}`];
      if (scoreObj) {
        sum += scoreObj.normalized || scoreObj.wins || scoreObj.goals || 0;
      }
    }
    return Math.round(sum);
  }, [session]);

  
  const winnerInfo = useMemo(() => {
    if (!session || session.status !== 'completed') return null;
    let text = 'Draw Match!';
    let winnerId = null;

    if (hostTotalPoints > guestTotalPoints) {
      text = `${session.hostName} Wins!`;
      winnerId = session.hostId;
    } else if (guestTotalPoints > hostTotalPoints) {
      text = `${session.guestName} Wins!`;
      winnerId = session.guestId;
    }

    return { hostTotalPoints, guestTotalPoints, text, winnerId };
  }, [session, hostTotalPoints, guestTotalPoints]);

  
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const currentActVal = session.currentAct || 1;
    const hostScore = session.scores?.[session.hostId]?.[`act${currentActVal}`];
    const guestScore = session.scores?.[session.guestId]?.[`act${currentActVal}`];

    if (hostScore !== undefined && guestScore !== undefined) {
      const nextAct = currentActVal + 1;
      const updates = {};
      if (nextAct > 5) {
        updates.status = 'completed';
      } else {
        updates.currentAct = nextAct;
      }
      updateDoc(doc(db, 'gameSessions', session.sessionId), updates);
    }
  }, [session]);

  return (
    <div style={styles.page}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
        padding: '0 24px', height: 58,
        background: 'rgba(5,7,15,0.85)', backdropFilter: 'blur(24px) saturate(1.4)',
        borderBottom: `1px solid ${C.green}25`,
        boxShadow: `0 4px 20px ${C.green}15`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'start' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', borderRadius: '8px', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}>
            ←
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'end' }}>
          <img src="/logo.png" alt="Logo" style={{ height: 26, filter:`drop-shadow(0 0 8px rgba(61,214,140,0.3))` }} />
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: 2,
            background: `linear-gradient(135deg, ${C.green}, #2cb071)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            VS FRIENDS
          </span>
        </div>
      </nav>

      <main style={styles.main}>
        {errorMsg && <div style={styles.errorCard}>{errorMsg}</div>}

        {mode === 'menu' && (
          <div style={{...styles.card, padding: '32px 24px', background: 'linear-gradient(180deg, rgba(12,15,26,0.9), rgba(6,8,16,0.95))', boxShadow: `0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`, position: 'relative', overflow: 'hidden'}}>
            
            <div style={{position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 250, height: 250, background: `radial-gradient(circle, ${C.green}30 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none'}} />
            
            <h1 style={{...styles.title, fontSize: '2.5rem', color: '#fff', textShadow: `0 0 20px rgba(255,255,255,0.2)`}}>CLASH HEAD-TO-HEAD</h1>
            <p style={{...styles.desc, fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', maxWidth: 360, margin: '0 auto 24px'}}>Select exactly 5 games, host a lobby, and share the code to battle your friends in real-time!</p>

            <div style={styles.gamesSelectGrid}>
              {GAMES_POOL.map(g => {
                const selected = selectedGames.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => toggleGameSelect(g.id)}
                    style={{
                      ...styles.gameSelectorOption,
                      border: selected ? `1px solid ${C.green}` : `1px solid rgba(255,255,255,0.05)`,
                      background: selected ? `linear-gradient(135deg, ${C.green}20, ${C.green}05)` : 'rgba(255,255,255,0.02)',
                      boxShadow: selected ? `0 4px 15px ${C.green}20, inset 0 1px 0 rgba(255,255,255,0.1)` : 'none',
                      transform: selected ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div style={{ 
                      width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      background: selected ? `rgba(61,214,140,0.15)` : 'rgba(255,255,255,0.05)',
                      fontSize: 16
                    }}>
                      <g.IconC size={18} color={selected ? C.green : "rgba(255,255,255,0.4)"} />
                    </div>
                    <span style={{ fontSize: 11.5, fontFamily:"'Syne',sans-serif", fontWeight: 700, color: selected ? '#fff' : 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>{g.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ margin: '20px 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily:"'Space Mono',monospace" }}>
              SELECTED: <span style={{ color: selectedGames.length === 5 ? C.green : '#fff', fontWeight: 700 }}>{selectedGames.length}/5</span>
            </div>

            <div style={{...styles.actionContainer, marginTop: 16}}>
              <button
                type="button"
                style={{ 
                  ...styles.primaryBtn, 
                  opacity: selectedGames.length === 5 ? 1 : 0.4,
                  background: `linear-gradient(135deg, ${C.green}, #2cb071)`,
                  color: '#000',
                  boxShadow: selectedGames.length === 5 ? `0 8px 25px rgba(61,214,140,0.4)` : 'none'
                }}
                disabled={selectedGames.length !== 5 || loading}
                onClick={startHosting}
              >
                {loading ? 'INITIALIZING...' : 'HOST MATCH'}
              </button>

              <div style={styles.divider}>OR JOIN MATCH</div>

              <div style={styles.joinInputGroup}>
                <input
                  type="text"
                  placeholder="6-DIGIT CODE"
                  style={{...styles.input, textAlign: 'center', letterSpacing: 4, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: '1.1rem'}}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="button" style={{...styles.secondaryBtn, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff'}} onClick={joinLobby} disabled={loading || inputCode.length !== 6}>
                  {loading ? 'JOINING...' : 'JOIN'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'lobby' && session && (
          <div style={styles.card}>
            <h2 style={styles.lobbyTitle}>Tournament Lobby</h2>

            {session.status === 'waiting' ? (
              <div style={styles.codeBanner}>
                <div style={styles.codeLabel}>SHARE THIS LOBBY CODE:</div>
                <div style={styles.codeText}>{session.inviteCode}</div>
                <button type="button" onClick={handlePlayVsBot} disabled={loading} style={{...styles.secondaryBtn, width: '100%', marginTop: 12, background: 'rgba(247,195,68,0.1)', borderColor: 'rgba(247,195,68,0.5)', color: '#F7C344'}}>
                  {loading ? '...' : '🤖 Play against AI Bot'}
                </button>
              </div>

            ) : (
              <div style={styles.readyIndicator}>💪 Opponent Joined! Ready to Battle!</div>
            )}

            <div style={styles.lobbyVS}>
              <div style={styles.lobbyPlayer}>
                <span style={{ fontSize: '2.5rem' }}>{session.hostFlag}</span>
                <span style={styles.playerName}>{session.hostName}</span>
                <span style={styles.playerRole}>Host</span>
              </div>
              <div style={styles.vsText}>VS</div>
              <div style={styles.lobbyPlayer}>
                <span style={{ fontSize: '2.5rem' }}>{session.guestFlag || '⏳'}</span>
                <span style={styles.playerName}>{session.guestName || 'Waiting...'}</span>
                <span style={styles.playerRole}>Guest</span>
              </div>
            </div>

            <div style={styles.playlistBox}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
                Tournament Playlist ({session.currentAct > 5 ? 5 : session.currentAct}/5)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {session.gamesList?.map((g, idx) => {
                  const isActive = idx + 1 === session.currentAct;
                  const isCompleted = idx + 1 < session.currentAct;
                  const poolGame = GAMES_POOL.find(p => p.id === g.id);
                  const IconComp = poolGame ? poolGame.IconC : null;

                  return (
                    <div
                      key={g.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: isActive ? 'rgba(247,195,68,0.08)' : 'rgba(255,255,255,0.02)',
                        border: isActive ? `1px solid ${C.accent}` : `1px solid ${C.border}`
                      }}
                    >
                      <span style={{ fontSize: 12, fontFamily:"'Orbitron',sans-serif", color: isActive ? C.accent : isCompleted ? C.green : C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {IconComp && <IconComp size={14} color={isActive ? C.accent : isCompleted ? C.green : "rgba(255,255,255,0.4)"} />} Act {idx + 1}: {g.label}
                      </span>
                      <span>
                        {isActive ? '➡️ PLAYING' : isCompleted ? '✅ DONE' : '⏳ LOCKED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {session.status === 'active' && (
              isMyScoreSubmitted ? (
                <button type="button" style={{...styles.gameBtn, opacity: 0.5, cursor: 'not-allowed'}} disabled>
                  ⏳ Waiting for opponent...
                </button>
              ) : (
                <button type="button" style={styles.gameBtn} onClick={handleStartGame}>
                  🎮 Launch Act {session.currentAct}
                </button>
              )
            )}

            <button type="button" style={styles.leaveBtn} onClick={leaveLobby}>
              Leave Lobby
            </button>
          </div>
        )}

        {mode === 'results' && session && winnerInfo && (
          <div style={{...styles.card, padding: '36px 24px', background: 'linear-gradient(180deg, rgba(12,15,26,0.9), rgba(6,8,16,0.95))', boxShadow: `0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`, position: 'relative', overflow: 'hidden'}}>
            
            
            <div style={{
              position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', 
              width: 300, height: 300, 
              background: winnerInfo.winnerId === user.userId 
                ? `radial-gradient(circle, rgba(61,214,140,0.2) 0%, transparent 70%)` 
                : winnerInfo.winnerId 
                  ? `radial-gradient(circle, rgba(232,64,64,0.15) 0%, transparent 70%)`
                  : `radial-gradient(circle, rgba(242,242,244,0.1) 0%, transparent 70%)`,
              filter: 'blur(50px)', pointerEvents: 'none'
            }} />

            <div style={{fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', letterSpacing: 3, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 12}}>Tournament Concluded</div>
            
            <h1 style={{ 
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '4rem', lineHeight: 1, letterSpacing: 2, marginBottom: 32,
              color: winnerInfo.winnerId === user.userId ? C.green : winnerInfo.winnerId ? C.red : '#fff',
              textShadow: winnerInfo.winnerId === user.userId ? `0 0 30px rgba(61,214,140,0.5)` : winnerInfo.winnerId ? `0 0 30px rgba(232,64,64,0.5)` : `0 0 20px rgba(255,255,255,0.2)`
            }}>
              {winnerInfo.text}
            </h1>

            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: winnerInfo.winnerId === session.hostId ? `1px solid ${C.green}40` : '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '2rem', marginBottom: 8, filter: `drop-shadow(0 0 10px rgba(255,255,255,0.2))` }}>{session.hostFlag}</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{session.hostName}</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#fff', letterSpacing: 1 }}>{winnerInfo.hostTotalPoints}</span>
              </div>
              
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.2rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>VS</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: winnerInfo.winnerId === session.guestId ? `1px solid ${C.green}40` : '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '2rem', marginBottom: 8, filter: `drop-shadow(0 0 10px rgba(255,255,255,0.2))` }}>{session.guestFlag}</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{session.guestName}</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#fff', letterSpacing: 1 }}>{winnerInfo.guestTotalPoints}</span>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: '20px 16px', marginBottom: 32,
              border: '1px solid rgba(255,255,255,0.03)'
            }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, textAlign: 'left' }}>Performance Breakdown</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {session.gamesList?.map((g, idx) => {
                  const act = idx + 1;
                  const hs = session.scores?.[session.hostId]?.[`act${act}`];
                  const gs = session.scores?.[session.guestId]?.[`act${act}`];
                  const hScore = Math.round(hs?.normalized || hs?.wins || hs?.goals || 0);
                  const gScore = Math.round(gs?.normalized || gs?.wins || gs?.goals || 0);
                  
                  
                  const maxPossible = Math.max(1, hScore + gScore);
                  const hPct = (hScore / maxPossible) * 100;
                  const gPct = (gScore / maxPossible) * 100;

                  const poolGame = GAMES_POOL.find(p => p.id === g.id);
                  const IconComp = poolGame ? poolGame.IconC : null;

                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontFamily: "'Syne', sans-serif" }}>
                        <span style={{ color: hScore > gScore ? C.green : 'rgba(255,255,255,0.6)', fontWeight: hScore > gScore ? 700 : 400 }}>{hScore}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {IconComp && <IconComp size={14} color="rgba(255,255,255,0.4)" />} {g.label}
                        </span>
                        <span style={{ color: gScore > hScore ? C.green : 'rgba(255,255,255,0.6)', fontWeight: gScore > hScore ? 700 : 400 }}>{gScore}</span>
                      </div>
                      <div style={{ display: 'flex', width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${hPct}%`, background: hScore > gScore ? C.green : 'rgba(255,255,255,0.3)', transition: 'width 1s ease' }} />
                        <div style={{ width: `${gPct}%`, background: gScore > hScore ? C.green : 'rgba(255,255,255,0.3)', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="button" style={{
              ...styles.primaryBtn,
              background: `linear-gradient(135deg, ${C.green}, #2cb071)`,
              color: '#000', padding: '14px 0', fontSize: '1rem',
              boxShadow: `0 8px 25px rgba(61,214,140,0.3)`
            }} onClick={leaveLobby}>
              RETURN TO MENU
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    background: C.bg,
    color: C.text,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Syne', sans-serif"
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: `1px solid ${C.border}`
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: C.text,
    fontSize: '2rem',
    cursor: 'pointer'
  },
  logo: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: 2
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    background: C.bg2,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: '24px 18px',
    maxWidth: 480,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
  },
  title: {
    fontSize: '2rem',
    fontFamily: "'Bebas Neue', sans-serif",
    marginBottom: 8,
    color: C.accent
  },
  desc: {
    fontSize: '0.9rem',
    color: C.muted,
    lineHeight: 1.5,
    marginBottom: 20
  },
  gamesSelectGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 10
  },
  gameSelectorOption: {
    padding: 10,
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textAlign: 'left',
    transition: 'all 0.15s'
  },
  playlistBox: {
    background: 'rgba(255,255,255,0.015)',
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    textAlign: 'left'
  },
  actionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  primaryBtn: {
    background: C.accent,
    color: '#000',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: 8,
    padding: '14px 20px',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%',
    transition: 'transform 0.2s'
  },
  divider: {
    fontSize: '0.8rem',
    color: C.muted,
    margin: '8px 0'
  },
  joinInputGroup: {
    display: 'flex',
    gap: 8
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    padding: '12px',
    fontSize: '1rem',
    textAlign: 'center',
    outline: 'none'
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: '0.95rem',
    cursor: 'pointer'
  },
  errorCard: {
    background: 'rgba(232, 64, 64, 0.1)',
    border: `1px solid ${C.red}`,
    color: C.red,
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 480,
    fontSize: '0.9rem',
    textAlign: 'center'
  },
  lobbyTitle: {
    fontSize: '1.5rem',
    color: C.text,
    marginBottom: 20
  },
  codeBanner: {
    background: 'rgba(255,255,255,0.03)',
    border: `1px dashed ${C.accent}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  codeLabel: {
    fontSize: '0.7rem',
    letterSpacing: 1.5,
    color: C.muted,
    marginBottom: 6
  },
  codeText: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    fontFamily: "'Space Mono', monospace",
    letterSpacing: 4,
    color: C.accent
  },
  readyIndicator: {
    color: C.green,
    fontWeight: 'bold',
    fontSize: '1.1rem',
    marginBottom: 24
  },
  lobbyVS: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 24
  },
  lobbyPlayer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6
  },
  playerName: {
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  playerRole: {
    fontSize: '0.75rem',
    color: C.muted,
    textTransform: 'uppercase'
  },
  vsText: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '1.8rem',
    color: C.muted
  },
  gameBtn: {
    background: C.green,
    color: '#000',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: 8,
    padding: '14px 20px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    width: '100%',
    marginBottom: 12
  },
  leaveBtn: {
    background: 'none',
    border: 'none',
    color: C.red,
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: 8
  },
  winTitle: {
    fontSize: '1.2rem',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  winnerText: {
    fontSize: '2.2rem',
    fontFamily: "'Bebas Neue', sans-serif",
    marginBottom: 24
  },
  scoreRow: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 32
  },
  scoreBox: {
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: '16px 24px',
    minWidth: 120
  },
  scoreName: {
    fontSize: '0.85rem',
    color: C.muted,
    marginBottom: 4
  },
  
  scoreVal: {
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  breakdownBox: {
    background: 'rgba(255,255,255,0.02)',
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: '16px',
    marginBottom: 24,
    width: '100%',
    textAlign: 'center'
  },
  breakdownTitle: {
    fontSize: '0.9rem',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${C.border}`,
  },
  bdScore: {
    fontWeight: 'bold',
    fontSize: '1.2rem',
    color: C.accent,
    width: '40px'
  },
  bdGame: {
    flex: 1,
    fontSize: '0.9rem',
    color: C.text
  }
};
