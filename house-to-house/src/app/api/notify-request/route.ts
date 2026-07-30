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

// Re-send the alert for a request that's already in the queue. Staff-only.
//
// Alerts fire once, at the moment someone gets stuck — so if email wasn't
// configured yet (or Resend hiccuped) the request sits there unnotified with
// no way to try again short of asking the person to sign up a second time.
// This is that way.

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

  const { data: isStaff } = await userClient.rpc("is_staff");
  if (isStaff !== true) return NextResponse.json({ error: "staff only" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { requestId?: string };
  if (!body.requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 });

  if (!RESEND_KEY || !FROM || !SUPABASE_URL || !SERVICE_KEY) {
    const missing = [
      !RESEND_KEY && "RESEND_API_KEY",
      !FROM && "REPORT_FROM_EMAIL",
      !SERVICE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    return NextResponse.json(
      { sent: 0, error: `Email isn't configured — missing ${missing.join(", ")} in Vercel.` },
      { status: 400 },
    );
  }

  // The caller's own church scopes the read, so staff can only re-send alerts
  // for requests they can already see.
  const { data: req, error: reqErr } = await userClient
    .from("access_requests")
    .select(
      "id, church_id, email, kind, first_name, last_name, requested_group_id, requested_group_note, matched_person_id",
    )
    .eq("id", body.requestId)
    .maybeSingle();
  if (reqErr || !req) return NextResponse.json({ error: "request not found" }, { status: 404 });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const [peopleQ, churchQ, groupQ, matchQ] = await Promise.all([
    admin
      .from("people")
      .select("id, first_name, last_name, email, app_access")
      .eq("church_id", req.church_id),
    admin.from("churches").select("settings").eq("id", req.church_id).maybeSingle(),
    req.requested_group_id
      ? admin.from("groups").select("name").eq("id", req.requested_group_id).maybeSingle()
      : Promise.resolve({ data: null }),
    req.matched_person_id
      ? admin
          .from("people")
          .select("first_name, last_name")
          .eq("id", req.matched_person_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const people = peopleQ.data ?? [];
  const config: AccessAlertConfig = {
    ...DEFAULT_ACCESS_ALERTS,
    ...((churchQ.data?.settings?.accessAlerts as Partial<AccessAlertConfig>) ?? {}),
  };
  const candidates: AdminCandidate[] = people.map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    email: p.email ?? null,
    isStaff: p.app_access === "staff",
  }));
  const to = accessAlertRecipients(config, candidates);
  if (to.length === 0)
    return NextResponse.json(
      { sent: 0, error: "Nobody to email — no staff member has an address on file." },
      { status: 400 },
    );

  const match = matchQ.data as { first_name: string; last_name: string } | null;
  const typed = `${req.first_name ?? ""} ${req.last_name ?? ""}`.trim();
  const payload: AccessAlertPayload = {
    email: req.email,
    kind: req.kind as AccessRequestKind,
    personName: match ? `${match.first_name} ${match.last_name}`.trim() : typed || null,
    groupNames: [],
    groupWanted:
      (groupQ.data as { name: string } | null)?.name ?? req.requested_group_note ?? null,
    hasMatch: !!req.matched_person_id,
    groupTerm: (churchQ.data?.settings?.groupTerm as string) || undefined,
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
    const detail = await res.text();
    console.error("notify-request failed", res.status, detail);
    return NextResponse.json(
      { sent: 0, error: `Resend rejected it (${res.status}). Check REPORT_FROM_EMAIL is a verified sender.` },
      { status: 502 },
    );
  }

  await admin
    .from("access_requests")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", req.id);

  return NextResponse.json({ sent: to.length, to });
}
