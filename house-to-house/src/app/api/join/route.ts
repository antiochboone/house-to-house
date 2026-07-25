import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import type { AccessAlertConfig } from "@/lib/types";
import {
  DEFAULT_ACCESS_ALERTS,
  accessAlertHtml,
  accessAlertRecipients,
  accessAlertSubject,
  accessAlertText,
  type AccessAlertPayload,
  type AdminCandidate,
} from "@/lib/access-email";

// Completes a self-service join once the visitor has verified their email.
// The /join page collects name + group while signed out, then sends a magic
// link; when the app comes back signed in it POSTs here. We file the request
// as the now-verified user (so the email is trustworthy) and tell the church's
// admins there's someone to approve.
//
// Reads run on the service role: a just-joined visitor has no profile, so their
// own session can't see the church's people or settings to address the mail.

const RESEND_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.REPORT_FROM_EMAIL ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(request: NextRequest) {
  const userClient = await supabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    first?: string;
    last?: string;
    groupId?: string | null;
    groupNote?: string | null;
  };

  const { data: status, error } = await userClient.rpc("request_to_join", {
    p_slug: body.slug ?? null,
    p_first: body.first ?? "",
    p_last: body.last ?? "",
    p_group_id: body.groupId ?? null,
    p_group_note: body.groupNote ?? null,
  });
  if (error) {
    console.error("join request failed", error.message);
    return NextResponse.json({ error: "could not record request" }, { status: 500 });
  }
  // Already open, already a member, or nothing to file — don't mail again.
  if (status !== "created") return NextResponse.json({ recorded: status, sent: 0 });

  if (!RESEND_KEY || !FROM || !SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ recorded: status, sent: 0, reason: "email not configured" });
  }

  const email = (user.email ?? "").trim().toLowerCase();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // The row we just created carries the church, group, and any matched person.
  const { data: req } = await admin
    .from("access_requests")
    .select("church_id, first_name, last_name, requested_group_id, requested_group_note, matched_person_id")
    .eq("email", email)
    .eq("kind", "join")
    .is("resolved_at", null)
    .maybeSingle();
  const churchId = req?.church_id;
  if (!churchId) return NextResponse.json({ recorded: status, sent: 0, reason: "no church" });

  const [peopleQ, churchQ, groupQ, matchQ] = await Promise.all([
    admin.from("people").select("id, first_name, last_name, email, app_access").eq("church_id", churchId),
    admin.from("churches").select("settings").eq("id", churchId).maybeSingle(),
    req.requested_group_id
      ? admin.from("groups").select("name").eq("id", req.requested_group_id).maybeSingle()
      : Promise.resolve({ data: null }),
    req.matched_person_id
      ? admin.from("people").select("first_name, last_name").eq("id", req.matched_person_id).maybeSingle()
      : Promise.resolve({ data: null }),
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
  if (to.length === 0) return NextResponse.json({ recorded: status, sent: 0, reason: "no recipients" });

  const match = matchQ.data as { first_name: string; last_name: string } | null;
  const typedName = `${req.first_name ?? ""} ${req.last_name ?? ""}`.trim();
  const groupWanted =
    (groupQ.data as { name: string } | null)?.name ?? req.requested_group_note ?? null;

  const payload: AccessAlertPayload = {
    email: user.email ?? "unknown",
    kind: "join",
    personName: match ? `${match.first_name} ${match.last_name}`.trim() : typedName || null,
    groupNames: [],
    groupWanted,
    hasMatch: !!req.matched_person_id,
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
    console.error("join alert email failed", res.status, await res.text());
    return NextResponse.json({ recorded: status, sent: 0, error: "send failed" }, { status: 502 });
  }

  await userClient.rpc("mark_access_request_notified", { p_kind: "join" });
  return NextResponse.json({ recorded: status, sent: to.length });
}
