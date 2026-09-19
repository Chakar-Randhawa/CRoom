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
