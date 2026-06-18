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
  if (process.env.NODE_ENV === 'development' || !process.env.CRON_SECRET) {
    return true;
  }
  return now >= TOURNAMENT_START && now <= TOURNAMENT_END;
}

// ─── Team name → guild country code ──────────────────────────────────────────
const TEAM_NAME_TO_CODE = {
  // API-Football names / fallbacks
  'United States': 'USA',
  'Turkey': 'TUR',
  'Czech Republic': 'CZE',
  'Cameroon': 'CMR',
  'Nigeria': 'NGA',
  'Chile': 'CHI',
  'Peru': 'PER',
  'Serbia': 'SRB',
  'Ukraine': 'UKR',
  'Wales': 'WAL',
  'Hungary': 'HUN',
  'Costa Rica': 'CRC',
  'Honduras': 'HON',
  'Jamaica': 'JAM',
  'India': 'IND',
  // Official Match Predictor schedule / flags names
  'Algeria': 'ALG',
  'Argentina': 'ARG',
  'Australia': 'AUS',
  'Austria': 'AUT',
  'Belgium': 'BEL',
  'Bosnia and Herzegovina': 'BIH',
  'Brazil': 'BRA',
  'Canada': 'CAN',
  'Cape Verde': 'CPV',
  'Colombia': 'COL',
  'Croatia': 'CRO',
  'Curaçao': 'CUW',
  'Czechia': 'CZE',
  'DR Congo': 'COD',
  'Ecuador': 'ECU',
  'Egypt': 'EGY',
  'England': 'ENG',
  'France': 'FRA',
  'Germany': 'GER',
  'Ghana': 'GHA',
  'Haiti': 'HAI',
  'Iran': 'IRN',
  'Iraq': 'IRQ',
  'Ivory Coast': 'CIV',
  'Japan': 'JPN',
  'Jordan': 'JOR',
  'Mexico': 'MEX',
  'Morocco': 'MAR',
  'Netherlands': 'NED',
  'New Zealand': 'NZL',
  'Norway': 'NOR',
  'Panama': 'PAN',
  'Paraguay': 'PAR',
  'Portugal': 'POR',
  'Qatar': 'QAT',
  'Saudi Arabia': 'KSA',
  'Scotland': 'SCO',
  'Senegal': 'SEN',
  'South Africa': 'RSA',
  'South Korea': 'KOR',
  'Spain': 'ESP',
  'Sweden': 'SWE',
  'Switzerland': 'SUI',
  'Tunisia': 'TUN',
  'Türkiye': 'TUR',
  'USA': 'USA',
  'Uruguay': 'URU',
  'Uzbekistan': 'UZB',
};

const MOCK_TEAM_PLAYERS = {
  Argentina:  ['Messi', 'Lautaro Martinez', 'Julian Alvarez', 'De Paul', 'Mac Allister', 'Dybala'],
  France:     ['Mbappe', 'Griezmann', 'Dembele', 'Tchouameni', 'Camavinga', 'Rabiot'],
  Brazil:     ['Vinicius Jr', 'Rodrygo', 'Raphinha', 'Casemiro', 'Bruno Guimaraes', 'Martinelli'],
  England:    ['Kane', 'Bellingham', 'Saka', 'Foden', 'Rice', 'Rashford'],
  Spain:      ['Morata', 'Pedri', 'Gavi', 'Yamal', 'Rodri', 'Olmo'],
  Germany:    ['Havertz', 'Musiala', 'Wirtz', 'Gnabry', 'Sane', 'Fullkrug'],
  Portugal:   ['Ronaldo', 'Bruno Fernandes', 'Bernardo Silva', 'Felix', 'Dias', 'Cancelo'],
  Netherlands:['Depay', 'Gakpo', 'Van Dijk', 'De Jong', 'Dumfries', 'Weghorst'],
  Belgium:    ['De Bruyne', 'Lukaku', 'Trossard', 'Doku', 'Courtois', 'Mangala'],
  Croatia:    ['Modric', 'Gvardiol', 'Kovacic', 'Kramaric', 'Livakovic', 'Perisic'],
  Morocco:    ['Hakimi', 'Ziyech', 'En-Nesyri', 'Bounou', 'Amrabat', 'Ounahi'],
  Senegal:    ['Mane', 'Dia', 'Sarr', 'Mendy', 'Kouyate', 'Diallo'],
  USA:        ['Pulisic', 'Reyna', 'McKennie', 'Turner', 'Dest', 'Weah'],
  Mexico:     ['Lozano', 'Jimenez', 'Guardado', 'Herrera', 'Ochoa', 'Alvarez'],
  Uruguay:    ['Nunez', 'Valverde', 'Bentancur', 'De Arrascaeta', 'Cavani', 'Suarez'],
  Colombia:   ['Luis Diaz', 'James Rodriguez', 'Cuadrado', 'Ospina', 'Falcao'],
  Japan:      ['Minamino', 'Doan', 'Kamada', 'Mitoma', 'Ito', 'Kubo'],
  'South Korea':['Son Heung-min', 'Hwang Hee-chan', 'Lee Jae-sung', 'Kim Min-jae'],
  Switzerland:['Xhaka', 'Shaqiri', 'Embolo', 'Akanji', 'Freuler'],
  Australia:  ['Leckie', 'Irvine', 'Mooy', 'Ryan', 'Hrustic'],
  Canada:     ['Davies', 'Jonathan David', 'Larin', 'Buchanan'],
  'Saudi Arabia':['Al-Dawsari', 'Al-Shahrani', 'Al-Malki'],
  Iran:       ['Taremi', 'Jahanbakhsh', 'Azmoun'],
  Ecuador:    ['Plata', 'Caicedo', 'Valencia', 'Preciado'],
  Sweden:     ['Isak', 'Kulusevski', 'Forsberg', 'Ekdal'],
  Norway:     ['Haaland', 'Odegaard', 'Sorloth', 'Berge'],
  Algeria:    ['Mahrez', 'Bennacer', 'Belaili', 'Slimani'],
  Austria:    ['Alaba', 'Arnautovic', 'Sabitzer', 'Gregoritsch'],
  Poland:     ['Lewandowski', 'Zielinski', 'Szczesny'],
  Ghana:      ['Kudus', 'Thomas Partey', 'Ayew', 'Saka'],
  Czechia:    ['Schick', 'Soucek', 'Kuchta', 'Sadilek'],
  Scotland:   ['Robertson', 'McTominay', 'Tierney', 'Christie'],
  Tunisia:      ['Msakni', 'Sliti', 'Layouni', 'Laidouni', 'Skhiri'],
  Egypt:        ['Salah', 'Marmoush', 'Mostafa Mohamed', 'Trezeguet', 'Elneny'],
  'New Zealand':['Wood', 'Barbarouses', 'Singh', 'Cacace', 'Garbett'],
  Iraq:         ['Aymen Hussein', 'Ali Jasim', 'Amir Al-Ammari', 'Ibrahim Bayesh', 'Youssef Amyn'],
  Jordan:       ['Al-Taamari', 'Al-Naimat', 'Olwan', 'Al-Mardi'],
  'DR Congo':   ['Wissa', 'Elia', 'Bakambu', 'Banza', 'Masuaku', 'Moutoussamy'],
  Uzbekistan:   ['Shomurodov', 'Masharipov', 'Urunov', 'Fayzullaev'],
  Panama:       ['Fajardo', 'Guerrero', 'Carrasquilla', 'Barcenas', 'Rodriguez'],
  Paraguay:     ['Almiron', 'Enciso', 'Sanabria', 'Bareiro', 'Bobadilla'],
  Türkiye:      ['Yilmaz', 'Guler', 'Calhanoglu', 'Kocku', 'Akturkoglu', 'Yildiz'],
  'South Africa':['Tau', 'Zwane', 'Maseko', 'Morena', 'Mokoena'],
  Qatar:        ['Akram Afif', 'Almoez Ali', 'Al-Haydos', 'Hatem'],
  Haiti:        ['Pierrot', 'Nazon', 'Guerrier', 'Etienne'],
  'Ivory Coast': ['Haller', 'Adingra', 'Kessie', 'Singo', 'Fofana', 'Pepe'],
  'Curaçao':    ['Janga', 'Bacuna', 'Gorré', 'Antonisse'],
  'Cape Verde':  ['Bebe', 'Ryan Mendes', 'Cabral', 'Garry Rodrigues'],
  'Bosnia and Herzegovina': ['Dzeko', 'Pjanic', 'Demirovic', 'Krunic', 'Tahirovic', 'Hajradinovic'],
};

function generateMockMatchResult(homeTeam, awayTeam) {
  const homeScore = Math.floor(Math.random() * 4); // 0 to 3
  const awayScore = Math.floor(Math.random() * 4); // 0 to 3
  const scorers = [];

  const homePlayers = MOCK_TEAM_PLAYERS[homeTeam] || ['Star Player ' + homeTeam];
  const awayPlayers = MOCK_TEAM_PLAYERS[awayTeam] || ['Star Player ' + awayTeam];

  // Add goalscorers for home goals
  for (let i = 0; i < homeScore; i++) {
    const randPlayer = homePlayers[Math.floor(Math.random() * homePlayers.length)];
    const item = `${randPlayer} (${homeTeam})`;
    if (!scorers.includes(item)) scorers.push(item);
  }
  // Add goalscorers for away goals
  for (let i = 0; i < awayScore; i++) {
    const randPlayer = awayPlayers[Math.floor(Math.random() * awayPlayers.length)];
    const item = `${randPlayer} (${awayTeam})`;
    if (!scorers.includes(item)) scorers.push(item);
  }

  return { homeScore, awayScore, scorers };
}

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
      if (ev.type === 'Goal' && ev.player && ev.player.name && ev.team && ev.team.name) {
        scorers.push(`${ev.player.name} (${ev.team.name})`);
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
    batch.set(db.collection('guilds').doc(winner), {
      currentBlessing: 'blessed',
      currentCurse:    null,
      curseExpiresAt:  expiresTs,
      lastMatchResult: 'win',
    }, { merge: true });

    const loserSnap = await db.collection('guilds').doc(loser).get();
    const loserData = loserSnap.exists ? loserSnap.data() : {}; // FIX: .exists not .exists()

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
      if (pred.predictedScorer && pred.predictedScorer.endsWith(' - Someone Else')) {
        const team = pred.predictedScorer.split(' - Someone Else')[0];
        const teamPlayers = MOCK_TEAM_PLAYERS[team] || [];
        scorerCorrect = scorers.some(s => {
          if (s.includes(' (')) {
            const parts = s.split(' (');
            const name = parts[0];
            const t = parts[1].replace(')', '');
            return t === team && !teamPlayers.includes(name);
          }
          return false;
        });
      } else {
        scorerCorrect = scorers.some(s => {
          if (s.includes(' (')) {
            return s.split(' (')[0] === pred.predictedScorer;
          }
          return s === pred.predictedScorer;
        });
      }
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
  if (process.env.CRON_SECRET && req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Skip outside tournament dates — saves API quota
  if (!isTournamentActive()) {
    return res.status(200).json({ ok: true, skipped: 'outside tournament window' });
  }

  try {
    // 0. Auto-resolve any fixtures that have kickoff in the past but are still marked as not completed
    const now = new Date();
    // A match is complete if it started more than 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const pastSnap = await db.collection('fixtures')
      .where('isComplete', '==', false)
      .where('kickoffAt', '<=', Timestamp.fromDate(twoHoursAgo))
      .get();

    const resolvedOffline = [];
    if (!pastSnap.empty) {
      const offlineBatch = db.batch();
      for (const doc of pastSnap.docs) {
        const fixture = doc.data();
        const { homeScore, awayScore, scorers } = generateMockMatchResult(fixture.homeTeam, fixture.awayTeam);
        const updatedDoc = {
          ...fixture,
          homeScore,
          awayScore,
          scorers,
          status: 'FT',
          isComplete: true,
          isLive: false,
          updatedAt: FieldValue.serverTimestamp(),
        };
        offlineBatch.set(doc.ref, updatedDoc, { merge: true });
        resolvedOffline.push(updatedDoc);
      }
      await offlineBatch.commit();
      console.log(`[Offline Auto-Resolve] Completed ${resolvedOffline.length} past matches.`);
      for (const match of resolvedOffline) {
        await triggerCurseBlessing(match);
        await resolveMatchPredictions(match.fixtureId, match.homeScore, match.awayScore, match.scorers || []);
      }
    }
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