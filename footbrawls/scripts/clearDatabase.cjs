const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const saPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (fs.existsSync(saPath)) {
  initializeApp({ credential: cert(require(saPath)) });
} else {
  console.error("Missing serviceAccountKey.json!");
  process.exit(1);
}

const db = getFirestore();

async function clearUsersAndResetGuilds() {
  console.log("Fetching all users to delete...");
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  if (!snapshot.empty) {
    const batchSize = 500;
    const docs = snapshot.docs;
    console.log(`Found ${docs.length} users. Deleting...`);

    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = db.batch();
      chunk.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`Deleted chunk ${i / batchSize + 1}`);
    }
    console.log("All users successfully deleted.");
  } else {
    console.log("No users found.");
  }

  console.log("Resetting all guilds...");
  const guildsRef = db.collection('guilds');
  const guildSnap = await guildsRef.get();
  
  if (!guildSnap.empty) {
    const gBatch = db.batch();
    guildSnap.docs.forEach(doc => {
      gBatch.update(doc.ref, {
        totalXP: 0,
        memberCount: 0,
        castleHP: 0,
        guildLevel: 1
      });
    });
    await gBatch.commit();
    console.log(`Reset ${guildSnap.docs.length} guilds.`);
  }
}

clearUsersAndResetGuilds().catch(console.error).finally(() => process.exit(0));
