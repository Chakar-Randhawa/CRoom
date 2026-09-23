// Firebase Cloud Messaging service worker. This file CANNOT read your
// .env.local — Next.js only injects environment variables into files it
// bundles, and service workers in /public are served completely as-is.
// So the same 6 values from your .env.local's NEXT_PUBLIC_FIREBASE_*
// vars have to be pasted in directly below.
//
// This is safe: these are public client identifiers, not secrets (this
// is standard Firebase practice, confirmed in Firebase's own docs) —
// real security lives in your Firestore/Realtime Database rules, not in
// hiding these values.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCMWRbmFNqPDytsd5Dugz8VRju0VD1qt6k",
  authDomain: "croom-8f767.firebaseapp.com",
  projectId: "croom-8f767",
  storageBucket: "croom-8f767.firebasestorage.app",
  messagingSenderId: "775446808227",
  appId: "1:775446808227:web:71a26cd0c2683c4a8c2116",
});

const messaging = firebase.messaging();

// Fires only when the CRoom tab is NOT open/focused — this is exactly
// the "browser closed" case Phase 2 is for. When the tab IS open, our
// existing Firestore listener already shows the full-screen incoming
// call overlay with the real ringtone, so we deliberately don't
// duplicate that here.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  if (data.type !== "incoming_call") return;

  const title = `Incoming call from ${data.callerName || "someone"}`;
  const options = {
    body: "Tap to answer in CRoom",
    tag: "croom-incoming-call", // a second call replaces this notification instead of stacking duplicates
    requireInteraction: true,
    data: { roomId: data.roomId, inviteId: data.inviteId },
  };

  self.registration.showNotification(title, options);
});

// Clicking the notification focuses an already-open CRoom tab, or opens
// a new one. Either way, once the app is running, the existing
// Firestore-based incoming-call overlay takes over from there — this
// service worker's only job is getting the user's attention.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
      } else {
        self.clients.openWindow("/dashboard");
      }
    })
  );
});
