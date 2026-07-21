import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Verifies the emailed one-time token. POST-only, triggered by the human
// pressing "Continue" on /auth/confirm — never by an email scanner's GET.
// After verifying: people who haven't created a password yet (fresh invites,
// long-time magic-link users) land on the set-password page; password resets
// always do; everyone else goes straight into the app.

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const hinted = String(form.get("type") ?? "email") as EmailOtpType;
  const code = String(form.get("code") ?? "");

  const fail = () =>
    NextResponse.redirect(new URL("/login?error=link", request.url), 303);
  const done = (recovery: boolean, passwordSet: boolean) =>
    NextResponse.redirect(
      new URL(recovery || !passwordSet ? "/auth/set-password" : "/map", request.url),
      303,
    );

  const supabase = await supabaseServer();

  if (tokenHash) {
    // The token's bucket depends on how it was sent (self sign-in vs invite vs
    // reset), and templates can't always carry the exact type. Try the hinted
    // type first, then the other email OTP types — a mismatched type is looked
    // up in a different bucket and errors WITHOUT consuming the real token.
    const candidates: EmailOtpType[] = [];
    for (const t of [hinted, "recovery", "signup", "magiclink", "email", "invite"] as const) {
      if (t && !candidates.includes(t)) candidates.push(t);
    }
    for (const t of candidates) {
      const { data, error } = await supabase.auth.verifyOtp({ type: t, token_hash: tokenHash });
      if (!error) {
        return done(t === "recovery", !!data.user?.user_metadata?.password_set);
      }
    }
  }

  // Fallback: PKCE ?code= link (only works in the browser that requested it).
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return done(false, !!data.user?.user_metadata?.password_set);
    }
  }

  return fail();
}
