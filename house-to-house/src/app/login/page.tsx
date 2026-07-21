"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LogoMark } from "@/components/ui";

const inputCls =
  "mb-3 w-full rounded-xl border-[1.5px] border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "reset-sent">("idle");
  const [error, setError] = useState<string | null>(null);
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

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setState("sending");
    setError(null);
    setLinkError(false);
    const supabase = supabaseBrowser();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      setState("idle");
      setError(
        /invalid login credentials/i.test(err.message)
          ? "That email + password combo didn't match. First time here, or never set a password? Use the emailed link below."
          : err.message,
      );
    } else {
      window.location.replace("/map");
    }
  };

  const sendMagicLink = async () => {
    if (!email.trim()) {
      setError("Type your email first, then tap the link button.");
      return;
    }
    setState("sending");
    setError(null);
    setLinkError(false);
    const supabase = supabaseBrowser();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (err) {
      setState("idle");
      setError(err.message);
    } else {
      setState("sent");
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      setError("Type your email first, then tap forgot password.");
      return;
    }
    setState("sending");
    setError(null);
    setLinkError(false);
    const supabase = supabaseBrowser();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    if (err) {
      setState("idle");
      setError(err.message);
    } else {
      setState("reset-sent");
    }
  };

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-4">
      <div className="mb-8 flex items-center justify-center gap-3">
        <LogoMark size={46} className="text-accent" />
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
      ) : state === "sent" || state === "reset-sent" ? (
        <div className="rounded-[14px] border border-line bg-surface p-6 text-center shadow-card">
          <p className="font-display mb-1.5 text-xl">Check your email</p>
          <p className="text-[13.5px] leading-relaxed text-muted">
            {state === "sent" ? (
              <>
                We sent a sign-in link to <strong>{email}</strong>. It works once — open
                it and tap <em>Continue</em>.
              </>
            ) : (
              <>
                We sent a password-reset link to <strong>{email}</strong>. Open it, tap{" "}
                <em>Continue</em>, and choose a new password.
              </>
            )}
          </p>
          <button
            onClick={() => setState("idle")}
            className="mt-4 text-[12.5px] text-muted underline-offset-2 hover:underline"
          >
            back to sign-in
          </button>
        </div>
      ) : (
        <form onSubmit={signIn} className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
          {linkError && (
            <p className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-[13px] text-ember">
              That sign-in link didn&apos;t work — it may have expired or been used
              already. Sign in below, or request a fresh link.
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
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="password" className="label block">
              Password
            </label>
            <button
              type="button"
              onClick={sendReset}
              className="text-[12px] text-muted underline-offset-2 hover:underline"
            >
              forgot password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink disabled:opacity-50"
          >
            {state === "sending" ? "Working…" : "Sign in"}
          </button>
          {error && <p className="mt-3 text-[13px] text-ember">{error}</p>}

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={state === "sending"}
            className="w-full rounded-xl border-[1.5px] border-line py-2.5 text-[14px] font-semibold text-ink hover:border-accent disabled:opacity-50"
          >
            ✉ Email me a sign-in link
          </button>
          <p className="mt-4 text-center text-[12px] leading-relaxed text-faint">
            First time here? Use the emailed link — you&apos;ll pick a password right
            after. You stay signed in on this device either way.
          </p>
        </form>
      )}
    </div>
  );
}
