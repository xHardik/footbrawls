const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const COUNTRIES = {
  IND: { code: 'IND', flag: '🇮🇳' },
  POR: { code: 'POR', flag: '🇵🇹' },
  USA: { code: 'USA', flag: '🇺🇸' },
  ESP: { code: 'ESP', flag: '🇪🇸' },
  ENG: { code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }
};

const MIX_COUNTRIES = [COUNTRIES.USA, COUNTRIES.ESP, COUNTRIES.ENG];

async function fixLeaderboard2() {
  const snapshot = await db.collection('users')
    .orderBy('totalXP', 'desc')
    .limit(20)
    .get();

  const batch = db.batch();
  const docs = snapshot.docs;
  
  if (docs.length >= 2) {
    batch.update(docs[0].ref, {
      country: COUNTRIES.IND.code,
      flag: COUNTRIES.IND.flag,
      guildId: COUNTRIES.IND.code
    });
    console.log(`Rank 1 -> IND`);
    
    batch.update(docs[1].ref, {
      country: COUNTRIES.POR.code,
      flag: COUNTRIES.POR.flag,
      guildId: COUNTRIES.POR.code
    });
    console.log(`Rank 2 -> POR`);
  }

  // Update 11th to 20th
  for (let i = 10; i < Math.min(20, docs.length); i++) {
    const target = MIX_COUNTRIES[i % MIX_COUNTRIES.length];
    batch.update(docs[i].ref, {
      country: target.code,
      flag: target.flag,
      guildId: target.code
    });
    console.log(`Rank ${i+1} -> ${target.code}`);
  }

  await batch.commit();
  console.log('✅ Updated successfully!');
  process.exit(0);
}

fixLeaderboard2().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
