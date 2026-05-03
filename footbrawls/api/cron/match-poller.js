

// ============================================================
// api/cron/match-poller.js
// Vercel Cron — polls API-Football for live scores
// Clients read from Firebase. This is the ONLY thing that calls API-Football.
//
// Schedule:
//   Idle (no match within 2hrs):  every 30 min → "*/30 * * * *"
//   Pre-match (within 1hr):       every 10 min → "*/10 * * * *"
//   Live (match in progress):     every 2 min  → "*/2 * * * *"
//
// Simplest approach: run every 2 minutes always, check internally.
// At ~60 calls/day idle + ~60/match, well within Basic plan limits.
// ============================================================

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const WC_2026_LEAGUE_ID = 1; // Update with actual FIFA WC 2026 league ID from API-Football

async function fetchFixtures(live = false) {
  const url = live
    ? `https://v3.football.api-sports.io/fixtures?live=all&league=${WC_2026_LEAGUE_ID}&season=2026`
    : `https://v3.football.api-sports.io/fixtures?league=${WC_2026_LEAGUE_ID}&season=2026&next=10`;

  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_FOOTBALL_KEY,
    },
  });
  const data = await res.json();
  return data.response || [];
}

function mapFixtureToDoc(fixture) {
  const f = fixture.fixture;
  const teams = fixture.teams;
  const goals = fixture.goals;
  const status = f.status.short; // NS, 1H, HT, 2H, FT, AET, PEN

  return {
    fixtureId: String(f.id),
    homeTeam: teams.home.name,        // You'll want to map to your country codes
    awayTeam: teams.away.name,
    homeTeamLogo: teams.home.logo,
    awayTeamLogo: teams.away.logo,
    kickoffAt: admin.firestore.Timestamp.fromMillis(f.timestamp * 1000),
    stage: fixture.league.round,
    status,
    homeScore: goals.home,
    awayScore: goals.away,
    isLive: ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT'].includes(status),
    isComplete: ['FT', 'AET', 'PEN'].includes(status),
    locksAt: admin.firestore.Timestamp.fromMillis((f.timestamp - 3600) * 1000),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check if any matches are currently live
    const liveFixtures = await fetchFixtures(true);
    const hasLiveMatch = liveFixtures.length > 0;

    // Also fetch upcoming fixtures
    const upcomingFixtures = hasLiveMatch ? liveFixtures : await fetchFixtures(false);
    const allFixtures = [...new Map(
      [...liveFixtures, ...upcomingFixtures].map(f => [f.fixture.id, f])
    ).values()];

    const batch = db.batch();
    const justCompleted = [];

    for (const fixture of allFixtures) {
      const mapped = mapFixtureToDoc(fixture);
      const ref = db.collection('fixtures').doc(mapped.fixtureId);

      // Check if this match just completed (was live, now FT)
      const existing = await ref.get();
      if (existing.exists() && existing.data().isLive && mapped.isComplete) {
        justCompleted.push({ ...mapped, ...existing.data() });
      }

      batch.set(ref, mapped, { merge: true });
    }

    await batch.commit();

    // Trigger curse/blessing for any just-completed matches
    for (const match of justCompleted) {
      await triggerCurseBlessing(match);
      await resolveMatchPredictions(match.fixtureId, match.homeScore, match.awayScore);
    }

    return res.status(200).json({
      ok: true,
      fixturesUpdated: allFixtures.length,
      liveMatches: liveFixtures.length,
      justCompleted: justCompleted.length,
    });
  } catch (err) {
    console.error('Match poller failed:', err);
    return res.status(500).json({ error: err.message });
  }
}


// ============================================================
// Curse & Blessing trigger (called inside match poller)
// ============================================================

// Map API-Football team names to your country codes
// You'll need to fill this out based on actual API-Football team names
const TEAM_NAME_TO_CODE = {
  'Brazil': 'BRA',
  'Argentina': 'ARG',
  'France': 'FRA',
  'Germany': 'GER',
  'England': 'ENG',
  'Spain': 'ESP',
  // ... add all 48 teams
};

async function triggerCurseBlessing(match) {
  const homeCode = TEAM_NAME_TO_CODE[match.homeTeam];
  const awayCode = TEAM_NAME_TO_CODE[match.awayTeam];

  if (!homeCode || !awayCode) {
    console.warn(`Unknown team code for ${match.homeTeam} vs ${match.awayTeam}`);
    return;
  }

  let winner = null, loser = null;
  if (match.homeScore > match.awayScore) {
    winner = homeCode; loser = awayCode;
  } else if (match.awayScore > match.homeScore) {
    winner = awayCode; loser = homeCode;
  }
  // Draw — no curse or blessing

  const expires24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiresTimestamp = admin.firestore.Timestamp.fromDate(expires24h);
  const batch = db.batch();

  if (winner) {
    // Bless the winner
    const winnerRef = db.collection('guilds').doc(winner);
    batch.update(winnerRef, {
      currentBlessing: 'blessed',
      currentCurse: null,
      curseExpiresAt: expiresTimestamp,
      lastMatchResult: 'win',
    });

    // Curse the loser
    const loserRef = db.collection('guilds').doc(loser);
    const loserSnap = await loserRef.get();
    const loserData = loserSnap.data();
    const newCurse = loserData.currentCurse === 'cursed'
      ? 'double_cursed'
      : loserData.currentCurse === 'double_cursed'
      ? 'double_cursed'  // stays double until manual lift
      : 'cursed';

    // Check if team is knocked out (death curse)
    const isKnockedOut = match.stage?.includes('Final') || match.stage?.includes('Quarter') || match.stage?.includes('Semi');
    const finalCurse = isKnockedOut ? 'death_curse' : newCurse;
    const deathCurseExpiry = isKnockedOut ? null : expiresTimestamp; // death curse = permanent

    batch.update(loserRef, {
      currentCurse: finalCurse,
      currentBlessing: null,
      curseExpiresAt: deathCurseExpiry,
      curseWinsSoFar: 0,
      lastMatchResult: 'loss',
    });
  } else {
    // Draw — clear blessings, don't apply curse
    [homeCode, awayCode].forEach(code => {
      batch.update(db.collection('guilds').doc(code), {
        currentBlessing: null,
        lastMatchResult: 'draw',
      });
    });
  }

  await batch.commit();
  console.log(`✅ Curse/blessing applied: ${winner} blessed, ${loser} cursed (${match.homeScore}-${match.awayScore})`);
}


// ============================================================
// Resolve predictions after match completes
// ============================================================

async function resolveMatchPredictions(fixtureId, homeScore, awayScore) {
  const actualResult = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';

  const unresolvedSnap = await db.collection('predictions')
    .where('fixtureId', '==', fixtureId)
    .where('resolved', '==', false)
    .get();

  if (unresolvedSnap.empty) return;

  const batch = db.batch();

  for (const predDoc of unresolvedSnap.docs) {
    const pred = predDoc.data();
    const resultCorrect = pred.predictedResult === actualResult;
    const scoreCorrect = pred.predictedScore?.home === homeScore && pred.predictedScore?.away === awayScore;
    // Scorer correct requires live event data — skip for now, handle separately

    let xpAwarded = 0;
    if (resultCorrect) xpAwarded += 30;
    if (scoreCorrect)  xpAwarded += 50;

    batch.update(predDoc.ref, {
      resolved: true,
      resultCorrect,
      scoreCorrect,
      xpAwarded,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  // Award XP to each user (outside batch — each needs a transaction)
  // In production, trigger a Cloud Function queue for this
  // For V1: process inline (acceptable for small user counts)
  const { awardPredictionXP } = await import('../lib/xpEngine.js');
  for (const predDoc of unresolvedSnap.docs) {
    const pred = predDoc.data();
    await awardPredictionXP(pred.userId, {
      resultCorrect: pred.predictedResult === actualResult,
      scorerCorrect: false,
      scoreCorrect: pred.predictedScore?.home === homeScore && pred.predictedScore?.away === awayScore,
    });
  }

  console.log(`✅ Resolved ${unresolvedSnap.size} predictions for fixture ${fixtureId}`);
}
