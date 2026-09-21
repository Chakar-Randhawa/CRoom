"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const WORDMARK = "CRoom";

// Four petals that converge into a mark, echoing the classic "pieces fly
// in and assemble" boot logo (Windows-flag style) but built from the
// brand's own coral palette instead of generic primary colors, plus a
// Payoneer-style rotating orbit ring around the assembly — this is the
// "heavy, enterprise" version of the reveal instead of a plain fade-in.
const PETALS = [
  { color: "#FB7A4C", from: { x: -140, y: -140, rotate: -180 } }, // coral
  { color: "#FFAF8B", from: { x: 140, y: -140, rotate: 180 } }, // coral light
  { color: "#E1602F", from: { x: 140, y: 140, rotate: -180 } }, // coral dark
  { color: "#FDF7EE", from: { x: -140, y: 140, rotate: 180 } }, // paper
];

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // A real, running progress fill rather than a decorative one — it
    // paces the whole sequence out to ~3.9s and the exit only fires once
    // it visibly finishes, so the boot never feels rushed or arbitrary.
    const start = performance.now();
    const duration = 3500;
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
      style={{ backgroundColor: "#171412" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }}
    >
      {/* Ambient grid, faded in behind everything for depth. */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(253,247,238,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(253,247,238,0.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          opacity: 0,
        }}
        animate={{ opacity: [0, 0.6, 0.6] }}
        transition={{ duration: 2.4, times: [0, 0.4, 1], ease: "easeOut" }}
      />

      {/* Ambient coral glow drifting behind the whole scene. */}
      <motion.div
        className="absolute h-[460px] w-[460px] rounded-full"
        style={{ backgroundColor: "#FB7A4C", opacity: 0.16, filter: "blur(90px)" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.16, scale: 1.15 }}
        transition={{ duration: 2.8, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="relative flex flex-col items-center">
        {/* --- The assembly: orbit ring + 4 converging petals forming a mark --- */}
        <div className="relative flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
          {/* Payoneer-style rotating orbit ring, visible only during assembly. */}
          <motion.svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], rotate: 720 }}
            transition={{
              opacity: { duration: 1.9, times: [0, 0.15, 0.75, 1], ease: "easeInOut" },
              rotate: { duration: 1.9, ease: [0.4, 0, 0.2, 1] },
            }}
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#FB7A4C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="90 190"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#FDF7EE"
              strokeOpacity="0.25"
              strokeWidth="1"
            />
          </motion.svg>

          {/* Four petals fly in from the corners, spinning, and converge into
              a compact pinwheel mark — then the whole mark punches in with a
              spring "settle" instead of a soft linear ease, for real weight. */}
          {PETALS.map((petal, i) => (
            <motion.div
              key={i}
              className="absolute h-9 w-9 rounded-xl sm:h-11 sm:w-11"
              style={{ backgroundColor: petal.color }}
              initial={{
                x: petal.from.x,
                y: petal.from.y,
                rotate: petal.from.rotate,
                opacity: 0,
                scale: 0.4,
              }}
              animate={{
                x: i % 2 === 0 ? -10 : 10,
                y: i < 2 ? -10 : 10,
                rotate: 45,
                opacity: 1,
                scale: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 12,
                mass: 1.1,
                delay: 0.1 + i * 0.08,
              }}
            />
          ))}

          {/* The assembled mark holds briefly, then the whole cluster
              collapses inward and fades as the wordmark takes over. */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.45, delay: 1.55, ease: [0.4, 0, 1, 1] }}
          />
        </div>

        {/* --- Wordmark: punches in with scale + blur settle right as the
            mark above dissolves, instead of a gentle fade. --- */}
        <div className="-mt-6 flex overflow-visible sm:-mt-8">
          {WORDMARK.split("").map((letter, i) => (
            <motion.span
              key={i}
              className="font-display text-6xl font-bold sm:text-7xl"
              style={{ color: "#FDF7EE" }}
              initial={{ y: 40, opacity: 0, scale: 1.3, filter: "blur(10px)" }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{
                duration: 0.6,
                delay: 1.65 + i * 0.055,
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
          transition={{ duration: 0.6, delay: 2.3, ease: "easeOut" }}
          className="mt-4 text-xs font-bold uppercase tracking-[0.3em]"
          style={{ color: "#FDF7EE", opacity: 0.85 }}
        >
          Founded by Chakar Randhawa
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 2.55 }}
          className="mt-9 h-1.5 w-40 overflow-hidden rounded-pill sm:w-52"
          style={{ backgroundColor: "rgba(253,247,238,0.15)" }}
        >
          <motion.div
            className="h-full rounded-pill"
            style={{ width: `${progress * 100}%`, backgroundColor: "#FB7A4C" }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 2.7 }}
          className="mt-3 text-[11px] font-semibold tracking-wide"
          style={{ color: "#FDF7EE", opacity: 0.55 }}
        >
          Preparing your private connection…
        </motion.p>
      </div>
    </motion.div>
  );
}
