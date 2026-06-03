// src/lib/xpEngine.js
// The single source of truth for all XP operations.
// Now includes guild level upgrade logic — castleHP never resets daily,
// instead upgrades the guild to the next level on reaching the cap.

import { db } from './firebase';
import {
  doc, getDoc, updateDoc, increment,
  runTransaction, serverTimestamp
} from 'firebase/firestore';
import { checkUpgrade, getXPMultiplier, getHPCap } from './guildLevels';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_XP_CAP = 200;

const XP_REWARDS = {
  // Games
  whoareya_correct:        25,
  wordle_correct:          20,
  higherLower_correct:     15,
  transferTrail_correct:   20,
  trivia_correct:          10,
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
  chat_active:             5,
};

const TIERS = [
  { name: 'lurker',  min: 0   },
  { name: 'fan',     min: 50  },
  { name: 'veteran', min: 200 },
  { name: 'ultra',   min: 500 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTier(totalXP) {
  const tier = [...TIERS].reverse().find(t => totalXP >= t.min);
  return tier ? tier.name : 'lurker';
}

function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

// ─── Core XP Award Function ───────────────────────────────────────────────────

export async function awardXP(userId, source, opts = {}) {
  const userRef = doc(db, 'users', userId);

  return await runTransaction(db, async (t) => {
    const userSnap = await t.get(userRef);
    if (!userSnap.exists()) throw new Error(`User ${userId} not found`);

    const user  = userSnap.data();
    const today = getTodayUTC();

    // Reset daily XP if it's a new day
    const dailyXP  = user.dailyXPDate === today ? (user.dailyXP || 0) : 0;
    const roomLeft = DAILY_XP_CAP - dailyXP;
    if (roomLeft <= 0 && !opts.skipCap) {
      return { xpAwarded: 0, cappedOut: true, dailyXPUsed: dailyXP };
    }

    // Base XP
    let baseXP = opts.rawXP ?? (XP_REWARDS[source] || 0);

    // Fetch home guild for multiplier (level-aware)
    const homeGuildRef  = doc(db, 'guilds', user.homeCountry);
    const homeGuildSnap = await t.get(homeGuildRef);
    const homeGuildData = homeGuildSnap.exists() ? homeGuildSnap.data() : {};

    // Use level-aware multiplier from guildLevels.js
    const multiplier   = getXPMultiplier(homeGuildData);
    const xpAfterCurse = Math.round(baseXP * multiplier);
    const xpToAward    = opts.skipCap
      ? xpAfterCurse
      : Math.min(xpAfterCurse, roomLeft);

    if (xpToAward <= 0) return { xpAwarded: 0, cappedOut: true };

    // XP split: 80% home country, 20% support team
    const homeXP    = Math.round(xpToAward * 0.8);
    const supportXP = xpToAward - homeXP;

    // Update user doc
    const newTotal = (user.totalXP || 0) + xpToAward;
    t.update(userRef, {
      totalXP:     newTotal,
      dailyXP:     dailyXP + xpToAward,
      dailyXPDate: today,
      tier:        getTier(newTotal),
    });

    // ── Guild HP update with level-up logic ───────────────────────────────────
    await applyGuildHP(t, homeGuildRef, homeGuildData, homeXP);

    // Support team guild (if different)
    if (user.supportTeam && user.supportTeam !== user.homeCountry) {
      const supportGuildRef  = doc(db, 'guilds', user.supportTeam);
      const supportGuildSnap = await t.get(supportGuildRef);
      const supportGuildData = supportGuildSnap.exists() ? supportGuildSnap.data() : {};
      await applyGuildHP(t, supportGuildRef, supportGuildData, supportXP);
    }

    return {
      xpAwarded:      xpToAward,
      newTotal,
      newTier:        getTier(newTotal),
      dailyXPUsed:    dailyXP + xpToAward,
      curseMultiplier: multiplier,
      split:          { home: homeXP, support: supportXP },
    };
  });
}

// ─── Guild HP + Level Up ──────────────────────────────────────────────────────

/**
 * Apply HP to a guild. If it reaches the cap, upgrade to next level
 * and carry overflow HP into the new level.
 */
function applyGuildHP(t, guildRef, guildData, hpToAdd) {
  const currentLevel = guildData.guildLevel || 1;
  const currentHP    = guildData.castleHP   || 0;
  const newHP        = currentHP + hpToAdd;

  const { shouldUpgrade, overflow, newLevel } = checkUpgrade(newHP, currentLevel);

  if (shouldUpgrade) {
    // Level up — reset HP to overflow amount, bump level
    t.update(guildRef, {
      castleHP:        overflow,
      castleHPCap:     getHPCap(newLevel),
      guildLevel:      newLevel,
      lastLevelUpAt:   serverTimestamp(),
      // Announce level up in guild (picked up by Guild.jsx onSnapshot)
      levelUpPending:  true,
      levelUpTo:       newLevel,
    });
  } else {
    // Normal increment
    t.update(guildRef, {
      castleHP:    increment(hpToAdd),
      castleHPCap: getHPCap(currentLevel), // keep in sync
    });
  }
}

// ─── Prediction XP ────────────────────────────────────────────────────────────

export function getPredictionMultiplier(streakCount) {
  if (streakCount >= 8) return 3.0;
  if (streakCount >= 5) return 2.0;
  if (streakCount >= 3) return 1.5;
  return 1.0;
}

export async function awardPredictionXP(userId, { resultCorrect, scorerCorrect, scoreCorrect }) {
  const userRef  = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const user     = userSnap.data();

  let baseXP = 0;
  if (resultCorrect) baseXP += XP_REWARDS.prediction_result;
  if (scorerCorrect) baseXP += XP_REWARDS.prediction_scorer;
  if (scoreCorrect)  baseXP += XP_REWARDS.prediction_score;

  if (baseXP === 0) {
    await updateDoc(userRef, { predictionStreak: 0, predictionMultiplier: 1 });
    return { xpAwarded: 0, streakReset: true };
  }

  const newStreak  = (user.predictionStreak || 0) + 1;
  const multiplier = getPredictionMultiplier(newStreak);
  const finalXP    = Math.round(baseXP * multiplier);

  await updateDoc(userRef, {
    predictionStreak:    newStreak,
    predictionMultiplier: multiplier,
  });

  return awardXP(userId, 'prediction_result', { rawXP: finalXP });
}

// ─── Login Streak ─────────────────────────────────────────────────────────────

export async function handleDailyLogin(userId) {
  const userRef  = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const user     = userSnap.data();
  const today    = getTodayUTC();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const lastLogin = user.loginStreakLastDate;
  let newStreak   = 1;

  if (lastLogin === yesterday) {
    newStreak = (user.loginStreakDays || 0) + 1;
  } else if (lastLogin === today) {
    return { alreadyLoggedIn: true };
  }

  await updateDoc(userRef, {
    loginStreakDays:     newStreak,
    loginStreakLastDate: today,
  });

  const isWeekStreak = newStreak > 0 && newStreak % 7 === 0;
  return awardXP(userId, isWeekStreak ? 'login_streak_7day' : 'daily_login');
}

// ─── Clear level-up notification (call from Guild.jsx after showing banner) ───

export async function clearLevelUpNotification(guildCode) {
  await updateDoc(doc(db, 'guilds', guildCode), {
    levelUpPending: false,
    levelUpTo:      null,
  });
}

export { XP_REWARDS, TIERS, getTier };