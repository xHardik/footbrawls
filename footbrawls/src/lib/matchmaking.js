import { collection, doc, getDocs, query, where, limit, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { BUDDY_TIMEOUT_MS } from './raidConstants';
import { COUNTRIES } from './countries';
import { seededRandom } from './dailySeed';

const BOT_BUDDY_NAMES = [
  'ShadowStriker', 'MidnightWinger', 'GhostPasser', 'IronBoot', 'SwiftKeeper',
  'NeonNinja', 'TurboTackle', 'SilentCaptain', 'BlazeForward', 'SteelWall',
];

const BOT_RIVAL_NAMES = [
  'DarkDefender', 'RogueRaider', 'ChaosKeeper', 'StormStriker', 'VenomVolley',
  'PhantomPress', 'CursedCaptain', 'RaidReaper', 'FortBreaker', 'HexHandler',
];

function pickRandom(arr, seed, idx = 0) {
  return arr[Math.floor(seededRandom(seed, idx) * arr.length)];
}

/**
 * Creates a bot buddy + rival duo when no human match is found within 45s.
 */
export function createBotRivalDuo(user, seed = Date.now()) {
  const buddyName  = pickRandom(BOT_BUDDY_NAMES, seed, 1);
  const rivalPool  = COUNTRIES.filter(c => c.code !== user.homeCountry);
  const r1Country  = pickRandom(rivalPool, seed, 2);
  const r2Country  = pickRandom(rivalPool.filter(c => c.code !== r1Country.code), seed, 3);

  const buddy = {
    userId:      `bot_buddy_${seed}`,
    nickname:    buddyName,
    flag:        user.flag || '🏳️',
    homeCountry: user.homeCountry,
    isBot:       true,
  };

  const rivals = [
    {
      userId:      `bot_rival_1_${seed}`,
      nickname:    pickRandom(BOT_RIVAL_NAMES, seed, 4),
      flag:        r1Country.flag,
      homeCountry: r1Country.code,
      isBot:       true,
    },
    {
      userId:      `bot_rival_2_${seed}`,
      nickname:    pickRandom(BOT_RIVAL_NAMES, seed, 5),
      flag:        r2Country.flag,
      homeCountry: r2Country.code,
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
      raidType,
      waitingSince: serverTimestamp(),
      status:       'waiting',
    });

    const q = query(
      collection(db, 'raidQueue'),
      where('status', '==', 'waiting'),
      where('raidType', '==', raidType),
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

/**
 * Search for a raid buddy. Resolves with a matched duo after up to 45s,
 * falling back to bot buddy + bot rivals.
 *
 * @param {Object} user
 * @param {string} raidType — normal | challenge | training
 * @param {Function} [onProgress] — ({ elapsed, remaining, status })
 */
export function findBuddy(user, raidType, onProgress) {
  return new Promise((resolve) => {
    const start   = Date.now();
    let settled   = false;
    let pollTimer = null;
    let tickTimer = null;

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
      const remaining = Math.max(0, BUDDY_TIMEOUT_MS - elapsed);
      onProgress?.({ elapsed, remaining, status: remaining > 0 ? 'searching' : 'fallback' });

      if (elapsed >= BUDDY_TIMEOUT_MS) {
        finish(createBotRivalDuo(user, Date.now()));
      }
    }, 400);

    pollTimer = setInterval(async () => {
      if (settled || Date.now() - start >= BUDDY_TIMEOUT_MS) return;
      const match = await tryFirestoreMatch(user, raidType);
      if (match) finish(match);
    }, 3000);

    tryFirestoreMatch(user, raidType).then(match => {
      if (match) finish(match);
    });
  });
}
