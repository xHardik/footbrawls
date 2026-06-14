// scripts/seed-fixtures.cjs
// Run with: node scripts/seed-fixtures.cjs
// Requires: npm install firebase-admin
// Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to your service account JSON
// OR place serviceAccount.json in the same folder and it will auto-load
const { initializeApp, cert, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const path  = require("path");
const fs    = require("fs");

// Auto-load service account if file exists next to script
const saPath = path.join(__dirname, "serviceAccount.json");
if (fs.existsSync(saPath)) {
  const serviceAccount = require(saPath);
  initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

const FIXTURES = [
  // ── GROUP A ──────────────────────────────────────────────────────────────
  { id:"gs_A1", home:"Mexico",       away:"South Africa", kickoff:"2026-06-11T23:00:00Z", stage:"Group A - MD1", done:true,  hs:2, as:0 },
  { id:"gs_A2", home:"South Korea",  away:"Czechia",      kickoff:"2026-06-12T02:00:00Z", stage:"Group A - MD1", done:true,  hs:2, as:1 },
  { id:"gs_A3", home:"Czechia",      away:"South Africa", kickoff:"2026-06-18T17:00:00Z", stage:"Group A - MD2", done:false },
  { id:"gs_A4", home:"Mexico",       away:"South Korea",  kickoff:"2026-06-19T02:00:00Z", stage:"Group A - MD2", done:false },
  { id:"gs_A5", home:"Czechia",      away:"Mexico",       kickoff:"2026-06-24T02:00:00Z", stage:"Group A - MD3", done:false },
  { id:"gs_A6", home:"South Africa", away:"South Korea",  kickoff:"2026-06-24T02:00:00Z", stage:"Group A - MD3", done:false },
  // ── GROUP B ──────────────────────────────────────────────────────────────
  { id:"gs_B1", home:"Canada",       away:"Bosnia and Herzegovina", kickoff:"2026-06-12T20:00:00Z", stage:"Group B - MD1", done:true, hs:1, as:1 },
  { id:"gs_B2", home:"Qatar",        away:"Switzerland",  kickoff:"2026-06-13T20:00:00Z", stage:"Group B - MD1", done:false },
  { id:"gs_B3", home:"Switzerland",  away:"Canada",       kickoff:"2026-06-18T20:00:00Z", stage:"Group B - MD2", done:false },
  { id:"gs_B4", home:"Bosnia and Herzegovina", away:"Qatar", kickoff:"2026-06-19T00:00:00Z", stage:"Group B - MD2", done:false },
  { id:"gs_B5", home:"Bosnia and Herzegovina", away:"Switzerland", kickoff:"2026-06-24T00:00:00Z", stage:"Group B - MD3", done:false },
  { id:"gs_B6", home:"Qatar",        away:"Canada",       kickoff:"2026-06-24T00:00:00Z", stage:"Group B - MD3", done:false },
  // ── GROUP C ──────────────────────────────────────────────────────────────
  { id:"gs_C1", home:"Brazil",       away:"Morocco",      kickoff:"2026-06-13T23:00:00Z", stage:"Group C - MD1", done:false },
  { id:"gs_C2", home:"Haiti",        away:"Scotland",     kickoff:"2026-06-14T02:00:00Z", stage:"Group C - MD1", done:false },
  { id:"gs_C3", home:"Morocco",      away:"Haiti",        kickoff:"2026-06-19T20:00:00Z", stage:"Group C - MD2", done:false },
  { id:"gs_C4", home:"Scotland",     away:"Brazil",       kickoff:"2026-06-20T00:00:00Z", stage:"Group C - MD2", done:false },
  { id:"gs_C5", home:"Morocco",      away:"Scotland",     kickoff:"2026-06-24T23:00:00Z", stage:"Group C - MD3", done:false },
  { id:"gs_C6", home:"Haiti",        away:"Brazil",       kickoff:"2026-06-25T02:00:00Z", stage:"Group C - MD3", done:false },
  // ── GROUP D ──────────────────────────────────────────────────────────────
  { id:"gs_D1", home:"USA",          away:"Paraguay",     kickoff:"2026-06-13T02:00:00Z", stage:"Group D - MD1", done:false },
  { id:"gs_D2", home:"Australia",    away:"Türkiye",      kickoff:"2026-06-14T04:00:00Z", stage:"Group D - MD1", done:false },
  { id:"gs_D3", home:"USA",          away:"Australia",    kickoff:"2026-06-19T20:00:00Z", stage:"Group D - MD2", done:false },
  { id:"gs_D4", home:"Türkiye",      away:"Paraguay",     kickoff:"2026-06-20T04:00:00Z", stage:"Group D - MD2", done:false },
  { id:"gs_D5", home:"Türkiye",      away:"USA",          kickoff:"2026-06-25T03:00:00Z", stage:"Group D - MD3", done:false },
  { id:"gs_D6", home:"Paraguay",     away:"Australia",    kickoff:"2026-06-25T03:00:00Z", stage:"Group D - MD3", done:false },
  // ── GROUP E ──────────────────────────────────────────────────────────────
  { id:"gs_E1", home:"Germany",      away:"Curaçao",      kickoff:"2026-06-14T18:00:00Z", stage:"Group E - MD1", done:false },
  { id:"gs_E2", home:"Ivory Coast",  away:"Ecuador",      kickoff:"2026-06-15T00:00:00Z", stage:"Group E - MD1", done:false },
  { id:"gs_E3", home:"Germany",      away:"Ivory Coast",  kickoff:"2026-06-20T21:00:00Z", stage:"Group E - MD2", done:false },
  { id:"gs_E4", home:"Ecuador",      away:"Curaçao",      kickoff:"2026-06-21T01:00:00Z", stage:"Group E - MD2", done:false },
  { id:"gs_E5", home:"Ecuador",      away:"Germany",      kickoff:"2026-06-25T20:00:00Z", stage:"Group E - MD3", done:false },
  { id:"gs_E6", home:"Curaçao",      away:"Ivory Coast",  kickoff:"2026-06-25T20:00:00Z", stage:"Group E - MD3", done:false },
  // ── GROUP F ──────────────────────────────────────────────────────────────
  { id:"gs_F1", home:"Netherlands",  away:"Japan",        kickoff:"2026-06-14T21:00:00Z", stage:"Group F - MD1", done:false },
  { id:"gs_F2", home:"Sweden",       away:"Tunisia",      kickoff:"2026-06-15T03:00:00Z", stage:"Group F - MD1", done:false },
  { id:"gs_F3", home:"Netherlands",  away:"Sweden",       kickoff:"2026-06-20T18:00:00Z", stage:"Group F - MD2", done:false },
  { id:"gs_F4", home:"Tunisia",      away:"Japan",        kickoff:"2026-06-21T04:00:00Z", stage:"Group F - MD2", done:false },
  { id:"gs_F5", home:"Japan",        away:"Sweden",       kickoff:"2026-06-25T00:00:00Z", stage:"Group F - MD3", done:false },
  { id:"gs_F6", home:"Tunisia",      away:"Netherlands",  kickoff:"2026-06-25T00:00:00Z", stage:"Group F - MD3", done:false },
  // ── GROUP G ──────────────────────────────────────────────────────────────
  { id:"gs_G1", home:"Belgium",      away:"Egypt",        kickoff:"2026-06-15T23:00:00Z", stage:"Group G - MD1", done:false },
  { id:"gs_G2", home:"Iran",         away:"New Zealand",  kickoff:"2026-06-16T02:00:00Z", stage:"Group G - MD1", done:false },
  { id:"gs_G3", home:"Belgium",      away:"Iran",         kickoff:"2026-06-21T20:00:00Z", stage:"Group G - MD2", done:false },
  { id:"gs_G4", home:"New Zealand",  away:"Egypt",        kickoff:"2026-06-22T02:00:00Z", stage:"Group G - MD2", done:false },
  { id:"gs_G5", home:"Egypt",        away:"Iran",         kickoff:"2026-06-27T03:00:00Z", stage:"Group G - MD3", done:false },
  { id:"gs_G6", home:"New Zealand",  away:"Belgium",      kickoff:"2026-06-27T03:00:00Z", stage:"Group G - MD3", done:false },
  // ── GROUP H ──────────────────────────────────────────────────────────────
  { id:"gs_H1", home:"Spain",        away:"Cape Verde",   kickoff:"2026-06-15T18:00:00Z", stage:"Group H - MD1", done:false },
  { id:"gs_H2", home:"Saudi Arabia", away:"Uruguay",      kickoff:"2026-06-16T00:00:00Z", stage:"Group H - MD1", done:false },
  { id:"gs_H3", home:"Spain",        away:"Saudi Arabia", kickoff:"2026-06-21T23:00:00Z", stage:"Group H - MD2", done:false },
  { id:"gs_H4", home:"Uruguay",      away:"Cape Verde",   kickoff:"2026-06-22T02:00:00Z", stage:"Group H - MD2", done:false },
  { id:"gs_H5", home:"Uruguay",      away:"Spain",        kickoff:"2026-06-26T23:00:00Z", stage:"Group H - MD3", done:false },
  { id:"gs_H6", home:"Cape Verde",   away:"Saudi Arabia", kickoff:"2026-06-27T02:00:00Z", stage:"Group H - MD3", done:false },
  // ── GROUP I ──────────────────────────────────────────────────────────────
  { id:"gs_I1", home:"Argentina",    away:"Algeria",      kickoff:"2026-06-16T23:00:00Z", stage:"Group I - MD1", done:false },
  { id:"gs_I2", home:"Nigeria",      away:"DR Congo",     kickoff:"2026-06-17T02:00:00Z", stage:"Group I - MD1", done:false },
  { id:"gs_I3", home:"Argentina",    away:"Nigeria",      kickoff:"2026-06-22T20:00:00Z", stage:"Group I - MD2", done:false },
  { id:"gs_I4", home:"DR Congo",     away:"Algeria",      kickoff:"2026-06-23T00:00:00Z", stage:"Group I - MD2", done:false },
  { id:"gs_I5", home:"DR Congo",     away:"Argentina",    kickoff:"2026-06-27T23:00:00Z", stage:"Group I - MD3", done:false },
  { id:"gs_I6", home:"Algeria",      away:"Nigeria",      kickoff:"2026-06-28T02:00:00Z", stage:"Group I - MD3", done:false },
  // ── GROUP J ──────────────────────────────────────────────────────────────
  { id:"gs_J1", home:"France",       away:"England",      kickoff:"2026-06-17T20:00:00Z", stage:"Group J - MD1", done:false },
  { id:"gs_J2", home:"Senegal",      away:"Uzbekistan",   kickoff:"2026-06-18T00:00:00Z", stage:"Group J - MD1", done:false },
  { id:"gs_J3", home:"France",       away:"Senegal",      kickoff:"2026-06-23T20:00:00Z", stage:"Group J - MD2", done:false },
  { id:"gs_J4", home:"Uzbekistan",   away:"England",      kickoff:"2026-06-24T00:00:00Z", stage:"Group J - MD2", done:false },
  { id:"gs_J5", home:"Uzbekistan",   away:"France",       kickoff:"2026-06-28T23:00:00Z", stage:"Group J - MD3", done:false },
  { id:"gs_J6", home:"England",      away:"Senegal",      kickoff:"2026-06-29T02:00:00Z", stage:"Group J - MD3", done:false },
  // ── GROUP K ──────────────────────────────────────────────────────────────
  { id:"gs_K1", home:"Portugal",     away:"DR Congo",     kickoff:"2026-06-17T23:00:00Z", stage:"Group K - MD1", done:false },
  { id:"gs_K2", home:"Uzbekistan",   away:"Colombia",     kickoff:"2026-06-18T02:00:00Z", stage:"Group K - MD1", done:false },
  { id:"gs_K3", home:"Portugal",     away:"Uzbekistan",   kickoff:"2026-06-23T23:00:00Z", stage:"Group K - MD2", done:false },
  { id:"gs_K4", home:"Colombia",     away:"DR Congo",     kickoff:"2026-06-24T02:00:00Z", stage:"Group K - MD2", done:false },
  { id:"gs_K5", home:"Colombia",     away:"Portugal",     kickoff:"2026-06-29T00:00:00Z", stage:"Group K - MD3", done:false },
  { id:"gs_K6", home:"DR Congo",     away:"Uzbekistan",   kickoff:"2026-06-29T00:00:00Z", stage:"Group K - MD3", done:false },
  // ── GROUP L ──────────────────────────────────────────────────────────────
  { id:"gs_L1", home:"Croatia",      away:"Ghana",        kickoff:"2026-06-18T23:00:00Z", stage:"Group L - MD1", done:false },
  { id:"gs_L2", home:"Panama",       away:"England",      kickoff:"2026-06-19T02:00:00Z", stage:"Group L - MD1", done:false },
  { id:"gs_L3", home:"Croatia",      away:"Panama",       kickoff:"2026-06-24T20:00:00Z", stage:"Group L - MD2", done:false },
  { id:"gs_L4", home:"England",      away:"Ghana",        kickoff:"2026-06-25T00:00:00Z", stage:"Group L - MD2", done:false },
  { id:"gs_L5", home:"England",      away:"Croatia",      kickoff:"2026-06-29T20:00:00Z", stage:"Group L - MD3", done:false },
  { id:"gs_L6", home:"Ghana",        away:"Panama",       kickoff:"2026-06-29T20:00:00Z", stage:"Group L - MD3", done:false },
  // ── KNOCKOUTS ─────────────────────────────────────────────────────────────
  { id:"r32_01", home:"TBD", away:"TBD", kickoff:"2026-07-02T20:00:00Z", stage:"Round of 32 - Match 1",  done:false },
  { id:"r32_02", home:"TBD", away:"TBD", kickoff:"2026-07-03T00:00:00Z", stage:"Round of 32 - Match 2",  done:false },
  { id:"r32_03", home:"TBD", away:"TBD", kickoff:"2026-07-03T20:00:00Z", stage:"Round of 32 - Match 3",  done:false },
  { id:"r32_04", home:"TBD", away:"TBD", kickoff:"2026-07-04T00:00:00Z", stage:"Round of 32 - Match 4",  done:false },
  { id:"r16_01", home:"TBD", away:"TBD", kickoff:"2026-07-10T20:00:00Z", stage:"Round of 16 - Match 1",  done:false },
  { id:"qf_01",  home:"TBD", away:"TBD", kickoff:"2026-07-15T20:00:00Z", stage:"Quarter-Final 1",         done:false },
  { id:"sf_01",  home:"TBD", away:"TBD", kickoff:"2026-07-18T20:00:00Z", stage:"Semi-Final 1",            done:false },
  { id:"sf_02",  home:"TBD", away:"TBD", kickoff:"2026-07-19T00:00:00Z", stage:"Semi-Final 2",            done:false },
  { id:"final",  home:"TBD", away:"TBD", kickoff:"2026-07-19T20:00:00Z", stage:"Final",                   done:false },
];

async function seed() {
  const chunks = [];
  for (let i = 0; i < FIXTURES.length; i += 400) chunks.push(FIXTURES.slice(i, i + 400));

  let total = 0;
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const f of chunk) {
      const ko  = new Date(f.kickoff);
      const ref = db.collection("fixtures").doc(f.id);
      batch.set(ref, {
        fixtureId:  f.id,
        homeTeam:   f.home,
        awayTeam:   f.away,
        kickoffAt:  Timestamp.fromDate(ko),
        locksAt:    Timestamp.fromDate(new Date(ko - 3_600_000)),
        stage:      f.stage,
        status:     f.done ? "FT" : "NS",
        homeScore:  f.done ? (f.hs ?? null) : null,
        awayScore:  f.done ? (f.as ?? null) : null,
        isLive:     false,
        isComplete: f.done ?? false,
      });
    }
    await batch.commit();
    total += chunk.length;
    console.log(`✅ ${total}/${FIXTURES.length} written`);
  }

  console.log("🎉 Done! All fixtures seeded.");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
