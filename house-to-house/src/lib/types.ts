// Domain model for House to House.
// Mirrors the planned Postgres schema (see BUILD-PLAN.md); ids are strings so the
// swap from mock data to Supabase rows is mechanical.

export type Gender = "M" | "F";

export type Season = "start" | "build" | "plant" | "stagnant";

export type GroupStatus = "active" | "dormant" | "dissolved";

/** Membership role inside a lifegroup ("staff" = church staff, not in a group). */
export type MemberRole = "leader" | "intern" | "worship" | "member" | "staff";

/** Where someone stands with discipleship (multiple can apply; empty = not yet invited). */
export type DiscipleshipStatus =
  | "open"
  | "invited"
  | "declined"
  | "wants"
  | "none"
  | "discipled"
  | "making"
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

export type AppRole = "staff" | "leader";

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
  /** Discipleship statuses (multiple allowed; empty = not yet invited). */
  statuses: DiscipleshipStatus[];
  /** For unplaced people: a short shepherding note. */
  note?: string;
  /** Children attend with their families; excluded from adult views by default. */
  isChild?: boolean;
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
  outcome?: GuestOutcome | null;
  archivedAt?: string | null;
  /** Set when the guest graduates into the people directory. */
  personId?: string | null;
}

export interface Win {
  text: string;
  date: string;
}
