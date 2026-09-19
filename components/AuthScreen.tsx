"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function AuthScreen() {
  const { signUp, logIn } = useAuth();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signUp") {
        if (!displayName.trim()) {
          setError("Enter a display name.");
          setSubmitting(false);
          return;
        }
        await signUp(email, password, displayName.trim());
      } else {
        await logIn(email, password);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? humanizeFirebaseError(err.message) : "Something went wrong. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dvh-screen flex items-center justify-center bg-paper px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <h1 className="font-display text-3xl text-ink">
          {mode === "signIn" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {mode === "signIn"
            ? "Sign in with your email and password."
            : "Just an email, a password, and a name — nothing else."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {mode === "signUp" && (
            <Field
              label="Display name"
              type="text"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Jordan Lee"
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          />

          {error && (
            <p role="alert" className="rounded-tile bg-clay/10 px-3 py-2 text-sm text-clay-dark">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="tactile mt-2 rounded-pill bg-pine px-6 py-3.5 text-sm font-semibold text-paper shadow-tile disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "signIn" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode((m) => (m === "signIn" ? "signUp" : "signIn"));
            setError(null);
          }}
          className="mt-6 w-full text-center text-sm text-ink/60 hover:text-ink"
        >
          {mode === "signIn" ? "New to CRoom? Create an account" : "Already have an account? Sign in"}
        </button>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="rounded-tile border border-hairline bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-pine"
      />
    </label>
  );
}

function humanizeFirebaseError(message: string): string {
  if (message.includes("auth/email-already-in-use")) return "That email is already registered.";
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password"))
    return "Incorrect email or password.";
  if (message.includes("auth/user-not-found")) return "No account found with that email.";
  if (message.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (message.includes("auth/invalid-email")) return "Enter a valid email address.";
  return "Something went wrong. Please try again.";
}
