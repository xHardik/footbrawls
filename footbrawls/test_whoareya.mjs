import { PLAYERS } from './src/lib/players.js';
import { getDailyPlayer, getRaidSeed, getActivePuzzleDate } from './src/lib/dailySeed.js';

try {
  const puzzleDate = "2026-06-30";
  
  let player = getDailyPlayer(PLAYERS, 'whoAreYa', puzzleDate);
  console.log("Daily player:", player?.name);

  const sessionId = "session_123";
  const sessionSeed = "123456";
  const seedVal = getRaidSeed(sessionId, sessionSeed);
  const idx = (seedVal + 997) % PLAYERS.length;
  console.log("Raid player:", PLAYERS[idx]?.name);
  
} catch (e) {
  console.error("Crash:", e);
}
