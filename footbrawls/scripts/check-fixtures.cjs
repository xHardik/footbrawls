const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

const saPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (!fs.existsSync(saPath)) {
  console.error("Service account key not found at:", saPath);
  process.exit(1);
}

const serviceAccount = require(saPath);
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function check() {
  const snap = await db.collection("fixtures").orderBy("kickoffAt").get();
  console.log(`Total fixtures in DB: ${snap.size}`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`${doc.id} => ${data.homeTeam} vs ${data.awayTeam} | kickoff: ${data.kickoffAt.toDate().toISOString()} | locksAt: ${data.locksAt.toDate().toISOString()} | isComplete: ${data.isComplete}`);
  });
}

check().catch(console.error);
