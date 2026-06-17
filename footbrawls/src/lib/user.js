// src/lib/user.js
// User identity management — localStorage + Firestore mirror
// No auth required. UUID-based identity persists in browser.

import { db } from './firebase';
import { doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const USER_KEY = 'footbrawls_user';

// ─── UUID Generator ───────────────────────────────────────────────────────────

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Read from localStorage ───────────────────────────────────────────────────

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Save to localStorage ─────────────────────────────────────────────────────

export function saveUserLocally(userData) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  } catch (err) {
    console.error('Failed to save user locally:', err);
  }
}

// ─── Create New User ──────────────────────────────────────────────────────────

export async function createUser({ nickname, homeCountry, supportTeam , flag}) {
  const userId = generateUUID();
  const now = new Date().toISOString();

  const user = {
    userId,
    nickname,
    homeCountry,
    supportTeam,
  flag,         
    totalXP: 0,
    dailyXP: 0,
    dailyXPDate: null,
    tier: 'lurker',
    predictionStreak: 0,
    predictionMultiplier: 1,
    predictionScorerStreak: 0,
    predictionScorerMultiplier: 1,
    loginStreakDays: 0,
    loginStreakLastDate: null,
    createdAt: now,
  };

  // Save locally first — app works even if Firestore write fails
  saveUserLocally(user);

  // Mirror to Firestore (fire and forget — don't block UI)
  mirrorUserToFirestore(user, homeCountry, supportTeam);

  return user;
}

// ─── Mirror to Firestore ──────────────────────────────────────────────────────

async function mirrorUserToFirestore(user, homeCountry, supportTeam) {
  try {
    // Write user document
    await setDoc(doc(db, 'users', user.userId), {
      ...user,
      createdAt: serverTimestamp(),
    });

    // Increment memberCount on home country guild
    await updateDoc(doc(db, 'guilds', homeCountry), {
      memberCount: increment(1),
    });

    // Increment supporterCount on support team (if different from home)
    if (supportTeam && supportTeam !== homeCountry) {
      await updateDoc(doc(db, 'guilds', supportTeam), {
        supporterCount: increment(1),
      });
    }
  } catch (err) {
    console.error('Failed to mirror user to Firestore:', err);
    // Non-fatal — user still works locally
  }
}

// ─── Update User ──────────────────────────────────────────────────────────────

export async function updateUser(updates) {
  const current = getUser();
  if (!current) return null;

  const updated = { ...current, ...updates };
  saveUserLocally(updated);

  // Mirror updates to Firestore
  try {
    await updateDoc(doc(db, 'users', current.userId), updates);
  } catch (err) {
    console.error('Failed to update user in Firestore:', err);
  }

  return updated;
}

// ─── Clear User (for testing) ─────────────────────────────────────────────────

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}