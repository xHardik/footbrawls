// ============================================================
// scripts/fixKickoffTimes.js
//
// ONE-OFF SCRIPT — run this once after deploying the timezone fix
// in api/cron/match-poller.js.
//
// It re-fetches all matches from worldcup26.ir, recomputes the
// correct UTC kickoff time (treating local_date as Iran Standard
// Time, UTC+3:30), and overwrites ONLY the kickoffAt + locksAt
// fields on existing fixture docs in Firestore. Nothing else is
// touched (scores, status, etc. are left alone).
//
// Usage:
//   node scripts/fixKickoffTimes.js
//
// Requires the same env vars as match-poller.js:
//   FIREBASE_SERVICE_ACCOUNT  (JSON string)
// ============================================================

import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

config({ path: '.env.local' }); // load FIREBASE_SERVICE_ACCOUNT from .env.local

if (!getApps().length) {
initializeApp({
  credential: cert(
    JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'))
  ),
});
}
const db = getFirestore();

const IRST_OFFSET_MS = 3.5 * 60 * 60 * 1000; // UTC+3:30

function correctKickoff(localDateStr) {
  // local_date format: MM/DD/YYYY HH:mm
  const [dStr, tStr] = localDateStr.split(' ');
  const [m, d, y] = dStr.split('/');
  const [hr, min] = tStr.split(':');

  const localAsUtcMillis = Date.UTC(
    parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hr), parseInt(min)
  );
  return new Date(localAsUtcMillis - IRST_OFFSET_MS);
}

async function main() {
  console.log('Fetching matches from worldcup26.ir...');
  const resFeeds = await fetch('https://worldcup26.ir/get/games', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!resFeeds.ok) throw new Error(`HTTP error ${resFeeds.status}`);

  const data  = await resFeeds.json();
  const games = data.games || [];
  console.log(`Got ${games.length} matches from API.`);

  let updated = 0;
  let skipped = 0;
  const batchSize = 400; // Firestore batch limit is 500 writes
  let batch = db.batch();
  let opsInBatch = 0;

  for (const g of games) {
    const fixtureId = String(g.id);
    const ref = db.collection('fixtures').doc(fixtureId);
    const snap = await ref.get();

    if (!snap.exists) {
      skipped++;
      continue;
    }

    const kickoffDate = correctKickoff(g.local_date);
    const locksAtDate = new Date(kickoffDate.getTime() - 3600 * 1000);

    batch.update(ref, {
      kickoffAt: Timestamp.fromDate(kickoffDate),
      locksAt:   Timestamp.fromDate(locksAtDate),
    });
    opsInBatch++;
    updated++;

    if (opsInBatch >= batchSize) {
      await batch.commit();
      console.log(`Committed batch of ${opsInBatch}...`);
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${opsInBatch}.`);
  }

  console.log(`✅ Done. Updated: ${updated}, Skipped (not in Firestore): ${skipped}`);
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});