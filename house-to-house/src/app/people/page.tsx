"use client";

import { useState } from "react";
import Link from "next/link";
import type { Person } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/data";
import { useData, makeHelpers } from "@/lib/store";
import { Avatar, Chip, Stat } from "@/components/ui";
import { AddPersonForm, EditPersonForm, Modal } from "@/components/forms";

type Filter = "all" | "unplaced" | "kids" | "staff";

const ROLE_LABEL: Record<string, string> = {
  leader: "Leader",
  intern: "Intern",
  worship: "Worship",
  staff: "Staff",
};

export default function PeoplePage() {
  const { ready, role, people, groups } = useData();
  const h = makeHelpers(people);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);

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

  const q = search.trim().toLowerCase();
  let rows = people.filter((p) => !q || p.name.toLowerCase().includes(q));
  if (filter === "unplaced") rows = rows.filter((p) => p.groupId === null && p.role !== "staff");
  if (filter === "kids") rows = rows.filter((p) => p.isChild);
  if (filter === "staff") rows = rows.filter((p) => p.role === "staff");
  if (groupFilter) rows = rows.filter((p) => p.groupId === groupFilter);
  rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));

  const groupName = (p: Person) =>
    p.role === "staff" ? "Staff" : p.groupId ? (groups.find((g) => g.id === p.groupId)?.name ?? "") : "—";

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
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-[560px]">
          <h1 className="font-display mb-1 text-[27px] max-md:text-[23px]">People</h1>
          <p className="text-[14.5px] text-muted">
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

      <div className="mb-5 flex flex-wrap gap-5">
        <Stat num={adults.length} label="adults" />
        <Stat num={kids.length} label="kids" />
        <Stat num={unplaced.length} label="not yet in a lifegroup" alert={unplaced.length > 0} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-[240px] rounded-xl border-[1.5px] border-line bg-surface px-3.5 py-2 text-[14px] max-md:text-[16px] outline-none focus:border-accent"
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
                {ROLE_LABEL[p.role] && (
                  <div className="text-[11px] text-faint">{ROLE_LABEL[p.role]}</div>
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
