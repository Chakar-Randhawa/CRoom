"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-4 z-40 flex justify-center px-4">
      <motion.header
        animate={{
          boxShadow: scrolled
            ? "0 10px 34px -10px rgba(23,20,18,0.22)"
            : "0 6px 20px -10px rgba(23,20,18,0.12)",
        }}
        transition={{ duration: 0.3 }}
        className="flex w-full max-w-3xl items-center justify-between rounded-pill bg-card px-3 py-2 sm:px-5"
      >
        <Link href="/dashboard" className="px-2 font-display text-2xl text-ink">
          CRoom
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`tactile relative rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? "text-ink" : "text-ink/60 hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-pill bg-hairline/70"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={logOut}
              className="tactile hidden rounded-pill bg-coral px-5 py-2.5 text-sm font-bold text-paper shadow-tile md:inline-flex"
            >
              Sign out
            </button>
          )}
          <button
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="tactile flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full border border-hairline md:hidden"
          >
            <span className={`h-[1.5px] w-4 bg-ink transition-transform ${menuOpen ? "translate-y-[3.5px] rotate-45" : ""}`} />
            <span className={`h-[1.5px] w-4 bg-ink transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`h-[1.5px] w-4 bg-ink transition-transform ${menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0, y: -6 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-16 w-full max-w-3xl overflow-hidden rounded-tile bg-card shadow-floating md:hidden"
          >
            <div className="flex flex-col gap-1 p-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-tile px-3 py-2.5 text-sm font-semibold text-ink/80 hover:bg-hairline/40"
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
                  className="rounded-tile bg-coral px-3 py-2.5 text-left text-sm font-bold text-paper"
                >
                  Sign out
                </button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
