const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const TARGET_COUNTRIES = [
  { flag: '🇵🇹', code: 'PT' },
  { flag: '🇦🇷', code: 'AR' },
  { flag: '🇧🇷', code: 'BR' },
  { flag: '🇮🇳', code: 'IN' },
];

async function fixLeaderboard() {
  const batch = db.batch();

  // 1. Delete the 10 fake users we created
  for (let i = 1; i <= 10; i++) {
    const fakeId = `top_${i}`;
    batch.delete(db.collection('users').doc(fakeId));
  }
  
  await batch.commit();
  console.log('Deleted the 10 fake users.');

  // 2. Fetch the top 10 REAL users
  const snapshot = await db.collection('users')
    .orderBy('totalXP', 'desc')
    .limit(10)
    .get();

  const batch2 = db.batch();
  
  let index = 0;
  snapshot.docs.forEach((doc) => {
    // Round robin through the target countries
    const target = TARGET_COUNTRIES[index % TARGET_COUNTRIES.length];
    
    batch2.update(doc.ref, {
      flag: target.flag,
      country: target.code,
      guildId: target.code
    });
    
    console.log(`Updated ${doc.data().nickname || doc.id} -> ${target.code} ${target.flag}`);
    index++;
  });

  await batch2.commit();
  console.log('✅ Real top 10 players updated successfully!');
  process.exit(0);
}

fixLeaderboard().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
