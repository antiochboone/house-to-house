"use client";

import { useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setError(error.message);
      setState("error");
    } else {
      setState("sent");
    }
  };

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-4">
      <div className="mb-8 flex items-center justify-center gap-3">
        <svg width="42" height="37" viewBox="0 0 34 30" fill="none" aria-hidden>
          <path d="M2 14 L9.5 6.5 L17 14" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 13 V24 H14.5 V13" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="7.8" y="17.2" width="3.4" height="3.4" rx="0.6" fill="var(--accent)" />
          <path d="M15 16.5 L23.5 8 L32 16.5" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.5 15.5 V26 H29.5 V15.5" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="font-display text-2xl leading-none">House to House</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">Antioch Boone</div>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <div className="rounded-[14px] border border-line bg-surface p-5 text-center shadow-card">
          <p className="mb-2 text-[14.5px]">
            The app is running in <strong>demo mode</strong> — sign-in switches on once the
            database is connected.
          </p>
          <p className="mb-4 text-[13px] text-muted">
            (Waiting on the Supabase keys in <code>.env.local</code> — see SETUP.md.)
          </p>
          <Link
            href="/map"
            className="inline-block rounded-xl bg-accent px-5 py-2.5 text-[14.5px] font-semibold text-cta-ink"
          >
            Continue to the demo
          </Link>
        </div>
      ) : state === "sent" ? (
        <div className="rounded-[14px] border border-line bg-surface p-6 text-center shadow-card">
          <p className="font-display mb-1.5 text-xl">Check your email</p>
          <p className="text-[13.5px] leading-relaxed text-muted">
            We sent a sign-in link to <strong>{email}</strong>. Click it and you&apos;ll land
            right back here, signed in. (You only do this once per device.)
          </p>
        </div>
      ) : (
        <form onSubmit={send} className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
          <label htmlFor="email" className="label mb-2 block">
            Your email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-3 w-full rounded-xl border-[1.5px] border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {state === "error" && (
            <p className="mt-3 text-[13px] text-ember">
              That didn&apos;t work: {error}. Check the address and try again.
            </p>
          )}
          <p className="mt-4 text-center text-[12px] leading-relaxed text-faint">
            No password to remember — the emailed link signs you in, and you stay signed in
            on this device.
          </p>
        </form>
      )}
    </div>
  );
}
