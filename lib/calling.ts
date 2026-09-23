"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export function generateRoomId(): string {
  // Not sequential, not derived from anything guessable — a fresh random
  // token per room, exactly as required for the "unique hash configuration"
  // the spec calls for.
  return crypto.randomUUID().replace(/-/g, "");
}

export interface ResolvedUser {
  uid: string;
  email: string;
  displayName: string;
}

export async function findUserByEmail(email: string): Promise<ResolvedUser | null> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return { uid: docSnap.id, email: data.email, displayName: data.displayName };
}

export async function ringUser(params: {
  targetUid: string;
  fromUid: string;
  fromDisplayName: string;
  roomId: string;
}) {
  const invitesRef = collection(db, "invites");
  const inviteDoc = await addDoc(invitesRef, {
    to: params.targetUid,
    fromUid: params.fromUid,
    fromDisplayName: params.fromDisplayName,
    roomId: params.roomId,
    createdAt: serverTimestamp(),
    status: "ringing",
  });
  return inviteDoc.id;
}

export async function cancelInvite(inviteId: string) {
  try {
    await deleteDoc(doc(db, "invites", inviteId));
  } catch {
    // Already answered/cleaned up — fine.
  }
}

export type InviteStatus = "ringing" | "accepted" | "declined" | "cancelled" | "timeout";

/** Updates the invite's status without deleting it — lets the OTHER side's
 * listener see the terminal state (declined/accepted/etc.) before the
 * document disappears. The caller side is responsible for eventually
 * deleting the doc via cancelInvite() once it has processed that status,
 * so there's a single, predictable place invites get cleaned up. */
export async function updateInviteStatus(inviteId: string, status: InviteStatus) {
  try {
    await updateDoc(doc(db, "invites", inviteId), { status });
  } catch {
    // Doc may already be gone (declined right as it was cleaned up) — fine.
  }
}

/** Live-watches a single invite doc for status changes (accepted/declined/
 * cancelled/timeout) or deletion. Used by both the caller's "Calling…"
 * screen and the callee's incoming-call overlay to stay in sync. */
export function listenToInvite(
  inviteId: string,
  callback: (data: { status: InviteStatus; roomId: string; fromDisplayName: string } | null) => void
) {
  return onSnapshot(doc(db, "invites", inviteId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    callback({
      status: data.status as InviteStatus,
      roomId: data.roomId,
      fromDisplayName: data.fromDisplayName,
    });
  });
}

export function listenForIncomingCalls(
  myUid: string,
  onIncoming: (invite: { id: string; fromDisplayName: string; roomId: string }) => void
) {
  const invitesRef = collection(db, "invites");
  const q = query(invitesRef, where("to", "==", myUid), where("status", "==", "ringing"));
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        onIncoming({ id: change.doc.id, fromDisplayName: data.fromDisplayName, roomId: data.roomId });
      }
    });
  });
}

/**
 * Phase 2: fires the background push notification for a call, on top of
 * the Firestore invite that already handles the in-app experience.
 * Deliberately fire-and-forget — a failed push should never block or
 * delay the outgoing-call screen from appearing, since anyone with the
 * CRoom tab open gets notified through Firestore regardless of whether
 * this succeeds.
 */
export async function sendCallPushNotification(params: {
  idToken: string;
  targetUid: string;
  callerName: string;
  roomId: string;
  inviteId: string;
}) {
  try {
    await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.idToken}` },
      body: JSON.stringify({
        targetUid: params.targetUid,
        callerName: params.callerName,
        roomId: params.roomId,
        inviteId: params.inviteId,
      }),
    });
  } catch {
    // Best-effort only — see comment above.
  }
}
