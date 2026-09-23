"use client";

import {
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/database";
import { rtdb } from "./firebase";

/**
 * Marks the given user as "online" in Realtime Database, and registers a
 * server-side onDisconnect hook so that if their connection drops for ANY
 * reason (closed tab, lost network, crashed browser — not just a clean
 * logout), Firebase itself flips their status to "offline" without
 * needing the client to do anything. This is the actual mechanism behind
 * "is the other person online" — Firestore alone can't do this reliably
 * (it has no server-side disconnect detection), which is why presence
 * uses Realtime Database instead.
 *
 * Call once when a user logs in; call the returned cleanup function on
 * logout to mark them offline immediately rather than waiting for the
 * disconnect hook to fire.
 */
export function initPresence(uid: string): () => void {
  if (!rtdb) return () => {};

  const statusRef = ref(rtdb, `/status/${uid}`);
  const connectedRef = ref(rtdb, ".info/connected");

  const unsubscribe = onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) return;

    onDisconnect(statusRef)
      .set({ state: "offline", lastChanged: serverTimestamp() })
      .then(() => {
        set(statusRef, { state: "online", lastChanged: serverTimestamp() });
      })
      .catch(() => {
        // Presence is a nice-to-have, not a call-blocking dependency —
        // fail silently if RTDB rules or connectivity reject the write.
      });
  });

  return () => {
    unsubscribe();
    set(statusRef, { state: "offline", lastChanged: serverTimestamp() }).catch(() => undefined);
  };
}

/**
 * Subscribes to another user's live online/offline status. Returns an
 * unsubscribe function. Reports `null` (unknown) rather than `false` when
 * Realtime Database isn't configured, so calling UI can distinguish
 * "confirmed offline" from "we simply can't tell" and avoid showing a
 * misleading "offline" label.
 */
export function listenToPresence(
  uid: string,
  callback: (online: boolean | null) => void
): Unsubscribe {
  if (!rtdb) {
    callback(null);
    return () => {};
  }
  const statusRef = ref(rtdb, `/status/${uid}`);
  return onValue(statusRef, (snapshot) => {
    const data = snapshot.val();
    callback(data?.state === "online");
  });
}
