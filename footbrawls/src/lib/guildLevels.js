// src/lib/guildLevels.js
// Guild progression system — 5 levels, HP accumulates until cap then upgrades.
// Used by xpEngine.js (castleHP increment + upgrade check)
// and Guild.jsx (display perks, level badge, progress bar).

export const GUILD_LEVELS = [
  {
    level:      1,
    name:       "Grassroots",
    emoji:      "🌱",
    hpCap:      10_000,
    color:      "#6b7280",
    perks: {
      blessingXPBonus:     0.25,   // +25% XP when blessed
      raidDefenceZones:    0,      // no extra raid zones
      curseResistance:     false,
      passiveXPBonus:      0,
    },
    perkLabels: ["Base blessing +25% XP", "Standard raid defence"],
  },
  {
    level:      2,
    name:       "Rising",
    emoji:      "⚡",
    hpCap:      25_000,
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
    hpCap:      50_000,
    color:      "#10b981",
    perks: {
      blessingXPBonus:     0.35,
      raidDefenceZones:    1,      // +1 blocked zone in raid defence
      curseResistance:     false,
      passiveXPBonus:      0,
    },
    perkLabels: ["Blessing +35% XP", "+1 raid defence zone", "Fortress advantage in raids"],
  },
  {
    level:      4,
    name:       "Elite",
    emoji:      "🏆",
    hpCap:      100_000,
    color:      "#f59e0b",
    perks: {
      blessingXPBonus:     0.40,
      raidDefenceZones:    2,
      curseResistance:     true,   // double_cursed treated as single cursed
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
      passiveXPBonus:      0.10,  // +10% XP always, even without blessing
    },
    perkLabels: ["Permanent +10% XP bonus", "Blessing +50% XP", "+3 raid defence zones", "Full curse resistance", "Max raid fortress"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get level config by level number (1–5)
 */
export function getGuildLevel(level = 1) {
  return GUILD_LEVELS[Math.min(Math.max(level, 1), 5) - 1];
}

/**
 * Get level config by current castleHP and guildLevel
 */
export function getGuildLevelConfig(guildDoc) {
  return getGuildLevel(guildDoc?.guildLevel || 1);
}

/**
 * Get HP cap for a given level
 */
export function getHPCap(level = 1) {
  return getGuildLevel(level).hpCap;
}

/**
 * Check if guild should upgrade given current HP and level.
 * Returns { shouldUpgrade, overflow, newLevel } 
 */
export function checkUpgrade(castleHP, currentLevel) {
  if (currentLevel >= 5) return { shouldUpgrade: false, overflow: 0, newLevel: 5 };
  const cap = getHPCap(currentLevel);
  if (castleHP >= cap) {
    return {
      shouldUpgrade: true,
      overflow:      castleHP - cap,  // carry overflow into next level
      newLevel:      currentLevel + 1,
    };
  }
  return { shouldUpgrade: false, overflow: 0, newLevel: currentLevel };
}

/**
 * Get the XP multiplier for a guild considering level perks + curse/blessing state.
 * Used by xpEngine to calculate final XP awarded.
 */
export function getXPMultiplier(guildDoc) {
  const level      = guildDoc?.guildLevel || 1;
  const levelConf  = getGuildLevel(level);
  const curse      = guildDoc?.currentCurse    || null;
  const blessing   = guildDoc?.currentBlessing || null;

  // Passive bonus always applies at level 5
  let multiplier = 1.0 + levelConf.perks.passiveXPBonus;

  if (curse === 'death_curse')    return multiplier * 0.25;
  if (curse === 'double_cursed') {
    // Level 4+ resists double curse — treat as single
    return multiplier * (levelConf.perks.curseResistance ? 0.75 : 0.5);
  }
  if (curse === 'cursed')         return multiplier * 0.75;
  if (blessing === 'blessed')     return multiplier * (1 + levelConf.perks.blessingXPBonus);

  return multiplier;
}

/**
 * Progress percentage within current level (0–100)
 */
export function getLevelProgress(castleHP, guildLevel) {
  const cap = getHPCap(guildLevel);
  return Math.min(100, Math.round((castleHP / cap) * 100));
}

/**
 * Display string e.g. "12,450 / 25,000"
 */
export function getHPDisplay(castleHP, guildLevel) {
  const cap = getHPCap(guildLevel);
  return `${castleHP.toLocaleString()} / ${cap.toLocaleString()}`;
}