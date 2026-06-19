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
  'Democratic Republic of the Congo': 'COD',
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

// ─── API-Football fetch (reconfigured for free worldcup26.ir API) ─────────────
function mapGameToDoc(g) {
  // local_date is MM/DD/YYYY HH:mm
  const [dStr, tStr] = g.local_date.split(' ');
  const [m, d, y] = dStr.split('/');
  const [hr, min] = tStr.split(':');
  
  // Parse kickoff time (assume local_date time is EDT/CDT etc. or treat as UTC)
  const kickoffDate = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hr), parseInt(min)));
  
  const status = g.finished === 'TRUE' ? 'FT' : (g.time_elapsed === 'notstarted' ? 'NS' : 'LIVE');

  const scorers = [];
  if (g.home_scorers && g.home_scorers !== 'null') {
    try {
      const clean = g.home_scorers.replace(/[\{\}]/g, '').replace(/[“”"']/g, '');
      clean.split(',').forEach(s => {
        if (s.trim()) scorers.push(`${s.trim()} (${g.home_team_name_en})`);
      });
    } catch (e) {}
  }
  if (g.away_scorers && g.away_scorers !== 'null') {
    try {
      const clean = g.away_scorers.replace(/[\{\}]/g, '').replace(/[“”"']/g, '');
      clean.split(',').forEach(s => {
        if (s.trim()) scorers.push(`${s.trim()} (${g.away_team_name_en})`);
      });
    } catch (e) {}
  }

  return {
    fixtureId:     String(g.id),
    homeTeam:      g.home_team_name_en || g.home_team_label || 'TBD',
    awayTeam:      g.away_team_name_en || g.away_team_label || 'TBD',
    homeTeamLogo:  `https://media.api-sports.io/football/teams/${g.home_team_id}.png`,
    awayTeamLogo:  `https://media.api-sports.io/football/teams/${g.away_team_id}.png`,
    kickoffAt:     Timestamp.fromDate(kickoffDate),
    stage:         g.type === 'group' ? `Group ${g.group} - MD${g.matchday}` : g.group,
    status,
    homeScore:     parseInt(g.home_score) || 0,
    awayScore:     parseInt(g.away_score) || 0,
    isLive:        status === 'LIVE',
    isComplete:    status === 'FT',
    locksAt:       Timestamp.fromMillis(kickoffDate.getTime() - 3600 * 1000),
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

    // Check if scorer is correct
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
    const resFeeds = await fetch("https://worldcup26.ir/get/games", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!resFeeds.ok) throw new Error(`HTTP error ${resFeeds.status}`);
    
    const data = await resFeeds.json();
    const games = data.games || [];

    if (games.length === 0) {
      return res.status(200).json({ ok: true, message: 'No fixtures to update' });
    }

    const batch         = db.batch();
    const justCompleted = [];

    for (const g of games) {
      const mapped = mapGameToDoc(g);
      const ref    = db.collection('fixtures').doc(mapped.fixtureId);

      const existing = await ref.get();
      // If a match is complete, but was either not in our database or not marked as complete yet:
      const isNewlyCompleted = mapped.isComplete && (!existing.exists || !existing.data().isComplete);
      if (isNewlyCompleted) {
        justCompleted.push({ ...existing.data(), ...mapped });
      }

      batch.set(ref, mapped, { merge: true });
    }

    await batch.commit();

    // Trigger curse/blessing + resolve predictions
    for (const match of justCompleted) {
      await triggerCurseBlessing(match);
      await resolveMatchPredictions(match.fixtureId, match.homeScore, match.awayScore, match.scorers || []);
    }

    return res.status(200).json({
      ok:               true,
      fixturesUpdated:  games.length,
      justCompleted:    justCompleted.length,
    });
  } catch (err) {
    console.error('Match poller failed:', err);
    return res.status(500).json({ error: err.message });
  }
}