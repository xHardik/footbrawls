import { collection, doc, getDocs, query, where, limit, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { COUNTRIES } from './countries';
import { seededRandom } from './dailySeed';

const REALISTIC_BOT_NAMES = [
  'GoalHunter_9', 'PitchWizard_88', 'TikiTakaMaster', 'BacklineBoss_4', 'GoldenBoot_22',
  'FinoAllaFine_7', 'SambaJoker', 'US_SoccerFan', 'ElTri_Champs', 'Kaiser_Franz',
  'NutmegSensation', 'CleanSheetPro', 'BicycleKick_10', 'StretfordEnd_99', 'GelbGelb',
  'GamerX_Footy', 'RedDevils_Pro', 'VikingGoals', 'ApexPredator_9', 'SoloDribbler',
  'GloveSave_1', 'ChampsLeagueX', 'UltraUltras', 'KloppoVibes', 'TheSpecialOne',
  'FalseNine_10', ' Gegenpresser', 'Capitano_3', 'Panenka_Special', 'BoxToBox_8'
];

function pickRandom(arr, seed, idx = 0) {
  return arr[Math.floor(seededRandom(seed, idx) * arr.length)];
}

export function createBotRivalDuo(user, seed = Date.now()) {
  const rivalPool  = COUNTRIES.filter(c => c.code !== user.homeCountry);
  const rivalCountry = pickRandom(rivalPool, seed, 2);

  const baseXP = user.totalXP || 1000;

  const buddy = {
    userId:      `bot_buddy_${seed}`,
    nickname:    pickRandom(REALISTIC_BOT_NAMES, seed, 1),
    flag:        user.flag || '🏳️',
    homeCountry: user.homeCountry,
    totalXP:     Math.max(100, Math.floor(baseXP * (0.8 + seededRandom(seed, 10) * 0.4))),
    isBot:       true,
  };

  const rivals = [
    {
      userId:      `bot_rival_1_${seed}`,
      nickname:    pickRandom(REALISTIC_BOT_NAMES, seed, 4),
      flag:        rivalCountry.flag,
      homeCountry: rivalCountry.code,
      totalXP:     Math.max(100, Math.floor(baseXP * (0.9 + seededRandom(seed, 11) * 0.3))),
      isBot:       true,
    },
    {
      userId:      `bot_rival_2_${seed}`,
      nickname:    pickRandom(REALISTIC_BOT_NAMES, seed, 5),
      flag:        rivalCountry.flag,
      homeCountry: rivalCountry.code,
      totalXP:     Math.max(100, Math.floor(baseXP * (0.7 + seededRandom(seed, 12) * 0.5))),
      isBot:       true,
    },
  ];

  return {
    buddy,
    rivals,
    yourDuo:     [user, buddy],
    rivalDuo:    rivals,
    isBotMatch:  true,
    matchedAt:   Date.now(),
  };
}

async function tryFirestoreMatch(user, raidType) {
  try {
    const queueRef = doc(db, 'raidQueue', user.userId);
    await setDoc(queueRef, {
      userId:       user.userId,
      nickname:     user.nickname,
      flag:         user.flag,
      homeCountry:  user.homeCountry,
      totalXP:      user.totalXP || 0,
      raidType,
      waitingSince: serverTimestamp(),
      status:       'waiting',
    });

    const q = query(
      collection(db, 'raidQueue'),
      where('status', '==', 'waiting'),
      where('raidType', '==', raidType),
      where('homeCountry', '==', user.homeCountry),
      limit(10),
    );
    const snap = await getDocs(q);
    const candidate = snap.docs.find(d => d.id !== user.userId);

    if (!candidate) return null;

    const buddyData = candidate.data();
    await deleteDoc(queueRef);
    await deleteDoc(doc(db, 'raidQueue', candidate.id));

    const buddy = {
      userId:      buddyData.userId,
      nickname:    buddyData.nickname,
      flag:        buddyData.flag,
      homeCountry: buddyData.homeCountry,
      totalXP:     buddyData.totalXP || 1000,
      isBot:       false,
    };

    const seed = Date.now();
    const { rivals } = createBotRivalDuo(user, seed);

    return {
      buddy,
      rivals,
      yourDuo:    [user, buddy],
      rivalDuo:   rivals,
      isBotMatch: false,
      matchedAt:  Date.now(),
    };
  } catch (err) {
    console.warn('[matchmaking] Firestore queue unavailable:', err.message);
    return null;
  }
}

export function findBuddy(user, raidType, onProgress) {
  return new Promise((resolve) => {
    const start   = Date.now();
    let settled   = false;
    let pollTimer = null;
    let tickTimer = null;

    const timeoutDuration = Math.floor(Math.random() * 8000) + 4000;

    const finish = (match) => {
      if (settled) return;
      settled = true;
      clearInterval(tickTimer);
      clearInterval(pollTimer);
      try { deleteDoc(doc(db, 'raidQueue', user.userId)); } catch { /* noop */ }
      resolve(match);
    };

    tickTimer = setInterval(() => {
      const elapsed   = Date.now() - start;
      const remaining = Math.max(0, timeoutDuration - elapsed);
      onProgress?.({ elapsed, remaining, status: remaining > 0 ? 'searching' : 'fallback' });

      if (elapsed >= timeoutDuration) {
        finish(createBotRivalDuo(user, Date.now()));
      }
    }, 400);

    pollTimer = setInterval(async () => {
      if (settled || Date.now() - start >= timeoutDuration) return;
      const match = await tryFirestoreMatch(user, raidType);
      if (match) finish(match);
    }, 3000);

    tryFirestoreMatch(user, raidType).then(match => {
      if (match) finish(match);
    });
  });
}
