import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Can this deployment actually send an alert? Returns booleans only — never
// the key values. Staff-gated all the same, since which integrations a church
// has configured isn't public information.
//
// Exists because the failure it reports is otherwise invisible: without these
// vars every alert path quietly returns {sent: 0} and the request just sits in
// the queue with nobody told.

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "staff")
    return NextResponse.json({ error: "staff only" }, { status: 403 });

  const missing = [
    ["RESEND_API_KEY", process.env.RESEND_API_KEY],
    ["REPORT_FROM_EMAIL", process.env.REPORT_FROM_EMAIL],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k as string);

  return NextResponse.json({ configured: missing.length === 0, missing });
}
