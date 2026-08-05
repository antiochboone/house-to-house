import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import { cookieDomainFor } from "@/lib/supabase/cookie-domain";

// Refreshes the Supabase session cookie and gates the app behind sign-in.
// In demo mode (no env vars yet) it does nothing.
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  // On a subdomain of the church's site the session is shared with Base Camp,
  // so a refresh here must write the shared cookie rather than a host-only one
  // that would shadow it.
  const domain = cookieDomainFor(request.headers.get("host"));

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, domain ? { ...options, domain } : options),
        );
      },
    },
  });

  // A sign-in code can land on ANY path (Supabase falls back to the Site URL
  // when a redirect isn't allowlisted). Catch it wherever it shows up.
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const url = request.nextUrl.clone();
    url.searchParams.delete("code");
    url.pathname = error ? "/login" : "/map";
    if (error) url.searchParams.set("error", "link");
    const redirect = NextResponse.redirect(url);
    // Carry over the session cookies set during the exchange.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // /join is the public sign-up page — reachable signed out, like /login.
  const isAuthRoute =
    path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/join");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/map";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Everything except static assets and the public PWA files (service worker,
  // manifest, offline page) — those must load without a session, or install
  // and offline support break for signed-out users.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
