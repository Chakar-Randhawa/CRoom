"use client";

import { doc, setDoc } from "firebase/firestore";
import { app, db } from "./firebase";

export type NotificationSetupResult = "granted" | "denied" | "unsupported";

let cachedMessaging: import("firebase/messaging").Messaging | null = null;

async function getMessagingInstance() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || typeof Notification === "undefined") return null;
  if (cachedMessaging) return cachedMessaging;

  const { getMessaging, isSupported } = await import("firebase/messaging");
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  cachedMessaging = getMessaging(app);
  return cachedMessaging;
}

/**
 * Requests notification permission, registers the service worker, and
 * saves the resulting FCM token onto the user's Firestore record so the
 * send-notification API route knows where to deliver a push when someone
 * calls them. Safe to call multiple times — re-registering just refreshes
 * the token.
 */
export async function enableCallNotifications(uid: string): Promise<NotificationSetupResult> {
  const messaging = await getMessagingInstance();
  if (!messaging) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("[CRoom] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — cannot register for push.");
    return "unsupported";
  }

  try {
    const { getToken } = await import("firebase/messaging");
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return "denied";

    await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
    return "granted";
  } catch (err) {
    console.warn("[CRoom] Failed to register for push notifications.", err);
    return "denied";
  }
}

/** True if the browser has already granted/denied/not-yet-asked, so UI can decide whether to show the opt-in prompt. */
export function getNotificationPermissionState(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}
