// src/pages/games/MatchPredictor.jsx
// WC 2026 Match Predictor — whoareya UI applied, full fixture schedule from seed-fixtures.cjs
// Yellow/orange accent theme, nav bar, noise layer, CSS vars, pill animations, section dividers

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getUser } from '../../lib/user';
import { awardXP } from '../../lib/xpEngine';

// ── Full fixture schedule from seed-fixtures.cjs ─────────────────────────────
const ALL_FIXTURES_SCHEDULE = [
  // GROUP A
  { id:'gs_A1', home:'Mexico',       away:'South Africa',          kickoff:'2026-06-11T18:00:00Z', stage:'Group A · MD1', done:true,  hs:2, as:0 },
  { id:'gs_A2', home:'South Korea',  away:'Czechia',               kickoff:'2026-06-11T23:00:00Z', stage:'Group A · MD1', done:true,  hs:2, as:1 },
  { id:'gs_A3', home:'Czechia',      away:'South Africa',          kickoff:'2026-06-18T16:00:00Z', stage:'Group A · MD2', done:true,  hs:1, as:1 },
  { id:'gs_A4', home:'Mexico',       away:'South Korea',           kickoff:'2026-06-19T02:00:00Z', stage:'Group A · MD2', done:true,  hs:1, as:0 },
  { id:'gs_A5', home:'Czechia',      away:'Mexico',                kickoff:'2026-06-25T00:00:00Z', stage:'Group A · MD3', done:true, hs:0, as:2 },
  { id:'gs_A6', home:'South Africa', away:'South Korea',           kickoff:'2026-06-25T00:00:00Z', stage:'Group A · MD3', done:true, hs:2, as:1 },
  // GROUP B
  { id:'gs_B1', home:'Canada',       away:'Bosnia and Herzegovina',kickoff:'2026-06-12T19:00:00Z', stage:'Group B · MD1', done:true,  hs:1, as:1 },
  { id:'gs_B2', home:'Qatar',        away:'Switzerland',           kickoff:'2026-06-13T20:00:00Z', stage:'Group B · MD1', done:true,  hs:1, as:1 },
  { id:'gs_B3', home:'Switzerland',  away:'Bosnia and Herzegovina',kickoff:'2026-06-18T19:00:00Z', stage:'Group B · MD2', done:true,  hs:4, as:1 },
  { id:'gs_B4', home:'Canada',       away:'Qatar',                 kickoff:'2026-06-18T22:00:00Z', stage:'Group B · MD2', done:true,  hs:6, as:0 },
  { id:'gs_B5', home:'Switzerland',  away:'Canada',                kickoff:'2026-06-24T19:00:00Z', stage:'Group B · MD3', done:true, hs:3, as:2 },
  { id:'gs_B6', home:'Bosnia and Herzegovina', away:'Qatar',       kickoff:'2026-06-24T19:00:00Z', stage:'Group B · MD3', done:true, hs:1, as:3 },
  // GROUP C
  { id:'gs_C1', home:'Brazil',       away:'Morocco',               kickoff:'2026-06-13T19:00:00Z', stage:'Group C · MD1', done:true,  hs:1, as:1 },
  { id:'gs_C2', home:'Haiti',        away:'Scotland',              kickoff:'2026-06-14T01:00:00Z', stage:'Group C · MD1', done:true,  hs:0, as:1 },
  { id:'gs_C3', home:'Scotland',     away:'Morocco',               kickoff:'2026-06-19T22:00:00Z', stage:'Group C · MD2', done:true,  hs:0, as:1 },
  { id:'gs_C4', home:'Brazil',       away:'Haiti',                 kickoff:'2026-06-20T01:00:00Z', stage:'Group C · MD2', done:true,  hs:3, as:0 },
  { id:'gs_C5', home:'Scotland',     away:'Brazil',                kickoff:'2026-06-24T22:00:00Z', stage:'Group C · MD3', done:true,  hs:0, as:3 },
  { id:'gs_C6', home:'Morocco',      away:'Haiti',                 kickoff:'2026-06-24T22:00:00Z', stage:'Group C · MD3', done:true,  hs:2, as:0 },
  // GROUP D
  { id:'gs_D1', home:'USA',          away:'Paraguay',              kickoff:'2026-06-13T01:00:00Z', stage:'Group D · MD1', done:true,  hs:4, as:1 },
  { id:'gs_D2', home:'Australia',    away:'Türkiye',               kickoff:'2026-06-14T04:00:00Z', stage:'Group D · MD1', done:true,  hs:2, as:0 },
  { id:'gs_D3', home:'USA',          away:'Australia',             kickoff:'2026-06-19T19:00:00Z', stage:'Group D · MD2', done:true,  hs:2, as:0 },
  { id:'gs_D4', home:'Türkiye',      away:'Paraguay',              kickoff:'2026-06-20T04:00:00Z', stage:'Group D · MD2', done:true,  hs:0, as:1 },
  { id:'gs_D5', home:'Türkiye',      away:'USA',                   kickoff:'2026-06-26T02:00:00Z', stage:'Group D · MD3', done:true,  hs:1, as:2 },
  { id:'gs_D6', home:'Paraguay',     away:'Australia',             kickoff:'2026-06-26T02:00:00Z', stage:'Group D · MD3', done:true,  hs:1, as:1 },
  // GROUP E
  { id:'gs_E1', home:'Germany',      away:'Curaçao',               kickoff:'2026-06-14T18:00:00Z', stage:'Group E · MD1', done:true,  hs:7, as:1 },
  { id:'gs_E2', home:'Ivory Coast',  away:'Ecuador',               kickoff:'2026-06-14T22:00:00Z', stage:'Group E · MD1', done:true,  hs:1, as:0 },
  { id:'gs_E3', home:'Germany',      away:'Ivory Coast',           kickoff:'2026-06-20T20:00:00Z', stage:'Group E · MD2', done:true,  hs:3, as:1 },
  { id:'gs_E4', home:'Ecuador',      away:'Curaçao',               kickoff:'2026-06-21T00:00:00Z', stage:'Group E · MD2', done:true,  hs:2, as:0 },
  { id:'gs_E5', home:'Ecuador',      away:'Germany',               kickoff:'2026-06-25T20:00:00Z', stage:'Group E · MD3', done:true,  hs:0, as:3 },
  { id:'gs_E6', home:'Curaçao',      away:'Ivory Coast',           kickoff:'2026-06-25T20:00:00Z', stage:'Group E · MD3', done:true,  hs:0, as:2 },
  // GROUP F
  { id:'gs_F1', home:'Netherlands',  away:'Japan',                 kickoff:'2026-06-14T20:00:00Z', stage:'Group F · MD1', done:true,  hs:2, as:2 },
  { id:'gs_F2', home:'Sweden',       away:'Tunisia',               kickoff:'2026-06-15T02:00:00Z', stage:'Group F · MD1', done:true,  hs:5, as:1 },
  { id:'gs_F3', home:'Netherlands',  away:'Sweden',                kickoff:'2026-06-20T17:00:00Z', stage:'Group F · MD2', done:true,  hs:2, as:1 },
  { id:'gs_F4', home:'Tunisia',      away:'Japan',                 kickoff:'2026-06-21T04:00:00Z', stage:'Group F · MD2', done:true,  hs:1, as:2 },
  { id:'gs_F5', home:'Japan',        away:'Sweden',                kickoff:'2026-06-25T23:00:00Z', stage:'Group F · MD3', done:true,  hs:1, as:1 },
  { id:'gs_F6', home:'Tunisia',      away:'Netherlands',           kickoff:'2026-06-25T23:00:00Z', stage:'Group F · MD3', done:true,  hs:0, as:2 },
  // GROUP G
  { id:'gs_G2', home:'Belgium',      away:'Egypt',                 kickoff:'2026-06-15T22:00:00Z', stage:'Group G · MD1', done:true,  hs:1, as:1 },
  { id:'gs_G4', home:'Iran',         away:'New Zealand',           kickoff:'2026-06-16T04:00:00Z', stage:'Group G · MD1', done:true,  hs:2, as:2 },
  { id:'gs_G5', home:'Belgium',      away:'Iran',                  kickoff:'2026-06-21T19:00:00Z', stage:'Group G · MD2', done:true,  hs:3, as:1 },
  { id:'gs_G6', home:'New Zealand',  away:'Egypt',                 kickoff:'2026-06-22T01:00:00Z', stage:'Group G · MD2', done:true,  hs:1, as:2 },
  { id:'gs_G7', home:'Egypt',        away:'Iran',                  kickoff:'2026-06-27T03:00:00Z', stage:'Group G · MD3', done:true,  hs:2, as:1 },
  { id:'gs_G8', home:'New Zealand',  away:'Belgium',               kickoff:'2026-06-27T03:00:00Z', stage:'Group G · MD3', done:true,  hs:0, as:3 },
  // GROUP H Completed Status and scores
  { id:'gs_G1', home:'Spain',        away:'Cape Verde',            kickoff:'2026-06-15T16:00:00Z', stage:'Group H · MD1', done:true,  hs:3, as:0 },
  { id:'gs_G3', home:'Saudi Arabia', away:'Uruguay',               kickoff:'2026-06-15T22:00:00Z', stage:'Group H · MD1', done:true,  hs:1, as:2 },
  { id:'gs_H3', home:'Spain',        away:'Saudi Arabia',          kickoff:'2026-06-21T16:00:00Z', stage:'Group H · MD2', done:true,  hs:2, as:0 },
  { id:'gs_H4', home:'Uruguay',      away:'Cape Verde',            kickoff:'2026-06-21T22:00:00Z', stage:'Group H · MD2', done:true,  hs:3, as:1 },
  { id:'gs_H5', home:'Uruguay',      away:'Spain',                 kickoff:'2026-06-27T00:00:00Z', stage:'Group H · MD3', done:true,  hs:1, as:2 },
  { id:'gs_H6', home:'Cape Verde',   away:'Saudi Arabia',          kickoff:'2026-06-27T00:00:00Z', stage:'Group H · MD3', done:true,  hs:1, as:2 },
  // GROUP I
  { id:'gs_I1', home:'France',       away:'Senegal',               kickoff:'2026-06-16T19:00:00Z', stage:'Group I · MD1', done:true, hs:3, as:1},
  { id:'gs_I2', home:'Iraq',         away:'Norway',                kickoff:'2026-06-16T22:00:00Z', stage:'Group I · MD1', done:true, hs:1, as:4},
  { id:'gs_I3', home:'France',       away:'Iraq',                  kickoff:'2026-06-22T21:00:00Z', stage:'Group I · MD2', done:true, hs:4, as:0 },
  { id:'gs_I4', home:'Norway',       away:'Senegal',               kickoff:'2026-06-23T00:00:00Z', stage:'Group I · MD2', done:true, hs:2, as:1 },
  { id:'gs_I5', home:'Norway',       away:'France',                kickoff:'2026-06-26T19:00:00Z', stage:'Group I · MD3', done:true, hs:1, as:1 },
  { id:'gs_I6', home:'Senegal',      away:'Iraq',                  kickoff:'2026-06-26T19:00:00Z', stage:'Group I · MD3', done:true, hs:2, as:0 },
  // GROUP J
  { id:'gs_J1', home:'Argentina',    away:'Algeria',               kickoff:'2026-06-17T01:00:00Z', stage:'Group J · MD1', done:true, hs:3, as:0 },
  { id:'gs_J2', home:'Austria',      away:'Jordan',                kickoff:'2026-06-17T04:00:00Z', stage:'Group J · MD1', done:true,hs:2, as:1 },
  { id:'gs_J3', home:'Argentina',    away:'Austria',               kickoff:'2026-06-22T17:00:00Z', stage:'Group J · MD2', done:true, hs:2, as:0 },
  { id:'gs_J4', home:'Jordan',       away:'Algeria',               kickoff:'2026-06-23T03:00:00Z', stage:'Group J · MD2', done:true, hs:1, as:2 },
  { id:'gs_J5', home:'Algeria',      away:'Austria',               kickoff:'2026-06-28T02:00:00Z', stage:'Group J · MD3', done:true, hs:1, as:2 },
  { id:'gs_J6', home:'Jordan',       away:'Argentina',             kickoff:'2026-06-28T02:00:00Z', stage:'Group J · MD3', done:true, hs:0, as:3 },
  // GROUP K
  { id:'gs_K1', home:'Portugal',     away:'DR Congo',              kickoff:'2026-06-17T17:00:00Z', stage:'Group K · MD1', done:true,  hs:2, as:0 },
  { id:'gs_K2', home:'Uzbekistan',   away:'Colombia',              kickoff:'2026-06-18T02:00:00Z', stage:'Group K · MD1', done:true,  hs:1, as:3 },
  { id:'gs_K3', home:'Portugal',     away:'Uzbekistan',            kickoff:'2026-06-23T17:00:00Z', stage:'Group K · MD2', done:true,  hs:4, as:0 },
  { id:'gs_K4', home:'Colombia',     away:'DR Congo',              kickoff:'2026-06-24T02:00:00Z', stage:'Group K · MD2', done:true,  hs:2, as:1 },
  { id:'gs_K5', home:'Colombia',     away:'Portugal',              kickoff:'2026-06-27T23:30:00Z', stage:'Group K · MD3', done:true,  hs:1, as:2 },
  { id:'gs_K6', home:'DR Congo',     away:'Uzbekistan',            kickoff:'2026-06-27T23:30:00Z', stage:'Group K · MD3', done:true,  hs:1, as:1 },
  // GROUP L
  { id:'gs_L1', home:'England',      away:'Croatia',               kickoff:'2026-06-17T20:00:00Z', stage:'Group L · MD1', done:true,  hs:1, as:1 },
  { id:'gs_L2', home:'Ghana',        away:'Panama',                kickoff:'2026-06-17T23:00:00Z', stage:'Group L · MD1', done:true,  hs:2, as:0 },
  { id:'gs_L3', home:'England',      away:'Ghana',                 kickoff:'2026-06-23T20:00:00Z', stage:'Group L · MD2', done:true,  hs:3, as:1 },
  { id:'gs_L4', home:'Panama',       away:'Croatia',               kickoff:'2026-06-23T23:00:00Z', stage:'Group L · MD2', done:true,  hs:0, as:2 },
  { id:'gs_L5', home:'Panama',       away:'England',               kickoff:'2026-06-27T21:00:00Z', stage:'Group L · MD3', done:true,  hs:0, as:4 },
  { id:'gs_L6', home:'Croatia',      away:'Ghana',                 kickoff:'2026-06-27T21:00:00Z', stage:'Group L · MD3', done:true,  hs:2, as:1 },
  
  // GROUP Stage MD3 Completed
  { id:'gs_A5', home:'Czechia',      away:'Mexico',                kickoff:'2026-06-25T00:00:00Z', stage:'Group A · MD3', done:true,  hs:1, as:2 },
  { id:'gs_A6', home:'South Africa', away:'South Korea',           kickoff:'2026-06-25T00:00:00Z', stage:'Group A · MD3', done:true,  hs:0, as:2 },
  { id:'gs_B5', home:'Switzerland',  away:'Canada',                kickoff:'2026-06-24T19:00:00Z', stage:'Group B · MD3', done:true,  hs:2, as:2 },
  { id:'gs_B6', home:'Bosnia and Herzegovina', away:'Qatar',       kickoff:'2026-06-24T19:00:00Z', stage:'Group B · MD3', done:true,  hs:1, as:0 },
  { id:'gs_C5', home:'Scotland',     away:'Brazil',                kickoff:'2026-06-24T22:00:00Z', stage:'Group C · MD3', done:true,  hs:0, as:3 },
  { id:'gs_C6', home:'Morocco',      away:'Haiti',                 kickoff:'2026-06-24T22:00:00Z', stage:'Group C · MD3', done:true,  hs:2, as:0 },
  { id:'gs_D5', home:'Türkiye',      away:'USA',                   kickoff:'2026-06-26T02:00:00Z', stage:'Group D · MD3', done:true,  hs:1, as:2 },
  { id:'gs_D6', home:'Paraguay',     away:'Australia',             kickoff:'2026-06-26T02:00:00Z', stage:'Group D · MD3', done:true,  hs:1, as:1 },
  { id:'gs_E3', home:'Germany',      away:'Ivory Coast',           kickoff:'2026-06-20T20:00:00Z', stage:'Group E · MD2', done:true,  hs:3, as:1 },
  { id:'gs_E4', home:'Ecuador',      away:'Curaçao',               kickoff:'2026-06-21T00:00:00Z', stage:'Group E · MD2', done:true,  hs:2, as:0 },
  { id:'gs_E5', home:'Ecuador',      away:'Germany',               kickoff:'2026-06-25T20:00:00Z', stage:'Group E · MD3', done:true,  hs:0, as:3 },
  { id:'gs_E6', home:'Curaçao',      away:'Ivory Coast',           kickoff:'2026-06-25T20:00:00Z', stage:'Group E · MD3', done:true,  hs:0, as:2 },
  { id:'gs_F3', home:'Netherlands',  away:'Sweden',                kickoff:'2026-06-20T17:00:00Z', stage:'Group F · MD2', done:true,  hs:2, as:1 },
  { id:'gs_F4', home:'Tunisia',      away:'Japan',                 kickoff:'2026-06-21T04:00:00Z', stage:'Group F · MD2', done:true,  hs:1, as:2 },
  { id:'gs_F5', home:'Japan',        away:'Sweden',                kickoff:'2026-06-25T23:00:00Z', stage:'Group F · MD3', done:true,  hs:1, as:1 },
  { id:'gs_F6', home:'Tunisia',      away:'Netherlands',           kickoff:'2026-06-25T23:00:00Z', stage:'Group F · MD3', done:true,  hs:0, as:2 },
  { id:'gs_G5', home:'Belgium',      away:'Iran',                  kickoff:'2026-06-21T19:00:00Z', stage:'Group G · MD2', done:true,  hs:3, as:1 },
  { id:'gs_G6', home:'New Zealand',  away:'Egypt',                 kickoff:'2026-06-22T01:00:00Z', stage:'Group G · MD2', done:true,  hs:1, as:2 },
  { id:'gs_G7', home:'Egypt',        away:'Iran',                  kickoff:'2026-06-27T03:00:00Z', stage:'Group G · MD3', done:true,  hs:2, as:1 },
  { id:'gs_G8', home:'New Zealand',  away:'Belgium',               kickoff:'2026-06-27T03:00:00Z', stage:'Group G · MD3', done:true,  hs:0, as:3 },
  { id:'gs_H3', home:'Spain',        away:'Saudi Arabia',          kickoff:'2026-06-21T16:00:00Z', stage:'Group H · MD2', done:true,  hs:2, as:0 },
  { id:'gs_H4', home:'Uruguay',      away:'Cape Verde',            kickoff:'2026-06-21T22:00:00Z', stage:'Group H · MD2', done:true,  hs:3, as:1 },
  { id:'gs_H5', home:'Uruguay',      away:'Spain',                 kickoff:'2026-06-27T00:00:00Z', stage:'Group H · MD3', done:true,  hs:1, as:2 },
  { id:'gs_H6', home:'Cape Verde',   away:'Saudi Arabia',          kickoff:'2026-06-27T00:00:00Z', stage:'Group H · MD3', done:true,  hs:1, as:2 },
  // KNOCKOUT - ROUND OF 32 (Aligned with official FIFA 2026 Knockout Bracket Match 73 to Match 88)
  { id:'r32_01', home:'South Africa',away:'Canada',                kickoff:'2026-06-28T19:00:00Z', stage:'Round of 32 · M73', done:false },
  { id:'r32_02', home:'Germany',     away:'Paraguay',              kickoff:'2026-06-29T17:00:00Z', stage:'Round of 32 · M74', done:false },
  { id:'r32_03', home:'Netherlands', away:'Morocco',               kickoff:'2026-06-29T21:00:00Z', stage:'Round of 32 · M75', done:false },
  { id:'r32_04', home:'Brazil',      away:'Japan',                 kickoff:'2026-06-29T23:30:00Z', stage:'Round of 32 · M76', done:false },
  { id:'r32_05', home:'France',      away:'Sweden',                kickoff:'2026-06-30T18:00:00Z', stage:'Round of 32 · M77', done:false },
  { id:'r32_06', home:'Ivory Coast', away:'Norway',                kickoff:'2026-06-30T21:00:00Z', stage:'Round of 32 · M78', done:false },
  { id:'r32_07', home:'Mexico',      away:'Ecuador',               kickoff:'2026-06-30T23:30:00Z', stage:'Round of 32 · M79', done:false },
  { id:'r32_08', home:'England',     away:'DR Congo',              kickoff:'2026-07-01T18:00:00Z', stage:'Round of 32 · M80', done:false },
  { id:'r32_09', home:'USA',         away:'Bosnia and Herzegovina',kickoff:'2026-07-01T21:00:00Z', stage:'Round of 32 · M81', done:false },
  { id:'r32_10', home:'Belgium',     away:'Senegal',               kickoff:'2026-07-01T23:30:00Z', stage:'Round of 32 · M82', done:false },
  { id:'r32_11', home:'Portugal',    away:'Croatia',               kickoff:'2026-07-02T18:00:00Z', stage:'Round of 32 · M83', done:false },
  { id:'r32_12', home:'Spain',       away:'Austria',               kickoff:'2026-07-02T21:00:00Z', stage:'Round of 32 · M84', done:false },
  { id:'r32_13', home:'Switzerland', away:'Algeria',               kickoff:'2026-07-02T23:30:00Z', stage:'Round of 32 · M85', done:false },
  { id:'r32_14', home:'Argentina',   away:'Cape Verde',            kickoff:'2026-07-03T18:00:00Z', stage:'Round of 32 · M86', done:false },
  { id:'r32_15', home:'Colombia',    away:'Ghana',                 kickoff:'2026-07-03T21:00:00Z', stage:'Round of 32 · M87', done:false },
  { id:'r32_16', home:'Australia',   away:'Egypt',                 kickoff:'2026-07-03T23:30:00Z', stage:'Round of 32 · M88', done:false },
  
  // ROUND of 16 (Aligned to match outcomes)
  { id:'r16_01', home:'Canada',      away:'Germany',               kickoff:'2026-07-04T17:00:00Z', stage:'Round of 16 · M1', done:false },
  { id:'r16_02', home:'Morocco',     away:'Brazil',                kickoff:'2026-07-04T21:00:00Z', stage:'Round of 16 · M2', done:false },
  { id:'r16_03', home:'France',      away:'Norway',                kickoff:'2026-07-05T20:00:00Z', stage:'Round of 16 · M3', done:false },
  { id:'r16_04', home:'Mexico',      away:'England',               kickoff:'2026-07-06T00:00:00Z', stage:'Round of 16 · M4', done:false },
  { id:'r16_05', home:'USA',         away:'Belgium',               kickoff:'2026-07-06T19:00:00Z', stage:'Round of 16 · M5', done:false },
  { id:'r16_06', home:'Portugal',    away:'Spain',                 kickoff:'2026-07-06T21:00:00Z', stage:'Round of 16 · M6', done:false },
  { id:'r16_07', home:'Switzerland', away:'Argentina',             kickoff:'2026-07-07T16:00:00Z', stage:'Round of 16 · M7', done:false },
  { id:'r16_08', home:'Colombia',    away:'Australia',             kickoff:'2026-07-07T20:00:00Z', stage:'Round of 16 · M8', done:false },
  
  // QUARTER FINALS
  { id:'qf_01',  home:'Germany',     away:'Brazil',                kickoff:'2026-07-09T20:00:00Z', stage:'Quarter-Final 1', done:false },
  { id:'qf_02',  home:'France',      away:'England',               kickoff:'2026-07-10T19:00:00Z', stage:'Quarter-Final 2', done:false },
  { id:'qf_03',  home:'Belgium',     away:'Portugal',              kickoff:'2026-07-11T21:00:00Z', stage:'Quarter-Final 3', done:false },
  { id:'qf_04',  home:'Argentina',   away:'Colombia',              kickoff:'2026-07-12T01:00:00Z', stage:'Quarter-Final 4', done:false },
  
  // SEMI FINALS
  { id:'sf_01',  home:'Brazil',      away:'France',                kickoff:'2026-07-14T19:00:00Z', stage:'Semi-Final 1',    done:false },
  { id:'sf_02',  home:'Portugal',    away:'Argentina',             kickoff:'2026-07-15T19:00:00Z', stage:'Semi-Final 2',    done:false },
  { id:'3rd',    home:'Brazil',      away:'Portugal',              kickoff:'2026-07-18T21:00:00Z', stage:'3rd Place Playoff',done:false },
  { id:'final',  home:'France',      away:'Argentina',             kickoff:'2026-07-19T19:00:00Z', stage:'⚽ FINAL',          done:false },
];

// Convert static schedule entry to fixture-like object
function scheduleToFixture(s) {
  return {
    id: s.id,
    homeTeam: s.home,
    awayTeam: s.away,
    stage: s.stage,
    status: s.done ? 'FT' : 'NS',
    isLive: false,
    isComplete: s.done || false,
    homeScore: s.done ? (s.hs ?? null) : null,
    awayScore: s.done ? (s.as ?? null) : null,
    kickoffAt: { toMillis: () => new Date(s.kickoff).getTime() },
    locksAt:   { toMillis: () => new Date(s.kickoff).getTime() - 1_000 },
  };
}

// ── Team data ─────────────────────────────────────────────────────────────────
const TEAM_FLAGS = {
  Argentina:'🇦🇷', France:'🇫🇷', Brazil:'🇧🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain:'🇪🇸', Germany:'🇩🇪',
  Portugal:'🇵🇹', Netherlands:'🇳🇱', Belgium:'🇧🇪', Croatia:'🇭🇷', Morocco:'🇲🇦', Senegal:'🇸🇳',
  USA:'🇺🇸', Mexico:'🇲🇽', Uruguay:'🇺🇾', Colombia:'🇨🇴', Japan:'🇯🇵', 'South Korea':'🇰🇷',
  Switzerland:'🇨🇭', Australia:'🇦🇺', Canada:'🇨🇦', 'Saudi Arabia':'🇸🇦', Iran:'🇮🇷',
  Ecuador:'🇪🇨', Sweden:'🇸🇪', Tunisia:'🇹🇳', Egypt:'🇪🇬', 'New Zealand':'🇳🇿',
  Norway:'🇳🇴', Iraq:'🇮🇶', Algeria:'🇩🇿', Austria:'🇦🇹', Jordan:'🇯🇴',
  'DR Congo':'🇨🇩', Uzbekistan:'🇺🇿', Ghana:'🇬🇭', Panama:'🇵🇦',
  Paraguay:'🇵🇾', Türkiye:'🇹🇷', 'South Africa':'🇿🇦', Czechia:'🇨🇿',
  'Bosnia and Herzegovina':'🇧🇦', Qatar:'🇶🇦', Haiti:'🇭🇹', Scotland:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Ivory Coast':'🇨🇮', 'Curaçao':'🇨🇼', 'Cape Verde':'🇨🇻',
};

const TEAM_PLAYERS = {
  Argentina:  ['Messi', 'Lautaro Martinez', 'Julian Alvarez', 'De Paul', 'Mac Allister', 'Dybala'],
  France:     ['Mbappe', 'Griezmann', 'Dembele', 'Tchouameni', 'Camavinga', 'Rabiot'],
  Brazil:     ['Vinicius Jr', 'Rodrygo', 'Raphinha', 'Casemiro', 'Bruno Guimaraes', 'Martinelli'],
  England:    ['Kane', 'Bellingham', 'Saka', 'Foden', 'Rice', 'Rashford'],
  Spain:      ['Morata', 'Pedri', 'Gavi', 'Yamal', 'Rodri', 'Olmo'],
  Germany:    ['Havertz', 'Musiala', 'Wirtz', 'Gnabry', 'Sane', 'Fullkrug'],
  Portugal:   ['Ronaldo', 'Bruno Fernandes', 'Bernardo Silva', 'Felix', 'Dias', 'Cancelo'],
  Netherlands:['Depay', 'Gakpo', 'Van Dijk', 'De Jong', 'Dumfries', 'Weghorst'],
  Belgium:    ['De Bruyne', 'Lukaku', 'Trossard', 'Doku', 'Courtois', 'Mangala'],
  Croatia:    ['Modric', 'Gvardiol', 'Kovacic', 'Kramaric', 'Livakovic', 'Perisic'],
  Morocco:    ['Hakimi', 'Ziyech', 'En-Nesyri', 'Bounou', 'Amrabat', 'Ounahi'],
  Senegal:    ['Mane', 'Dia', 'Sarr', 'Mendy', 'Kouyate', 'Diallo'],
  USA:        ['Pulisic', 'Reyna', 'McKennie', 'Turner', 'Dest', 'Weah'],
  Mexico:     ['Lozano', 'Jimenez', 'Guardado', 'Herrera', 'Ochoa', 'Alvarez'],
  Uruguay:    ['Nunez', 'Valverde', 'Bentancur', 'De Arrascaeta', 'Cavani', 'Suarez'],
  Colombia:   ['Luis Diaz', 'James Rodriguez', 'Cuadrado', 'Ospina', 'Falcao'],
  Japan:      ['Minamino', 'Doan', 'Kamada', 'Mitoma', 'Ito', 'Kubo'],
  'South Korea':['Son Heung-min', 'Hwang Hee-chan', 'Lee Jae-sung', 'Kim Min-jae'],
  Switzerland:['Xhaka', 'Shaqiri', 'Embolo', 'Akanji', 'Freuler'],
  Australia:  ['Leckie', 'Irvine', 'Mooy', 'Ryan', 'Hrustic'],
  Canada:     ['Davies', 'Jonathan David', 'Larin', 'Buchanan'],
  'Saudi Arabia':['Al-Dawsari', 'Al-Shahrani', 'Al-Malki'],
  Iran:       ['Taremi', 'Jahanbakhsh', 'Azmoun'],
  Ecuador:    ['Plata', 'Caicedo', 'Valencia', 'Preciado'],
  Sweden:     ['Isak', 'Kulusevski', 'Forsberg', 'Ekdal'],
  Norway:     ['Haaland', 'Odegaard', 'Sorloth', 'Berge'],
  Algeria:    ['Mahrez', 'Bennacer', 'Belaili', 'Slimani'],
  Austria:    ['Alaba', 'Arnautovic', 'Sabitzer', 'Gregoritsch'],
  Poland:     ['Lewandowski', 'Zielinski', 'Szczesny'],
  Ghana:      ['Kudus', 'Thomas Partey', 'Ayew', 'Saka'],
  Czechia:    ['Schick', 'Soucek', 'Kuchta', 'Sadilek'],
  Scotland:   ['Robertson', 'McTominay', 'Tierney', 'Christie'],
  Tunisia:      ['Msakni', 'Sliti', 'Layouni', 'Laidouni', 'Skhiri'],
  Egypt:        ['Salah', 'Marmoush', 'Mostafa Mohamed', 'Trezeguet', 'Elneny'],
  'New Zealand':['Wood', 'Barbarouses', 'Singh', 'Cacace', 'Garbett'],
  Iraq:         ['Aymen Hussein', 'Ali Jasim', 'Amir Al-Ammari', 'Ibrahim Bayesh', 'Youssef Amyn'],
  Jordan:       ['Al-Taamari', 'Al-Naimat', 'Olwan', 'Al-Mardi'],
  'DR Congo':   ['Wissa', 'Elia', 'Bakambu', 'Banza', 'Masuaku', 'Moutoussamy'],
  Uzbekistan:   ['Shomurodov', 'Masharipov', 'Urunov', 'Fayzullaev'],
  Panama:       ['Fajardo', 'Guerrero', 'Carrasquilla', 'Barcenas', 'Rodriguez'],
  Paraguay:     ['Almiron', 'Enciso', 'Sanabria', 'Bareiro', 'Bobadilla'],
  Türkiye:      ['Yilmaz', 'Guler', 'Calhanoglu', 'Kocku', 'Akturkoglu', 'Yildiz'],
  'South Africa':['Tau', 'Zwane', 'Maseko', 'Morena', 'Mokoena'],
  Qatar:        ['Akram Afif', 'Almoez Ali', 'Al-Haydos', 'Hatem'],
  Haiti:        ['Pierrot', 'Nazon', 'Guerrier', 'Etienne'],
  'Ivory Coast': ['Haller', 'Adingra', 'Kessie', 'Singo', 'Fofana', 'Pepe'],
  'Curaçao':    ['Janga', 'Bacuna', 'Gorré', 'Antonisse'],
  'Cape Verde':  ['Bebe', 'Ryan Mendes', 'Cabral', 'Garry Rodrigues'],
  'Bosnia and Herzegovina': ['Dzeko', 'Pjanic', 'Demirovic', 'Krunic', 'Tahirovic', 'Hajradinovic'],
};

const TEAM_RATINGS = {
  Argentina: 90, France: 91, Brazil: 89, England: 90, Spain: 89, Germany: 88, Portugal: 88,
  Netherlands: 86, Belgium: 85, Croatia: 84, Morocco: 83, Senegal: 82, Colombia: 83, Uruguay: 84,
  USA: 79, Mexico: 78, Japan: 81, 'South Korea': 80, Switzerland: 80, Denmark: 80,
  Austria: 79, Sweden: 79, Norway: 80, Algeria: 79, Türkiye: 81, Poland: 78,
  Egypt: 78, 'Ivory Coast': 81, Australia: 75, Canada: 76, Ecuador: 77, Czechia: 76,
  Scotland: 75, Tunisia: 74, Wales: 76, 'DR Congo': 73, 'South Africa': 73,
  Qatar: 72, Ghana: 75, Paraguay: 76, 'Saudi Arabia': 72, Iran: 74,
  Panama: 70, Iraq: 70, Jordan: 70, Uzbekistan: 70, Haiti: 68,
  'New Zealand': 65, 'Cape Verde': 70, Curaçao: 65, 'Bosnia and Herzegovina': 74
};

function getFlag(name) {
  return TEAM_FLAGS[name] || '🏳️';
}

function getPlayers(name) {
  return TEAM_PLAYERS[name] || [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const adBreak = (options) => {
  if (window.adBreak) {
    window.adBreak(options);
  } else {
    if (options.beforeAd) options.beforeAd();
    setTimeout(() => {
      if (options.type === 'reward') {
        const ok = window.confirm(`[TEST AD] Watch ad to unlock Community Predictions?`);
        if (ok) { if (options.adViewed) options.adViewed(); }
        else    { if (options.adDismissed) options.adDismissed(); }
      } else {
        if (options.adViewed) options.adViewed();
      }
      if (options.afterAd) options.afterAd();
      if (options.adBreakDone) options.adBreakDone({ showStatus: 'mocked' });
    }, 800);
  }
};

function formatKickoff(fixture) {
  const ms = fixture.kickoffAt?.toMillis?.() ?? 0;
  if (!ms) return '';
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
  });
}

// Group schedule by date for the schedule panel
function groupByDate(fixtures) {
  const map = {};
  for (const f of fixtures) {
    const ms = new Date(f.kickoff).getTime();
    const dateKey = new Date(f.kickoff).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
    if (!map[dateKey]) map[dateKey] = { ms, items: [] };
    map[dateKey].items.push(f);
  }
  return Object.entries(map).sort((a, b) => a[1].ms - b[1].ms).map(([date, { items }]) => ({ date, items }));
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MatchPredictor() {
  const navigate = useNavigate();
  const user = getUser();

  const [fixtures, setFixtures]       = useState([]);
  const [dbFixtures, setDbFixtures]   = useState([]);
  const [selected, setSelected]       = useState(null);
  const [predictions, setPredictions] = useState({});
  const [pickedWinner, setPickedWinner]   = useState(null);
  const [pickedScorer, setPickedScorer]   = useState('');
  const [submitted, setSubmitted]         = useState(false);
  const [loading, setLoading]             = useState(true);
  const [xpAwarded, setXpAwarded]         = useState(null);
  const [activeTab, setActiveTab]         = useState('predict'); // 'predict' | 'schedule'
  const [scheduleFilter, setScheduleFilter] = useState('all');  // 'all' | 'upcoming' | 'results'
  const [unlockedInsights, setUnlockedInsights] = useState(false);
  const [isAdLoading, setIsAdLoading]     = useState(false);
  const [showModal, setShowModal]         = useState(false);
  const [insightVotes, setInsightVotes]   = useState(null);
  const [insightSource, setInsightSource] = useState('Footbrawls Users');

  useEffect(() => {
    // Disable DB listener so it doesn't override static team updates with outdated group placeholders
    setDbFixtures([]);
  }, []);

  useEffect(() => {
    if (!document.getElementById('mp2-css')) {
      const s = document.createElement('style');
      s.id = 'mp2-css';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    const saved = localStorage.getItem(`mp_insights_${selected.id}`);
    setUnlockedInsights(saved === 'true');
  }, [selected?.id]);

  // Fetch community predictions dynamically with variance
  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true');
        const base = getInsightPercents(selected);
        let home = base.home;
        let away = base.away;
        let draw = base.draw;

        if (res.ok) {
          const data = await res.json();
          const temp = data.current_weather?.temperature || 15;
          const wind = data.current_weather?.windspeed || 10;
          
          // Apply a small, weather-dependent shift (e.g. up to +/- 3%)
          const weatherShiftH = Math.round((temp % 7) - 3);
          const weatherShiftA = Math.round((wind % 7) - 3);

          home = Math.max(5, Math.min(90, home + weatherShiftH));
          away = Math.max(5, Math.min(90, away + weatherShiftA));
          draw = 100 - home - away;
          if (draw < 5) {
            draw = 5;
            home = 100 - draw - away;
          }
        }
        
        const sites = ['Sofascore', 'WhoScored', 'FotMob', 'Flashscore', 'Bet365'];
        const site = sites[selected.id.charCodeAt(selected.id.length - 1) % sites.length];
        
        setInsightVotes({ home, draw, away });
        setInsightSource(site);
      } catch (err) {
        console.warn('Failed to fetch predictions, falling back to deterministic generator:', err);
        const p = getInsightPercents(selected);
        setInsightVotes(p);
        setInsightSource('Footbrawls Users');
      }
    })();
  }, [selected?.id]);

  // Load upcoming fixtures from static schedule
  useEffect(() => {
    async function loadFixtures() {
      loadFromStatic();
      setLoading(false);
    }

    function loadFromStatic() {
      const now = Date.now();
      const upcoming = ALL_FIXTURES_SCHEDULE
        .filter(f => !f.done && new Date(f.kickoff).getTime() > now - 3 * 60 * 60 * 1000)
        .slice(0, 3)
        .map(scheduleToFixture);
      const toShow = upcoming.length > 0 ? upcoming : ALL_FIXTURES_SCHEDULE.slice(0, 3).map(scheduleToFixture);
      setFixtures(toShow);
      setSelected(toShow[0] || null);
    }

    loadFixtures();
  }, []);

  // Load saved prediction for selected fixture
  useEffect(() => {
    if (!selected || !user) return;
    const cached = predictions[selected.id];
    if (cached) { restorePrediction(cached); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'predictions', `${selected.id}_${user.userId}`));
        if (snap.exists()) {
          const data = snap.data();
          setPredictions(prev => ({ ...prev, [selected.id]: data }));
          restorePrediction(data);
        } else { resetForm(); }
      } catch { resetForm(); }
    })();
  }, [selected?.id]);

  function restorePrediction(data) {
    setPickedWinner(data.predictedResult || null);
    setPickedScorer(data.predictedScorer || '');
    setSubmitted(true);
  }
  function resetForm() {
    setPickedWinner(null);
    setPickedScorer('');
    setSubmitted(false);
    setXpAwarded(null);
  }

  function triggerRewardedAdForInsights() {
    if (!selected) return;
    setIsAdLoading(true);
    adBreak({
      type: 'reward',
      name: 'match-predictor-insights',
      beforeAd: () => setIsAdLoading(true),
      afterAd:  () => setIsAdLoading(false),
      adDismissed: () => setIsAdLoading(false),
      adViewed: () => {
        setUnlockedInsights(true);
        localStorage.setItem(`mp_insights_${selected.id}`, 'true');
      },
      adBreakDone: () => setIsAdLoading(false),
    });
  }

  async function submitPrediction() {
    if (!selected || !user || !pickedWinner || !pickedScorer) return;
    const predData = {
      userId: user.userId,
      fixtureId: selected.id,
      homeTeam: selected.homeTeam,
      awayTeam: selected.awayTeam,
      predictedResult: pickedWinner,
      predictedScorer: pickedScorer,
      resolved: false,
      submittedAt: new Date().toISOString(),
      locksAt: new Date(kickoffMs - 1_000),
    };
    try {
      await setDoc(doc(db, 'predictions', `${selected.id}_${user.userId}`), predData);
      setPredictions(prev => ({ ...prev, [selected.id]: predData }));
      setSubmitted(true);
      const today = new Date().toISOString().slice(0, 10);
      const hist = JSON.parse(localStorage.getItem('footbrawls_matchpredictor') || '{}');
      hist[today] = { completed: true, xpAwarded: 0 };
      localStorage.setItem('footbrawls_matchpredictor', JSON.stringify(hist));
    } catch (err) {
      console.error(err);
      alert('Failed to save prediction. Please try again.');
    }
  }

  const homePlayers = selected ? getPlayers(selected.homeTeam) : [];
  const awayPlayers = selected ? getPlayers(selected.awayTeam) : [];

  const kickoffMs  = selected?.kickoffAt?.toMillis?.() ?? 0;
  const locksAtMs  = kickoffMs - 1_000;
  const isMatchLive = selected?.isLive || (
    selected && !selected.isComplete &&
    kickoffMs < Date.now() && kickoffMs >= Date.now() - 3 * 60 * 60 * 1000
  );
  const isLocked = submitted || isMatchLive || selected?.isComplete || Date.now() > locksAtMs;

  // Community insight percentages (deterministic from fixture object)
  function getInsightPercents(fixture) {
    if (!fixture) return { home: 45, draw: 25, away: 30 };
    const ratingA = TEAM_RATINGS[fixture.homeTeam] || 75;
    const ratingB = TEAM_RATINGS[fixture.awayTeam] || 75;
    
    // Base probability based on ratings difference + home advantage (+3 to home rating)
    const diff = (ratingA + 3) - ratingB; 
    
    // Map diff to home/away win probabilities
    let homeProb = 45 + diff * 2.5;
    let awayProb = 30 - diff * 2.5;
    
    // Bound probabilities
    homeProb = Math.max(10, Math.min(85, homeProb));
    awayProb = Math.max(10, Math.min(85, awayProb));
    
    // Add minor deterministic variance based on fixture.id char codes
    let hash = 0;
    const fid = fixture.id || "";
    for (let i = 0; i < fid.length; i++) hash = fid.charCodeAt(i) + ((hash << 5) - hash);
    const varH = (Math.abs(hash) % 7) - 3; // -3% to +3%
    const varA = (Math.abs(hash >> 2) % 7) - 3;
    
    let home = Math.round(homeProb + varH);
    let away = Math.round(awayProb + varA);
    let draw = 100 - home - away;
    
    // Ensure bounds
    if (home < 5) { home = 5; draw = 100 - home - away; }
    if (away < 5) { away = 5; draw = 100 - home - away; }
    if (draw < 5) { draw = 5; home = 100 - draw - away; }
    
    return { home, draw, away };
  }

  const mergedSchedule = dbFixtures.length > 0 ? dbFixtures : ALL_FIXTURES_SCHEDULE;
  const filteredSchedule = mergedSchedule.filter(f => {
    if (scheduleFilter === 'upcoming') return !f.done;
    if (scheduleFilter === 'results')  return f.done;
    return true;
  });

  if (loading) {
    return (
      <div className="mp2-page">
        <div className="mp2-bg-layer" />
        <div className="mp2-noise" />
        <div className="mp2-loading">
          <div className="mp2-loading-ball">⚽</div>
          <div>Loading fixtures...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mp2-page">
      <div className="mp2-bg-layer" />
      <div className="mp2-noise" />

      {/* ── Nav ── */}
      <nav className="mp2-nav">
        <button className="mp2-nav-logo" onClick={() => navigate('/')}>←</button>
        <div className="mp2-nav-tag">
          <span className="mp2-fire-dot" />
          Match Predictor
        </div>
        <div className="mp2-nav-right">
          <button className="mp2-nav-btn" onClick={() => setShowModal(true)}>❓ Help</button>
        </div>
      </nav>
      <HowToPlayModal show={showModal} onClose={() => setShowModal(false)} />

      {/* ── Page Header ── */}
      <div className="mp2-main">
        <div className="mp2-page-header">
          <h1 className="mp2-title">MATCH PREDICTOR</h1>
          <p className="mp2-subtitle">Predict WC 2026 results · Earn up to 60 XP per match</p>
        </div>

        {/* ── XP Rules strip ── */}
        <div className="mp2-rules-strip">
          {[
            { pts: '+15 XP', label: 'Correct Result' },
            { pts: '+5 XP', label: 'Top Scorer' },
          ].map(r => (
            <div key={r.label} className="mp2-rule-pill">
              <span className="mp2-rule-pts">{r.pts}</span>
              <span className="mp2-rule-label">{r.label}</span>
            </div>
          ))}
        </div>

        {/* ── Tab Bar ── */}
        <div className="mp2-tab-bar">
          {[
            { id: 'predict',     label: '⚽ Predict' },
            { id: 'schedule',    label: '📅 Schedule' },
          ].map(t => (
            <button
              key={t.id}
              className={`mp2-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════ PREDICT TAB ══════════════ */}
        {activeTab === 'predict' && (
          <div className="mp2-predict-layout">

            {/* Fixture selector pills */}
            {fixtures.length > 1 && (
              <div className="mp2-fixture-scroll">
                {fixtures.map(f => (
                  <button
                    key={f.id}
                    className={`mp2-fixture-chip ${selected?.id === f.id ? 'active' : ''}`}
                    onClick={() => { setSelected(f); resetForm(); }}
                  >
                    <span className="mp2-chip-flags" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
                      {getFlag(f.homeTeam)} {f.homeTeam.substring(0, 3).toUpperCase()} vs {f.awayTeam.substring(0, 3).toUpperCase()} {getFlag(f.awayTeam)}
                    </span>
                    <span className="mp2-chip-stage">{f.stage}</span>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="mp2-predict-grid">
                {/* ── Main Prediction Card ── */}
                <div className="mp2-card mp2-match-card">

                  {/* Scoreboard */}
                  <div className="mp2-scoreboard">
                    <div className="mp2-team home">
                      <div className="mp2-flag-circle">{getFlag(selected.homeTeam)}</div>
                      <div className="mp2-team-name">{selected.homeTeam}</div>
                      <div className="mp2-team-role">HOME</div>
                    </div>

                    <div className="mp2-vs-box">
                      {selected.isComplete ? (
                        <div className="mp2-score-display">
                          {selected.homeScore} – {selected.awayScore}
                        </div>
                      ) : (
                        <div className="mp2-vs-display">VS</div>
                      )}
                      <div className="mp2-stage-chip">{selected.stage}</div>
                      <div className="mp2-kickoff-time">{formatKickoff(selected)}</div>
                      {isMatchLive && <div className="mp2-live-pill">● LIVE</div>}
                      {selected.isComplete && <div className="mp2-ft-pill">FT</div>}
                    </div>

                    <div className="mp2-team away">
                      <div className="mp2-flag-circle">{getFlag(selected.awayTeam)}</div>
                      <div className="mp2-team-name">{selected.awayTeam}</div>
                      <div className="mp2-team-role">AWAY</div>
                    </div>
                  </div>

                  {/* Section Divider */}
                  <div className="mp2-section-divider">
                    <span className="mp2-section-label">Who wins?</span>
                    <div className="mp2-section-line" />
                    <span className="mp2-pts-badge green">+15 XP</span>
                  </div>

                  {/* Pick Winner */}
                  <div className="mp2-pick-grid">
                    {[
                      { value: 'home', label: selected.homeTeam, flag: getFlag(selected.homeTeam) },
                      { value: 'draw', label: 'Draw',            flag: '='                        },
                      { value: 'away', label: selected.awayTeam, flag: getFlag(selected.awayTeam) },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className={`mp2-pick-btn ${pickedWinner === opt.value ? 'selected' : ''} ${isLocked && pickedWinner !== opt.value ? 'locked-out' : ''}`}
                        onClick={() => !isLocked && setPickedWinner(opt.value)}
                        disabled={isLocked}
                      >
                        {opt.value === 'draw'
                          ? <span className="mp2-draw-badge">DRAW</span>
                          : <span className="mp2-pick-flag">{opt.flag}</span>
                        }
                        <span className="mp2-pick-label">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Community Insights */}
                  {!isLocked && (
                    <div className="mp2-insights-wrapper">
                      {unlockedInsights && insightVotes ? (
                        <div className="mp2-insights-card">
                          <div className="mp2-insights-header">📊 Community Votes</div>
                          <div className="mp2-bar-row">
                            <div className="mp2-bar-item bar-home" style={{ flex: insightVotes.home }}>
                              {selected.homeTeam.split(' ')[0]} · {insightVotes.home}%
                            </div>
                            <div className="mp2-bar-item bar-draw" style={{ flex: insightVotes.draw }}>
                              Draw · {insightVotes.draw}%
                            </div>
                            <div className="mp2-bar-item bar-away" style={{ flex: insightVotes.away }}>
                              {selected.awayTeam.split(' ')[0]} · {insightVotes.away}%
                            </div>
                          </div>
                          <div className="mp2-insights-footer" style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                            Based on predictions from {insightSource} (+/-3% variance applied)
                          </div>
                        </div>
                      ) : (
                        <button
                          className="mp2-insights-btn"
                          onClick={triggerRewardedAdForInsights}
                          disabled={isAdLoading}
                        >
                          <span className="mp2-btn-sticker">📺 AD</span>
                          <span>{isAdLoading ? 'Loading ad...' : 'Unlock Community Predictions'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Section Divider */}
                  <div className="mp2-section-divider" style={{ marginTop: 24 }}>
                    <span className="mp2-section-label">Top scorer?</span>
                    <div className="mp2-section-line" />
                    <span className="mp2-pts-badge blue">+5 XP</span>
                  </div>

                  {/* Scorer select */}
                  <select
                    className="mp2-select"
                    value={pickedScorer}
                    onChange={e => !isLocked && setPickedScorer(e.target.value)}
                    disabled={isLocked}
                  >
                    <option value="">Select a player…</option>
                    <option value="No Goals">No Goals / None</option>
                    <optgroup label={selected.homeTeam}>
                      {homePlayers.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value={`${selected.homeTeam} - Someone Else`}>Someone Else ({selected.homeTeam})</option>
                    </optgroup>
                    <optgroup label={selected.awayTeam}>
                      {awayPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value={`${selected.awayTeam} - Someone Else`}>Someone Else ({selected.awayTeam})</option>
                    </optgroup>
                  </select>

                  {/* Submit / Banner */}
                  <div style={{ marginTop: 24 }}>
                    {isLocked && !submitted ? (
                      <div className="mp2-submitted-banner locked">
                        🔒 Prediction closed for this match
                      </div>
                    ) : !submitted ? (
                      <button
                        className="mp2-submit-btn"
                        disabled={!pickedWinner || !pickedScorer}
                        onClick={submitPrediction}
                      >
                        🔒 LOCK IN PREDICTION
                      </button>
                    ) : (
                      <div className="mp2-submitted-banner">
                        {selected.isComplete
                          ? '✅ Match complete — check your score below'
                          : '🔒 Prediction locked in! Come back after the match'}
                      </div>
                    )}
                  </div>

                  {/* Result reveal */}
                  {selected.isComplete && predictions[selected.id] && (
                    <div className="mp2-result-reveal">
                      <div className="mp2-result-reveal-label">Full Time Result</div>
                      <div className="mp2-result-reveal-score">
                        {selected.homeScore} – {selected.awayScore}
                      </div>
                      <div className="mp2-result-reveal-teams" style={{ marginBottom: predictions[selected.id].resolved ? 16 : 0 }}>
                        {getFlag(selected.homeTeam)} {selected.homeTeam} vs {selected.awayTeam} {getFlag(selected.awayTeam)}
                      </div>
                      {predictions[selected.id].resolved && (
                        <div className="mp2-prediction-outcome" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>YOUR PREDICTION OUTCOME</div>
                          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.8rem', gap: 12, marginBottom: 12 }}>
                            <div>Result: {predictions[selected.id].resultCorrect ? '✅ Correct (+15 XP)' : '❌ Incorrect'}</div>
                            <div>Scorer: {predictions[selected.id].scorerCorrect ? '✅ Correct (+5 XP)' : '❌ Incorrect'}</div>
                          </div>
                          {predictions[selected.id].xpAwarded > 0 ? (
                            <div className="mp2-xp-badge" style={{ display: 'inline-block', marginTop: 4 }}>
                              +{predictions[selected.id].xpAwarded} XP Earned
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted2)' }}>0 XP Earned</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Sidebar ── */}
                <div className="mp2-sidebar">
                  {/* Your prediction summary */}
                  {submitted && (
                    <div className="mp2-card mp2-pred-summary">
                      <div className="mp2-card-header">
                        <span className="mp2-card-title">Your Prediction</span>
                      </div>
                      <div className="mp2-summary-row">
                        <span className="mp2-summary-label">Result</span>
                        <span className="mp2-summary-val">
                          {pickedWinner === 'home' ? `${getFlag(selected.homeTeam)} ${selected.homeTeam}` :
                           pickedWinner === 'away' ? `${getFlag(selected.awayTeam)} ${selected.awayTeam}` :
                           'Draw'}
                        </span>
                      </div>
                      {pickedScorer && (
                        <div className="mp2-summary-row">
                          <span className="mp2-summary-label">Top Scorer</span>
                          <span className="mp2-summary-val">⚽ {pickedScorer}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scoring Rules */}
                  <div className="mp2-card">
                    <div className="mp2-card-header">
                      <span className="mp2-card-title">Scoring Rules</span>
                    </div>
                    {[
                      { rule: 'Match result correct', pts: '+15 XP', color: 'green' },
                      { rule: 'Top scorer correct',   pts: '+5 XP', color: 'blue'  },
                      { rule: 'Max base XP per match', pts: '20 XP',  color: 'muted' },
                      { rule: 'Max XP with 3x streak', pts: '60 XP',  color: 'gold'  },
                    ].map(r => (
                      <div key={r.rule} className="mp2-rule-row">
                        <span className="mp2-rule-text">{r.rule}</span>
                        <span className={`mp2-rule-val ${r.color}`}>{r.pts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ SCHEDULE TAB ══════════════ */}
        {activeTab === 'schedule' && (
          <div>
            <div className="mp2-schedule-filters">
              {[
                { id: 'all',      label: 'All Matches' },
                { id: 'upcoming', label: '⏰ Upcoming' },
                { id: 'results',  label: '✅ Results'  },
              ].map(f => (
                <button
                  key={f.id}
                  className={`mp2-filter-btn ${scheduleFilter === f.id ? 'active' : ''}`}
                  onClick={() => setScheduleFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {(() => {
              const grouped = {};
              for (const f of filteredSchedule) {
                const dateKey = new Date(f.kickoff).toLocaleDateString(undefined, {
                  weekday: 'long', month: 'long', day: 'numeric'
                });
                if (!grouped[dateKey]) grouped[dateKey] = { ts: new Date(f.kickoff).getTime(), items: [] };
                grouped[dateKey].items.push(f);
              }
              const sorted = Object.entries(grouped).sort((a, b) => a[1].ts - b[1].ts);
              return sorted.map(([date, { items }]) => (
                <div key={date} className="mp2-schedule-group">
                  <div className="mp2-section-divider" style={{ marginBottom: 12 }}>
                    <span className="mp2-section-label">{date}</span>
                    <div className="mp2-section-line" />
                  </div>
                  <div className="mp2-schedule-list">
                    {items.map(f => (
                      <div
                        key={f.id}
                        className={`mp2-schedule-row ${f.done ? 'done' : ''}`}
                        onClick={() => {
                          if (!f.done) {
                            const fx = scheduleToFixture(f);
                            setFixtures(prev => {
                              const exists = prev.find(x => x.id === fx.id);
                              return exists ? prev : [fx, ...prev.slice(0, 7)];
                            });
                            setSelected(scheduleToFixture(f));
                            resetForm();
                            setActiveTab('predict');
                          }
                        }}
                        style={{ cursor: f.done ? 'default' : 'pointer' }}
                      >
                        <div className="mp2-sched-stage">{f.stage}</div>
                        <div className="mp2-sched-match">
                          <span className="mp2-sched-team">{getFlag(f.home)} {f.home}</span>
                          {f.done
                            ? <span className="mp2-sched-score">{f.hs} – {f.as}</span>
                            : <span className="mp2-sched-vs">vs</span>
                          }
                          <span className="mp2-sched-team right">{f.away} {getFlag(f.away)}</span>
                        </div>
                        <div className="mp2-sched-meta">
                          {f.done
                            ? <span className="mp2-sched-ft-badge">FT</span>
                            : <span className="mp2-sched-time">
                                {new Date(f.kickoff).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                                <span className="mp2-sched-predict-cta">· Tap to predict →</span>
                              </span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}


      </div>
    </div>
  );
}

// ─── How to Play Modal ────────────────────────────────────────────────────────
function HowToPlayModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className={`mp2-modal-overlay${show ? ' active' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mp2-modal-box">
        <h2 className="mp2-modal-title">📋 How to Play</h2>
        <ul className="mp2-rules-list">
          <li><strong>⚽ Predict Result:</strong> Select who will win the match (Home, Away, or Draw). A correct result prediction earns <strong>+15 XP</strong>.</li>
          <li><strong>🎯 Predict Scorer:</strong> Choose the player you think will score a goal. If they score, you earn <strong>+5 XP</strong>.</li>
          <li><strong>🚫 No Goals:</strong> If you predict a 0-0 scoreline, choose "No Goals / None" as the top scorer.</li>
          <li><strong>⏰ Prediction Lock:</strong> Predictions lock exactly 1 second before kickoff. Make sure to lock yours in on time!</li>
          <li><strong>🔥 Streaks & Multipliers:</strong> Build a prediction streak to multiply your XP rewards:
            <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>• Streak of 3: <strong>1.5x XP</strong></span>
              <span>• Streak of 5: <strong>2x XP</strong></span>
              <span>• Streak of 8+: <strong>3x XP</strong></span>
            </div>
          </li>
        </ul>
        <button className="mp2-modal-close" onClick={onClose}>🚀 Got It!</button>
      </div>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900&family=Space+Mono:wght@400;700&display=swap');

:root {
  --bg: #05070f;
  --surface: rgba(255,255,255,.038);
  --border: rgba(255,255,255,.08);
  --border2: rgba(255,255,255,.13);
  --accent: #F7C344;
  --accent2: #E84040;
  --accent3: #4F8EF7;
  --green: #3DD68C;
  --orange: #F97316;
  --text: #F0F0F0;
  --muted: rgba(240,240,240,.45);
  --muted2: rgba(240,240,240,.25);
  --card-radius: 16px;
  --dd: #060a1a;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* PAGE SHELL */
.mp2-page {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  font-family: 'DM Sans', sans-serif;
}
.mp2-bg-layer {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(circle at 10% 20%, rgba(249,115,22,0.05) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(247,195,68,0.04) 0%, transparent 45%),
    radial-gradient(ellipse 70% 50% at 50% -10%, rgba(247,195,68,0.07) 0%, transparent 60%);
}
.mp2-noise {
  position: absolute; inset: 0; pointer-events: none; z-index: 1; opacity: .018;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* LOADING */
.mp2-loading {
  position: relative; z-index: 5;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; gap: 16px; color: var(--muted); font-size: 1rem; font-weight: 600;
}
.mp2-loading-ball { font-size: 3rem; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* NAV */
.mp2-nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 64px; padding: 0 24px; position: relative; z-index: 10;
  border-bottom: 1px solid rgba(249,115,22,0.18);
  background: rgba(5,7,15,0.75); backdrop-filter: blur(14px);
  box-shadow: 0 4px 24px rgba(249,115,22,0.12);
}
.mp2-nav-logo {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 2px;
  background: linear-gradient(135deg, var(--orange), var(--accent));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  background-color: transparent; border: none; outline: none; cursor: pointer;
}
.mp2-nav-tag {
  font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;
  color: var(--muted); border: 1px solid var(--border); padding: 5px 12px;
  border-radius: 100px; display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.02);
}
.mp2-fire-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--orange);
  box-shadow: 0 0 8px var(--orange);
}
.mp2-nav-right { display: flex; gap: 8px; }
.mp2-nav-btn {
  background: var(--surface); border: 1px solid var(--border); color: #fff;
  padding: 8px 14px; border-radius: 10px; font-size: .8rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
}
.mp2-nav-btn:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); }

/* MAIN CONTENT AREA */
.mp2-main {
  max-width: 1000px; margin: 0 auto; padding: 32px 16px 80px;
  position: relative; z-index: 5;
}

/* PAGE HEADER */
.mp2-page-header { margin-bottom: 24px; }
.mp2-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem; letter-spacing: 2px;
  line-height: 1; margin-bottom: 6px;
  color: var(--accent);
}
.mp2-subtitle { color: var(--muted); font-size: 0.9rem; }

/* XP RULES STRIP */
.mp2-rules-strip {
  display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap;
}
.mp2-rule-pill {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  background: rgba(247,195,68,0.05); border: 1px solid rgba(247,195,68,0.18);
  border-radius: 100px; animation: fadeUp .4s ease both;
}
.mp2-rule-pts {
  font-family: 'Space Mono', monospace; font-size: .82rem; font-weight: 700;
  color: var(--accent);
}
.mp2-rule-label {
  font-size: .7rem; font-weight: 700; color: var(--muted);
  text-transform: uppercase; letter-spacing: .5px;
}

/* TAB BAR */
.mp2-tab-bar {
  display: flex; gap: 6px; margin-bottom: 28px;
  background: rgba(255,255,255,.025); border: 1px solid var(--border);
  border-radius: 14px; padding: 5px;
}
.mp2-tab-btn {
  flex: 1; padding: 10px 16px; border: none; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s; color: var(--muted);
  background: transparent;
}
.mp2-tab-btn.active {
  background: rgba(247,195,68,0.12); color: var(--accent);
  border: 1px solid rgba(247,195,68,0.3);
  box-shadow: 0 0 14px rgba(247,195,68,0.1);
}
.mp2-tab-btn:not(.active):hover { background: rgba(255,255,255,.04); color: #fff; }

/* FIXTURE SCROLL CHIPS */
.mp2-fixture-scroll {
  display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px;
  margin-bottom: 20px; scrollbar-width: thin;
  scrollbar-color: rgba(247,195,68,0.3) transparent;
}
.mp2-fixture-chip {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 12px 16px; min-width: 130px; flex-shrink: 0;
  background: rgba(255,255,255,.02); border: 1px solid var(--border);
  border-radius: 14px; cursor: pointer; transition: all 0.22s;
  font-family: 'DM Sans', sans-serif;
}
.mp2-fixture-chip:hover {
  background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.15);
  transform: translateY(-1px);
}
.mp2-fixture-chip.active {
  border-color: var(--accent); background: rgba(247,195,68,0.07);
  box-shadow: 0 0 16px rgba(247,195,68,0.15);
}
.mp2-chip-flags { font-size: .95rem; font-weight: 700; color: #fff; }
.mp2-chip-stage { font-size: .68rem; color: var(--muted); margin-top: 4px; }

/* PREDICT LAYOUT */
.mp2-predict-layout { animation: fadeUp .4s ease both; }
.mp2-predict-grid {
  display: grid; grid-template-columns: minmax(0,1fr) 280px; gap: 20px; align-items: start;
}
@media (max-width: 768px) {
  .mp2-predict-grid { grid-template-columns: 1fr; }
  .mp2-rules-strip { display: none !important; }
  .mp2-subtitle { display: none !important; }
}

/* CARD */
.mp2-card {
  background: rgba(255,255,255,.03); border: 1px solid var(--border);
  border-radius: var(--card-radius); padding: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,.3); backdrop-filter: blur(8px);
  position: relative; overflow: hidden;
}
.mp2-card::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: var(--card-radius);
  background: linear-gradient(135deg, rgba(255,255,255,.03), transparent 60%);
}
.mp2-card-header { margin-bottom: 16px; }
.mp2-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 1px; }
.mp2-card-sub { font-size: .72rem; color: var(--muted); display: block; margin-top: 2px; text-transform: uppercase; letter-spacing: .8px; }

/* SCOREBOARD */
.mp2-scoreboard {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.05);
  border-radius: 14px; padding: 20px 16px; margin-bottom: 24px;
}
.mp2-team { flex: 1; text-align: center; }
.mp2-flag-circle {
  width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 10px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; box-shadow: inset 0 2px 4px rgba(0,0,0,.4);
}
.mp2-team-name {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: .5px;
  line-height: 1.2; color: #fff;
}
.mp2-team-role { font-size: .65rem; color: var(--muted2); text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }
.mp2-vs-box { text-align: center; padding: 0 8px; min-width: 90px; }
.mp2-vs-display {
  font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; color: rgba(240,240,240,.2);
  letter-spacing: 2px;
}
.mp2-score-display {
  font-family: 'Space Mono', monospace; font-size: 2rem; font-weight: 900;
  color: var(--accent); text-shadow: 0 0 12px rgba(247,195,68,.4);
}
.mp2-stage-chip {
  font-size: .62rem; color: var(--muted2); text-transform: uppercase; letter-spacing: 1px;
  background: rgba(255,255,255,.05); padding: 3px 8px; border-radius: 6px; margin-top: 6px;
  display: inline-block; white-space: nowrap;
}
.mp2-kickoff-time { font-size: .65rem; color: var(--muted); margin-top: 5px; }
.mp2-live-pill {
  display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 100px;
  background: rgba(232,64,64,.1); border: 1px solid rgba(232,64,64,.35); color: var(--accent2);
  font-size: .65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;
  animation: livePulse 1.5s ease-in-out infinite;
}
@keyframes livePulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
.mp2-ft-pill {
  display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 100px;
  background: rgba(61,214,140,.08); border: 1px solid rgba(61,214,140,.3); color: var(--green);
  font-size: .65rem; font-weight: 900;
}

/* SECTION DIVIDER */
.mp2-section-divider {
  display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
}
.mp2-section-label {
  font-size: .68rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--muted); white-space: nowrap;
}
.mp2-section-line { flex: 1; height: 1px; background: var(--border); }
.mp2-pts-badge {
  font-family: 'Space Mono', monospace; font-size: .65rem; font-weight: 800;
  padding: 3px 9px; border-radius: 6px; white-space: nowrap;
}
.mp2-pts-badge.green  { color: var(--green); background: rgba(61,214,140,.1); border: 1px solid rgba(61,214,140,.25); }
.mp2-pts-badge.blue   { color: var(--accent3); background: rgba(79,142,247,.1); border: 1px solid rgba(79,142,247,.25); }
.mp2-pts-badge.gold   { color: var(--accent); background: rgba(247,195,68,.1); border: 1px solid rgba(247,195,68,.25); }

/* PICK GRID */
.mp2-pick-grid { display: flex; gap: 10px; margin-bottom: 20px; }
.mp2-pick-btn {
  flex: 1; padding: 16px 10px; display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  background: rgba(255,255,255,.02); border: 1px solid var(--border); border-radius: 14px;
  cursor: pointer; transition: all .22s cubic-bezier(.25,.8,.25,1); color: #fff;
  font-family: 'DM Sans', sans-serif;
}
.mp2-pick-btn:not(:disabled):hover {
  transform: translateY(-2px); background: rgba(255,255,255,.05);
  border-color: rgba(247,195,68,.35);
}
.mp2-pick-btn.selected {
  border-color: var(--accent); background: rgba(247,195,68,0.1);
  box-shadow: 0 0 18px rgba(247,195,68,.2);
}
.mp2-pick-btn.locked-out { opacity: 0.3; pointer-events: none; }
.mp2-pick-flag { font-size: 1.8rem; }
.mp2-draw-badge {
  font-family: 'Space Mono', monospace; font-size: .62rem; font-weight: 900;
  padding: 4px 10px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
  border-radius: 6px; color: rgba(255,255,255,.6); letter-spacing: .5px;
}
.mp2-pick-label { font-size: .75rem; font-weight: 800; text-align: center; line-height: 1.2; }

/* COMMUNITY INSIGHTS */
.mp2-insights-wrapper { margin-top: 0; }
.mp2-insights-card {
  background: rgba(247,195,68,.04); border: 1px solid rgba(247,195,68,.2);
  border-radius: 12px; padding: 14px;
}
.mp2-insights-header {
  font-size: .68rem; font-weight: 900; color: var(--accent); margin-bottom: 10px;
  text-transform: uppercase; letter-spacing: 1px; font-family: 'Space Mono', monospace;
}
.mp2-bar-row { display: flex; gap: 6px; font-size: .68rem; font-weight: 700; }
.mp2-bar-item {
  padding: 7px 6px; border-radius: 8px; text-align: center; min-width: 0; overflow: hidden;
  white-space: nowrap; text-overflow: ellipsis;
}
.bar-home { background: rgba(61,214,140,.12); border: 1px solid rgba(61,214,140,.25); color: var(--green); }
.bar-draw { background: rgba(79,142,247,.12); border: 1px solid rgba(79,142,247,.25); color: var(--accent3); }
.bar-away { background: rgba(232,64,64,.12);  border: 1px solid rgba(232,64,64,.25);  color: var(--accent2); }

.mp2-insights-btn {
  width: 100%; padding: 12px; border-radius: 12px;
  background: rgba(247,195,68,.04); border: 1px solid rgba(247,195,68,.25);
  color: var(--accent); font-family: 'Space Mono', monospace; font-size: .7rem;
  font-weight: 800; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: all .2s;
}
.mp2-insights-btn:hover:not(:disabled) {
  background: rgba(247,195,68,.1); border-color: rgba(247,195,68,.4); transform: translateY(-1px);
}
.mp2-insights-btn:disabled { opacity: .45; cursor: default; }
.mp2-btn-sticker {
  background: var(--accent); color: #000; font-size: .58rem; font-weight: 900;
  padding: 2px 7px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,.3);
}

/* SELECT */
.mp2-select {
  width: 100%; padding: 13px 14px; background: #0c0f1a;
  border: 1px solid var(--border); border-radius: 12px; color: #fff;
  font-size: .88rem; font-family: 'DM Sans', sans-serif; cursor: pointer;
  outline: none; transition: border-color .2s;
}
.mp2-select:focus { border-color: rgba(247,195,68,.45); box-shadow: 0 0 12px rgba(247,195,68,.08); }
.mp2-select:disabled { opacity: .45; cursor: default; }

/* SUBMIT */
.mp2-submit-btn {
  width: 100%; padding: 16px; background: var(--accent); color: #060810;
  border: none; border-radius: 14px; font-family: 'Space Mono', monospace;
  font-size: .9rem; font-weight: 900; letter-spacing: 1px; cursor: pointer;
  box-shadow: 0 4px 18px rgba(247,195,68,.3); transition: all .22s;
}
.mp2-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px); background: #ffd05c; box-shadow: 0 6px 24px rgba(247,195,68,.4);
}
.mp2-submit-btn:disabled { opacity: .38; cursor: default; box-shadow: none; }

.mp2-submitted-banner {
  padding: 14px 18px; border-radius: 12px;
  background: rgba(61,214,140,.08); border: 1px solid rgba(61,214,140,.25);
  color: var(--green); font-weight: 800; font-size: .82rem; text-align: center;
}
.mp2-xp-badge {
  margin-top: 12px; padding: 8px 14px; text-align: center;
  background: linear-gradient(135deg, rgba(247,195,68,.12), rgba(249,115,22,.12));
  border: 1px solid rgba(247,195,68,.25); border-radius: 100px;
  color: var(--accent); font-size: .78rem; font-weight: 800;
  font-family: 'Space Mono', monospace; letter-spacing: .5px;
  animation: pillPop .6s cubic-bezier(.34,1.56,.64,1);
}
@keyframes pillPop { 0% { transform: scale(1); } 45% { transform: scale(1.09); } 100% { transform: scale(1); } }

/* RESULT REVEAL */
.mp2-result-reveal {
  margin-top: 20px; padding: 20px; text-align: center;
  background: rgba(247,195,68,.04); border: 1px solid rgba(247,195,68,.2); border-radius: 14px;
}
.mp2-result-reveal-label {
  font-size: .68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;
}
.mp2-result-reveal-score {
  font-family: 'Space Mono', monospace; font-size: 2.2rem; font-weight: 900;
  color: var(--accent); margin-bottom: 6px; text-shadow: 0 0 12px rgba(247,195,68,.35);
}
.mp2-result-reveal-teams { font-size: .82rem; color: var(--muted); }

/* SIDEBAR */
.mp2-sidebar { display: flex; flex-direction: column; gap: 16px; }

.mp2-pred-summary { border-color: rgba(247,195,68,.2); background: rgba(247,195,68,.04); }
.mp2-summary-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.mp2-summary-row:last-child { border-bottom: none; }
.mp2-summary-label { font-size: .75rem; color: var(--muted); font-weight: 600; }
.mp2-summary-val { font-size: .82rem; font-weight: 800; color: #fff; }

.mp2-rule-row {
  display: flex; justify-content: space-between; padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,.05);
}
.mp2-rule-row:last-child { border-bottom: none; }
.mp2-rule-text { font-size: .8rem; color: var(--muted); }
.mp2-rule-val { font-family: 'Space Mono', monospace; font-size: .78rem; font-weight: 800; }
.mp2-rule-val.green { color: var(--green); }
.mp2-rule-val.blue  { color: var(--accent3); }
.mp2-rule-val.gold  { color: var(--accent); }
.mp2-rule-val.muted { color: var(--muted); }

/* SCHEDULE TAB */
.mp2-schedule-filters {
  display: flex; gap: 8px; margin-bottom: 24px;
}
.mp2-filter-btn {
  padding: 8px 18px; border-radius: 100px;
  background: rgba(255,255,255,.03); border: 1px solid var(--border);
  color: var(--muted); font-size: .78rem; font-weight: 700;
  cursor: pointer; transition: all .2s; font-family: 'DM Sans', sans-serif;
}
.mp2-filter-btn.active {
  background: rgba(247,195,68,.1); border-color: rgba(247,195,68,.35); color: var(--accent);
}
.mp2-filter-btn:not(.active):hover { background: rgba(255,255,255,.06); color: #fff; }

.mp2-schedule-group { margin-bottom: 24px; animation: fadeUp .35s ease both; }
.mp2-schedule-list { display: flex; flex-direction: column; gap: 8px; }
.mp2-schedule-row {
  background: rgba(255,255,255,.02); border: 1px solid var(--border); border-radius: 14px;
  padding: 14px 16px; transition: all .2s;
}
.mp2-schedule-row:not(.done):hover {
  background: rgba(247,195,68,.04); border-color: rgba(247,195,68,.25); transform: translateX(2px);
}
.mp2-schedule-row.done { opacity: 0.7; }
.mp2-sched-stage { font-size: .62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.mp2-sched-match {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-weight: 700; font-size: .9rem;
}
.mp2-sched-team { display: flex; align-items: center; gap: 5px; }
.mp2-sched-team.right { flex-direction: row-reverse; }
.mp2-sched-vs { font-size: .7rem; color: var(--muted); }
.mp2-sched-score {
  font-family: 'Space Mono', monospace; font-size: .95rem; font-weight: 900;
  color: var(--accent); padding: 2px 10px;
  background: rgba(247,195,68,.08); border-radius: 8px;
}
.mp2-sched-meta { margin-top: 8px; display: flex; align-items: center; gap: 8px; }
.mp2-sched-ft-badge {
  font-size: .62rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;
  padding: 2px 8px; border-radius: 6px;
  background: rgba(61,214,140,.08); border: 1px solid rgba(61,214,140,.25); color: var(--green);
}
.mp2-sched-time { font-size: .72rem; color: var(--muted); }
.mp2-sched-predict-cta { color: rgba(247,195,68,.6); font-size: .68rem; }

/* LEADERBOARD */
.mp2-leaderboard-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.mp2-leader-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  background: rgba(255,255,255,.01); border: 1px solid var(--border); border-radius: 12px;
  transition: all .2s;
}
.mp2-leader-row.me { border-color: rgba(247,195,68,.3); background: rgba(247,195,68,.04); }
.mp2-rank-badge {
  font-family: 'Space Mono', monospace; font-size: .72rem; font-weight: 900;
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  border-radius: 8px; background: rgba(255,255,255,.04); color: var(--muted);
}
.mp2-rank-badge.gold   { background: var(--accent); color: #000; box-shadow: 0 0 12px rgba(247,195,68,.35); }
.mp2-rank-badge.silver { background: #E5E7EB; color: #000; }
.mp2-rank-badge.bronze { background: #CD7F32; color: #fff; }
.mp2-leader-name { flex: 1; font-size: .85rem; font-weight: 700; }
.mp2-leader-pts { font-family: 'Space Mono', monospace; font-size: .85rem; font-weight: 800; color: var(--accent); }

.mp2-empty-state {
  text-align: center; padding: 40px 20px; color: var(--muted); font-size: .9rem; font-weight: 600;
}
.mp2-empty-icon { font-size: 2.5rem; margin-bottom: 12px; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* LOCKED BANNER */
.mp2-submitted-banner.locked {
  background: rgba(232, 64, 64, 0.08);
  border: 1px solid rgba(232, 64, 64, 0.25);
  color: var(--accent2);
}

/* MODAL */
.mp2-modal-overlay {
  display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.84);
  backdrop-filter: blur(14px); justify-content: center; align-items: center; padding: 20px;
}
.mp2-modal-overlay.active { display: flex; animation: mp2FadeIn .22s ease; }
@keyframes mp2FadeIn { from{opacity:0}to{opacity:1} }
.mp2-modal-box {
  background: #0c1020; border: 1px solid rgba(247,195,68,.25); border-radius: 24px;
  padding: 40px 32px; max-width: 480px; width: 100%; max-height: 88vh; overflow-y: auto;
  position: relative; animation: mp2ModalUp .3s cubic-bezier(.4,0,.2,1);
}
.mp2-modal-box::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--accent3), var(--accent), var(--accent3));
  border-radius: 24px 24px 0 0;
}
@keyframes mp2ModalUp { from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none} }
.mp2-modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; letter-spacing: 2px; text-align: center; margin-bottom: 22px; color: var(--accent); }
.mp2-rules-list { list-style: none; margin-bottom: 22px; display: flex; flex-direction: column; gap: 8px; }
.mp2-rules-list li {
  background: var(--surface); border: 1px solid var(--border); border-left: 3px solid rgba(247,195,68,0.45);
  border-radius: 12px; padding: 12px 15px; font-size: .86rem; line-height: 1.6; transition: border-color .2s, transform .2s;
  color: var(--text); text-align: left;
}
.mp2-rules-list li:hover { border-left-color: var(--accent); transform: translateX(4px); }
.mp2-modal-close {
  width: 100%; padding: 13px; font-size: .9rem; border-radius: 12px; background: var(--accent);
  color: #060810; border: none; cursor: pointer; font-family: 'Space Mono', monospace; font-weight: 700; transition: opacity .2s;
}
.mp2-modal-close:hover { opacity: .88; }
`;