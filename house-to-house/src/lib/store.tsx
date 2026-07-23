"use client";

// The app's single data source. Demo mode (no Supabase env): serves the sample
// data with in-memory mutations. Real mode: loads the church's data from
// Supabase and writes through to it. Components only ever talk to useData().

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AccessAlertConfig,
  AccessRequest,
  AccessRequestKind,
  AppAccess,
  AppRole,
  DGroup,
  DiscipleshipStatus,
  EngagementTier,
  Gender,
  Group,
  GroupEventKind,
  Guest,
  GuestOutcome,
  MemberRole,
  Milestone,
  MilestoneKey,
  OversightLeader,
  Person,
  ReadinessData,
  RelationshipKind,
  ReminderConfig,
  ReportEmailConfig,
  RoadmapStep,
  RoleDef,
  Season,
  Section,
  TagCategory,
  Win,
  WinCategory,
  Zone,
} from "./types";
import { DEFAULT_REPORT_EMAILS } from "./report-email";
import { DEFAULT_ACCESS_ALERTS } from "./access-email";
import {
  BUILTIN_LEADERSHIP_ROLE_IDS,
  DEFAULT_ROLES,
  DEFAULT_TAG_CATEGORIES,
  DEFAULT_TIER_LABELS,
  DGROUPS as SEED_DGROUPS,
  MILESTONES as DEFAULT_MILESTONES,
  ROADMAP as DEFAULT_ROADMAP,
  GROUPS as SEED_GROUPS,
  GUESTS as SEED_GUESTS,
  LINEAGE as SEED_LINEAGE,
  PEOPLE as SEED_PEOPLE,
  WINS as SEED_WINS,
  dgroupSummary,
  type Lane,
} from "./data";
import { LEADER_HOME, PULSE_WORDS as DEFAULT_PULSE_WORDS } from "./data";
import { computeInsights } from "./insights";
import { isSupabaseConfigured } from "./supabase/config";
import { supabaseBrowser } from "./supabase/client";

export interface AddPersonInput {
  firstName: string;
  lastName: string;
  gender: Gender;
  email?: string;
  phone?: string;
  groupId?: string | null;
  role?: MemberRole;
  statuses?: DiscipleshipStatus[];
  isChild?: boolean;
}

export interface AddGroupInput {
  name: string;
  season: Season;
  meetingDay?: string;
  meetingTime?: string;
  meetingPlace?: string;
  tags?: string[];
}

export interface DGroupInput {
  groupId: string | null;
  gender: Gender;
  kind: RelationshipKind;
  name?: string;
  /** Null for peer groups. */
  leaderId: string | null;
  memberIds: string[];
}

export interface GuestInput {
  name: string;
  gender: Gender;
  desc: string;
  firstSunday: string;
  attending: Guest["attending"];
  connectCard: boolean;
  email: string;
  phone: string;
  note: string;
  /** Lifegroup this MVP is connected to (leaders of it see + contribute). */
  groupId?: string | null;
}

export interface CheckinSummary {
  groupId: string;
  month: string;
  pulseWords: string[];
  rosterNote: string | null;
  meetingChange: string | null;
  /** How many people were tapped present ("who came tonight?"); 0 = not recorded. */
  attended: number;
}

export interface RecordEventInput {
  groupId: string;
  kind: GroupEventKind;
  month: string;
  notes: string;
  relatedGroupId?: string;
  newName?: string;
}

export interface CheckinInput {
  groupId: string;
  pulseWords: string[];
  newPerson?: { firstName: string; lastName: string; gender: Gender };
  win?: { category: WinCategory; note: string };
  meeting?: { day: string; time: string; place: string };
  /** Person ids tapped present on the "who came tonight?" step. */
  attendance?: string[];
}

interface DataApi {
  ready: boolean;
  realMode: boolean;
  role: AppRole;
  demoRole: AppRole;
  setDemoRole: (r: AppRole) => void;
  userEmail: string | null;
  /**
   * Real mode: does the signed-in user have a profile row? Without one they
   * can read nothing (every RLS policy is gated on it), so the app must say
   * "your access isn't set up" rather than show an empty church.
   */
  linked: boolean;
  /** The signed-in user's linked person record (real mode; null if unlinked). */
  mePersonId: string | null;
  /**
   * Every group the signed-in user has leader authority over: the ones they
   * lead on the roster, plus every group in a section or zone they oversee.
   * This is the set all the leader-shaped permissions key off, so a section
   * leader inherits the whole lifegroup-leader experience for their section.
   */
  myGroupIds: string[];
  /**
   * Only the groups they personally lead on the roster. Narrower than
   * myGroupIds on purpose - "My group" is a bookmark to your own lifegroup,
   * and a section leader with six of them has no single one.
   */
  myLedGroupIds: string[];
  /** Section/zone oversight assignments for the church (staff manage these). */
  oversightLeaders: OversightLeader[];
  /** Give or take a person's oversight of one zone/section (staff only). */
  setOversight: (
    personId: string,
    scope: OversightLeader["scope"],
    scopeId: string,
    on: boolean,
  ) => Promise<string | null>;
  people: Person[];
  groups: Group[];
  wins: Win[];
  guests: Guest[];
  lanes: Lane[];
  tagCategories: TagCategory[];
  refresh: () => Promise<void>;
  addPerson: (input: AddPersonInput) => Promise<string | null>;
  addGroup: (input: AddGroupInput) => Promise<string | null>;
  addRelationship: (
    disciplerId: string,
    discipleId: string,
    kind?: RelationshipKind,
  ) => Promise<string | null>;
  setStatuses: (personId: string, statuses: DiscipleshipStatus[]) => Promise<string | null>;
  setGroupTags: (groupId: string, labels: string[]) => Promise<string | null>;
  updatePerson: (id: string, input: AddPersonInput) => Promise<string | null>;
  deletePerson: (id: string) => Promise<string | null>;
  /** Grant/revoke a person's app access (staff only). Syncs their profile. */
  setAccess: (personId: string, level: AppAccess) => Promise<string | null>;
  /** Email a sign-in link to an invited user (they must already have access). */
  sendInvite: (email: string) => Promise<string | null>;
  endDiscipleship: (discipleId: string) => Promise<string | null>;
  /** End a peer partnership between two people. */
  endPeer: (aId: string, bId: string) => Promise<string | null>;
  /** The Discipleship Roadmap steps (configurable in Settings). */
  roadmapSteps: RoadmapStep[];
  saveRoadmap: (list: RoadmapStep[]) => Promise<string | null>;
  /** Mark/clear a person's roadmap step (date = null clears it). */
  setRoadmapStep: (
    personId: string,
    stepKey: string,
    date: string | null,
  ) => Promise<string | null>;
  /** The church's D-groups (the 3-5 person clusters inside lifegroups). */
  dgroups: DGroup[];
  addDgroup: (input: DGroupInput) => Promise<string | null>;
  updateDgroup: (id: string, input: DGroupInput) => Promise<string | null>;
  deleteDgroup: (id: string) => Promise<string | null>;
  updateGroup: (id: string, input: AddGroupInput) => Promise<string | null>;
  /** Set a group's check-in reminder (leaders: own group; staff: any). */
  saveReminder: (groupId: string, cfg: ReminderConfig) => Promise<string | null>;
  deleteGroup: (id: string) => Promise<string | null>;
  setGroupOrigin: (
    id: string,
    plantedMonth: string,
    parentGroupId: string | null,
  ) => Promise<string | null>;
  addTagOption: (categoryId: string, label: string) => Promise<string | null>;
  submitCheckin: (input: CheckinInput) => Promise<string | null>;
  addGuest: (input: GuestInput) => Promise<string | null>;
  updateGuest: (id: string, input: GuestInput) => Promise<string | null>;
  setGuestMilestone: (id: string, key: MilestoneKey, value: boolean) => Promise<string | null>;
  graduateGuest: (id: string, groupId: string | null) => Promise<string | null>;
  archiveGuest: (id: string, outcome: GuestOutcome) => Promise<string | null>;
  restoreGuest: (id: string) => Promise<string | null>;
  recordGroupEvent: (input: RecordEventInput) => Promise<string | null>;
  saveReadiness: (groupId: string, data: ReadinessData) => Promise<string | null>;
  /** Recent check-ins, newest first (staff see all; leaders their groups). */
  checkinLog: CheckinSummary[];
  /** The church's pulse-word vocabulary (configurable in Settings). */
  pulseWords: string[];
  savePulseWords: (words: string[]) => Promise<string | null>;
  addTagCategory: (label: string, multi: boolean) => Promise<string | null>;
  /** The guest follow-up road, in order (configurable in Settings). */
  milestones: Milestone[];
  saveMilestones: (list: Milestone[]) => Promise<string | null>;
  /** Display names for the four engagement tiers (configurable in Settings). */
  tierLabels: Record<EngagementTier, string>;
  saveTierLabels: (labels: Record<EngagementTier, string>) => Promise<string | null>;
  /** Lifegroup roles — built-in plus any custom (configurable in Settings). */
  roles: RoleDef[];
  saveRoles: (list: RoleDef[]) => Promise<string | null>;
  /** Display label for a role id (falls back to the id if unknown). */
  roleLabel: (id: string) => string;
  /** Whether a role id counts as leadership (leadership team + check-ins). */
  isLeadershipRole: (id: string) => boolean;
  /** Ids of the leadership roles — passed into makeHelpers for tiers/leaders. */
  leadershipRoleIds: Set<string>;
  /** Zones & sections — optional structure over the lifegroup map. */
  zones: Zone[];
  sections: Section[];
  /** groupId → sectionId assignments. */
  groupSections: Record<string, string>;
  saveZoning: (next: {
    zones: Zone[];
    sections: Section[];
    groupSections: Record<string, string>;
  }) => Promise<string | null>;
  /** Who gets emailed when a check-in lands (configurable in Settings). */
  reportEmails: ReportEmailConfig;
  saveReportEmails: (config: ReportEmailConfig) => Promise<string | null>;
  /** Who hears about someone stuck at the door (configurable in Settings). */
  accessAlerts: AccessAlertConfig;
  saveAccessAlerts: (config: AccessAlertConfig) => Promise<string | null>;
  /** Open "I can't get in" requests, newest first (staff only). */
  accessRequests: AccessRequest[];
  /** Mark a request handled without changing anyone's access. */
  resolveAccessRequest: (id: string) => Promise<string | null>;
  /**
   * Tell the church someone is stuck. Deduplicated server-side, so the screens
   * that call this may do so on every render without nagging anybody.
   */
  reportStuck: (kind: AccessRequestKind) => Promise<void>;
  /**
   * Stand up a brand-new church with the signed-in user as its first staff
   * member. Only reachable from the no-profile screen: one login, one church.
   */
  createChurch: (churchName: string, firstName: string, lastName: string) => Promise<string | null>;
  /** The church's display name (shown in the wordmark; editable by staff). */
  churchName: string;
  saveChurchName: (name: string) => Promise<string | null>;
}

const DataContext = createContext<DataApi | null>(null);

const monthOf = (iso: string) => iso.slice(0, 7);

/** Find-or-create tags by label, then attach them to a group. */
async function writeGroupTags(
  churchId: string,
  groupId: string,
  labels: string[],
): Promise<string | null> {
  const supabase = supabaseBrowser();
  for (const label of labels) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .ilike("label", label)
      .maybeSingle();
    let tagId = existing?.id;
    if (!tagId) {
      const { data: created, error } = await supabase
        .from("tags")
        .insert({ church_id: churchId, label, kind: "custom" })
        .select("id")
        .single();
      if (error) return error.message;
      tagId = created.id;
    }
    const { error: linkErr } = await supabase
      .from("group_tags")
      .upsert({ group_id: groupId, tag_id: tagId });
    if (linkErr) return linkErr.message;
  }
  return null;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const realMode = isSupabaseConfigured;
  const [ready, setReady] = useState(!realMode);
  const [demoRole, setDemoRole] = useState<AppRole>("staff");
  const [role, setRole] = useState<AppRole>("staff");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [linked, setLinked] = useState(true);
  const [people, setPeople] = useState<Person[]>(realMode ? [] : SEED_PEOPLE);
  // Demo group cards derive their D-group summary from the seeded entities so
  // both modes flow through the same source of truth.
  const [groups, setGroups] = useState<Group[]>(
    realMode
      ? []
      : SEED_GROUPS.map((g) => ({
          ...g,
          dgroups: dgroupSummary(SEED_DGROUPS.filter((d) => d.groupId === g.id)),
        })),
  );
  const [dgroups, setDgroups] = useState<DGroup[]>(realMode ? [] : SEED_DGROUPS);
  const [wins, setWins] = useState<Win[]>(realMode ? [] : SEED_WINS);
  const [guests, setGuests] = useState<Guest[]>(realMode ? [] : SEED_GUESTS);
  const [lanes, setLanes] = useState<Lane[]>(realMode ? [] : SEED_LINEAGE);
  const [tagCategories, setTagCategories] = useState<TagCategory[]>(DEFAULT_TAG_CATEGORIES);
  const [mePersonId, setMePersonId] = useState<string | null>(null);
  const [realMyGroupIds, setRealMyGroupIds] = useState<string[]>([]);
  const [realMyLedGroupIds, setRealMyLedGroupIds] = useState<string[]>([]);
  const [oversightLeaders, setOversightLeaders] = useState<OversightLeader[]>([]);
  const [checkinLog, setCheckinLog] = useState<CheckinSummary[]>([]);
  const [pulseWords, setPulseWords] = useState<string[]>(DEFAULT_PULSE_WORDS);
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [roadmapSteps, setRoadmapSteps] = useState<RoadmapStep[]>(DEFAULT_ROADMAP);
  const [tierLabels, setTierLabels] =
    useState<Record<EngagementTier, string>>(DEFAULT_TIER_LABELS);
  const [roles, setRoles] = useState<RoleDef[]>(DEFAULT_ROLES);
  const [zones, setZones] = useState<Zone[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [groupSections, setGroupSections] = useState<Record<string, string>>({});
  const [reportEmails, setReportEmails] = useState<ReportEmailConfig>(DEFAULT_REPORT_EMAILS);
  // Demo shows the sample church; real mode overwrites this from the DB.
  const [churchName, setChurchName] = useState("Antioch Boone");
  const [accessAlerts, setAccessAlerts] = useState<AccessAlertConfig>(DEFAULT_ACCESS_ALERTS);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);

  const refresh = useCallback(async () => {
    if (!realMode) return;
    const supabase = supabaseBrowser();

    // Who am I must be known before loading my profile: staff can read every
    // profile in the church, so an unfiltered profiles query returns ALL of
    // them and .maybeSingle() (which errors on >1 row) hands back null — that
    // silently dropped staff to the leader view the moment a church had a
    // second login. Scope the profile read to my own id.
    const { data: auth } = await supabase.auth.getUser();
    const myUid = auth.user?.id ?? "";

    const readProfile = async () =>
      myUid
        ? (
            await supabase
              .from("profiles")
              .select("role, person_id")
              .eq("id", myUid)
              .maybeSingle()
          ).data
        : null;

    // The profile has to be resolved BEFORE anything else loads, because
    // everything else depends on it: every RLS policy is gated on
    // current_church_id(), which reads this row. No profile means every query
    // below comes back empty and the app looks like a church with nothing in
    // it. That state is reachable in normal use — the sign-in trigger only
    // fires when the auth account is CREATED, so anyone who typed their email
    // at the login screen before staff granted them access never got a
    // profile, and no later sign-in fixed it. Ask the server to link us; it
    // grants exactly what staff already set on the person record, and nothing
    // if that's still None.
    // A profile that exists but points at no person gets the same repair (it
    // means their person record was deleted and re-added). It is NOT a lockout
    // though - that profile still carries church_id, so they can see the
    // church, they just have no "me". Only a missing profile blocks everything,
    // so only that flips `linked`.
    let profile = await readProfile();
    if (myUid && !profile?.person_id) {
      const { data: status } = await supabase.rpc("link_my_profile");
      if (status === "linked") profile = (await readProfile()) ?? profile;
    }
    setLinked(!!profile);

    const [
      churchQ,
      groupsQ,
      peopleQ,
      memsQ,
      relsQ,
      winsQ,
      guestsQ,
      eventsQ,
      tagsQ,
      groupTagsQ,
      checkinsQ,
      dgroupsQ,
      dgroupMembersQ,
      accessReqQ,
      oversightQ,
    ] = await Promise.all([
      supabase.from("churches").select("name, settings").single(),
      supabase.from("groups").select("*").order("created_at"),
      supabase.from("people").select("*").order("first_name"),
      supabase.from("memberships").select("*"),
      supabase.from("discipleship_relationships").select("*").is("ended_at", null),
      supabase.from("wins").select("*").order("happened_on", { ascending: false }).limit(20),
      supabase.from("guests").select("*").order("created_at"),
      supabase.from("group_events").select("*").order("happened_on"),
      supabase.from("tags").select("*"),
      supabase.from("group_tags").select("*"),
      supabase.from("checkins").select("*").order("month", { ascending: false }),
      supabase.from("dgroups").select("*").order("created_at"),
      supabase.from("dgroup_members").select("dgroup_id, person_id"),
      // Staff-only by policy; everyone else just gets an empty list back.
      supabase
        .from("access_requests")
        .select("id, email, kind, requested_at, notified_at")
        .is("resolved_at", null)
        .order("requested_at", { ascending: false }),
      supabase.from("oversight_leaders").select("id, person_id, scope, scope_id"),
    ]);

    setUserEmail(auth.user?.email ?? null);
    setMePersonId(profile?.person_id ?? null);
    // What the app lets you SEE follows the access grant (None / Leader /
    // Staff) — never your lifegroup role. Two signals can carry it: the
    // app_access grant on your person record (what staff set today) and the
    // profiles.role stamped at sign-in. Either can lag the other — a fresh
    // grant hasn't re-stamped the profile yet; an account created before
    // app_access existed never got the column backfilled — so we honor Staff
    // from EITHER. Neither your membership role nor a stale mirror can lock a
    // real staff member out of the staff view.
    const myRow = peopleQ.data?.find((p) => p.id === profile?.person_id);
    const grant = myRow?.app_access as AppAccess | undefined;
    const stamped = profile?.role as AppAccess | undefined;
    setRole(grant === "staff" || stamped === "staff" ? "staff" : "leader");

    if (churchQ.data?.name) setChurchName(churchQ.data.name);

    const savedCategories = churchQ.data?.settings?.tagCategories as TagCategory[] | undefined;
    setTagCategories(savedCategories?.length ? savedCategories : DEFAULT_TAG_CATEGORIES);
    const savedPulse = churchQ.data?.settings?.pulseWords as string[] | undefined;
    setPulseWords(savedPulse?.length ? savedPulse : DEFAULT_PULSE_WORDS);
    const savedMilestones = churchQ.data?.settings?.milestones as Milestone[] | undefined;
    const road = savedMilestones?.length ? savedMilestones : DEFAULT_MILESTONES;
    setMilestones(road);
    const savedRoadmap = churchQ.data?.settings?.roadmap as RoadmapStep[] | undefined;
    setRoadmapSteps(savedRoadmap?.length ? savedRoadmap : DEFAULT_ROADMAP);
    const savedTierLabels = churchQ.data?.settings?.tierLabels as
      | Partial<Record<EngagementTier, string>>
      | undefined;
    setTierLabels({ ...DEFAULT_TIER_LABELS, ...savedTierLabels });
    const savedRoles = churchQ.data?.settings?.roles as RoleDef[] | undefined;
    if (savedRoles?.length) {
      setRoles(savedRoles);
    } else {
      // Back-compat: build roles from the older roleLabels-only setting.
      const oldLabels = churchQ.data?.settings?.roleLabels as
        | Record<string, string>
        | undefined;
      setRoles(
        oldLabels
          ? DEFAULT_ROLES.map((r) => ({ ...r, label: oldLabels[r.id]?.trim() || r.label }))
          : DEFAULT_ROLES,
      );
    }
    setZones((churchQ.data?.settings?.zones as Zone[] | undefined) ?? []);
    setSections((churchQ.data?.settings?.sections as Section[] | undefined) ?? []);
    setGroupSections(
      (churchQ.data?.settings?.groupSections as Record<string, string> | undefined) ?? {},
    );
    setReportEmails({
      ...DEFAULT_REPORT_EMAILS,
      ...((churchQ.data?.settings?.reportEmails as Partial<ReportEmailConfig> | undefined) ?? {}),
    });
    setAccessAlerts({
      ...DEFAULT_ACCESS_ALERTS,
      ...((churchQ.data?.settings?.accessAlerts as Partial<AccessAlertConfig> | undefined) ?? {}),
    });
    setAccessRequests(
      (accessReqQ.data ?? []).map((r) => ({
        id: r.id,
        email: r.email,
        kind: r.kind as AccessRequest["kind"],
        requestedAt: r.requested_at,
        notifiedAt: r.notified_at ?? null,
      })),
    );

    const allMems = memsQ.data ?? [];
    const mems = allMems.filter((m) => !m.left_at);
    const rels = relsQ.data ?? [];
    const events = eventsQ.data ?? [];
    const checkinRows = checkinsQ.data ?? [];
    setCheckinLog(
      checkinRows.map((c) => ({
        groupId: c.group_id,
        month: c.month.slice(0, 7),
        pulseWords: c.pulse_words ?? [],
        rosterNote: c.roster_notes ?? null,
        meetingChange: c.meeting_change ?? null,
        attended: c.attendance?.length ?? 0,
      })),
    );

    const myPersonId = profile?.person_id ?? null;
    // Leadership set from the just-loaded role config (DEFAULT_ROLES already
    // marks leader/intern/worship as leadership).
    const loadedRoles = (churchQ.data?.settings?.roles as RoleDef[] | undefined) ?? DEFAULT_ROLES;
    const leadIds = new Set(loadedRoles.filter((r) => r.leadership).map((r) => r.id));
    const ledGroupIds = myPersonId
      ? mems
          .filter((m) => m.person_id === myPersonId && leadIds.has(m.role))
          .map((m) => m.group_id)
      : [];
    setRealMyLedGroupIds(ledGroupIds);

    const loadedOversight: OversightLeader[] = (oversightQ.data ?? []).map((o) => ({
      id: o.id,
      personId: o.person_id,
      scope: o.scope as OversightLeader["scope"],
      scopeId: o.scope_id,
    }));
    setOversightLeaders(loadedOversight);

    // Mirror of the oversees_group() SQL function: walk group -> section ->
    // zone and ask whether I oversee either. Kept in step with the policy so
    // the UI offers exactly what the database will allow - the alternative is
    // buttons that fail on save.
    const loadedSections = (churchQ.data?.settings?.sections as Section[] | undefined) ?? [];
    const loadedGroupSections =
      (churchQ.data?.settings?.groupSections as Record<string, string> | undefined) ?? {};
    const mine = loadedOversight.filter((o) => o.personId === myPersonId);
    const mySectionIds = new Set(mine.filter((o) => o.scope === "section").map((o) => o.scopeId));
    const myZoneIds = new Set(mine.filter((o) => o.scope === "zone").map((o) => o.scopeId));
    const overseen = myPersonId
      ? (groupsQ.data ?? [])
          .filter((g) => {
            const sectionId = loadedGroupSections[g.id];
            if (!sectionId) return false;
            if (mySectionIds.has(sectionId)) return true;
            const zoneId = loadedSections.find((s) => s.id === sectionId)?.zoneId;
            return !!zoneId && myZoneIds.has(zoneId);
          })
          .map((g) => g.id)
      : [];

    setRealMyGroupIds([...new Set([...ledGroupIds, ...overseen])]);
    const tagLabel = new Map((tagsQ.data ?? []).map((t) => [t.id, t.label as string]));
    const tagsByGroup = new Map<string, string[]>();
    for (const gt of groupTagsQ.data ?? []) {
      const label = tagLabel.get(gt.tag_id);
      if (!label) continue;
      const list = tagsByGroup.get(gt.group_id) ?? [];
      list.push(label);
      tagsByGroup.set(gt.group_id, list);
    }

    const memByPerson = new Map<string, (typeof mems)[number]>();
    for (const m of mems) if (!memByPerson.has(m.person_id)) memByPerson.set(m.person_id, m);

    // Mentoring edges build the hierarchy (discipledBy); peer edges are
    // symmetric and go into each partner's peers list — no false hierarchy.
    const disciplerOf = new Map<string, string>();
    const peersOf = new Map<string, Set<string>>();
    const addPeer = (a: string, b: string) => {
      const set = peersOf.get(a) ?? new Set<string>();
      set.add(b);
      peersOf.set(a, set);
    };
    for (const r of rels) {
      if (r.kind === "peer") {
        addPeer(r.discipler_id, r.disciple_id);
        addPeer(r.disciple_id, r.discipler_id);
      } else if (!disciplerOf.has(r.disciple_id)) {
        disciplerOf.set(r.disciple_id, r.discipler_id);
      }
    }

    setPeople(
      (peopleQ.data ?? []).map((row) => {
        const mem = memByPerson.get(row.id);
        return {
          id: row.id,
          name: `${row.first_name} ${row.last_name}`.trim(),
          firstName: row.first_name,
          lastName: row.last_name,
          gender: (row.gender ?? "M") as Gender,
          groupId: mem?.group_id ?? null,
          role: (mem?.role ?? "member") as MemberRole,
          discipledBy: disciplerOf.get(row.id) ?? null,
          peers: Array.from(peersOf.get(row.id) ?? []),
          roadmap: (row.roadmap ?? {}) as Record<string, string>,
          statuses: (Array.isArray(row.discipleship_status)
            ? row.discipleship_status
            : row.discipleship_status && row.discipleship_status !== "none"
              ? [row.discipleship_status]
              : []) as DiscipleshipStatus[],
          note: row.notes ?? undefined,
          isChild: !!row.is_child,
          email: row.email ?? undefined,
          phone: row.phone ?? undefined,
          access: (row.app_access ?? "none") as AppAccess,
        };
      }),
    );

    const peopleLite = new Map(
      (peopleQ.data ?? []).map((p) => [
        p.id,
        { isChild: !!p.is_child, gender: p.gender as string | null },
      ]),
    );
    // D-groups: entities are the source of truth for the card summary and the
    // plant-ready insight (mentoring edges remain the fallback when none exist).
    const dgroupMemberRows = dgroupMembersQ.data ?? [];
    const loadedDgroups: DGroup[] = (dgroupsQ.data ?? []).map((d) => ({
      id: d.id,
      groupId: d.group_id,
      gender: (d.gender ?? "M") as Gender,
      kind: (d.kind ?? "mentoring") as RelationshipKind,
      name: d.name ?? undefined,
      leaderId: d.leader_id ?? null,
      memberIds: dgroupMemberRows
        .filter((m) => m.dgroup_id === d.id)
        .map((m) => m.person_id),
    }));
    setDgroups(loadedDgroups);

    const insightCtx = {
      people: peopleLite,
      allMemberships: allMems,
      relationships: rels,
      checkins: checkinRows,
      dgroups: loadedDgroups.map((d) => ({ group_id: d.groupId, gender: d.gender as string })),
    };

    const allGroupRows = groupsQ.data ?? [];
    setGroups(
      allGroupRows
        .filter((row) => row.status !== "dissolved")
        .map((row) => {
          const meet = [row.meeting_day, row.meeting_time, row.meeting_place]
            .filter(Boolean)
            .join(" · ");
          const history = events
            .filter((e) => e.group_id === row.id)
            .map((e) => ({
              date: e.happened_on,
              text: e.notes ?? e.kind,
            }));
          return {
            id: row.id,
            name: row.name,
            meet: meet || "meeting time TBD",
            season: (row.season ?? "start") as Season,
            status: row.status,
            insights: computeInsights(row.id, row.season, insightCtx),
            dgroups: dgroupSummary(loadedDgroups.filter((d) => d.groupId === row.id)),
            lineage: null,
            readiness: row.readiness?.score,
            readinessData: row.readiness ?? null,
            history,
            tags: tagsByGroup.get(row.id) ?? [],
            reminder: {
              frequency: (row.reminder?.frequency ?? "off") as ReminderConfig["frequency"],
              recipients: (row.reminder?.recipients ?? []) as string[],
              lastSent: row.reminder?.lastSent,
            },
          } satisfies Group;
        }),
    );

    setWins(
      (winsQ.data ?? []).map((w) => ({
        text: w.body,
        date: w.happened_on,
        category: (w.category ?? "other") as WinCategory,
      })),
    );

    setGuests(
      (guestsQ.data ?? []).map((g) => ({
        id: g.id,
        name: g.full_name,
        gender: (g.gender ?? "M") as Gender,
        desc: g.description ?? "",
        firstSunday: g.first_sunday ?? " - ",
        attending: g.attending,
        connectCard: g.connect_card,
        email: g.email ?? " - ",
        phone: g.phone ?? " - ",
        steps: Object.fromEntries(road.map((m) => [m.key, !!g.milestones?.[m.key]])),
        note: g.notes ?? "",
        groupId: g.group_id ?? null,
        outcome: g.outcome ?? null,
        archivedAt: g.archived_at ?? null,
        personId: g.person_id ?? null,
      })),
    );

    // Lineage lanes from the events ledger — dissolved groups keep their lane,
    // dormancy breaks the line, replants resume it, merges flow into the
    // receiving group's lane.
    const rowsById = new Map(allGroupRows.map((g) => [g.id, g]));
    const DOT_KIND: Record<string, Lane["events"][number]["kind"]> = {
      planted: "plant-in",
      replanted: "replant",
      dormant: "dormant",
      merged: "merge-out",
      dissolved: "merge-out",
      leader_transition: "milestone",
      milestone: "milestone",
      renamed: "milestone",
    };
    setLanes(
      allGroupRows.map((row) => {
        const evs = events.filter((e) => e.group_id === row.id);
        const planted = evs.find((e) => e.kind === "planted");
        const start = monthOf(planted?.happened_on ?? row.created_at);

        const segments: Lane["segments"] = [];
        let segStart = start;
        let segKind: Lane["segments"][number]["kind"] = "active";
        let mergedIntoId: string | undefined;
        let ended = false;
        for (const e of evs) {
          const m = monthOf(e.happened_on);
          if (e.kind === "dormant") {
            segments.push({ from: segStart, to: m, kind: segKind, name: row.name });
            segStart = m;
            segKind = "dormant";
          } else if (e.kind === "replanted") {
            segments.push({ from: segStart, to: m, kind: segKind, name: row.name });
            segStart = m;
            segKind = "active";
          } else if (e.kind === "dissolved" || e.kind === "merged") {
            segments.push({ from: segStart, to: m, kind: segKind, name: row.name });
            if (e.kind === "merged" && e.related_group_id && rowsById.has(e.related_group_id)) {
              mergedIntoId = e.related_group_id;
            }
            ended = true;
            break;
          }
        }
        if (!ended) segments.push({ from: segStart, to: null, kind: segKind, name: row.name });

        const dots: Lane["events"] = evs.map((e) => ({
          date: monthOf(e.happened_on),
          label: e.notes ?? e.kind,
          kind: DOT_KIND[e.kind] ?? "milestone",
        }));
        // Plants that left this group, and merges that arrived into it
        for (const e of events) {
          if (e.group_id === row.id) continue;
          if (e.kind === "planted" && e.related_group_id === row.id) {
            dots.push({
              date: monthOf(e.happened_on),
              label: `Planted ${rowsById.get(e.group_id)?.name ?? "a group"}`,
              kind: "plant-out",
            });
          }
          if (e.kind === "merged" && e.related_group_id === row.id) {
            dots.push({
              date: monthOf(e.happened_on),
              label: `Received ${rowsById.get(e.group_id)?.name ?? "a group"}`,
              kind: "merge-in",
            });
          }
        }

        return {
          id: row.id,
          name: row.name,
          parentId:
            planted?.related_group_id && rowsById.has(planted.related_group_id)
              ? planted.related_group_id
              : undefined,
          mergedIntoId,
          segments,
          events: dots,
        } satisfies Lane;
      }),
    );

    setReady(true);
  }, [realMode]);

  useEffect(() => {
    if (realMode) void refresh();
  }, [realMode, refresh]);

  const addPerson = useCallback(
    async (input: AddPersonInput): Promise<string | null> => {
      if (!realMode) {
        const id = `demo-${input.firstName}-${input.lastName}-${people.length}`.toLowerCase();
        setPeople((prev) => [
          ...prev,
          {
            id,
            name: `${input.firstName} ${input.lastName}`.trim(),
            firstName: input.firstName,
            lastName: input.lastName,
            gender: input.gender,
            groupId: input.groupId ?? null,
            role: input.role ?? "member",
            discipledBy: null,
            peers: [],
            roadmap: {},
            statuses: input.statuses ?? [],
            isChild: input.isChild,
          },
        ]);
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { data: person, error } = await supabase
        .from("people")
        .insert({
          church_id: church.id,
          first_name: input.firstName,
          last_name: input.lastName,
          gender: input.gender,
          email: input.email || null,
          phone: input.phone || null,
          discipleship_status: input.statuses ?? [],
          is_child: input.isChild ?? false,
        })
        .select("id")
        .single();
      if (error) return error.message;
      if (input.groupId) {
        const { error: memErr } = await supabase.from("memberships").insert({
          church_id: church.id,
          person_id: person.id,
          group_id: input.groupId,
          role: input.role ?? "member",
        });
        if (memErr) return memErr.message;
      }
      await refresh();
      return null;
    },
    [realMode, people.length, refresh],
  );

  const addGroup = useCallback(
    async (input: AddGroupInput): Promise<string | null> => {
      if (!realMode) {
        const id = `demo-group-${groups.length}`;
        setGroups((prev) => [
          ...prev,
          {
            id,
            name: input.name,
            meet: [input.meetingDay, input.meetingTime, input.meetingPlace]
              .filter(Boolean)
              .join(" · ") || "meeting time TBD",
            season: input.season,
            status: "active",
            insights: [],
            dgroups: " - ",
            lineage: null,
            history: [],
            tags: input.tags ?? [],
          },
        ]);
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { data: group, error } = await supabase
        .from("groups")
        .insert({
          church_id: church.id,
          name: input.name,
          season: input.season,
          meeting_day: input.meetingDay || null,
          meeting_time: input.meetingTime || null,
          meeting_place: input.meetingPlace || null,
        })
        .select("id")
        .single();
      if (error) return error.message;
      if (input.tags && input.tags.length) {
        const err = await writeGroupTags(church.id, group.id, input.tags);
        if (err) return err;
      }
      await refresh();
      return null;
    },
    [realMode, groups.length, refresh],
  );

  const setGroupTags = useCallback(
    async (groupId: string, labels: string[]): Promise<string | null> => {
      const clean = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
      if (!realMode) {
        setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, tags: clean } : g)));
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { error: delErr } = await supabase.from("group_tags").delete().eq("group_id", groupId);
      if (delErr) return delErr.message;
      const err = await writeGroupTags(church.id, groupId, clean);
      if (err) return err;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const addRelationship = useCallback(
    async (
      disciplerId: string,
      discipleId: string,
      kind: RelationshipKind = "mentoring",
    ): Promise<string | null> => {
      const discipler = people.find((p) => p.id === disciplerId);
      const disciple = people.find((p) => p.id === discipleId);
      if (!discipler || !disciple) return "Person not found.";
      if (discipler.id === disciple.id) return "Pick two different people.";
      if (discipler.gender !== disciple.gender)
        return "Discipleship relationships are same-gender (men with men, women with women).";
      if (!realMode) {
        setPeople((prev) =>
          prev.map((p) => {
            if (kind === "peer") {
              if (p.id === disciplerId) return { ...p, peers: [...new Set([...p.peers, discipleId])] };
              if (p.id === discipleId) return { ...p, peers: [...new Set([...p.peers, disciplerId])] };
              return p;
            }
            return p.id === discipleId ? { ...p, discipledBy: disciplerId } : p;
          }),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { error } = await supabase.from("discipleship_relationships").insert({
        church_id: church.id,
        discipler_id: disciplerId,
        disciple_id: discipleId,
        kind,
      });
      if (error) return error.message;
      await refresh();
      return null;
    },
    [people, realMode, refresh],
  );

  const setStatuses = useCallback(
    async (personId: string, statuses: DiscipleshipStatus[]): Promise<string | null> => {
      if (!realMode) {
        setPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, statuses } : p)));
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("people")
        .update({ discipleship_status: statuses })
        .eq("id", personId);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const updatePerson = useCallback(
    async (id: string, input: AddPersonInput): Promise<string | null> => {
      const current = people.find((p) => p.id === id);
      if (!current) return "Person not found.";
      if (!realMode) {
        setPeople((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: `${input.firstName} ${input.lastName}`.trim(),
                  firstName: input.firstName,
                  lastName: input.lastName,
                  gender: input.gender,
                  isChild: input.isChild,
                  email: input.email ?? p.email,
                  phone: input.phone ?? p.phone,
                  groupId: input.groupId ?? null,
                  role: input.role ?? "member",
                  statuses: input.statuses ?? p.statuses,
                }
              : p,
          ),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      // Ask for the row back. An update the row-level policies forbid comes
      // back as zero rows and NO error, so without this a leader editing
      // someone they may not touch would be told "saved" while nothing
      // changed. Silent success is the worst possible answer here.
      const { data: updated, error } = await supabase
        .from("people")
        .update({
          first_name: input.firstName,
          last_name: input.lastName,
          gender: input.gender,
          email: input.email || null,
          phone: input.phone || null,
          discipleship_status: input.statuses ?? [],
          is_child: input.isChild ?? false,
        })
        .eq("id", id)
        .select("id");
      if (error) return error.message;
      if (!updated?.length)
        return "You don't have permission to edit this person. Leaders can edit members of their own lifegroup; ask staff for anyone else.";

      const groupChanged = (input.groupId ?? null) !== current.groupId;
      const roleChanged = (input.role ?? "member") !== current.role;
      if (!groupChanged && roleChanged && input.groupId) {
        // Same group, new role: change it on the live row. Ending + re-adding
        // here would collide with the active-membership uniqueness and, worse,
        // drop the person from the roster when the re-add failed.
        const { error: roleErr } = await supabase
          .from("memberships")
          .update({ role: input.role ?? "member" })
          .eq("person_id", id)
          .eq("group_id", input.groupId)
          .is("left_at", null);
        if (roleErr) return roleErr.message;
      } else if (groupChanged) {
        const { error: endErr } = await supabase
          .from("memberships")
          .update({ left_at: new Date().toISOString().slice(0, 10) })
          .eq("person_id", id)
          .is("left_at", null);
        if (endErr) return endErr.message;
        if (input.groupId) {
          const { data: church } = await supabase.from("churches").select("id").single();
          const { error: memErr } = await supabase.from("memberships").insert({
            church_id: church!.id,
            person_id: id,
            group_id: input.groupId,
            role: input.role ?? "member",
          });
          if (memErr) return memErr.message;
        }
      }
      await refresh();
      return null;
    },
    [people, realMode, refresh],
  );

  const deletePerson = useCallback(
    async (id: string): Promise<string | null> => {
      if (!realMode) {
        setPeople((prev) =>
          prev
            .filter((p) => p.id !== id)
            .map((p) => (p.discipledBy === id ? { ...p, discipledBy: null } : p)),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const setAccess = useCallback(
    async (id: string, level: AppAccess): Promise<string | null> => {
      if (!realMode) {
        setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, access: level } : p)));
        return null;
      }
      const supabase = supabaseBrowser();
      // One server-side call (set_app_access RPC) updates the person record
      // AND connects any existing auth account for their email. Direct table
      // writes couldn't do that: if someone had ever requested a login link
      // before being granted, they had an auth user but no profile, the
      // sign-in trigger (creation-only) never re-fired, and the grant
      // stranded them in an empty app.
      const { error } = await supabase.rpc("set_app_access", {
        p_person_id: id,
        p_level: level,
      });
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const sendInvite = useCallback(
    async (email: string): Promise<string | null> => {
      const addr = email.trim();
      if (!addr) return "No email to send to.";
      if (!realMode) return null; // demo: pretend it went out
      const supabase = supabaseBrowser();
      // Same magic-link pipeline as self sign-in (Supabase SMTP). The sign-in
      // trigger grants their access when they click, so save access first.
      const { error } = await supabase.auth.signInWithOtp({
        email: addr,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          shouldCreateUser: true,
        },
      });
      return error?.message ?? null;
    },
    [realMode],
  );

  const endDiscipleship = useCallback(
    async (discipleId: string): Promise<string | null> => {
      if (!realMode) {
        setPeople((prev) =>
          prev.map((p) => (p.id === discipleId ? { ...p, discipledBy: null } : p)),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("discipleship_relationships")
        .update({ ended_at: new Date().toISOString().slice(0, 10) })
        .eq("disciple_id", discipleId)
        .eq("kind", "mentoring")
        .is("ended_at", null);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const endPeer = useCallback(
    async (aId: string, bId: string): Promise<string | null> => {
      if (!realMode) {
        setPeople((prev) =>
          prev.map((p) => {
            if (p.id === aId) return { ...p, peers: p.peers.filter((x) => x !== bId) };
            if (p.id === bId) return { ...p, peers: p.peers.filter((x) => x !== aId) };
            return p;
          }),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      // The peer row could be stored in either direction.
      const { error } = await supabase
        .from("discipleship_relationships")
        .update({ ended_at: new Date().toISOString().slice(0, 10) })
        .eq("kind", "peer")
        .is("ended_at", null)
        .or(
          `and(discipler_id.eq.${aId},disciple_id.eq.${bId}),and(discipler_id.eq.${bId},disciple_id.eq.${aId})`,
        );
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const setRoadmapStep = useCallback(
    async (personId: string, stepKey: string, date: string | null): Promise<string | null> => {
      const person = people.find((p) => p.id === personId);
      if (!person) return "Person not found.";
      const nextRoadmap = { ...person.roadmap };
      if (date) nextRoadmap[stepKey] = date;
      else delete nextRoadmap[stepKey];
      if (!realMode) {
        setPeople((prev) =>
          prev.map((p) => (p.id === personId ? { ...p, roadmap: nextRoadmap } : p)),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("people")
        .update({ roadmap: nextRoadmap })
        .eq("id", personId);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [people, realMode, refresh],
  );

  // Demo helper: after a D-group change, refresh the affected group card's
  // "N men's · N women's" summary from the new entity list. Church-wide
  // D-groups (null groupId) belong to no card, so there's nothing to sync.
  const syncDemoDgroupSummary = useCallback((next: DGroup[], groupId: string | null) => {
    if (!groupId) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, dgroups: dgroupSummary(next.filter((d) => d.groupId === groupId)) }
          : g,
      ),
    );
  }, []);

  const addDgroup = useCallback(
    async (input: DGroupInput): Promise<string | null> => {
      if (!realMode) {
        const d: DGroup = {
          id: `demo-dg-${Date.now()}`,
          groupId: input.groupId,
          gender: input.gender,
          kind: input.kind,
          name: input.name?.trim() || undefined,
          leaderId: input.leaderId,
          memberIds: input.memberIds,
        };
        const next = [...dgroups, d];
        setDgroups(next);
        syncDemoDgroupSummary(next, input.groupId);
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { data: row, error } = await supabase
        .from("dgroups")
        .insert({
          church_id: church.id,
          group_id: input.groupId,
          gender: input.gender,
          kind: input.kind,
          name: input.name?.trim() || null,
          leader_id: input.leaderId,
        })
        .select("id")
        .single();
      if (error) return error.message;
      if (input.memberIds.length > 0) {
        const { error: memErr } = await supabase.from("dgroup_members").insert(
          input.memberIds.map((pid) => ({
            church_id: church.id,
            dgroup_id: row.id,
            person_id: pid,
          })),
        );
        if (memErr) return memErr.message;
      }
      await refresh();
      return null;
    },
    [realMode, refresh, dgroups, syncDemoDgroupSummary],
  );

  const updateDgroup = useCallback(
    async (id: string, input: DGroupInput): Promise<string | null> => {
      if (!realMode) {
        const next = dgroups.map((d) =>
          d.id === id
            ? {
                ...d,
                gender: input.gender,
                kind: input.kind,
                name: input.name?.trim() || undefined,
                leaderId: input.leaderId,
                memberIds: input.memberIds,
              }
            : d,
        );
        setDgroups(next);
        syncDemoDgroupSummary(next, input.groupId);
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { error } = await supabase
        .from("dgroups")
        .update({
          gender: input.gender,
          kind: input.kind,
          name: input.name?.trim() || null,
          leader_id: input.leaderId,
        })
        .eq("id", id);
      if (error) return error.message;
      // Members: replace wholesale — lists are 3-5 people, diffing isn't worth it.
      const { error: delErr } = await supabase.from("dgroup_members").delete().eq("dgroup_id", id);
      if (delErr) return delErr.message;
      if (input.memberIds.length > 0) {
        const { error: memErr } = await supabase.from("dgroup_members").insert(
          input.memberIds.map((pid) => ({
            church_id: church.id,
            dgroup_id: id,
            person_id: pid,
          })),
        );
        if (memErr) return memErr.message;
      }
      await refresh();
      return null;
    },
    [realMode, refresh, dgroups, syncDemoDgroupSummary],
  );

  const deleteDgroup = useCallback(
    async (id: string): Promise<string | null> => {
      if (!realMode) {
        const gone = dgroups.find((d) => d.id === id);
        const next = dgroups.filter((d) => d.id !== id);
        setDgroups(next);
        if (gone) syncDemoDgroupSummary(next, gone.groupId);
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("dgroups").delete().eq("id", id);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh, dgroups, syncDemoDgroupSummary],
  );

  // Leaders may set their own group's reminder (groups_update_leader policy);
  // staff can set any group's.
  const saveReminder = useCallback(
    async (groupId: string, cfg: ReminderConfig): Promise<string | null> => {
      const clean: ReminderConfig = {
        frequency: cfg.frequency,
        recipients: [...new Set(cfg.recipients.map((r) => r.trim()).filter(Boolean))],
        lastSent: cfg.lastSent,
      };
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, reminder: clean } : g)),
      );
      if (!realMode) return null;
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("groups")
        .update({ reminder: clean })
        .eq("id", groupId);
      return error ? error.message : null;
    },
    [realMode],
  );

  const updateGroup = useCallback(
    async (id: string, input: AddGroupInput): Promise<string | null> => {
      if (!realMode) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === id
              ? {
                  ...g,
                  name: input.name,
                  season: input.season,
                  meet:
                    [input.meetingDay, input.meetingTime, input.meetingPlace]
                      .filter(Boolean)
                      .join(" · ") || "meeting time TBD",
                }
              : g,
          ),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("groups")
        .update({
          name: input.name,
          season: input.season,
          meeting_day: input.meetingDay || null,
          meeting_time: input.meetingTime || null,
          meeting_place: input.meetingPlace || null,
        })
        .eq("id", id);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const deleteGroup = useCallback(
    async (id: string): Promise<string | null> => {
      if (!realMode) {
        setGroups((prev) => prev.filter((g) => g.id !== id));
        setPeople((prev) => prev.map((p) => (p.groupId === id ? { ...p, groupId: null } : p)));
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const setGroupOrigin = useCallback(
    async (
      id: string,
      plantedMonth: string,
      parentGroupId: string | null,
    ): Promise<string | null> => {
      if (!realMode) {
        setLanes((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  parentId: parentGroupId ?? undefined,
                  segments: [{ ...l.segments[0], from: plantedMonth }, ...l.segments.slice(1)],
                }
              : l,
          ),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const happenedOn = `${plantedMonth}-01`;
      const { data: existing } = await supabase
        .from("group_events")
        .select("id")
        .eq("group_id", id)
        .eq("kind", "planted")
        .maybeSingle();
      const parentName = parentGroupId
        ? groups.find((g) => g.id === parentGroupId)?.name
        : null;
      const notes = parentName ? `Planted from ${parentName}` : "Planted";
      const { error } = existing
        ? await supabase
            .from("group_events")
            .update({ happened_on: happenedOn, related_group_id: parentGroupId, notes })
            .eq("id", existing.id)
        : await supabase.from("group_events").insert({
            church_id: church.id,
            group_id: id,
            kind: "planted",
            happened_on: happenedOn,
            related_group_id: parentGroupId,
            notes,
          });
      if (error) return error.message;
      await refresh();
      return null;
    },
    [groups, realMode, refresh],
  );

  const addTagOption = useCallback(
    async (categoryId: string, label: string): Promise<string | null> => {
      const clean = label.trim();
      if (!clean) return null;
      const next = tagCategories.map((c) =>
        c.id === categoryId &&
        !c.options.some((o) => o.toLowerCase() === clean.toLowerCase())
          ? { ...c, options: [...c.options, clean] }
          : c,
      );
      setTagCategories(next);
      if (!realMode) return null;
      const supabase = supabaseBrowser();
      const { data: church } = await supabase
        .from("churches")
        .select("id, settings")
        .single();
      if (!church) return "Couldn't find your church record.";
      const settings = { ...(church.settings ?? {}), tagCategories: next };
      const { error } = await supabase
        .from("churches")
        .update({ settings })
        .eq("id", church.id);
      if (error) return error.message;
      return null;
    },
    [tagCategories, realMode],
  );

  const submitCheckin = useCallback(
    async (input: CheckinInput): Promise<string | null> => {
      if (!realMode) {
        if (input.win) {
          setWins((prev) => [
            {
              text: input.win!.note,
              date: new Date().toISOString().slice(0, 10),
              category: input.win!.category,
            },
            ...prev,
          ]);
        }
        if (input.newPerson) {
          await addPerson({
            ...input.newPerson,
            groupId: input.groupId,
            role: "member",
            statuses: [],
          });
        }
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";

      if (input.meeting) {
        const { error } = await supabase
          .from("groups")
          .update({
            meeting_day: input.meeting.day || null,
            meeting_time: input.meeting.time || null,
            meeting_place: input.meeting.place || null,
          })
          .eq("id", input.groupId);
        if (error) return error.message;
      }

      let rosterNote: string | null = null;
      const attendance = [...new Set(input.attendance ?? [])];
      if (input.newPerson) {
        const { data: person, error } = await supabase
          .from("people")
          .insert({
            church_id: church.id,
            first_name: input.newPerson.firstName,
            last_name: input.newPerson.lastName,
            gender: input.newPerson.gender,
            discipleship_status: [],
          })
          .select("id")
          .single();
        if (error) return error.message;
        const { error: memErr } = await supabase.from("memberships").insert({
          church_id: church.id,
          person_id: person.id,
          group_id: input.groupId,
          role: "member",
        });
        if (memErr) return memErr.message;
        rosterNote = `${input.newPerson.firstName} ${input.newPerson.lastName}`.trim() + " joined";
        // Someone new was, by definition, there tonight.
        attendance.push(person.id);
      }

      const month = `${new Date().toISOString().slice(0, 7)}-01`;
      const { error: ciErr } = await supabase.from("checkins").upsert(
        {
          church_id: church.id,
          group_id: input.groupId,
          month,
          submitted_by: mePersonId,
          pulse_words: input.pulseWords,
          roster_notes: rosterNote,
          attendance,
          meeting_change: input.meeting
            ? [input.meeting.day, input.meeting.time, input.meeting.place]
                .filter(Boolean)
                .join(" · ")
            : null,
        },
        { onConflict: "group_id,month" },
      );
      if (ciErr) return ciErr.message;

      if (input.win) {
        const { error: winErr } = await supabase.from("wins").insert({
          church_id: church.id,
          group_id: input.groupId,
          category: input.win.category,
          body: input.win.note,
          is_public: true,
        });
        if (winErr) return winErr.message;
      }

      // Email the report if the church turned it on. A mail failure must not
      // fail the check-in — the data is already safely saved.
      if (reportEmails.enabled) {
        try {
          await fetch("/api/check-in-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: input.groupId, month }),
          });
        } catch {
          // Offline or blocked — the check-in still stands.
        }
      }

      await refresh();
      return null;
    },
    [realMode, mePersonId, reportEmails.enabled, addPerson, refresh],
  );

  const splitName = (full: string) => {
    const space = full.indexOf(" ");
    return space === -1
      ? { first: full, last: "" }
      : { first: full.slice(0, space), last: full.slice(space + 1) };
  };

  const guestToRow = (input: GuestInput) => ({
    full_name: input.name,
    gender: input.gender,
    description: input.desc || null,
    first_sunday: input.firstSunday || null,
    attending: input.attending,
    connect_card: input.connectCard,
    email: input.email || null,
    phone: input.phone || null,
    notes: input.note || null,
    group_id: input.groupId ?? null,
  });

  const addGuest = useCallback(
    async (input: GuestInput): Promise<string | null> => {
      if (!realMode) {
        setGuests((prev) => [
          ...prev,
          {
            id: `demo-guest-${prev.length}`,
            name: input.name,
            gender: input.gender,
            desc: input.desc,
            firstSunday: input.firstSunday || " - ",
            attending: input.attending,
            connectCard: input.connectCard,
            email: input.email || " - ",
            phone: input.phone || " - ",
            steps: Object.fromEntries(milestones.map((m) => [m.key, false])),
            note: input.note,
            groupId: input.groupId ?? null,
            outcome: null,
            archivedAt: null,
          },
        ]);
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { error } = await supabase
        .from("guests")
        .insert({ church_id: church.id, ...guestToRow(input) });
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, milestones, refresh],
  );

  const updateGuest = useCallback(
    async (id: string, input: GuestInput): Promise<string | null> => {
      if (!realMode) {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === id
              ? {
                  ...g,
                  name: input.name,
                  gender: input.gender,
                  desc: input.desc,
                  firstSunday: input.firstSunday || " - ",
                  attending: input.attending,
                  connectCard: input.connectCard,
                  email: input.email || " - ",
                  phone: input.phone || " - ",
                  note: input.note,
                  groupId: input.groupId ?? null,
                }
              : g,
          ),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("guests").update(guestToRow(input)).eq("id", id);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const setGuestMilestone = useCallback(
    async (id: string, key: MilestoneKey, value: boolean): Promise<string | null> => {
      const guest = guests.find((g) => g.id === id);
      if (!guest) return "Guest not found.";
      const steps = { ...guest.steps, [key]: value };
      if (!realMode) {
        setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, steps } : g)));
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("guests").update({ milestones: steps }).eq("id", id);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [guests, realMode, refresh],
  );

  // Graduation is now a deliberate staff decision, decoupled from any
  // milestone: bring the guest into the people directory — placed in a
  // lifegroup (groupId) or unplaced (null, e.g. a Sunday believer not yet in
  // a group). Either way a Person is created and the pipeline entry closes.
  const graduateGuest = useCallback(
    async (id: string, groupId: string | null): Promise<string | null> => {
      const guest = guests.find((g) => g.id === id);
      if (!guest) return "Guest not found.";
      const { first, last } = splitName(guest.name);
      const outcome: GuestOutcome = groupId ? "landed" : "sundays_only";
      if (!realMode) {
        await addPerson({
          firstName: first,
          lastName: last,
          gender: guest.gender,
          groupId: groupId ?? null,
          role: "member",
          statuses: [],
        });
        setGuests((prev) =>
          prev.map((g) =>
            g.id === id ? { ...g, outcome, archivedAt: new Date().toISOString() } : g,
          ),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { data: person, error } = await supabase
        .from("people")
        .insert({
          church_id: church.id,
          first_name: first,
          last_name: last,
          gender: guest.gender,
          email: guest.email === " - " ? null : guest.email || null,
          phone: guest.phone === " - " ? null : guest.phone || null,
          discipleship_status: [],
          notes: groupId ? null : "Graduated from follow-up - not in a lifegroup yet",
        })
        .select("id")
        .single();
      if (error) return error.message;
      if (groupId) {
        const { error: memErr } = await supabase.from("memberships").insert({
          church_id: church.id,
          person_id: person.id,
          group_id: groupId,
          role: "member",
        });
        if (memErr) return memErr.message;
      }
      const { error: gErr } = await supabase
        .from("guests")
        .update({
          person_id: person.id,
          outcome,
          archived_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (gErr) return gErr.message;
      await refresh();
      return null;
    },
    [guests, realMode, addPerson, refresh],
  );

  const archiveGuest = useCallback(
    async (id: string, outcome: GuestOutcome): Promise<string | null> => {
      const guest = guests.find((g) => g.id === id);
      if (!guest) return "Guest not found.";
      if (!realMode) {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === id ? { ...g, outcome, archivedAt: new Date().toISOString() } : g,
          ),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      let personId = guest.personId ?? null;
      // "Attends Sundays" guests join the directory as not-yet-in-a-lifegroup.
      if (outcome === "sundays_only" && !personId) {
        const { data: church } = await supabase.from("churches").select("id").single();
        if (!church) return "Couldn't find your church record.";
        const { first, last } = splitName(guest.name);
        const { data: person, error } = await supabase
          .from("people")
          .insert({
            church_id: church.id,
            first_name: first,
            last_name: last,
            gender: guest.gender,
            email: guest.email === " - " ? null : guest.email || null,
            phone: guest.phone === " - " ? null : guest.phone || null,
            discipleship_status: [],
            notes: "Attends Sundays - from guest follow-up",
          })
          .select("id")
          .single();
        if (error) return error.message;
        personId = person.id;
      }
      const { error } = await supabase
        .from("guests")
        .update({ outcome, archived_at: new Date().toISOString(), person_id: personId })
        .eq("id", id);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [guests, realMode, refresh],
  );

  const restoreGuest = useCallback(
    async (id: string): Promise<string | null> => {
      if (!realMode) {
        setGuests((prev) =>
          prev.map((g) => (g.id === id ? { ...g, outcome: null, archivedAt: null } : g)),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("guests")
        .update({ outcome: null, archived_at: null })
        .eq("id", id);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const recordGroupEvent = useCallback(
    async (input: RecordEventInput): Promise<string | null> => {
      const label =
        input.notes.trim() ||
        {
          milestone: "Milestone",
          leader_transition: "Leader transition",
          dormant: "Went dormant",
          replanted: input.newName ? `Replanted as ${input.newName}` : "Replanted",
          merged: `Merged into ${groups.find((g) => g.id === input.relatedGroupId)?.name ?? "another group"}`,
          dissolved: "Dissolved",
        }[input.kind];

      if (!realMode) {
        setGroups((prev) =>
          prev
            .map((g) =>
              g.id === input.groupId
                ? {
                    ...g,
                    name: input.kind === "replanted" && input.newName ? input.newName : g.name,
                    status:
                      input.kind === "dormant"
                        ? ("dormant" as const)
                        : input.kind === "replanted"
                          ? ("active" as const)
                          : g.status,
                    season: input.kind === "replanted" ? ("start" as const) : g.season,
                    history: [...g.history, { date: `${input.month}-01`, text: label }],
                  }
                : g,
            )
            .filter(
              (g) =>
                !(
                  g.id === input.groupId &&
                  (input.kind === "dissolved" || input.kind === "merged")
                ),
            ),
        );
        return null;
      }

      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const happenedOn = `${input.month}-01`;

      if (input.kind === "dissolved" || input.kind === "merged") {
        if (input.kind === "merged") {
          if (!input.relatedGroupId) return "Pick the group they merged into.";
          const { data: moving, error: mvErr } = await supabase
            .from("memberships")
            .select("person_id, role")
            .eq("group_id", input.groupId)
            .is("left_at", null);
          if (mvErr) return mvErr.message;
          if (moving && moving.length) {
            const { error: insErr } = await supabase.from("memberships").insert(
              moving.map((m) => ({
                church_id: church.id,
                person_id: m.person_id,
                group_id: input.relatedGroupId,
                role: m.role,
                joined_at: happenedOn,
              })),
            );
            if (insErr) return insErr.message;
          }
        }
        const { error: endErr } = await supabase
          .from("memberships")
          .update({ left_at: happenedOn })
          .eq("group_id", input.groupId)
          .is("left_at", null);
        if (endErr) return endErr.message;
        const { error: stErr } = await supabase
          .from("groups")
          .update({ status: "dissolved" })
          .eq("id", input.groupId);
        if (stErr) return stErr.message;
      } else if (input.kind === "dormant") {
        const { error } = await supabase
          .from("groups")
          .update({ status: "dormant" })
          .eq("id", input.groupId);
        if (error) return error.message;
      } else if (input.kind === "replanted") {
        const { error } = await supabase
          .from("groups")
          .update({
            status: "active",
            season: "start",
            ...(input.newName ? { name: input.newName } : {}),
          })
          .eq("id", input.groupId);
        if (error) return error.message;
      }

      const { error } = await supabase.from("group_events").insert({
        church_id: church.id,
        group_id: input.groupId,
        kind: input.kind,
        related_group_id: input.relatedGroupId ?? null,
        happened_on: happenedOn,
        notes: label,
      });
      if (error) return error.message;
      await refresh();
      return null;
    },
    [groups, realMode, refresh],
  );

  const saveReadiness = useCallback(
    async (groupId: string, data: ReadinessData): Promise<string | null> => {
      if (!realMode) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId ? { ...g, readiness: data.score, readinessData: data } : g,
          ),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("groups")
        .update({ readiness: data })
        .eq("id", groupId);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const patchSettings = useCallback(
    async (patch: Record<string, unknown>): Promise<string | null> => {
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id, settings").single();
      if (!church) return "Couldn't find your church record.";
      const { error } = await supabase
        .from("churches")
        .update({ settings: { ...(church.settings ?? {}), ...patch } })
        .eq("id", church.id);
      return error ? error.message : null;
    },
    [],
  );

  const savePulseWords = useCallback(
    async (words: string[]): Promise<string | null> => {
      const clean = [...new Set(words.map((w) => w.trim()).filter(Boolean))];
      if (clean.length === 0) return "Keep at least one pulse word.";
      setPulseWords(clean);
      if (!realMode) return null;
      return patchSettings({ pulseWords: clean });
    },
    [realMode, patchSettings],
  );

  const saveMilestones = useCallback(
    async (list: Milestone[]): Promise<string | null> => {
      const clean = list
        .map((m) => ({ ...m, label: m.label.trim() }))
        .filter((m) => m.label);
      if (clean.length === 0) return "Keep at least one milestone.";
      setMilestones(clean);
      if (!realMode) return null;
      return patchSettings({ milestones: clean });
    },
    [realMode, patchSettings],
  );

  const saveRoadmap = useCallback(
    async (list: RoadmapStep[]): Promise<string | null> => {
      const clean = list
        .map((s) => ({ ...s, label: s.label.trim() }))
        .filter((s) => s.label);
      if (clean.length === 0) return "Keep at least one roadmap step.";
      setRoadmapSteps(clean);
      if (!realMode) return null;
      return patchSettings({ roadmap: clean });
    },
    [realMode, patchSettings],
  );

  const saveTierLabels = useCallback(
    async (labels: Record<EngagementTier, string>): Promise<string | null> => {
      const clean = { ...DEFAULT_TIER_LABELS };
      for (const key of Object.keys(clean) as EngagementTier[]) {
        if (labels[key]?.trim()) clean[key] = labels[key].trim();
      }
      setTierLabels(clean);
      if (!realMode) return null;
      return patchSettings({ tierLabels: clean });
    },
    [realMode, patchSettings],
  );

  const saveRoles = useCallback(
    async (list: RoleDef[]): Promise<string | null> => {
      // Keep every built-in role present (they can be renamed / re-flagged but
      // not removed), then append the church's custom ones.
      const byId = new Map(list.map((r) => [r.id, r]));
      const merged: RoleDef[] = DEFAULT_ROLES.map((d) => {
        const found = byId.get(d.id);
        return found ? { ...found, id: d.id, builtin: true } : d;
      });
      for (const r of list) {
        if (!DEFAULT_ROLES.some((d) => d.id === r.id) && r.label.trim()) {
          merged.push({ ...r, label: r.label.trim(), builtin: false });
        }
      }
      setRoles(merged);
      if (!realMode) return null;
      // Also persist the leadership id list so the DB (leads_group) can honor
      // custom leadership roles for check-in permissions.
      const leadershipRoleIds = merged.filter((r) => r.leadership).map((r) => r.id);
      return patchSettings({ roles: merged, leadershipRoleIds });
    },
    [realMode, patchSettings],
  );

  const saveZoning = useCallback(
    async (next: {
      zones: Zone[];
      sections: Section[];
      groupSections: Record<string, string>;
    }): Promise<string | null> => {
      // Keep references coherent: sections must point at real zones,
      // assignments at real sections.
      const zoneIds = new Set(next.zones.map((z) => z.id));
      const sections = next.sections.map((s) =>
        s.zoneId && !zoneIds.has(s.zoneId) ? { ...s, zoneId: null } : s,
      );
      const sectionIds = new Set(sections.map((s) => s.id));
      const groupSections = Object.fromEntries(
        Object.entries(next.groupSections).filter(([, sid]) => sectionIds.has(sid)),
      );
      // Oversight assignments point at these ids by name, so a deleted zone or
      // section must take its leaders with it. Otherwise the row lingers, and
      // creating a NEW zone with the same name regenerates the same slug id -
      // silently handing the old leader authority over the new one.
      const orphans = oversightLeaders.filter((o) =>
        o.scope === "zone" ? !zoneIds.has(o.scopeId) : !sectionIds.has(o.scopeId),
      );
      setZones(next.zones);
      setSections(sections);
      setGroupSections(groupSections);
      setOversightLeaders((prev) => prev.filter((o) => !orphans.some((x) => x.id === o.id)));
      if (!realMode) return null;
      if (orphans.length > 0) {
        const supabase = supabaseBrowser();
        const { error } = await supabase
          .from("oversight_leaders")
          .delete()
          .in(
            "id",
            orphans.map((o) => o.id),
          );
        if (error) return error.message;
      }
      return patchSettings({ zones: next.zones, sections, groupSections });
    },
    [realMode, patchSettings, oversightLeaders],
  );

  const saveReportEmails = useCallback(
    async (config: ReportEmailConfig): Promise<string | null> => {
      const clean = (list: string[] = []) => [
        ...new Set(list.map((e) => e.trim()).filter(Boolean)),
      ];
      const cleanMap = (map: Record<string, string[]> = {}) =>
        Object.fromEntries(
          Object.entries(map)
            .map(([k, v]) => [k, clean(v)] as const)
            .filter(([, v]) => v.length > 0),
        );
      const next: ReportEmailConfig = {
        enabled: config.enabled,
        church: clean(config.church),
        zones: cleanMap(config.zones),
        sections: cleanMap(config.sections),
        groups: cleanMap(config.groups),
      };
      setReportEmails(next);
      if (!realMode) return null;
      return patchSettings({ reportEmails: next });
    },
    [realMode, patchSettings],
  );

  const setOversight = useCallback(
    async (
      personId: string,
      scope: OversightLeader["scope"],
      scopeId: string,
      on: boolean,
    ): Promise<string | null> => {
      if (!realMode) {
        setOversightLeaders((prev) =>
          on
            ? [...prev, { id: `demo-${personId}-${scopeId}`, personId, scope, scopeId }]
            : prev.filter(
                (o) => !(o.personId === personId && o.scope === scope && o.scopeId === scopeId),
              ),
        );
        return null;
      }
      const supabase = supabaseBrowser();
      if (!on) {
        const { error } = await supabase
          .from("oversight_leaders")
          .delete()
          .eq("person_id", personId)
          .eq("scope", scope)
          .eq("scope_id", scopeId);
        if (error) return error.message;
      } else {
        const { data: church } = await supabase.from("churches").select("id").single();
        if (!church) return "Couldn't find your church record.";
        const { error } = await supabase.from("oversight_leaders").insert({
          church_id: church.id,
          person_id: personId,
          scope,
          scope_id: scopeId,
        });
        if (error) return error.message;
      }
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const saveAccessAlerts = useCallback(
    async (config: AccessAlertConfig): Promise<string | null> => {
      const clean: AccessAlertConfig = {
        enabled: config.enabled,
        admins: [...new Set(config.admins)],
        extra: [...new Set(config.extra.map((e) => e.trim()).filter(Boolean))],
      };
      setAccessAlerts(clean);
      if (!realMode) return null;
      return patchSettings({ accessAlerts: clean });
    },
    [realMode, patchSettings],
  );

  const resolveAccessRequest = useCallback(
    async (id: string): Promise<string | null> => {
      setAccessRequests((prev) => prev.filter((r) => r.id !== id));
      if (!realMode) return null;
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("access_requests")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", id);
      return error ? error.message : null;
    },
    [realMode],
  );

  // Fire-and-forget: the person seeing the dead end shouldn't wait on mail,
  // and a failure here must never make their screen worse than it already is.
  const reportStuck = useCallback(
    async (kind: AccessRequestKind): Promise<void> => {
      if (!realMode) return;
      try {
        await fetch("/api/access-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        });
      } catch {
        // Offline or blocked - they can still reach a human the old way.
      }
    },
    [realMode],
  );

  const createChurch = useCallback(
    async (churchName: string, firstName: string, lastName: string): Promise<string | null> => {
      if (!realMode) return "Connect the database first.";
      const supabase = supabaseBrowser();
      const { error } = await supabase.rpc("create_church", {
        p_church_name: churchName.trim(),
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
      });
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
  );

  const saveChurchName = useCallback(
    async (name: string): Promise<string | null> => {
      const clean = name.trim();
      if (!clean) return "Give your church a name.";
      setChurchName(clean);
      if (!realMode) return null;
      const supabase = supabaseBrowser();
      // Staff-only at the database level (churches_update policy).
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { error } = await supabase
        .from("churches")
        .update({ name: clean })
        .eq("id", church.id);
      return error ? error.message : null;
    },
    [realMode],
  );

  const addTagCategory = useCallback(
    async (label: string, multi: boolean): Promise<string | null> => {
      const clean = label.trim();
      if (!clean) return "Give the category a name.";
      if (tagCategories.some((c) => c.label.toLowerCase() === clean.toLowerCase()))
        return "That category already exists.";
      const next = [
        ...tagCategories,
        {
          id: `custom-${clean.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          label: clean,
          multi,
          options: [],
          custom: true,
        },
      ];
      setTagCategories(next);
      if (!realMode) return null;
      return patchSettings({ tagCategories: next });
    },
    [tagCategories, realMode, patchSettings],
  );

  const leadershipRoleIds = useMemo(
    () => new Set(roles.filter((r) => r.leadership).map((r) => r.id)),
    [roles],
  );
  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const roleLabel = useCallback(
    (id: string) => (id === "staff" ? "Staff" : roleById.get(id)?.label ?? id),
    [roleById],
  );
  const isLeadershipRole = useCallback(
    (id: string) => leadershipRoleIds.has(id),
    [leadershipRoleIds],
  );

  const value = useMemo<DataApi>(
    () => ({
      ready,
      realMode,
      role: realMode ? role : demoRole,
      demoRole,
      setDemoRole,
      userEmail,
      linked: realMode ? linked : true,
      mePersonId: realMode ? mePersonId : null,
      myGroupIds: realMode
        ? realMyGroupIds
        : demoRole === "leader"
          ? [LEADER_HOME]
          : [],
      myLedGroupIds: realMode
        ? realMyLedGroupIds
        : demoRole === "leader"
          ? [LEADER_HOME]
          : [],
      oversightLeaders,
      setOversight,
      people,
      groups,
      wins,
      guests,
      lanes,
      tagCategories,
      refresh,
      addPerson,
      addGroup,
      addRelationship,
      setStatuses,
      setGroupTags,
      updatePerson,
      deletePerson,
      setAccess,
      sendInvite,
      endDiscipleship,
      endPeer,
      roadmapSteps,
      saveRoadmap,
      setRoadmapStep,
      dgroups,
      addDgroup,
      updateDgroup,
      deleteDgroup,
      updateGroup,
      saveReminder,
      deleteGroup,
      setGroupOrigin,
      addTagOption,
      submitCheckin,
      addGuest,
      updateGuest,
      setGuestMilestone,
      graduateGuest,
      archiveGuest,
      restoreGuest,
      recordGroupEvent,
      saveReadiness,
      checkinLog,
      pulseWords,
      savePulseWords,
      addTagCategory,
      milestones,
      saveMilestones,
      tierLabels,
      saveTierLabels,
      roles,
      saveRoles,
      roleLabel,
      isLeadershipRole,
      leadershipRoleIds,
      zones,
      sections,
      groupSections,
      saveZoning,
      reportEmails,
      saveReportEmails,
      accessAlerts,
      saveAccessAlerts,
      accessRequests,
      resolveAccessRequest,
      reportStuck,
      createChurch,
      churchName,
      saveChurchName,
    }),
    [ready, realMode, role, demoRole, userEmail, linked, mePersonId, realMyGroupIds, realMyLedGroupIds, oversightLeaders, setOversight, people, groups, wins, guests, lanes, tagCategories, refresh, addPerson, addGroup, addRelationship, setStatuses, setGroupTags, updatePerson, deletePerson, setAccess, sendInvite, endDiscipleship, endPeer, roadmapSteps, saveRoadmap, setRoadmapStep, dgroups, addDgroup, updateDgroup, deleteDgroup, updateGroup, saveReminder, deleteGroup, setGroupOrigin, addTagOption, submitCheckin, addGuest, updateGuest, setGuestMilestone, graduateGuest, archiveGuest, restoreGuest, recordGroupEvent, saveReadiness, checkinLog, pulseWords, savePulseWords, addTagCategory, milestones, saveMilestones, tierLabels, saveTierLabels, roles, saveRoles, roleLabel, isLeadershipRole, leadershipRoleIds, zones, sections, groupSections, saveZoning, reportEmails, saveReportEmails, accessAlerts, saveAccessAlerts, accessRequests, resolveAccessRequest, reportStuck, createChurch, churchName, saveChurchName],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

/* ---------------- Pure derivations over the store's arrays ---------------- */

export function makeHelpers(
  people: Person[],
  leadershipRoleIds: Set<string> = new Set(BUILTIN_LEADERSHIP_ROLE_IDS),
) {
  const adults = people.filter((p) => !p.isChild);
  const isLead = (role: string) => leadershipRoleIds.has(role);
  const byId = new Map(people.map((p) => [p.id, p]));
  // Discipleship edges span everyone — kids get discipled too (4th grade and up).
  const kids = new Map<string, Person[]>();
  for (const p of people) {
    if (p.discipledBy) {
      const list = kids.get(p.discipledBy) ?? [];
      list.push(p);
      kids.set(p.discipledBy, list);
    }
  }
  const disciplesOf = (id: string): Person[] => kids.get(id) ?? [];
  const inRelationship = (p: Person) =>
    p.discipledBy !== null || p.peers.length > 0 || disciplesOf(p.id).length > 0;
  const engagementTier = (p: Person) => {
    if (p.role === "staff" || isLead(p.role)) return "lead" as const;
    if (inRelationship(p)) return "core" as const;
    if (p.statuses.includes("making")) return "core" as const;
    if (
      p.statuses.includes("open") ||
      p.statuses.includes("invited") ||
      p.statuses.includes("wants") ||
      p.statuses.includes("discipled") ||
      p.statuses.includes("na")
    )
      return "consistent" as const;
    return "fringe" as const;
  };
  const descendantCount = (id: string): number =>
    disciplesOf(id).reduce((sum, k) => sum + 1 + descendantCount(k.id), 0);
  return {
    personById: (id: string) => byId.get(id),
    disciplesOf,
    inRelationship,
    engagementTier,
    descendantCount,
    treeRoots: () =>
      people.filter(
        (p) => disciplesOf(p.id).length > 0 && (!p.discipledBy || !byId.has(p.discipledBy)),
      ),
    /** Everyone in a group, kids included, minus those marked "not applicable" —
     * the population the Discipleship Tree page cares about. */
    discipleshipPeople: () =>
      people.filter(
        (p) => p.groupId !== null && p.role !== "staff" && !p.statuses.includes("na"),
      ),
    naPeople: () =>
      people.filter((p) => p.groupId !== null && p.statuses.includes("na")),
    /** Adults in a group (children live in groupKids). */
    groupPeople: (gid: string) => adults.filter((p) => p.groupId === gid),
    groupKids: (gid: string) => people.filter((p) => p.groupId === gid && p.isChild),
    groupLeaders: (gid: string) =>
      adults.filter((p) => p.groupId === gid && p.role === "leader"),
    placedPeople: () => adults.filter((p) => p.groupId !== null),
    unplacedPeople: () => adults.filter((p) => p.groupId === null && p.role !== "staff"),
  };
}
