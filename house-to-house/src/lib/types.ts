// Domain model for House to House.
// Mirrors the planned Postgres schema (see BUILD-PLAN.md); ids are strings so the
// swap from mock data to Supabase rows is mechanical.

export type Gender = "M" | "F";

export type Season = "start" | "build" | "plant" | "stagnant";

export type GroupStatus = "active" | "dormant" | "dissolved";

/** Membership role id inside a lifegroup. The four built-ins are "leader",
 * "intern", "worship", "member"; churches can add their own in Settings, so
 * this is a plain string. "staff" is special: church staff, not in a group. */
export type MemberRole = string;

/** A configurable lifegroup role (stored per church in churches.settings.roles).
 * `leadership` roles form the leadership team and can run check-ins. Built-in
 * roles can be renamed and have their leadership flag changed, but not removed. */
export interface RoleDef {
  id: string;
  label: string;
  leadership: boolean;
  builtin?: boolean;
}

/** Where someone stands with discipleship (multiple can apply; empty = not yet invited). */
export type DiscipleshipStatus =
  | "open"
  | "invited"
  | "declined"
  | "wants"
  | "none"
  | "discipled"
  | "making"
  | "emerging"
  | "na";

/** Engagement tiers for the chart view (labels per-church configurable in Settings). */
export type EngagementTier = "lead" | "core" | "consistent" | "fringe";

/** A zone groups sections; a section groups lifegroups (both optional — small
 * churches keep a flat map). Stored per church in churches.settings. */
export interface Zone {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  name: string;
  /** Zone this section belongs to (null = no zone layer yet). */
  zoneId: string | null;
}

/** Per-group check-in reminder: emailed shortly after the group's meeting
 * time. Leaders configure their own group's; staff can configure any.
 * Stored on groups.reminder (jsonb). */
export interface ReminderConfig {
  frequency: "off" | "weekly" | "monthly";
  /** Who gets the nudge; empty = fall back to the group's leaders' emails. */
  recipients: string[];
  /** Set by the cron route after each send (dedupe). */
  lastSent?: string;
}

/** Who gets emailed when a check-in comes in. Recipients accumulate down the
 * tree: a group's report goes to its section's list, that section's zone list,
 * and the church-wide list. */
export interface ReportEmailConfig {
  enabled: boolean;
  /** Everyone here gets every group's report. */
  church: string[];
  /** zoneId → recipients for groups in that zone. */
  zones: Record<string, string[]>;
  /** sectionId → recipients for groups in that section. */
  sections: Record<string, string[]>;
  /** groupId → recipients for that one group. */
  groups: Record<string, string[]>;
}

/** Who hears about it when someone signs in and can't get anywhere. */
export interface AccessAlertConfig {
  enabled: boolean;
  /** Person ids designated as admins for these alerts. */
  admins: string[];
  /** Extra addresses - a shared inbox, or someone with no person record. */
  extra: string[];
}

/** Why someone is stuck: no access at all, or access but no group to check in for. */
export type AccessRequestKind = "no-access" | "no-group";

export interface AccessRequest {
  id: string;
  email: string;
  kind: AccessRequestKind;
  requestedAt: string;
  notifiedAt: string | null;
}

export type AppRole = "staff" | "leader";

/** What a person is allowed to do in the app once they sign in. Stored on the
 * person record (people.app_access) and read by the sign-in trigger, so access
 * is provisioned by staff BEFORE anyone signs in. "none" = can't get in. */
export type AppAccess = "none" | "leader" | "staff";

/** A configurable group-tag category (stored per church in churches.settings). */
export interface TagCategory {
  id: string;
  label: string;
  /** true = pick any number; false = pick at most one (yes/no style). */
  multi: boolean;
  options: string[];
  /** User-added category (removable); baked-in categories are permanent. */
  custom?: boolean;
}

export interface Person {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  /** null = not in any lifegroup (staff, or unplaced). */
  groupId: string | null;
  role: MemberRole;
  /** Person id of their discipler (mentoring edge, always same-gender). */
  discipledBy: string | null;
  /** Peer-discipleship partners (symmetric, same-gender) — "sharpen one
   * another" relationships that have no discipler/disciple hierarchy. */
  peers: string[];
  /** Roadmap progress: step-key -> completion date (ISO). Steps are
   * church-configurable; see RoadmapStep. */
  roadmap: Record<string, string>;
  /** Discipleship statuses (multiple allowed; empty = not yet invited). */
  statuses: DiscipleshipStatus[];
  /** For unplaced people: a short shepherding note. */
  note?: string;
  /** Children attend with their families; excluded from adult views by default. */
  isChild?: boolean;
  /** Contact email — also what a granted login is matched against at sign-in. */
  email?: string;
  /** Contact phone. */
  phone?: string;
  /** App access level (staff-granted). "none" = signing in gets them nothing. */
  access?: AppAccess;
}

/** A discipleship group: the 3-5 person, same-gender cluster where
 * multiplication happens. Usually inside a lifegroup (2 men's + 2 women's =
 * the plant-ready pattern), but may be church-wide (groupId null) — led by
 * anyone, spanning lifegroups. */
export interface DGroup {
  id: string;
  /** The lifegroup it belongs to, or null for a free-standing church-wide group. */
  groupId: string | null;
  gender: Gender;
  /** Mentoring (a leader disciples members — 1-on-1 is leader + one member)
   * or peer (members sharpen one another; no leader, doesn't nest in the tree). */
  kind: RelationshipKind;
  /** Optional label; display defaults to "<leader's first name>'s D-group". */
  name?: string;
  /** The discipler. Null for peer groups. */
  leaderId: string | null;
  memberIds: string[];
}

export interface GroupEvent {
  date: string;
  text: string;
}

/** Recordable history-ledger event kinds (drawer → "Record an event"). */
export type GroupEventKind =
  | "dormant"
  | "replanted"
  | "merged"
  | "dissolved"
  | "leader_transition"
  | "milestone";

/** A saved planting-readiness assessment (stored on groups.readiness). */
export interface ReadinessData {
  score: number;
  date: string;
  attendance: number;
  checks: Record<string, boolean>;
}

export interface Group {
  id: string;
  name: string;
  meet: string;
  season: Season;
  status: GroupStatus;
  insights: string[];
  dgroups: string;
  lineage: string | null;
  readiness?: number;
  readinessData?: ReadinessData | null;
  history: GroupEvent[];
  /** Tag labels (geography, season of life, custom). */
  tags: string[];
  /** Check-in reminder config (frequency + recipients). */
  reminder?: ReminderConfig;
}

export type GuestAttending = "yes" | "sporadic" | "new";

export type GuestOutcome =
  | "landed"
  | "moved_away"
  | "other_church"
  | "went_cold"
  | "sundays_only";

/** A step on the guest follow-up road (per-church configurable in Settings).
 * The "lifegroup" key is special — reaching it graduates the guest. */
export type MilestoneKey = string;

export interface Milestone {
  key: MilestoneKey;
  label: string;
}

/** How two people are discipling: a hierarchical mentoring edge (discipler →
 * disciple) or a symmetric peer partnership. */
export type RelationshipKind = "mentoring" | "peer";

/** A rung on the per-person Discipleship Roadmap (formation ladder), e.g.
 * "Shared their testimony", "Made their first disciple". Church-configurable
 * in Settings; stored in churches.settings.roadmap. */
export interface RoadmapStep {
  key: string;
  label: string;
}

export interface Guest {
  id: string;
  name: string;
  gender: Gender;
  desc: string;
  firstSunday: string;
  attending: GuestAttending;
  connectCard: boolean;
  email: string;
  phone: string;
  steps: Record<MilestoneKey, boolean>;
  note: string;
  /** Lifegroup this MVP is connected to — that group's leaders see them on
   * their MVP board and can contribute (milestones, note). */
  groupId?: string | null;
  outcome?: GuestOutcome | null;
  archivedAt?: string | null;
  /** Set when the guest graduates into the people directory. */
  personId?: string | null;
}

/** The kinds of win a group can celebrate at check-in. Matches the
 * wins.category CHECK in the database. */
export type WinCategory =
  | "answered_prayer"
  | "salvation"
  | "baptism"
  | "new_dship"
  | "other";

export interface Win {
  text: string;
  date: string;
  category: WinCategory;
}
