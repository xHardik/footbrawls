// api/lib/xpEngine.js
// Server-side XP Engine using firebase-admin.
// Replicates src/lib/xpEngine.js functionality using Node.js Admin SDK.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import { checkUpgrade, getXPMultiplier, getHPCap } from '../../src/lib/guildLevels.js';

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  } else {
    try {
      const saPath = new URL('../../serviceAccountKey.json', import.meta.url);
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      initializeApp({
        credential: cert(sa),
      });
    } catch (err) {
      console.warn("No service account key found for local firebase-admin fallback:", err.message);
      initializeApp();
    }
  }
}

const db = getFirestore();

const DAILY_XP_CAP = 200;

const XP_REWARDS = {
  // Games
  whoareya_correct:        25,
  wordle_correct:          25,
  higherLower_correct:     25,
  transferTrail_correct:   25,
  trivia_correct:          25,
  rapidFire_complete:      25,
  penaltyNerve_all5:       25,
  silhouette_correct:      25,
  firstTouch_complete:     25,
  squadNumber_correct:     25,
  passport_correct:        25,
  feeOrFree_correct:       25,
  whatYear_correct:        25,
  // Predictions
  prediction_result:       15,
  prediction_scorer:       5,
  prediction_score:        0,
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

function getTier(totalXP) {
  const tier = [...TIERS].reverse().find(t => totalXP >= t.min);
  return tier ? tier.name : 'lurker';
}

function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

export function getPredictionMultiplier(streakCount) {
  if (streakCount >= 8) return 3.0;
  if (streakCount >= 5) return 2.0;
  if (streakCount >= 3) return 1.5;
  return 1.0;
}

export async function awardXP(userId, source, opts = {}) {
  const userRef = db.collection('users').doc(userId);

  const result = await db.runTransaction(async (t) => {
    const userSnap = await t.get(userRef);
    if (!userSnap.exists) throw new Error(`User ${userId} not found`);

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

    // Override/force game/prediction rewards based on source
    if (source && (
      source.endsWith('_correct') ||
      source.endsWith('_complete') ||
      source.endsWith('_all5') ||
      source === 'dailytrivia_complete'
    )) {
      baseXP = Math.min(25, baseXP);
    } else if (source === 'prediction_result') {
      baseXP = Math.min(50, baseXP);
    }

    // ── ALL READS FIRST (Firestore requires reads before writes) ─────────────
    const homeGuildRef  = db.collection('guilds').doc(user.homeCountry);
    const homeGuildSnap = await t.get(homeGuildRef);
    const homeGuildData = homeGuildSnap.exists ? homeGuildSnap.data() : {};

    const hasSupportGuild = !!(user.supportTeam && user.supportTeam !== user.homeCountry);
    let supportGuildRef  = null;
    let supportGuildData = {};
    if (hasSupportGuild) {
      supportGuildRef = db.collection('guilds').doc(user.supportTeam);
      const supportSnap = await t.get(supportGuildRef);
      supportGuildData  = supportSnap.exists ? supportSnap.data() : {};
    }

    // ── ALL COMPUTATION ───────────────────────────────────────────────────────
    const multiplier   = getXPMultiplier(homeGuildData);
    const xpAfterCurse = Math.round(baseXP * multiplier);
    const xpToAward    = opts.skipCap
      ? xpAfterCurse
      : Math.min(xpAfterCurse, roomLeft);

    if (xpToAward <= 0) return { xpAwarded: 0, cappedOut: true };

    const homeXP    = Math.round(xpToAward * 0.8);
    const supportXP = xpToAward - homeXP;
    const newTotal  = (user.totalXP || 0) + xpToAward;

    // ── ALL WRITES ───────────────────────────────────────────────────────────
    t.update(userRef, {
      totalXP:     newTotal,
      dailyXP:     dailyXP + xpToAward,
      dailyXPDate: today,
      tier:        getTier(newTotal),
    });

    applyGuildHP(t, homeGuildRef, homeGuildData, homeXP);

    if (hasSupportGuild && supportGuildRef) {
      applyGuildHP(t, supportGuildRef, supportGuildData, supportXP);
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

  return result;
}

function applyGuildHP(t, guildRef, guildData, hpToAdd) {
  const currentLevel = guildData.guildLevel || 1;
  const currentHP    = guildData.castleHP   || 0;
  const newHP        = currentHP + hpToAdd;

  const { shouldUpgrade, overflow, newLevel } = checkUpgrade(newHP, currentLevel);

  if (shouldUpgrade) {
    t.update(guildRef, {
      castleHP:        overflow,
      castleHPCap:     getHPCap(newLevel),
      guildLevel:      newLevel,
      lastLevelUpAt:   FieldValue.serverTimestamp(),
      levelUpPending:  true,
      levelUpTo:       newLevel,
    });
  } else {
    t.update(guildRef, {
      castleHP:    overflow,
      castleHPCap: getHPCap(currentLevel),
    });
  }
}

export async function awardPredictionXP(userId, { resultCorrect, scorerCorrect, scoreCorrect }) {
  const userRef  = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error(`User ${userId} not found`);
  const user     = userSnap.data();

  // 1. Result (Winner) Streak & Multiplier
  let resultStreak = user.predictionStreak || 0;
  if (resultCorrect) {
    resultStreak += 1;
  } else {
    resultStreak = 0;
  }
  const resultMult = getPredictionMultiplier(resultStreak);
  const resultXP = resultCorrect ? Math.round(XP_REWARDS.prediction_result * resultMult) : 0;

  // 2. Scorer Streak & Multiplier
  let scorerStreak = user.predictionScorerStreak || 0;
  if (scorerCorrect) {
    scorerStreak += 1;
  } else {
    scorerStreak = 0;
  }
  const scorerMult = getPredictionMultiplier(scorerStreak);
  const scorerXP = scorerCorrect ? Math.round(XP_REWARDS.prediction_scorer * scorerMult) : 0;

  const finalXP = resultXP + scorerXP;

  await userRef.update({
    predictionStreak:           resultStreak,
    predictionMultiplier:       resultMult,
    predictionScorerStreak:     scorerStreak,
    predictionScorerMultiplier: scorerMult,
  });

  if (finalXP === 0) {
    return { xpAwarded: 0 };
  }

  return awardXP(userId, 'prediction_result', { rawXP: finalXP });
}
