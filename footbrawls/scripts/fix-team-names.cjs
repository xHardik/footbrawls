// fix-team-names.cjs
// Run with: node scripts/fix-team-names.cjs
// One-off migration: replaces placeholder team names like "Winner Group A"
// with real qualified country names based on 2026 World Cup group stage results.

const { initializeApp, cert, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs   = require("fs");

if (getApps().length === 0) {
  const saPath = path.join(__dirname, "..", "serviceAccountKey.json");
  if (fs.existsSync(saPath)) {
    initializeApp({ credential: cert(require(saPath)) });
  } else {
    initializeApp({ credential: applicationDefault() });
  }
}

const db = getFirestore();

// Real qualified teams based on 2026 group stage results
const TEAM_MAP = {
  // Group winners
  "Winner Group A": "Mexico",
  "Winner Group B": "Switzerland",
  "Winner Group C": "Brazil",
  "Winner Group D": "USA",
  "Winner Group E": "Germany",
  "Winner Group F": "Netherlands",
  "Winner Group G": "Belgium",
  "Winner Group H": "Spain",
  "Winner Group I": "France",
  "Winner Group J": "Argentina",
  "Winner Group K": "Colombia",
  "Winner Group L": "England",

  // Group runners-up
  "Runner-up Group A": "South Africa",
  "Runner-up Group B": "Canada",
  "Runner-up Group C": "Morocco",
  "Runner-up Group D": "Australia",
  "Runner-up Group E": "Ivory Coast",
  "Runner-up Group F": "Japan",
  "Runner-up Group G": "Egypt",
  "Runner-up Group H": "Cape Verde",
  "Runner-up Group I": "Norway",
  "Runner-up Group J": "Austria",
  "Runner-up Group K": "DR Congo",
  "Runner-up Group L": "Croatia",

  // Best third-place teams (8 slots, assigned by FIFA bracket rules)
  "3rd Group A/B/C/D": "Paraguay",
  "3rd Group A/B/C/E": "Paraguay",
  "3rd Group C/D/E/F": "Ecuador",
  "3rd Group C/E/F/H/I": "Sweden",
  "3rd Group D/E/F/G": "Sweden",
  "3rd Group E/F/G/H": "Senegal",
  "3rd Group F/G/H/I": "Bosnia and Herzegovina",
  "3rd Group G/H/I/J": "Algeria",
  "3rd Group H/I/J/K": "DR Congo",
  "3rd Group I/J/K/L": "Ghana",
  "3rd Group A/B/C": "Paraguay",
  "3rd Group D/E/F": "Ecuador",
  "3rd Group G/H/I": "Sweden",
  "3rd Group J/K/L": "Algeria",

  // Also handle lowercase / alternate casing just in case
  "winner group a": "Mexico",
  "winner group b": "Switzerland",
  "winner group c": "Brazil",
  "winner group d": "USA",
  "winner group e": "Germany",
  "winner group f": "Netherlands",
  "winner group g": "Belgium",
  "winner group h": "Spain",
  "winner group i": "France",
  "winner group j": "Argentina",
  "winner group k": "Colombia",
  "winner group l": "England",
};

// Fuzzy resolver for any placeholder not in the exact map above
function resolveTeam(raw) {
  if (!raw) return null;

  // Exact match first
  if (TEAM_MAP[raw]) return TEAM_MAP[raw];

  // Case-insensitive match
  const lower = raw.toLowerCase().trim();
  if (TEAM_MAP[lower]) return TEAM_MAP[lower];

  // Pattern match: "Winner Group X"
  const winnerMatch = lower.match(/^winner\s+group\s+([a-l])$/);
  if (winnerMatch) {
    return TEAM_MAP[`Winner Group ${winnerMatch[1].toUpperCase()}`] || null;
  }

  // Pattern match: "Runner-up Group X" or "Runner up Group X"
  const runnerMatch = lower.match(/^runner[\s-]up\s+group\s+([a-l])$/);
  if (runnerMatch) {
    return TEAM_MAP[`Runner-up Group ${runnerMatch[1].toUpperCase()}`] || null;
  }

  // Pattern match: "2nd Group X"
  const secondMatch = lower.match(/^2nd\s+group\s+([a-l])$/);
  if (secondMatch) {
    return TEAM_MAP[`Runner-up Group ${secondMatch[1].toUpperCase()}`] || null;
  }

  // Pattern match: "1st Group X"
  const firstMatch = lower.match(/^1st\s+group\s+([a-l])$/);
  if (firstMatch) {
    return TEAM_MAP[`Winner Group ${firstMatch[1].toUpperCase()}`] || null;
  }

  return null;
}

function isPlaceholder(name) {
  if (!name) return false;
  const l = name.toLowerCase();
  return (
    l.includes("winner") ||
    l.includes("runner") ||
    l.includes("3rd") ||
    l.includes("1st") ||
    l.includes("2nd") ||
    l.includes("tbd") ||
    l.includes("group ") // catches "Group A/B/C..." patterns
  );
}

async function migrate() {
  console.log("🔍 Scanning fixtures collection...");
  const snap = await db.collection("fixtures").get();
  console.log(`   Found ${snap.size} documents`);

  const batch = db.batch();
  let updated = 0;
  let skipped = 0;
  const unresolved = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const updates = {};

    if (isPlaceholder(data.homeTeam)) {
      const resolved = resolveTeam(data.homeTeam);
      if (resolved) {
        updates.homeTeam = resolved;
      } else {
        unresolved.push({ id: doc.id, field: "homeTeam", value: data.homeTeam });
      }
    }

    if (isPlaceholder(data.awayTeam)) {
      const resolved = resolveTeam(data.awayTeam);
      if (resolved) {
        updates.awayTeam = resolved;
      } else {
        unresolved.push({ id: doc.id, field: "awayTeam", value: data.awayTeam });
      }
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      updated++;
      console.log(`   ✏️  Doc ${doc.id}: ${JSON.stringify(updates)}`);
    } else {
      skipped++;
    }
  }

  if (updated === 0) {
    console.log("✅ Nothing to update — all team names already look real.");
    return;
  }

  console.log(`\n📝 Committing ${updated} updates...`);
  await batch.commit();
  console.log(`✅ Done. Updated: ${updated}, Skipped: ${skipped}`);

  if (unresolved.length > 0) {
    console.log("\n⚠️  Could not resolve these placeholders (update TEAM_MAP manually):");
    for (const u of unresolved) {
      console.log(`   Doc ${u.id} → ${u.field}: "${u.value}"`);
    }
  }
}

migrate().catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
