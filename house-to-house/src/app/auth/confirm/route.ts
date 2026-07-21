import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Magic-link landing: verifies the emailed token, sets the session cookie,
// then sends the user into the app.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;

  // Preferred: token_hash link (works in any browser, no PKCE state needed).
  if (token_hash) {
    const supabase = await supabaseServer();
    // The token's type depends on how it was sent: self sign-in emails a
    // magic link ("email"/"magiclink"), while inviting a brand-new person
    // (shouldCreateUser) emails a signup confirmation ("signup"). Templates
    // can't always carry the exact type, so try the hinted type first and
    // then the other email OTP types. A non-matching type is looked up in a
    // different server-side column, so it returns "not found" WITHOUT
    // consuming the real token — falling through is safe and idempotent.
    const candidates: EmailOtpType[] = [];
    for (const t of [type, "signup", "magiclink", "email", "invite", "recovery"] as const) {
      if (t && !candidates.includes(t)) candidates.push(t);
    }
    for (const t of candidates) {
      const { error } = await supabase.auth.verifyOtp({ type: t, token_hash });
      if (!error) {
        return NextResponse.redirect(new URL("/map", request.url));
      }
    }
  }

  // Fallback: PKCE ?code= link (only works in the browser that requested it).
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/map", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
