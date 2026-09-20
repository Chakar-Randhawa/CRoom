"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cancelInvite, listenForIncomingCalls } from "@/lib/calling";

interface IncomingCall {
  id: string;
  fromDisplayName: string;
  roomId: string;
}

export default function IncomingCallBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenForIncomingCalls(user.uid, (invite) => {
      setIncoming(invite);
    });
    return unsubscribe;
  }, [user]);

  async function accept() {
    if (!incoming) return;
    const roomId = incoming.roomId;
    const inviteId = incoming.id;
    setIncoming(null);
    await cancelInvite(inviteId);
    router.push(`/room#${roomId}:callee`);
  }

  async function decline() {
    if (!incoming) return;
    await cancelInvite(incoming.id);
    setIncoming(null);
  }

  return (
    <AnimatePresence>
      {incoming && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-tile border border-hairline bg-white p-4 shadow-tile"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">{incoming.fromDisplayName} is calling</p>
              <p className="text-xs text-sage">Incoming CRoom call</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={decline}
                className="tactile rounded-pill border border-hairline px-4 py-2 text-sm font-medium text-ink/70"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="tactile rounded-pill bg-coral px-4 py-2 text-sm font-bold text-paper"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
