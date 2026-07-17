"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    // Surface a failed/expired sign-in link, and let the browser client pick up
    // any auth state landing in the URL.
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setLinkError(true);
    if (isSupabaseConfigured) {
      const supabase = supabaseBrowser();
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) window.location.replace("/map");
      });
    }
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setLinkError(false);
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
        <svg width="46" height="38" viewBox="0 0 46 38" fill="none" aria-hidden>
          <path d="M20 13 L31 2 L42 13" stroke="var(--beige)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22.5 11 V27 H39.5 V11" stroke="var(--beige)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="28" y="19.5" width="6" height="7.5" rx="0.8" fill="var(--beige)" />
          <path d="M6.5 20 V36 H23.5 V20" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 22 L15 11 L26 22" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="12" y="28.5" width="6" height="7.5" rx="0.8" fill="var(--accent)" />
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
            We sent a sign-in link to <strong>{email}</strong>. Open it in this same
            browser and you&apos;ll land in the app, signed in. Links expire after a few
            minutes and work once.
          </p>
          <button
            onClick={() => setState("idle")}
            className="mt-4 text-[12.5px] text-muted underline-offset-2 hover:underline"
          >
            use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
          {linkError && (
            <p className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-[13px] text-ember">
              That sign-in link didn&apos;t work — it may have expired or been used already.
              Request a fresh one below.
            </p>
          )}
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
