// scripts/seedGuilds.js
// Run ONCE before launch: node scripts/seedGuilds.js
// Creates all ~200 guild documents in Firestore.
// Safe to re-run — uses set() with merge: true only on missing docs.

const admin = require('firebase-admin');
const { COUNTRIES, WC_2026_TEAMS } = require('../src/lib/countries.cjs');

// Init with your service account key
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const DEFAULT_GUILD = {
  castleHP: 0,
  castleHPCap: 10000,
  lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
  currentCurse: null,
  currentBlessing: null,
  curseExpiresAt: null,
  curseWinsNeeded: 3,
  curseWinsSoFar: 0,
  warRecord: { wins: 0, losses: 0 },
  nextMatch: null,
  lastMatchResult: null,
  memberCount: 0,
  supporterCount: 0,
};

async function seedGuilds() {
  console.log(`Seeding ${COUNTRIES.length} guild documents...`);

  const batch = db.batch(); // Firestore batch: max 500 ops

  COUNTRIES.forEach((country) => {
    const ref = db.collection('guilds').doc(country.code);
    const guildData = {
      ...DEFAULT_GUILD,
      code: country.code,
      name: country.name,
      flag: country.flag,
      type: WC_2026_TEAMS.includes(country.code) ? 'active' : 'fan',
    };
    batch.set(ref, guildData, { merge: true });
  });

  await batch.commit();

  console.log(`✅ ${COUNTRIES.length} guilds seeded.`);
  console.log(`   Active (WC teams): ${WC_2026_TEAMS.length}`);
  console.log(`   Fan guilds: ${COUNTRIES.length - WC_2026_TEAMS.length}`);
  process.exit(0);
}

seedGuilds().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
