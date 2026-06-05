// src/lib/xpEngine.js
// The single source of truth for all XP operations.

import { db } from './firebase';
import {
  doc, getDoc, updateDoc, increment,
  runTransaction, serverTimestamp,
  addDoc, collection
} from 'firebase/firestore';
import { checkUpgrade, getXPMultiplier, getHPCap } from './guildLevels';

const DAILY_XP_CAP = 200;

const XP_REWARDS = {
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
  prediction_result:       30,
  prediction_scorer:       20,
  prediction_score:        50,
  raid_win_normal:         100,
  raid_win_challenge:      200,
  raid_loss:               30,
  raid_mvp:                50,
  share_card:              15,
  reveal_ad_watched:       5,
  daily_login:             20,
  login_streak_7day:       100,
  chat_active:             5,
};

const GAME_LABELS = {
  whoareya_correct:      "solved Who Are Ya",
  wordle_correct:        "cracked Player Wordle",
  penaltyNerve_all5:     "held nerve from the spot",
  transferTrail_correct: "completed Transfer Trail",
  prediction_result:     "locked a match prediction",
  higherLower_correct:   "won Higher or Lower",
  raid_win_normal:       "won a raid battle",
  raid_win_challenge:    "won a challenge raid",
  daily_login:           "logged in today",
  share_card:            "shared a result",
};

const GAME_ICONS = {
  whoareya_correct:      "👤",
  wordle_correct:        "🟩",
  penaltyNerve_all5:     "⚽",
  transferTrail_correct: "🔗",
  prediction_result:     "🔮",
  higherLower_correct:   "📊",
  raid_win_normal:       "⚔️",
  raid_win_challenge:    "⚔️",
  daily_login:           "🌅",
  share_card:            "📤",
};

const TIERS = [
  { name: 'lurker',  min: 0   },
  { name: 'fan',     min: 50  },
  { name: 'veteran', min: 200 },
  { name: 'ultra',   min: 500 },
];

function getTier(totalXP) {
  const tier = [...TIERS].reverse().find(t => totalXP >= t.min);
  return tier ? tier.name : 'lurker';
}

function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

// ─── Core XP Award ────────────────────────────────────────────────────────────
export async function awardXP(userId, source, opts = {}) {
  const userRef = doc(db, 'users', userId);

  const result = await runTransaction(db, async (t) => {
    const userSnap = await t.get(userRef);
    if (!userSnap.exists()) throw new Error(`User ${userId} not found`);

    const user  = userSnap.data();
    const today = getTodayUTC();

    const dailyXP  = user.dailyXPDate === today ? (user.dailyXP || 0) : 0;
    const roomLeft = DAILY_XP_CAP - dailyXP;
    if (roomLeft <= 0 && !opts.skipCap) {
      return { xpAwarded: 0, cappedOut: true, dailyXPUsed: dailyXP };
    }

    let baseXP = opts.rawXP ?? (XP_REWARDS[source] || 0);

    const homeGuildRef  = doc(db, 'guilds', user.homeCountry);
    const homeGuildSnap = await t.get(homeGuildRef);
    const homeGuildData = homeGuildSnap.exists() ? homeGuildSnap.data() : {};

    const multiplier   = getXPMultiplier(homeGuildData);
    const xpAfterCurse = Math.round(baseXP * multiplier);
    const xpToAward    = opts.skipCap
      ? xpAfterCurse
      : Math.min(xpAfterCurse, roomLeft);

    if (xpToAward <= 0) return { xpAwarded: 0, cappedOut: true };

    const homeXP    = Math.round(xpToAward * 0.8);
    const supportXP = xpToAward - homeXP;

    const newTotal = (user.totalXP || 0) + xpToAward;

    // ── Update user doc — sets dailyXPDate so Home.jsx listener picks it up ──
    t.update(userRef, {
      totalXP:     newTotal,
      dailyXP:     dailyXP + xpToAward,
      dailyXPDate: today,           // ← critical for getDailyXP()
      tier:        getTier(newTotal),
    });

    await applyGuildHP(t, homeGuildRef, homeGuildData, homeXP);

    if (user.supportTeam && user.supportTeam !== user.homeCountry) {
      const supportGuildRef  = doc(db, 'guilds', user.supportTeam);
      const supportGuildSnap = await t.get(supportGuildRef);
      const supportGuildData = supportGuildSnap.exists() ? supportGuildSnap.data() : {};
      await applyGuildHP(t, supportGuildRef, supportGuildData, supportXP);
    }

    return {
      xpAwarded:       xpToAward,
      newTotal,
      newTier:         getTier(newTotal),
      dailyXPUsed:     dailyXP + xpToAward,
      curseMultiplier: multiplier,
      split:           { home: homeXP, support: supportXP },
      _user:           user, // pass user data out for activity write
    };
  });

  // ── Write to activity collection (outside transaction, non-blocking) ────────
  // This powers Guild Pulse in Home.jsx and Guild.jsx
  if (result?.xpAwarded > 0 && result._user) {
    const u = result._user;
    addDoc(collection(db, 'activity'), {
      guildCode:  u.homeCountry,
      userId,
      nickname:   u.nickname  || 'Player',
      flag:       u.flag      || '🏳️',
      icon:       GAME_ICONS[source]  || '⚡',
      action:     `${GAME_LABELS[source] || 'played a game'} (+${result.xpAwarded} XP)`,
      createdAt:  serverTimestamp(),
    }).catch(() => {}); // fire-and-forget, never blocks XP
  }

  // Strip internal _user before returning
  if (result?._user) {
    const { _user, ...clean } = result;
    return clean;
  }
  return result;
}

// ─── Guild HP + Level Up ──────────────────────────────────────────────────────
function applyGuildHP(t, guildRef, guildData, hpToAdd) {
  const currentLevel = guildData.guildLevel || 1;
  const currentHP    = guildData.castleHP   || 0;
  const newHP        = currentHP + hpToAdd;

  const { shouldUpgrade, overflow, newLevel } = checkUpgrade(newHP, currentLevel);

  if (shouldUpgrade) {
    t.update(guildRef, {
      castleHP:       overflow,
      castleHPCap:    getHPCap(newLevel),
      guildLevel:     newLevel,
      lastLevelUpAt:  serverTimestamp(),
      levelUpPending: true,
      levelUpTo:      newLevel,
    });
  } else {
    t.update(guildRef, {
      castleHP:    increment(hpToAdd),
      castleHPCap: getHPCap(currentLevel),
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
    predictionStreak:     newStreak,
    predictionMultiplier: multiplier,
  });

  return awardXP(userId, 'prediction_result', { rawXP: finalXP });
}

// ─── Login Streak ─────────────────────────────────────────────────────────────
export async function handleDailyLogin(userId) {
  const userRef   = doc(db, 'users', userId);
  const userSnap  = await getDoc(userRef);
  const user      = userSnap.data();
  const today     = getTodayUTC();
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

// ─── Clear level-up notification ─────────────────────────────────────────────
export async function clearLevelUpNotification(guildCode) {
  await updateDoc(doc(db, 'guilds', guildCode), {
    levelUpPending: false,
    levelUpTo:      null,
  });
}

export { XP_REWARDS, TIERS, getTier };