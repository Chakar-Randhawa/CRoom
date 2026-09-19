"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeviceSettings from "@/components/DeviceSettings";
import CallByEmailModal from "@/components/CallByEmailModal";
import CreateRoomModal from "@/components/CreateRoomModal";
import IncomingCallBanner from "@/components/IncomingCallBanner";
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
      <IncomingCallBanner />
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-sage">Welcome back</p>
          <h1 className="font-display text-3xl text-ink">{user?.displayName ?? "there"}</h1>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50">
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
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50">
            Start a call
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => setEmailModalOpen(true)}
              className="tactile flex flex-col items-start gap-3 rounded-tile bg-pine p-6 text-left shadow-tile"
            >
              <span className="font-display text-xl text-paper">Call someone</span>
              <span className="text-sm text-paper/75">
                Reach a person directly by the email they registered with CRoom.
              </span>
            </button>
            <button
              onClick={() => setRoomModalOpen(true)}
              className="tactile flex flex-col items-start gap-3 rounded-tile bg-clay p-6 text-left shadow-tile"
            >
              <span className="font-display text-xl text-paper">Create a room</span>
              <span className="text-sm text-paper/75">
                Generate a private link and QR code — anyone with it joins instantly.
              </span>
            </button>
          </div>
        </section>
      </main>
      <Footer />

      {emailModalOpen && <CallByEmailModal onClose={() => setEmailModalOpen(false)} />}
      {roomModalOpen && <CreateRoomModal onClose={() => setRoomModalOpen(false)} />}
    </AuthGuard>
  );
}
