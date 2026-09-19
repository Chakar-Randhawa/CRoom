"use client";

import { motion } from "framer-motion";

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      onAnimationComplete={() => {
        // no-op on mount; completion is driven by the timeline below
      }}
    >
      <motion.div
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => {
          setTimeout(onComplete, 650);
        }}
        className="flex flex-col items-center"
      >
        <motion.h1
          className="font-display text-5xl italic tracking-tight text-paper sm:text-6xl"
          initial={{ letterSpacing: "0.15em", opacity: 0 }}
          animate={{ letterSpacing: "0em", opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          CRoom
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75, ease: "easeOut" }}
          className="mt-3 text-sm font-medium uppercase tracking-[0.25em] text-sage"
        >
          Founded by Chakar Randhawa
        </motion.p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 h-[2px] w-24 origin-center bg-pine-light"
        />
      </motion.div>
    </motion.div>
  );
}
