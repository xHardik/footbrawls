// api/cron/midnight-reset.js
// Vercel Cron — runs at 00:00 UTC every day
// NO LONGER resets castleHP — guilds now accumulate HP until level up.
// Only expires curses/blessings and resets daily XP tracking.
//
// vercel.json: { "crons": [{ "path": "/api/cron/midnight-reset", "schedule": "0 0 * * *" }] }

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const guildsSnap = await db.collection('guilds').get();

    // ── 1. Expire curses/blessings that have run out ──────────────────────────
    const now          = admin.firestore.Timestamp.now();
    const expireBatch  = db.batch();
    let   cursesExpired = 0;

    guildsSnap.docs.forEach(guildDoc => {
      const data = guildDoc.data();
      if (
        data.curseExpiresAt &&
        data.curseExpiresAt.toMillis() <= now.toMillis() &&
        data.currentCurse !== 'death_curse' // death curse never auto-expires
      ) {
        expireBatch.update(guildDoc.ref, {
          currentCurse:    null,
          currentBlessing: null,
          curseExpiresAt:  null,
          curseWinsSoFar:  0,
        });
        cursesExpired++;
      }
    });

    if (cursesExpired > 0) await expireBatch.commit();

    // ── 2. NOTE: castleHP is NOT reset ────────────────────────────────────────
    // Guilds accumulate HP permanently until they level up (5 levels).
    // HP only resets to overflow when a level-up occurs in xpEngine.js.

    console.log(`✅ Midnight reset: ${cursesExpired} curses expired. Castle HP preserved.`);
    return res.status(200).json({
      ok: true,
      cursesExpired,
      castleHPReset: false, // explicitly confirm HP was NOT reset
    });

  } catch (err) {
    console.error('Midnight reset failed:', err);
    return res.status(500).json({ error: err.message });
  }
}