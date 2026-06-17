/**
 * TransferTrail.jsx
 * Connect player A → player B via shared clubs in fewest steps.
 * Each step: pick a club that the current player played for,
 * then pick a teammate at that club — that teammate becomes the new "current" player.
 * Reach the target player to win.
 *
 * players.json shape assumed:
 * {
 *   id, name, flag, nationality, club, position, clubs: ["Man Utd", "Real Madrid", ...]
 * }
 *
 * Usage:
 *   <TransferTrail players={playersArray} userId={uid} onComplete={(result) => {}} />
 */

import { useState, useEffect, useMemo } from "react";
import { getDailyTrail, getActivePuzzleDate } from '../../lib/dailySeed.js';
import { awardXP } from '../../lib/xpEngine.js';
import { getUser } from '../../lib/user';
import { PLAYERS } from "../../lib/players.js";

const MAX_STEPS = 6;
const XP_BY_STEPS = { 1: 25, 2: 25, 3: 25, 4: 25, 5: 25, 6: 25 };

// ─── Build club → players index from players array ────────────────────────────
function buildClubIndex(players) {
  const index = {};
  players.forEach((p) => {
    const clubs = p.clubs || [p.club];
    clubs.forEach((club) => {
      if (!index[club]) index[club] = [];
      index[club].push(p);
    });
  });
  return index;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerPill({ player, isStart, isEnd, isCurrent, isReached }) {
  let pillCls = "tt-player-pill";
  if (isReached) pillCls += " pill-reached";
  else if (isCurrent) pillCls += " pill-current";
  else if (isStart || isEnd) pillCls += " pill-boundary";

  return (
    <div className={pillCls}>
      <span className="tt-player-flag-sticker">{player?.flag || "🏳️"}</span>
      <div className="tt-player-info">
        <div className="tt-player-name">{player?.name}</div>
        <div className="tt-player-club">{player?.club}</div>
      </div>
      {(isStart || isEnd) && (
        <span className={`tt-boundary-label ${isEnd ? 'lbl-end' : 'lbl-start'}`}>
          {isStart ? "START" : "TARGET"}
        </span>
      )}
    </div>
  );
}

function TrailStep({ step, index }) {
  return (
    <div className="tt-timeline-step">
      <div className="tt-timeline-node">
        <span className="tt-node-number">{index + 1}</span>
      </div>
      <div className="tt-timeline-card">
        <div className="tt-card-relation">
          via <span className="tt-club-highlight">{step.club}</span>
        </div>
        <div className="tt-card-body">
          <span className="tt-step-flag">{step.player.flag || "🏳️"}</span>
          <div className="tt-step-name">{step.player.name}</div>
        </div>
      </div>
    </div>
  );
}

// Phase A: pick a club from current player's history
function ClubPicker({ player, usedClubs, onPick }) {
  const clubs = (player?.clubs || [player?.club]).filter(
    (c) => c && !usedClubs.has(c)
  );

  return (
    <div className="tt-picker-section">
      <div className="tt-picker-instruction">
        Pick a club <strong>{player?.name}</strong> played for:
      </div>
      <div className="tt-clubs-grid">
        {clubs.length === 0 ? (
          <div className="tt-no-items">
            No clubs available — trail blocked!
          </div>
        ) : (
          clubs.map((club) => (
            <button
              key={club}
              onClick={() => onPick(club)}
              className="tt-club-btn"
            >
              {club}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// Phase B: pick a teammate at the chosen club
function TeammatePicker({ club, players, clubIndex, usedPlayerIds, targetPlayer, onPick }) {
  const [query, setQuery] = useState("");
  const teammates = (clubIndex[club] || []).filter(
    (p) => !usedPlayerIds.has(p.id)
  );
  const results = query.length > 1
    ? teammates.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : teammates.slice(0, 8);

  return (
    <div className="tt-picker-section">
      <div className="tt-picker-instruction">
        Pick a <span className="tt-club-badge">{club}</span> teammate to continue the trail:
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search teammate…"
        className="tt-search-input"
      />

      <div className="tt-teammates-list">
        {results.length === 0 && (
          <div className="tt-no-items">
            No teammates found matching search criteria.
          </div>
        )}
        {results.map((p) => {
          const isTarget = p.id === targetPlayer?.id;
          return (
            <div
              key={p.id}
              onClick={() => onPick(p)}
              className={`tt-teammate-row ${isTarget ? 'target-row' : ''}`}
            >
              <span className="tt-row-flag">{p.flag || "🏳️"}</span>
              <div className="tt-row-info">
                <div className="tt-row-name">{p.name}</div>
                <div className="tt-row-sub">
                  {p.position} · {p.nationality}
                </div>
              </div>
              {isTarget && (
                <span className="tt-target-pill">TARGET</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Initialize Google AdBreak queue safely
const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    console.log("[AdSense H5 Mock] Triggering ad placement:", options.name);
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.type === 'reward') {
        const confirmReward = window.confirm(`[TEST AD] Watch this rewarded ad to get your reward?`);
        if (confirmReward) {
          if (options.adViewed) options.adViewed();
        } else {
          if (options.adDismissed) options.adDismissed();
        }
      } else {
        if (options.adViewed) options.adViewed();
      }
      if (options.afterAd) options.afterAd();
      if (options.adBreakDone) options.adBreakDone({ showStatus: "mocked" });
    }, 1000);
  }
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransferTrail({ players = PLAYERS, userId, onComplete }) {
  const { start, end } = useMemo(
    () => { const pd = getActivePuzzleDate(); return getDailyTrail(players, pd) || { start: players[0], end: players[11] }; },
    [players]
  );

  const clubIndex = useMemo(() => buildClubIndex(players), [players]);

  const [currentPlayer, setCurrentPlayer]   = useState(start);
  const [trail, setTrail]                   = useState([]); // [{club, player}]
  const [phase, setPhase]                   = useState("club"); // "club" | "teammate"
  const [selectedClub, setSelectedClub]     = useState(null);
  const [usedClubs]                         = useState(new Set());
  const [usedPlayerIds]                     = useState(new Set([start?.id]));
  const [gameOver, setGameOver]             = useState(false);
  const [solved, setSolved]                 = useState(false);
  const [xpAwarded, setXpAwarded]           = useState(0);

  // Rewarded ad states
  const [maxSteps, setMaxSteps] = useState(MAX_STEPS);
  const [hasWatchedAd, setHasWatchedAd] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  function triggerRewardedAdForExtraSteps() {
    setIsAdLoading(true);
    adBreak({
      type: "reward",
      name: "transfer-trail-extra-steps",
      beforeAd: () => setIsAdLoading(true),
      afterAd: () => setIsAdLoading(false),
      adDismissed: () => {
        // ad dismissed
      },
      adViewed: () => {
        const newMaxSteps = maxSteps + 2;
        setMaxSteps(newMaxSteps);
        setGameOver(false);
        setHasWatchedAd(true);
        persist({
          trail,
          gameOver: false,
          solved: false,
          xpAwarded: 0,
          currentPlayerId: currentPlayer.id,
          maxSteps: newMaxSteps,
          hasWatchedAd: true
        });
      },
      adBreakDone: () => setIsAdLoading(false)
    });
  }

  // Load saved state
  useEffect(() => {
    const key = `tt_${start?.id}_${end?.id}_state`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const s = JSON.parse(saved);
      setTrail(s.trail);
      setGameOver(s.gameOver);
      setSolved(s.solved);
      setXpAwarded(s.xpAwarded);
      if (s.currentPlayerId) {
        const cp = players.find((p) => p.id === s.currentPlayerId);
        if (cp) setCurrentPlayer(cp);
      }
      if (s.maxSteps) setMaxSteps(s.maxSteps);
      if (s.hasWatchedAd) setHasWatchedAd(s.hasWatchedAd);
    }
  }, [start, end]);

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById("tt-css")) {
      const s = document.createElement("style");
      s.id = "tt-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  function persist(updates) {
    const key = `tt_${start?.id}_${end?.id}_state`;
    localStorage.setItem(key, JSON.stringify({
      maxSteps,
      hasWatchedAd,
      ...updates
    }));

    if (updates.gameOver) {
      const puzzleDate = getActivePuzzleDate();
      const ttHistory = JSON.parse(localStorage.getItem('footbrawls_transfertrail') || '{}');
      ttHistory[puzzleDate] = { completed: true, solved: updates.solved, xpAwarded: updates.xpAwarded };
      localStorage.setItem('footbrawls_transfertrail', JSON.stringify(ttHistory));
    }
  }

  function handleClubPick(club) {
    setSelectedClub(club);
    setPhase("teammate");
  }

  async function handleTeammatePick(player) {
    const newStep = { club: selectedClub, player };
    const newTrail = [...trail, newStep];
    usedClubs.add(selectedClub);
    usedPlayerIds.add(player.id);

    const won = player.id === end?.id;
    const lost = !won && newTrail.length >= maxSteps;

    let xp = 0;
    if (won) {
      const raw = XP_BY_STEPS[newTrail.length] ?? 5;
      const currentUser = getUser();
      const uid = userId || currentUser?.userId;
      if (uid) {
        const result = await awardXP(uid, "transferTrail_correct", { rawXP: raw });
        xp = result?.xpAwarded ?? raw;
      } else {
        xp = raw;
      }
    }

    setTrail(newTrail);
    setCurrentPlayer(player);
    setSelectedClub(null);
    setPhase("club");

    if (won || lost) {
      setGameOver(true);
      setSolved(won);
      setXpAwarded(xp);
      persist({
        trail: newTrail,
        gameOver: true,
        solved: won,
        xpAwarded: xp,
        currentPlayerId: player.id,
        maxSteps,
        hasWatchedAd
      });
      if (onComplete) {
        onComplete({
          gameId: "transferTrail",
          solved: won,
          stepsUsed: newTrail.length,
          xpAwarded: xp,
        });
      }
    } else {
      persist({
        trail: newTrail,
        gameOver: false,
        solved: false,
        xpAwarded: 0,
        currentPlayerId: player.id,
        maxSteps,
        hasWatchedAd
      });
    }
  }

  const getGameOverStickerClass = (slvd) => {
    return slvd ? 'sticker-solved' : 'sticker-failed';
  };

  const getGameOverStickerText = (slvd) => {
    return slvd ? 'TRAIL CONNECTED' : 'TRAIL WENT COLD';
  };

  if (!start || !end) {
    return (
      <div className="tt-page-loading">
        Loading…
      </div>
    );
  }

  return (
    <div className="tt-page">
      <div className="tt-bg" />
      <div className="tt-grid" />

      {/* Header */}
      <div className="tt-header">
        <div>
          <h2 className="tt-title">TRANSFER TRAIL</h2>
          <div className="tt-sub">
            {gameOver
              ? solved
                ? `Solved in ${trail.length} step${trail.length !== 1 ? "s" : ""}!`
                : "Out of steps"
              : `Step ${trail.length + 1} of ${maxSteps}`}
          </div>
        </div>
        <div className="tt-badge-xp">
          MAX 25 XP
        </div>
      </div>

      {/* Start → End header layout */}
      <div className="tt-boundary-box">
        <PlayerPill player={start} isStart />
        <div className="tt-boundary-arrow">→</div>
        <PlayerPill player={end} isEnd />
      </div>

      {/* Step progress bar */}
      <div className="tt-progress-bar-section">
        <div className="tt-progress-line-container">
          {Array.from({ length: maxSteps }).map((_, i) => (
            <div
              key={i}
              className={`tt-progress-segment ${
                i < trail.length
                  ? solved && i === trail.length - 1
                    ? 'segment-solved'
                    : 'segment-active'
                  : ''
              }`}
            />
          ))}
        </div>
        <span className="tt-progress-counter-text">
          {trail.length}/{maxSteps} Steps
        </span>
      </div>

      {/* Current location status */}
      <div className="tt-current-section">
        <div className="tt-current-hint">Currently at:</div>
        <PlayerPill
          player={currentPlayer}
          isCurrent={!gameOver}
          isReached={solved && currentPlayer?.id === end?.id}
        />
      </div>

      {/* Vertical Timeline Node Flow Diagram */}
      {trail.length > 0 && (
        <div className="tt-timeline-container">
          <div className="tt-timeline-vertical-line" />
          {trail.map((step, i) => (
            <TrailStep key={i} step={step} index={i} />
          ))}
        </div>
      )}

      {/* Input controls or results */}
      {!gameOver ? (
        phase === "club" ? (
          <ClubPicker
            player={currentPlayer}
            usedClubs={usedClubs}
            onPick={handleClubPick}
          />
        ) : (
          <TeammatePicker
            club={selectedClub}
            players={players}
            clubIndex={clubIndex}
            usedPlayerIds={usedPlayerIds}
            targetPlayer={end}
            onPick={handleTeammatePick}
          />
        )
      ) : (
        <div className={`tt-gameover-card ${solved ? 'card-solved' : 'card-failed'}`}>
          <div className="tt-sticker-container">
            <span className={`tt-sticker ${getGameOverStickerClass(solved)}`}>
              {getGameOverStickerText(solved)}
            </span>
          </div>

          <div className="tt-result-title">
            {solved ? `Connected in ${trail.length} steps!` : "Trail Blocked"}
          </div>
          <div className="tt-result-details">
            {solved
              ? `${start?.name} successfully connected to ${end?.name}`
              : `Could not connect ${start?.name} to ${end?.name}`}
          </div>

          {xpAwarded > 0 && (
            <div className="tt-xp-earned-badge">
              +{xpAwarded} XP EARNED
            </div>
          )}

          {!solved && !hasWatchedAd && (
            <div className="tt-ad-section">
              <p className="tt-ad-hint">
                Trail went cold? Watch an ad to get 2 extra steps and save your trail!
              </p>
              <button
                type="button"
                className="tt-ad-btn"
                onClick={triggerRewardedAdForExtraSteps}
                disabled={isAdLoading}
              >
                <span className="tt-ad-btn-icon">▶</span>
                <span>{isAdLoading ? 'LOADING AD...' : 'GET +2 EXTRA STEPS'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@0,9..40,400;0,9..40,700;0,9..40,900&display=swap');

.tt-page {
  position: relative;
  z-index: 1;
  max-width: 450px;
  margin: 0 auto;
  padding: 32px 16px 80px;
  font-family: 'DM Sans', sans-serif;
  color: #F0F0F0;
  min-height: 100vh;
  box-sizing: border-box;
}

.tt-page-loading {
  padding: 80px 32px;
  text-align: center;
  color: rgba(242, 242, 244, 0.28);
  font-family: 'DM Sans', sans-serif;
}

.tt-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% -10%, rgba(79, 142, 247, 0.1) 0%, transparent 60%), #05070f;
}

.tt-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.03;
  background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Header */
.tt-header {
  padding: 16px 0 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.tt-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  letter-spacing: 2px;
  line-height: 1;
  margin: 0 0 4px 0;
  background: linear-gradient(135deg, #4F8EF7, #A855F7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tt-sub {
  color: rgba(240,240,240,0.45);
  font-size: 0.8rem;
  margin: 0;
}

.tt-badge-xp {
  background: rgba(247, 195, 68, 0.1);
  border: 1px solid rgba(247, 195, 68, 0.25);
  border-radius: 99px;
  padding: 4px 12px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  color: #F7C344;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Boundary box Start -> Target */
.tt-boundary-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tt-boundary-arrow {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.15);
  font-weight: 900;
}

/* Player pill */
.tt-player-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  padding: 6px 14px 6px 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.tt-player-pill.pill-current {
  background: rgba(79, 142, 247, 0.12);
  border-color: rgba(79, 142, 247, 0.35);
  box-shadow: 0 0 10px rgba(79, 142, 247, 0.15);
}

.tt-player-pill.pill-reached {
  background: rgba(61, 214, 140, 0.12);
  border-color: rgba(61, 214, 140, 0.35);
  box-shadow: 0 0 10px rgba(61, 214, 140, 0.15);
}

.tt-player-pill.pill-boundary {
  background: rgba(247, 195, 68, 0.06);
  border-color: rgba(247, 195, 68, 0.25);
}

.tt-player-flag-sticker {
  font-size: 1.15rem;
}

.tt-player-info {
  display: flex;
  flex-direction: column;
}

.tt-player-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: #F2F2F4;
  line-height: 1.2;
}

.pill-current .tt-player-name {
  color: #4F8EF7;
}

.pill-reached .tt-player-name {
  color: #3DD68C;
}

.pill-boundary .tt-player-name {
  color: #F7C344;
}

.tt-player-club {
  font-size: 0.65rem;
  color: rgba(242, 242, 244, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tt-boundary-label {
  font-size: 0.55rem;
  font-weight: 900;
  border-radius: 4px;
  padding: 2px 6px;
  letter-spacing: 0.5px;
  font-family: 'Space Mono', monospace;
}

.lbl-start {
  background: rgba(79, 142, 247, 0.15);
  color: #4F8EF7;
}

.lbl-end {
  background: rgba(247, 195, 68, 0.15);
  color: #F7C344;
}

/* Steps progress bar */
.tt-progress-bar-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.tt-progress-line-container {
  display: flex;
  flex: 1;
  gap: 4px;
}

.tt-progress-segment {
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 99px;
  transition: all 0.3s ease;
}

.tt-progress-segment.segment-active {
  background: #4F8EF7;
}

.tt-progress-segment.segment-solved {
  background: #3DD68C;
}

.tt-progress-counter-text {
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  font-weight: 900;
  color: rgba(242, 242, 244, 0.45);
}

/* Current location segment */
.tt-current-section {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.tt-current-hint {
  font-size: 0.7rem;
  color: rgba(242, 242, 244, 0.35);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 8px;
}

/* Vertical Node Timeline Diagram */
.tt-timeline-container {
  position: relative;
  padding: 8px 16px 20px 24px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.tt-timeline-vertical-line {
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 35px;
  width: 2px;
  background: linear-gradient(to bottom, #4f8ef7 0%, rgba(79, 142, 247, 0.15) 100%);
}

.tt-timeline-step {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  position: relative;
}

.tt-timeline-step:last-of-type {
  margin-bottom: 0;
}

.tt-timeline-node {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #05070f;
  border: 2px solid #4f8ef7;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 0 10px rgba(79, 142, 247, 0.4);
}

.tt-node-number {
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  font-weight: 900;
  color: #4f8ef7;
}

.tt-timeline-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 14px;
}

.tt-card-relation {
  font-size: 0.68rem;
  color: rgba(242, 242, 244, 0.35);
  margin-bottom: 4px;
}

.tt-club-highlight {
  color: #4F8EF7;
  font-weight: 700;
  background: rgba(79, 142, 247, 0.12);
  padding: 1px 6px;
  border-radius: 4px;
}

.tt-card-body {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tt-step-flag {
  font-size: 1rem;
}

.tt-step-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #F2F2F4;
}

/* Pickers Styling */
.tt-picker-section {
  padding: 12px 16px;
}

.tt-picker-instruction {
  font-size: 0.78rem;
  color: rgba(242, 242, 244, 0.5);
  margin-bottom: 12px;
  line-height: 1.5;
}

.tt-club-badge {
  color: #4F8EF7;
  font-weight: 700;
  background: rgba(79, 142, 247, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(79, 142, 247, 0.2);
}

.tt-clubs-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tt-club-btn {
  background: rgba(79, 142, 247, 0.08);
  border: 1px solid rgba(79, 142, 247, 0.3);
  border-radius: 99px;
  padding: 8px 16px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #4F8EF7;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}

.tt-club-btn:hover {
  background: rgba(79, 142, 247, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 142, 247, 0.15);
}

.tt-no-items {
  font-size: 0.78rem;
  color: rgba(242, 242, 244, 0.3);
  padding: 12px 0;
}

/* Teammate search select */
.tt-search-input {
  width: 100%;
  background: #0c0f1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 0.88rem;
  color: #F2F2F4;
  outline: none;
  margin-bottom: 14px;
  font-family: 'DM Sans', sans-serif;
  box-sizing: border-box;
  transition: all 0.2s;
}

.tt-search-input:focus {
  border-color: #4F8EF7;
  box-shadow: 0 0 10px rgba(79, 142, 247, 0.15);
}

.tt-teammates-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tt-teammate-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.tt-teammate-row:hover {
  border-color: rgba(79, 142, 247, 0.35);
  background: rgba(255, 255, 255, 0.04);
  transform: translateY(-1px);
}

.tt-teammate-row.target-row {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.25);
}

.tt-teammate-row.target-row:hover {
  border-color: rgba(16, 185, 129, 0.45);
}

.tt-row-flag {
  font-size: 1.25rem;
}

.tt-row-info {
  flex: 1;
}

.tt-row-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: #F2F2F4;
}

.target-row .tt-row-name {
  color: #10B981;
}

.tt-row-sub {
  font-size: 0.7rem;
  color: rgba(242, 242, 244, 0.35);
  margin-top: 1px;
}

.tt-target-pill {
  font-family: 'Space Mono', monospace;
  font-size: 0.58rem;
  font-weight: 900;
  color: #10B981;
  background: rgba(16, 185, 129, 0.15);
  padding: 2px 8px;
  border-radius: 99px;
  letter-spacing: 0.5px;
}

/* GameOver Card & Stickers */
.tt-gameover-card {
  margin: 16px 16px 0;
  border-radius: 20px;
  padding: 28px 20px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
}

.tt-gameover-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent 60%); pointer-events: none;
  border-radius: 20px;
}

.card-solved {
  background: rgba(61, 214, 140, 0.04);
  border: 1px solid rgba(61, 214, 140, 0.25);
}

.card-failed {
  background: rgba(232, 64, 64, 0.04);
  border: 1px solid rgba(232, 64, 64, 0.25);
}

.tt-sticker-container {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.tt-sticker {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 8px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.15rem;
  letter-spacing: 1.5px;
  transform: rotate(-3deg);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
  border: 2px solid;
}

.sticker-solved {
  background: linear-gradient(135deg, #3DD68C, #10B981);
  color: #060810;
  border-color: #FFF;
  box-shadow: 0 0 15px rgba(61, 214, 140, 0.4);
}

.sticker-failed {
  background: linear-gradient(135deg, #E84040, #0F172A);
  color: #FFF;
  border-color: #FFAAAA;
}

.tt-result-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  color: #F2F2F4;
  letter-spacing: 1.5px;
  margin-bottom: 6px;
}

.card-solved .tt-result-title {
  color: #3DD68C;
}

.card-failed .tt-result-title {
  color: #E84040;
}

.tt-result-details {
  font-size: 0.82rem;
  color: rgba(242, 242, 244, 0.5);
  margin-bottom: 20px;
}

.tt-xp-earned-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(247, 195, 68, 0.1);
  border: 1px solid rgba(247, 195, 68, 0.3);
  border-radius: 99px;
  padding: 6px 18px;
  font-size: 0.8rem;
  font-weight: 800;
  color: #F7C344;
  font-family: 'Space Mono', monospace;
  letter-spacing: 1px;
}

/* Ad Recovery Section */
.tt-ad-section {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.tt-ad-hint {
  font-size: 0.75rem;
  color: rgba(242, 242, 244, 0.45);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.tt-ad-btn {
  background: #F7C344;
  border: none;
  border-radius: 12px;
  color: #060810;
  padding: 12px 18px;
  font-weight: 900;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: 'Space Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  box-shadow: 0 4px 14px rgba(247, 195, 68, 0.25);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.tt-ad-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(247, 195, 68, 0.4);
  background: #ffcf54;
}

.tt-ad-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.tt-ad-btn-icon {
  font-size: 0.85rem;
}
`;