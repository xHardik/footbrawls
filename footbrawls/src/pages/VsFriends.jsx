// src/pages/VsFriends.jsx
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

const GAMES_POOL = [
  { id: 'whoareya_correct', label: 'Who Are Ya?', route: '/games/whoareya', icon: '👤' },
  { id: 'wordle_correct', label: 'Player Wordle', route: '/games/wordle', icon: '🟩' },
  { id: 'higherLower_correct', label: 'Higher or Lower', route: '/games/higherlower', icon: '📊' },
  { id: 'transferTrail_correct', label: 'Transfer Trail', route: '/games/transfertrail', icon: '🔗' },
  { id: 'top10', label: 'Top 10 Guess', route: '/games/top10', icon: '🏆' },
  { id: 'dailyTrivia', label: 'Daily Trivia', route: '/games/dailytrivia', icon: '📝' },
  { id: 'dribble_correct', label: 'Dribble Gauntlet', route: '/games/dribble', icon: '⚽' },
  { id: 'penaltyNerve_all5', label: 'Penalty Shootout', route: '/games/penaltynerve', icon: '🥅' }
];

export default function VsFriends() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);

  const [mode, setMode] = useState('menu'); // menu | hosting | lobby | results
  const [inviteCode, setInviteCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('active_game_session_id'));
  const [session, setSession] = useState(null);
  const [selectedGames, setSelectedGames] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state with storage / Firebase
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
        localStorage.removeItem('active_game_session_id');
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
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
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
    const playlist = GAMES_POOL.filter(g => selectedGames.includes(g.id));

    // Custom randomized seed generated on hosting to bypass daily seeds and stay unique
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
      localStorage.setItem('active_game_session_id', sid);
      localStorage.setItem('active_game_session_seed', uniqueSessionSeed);
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

      localStorage.setItem('active_game_session_id', sid);
      localStorage.setItem('active_game_session_seed', data.raidSeed || String(Date.now()));
      setSessionId(sid);
      setMode('lobby');
    } catch (err) {
      setErrorMsg('Failed to join lobby: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    if (!session) return;
    const currentGameIndex = session.currentAct - 1;
    const currentGame = session.gamesList?.[currentGameIndex];
    if (currentGame) {
      navigate(currentGame.route);
    }
  };

  const leaveLobby = async () => {
    localStorage.removeItem('active_game_session_id');
    localStorage.removeItem('active_game_session_seed');
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
    return sum;
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
    return sum;
  }, [session]);

  // Overall winner determination logic
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

  // Act-advancement trigger when both scores are submitted
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
      <nav style={styles.nav}>
        <button type="button" style={styles.backBtn} onClick={() => navigate('/')}>‹</button>
        <span style={styles.logo}>CUSTOM VS FRIEND</span>
        <div style={{ width: 40 }} />
      </nav>

      <main style={styles.main}>
        {errorMsg && <div style={styles.errorCard}>{errorMsg}</div>}

        {mode === 'menu' && (
          <div style={styles.card}>
            <h1 style={styles.title}>Play Head-to-Head</h1>
            <p style={styles.desc}>Select exactly 5 games below, host a lobby, and share the code to play live against your friend!</p>

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
                      border: selected ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
                      background: selected ? 'rgba(247,195,68,0.1)' : 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{g.icon}</span>
                    <span style={{ fontSize: 11, fontFamily:"'Orbitron',sans-serif", color: selected ? C.accent : C.text }}>{g.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ margin: '14px 0', fontSize: 12, color: C.muted }}>
              Selected: <strong style={{ color: C.accent }}>{selectedGames.length}/5</strong>
            </div>

            <div style={styles.actionContainer}>
              <button
                type="button"
                style={{ ...styles.primaryBtn, opacity: selectedGames.length === 5 ? 1 : 0.5 }}
                disabled={selectedGames.length !== 5 || loading}
                onClick={startHosting}
              >
                {loading ? 'Creating Lobby...' : 'Host Friendly Match'}
              </button>

              <div style={styles.divider}>OR JOIN A ROOM</div>

              <div style={styles.joinInputGroup}>
                <input
                  type="text"
                  placeholder="6-digit Lobby Code"
                  style={styles.input}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="button" style={styles.secondaryBtn} onClick={joinLobby} disabled={loading}>
                  {loading ? 'Joining...' : 'Join Lobby'}
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
                      <span style={{ fontSize: 12, fontFamily:"'Orbitron',sans-serif", color: isActive ? C.accent : isCompleted ? C.green : C.text }}>
                        Act {idx + 1}: {g.label}
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
              <button type="button" style={styles.gameBtn} onClick={handleStartGame}>
                🎮 Launch Act {session.currentAct}
              </button>
            )}

            <button type="button" style={styles.leaveBtn} onClick={leaveLobby}>
              Leave Lobby
            </button>
          </div>
        )}

        {mode === 'results' && session && winnerInfo && (
          <div style={styles.card}>
            <h2 style={styles.winTitle}>Tournament Finished</h2>
            <h1 style={{ ...styles.winnerText, color: winnerInfo.winnerId === user.userId ? C.green : winnerInfo.winnerId ? C.red : C.muted }}>
              {winnerInfo.text}
            </h1>

            <div style={styles.scoreRow}>
              <div style={styles.scoreBox}>
                <div style={styles.scoreName}>{session.hostName}</div>
                <div style={styles.scoreVal}>{winnerInfo.hostTotalPoints} pts</div>
              </div>
              <div style={styles.scoreBox}>
                <div style={styles.scoreName}>{session.guestName}</div>
                <div style={styles.scoreVal}>{winnerInfo.guestTotalPoints} pts</div>
              </div>
            </div>

            <button type="button" style={styles.primaryBtn} onClick={leaveLobby}>
              Back to Menu
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
  }
};
