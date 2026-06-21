// scripts/seedRosterBots.cjs
// Run with: node scripts/seedRosterBots.cjs
// Creates 10 bot users for each popular guild to make them look active.

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

const POPULAR_COUNTRIES = [
  { code: 'MEX', flag: '🇲🇽', names: ['Chicharito_Fan', 'MemoOchoa', 'ElTri_Magic', 'Santi_Striker', 'Raul_Goal', 'Mexico99', 'AztecaHero', 'Hugo_Sanchez', 'Vega_Winger', 'ElDiablo'] },
  { code: 'USA', flag: '🇺🇸', names: ['Pulisic_Winger', 'Reyna_Mid', 'USMNT_Pride', 'BaldEagle', 'MLS_Baller', 'Landon_Hero', 'Weah_Speed', 'Dest_Dribble', 'Turner_Glove', 'McKennie_Mid'] },
  { code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', names: ['Belli_Ball', 'Saka_Magic', 'Kane_Striker', 'ThreeLions96', 'Foden_Drill', 'Rice_Shield', 'Rashford_10', 'Wembley_King', 'Grealish_Vibe', 'Walker_Speed'] },
  { code: 'BRA', flag: '🇧🇷', names: ['Vini_Júnior', 'Neymar_Class', 'Rodrygo_Go', 'Samba_Baller', 'Selecao_Ouro', 'Ronaldo_R9', 'Pele_Legacy', 'Raphinha_Goal', 'Casemiro_Wall', 'Alisson_Save'] },
  { code: 'ARG', flag: '🇦🇷', names: ['Messi_10', 'Lautaro_Goal', 'Julian_Spider', 'Albiceleste', 'Maradona_Gold', 'DiMaria_Angel', 'DePaul_Engine', 'MacAllister', 'Dybala_Mask', 'Dibu_Glove'] },
  { code: 'FRA', flag: '🇫🇷', names: ['Mbappé_Speed', 'Grizou_Vibe', 'Dembele_Drill', 'LesBleus_98', 'Tchouaméni', 'Camavinga_Mid', 'Zidane_Class', 'Henry_Legend', 'Rabiot_Engine', 'Giroud_Head'] },
  { code: 'GER', flag: '🇩🇪', names: ['Wirtz_Magic', 'Musiala_Ball', 'Havertz_Goal', 'Kroos_Pass', 'Müller_Space', 'Neuer_Wall', 'Füllkrug_Header', 'Sané_Speed', 'Gnabry_Cook', 'Kimmich_Mid'] },
  { code: 'ESP', flag: '🇪🇸', names: ['Yamal_Wonder', 'Rodri_Engine', 'Pedri_Magic', 'Gavi_Fighter', 'LaRoja_Pride', 'Iniesta_Pass', 'Morata_Goals', 'Nico_Speed', 'Carvajal_Wall', 'Olmo_Magic'] },
  { code: 'POR', flag: '🇵🇹', names: ['CR7_Legend', 'Bruno_Pass', 'Bernardo_Vibe', 'Leão_Speed', 'Dias_Shield', 'Felix_Magic', 'Cancelo_Overlap', 'Portugal_7', 'Jota_Striker', 'Palhinha'] },
];

async function seed() {
  console.log("Seeding bot users for popular guilds...");
  const batch = db.batch();
  let total = 0;

  POPULAR_COUNTRIES.forEach((c) => {
    for (let i = 0; i < 10; i++) {
      const nickname = c.names[i];
      const userId = `bot_user_${c.code.toLowerCase()}_${i + 1}`;
      const ref = db.collection('users').doc(userId);

      // Random realistic XP
      const totalXP = Math.floor(Math.random() * 7000) + 1000;
      const weeklyXP = Math.floor(Math.random() * 1200) + 200;
      const dailyXP = Math.floor(Math.random() * 300) + 50;

      const userData = {
        userId,
        nickname,
        flag: c.flag,
        homeCountry: c.code,
        totalXP,
        weeklyXP,
        dailyXP,
        createdAt: FieldValue.serverTimestamp(),
        isBot: true,
      };

      batch.set(ref, userData, { merge: true });
      total++;
    }
  });

  await batch.commit();
  console.log(`Successfully seeded ${total} bot users across the 9 popular country guilds.`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
