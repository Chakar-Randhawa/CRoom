import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  getDatabase,
  type Database,
} from "firebase/database";

// All values are read from environment variables. Create a `.env.local`
// file at the project root (see `.env.local.example`) with your Firebase
// project's web app config.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

export const app = getFirebaseApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Realtime Database powers online/offline presence (Phase 1). It's a
// SEPARATE Firebase product from Firestore and needs its own explicit
// enable step in the Firebase Console (Build > Realtime Database >
// Create Database) plus a NEXT_PUBLIC_FIREBASE_DATABASE_URL env var. If
// that hasn't been set up yet, we fail soft here rather than crashing the
// whole app — presence features simply report "unknown" until it's
// configured, everything else keeps working normally.
let rtdbInstance: Database | null = null;
try {
  if (firebaseConfig.databaseURL) {
    rtdbInstance = getDatabase(app);
  } else {
    console.warn(
      "[CRoom] NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set — online/offline presence is disabled until Realtime Database is configured."
    );
  }
} catch (err) {
  console.warn("[CRoom] Realtime Database failed to initialize — presence disabled.", err);
}
export const rtdb: Database | null = rtdbInstance;
