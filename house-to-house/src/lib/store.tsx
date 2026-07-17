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
  Win,
} from "./types";
import {
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
  status?: DiscipleshipStatus;
}

export interface AddGroupInput {
  name: string;
  season: Season;
  meetingDay?: string;
  meetingTime?: string;
  meetingPlace?: string;
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
  refresh: () => Promise<void>;
  addPerson: (input: AddPersonInput) => Promise<string | null>;
  addGroup: (input: AddGroupInput) => Promise<string | null>;
  addRelationship: (disciplerId: string, discipleId: string) => Promise<string | null>;
  setStatus: (personId: string, status: DiscipleshipStatus) => Promise<string | null>;
}

const DataContext = createContext<DataApi | null>(null);

const monthOf = (iso: string) => iso.slice(0, 7);

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

  const refresh = useCallback(async () => {
    if (!realMode) return;
    const supabase = supabaseBrowser();

    const [{ data: auth }, profileQ, groupsQ, peopleQ, memsQ, relsQ, winsQ, guestsQ, eventsQ] =
      await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("role").maybeSingle(),
        supabase.from("groups").select("*").neq("status", "dissolved").order("created_at"),
        supabase.from("people").select("*").order("first_name"),
        supabase.from("memberships").select("*").is("left_at", null),
        supabase.from("discipleship_relationships").select("*").is("ended_at", null),
        supabase.from("wins").select("*").order("happened_on", { ascending: false }).limit(20),
        supabase.from("guests").select("*").is("archived_at", null).order("created_at"),
        supabase.from("group_events").select("*").order("happened_on"),
      ]);

    setUserEmail(auth.user?.email ?? null);
    setRole((profileQ.data?.role as AppRole) ?? "leader");

    const mems = memsQ.data ?? [];
    const rels = relsQ.data ?? [];
    const events = eventsQ.data ?? [];

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
          gender: (row.gender ?? "M") as Gender,
          groupId: mem?.group_id ?? null,
          role: (mem?.role ?? "member") as MemberRole,
          discipledBy: disciplerOf.get(row.id) ?? null,
          status: (row.discipleship_status ?? null) as DiscipleshipStatus | null,
          note: row.notes ?? undefined,
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
            gender: input.gender,
            groupId: input.groupId ?? null,
            role: input.role ?? "member",
            discipledBy: null,
            status: input.status ?? "none",
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
          discipleship_status: input.status ?? "none",
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
          },
        ]);
        return null;
      }
      const supabase = supabaseBrowser();
      const { data: church } = await supabase.from("churches").select("id").single();
      if (!church) return "Couldn't find your church record.";
      const { error } = await supabase.from("groups").insert({
        church_id: church.id,
        name: input.name,
        season: input.season,
        meeting_day: input.meetingDay || null,
        meeting_time: input.meetingTime || null,
        meeting_place: input.meetingPlace || null,
      });
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, groups.length, refresh],
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

  const setStatus = useCallback(
    async (personId: string, status: DiscipleshipStatus): Promise<string | null> => {
      if (!realMode) {
        setPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, status } : p)));
        return null;
      }
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("people")
        .update({ discipleship_status: status })
        .eq("id", personId);
      if (error) return error.message;
      await refresh();
      return null;
    },
    [realMode, refresh],
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
      refresh,
      addPerson,
      addGroup,
      addRelationship,
      setStatus,
    }),
    [ready, realMode, role, demoRole, userEmail, people, groups, wins, guests, lanes, refresh, addPerson, addGroup, addRelationship, setStatus],
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
  const byId = new Map(people.map((p) => [p.id, p]));
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
    if (p.status === "open" || p.status === "invited" || p.status === "wants")
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
    groupPeople: (gid: string) => people.filter((p) => p.groupId === gid),
    groupLeaders: (gid: string) =>
      people.filter((p) => p.groupId === gid && p.role === "leader"),
    placedPeople: () => people.filter((p) => p.groupId !== null),
    unplacedPeople: () => people.filter((p) => p.groupId === null && p.role !== "staff"),
  };
}
