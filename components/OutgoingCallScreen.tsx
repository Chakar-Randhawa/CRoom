"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cancelInvite, listenToInvite, updateInviteStatus } from "@/lib/calling";
import { listenToPresence } from "@/lib/presence";
import { playOutgoingRingback, stopRingtone } from "@/lib/ringtone";

interface Props {
  inviteId: string;
  roomId: string;
  targetUid: string;
  targetName: string;
  onClose: () => void;
}

type Phase = "calling" | "ringing" | "accepted" | "declined" | "timeout" | "cancelled";

const TIMEOUT_MS = 35000;

const STATUS_LABEL: Record<Phase, string> = {
  calling: "Calling…",
  ringing: "Ringing…",
  accepted: "Connecting…",
  declined: "Call declined",
  timeout: "No answer",
  cancelled: "Call ended",
};

export default function OutgoingCallScreen({ inviteId, roomId, targetUid, targetName, onClose }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("calling");
  const [targetOnline, setTargetOnline] = useState<boolean | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    playOutgoingRingback();

    const ringingTimer = setTimeout(() => {
      setPhase((p) => (p === "calling" ? "ringing" : p));
    }, 900);

    const timeoutTimer = setTimeout(async () => {
      if (settledRef.current) return;
      settledRef.current = true;
      stopRingtone();
      setPhase("timeout");
      await updateInviteStatus(inviteId, "timeout");
      setTimeout(() => {
        cancelInvite(inviteId);
        onClose();
      }, 2200);
    }, TIMEOUT_MS);

    const unsubInvite = listenToInvite(inviteId, (data) => {
      if (settledRef.current || !data) return;

      if (data.status === "accepted") {
        settledRef.current = true;
        clearTimeout(timeoutTimer);
        stopRingtone();
        setPhase("accepted");
        setTimeout(() => {
          router.push(`/room#${roomId}:caller`);
          onClose();
        }, 350);
      } else if (data.status === "declined") {
        settledRef.current = true;
        clearTimeout(timeoutTimer);
        stopRingtone();
        setPhase("declined");
        setTimeout(() => {
          cancelInvite(inviteId);
          onClose();
        }, 2200);
      }
    });

    const unsubPresence = listenToPresence(targetUid, setTargetOnline);

    return () => {
      clearTimeout(ringingTimer);
      clearTimeout(timeoutTimer);
      unsubInvite();
      unsubPresence();
      stopRingtone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel() {
    if (settledRef.current) return;
    settledRef.current = true;
    stopRingtone();
    setPhase("cancelled");
    await updateInviteStatus(inviteId, "cancelled");
    await cancelInvite(inviteId);
    onClose();
  }

  const canCancel = phase === "calling" || phase === "ringing";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#171412" }}
    >
      <motion.div
        animate={canCancel ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-28 w-28 items-center justify-center rounded-full text-4xl font-bold sm:h-32 sm:w-32"
        style={{ backgroundColor: "#FB7A4C", color: "#FDF7EE" }}
      >
        {targetName.slice(0, 1).toUpperCase()}
      </motion.div>

      <h2 className="mt-6 font-display text-3xl text-center" style={{ color: "#FDF7EE" }}>
        {targetName}
      </h2>
      <p className="mt-2 text-sm font-bold uppercase tracking-widest" style={{ color: "#FB7A4C" }}>
        {STATUS_LABEL[phase]}
      </p>

      {targetOnline === false && canCancel && (
        <p className="mt-3 text-xs" style={{ color: "#FDF7EE", opacity: 0.55 }}>
          This person appears to be offline right now
        </p>
      )}

      {canCancel && (
        <motion.button
          onClick={handleCancel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          className="mt-12 flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: "#E1602F" }}
          aria-label="Cancel call"
        >
          <PhoneOffIcon />
        </motion.button>
      )}
    </motion.div>
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
