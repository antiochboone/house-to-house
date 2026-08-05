"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { clearStaleHostCookie, cookieDomainFor } from "./cookie-domain";

export function supabaseBrowser() {
  // Shared with Base Camp when this app is served from a subdomain of the
  // church's site, so somebody already signed in there is signed in here.
  const domain = typeof window === "undefined" ? undefined : cookieDomainFor(window.location.hostname);
  if (domain) clearStaleHostCookie(SUPABASE_URL);

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, domain ? { cookieOptions: { domain } } : undefined);
}
