import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { ReportEmailConfig, Section, Zone } from "@/lib/types";
import {
  DEFAULT_REPORT_EMAILS,
  recipientsForGroup,
  reportHtml,
  reportSubject,
  reportText,
  type ReportPayload,
} from "@/lib/report-email";

// Emails a check-in report to whoever the church configured for that group.
// Everything that decides WHO gets mail is read server-side from the church's
// settings — the browser only says which group checked in, so a client can't
// address a report to an arbitrary inbox.

const RESEND_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.REPORT_FROM_EMAIL ?? "";

export async function POST(request: NextRequest) {
  if (!RESEND_KEY || !FROM) {
    return NextResponse.json({ sent: 0, reason: "email not configured" });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json()) as { groupId?: string; month?: string };
  const groupId = body.groupId;
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

  // RLS scopes every read below to the caller's church.
  const [churchQ, groupQ, checkinQ, profileQ] = await Promise.all([
    supabase.from("churches").select("settings").single(),
    supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle(),
    supabase
      .from("checkins")
      .select("month, pulse_words, roster_notes, meeting_change, attendance")
      .eq("group_id", groupId)
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Scope to the caller: staff can read every profile in their church, so an
    // unfiltered .maybeSingle() would see >1 row and return null, dropping the
    // submitter's name from the report.
    supabase.from("profiles").select("person_id").eq("id", user.id).maybeSingle(),
  ]);

  const group = groupQ.data;
  if (!group) return NextResponse.json({ error: "group not found" }, { status: 404 });

  const settings = churchQ.data?.settings ?? {};
  const config: ReportEmailConfig = { ...DEFAULT_REPORT_EMAILS, ...(settings.reportEmails ?? {}) };
  if (!config.enabled) return NextResponse.json({ sent: 0, reason: "disabled" });

  const sections: Section[] = settings.sections ?? [];
  const zones: Zone[] = settings.zones ?? [];
  const groupSections: Record<string, string> = settings.groupSections ?? {};
  const sectionId = groupSections[groupId] ?? null;

  const to = recipientsForGroup(config, groupId, sectionId, sections, zones);
  if (to.length === 0) return NextResponse.json({ sent: 0, reason: "no recipients" });

  const [{ count: peopleCount }, winQ, submitterQ] = await Promise.all([
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .is("left_at", null),
    supabase
      .from("wins")
      .select("body, happened_on")
      .eq("group_id", groupId)
      .order("happened_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    profileQ.data?.person_id
      ? supabase
          .from("people")
          .select("first_name, last_name")
          .eq("id", profileQ.data.person_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const checkin = checkinQ.data;
  const month = checkin?.month ?? body.month ?? new Date().toISOString().slice(0, 10);
  const [y, m] = month.slice(0, 7).split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const submitter = submitterQ.data;
  const payload: ReportPayload = {
    groupName: group.name,
    sectionName: sections.find((s) => s.id === sectionId)?.name ?? null,
    monthLabel,
    submittedBy: submitter
      ? `${submitter.first_name} ${submitter.last_name}`.trim()
      : (user.email ?? "a leader"),
    pulseWords: checkin?.pulse_words ?? [],
    rosterNote: checkin?.roster_notes ?? null,
    meetingChange: checkin?.meeting_change ?? null,
    // Only surface a win recorded as part of this month's check-in.
    win:
      winQ.data?.happened_on && winQ.data.happened_on.slice(0, 7) === month.slice(0, 7)
        ? winQ.data.body
        : null,
    peopleCount: peopleCount ?? 0,
    attended: checkin?.attendance?.length ?? null,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: reportSubject(payload),
      html: reportHtml(payload),
      text: reportText(payload),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("check-in report email failed", res.status, detail);
    return NextResponse.json({ sent: 0, error: "send failed" }, { status: 502 });
  }

  return NextResponse.json({ sent: to.length });
}
