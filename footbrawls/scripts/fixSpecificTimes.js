// ============================================================
// scripts/fixSpecificTimes.js
//
// Manually fixes kickoff times for specific fixtures.
//
// Usage:
//   node scripts/fixSpecificTimes.js
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

const db = getFirestore();

// ── MANUAL FIXES ──────────────────────────────────────────────────────────────
// Turkey vs Paraguay:  Firestore shows 19 June 22:00 UTC+5:30 = 16:30 UTC
// Brazil vs Haiti:     Find the fixture ID from the printed list below, add it
const MANUAL_FIXES = [
  {
    id: '32', // Turkey vs Paraguay
    label: 'Turkey vs Paraguay',
    kickoffUTC: new Date('2026-06-19T16:30:00Z'),
  },
  // ── Find Brazil vs Haiti fixture ID from the list printed at the end ──
  // {
  //   id: 'FIXTURE_ID_HERE',
  //   label: 'Brazil vs Haiti',
  //   kickoffUTC: new Date('2026-06-19T20:00:00Z'), // adjust if needed
  // },
];
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Applying ${MANUAL_FIXES.length} manual fix(es)...\n`);

  for (const fix of MANUAL_FIXES) {
    const ref = db.collection('fixtures').doc(fix.id);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(`⚠️  Fixture ${fix.id} not found in Firestore — skipping.`);
      continue;
    }

    const d = snap.data();
    const locksAt = new Date(fix.kickoffUTC.getTime() - 3600 * 1000);

    await ref.update({
      kickoffAt:  Timestamp.fromDate(fix.kickoffUTC),
      locksAt:    Timestamp.fromDate(locksAt),
      status:     'NS',
      isLive:     false,
      isComplete: false,
    });

    console.log(`✅ Fixed: ${fix.label} (id: ${fix.id})`);
    console.log(`   Was:  ${d.kickoffAt?.toDate?.()?.toISOString() ?? 'unknown'}`);
    console.log(`   Now:  ${fix.kickoffUTC.toISOString()}\n`);
  }

  // Print all fixtures so you can find Brazil vs Haiti ID
  console.log('── All fixtures in Firestore ──────────────────────────');
  const all = await db.collection('fixtures').get();
  all.docs
    .sort((a, b) => {
      const ka = a.data().kickoffAt?.toMillis?.() ?? 0;
      const kb = b.data().kickoffAt?.toMillis?.() ?? 0;
      return ka - kb;
    })
    .forEach(doc => {
      const d = doc.data();
      const ko = d.kickoffAt?.toDate?.()?.toISOString() ?? 'NO KICKOFF';
      console.log(`  [${doc.id.padEnd(4)}] ${(d.homeTeam + ' vs ' + d.awayTeam).padEnd(35)} ${ko}`);
    });

  console.log('\n✅ Done.');
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});