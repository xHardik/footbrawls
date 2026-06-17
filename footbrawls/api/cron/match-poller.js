// ============================================================
// api/cron/match-poller.js
// Called by GitHub Actions every 5 mins (free).
// Vercel cron removed — only midnight-reset.js stays on Vercel cron.
//
// GitHub Actions hits: POST /api/cron/match-poller
// with header: Authorization: Bearer <CRON_SECRET>
// ============================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { awardPredictionXP } from '../lib/xpEngine.js';

if (!getApps().length) {
  initializeApp({
    credential: cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}
const db = getFirestore();

const API_FOOTBALL_KEY  = process.env.API_FOOTBALL_KEY;
const WC_2026_LEAGUE_ID = 1; // ← update with real FIFA WC 2026 ID from API-Football

// ─── Only run during tournament dates (saves GitHub Actions minutes) ──────────
const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z');
const TOURNAMENT_END   = new Date('2026-07-20T00:00:00Z');
function isTournamentActive() {
  const now = new Date();
  return now >= TOURNAMENT_START && now <= TOURNAMENT_END;
}

// ─── Team name → guild country code ──────────────────────────────────────────
const TEAM_NAME_TO_CODE = {
  'Brazil': 'BRA', 'Argentina': 'ARG', 'France': 'FRA', 'Germany': 'GER',
  'England': 'ENG', 'Spain': 'ESP', 'Portugal': 'POR', 'Netherlands': 'NED',
  'Belgium': 'BEL', 'Uruguay': 'URU', 'Croatia': 'CRO', 'Denmark': 'DEN',
  'Switzerland': 'SUI', 'Mexico': 'MEX', 'United States': 'USA', 'Canada': 'CAN',
  'Japan': 'JPN', 'South Korea': 'KOR', 'Australia': 'AUS', 'Senegal': 'SEN',
  'Morocco': 'MAR', 'Ghana': 'GHA', 'Cameroon': 'CMR', 'Nigeria': 'NGA',
  'Saudi Arabia': 'KSA', 'Iran': 'IRN', 'Qatar': 'QAT', 'South Africa': 'RSA',
  'Ecuador': 'ECU', 'Colombia': 'COL', 'Chile': 'CHI', 'Peru': 'PER',
  'Poland': 'POL', 'Serbia': 'SRB', 'Ukraine': 'UKR', 'Austria': 'AUT',
  'Sweden': 'SWE', 'Norway': 'NOR', 'Turkey': 'TUR', 'Wales': 'WAL',
  'Scotland': 'SCO', 'Czech Republic': 'CZE', 'Hungary': 'HUN',
  'Costa Rica': 'CRC', 'Panama': 'PAN', 'Honduras': 'HON', 'Jamaica': 'JAM',
  'India': 'IND',
};

// ─── API-Football fetch ───────────────────────────────────────────────────────
async function fetchFixtures(live = false) {
  const url = live
    ? `https://v3.football.api-sports.io/fixtures?live=all&league=${WC_2026_LEAGUE_ID}&season=2026`
    : `https://v3.football.api-sports.io/fixtures?league=${WC_2026_LEAGUE_ID}&season=2026&next=10`;

  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API-Football error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.response || [];
}

// ─── Map API response to Firestore doc ───────────────────────────────────────
function mapFixtureToDoc(fixture) {
  const f      = fixture.fixture;
  const teams  = fixture.teams;
  const goals  = fixture.goals;
  const status = f.status.short; // NS, 1H, HT, 2H, FT, AET, PEN

  const scorers = [];
  if (fixture.events && Array.isArray(fixture.events)) {
    fixture.events.forEach(ev => {
      if (ev.type === 'Goal' && ev.player && ev.player.name) {
        scorers.push(ev.player.name);
      }
    });
  }

  return {
    fixtureId:     String(f.id),
    homeTeam:      teams.home.name,
    awayTeam:      teams.away.name,
    homeTeamLogo:  teams.home.logo,
    awayTeamLogo:  teams.away.logo,
    kickoffAt:     Timestamp.fromMillis(f.timestamp * 1000),
    stage:         fixture.league.round,
    status,
    homeScore:     goals.home ?? 0,
    awayScore:     goals.away ?? 0,
    isLive:        ['1H','HT','2H','ET','BT','P','INT'].includes(status),
    isComplete:    ['FT','AET','PEN'].includes(status),
    locksAt:       Timestamp.fromMillis((f.timestamp - 3600) * 1000),
    updatedAt:     FieldValue.serverTimestamp(),
    scorers,
  };
}

// ─── Curse & Blessing ─────────────────────────────────────────────────────────
async function triggerCurseBlessing(match) {
  const homeCode = TEAM_NAME_TO_CODE[match.homeTeam];
  const awayCode = TEAM_NAME_TO_CODE[match.awayTeam];

  if (!homeCode || !awayCode) {
    console.warn(`No code for: ${match.homeTeam} vs ${match.awayTeam} — add to TEAM_NAME_TO_CODE`);
    return;
  }

  let winner = null, loser = null;
  if (match.homeScore > match.awayScore)      { winner = homeCode; loser = awayCode; }
  else if (match.awayScore > match.homeScore) { winner = awayCode; loser = homeCode; }
  // Draw → no curse, just clear blessings

  const expires24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiresTs  = Timestamp.fromDate(expires24h);
  const batch      = db.batch();

  if (winner) {
    batch.update(db.collection('guilds').doc(winner), {
      currentBlessing: 'blessed',
      currentCurse:    null,
      curseExpiresAt:  expiresTs,
      lastMatchResult: 'win',
    });

    const loserSnap = await db.collection('guilds').doc(loser).get();
    const loserData = loserSnap.exists ? loserSnap.data() : {}; // FIX: .exists not .exists()

    const isKnockedOut = ['quarter-finals','semi-finals','final','3rd place']
      .some(s => match.stage?.toLowerCase().includes(s));

    const newCurse = isKnockedOut
      ? 'death_curse'
      : loserData.currentCurse === 'cursed'
      ? 'double_cursed'
      : 'cursed';

    batch.update(db.collection('guilds').doc(loser), {
      currentCurse:    newCurse,
      currentBlessing: null,
      curseExpiresAt:  isKnockedOut ? null : expiresTs,
      curseWinsSoFar:  0,
      lastMatchResult: 'loss',
    });
  } else {
    [homeCode, awayCode].forEach(code => {
      batch.update(db.collection('guilds').doc(code), {
        currentBlessing: null,
        lastMatchResult: 'draw',
      });
    });
  }

  await batch.commit();
  console.log(`✅ Curse/blessing: winner=${winner ?? 'draw'}, loser=${loser ?? 'draw'} (${match.homeScore}-${match.awayScore})`);
}

// ─── Resolve predictions ──────────────────────────────────────────────────────
async function resolveMatchPredictions(fixtureId, homeScore, awayScore, scorers = []) {
  const actualResult = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';

  const snap = await db.collection('predictions')
    .where('fixtureId', '==', fixtureId)
    .where('resolved', '==', false)
    .get();

  if (snap.empty) return;

  const batch   = db.batch();
  const toAward = [];

  snap.docs.forEach(predDoc => {
    const pred          = predDoc.data();
    const resultCorrect = pred.predictedResult === actualResult;
    const scoreCorrect  = pred.predictedScore?.home === homeScore &&
                          pred.predictedScore?.away === awayScore;

    // Check if scorer is correct (support 'No Goals' prediction if score is 0-0)
    let scorerCorrect = false;
    if (homeScore + awayScore === 0) {
      scorerCorrect = pred.predictedScorer === 'No Goals';
    } else if (scorers && scorers.length > 0) {
      scorerCorrect = scorers.includes(pred.predictedScorer);
    }

    const xpAwarded     = (resultCorrect ? 15 : 0) + (scorerCorrect ? 5 : 0);

    batch.update(predDoc.ref, {
      resolved: true,
      resultCorrect,
      scorerCorrect,
      scoreCorrect,
      xpAwarded,
      resolvedAt: FieldValue.serverTimestamp(),
    });

    if (xpAwarded > 0) {
      toAward.push({ userId: pred.userId, resultCorrect, scorerCorrect, scoreCorrect });
    }
  });

  await batch.commit();
  console.log(`✅ Resolved ${snap.size} predictions for fixture ${fixtureId}`);

  // Award XP
  for (const p of toAward) {
    await awardPredictionXP(p.userId, {
      resultCorrect: p.resultCorrect,
      scorerCorrect: p.scorerCorrect,
      scoreCorrect:  p.scoreCorrect,
    });
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Auth check
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Skip outside tournament dates — saves API quota
  if (!isTournamentActive()) {
    return res.status(200).json({ ok: true, skipped: 'outside tournament window' });
  }

  try {
    // 1. Check for live matches
    const liveFixtures     = await fetchFixtures(true);
    const hasLive          = liveFixtures.length > 0;

    // 2. If nothing live, fetch upcoming to keep schedule fresh
    const upcomingFixtures = hasLive ? [] : await fetchFixtures(false);

    // 3. Merge + dedupe
    const allFixtures = [...new Map(
      [...liveFixtures, ...upcomingFixtures].map(f => [f.fixture.id, f])
    ).values()];

    if (allFixtures.length === 0) {
      return res.status(200).json({ ok: true, message: 'No fixtures to update' });
    }

    const batch         = db.batch();
    const justCompleted = [];

    for (const fixture of allFixtures) {
      const mapped = mapFixtureToDoc(fixture);
      const ref    = db.collection('fixtures').doc(mapped.fixtureId);

      // FIX: admin SDK uses .exists (property) not .exists() (method)
      const existing = await ref.get();
      if (existing.exists && existing.data().isLive && mapped.isComplete) {
        justCompleted.push({ ...existing.data(), ...mapped });
      }

      batch.set(ref, mapped, { merge: true });
    }

    await batch.commit();

    // 4. Trigger curse/blessing + resolve predictions
    for (const match of justCompleted) {
      await triggerCurseBlessing(match);
      await resolveMatchPredictions(match.fixtureId, match.homeScore, match.awayScore, match.scorers || []);
    }

    return res.status(200).json({
      ok:               true,
      fixturesUpdated:  allFixtures.length,
      liveMatches:      liveFixtures.length,
      justCompleted:    justCompleted.length,
    });
  } catch (err) {
    console.error('Match poller failed:', err);
    return res.status(500).json({ error: err.message });
  }
}