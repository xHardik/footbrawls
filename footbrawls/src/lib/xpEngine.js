




import { db } from './firebase';
import {
  doc, getDoc, updateDoc, increment,
  runTransaction, serverTimestamp
} from 'firebase/firestore';
import { checkUpgrade, getXPMultiplier, getHPCap } from './guildLevels';
import { normScore } from './scoreNorm';



const DAILY_XP_CAP = 1000;

const XP_REWARDS = {

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

  prediction_result:       15,
  prediction_scorer:       5,
  prediction_score:        0,

  raid_win_normal:         100,
  raid_win_challenge:      300,
  raid_loss:               30,
  raid_mvp:                50,

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


export async function awardXP(userId, source, opts = {}) {

  const activeRaidId = typeof window !== 'undefined' ? localStorage.getItem('active_game_session_id') : null;
  const activeVsFriendsId = typeof window !== 'undefined' ? localStorage.getItem('active_vs_friends_session_id') : null;
  const activeSessionId = activeRaidId || activeVsFriendsId;
  
  if (activeSessionId) {
    try {
      const sessionRef = doc(db, 'gameSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const session = sessionSnap.data();
        if (session.status === 'active') {
          let rawScore = opts.rawXP ?? 0;
          let normalized = rawScore;

          if (session.sessionType === 'raid') {
            if (source === 'whoareya_correct' || source === 'wordle_correct' || source === 'higherLower_correct' || source === 'transferTrail_correct' || source === 'top10_complete' || source === 'dailytrivia_complete' ||
                source === 'whoareya_loss' || source === 'wordle_loss' || source === 'higherLower_loss' || source === 'transferTrail_loss' || source === 'top10_loss' || source === 'dailytrivia_loss') {
              normalized = normScore(source, opts);
              await updateDoc(sessionRef, {
                [`scores.${userId}.act1`]: {
                  gameId: source,
                  rawScore,
                  normalized
                }
              });
            } else if (source === 'dribble_correct') {
              const wins = Math.min(5, Math.max(0, Math.round(rawScore / 5)));
              await updateDoc(sessionRef, {
                [`scores.${userId}.act2`]: {
                  gameId: source,
                  rawScore,
                  wins
                }
              });
            } else if (source === 'penaltyNerve_all5') {
              const goals = Math.min(5, Math.max(0, Math.round(rawScore / 5)));
              await updateDoc(sessionRef, {
                [`scores.${userId}.act3`]: {
                  gameId: source,
                  rawScore,
                  goals
                }
              });
            }
            return { xpAwarded: 0, raidIntercepted: true };
          } else if (session.sessionType === 'vs_friends') {
            let currentActVal = 1;
            while (session.scores?.[userId]?.[`act${currentActVal}`] !== undefined) {
              currentActVal++;
            }
            let normalized = rawScore;
            if (source === 'whoareya_correct' || source === 'wordle_correct' || source === 'higherLower_correct' || source === 'transferTrail_correct' || source === 'top10_complete' || source === 'dailytrivia_complete' ||
                source === 'whoareya_loss' || source === 'wordle_loss' || source === 'higherLower_loss' || source === 'transferTrail_loss' || source === 'top10_loss' || source === 'dailytrivia_loss') {
              normalized = normScore(source, opts);
            } else if (source === 'dribble_correct') {
              normalized = Math.min(5, Math.max(0, Math.round(rawScore / 5))) * 20;
            } else if (source === 'penaltyNerve_all5') {
              normalized = Math.min(5, Math.max(0, Math.round(rawScore / 5))) * 20;
            }
            await updateDoc(sessionRef, {
              [`scores.${userId}.act${currentActVal}`]: {
                gameId: source,
                rawScore,
                normalized
              }
            });
            return { xpAwarded: 0, raidIntercepted: true, skipDailyIncrement: true, sessionType: session.sessionType, session: session, nextAct: currentActVal + 1 };
          }
        }
      }
    } catch (e) {
      console.warn('[xpEngine] Multiplayer session interception error:', e);
    }
  }

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


    const homeGuildRef  = doc(db, 'guilds', user.homeCountry);
    const homeGuildSnap = await t.get(homeGuildRef);
    const homeGuildData = homeGuildSnap.exists() ? homeGuildSnap.data() : {};

    const hasSupportGuild = !!(user.supportTeam && user.supportTeam !== user.homeCountry);
    let supportGuildRef  = null;
    let supportGuildData = {};
    if (hasSupportGuild) {
      supportGuildRef = doc(db, 'guilds', user.supportTeam);
      const supportSnap = await t.get(supportGuildRef);
      supportGuildData  = supportSnap.exists() ? supportSnap.data() : {};
    }


    const multiplier   = getXPMultiplier(homeGuildData);
    const xpAfterCurse = Math.round(baseXP * multiplier);
    const xpToAward    = opts.skipCap
      ? xpAfterCurse
      : Math.min(xpAfterCurse, roomLeft);

    if (xpToAward <= 0) return { xpAwarded: 0, cappedOut: true };

    const homeXP    = Math.round(xpToAward * 0.8);
    const supportXP = xpToAward - homeXP;
    const isRaidSource = source && source.startsWith('raid_');
    const newTotal  = (user.totalXP || 0) + xpToAward;


    let category = 'other';
    if (source && source.startsWith('raid_')) category = 'raids';
    else if (source && source.startsWith('prediction_')) category = 'matchpredictor';
    else if (source && (source.includes('login') || source.includes('share') || source === 'reveal_ad_watched' || source === 'chat_active')) category = 'social';
    else if (source) category = source.split('_')[0].toLowerCase();
    else category = 'other';

    const currentBreakdown = user.xpBreakdown || {};
    const newBreakdown = {
      ...currentBreakdown,
      [category]: (currentBreakdown[category] || 0) + xpToAward
    };

    const stats = user.stats || {};
    const achievements = user.achievements || {};


    if (!achievements.strikerHero && !isRaidSource && (dailyXP + xpToAward >= 1000)) {
      achievements.strikerHero = true;
    }


    if (category === 'trivia' && opts && opts.rawScore) {
      stats.totalTriviaCorrect = (stats.totalTriviaCorrect || 0) + opts.rawScore;
      if (!achievements.triviaGod && stats.totalTriviaCorrect >= 100) {
        achievements.triviaGod = true;
      }
    }


    if (category === 'games' && source) {
      if (stats.dailyGamesDate !== today) {
        stats.dailyGamesDate = today;
        stats.dailyGamesPlayed = [];
        stats.dedicatedAthleteDailyHit = false;
        

        const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
        if (stats.lastDedicatedDay !== yesterday) {
          stats.consecutiveDaysPlayed = 0;
        }
      }
      if (!stats.dailyGamesPlayed.includes(source)) {
        stats.dailyGamesPlayed.push(source);
      }
      if (stats.dailyGamesPlayed.length >= 9 && !stats.dedicatedAthleteDailyHit) {
        stats.dedicatedAthleteDailyHit = true;
        stats.lastDedicatedDay = today;
        stats.consecutiveDaysPlayed = (stats.consecutiveDaysPlayed || 0) + 1;
        if (!achievements.dedicatedAthlete && stats.consecutiveDaysPlayed >= 15) {
          achievements.dedicatedAthlete = true;
        }
      }
    }


    if (source === 'raid_mvp') {
      stats.raidMvpCount = (stats.raidMvpCount || 0) + 1;
      if (!achievements.consulMvp && stats.raidMvpCount >= 50) {
        achievements.consulMvp = true;
      }
    }


    if (category === 'predictor') {
      if (!achievements.oracle && user.predictionStreak >= 5) {
        achievements.oracle = true;
      }
    }

    const updatePayload = {
      totalXP:     newTotal,
      tier:        getTier(newTotal),
      xpBreakdown: newBreakdown,
      stats:       stats,
      achievements: achievements,
    };
    if (!isRaidSource) {
      updatePayload.dailyXP = dailyXP + xpToAward;
      updatePayload.dailyXPDate = today;
    }
    t.update(userRef, updatePayload);

    applyGuildHP(t, homeGuildRef, homeGuildData, homeXP);

    if (hasSupportGuild && supportGuildRef) {
      applyGuildHP(t, supportGuildRef, supportGuildData, supportXP);
    }

    return {
      xpAwarded:      xpToAward,
      newTotal,
      newTier:        getTier(newTotal),
      newBreakdown,
      stats,
      achievements,
      dailyXPUsed:    isRaidSource ? dailyXP : (dailyXP + xpToAward),
      curseMultiplier: multiplier,
      split:          { home: homeXP, support: supportXP },
    };
  });


  try {
    const localUser = JSON.parse(localStorage.getItem('footbrawls_user') || '{}');
    if (localUser && localUser.userId === userId) {
      localUser.totalXP = result.newTotal;
      localUser.xpBreakdown = result.newBreakdown;
      localUser.stats = result.stats;
      localUser.achievements = result.achievements;
      if (source && !source.startsWith('raid_')) {
        localUser.dailyXP = result.dailyXPUsed;
        localUser.dailyXPDate = getTodayUTC();
      }
      localUser.tier = result.newTier;
      localStorage.setItem('footbrawls_user', JSON.stringify(localUser));
    }
  } catch (e) {
    console.error('[xpEngine] Failed to sync user XP to localStorage:', e);
  }

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
      lastLevelUpAt:   serverTimestamp(),

      levelUpPending:  true,
      levelUpTo:       newLevel,
    });
  } else {

    t.update(guildRef, {
      castleHP:    increment(hpToAdd),
      castleHPCap: getHPCap(currentLevel),
    });
  }
}



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


  let resultStreak = user.predictionStreak || 0;
  if (resultCorrect) {
    resultStreak += 1;
  } else {
    resultStreak = 0;
  }
  const resultMult = getPredictionMultiplier(resultStreak);
  const resultXP = resultCorrect ? Math.round(XP_REWARDS.prediction_result * resultMult) : 0;


  let scorerStreak = user.predictionScorerStreak || 0;
  if (scorerCorrect) {
    scorerStreak += 1;
  } else {
    scorerStreak = 0;
  }
  const scorerMult = getPredictionMultiplier(scorerStreak);
  const scorerXP = scorerCorrect ? Math.round(XP_REWARDS.prediction_scorer * scorerMult) : 0;

  const finalXP = resultXP + scorerXP;

  await updateDoc(userRef, {
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



export async function clearLevelUpNotification(guildCode) {
  await updateDoc(doc(db, 'guilds', guildCode), {
    levelUpPending: false,
    levelUpTo:      null,
  });
}

export { XP_REWARDS, TIERS, getTier };