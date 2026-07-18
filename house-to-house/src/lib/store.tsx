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
  AppRole,
  DiscipleshipStatus,
  Gender,
  Group,
  Guest,
  MemberRole,
  Person,
  Season,
  TagCategory,
  Win,
} from "./types";
import {
  DEFAULT_TAG_CATEGORIES,
  GROUPS as SEED_GROUPS,
  GUESTS as SEED_GUESTS,
  LINEAGE as SEED_LINEAGE,
  PEOPLE as SEED_PEOPLE,
  WINS as SEED_WINS,
  type Lane,
} from "./data";
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

interface DataApi {
  ready: boolean;
  realMode: boolean;
  role: AppRole;
  demoRole: AppRole;
  setDemoRole: (r: AppRole) => void;
  userEmail: string | null;
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
  endDiscipleship: (discipleId: string) => Promise<string | null>;
  updateGroup: (id: string, input: AddGroupInput) => Promise<string | null>;
  deleteGroup: (id: string) => Promise<string | null>;
  setGroupOrigin: (
    id: string,
    plantedMonth: string,
    parentGroupId: string | null,
  ) => Promise<string | null>;
  addTagOption: (categoryId: string, label: string) => Promise<string | null>;
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
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("role").maybeSingle(),
      supabase.from("churches").select("settings").single(),
      supabase.from("groups").select("*").neq("status", "dissolved").order("created_at"),
      supabase.from("people").select("*").order("first_name"),
      supabase.from("memberships").select("*").is("left_at", null),
      supabase.from("discipleship_relationships").select("*").is("ended_at", null),
      supabase.from("wins").select("*").order("happened_on", { ascending: false }).limit(20),
      supabase.from("guests").select("*").is("archived_at", null).order("created_at"),
      supabase.from("group_events").select("*").order("happened_on"),
      supabase.from("tags").select("*"),
      supabase.from("group_tags").select("*"),
    ]);

    setUserEmail(auth.user?.email ?? null);
    setRole((profileQ.data?.role as AppRole) ?? "leader");

    const savedCategories = churchQ.data?.settings?.tagCategories as TagCategory[] | undefined;
    setTagCategories(savedCategories?.length ? savedCategories : DEFAULT_TAG_CATEGORIES);

    const mems = memsQ.data ?? [];
    const rels = relsQ.data ?? [];
    const events = eventsQ.data ?? [];
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
        };
      }),
    );

    setGroups(
      (groupsQ.data ?? []).map((row) => {
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
          insights: [],
          dgroups: "—",
          lineage: null,
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
        steps: {
          emailed: !!g.milestones?.emailed,
          texted: !!g.milestones?.texted,
          coffee: !!g.milestones?.coffee,
          discover: !!g.milestones?.discover,
          lifegroup: !!g.milestones?.lifegroup,
          discipled: !!g.milestones?.discipled,
        },
        note: g.notes ?? "",
      })),
    );

    // Lineage lanes from the events ledger; groups without events get a simple
    // active lane starting at their creation month.
    const rowsById = new Map((groupsQ.data ?? []).map((g) => [g.id, g]));
    setLanes(
      (groupsQ.data ?? []).map((row) => {
        const evs = events.filter((e) => e.group_id === row.id);
        const planted = evs.find((e) => e.kind === "planted");
        const start = monthOf(planted?.happened_on ?? row.created_at);
        return {
          id: row.id,
          name: row.name,
          parentId:
            planted?.related_group_id && rowsById.has(planted.related_group_id)
              ? planted.related_group_id
              : undefined,
          segments: [{ from: start, to: null, kind: "active", name: row.name }],
          events: evs.map((e) => ({
            date: monthOf(e.happened_on),
            label: e.notes ?? e.kind,
            kind:
              e.kind === "planted"
                ? "plant-in"
                : e.kind === "replanted"
                  ? "replant"
                  : e.kind === "dormant"
                    ? "dormant"
                    : "milestone",
          })),
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

  const value = useMemo<DataApi>(
    () => ({
      ready,
      realMode,
      role: realMode ? role : demoRole,
      demoRole,
      setDemoRole,
      userEmail,
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
      endDiscipleship,
      updateGroup,
      deleteGroup,
      setGroupOrigin,
      addTagOption,
    }),
    [ready, realMode, role, demoRole, userEmail, people, groups, wins, guests, lanes, tagCategories, refresh, addPerson, addGroup, addRelationship, setStatuses, setGroupTags, updatePerson, deletePerson, endDiscipleship, updateGroup, deleteGroup, setGroupOrigin, addTagOption],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

/* ---------------- Pure derivations over the store's arrays ---------------- */

export function makeHelpers(people: Person[]) {
  const adults = people.filter((p) => !p.isChild);
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
    if (p.role === "leader" || p.role === "intern" || p.role === "worship" || p.role === "staff")
      return "lead" as const;
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
