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
  | "making";

/** Engagement tiers for the chart view (per-church configurable later). */
export type EngagementTier = "lead" | "core" | "consistent" | "fringe";

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

/** Milestone keys for the follow-up road (per-church configurable later). */
export type MilestoneKey =
  | "emailed"
  | "texted"
  | "coffee"
  | "discover"
  | "lifegroup"
  | "discipled";

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
  outcome?: GuestOutcome;
  archivedAt?: string;
}

export interface Win {
  text: string;
  date: string;
}
