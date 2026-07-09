const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const TOP_PLAYERS = [
  { id: 'top_1', nickname: 'Ronaldo_Goat', flag: '🇵🇹', code: 'PT', totalXP: 10000000 },
  { id: 'top_2', nickname: 'Messi10', flag: '🇦🇷', code: 'AR', totalXP: 9500000 },
  { id: 'top_3', nickname: 'NeymarMagic', flag: '🇧🇷', code: 'BR', totalXP: 9000000 },
  { id: 'top_4', nickname: 'SunilC', flag: '🇮🇳', code: 'IN', totalXP: 8500000 },
  { id: 'top_5', nickname: 'BrunoF', flag: '🇵🇹', code: 'PT', totalXP: 8000000 },
  { id: 'top_6', nickname: 'DiMaria', flag: '🇦🇷', code: 'AR', totalXP: 7500000 },
  { id: 'top_7', nickname: 'ViniJr', flag: '🇧🇷', code: 'BR', totalXP: 7000000 },
  { id: 'top_8', nickname: 'GurpreetS', flag: '🇮🇳', code: 'IN', totalXP: 6500000 },
  { id: 'top_9', nickname: 'PepeWall', flag: '🇵🇹', code: 'PT', totalXP: 6000000 },
  { id: 'top_10', nickname: 'JulianA', flag: '🇦🇷', code: 'AR', totalXP: 5500000 },
];

async function seedTopPlayers() {
  console.log(`Seeding ${TOP_PLAYERS.length} top players...`);
  const batch = db.batch();

  for (const p of TOP_PLAYERS) {
    const ref = db.collection('users').doc(p.id);
    batch.set(ref, {
      userId: p.id,
      nickname: p.nickname,
      flag: p.flag,
      totalXP: p.totalXP,
      country: p.code,
      guildId: p.code,
      tier: 'LEGEND',
      isBot: false,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  console.log('✅ Top players seeded successfully!');
  process.exit(0);
}

seedTopPlayers().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
