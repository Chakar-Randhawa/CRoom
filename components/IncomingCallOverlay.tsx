"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { listenForIncomingCalls, listenToInvite, updateInviteStatus } from "@/lib/calling";
import { playIncomingRingtone, stopRingtone } from "@/lib/ringtone";

interface IncomingCall {
  id: string;
  fromDisplayName: string;
  roomId: string;
}

export default function IncomingCallOverlay() {
  const { user } = useAuth();
  const router = useRouter();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const settledRef = useRef(false);

  // Watch for new invites addressed to me.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenForIncomingCalls(user.uid, (invite) => {
      settledRef.current = false;
      setIncoming(invite);
    });
    return unsubscribe;
  }, [user]);

  // Ring, and watch the invite for the caller cancelling / timing out.
  useEffect(() => {
    if (!incoming) return;
    playIncomingRingtone();

    const unsubInvite = listenToInvite(incoming.id, (data) => {
      if (settledRef.current) return;
      if (!data || data.status === "cancelled" || data.status === "timeout") {
        settledRef.current = true;
        stopRingtone();
        setIncoming(null);
      }
    });

    return () => {
      stopRingtone();
      unsubInvite();
    };
  }, [incoming]);

  async function accept() {
    if (!incoming || settledRef.current) return;
    settledRef.current = true;
    const roomId = incoming.roomId;
    const inviteId = incoming.id;
    stopRingtone();
    setIncoming(null);
    await updateInviteStatus(inviteId, "accepted");
    router.push(`/room#${roomId}:callee`);
  }

  async function decline() {
    if (!incoming || settledRef.current) return;
    settledRef.current = true;
    stopRingtone();
    await updateInviteStatus(incoming.id, "declined");
    setIncoming(null);
  }

  return (
    <AnimatePresence>
      {incoming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
          style={{ backgroundColor: "#171412" }}
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-28 w-28 items-center justify-center rounded-full text-4xl font-bold sm:h-32 sm:w-32"
            style={{ backgroundColor: "#FB7A4C", color: "#FDF7EE" }}
          >
            {incoming.fromDisplayName.slice(0, 1).toUpperCase()}
          </motion.div>

          <h2 className="mt-6 font-display text-3xl text-center" style={{ color: "#FDF7EE" }}>
            {incoming.fromDisplayName}
          </h2>
          <p className="mt-2 text-sm font-bold uppercase tracking-widest" style={{ color: "#FB7A4C" }}>
            Incoming CRoom call
          </p>

          <div className="mt-14 flex items-center gap-10">
            <div className="flex flex-col items-center gap-2">
              <motion.button
                onClick={decline}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
                style={{ backgroundColor: "#E1602F" }}
                aria-label="Decline call"
              >
                <PhoneOffIcon />
              </motion.button>
              <span className="text-xs font-semibold" style={{ color: "#FDF7EE", opacity: 0.6 }}>
                Decline
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <motion.button
                onClick={accept}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
                style={{ backgroundColor: "#2E7D4F" }}
                aria-label="Accept call"
              >
                <PhoneIcon />
              </motion.button>
              <span className="text-xs font-semibold" style={{ color: "#FDF7EE", opacity: 0.6 }}>
                Accept
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PhoneOffIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FDF7EE" strokeWidth="2">
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.86.3 1.77.5 2.71.6a2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 013.11 2h3a2 2 0 012 1.72c.1.94.3 1.85.6 2.71a2 2 0 01-.45 2.11L7 9.81" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FDF7EE" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.08 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13 1 .37 1.99.72 2.93a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.15-1.15a2 2 0 012.11-.45c.94.35 1.93.59 2.93.72a2 2 0 011.72 2z" />
    </svg>
  );
}
