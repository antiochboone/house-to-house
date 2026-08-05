// Which domain the session cookie belongs to.
//
// House to House and Base Camp are two apps sharing one Supabase project, which
// means they already share a cookie *name*. What they did not share was a
// cookie: @supabase/ssr writes host-only by default, so a session created on
// antiochboone.com was never sent to h2h.antiochboone.com, and the embedded
// panel asked people who were plainly already signed in to sign in again.
//
// Widening the cookie to ".antiochboone.com" fixes that, and is a real
// widening: every subdomain of antiochboone.com now receives the session token.
// That is fine while every subdomain is ours. If a subdomain is ever pointed at
// a third party, it would start receiving members' sessions -- so this is a
// decision to revisit before that happens, not a default to forget.
//
// Deliberately conditional. A browser refuses a cookie for a domain it is not
// on, so hardcoding it would break sign-in on Vercel previews, on the
// house-to-house.vercel.app address, and on localhost. Where the host is not under the church's
// domain, this returns undefined and the old host-only behaviour stands.

const SHARED_SITE = "antiochboone.com";

export function cookieDomainFor(hostname: string | null | undefined): string | undefined {
  const host = (hostname ?? "").toLowerCase().split(":")[0];
  if (!host) return undefined;
  return host === SHARED_SITE || host.endsWith(`.${SHARED_SITE}`) ? `.${SHARED_SITE}` : undefined;
}

/**
 * The name of the cookie both apps use, derived from the project the URL points
 * at. Needed to clear the stale host-only copy exactly once -- see below.
 */
export function sessionCookieName(supabaseUrl: string): string | null {
  const match = /https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(supabaseUrl);
  return match ? `sb-${match[1]}-auth-token` : null;
}

/**
 * Removes the host-only session cookie, once per browser.
 *
 * Without this, a browser ends up holding two cookies of the same name -- the
 * old host-only one and the new domain-wide one. Both are sent, whichever is
 * read first wins, and the result is the "signed in, signed out, signed in"
 * flapping that makes auth bugs so miserable to diagnose. Clearing the stale
 * one turns that into a single, deliberate sign-in.
 *
 * Setting a cookie with no domain attribute removes only the host-only copy;
 * the domain-wide one is a different cookie and survives untouched.
 */
export function clearStaleHostCookie(supabaseUrl: string) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (!cookieDomainFor(window.location.hostname)) return;

  const flag = "antioch-session-cookie-migrated";
  try {
    if (window.localStorage.getItem(flag)) return;
    const name = sessionCookieName(supabaseUrl);
    if (name) {
      for (const suffix of ["", ".0", ".1", ".2"]) {
        document.cookie = `${name}${suffix}=; Max-Age=0; path=/`;
      }
    }
    window.localStorage.setItem(flag, "1");
  } catch {
    // A browser with storage blocked keeps the old behaviour, which is the
    // behaviour it has today. Nothing here is worth throwing over.
  }
}
