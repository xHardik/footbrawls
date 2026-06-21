// api/cron/midnight-reset.js
// Vercel Cron — runs at 00:00 UTC every day
// NO LONGER resets castleHP — guilds now accumulate HP until level up.
// Only expires curses/blessings, resets daily XP tracking, cleans world chat.
//
// vercel.json: { "crons": [{ "path": "/api/cron/midnight-reset", "schedule": "0 0 * * *" }] }

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  let credentialCert;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credentialCert = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const jsonStr = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
    credentialCert = cert(JSON.parse(jsonStr));
  } else {
    console.warn("No Firebase Service Account credentials found in environment variables.");
  }

  if (credentialCert) {
    initializeApp({
      credential: credentialCert,
    });
  }
}
const db = getFirestore();

// ─── Clean world chat — keep only last 40 messages ───────────────────────────
async function cleanWorldChat() {
  const snap = await db.collection('chat')
    .where('guildCode', '==', '__world__')
    .orderBy('timestamp', 'asc')
    .get();

  if (snap.size <= 40) {
    console.log(`World chat has ${snap.size} messages — no cleanup needed.`);
    return 0;
  }

  const toDelete = snap.docs.slice(0, snap.size - 40); // keep newest 40
  const batch    = db.batch();
  toDelete.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  console.log(`🧹 World chat: deleted ${toDelete.length} old messages, kept 40.`);
  return toDelete.length;
}

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const guildsSnap = await db.collection('guilds').get();

    // ── 1. Expire curses/blessings that have run out ──────────────────────────
    const now          = Timestamp.now();
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

    // ── 3. Clean world chat — keep only last 40 messages ─────────────────────
    const chatDeleted = await cleanWorldChat();

    console.log(`✅ Midnight reset: ${cursesExpired} curses expired. Castle HP preserved. ${chatDeleted} chat messages deleted.`);
    return res.status(200).json({
      ok:            true,
      cursesExpired,
      castleHPReset: false,
      chatDeleted,
    });

  } catch (err) {
    console.error('Midnight reset failed:', err);
    return res.status(500).json({ error: err.message });
  }
}