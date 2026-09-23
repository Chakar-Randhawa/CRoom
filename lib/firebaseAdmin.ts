// Server-only. Never import this from a "use client" file — it holds
// admin credentials that must never reach the browser.
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App | null {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    console.warn(
      "[CRoom] FIREBASE_SERVICE_ACCOUNT_KEY is not set — push notifications are disabled until it's configured."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    return initializeApp({ credential: cert(serviceAccount) });
  } catch (err) {
    console.warn("[CRoom] FIREBASE_SERVICE_ACCOUNT_KEY is set but could not be parsed as JSON.", err);
    return null;
  }
}

const adminApp = getAdminApp();

export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;
export const adminMessaging: Messaging | null = adminApp ? getMessaging(adminApp) : null;
export const adminDb: Firestore | null = adminApp ? getFirestore(adminApp) : null;
