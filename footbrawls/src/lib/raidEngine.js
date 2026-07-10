import { ACT1_GAME_POOL, RAID_TYPES } from './raidConstants';
import { normScore } from './scoreNorm';
import { seededRandom, getDailySeed } from './dailySeed';
import { getHPCap } from './guildLevels';


export function pickAct1Game(raidSeed = Date.now()) {
  const seed = getDailySeed() + (raidSeed % 997);
  const idx  = Math.floor(seededRandom(seed, 42) * ACT1_GAME_POOL.length);
  return ACT1_GAME_POOL[idx];
}


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
  const cleanId = gameId ? gameId.toLowerCase().replace('_correct', '').replace('_complete', '') : '';
  let canonicalId = gameId;
  if (cleanId === 'whoareya') canonicalId = 'whoAreYa';
  else if (cleanId === 'wordle') canonicalId = 'wordle';
  else if (cleanId === 'higherlower') canonicalId = 'higherLower';
  else if (cleanId === 'transfertrail') canonicalId = 'transferTrail';
  else if (cleanId === 'matchpredictor') canonicalId = 'matchPredictor';
  else if (cleanId === 'penaltynerve') canonicalId = 'penaltyNerve';

  switch (canonicalId) {
    case 'whoAreYa':
      return { guessNumber: Math.max(1, Math.min(5, Math.ceil(r * 5))), solved: r > 0.05 };
    case 'wordle':
      return { guessNumber: Math.max(1, Math.min(4, Math.ceil(r * 4))), solved: r > 0.05 };
    case 'higherLower':
      return { streak: Math.floor(r * 15) + 3 };
    case 'transferTrail':
      return { stepsUsed: Math.max(1, Math.min(4, Math.ceil(r * 4))), solved: r > 0.05 };
    case 'matchPredictor':
      return { xpAwarded: Math.floor(r * 60) + 40 };
    case 'penaltyNerve':
      return { goalsScored: Math.floor(r * 3) + 3, totalKicks: 5 };
    default:
      return {};
  }
}


export function simulateBotAct2Scores(raidSeed = Date.now()) {
  const buddyWins  = Math.floor(seededRandom(raidSeed, 50) * 3) + 2;
  const rivalWins  = Math.floor(seededRandom(raidSeed, 51) * 3) + 2;
  return { buddyWins, rivalWins };
}


export function simulateBotAct3Scores(raidSeed = Date.now()) {
  const buddyGoals = Math.floor(seededRandom(raidSeed, 60) * 4) + 2;
  const rivalGoals = Math.floor(seededRandom(raidSeed, 61) * 4) + 2;
  return { buddyGoals, rivalGoals };
}


export function determineActWinner(yourTotal, rivalTotal) {
  if (yourTotal > rivalTotal) return 'you';
  if (rivalTotal > yourTotal) return 'rival';
  return 'draw';
}


export function computeRaidOutcome(acts) {
  const yourTotal  = Math.round(((acts.act1?.yourTotal || 0) * 100) + ((acts.act2?.yourTotal || 0) * 20) + ((acts.act3?.yourTotal || 0) * 20));
  const rivalTotal = Math.round(((acts.act1?.rivalTotal || 0) * 100) + ((acts.act2?.rivalTotal || 0) * 20) + ((acts.act3?.rivalTotal || 0) * 20));
  if (yourTotal > rivalTotal)  return 'win';
  if (rivalTotal > yourTotal)  return 'loss';
  return 'draw';
}


export function calculateCastleDamage(raidType, loserGuildLevel = 1) {
  const config = RAID_TYPES[raidType] || RAID_TYPES.normal;
  if (!config.castleDamagePct) return 0;
  const cap = getHPCap(loserGuildLevel);
  return Math.floor(cap * config.castleDamagePct);
}


export function sumAct1Duo(playerScore, buddyScore) {
  return Number((playerScore + buddyScore).toFixed(2));
}


export function sumAct1Rival(rival1Score, rival2Score) {
  return Number((rival1Score + rival2Score).toFixed(2));
}


export function sumAct2Duo(playerRoundWins, buddyRoundWins) {
  return playerRoundWins + buddyRoundWins;
}


export function sumAct3Duo(playerGoals, buddyGoals) {
  return playerGoals + buddyGoals;
}


export function pickMvp(scores) {
  let bestId = null;
  let best   = -1;
  for (const [id, val] of Object.entries(scores)) {
    if (val > best) { best = val; bestId = id; }
  }
  return bestId;
}
