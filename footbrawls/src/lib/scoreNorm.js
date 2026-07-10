


export function normWhoAreYa(guessNumber, solved) {
  if (!solved) return 0;
  return (8 - guessNumber + 1) * 12.5;
}


export function normWordle(guessNumber, solved) {
  if (!solved) return 0;
  return Number(((6 - guessNumber + 1) * (100 / 6)).toFixed(2));
}


export function normHigherLower(streak) {
  return (streak || 0) * 10;
}


export function normTransferTrail(stepsUsed, solved) {
  if (!solved) return 0;
  return Number(((6 - stepsUsed + 1) * (100 / 6)).toFixed(2));
}


export function normTop10(correctCount) {
  return (correctCount || 0) * 10;
}


export function normMatchPredictor(xpAwarded) {
  return xpAwarded || 0;
}


export function normPenaltyNerve(goalsScored, totalKicks = 5) {
  const kicks = totalKicks || 5;
  return Number((goalsScored * (100 / kicks)).toFixed(2));
}


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
  else if (cleanId === 'dailytrivia') canonicalId = 'dailyTrivia';

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
    case "dailyTrivia":
      return result.rawXP || 0;
    default:
      console.warn(`[scoreNorm] Unknown gameId: ${gameId}`);
      return 0;
  }
}