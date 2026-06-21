const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const saPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(saPath)) {
  console.error("Missing serviceAccountKey.json!");
  process.exit(1);
}

initializeApp({ credential: cert(require(saPath)) });
const db = getFirestore();

async function check() {
  // 1. Check completed fixtures
  const fixturesSnap = await db.collection('fixtures').get();
  console.log(`--- FIXTURES IN DB (Completed/Live) ---`);
  let completedCount = 0;
  fixturesSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`Fixture ID: ${doc.id} | ${data.homeTeam} vs ${data.awayTeam} | Complete: ${data.isComplete}`);
  });
  console.log(`Total completed/live fixtures: ${completedCount} out of ${fixturesSnap.size}\n`);

  // 2. Check predictions
  const predictionsSnap = await db.collection('predictions').get();
  console.log(`--- PREDICTIONS IN DB ---`);
  let unresolvedCount = 0;
  let resolvedCount = 0;
  predictionsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.resolved) {
      resolvedCount++;
    } else {
      unresolvedCount++;
    }
  });
  console.log(`Total predictions: ${predictionsSnap.size} (Resolved: ${resolvedCount}, Unresolved: ${unresolvedCount})`);
  
  if (unresolvedCount > 0 || resolvedCount > 0) {
    console.log("All predictions in DB:");
    predictionsSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Prediction [${doc.id}]: User: ${data.userId} | Fixture: ${data.fixtureId} | Result Predicted: ${data.predictedResult} | Resolved: ${data.resolved}`);
    });
  }
}

check().catch(console.error);
