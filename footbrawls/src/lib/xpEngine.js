// lib/xpEngine.js
// The single source of truth for all XP operations.
// Import this wherever XP is earned — games, raids, chat, predictions.
// Uses Firestore transactions to keep user + guild in sync atomically.

import { db } from './firebase'; // your firebase init file
import {
  doc, getDoc, updateDoc, increment,
  runTransaction, serverTimestamp
} from 'firebase/firestore';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_XP_CAP = 200;
const CASTLE_HP_CAP = 10000;

const XP_REWARDS = {
  // Games
  whoareya_correct:        25,
  wordle_correct:          20,
  higherLower_correct:     15,  // per correct round
  transferTrail_correct:   20,
  trivia_correct:          10,  // per question (cap 80)
  rapidFire_complete:      20,
  penaltyNerve_all5:       30,
  silhouette_correct:      20,
  firstTouch_complete:     15,
  squadNumber_correct:     15,
  passport_correct:        15,
  feeOrFree_correct:       15,
  whatYear_correct:        15,
  // Predictions
  prediction_result:       30,
  prediction_scorer:       20,
  prediction_score:        50,
  // Raids
  raid_win_normal:         100,
  raid_win_challenge:      200,
  raid_loss:               30,
  raid_mvp:                50,
  // Social
  share_card:              15,
  reveal_ad_watched:       5,
  daily_login:             20,
  login_streak_7day:       100,
  chat_active:             5,   // per hour, cap 15/day
};

const CURSE_XP_MULTIPLIERS = {
  null:           1.0,
  blessed:        1.25,
  cursed:         0.75,
  double_cursed:  0.5,
  death_curse:    0.25,
};

const TIERS = [
  { name: 'lurker',  min: 0   },
  { name: 'fan',     min: 50  },
  { name: 'veteran', min: 200 },
  { name: 'ultra',   min: 500 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTier(totalXP) {
  // Legend is handled separately by cron (top 1% of active users)
  const tier = [...TIERS].reverse().find(t => totalXP >= t.min);
  return tier ? tier.name : 'lurker';
}

function getTodayUTC() {
  return new Date().toISOString().split('T')[0]; // "2026-06-15"
}

// ─── Core XP Award Function ───────────────────────────────────────────────────

/**
 * Award XP to a user and update their guild castleHP.
 *
 * @param {string} userId    - User's UUID
 * @param {string} source    - Key from XP_REWARDS (e.g. 'whoareya_correct')
 * @param {object} opts      - { rawXP: override amount, skipCap: bool }
 * @returns {object}         - { xpAwarded, newTotal, newTier, dailyXPUsed }
 */
export async function awardXP(userId, source, opts = {}) {
  const userRef = doc(db, 'users', userId);

  return await runTransaction(db, async (t) => {
    const userSnap = await t.get(userRef);
    if (!userSnap.exists()) throw new Error(`User ${userId} not found`);

    const user = userSnap.data();
    const today = getTodayUTC();

    // Reset daily XP if it's a new day
    const dailyXP = user.dailyXPDate === today ? (user.dailyXP || 0) : 0;

    // How much room left today?
    const roomLeft = DAILY_XP_CAP - dailyXP;
    if (roomLeft <= 0 && !opts.skipCap) {
      return { xpAwarded: 0, cappedOut: true, dailyXPUsed: dailyXP };
    }

    // Base XP
    let baseXP = opts.rawXP ?? (XP_REWARDS[source] || 0);

    // Apply curse/blessing multiplier from home guild
    const homeGuildRef = doc(db, 'guilds', user.homeCountry);
    const homeGuildSnap = await t.get(homeGuildRef);
    const curse = homeGuildSnap.exists()
      ? homeGuildSnap.data().currentCurse || homeGuildSnap.data().currentBlessing
      : null;
    const multiplier = CURSE_XP_MULTIPLIERS[curse] ?? 1.0;
    let xpAfterCurse = Math.round(baseXP * multiplier);

    // Enforce daily cap
    const xpToAward = opts.skipCap
      ? xpAfterCurse
      : Math.min(xpAfterCurse, roomLeft);

    if (xpToAward <= 0) {
      return { xpAwarded: 0, cappedOut: true };
    }

    // XP split: 80% home country, 20% support team
    const homeXP = Math.round(xpToAward * 0.8);
    const supportXP = xpToAward - homeXP; // remaining 20%

    // Update user
    const newTotal = (user.totalXP || 0) + xpToAward;
    t.update(userRef, {
      totalXP: newTotal,
      dailyXP: dailyXP + xpToAward,
      dailyXPDate: today,
      tier: getTier(newTotal),
    });

    // Update home guild castle HP (atomic increment, capped client-side logic handled by display)
    const homeGuildUpdate = { castleHP: increment(homeXP) };
    t.update(homeGuildRef, homeGuildUpdate);

    // Update support team castle HP (only if different from home country)
    if (user.supportTeam && user.supportTeam !== user.homeCountry) {
      const supportGuildRef = doc(db, 'guilds', user.supportTeam);
      t.update(supportGuildRef, { castleHP: increment(supportXP) });
    }

    return {
      xpAwarded: xpToAward,
      newTotal,
      newTier: getTier(newTotal),
      dailyXPUsed: dailyXP + xpToAward,
      curseMultiplier: multiplier,
      split: { home: homeXP, support: supportXP },
    };
  });
}

// ─── Prediction Streak Multiplier ────────────────────────────────────────────

export function getPredictionMultiplier(streakCount) {
  if (streakCount >= 8) return 3.0;
  if (streakCount >= 5) return 2.0;
  if (streakCount >= 3) return 1.5;
  return 1.0;
}

export async function awardPredictionXP(userId, { resultCorrect, scorerCorrect, scoreCorrect }) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const user = userSnap.data();

  let baseXP = 0;
  if (resultCorrect) baseXP += XP_REWARDS.prediction_result;
  if (scorerCorrect) baseXP += XP_REWARDS.prediction_scorer;
  if (scoreCorrect)  baseXP += XP_REWARDS.prediction_score;

  if (baseXP === 0) {
    // Wrong prediction — reset streak
    await updateDoc(userRef, { predictionStreak: 0, predictionMultiplier: 1 });
    return { xpAwarded: 0, streakReset: true };
  }

  const newStreak = (user.predictionStreak || 0) + 1;
  const multiplier = getPredictionMultiplier(newStreak);
  const finalXP = Math.round(baseXP * multiplier);

  await updateDoc(userRef, {
    predictionStreak: newStreak,
    predictionMultiplier: multiplier,
  });

  return awardXP(userId, 'prediction_result', {
    rawXP: finalXP,
    skipCap: false,
  });
}

// ─── Login Streak ─────────────────────────────────────────────────────────────

export async function handleDailyLogin(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const user = userSnap.data();
  const today = getTodayUTC();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const lastLogin = user.loginStreakLastDate;
  let newStreak = 1;

  if (lastLogin === yesterday) {
    newStreak = (user.loginStreakDays || 0) + 1;
  } else if (lastLogin === today) {
    // Already logged in today — no update needed
    return { alreadyLoggedIn: true };
  }

  await updateDoc(userRef, {
    loginStreakDays: newStreak,
    loginStreakLastDate: today,
  });

  // Award streak XP
  const isWeekStreak = newStreak > 0 && newStreak % 7 === 0;
  const source = isWeekStreak ? 'login_streak_7day' : 'daily_login';
  return awardXP(userId, source);
}

export { XP_REWARDS, TIERS, getTier };
