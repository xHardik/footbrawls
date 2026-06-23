import { collection, doc, getDoc, getDocs, query, where, limit, setDoc, deleteDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
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
    
    // 1. Check if our own document is already matched by someone else
    const myDocSnap = await getDoc(queueRef);
    if (myDocSnap.exists()) {
      const myData = myDocSnap.data();
      if (myData.status === 'matched' && myData.matchedWith) {
        const buddy = myData.matchedWith;
        const seed = myData.matchedSeed || Date.now();
        const sessionId = myData.sessionId || `raid_session_${seed}`;

        const { rivals } = createBotRivalDuo(user, seed);

        // Delete our queue document now that we've retrieved the buddy
        try { await deleteDoc(queueRef); } catch (e) {}

        return {
          buddy,
          rivals,
          yourDuo:    [user, buddy],
          rivalDuo:   rivals,
          isBotMatch: false,
          matchedAt:  Date.now(),
          sessionId,
        };
      }
    } else {
      // Create initial waiting document
      await setDoc(queueRef, {
        userId:       user.userId,
        nickname:     user.nickname,
        flag:         user.flag || '',
        homeCountry:  user.homeCountry,
        totalXP:      user.totalXP || 0,
        raidType,
        waitingSince: serverTimestamp(),
        status:       'waiting',
      });

      // Write a dummy pending document to gameSessions to ensure collection is created and visible in console
      const initialSessionId = `search_pending_${user.userId}`;
      await setDoc(doc(db, 'gameSessions', initialSessionId), {
        sessionId: initialSessionId,
        sessionType: 'raid_pending',
        hostId: user.userId,
        hostName: user.nickname,
        hostFlag: user.flag || '',
        status: 'waiting',
        createdAt: serverTimestamp(),
      });
    }

    // 2. Query for other waiting candidates in our guild
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

    // 3. Atomically match with the candidate using a transaction
    const matchedSeed = Date.now();
    const sessionId = `raid_${matchedSeed}`;
    const resultBuddy = await runTransaction(db, async (transaction) => {
      const candRef = doc(db, 'raidQueue', candidate.id);
      const candSnap = await transaction.get(candRef);
      if (!candSnap.exists()) return null;

      const candData = candSnap.data();
      if (candData.status !== 'waiting') return null;

      const mySnap = await transaction.get(queueRef);
      if (!mySnap.exists()) return null;

      // Update candidate status to matched with us
      transaction.update(candRef, {
        status: 'matched',
        matchedWith: {
          userId:      user.userId,
          nickname:    user.nickname,
          flag:        user.flag || '',
          homeCountry: user.homeCountry,
          totalXP:     user.totalXP || 0,
          isBot:       false,
        },
        matchedSeed,
        sessionId,
      });

      // Update our own status to matched with candidate
      const buddyData = {
        userId:      candData.userId,
        nickname:    candData.nickname,
        flag:        candData.flag || '',
        homeCountry: candData.homeCountry,
        totalXP:     candData.totalXP || 0,
        isBot:       false,
      };
      transaction.update(queueRef, {
        status: 'matched',
        matchedWith: buddyData,
        matchedSeed,
        sessionId,
      });

      return buddyData;
    });

    if (resultBuddy) {
      const { rivals } = createBotRivalDuo(user, matchedSeed);

      // Create the shared raid session in gameSessions collection
      const sessionRef = doc(db, 'gameSessions', sessionId);
      await setDoc(sessionRef, {
        sessionId,
        sessionType: 'raid',
        raidType,
        raidSeed: matchedSeed,
        players: [
          {
            userId: user.userId,
            nickname: user.nickname,
            flag: user.flag || '',
            homeCountry: user.homeCountry,
            totalXP: user.totalXP || 0,
          },
          resultBuddy
        ],
        rivals,
        currentAct: 1,
        scores: {},
        acts: {},
        actWinners: [],
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // Clean up our own queue document
      try { await deleteDoc(queueRef); } catch (e) {}

      return {
        buddy: resultBuddy,
        rivals,
        yourDuo:    [user, resultBuddy],
        rivalDuo:   rivals,
        isBotMatch: false,
        matchedAt:  Date.now(),
        sessionId,
      };
    }

    return null;
  } catch (err) {
    console.warn('[matchmaking] Firestore queue match failed:', err.message);
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
      try { deleteDoc(doc(db, 'gameSessions', `search_pending_${user.userId}`)); } catch { /* noop */ }
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
