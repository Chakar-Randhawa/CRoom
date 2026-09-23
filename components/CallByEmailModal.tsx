"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { findUserByEmail, generateRoomId, ringUser, sendCallPushNotification } from "@/lib/calling";

export default function CallByEmailModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { startOutgoingCall } = useCall();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setStatus("searching");
    setErrorMessage(null);

    const target = await findUserByEmail(email);
    if (!target) {
      setStatus("error");
      setErrorMessage("No CRoom account found with that email.");
      return;
    }
    if (target.uid === user.uid) {
      setStatus("error");
      setErrorMessage("That's your own account.");
      return;
    }

    const roomId = generateRoomId();
    const inviteId = await ringUser({
      targetUid: target.uid,
      fromUid: user.uid,
      fromDisplayName: user.displayName ?? "A CRoom user",
      roomId,
    });

    // Hand off to the full-screen "Calling…" experience instead of
    // jumping straight into the room — the room only opens once the
    // other person actually accepts.
    startOutgoingCall({
      inviteId,
      roomId,
      targetUid: target.uid,
      targetName: target.displayName,
    });
    onClose();

    // Fire-and-forget: notifies the recipient even if their CRoom tab
    // isn't open. Not awaited — it must never delay the outgoing-call
    // screen, and it's a pure enhancement on top of the Firestore invite
    // that already just fired above.
    user.getIdToken().then((idToken) => {
      sendCallPushNotification({
        idToken,
        targetUid: target.uid,
        callerName: user.displayName ?? "A CRoom user",
        roomId,
        inviteId,
      });
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-5 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-sm rounded-tile bg-white p-6 shadow-tile"
      >
        <h3 className="font-display text-xl text-ink">Call by email</h3>
        <p className="mt-1 text-sm text-sage">Enter the email they registered on CRoom.</p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="rounded-tile border border-hairline px-4 py-3 text-sm outline-none focus:border-coral"
          />
          {errorMessage && <p className="text-sm text-coral-dark">{errorMessage}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="tactile flex-1 rounded-pill border border-hairline px-4 py-3 text-sm font-medium text-ink/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "searching"}
              className="tactile flex-1 rounded-pill bg-coral px-4 py-3 text-sm font-bold text-paper disabled:opacity-60"
            >
              {status === "searching" ? "Looking up…" : "Call"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
