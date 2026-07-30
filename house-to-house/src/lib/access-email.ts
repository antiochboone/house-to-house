import type { AccessAlertConfig, AccessRequestKind } from "./types";
import { isEmail } from "./report-email";

// The "somebody is stuck at the door" email. Recipients resolve server-side
// from the church's settings (see the API route) — the browser only says WHICH
// wall the person hit, never who to tell.

export const DEFAULT_ACCESS_ALERTS: AccessAlertConfig = {
  // On by default: an alert nobody switched on is the whole problem this
  // solves. With no admins named it falls back to everyone with Staff access.
  enabled: true,
  admins: [],
  extra: [],
};

export interface AdminCandidate {
  id: string;
  name: string;
  email: string | null;
  isStaff: boolean;
}

/** Who to email about a stuck sign-in, de-duplicated.
 *
 * Named admins win. If the church hasn't named any, every Staff-access person
 * with an email hears about it — better a few extra inboxes than a volunteer
 * stranded on the welcome screen with nobody watching. */
export function accessAlertRecipients(
  config: AccessAlertConfig,
  people: AdminCandidate[],
): string[] {
  const named = config.admins
    .map((id) => people.find((p) => p.id === id)?.email ?? "")
    .filter(Boolean);
  const extra = config.extra ?? [];
  const chosen = [...named, ...extra];
  const out =
    chosen.length > 0
      ? chosen
      : people.filter((p) => p.isStaff && p.email).map((p) => p.email as string);

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

export interface AccessAlertPayload {
  /** The address they signed in with — the one thing staff can't otherwise see. */
  email: string;
  kind: AccessRequestKind;
  /** Their person record, when one already carries that email. */
  personName: string | null;
  /** Groups they're on the roster of, if any (the no-group case). */
  groupNames: string[];
  /** join only: the lifegroup they told us they lead. */
  groupWanted?: string | null;
  /** join only: whether an existing person already carries this email. */
  hasMatch?: boolean;
  /** What this church calls its groups, lowercase ("lifegroup"). */
  groupTerm?: string;
  appUrl: string;
}

/** The church's word for its groups, mid-sentence. */
const term = (a: AccessAlertPayload) => (a.groupTerm ?? "Lifegroup").toLowerCase();

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function accessAlertSubject(a: AccessAlertPayload) {
  const who = a.personName ?? a.email;
  if (a.kind === "join") return `${who} asked to join and lead a ${term(a)}`;
  return a.kind === "no-access"
    ? `${who} is waiting on app access`
    : `${who} can't check in yet - no ${term(a)}`;
}

/** The one-line instruction that actually clears the block. */
function fixSteps(a: AccessAlertPayload): string[] {
  if (a.kind === "join") {
    const who = a.personName ?? a.email;
    const grp = a.groupWanted
      ? `They say they lead ${a.groupWanted}.`
      : "They didn't pick a group from the list - check the request in the app.";
    const open = "Open Settings → Access requests to approve them in one click.";
    return a.hasMatch
      ? [
          `${who} matches someone already in your directory.`,
          grp,
          "Approving lets you grant that existing person access, or create a new one.",
          open,
        ]
      : [`${who} asked to join.`, grp, "Approving grants Leader access and adds them to that group.", open];
  }
  if (a.kind === "no-access") {
    return a.personName
      ? [
          `Open ${a.personName} in People.`,
          `Check the email on their record is ${a.email} - that's what they signed in with.`,
          "Set App access to Leader (or Staff). They're in on their next visit.",
        ]
      : [
          `No person record carries ${a.email} yet.`,
          "Add them in People (or fix the email on their existing record),",
          "then set App access to Leader or Staff.",
        ];
  }
  return a.groupNames.length > 0
    ? [
        `${a.personName ?? a.email} is on the roster of ${a.groupNames.join(", ")}, but not as a leader.`,
        "Open them in People and set their Role in group to Leader.",
      ]
    : [
        `${a.personName ?? a.email} has access but isn't on any ${term(a)} roster.`,
        "Add them to their group in People, with the role Leader.",
      ];
}

export function accessAlertHtml(a: AccessAlertPayload) {
  const steps = fixSteps(a)
    .map(
      (s) =>
        `<li style="margin:0 0 6px;color:#35392f;font-size:14px;line-height:1.5">${esc(s)}</li>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f3ea;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e5ddc8;border-radius:14px;padding:24px">
    <div style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#a5a18d;margin-bottom:6px">House to House</div>
    <h1 style="margin:0 0 8px;font-family:Palatino,Georgia,serif;font-size:22px;color:#35392f">
      ${a.kind === "join"
        ? "Someone asked to join"
        : a.kind === "no-access"
          ? "Someone's waiting at the door"
          : "Someone can't check in yet"}
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:#77796b;line-height:1.6">
      ${esc(a.personName ? `${a.personName} (${a.email})` : a.email)}
      ${a.kind === "join"
        ? "used your join link and is waiting to be approved."
        : a.kind === "no-access"
          ? "signed in and landed on an empty app - their access hasn't been turned on."
          : `reached the check-in page with no ${term(a)} to check in for.`}
    </p>
    <ol style="margin:0 0 20px;padding-left:20px">${steps}</ol>
    <a href="${esc(a.appUrl)}/people" style="display:inline-block;background:#7a8450;color:#fffdf8;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:12px">Open People</a>
    <p style="margin:20px 0 0;font-size:12px;color:#a5a18d;line-height:1.6">
      Sent once per person - reloading won't nag you again. Recipients are configured in Settings → Access requests.
    </p>
  </div>
</body></html>`;
}

export function accessAlertText(a: AccessAlertPayload) {
  return [
    accessAlertSubject(a),
    "",
    `Signed in as: ${a.email}`,
    a.personName ? `Person record: ${a.personName}` : "Person record: none with that email",
    "",
    ...fixSteps(a).map((s) => `- ${s}`),
    "",
    `${a.appUrl}/people`,
  ].join("\n");
}
