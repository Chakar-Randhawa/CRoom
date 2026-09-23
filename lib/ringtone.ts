"use client";

// Real, synthesized ringtones using the Web Audio API — no external sound
// files needed (no hosting, no licensing, works offline once the JS has
// loaded). Two distinct tones so the caller and callee don't sound
// identical, mirroring how a real phone call sounds different on each end.
//
// Browser autoplay note: browsers only block audio that plays with ZERO
// prior user interaction anywhere on the page. Since ringtones only ever
// start after the user has already clicked something (opened the app,
// clicked "Call", clicked into the dashboard), this reliably plays in
// practice. If a browser ever blocks it, playXxxRingtone() fails silently
// rather than throwing — a missing ringtone should never crash a call.

let audioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let playing: "incoming" | "outgoing" | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function tone(ctx: AudioContext, freqs: number[], startTime: number, duration: number, volume: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
  gain.gain.setValueAtTime(volume, startTime + duration - 0.06);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  gain.connect(ctx.destination);

  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + duration);
    activeOscillators.push(osc);
  });
}

/** The callee's ringtone: an urgent two-tone pulse pair, classic phone cadence. */
export function playIncomingRingtone() {
  if (playing === "incoming") return;
  stopRingtone();
  playing = "incoming";
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => undefined);

  function cycle() {
    if (playing !== "incoming" || !ctx) return;
    const now = ctx.currentTime + 0.05;
    tone(ctx, [480, 620], now, 0.4, 0.18);
    tone(ctx, [480, 620], now + 0.5, 0.4, 0.18);
    loopTimer = setTimeout(cycle, 1900);
  }
  cycle();
}

/** The caller's ring-back tone: a single calmer, slower pulse. */
export function playOutgoingRingback() {
  if (playing === "outgoing") return;
  stopRingtone();
  playing = "outgoing";
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => undefined);

  function cycle() {
    if (playing !== "outgoing" || !ctx) return;
    const now = ctx.currentTime + 0.05;
    tone(ctx, [425], now, 1.1, 0.1);
    loopTimer = setTimeout(cycle, 3000);
  }
  cycle();
}

export function stopRingtone() {
  playing = null;
  if (loopTimer) clearTimeout(loopTimer);
  loopTimer = null;
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      // Already stopped — fine.
    }
  });
  activeOscillators = [];
}
