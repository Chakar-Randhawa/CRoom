"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const WORDMARK = "CRoom";

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // A real, running progress fill rather than a decorative one — it
    // paces the whole sequence out to ~3.5s and the exit only fires once
    // it visibly finishes, so the boot never feels rushed or arbitrary.
    const start = performance.now();
    const duration = 3200;
    let raf = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const pct = Math.min(1, elapsed / duration);
      setProgress(pct);
      if (pct < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(onComplete, 380);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-ink"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }}
    >
      {/* Ambient grid, faded in behind the wordmark for depth. */}
      <motion.div
        className="absolute inset-0 bg-grid-paper opacity-0"
        style={{ backgroundImage: "linear-gradient(to right, rgba(253,247,238,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(253,247,238,0.05) 1px, transparent 1px)" }}
        animate={{ opacity: [0, 0.6, 0.6] }}
        transition={{ duration: 2.4, times: [0, 0.4, 1], ease: "easeOut" }}
      />

      {/* Ambient coral glow drifting behind the wordmark. */}
      <motion.div
        className="absolute h-[420px] w-[420px] rounded-full bg-coral/20 blur-3xl"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.9, scale: 1.15 }}
        transition={{ duration: 2.6, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="relative flex flex-col items-center">
        <div className="flex overflow-hidden">
          {WORDMARK.split("").map((letter, i) => (
            <motion.span
              key={i}
              className="font-display text-6xl font-700 text-paper sm:text-7xl"
              initial={{ y: "110%", rotate: 6 }}
              animate={{ y: "0%", rotate: 0 }}
              transition={{
                duration: 0.75,
                delay: 0.15 + i * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0, ease: "easeOut" }}
          className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-paper/50"
        >
          Founded by Chakar Randhawa
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.35 }}
          className="mt-9 h-1 w-40 overflow-hidden rounded-pill bg-paper/10 sm:w-52"
        >
          <motion.div
            className="h-full rounded-pill bg-coral"
            style={{ width: `${progress * 100}%` }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
          className="mt-3 text-[11px] font-medium tracking-wide text-paper/35"
        >
          Preparing your private connection…
        </motion.p>
      </div>
    </motion.div>
  );
}
