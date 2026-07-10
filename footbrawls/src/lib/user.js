



import { db } from './firebase';
import { doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const USER_KEY = 'footbrawls_user';



function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}



export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}



export function saveUserLocally(userData) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  } catch (err) {
    console.error('Failed to save user locally:', err);
  }
}



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


  saveUserLocally(user);


  mirrorUserToFirestore(user, homeCountry, supportTeam);

  return user;
}



async function mirrorUserToFirestore(user, homeCountry, supportTeam) {
  try {

    await setDoc(doc(db, 'users', user.userId), {
      ...user,
      createdAt: serverTimestamp(),
    });


    await updateDoc(doc(db, 'guilds', homeCountry), {
      memberCount: increment(1),
    });


    if (supportTeam && supportTeam !== homeCountry) {
      await updateDoc(doc(db, 'guilds', supportTeam), {
        supporterCount: increment(1),
      });
    }
  } catch (err) {
    console.error('Failed to mirror user to Firestore:', err);

  }
}



export async function updateUser(updates) {
  const current = getUser();
  if (!current) return null;

  const updated = { ...current, ...updates };
  saveUserLocally(updated);


  try {
    await updateDoc(doc(db, 'users', current.userId), updates);
  } catch (err) {
    console.error('Failed to update user in Firestore:', err);
  }

  return updated;
}



export function clearUser() {
  localStorage.removeItem(USER_KEY);
}