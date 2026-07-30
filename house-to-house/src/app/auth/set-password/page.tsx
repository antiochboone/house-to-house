"use client";

// Where invite and password-reset links land (and magic-link users who
// haven't created a password yet). Signed-in only; sets the password plus a
// password_set flag so /auth/verify knows not to send them here again.

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LogoMark } from "@/components/ui";

const MIN_LENGTH = 8;

export default function SetPasswordPage() {
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecked(true);
      return;
    }
    const supabase = supabaseBrowser();
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setChecked(true);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (pw !== pw2) {
      setError("Those don't match. Try again.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error: err } = await supabase.auth.updateUser({
      password: pw,
      data: { password_set: true },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      window.location.replace("/map");
    }
  };

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-4">
      <div className="mb-8 flex items-center justify-center gap-3">
        <LogoMark size={46} className="text-accent" />
        <div>
          <div className="font-display text-2xl leading-none">House to House</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">
            Shepherding house to house
          </div>
        </div>
      </div>

      {!checked ? null : !signedIn ? (
        <div className="rounded-[14px] border border-line bg-surface p-6 text-center shadow-card">
          <p className="font-display mb-1.5 text-xl">Sign in first</p>
          <p className="mb-4 text-[13.5px] leading-relaxed text-muted">
            This page sets your password once you&apos;re signed in. Use the link from
            your email, or request a fresh one.
          </p>
          <a
            href="/login"
            className="inline-block rounded-xl bg-accent px-5 py-2.5 text-[14.5px] font-semibold text-cta-ink"
          >
            Go to sign-in
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
          <p className="font-display mb-1.5 text-xl">Create your password</p>
          <p className="mb-4 text-[13.5px] leading-relaxed text-muted">
            From now on you&apos;ll sign in with your email and this password. No more
            waiting on emailed links.
          </p>
          <label htmlFor="pw" className="label mb-2 block">
            New password
          </label>
          <input
            id="pw"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            autoFocus
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="mb-3 w-full rounded-xl border-[1.5px] border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
          />
          <label htmlFor="pw2" className="label mb-2 block">
            Type it again
          </label>
          <input
            id="pw2"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="mb-3 w-full rounded-xl border-[1.5px] border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save password & continue"}
          </button>
          {error && <p className="mt-3 text-[13px] text-ember">{error}</p>}
          <p className="mt-4 text-center">
            <a href="/map" className="text-[12.5px] text-muted underline-offset-2 hover:underline">
              skip for now
            </a>
          </p>
        </form>
      )}
    </div>
  );
}
