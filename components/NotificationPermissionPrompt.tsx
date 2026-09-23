"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { enableCallNotifications, getNotificationPermissionState } from "@/lib/messaging";

const DISMISSED_KEY = "croom.notif-prompt-dismissed";

export default function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "requesting">("idle");

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (getNotificationPermissionState() !== "default") return; // already decided, or unsupported

    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [user]);

  async function handleEnable() {
    if (!user) return;
    setStatus("requesting");
    await enableCallNotifications(user.uid);
    setStatus("idle");
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-tile border border-hairline bg-card p-4 shadow-floating"
        >
          <p className="text-sm font-bold text-ink">Never miss a call</p>
          <p className="mt-1 text-xs text-sage">
            Turn on notifications so CRoom can alert you even when this tab isn&apos;t open.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDismiss}
              className="tactile flex-1 rounded-pill border border-hairline px-3 py-2 text-xs font-semibold text-ink/70"
            >
              Not now
            </button>
            <button
              onClick={handleEnable}
              disabled={status === "requesting"}
              className="tactile flex-1 rounded-pill bg-coral px-3 py-2 text-xs font-bold text-paper disabled:opacity-60"
            >
              {status === "requesting" ? "Enabling…" : "Enable"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
