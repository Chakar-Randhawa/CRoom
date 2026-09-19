"use client";

import { useState, type FormEvent } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <section className="mb-16">
          <h1 className="font-display text-4xl text-ink">About CRoom</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
            CRoom exists on the belief that a conversation between two people shouldn't leave
            a trace on someone else's server. It was founded by Chakar Randhawa on a simple
            premise: your camera and your voice belong on your device, and only there, except
            for the fraction of a second it takes to reach the person you called.
          </p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
            Every call runs directly between browsers over WebRTC. We don't record calls, we
            don't keep chat logs, and we don't build a profile of who you talk to.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-ink">Contact us</h2>
          <p className="mt-2 text-sm text-sage">
            This form doesn't get stored anywhere — it opens your email client so the message
            goes straight to us.
          </p>

          {sent ? (
            <p className="mt-6 rounded-tile bg-pine/10 px-4 py-3 text-sm text-pine-dark">
              Your email client should be open now. If it didn't, write to hello@croom.app directly.
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
              <button
                type="submit"
                className="tactile self-start rounded-pill bg-pine px-6 py-3 text-sm font-semibold text-paper shadow-tile"
              >
                Send message
              </button>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </AuthGuard>
  );
}
