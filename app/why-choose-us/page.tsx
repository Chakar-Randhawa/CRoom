"use client";

import { motion } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const rows = [
  {
    feature: "Where your video and audio travel",
    croom: "Directly between browsers (peer-to-peer)",
    typical: "Routed through the provider's servers",
  },
  {
    feature: "Call recordings",
    croom: "Never created",
    typical: "Often stored by default",
  },
  {
    feature: "Account data required",
    croom: "Email, password, display name only",
    typical: "Phone number, contacts, device IDs",
  },
  {
    feature: "Room link privacy",
    croom: "Room code lives only in the URL fragment — never sent to a server",
    typical: "Room IDs logged in server access logs",
  },
  {
    feature: "Behavior on a weak connection",
    croom: "Automatically downgrades video, then drops to audio-only",
    typical: "Call freezes or disconnects",
  },
  {
    feature: "Chat messages",
    croom: "Sent over a direct WebRTC data channel",
    typical: "Stored in a message database",
  },
];

export default function WhyChooseUsPage() {
  return (
    <AuthGuard>
      <div className="min-h-dvh bg-grid-paper">
        <Navbar />
        <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="font-display text-5xl text-ink">Why choose CRoom</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
              Most video calling products route your media through their infrastructure because
              it&apos;s simpler to build. CRoom is built the harder way, so that infrastructure
              never has your call to begin with.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 overflow-x-auto rounded-tile border border-hairline bg-card shadow-tile"
          >
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="px-5 py-4 font-bold text-ink">Feature</th>
                  <th className="px-5 py-4 font-bold text-coral">CRoom</th>
                  <th className="px-5 py-4 font-bold text-sage">Typical platforms</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={row.feature}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className={i % 2 === 0 ? "bg-paper" : "bg-card"}
                  >
                    <td className="px-5 py-4 align-top font-semibold text-ink">{row.feature}</td>
                    <td className="px-5 py-4 align-top text-ink/80">{row.croom}</td>
                    <td className="px-5 py-4 align-top text-sage">{row.typical}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <section className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Low overhead",
                body: "With no media servers relaying every call, infrastructure costs stay near-zero regardless of how many calls happen at once.",
              },
              {
                title: "Fewer failure points",
                body: "A call that doesn't depend on a media server can't be taken down by that server having a bad day.",
              },
              {
                title: "Runs on modest hardware",
                body: "The calling engine adapts resolution and bitrate in real time, so it stays usable on older phones and slower connections.",
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="rounded-tile border border-hairline bg-card p-5 shadow-tile"
              >
                <h3 className="font-display text-xl text-ink">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sage">{card.body}</p>
              </motion.div>
            ))}
          </section>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
