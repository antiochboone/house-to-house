import type { ReportEmailConfig, Section, Zone } from "./types";

export const DEFAULT_REPORT_EMAILS: ReportEmailConfig = {
  enabled: false,
  church: [],
  zones: {},
  sections: {},
  groups: {},
};

/** Loose but useful — the goal is catching typos, not policing RFC 5322. */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Everyone who should receive a given group's report, de-duplicated.
 *
 * Recipients accumulate down the tree: church-wide list + the group's zone
 * list + its section list + any per-group list. A church that only fills in
 * the top level still gets reports; a big church can route each section to
 * its own section leader without repeating the church-wide addresses. */
export function recipientsForGroup(
  config: ReportEmailConfig,
  groupId: string,
  sectionId: string | null,
  sections: Section[],
  zones: Zone[],
): string[] {
  const out = [...(config.church ?? [])];

  const section = sectionId ? sections.find((s) => s.id === sectionId) : undefined;
  if (section) {
    out.push(...(config.sections?.[section.id] ?? []));
    const zone = section.zoneId ? zones.find((z) => z.id === section.zoneId) : undefined;
    if (zone) out.push(...(config.zones?.[zone.id] ?? []));
  }
  out.push(...(config.groups?.[groupId] ?? []));

  const seen = new Set<string>();
  return out
    .map((e) => e.trim())
    .filter((e) => {
      const key = e.toLowerCase();
      if (!isEmail(e) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export interface ReportPayload {
  groupName: string;
  sectionName: string | null;
  monthLabel: string;
  submittedBy: string;
  pulseWords: string[];
  rosterNote: string | null;
  meetingChange: string | null;
  win: string | null;
  peopleCount: number;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function reportSubject(r: ReportPayload) {
  return `${r.groupName} — ${r.monthLabel} check-in`;
}

export function reportHtml(r: ReportPayload) {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#77796b;font-size:13px;vertical-align:top;white-space:nowrap">${esc(label)}</td>
      <td style="padding:6px 0;color:#35392f;font-size:14px">${esc(value)}</td>
    </tr>`;

  const rows = [
    row("Group", r.groupName + (r.sectionName ? ` · ${r.sectionName}` : "")),
    row("Month", r.monthLabel),
    row("Submitted by", r.submittedBy),
    row("On the roster", `${r.peopleCount} ${r.peopleCount === 1 ? "person" : "people"}`),
    r.pulseWords.length ? row("Pulse", r.pulseWords.join(" · ")) : "",
    r.rosterNote ? row("Roster", r.rosterNote) : "",
    r.meetingChange ? row("Meeting change", r.meetingChange) : "",
    r.win ? row("Win", r.win) : "",
  ].join("");

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f3ea;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e5ddc8;border-radius:14px;padding:24px">
    <div style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#a5a18d;margin-bottom:6px">House to House</div>
    <h1 style="margin:0 0 16px;font-family:Palatino,Georgia,serif;font-size:22px;color:#35392f">${esc(r.groupName)} checked in</h1>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="margin:20px 0 0;font-size:12px;color:#a5a18d;line-height:1.6">
      Sent because this group's monthly check-in was submitted. Recipients are configured in Settings → Emailed reports.
    </p>
  </div>
</body></html>`;
}

export function reportText(r: ReportPayload) {
  return [
    `${r.groupName} — ${r.monthLabel} check-in`,
    r.sectionName ? `Section: ${r.sectionName}` : null,
    `Submitted by: ${r.submittedBy}`,
    `On the roster: ${r.peopleCount}`,
    r.pulseWords.length ? `Pulse: ${r.pulseWords.join(" · ")}` : null,
    r.rosterNote ? `Roster: ${r.rosterNote}` : null,
    r.meetingChange ? `Meeting change: ${r.meetingChange}` : null,
    r.win ? `Win: ${r.win}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
