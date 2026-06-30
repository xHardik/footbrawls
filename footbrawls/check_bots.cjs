const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const saPath = path.join(__dirname, "serviceAccountKey.json");
initializeApp({ credential: cert(require(saPath)) });

const db = getFirestore();

async function check() {
  const snap = await db.collection('users').where('isBot', '==', true).limit(5).get();
  snap.forEach(doc => {
    console.log(doc.id, doc.data());
  });
  
  const gSnap = await db.collection('guilds').doc('ARG').get();
  console.log("ARG Guild:", gSnap.data());
}

check();
