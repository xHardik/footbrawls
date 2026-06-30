// scripts/seedGlobalBots.cjs
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
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

function generateUUID() {
  return crypto.randomUUID();
}

const BOT_COUNTRIES = {
  POR: '🇵🇹', IND: '🇮🇳', ARG: '🇦🇷', BRA: '🇧🇷',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', FRA: '🇫🇷', ESP: '🇪🇸', GER: '🇩🇪',
  MEX: '🇲🇽', USA: '🇺🇸', NGA: '🇳🇬', JPN: '🇯🇵',
  KOR: '🇰🇷', SEN: '🇸🇳', MAR: '🇲🇦', URU: '🇺🇾'
};

const DISTRIBUTION = [
  { code: 'POR', count: 15 },
  { code: 'IND', count: 15 },
  { code: 'ARG', count: 15 },
  { code: 'BRA', count: 15 },
  { code: 'ENG', count: 12 },
  { code: 'FRA', count: 12 },
  { code: 'ESP', count: 12 },
  { code: 'GER', count: 11 },
  { code: 'MEX', count: 10 },
  { code: 'USA', count: 10 },
  { code: 'NGA', count: 8 },
  { code: 'JPN', count: 8 },
  { code: 'KOR', count: 8 },
  { code: 'SEN', count: 6 },
  { code: 'MAR', count: 6 },
  { code: 'URU', count: 6 },
];

const MEME_NAMES = [
  "MessiGoat10", "Pessi_L", "Penaldo", "CR7_Siuu", "EngIsBest", "Selecao_Pride",
  "ViniBaller", "Mbappe_Speed", "HaalandRobot", "Bellingham_99", "Rashford_Beans",
  "HarryKane_Curse", "KDB_Assist", "Saka_Starboy", "Neymar_Rolls", "Antony_Spin",
  "Mudryk_007", "Maguire_Goat", "Onana_Saves", "Darwin_Chaos", "Yamal_Wonder",
  "Gavi_Fighter", "Pedri_Magic", "Foden_Sniper", "Palmer_Cold", "Mainoo_Class",
  "Garnacho_Bicycle", "Ronaldo_🐪", "Messi_👽", "Zidane_Headbutt", "Ronaldinho_Gaucho",
  "R9_Fenomeno", "Henry_Legend", "Rooney_Wazza", "Gerrard_Slip", "Lampard_Goals",
  "Scholes_Pass", "Kante_Smile", "Pogba_Dance", "Zlatan_God", "Lewa_Goals",
  "Muller_Raum", "Neuer_Sweeper", "Ramos_RedCard", "Pepe_Destroyer", "Casillas_Saint",
  "Buffon_Legend", "Maldini_Wall", "Nesta_Tackle", "Cannavaro_Gold", "Pirlo_Maestro",
  "Totti_Emperor", "DelPiero_Curve", "Baggio_Tail", "Kaka_Glide", "Cafu_Train",
  "Carlos_Rocket", "Rivaldo_Bicycle", "Romario_Toe", "Bebeto_Baby", "Socrates_Dr",
  "Zico_Pele", "Pele_King", "Maradona_Hand", "Batistuta_Batigol", "Zanetti_Tractor",
  "Crespo_Goals", "Aguero_9320", "Tevez_Apache", "DiMaria_Noodle", "Dibu_Dance",
  "Alvarez_Spider", "Enzo_Pass", "MacAllister_Red", "Salah_King", "Mane_Speed",
  "Firmino_NoLook", "Alisson_Header", "Ederson_Pass", "Dias_Brick", "Stones_Johnny",
  "Walker_Pace", "Akanji_Math", "Ake_Gullit", "Grealish_Calves", "Silva_Magic",
  "Rodri_Clutch", "Gundogan_MrWhippy", "Mahrez_Touch", "Sterling_Run", "Jesus_Cross",
  "Zinchenko_Tears", "Odegaard_Captain", "Saka_Chili", "Martinelli_Pace", "Saliba_Rolls",
  "Gabriel_BigGabi", "White_Tan", "Ramsdale_Smile", "Raya_Catch", "Rice_Basmati",
  "Partey_Octopus", "Xhaka_Boom", "Tierney_Shorts", "Tomiyasu_Wall", "Timber_Solid",
  "Kiwior_Left", "Trossard_Sleep", "Nketiah_Phone", "Jesus_Eyebrows", "Havertz_Kai",
  "Jorginho_Hop", "Vieira_Fabio", "SmithRowe_Emile", "Nelson_Reiss", "Elneny_Pyramid",
  
  // Custom fan additions
  "cityisbest", "realmadrid_fan", "penaldo", "manutd_glory", "messigoat", "barca4life",
  "hala_madrid", "gunner_till_die", "ynwa_king", "spursy_lad", "chelsea_blue",
  "bayern_munich11", "juve_oldlady", "psg_money", "milan_devil", "inter_snake",
  "cr7_goat", "messi_magic", "pep_tactics", "klopp_hug", "mourinho_bus", "fergie_time"
];

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function seed() {
  console.log("Seeding 250 realistic users globally...");
  const batch = db.batch();
  let total = 0;
  
  const shuffledNames = shuffle([...MEME_NAMES]);
  let nameIdx = 0;

  for (const group of DISTRIBUTION) {
    const countryCode = group.code;
    const flag = BOT_COUNTRIES[countryCode];
    const count = group.count;

    // Pick 2-3 to be legends
    const legendCount = Math.floor(Math.random() * 2) + 2; // 2 or 3
    const legendIndices = new Set();
    while (legendIndices.size < legendCount && legendIndices.size < count) {
      legendIndices.add(Math.floor(Math.random() * count));
    }

    for (let i = 0; i < count; i++) {
      let nickname = shuffledNames[nameIdx++];
      if (!nickname) nickname = `User${Math.floor(Math.random() * 90000) + 10000}`;
      else if (Math.random() > 0.5) nickname += Math.floor(Math.random() * 99);

      const userId = generateUUID();
      const ref = db.collection('users').doc(userId);

      const isLegend = legendIndices.has(i);
      
      let totalXP, weeklyXP, dailyXP;
      if (isLegend) {
        totalXP = Math.floor(Math.random() * 25000) + 10000; // 10k - 35k
        weeklyXP = Math.floor(Math.random() * 3000) + 1000;
        dailyXP = Math.floor(Math.random() * 500) + 200;
      } else {
        totalXP = Math.floor(Math.random() * 9000) + 500; // 500 - 9500
        weeklyXP = Math.floor(Math.random() * 300) + 50;
        dailyXP = Math.floor(Math.random() * 100) + 10;
      }

      const userData = {
        userId,
        nickname,
        flag: flag || '🏳️',
        homeCountry: countryCode,
        totalXP,
        weeklyXP,
        dailyXP,
        createdAt: FieldValue.serverTimestamp(),
        isBot: true, // Internal flag for devs
      };

      batch.set(ref, userData, { merge: true });
      total++;
    }
  }

  // Generate the rest for top tiers
  const remaining = 250 - total;
  const topTiers = ['POR', 'IND', 'ARG', 'BRA', 'ENG', 'FRA', 'ESP', 'GER'];
  
  for (let i = 0; i < remaining; i++) {
    const countryCode = topTiers[Math.floor(Math.random() * topTiers.length)];
    const flag = BOT_COUNTRIES[countryCode];
    
    let nickname = shuffledNames[nameIdx++];
    if (!nickname) nickname = `Player_${Math.floor(Math.random() * 90000)}`;
    else if (Math.random() > 0.3) nickname += Math.floor(Math.random() * 999);

    const userId = generateUUID();
    const ref = db.collection('users').doc(userId);

    // Make 10% of extra bots legends
    const isLegend = Math.random() < 0.1;
    let totalXP = isLegend ? Math.floor(Math.random() * 25000) + 10000 : Math.floor(Math.random() * 9000) + 500;
    let weeklyXP = isLegend ? 2000 : 200;
    let dailyXP = isLegend ? 500 : 50;

    const userData = {
      userId,
      nickname,
      flag: flag || '🏳️',
      homeCountry: countryCode,
      totalXP,
      weeklyXP,
      dailyXP,
      createdAt: FieldValue.serverTimestamp(),
      isBot: true,
    };
    batch.set(ref, userData, { merge: true });
    total++;
  }

  await batch.commit();
  console.log(`Successfully seeded ${total} realistic users!`);
  
  console.log("Recalculating Guild XP...");
  const guilds = {};
  const usersSnap = await db.collection('users').get();
  usersSnap.forEach(doc => {
    const u = doc.data();
    if (!u.homeCountry) return;
    if (!guilds[u.homeCountry]) guilds[u.homeCountry] = { totalXP: 0, memberCount: 0 };
    guilds[u.homeCountry].totalXP += (u.totalXP || 0);
    guilds[u.homeCountry].memberCount += 1;
  });

  const guildEntries = Object.entries(guilds);
  for (let i = 0; i < guildEntries.length; i += 500) {
    const guildBatch = db.batch();
    const chunk = guildEntries.slice(i, i + 500);
    for (const [code, data] of chunk) {
      const guildRef = db.collection('guilds').doc(code);
      guildBatch.set(guildRef, {
        id: code,
        totalXP: data.totalXP,
        memberCount: data.memberCount,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    await guildBatch.commit();
  }
  
  console.log("Guilds updated successfully.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
