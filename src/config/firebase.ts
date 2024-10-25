import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDwIOj3vX12Uo4Gg4ONhMPuyYlIyCqXDtQ",
  authDomain: "matcha-154f9.firebaseapp.com",
  projectId: "matcha-154f9",
  storageBucket: "matcha-154f9.appspot.com",
  messagingSenderId: "396332049856",
  appId: "1:396332049856:web:ecce0aedc3b684d2809425",
  measurementId: "G-G8T0HL5RR1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics conditionally
let analytics = null;
isSupported()
  .then(yes => yes && (analytics = getAnalytics(app)))
  .catch(() => console.warn('Analytics not supported in this environment'));

export { analytics };

export const validateEmail = (email: string): boolean => {
  return email.endsWith('@charlotte.edu');
};