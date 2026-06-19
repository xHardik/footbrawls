import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

config({ path: '.env.local' });

if (!getApps().length) {
  initializeApp({
    credential: cert(
      JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'))
    ),
  });
}

const db = getFirestore();

async function main() {
  const fixtureId = '31'; // United States vs Australia
  console.log(`Updating fixture ${fixtureId} to 1-0 (USA goal)...`);
  
  const ref = db.collection('fixtures').doc(fixtureId);
  await ref.update({
    homeScore: 1,
    awayScore: 0,
    status: 'LIVE',
    isLive: true,
    scorers: ['Pulisic (United States)'] // Add a mock scorer for USA
  });
  
  console.log('✅ Fixture updated successfully!');
}

main().catch(console.error);
