const { initializeApp, cert, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
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

const FIXTURES = [

  { id:"gs_A1", home:"Mexico",       away:"South Africa", kickoff:"2026-06-11T18:00:00.000Z", stage:"Group A - MD1", done:true,  hs:2, as:0 },
  { id:"gs_A2", home:"South Korea",  away:"Czechia",      kickoff:"2026-06-11T23:00:00.000Z", stage:"Group A - MD1", done:true,  hs:2, as:1 },
  { id:"gs_A3", home:"Czechia",      away:"South Africa", kickoff:"2026-06-18T16:00:00.000Z", stage:"Group A - MD2", done:true,  hs:0, as:1 },
  { id:"gs_A4", home:"Mexico",       away:"South Korea",  kickoff:"2026-06-19T02:00:00.000Z", stage:"Group A - MD2", done:true,  hs:1, as:0 },
  { id:"gs_A5", home:"Czechia",      away:"Mexico",       kickoff:"2026-06-25T00:00:00.000Z", stage:"Group A - MD3", done:true,  hs:0, as:3 },
  { id:"gs_A6", home:"South Africa", away:"South Korea",  kickoff:"2026-06-25T00:00:00.000Z", stage:"Group A - MD3", done:true,  hs:1, as:0 },

  { id:"gs_B1", home:"Canada",       away:"Bosnia and Herzegovina", kickoff:"2026-06-12T19:00:00.000Z", stage:"Group B - MD1", done:true,  hs:1, as:1 },
  { id:"gs_B2", home:"Qatar",        away:"Switzerland",            kickoff:"2026-06-13T20:00:00.000Z", stage:"Group B - MD1", done:true,  hs:1, as:1 },
  { id:"gs_B3", home:"Switzerland",  away:"Bosnia and Herzegovina", kickoff:"2026-06-18T19:00:00.000Z", stage:"Group B - MD2", done:true,  hs:4, as:1 },
  { id:"gs_B4", home:"Canada",       away:"Qatar",                  kickoff:"2026-06-18T22:00:00.000Z", stage:"Group B - MD2", done:true,  hs:6, as:0 },
  { id:"gs_B5", home:"Switzerland",  away:"Canada",                 kickoff:"2026-06-24T19:00:00.000Z", stage:"Group B - MD3", done:true,  hs:3, as:1 },
  { id:"gs_B6", home:"Bosnia and Herzegovina", away:"Qatar",        kickoff:"2026-06-24T19:00:00.000Z", stage:"Group B - MD3", done:true,  hs:1, as:2 },

  { id:"gs_C1", home:"Brazil",       away:"Morocco",  kickoff:"2026-06-13T19:00:00.000Z", stage:"Group C - MD1", done:true,  hs:1, as:1 },
  { id:"gs_C2", home:"Haiti",        away:"Scotland", kickoff:"2026-06-14T01:00:00.000Z", stage:"Group C - MD1", done:true,  hs:0, as:1 },
  { id:"gs_C3", home:"Scotland",     away:"Morocco",  kickoff:"2026-06-19T22:00:00.000Z", stage:"Group C - MD2", done:true,  hs:0, as:1 },
  { id:"gs_C4", home:"Brazil",       away:"Haiti",    kickoff:"2026-06-20T01:00:00.000Z", stage:"Group C - MD2", done:true,  hs:3, as:0 },
  { id:"gs_C5", home:"Scotland",     away:"Brazil",   kickoff:"2026-06-24T22:00:00.000Z", stage:"Group C - MD3", done:true,  hs:0, as:3 },
  { id:"gs_C6", home:"Morocco",      away:"Haiti",    kickoff:"2026-06-24T22:00:00.000Z", stage:"Group C - MD3", done:true,  hs:4, as:2 },

  { id:"gs_D1", home:"USA",          away:"Paraguay",   kickoff:"2026-06-13T01:00:00.000Z", stage:"Group D - MD1", done:true,  hs:4, as:1 },
  { id:"gs_D2", home:"Australia",    away:"Türkiye",    kickoff:"2026-06-14T04:00:00.000Z", stage:"Group D - MD1", done:true,  hs:2, as:0 },
  { id:"gs_D3", home:"USA",          away:"Australia",  kickoff:"2026-06-19T19:00:00.000Z", stage:"Group D - MD2", done:true,  hs:2, as:0 },
  { id:"gs_D4", home:"Türkiye",      away:"Paraguay",   kickoff:"2026-06-20T04:00:00.000Z", stage:"Group D - MD2", done:true,  hs:0, as:1 },
  { id:"gs_D5", home:"Türkiye",      away:"USA",        kickoff:"2026-06-26T02:00:00.000Z", stage:"Group D - MD3", done:true,  hs:3, as:2 },
  { id:"gs_D6", home:"Paraguay",     away:"Australia",  kickoff:"2026-06-26T02:00:00.000Z", stage:"Group D - MD3", done:true,  hs:0, as:0 },

  { id:"gs_E1", home:"Germany",      away:"Curaçao",      kickoff:"2026-06-14T18:00:00.000Z", stage:"Group E - MD1", done:true,  hs:7, as:1 },
  { id:"gs_E2", home:"Ivory Coast",  away:"Ecuador",      kickoff:"2026-06-14T22:00:00.000Z", stage:"Group E - MD1", done:true,  hs:1, as:0 },
  { id:"gs_E3", home:"Germany",      away:"Ivory Coast",  kickoff:"2026-06-20T20:00:00.000Z", stage:"Group E - MD2", done:true,  hs:2, as:1 },
  { id:"gs_E4", home:"Ecuador",      away:"Curaçao",      kickoff:"2026-06-21T00:00:00.000Z", stage:"Group E - MD2", done:true,  hs:0, as:0 },
  { id:"gs_E5", home:"Ecuador",      away:"Germany",      kickoff:"2026-06-25T20:00:00.000Z", stage:"Group E - MD3", done:true,  hs:2, as:1 },
  { id:"gs_E6", home:"Curaçao",      away:"Ivory Coast",  kickoff:"2026-06-25T20:00:00.000Z", stage:"Group E - MD3", done:true,  hs:0, as:2 },

  { id:"gs_F1", home:"Netherlands",  away:"Japan",    kickoff:"2026-06-14T20:00:00.000Z", stage:"Group F - MD1", done:true,  hs:2, as:2 },
  { id:"gs_F2", home:"Sweden",       away:"Tunisia",  kickoff:"2026-06-15T02:00:00.000Z", stage:"Group F - MD1", done:true,  hs:5, as:1 },
  { id:"gs_F3", home:"Netherlands",  away:"Sweden",   kickoff:"2026-06-20T17:00:00.000Z", stage:"Group F - MD2", done:true,  hs:5, as:1 },
  { id:"gs_F4", home:"Tunisia",      away:"Japan",    kickoff:"2026-06-21T04:00:00.000Z", stage:"Group F - MD2", done:true,  hs:0, as:4 },
  { id:"gs_F5", home:"Japan",        away:"Sweden",   kickoff:"2026-06-25T23:00:00.000Z", stage:"Group F - MD3", done:true,  hs:1, as:1 },
  { id:"gs_F6", home:"Tunisia",      away:"Netherlands", kickoff:"2026-06-25T23:00:00.000Z", stage:"Group F - MD3", done:true, hs:1, as:3 },

  { id:"gs_G1", home:"Belgium",      away:"Egypt",        kickoff:"2026-06-15T22:00:00.000Z", stage:"Group G - MD1", done:true,  hs:1, as:1 },
  { id:"gs_G2", home:"Iran",         away:"New Zealand",  kickoff:"2026-06-16T04:00:00.000Z", stage:"Group G - MD1", done:true,  hs:2, as:2 },
  { id:"gs_G3", home:"Belgium",      away:"Iran",         kickoff:"2026-06-21T19:00:00.000Z", stage:"Group G - MD2", done:true,  hs:3, as:2 },
  { id:"gs_G4", home:"New Zealand",  away:"Egypt",        kickoff:"2026-06-22T01:00:00.000Z", stage:"Group G - MD2", done:true,  hs:1, as:3 },
  { id:"gs_G5", home:"Egypt",        away:"Iran",         kickoff:"2026-06-27T03:00:00.000Z", stage:"Group G - MD3", done:true,  hs:1, as:1 },
  { id:"gs_G6", home:"New Zealand",  away:"Belgium",      kickoff:"2026-06-27T03:00:00.000Z", stage:"Group G - MD3", done:true,  hs:0, as:5 },

  { id:"gs_H1", home:"Spain",        away:"Cape Verde",   kickoff:"2026-06-15T16:00:00.000Z", stage:"Group H - MD1", done:true,  hs:0, as:0 },
  { id:"gs_H2", home:"Saudi Arabia", away:"Uruguay",      kickoff:"2026-06-15T22:00:00.000Z", stage:"Group H - MD1", done:true,  hs:1, as:1 },
  { id:"gs_H3", home:"Spain",        away:"Saudi Arabia", kickoff:"2026-06-21T16:00:00.000Z", stage:"Group H - MD2", done:true,  hs:3, as:0 },
  { id:"gs_H4", home:"Uruguay",      away:"Cape Verde",   kickoff:"2026-06-21T22:00:00.000Z", stage:"Group H - MD2", done:true,  hs:3, as:1 },
  { id:"gs_H5", home:"Uruguay",      away:"Spain",        kickoff:"2026-06-27T00:00:00.000Z", stage:"Group H - MD3", done:true,  hs:1, as:2 },
  { id:"gs_H6", home:"Cape Verde",   away:"Saudi Arabia", kickoff:"2026-06-27T00:00:00.000Z", stage:"Group H - MD3", done:true,  hs:2, as:0 },

  { id:"gs_I1", home:"France",       away:"Senegal",  kickoff:"2026-06-16T19:00:00.000Z", stage:"Group I - MD1", done:true,  hs:3, as:2 },
  { id:"gs_I2", home:"Iraq",         away:"Norway",   kickoff:"2026-06-16T22:00:00.000Z", stage:"Group I - MD1", done:true,  hs:2, as:0 },
  { id:"gs_I3", home:"France",       away:"Iraq",     kickoff:"2026-06-22T21:00:00.000Z", stage:"Group I - MD2", done:true,  hs:4, as:0 },
  { id:"gs_I4", home:"Norway",       away:"Senegal",  kickoff:"2026-06-23T00:00:00.000Z", stage:"Group I - MD2", done:true,  hs:3, as:0 },
  { id:"gs_I5", home:"Norway",       away:"France",   kickoff:"2026-06-26T19:00:00.000Z", stage:"Group I - MD3", done:true,  hs:2, as:1 },
  { id:"gs_I6", home:"Senegal",      away:"Iraq",     kickoff:"2026-06-26T19:00:00.000Z", stage:"Group I - MD3", done:true,  hs:2, as:0 },

  { id:"gs_J1", home:"Argentina",    away:"Algeria",  kickoff:"2026-06-17T01:00:00.000Z", stage:"Group J - MD1", done:true,  hs:3, as:1 },
  { id:"gs_J2", home:"Austria",      away:"Jordan",   kickoff:"2026-06-17T04:00:00.000Z", stage:"Group J - MD1", done:true,  hs:0, as:3 },
  { id:"gs_J3", home:"Argentina",    away:"Austria",  kickoff:"2026-06-22T17:00:00.000Z", stage:"Group J - MD2", done:true,  hs:0, as:2 },
  { id:"gs_J4", home:"Jordan",       away:"Algeria",  kickoff:"2026-06-23T03:00:00.000Z", stage:"Group J - MD2", done:true,  hs:2, as:3 },
  { id:"gs_J5", home:"Algeria",      away:"Austria",  kickoff:"2026-06-28T02:00:00.000Z", stage:"Group J - MD3", done:true,  hs:3, as:3 },
  { id:"gs_J6", home:"Jordan",       away:"Argentina",kickoff:"2026-06-28T02:00:00.000Z", stage:"Group J - MD3", done:true,  hs:1, as:1 },

  { id:"gs_K1", home:"Portugal",     away:"DR Congo",   kickoff:"2026-06-17T17:00:00.000Z", stage:"Group K - MD1", done:true,  hs:2, as:2 },
  { id:"gs_K2", home:"Uzbekistan",   away:"Colombia",   kickoff:"2026-06-18T02:00:00.000Z", stage:"Group K - MD1", done:true,  hs:0, as:1 },
  { id:"gs_K3", home:"Portugal",     away:"Uzbekistan", kickoff:"2026-06-23T17:00:00.000Z", stage:"Group K - MD2", done:true,  hs:0, as:2 },
  { id:"gs_K4", home:"Colombia",     away:"DR Congo",   kickoff:"2026-06-24T02:00:00.000Z", stage:"Group K - MD2", done:true,  hs:1, as:3 },
  { id:"gs_K5", home:"Colombia",     away:"Portugal",   kickoff:"2026-06-27T23:30:00.000Z", stage:"Group K - MD3", done:true,  hs:3, as:0 },
  { id:"gs_K6", home:"DR Congo",     away:"Uzbekistan", kickoff:"2026-06-27T23:30:00.000Z", stage:"Group K - MD3", done:true,  hs:2, as:1 },

  { id:"gs_L1", home:"England",      away:"Croatia",  kickoff:"2026-06-17T20:00:00.000Z", stage:"Group L - MD1", done:true,  hs:1, as:2 },
  { id:"gs_L2", home:"Ghana",        away:"Panama",   kickoff:"2026-06-17T23:00:00.000Z", stage:"Group L - MD1", done:true,  hs:0, as:1 },
  { id:"gs_L3", home:"England",      away:"Ghana",    kickoff:"2026-06-23T20:00:00.000Z", stage:"Group L - MD2", done:true,  hs:3, as:0 },
  { id:"gs_L4", home:"Panama",       away:"Croatia",  kickoff:"2026-06-23T23:00:00.000Z", stage:"Group L - MD2", done:true,  hs:3, as:1 },
  { id:"gs_L5", home:"Panama",       away:"England",  kickoff:"2026-06-27T21:00:00.000Z", stage:"Group L - MD3", done:true,  hs:0, as:2 },
  { id:"gs_L6", home:"Croatia",      away:"Ghana",    kickoff:"2026-06-27T21:00:00.000Z", stage:"Group L - MD3", done:true,  hs:2, as:2 },

  { id:"r32_01", home:"South Africa", away:"Canada",              kickoff:"2026-06-28T19:00:00.000Z", stage:"Round of 32 - Match 1",  done:true,  hs:0, as:1 },
  { id:"r32_02", home:"Brazil",        away:"Japan",               kickoff:"2026-06-29T17:00:00.000Z", stage:"Round of 32 - Match 2",  done:true,  hs:2, as:1 },
  { id:"r32_03", home:"Germany",       away:"Paraguay",            kickoff:"2026-06-29T20:30:00.000Z", stage:"Round of 32 - Match 3",  done:true,  hs:1, as:1, hp:3, ap:4 },
  { id:"r32_04", home:"Netherlands",   away:"Morocco",             kickoff:"2026-06-30T01:00:00.000Z", stage:"Round of 32 - Match 4",  done:true,  hs:1, as:1, hp:2, ap:3 },
  { id:"r32_05", home:"Ivory Coast",   away:"Norway",              kickoff:"2026-06-30T17:00:00.000Z", stage:"Round of 32 - Match 5",  done:true,  hs:0, as:2 },
  { id:"r32_06", home:"France",        away:"Sweden",              kickoff:"2026-06-30T21:00:00.000Z", stage:"Round of 32 - Match 6",  done:true,  hs:3, as:0 },
  { id:"r32_07", home:"Mexico",        away:"Ecuador",             kickoff:"2026-07-01T01:00:00.000Z", stage:"Round of 32 - Match 7",  done:true,  hs:2, as:0 },
  { id:"r32_08", home:"England",       away:"DR Congo",            kickoff:"2026-07-01T16:00:00.000Z", stage:"Round of 32 - Match 8",  done:true,  hs:3, as:1 },
  { id:"r32_09", home:"Belgium",       away:"Senegal",             kickoff:"2026-07-01T20:00:00.000Z", stage:"Round of 32 - Match 9",  done:true,  hs:2, as:0 },
  { id:"r32_10", home:"USA",           away:"Bosnia and Herzegovina", kickoff:"2026-07-02T00:00:00.000Z", stage:"Round of 32 - Match 10", done:true,  hs:2, as:1 },
  { id:"r32_11", home:"Spain",         away:"Austria",             kickoff:"2026-07-02T19:00:00.000Z", stage:"Round of 32 - Match 11", done:true,  hs:2, as:0 },
  { id:"r32_12", home:"Portugal",      away:"Croatia",             kickoff:"2026-07-02T23:00:00.000Z", stage:"Round of 32 - Match 12", done:true,  hs:1, as:0 },
  { id:"r32_13", home:"Switzerland",   away:"Algeria",             kickoff:"2026-07-03T03:00:00.000Z", stage:"Round of 32 - Match 13", done:true,  hs:2, as:0 },
  { id:"r32_14", home:"Australia",     away:"Egypt",               kickoff:"2026-07-03T18:00:00.000Z", stage:"Round of 32 - Match 14", done:true,  hs:1, as:1, hp:2, ap:4 },
  { id:"r32_15", home:"Argentina",     away:"Cape Verde",          kickoff:"2026-07-03T22:00:00Z", stage:"Round of 32 - Match 15", done:true,  hs:3, as:0 },
  { id:"r32_16", home:"Colombia",      away:"Ghana",               kickoff:"2026-07-04T01:30:00.000Z", stage:"Round of 32 - Match 16", done:true,  hs:1, as:0 },

  { id:"r16_01", home:"France",      away:"Paraguay",              kickoff:"2026-07-04T17:00:00.000Z", stage:"Round of 16 - Match 1", done:true, hs:1, as:0 },
  { id:"r16_02", home:"Morocco",     away:"Canada",                kickoff:"2026-07-04T21:00:00.000Z", stage:"Round of 16 - Match 2", done:true, hs:3, as:0 },
  { id:"r16_03", home:"Spain",       away:"Portugal",              kickoff:"2026-07-05T20:00:00.000Z", stage:"Round of 16 - Match 3", done:true, hs:1, as:0 },
  { id:"r16_04", home:"Belgium",     away:"USA",                   kickoff:"2026-07-06T00:00:00.000Z", stage:"Round of 16 - Match 4", done:true, hs:4, as:1 },
  { id:"r16_05", home:"Norway",      away:"Brazil",                kickoff:"2026-07-06T19:00:00.000Z", stage:'Round of 16 - Match 5', done:true, hs:2, as:1 },
  { id:"r16_06", home:"England",     away:"Mexico",                kickoff:"2026-07-06T21:00:00.000Z", stage:"Round of 16 - Match 6", done:true, hs:3, as:2 },
  { id:"r16_07", home:"Argentina",   away:"Egypt",                 kickoff:"2026-07-07T16:00:00.000Z", stage:"Round of 16 - Match 7", done:true, hs:3, as:2 },
  { id:"r16_08", home:"Switzerland", away:"Colombia",              kickoff:"2026-07-07T20:00:00.000Z", stage:"Round of 16 - Match 8", done:true, hs:0, as:0, hp:4, ap:3 },

  { id:"qf_01",  home:"France",      away:"Morocco",               kickoff:"2026-07-09T20:00:00.000Z", stage:"Quarter-Final 1", done:false },
  { id:"qf_02",  home:"Spain",       away:"Belgium",               kickoff:"2026-07-10T19:00:00.000Z", stage:"Quarter-Final 2", done:false },
  { id:"qf_03",  home:"Norway",      away:"England",               kickoff:"2026-07-11T21:00:00.000Z", stage:"Quarter-Final 3", done:false },
  { id:"qf_04",  home:"Argentina",   away:"Switzerland",           kickoff:"2026-07-12T01:00:00.000Z", stage:"Quarter-Final 4", done:false },

  { id:"sf_01",  home:"W QF1",       away:"W QF2",                 kickoff:"2026-07-14T19:00:00.000Z", stage:"Semi-Final 1",    done:false },
  { id:"sf_02",  home:"W QF3",       away:"W QF4",                 kickoff:"2026-07-15T19:00:00.000Z", stage:"Semi-Final 2",    done:false },

  { id:"3rd",    home:"L SF1",       away:"L SF2",                 kickoff:"2026-07-18T21:00:00.000Z", stage:"3rd Place Playoff",done:false },
  { id:"final",  home:"W SF1",       away:"W SF2",                 kickoff:"2026-07-19T19:00:00.000Z", stage:"FINAL",             done:false },
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
        homePens:   f.done ? (f.hp ?? null) : null,
        awayPens:   f.done ? (f.ap ?? null) : null,
        isLive:     false,
        isComplete: f.done ?? false,
      });
    }
    await batch.commit();
    total += chunk.length;
    console.log(`✅ ${total}/${FIXTURES.length} written`);
  }
}

if (require.main === module) {
  seed().catch(err => {
    console.error("❌", err.message);
    process.exit(1);
  });
}

module.exports = { FIXTURES };
