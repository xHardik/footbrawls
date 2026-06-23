const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
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

async function run() {
  const raidRef = db.collection('raids').doc();
  await raidRef.set({
    raidType: 'normal',
    outcome: 'win',
    isTraining: false,
    userId: 'test_user',
    nickname: 'TestPlayer',
    homeCountry: 'MEX',
    rivalGuildCode: 'USA',
    acts: {
      act1: { gameId: 'whoareya_correct', playerScore: 100, buddyScore: 80, rivalTotal: 120, winner: 'you' },
      act2: { playerRoundWins: 3, buddyRoundWins: 2, rivalBotWins: 4, yourTotal: 5, rivalTotal: 4, winner: 'you' },
      act3: { playerGoals: 4, buddyGoals: 3, rivalBotGoals: 5, yourTotal: 7, rivalTotal: 5, winner: 'you' }
    },
    match: {
      isBotMatch: true,
      buddy: { userId: 'bot_buddy', nickname: 'HelperBot', flag: '🇲🇽', homeCountry: 'MEX', totalXP: 1000, isBot: true },
      rivals: [
        { userId: 'bot_rival_1', nickname: 'Rival1', flag: '🇺🇸', homeCountry: 'USA', totalXP: 1000, isBot: true },
        { userId: 'bot_rival_2', nickname: 'Rival2', flag: '🇺🇸', homeCountry: 'USA', totalXP: 1000, isBot: true }
      ]
    },
    playerPerformance: { test_user: 240 },
    xpAwarded: 150,
    createdAt: FieldValue.serverTimestamp()
  });
  console.log("✅ Successfully seeded a test raid document. Check your Firebase Console now!");
  process.exit(0);
}

run();
