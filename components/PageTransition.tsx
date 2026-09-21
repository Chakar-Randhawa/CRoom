"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        // Deliberately opacity-only. Animating `y` (or any transform-based
        // property) makes Framer Motion set `will-change: transform` on
        // this wrapper — and per the CSS spec, `will-change: transform`
        // turns the wrapper into the "containing block" for any
        // `position: fixed` descendant (the boot screen, call modals, the
        // incoming-call banner). Since this wrapper has no explicit
        // height, those fixed-position overlays then collapse to 0
        // height and silently stop painting, even though their own CSS
        // is completely correct. `will-change: opacity` does not create a
        // containing block, so a plain opacity crossfade is not just
        // simpler — it's the actual fix.
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
