"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const steps = [
  {
    title: "Nothing is stored on our servers",
    body: "Your camera, microphone, and chat travel directly between you and the person you're calling. CRoom never records, transcodes, or retains your call.",
  },
  {
    title: "Connections adapt to your network",
    body: "If your connection weakens mid-call, CRoom automatically lowers video quality — and can drop to audio only — before it drops the call itself.",
  },
  {
    title: "Three ways to connect",
    body: "Call someone directly by their email, generate a private room link, or share a QR code. You choose how people reach you.",
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div className="dvh-screen flex flex-col items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-pill transition-colors duration-300 ${
                i <= index ? "bg-pine" : "bg-hairline"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="min-h-[220px]"
          >
            <h2 className="font-display text-3xl leading-tight text-ink">{step.title}</h2>
            <p className="mt-4 text-base leading-relaxed text-ink/70">{step.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={onDone}
            className="text-sm font-medium text-sage hover:text-ink"
          >
            Skip
          </button>
          <button
            onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
            className="tactile rounded-pill bg-ink px-7 py-3 text-sm font-semibold text-paper shadow-tile"
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
