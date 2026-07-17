// Domain model for House to House.
// Mirrors the planned Postgres schema (see BUILD-PLAN.md); ids are strings so the
// swap from mock data to Supabase rows is mechanical.

export type Gender = "M" | "F";

export type Season = "start" | "build" | "plant";

export type GroupStatus = "active" | "dormant" | "dissolved";

/** Membership role inside a lifegroup ("staff" = church staff, not in a group). */
export type MemberRole = "leader" | "intern" | "worship" | "member" | "staff";

/** Where someone stands with discipleship when they have no active relationship. */
export type DiscipleshipStatus = "open" | "invited" | "declined" | "wants" | "none";

/** Engagement tiers for the chart view (per-church configurable later). */
export type EngagementTier = "lead" | "core" | "consistent" | "fringe";

export type AppRole = "staff" | "leader";

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  /** null = not in any lifegroup (staff, or unplaced). */
  groupId: string | null;
  role: MemberRole;
  /** Person id of their discipler (mentoring edge, always same-gender). */
  discipledBy: string | null;
  /** Only meaningful when the person has no discipleship edges. */
  status: DiscipleshipStatus | null;
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
