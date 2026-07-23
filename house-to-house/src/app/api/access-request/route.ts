import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import type { AccessAlertConfig, AccessRequestKind } from "@/lib/types";
import {
  DEFAULT_ACCESS_ALERTS,
  accessAlertHtml,
  accessAlertRecipients,
  accessAlertSubject,
  accessAlertText,
  type AccessAlertPayload,
  type AdminCandidate,
} from "@/lib/access-email";

// "Someone is stuck at the door" — called by the two screens that are dead
// ends for the person looking at them. The caller only says WHICH wall they
// hit; who hears about it is read server-side from the church's settings, so a
// client can't aim mail at an arbitrary inbox.
//
// The request row is what makes this send once: request_app_access() dedupes
// on (email, kind) while a request is open, and we only mail on 'created'. A
// reload, or signing in again next week, stays quiet.
//
// Reads run on the service role deliberately. The whole point is that this
// person has no profile, so every RLS policy would hand their own session an
// empty church — including the settings that say who to email.

const RESEND_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.REPORT_FROM_EMAIL ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(request: NextRequest) {
  // Identify the caller from their own session. This is the only thing we
  // trust from the browser, and we take their email from the token — not from
  // the body — so nobody can file a request in someone else's name.
  const userClient = await supabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { kind?: string };
  const kind: AccessRequestKind = body.kind === "no-group" ? "no-group" : "no-access";

  const { data: status, error } = await userClient.rpc("request_app_access", {
    p_kind: kind,
  });
  if (error) {
    console.error("access request failed", error.message);
    return NextResponse.json({ error: "could not record request" }, { status: 500 });
  }
  // Already open, or nothing to record — either way, don't mail again.
  if (status !== "created") return NextResponse.json({ recorded: status, sent: 0 });

  if (!RESEND_KEY || !FROM || !SUPABASE_URL || !SERVICE_KEY) {
    // The request is logged and will show in Settings; only the mail is lost.
    return NextResponse.json({ recorded: status, sent: 0, reason: "email not configured" });
  }

  const email = (user.email ?? "").trim().toLowerCase();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const [peopleQ, churchQ] = await Promise.all([
    admin.from("people").select("id, first_name, last_name, email, app_access"),
    admin.from("churches").select("settings").order("created_at").limit(1).maybeSingle(),
  ]);

  const people = peopleQ.data ?? [];
  const config: AccessAlertConfig = {
    ...DEFAULT_ACCESS_ALERTS,
    ...((churchQ.data?.settings?.accessAlerts as Partial<AccessAlertConfig>) ?? {}),
  };
  if (!config.enabled) return NextResponse.json({ recorded: status, sent: 0, reason: "disabled" });

  const candidates: AdminCandidate[] = people.map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    email: p.email ?? null,
    isStaff: p.app_access === "staff",
  }));
  const to = accessAlertRecipients(config, candidates);
  if (to.length === 0)
    return NextResponse.json({ recorded: status, sent: 0, reason: "no recipients" });

  const match = people.find(
    (p) => (p.email ?? "").trim().toLowerCase() === email && email.length > 0,
  );

  // For the no-group case, name the rosters they ARE on — that's usually the
  // whole diagnosis (on the roster, but not as a leader).
  let groupNames: string[] = [];
  if (kind === "no-group" && match) {
    const { data: mems } = await admin
      .from("memberships")
      .select("group_id")
      .eq("person_id", match.id)
      .is("left_at", null);
    const ids = (mems ?? []).map((m) => m.group_id);
    if (ids.length > 0) {
      const { data: gs } = await admin.from("groups").select("name").in("id", ids);
      groupNames = (gs ?? []).map((g) => g.name);
    }
  }

  const payload: AccessAlertPayload = {
    email: user.email ?? "unknown",
    kind,
    personName: match ? `${match.first_name} ${match.last_name}`.trim() : null,
    groupNames,
    appUrl: new URL(request.url).origin,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: accessAlertSubject(payload),
      html: accessAlertHtml(payload),
      text: accessAlertText(payload),
    }),
  });

  if (!res.ok) {
    console.error("access alert email failed", res.status, await res.text());
    // The row stands unnotified, so Settings still shows someone is waiting.
    return NextResponse.json({ recorded: status, sent: 0, error: "send failed" }, { status: 502 });
  }

  await userClient.rpc("mark_access_request_notified", { p_kind: kind });
  return NextResponse.json({ recorded: status, sent: to.length });
}
