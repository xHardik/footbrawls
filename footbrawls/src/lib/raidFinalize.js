import { db } from './firebase';
import { doc, getDoc, writeBatch, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getHPCap } from './guildLevels';
import { awardXP } from './xpEngine';
import { getUser } from './user';
import { RAID_TYPES } from './raidConstants';

async function performClientFinalizeFallback(payload) {
  try {
    const { raidType, outcome, isTraining, homeCountry, rivalGuildCode, acts, match, playerPerformance, xpAwarded } = payload;

    // 1. Log the raid in the 'raids' collection
    const raidsRef = collection(db, 'raids');
    const raidRef = await addDoc(raidsRef, {
      raidType,
      outcome,
      attackerGuildCode: homeCountry,
      defenderGuildCode: rivalGuildCode || null,
      acts:          acts || {},
      match:         match || {},
      playerPerformance: playerPerformance || {},
      xpAwarded:     xpAwarded || 0,
      createdAt:     serverTimestamp(),
    });

    if (isTraining) {
      return { ok: true, raidId: raidRef.id, training: true };
    }

    const batch = writeBatch(db);

    // Attacker Guild Update
    const attackerRef = doc(db, 'guilds', homeCountry);
    const attackerSnap = await getDoc(attackerRef);
    const attackerData = attackerSnap.exists() ? attackerSnap.data() : {};

    const warRecord = attackerData.warRecord || { wins: 0, losses: 0, draws: 0 };
    const newWarRecord = { ...warRecord };
    if (outcome === 'win')  newWarRecord.wins   = (warRecord.wins   || 0) + 1;
    if (outcome === 'loss') newWarRecord.losses = (warRecord.losses || 0) + 1;
    if (outcome === 'draw') newWarRecord.draws  = (warRecord.draws  || 0) + 1;

    const attackerUpdate = {
      warRecord:    newWarRecord,
      lastRaidAt:   serverTimestamp(),
      lastMatch:    `Raid vs ${rivalGuildCode || 'rivals'}`,
    };

    // curseRaidWins
    let curseLifted = false;
    let curseRaidWins = attackerData.curseRaidWins ?? 0;
    if (outcome === 'win' && attackerData.currentCurse) {
      const prevWins = attackerData.curseRaidWins ?? 0;
      const winsNeeded = attackerData.curseRaidWinsNeeded ?? 3;
      const newWins = prevWins + 1;
      if (newWins >= winsNeeded) {
        attackerUpdate.curseRaidWins = 0;
        attackerUpdate.curseRaidWinsNeeded = 3;
        attackerUpdate.currentCurse = null;
        attackerUpdate.currentBlessing = null;
        attackerUpdate.curseExpiresAt = null;
        curseLifted = true;
        curseRaidWins = 0;
      } else {
        attackerUpdate.curseRaidWins = newWins;
        curseRaidWins = newWins;
      }
    }

    batch.set(attackerRef, attackerUpdate, { merge: true });

    // Defender Guild Update
    let damageDealt = 0;
    if (rivalGuildCode) {
      const defenderRef = doc(db, 'guilds', rivalGuildCode);
      const defenderSnap = await getDoc(defenderRef);
      if (defenderSnap.exists()) {
        const dData = defenderSnap.data();
        const dWar = dData.warRecord || { wins: 0, losses: 0, draws: 0 };
        const dUpdate = {
          lastRaidAt: serverTimestamp()
        };

        if (outcome === 'win') {
          const dLevel = dData.guildLevel || 1;
          const dCap = getHPCap(dLevel);
          // Normal Raid deals 0% castle damage, Challenge Raid deals 2%
          const dmgPct = raidType === 'challenge' ? 0.02 : 0.00;
          damageDealt = Math.floor(dCap * dmgPct);
          const rawHP = dData.castleHP || 0;
          dUpdate.castleHP = Math.max(0, rawHP - damageDealt);
          dUpdate.castleHPCap = dCap;
          dUpdate.warRecord = {
            ...dWar,
            losses: (dWar.losses || 0) + 1
          };
        } else if (outcome === 'loss') {
          dUpdate.warRecord = {
            ...dWar,
            wins: (dWar.wins || 0) + 1
          };
        }
        batch.set(defenderRef, dUpdate, { merge: true });
      }
    }

    if (payload.userId) {
      const userRef = doc(db, 'users', payload.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const stats = userData.stats || {};
        const achievements = userData.achievements || {};

        stats.totalRaidDamage = (stats.totalRaidDamage || 0) + damageDealt;
        if (!achievements.guildWarlord && stats.totalRaidDamage >= 100000) {
          achievements.guildWarlord = true;
        }

        batch.set(userRef, { stats, achievements }, { merge: true });

        // sync to localStorage
        try {
          const localUser = JSON.parse(localStorage.getItem('footbrawls_user') || '{}');
          if (localUser && localUser.userId === payload.userId) {
            localUser.stats = stats;
            localUser.achievements = achievements;
            localStorage.setItem('footbrawls_user', JSON.stringify(localUser));
          }
        } catch (e) {}
      }
    }

    await batch.commit();

    return {
      ok: true,
      raidId: raidRef.id,
      damageDealt,
      curseLifted,
      curseRaidWins,
    };
  } catch (e) {
    console.error('[raidFinalize] Fallback finalize failed:', e);
    return { ok: false, error: e.message };
  }
}

export async function finalizeRaid({
  raidType,
  outcome,
  isMvp,
  acts,
  match,
  rivalGuildCode,
  playerPerformance,
}) {
  const user = getUser();
  if (!user?.userId) throw new Error('No user found');

  const isTraining = raidType === 'training';
  const xpResults  = { win: null, mvp: null, cappedOut: false };

  if (!isTraining) {
    let winSource = null;
    if (outcome === 'win') {
      winSource = raidType === 'challenge' ? 'raid_win_challenge' : 'raid_win_normal';
    } else if (outcome === 'loss') {
      winSource = 'raid_loss';
    } else {
      winSource = 'raid_loss';
    }

    if (winSource) {
      const res = await awardXP(user.userId, winSource, { skipCap: true });
      xpResults.win = res;
      xpResults.cappedOut = res?.cappedOut ?? false;
    }

    if (isMvp) {
      const mvpRes = await awardXP(user.userId, 'raid_mvp', { skipCap: true });
      xpResults.mvp = mvpRes;
    }
  }

  const payload = {
    raidType,
    outcome,
    isTraining,
    userId:           user.userId,
    nickname:         user.nickname,
    homeCountry:      user.homeCountry,
    rivalGuildCode:   rivalGuildCode || match?.rivals?.[0]?.homeCountry,
    acts,
    match: {
      isBotMatch: match?.isBotMatch ?? true,
      buddy:      match?.buddy ?? null,
      rivals:     match?.rivals ?? [],
    },
    playerPerformance,
    xpAwarded: isTraining ? 0 : (xpResults.win?.xpAwarded ?? 0) + (xpResults.mvp?.xpAwarded ?? 0),
  };

  let serverResult = null;
  try {
    // Simplified: Push directly to Firebase from client to avoid API fallback issues locally
    serverResult = await performClientFinalizeFallback(payload);
  } catch (err) {
    console.error('[raidFinalize] Client finalize failed:', err);
  }

  return { xpResults, serverResult, payload };
}

export function getRaidXpPreview(raidType, outcome) {
  const config = RAID_TYPES[raidType];
  if (!config || raidType === 'training') return { win: 0, loss: 0, mvp: 0 };
  return {
    win:  config.winXP || 100,
    loss: config.lossXP || 30,
    mvp:  50,
  };
}
