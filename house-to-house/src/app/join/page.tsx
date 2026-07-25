"use client";

// The public front door. Send leaders here ("sign up: yourapp.com/join") and
// they pick the lifegroup they lead, verify their email, and land in the
// approval queue - no staff typing anyone's address first.
//
// Standalone like /login: signed out, no app chrome. It only reads the church
// directory (name + group list) through an anon RPC and triggers the same
// magic-link sign-in the login page uses. The actual join request is filed
// after they verify, by the app (see DataProvider's pending-join effect), so
// this page never needs to handle a token.

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LogoMark } from "@/components/ui";

interface Directory {
  name: string;
  slug: string;
  groups: { id: string; name: string }[];
}

const NOT_LISTED = "__not_listed__";
const inputCls =
  "mb-3 w-full rounded-xl border-[1.5px] border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent";

export default function JoinPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [dir, setDir] = useState<Directory | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyIn, setAlreadyIn] = useState(false);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groupNote, setGroupNote] = useState("");
  const [state, setState] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // All state lands inside the async body: the church directory is an
    // external system, so this effect subscribes to it rather than setting
    // state synchronously on mount.
    void (async () => {
      const c = new URLSearchParams(window.location.search).get("c");
      setSlug(c);
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      const supabase = supabaseBrowser();
      // Already signed in? They don't need the join form.
      const { data: session } = await supabase.auth.getSession();
      if (session.session) setAlreadyIn(true);
      const { data } = await supabase.rpc("church_directory", { p_slug: c });
      if (data) setDir(data as Directory);
      setLoading(false);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!first.trim()) return setError("Tell us your first name.");
    if (!email.trim()) return setError("Add the email you'll sign in with.");
    if (!groupId) return setError("Pick the lifegroup you lead.");
    if (groupId === NOT_LISTED && !groupNote.trim())
      return setError("Type the name of your lifegroup.");

    setState("sending");
    setError(null);

    // Stash what they told us; the app files the request once the magic link
    // verifies their email (DataProvider reads this key).
    try {
      localStorage.setItem(
        "h2h-join",
        JSON.stringify({
          slug,
          first: first.trim(),
          last: last.trim(),
          groupId: groupId === NOT_LISTED ? null : groupId,
          groupNote: groupId === NOT_LISTED ? groupNote.trim() : "",
        }),
      );
    } catch {
      // Private mode with no storage — the sign-in still works, we just can't
      // carry their group across the link. Rare; better than blocking them.
    }

    const supabase = supabaseBrowser();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (err) {
      setState("form");
      setError(err.message);
    } else {
      setState("sent");
    }
  };

  const Header = (
    <div className="mb-8 flex items-center justify-center gap-3">
      <LogoMark size={46} className="text-accent" />
      <div>
        <div className="font-display text-2xl leading-none">House to House</div>
        <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">
          {dir?.name ?? "Lifegroup leaders"}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto mt-24 w-full max-w-sm px-4 text-center text-muted">
        <p className="font-display text-lg">One moment…</p>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto mt-24 w-full max-w-sm px-4">
        {Header}
        <div className="rounded-[14px] border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-[14px]">Sign-up switches on once the database is connected.</p>
        </div>
      </div>
    );
  }

  if (alreadyIn) {
    return (
      <div className="mx-auto mt-24 w-full max-w-sm px-4">
        {Header}
        <div className="rounded-[14px] border border-line bg-surface p-6 text-center shadow-card">
          <p className="font-display mb-1.5 text-xl">You&apos;re already signed in</p>
          <p className="mb-4 text-[13.5px] leading-relaxed text-muted">
            If you&apos;re waiting on approval, you&apos;re all set — no need to sign up again.
          </p>
          <Link
            href="/map"
            className="inline-block rounded-xl bg-accent px-5 py-2.5 text-[14.5px] font-semibold text-cta-ink"
          >
            Go to the app
          </Link>
        </div>
      </div>
    );
  }

  if (!dir) {
    return (
      <div className="mx-auto mt-24 w-full max-w-sm px-4">
        {Header}
        <div className="rounded-[14px] border border-line bg-surface p-6 text-center shadow-card">
          <p className="font-display mb-1.5 text-xl">We couldn&apos;t find that church</p>
          <p className="mb-4 text-[13.5px] leading-relaxed text-muted">
            Double-check the link your church sent you, or ask them for a fresh one.
          </p>
          <Link href="/login" className="text-[13px] text-accent-ink underline-offset-2 hover:underline">
            Already have access? Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="mx-auto mt-24 w-full max-w-sm px-4">
        {Header}
        <div className="rounded-[14px] border border-line bg-surface p-6 text-center shadow-card">
          <p className="font-display mb-1.5 text-xl">Check your email</p>
          <p className="text-[13.5px] leading-relaxed text-muted">
            We sent a confirmation link to <strong>{email}</strong>. Open it, and we&apos;ll
            {` pass your request to the ${dir.name.trim()} team. `}
            You&apos;ll get access once they approve you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-20 w-full max-w-sm px-4">
      {Header}
      <form onSubmit={submit} className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
        <p className="font-display mb-1 text-xl">Join {dir.name}</p>
        <p className="mb-4 text-[13px] leading-relaxed text-muted">
          For lifegroup leaders. Tell us who you are and which group you lead — your church
          approves you, then you&apos;re in.
        </p>

        <div className="flex gap-2">
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="First name"
            aria-label="First name"
            autoFocus
            className={inputCls}
          />
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder="Last name"
            aria-label="Last name"
            className={inputCls}
          />
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email"
          autoComplete="email"
          className={inputCls}
        />

        <label className="label mb-1.5 block">Which lifegroup do you lead?</label>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          aria-label="Which lifegroup do you lead?"
          className={inputCls}
        >
          <option value="">Choose your group…</option>
          {dir.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          <option value={NOT_LISTED}>My group isn&apos;t listed</option>
        </select>

        {groupId === NOT_LISTED && (
          <input
            value={groupNote}
            onChange={(e) => setGroupNote(e.target.value)}
            placeholder="Your lifegroup's name"
            aria-label="Your lifegroup's name"
            className={inputCls}
          />
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Request access"}
        </button>
        {error && <p className="mt-3 text-[13px] text-ember">{error}</p>}

        <p className="mt-4 text-center text-[12px] leading-relaxed text-faint">
          Already have access?{" "}
          <Link href="/login" className="text-accent-ink underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
