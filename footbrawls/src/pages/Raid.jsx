import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../lib/user';
import { findBuddy } from '../lib/matchmaking';
import { finalizeRaid, getRaidXpPreview } from '../lib/raidFinalize';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  pickAct1Game,
  simulateBotAct1Scores,
  simulateBotAct2Scores,
  simulateBotAct3Scores,
  determineActWinner,
  computeRaidOutcome,
  sumAct1Duo,
  sumAct1Rival,
  pickMvp,
  calculateCastleDamage,
} from '../lib/raidEngine';
import { RAID_TYPES, R, BUDDY_TIMEOUT_MS } from '../lib/raidConstants';

const Icon = {
  Shield: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Swords: ({size=20,color="currentColor"}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 3l10 10M13 3l8 8-4 4-8-8V3h4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3 13l8 8 4-4-8-8" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M13.5 20.5l-2 2M20.5 13.5l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

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
  purple:  "#A855F7",
  text:    "#F2F2F4",
  muted:   "rgba(242,242,244,0.5)",
};

const PHASES = ['lobby', 'searching', 'matched', 'act1', 'act2', 'act3', 'results'];

function injectFonts() {
  if (document.getElementById('fb-raid-fonts')) return;
  const l = document.createElement('link');
  l.id = 'fb-raid-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap';
  document.head.appendChild(l);
}

function fmtSecs(ms) {
  return Math.ceil(ms / 1000);
}

export default function Raid() {
  const navigate = useNavigate();
  const user     = useMemo(() => getUser(), []);

  const [phase, setPhase]           = useState('lobby');
  const [raidType, setRaidType]     = useState('normal');
  const [raidSeed, setRaidSeed]     = useState(() => Date.now());
  const [searchRemaining, setSearchRemaining] = useState(BUDDY_TIMEOUT_MS);
  const [match, setMatch]           = useState(null);
  const [act1Game, setAct1Game]     = useState(null);
  const [acts, setActs]             = useState({});
  const [actWinners, setActWinners] = useState([]);
  const [outcome, setOutcome]       = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('active_game_session_id'));

  const finalizeRaidFromState = useCallback(async (currentActs, raidOutcome, currentMatch, currentRaidType) => {
    setFinalizing(true);
    try {
      const perf = {
        [user.userId]: (currentActs.act1?.playerScore || 0) + ((currentActs.act2?.playerRoundWins || 0) * 20) + ((currentActs.act3?.playerGoals || 0) * 20),
      };
      const mvpId = pickMvp(perf);
      const res = await finalizeRaid({
        raidType: currentRaidType,
        outcome: raidOutcome,
        isMvp: mvpId === user.userId,
        acts: currentActs,
        match: currentMatch,
        rivalGuildCode: currentMatch?.rivals?.[0]?.homeCountry,
        playerPerformance: perf,
      });
      setFinalizeResult(res);
    } catch (err) {
      console.error('[Raid] finalize failed:', err);
    } finally {
      setFinalizing(false);
    }
  }, [user]);

  // Subscribe to real-time updates for active raid from Firestore
  useEffect(() => {
    if (!activeSessionId) {
      setPhase('lobby');
      return;
    }

    const sessionRef = doc(db, 'gameSessions', activeSessionId);
    let initialRedirectTimer;

    const unsubscribe = onSnapshot(sessionRef, async (snapshot) => {
      if (!snapshot.exists()) {
        localStorage.removeItem('active_game_session_id');
        setActiveSessionId(null);
        setPhase('lobby');
        return;
      }

      const session = snapshot.data();

      // Ensure state is aligned
      setRaidType(session.raidType || 'normal');
      setRaidSeed(session.raidSeed || Date.now());
      localStorage.setItem('active_game_session_seed', String(session.raidSeed || ''));

      const buddyObj = session.players?.find(p => p.userId !== user.userId) || null;
      const currentMatch = {
        buddy: buddyObj,
        rivals: session.rivals || [],
        isBotMatch: !buddyObj || buddyObj.userId.startsWith('bot_'),
        matchedAt: session.createdAt?.toMillis() || Date.now()
      };
      setMatch(currentMatch);

      const gameObj = session.act1Game || pickAct1Game(session.raidSeed);
      setAct1Game(gameObj);

      // Processing Acts based on scores submitted to Firestore
      const newActs = { ...session.acts };
      const newActWinners = [ ...session.actWinners ];
      let sessionUpdated = false;

      // Ensure user and buddy score objects exist
      const p1Id = user.userId;
      const p2Id = buddyObj?.userId;

      const p1Scores = session.scores?.[p1Id] || {};
      const p2Scores = buddyObj ? (session.scores?.[p2Id] || {}) : {};

      // Check if buddy has disconnected
      const hasBuddyDisconnected = session.disconnectedPlayers?.[buddyObj?.userId] === true;

      // Calculate Bot buddy if matching a bot or buddy has disconnected
      const isBotBuddy = !buddyObj || buddyObj.userId.startsWith('bot_') || hasBuddyDisconnected;
      const bots1 = simulateBotAct1Scores(gameObj.id, session.raidSeed);
      const bots2 = simulateBotAct2Scores(session.raidSeed);
      const baseBots3 = simulateBotAct3Scores(session.raidSeed);

      // Act 1
      if (p1Scores.act1 && !newActs.act1) {
        const p1ScoreVal = p1Scores.act1.normalized || 0;
        const buddyScoreVal = isBotBuddy ? bots1.buddy : (p2Scores.act1?.normalized || 0);

        // Wait until buddy submits score too if human and not disconnected
        if (isBotBuddy || p2Scores.act1) {
          const yourTotal = sumAct1Duo(p1ScoreVal, buddyScoreVal);
          const rivalTotal = sumAct1Rival(bots1.rival1, bots1.rival2);
          const winner = determineActWinner(yourTotal, rivalTotal);

          newActs.act1 = {
            gameId: gameObj.id,
            playerScore: p1ScoreVal,
            buddyScore: buddyScoreVal,
            rivalTotal,
            yourTotal,
            winner
          };
          newActWinners[0] = winner;
          sessionUpdated = true;
        }
      }

      // Act 2
      if (p1Scores.act2 && newActs.act1 && !newActs.act2) {
        const p1Wins = p1Scores.act2.wins || 0;
        const buddyWins = isBotBuddy ? bots2.buddyWins : (p2Scores.act2?.wins || 0);

        if (isBotBuddy || p2Scores.act2) {
          const yourTotal = p1Wins + buddyWins;
          const rivalTotal = bots2.rivalWins;
          const winner = determineActWinner(yourTotal, rivalTotal);

          newActs.act2 = {
            winner,
            playerRoundWins: p1Wins,
            buddyRoundWins: buddyWins,
            rivalBotWins: rivalTotal,
            yourTotal,
            rivalTotal
          };
          newActWinners[1] = winner;
          sessionUpdated = true;
        }
      }

      // Act 3
      if (p1Scores.act3 && newActs.act2 && !newActs.act3) {
        const p1Goals = p1Scores.act3.goals || 0;

        const duo1 = [user, buddyObj].filter(Boolean).sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
        const duo2 = [...(session.rivals || [])].sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
        const isUserHigher = user?.userId === duo1[0]?.userId;
        const buddy = duo1.find(p => p.userId !== user?.userId) || buddyObj;
        const buddyOpponent = isUserHigher ? duo2[0] : duo2[1];

        const buddyXpDiff = buddy ? ((buddy.totalXP || 0) - (buddyOpponent?.totalXP || 0)) : 0;
        const buddyGoalsOffset = Math.round(buddyXpDiff / 2500);
        const buddyGoals = isBotBuddy
          ? Math.max(0, Math.min(5, baseBots3.buddyGoals + buddyGoalsOffset))
          : (p2Scores.act3?.goals || 0);

        if (isBotBuddy || p2Scores.act3) {
          const yourTotal = p1Goals + buddyGoals;
          const rivalTotal = baseBots3.rivalGoals;
          const winner = determineActWinner(yourTotal, rivalTotal);

          newActs.act3 = {
            winner,
            playerGoals: p1Goals,
            playerSaves: 5 - p1Goals,
            buddyGoals,
            rivalBotGoals: rivalTotal,
            yourTotal,
            rivalTotal
          };
          newActWinners[2] = winner;
          sessionUpdated = true;
        }
      }

      if (sessionUpdated) {
        let nextActVal = session.currentAct;
        if (newActs.act3) nextActVal = 4;
        else if (newActs.act2) nextActVal = 3;
        else if (newActs.act1) nextActVal = 2;

        await updateDoc(sessionRef, {
          acts: newActs,
          actWinners: newActWinners,
          currentAct: nextActVal
        });
      }

      setActs(newActs);
      setActWinners(newActWinners);

      // UI Phase transitions
      if (session.currentAct === 1) {
        setPhase('matched');
        initialRedirectTimer = setTimeout(() => {
          navigate(gameObj.route);
        }, 2200);
      } else if (session.currentAct === 2) {
        setPhase('act2_interstitial');
      } else if (session.currentAct === 3) {
        setPhase('act3_interstitial');
      } else if (session.currentAct === 4) {
        const outcomes = computeRaidOutcome(newActWinners);
        setOutcome(outcomes);
        setPhase('results');
        
        // Finalize locally/globally
        await finalizeRaidFromState(newActs, outcomes, currentMatch, session.raidType);
        
        // Mark session as completed
        await updateDoc(sessionRef, { status: 'completed' });
        localStorage.removeItem('active_game_session_id');
      }
    });

    // Mark player as disconnected on browser refresh or navigation away
    const handleUnload = () => {
      const activeId = localStorage.getItem('active_game_session_id');
      if (activeId && user?.userId) {
        const url = `https://firestore.googleapis.com/v1/projects/footbrawls/databases/(default)/documents/gameSessions/${activeId}?updateMask.fieldPaths=disconnectedPlayers.${user.userId}`;
        const payload = JSON.stringify({
          fields: {
            [`disconnectedPlayers.${user.userId}`]: { booleanValue: true }
          }
        });
        
        // Use sendBeacon or synchronous XHR to guarantee transmission during unload
        try {
          if (navigator.sendBeacon) {
            navigator.sendBeacon(url, payload);
          } else {
            const xhr = new XMLHttpRequest();
            xhr.open('PATCH', url, false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(payload);
          }
        } catch (e) {}
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
      if (initialRedirectTimer) clearTimeout(initialRedirectTimer);
    };
  }, [activeSessionId, user, navigate, finalizeRaidFromState]);

  useEffect(() => { injectFonts(); }, []);

  const startSearch = useCallback(async (type) => {
    if (!user) return;
    setRaidType(type);
    setPhase('searching');
    setSearchRemaining(BUDDY_TIMEOUT_MS);

    try {
      const result = await findBuddy(user, type, ({ remaining }) => {
        setSearchRemaining(remaining);
      });

      // Check if result returned a session ID (for human matching)
      if (result.sessionId) {
        localStorage.setItem('active_game_session_id', result.sessionId);
        localStorage.setItem('active_game_session_seed', String(result.matchedAt || Date.now()));
        setActiveSessionId(result.sessionId);
      } else {
        // Local Bot session creation (fallback / training)
        const mockSessionId = `bot_raid_${Date.now()}`;
        const seedVal = result.matchedAt || Date.now();
        const act1GameObj = pickAct1Game(seedVal);
        
        const sessionRef = doc(db, 'gameSessions', mockSessionId);
        await setDoc(sessionRef, {
          sessionId: mockSessionId,
          sessionType: 'raid',
          raidType: type,
          raidSeed: seedVal,
          players: [
            {
              userId: user.userId,
              nickname: user.nickname,
              flag: user.flag || '',
              homeCountry: user.homeCountry,
              totalXP: user.totalXP || 0,
            }
          ],
          rivals: result.rivals || [],
          act1Game: act1GameObj,
          currentAct: 1,
          scores: {},
          acts: {},
          actWinners: [],
          status: 'active',
        });

        localStorage.setItem('active_game_session_id', mockSessionId);
        localStorage.setItem('active_game_session_seed', String(seedVal));
        setActiveSessionId(mockSessionId);
      }
    } catch (err) {
      console.error('[Raid] Matchmaking or session creation failed:', err);
      setPhase('lobby');
    }
  }, [user]);

  if (!user) {
    return (
      <div style={s.page}>
        <p style={{ color: C.muted }}>Please complete onboarding first.</p>
        <button type="button" style={s.backBtn} onClick={() => navigate('/onboarding')}>Onboarding</button>
      </div>
    );
  }

  const standings = useMemo(() => {
    if (!match) return [];
    
    // Act 1
    const a1You = acts.act1?.playerScore || 0;
    const a1Buddy = acts.act1?.buddyScore || 0;
    const a1Bots = acts.act1?.gameId ? simulateBotAct1Scores(acts.act1.gameId, raidSeed) : { rival1: 0, rival2: 0 };
    const a1Rival1 = a1Bots.rival1;
    const a1Rival2 = a1Bots.rival2;

    // Act 2
    const a2You = (acts.act2?.playerRoundWins || 0) * 20;
    const a2Buddy = (acts.act2?.buddyRoundWins || 0) * 20;
    const a2TotalRivals = (acts.act2?.rivalBotWins || 0) * 20;
    const a2Rival1 = Math.round(a2TotalRivals / 2);
    const a2Rival2 = a2TotalRivals - a2Rival1;

    // Act 3
    const a3You = (acts.act3?.playerGoals || 0) * 20;
    const a3Buddy = (acts.act3?.buddyGoals || 0) * 20;
    const a3TotalRivals = (acts.act3?.rivalBotGoals || 0) * 20;
    const a3Rival1 = Math.round(a3TotalRivals / 2);
    const a3Rival2 = a3TotalRivals - a3Rival1;

    const list = [
      {
        nickname: user.nickname,
        flag: user.flag || '🛡️',
        act1: a1You,
        act2: a2You,
        act3: a3You,
        total: Number((a1You + a2You + a3You).toFixed(1)),
        isUser: true
      },
      {
        nickname: match.buddy?.nickname || 'Buddy',
        flag: match.buddy?.flag || '🛡️',
        act1: a1Buddy,
        act2: a2Buddy,
        act3: a3Buddy,
        total: Number((a1Buddy + a2Buddy + a3Buddy).toFixed(1))
      },
      {
        nickname: match.rivals?.[0]?.nickname || 'Rival 1',
        flag: match.rivals?.[0]?.flag || '⚔️',
        act1: a1Rival1,
        act2: a2Rival1,
        act3: a3Rival1,
        total: Number((a1Rival1 + a2Rival1 + a3Rival1).toFixed(1))
      },
      {
        nickname: match.rivals?.[1]?.nickname || 'Rival 2',
        flag: match.rivals?.[1]?.flag || '⚔️',
        act1: a1Rival2,
        act2: a2Rival2,
        act3: a3Rival2,
        total: Number((a1Rival2 + a2Rival2 + a3Rival2).toFixed(1))
      }
    ];

    return list.sort((a, b) => b.total - a.total);
  }, [user, match, acts, raidSeed]);

  const xpPreview = getRaidXpPreview(raidType, outcome);
  const isTraining = raidType === 'training';
  const damagePreview = outcome === 'win' && !isTraining
    ? calculateCastleDamage(raidType, 1)
    : 0;

  return (
    <div style={s.page}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}'}</style>
      <nav style={s.nav}>
        <button type="button" style={s.backBtn} onClick={() => navigate('/')}>‹</button>
        <span style={{ ...s.logo, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon.Swords size={20} color={C.accent} />
          RAID
        </span>
        <button type="button" style={{ ...s.guildBtn, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => navigate('/guild')}>
          <Icon.Shield size={18} color={C.accent} />
        </button>
      </nav>

      <main style={s.main}>
        {phase === 'lobby' && (
          <div style={s.section}>
            <h1 style={s.title}>Challenge Raid</h1>
            <p style={s.desc}>Team up with a buddy. Win 2 of 3 acts to raid a rival guild&apos;s castle.</p>

            <div style={s.modeGrid}>
              {Object.values(RAID_TYPES).map(mode => (
                <button key={mode.id} type="button" style={{
                  ...s.modeCard,
              borderColor: mode.id === 'challenge' ? C.accent : C.border,
                }} onClick={() => startSearch(mode.id)}>
                  <div style={s.modeLabel}>{mode.label}</div>
                  <div style={s.modeXp}>
                    {mode.id === 'training'
                      ? 'No XP · Practice'
                      : `Win +${mode.winXP} XP · Loss +${mode.lossXP}`}
                  </div>
                  {mode.castleDamagePct > 0 && (
                    <div style={s.modeDmg}>{Math.round(mode.castleDamagePct * 100)}% castle damage on win</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'searching' && (
          <div style={s.center}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: '2.5rem' }}>{user?.flag || '🛡️'}</span>
              <div style={s.spinner} />
            </div>
            <h2 style={s.searchTitle}>Finding a buddy…</h2>
            <p style={s.muted}>Matchmaking · {fmtSecs(searchRemaining)}s left</p>
          </div>
        )}

        {phase === 'matched' && match && (
          <div style={s.section}>
            <h2 style={s.searchTitle}>Squad locked in!</h2>
            <div style={s.teams}>
              <div style={s.teamBox}>
                <div style={s.teamHdr}>Your Duo</div>
                {[user, match.buddy].map(p => (
                  <div key={p.userId} style={s.playerRow}>
                    <span>{p.flag}</span>
                    <span>{p.nickname}</span>
                    {p.isBot && raidType === 'training' && <span style={s.botTag}>BOT</span>}
                  </div>
                ))}
              </div>
              <div style={s.vs}>VS</div>
              <div style={s.teamBox}>
                <div style={s.teamHdr}>Rivals</div>
                {match.rivals.map(p => (
                  <div key={p.userId} style={s.playerRow}>
                    <span>{p.flag}</span>
                    <span>{p.nickname}</span>
                    {raidType === 'training' && <span style={s.botTag}>BOT</span>}
                  </div>
                ))}
              </div>
            </div>
            {match.isBotMatch && raidType === 'training' && (
              <p style={s.muted}>Bot match — no humans available yet</p>
            )}
          </div>
        )}

        {phase === 'act2_interstitial' && match && (
          <div style={s.section}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚡</div>
              <h2 style={s.searchTitle}>Act 1 Completed!</h2>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, margin: '14px 0', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span>Act 1 Result:</span>
                  <span style={{ fontWeight: 'bold', color: actWinners[0] === 'you' ? C.green : actWinners[0] === 'rival' ? C.red : C.muted }}>
                    {actWinners[0] === 'you' ? '🏆 Won' : actWinners[0] === 'rival' ? '💀 Lost' : '🤝 Draw'}
                  </span>
                </div>
              </div>

              {/* Point Breakdown Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, margin: '14px 0', border: `1px solid ${C.border}`, textAlign: 'left' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.68rem', letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
                  📊 ACT 1 POINT BREAKDOWN
                </div>
                
                {/* Your Duo */}
                <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: C.accent }}>
                    <span>🛡️ Your Duo Total</span>
                    <span>{acts.act1?.yourTotal} pts</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', paddingLeft: 14, marginTop: 4, color: C.muted }}>
                    <span>You ({user.nickname})</span>
                    <span>{acts.act1?.playerScore} pts</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', paddingLeft: 14, marginTop: 2, color: C.muted }}>
                    <span>{match.buddy?.nickname}</span>
                    <span>{acts.act1?.buddyScore} pts</span>
                  </div>
                </div>

                {/* Rivals */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: C.red }}>
                    <span>⚔️ Rivals Total</span>
                    <span>{acts.act1?.rivalTotal} pts</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: C.muted, fontStyle: 'italic', paddingLeft: 14, marginTop: 4 }}>
                    Combined score of {match.rivals?.[0]?.nickname || 'Rival 1'} & {match.rivals?.[1]?.nickname || 'Rival 2'}
                  </div>
                </div>
              </div>

              <p style={{ ...s.muted, margin: '12px 0 20px', lineHeight: 1.5 }}>
                Next up: **Act 2 — Dribble Gauntlet**. Dribble past defenders and slot it past the keeper.
              </p>

              <button type="button" style={s.primaryBtn} onClick={() => navigate('/games/dribble')}>
                ⚔️ Play Act 2 — Dribble
              </button>
            </div>
          </div>
        )}

        {phase === 'act3_interstitial' && match && (
          <div style={s.section}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧤</div>
              <h2 style={s.searchTitle}>Act 2 Completed!</h2>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, margin: '14px 0', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                  <span>Act 1 Result:</span>
                  <span style={{ fontWeight: 'bold', color: actWinners[0] === 'you' ? C.green : actWinners[0] === 'rival' ? C.red : C.muted }}>
                    {actWinners[0] === 'you' ? 'Won' : actWinners[0] === 'rival' ? 'Lost' : 'Draw'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span>Act 2 Result:</span>
                  <span style={{ fontWeight: 'bold', color: actWinners[1] === 'you' ? C.green : actWinners[1] === 'rival' ? C.red : C.muted }}>
                    {actWinners[1] === 'you' ? 'Won' : actWinners[1] === 'rival' ? 'Lost' : 'Draw'}
                  </span>
                </div>
              </div>

              {/* Point Breakdown Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, margin: '14px 0', border: `1px solid ${C.border}`, textAlign: 'left' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.68rem', letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
                  📊 ACT 2 POINT BREAKDOWN
                </div>

                {/* Your Duo */}
                <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: C.accent }}>
                    <span>🛡️ Your Duo Total</span>
                    <span>{acts.act2?.yourTotal * 20} pts</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', paddingLeft: 14, marginTop: 4, color: C.muted }}>
                    <span>You ({user.nickname})</span>
                    <span>{acts.act2?.playerRoundWins * 20} pts</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', paddingLeft: 14, marginTop: 2, color: C.muted }}>
                    <span>{match.buddy?.nickname}</span>
                    <span>{acts.act2?.buddyRoundWins * 20} pts</span>
                  </div>
                </div>

                {/* Rivals */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: C.red }}>
                    <span>⚔️ Rivals Total</span>
                    <span>{acts.act2?.rivalTotal * 20} pts</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: C.muted, fontStyle: 'italic', paddingLeft: 14, marginTop: 4 }}>
                    Defenders bypassed by your opponents
                  </div>
                </div>
              </div>

              <p style={{ ...s.muted, margin: '12px 0 20px', lineHeight: 1.5 }}>
                Final showdown: **Act 3 — Penalty Shootout**. The high-stakes 5-kick shootout.
              </p>

              <button type="button" style={s.primaryBtn} onClick={() => navigate('/games/penaltynerve')}>
                ⚽ Play Act 3 — Penalty Shootout
              </button>
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div style={{ ...s.section, position: 'relative' }}>
            <ParticleEffect type={outcome === 'win' ? 'win' : 'loss'} />
            
            <div style={{
              ...s.outcomeBanner,
              borderColor: outcome === 'win' ? C.green : outcome === 'loss' ? C.red : C.muted,
              color: outcome === 'win' ? C.green : outcome === 'loss' ? C.red : C.muted,
              background: outcome === 'win' ? 'rgba(61, 214, 140, 0.05)' : 'rgba(232, 64, 64, 0.05)',
              boxShadow: outcome === 'win' ? '0 0 20px rgba(61, 214, 140, 0.15)' : '0 0 20px rgba(232, 64, 64, 0.15)',
              transition: 'all 0.5s ease',
            }}>
              {outcome === 'win' ? '🏆 RAID VICTORIOUS' : outcome === 'loss' ? '💀 RAID DEFEATED' : '🤝 POINTS DRAWN'}
            </div>

            <div style={s.actSummary}>
              {['act1', 'act2', 'act3'].map((key, i) => {
                const w = actWinners[i];
                return (
                  <div key={key} style={s.actRow}>
                    <span>Act {i + 1}</span>
                    <span style={{ fontWeight: 'bold', color: w === 'you' ? C.green : w === 'rival' ? C.red : C.muted }}>
                      {w === 'you' ? 'Won' : w === 'rival' ? 'Lost' : 'Draw'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Standings Leaderboard */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              position: 'relative',
              zIndex: 2
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.72rem', letterSpacing: 1.5, color: C.purple, textTransform: 'uppercase', marginBottom: 12, fontWeight: 'bold' }}>
                🏆 FINAL RAID STANDINGS (ALL ACTS)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {standings.map((p, idx) => (
                  <div key={p.nickname} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: p.isUser ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${p.isUser ? 'rgba(168, 85, 247, 0.3)' : C.border}`,
                    borderRadius: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", color: idx === 0 ? C.accent : C.muted, fontWeight: 'bold' }}>
                        #{idx + 1}
                      </span>
                      <span>{p.flag}</span>
                      <span style={{ fontWeight: p.isUser ? 'bold' : 'normal', color: p.isUser ? C.text : 'inherit' }}>
                        {p.nickname} {p.isUser && '(You)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.72rem', color: C.muted, fontFamily: "'Space Mono', monospace" }}>
                        Act scores: {p.act1} | {p.act2} | {p.act3}
                      </span>
                      <span style={{ fontWeight: 'bold', color: idx === 0 ? C.accent : C.text, fontFamily: "'Space Mono', monospace" }}>
                        {p.total} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Castle HP Damage Slider Visual on Win */}
            {outcome === 'win' && !isTraining && (
              <CastleDamageVisual
                damagePct={RAID_TYPES[raidType]?.castleDamagePct || 0.20}
                rivalName={match?.rivals?.[0]?.homeCountry}
              />
            )}

            {!isTraining && (
              <div style={s.xpBox}>
                {finalizing ? (
                  <span style={s.muted}>Updating Guild Castle HP & XP…</span>
                ) : (
                  <>
                    <div>+{(finalizeResult?.xpResults?.win?.xpAwarded ?? xpPreview.win) || xpPreview.loss} XP</div>
                    {finalizeResult?.xpResults?.mvp?.xpAwarded > 0 && (
                      <div style={{ color: C.accent, marginTop: 6, fontSize: '0.9rem', fontFamily: "'Space Mono', monospace" }}>
                        🔥 MVP BONUS +{finalizeResult.xpResults.mvp.xpAwarded} XP
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {isTraining && (
              <p style={{ ...s.muted, textAlign: 'center', margin: '20px 0' }}>Training mode — no XP awarded</p>
            )}

            {finalizeResult?.serverResult?.curseLifted && (
              <div style={s.curseLift}>🎉 Curse lifted! (3 raid wins achieved)</div>
            )}

            <button type="button" style={s.primaryBtn} onClick={() => navigate('/guild')}>
              Back to Guild Castle
            </button>
            <button type="button" style={s.secondaryBtn} onClick={() => { setPhase('lobby'); setActs({}); setActWinners([]); setOutcome(null); setMatch(null); }}>
              Raid Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Particle Canvas Component for Win/Loss Celebrations
function ParticleEffect({ type }) {
  const canvasRef = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    const particles = [];

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = 350;
    };
    resize();

    const count = type === 'win' ? 100 : 40;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -300,
        size: type === 'win' ? Math.random() * 6 + 4 : Math.random() * 12 + 16,
        color: type === 'win'
          ? `hsla(${Math.random() * 360}, 90%, 50%, 0.9)`
          : null,
        vy: Math.random() * 3 + 1.5,
        vx: Math.random() * 2 - 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: Math.random() * 0.08 - 0.04
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        p.rotation += p.rotationSpeed;

        if (p.y > canvas.height) {
          p.y = -30;
          p.x = Math.random() * canvas.width;
        }

        if (type === 'win') {
          // Draw colored confetti
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2);
          ctx.restore();
        } else {
          // Draw falling heartbreak emojis 💔
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.font = `${p.size}px serif`;
          ctx.fillText('💔', -p.size / 2, p.size / 2);
          ctx.restore();
        }
      });
      animationId = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [type]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 350,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

// Castle Damage Animation Slider
function CastleDamageVisual({ damagePct, rivalName }) {
  const [hp, setHp] = useState(100);
  useEffect(() => {
    const timer = setTimeout(() => {
      setHp(100 - damagePct * 100);
    }, 500);
    return () => clearTimeout(timer);
  }, [damagePct]);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: 16,
      marginTop: 16,
      marginBottom: 16,
      textAlign: 'left',
      position: 'relative',
      zIndex: 2,
    }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: C.purple, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>
        🏰 RIVAL CASTLE SIEGED
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: 8 }}>
        <span>{rivalName || 'Rival'} Guild Castle</span>
        <span style={{ color: C.red }}>{hp.toFixed(0)}% HP</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, ${C.red}, ${C.purple})`,
          transition: 'transform 1.5s cubic-bezier(0.1, 1, 0.1, 1)',
          transform: `scaleX(${hp / 100})`,
          transformOrigin: 'left',
        }} />
      </div>
      <div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 6, fontStyle: 'italic' }}>
        Dealt {Math.round(damagePct * 100)}% Damage to their castle!
      </div>
    </div>
  );
}

const s = {
  page:          { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Syne', sans-serif", paddingBottom: 40 },
  nav:           { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 60, borderBottom: `1px solid ${C.border}`, background: 'rgba(6,8,16,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 },
  backBtn:       { background: 'none', border: 'none', color: C.muted, fontSize: 28, cursor: 'pointer', padding: 0 },
  guildBtn:      { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontSize: 18 },
  logo:          { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: 3, color: C.accent },
  main:          { maxWidth: 520, margin: '0 auto', padding: '24px 20px' },
  section:       { animation: 'fadeUp 0.35s ease' },
  title:         { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.4rem', letterSpacing: 2, margin: '0 0 8px' },
  desc:          { color: C.muted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 },
  modeGrid:      { display: 'flex', flexDirection: 'column', gap: 12 },
  modeCard:      { padding: '18px 16px', background: C.surface, border: '1px solid', borderRadius: 14, cursor: 'pointer', textAlign: 'left', color: C.text, transition: 'border-color 0.2s' },
  modeLabel:     { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: 1.5, marginBottom: 6 },
  modeXp:        { fontSize: '0.78rem', color: C.muted },
  modeDmg:       { fontSize: '0.68rem', color: C.purple, marginTop: 6, fontFamily: "'Space Mono', monospace", letterSpacing: 0.5 },
  center:        { textAlign: 'center', padding: '60px 0' },
  spinner:       { width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: C.accent, margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' },
  searchTitle:   { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: 2, marginBottom: 8 },
  muted:         { color: C.muted, fontSize: '0.82rem' },
  teams:         { display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 },
  teamBox:       { flex: 1, padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 },
  teamHdr:       { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', letterSpacing: 2, color: C.muted, marginBottom: 10, textTransform: 'uppercase' },
  playerRow:     { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.85rem' },
  botTag:        { fontSize: '0.55rem', padding: '2px 6px', borderRadius: 99, background: 'rgba(247,195,68,0.15)', color: C.accent, fontWeight: 700 },
  vs:            { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: C.muted },
  outcomeBanner: { textAlign: 'center', padding: '20px 16px', border: '2px solid', borderRadius: 16, fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: 3, marginBottom: 20 },
  actSummary:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20, position: 'relative', zIndex: 2 },
  actRow:        { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.88rem', borderBottom: `1px solid ${C.border}` },
  xpBox:         { textAlign: 'center', padding: 16, background: 'rgba(61,214,140,0.08)', border: `1px solid rgba(61,214,140,0.25)`, borderRadius: 12, marginBottom: 16, fontWeight: 800, fontSize: '1.2rem', color: C.green, position: 'relative', zIndex: 2 },
  curseLift:     { textAlign: 'center', padding: 12, background: 'rgba(247,195,68,0.1)', border: '1px solid rgba(247,195,68,0.3)', borderRadius: 12, color: C.accent, marginBottom: 16, fontWeight: 700, position: 'relative', zIndex: 2 },
  primaryBtn:    { width: '100%', padding: 16, background: `linear-gradient(135deg, ${C.accent}, #e8a800)`, color: '#111', border: 'none', borderRadius: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 10, letterSpacing: 1, position: 'relative', zIndex: 2 },
  secondaryBtn:  { width: '100%', padding: 14, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', fontWeight: 600, position: 'relative', zIndex: 2 },
};
