"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import BootSequence from "@/components/BootSequence";
import Onboarding from "@/components/Onboarding";
import AuthScreen from "@/components/AuthScreen";
import { useAuth } from "@/context/AuthContext";

type Stage = "boot" | "onboarding" | "auth";

const ONBOARDING_KEY = "croom.onboarded";

export default function HomePage() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [stage, setStage] = useState<Stage>("boot");

  useEffect(() => {
    if (!initializing && user) {
      router.replace("/dashboard");
    }
  }, [initializing, user, router]);

  function handleBootComplete() {
    const alreadyOnboarded = typeof window !== "undefined" && localStorage.getItem(ONBOARDING_KEY);
    setStage(alreadyOnboarded ? "auth" : "onboarding");
  }

  function handleOnboardingDone() {
    if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "true");
    setStage("auth");
  }

  return (
    <main>
      <AnimatePresence mode="wait">
        {stage === "boot" && <BootSequence key="boot" onComplete={handleBootComplete} />}
      </AnimatePresence>
      {stage === "onboarding" && <Onboarding onDone={handleOnboardingDone} />}
      {stage === "auth" && <AuthScreen />}
    </main>
  );
}
