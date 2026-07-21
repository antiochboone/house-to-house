// The "how was lifegroup tonight?" nudge, sent a couple hours after a group's
// meeting time by /api/reminders (pg_cron pings it hourly). Kept in the same
// warm voice as the check-in itself — this is an invitation, not a chore.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function reminderSubject(groupName: string) {
  return `How was ${groupName} tonight?`;
}

export function reminderHtml(groupName: string, checkinUrl: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f3ea;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e5ddc8;border-radius:14px;padding:24px">
    <div style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#a5a18d;margin-bottom:6px">House to House</div>
    <h1 style="margin:0 0 10px;font-family:Palatino,Georgia,serif;font-size:22px;color:#35392f">How was ${esc(groupName)} tonight?</h1>
    <p style="margin:0 0 18px;font-size:14px;color:#77796b;line-height:1.6">
      While it's fresh — the check-in takes about 90 seconds: who came, how the
      group's feeling, anything to celebrate.
    </p>
    <a href="${esc(checkinUrl)}"
       style="display:inline-block;background:#4e9e5f;color:#fffdf8;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">
      Do the check-in
    </a>
    <p style="margin:20px 0 0;font-size:12px;color:#a5a18d;line-height:1.6">
      You're getting this because ${esc(groupName)}'s check-in reminder is on.
      Leaders can change the rhythm (weekly / monthly / off) on the group's page.
    </p>
  </div>
</body></html>`;
}

export function reminderText(groupName: string, checkinUrl: string) {
  return [
    `How was ${groupName} tonight?`,
    "",
    "While it's fresh — the check-in takes about 90 seconds:",
    checkinUrl,
    "",
    "Leaders can change this reminder (weekly / monthly / off) on the group's page.",
  ].join("\n");
}
