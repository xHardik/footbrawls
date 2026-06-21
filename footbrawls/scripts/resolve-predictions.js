// scripts/resolve-predictions.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { awardPredictionXP } from '../api/lib/xpEngine.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account
const saPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(saPath)) {
  console.error("Missing serviceAccountKey.json!");
  process.exit(1);
}

if (!getApps().length) {
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

// Static schedule to map gs_ IDs to teams
const ALL_FIXTURES_SCHEDULE = [
  { id:'gs_A1', home:'Mexico',       away:'South Africa' },
  { id:'gs_A2', home:'South Korea',  away:'Czechia' },
  { id:'gs_A3', home:'Czechia',      away:'South Africa' },
  { id:'gs_A4', home:'Mexico',       away:'South Korea' },
  { id:'gs_B1', home:'Canada',       away:'Bosnia and Herzegovina' },
  { id:'gs_B2', home:'Qatar',        away:'Switzerland' },
  { id:'gs_B3', home:'Switzerland',  away:'Bosnia and Herzegovina' },
  { id:'gs_B4', home:'Canada',       away:'Qatar' },
  { id:'gs_C1', home:'Brazil',       away:'Morocco' },
  { id:'gs_C2', home:'Haiti',        away:'Scotland' },
  { id:'gs_C3', home:'Scotland',     away:'Morocco' },
  { id:'gs_C4', home:'Brazil',       away:'Haiti' },
  { id:'gs_D1', home:'USA',          away:'Paraguay' },
  { id:'gs_D2', home:'Australia',    away:'Türkiye' },
  { id:'gs_D3', home:'USA',          away:'Australia' },
  { id:'gs_D4', home:'Türkiye',      away:'Paraguay' },
  { id:'gs_E1', home:'Germany',      away:'Curaçao' },
  { id:'gs_E2', home:'Ivory Coast',  away:'Ecuador' },
  { id:'gs_F1', home:'Netherlands',  away:'Japan' },
  { id:'gs_F2', home:'Sweden',       away:'Tunisia' },
  { id:'gs_G2', home:'Belgium',      away:'Egypt' },
  { id:'gs_G4', home:'Iran',         away:'New Zealand' },
  { id:'gs_G1', home:'Spain',        away:'Cape Verde' },
  { id:'gs_G3', home:'Saudi Arabia', away:'Uruguay' },
  { id:'gs_I1', home:'France',       away:'Senegal' },
  { id:'gs_I2', home:'Iraq',         away:'Norway' },
  { id:'gs_J1', home:'Argentina',    away:'Algeria' },
  { id:'gs_J2', home:'Austria',      away:'Jordan' },
  { id:'gs_K1', home:'Portugal',     away:'DR Congo' },
  { id:'gs_K2', home:'Uzbekistan',   away:'Colombia' },
  { id:'gs_L1', home:'England',      away:'Croatia' },
  { id:'gs_L2', home:'Ghana',        away:'Panama' }
];

// Helper to clean and match team names
function matchTeams(t1, t2) {
  const clean = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean(t1) === clean(t2);
}

async function resolveAll() {
  console.log("Fetching fixtures and predictions from Firestore...");
  const fixturesSnap = await db.collection('fixtures').get();
  const fixtures = fixturesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const predictionsSnap = await db.collection('predictions').where('resolved', '==', false).get();
  console.log(`Found ${predictionsSnap.size} unresolved predictions.`);

  if (predictionsSnap.empty) {
    console.log("No predictions to resolve.");
    return;
  }

  for (const doc of predictionsSnap.docs) {
    const pred = doc.data();
    const predId = doc.id;
    let matchedFixture = null;

    console.log(`\nProcessing Prediction [${predId}] for fixtureId: ${pred.fixtureId}`);

    // Case 1: fixtureId is numeric or direct match in Firestore
    matchedFixture = fixtures.find(f => f.id === pred.fixtureId);

    // Case 2: fixtureId is gs_ prefix, map to teams first
    if (!matchedFixture && pred.fixtureId.startsWith('gs_')) {
      const scheduleEntry = ALL_FIXTURES_SCHEDULE.find(s => s.id === pred.fixtureId);
      if (scheduleEntry) {
        console.log(`Mapped static ${pred.fixtureId} to ${scheduleEntry.home} vs ${scheduleEntry.away}`);
        matchedFixture = fixtures.find(f => 
          (matchTeams(f.homeTeam, scheduleEntry.home) && matchTeams(f.awayTeam, scheduleEntry.away)) ||
          (matchTeams(f.homeTeam, scheduleEntry.away) && matchTeams(f.awayTeam, scheduleEntry.home))
        );
      }
    }

    if (!matchedFixture) {
      console.log(`❌ Could not find a matching fixture in DB for fixtureId: ${pred.fixtureId}`);
      continue;
    }

    console.log(`Matched to DB Fixture [${matchedFixture.id}]: ${matchedFixture.homeTeam} vs ${matchedFixture.awayTeam} (Complete: ${matchedFixture.isComplete})`);

    if (!matchedFixture.isComplete) {
      console.log(`Fixture is not completed yet. Skipping resolution.`);
      continue;
    }

    const { homeScore, awayScore, scorers } = matchedFixture;
    console.log(`Fixture score: ${homeScore}-${awayScore}`);

    const actualResult = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';
    const resultCorrect = pred.predictedResult === actualResult;
    const scoreCorrect = pred.predictedScore?.home === homeScore && pred.predictedScore?.away === awayScore;

    let scorerCorrect = false;
    if (homeScore + awayScore === 0) {
      scorerCorrect = pred.predictedScorer === 'No Goals';
    } else if (scorers && scorers.length > 0) {
      scorerCorrect = scorers.some(s => {
        if (s.includes(' (')) {
          return s.split(' (')[0] === pred.predictedScorer;
        }
        return s === pred.predictedScorer;
      });
    }

    const xpAwarded = (resultCorrect ? 15 : 0) + (scorerCorrect ? 5 : 0);

    console.log(`Resolution: resultCorrect=${resultCorrect}, scoreCorrect=${scoreCorrect}, scorerCorrect=${scorerCorrect} -> XP to award: ${xpAwarded}`);

    // Update prediction in DB
    await doc.ref.update({
      resolved: true,
      resultCorrect,
      scorerCorrect,
      scoreCorrect,
      xpAwarded,
      resolvedAt: FieldValue.serverTimestamp()
    });
    console.log(`Prediction updated in Firestore.`);

    if (xpAwarded > 0) {
      try {
        console.log(`Awarding prediction XP for User ${pred.userId}...`);
        const xpResult = await awardPredictionXP(pred.userId, {
          resultCorrect,
          scorerCorrect,
          scoreCorrect
        });
        console.log(`XP Awarded Result:`, xpResult);
      } catch (err) {
        console.error(`Failed to award XP to user ${pred.userId}:`, err.message);
      }
    }
  }

  console.log("\nAll resolutions processed!");
}

resolveAll().catch(console.error);
