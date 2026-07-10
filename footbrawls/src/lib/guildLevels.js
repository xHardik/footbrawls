




export const GUILD_LEVELS = [
  {
    level:      1,
    name:       "Grassroots",
    emoji:      "🌱",
    hpCap:      25_000,
    color:      "#6b7280",
    perks: {
      blessingXPBonus:     0.25,
      raidDefenceZones:    0,
      curseResistance:     false,
      passiveXPBonus:      0,
    },
    perkLabels: ["Base blessing +25% XP", "Standard raid defence"],
  },
  {
    level:      2,
    name:       "Rising",
    emoji:      "⚡",
    hpCap:      60_000,
    color:      "#3b82f6",
    perks: {
      blessingXPBonus:     0.30,
      raidDefenceZones:    0,
      curseResistance:     false,
      passiveXPBonus:      0,
    },
    perkLabels: ["Blessing upgraded to +30% XP", "Standard raid defence"],
  },
  {
    level:      3,
    name:       "Established",
    emoji:      "🏟️",
    hpCap:      110_000,
    color:      "#10b981",
    perks: {
      blessingXPBonus:     0.35,
      raidDefenceZones:    1,
      curseResistance:     false,
      passiveXPBonus:      0,
    },
    perkLabels: ["Blessing +35% XP", "+1 raid defence zone", "Fortress advantage in raids"],
  },
  {
    level:      4,
    name:       "Elite",
    emoji:      "🏆",
    hpCap:      185_000,
    color:      "#f59e0b",
    perks: {
      blessingXPBonus:     0.40,
      raidDefenceZones:    2,
      curseResistance:     true,
      passiveXPBonus:      0,
    },
    perkLabels: ["Blessing +40% XP", "+2 raid defence zones", "Curse resistance (double → single)", "Raid fortress advantage"],
  },
  {
    level:      5,
    name:       "Legendary",
    emoji:      "👑",
    hpCap:      200_000,
    color:      "#8b5cf6",
    perks: {
      blessingXPBonus:     0.50,
      raidDefenceZones:    3,
      curseResistance:     true,
      passiveXPBonus:      0.10,
    },
    perkLabels: ["Permanent +10% XP bonus", "Blessing +50% XP", "+3 raid defence zones", "Full curse resistance", "Max raid fortress"],
  },
];


export function getGuildLevel(level = 1) {
  return GUILD_LEVELS[Math.min(Math.max(level, 1), 5) - 1];
}


export function getGuildLevelConfig(guildDoc) {
  return getGuildLevel(guildDoc?.guildLevel || 1);
}


export function getHPCap(level = 1) {
  return getGuildLevel(level).hpCap;
}


export function normalizeGuildProgress(castleHP, currentLevel) {
  let level = Math.min(Math.max(Number(currentLevel) || 1, 1), 5);
  let hp = Math.max(0, Number(castleHP) || 0);
  const fromLevel = level;

  while (level < 5 && hp >= getHPCap(level)) {
    hp -= getHPCap(level);
    level += 1;
  }

  return {
    shouldUpgrade: level > fromLevel,
    overflow: hp,
    newLevel: level,
  };
}


export function checkUpgrade(castleHP, currentLevel) {
  return normalizeGuildProgress(castleHP, currentLevel);
}


export function isCurseExpired(guildDoc) {
  if (!guildDoc) return true;
  if (guildDoc.currentCurse === 'death_curse') return false;

  const expiry = guildDoc.curseExpiresAt;
  if (!expiry) return false;

  let expiryMs = 0;
  if (typeof expiry.toMillis === 'function') {
    expiryMs = expiry.toMillis();
  } else if (expiry.seconds) {
    expiryMs = expiry.seconds * 1000;
  } else if (expiry._seconds) {
    expiryMs = expiry._seconds * 1000;
  } else {
    expiryMs = new Date(expiry).getTime();
  }

  return Date.now() > expiryMs;
}


export function getXPMultiplier(guildDoc) {
  const level      = guildDoc?.guildLevel || 1;
  const levelConf  = getGuildLevel(level);
  
  const expired    = isCurseExpired(guildDoc);
  const curse      = (expired && guildDoc?.currentCurse !== 'death_curse') ? null : (guildDoc?.currentCurse || null);
  const blessing   = expired ? null : (guildDoc?.currentBlessing || null);


  let multiplier = 1.0 + levelConf.perks.passiveXPBonus;

  if (curse === 'death_curse')    return multiplier * 0.25;
  if (curse === 'double_cursed') {

    return multiplier * (levelConf.perks.curseResistance ? 0.75 : 0.5);
  }
  if (curse === 'cursed')         return multiplier * 0.75;
  if (blessing === 'blessed')     return multiplier * (1 + levelConf.perks.blessingXPBonus);

  return multiplier;
}


export function getLevelProgress(castleHP, guildLevel) {
  const cap = getHPCap(guildLevel);
  return Math.min(100, Math.round((castleHP / cap) * 100));
}


export function getHPDisplay(castleHP, guildLevel) {
  const cap = getHPCap(guildLevel);
  return `${castleHP.toLocaleString()} / ${cap.toLocaleString()}`;
}
