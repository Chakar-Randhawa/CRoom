"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/dashboard", label: "Call Hub" },
  { href: "/why-choose-us", label: "Why Choose Us" },
  { href: "/about", label: "About & Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline/80 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/dashboard" className="font-display text-xl tracking-tight text-ink">
          CRoom
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`tactile rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-ink text-paper" : "text-ink/70 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {user && (
            <button
              onClick={logOut}
              className="tactile ml-2 rounded-pill border border-hairline px-4 py-2 text-sm font-medium text-ink/70 hover:text-ink"
            >
              Sign out
            </button>
          )}
        </nav>

        <button
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="tactile flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-tile border border-hairline md:hidden"
        >
          <span className={`h-[1.5px] w-5 bg-ink transition-transform ${menuOpen ? "translate-y-[3.5px] rotate-45" : ""}`} />
          <span className={`h-[1.5px] w-5 bg-ink transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`h-[1.5px] w-5 bg-ink transition-transform ${menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden border-t border-hairline md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-tile px-3 py-2.5 text-sm font-medium text-ink/80 hover:bg-hairline/40"
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logOut();
                  }}
                  className="rounded-tile px-3 py-2.5 text-left text-sm font-medium text-ink/60"
                >
                  Sign out
                </button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
