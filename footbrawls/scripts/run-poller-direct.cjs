// scripts/run-poller-direct.cjs
// Run with: node scripts/run-poller-direct.cjs

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
const saPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (fs.existsSync(saPath)) {
  initializeApp({ credential: cert(require(saPath)) });
} else {
  console.error("Missing serviceAccountKey.json in footbrawls root directory!");
  process.exit(1);
}
const db = getFirestore();

const TEAM_NAME_TO_CODE = {
  'United States': 'USA', 'Turkey': 'TUR', 'Czech Republic': 'CZE', 'Czechia': 'CZE', 'Cameroon': 'CMR',
  'Nigeria': 'NGA', 'Chile': 'CHI', 'Peru': 'PER', 'Serbia': 'SRB', 'Ukraine': 'UKR',
  'Wales': 'WAL', 'Hungary': 'HUN', 'Costa Rica': 'CRC', 'Honduras': 'HON', 'Jamaica': 'JAM',
  'India': 'IND', 'Algeria': 'ALG', 'Argentina': 'ARG', 'Australia': 'AUS', 'Austria': 'AUT',
  'Belgium': 'BEL', 'Bosnia and Herzegovina': 'BIH', 'Brazil': 'BRA', 'Canada': 'CAN',
  'Cape Verde': 'CPV', 'Cape Verde Islands': 'CPV', 'Cape Verde Republic': 'CPV', 'Colombia': 'COL', 'Croatia': 'CRO', 'Curaçao': 'CUW',
  'DR Congo': 'COD', 'Democratic Republic of the Congo': 'COD', 'Ecuador': 'ECU', 'Egypt': 'EGY', 'England': 'ENG', 'France': 'FRA',
  'Germany': 'GER', 'Ghana': 'GHA', 'Haiti': 'HAI', 'Iran': 'IRN', 'Iraq': 'IRQ',
  'Ivory Coast': 'CIV', 'Japan': 'JPN', 'Jordan': 'JOR', 'Mexico': 'MEX', 'Morocco': 'MAR',
  'Netherlands': 'NED', 'New Zealand': 'NZL', 'Norway': 'NOR', 'Panama': 'PAN',
  'Paraguay': 'PAR', 'Portugal': 'POR', 'Qatar': 'QAT', 'Saudi Arabia': 'KSA',
  'Scotland': 'SCO', 'Senegal': 'SEN', 'South Africa': 'RSA', 'South Korea': 'KOR',
  'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'SUI', 'Tunisia': 'TUN', 'Türkiye': 'TUR',
  'USA': 'USA', 'Uruguay': 'URU', 'Uzbekistan': 'UZB',
};

function getCountryCode(teamName) {
  if (!teamName) return null;
  const clean = teamName.replace(/\b(FC|football club|national team|national football team)\b/gi, '').trim();
  return TEAM_NAME_TO_CODE[clean] || TEAM_NAME_TO_CODE[teamName] || null;
}

async function triggerCurseBlessing(match) {
  const homeCode = TEAM_NAME_TO_CODE[match.homeTeam];
  const awayCode = TEAM_NAME_TO_CODE[match.awayTeam];

  if (!homeCode || !awayCode) {
    console.warn(`No code for: ${match.homeTeam} vs ${match.awayTeam}`);
    return;
  }

  let winner = null, loser = null;
  if (match.homeScore > match.awayScore)      { winner = homeCode; loser = awayCode; }
  else if (match.awayScore > match.homeScore) { winner = awayCode; loser = homeCode; }

  const expires24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiresTs  = Timestamp.fromDate(expires24h);
  const batch      = db.batch();

  if (winner) {
    batch.set(db.collection('guilds').doc(winner), {
      currentBlessing: 'blessed',
      currentCurse:    null,
      curseExpiresAt:  expiresTs,
      lastMatchResult: 'win',
    }, { merge: true });

    const loserSnap = await db.collection('guilds').doc(loser).get();
    const loserData = loserSnap.exists ? loserSnap.data() : {};

    const isKnockedOut = ['quarter-finals','semi-finals','final','3rd place']
      .some(s => match.stage?.toLowerCase().includes(s));

    const newCurse = isKnockedOut
      ? 'death_curse'
      : loserData.currentCurse === 'cursed'
      ? 'double_cursed'
      : 'cursed';

    batch.set(db.collection('guilds').doc(loser), {
      currentCurse:    newCurse,
      currentBlessing: null,
      curseExpiresAt:  isKnockedOut ? null : expiresTs,
      curseWinsSoFar:  0,
      lastMatchResult: 'loss',
    }, { merge: true });
  } else {
    [homeCode, awayCode].forEach(code => {
      batch.set(db.collection('guilds').doc(code), {
        currentBlessing: null,
        lastMatchResult: 'draw',
      }, { merge: true });
    });
  }

  await batch.commit();
  console.log(`✅ Curse/blessing: winner=${winner ?? 'draw'}, loser=${loser ?? 'draw'} (${match.homeScore}-${match.awayScore})`);
}

async function run() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.error("Missing FOOTBALL_DATA_API_KEY environment variable in .env.local!");
    process.exit(1);
  }

  console.log("Running manual 2026 API poller (api.football-data.org)...");
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: {
        "X-Auth-Token": apiKey
      }
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const data = await res.json();
    const games = data.matches || [];
    console.log(`Fetched ${games.length} games from football-data.org API.`);

    if (games.length === 0) {
      console.log("No games found.");
      return;
    }

    // Fetch existing database fixtures
    const existingSnap = await db.collection('fixtures').get();
    const existingDocs = existingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const batch = db.batch();
    const justCompleted = [];
    let updatedCount = 0;

    for (const g of games) {
      const apiHomeCode = getCountryCode(g.homeTeam?.name);
      const apiAwayCode = getCountryCode(g.awayTeam?.name);

      if (!apiHomeCode || !apiAwayCode) {
        continue;
      }

      // Match to existing DB fixture by comparing country codes
      const matchedFixture = existingDocs.find(f => {
        const dbHomeCode = TEAM_NAME_TO_CODE[f.homeTeam];
        const dbAwayCode = TEAM_NAME_TO_CODE[f.awayTeam];
        return dbHomeCode === apiHomeCode && dbAwayCode === apiAwayCode;
      });

      if (!matchedFixture) {
        continue;
      }

      const isLive = g.status === 'IN_PLAY' || g.status === 'PAUSED';
      const isComplete = g.status === 'FINISHED';
      const status = isComplete ? 'FT' : (isLive ? 'LIVE' : 'NS');

      const homeScore = typeof g.score?.fullTime?.home === 'number' ? g.score.fullTime.home : 0;
      const awayScore = typeof g.score?.fullTime?.away === 'number' ? g.score.fullTime.away : 0;

      const scorers = [];
      const isNewlyCompleted = isComplete && !matchedFixture.isComplete;

      const ref = db.collection('fixtures').doc(matchedFixture.id);
      const updateData = {
        homeScore,
        awayScore,
        status,
        isLive,
        isComplete,
        scorers,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (isNewlyCompleted) {
        justCompleted.push({
          ...matchedFixture,
          ...updateData,
          fixtureId: matchedFixture.id
        });
      }

      batch.update(ref, updateData);
      updatedCount++;
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`Synced ${updatedCount} matches to Firestore successfully.`);
    } else {
      console.log("No matching fixtures to update.");
    }

    for (const match of justCompleted) {
      await triggerCurseBlessing(match);
    }
    console.log("All tasks completed!");
  } catch (err) {
    console.error("Poller failed:", err);
  }
}

run();
