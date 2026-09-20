"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import { useWebRTC, type CallQuality } from "@/lib/webrtc";

function parseHash(): { roomId: string; isCaller: boolean } | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  const [roomId, role] = raw.split(":");
  if (!roomId) return null;
  return { roomId, isCaller: role === "caller" };
}

const QUALITY_LABEL: Record<CallQuality, string> = {
  high: "High quality",
  medium: "Reduced quality — adapting to your network",
  "audio-only": "Audio only — network is limited",
};

function RoomInner() {
  const router = useRouter();
  const [target, setTarget] = useState<{ roomId: string; isCaller: boolean } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setTarget(parseHash());
  }, []);

  const {
    connectionState,
    localStream,
    remoteStream,
    quality,
    micMuted,
    cameraOff,
    enhanceEnabled,
    chatMessages,
    start,
    hangUp,
    toggleMic,
    toggleCamera,
    toggleEnhance,
    sendChatMessage,
  } = useWebRTC({ roomId: target?.roomId ?? "pending", isCaller: target?.isCaller ?? false });

  useEffect(() => {
    if (target) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  async function endCall() {
    await hangUp();
    router.push("/dashboard");
  }

  function submitChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput("");
  }

  if (!target) {
    return (
      <div className="call-screen flex items-center justify-center bg-ink px-6 text-center text-paper/80">
        <p>This room link is missing its room code. Ask for a fresh invite link.</p>
      </div>
    );
  }

  return (
    // `call-screen` locks this container to exactly 100dvh (the real,
    // current visible viewport) and hides overflow — the fix for the
    // "half the call is off-screen, have to scroll" bug. It self-adjusts
    // on laptop, tablet, and phone because 100dvh is recalculated by the
    // browser whenever its own chrome (address bar, etc.) shows or hides.
    <div className="call-screen relative flex flex-col bg-ink">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />

        <AnimatePresence>
          {connectionState !== "connected" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/90 text-paper"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-paper/20 border-t-coral" />
              <p className="text-sm text-paper/70">{statusLabel(connectionState)}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Local preview: sized relative to viewport (vw/vh via clamp) so
            it scales sensibly from phone to ultra-wide desktop, and sits
            clear of the control bar via bottom offset rather than a fixed
            pixel value that could overlap on short viewports. */}
        <motion.video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-4 right-4 rounded-tile border border-paper/20 object-cover shadow-tile"
          style={{
            width: "clamp(88px, 22vw, 176px)",
            height: "clamp(120px, 30vw, 232px)",
          }}
        />

        {connectionState === "connected" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-4 top-4 rounded-pill bg-ink/70 px-3 py-1.5 text-xs font-medium text-paper/80"
          >
            {QUALITY_LABEL[quality]}
          </motion.div>
        )}

        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-0 right-0 top-0 flex w-full max-w-xs flex-col border-l border-paper/10 bg-ink/95 sm:w-80"
            >
              <div className="flex-1 overflow-y-auto p-4">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-paper/40">
                    Messages here go peer-to-peer over the data channel — never through a server.
                  </p>
                )}
                {chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`mb-2 max-w-[85%] rounded-tile px-3 py-2 text-sm ${
                      m.from === "me" ? "ml-auto bg-coral text-paper" : "bg-white/10 text-paper"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <form onSubmit={submitChat} className="flex gap-2 border-t border-paper/10 p-3">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message"
                  className="flex-1 rounded-pill bg-white/10 px-4 py-2 text-sm text-paper outline-none placeholder:text-paper/40"
                />
                <button
                  type="submit"
                  className="tactile rounded-pill bg-coral px-4 py-2 text-sm font-semibold text-paper"
                >
                  Send
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar: fixed height, never competes with the video area for
          space, and respects the safe-area inset on notched phones so it's
          never clipped by a home-indicator bar. */}
      <div
        className="flex shrink-0 items-center justify-center gap-2.5 bg-ink py-4 sm:gap-3 sm:py-5"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <ControlButton active={!micMuted} onClick={toggleMic} label={micMuted ? "Unmute" : "Mute"} icon="mic" />
        <ControlButton
          active={!cameraOff}
          onClick={toggleCamera}
          label={cameraOff ? "Camera on" : "Camera off"}
          icon="camera"
        />
        <ControlButton
          active={enhanceEnabled}
          onClick={toggleEnhance}
          label={enhanceEnabled ? "Clarity on" : "Clarity off"}
          icon="sparkle"
        />
        <ControlButton active={chatOpen} onClick={() => setChatOpen((o) => !o)} label="Chat" icon="chat" />
        <motion.button
          onClick={endCall}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-coral text-paper shadow-tile sm:h-14 sm:w-14"
          aria-label="End call"
        >
          <PhoneOffIcon />
        </motion.button>
      </div>
    </div>
  );
}

function statusLabel(state: string) {
  switch (state) {
    case "collecting-media":
      return "Requesting camera and microphone…";
    case "waiting-for-peer":
      return "Waiting for the other person to join…";
    case "connecting":
      return "Connecting…";
    case "error":
      return "This room could not be reached. It may have already ended.";
    default:
      return "Setting up…";
  }
}

function ControlButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: "mic" | "camera" | "chat" | "sparkle";
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      className={`flex h-12 w-12 items-center justify-center rounded-full shadow-tile sm:h-14 sm:w-14 ${
        active ? "bg-white/10 text-paper" : "bg-paper/90 text-ink"
      } ${icon === "sparkle" && active ? "ring-2 ring-coral" : ""}`}
    >
      {icon === "mic" && <MicIcon off={!active} />}
      {icon === "camera" && <CameraIcon off={!active} />}
      {icon === "chat" && <ChatIcon />}
      {icon === "sparkle" && <SparkleIcon />}
    </motion.button>
  );
}

function MicIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" />
      {off && <line x1="2" y1="2" x2="22" y2="22" />}
    </svg>
  );
}

function CameraIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
      {off && <line x1="1" y1="1" x2="23" y2="23" />}
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" />
      <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" />
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.86.3 1.77.5 2.71.6a2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 013.11 2h3a2 2 0 012 1.72c.1.94.3 1.85.6 2.71a2 2 0 01-.45 2.11L7 9.81" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}

export default function RoomPage() {
  return (
    <AuthGuard>
      <RoomInner />
    </AuthGuard>
  );
}
