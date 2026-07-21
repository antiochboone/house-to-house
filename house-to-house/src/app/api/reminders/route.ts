import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ReminderConfig } from "@/lib/types";
import { isEmail } from "@/lib/report-email";
import { reminderHtml, reminderSubject, reminderText } from "@/lib/reminder-email";

// Hourly cron target (pg_cron → net.http_post with the CRON_SECRET header).
// Finds groups whose meeting just wrapped up — per their meeting day/time and
// reminder frequency — and emails the configured recipients (falling back to
// the group's leaders' emails). No user session: runs on the service role,
// gated by the shared secret.

const TZ = "America/New_York";

const DAY_INDEX: Record<string, number> = {
  Sundays: 0,
  Mondays: 1,
  Tuesdays: 2,
  Wednesdays: 3,
  Thursdays: 4,
  Fridays: 5,
  Saturdays: 6,
};

/** Current weekday / minutes-into-day / "YYYY-MM" in the church's timezone. */
function nowInChurchTz(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  // hour12:false can yield "24" for midnight in some runtimes.
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return { weekday, minutes, ym: `${get("year")}-${get("month")}` };
}

/** "6:30 PM" -> minutes into the day; null when unparseable/missing. */
function parseMeetingTime(t: string | null): number | null {
  if (!t) return null;
  const m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i.exec(t);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if ((m[3] ?? "PM").toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2] ?? 0);
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const resendKey = process.env.RESEND_API_KEY ?? "";
  const from = process.env.REPORT_FROM_EMAIL ?? "";
  if (!url || !serviceKey || !resendKey || !from) {
    return NextResponse.json({ sent: 0, reason: "not configured" });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const [groupsQ, checkinsQ, memsQ, peopleQ] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, status, meeting_day, meeting_time, reminder")
      .neq("status", "dissolved"),
    supabase.from("checkins").select("group_id, month"),
    supabase.from("memberships").select("group_id, person_id, role").is("left_at", null),
    supabase.from("people").select("id, email"),
  ]);
  if (groupsQ.error) return NextResponse.json({ error: groupsQ.error.message }, { status: 500 });

  const now = new Date();
  const { weekday, minutes, ym } = nowInChurchTz(now);
  const emailOf = new Map((peopleQ.data ?? []).map((p) => [p.id, p.email as string | null]));
  const origin = new URL(request.url).origin;
  const checkinUrl = `${origin}/check-in`;

  let sent = 0;
  const skipped: string[] = [];

  for (const g of groupsQ.data ?? []) {
    const cfg = (g.reminder ?? {}) as Partial<ReminderConfig>;
    const freq = cfg.frequency ?? "off";
    if (freq === "off") continue;

    const dayIdx = DAY_INDEX[g.meeting_day ?? ""];
    if (dayIdx === undefined || dayIdx !== weekday) continue;

    // Window: ~1.5h to ~4h after the meeting starts (hourly cron lands in it
    // once or twice; lastSent dedupes). No time on file → assume evening.
    const start = parseMeetingTime(g.meeting_time) ?? 19 * 60;
    if (minutes < start + 90 || minutes > start + 240) continue;

    const lastSent = cfg.lastSent ? new Date(cfg.lastSent) : null;
    if (freq === "weekly") {
      if (lastSent && now.getTime() - lastSent.getTime() < 6 * 24 * 3600 * 1000) continue;
    } else {
      // Monthly: only while this month's check-in is still missing, once.
      const done = (checkinsQ.data ?? []).some(
        (c) => c.group_id === g.id && String(c.month).startsWith(ym),
      );
      if (done) continue;
      if (lastSent && nowInChurchTz(lastSent).ym === ym) continue;
    }

    const listed = (cfg.recipients ?? []).filter(isEmail);
    const leaders = (memsQ.data ?? [])
      .filter((m) => m.group_id === g.id && (m.role === "leader" || m.role === "intern"))
      .map((m) => emailOf.get(m.person_id))
      .filter((e): e is string => !!e && isEmail(e));
    const to = listed.length > 0 ? listed : [...new Set(leaders)];
    if (to.length === 0) {
      skipped.push(g.name);
      continue;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: reminderSubject(g.name),
        html: reminderHtml(g.name, checkinUrl),
        text: reminderText(g.name, checkinUrl),
      }),
    });
    if (!res.ok) {
      console.error("reminder send failed", g.name, res.status, await res.text());
      continue;
    }

    await supabase
      .from("groups")
      .update({ reminder: { ...cfg, frequency: freq, lastSent: now.toISOString() } })
      .eq("id", g.id);
    sent += 1;
  }

  return NextResponse.json({ sent, skippedNoRecipients: skipped });
}
