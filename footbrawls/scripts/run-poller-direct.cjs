// scripts/run-poller-direct.cjs
// Run with: node scripts/run-poller-direct.cjs

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

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
  'Cape Verde': 'CPV', 'Colombia': 'COL', 'Croatia': 'CRO', 'Curaçao': 'CUW',
  'DR Congo': 'COD', 'Democratic Republic of the Congo': 'COD', 'Ecuador': 'ECU', 'Egypt': 'EGY', 'England': 'ENG', 'France': 'FRA',
  'Germany': 'GER', 'Ghana': 'GHA', 'Haiti': 'HAI', 'Iran': 'IRN', 'Iraq': 'IRQ',
  'Ivory Coast': 'CIV', 'Japan': 'JPN', 'Jordan': 'JOR', 'Mexico': 'MEX', 'Morocco': 'MAR',
  'Netherlands': 'NED', 'New Zealand': 'NZL', 'Norway': 'NOR', 'Panama': 'PAN',
  'Paraguay': 'PAR', 'Portugal': 'POR', 'Qatar': 'QAT', 'Saudi Arabia': 'KSA',
  'Scotland': 'SCO', 'Senegal': 'SEN', 'South Africa': 'RSA', 'South Korea': 'KOR',
  'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'SUI', 'Tunisia': 'TUN', 'Türkiye': 'TUR',
  'USA': 'USA', 'Uruguay': 'URU', 'Uzbekistan': 'UZB',
};

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
  console.log("Running manual 2026 API poller (worldcup26.ir)...");
  try {
    const res = await fetch("https://worldcup26.ir/get/games", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const data = await res.json();
    const games = data.games || [];
    console.log(`Fetched ${games.length} games from free World Cup 2026 API.`);

    if (games.length === 0) {
      console.log("No games found.");
      return;
    }

    const batch = db.batch();
    const justCompleted = [];

    for (const g of games) {
      const mapped = mapGameToDoc(g);
      const ref    = db.collection('fixtures').doc(mapped.fixtureId);

      const existing = await ref.get();
      const isNewlyCompleted = mapped.isComplete && (!existing.exists || !existing.data().isComplete);
      if (isNewlyCompleted) {
        justCompleted.push({ ...existing.data(), ...mapped });
      }

      batch.set(ref, mapped, { merge: true });
    }

    await batch.commit();
    console.log(`Synced ${games.length} matches to Firestore successfully.`);

    for (const match of justCompleted) {
      await triggerCurseBlessing(match);
    }
    console.log("All tasks completed!");
  } catch (err) {
    console.error("Poller failed:", err);
  }
}

run();
