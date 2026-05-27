/**
 * scoreNorm.js
 * Normalises all 6 solo game raw scores to a 0–10 float.
 * Used by RaidAct1 to compare duo performance fairly across different games.
 *
 * Each game has different raw scoring — this file is the single source of
 * truth for conversion. Update here only if game mechanics change.
 */

/**
 * WHO ARE YA?
 * Raw: guessNumber 1–8 (1 = first guess, 8 = last chance)
 * Score logic: fewer guesses = higher score
 *   guess 1 → 10.0, guess 2 → 8.5, ..., guess 8 → 2.0, failed → 0
 */
export function normWhoAreYa(guessNumber, solved) {
  if (!solved) return 0;
  const map = { 1: 10, 2: 8.5, 3: 7, 4: 5.5, 5: 4, 6: 3, 7: 2.5, 8: 2 };
  return map[guessNumber] ?? 0;
}

/**
 * PLAYER WORDLE
 * Raw: guessNumber 1–6 (same as Wordle standard)
 * Score: same decay as Who Are Ya? scaled to 6 guesses
 *   guess 1 → 10.0, guess 6 → 2.0, failed → 0
 */
export function normWordle(guessNumber, solved) {
  if (!solved) return 0;
  const map = { 1: 10, 2: 8, 3: 6, 4: 4.5, 5: 3, 6: 2 };
  return map[guessNumber] ?? 0;
}

/**
 * HIGHER OR LOWER
 * Raw: streak (consecutive correct comparisons in one session)
 * Max streak expected: ~10 (player pool bounded)
 * Score: streak / maxStreak * 10, capped at 10
 */
export function normHigherLower(streak) {
  const MAX_STREAK = 10;
  return Math.min(10, (streak / MAX_STREAK) * 10);
}

/**
 * TRANSFER TRAIL
 * Raw: stepsUsed (how many transfers to get from A → B)
 * Fewer steps = better
 * 1 step = 10, 2 = 8, 3 = 6.5, 4 = 5, 5 = 3.5, 6+ = 2, failed = 0
 */
export function normTransferTrail(stepsUsed, solved) {
  if (!solved) return 0;
  const map = { 1: 10, 2: 8, 3: 6.5, 4: 5, 5: 3.5, 6: 2 };
  return map[stepsUsed] ?? 2;
}

/**
 * MATCH PREDICTOR
 * Raw: xpAwarded (0–100) per PRD XP table
 *   correct result = 30, +scorer = 20, +exact score = 50
 * Score: xpAwarded / 100 * 10
 */
export function normMatchPredictor(xpAwarded) {
  return Math.min(10, (xpAwarded / 100) * 10);
}

/**
 * PENALTY NERVE
 * Raw: goalsScored out of 5 penalties (standard round) or more in sudden death
 * For raid: only the standard 5-kick round is scored
 * 5/5 → 10, 4/5 → 8, 3/5 → 6, 2/5 → 4, 1/5 → 2, 0/5 → 0
 */
export function normPenaltyNerve(goalsScored, totalKicks = 5) {
  return Math.min(10, (goalsScored / totalKicks) * 10);
}

/**
 * Universal dispatcher — call from RaidAct1 with the game result object.
 * @param {string} gameId — one of: whoAreYa | wordle | higherLower | transferTrail | matchPredictor | penaltyNerve
 * @param {Object} result — game-specific result payload
 * @returns {number} normalised score 0.0–10.0
 */
export function normScore(gameId, result) {
  switch (gameId) {
    case "whoAreYa":
      return normWhoAreYa(result.guessNumber, result.solved);
    case "wordle":
      return normWordle(result.guessNumber, result.solved);
    case "higherLower":
      return normHigherLower(result.streak);
    case "transferTrail":
      return normTransferTrail(result.stepsUsed, result.solved);
    case "matchPredictor":
      return normMatchPredictor(result.xpAwarded);
    case "penaltyNerve":
      return normPenaltyNerve(result.goalsScored, result.totalKicks);
    default:
      console.warn(`[scoreNorm] Unknown gameId: ${gameId}`);
      return 0;
  }
}