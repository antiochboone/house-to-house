"use client";

import { useState } from "react";
import Link from "next/link";
import type { Person } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/data";
import { useData, makeHelpers } from "@/lib/store";
import { Avatar, Chip, Stat } from "@/components/ui";
import { AddPersonForm, EditPersonForm, Modal } from "@/components/forms";

type Filter = "all" | "unplaced" | "kids" | "staff";
type SortBy = "name" | "lastName" | "role" | "group" | "discipleship";

/** Leadership rank for role-sorting (higher = more central). */
const ROLE_RANK: Record<string, number> = {
  staff: 4,
  leader: 3,
  intern: 2,
  worship: 1,
  member: 0,
};

export default function PeoplePage() {
  const { ready, role, people, groups, roleLabels } = useData();
  const h = makeHelpers(people);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);

  const roleLabel = (r: Person["role"]): string | undefined =>
    r === "staff" ? "Staff" : r === "member" ? undefined : roleLabels[r as keyof typeof roleLabels];

  if (role !== "staff") {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="font-display mb-2 text-2xl">Staff view</h1>
        <p className="text-[14.5px] text-muted">
          The church-wide people directory is a staff tool. Your group&apos;s roster lives
          in My Group.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mt-24 text-center text-muted">
        <p className="font-display text-lg">Opening the directory…</p>
      </div>
    );
  }

  const adults = people.filter((p) => !p.isChild && p.role !== "staff");
  const kids = people.filter((p) => p.isChild);
  const unplaced = h.unplacedPeople();

  const groupName = (p: Person) =>
    p.role === "staff" ? "Staff" : p.groupId ? (groups.find((g) => g.id === p.groupId)?.name ?? "") : "—";

  const q = search.trim().toLowerCase();
  let rows = people.filter((p) => !q || p.name.toLowerCase().includes(q));
  if (filter === "unplaced") rows = rows.filter((p) => p.groupId === null && p.role !== "staff");
  if (filter === "kids") rows = rows.filter((p) => p.isChild);
  if (filter === "staff") rows = rows.filter((p) => p.role === "staff");
  if (groupFilter) rows = rows.filter((p) => p.groupId === groupFilter);

  const byName = (a: Person, b: Person) => a.name.localeCompare(b.name);
  rows = [...rows].sort((a, b) => {
    switch (sortBy) {
      case "lastName": {
        const la = (a.lastName || a.name).localeCompare(b.lastName || b.name);
        return la !== 0 ? la : byName(a, b);
      }
      case "role": {
        const r = (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0);
        return r !== 0 ? r : byName(a, b);
      }
      case "group": {
        const ga = groupName(a);
        const gb = groupName(b);
        // People with a group first (alphabetical), then the placeless.
        if (ga === "—" && gb !== "—") return 1;
        if (gb === "—" && ga !== "—") return -1;
        const g = ga.localeCompare(gb);
        return g !== 0 ? g : byName(a, b);
      }
      case "discipleship": {
        const rank = (p: Person) => (h.inRelationship(p) ? 2 : p.statuses.length > 0 ? 1 : 0);
        const d = rank(b) - rank(a);
        return d !== 0 ? d : byName(a, b);
      }
      default:
        return byName(a, b);
    }
  });

  const filterBtn = (f: Filter, label: string) => (
    <button
      key={f}
      onClick={() => setFilter(filter === f ? "all" : f)}
      className={`rounded-full border px-2.5 py-1 text-xs ${
        filter === f
          ? "border-accent bg-accent-soft font-semibold text-accent-ink"
          : "border-line text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-4 max-md:mb-3.5 max-md:gap-2.5">
        <div className="max-w-[560px]">
          <h1 className="font-display mb-1 text-[27px] max-md:mb-0 max-md:text-[23px]">People</h1>
          <p className="text-[14.5px] text-muted max-md:hidden">
            Everyone the church knows by name — in a group, on the edge, or growing up in
            the middle of it all.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto rounded-xl bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-cta-ink"
        >
          ＋ Person
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-5 max-md:mb-4">
        <Stat num={adults.length} label="adults" />
        <Stat num={kids.length} label="kids" />
        <Stat num={unplaced.length} label="not yet in a lifegroup" alert={unplaced.length > 0} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-[240px] max-md:w-full rounded-xl border-[1.5px] border-line bg-surface px-3.5 py-2 text-[14px] max-md:text-[16px] outline-none focus:border-accent"
        />
        {filterBtn("unplaced", "not in a group")}
        {filterBtn("kids", "kids")}
        {filterBtn("staff", "staff")}
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-xl border-[1.5px] border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-muted outline-none focus:border-accent"
          aria-label="Filter by lifegroup"
        >
          <option value="">any lifegroup</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-faint">
          <span className="max-md:hidden">Sort</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-xl border-[1.5px] border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-muted outline-none focus:border-accent"
            aria-label="Sort people by"
          >
            <option value="name">First name (A–Z)</option>
            <option value="lastName">Last name (A–Z)</option>
            <option value="role">Role (leaders first)</option>
            <option value="group">Lifegroup</option>
            <option value="discipleship">Discipleship</option>
          </select>
        </label>
        <span className="ml-auto text-[12px] text-faint">
          {rows.length} {rows.length === 1 ? "person" : "people"}
        </span>
      </div>

      <div className="rise overflow-hidden rounded-[14px] border border-line bg-surface shadow-card">
        {rows.length === 0 && (
          <p className="p-8 text-center text-[13.5px] italic text-muted">
            {people.length === 0
              ? "Nobody here yet — add your first person and the directory begins."
              : "No one matches that search."}
          </p>
        )}
        {rows.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
          >
            <button
              onClick={() => setEditing(p)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left hover:opacity-70"
              title={`Edit ${p.name}`}
            >
              <Avatar name={p.name} gender={p.gender} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[14px]">
                  <span className="truncate">{p.name}</span>
                  {p.isChild && (
                    <span className="rounded-full bg-gold-soft px-1.5 py-px text-[10px] font-semibold text-gold">
                      child
                    </span>
                  )}
                </div>
                {roleLabel(p.role) && (
                  <div className="text-[11px] text-faint">{roleLabel(p.role)}</div>
                )}
              </div>
            </button>
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              {!p.isChild &&
                p.role !== "staff" &&
                (h.inRelationship(p) ? (
                  <span
                    title="in a discipleship relationship"
                    className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
                  />
                ) : p.statuses.length > 0 ? (
                  <span className="flex gap-1 max-md:hidden">
                    {p.statuses.map((s) => (
                      <Chip key={s} className="font-medium">
                        {STATUS_LABEL[s]}
                      </Chip>
                    ))}
                  </span>
                ) : null)}
              {p.groupId ? (
                <Link
                  href={`/map?open=${p.groupId}`}
                  className="text-[12.5px] text-accent-ink hover:underline"
                >
                  {groupName(p)}
                </Link>
              ) : (
                <span className="text-[12.5px] text-faint">{groupName(p)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Add a person" onClose={() => setShowAdd(false)}>
          <AddPersonForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title={`Edit ${editing.firstName}`} onClose={() => setEditing(null)}>
          <EditPersonForm person={editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
