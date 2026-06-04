import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config pulled from environment variables (set in .env file)
// On Vercel, these are set in the Vercel Dashboard → Settings → Environment Variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Validate that config values are present
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value || value.startsWith('your-'))
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(
    `⚠️ Firebase config missing or using placeholder values for: ${missingKeys.join(', ')}.\n` +
    `Please update your .env file with real Firebase credentials.\n` +
    `See .env.example for reference.`
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with local persistence (survives browser tab close)
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Initialize Firestore (used for Lumis rate limiting)
const db = getFirestore(app);

export { auth, db };
export default app;
