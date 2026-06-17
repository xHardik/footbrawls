// src/pages/Raid.jsx
// Full raid lobby: mode pick → buddy search → acts 1–3 → results

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../lib/user';
import { findBuddy } from '../lib/matchmaking';
import { finalizeRaid, getRaidXpPreview } from '../lib/raidFinalize';
import {
  pickAct1Game,
  simulateBotAct1Scores,
  determineActWinner,
  computeRaidOutcome,
  sumAct1Duo,
  sumAct1Rival,
  pickMvp,
  calculateCastleDamage,
} from '../lib/raidEngine';
import { RAID_TYPES, R, BUDDY_TIMEOUT_MS } from '../lib/raidConstants';
import RaidAct1 from '../components/RaidAct1';
import RaidAct2 from '../components/RaidAct2';
import RaidAct3 from '../components/RaidAct3';

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
  const user     = getUser();

  const [phase, setPhase]           = useState('lobby');
  const [raidType, setRaidType]     = useState('normal');
  const [raidSeed]                  = useState(() => Date.now());
  const [searchRemaining, setSearchRemaining] = useState(BUDDY_TIMEOUT_MS);
  const [match, setMatch]           = useState(null);
  const [act1Game, setAct1Game]     = useState(null);
  const [acts, setActs]             = useState({});
  const [actWinners, setActWinners] = useState([]);
  const [outcome, setOutcome]       = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState(null);

  useEffect(() => { injectFonts(); }, []);

  const startSearch = useCallback(async (type) => {
    if (!user) return;
    setRaidType(type);
    setPhase('searching');
    setSearchRemaining(BUDDY_TIMEOUT_MS);

    const result = await findBuddy(user, type, ({ remaining }) => {
      setSearchRemaining(remaining);
    });

    setMatch(result);
    setAct1Game(pickAct1Game(raidSeed));
    setPhase('matched');
    setTimeout(() => setPhase('act1'), 2200);
  }, [user, raidSeed]);

  const handleAct1Done = useCallback(({ gameId, result, normalized }) => {
    const bots = simulateBotAct1Scores(gameId, raidSeed);
    const yourTotal  = sumAct1Duo(normalized, bots.buddy);
    const rivalTotal = sumAct1Rival(bots.rival1, bots.rival2);
    const winner     = determineActWinner(yourTotal, rivalTotal);

    const act1 = { gameId, playerScore: normalized, buddyScore: bots.buddy, rivalTotal, yourTotal, winner };
    setActs(prev => ({ ...prev, act1 }));
    setActWinners(prev => [...prev, winner]);
    setTimeout(() => setPhase('act2'), 1400);
  }, [raidSeed]);

  const handleAct2Done = useCallback((act2) => {
    setActs(prev => ({ ...prev, act2 }));
    setActWinners(prev => [...prev, act2.winner]);
    setTimeout(() => setPhase('act3'), 1400);
  }, []);

  const handleAct3Done = useCallback(async (act3) => {
    const allActs = { ...acts, act3 };
    setActs(allActs);
    const winners = [...actWinners, act3.winner];
    setActWinners(winners);
    const raidOutcome = computeRaidOutcome(winners);
    setOutcome(raidOutcome);
    setPhase('results');

    const perf = {
      [user.userId]: (allActs.act1?.playerScore || 0) + (allActs.act2?.playerRoundWins || 0) + (allActs.act3?.playerGoals || 0),
    };
    const mvpId = pickMvp(perf);

    setFinalizing(true);
    try {
      const res = await finalizeRaid({
        raidType,
        outcome: raidOutcome,
        isMvp: mvpId === user.userId,
        acts: allActs,
        match,
        rivalGuildCode: match?.rivals?.[0]?.homeCountry,
        playerPerformance: perf,
      });
      setFinalizeResult(res);
    } catch (err) {
      console.error('[Raid] finalize failed:', err);
    } finally {
      setFinalizing(false);
    }
  }, [acts, actWinners, user, raidType, match]);

  if (!user) {
    return (
      <div style={s.page}>
        <p style={{ color: C.muted }}>Please complete onboarding first.</p>
        <button type="button" style={s.backBtn} onClick={() => navigate('/onboarding')}>Onboarding</button>
      </div>
    );
  }

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
            <div style={s.spinner} />
            <h2 style={s.searchTitle}>Finding a buddy…</h2>
            <p style={s.muted}>Matchmaking · {fmtSecs(searchRemaining)}s left</p>
            <p style={{ ...s.muted, fontSize: '0.72rem' }}>Bot rivals after 45s</p>
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
                    {p.isBot && <span style={s.botTag}>BOT</span>}
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
                    <span style={s.botTag}>BOT</span>
                  </div>
                ))}
              </div>
            </div>
            {match.isBotMatch && (
              <p style={s.muted}>Bot match — no humans available yet</p>
            )}
          </div>
        )}

        {phase === 'act1' && act1Game && (
          <RaidAct1 game={act1Game} raidSeed={raidSeed} onComplete={handleAct1Done} />
        )}

        {phase === 'act2' && (
          <RaidAct2 raidSeed={raidSeed} onComplete={handleAct2Done} />
        )}

        {phase === 'act3' && (
          <RaidAct3 raidSeed={raidSeed} onComplete={handleAct3Done} />
        )}

        {phase === 'results' && (
          <div style={s.section}>
            <div style={{
              ...s.outcomeBanner,
              borderColor: outcome === 'win' ? C.green : outcome === 'loss' ? C.red : C.muted,
              color: outcome === 'win' ? C.green : outcome === 'loss' ? C.red : C.muted,
            }}>
              {outcome === 'win' ? '🏆 RAID WON' : outcome === 'loss' ? '💀 RAID LOST' : '🤝 DRAW'}
            </div>

            <div style={s.actSummary}>
              {['act1', 'act2', 'act3'].map((key, i) => {
                const w = actWinners[i];
                return (
                  <div key={key} style={s.actRow}>
                    <span>Act {i + 1}</span>
                  <span style={{ color: w === 'you' ? C.green : w === 'rival' ? C.red : C.muted }}>
                      {w === 'you' ? 'Won' : w === 'rival' ? 'Lost' : 'Draw'}
                    </span>
                  </div>
                );
              })}
            </div>

            {!isTraining && (
              <div style={s.xpBox}>
                {finalizing ? (
                  <span style={s.muted}>Awarding XP…</span>
                ) : (
                  <>
                    <div>+{(finalizeResult?.xpResults?.win?.xpAwarded ?? xpPreview.win) || xpPreview.loss} XP</div>
                    {finalizeResult?.xpResults?.mvp?.xpAwarded > 0 && (
                    <div style={{ color: C.accent, marginTop: 6 }}>+{finalizeResult.xpResults.mvp.xpAwarded} MVP</div>
                    )}
                  </>
                )}
              </div>
            )}

            {isTraining && (
              <p style={s.muted}>Training mode — no XP awarded</p>
            )}

            {damagePreview > 0 && (
              <p style={{ ...s.muted, marginTop: 12 }}>
                ~{damagePreview.toLocaleString()} castle HP damage dealt
              </p>
            )}

            {finalizeResult?.serverResult?.curseLifted && (
              <div style={s.curseLift}>🎉 Curse lifted! ({RAID_TYPES.normal.winXP ? '' : ''}3 raid wins)</div>
            )}

            <button type="button" style={s.primaryBtn} onClick={() => navigate('/guild')}>
              Back to Guild
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
  actSummary:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20 },
  actRow:        { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.88rem', borderBottom: `1px solid ${C.border}` },
  xpBox:         { textAlign: 'center', padding: 16, background: 'rgba(61,214,140,0.08)', border: `1px solid rgba(61,214,140,0.25)`, borderRadius: 12, marginBottom: 16, fontWeight: 800, fontSize: '1.2rem', color: C.green },
  curseLift:     { textAlign: 'center', padding: 12, background: 'rgba(247,195,68,0.1)', border: '1px solid rgba(247,195,68,0.3)', borderRadius: 12, color: C.accent, marginBottom: 16, fontWeight: 700 },
  primaryBtn:    { width: '100%', padding: 16, background: `linear-gradient(135deg, ${C.accent}, #e8a800)`, color: '#111', border: 'none', borderRadius: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 10, letterSpacing: 1 },
  secondaryBtn:  { width: '100%', padding: 14, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', fontWeight: 600 },
};
