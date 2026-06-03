// api/raid/finalize.js
// Server-side raid persistence: raids doc, warRecord, castleHP damage, curseRaidWins

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

const HP_CAPS = [10_000, 25_000, 50_000, 100_000, 200_000];
const CURSE_LIFT_WINS = 3;

function getHPCap(level = 1) {
  return HP_CAPS[Math.min(Math.max(level, 1), 5) - 1];
}

function applyCastleDamage(currentHP, damage) {
  return Math.max(0, currentHP - damage);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const {
      raidType,
      outcome,
      isTraining,
      userId,
      nickname,
      homeCountry,
      rivalGuildCode,
      acts,
      match,
      playerPerformance,
      xpAwarded,
    } = body;

    if (!userId || !homeCountry) {
      return res.status(400).json({ error: 'Missing userId or homeCountry' });
    }

    const raidRef = db.collection('raids').doc();
    const now     = admin.firestore.Timestamp.now();

    await raidRef.set({
      raidType:      raidType || 'normal',
      outcome:       outcome || 'draw',
      isTraining:    Boolean(isTraining),
      userId,
      nickname:      nickname || 'Unknown',
      homeCountry,
      rivalGuildCode: rivalGuildCode || null,
      acts:          acts || {},
      match:         match || {},
      playerPerformance: playerPerformance || {},
      xpAwarded:     xpAwarded || 0,
      createdAt:     now,
    });

    if (isTraining || raidType === 'training') {
      return res.status(200).json({ ok: true, raidId: raidRef.id, training: true });
    }

    const attackerRef = db.collection('guilds').doc(homeCountry);
    const defenderRef = rivalGuildCode
      ? db.collection('guilds').doc(rivalGuildCode)
      : null;

    const batch = db.batch();
    const attackerSnap = await attackerRef.get();
    const attackerData = attackerSnap.exists ? attackerSnap.data() : {};

    const warRecord = attackerData.warRecord || { wins: 0, losses: 0, draws: 0 };
    const newWarRecord = { ...warRecord };

    if (outcome === 'win')  newWarRecord.wins   = (warRecord.wins   || 0) + 1;
    if (outcome === 'loss') newWarRecord.losses = (warRecord.losses || 0) + 1;
    if (outcome === 'draw') newWarRecord.draws  = (warRecord.draws  || 0) + 1;

    const attackerUpdate = {
      warRecord:    newWarRecord,
      lastRaidAt:   now,
      lastMatch:    `Raid vs ${rivalGuildCode || 'rivals'}`,
    };

    // curseRaidWins — increment on win when guild is cursed; lift at threshold
    if (outcome === 'win' && attackerData.currentCurse) {
      const prevWins    = attackerData.curseRaidWins ?? 0;
      const winsNeeded  = attackerData.curseRaidWinsNeeded ?? CURSE_LIFT_WINS;
      const newWins     = prevWins + 1;

      if (newWins >= winsNeeded) {
        attackerUpdate.curseRaidWins        = 0;
        attackerUpdate.curseRaidWinsNeeded  = CURSE_LIFT_WINS;
        attackerUpdate.currentCurse         = null;
        attackerUpdate.currentBlessing      = null;
        attackerUpdate.curseExpiresAt       = null;
      } else {
        attackerUpdate.curseRaidWins = newWins;
      }
    }

    batch.update(attackerRef, attackerUpdate);

    // Castle HP damage to rival guild on win (level-cap % model)
    let damageDealt = 0;
    if (outcome === 'win' && defenderRef) {
      const defenderSnap = await defenderRef.get();
      if (defenderSnap.exists) {
        const dData    = defenderSnap.data();
        const dLevel   = dData.guildLevel || 1;
        const dCap     = getHPCap(dLevel);
        const dmgPct   = raidType === 'challenge' ? 0.40 : 0.20;
        damageDealt    = Math.floor(dCap * dmgPct);
        const newHP    = applyCastleDamage(dData.castleHP || 0, damageDealt);

        const dWar = dData.warRecord || { wins: 0, losses: 0, draws: 0 };
        batch.update(defenderRef, {
          castleHP:    newHP,
          castleHPCap: getHPCap(dLevel),
          warRecord: {
            ...dWar,
            losses: (dWar.losses || 0) + 1,
          },
          lastRaidAt: now,
        });
      }
    }

    if (outcome === 'loss' && defenderRef) {
      const defenderSnap = await defenderRef.get();
      if (defenderSnap.exists) {
        const dData = defenderSnap.data();
        const dWar  = dData.warRecord || { wins: 0, losses: 0, draws: 0 };
        batch.update(defenderRef, {
          warRecord: {
            ...dWar,
            wins: (dWar.wins || 0) + 1,
          },
          lastRaidAt: now,
        });
      }
    }

    await batch.commit();

    return res.status(200).json({
      ok: true,
      raidId:       raidRef.id,
      damageDealt,
      curseLifted:  outcome === 'win' && (attackerUpdate.currentCurse === null) && Boolean(attackerData.currentCurse),
      curseRaidWins: attackerUpdate.curseRaidWins ?? attackerData.curseRaidWins ?? 0,
    });
  } catch (err) {
    console.error('[raid/finalize] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
