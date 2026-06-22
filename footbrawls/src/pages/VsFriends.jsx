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
};

const GAMES = [
  { id: 'whoareya_correct', label: 'Who Are Ya?', route: '/games/whoareya' },
  { id: 'wordle_correct', label: 'Wordle', route: '/games/wordle' },
  { id: 'higherLower_correct', label: 'Higher or Lower', route: '/games/higherlower' },
  { id: 'transferTrail_correct', label: 'Transfer Trail', route: '/games/transfertrail' },
  { id: 'dribble_correct', label: 'Dribble Gauntlet', route: '/games/dribble' },
  { id: 'penaltyNerve_all5', label: 'Penalty Shootout', route: '/games/penaltynerve' },
];

export default function VsFriends() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);

  const [mode, setMode] = useState('menu'); // menu | hosting | joining | lobby | results
  const [inviteCode, setInviteCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('active_game_session_id'));
  const [session, setSession] = useState(null);
  const [selectedGame, setSelectedGame] = useState(GAMES[0]);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-subscribe if active session exists in storage
  useEffect(() => {
    if (!sessionId) return;
    const ref = doc(db, 'gameSessions', sessionId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.sessionType === 'vs_friends') {
          setSession(data);
          setMode(data.status === 'completed' ? 'results' : 'lobby');
        }
      } else {
        localStorage.removeItem('active_game_session_id');
        setSessionId(null);
        setMode('menu');
      }
    });
    return () => unsub();
  }, [sessionId]);

  const generateInviteCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  };

  const startHosting = async () => {
    if (!user) return;
    setErrorMsg('');
    const code = generateInviteCode();
    const sid = `vs_${Date.now()}`;

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
      gameSelected: selectedGame,
      scores: {},
      status: 'waiting',
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'gameSessions', sid), sessionData);
      localStorage.setItem('active_game_session_id', sid);
      setSessionId(sid);
      setInviteCode(code);
      setSession(sessionData);
      setMode('lobby');
    } catch (err) {
      setErrorMsg('Failed to host lobby: ' + err.message);
    }
  };

  const joinLobby = async () => {
    if (!user || !inputCode) return;
    setErrorMsg('');

    try {
      const q = query(
        collection(db, 'gameSessions'),
        where('inviteCode', '==', inputCode.trim()),
        where('status', '==', 'waiting')
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setErrorMsg('Invalid or expired lobby code.');
        return;
      }

      const matchDoc = snap.docs[0];
      const sid = matchDoc.id;

      await updateDoc(doc(db, 'gameSessions', sid), {
        guestId: user.userId,
        guestName: user.nickname,
        guestFlag: user.flag || '🛡️',
        status: 'active',
      });

      localStorage.setItem('active_game_session_id', sid);
      setSessionId(sid);
      setMode('lobby');
    } catch (err) {
      setErrorMsg('Failed to join lobby: ' + err.message);
    }
  };

  const changeGame = async (game) => {
    setSelectedGame(game);
    if (sessionId) {
      await updateDoc(doc(db, 'gameSessions', sessionId), {
        gameSelected: game
      });
    }
  };

  const handleStartGame = () => {
    if (!session || !session.gameSelected) return;
    navigate(session.gameSelected.route);
  };

  const leaveLobby = async () => {
    localStorage.removeItem('active_game_session_id');
    setSessionId(null);
    setSession(null);
    setMode('menu');
  };

  const winnerInfo = useMemo(() => {
    if (!session || !session.scores) return null;
    const hostScore = session.scores[session.hostId] ?? null;
    const guestScore = session.scores[session.guestId] ?? null;

    if (hostScore === null || guestScore === null) return null;

    let text = 'Draw Match!';
    let winnerId = null;

    if (hostScore > guestScore) {
      text = `${session.hostName} Wins!`;
      winnerId = session.hostId;
    } else if (guestScore > hostScore) {
      text = `${session.guestName} Wins!`;
      winnerId = session.guestId;
    }

    return { hostScore, guestScore, text, winnerId };
  }, [session]);

  // Complete game resolve if both scores ready
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const hostScore = session.scores?.[session.hostId];
    const guestScore = session.scores?.[session.guestId];
    if (hostScore !== undefined && guestScore !== undefined) {
      updateDoc(doc(db, 'gameSessions', session.sessionId), {
        status: 'completed'
      });
    }
  }, [session]);

  const isHost = session?.hostId === user?.userId;

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <button type="button" style={styles.backBtn} onClick={() => navigate('/')}>‹</button>
        <span style={styles.logo}>VS FRIENDS</span>
        <div style={{ width: 40 }} />
      </nav>

      <main style={styles.main}>
        {errorMsg && <div style={styles.errorCard}>{errorMsg}</div>}

        {mode === 'menu' && (
          <div style={styles.card}>
            <h1 style={styles.title}>Play Head-to-Head</h1>
            <p style={styles.desc}>Host a lobby, invite your friend, and compete live on the same mini-game challenge!</p>

            <div style={styles.actionContainer}>
              <div style={styles.selectGroup}>
                <label style={styles.label}>Select Game Mode</label>
                <select 
                  style={styles.select}
                  value={selectedGame.id}
                  onChange={(e) => setSelectedGame(GAMES.find(g => g.id === e.target.value))}
                >
                  {GAMES.map(g => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>

              <button type="button" style={styles.primaryBtn} onClick={startHosting}>
                Create Friendly Lobby
              </button>

              <div style={styles.divider}>OR</div>

              <div style={styles.joinInputGroup}>
                <input
                  type="text"
                  placeholder="Enter 6-digit Code"
                  style={styles.input}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="button" style={styles.secondaryBtn} onClick={joinLobby}>
                  Join Match
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'lobby' && session && (
          <div style={styles.card}>
            <h2 style={styles.lobbyTitle}>Match Lobby</h2>

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

            <div style={styles.gameIndicator}>
              Selected Challenge: <span style={{ color: C.accent, fontWeight: 'bold' }}>{session.gameSelected?.label}</span>
            </div>

            {session.status === 'active' && (
              <button type="button" style={styles.gameBtn} onClick={handleStartGame}>
                🎮 Start Game Challenge
              </button>
            )}

            <button type="button" style={styles.leaveBtn} onClick={leaveLobby}>
              Leave Lobby
            </button>
          </div>
        )}

        {mode === 'results' && session && winnerInfo && (
          <div style={styles.card}>
            <h2 style={styles.winTitle}>Match Finished</h2>
            <h1 style={{ ...styles.winnerText, color: winnerInfo.winnerId === user.userId ? C.green : winnerInfo.winnerId ? C.red : C.muted }}>
              {winnerInfo.text}
            </h1>

            <div style={styles.scoreRow}>
              <div style={styles.scoreBox}>
                <div style={styles.scoreName}>{session.hostName}</div>
                <div style={styles.scoreVal}>{winnerInfo.hostScore}</div>
              </div>
              <div style={styles.scoreBox}>
                <div style={styles.scoreName}>{session.guestName}</div>
                <div style={styles.scoreVal}>{winnerInfo.guestScore}</div>
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
    padding: 32,
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
    marginBottom: 24
  },
  actionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  selectGroup: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    gap: 6
  },
  label: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: C.muted
  },
  select: {
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    padding: '12px 16px',
    fontSize: '0.95rem',
    outline: 'none'
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
  gameIndicator: {
    background: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: '0.9rem',
    marginBottom: 24
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
