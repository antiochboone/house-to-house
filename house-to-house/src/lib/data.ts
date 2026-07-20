// Mock data layer for Milestone 1. The read API here (queries + derivations) is the
// contract the Supabase adapter will implement in Milestone 2.

import type {
  DiscipleshipStatus,
  EngagementTier,
  Gender,
  Group,
  Guest,
  MemberRole,
  GroupEventKind,
  Milestone,
  Person,
  RoleDef,
  Season,
  TagCategory,
  Win,
} from "./types";

/* ---------------- Groups ---------------- */

export const GROUPS: Group[] = [
  {
    id: "king", name: "King Street", meet: "Tuesdays 6:30 · downtown Boone",
    tags: ["Downtown", "Young adults", "Kids welcome"],
    season: "build", status: "active",
    insights: [
      "Grown by 3 since April",
      "Check-ins current — last on July 2",
      "1 of 4 newcomers still in week-2 follow-up",
    ],
    dgroups: "1 men's · 1 women's", lineage: null,
    history: [
      { date: "Sep 2021", text: "Planted — one of the original three groups" },
      { date: "Aug 2024", text: "Planted Hardin Creek (sent 6 people)" },
      { date: "Feb 2026", text: "Planted Blowing Rock (sent 5 people)" },
    ],
  },
  {
    id: "howard", name: "Howard's Knob", meet: "Thursdays 6:00 · north Boone",
    tags: [],
    season: "build", status: "active",
    insights: [
      "Steady attendance all spring",
      "No new faces since March — worth a nudge on oikos",
    ],
    dgroups: "1 men's · 1 women's", lineage: null,
    history: [
      { date: "Sep 2021", text: "Planted — one of the original three groups" },
      { date: "Jan 2023", text: "Planted App State group (sent 4 students)" },
    ],
  },
  {
    id: "hardin", name: "Hardin Creek", meet: "Tuesdays 6:30 · east Boone",
    tags: [],
    season: "plant", status: "active",
    insights: [
      "2 men's + 2 women's D-groups — the plant-ready pattern",
      "Readiness scored 13 of 15 on June 8",
      "Plant night set for August 25",
    ],
    dgroups: "2 men's · 2 women's", lineage: "Planted Aug '24 from King Street",
    readiness: 13,
    history: [
      { date: "Aug 2024", text: "Planted from King Street" },
      { date: "Jun 2026", text: "Readiness assessment: 13/15 — preparing to plant" },
      { date: "Aug 2026", text: "Plant night — August 25 (upcoming)" },
    ],
  },
  {
    id: "blowing", name: "Blowing Rock", meet: "Mondays 6:30 · Blowing Rock",
    tags: ["Blowing Rock", "Multigenerational"],
    season: "start", status: "active",
    insights: [
      "Planted in February — 4-week start plan complete",
      "8 core members; watching for a worship leader",
    ],
    dgroups: "forming", lineage: "Planted Feb '26 from King Street",
    history: [
      { date: "Feb 2026", text: "Planted from King Street — plant night party" },
      { date: "Mar 2026", text: "4-week start plan completed" },
    ],
  },
  {
    id: "perkins", name: "Perkinsville", meet: "Wednesdays 6:30 · Perkinsville",
    tags: [],
    season: "build", status: "active",
    insights: [
      "Roster unchanged in 7 months — may be drifting toward stagnant",
      "2 of 11 in a discipleship relationship — lowest in church",
      "Consider a replant conversation this fall",
    ],
    dgroups: "1 men's · 1 women's", lineage: null,
    history: [
      { date: "May 2022", text: "Planted" },
      { date: "Jun 2023", text: "Meadowview merged in when it wound down (received 5 people)" },
      { date: "Dec 2025", text: "Last roster change" },
    ],
  },
  {
    id: "appstate", name: "App State", meet: "Sundays 8:00 · campus",
    tags: ["College", "Adults only"],
    season: "build", status: "active",
    insights: [
      "Grown by 5 since January",
      "Deepest discipleship chain in church — 4 generations",
      "Kaylee baptized May 31",
    ],
    dgroups: "2 men's · 2 women's", lineage: "Planted Jan '23 from Howard's Knob",
    history: [
      { date: "Jan 2023", text: "Planted from Howard's Knob" },
      { date: "May 2026", text: "Kaylee baptized in the Watauga" },
    ],
  },
  {
    id: "valle", name: "Valle Crucis", meet: "Fridays 5:30 · Valle Crucis · family group",
    tags: ["Families", "Childcare provided", "Kids welcome"],
    season: "build", status: "active",
    insights: [
      "6 kids — running the 5 C's rotation",
      "Two couples on the fence about the fall — pray",
    ],
    dgroups: "1 men's · 1 women's", lineage: null,
    history: [{ date: "Mar 2023", text: "Planted as first family group" }],
  },
  {
    id: "oak", name: "Oak Grove", meet: "Thursdays 6:30 · west Boone",
    tags: [],
    season: "start", status: "active",
    insights: [
      "Replanted in May after a dormant winter",
      "New core of 7 — relationships forming well",
    ],
    dgroups: "forming", lineage: "Replanted May '26 (formerly Deerfield)",
    history: [
      { date: "Jun 2022", text: "Planted as Deerfield" },
      { date: "Jan 2026", text: "Went dormant — leader moved away (honorable transition)" },
      { date: "May 2026", text: "Replanted as Oak Grove with new leadership" },
    ],
  },
];

/* ---------------- People ---------------- */

type Row = [
  name: string,
  gender: Gender,
  groupId: string | null,
  role: MemberRole,
  discipledBy: string | null,
  status: DiscipleshipStatus | null,
  note?: string,
  isChild?: boolean,
];

const ROWS: Row[] = [
  ["Pastor Andy Cole", "M", null, "staff", null, null],
  ["Kate Cole", "F", null, "staff", null, null],

  ["Sam Caldwell", "M", "king", "leader", "Pastor Andy Cole", null],
  ["Ruthie Caldwell", "F", "king", "leader", "Kate Cole", null],
  ["Micah Dunn", "M", "king", "intern", "Sam Caldwell", null],
  ["Jess Whitaker", "F", "king", "worship", "Ruthie Caldwell", null],
  ["Drew Hollis", "M", "king", "member", "Sam Caldwell", null],
  ["Ben Sizemore", "M", "king", "member", "Micah Dunn", null],
  ["Anna Kerr", "F", "king", "member", "Jess Whitaker", null],
  ["Lena Ford", "F", "king", "member", "Ruthie Caldwell", null],
  ["Corey Tate", "M", "king", "member", null, "invited"],
  ["Sofia Trent", "F", "king", "member", null, "open"],
  ["Gabe Lindley", "M", "king", "member", null, "declined"],
  ["Tess Rowan", "F", "king", "member", null, "wants"],

  ["Marcus Toliver", "M", "howard", "leader", "Pastor Andy Cole", null],
  ["Deb Toliver", "F", "howard", "leader", "Kate Cole", null],
  ["Andre Fields", "M", "howard", "intern", "Marcus Toliver", null],
  ["Kim Ostrander", "F", "howard", "member", "Deb Toliver", null],
  ["Paul Yancey", "M", "howard", "member", "Andre Fields", null],
  ["Rita Chen", "F", "howard", "member", "Kim Ostrander", null],
  ["Doug Pruitt", "M", "howard", "member", null, "declined"],
  ["Marla Voss", "F", "howard", "member", null, "open"],
  ["Eli Turner", "M", "howard", "member", null, "invited"],
  ["June Aldridge", "F", "howard", "member", null, "wants"],

  ["Josh Reyes", "M", "hardin", "leader", "Sam Caldwell", null],
  ["Carly Reyes", "F", "hardin", "leader", null, null],
  ["Nate Bigham", "M", "hardin", "intern", "Josh Reyes", null],
  ["Owen Priddy", "M", "hardin", "member", "Josh Reyes", null],
  ["Wes Calloway", "M", "hardin", "member", "Nate Bigham", null],
  ["Hope Sturgill", "F", "hardin", "intern", "Carly Reyes", null],
  ["Amara Diaz", "F", "hardin", "member", "Hope Sturgill", null],
  ["Faith Neely", "F", "hardin", "member", "Carly Reyes", null],
  ["Grant Ellison", "M", "hardin", "worship", "Josh Reyes", null],
  ["Iris Whitson", "F", "hardin", "member", "Faith Neely", null],
  ["Dana Corbin", "F", "hardin", "member", "Hope Sturgill", null],
  ["Kelly Nash", "F", "hardin", "member", null, "open"],
  ["Rob Tatum", "M", "hardin", "member", null, "open"],
  ["Theo Marsh", "M", "hardin", "member", null, "invited"],
  ["Bree Olsen", "F", "hardin", "member", null, "wants"],

  ["Evan Marsh", "M", "blowing", "leader", "Sam Caldwell", null],
  ["Priya Marsh", "F", "blowing", "leader", null, null],
  ["Cal Jennings", "M", "blowing", "member", "Evan Marsh", null],
  ["Noor Haddad", "F", "blowing", "member", "Priya Marsh", null],
  ["Ty Beckett", "M", "blowing", "member", null, "open"],
  ["Sara Ogle", "F", "blowing", "member", null, "invited"],
  ["Finn Rausch", "M", "blowing", "member", null, "none"],
  ["Emmy Dillard", "F", "blowing", "member", null, "open"],

  ["Dana Whitfield", "F", "perkins", "leader", null, null],
  ["Cole Brandt", "M", "perkins", "leader", null, null],
  ["Ray Mercer", "M", "perkins", "member", "Cole Brandt", null],
  ["Tina Falk", "F", "perkins", "member", "Dana Whitfield", null],
  ["Hal Draper", "M", "perkins", "member", null, "declined"],
  ["Meg Coffey", "F", "perkins", "member", null, "declined"],
  ["Stu Barker", "M", "perkins", "member", null, "none"],
  ["Liz Penley", "F", "perkins", "member", null, "open"],
  ["Art Vega", "M", "perkins", "member", null, "none"],
  ["Pam Royce", "F", "perkins", "member", null, "none"],
  ["Gil Hodge", "M", "perkins", "member", null, "invited"],

  ["Tyler Nguyen", "M", "appstate", "leader", "Pastor Andy Cole", null],
  ["Maddie Ross", "F", "appstate", "leader", "Kate Cole", null],
  ["Beau Hastings", "M", "appstate", "intern", "Tyler Nguyen", null],
  ["Kaylee Strand", "F", "appstate", "member", "Maddie Ross", null],
  ["Jon Park", "M", "appstate", "member", "Beau Hastings", null],
  ["Chris Dole", "M", "appstate", "member", "Beau Hastings", null],
  ["Ava Lund", "F", "appstate", "intern", "Maddie Ross", null],
  ["Zoe Whitmer", "F", "appstate", "member", "Ava Lund", null],
  ["Nia Coleman", "F", "appstate", "member", "Ava Lund", null],
  ["Max Torres", "M", "appstate", "member", "Jon Park", null],
  ["Remy Sachs", "M", "appstate", "member", null, "open"],
  ["Isla Brant", "F", "appstate", "member", null, "invited"],
  ["Dev Patel", "M", "appstate", "member", null, "wants"],
  ["Josie Klein", "F", "appstate", "member", null, "open"],

  ["Hank Plummer", "M", "valle", "leader", null, null],
  ["Georgia Plummer", "F", "valle", "leader", null, null],
  ["Walt Freeny", "M", "valle", "member", "Hank Plummer", null],
  ["Sue Freeny", "F", "valle", "member", "Georgia Plummer", null],
  ["Randy Ostwald", "M", "valle", "member", null, "open"],
  ["Carol Mabe", "F", "valle", "member", null, "wants"],
  ["Vic Sloane", "M", "valle", "member", null, "declined"],
  ["Nell Harmon", "F", "valle", "member", "Sue Freeny", null],
  ["Roy Peck", "M", "valle", "member", null, "invited"],
  ["Ellie Plummer", "F", "valle", "member", null, "none", undefined, true],
  ["Mack Freeny", "M", "valle", "member", null, "none", undefined, true],
  ["Junie Freeny", "F", "valle", "member", null, "none", undefined, true],

  ["Bea Lawson", "F", "oak", "leader", null, null],
  ["Tomás Ortiz", "M", "oak", "leader", null, null],
  ["Gena Falls", "F", "oak", "member", "Bea Lawson", null],
  ["Marc Ivey", "M", "oak", "member", "Tomás Ortiz", null],
  ["Lou Renner", "M", "oak", "member", null, "open"],
  ["Prue Danner", "F", "oak", "member", null, "none"],
  ["Sid Womack", "M", "oak", "member", null, "none"],

  // In the church, not in any lifegroup (role "member", groupId null)
  ["Glen Farrow", "M", null, "member", null, "none", "Attends most Sundays · 2+ years, never joined a group"],
  ["Ruth Ann Bly", "F", null, "member", null, "none", "Longtime attender · rides with the Freenys"],
  ["Miles Denny", "M", null, "member", null, "none", "In guest follow-up · first visited June 14"],
  ["Kara Jessup", "F", null, "member", null, "none", "In guest follow-up · coffee scheduled"],
  ["Pete Hobbs", "M", null, "member", null, "none", "In guest follow-up · attending sporadically"],
  ["Lauren Hobbs", "F", null, "member", null, "none", "In guest follow-up · attending sporadically"],
  ["Troy Mercer", "M", null, "member", null, "none", "Ray's brother · came to Perkinsville group first"],
];

const slug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "-");

export const PEOPLE: Person[] = ROWS.map(
  ([name, gender, groupId, role, by, status, note, isChild]) => {
    const space = name.indexOf(" ");
    return {
      id: slug(name),
      name,
      firstName: space === -1 ? name : name.slice(0, space),
      lastName: space === -1 ? "" : name.slice(space + 1),
      gender,
      groupId,
      role,
      discipledBy: by ? slug(by) : null,
      statuses: status && status !== "none" ? [status] : [],
      note,
      isChild,
      // Demo default: church staff have staff access, group leaders/interns have
      // leader access, everyone else has none (their email being on file grants
      // nothing until staff flips it on).
      access:
        role === "staff"
          ? "staff"
          : role === "leader" || role === "intern"
            ? "leader"
            : "none",
    };
  },
);

/* ---------------- Guests (follow-up pipeline) ---------------- */

/** Default follow-up road; per-church configurable in Settings ("lifegroup" is locked). */
export const MILESTONES: Milestone[] = [
  { key: "emailed", label: "Emailed" },
  { key: "texted", label: "Text / call" },
  { key: "coffee", label: "Coffee" },
  { key: "discover", label: "Discover Antioch" },
  { key: "lifegroup", label: "In a lifegroup" },
  { key: "discipled", label: "Being discipled" },
];

export const GUESTS: Guest[] = [
  {
    id: "sofia-trent", name: "Sofia Trent", gender: "F",
    desc: "Moved from Charlotte, works at the hospital",
    firstSunday: "Mar 1", attending: "yes", connectCard: true,
    email: "sofia@…", phone: "(828) …",
    steps: { emailed: true, texted: true, coffee: true, discover: true, lifegroup: true, discipled: false },
    note: "Landed in King Street in April — next step: a discipleship invitation (she's marked open).",
  },
  {
    id: "troy-mercer", name: "Troy Mercer", gender: "M",
    desc: "Ray's brother — came to Perkinsville group before ever visiting a Sunday",
    firstSunday: "Jun 25*", attending: "new", connectCard: false,
    email: "—", phone: "(828) …",
    steps: { emailed: false, texted: true, coffee: false, discover: false, lifegroup: false, discipled: false },
    note: "*First contact was a lifegroup night, not a Sunday. Ray is on it — pray and stay close.",
  },
  {
    id: "kara-jessup", name: "Kara Jessup", gender: "F",
    desc: "App State grad student, visited with a coworker",
    firstSunday: "Jun 28", attending: "yes", connectCard: true,
    email: "kara@…", phone: "(828) …",
    steps: { emailed: true, texted: true, coffee: false, discover: false, lifegroup: false, discipled: false },
    note: "Coffee scheduled for Friday with Maddie.",
  },
  {
    id: "miles-denny", name: "Miles Denny", gender: "M",
    desc: "New to Boone, remote job, asked about hiking groups",
    firstSunday: "Jun 14", attending: "yes", connectCard: true,
    email: "miles@…", phone: "—",
    steps: { emailed: true, texted: false, coffee: false, discover: false, lifegroup: false, discipled: false },
    note: "Two Sundays in a row — good window for a text this week.",
  },
  {
    id: "pete-hobbs", name: "Pete Hobbs", gender: "M",
    desc: "Young family, wife Lauren, two kids",
    firstSunday: "May 17", attending: "sporadic", connectCard: false,
    email: "—", phone: "(828) …",
    steps: { emailed: false, texted: true, coffee: false, discover: false, lifegroup: false, discipled: false },
    note: "Missed three weeks. Valle Crucis (family group) could be the invite that sticks.",
  },
  {
    id: "lauren-hobbs", name: "Lauren Hobbs", gender: "F",
    desc: "Pete's wife — connected with Georgia at the picnic",
    firstSunday: "May 17", attending: "sporadic", connectCard: false,
    email: "lauren@…", phone: "—",
    steps: { emailed: true, texted: false, coffee: false, discover: false, lifegroup: false, discipled: false },
    note: "Georgia offered a playdate — most natural doorway for the whole family.",
  },
];

export const WINS: Win[] = [
  { text: "Kaylee (App State) was baptized in the Watauga River", date: "May 31" },
  { text: "Hardin Creek scored 13/15 on planting readiness — plant night Aug 25", date: "Jun 8" },
  { text: "Max joined Jon's D-group — a 4th generation from Tyler", date: "Jun 14" },
  { text: "Answered prayer: Ray's brother visited Perkinsville for the first time", date: "Jun 25" },
  { text: "Oak Grove's replant core hit 7 — every seat at the table full", date: "Jul 2" },
];

/* ---------------- Lineage (the web of lifegroups over time) ---------------- */
// Structured group history for the timeline visualization. In M5 this becomes the
// group_events ledger; every entry here corresponds to a plant / merge / dormancy /
// replant / dissolution event.

export interface LaneSegment {
  /** "YYYY-MM" inclusive start. */
  from: string;
  /** "YYYY-MM" end, or null = still running. */
  to: string | null;
  kind: "active" | "dormant" | "upcoming";
  /** Display name during this segment (groups can be renamed at replant). */
  name: string;
}

export interface LaneEvent {
  date: string;
  label: string;
  kind: "plant-out" | "plant-in" | "merge-in" | "merge-out" | "dormant" | "replant" | "milestone";
}

export interface Lane {
  id: string;
  name: string;
  /** Group this one was planted out of, if any. */
  parentId?: string;
  /** Group this one merged into when it ended, if any. */
  mergedIntoId?: string;
  segments: LaneSegment[];
  events: LaneEvent[];
}

export const LINEAGE: Lane[] = [
  {
    id: "king", name: "King Street",
    segments: [{ from: "2021-09", to: null, kind: "active", name: "King Street" }],
    events: [
      { date: "2021-09", label: "Planted — one of the original three", kind: "plant-in" },
      { date: "2024-08", label: "Planted Hardin Creek (sent 6)", kind: "plant-out" },
      { date: "2026-02", label: "Planted Blowing Rock (sent 5)", kind: "plant-out" },
    ],
  },
  {
    id: "hardin", name: "Hardin Creek", parentId: "king",
    segments: [
      { from: "2024-08", to: null, kind: "active", name: "Hardin Creek" },
      { from: "2026-08", to: "2026-10", kind: "upcoming", name: "Plant night Aug 25" },
    ],
    events: [
      { date: "2024-08", label: "Planted from King Street", kind: "plant-in" },
      { date: "2026-06", label: "Readiness 13/15", kind: "milestone" },
    ],
  },
  {
    id: "blowing", name: "Blowing Rock", parentId: "king",
    segments: [{ from: "2026-02", to: null, kind: "active", name: "Blowing Rock" }],
    events: [{ date: "2026-02", label: "Planted from King Street", kind: "plant-in" }],
  },
  {
    id: "howard", name: "Howard's Knob",
    segments: [{ from: "2021-09", to: null, kind: "active", name: "Howard's Knob" }],
    events: [
      { date: "2021-09", label: "Planted — one of the original three", kind: "plant-in" },
      { date: "2023-01", label: "Planted App State (sent 4 students)", kind: "plant-out" },
    ],
  },
  {
    id: "appstate", name: "App State", parentId: "howard",
    segments: [{ from: "2023-01", to: null, kind: "active", name: "App State" }],
    events: [
      { date: "2023-01", label: "Planted from Howard's Knob", kind: "plant-in" },
      { date: "2026-05", label: "Kaylee baptized", kind: "milestone" },
    ],
  },
  {
    id: "meadowview", name: "Meadowview", mergedIntoId: "perkins",
    segments: [{ from: "2021-09", to: "2023-06", kind: "active", name: "Meadowview" }],
    events: [
      { date: "2021-09", label: "Planted — one of the original three", kind: "plant-in" },
      { date: "2023-06", label: "Wound down — 5 people merged into Perkinsville", kind: "merge-out" },
    ],
  },
  {
    id: "perkins", name: "Perkinsville",
    segments: [{ from: "2022-05", to: null, kind: "active", name: "Perkinsville" }],
    events: [
      { date: "2022-05", label: "Planted", kind: "plant-in" },
      { date: "2023-06", label: "Received Meadowview (5 people)", kind: "merge-in" },
    ],
  },
  {
    id: "valle", name: "Valle Crucis",
    segments: [{ from: "2023-03", to: null, kind: "active", name: "Valle Crucis" }],
    events: [{ date: "2023-03", label: "Planted as first family group", kind: "plant-in" }],
  },
  {
    id: "oak", name: "Oak Grove",
    segments: [
      { from: "2022-06", to: "2026-01", kind: "active", name: "Deerfield" },
      { from: "2026-01", to: "2026-05", kind: "dormant", name: "dormant" },
      { from: "2026-05", to: null, kind: "active", name: "Oak Grove" },
    ],
    events: [
      { date: "2022-06", label: "Planted as Deerfield", kind: "plant-in" },
      { date: "2026-01", label: "Went dormant — leader moved away (honorable transition)", kind: "dormant" },
      { date: "2026-05", label: "Replanted as Oak Grove", kind: "replant" },
    ],
  },
];

/* ---------------- Constants ---------------- */

export const SEASON_META: Record<Season, { label: string; chip: string }> = {
  start: { label: "Starting Up", chip: "bg-sprout-soft text-sprout" },
  build: { label: "Thriving", chip: "bg-gold-soft text-gold" },
  plant: { label: "Multiplying", chip: "bg-ember-soft text-ember" },
  stagnant: { label: "Stagnant", chip: "bg-dormant-soft text-dormant" },
};

export const STATUS_LABEL: Record<DiscipleshipStatus, string> = {
  open: "open to it",
  invited: "invited",
  declined: "declined for now",
  wants: "wants to disciple",
  none: "not yet invited",
  discipled: "already discipled",
  making: "disciple-making",
  na: "not applicable",
};

/** The statuses offered as multi-select chips (empty selection = "not yet invited"). */
export const SELECTABLE_STATUSES: DiscipleshipStatus[] = [
  "open",
  "invited",
  "declined",
  "wants",
  "discipled",
  "making",
  "na",
];

/** Engagement tier order + default labels; labels per-church configurable in Settings. */
export const TIERS: { key: EngagementTier; label: string }[] = [
  { key: "lead", label: "Leading" },
  { key: "core", label: "Core" },
  { key: "consistent", label: "Consistent" },
  { key: "fringe", label: "On the fringe" },
];

/** What each tier means — shown beside the rename inputs in Settings. */
export const TIER_MEANING: Record<EngagementTier, string> = {
  lead: "leaders, interns, and worship leaders",
  core: "in a discipleship relationship or making disciples",
  consistent: "engaged with discipleship — open, invited, or already discipled",
  fringe: "on the roster but not yet engaged",
};

export const DEFAULT_TIER_LABELS: Record<EngagementTier, string> = Object.fromEntries(
  TIERS.map((t) => [t.key, t.label]),
) as Record<EngagementTier, string>;

/** The prebaked lifegroup roles. Churches can rename these, flip their
 * leadership flag, and add their own (stored in churches.settings.roles). */
export const DEFAULT_ROLES: RoleDef[] = [
  { id: "leader", label: "Leader", leadership: true, builtin: true },
  { id: "intern", label: "Intern", leadership: true, builtin: true },
  { id: "worship", label: "Worship leader", leadership: true, builtin: true },
  { id: "member", label: "Member", leadership: false, builtin: true },
];

/** Built-in leadership role ids — the fallback leadership set before any
 * custom roles are configured (and what the DB knows without the migration). */
export const BUILTIN_LEADERSHIP_ROLE_IDS = ["leader", "intern", "worship"];

/** Baked-in tag categories; a church can extend these (stored in churches.settings). */
export const DEFAULT_TAG_CATEGORIES: TagCategory[] = [
  {
    id: "life_stage",
    label: "Season of life",
    multi: true,
    options: [
      "Multigenerational",
      "Young adults",
      "College",
      "Youth",
      "Families",
      "Empty nesters",
    ],
  },
  {
    id: "childcare",
    label: "Childcare",
    multi: false,
    options: ["Childcare provided", "No childcare"],
  },
  {
    id: "child_friendly",
    label: "Kids at gatherings",
    multi: false,
    options: ["Kids welcome", "Adults only"],
  },
  { id: "location", label: "Area of town", multi: true, options: [] },
];

/** The Waco 15-point planting readiness rubric (attendance 0–4 + 11 checks). */
export const READINESS_LEADERSHIP: { id: string; label: string }[] = [
  { id: "attend", label: "Leaders and interns attend consistently (not sporadically)" },
  { id: "coed", label: "At least one male and one female leader per new group" },
  { id: "facilitated", label: "Both leadership teams have led meetings at least 3 times" },
  { id: "called", label: "Everyone on the teams feels called to lifegroup ministry" },
  { id: "interned", label: "All leaders have completed the intern process" },
  { id: "interns", label: "Interns identified for the new groups" },
];

export const READINESS_READINESS: { id: string; label: string }[] = [
  { id: "locations", label: "Both new groups have meeting locations" },
  { id: "vision", label: "Leaders are motivated and communicate vision regularly" },
  { id: "bonded", label: "Teams have been in the group 2+ months and bonded with members" },
  { id: "privilege", label: "Leadership is seen as a privilege, not an obligation" },
  { id: "worship", label: "A worship leader is ready for both groups" },
];

export const GROUP_EVENT_KINDS: { kind: GroupEventKind; label: string }[] = [
  { kind: "milestone", label: "Milestone worth remembering" },
  { kind: "leader_transition", label: "Leader transition" },
  { kind: "dormant", label: "Went dormant" },
  { kind: "replanted", label: "Replanted (waking back up)" },
  { kind: "merged", label: "Merged into another group" },
  { kind: "dissolved", label: "Dissolved" },
];

export const DAYS_OF_WEEK = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

export const PULSE_WORDS = [
  "Thriving", "Growing", "Warm", "Expectant", "Steady",
  "Tired", "Stretched", "Scattered", "Stuck",
];

/** The demo leader account's own group (until real auth in M2). */
export const LEADER_HOME = "king";
export const LEADER_NAME = "Sam Caldwell";

/* ---------------- Tiny formatting helpers ---------------- */
// Derivations over the data (tree, tiers, stats) live in store.tsx → makeHelpers.

export const firstName = (name: string) => name.split(" ")[0];

export const initials = (name: string) =>
  name
    .split(" ")
    .filter((w) => !w.endsWith("."))
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
