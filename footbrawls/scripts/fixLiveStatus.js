// ============================================================
// scripts/fixLiveStatus.js
//
// ONE-OFF SCRIPT — resets any fixture incorrectly marked as
// LIVE or FT that hasn't actually kicked off yet.
//
// Usage:
//   node scripts/fixLiveStatus.js
// ============================================================

import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

config({ path: '.env.local' });

if (!getApps().length) {
  initializeApp({
    credential: cert(
      JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'))
    ),
  });
}

const db = new getFirestore();
const now = new Date();

async function main() {
  console.log('Fetching all fixtures from Firestore...');
  const snap = await db.collection('fixtures').get();
  console.log(`Found ${snap.size} fixtures.`);

  let fixed = 0;
  let skipped = 0;
  const batchSize = 400;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    // Get kickoff time
    const kickoffAt = data.kickoffAt?.toDate?.();
    if (!kickoffAt) {
      skipped++;
      continue;
    }

    const hasKickedOff = now >= kickoffAt;

    // Only fix fixtures that haven't kicked off but are wrongly marked LIVE or FT
    if (!hasKickedOff && (data.status === 'LIVE' || data.status === 'FT' || data.isLive === true || data.isComplete === true)) {
      console.log(`Fixing: ${data.homeTeam} vs ${data.awayTeam} (kickoff: ${kickoffAt.toISOString()}) — was: ${data.status}`);
      batch.update(doc.ref, {
        status:     'NS',
        isLive:     false,
        isComplete: false,
      });
      opsInBatch++;
      fixed++;

      if (opsInBatch >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${opsInBatch}...`);
        batch = db.batch();
        opsInBatch = 0;
      }
    } else {
      skipped++;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${opsInBatch}.`);
  }

  console.log(`✅ Done. Fixed: ${fixed}, Skipped: ${skipped}`);
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
