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
  AppAccess,
  AppRole,
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
  Person,
  ReadinessData,
  ReportEmailConfig,
  RoleDef,
  Season,
  Section,
  TagCategory,
  Win,
  Zone,
} from "./types";
import { DEFAULT_REPORT_EMAILS } from "./report-email";
import {
  BUILTIN_LEADERSHIP_ROLE_IDS,
  DEFAULT_ROLES,
  DEFAULT_TAG_CATEGORIES,
  DEFAULT_TIER_LABELS,
  MILESTONES as DEFAULT_MILESTONES,
  GROUPS as SEED_GROUPS,
  GUESTS as SEED_GUESTS,
  LINEAGE as SEED_LINEAGE,
  PEOPLE as SEED_PEOPLE,
  WINS as SEED_WINS,
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
}

export interface CheckinSummary {
  groupId: string;
  month: string;
  pulseWords: string[];
  rosterNote: string | null;
  meetingChange: string | null;
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
  win?: { category: "answered_prayer" | "salvation" | "new_dship"; note: string };
  meeting?: { day: string; time: string; place: string };
}

interface DataApi {
  ready: boolean;
  realMode: boolean;
  role: AppRole;
  demoRole: AppRole;
  setDemoRole: (r: AppRole) => void;
  userEmail: string | null;
  /** The signed-in user's linked person record (real mode; null if unlinked). */
  mePersonId: string | null;
  /** Groups the signed-in user actively leads (leader/intern memberships). */
  myGroupIds: string[];
  people: Person[];
  groups: Group[];
  wins: Win[];
  guests: Guest[];
  lanes: Lane[];
  tagCategories: TagCategory[];
  refresh: () => Promise<void>;
  addPerson: (input: AddPersonInput) => Promise<string | null>;
  addGroup: (input: AddGroupInput) => Promise<string | null>;
  addRelationship: (disciplerId: string, discipleId: string) => Promise<string | null>;
  setStatuses: (personId: string, statuses: DiscipleshipStatus[]) => Promise<string | null>;
  setGroupTags: (groupId: string, labels: string[]) => Promise<string | null>;
  updatePerson: (id: string, input: AddPersonInput) => Promise<string | null>;
  deletePerson: (id: string) => Promise<string | null>;
  /** Grant/revoke a person's app access (staff only). Syncs their profile. */
  setAccess: (personId: string, level: AppAccess) => Promise<string | null>;
  /** Email a sign-in link to an invited user (they must already have access). */
  sendInvite: (email: string) => Promise<string | null>;
  endDiscipleship: (discipleId: string) => Promise<string | null>;
  updateGroup: (id: string, input: AddGroupInput) => Promise<string | null>;
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
  graduateGuest: (id: string, groupId: string) => Promise<string | null>;
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
  const [people, setPeople] = useState<Person[]>(realMode ? [] : SEED_PEOPLE);
  const [groups, setGroups] = useState<Group[]>(realMode ? [] : SEED_GROUPS);
  const [wins, setWins] = useState<Win[]>(realMode ? [] : SEED_WINS);
  const [guests, setGuests] = useState<Guest[]>(realMode ? [] : SEED_GUESTS);
  const [lanes, setLanes] = useState<Lane[]>(realMode ? [] : SEED_LINEAGE);
  const [tagCategories, setTagCategories] = useState<TagCategory[]>(DEFAULT_TAG_CATEGORIES);
  const [mePersonId, setMePersonId] = useState<string | null>(null);
  const [realMyGroupIds, setRealMyGroupIds] = useState<string[]>([]);
  const [checkinLog, setCheckinLog] = useState<CheckinSummary[]>([]);
  const [pulseWords, setPulseWords] = useState<string[]>(DEFAULT_PULSE_WORDS);
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [tierLabels, setTierLabels] =
    useState<Record<EngagementTier, string>>(DEFAULT_TIER_LABELS);
  const [roles, setRoles] = useState<RoleDef[]>(DEFAULT_ROLES);
  const [zones, setZones] = useState<Zone[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [groupSections, setGroupSections] = useState<Record<string, string>>({});
  const [reportEmails, setReportEmails] = useState<ReportEmailConfig>(DEFAULT_REPORT_EMAILS);

  const refresh = useCallback(async () => {
    if (!realMode) return;
    const supabase = supabaseBrowser();

    const [
      { data: auth },
      profileQ,
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
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("role, person_id").maybeSingle(),
      supabase.from("churches").select("settings").single(),
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
    ]);

    setUserEmail(auth.user?.email ?? null);
    setMePersonId(profileQ.data?.person_id ?? null);
    // What the app lets you SEE follows the access grant staff set on your
    // person record (None / Leader / Staff) — never your lifegroup role and
    // never a stale profiles.role mirror. app_access is the source of truth;
    // profiles.role is only a fallback for the split second before people load.
    const myRow = peopleQ.data?.find((p) => p.id === profileQ.data?.person_id);
    const access = (myRow?.app_access as AppAccess | undefined) ?? (profileQ.data?.role as AppAccess | undefined);
    setRole(access === "staff" ? "staff" : "leader");

    const savedCategories = churchQ.data?.settings?.tagCategories as TagCategory[] | undefined;
    setTagCategories(savedCategories?.length ? savedCategories : DEFAULT_TAG_CATEGORIES);
    const savedPulse = churchQ.data?.settings?.pulseWords as string[] | undefined;
    setPulseWords(savedPulse?.length ? savedPulse : DEFAULT_PULSE_WORDS);
    const savedMilestones = churchQ.data?.settings?.milestones as Milestone[] | undefined;
    const road = savedMilestones?.length ? savedMilestones : DEFAULT_MILESTONES;
    setMilestones(road);
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
      })),
    );

    const myPersonId = profileQ.data?.person_id ?? null;
    // Leadership set from the just-loaded role config (DEFAULT_ROLES already
    // marks leader/intern/worship as leadership).
    const loadedRoles = (churchQ.data?.settings?.roles as RoleDef[] | undefined) ?? DEFAULT_ROLES;
    const leadIds = new Set(loadedRoles.filter((r) => r.leadership).map((r) => r.id));
    setRealMyGroupIds(
      myPersonId
        ? mems
            .filter((m) => m.person_id === myPersonId && leadIds.has(m.role))
            .map((m) => m.group_id)
        : [],
    );
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

    const disciplerOf = new Map<string, string>();
    for (const r of rels) if (!disciplerOf.has(r.disciple_id)) disciplerOf.set(r.disciple_id, r.discipler_id);

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
          statuses: (Array.isArray(row.discipleship_status)
            ? row.discipleship_status
            : row.discipleship_status && row.discipleship_status !== "none"
              ? [row.discipleship_status]
              : []) as DiscipleshipStatus[],
          note: row.notes ?? undefined,
          isChild: !!row.is_child,
          email: row.email ?? undefined,
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
    const insightCtx = {
      people: peopleLite,
      allMemberships: allMems,
      relationships: rels,
      checkins: checkinRows,
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
            dgroups: "—",
            lineage: null,
            readiness: row.readiness?.score,
            readinessData: row.readiness ?? null,
            history,
            tags: tagsByGroup.get(row.id) ?? [],
          } satisfies Group;
        }),
    );

    setWins(
      (winsQ.data ?? []).map((w) => ({ text: w.body, date: w.happened_on })),
    );

    setGuests(
      (guestsQ.data ?? []).map((g) => ({
        id: g.id,
        name: g.full_name,
        gender: (g.gender ?? "M") as Gender,
        desc: g.description ?? "",
        firstSunday: g.first_sunday ?? "—",
        attending: g.attending,
        connectCard: g.connect_card,
        email: g.email ?? "—",
        phone: g.phone ?? "—",
        steps: Object.fromEntries(road.map((m) => [m.key, !!g.milestones?.[m.key]])),
        note: g.notes ?? "",
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
            dgroups: "forming",
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
    async (disciplerId: string, discipleId: string): Promise<string | null> => {
      const discipler = people.find((p) => p.id === disciplerId);
      const disciple = people.find((p) => p.id === discipleId);
      if (!discipler || !disciple) return "Person not found.";
      if (discipler.gender !== disciple.gender)
        return "Discipleship relationships are same-gender (men with men, women with women).";
      if (!realMode) {
        setPeople((prev) =>
          prev.map((p) => (p.id === discipleId ? { ...p, discipledBy: disciplerId } : p)),
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
      const { error } = await supabase
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
        .eq("id", id);
      if (error) return error.message;

      const groupChanged = (input.groupId ?? null) !== current.groupId;
      const roleChanged = (input.role ?? "member") !== current.role;
      if (groupChanged || roleChanged) {
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
      // The person record is the source of truth (the sign-in trigger reads it).
      const { error } = await supabase.from("people").update({ app_access: level }).eq("id", id);
      if (error) return error.message;
      // Sync anyone who has ALREADY signed in: revoke deletes their profile, a
      // grant updates its role. If they've never signed in there's no profile
      // yet — the trigger will create it correctly from app_access.
      if (level === "none") {
        await supabase.from("profiles").delete().eq("person_id", id);
      } else {
        await supabase.from("profiles").update({ role: level }).eq("person_id", id);
      }
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
        .is("ended_at", null);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
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
            { text: input.win!.note, date: new Date().toISOString().slice(0, 10) },
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
            firstSunday: input.firstSunday || "—",
            attending: input.attending,
            connectCard: input.connectCard,
            email: input.email || "—",
            phone: input.phone || "—",
            steps: Object.fromEntries(milestones.map((m) => [m.key, false])),
            note: input.note,
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
                  firstSunday: input.firstSunday || "—",
                  attending: input.attending,
                  connectCard: input.connectCard,
                  email: input.email || "—",
                  phone: input.phone || "—",
                  note: input.note,
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

  const graduateGuest = useCallback(
    async (id: string, groupId: string): Promise<string | null> => {
      const guest = guests.find((g) => g.id === id);
      if (!guest) return "Guest not found.";
      const { first, last } = splitName(guest.name);
      if (!realMode) {
        await addPerson({ firstName: first, lastName: last, gender: guest.gender, groupId, role: "member", statuses: [] });
        setGuests((prev) =>
          prev.map((g) =>
            g.id === id
              ? { ...g, steps: { ...g.steps, lifegroup: true }, outcome: "landed", archivedAt: new Date().toISOString() }
              : g,
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
          email: guest.email === "—" ? null : guest.email || null,
          phone: guest.phone === "—" ? null : guest.phone || null,
          discipleship_status: [],
        })
        .select("id")
        .single();
      if (error) return error.message;
      const { error: memErr } = await supabase.from("memberships").insert({
        church_id: church.id,
        person_id: person.id,
        group_id: groupId,
        role: "member",
      });
      if (memErr) return memErr.message;
      const { error: gErr } = await supabase
        .from("guests")
        .update({
          person_id: person.id,
          milestones: { ...guest.steps, lifegroup: true },
          outcome: "landed",
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
            email: guest.email === "—" ? null : guest.email || null,
            phone: guest.phone === "—" ? null : guest.phone || null,
            discipleship_status: [],
            notes: "Attends Sundays — from guest follow-up",
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
      if (!clean.some((m) => m.key === "lifegroup"))
        return 'The road needs its "In a lifegroup" step — graduation depends on it.';
      setMilestones(clean);
      if (!realMode) return null;
      return patchSettings({ milestones: clean });
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
      setZones(next.zones);
      setSections(sections);
      setGroupSections(groupSections);
      if (!realMode) return null;
      return patchSettings({ zones: next.zones, sections, groupSections });
    },
    [realMode, patchSettings],
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
      mePersonId: realMode ? mePersonId : null,
      myGroupIds: realMode
        ? realMyGroupIds
        : demoRole === "leader"
          ? [LEADER_HOME]
          : [],
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
      updateGroup,
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
    }),
    [ready, realMode, role, demoRole, userEmail, mePersonId, realMyGroupIds, people, groups, wins, guests, lanes, tagCategories, refresh, addPerson, addGroup, addRelationship, setStatuses, setGroupTags, updatePerson, deletePerson, setAccess, sendInvite, endDiscipleship, updateGroup, deleteGroup, setGroupOrigin, addTagOption, submitCheckin, addGuest, updateGuest, setGuestMilestone, graduateGuest, archiveGuest, restoreGuest, recordGroupEvent, saveReadiness, checkinLog, pulseWords, savePulseWords, addTagCategory, milestones, saveMilestones, tierLabels, saveTierLabels, roles, saveRoles, roleLabel, isLeadershipRole, leadershipRoleIds, zones, sections, groupSections, saveZoning, reportEmails, saveReportEmails],
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
  const inRelationship = (p: Person) => p.discipledBy !== null || disciplesOf(p.id).length > 0;
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
