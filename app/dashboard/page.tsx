"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeviceSettings from "@/components/DeviceSettings";
import CallByEmailModal from "@/components/CallByEmailModal";
import CreateRoomModal from "@/components/CreateRoomModal";
import MagneticButton from "@/components/MagneticButton";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [micGain, setMicGain] = useState(1);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-dvh bg-grid-paper">
        <Navbar />
        <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <p className="text-sm font-semibold text-sage">Welcome back</p>
            <h1 className="font-display text-4xl text-ink">{user?.displayName ?? "there"}</h1>
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink/45">
              Before you connect
            </h2>
            <DeviceSettings
              cameraEnabled={cameraEnabled}
              onCameraEnabledChange={setCameraEnabled}
              micEnabled={micEnabled}
              onMicEnabledChange={setMicEnabled}
              noiseSuppression={noiseSuppression}
              onNoiseSuppressionChange={setNoiseSuppression}
              micGain={micGain}
              onMicGainChange={setMicGain}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink/45">
              Start a call
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MagneticButton
                onClick={() => setEmailModalOpen(true)}
                className="flex flex-col items-start gap-3 rounded-tile bg-ink p-6 text-left shadow-tile"
              >
                <span className="font-display text-2xl text-paper">Call someone</span>
                <span className="text-sm text-paper/70">
                  Reach a person directly by the email they registered with CRoom.
                </span>
              </MagneticButton>
              <MagneticButton
                onClick={() => setRoomModalOpen(true)}
                className="flex flex-col items-start gap-3 rounded-tile bg-coral p-6 text-left shadow-tile"
              >
                <span className="font-display text-2xl text-paper">Create a room</span>
                <span className="text-sm text-paper/80">
                  Generate a private link and QR code — anyone with it joins instantly.
                </span>
              </MagneticButton>
            </div>
          </motion.section>
        </main>
        <Footer />
      </div>

      <AnimatePresence>
        {emailModalOpen && <CallByEmailModal key="email-modal" onClose={() => setEmailModalOpen(false)} />}
        {roomModalOpen && <CreateRoomModal key="room-modal" onClose={() => setRoomModalOpen(false)} />}
      </AnimatePresence>
    </AuthGuard>
  );
}
