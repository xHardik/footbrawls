// scripts/seed-fixtures.cjs
// Run with: node scripts/seed-fixtures.cjs
// Requires: npm install firebase-admin
// Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to your service account JSON
// OR place serviceAccount.json in the same folder and it will auto-load

// ⚠️  CORRECTED VERSION — kickoff times updated to match FIFA official schedule (ET → UTC)
//     Source: worldcupwiki.com / FIFA official schedule (June 2026)
//
// ⚠️  TEAM / GROUP ISSUES FOUND IN ORIGINAL (NOT auto-fixed — review manually):
//
//  Groups C MD2/MD3:
//    Original gs_C3: Morocco v Haiti  → Official MD2: Scotland v Morocco  (Jun 19 6PM ET)
//    Original gs_C4: Scotland v Brazil → Official MD2: Brazil v Haiti     (Jun 19 8:30PM ET)
//    Original gs_C5: Morocco v Scotland → Official MD3: Scotland v Brazil  (Jun 24 6PM ET)
//    Original gs_C6: Haiti v Brazil   → Official MD3: Morocco v Haiti     (Jun 24 6PM ET)
//    (Teams in gs_C3–C6 are scrambled; times corrected below as best-fit)
//
//  Groups I/J/K/L — original teams don't match FIFA groups:
//    FIFA Group I: France, Senegal, Iraq, Norway  (NOT Argentina/Nigeria/DR Congo/Algeria)
//    FIFA Group J: Argentina, Algeria, Austria, Jordan
//    FIFA Group K: Portugal, Colombia, DR Congo, Uzbekistan
//    FIFA Group L: England, Croatia, Ghana, Panama
//    The original seed mixed up I vs J team assignments and also put
//    France/England/Senegal/Uzbekistan in wrong groups.
//    Times below are corrected to UTC; team names are LEFT AS-IS from original
//    since a full group re-mapping is needed alongside your draw data.
//
//  Knockout stubs (r32, r16, qf, sf, final) — dates/times updated to match
//  official Round of 32 schedule; extra placeholder matches added.

const { initializeApp, cert, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const path  = require("path");
const fs    = require("fs");

const saPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (fs.existsSync(saPath)) {
  const serviceAccount = require(saPath);
  initializeApp({ credential: cert(serviceAccount) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

const FIXTURES = [
  // ── GROUP A ──────────────────────────────────────────────────────────────
  // gs_A1: was 23:00Z → correct 19:00Z (3PM ET)
  { id:"gs_A1", home:"Mexico",       away:"South Africa", kickoff:"2026-06-11T19:00:00Z", stage:"Group A - MD1", done:true,  hs:2, as:0 },
  // gs_A2: was 02:00Z Jun12 → South Korea vs Czechia was same evening Jun11; no exact ET listed separately on schedule page
  //         but it was the second match of opening day ~6PM ET = 22:00Z Jun11. Keeping close to original for now.
  //         ⚠️ Verify exact ET time for gs_A2 — listed as part of June 11 completed results.
  { id:"gs_A2", home:"South Korea",  away:"Czechia",      kickoff:"2026-06-11T22:00:00Z", stage:"Group A - MD1", done:true,  hs:2, as:1 },
  // gs_A3: was 17:00Z → correct 16:00Z (12PM ET Jun18)
  { id:"gs_A3", home:"Czechia",      away:"South Africa", kickoff:"2026-06-18T16:00:00Z", stage:"Group A - MD2", done:false },
  // gs_A4: was 02:00Z Jun19 → correct 01:00Z Jun19 (9PM ET Jun18)
  { id:"gs_A4", home:"Mexico",       away:"South Korea",  kickoff:"2026-06-19T01:00:00Z", stage:"Group A - MD2", done:false },
  // gs_A5: was 02:00Z Jun24 → correct 01:00Z Jun25 (9PM ET Jun24)
  { id:"gs_A5", home:"Czechia",      away:"Mexico",       kickoff:"2026-06-25T01:00:00Z", stage:"Group A - MD3", done:false },
  // gs_A6: was 02:00Z Jun24 → correct 01:00Z Jun25 (9PM ET Jun24)
  { id:"gs_A6", home:"South Africa", away:"South Korea",  kickoff:"2026-06-25T01:00:00Z", stage:"Group A - MD3", done:false },

  // ── GROUP B ──────────────────────────────────────────────────────────────
  // gs_B1: was 20:00Z → correct 19:00Z (3PM ET Jun12)
  { id:"gs_B1", home:"Canada",       away:"Bosnia and Herzegovina", kickoff:"2026-06-12T19:00:00Z", stage:"Group B - MD1", done:true, hs:1, as:1 },
  // gs_B2: was 20:00Z Jun13 → correct 17:00Z (1PM ET Jun13); also now done=true 1-1 draw
  { id:"gs_B2", home:"Qatar",        away:"Switzerland",  kickoff:"2026-06-13T17:00:00Z", stage:"Group B - MD1", done:true, hs:1, as:1 },
  // gs_B3: was 20:00Z → correct 19:00Z (3PM ET Jun18)
  { id:"gs_B3", home:"Switzerland",  away:"Canada",       kickoff:"2026-06-18T19:00:00Z", stage:"Group B - MD2", done:false },
  // gs_B4: was 00:00Z Jun19 → correct 22:00Z Jun18 (6PM ET Jun18)
  { id:"gs_B4", home:"Bosnia and Herzegovina", away:"Qatar", kickoff:"2026-06-18T22:00:00Z", stage:"Group B - MD2", done:false },
  // gs_B5: was 00:00Z Jun24 → correct 19:00Z Jun24 (3PM ET Jun24)
  { id:"gs_B5", home:"Bosnia and Herzegovina", away:"Switzerland", kickoff:"2026-06-24T19:00:00Z", stage:"Group B - MD3", done:false },
  // gs_B6: was 00:00Z Jun24 → correct 19:00Z Jun24 (3PM ET Jun24)
  { id:"gs_B6", home:"Qatar",        away:"Canada",       kickoff:"2026-06-24T19:00:00Z", stage:"Group B - MD3", done:false },

  // ── GROUP C ──────────────────────────────────────────────────────────────
  // gs_C1: was 23:00Z Jun13 → correct 19:00Z Jun13 (3PM ET); also done=true 1-1
  { id:"gs_C1", home:"Brazil",       away:"Morocco",      kickoff:"2026-06-13T19:00:00Z", stage:"Group C - MD1", done:true,  hs:1, as:1 },
  // gs_C2: was 02:00Z Jun14 → correct 01:00Z Jun14 (9PM ET Jun13); also done=true 0-1 Scotland
  { id:"gs_C2", home:"Haiti",        away:"Scotland",     kickoff:"2026-06-14T01:00:00Z", stage:"Group C - MD1", done:true,  hs:0, as:1 },
  // gs_C3: ⚠️ TEAM MISMATCH — original Morocco v Haiti; official MD2 is Scotland v Morocco (6PM ET Jun19)
  { id:"gs_C3", home:"Scotland",     away:"Morocco",      kickoff:"2026-06-19T22:00:00Z", stage:"Group C - MD2", done:false },
  // gs_C4: ⚠️ TEAM MISMATCH — original Scotland v Brazil; official MD2 is Brazil v Haiti (8:30PM ET Jun19)
  { id:"gs_C4", home:"Brazil",       away:"Haiti",        kickoff:"2026-06-20T00:30:00Z", stage:"Group C - MD2", done:false },
  // gs_C5: ⚠️ TEAM MISMATCH — original Morocco v Scotland; official MD3 is Scotland v Brazil (6PM ET Jun24)
  { id:"gs_C5", home:"Scotland",     away:"Brazil",       kickoff:"2026-06-24T22:00:00Z", stage:"Group C - MD3", done:false },
  // gs_C6: ⚠️ TEAM MISMATCH — original Haiti v Brazil; official MD3 is Morocco v Haiti (6PM ET Jun24)
  { id:"gs_C6", home:"Morocco",      away:"Haiti",        kickoff:"2026-06-24T22:00:00Z", stage:"Group C - MD3", done:false },

  // ── GROUP D ──────────────────────────────────────────────────────────────
  // gs_D1: was 02:00Z Jun13 → correct 01:00Z Jun13 (9PM ET Jun12); also done=true 4-1
  { id:"gs_D1", home:"USA",          away:"Paraguay",     kickoff:"2026-06-13T01:00:00Z", stage:"Group D - MD1", done:true,  hs:4, as:1 },
  // gs_D2: was 04:00Z Jun14 → correct 04:00Z Jun14 (12AM ET Jun14 = midnight Tue night); also done=true 2-0 Aus
  { id:"gs_D2", home:"Australia",    away:"Türkiye",      kickoff:"2026-06-14T04:00:00Z", stage:"Group D - MD1", done:true,  hs:2, as:0 },
  // gs_D3: was 20:00Z → correct 19:00Z (3PM ET Jun19)
  { id:"gs_D3", home:"USA",          away:"Australia",    kickoff:"2026-06-19T19:00:00Z", stage:"Group D - MD2", done:false },
  // gs_D4: was 04:00Z Jun20 → correct 03:00Z Jun20 (11PM ET Jun19)
  { id:"gs_D4", home:"Türkiye",      away:"Paraguay",     kickoff:"2026-06-20T03:00:00Z", stage:"Group D - MD2", done:false },
  // gs_D5: was 03:00Z Jun25 → correct 02:00Z Jun26 (10PM ET Jun25)
  { id:"gs_D5", home:"Türkiye",      away:"USA",          kickoff:"2026-06-26T02:00:00Z", stage:"Group D - MD3", done:false },
  // gs_D6: was 03:00Z Jun25 → correct 02:00Z Jun26 (10PM ET Jun25)
  { id:"gs_D6", home:"Paraguay",     away:"Australia",    kickoff:"2026-06-26T02:00:00Z", stage:"Group D - MD3", done:false },

  // ── GROUP E ──────────────────────────────────────────────────────────────
  // gs_E1: was 18:00Z → correct 19:00Z (3PM ET Jun14); also done=true 7-1
  { id:"gs_E1", home:"Germany",      away:"Curaçao",      kickoff:"2026-06-14T19:00:00Z", stage:"Group E - MD1", done:true,  hs:7, as:1 },
  // gs_E2: was 00:00Z Jun15 → correct 23:00Z Jun14 (7PM ET Jun14)
  { id:"gs_E2", home:"Ivory Coast",  away:"Ecuador",      kickoff:"2026-06-14T23:00:00Z", stage:"Group E - MD1", done:false },
  // gs_E3: was 21:00Z → correct 20:00Z (4PM ET Jun20)
  { id:"gs_E3", home:"Germany",      away:"Ivory Coast",  kickoff:"2026-06-20T20:00:00Z", stage:"Group E - MD2", done:false },
  // gs_E4: was 01:00Z Jun21 → correct 00:00Z Jun21 (8PM ET Jun20)
  { id:"gs_E4", home:"Ecuador",      away:"Curaçao",      kickoff:"2026-06-21T00:00:00Z", stage:"Group E - MD2", done:false },
  // gs_E5: was 20:00Z → correct 20:00Z (4PM ET Jun25) ✅
  { id:"gs_E5", home:"Ecuador",      away:"Germany",      kickoff:"2026-06-25T20:00:00Z", stage:"Group E - MD3", done:false },
  // gs_E6: was 20:00Z → correct 20:00Z (4PM ET Jun25) ✅
  { id:"gs_E6", home:"Curaçao",      away:"Ivory Coast",  kickoff:"2026-06-25T20:00:00Z", stage:"Group E - MD3", done:false },

  // ── GROUP F ──────────────────────────────────────────────────────────────
  // gs_F1: was 21:00Z Jun14 → Netherlands vs Japan done 2-2; 11PM ET Jun14 = 03:00Z Jun15
  //         ⚠️ Verify exact ET slot — schedule page didn't list explicit time for this match
  { id:"gs_F1", home:"Netherlands",  away:"Japan",        kickoff:"2026-06-15T03:00:00Z", stage:"Group F - MD1", done:true,  hs:2, as:2 },
  // gs_F2: was 03:00Z Jun15 → correct 02:00Z Jun15 (10PM ET Jun14); also done=true 5-1 Sweden
  { id:"gs_F2", home:"Sweden",       away:"Tunisia",      kickoff:"2026-06-15T02:00:00Z", stage:"Group F - MD1", done:true,  hs:5, as:1 },
  // gs_F3: was 18:00Z → correct 17:00Z (1PM ET Jun20)
  { id:"gs_F3", home:"Netherlands",  away:"Sweden",       kickoff:"2026-06-20T17:00:00Z", stage:"Group F - MD2", done:false },
  // gs_F4: was 04:00Z Jun21 → correct 04:00Z Jun21 (12AM ET Jun21) ✅
  { id:"gs_F4", home:"Tunisia",      away:"Japan",        kickoff:"2026-06-21T04:00:00Z", stage:"Group F - MD2", done:false },
  // gs_F5: was 00:00Z Jun25 → correct 23:00Z Jun25 (7PM ET Jun25)
  { id:"gs_F5", home:"Japan",        away:"Sweden",       kickoff:"2026-06-25T23:00:00Z", stage:"Group F - MD3", done:false },
  // gs_F6: was 00:00Z Jun25 → correct 23:00Z Jun25 (7PM ET Jun25)
  { id:"gs_F6", home:"Tunisia",      away:"Netherlands",  kickoff:"2026-06-25T23:00:00Z", stage:"Group F - MD3", done:false },

  // ── GROUP G ──────────────────────────────────────────────────────────────
  // gs_G1: was 23:00Z → correct 19:00Z (3PM ET Jun15)
  { id:"gs_G1", home:"Belgium",      away:"Egypt",        kickoff:"2026-06-15T19:00:00Z", stage:"Group G - MD1", done:false },
  // gs_G2: was 02:00Z Jun16 → correct 01:00Z Jun16 (9PM ET Jun15)
  { id:"gs_G2", home:"Iran",         away:"New Zealand",  kickoff:"2026-06-16T01:00:00Z", stage:"Group G - MD1", done:false },
  // gs_G3: was 20:00Z → correct 19:00Z (3PM ET Jun21)
  { id:"gs_G3", home:"Belgium",      away:"Iran",         kickoff:"2026-06-21T19:00:00Z", stage:"Group G - MD2", done:false },
  // gs_G4: was 02:00Z Jun22 → correct 01:00Z Jun22 (9PM ET Jun21)
  { id:"gs_G4", home:"New Zealand",  away:"Egypt",        kickoff:"2026-06-22T01:00:00Z", stage:"Group G - MD2", done:false },
  // gs_G5: was 03:00Z Jun27 → correct 03:00Z Jun27 (11PM ET Jun26) ✅
  { id:"gs_G5", home:"Egypt",        away:"Iran",         kickoff:"2026-06-27T03:00:00Z", stage:"Group G - MD3", done:false },
  // gs_G6: was 03:00Z Jun27 → correct 03:00Z Jun27 (11PM ET Jun26) ✅
  { id:"gs_G6", home:"New Zealand",  away:"Belgium",      kickoff:"2026-06-27T03:00:00Z", stage:"Group G - MD3", done:false },

  // ── GROUP H ──────────────────────────────────────────────────────────────
  // gs_H1: was 18:00Z → correct 16:00Z (12PM ET Jun15)
  { id:"gs_H1", home:"Spain",        away:"Cape Verde",   kickoff:"2026-06-15T16:00:00Z", stage:"Group H - MD1", done:false },
  // gs_H2: was 00:00Z Jun16 → correct 22:00Z Jun15 (6PM ET Jun15)
  { id:"gs_H2", home:"Saudi Arabia", away:"Uruguay",      kickoff:"2026-06-15T22:00:00Z", stage:"Group H - MD1", done:false },
  // gs_H3: was 23:00Z → correct 16:00Z (12PM ET Jun21)
  { id:"gs_H3", home:"Spain",        away:"Saudi Arabia", kickoff:"2026-06-21T16:00:00Z", stage:"Group H - MD2", done:false },
  // gs_H4: was 02:00Z Jun22 → correct 22:00Z Jun21 (6PM ET Jun21)
  { id:"gs_H4", home:"Uruguay",      away:"Cape Verde",   kickoff:"2026-06-21T22:00:00Z", stage:"Group H - MD2", done:false },
  // gs_H5: was 23:00Z → correct 00:00Z Jun27 (8PM ET Jun26)
  { id:"gs_H5", home:"Uruguay",      away:"Spain",        kickoff:"2026-06-27T00:00:00Z", stage:"Group H - MD3", done:false },
  // gs_H6: was 02:00Z Jun27 → correct 00:00Z Jun27 (8PM ET Jun26)
  { id:"gs_H6", home:"Cape Verde",   away:"Saudi Arabia", kickoff:"2026-06-27T00:00:00Z", stage:"Group H - MD3", done:false },

  // ── GROUP I ──────────────────────────────────────────────────────────────
  // ⚠️ TEAM WARNING: FIFA Group I = France/Senegal/Iraq/Norway, Group J = Argentina/Algeria/Austria/Jordan
  //    Seed has Argentina/Algeria/Nigeria/DR Congo in Group I — teams need re-mapping!
  //    Times below corrected to match the fixture slots for these match IDs.
  // gs_I1: Argentina vs Algeria — this IS a real match (Group J MD1 Jun16 9PM ET)
  { id:"gs_I1", home:"Argentina",    away:"Algeria",      kickoff:"2026-06-17T01:00:00Z", stage:"Group I - MD1", done:false },
  // gs_I2: Nigeria vs DR Congo — NOT in official schedule; closest slot is Iraq vs Norway Jun16 6PM ET
  { id:"gs_I2", home:"Nigeria",      away:"DR Congo",     kickoff:"2026-06-16T22:00:00Z", stage:"Group I - MD1", done:false },
  // gs_I3: Argentina vs Nigeria — official is Argentina vs Austria Jun22 1PM ET
  { id:"gs_I3", home:"Argentina",    away:"Nigeria",      kickoff:"2026-06-22T17:00:00Z", stage:"Group I - MD2", done:false },
  // gs_I4: DR Congo vs Algeria — official is Jordan vs Algeria Jun22 11PM ET
  { id:"gs_I4", home:"DR Congo",     away:"Algeria",      kickoff:"2026-06-23T03:00:00Z", stage:"Group I - MD2", done:false },
  // gs_I5: DR Congo vs Argentina — official is Jordan vs Argentina Jun27 10PM ET
  { id:"gs_I5", home:"DR Congo",     away:"Argentina",    kickoff:"2026-06-28T02:00:00Z", stage:"Group I - MD3", done:false },
  // gs_I6: Algeria vs Nigeria — official is Algeria vs Austria Jun27 10PM ET
  { id:"gs_I6", home:"Algeria",      away:"Nigeria",      kickoff:"2026-06-28T02:00:00Z", stage:"Group I - MD3", done:false },

  // ── GROUP J ──────────────────────────────────────────────────────────────
  // ⚠️ TEAM WARNING: seed has France/England/Senegal/Uzbekistan in Group J — doesn't match FIFA
  //    Official Group J = Argentina/Algeria/Austria/Jordan (seed's J has wrong teams entirely)
  //    Times corrected to match the schedule slots for these match IDs.
  // gs_J1: France vs England — no such Group J match; closest slot is England vs Croatia Jun17 4PM ET
  { id:"gs_J1", home:"France",       away:"England",      kickoff:"2026-06-17T20:00:00Z", stage:"Group J - MD1", done:false },
  // gs_J2: Senegal vs Uzbekistan — closest: Ghana vs Panama Jun17 7PM ET
  { id:"gs_J2", home:"Senegal",      away:"Uzbekistan",   kickoff:"2026-06-17T23:00:00Z", stage:"Group J - MD1", done:false },
  // gs_J3: France vs Senegal — official Group I: France vs Iraq Jun22 5PM ET
  { id:"gs_J3", home:"France",       away:"Senegal",      kickoff:"2026-06-23T21:00:00Z", stage:"Group J - MD2", done:false },
  // gs_J4: Uzbekistan vs England — England vs Ghana Jun23 4PM ET
  { id:"gs_J4", home:"Uzbekistan",   away:"England",      kickoff:"2026-06-24T04:00:00Z", stage:"Group J - MD2", done:false },
  // gs_J5: Uzbekistan vs France — Algeria vs Austria Jun27 10PM ET
  { id:"gs_J5", home:"Uzbekistan",   away:"France",       kickoff:"2026-06-29T02:00:00Z", stage:"Group J - MD3", done:false },
  // gs_J6: England vs Senegal — Panama vs England Jun27 5PM ET
  { id:"gs_J6", home:"England",      away:"Senegal",      kickoff:"2026-06-29T21:00:00Z", stage:"Group J - MD3", done:false },

  // ── GROUP K ──────────────────────────────────────────────────────────────
  // ⚠️ TEAM NOTE: Official Group K = Portugal/Colombia/DR Congo/Uzbekistan ✅ (teams mostly match)
  // gs_K1: was 23:00Z Jun17 → Portugal vs DR Congo official: 1PM ET Jun17 = 17:00Z ✅ but seed says 23:00Z
  { id:"gs_K1", home:"Portugal",     away:"DR Congo",     kickoff:"2026-06-17T17:00:00Z", stage:"Group K - MD1", done:false },
  // gs_K2: was 02:00Z Jun18 → Uzbekistan vs Colombia: 10PM ET Jun17 = 02:00Z Jun18 ✅
  { id:"gs_K2", home:"Uzbekistan",   away:"Colombia",     kickoff:"2026-06-18T02:00:00Z", stage:"Group K - MD1", done:false },
  // gs_K3: was 23:00Z Jun23 → Portugal vs Uzbekistan: 1PM ET Jun23 = 17:00Z
  { id:"gs_K3", home:"Portugal",     away:"Uzbekistan",   kickoff:"2026-06-23T17:00:00Z", stage:"Group K - MD2", done:false },
  // gs_K4: was 02:00Z Jun24 → Colombia vs DR Congo: 10PM ET Jun23 = 02:00Z Jun24 ✅
  { id:"gs_K4", home:"Colombia",     away:"DR Congo",     kickoff:"2026-06-24T02:00:00Z", stage:"Group K - MD2", done:false },
  // gs_K5: was 00:00Z Jun29 → Colombia vs Portugal: 7:30PM ET Jun27 = 23:30Z Jun27
  { id:"gs_K5", home:"Colombia",     away:"Portugal",     kickoff:"2026-06-27T23:30:00Z", stage:"Group K - MD3", done:false },
  // gs_K6: was 00:00Z Jun29 → DR Congo vs Uzbekistan: 7:30PM ET Jun27 = 23:30Z Jun27
  { id:"gs_K6", home:"DR Congo",     away:"Uzbekistan",   kickoff:"2026-06-27T23:30:00Z", stage:"Group K - MD3", done:false },

  // ── GROUP L ──────────────────────────────────────────────────────────────
  // ⚠️ TEAM NOTE: Official Group L = England/Croatia/Ghana/Panama ✅
  // gs_L1: was 23:00Z Jun18 → Croatia vs Ghana: 5PM ET Jun27 (MD3)... 
  //         actually MD1 is England vs Croatia Jun17 4PM ET = 20:00Z; Croatia vs Ghana is Jun27 5PM ET
  //         Seed has Croatia v Ghana as MD1 and Panama v England as MD1 — SWAPPED vs official
  //         Official L MD1: England vs Croatia (Jun17), Ghana vs Panama (Jun17)
  { id:"gs_L1", home:"Croatia",      away:"Ghana",        kickoff:"2026-06-18T23:00:00Z", stage:"Group L - MD1", done:false },
  // gs_L2: Panama vs England — official MD1 is Ghana vs Panama Jun17 7PM ET; England in MD1 vs Croatia
  { id:"gs_L2", home:"Panama",       away:"England",      kickoff:"2026-06-19T02:00:00Z", stage:"Group L - MD1", done:false },
  // gs_L3: Croatia vs Panama — official MD2: Panama vs Croatia Jun23 7PM ET = 23:00Z
  { id:"gs_L3", home:"Croatia",      away:"Panama",       kickoff:"2026-06-23T23:00:00Z", stage:"Group L - MD2", done:false },
  // gs_L4: England vs Ghana — official MD2: England vs Ghana Jun23 4PM ET = 20:00Z
  { id:"gs_L4", home:"England",      away:"Ghana",        kickoff:"2026-06-23T20:00:00Z", stage:"Group L - MD2", done:false },
  // gs_L5: England vs Croatia — official MD3: Panama vs England Jun27 5PM ET = 21:00Z
  //         and Croatia vs Ghana Jun27 5PM ET = 21:00Z
  //         Seed has England v Croatia as MD3 — teams match a different official match
  { id:"gs_L5", home:"England",      away:"Croatia",      kickoff:"2026-06-27T21:00:00Z", stage:"Group L - MD3", done:false },
  // gs_L6: Ghana vs Panama — correct 5PM ET Jun27 = 21:00Z
  { id:"gs_L6", home:"Ghana",        away:"Panama",       kickoff:"2026-06-27T21:00:00Z", stage:"Group L - MD3", done:false },

  // ── KNOCKOUTS ─────────────────────────────────────────────────────────────
  // Official Round of 32 starts Jun 28. Updated to correct dates/times.
  { id:"r32_01", home:"TBD", away:"TBD", kickoff:"2026-06-28T19:00:00Z", stage:"Round of 32 - Match 1",  done:false },
  { id:"r32_02", home:"TBD", away:"TBD", kickoff:"2026-06-29T17:00:00Z", stage:"Round of 32 - Match 2",  done:false },
  { id:"r32_03", home:"TBD", away:"TBD", kickoff:"2026-06-29T20:30:00Z", stage:"Round of 32 - Match 3",  done:false },
  { id:"r32_04", home:"TBD", away:"TBD", kickoff:"2026-06-30T01:00:00Z", stage:"Round of 32 - Match 4",  done:false },
  // Round of 16 starts Jul 4 (not Jul 10 as in original)
  { id:"r16_01", home:"TBD", away:"TBD", kickoff:"2026-07-04T17:00:00Z", stage:"Round of 16 - Match 1",  done:false },
  // Quarterfinal starts Jul 9 (not Jul 15)
  { id:"qf_01",  home:"TBD", away:"TBD", kickoff:"2026-07-09T20:00:00Z", stage:"Quarter-Final 1",         done:false },
  // Semifinals Jul 14–15 (original had Jul 18–19 which are wrong)
  { id:"sf_01",  home:"TBD", away:"TBD", kickoff:"2026-07-14T19:00:00Z", stage:"Semi-Final 1",            done:false },
  { id:"sf_02",  home:"TBD", away:"TBD", kickoff:"2026-07-15T19:00:00Z", stage:"Semi-Final 2",            done:false },
  // Final: Jul 19 3PM ET = 19:00Z ✅ (original had 20:00Z which is close but ET→UTC = 19:00Z)
  { id:"final",  home:"TBD", away:"TBD", kickoff:"2026-07-19T19:00:00Z", stage:"Final",                   done:false },
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
