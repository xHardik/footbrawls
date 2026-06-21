/**
 * scoreNorm.js
 * Normalises all solo game raw scores to a 0–100 scale.
 * Used by RaidAct1 to compare duo performance fairly across different games.
 *
 * Each game has different raw scoring — this file is the single source of
 * truth for conversion. Update here only if game mechanics change.
 */

/**
 * WHO ARE YA?
 * Raw: guessNumber 1–8 (1 = first guess, 8 = last chance)
 * Score: divide 100 by 8 rounds/attempts = 12.5 per round.
 *   Each unused attempt (plus the successful one) contributes to score.
 */
export function normWhoAreYa(guessNumber, solved) {
  if (!solved) return 0;
  return (8 - guessNumber + 1) * 12.5;
}

/**
 * PLAYER WORDLE
 * Raw: guessNumber 1–6
 * Score: divide 100 by 6 rounds/attempts = 16.67 per round.
 */
export function normWordle(guessNumber, solved) {
  if (!solved) return 0;
  return Number(((6 - guessNumber + 1) * (100 / 6)).toFixed(2));
}

/**
 * HIGHER OR LOWER
 * Score: 10 points for every correct comparison (streak).
 */
export function normHigherLower(streak) {
  return (streak || 0) * 10;
}

/**
 * TRANSFER TRAIL
 * Raw: stepsUsed 1–6
 * Score: divide 100 by 6 rounds/attempts = 16.67 per round.
 */
export function normTransferTrail(stepsUsed, solved) {
  if (!solved) return 0;
  return Number(((6 - stepsUsed + 1) * (100 / 6)).toFixed(2));
}

/**
 * TOP 10 GUESS
 * Score: 10 points for every correct guess.
 */
export function normTop10(correctCount) {
  return (correctCount || 0) * 10;
}

/**
 * MATCH PREDICTOR
 * Score: Keep raw XP reward out of 100.
 */
export function normMatchPredictor(xpAwarded) {
  return xpAwarded || 0;
}

/**
 * PENALTY NERVE
 * Score: divide 100 by 5 kicks/rounds = 20 points per goal.
 */
export function normPenaltyNerve(goalsScored, totalKicks = 5) {
  const kicks = totalKicks || 5;
  return Number((goalsScored * (100 / kicks)).toFixed(2));
}

/**
 * Universal dispatcher — call from RaidAct1 with the game result object.
 * @param {string} gameId — one of: whoAreYa | wordle | higherLower | transferTrail | matchPredictor | penaltyNerve | top10
 * @param {Object} result — game-specific result payload
 * @returns {number} normalised score 0.0–100.0
 */
export function normScore(gameId, result) {
  if (!result) return 0;
  const cleanId = gameId ? gameId.toLowerCase().replace('_correct', '').replace('_complete', '') : '';
  let canonicalId = gameId;
  if (cleanId === 'whoareya') canonicalId = 'whoAreYa';
  else if (cleanId === 'wordle') canonicalId = 'wordle';
  else if (cleanId === 'higherlower') canonicalId = 'higherLower';
  else if (cleanId === 'transfertrail') canonicalId = 'transferTrail';
  else if (cleanId === 'matchpredictor') canonicalId = 'matchPredictor';
  else if (cleanId === 'penaltynerve') canonicalId = 'penaltyNerve';
  else if (cleanId === 'top10') canonicalId = 'top10';

  switch (canonicalId) {
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
    case "top10":
      return normTop10(result.correctCount ?? result.correct ?? 0);
    default:
      console.warn(`[scoreNorm] Unknown gameId: ${gameId}`);
      return 0;
  }
}