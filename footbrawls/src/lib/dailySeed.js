// lib/dailySeed.js
// Pure deterministic math. Zero DB calls. Works offline.
// Same seed = same player/puzzle for every user on earth, all day.

const TOURNAMENT_START_UTC = new Date('2026-06-11T00:00:00Z');

// ─── Seed ─────────────────────────────────────────────────────────────────────

export function getDailySeed(dateOverride = null) {
  const today = dateOverride ? new Date(dateOverride) : new Date();
  today.setUTCHours(0, 0, 0, 0);
  const seed = Math.floor((today - TOURNAMENT_START_UTC) / 86400000);
  return Math.max(0, seed); // Never negative (pre-tournament dates = day 0)
}

export function getDailyPlayer(playerList, dateOverride = null) {
  if (!playerList?.length) return null;
  const seed = getDailySeed(dateOverride);
  return playerList[seed % playerList.length];
}

// Get a seeded random number between 0 and 1 (deterministic)
// Use for anything that needs "random but same for everyone today"
export function seededRandom(seed, index = 0) {
  // Simple LCG (good enough for game purposes)
  let s = (seed * 1664525 + index * 1013904223 + 1013904223) & 0xffffffff;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  s = s ^ (s >>> 16);
  return (s >>> 0) / 0xffffffff; // Normalise to [0, 1]
}

// Pick N items from array using daily seed (no repeats)
export function getDailySelection(arr, count, dateOverride = null) {
  const seed = getDailySeed(dateOverride);
  const copy = [...arr];
  const result = [];

  for (let i = 0; i < count && copy.length > 0; i++) {
    const rand = seededRandom(seed, i);
    const idx = Math.floor(rand * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// ─── Score Normalisation (for Act 1 Raid fairness) ───────────────────────────

const NORMALISATION_RULES = {
  higherLower:  { fn: (s) => s,          desc: '/10 direct' },
  rapidFire:    { fn: (s) => s / 2,      desc: '/20 → /10' },
  squadNumber:  { fn: (s) => s * 2,      desc: '/5 → /10' },
  passport:     { fn: (s) => s * 1.25,   desc: '/8 → /10' },
  penaltyNerve: { fn: (s) => s * 2,      desc: '/5 → /10' },
  whoareya:     { fn: (s) => 10 - (s * 2), desc: 'hints: 0=10, 4=2' },
  silhouette:   { fn: (s) => 10 - (s * 2), desc: 'hints: 0=10, 4=2' },
  dailyTrivia:  { fn: (s) => s,          desc: '/10 direct' },
  wordle:       { fn: (s) => Math.max(0, 10 - s), desc: 'attempts: 1=9, 6=4' },
  firstTouch:   { fn: (s) => Math.min(10, s / 10), desc: 'reaction ms: lower=better' },
};

export function normaliseScore(game, rawScore) {
  const rule = NORMALISATION_RULES[game];
  if (!rule) {
    console.warn(`No normalisation rule for game: ${game}. Returning raw.`);
    return Math.max(0, Math.min(10, rawScore));
  }
  const normalised = rule.fn(rawScore);
  return Math.max(0, Math.min(10, Number(normalised.toFixed(2))));
}

// ─── Archive Mode ─────────────────────────────────────────────────────────────

// Returns true if a given date is in the valid archive range
export function isArchiveDateValid(dateStr) {
  const ARCHIVE_START = new Date('2026-03-01T00:00:00Z');
  const date = new Date(dateStr);
  const now = new Date();
  return date >= ARCHIVE_START && date < now;
}

// Get the puzzle date from URL param (archive mode) or today
export function getActivePuzzleDate() {
  const params = new URLSearchParams(window.location.search);
  const archiveDate = params.get('date');
  if (archiveDate && isArchiveDateValid(archiveDate)) {
    return archiveDate;
  }
  return new Date().toISOString().split('T')[0];
}

// ─── Usage Examples ───────────────────────────────────────────────────────────
/*
  import { getDailyPlayer, getDailySelection, normaliseScore, getActivePuzzleDate } from './dailySeed.js';

  // Who Are Ya — today's mystery player
  const puzzleDate = getActivePuzzleDate();
  const todaysPlayer = getDailyPlayer(allPlayers, puzzleDate);

  // Daily Trivia — 10 questions from pool of 500
  const todaysQuestions = getDailySelection(questionBank, 10, puzzleDate);

  // Raid score normalisation
  const normScore = normaliseScore('rapidFire', 15); // → 7.5
*/
