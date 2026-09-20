"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MagneticButton from "@/components/MagneticButton";

export default function AboutPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Zero-storage by design: nothing here is written to a database.
    // Wire this to your own mail relay (e.g. a serverless function that
    // forwards to an inbox) if you want to actually receive messages —
    // intentionally left as a single integration point rather than a
    // silent fake submit.
    const subject = encodeURIComponent(`CRoom contact from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:hello@croom.app?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <AuthGuard>
      <div className="min-h-dvh bg-grid-paper">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <h1 className="font-display text-5xl text-ink">About CRoom</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
            CRoom exists on the belief that a conversation between two people shouldn&apos;t leave
            a trace on someone else&apos;s server. It was founded by Chakar Randhawa on a simple
            premise: your camera and your voice belong on your device, and only there, except
            for the fraction of a second it takes to reach the person you called.
          </p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
            Every call runs directly between browsers over WebRTC. We don&apos;t record calls, we
            don&apos;t keep chat logs, and we don&apos;t build a profile of who you talk to.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-display text-3xl text-ink">Contact us</h2>
          <p className="mt-2 text-sm text-sage">
            This form doesn&apos;t get stored anywhere — it opens your email client so the message
            goes straight to us.
          </p>

          {sent ? (
            <p className="mt-6 rounded-tile bg-coral/10 px-4 py-3 text-sm text-coral-dark">
              Your email client should be open now. If it didn&apos;t, write to hello@croom.app directly.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-tile border border-hairline bg-white px-4 py-3 text-sm outline-none focus:border-pine"
              />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="rounded-tile border border-hairline bg-white px-4 py-3 text-sm outline-none focus:border-pine"
              />
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                className="resize-none rounded-tile border border-hairline bg-white px-4 py-3 text-sm outline-none focus:border-pine"
              />
              <MagneticButton
                type="submit"
                className="tactile self-start rounded-pill bg-coral px-6 py-3 text-sm font-bold text-paper shadow-tile"
              >
                Send message
              </MagneticButton>
            </form>
          )}
        </motion.section>
      </main>
      <Footer />
      </div>
    </AuthGuard>
  );
}
