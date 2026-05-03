// ============================================================
// api/cron/midnight-reset.js
// Vercel Cron — runs at 00:00 UTC every day
// Resets castle HP and daily XP caps for all guilds
// ============================================================
// vercel.json config:
// { "crons": [{ "path": "/api/cron/midnight-reset", "schedule": "0 0 * * *" }] }

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  // Protect: only Vercel cron can call this
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const guildsSnap = await db.collection('guilds').get();
    const today = new Date().toISOString().split('T')[0];

    // Batch reset all castle HPs (max 500 per batch — ~200 guilds is fine)
    const batch = db.batch();
    guildsSnap.docs.forEach((guildDoc) => {
      batch.update(guildDoc.ref, {
        castleHP: 0,
        lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    // Also expire any curses/blessings that have run out
    const expiredCurses = await db.collection('guilds')
      .where('curseExpiresAt', '<=', admin.firestore.Timestamp.now())
      .where('currentCurse', '!=', null)
      .get();

    const expireBatch = db.batch();
    expiredCurses.docs.forEach((d) => {
      expireBatch.update(d.ref, {
        currentCurse: null,
        currentBlessing: null,
        curseExpiresAt: null,
        curseWinsSoFar: 0,
      });
    });
    if (!expiredCurses.empty) await expireBatch.commit();

    console.log(`✅ Midnight reset done. ${guildsSnap.size} guilds reset. ${expiredCurses.size} curses expired.`);
    return res.status(200).json({ ok: true, guildsReset: guildsSnap.size, cursesExpired: expiredCurses.size });
  } catch (err) {
    console.error('Midnight reset failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
