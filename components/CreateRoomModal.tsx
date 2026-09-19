"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { generateRoomId } from "@/lib/calling";

export default function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [roomId] = useState(() => generateRoomId());
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // The hash fragment never leaves the browser in an HTTP request, so
    // the server has no record of which room this link points to.
    setLink(`${window.location.origin}/room#${roomId}:callee`);
  }, [roomId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can be blocked by permissions policy; the link is
      // still visible on screen to copy manually.
    }
  }

  function enterRoom() {
    router.push(`/room#${roomId}:caller`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-sm rounded-tile bg-white p-6 shadow-tile"
      >
        <h3 className="font-display text-xl text-ink">Your room is ready</h3>
        <p className="mt-1 text-sm text-sage">Share the link or QR code — whoever opens it joins instantly.</p>

        <div className="mt-5 flex justify-center rounded-tile border border-hairline bg-paper p-6">
          {link && <QRCodeSVG value={link} size={168} bgColor="#F6F4EF" fgColor="#0F1B1A" />}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-tile border border-hairline bg-paper px-3 py-2.5">
          <span className="flex-1 truncate text-xs text-ink/70">{link}</span>
          <button
            onClick={copyLink}
            className="tactile shrink-0 rounded-pill bg-ink px-3 py-1.5 text-xs font-semibold text-paper"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="tactile flex-1 rounded-pill border border-hairline px-4 py-3 text-sm font-medium text-ink/70"
          >
            Close
          </button>
          <button
            onClick={enterRoom}
            className="tactile flex-1 rounded-pill bg-clay px-4 py-3 text-sm font-semibold text-paper"
          >
            Enter room
          </button>
        </div>
      </motion.div>
    </div>
  );
}
