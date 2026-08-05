import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { headers } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { cookieDomainFor } from "./cookie-domain";

export async function supabaseServer() {
  const cookieStore = await cookies();
  const domain = cookieDomainFor((await headers()).get("host"));
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore when the proxy
          // refreshes sessions.
        }
      },
    },
  });
}
