"use client";

import { useState } from "react";
import type { DiscipleshipStatus, Person } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/data";
import { useData, makeHelpers } from "@/lib/store";
import { Avatar, Chip, Stat } from "@/components/ui";
import { AddRelationshipForm, EditPersonForm, Modal } from "@/components/forms";

type Filter = "all" | DiscipleshipStatus;
type Helpers = ReturnType<typeof makeHelpers>;

function TreeNode({
  person,
  h,
  groupName,
  collapsed,
  toggle,
}: {
  person: Person;
  h: Helpers;
  groupName: (p: Person) => string;
  collapsed: Set<string>;
  toggle: (id: string) => void;
}) {
  const children = h.disciplesOf(person.id);
  const hasKids = children.length > 0;
  const isCollapsed = collapsed.has(person.id);

  return (
    <li className="relative py-[3px]">
      <button
        onClick={hasKids ? () => toggle(person.id) : undefined}
        title={hasKids ? "Collapse or expand this branch" : undefined}
        className={`inline-flex items-center gap-2 rounded-full py-[5px] pl-1.5 pr-2.5 text-[13px] ${
          person.role === "staff" ? "bg-accent-soft" : "bg-surface-2"
        } ${hasKids ? "cursor-pointer hover:bg-glow" : "cursor-default"}`}
      >
        {hasKids && (
          <span className="w-2.5 text-[10px] text-faint">{isCollapsed ? "▸" : "▾"}</span>
        )}
        <Avatar name={person.name} gender={person.gender} size={22} />
        <span>{person.name}</span>
        <span className="text-[11px] text-faint">{groupName(person)}</span>
        {hasKids && isCollapsed && (
          <span className="rounded-full bg-accent-soft px-1.5 py-px text-[10.5px] font-bold text-accent-ink">
            +{h.descendantCount(person.id)}
          </span>
        )}
      </button>
      {hasKids && !isCollapsed && (
        <ul>
          {children.map((c) => (
            <TreeNode
              key={c.id}
              person={c}
              h={h}
              groupName={groupName}
              collapsed={collapsed}
              toggle={toggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function DiscipleshipPage() {
  const { ready, realMode, role, people, groups } = useData();
  const h = makeHelpers(people);
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [treeTab, setTreeTab] = useState<"M" | "F">("M");

  if (role !== "staff") {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="font-display mb-2 text-2xl">Staff view</h1>
        <p className="text-[14.5px] text-muted">
          The church-wide discipleship tree is visible to staff. Your own group&apos;s
          discipleship picture lives in My Group.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mt-24 text-center text-muted">
        <p className="font-display text-lg">Growing the tree…</p>
      </div>
    );
  }

  const groupName = (p: Person) =>
    p.role === "staff" ? "Staff" : p.groupId ? (groups.find((g) => g.id === p.groupId)?.name ?? "") : "unplaced";

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Kids are part of discipleship (4th grade and up); "not applicable" people
  // live behind their own filter so they don't clutter the shepherding list.
  const all = h.discipleshipPeople();
  const na = h.naPeople();
  const inD = all.filter(h.inRelationship);
  const notD = all.filter((p) => !h.inRelationship(p));
  const counts: Record<Filter, number> = {
    all: notD.length,
    wants: 0,
    open: 0,
    invited: 0,
    declined: 0,
    discipled: 0,
    making: 0,
    na: na.length,
    none: 0,
  };
  for (const p of notD) {
    if (p.statuses.length === 0) counts.none++;
    for (const s of p.statuses) if (s in counts && s !== "na") counts[s as Filter]++;
  }
  const filtered =
    filter === "all"
      ? notD
      : filter === "none"
        ? notD.filter((p) => p.statuses.length === 0)
        : filter === "na"
          ? na
          : notD.filter((p) => p.statuses.includes(filter));

  const roots = h.treeRoots();
  const menRoots = roots.filter((p) => p.gender === "M");
  const womenRoots = roots.filter((p) => p.gender === "F");

  const filterBtn = (f: Filter, label: string) => (
    <button
      key={f}
      onClick={() => setFilter(f)}
      className={`rounded-full border px-2.5 py-1 text-xs ${
        filter === f
          ? "border-accent bg-accent-soft font-semibold text-accent-ink"
          : "border-line text-muted"
      }`}
    >
      {label} · {counts[f]}
    </button>
  );

  const activeRoots = treeTab === "M" ? menRoots : womenRoots;
  const treePanel = (
    <div className="rise overflow-x-auto rounded-[14px] border border-line bg-surface p-5 max-md:p-4 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-[3px] rounded-[10px] bg-surface-2 p-[3px]">
          {(
            [
              ["M", `Men`],
              ["F", `Women`],
            ] as const
          ).map(([g, label]) => (
            <button
              key={g}
              onClick={() => setTreeTab(g)}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold ${
                treeTab === g
                  ? g === "M"
                    ? "bg-men-soft text-men-ink shadow-card"
                    : "bg-women-soft text-women-ink shadow-card"
                  : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-faint">
          {activeRoots.length} {activeRoots.length === 1 ? "chain" : "chains"}
        </span>
      </div>
      {activeRoots.length === 0 ? (
        <p className="text-[12.5px] italic text-muted">
          {realMode
            ? "No relationships recorded yet — use “Record a relationship” to start the tree."
            : "No relationships yet."}
        </p>
      ) : (
        <ul className="tree">
          {activeRoots.map((r) => (
            <TreeNode key={r.id} person={r} h={h} groupName={groupName} collapsed={collapsed} toggle={toggle} />
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-4 max-md:mb-3.5 max-md:gap-2.5">
        <div className="max-w-[560px]">
          <h1 className="font-display mb-1 text-[27px] max-md:mb-0 max-md:text-[23px]">Discipleship Tree</h1>
          <p className="text-[14.5px] text-muted max-md:hidden">
            Every chain starts somewhere. Click any name to fold or unfold their branch.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto rounded-xl bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-cta-ink"
        >
          ＋ Record a relationship
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-5 max-md:mb-4">
        <Stat num={inD.length} dim={`of ${all.length}`} label="in a discipleship relationship" />
        <Stat num={counts.wants} label="want to disciple someone" />
        <Stat num={notD.length} label="not yet in a relationship" alert={notD.length > 0} />
      </div>

      <div className="grid grid-cols-[1fr_300px] items-start gap-6 max-lg:grid-cols-1">
        {treePanel}

        <div className="flex flex-col gap-4">
          <div className="rise rounded-[14px] border border-line bg-surface p-[18px] shadow-card">
            <h2 className="font-display mb-0.5 text-[16.5px]">Not yet in a relationship</h2>
            <div className="mb-3 text-xs text-muted">
              The shepherding list — who needs an introduction?
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {filterBtn("all", "everyone")}
              {filterBtn("wants", "wants to disciple")}
              {filterBtn("open", "open")}
              {filterBtn("invited", "invited")}
              {filterBtn("discipled", "already discipled")}
              {filterBtn("making", "disciple-making")}
              {filterBtn("declined", "declined for now")}
              {filterBtn("none", "not yet invited")}
              {filterBtn("na", "not applicable")}
            </div>
            {filtered.length === 0 && (
              <p className="border-t border-line pt-3 text-[12.5px] italic text-muted">
                Nobody here — that&apos;s the dream.
              </p>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setEditPerson(p)}
                title={`Edit ${p.name}`}
                className="flex w-full items-center gap-2.5 border-t border-line py-2 text-left hover:bg-surface-2"
              >
                <Avatar name={p.name} gender={p.gender} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px]">{p.name}</div>
                  <div className="text-[11px] text-faint">{groupName(p)}</div>
                </div>
                <span className="ml-auto flex max-w-[150px] flex-wrap justify-end gap-1">
                  {p.statuses.map((s) => (
                    <span key={s} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-muted">
                      {STATUS_LABEL[s]}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>

          {counts.wants > 0 && (
            <div className="rise rounded-[14px] border border-line bg-surface p-[18px] shadow-card">
              <h2 className="font-display mb-0.5 text-[16.5px]">Matches to make</h2>
              <div className="text-xs leading-relaxed text-muted">
                {notD
                  .filter((p) => p.statuses.includes("wants"))
                  .map((p) => `${p.name.split(" ")[0]} (${groupName(p)}) wants to disciple someone`)
                  .join(" · ")}
                {" "}— look for someone open, same gender, same group. ✦
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal title="Record a discipleship relationship" onClose={() => setShowAdd(false)}>
          <AddRelationshipForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}
      {editPerson && (
        <Modal title={`Edit ${editPerson.firstName}`} onClose={() => setEditPerson(null)}>
          <EditPersonForm person={editPerson} onDone={() => setEditPerson(null)} />
        </Modal>
      )}
    </>
  );
}
