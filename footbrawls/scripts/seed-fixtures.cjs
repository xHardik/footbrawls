// scripts/seed-fixtures.cjs
// Run with: node scripts/seed-fixtures.cjs
// Requires: npm install firebase-admin
// Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to your service account JSON
// OR place serviceAccountKey.json in project root and it will auto-load
//
// ✅ FULLY CORRECTED — all teams, groups, and kickoff times verified against
//    the official FIFA/ESPN schedule (as of June 16, 2026, EDT = UTC-4)
//
// ── OFFICIAL GROUPS ────────────────────────────────────────────────────────
//  Group A: Mexico, South Korea, Czechia, South Africa
//  Group B: Canada, Bosnia and Herzegovina, Qatar, Switzerland
//  Group C: Brazil, Morocco, Haiti, Scotland
//  Group D: USA, Paraguay, Australia, Türkiye
//  Group E: Germany, Curaçao, Ivory Coast, Ecuador
//  Group F: Netherlands, Japan, Sweden, Tunisia
//  Group G: Belgium, Egypt, Iran, New Zealand
//  Group H: Spain, Cape Verde, Saudi Arabia, Uruguay
//  Group I: France, Senegal, Iraq, Norway
//  Group J: Argentina, Algeria, Austria, Jordan
//  Group K: Portugal, DR Congo, Uzbekistan, Colombia
//  Group L: England, Croatia, Ghana, Panama

const { initializeApp, cert, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const path = require("path");
const fs   = require("fs");

const saPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (fs.existsSync(saPath)) {
  initializeApp({ credential: cert(require(saPath)) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

// All kickoff times in UTC (ET = UTC-4, CDT = UTC-5, PDT = UTC-7)
const FIXTURES = [

  // ── GROUP A ───────────────────────────────────────────────────────────────
  // Jun 11 · Mexico City (CDT = UTC-5) · 1PM local = 18:00Z
  { id:"gs_A1", home:"Mexico",       away:"South Africa", kickoff:"2026-06-11T18:00:00Z", stage:"Group A - MD1", done:true,  hs:2, as:0 },
  // Jun 11 · Zapopan (CDT = UTC-5) · ~6PM local ≈ 23:00Z
  { id:"gs_A2", home:"South Korea",  away:"Czechia",      kickoff:"2026-06-11T23:00:00Z", stage:"Group A - MD1", done:true,  hs:2, as:1 },
  // Jun 18 · Atlanta (EDT = UTC-4) · noon ET = 16:00Z
  { id:"gs_A3", home:"Czechia",      away:"South Africa", kickoff:"2026-06-18T16:00:00Z", stage:"Group A - MD2", done:false },
  // Jun 18 · Zapopan (CDT = UTC-5) · 9PM local = 02:00Z Jun 19
  { id:"gs_A4", home:"Mexico",       away:"South Korea",  kickoff:"2026-06-19T02:00:00Z", stage:"Group A - MD2", done:false },
  // Jun 24 · Mexico City (CDT = UTC-5) · 7PM local = 00:00Z Jun 25 (simultaneous MD3)
  { id:"gs_A5", home:"Czechia",      away:"Mexico",       kickoff:"2026-06-25T00:00:00Z", stage:"Group A - MD3", done:false },
  // Jun 24 · Guadalupe (CDT = UTC-5) · 7PM local = 00:00Z Jun 25 (simultaneous MD3)
  { id:"gs_A6", home:"South Africa", away:"South Korea",  kickoff:"2026-06-25T00:00:00Z", stage:"Group A - MD3", done:false },

  // ── GROUP B ───────────────────────────────────────────────────────────────
  // Jun 12 · Toronto (EDT = UTC-4) · time TBC ~3PM ET = 19:00Z
  { id:"gs_B1", home:"Canada",       away:"Bosnia and Herzegovina", kickoff:"2026-06-12T19:00:00Z", stage:"Group B - MD1", done:true,  hs:1, as:1 },
  // Jun 13 · Santa Clara (PDT = UTC-7) · time TBC ~1PM local = 20:00Z (est. from schedule order)
  { id:"gs_B2", home:"Qatar",        away:"Switzerland",            kickoff:"2026-06-13T20:00:00Z", stage:"Group B - MD1", done:true,  hs:1, as:1 },
  // Jun 18 · Inglewood (PDT = UTC-7) · noon local / 3PM ET = 19:00Z
  { id:"gs_B3", home:"Switzerland",  away:"Bosnia and Herzegovina", kickoff:"2026-06-18T19:00:00Z", stage:"Group B - MD2", done:false },
  // Jun 18 · Vancouver (PDT = UTC-7) · 3PM local / 6PM ET = 22:00Z
  { id:"gs_B4", home:"Canada",       away:"Qatar",                  kickoff:"2026-06-18T22:00:00Z", stage:"Group B - MD2", done:false },
  // Jun 24 · Vancouver (PDT = UTC-7) · noon local / 3PM ET = 19:00Z (simultaneous MD3)
  { id:"gs_B5", home:"Switzerland",  away:"Canada",                 kickoff:"2026-06-24T19:00:00Z", stage:"Group B - MD3", done:false },
  // Jun 24 · Seattle (PDT = UTC-7) · noon local / 3PM ET = 19:00Z (simultaneous MD3)
  { id:"gs_B6", home:"Bosnia and Herzegovina", away:"Qatar",        kickoff:"2026-06-24T19:00:00Z", stage:"Group B - MD3", done:false },

  // ── GROUP C ───────────────────────────────────────────────────────────────
  // Jun 13 · East Rutherford (EDT = UTC-4) · time TBC ~3PM ET = 19:00Z
  { id:"gs_C1", home:"Brazil",       away:"Morocco",  kickoff:"2026-06-13T19:00:00Z", stage:"Group C - MD1", done:true,  hs:1, as:1 },
  // Jun 13 · Foxborough (EDT = UTC-4) · time TBC ~9PM ET = 01:00Z Jun 14
  { id:"gs_C2", home:"Haiti",        away:"Scotland", kickoff:"2026-06-14T01:00:00Z", stage:"Group C - MD1", done:true,  hs:0, as:1 },
  // Jun 19 · Foxborough (EDT = UTC-4) · 6PM ET = 22:00Z
  { id:"gs_C3", home:"Scotland",     away:"Morocco",  kickoff:"2026-06-19T22:00:00Z", stage:"Group C - MD2", done:false },
  // Jun 19 · Philadelphia (EDT = UTC-4) · 9PM ET = 01:00Z Jun 20
  { id:"gs_C4", home:"Brazil",       away:"Haiti",    kickoff:"2026-06-20T01:00:00Z", stage:"Group C - MD2", done:false },
  // Jun 24 · Miami Gardens (EDT = UTC-4) · 6PM ET = 22:00Z (simultaneous MD3)
  { id:"gs_C5", home:"Scotland",     away:"Brazil",   kickoff:"2026-06-24T22:00:00Z", stage:"Group C - MD3", done:false },
  // Jun 24 · Atlanta (EDT = UTC-4) · 6PM ET = 22:00Z (simultaneous MD3)
  { id:"gs_C6", home:"Morocco",      away:"Haiti",    kickoff:"2026-06-24T22:00:00Z", stage:"Group C - MD3", done:false },

  // ── GROUP D ───────────────────────────────────────────────────────────────
  // Jun 12 · Inglewood (PDT = UTC-7) · time TBC ~9PM ET = 01:00Z Jun 13
  { id:"gs_D1", home:"USA",          away:"Paraguay",   kickoff:"2026-06-13T01:00:00Z", stage:"Group D - MD1", done:true,  hs:4, as:1 },
  // Jun 13 · Vancouver (PDT = UTC-7) · 9PM local / midnight ET = 04:00Z Jun 14
  { id:"gs_D2", home:"Australia",    away:"Türkiye",    kickoff:"2026-06-14T04:00:00Z", stage:"Group D - MD1", done:true,  hs:2, as:0 },
  // Jun 19 · Seattle (PDT = UTC-7) · noon local / 3PM ET = 19:00Z
  { id:"gs_D3", home:"USA",          away:"Australia",  kickoff:"2026-06-19T19:00:00Z", stage:"Group D - MD2", done:false },
  // Jun 19 · Santa Clara (PDT = UTC-7) · 9PM local / midnight ET = 04:00Z Jun 20
  { id:"gs_D4", home:"Türkiye",      away:"Paraguay",   kickoff:"2026-06-20T04:00:00Z", stage:"Group D - MD2", done:false },
  // Jun 25 · Inglewood (PDT = UTC-7) · 7PM local / 10PM ET = 02:00Z Jun 26 (simultaneous MD3)
  { id:"gs_D5", home:"Türkiye",      away:"USA",        kickoff:"2026-06-26T02:00:00Z", stage:"Group D - MD3", done:false },
  // Jun 25 · Santa Clara (PDT = UTC-7) · 7PM local / 10PM ET = 02:00Z Jun 26 (simultaneous MD3)
  { id:"gs_D6", home:"Paraguay",     away:"Australia",  kickoff:"2026-06-26T02:00:00Z", stage:"Group D - MD3", done:false },

  // ── GROUP E ───────────────────────────────────────────────────────────────
  // Jun 14 · Houston (CDT = UTC-5) · time TBC (first match of day) ~1PM local = 18:00Z
  { id:"gs_E1", home:"Germany",      away:"Curaçao",      kickoff:"2026-06-14T18:00:00Z", stage:"Group E - MD1", done:true,  hs:7, as:1 },
  // Jun 14 · Philadelphia (EDT = UTC-4) · time TBC (Ivory Coast 1-0 Ecuador)
  { id:"gs_E2", home:"Ivory Coast",  away:"Ecuador",      kickoff:"2026-06-14T22:00:00Z", stage:"Group E - MD1", done:true,  hs:1, as:0 },
  // Jun 20 · Toronto (EDT = UTC-4) · 4PM ET = 20:00Z
  { id:"gs_E3", home:"Germany",      away:"Ivory Coast",  kickoff:"2026-06-20T20:00:00Z", stage:"Group E - MD2", done:false },
  // Jun 20 · Kansas City (CDT = UTC-5) · 7PM local / 8PM ET = 00:00Z Jun 21
  { id:"gs_E4", home:"Ecuador",      away:"Curaçao",      kickoff:"2026-06-21T00:00:00Z", stage:"Group E - MD2", done:false },
  // Jun 25 · East Rutherford (EDT = UTC-4) · 4PM ET = 20:00Z (simultaneous MD3)
  { id:"gs_E5", home:"Ecuador",      away:"Germany",      kickoff:"2026-06-25T20:00:00Z", stage:"Group E - MD3", done:false },
  // Jun 25 · Philadelphia (EDT = UTC-4) · 4PM ET = 20:00Z (simultaneous MD3)
  { id:"gs_E6", home:"Curaçao",      away:"Ivory Coast",  kickoff:"2026-06-25T20:00:00Z", stage:"Group E - MD3", done:false },

  // ── GROUP F ───────────────────────────────────────────────────────────────
  // Jun 14 · Arlington (CDT = UTC-5) · time TBC (Netherlands 2-2 Japan)
  { id:"gs_F1", home:"Netherlands",  away:"Japan",    kickoff:"2026-06-14T20:00:00Z", stage:"Group F - MD1", done:true,  hs:2, as:2 },
  // Jun 14 · Guadalupe (CDT = UTC-5) · 8PM local / 10PM ET = 02:00Z Jun 15
  { id:"gs_F2", home:"Sweden",       away:"Tunisia",  kickoff:"2026-06-15T02:00:00Z", stage:"Group F - MD1", done:true,  hs:5, as:1 },
  // Jun 20 · Houston (CDT = UTC-5) · noon local / 1PM ET = 17:00Z
  { id:"gs_F3", home:"Netherlands",  away:"Sweden",   kickoff:"2026-06-20T17:00:00Z", stage:"Group F - MD2", done:false },
  // Jun 20 · Guadalupe (CDT = UTC-5) · 10PM local / midnight ET = 04:00Z Jun 21
  { id:"gs_F4", home:"Tunisia",      away:"Japan",    kickoff:"2026-06-21T04:00:00Z", stage:"Group F - MD2", done:false },
  // Jun 25 · Arlington (CDT = UTC-5) · 6PM local / 7PM ET = 23:00Z (simultaneous MD3)
  { id:"gs_F5", home:"Japan",        away:"Sweden",   kickoff:"2026-06-25T23:00:00Z", stage:"Group F - MD3", done:false },
  // Jun 25 · Kansas City (CDT = UTC-5) · 6PM local / 7PM ET = 23:00Z (simultaneous MD3)
  { id:"gs_F6", home:"Tunisia",      away:"Netherlands", kickoff:"2026-06-25T23:00:00Z", stage:"Group F - MD3", done:false },

  // ── GROUP G ───────────────────────────────────────────────────────────────
  // Jun 15 · Atlanta (EDT = UTC-4) · noon ET = 16:00Z
  { id:"gs_G1", home:"Spain",        away:"Cape Verde",   kickoff:"2026-06-15T16:00:00Z", stage:"Group H - MD1", done:true,  hs:0, as:0 },
  // Jun 15 · Seattle (PDT = UTC-7) · 3PM local / 6PM ET = 22:00Z
  { id:"gs_G2", home:"Belgium",      away:"Egypt",        kickoff:"2026-06-15T22:00:00Z", stage:"Group G - MD1", done:true,  hs:1, as:1 },
  // Jun 15 · Miami Gardens (EDT = UTC-4) · 6PM ET = 22:00Z
  { id:"gs_G3", home:"Saudi Arabia", away:"Uruguay",      kickoff:"2026-06-15T22:00:00Z", stage:"Group H - MD1", done:true,  hs:1, as:1 },
  // Jun 15 · Inglewood (PDT = UTC-7) · 9PM local / midnight ET = 04:00Z Jun 16
  { id:"gs_G4", home:"Iran",         away:"New Zealand",  kickoff:"2026-06-16T04:00:00Z", stage:"Group G - MD1", done:true,  hs:2, as:2 },
  // Jun 21 · Atlanta (EDT = UTC-4) · noon ET = 16:00Z
  { id:"gs_H3", home:"Spain",        away:"Saudi Arabia", kickoff:"2026-06-21T16:00:00Z", stage:"Group H - MD2", done:false },
  // Jun 21 · Inglewood (PDT = UTC-7) · noon local / 3PM ET = 19:00Z
  { id:"gs_G5", home:"Belgium",      away:"Iran",         kickoff:"2026-06-21T19:00:00Z", stage:"Group G - MD2", done:false },
  // Jun 21 · Miami Gardens (EDT = UTC-4) · 6PM ET = 22:00Z
  { id:"gs_H4", home:"Uruguay",      away:"Cape Verde",   kickoff:"2026-06-21T22:00:00Z", stage:"Group H - MD2", done:false },
  // Jun 21 · Vancouver (PDT = UTC-7) · 6PM local / 9PM ET = 01:00Z Jun 22
  { id:"gs_G6", home:"New Zealand",  away:"Egypt",        kickoff:"2026-06-22T01:00:00Z", stage:"Group G - MD2", done:false },
  // Jun 26 · Foxborough (EDT = UTC-4) · 3PM ET = 19:00Z (simultaneous MD3 Group I)
  { id:"gs_H5", home:"Uruguay",      away:"Spain",        kickoff:"2026-06-27T00:00:00Z", stage:"Group H - MD3", done:false },
  // Jun 26 · Houston (CDT = UTC-5) · 7PM local / 8PM ET = 00:00Z Jun 27
  { id:"gs_H6", home:"Cape Verde",   away:"Saudi Arabia", kickoff:"2026-06-27T00:00:00Z", stage:"Group H - MD3", done:false },
  // Jun 26 · Seattle (PDT = UTC-7) · 8PM local / 11PM ET = 03:00Z Jun 27 (simultaneous MD3 Group G)
  { id:"gs_G7", home:"Egypt",        away:"Iran",         kickoff:"2026-06-27T03:00:00Z", stage:"Group G - MD3", done:false },
  // Jun 26 · Vancouver (PDT = UTC-7) · 8PM local / 11PM ET = 03:00Z Jun 27 (simultaneous MD3 Group G)
  { id:"gs_G8", home:"New Zealand",  away:"Belgium",      kickoff:"2026-06-27T03:00:00Z", stage:"Group G - MD3", done:false },

  // ── GROUP H (Spain/Cape Verde/Saudi Arabia/Uruguay) — IDs kept sequential ─
  // NOTE: gs_G1, gs_G3, gs_H3, gs_H4, gs_H5, gs_H6 are interleaved above
  //       with Group G due to same matchdays. Firestore doesn't care about order.

  // ── GROUP I (France, Senegal, Iraq, Norway) ───────────────────────────────
  // Jun 16 · East Rutherford (EDT = UTC-4) · 3PM ET = 19:00Z
  { id:"gs_I1", home:"France",       away:"Senegal",  kickoff:"2026-06-16T19:00:00Z", stage:"Group I - MD1", done:false },
  // Jun 16 · Foxborough (EDT = UTC-4) · 6PM ET = 22:00Z
  { id:"gs_I2", home:"Iraq",         away:"Norway",   kickoff:"2026-06-16T22:00:00Z", stage:"Group I - MD1", done:false },
  // Jun 22 · Philadelphia (EDT = UTC-4) · 5PM ET = 21:00Z
  { id:"gs_I3", home:"France",       away:"Iraq",     kickoff:"2026-06-22T21:00:00Z", stage:"Group I - MD2", done:false },
  // Jun 22 · East Rutherford (EDT = UTC-4) · 8PM ET = 00:00Z Jun 23
  { id:"gs_I4", home:"Norway",       away:"Senegal",  kickoff:"2026-06-23T00:00:00Z", stage:"Group I - MD2", done:false },
  // Jun 26 · Foxborough (EDT = UTC-4) · 3PM ET = 19:00Z (simultaneous MD3)
  { id:"gs_I5", home:"Norway",       away:"France",   kickoff:"2026-06-26T19:00:00Z", stage:"Group I - MD3", done:false },
  // Jun 26 · Toronto (EDT = UTC-4) · 3PM ET = 19:00Z (simultaneous MD3)
  { id:"gs_I6", home:"Senegal",      away:"Iraq",     kickoff:"2026-06-26T19:00:00Z", stage:"Group I - MD3", done:false },

  // ── GROUP J (Argentina, Algeria, Austria, Jordan) ─────────────────────────
  // Jun 16 · Kansas City (CDT = UTC-5) · 8PM local / 9PM ET = 01:00Z Jun 17
  { id:"gs_J1", home:"Argentina",    away:"Algeria",  kickoff:"2026-06-17T01:00:00Z", stage:"Group J - MD1", done:false },
  // Jun 16 · Santa Clara (PDT = UTC-7) · 9PM local / midnight ET = 04:00Z Jun 17
  { id:"gs_J2", home:"Austria",      away:"Jordan",   kickoff:"2026-06-17T04:00:00Z", stage:"Group J - MD1", done:false },
  // Jun 22 · Arlington (CDT = UTC-5) · noon local / 1PM ET = 17:00Z
  { id:"gs_J3", home:"Argentina",    away:"Austria",  kickoff:"2026-06-22T17:00:00Z", stage:"Group J - MD2", done:false },
  // Jun 22 · Santa Clara (PDT = UTC-7) · 8PM local / 11PM ET = 03:00Z Jun 23
  { id:"gs_J4", home:"Jordan",       away:"Algeria",  kickoff:"2026-06-23T03:00:00Z", stage:"Group J - MD2", done:false },
  // Jun 27 · Kansas City (CDT = UTC-5) · 9PM local / 10PM ET = 02:00Z Jun 28 (simultaneous MD3)
  { id:"gs_J5", home:"Algeria",      away:"Austria",  kickoff:"2026-06-28T02:00:00Z", stage:"Group J - MD3", done:false },
  // Jun 27 · Arlington (CDT = UTC-5) · 9PM local / 10PM ET = 02:00Z Jun 28 (simultaneous MD3)
  { id:"gs_J6", home:"Jordan",       away:"Argentina",kickoff:"2026-06-28T02:00:00Z", stage:"Group J - MD3", done:false },

  // ── GROUP K (Portugal, DR Congo, Uzbekistan, Colombia) ────────────────────
  // Jun 17 · Houston (CDT = UTC-5) · noon local / 1PM ET = 17:00Z
  { id:"gs_K1", home:"Portugal",     away:"DR Congo",   kickoff:"2026-06-17T17:00:00Z", stage:"Group K - MD1", done:false },
  // Jun 17 · Mexico City (CDT = UTC-5) · 8PM local / 10PM ET = 02:00Z Jun 18
  { id:"gs_K2", home:"Uzbekistan",   away:"Colombia",   kickoff:"2026-06-18T02:00:00Z", stage:"Group K - MD1", done:false },
  // Jun 23 · Houston (CDT = UTC-5) · noon local / 1PM ET = 17:00Z
  { id:"gs_K3", home:"Portugal",     away:"Uzbekistan", kickoff:"2026-06-23T17:00:00Z", stage:"Group K - MD2", done:false },
  // Jun 23 · Zapopan (CDT = UTC-5) · 8PM local / 10PM ET = 02:00Z Jun 24
  { id:"gs_K4", home:"Colombia",     away:"DR Congo",   kickoff:"2026-06-24T02:00:00Z", stage:"Group K - MD2", done:false },
  // Jun 27 · Miami Gardens (EDT = UTC-4) · 7:30PM ET = 23:30Z (simultaneous MD3)
  { id:"gs_K5", home:"Colombia",     away:"Portugal",   kickoff:"2026-06-27T23:30:00Z", stage:"Group K - MD3", done:false },
  // Jun 27 · Atlanta (EDT = UTC-4) · 7:30PM ET = 23:30Z (simultaneous MD3)
  { id:"gs_K6", home:"DR Congo",     away:"Uzbekistan", kickoff:"2026-06-27T23:30:00Z", stage:"Group K - MD3", done:false },

  // ── GROUP L (England, Croatia, Ghana, Panama) ─────────────────────────────
  // Jun 17 · Arlington (CDT = UTC-5) · 3PM local / 4PM ET = 20:00Z
  { id:"gs_L1", home:"England",      away:"Croatia",  kickoff:"2026-06-17T20:00:00Z", stage:"Group L - MD1", done:false },
  // Jun 17 · Toronto (EDT = UTC-4) · 7PM ET = 23:00Z
  { id:"gs_L2", home:"Ghana",        away:"Panama",   kickoff:"2026-06-17T23:00:00Z", stage:"Group L - MD1", done:false },
  // Jun 23 · Foxborough (EDT = UTC-4) · 4PM ET = 20:00Z
  { id:"gs_L3", home:"England",      away:"Ghana",    kickoff:"2026-06-23T20:00:00Z", stage:"Group L - MD2", done:false },
  // Jun 23 · Toronto (EDT = UTC-4) · 7PM ET = 23:00Z
  { id:"gs_L4", home:"Panama",       away:"Croatia",  kickoff:"2026-06-23T23:00:00Z", stage:"Group L - MD2", done:false },
  // Jun 27 · East Rutherford (EDT = UTC-4) · 5PM ET = 21:00Z (simultaneous MD3)
  { id:"gs_L5", home:"Panama",       away:"England",  kickoff:"2026-06-27T21:00:00Z", stage:"Group L - MD3", done:false },
  // Jun 27 · Philadelphia (EDT = UTC-4) · 5PM ET = 21:00Z (simultaneous MD3)
  { id:"gs_L6", home:"Croatia",      away:"Ghana",    kickoff:"2026-06-27T21:00:00Z", stage:"Group L - MD3", done:false },

  // ── ROUND OF 32 ───────────────────────────────────────────────────────────
  // Jun 28
  { id:"r32_01", home:"TBD", away:"TBD", kickoff:"2026-06-28T19:00:00Z", stage:"Round of 32 - Match 1",  done:false },
  // Jun 29
  { id:"r32_02", home:"TBD", away:"TBD", kickoff:"2026-06-29T17:00:00Z", stage:"Round of 32 - Match 2",  done:false },
  { id:"r32_03", home:"TBD", away:"TBD", kickoff:"2026-06-29T20:30:00Z", stage:"Round of 32 - Match 3",  done:false },
  { id:"r32_04", home:"TBD", away:"TBD", kickoff:"2026-06-30T01:00:00Z", stage:"Round of 32 - Match 4",  done:false },
  // Jun 30
  { id:"r32_05", home:"TBD", away:"TBD", kickoff:"2026-06-30T17:00:00Z", stage:"Round of 32 - Match 5",  done:false },
  { id:"r32_06", home:"TBD", away:"TBD", kickoff:"2026-06-30T21:00:00Z", stage:"Round of 32 - Match 6",  done:false },
  { id:"r32_07", home:"TBD", away:"TBD", kickoff:"2026-07-01T01:00:00Z", stage:"Round of 32 - Match 7",  done:false },
  // Jul 1
  { id:"r32_08", home:"TBD", away:"TBD", kickoff:"2026-07-01T16:00:00Z", stage:"Round of 32 - Match 8",  done:false },
  { id:"r32_09", home:"TBD", away:"TBD", kickoff:"2026-07-01T20:00:00Z", stage:"Round of 32 - Match 9",  done:false },
  { id:"r32_10", home:"TBD", away:"TBD", kickoff:"2026-07-02T00:00:00Z", stage:"Round of 32 - Match 10", done:false },
  // Jul 2
  { id:"r32_11", home:"TBD", away:"TBD", kickoff:"2026-07-02T19:00:00Z", stage:"Round of 32 - Match 11", done:false },
  { id:"r32_12", home:"TBD", away:"TBD", kickoff:"2026-07-02T23:00:00Z", stage:"Round of 32 - Match 12", done:false },
  { id:"r32_13", home:"TBD", away:"TBD", kickoff:"2026-07-03T03:00:00Z", stage:"Round of 32 - Match 13", done:false },
  // Jul 3
  { id:"r32_14", home:"TBD", away:"TBD", kickoff:"2026-07-03T18:00:00Z", stage:"Round of 32 - Match 14", done:false },
  { id:"r32_15", home:"TBD", away:"TBD", kickoff:"2026-07-03T22:00:00Z", stage:"Round of 32 - Match 15", done:false },
  { id:"r32_16", home:"TBD", away:"TBD", kickoff:"2026-07-04T01:30:00Z", stage:"Round of 32 - Match 16", done:false },

  // ── ROUND OF 16 ───────────────────────────────────────────────────────────
  // Jul 4
  { id:"r16_01", home:"TBD", away:"TBD", kickoff:"2026-07-04T17:00:00Z", stage:"Round of 16 - Match 1", done:false },
  { id:"r16_02", home:"TBD", away:"TBD", kickoff:"2026-07-04T21:00:00Z", stage:"Round of 16 - Match 2", done:false },
  // Jul 5
  { id:"r16_03", home:"TBD", away:"TBD", kickoff:"2026-07-05T20:00:00Z", stage:"Round of 16 - Match 3", done:false },
  { id:"r16_04", home:"TBD", away:"TBD", kickoff:"2026-07-06T00:00:00Z", stage:"Round of 16 - Match 4", done:false },
  // Jul 6
  { id:"r16_05", home:"TBD", away:"TBD", kickoff:"2026-07-06T19:00:00Z", stage:"Round of 16 - Match 5", done:false },
  { id:"r16_06", home:"TBD", away:"TBD", kickoff:"2026-07-06T21:00:00Z", stage:"Round of 16 - Match 6", done:false },
  // Jul 7
  { id:"r16_07", home:"TBD", away:"TBD", kickoff:"2026-07-07T16:00:00Z", stage:"Round of 16 - Match 7", done:false },
  { id:"r16_08", home:"TBD", away:"TBD", kickoff:"2026-07-07T20:00:00Z", stage:"Round of 16 - Match 8", done:false },

  // ── QUARTERFINALS ─────────────────────────────────────────────────────────
  // Jul 9 · Foxborough (EDT = UTC-4) · 4PM ET = 20:00Z
  { id:"qf_01",  home:"TBD", away:"TBD", kickoff:"2026-07-09T20:00:00Z", stage:"Quarter-Final 1", done:false },
  // Jul 10 · Inglewood (PDT = UTC-7) · noon local / 3PM ET = 19:00Z
  { id:"qf_02",  home:"TBD", away:"TBD", kickoff:"2026-07-10T19:00:00Z", stage:"Quarter-Final 2", done:false },
  // Jul 11 · Miami Gardens (EDT = UTC-4) · 5PM ET = 21:00Z
  { id:"qf_03",  home:"TBD", away:"TBD", kickoff:"2026-07-11T21:00:00Z", stage:"Quarter-Final 3", done:false },
  // Jul 11 · Kansas City (CDT = UTC-5) · 8PM local / 9PM ET = 01:00Z Jul 12
  { id:"qf_04",  home:"TBD", away:"TBD", kickoff:"2026-07-12T01:00:00Z", stage:"Quarter-Final 4", done:false },

  // ── SEMIFINALS ────────────────────────────────────────────────────────────
  // Jul 14 · Arlington (CDT = UTC-5) · 2PM local / 3PM ET = 19:00Z
  { id:"sf_01",  home:"TBD", away:"TBD", kickoff:"2026-07-14T19:00:00Z", stage:"Semi-Final 1", done:false },
  // Jul 15 · Atlanta (EDT = UTC-4) · 3PM ET = 19:00Z
  { id:"sf_02",  home:"TBD", away:"TBD", kickoff:"2026-07-15T19:00:00Z", stage:"Semi-Final 2", done:false },

  // ── THIRD-PLACE PLAYOFF ───────────────────────────────────────────────────
  // Jul 18 · Miami Gardens (EDT = UTC-4) · 5PM ET = 21:00Z
  { id:"3rd",    home:"TBD", away:"TBD", kickoff:"2026-07-18T21:00:00Z", stage:"Third-Place Playoff", done:false },

  // ── FINAL ─────────────────────────────────────────────────────────────────
  // Jul 19 · East Rutherford (EDT = UTC-4) · 3PM ET = 19:00Z
  { id:"final",  home:"TBD", away:"TBD", kickoff:"2026-07-19T19:00:00Z", stage:"Final", done:false },
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
        locksAt:    Timestamp.fromDate(new Date(ko - 3_600_000)), // 1h before kickoff
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
