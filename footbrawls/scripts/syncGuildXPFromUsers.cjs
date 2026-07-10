// scripts/syncGuildXPFromUsers.cjs
// Script to recalculate guild XP and levels based on member totalXP totals
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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

// New milestones:
// Level 1 cap = 25,000 (To reach Level 2)
// Level 2 cap = 60,000 (To reach Level 3, i.e., 25k + 35k)
// Level 3 cap = 110,000 (To reach Level 4, i.e., 60k + 50k)
// Level 4 cap = 185,000 (To reach Level 5, i.e., 110k + 75k)
// Level 5 cap = 200,000
const GUILD_LEVELS = [
  { level: 1, hpCap: 25000 },
  { level: 2, hpCap: 60000 },
  { level: 3, hpCap: 110000 },
  { level: 4, hpCap: 185000 },
  { level: 5, hpCap: 200000 },
];

function getHPCap(level) {
  const lvlObj = GUILD_LEVELS.find(l => l.level === level);
  return lvlObj ? lvlObj.hpCap : 200000;
}

function calculateGuildLevelAndHP(totalGuildXP) {
  let level = 1;
  let hp = totalGuildXP;
  while (level < 5 && hp >= getHPCap(level)) {
    hp -= getHPCap(level);
    level += 1;
  }
  return {
    guildLevel: level,
    castleHP: hp,
    castleHPCap: getHPCap(level)
  };
}

async function syncGuildXP() {
  console.log('Fetching all users...');
  const usersSnap = await db.collection('users').get();
  
  // Calculate aggregate totalXP per guild (based on homeCountry)
  const guildXPMap = {};
  const guildMemberCountMap = {};

  usersSnap.forEach(doc => {
    const user = doc.data();
    const guildCode = user.homeCountry;
    if (!guildCode) return;
    
    const xp = Number(user.totalXP) || 0;
    guildXPMap[guildCode] = (guildXPMap[guildCode] || 0) + Math.round(xp * 0.8);
    guildMemberCountMap[guildCode] = (guildMemberCountMap[guildCode] || 0) + 1;
  });

  console.log('Updating guilds stats...');
  for (const [code, totalXP] of Object.entries(guildXPMap)) {
    const guildRef = db.collection('guilds').doc(code);
    const guildSnap = await guildRef.get();
    
    if (guildSnap.exists) {
      const stats = calculateGuildLevelAndHP(totalXP);
      const memberCount = guildMemberCountMap[code] || 0;
      
      console.log(`Guild ${code}: total XP contributed = ${totalXP} -> Level: ${stats.guildLevel}, castleHP: ${stats.castleHP}, members: ${memberCount}`);
      
      await guildRef.update({
        castleHP: stats.castleHP,
        castleHPCap: stats.castleHPCap,
        guildLevel: stats.guildLevel,
        memberCount: memberCount
      });
    }
  }

  console.log('✅ Guilds XP and Levels synced successfully!');
  process.exit(0);
}

syncGuildXP().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
