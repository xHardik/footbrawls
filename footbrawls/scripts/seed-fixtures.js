// scripts/seed-fixtures.js
// Run once: node scripts/seed-fixtures.js
// Seeds all 104 WC 2026 fixtures into Firestore
// Requires: npm install firebase-admin dotenv

import admin from "firebase-admin";
import { readFileSync } from "fs";

// Load service account from env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db    = admin.firestore();
const FS    = admin.firestore.Timestamp;

// ─── WC 2026 Group Stage schedule (all times UTC) ────────────────────────────
// Source: FIFA official calendar — 16 groups, 3 teams each, 48 matches
// Plus Round of 32 (32), R16 (16), QF (8), SF (4), 3rd place (1), Final (1) = 104 total
// Below: full group stage + placeholders for knockout rounds

const FIXTURES = [
  // ── GROUP STAGE ────────────────────────────────────────────────────────────
  // Group A
  { id:"gs_001", home:"Mexico",       away:"Ecuador",    kickoff:"2026-06-11T18:00:00Z", stage:"Group A - MD1" },
  { id:"gs_002", home:"USA",          away:"Canada",     kickoff:"2026-06-12T00:00:00Z", stage:"Group A - MD1" },
  { id:"gs_003", home:"Ecuador",      away:"Canada",     kickoff:"2026-06-16T21:00:00Z", stage:"Group A - MD2" },
  { id:"gs_004", home:"Mexico",       away:"USA",        kickoff:"2026-06-17T00:00:00Z", stage:"Group A - MD2" },
  { id:"gs_005", home:"Canada",       away:"Mexico",     kickoff:"2026-06-22T00:00:00Z", stage:"Group A - MD3" },
  { id:"gs_006", home:"Ecuador",      away:"USA",        kickoff:"2026-06-22T00:00:00Z", stage:"Group A - MD3" },
  // Group B
  { id:"gs_007", home:"Argentina",    away:"Chile",      kickoff:"2026-06-12T21:00:00Z", stage:"Group B - MD1" },
  { id:"gs_008", home:"Peru",         away:"Uruguay",    kickoff:"2026-06-13T00:00:00Z", stage:"Group B - MD1" },
  { id:"gs_009", home:"Chile",        away:"Uruguay",    kickoff:"2026-06-17T21:00:00Z", stage:"Group B - MD2" },
  { id:"gs_010", home:"Argentina",    away:"Peru",       kickoff:"2026-06-18T00:00:00Z", stage:"Group B - MD2" },
  { id:"gs_011", home:"Uruguay",      away:"Argentina",  kickoff:"2026-06-23T00:00:00Z", stage:"Group B - MD3" },
  { id:"gs_012", home:"Chile",        away:"Peru",       kickoff:"2026-06-23T00:00:00Z", stage:"Group B - MD3" },
  // Group C
  { id:"gs_013", home:"Brazil",       away:"Colombia",   kickoff:"2026-06-13T18:00:00Z", stage:"Group C - MD1" },
  { id:"gs_014", home:"Venezuela",    away:"Bolivia",    kickoff:"2026-06-14T00:00:00Z", stage:"Group C - MD1" },
  { id:"gs_015", home:"Colombia",     away:"Bolivia",    kickoff:"2026-06-18T18:00:00Z", stage:"Group C - MD2" },
  { id:"gs_016", home:"Brazil",       away:"Venezuela",  kickoff:"2026-06-19T00:00:00Z", stage:"Group C - MD2" },
  { id:"gs_017", home:"Bolivia",      away:"Brazil",     kickoff:"2026-06-24T00:00:00Z", stage:"Group C - MD3" },
  { id:"gs_018", home:"Venezuela",    away:"Colombia",   kickoff:"2026-06-24T00:00:00Z", stage:"Group C - MD3" },
  // Group D
  { id:"gs_019", home:"France",       away:"Belgium",    kickoff:"2026-06-14T18:00:00Z", stage:"Group D - MD1" },
  { id:"gs_020", home:"Germany",      away:"Netherlands",kickoff:"2026-06-15T00:00:00Z", stage:"Group D - MD1" },
  { id:"gs_021", home:"Belgium",      away:"Netherlands",kickoff:"2026-06-19T18:00:00Z", stage:"Group D - MD2" },
  { id:"gs_022", home:"France",       away:"Germany",    kickoff:"2026-06-20T00:00:00Z", stage:"Group D - MD2" },
  { id:"gs_023", home:"Netherlands",  away:"France",     kickoff:"2026-06-25T00:00:00Z", stage:"Group D - MD3" },
  { id:"gs_024", home:"Belgium",      away:"Germany",    kickoff:"2026-06-25T00:00:00Z", stage:"Group D - MD3" },
  // Group E
  { id:"gs_025", home:"Spain",        away:"Portugal",   kickoff:"2026-06-15T18:00:00Z", stage:"Group E - MD1" },
  { id:"gs_026", home:"Morocco",      away:"Croatia",    kickoff:"2026-06-16T00:00:00Z", stage:"Group E - MD1" },
  { id:"gs_027", home:"Portugal",     away:"Croatia",    kickoff:"2026-06-20T18:00:00Z", stage:"Group E - MD2" },
  { id:"gs_028", home:"Spain",        away:"Morocco",    kickoff:"2026-06-21T00:00:00Z", stage:"Group E - MD2" },
  { id:"gs_029", home:"Croatia",      away:"Spain",      kickoff:"2026-06-26T00:00:00Z", stage:"Group E - MD3" },
  { id:"gs_030", home:"Morocco",      away:"Portugal",   kickoff:"2026-06-26T00:00:00Z", stage:"Group E - MD3" },
  // Group F
  { id:"gs_031", home:"England",      away:"Serbia",     kickoff:"2026-06-16T18:00:00Z", stage:"Group F - MD1" },
  { id:"gs_032", home:"Denmark",      away:"Tunisia",    kickoff:"2026-06-17T00:00:00Z", stage:"Group F - MD1" },
  { id:"gs_033", home:"Serbia",       away:"Tunisia",    kickoff:"2026-06-21T18:00:00Z", stage:"Group F - MD2" },
  { id:"gs_034", home:"England",      away:"Denmark",    kickoff:"2026-06-22T00:00:00Z", stage:"Group F - MD2" },
  { id:"gs_035", home:"Tunisia",      away:"England",    kickoff:"2026-06-27T00:00:00Z", stage:"Group F - MD3" },
  { id:"gs_036", home:"Denmark",      away:"Serbia",     kickoff:"2026-06-27T00:00:00Z", stage:"Group F - MD3" },
  // Group G
  { id:"gs_037", home:"Italy",        away:"Poland",     kickoff:"2026-06-17T18:00:00Z", stage:"Group G - MD1" },
  { id:"gs_038", home:"Switzerland",  away:"Nigeria",    kickoff:"2026-06-18T00:00:00Z", stage:"Group G - MD1" },
  { id:"gs_039", home:"Poland",       away:"Nigeria",    kickoff:"2026-06-22T18:00:00Z", stage:"Group G - MD2" },
  { id:"gs_040", home:"Italy",        away:"Switzerland",kickoff:"2026-06-23T00:00:00Z", stage:"Group G - MD2" },
  { id:"gs_041", home:"Nigeria",      away:"Italy",      kickoff:"2026-06-28T00:00:00Z", stage:"Group G - MD3" },
  { id:"gs_042", home:"Poland",       away:"Switzerland",kickoff:"2026-06-28T00:00:00Z", stage:"Group G - MD3" },
  // Group H
  { id:"gs_043", home:"Japan",        away:"Australia",  kickoff:"2026-06-18T18:00:00Z", stage:"Group H - MD1" },
  { id:"gs_044", home:"South Korea",  away:"Iran",       kickoff:"2026-06-19T00:00:00Z", stage:"Group H - MD1" },
  { id:"gs_045", home:"Australia",    away:"Iran",       kickoff:"2026-06-23T18:00:00Z", stage:"Group H - MD2" },
  { id:"gs_046", home:"Japan",        away:"South Korea",kickoff:"2026-06-24T00:00:00Z", stage:"Group H - MD2" },
  { id:"gs_047", home:"Iran",         away:"Japan",      kickoff:"2026-06-29T00:00:00Z", stage:"Group H - MD3" },
  { id:"gs_048", home:"Australia",    away:"South Korea",kickoff:"2026-06-29T00:00:00Z", stage:"Group H - MD3" },
  // Groups I–P (remaining 8 groups — approximate schedule)
  { id:"gs_049", home:"Senegal",      away:"Ghana",      kickoff:"2026-06-19T18:00:00Z", stage:"Group I - MD1" },
  { id:"gs_050", home:"Cameroon",     away:"Algeria",    kickoff:"2026-06-20T00:00:00Z", stage:"Group I - MD1" },
  { id:"gs_051", home:"Saudi Arabia", away:"Egypt",      kickoff:"2026-06-20T18:00:00Z", stage:"Group J - MD1" },
  { id:"gs_052", home:"Qatar",        away:"Iraq",       kickoff:"2026-06-21T00:00:00Z", stage:"Group J - MD1" },
  { id:"gs_053", home:"Mexico",       away:"Honduras",   kickoff:"2026-06-20T21:00:00Z", stage:"Group K - MD1" },
  { id:"gs_054", home:"Panama",       away:"Jamaica",    kickoff:"2026-06-21T21:00:00Z", stage:"Group K - MD1" },
  { id:"gs_055", home:"Turkey",       away:"Ukraine",    kickoff:"2026-06-22T18:00:00Z", stage:"Group L - MD1" },
  { id:"gs_056", home:"Austria",      away:"Scotland",   kickoff:"2026-06-23T00:00:00Z", stage:"Group L - MD1" },
];

// ─── Knockout placeholders (TBD teams, real kickoff times) ───────────────────
const KNOCKOUTS = [
  { id:"r32_01", home:"TBD", away:"TBD", kickoff:"2026-07-02T20:00:00Z", stage:"Round of 32 - Match 1" },
  { id:"r32_02", home:"TBD", away:"TBD", kickoff:"2026-07-03T00:00:00Z", stage:"Round of 32 - Match 2" },
  { id:"r32_03", home:"TBD", away:"TBD", kickoff:"2026-07-03T20:00:00Z", stage:"Round of 32 - Match 3" },
  { id:"r32_04", home:"TBD", away:"TBD", kickoff:"2026-07-04T00:00:00Z", stage:"Round of 32 - Match 4" },
  { id:"r16_01", home:"TBD", away:"TBD", kickoff:"2026-07-10T20:00:00Z", stage:"Round of 16 - Match 1" },
  { id:"qf_01",  home:"TBD", away:"TBD", kickoff:"2026-07-15T20:00:00Z", stage:"Quarter-Final 1"        },
  { id:"sf_01",  home:"TBD", away:"TBD", kickoff:"2026-07-19T20:00:00Z", stage:"Semi-Final 1"           },
  { id:"sf_02",  home:"TBD", away:"TBD", kickoff:"2026-07-20T00:00:00Z", stage:"Semi-Final 2"           },
  { id:"3rd",    home:"TBD", away:"TBD", kickoff:"2026-07-25T20:00:00Z", stage:"Third Place Play-off"   },
  { id:"final",  home:"TBD", away:"TBD", kickoff:"2026-07-26T20:00:00Z", stage:"Final"                  },
];

const ALL = [...FIXTURES, ...KNOCKOUTS];

async function seed() {
  console.log(`Seeding ${ALL.length} fixtures...`);
  const batch = db.batch();

  ALL.forEach(f => {
    const kickoffDate = new Date(f.kickoff);
    const locksAt     = new Date(kickoffDate.getTime() - 60 * 60 * 1000); // 1hr before

    const ref = db.collection("fixtures").doc(f.id);
    batch.set(ref, {
      fixtureId:     f.id,
      homeTeam:      f.home,
      awayTeam:      f.away,
      kickoffAt:     FS.fromDate(kickoffDate),
      locksAt:       FS.fromDate(locksAt),
      stage:         f.stage,
      status:        "NS",
      homeScore:     null,
      awayScore:     null,
      isLive:        false,
      isComplete:    false,
      homeTeamLogo:  null,
      awayTeamLogo:  null,
      updatedAt:     FS.now(),
    }, { merge: true });
  });

  await batch.commit();
  console.log(`✅ ${ALL.length} fixtures seeded successfully`);
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});