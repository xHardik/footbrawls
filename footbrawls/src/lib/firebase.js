import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
   apiKey: "AIzaSyCj0_Tc4MqnLolTM8xKSwBsOxeMCF3WBpY",
  authDomain: "footbrawls.firebaseapp.com",
  databaseURL: "https://footbrawls-default-rtdb.firebaseio.com",
  projectId: "footbrawls",
  storageBucket: "footbrawls.firebasestorage.app",
  messagingSenderId: "18751228127",
  appId: "1:18751228127:web:3bef4238b562bbace4c16a",
  measurementId: "G-SLTCPKC5E2"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);