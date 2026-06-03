import { ACT1_GAME_POOL, RAID_TYPES } from './raidConstants';
import { normScore } from './scoreNorm';
import { seededRandom, getDailySeed } from './dailySeed';
import { getHPCap } from './guildLevels';

/**
 * Pick a random Act 1 game for this raid session.
 */
export function pickAct1Game(raidSeed = Date.now()) {
  const seed = getDailySeed() + (raidSeed % 997);
  const idx  = Math.floor(seededRandom(seed, 42) * ACT1_GAME_POOL.length);
  return ACT1_GAME_POOL[idx];
}

/**
 * Simulate bot scores for Act 1 (buddy + rivals).
 */
export function simulateBotAct1Scores(gameId, raidSeed = Date.now()) {
  const buddyRaw = buildAct1BotResult(gameId, raidSeed, 1);
  const rival1Raw = buildAct1BotResult(gameId, raidSeed, 2);
  const rival2Raw = buildAct1BotResult(gameId, raidSeed, 3);

  return {
    buddy:   normScore(gameId, buddyRaw),
    rival1:  normScore(gameId, rival1Raw),
    rival2:  normScore(gameId, rival2Raw),
    buddyRaw,
    rival1Raw,
    rival2Raw,
  };
}

function buildAct1BotResult(gameId, seed, botIndex) {
  const r = seededRandom(seed, botIndex * 17);
  switch (gameId) {
    case 'whoAreYa':
      return { guessNumber: Math.max(1, Math.min(8, Math.ceil(r * 8))), solved: r > 0.15 };
    case 'wordle':
      return { guessNumber: Math.max(1, Math.min(6, Math.ceil(r * 6))), solved: r > 0.2 };
    case 'higherLower':
      return { streak: Math.floor(r * 10) + 1 };
    case 'transferTrail':
      return { stepsUsed: Math.max(1, Math.min(6, Math.ceil(r * 6))), solved: r > 0.25 };
    case 'matchPredictor':
      return { xpAwarded: Math.floor(r * 100) };
    case 'penaltyNerve':
      return { goalsScored: Math.floor(r * 6), totalKicks: 5 };
    default:
      return {};
  }
}

/**
 * Simulate bot round wins for Dribble Gauntlet (Act 2) best-of-5.
 */
export function simulateBotAct2Scores(raidSeed = Date.now()) {
  const buddyWins  = Math.floor(seededRandom(raidSeed, 50) * 3);
  const rivalWins  = Math.floor(seededRandom(raidSeed, 51) * 3);
  return { buddyWins, rivalWins };
}

/**
 * Simulate bot penalty goals for Act 3 (buddy striker + rival strikers).
 */
export function simulateBotAct3Scores(raidSeed = Date.now()) {
  const buddyGoals = Math.floor(seededRandom(raidSeed, 60) * 4) + 1;
  const rivalGoals = Math.floor(seededRandom(raidSeed, 61) * 4) + 1;
  return { buddyGoals, rivalGoals };
}

/**
 * Determine act winner from duo totals.
 * @returns {'you' | 'rival' | 'draw'}
 */
export function determineActWinner(yourTotal, rivalTotal) {
  if (yourTotal > rivalTotal) return 'you';
  if (rivalTotal > yourTotal) return 'rival';
  return 'draw';
}

/**
 * Compute overall raid outcome from 3 act winners.
 */
export function computeRaidOutcome(actWinners) {
  const yours  = actWinners.filter(w => w === 'you').length;
  const theirs = actWinners.filter(w => w === 'rival').length;
  if (yours > theirs)  return 'win';
  if (theirs > yours)  return 'loss';
  return 'draw';
}

/**
 * Castle HP damage dealt to the losing guild (% of current level cap).
 */
export function calculateCastleDamage(raidType, loserGuildLevel = 1) {
  const config = RAID_TYPES[raidType] || RAID_TYPES.normal;
  if (!config.castleDamagePct) return 0;
  const cap = getHPCap(loserGuildLevel);
  return Math.floor(cap * config.castleDamagePct);
}

/**
 * Combine player + buddy scores for Act 1.
 */
export function sumAct1Duo(playerScore, buddyScore) {
  return Number((playerScore + buddyScore).toFixed(2));
}

/**
 * Combine rival duo scores.
 */
export function sumAct1Rival(rival1Score, rival2Score) {
  return Number((rival1Score + rival2Score).toFixed(2));
}

/**
 * Act 2 duo round wins (player rounds + buddy bot rounds).
 */
export function sumAct2Duo(playerRoundWins, buddyRoundWins) {
  return playerRoundWins + buddyRoundWins;
}

/**
 * Act 3 duo goals (player + buddy bot).
 */
export function sumAct3Duo(playerGoals, buddyGoals) {
  return playerGoals + buddyGoals;
}

/**
 * Pick MVP from performance map { userId: score }.
 */
export function pickMvp(scores) {
  let bestId = null;
  let best   = -1;
  for (const [id, val] of Object.entries(scores)) {
    if (val > best) { best = val; bestId = id; }
  }
  return bestId;
}
