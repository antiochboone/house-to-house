"use client";

import { useState } from "react";
import type { DGroup, DiscipleshipStatus, Person } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/data";
import { useData, makeHelpers } from "@/lib/store";
import { Avatar, Chip, Stat } from "@/components/ui";
import { DGroupForm, EditPersonForm, Modal } from "@/components/forms";

type Filter = "all" | DiscipleshipStatus;

/** A node in the discipleship generation tree. A person's children are grouped
 * into clusters: each D-group they lead, plus any loose 1-1 mentees. */
interface TreeCluster {
  /** The D-group this cluster represents, or null for loose mentoring edges. */
  dgroup: DGroup | null;
  label: string;
  children: TreeNodeData[];
}
interface TreeNodeData {
  person: Person;
  clusters: TreeCluster[];
  /** People in this whole branch, including this person. */
  count: number;
}

/** Deeper discipleship generations tint progressively toward the accent, so the
 * flow of multiplication reads at a glance. Theme-safe (mixes theme tokens). */
function genTint(depth: number): string {
  const pct = Math.min(8 + depth * 12, 62);
  return `color-mix(in srgb, var(--accent) ${pct}%, var(--surface))`;
}

function TreeNode({
  node,
  depth,
  groupName,
  collapsed,
  toggle,
  onEdit,
}: {
  node: TreeNodeData;
  depth: number;
  groupName: (p: Person) => string;
  collapsed: Set<string>;
  toggle: (id: string) => void;
  onEdit: (p: Person) => void;
}) {
  const { person, clusters, count } = node;
  const hasKids = clusters.length > 0;
  const isCollapsed = collapsed.has(person.id);

  return (
    <li className="relative py-[3px]">
      <span className="inline-flex items-center gap-1">
        {hasKids ? (
          <button
            onClick={() => toggle(person.id)}
            title="Collapse or expand this branch"
            className="w-3.5 shrink-0 text-[10px] text-faint hover:text-accent-ink"
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <button
          onClick={() => onEdit(person)}
          title={`Edit ${person.name}`}
          className={`inline-flex items-center gap-2 rounded-full py-[5px] pl-1.5 pr-2.5 text-[13px] hover:opacity-80 ${
            person.role === "staff" ? "bg-accent-soft" : "bg-surface-2"
          }`}
        >
          <Avatar name={person.name} gender={person.gender} size={22} />
          <span>{person.name}</span>
          <span className="text-[11px] text-faint">{groupName(person)}</span>
          {person.peers.length > 0 && (
            <span
              title="peer partnership"
              className="rounded-full bg-surface px-1.5 py-px text-[10.5px] font-semibold text-muted"
            >
              ↔ {person.peers.length}
            </span>
          )}
          {hasKids && (
            <span
              title={`${count} people in this branch`}
              className="rounded-full bg-accent-soft px-1.5 py-px text-[10.5px] font-bold text-accent-ink"
            >
              {count}
            </span>
          )}
        </button>
      </span>
      {hasKids && !isCollapsed && (
        <div className="ml-[7px] mt-1 flex flex-col gap-1.5 border-l border-dashed border-line pl-3">
          {clusters.map((cl, i) => (
            <div
              key={cl.dgroup?.id ?? `mentees-${i}`}
              className="rounded-xl border border-line p-2"
              style={{ background: genTint(depth + 1) }}
            >
              <div className="mb-1 flex items-center gap-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                {cl.dgroup ? (
                  <>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        cl.dgroup.gender === "M"
                          ? "bg-men-soft ring-1 ring-men/40"
                          : "bg-women-soft ring-1 ring-women/40"
                      }`}
                    />
                    {cl.label}
                    <span className="font-normal normal-case text-faint">
                      · {cl.children.length} in group
                    </span>
                  </>
                ) : (
                  <span className="normal-case">{cl.label}</span>
                )}
              </div>
              <ul className="tree">
                {cl.children.map((c) => (
                  <TreeNode
                    key={c.person.id}
                    node={c}
                    depth={depth + 1}
                    groupName={groupName}
                    collapsed={collapsed}
                    toggle={toggle}
                    onEdit={onEdit}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

/** Build the generation forest from D-groups (primary) + 1-1 mentoring edges
 * (fallback). Each person is placed once, preferring their D-group. */
function buildForest(people: Person[], dgroups: DGroup[]) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const dgroupsByLeader = new Map<string, DGroup[]>();
  for (const dg of dgroups) {
    if (!dg.leaderId) continue;
    dgroupsByLeader.set(dg.leaderId, [...(dgroupsByLeader.get(dg.leaderId) ?? []), dg]);
  }

  // Assign each person a single parent: D-group leader first, discipler second.
  const parentOf = new Map<string, string>();
  for (const dg of dgroups) {
    if (!dg.leaderId) continue;
    for (const mid of dg.memberIds) {
      if (mid !== dg.leaderId && !parentOf.has(mid)) parentOf.set(mid, dg.leaderId);
    }
  }
  for (const p of people) {
    if (p.discipledBy && !parentOf.has(p.id)) parentOf.set(p.id, p.discipledBy);
  }

  const dgTitle = (dg: DGroup) => {
    if (dg.name) return dg.name;
    const leader = dg.leaderId ? byId.get(dg.leaderId) : null;
    return leader ? `${leader.name.split(" ")[0]}'s D-group` : "D-group";
  };

  const build = (id: string, visited: Set<string>): TreeNodeData => {
    visited.add(id);
    const person = byId.get(id)!;
    const clusters: TreeCluster[] = [];
    const ledMemberIds = new Set<string>();
    for (const dg of dgroupsByLeader.get(id) ?? []) {
      const children = dg.memberIds
        .filter((mid) => parentOf.get(mid) === id && !visited.has(mid) && byId.has(mid))
        .map((mid) => build(mid, visited));
      dg.memberIds.forEach((mid) => ledMemberIds.add(mid));
      if (children.length) clusters.push({ dgroup: dg, label: dgTitle(dg), children });
    }
    const mentees = people.filter(
      (m) =>
        parentOf.get(m.id) === id && !ledMemberIds.has(m.id) && !visited.has(m.id),
    );
    if (mentees.length) {
      clusters.push({
        dgroup: null,
        label: "Mentoring 1-on-1",
        children: mentees.map((m) => build(m.id, visited)),
      });
    }
    const count =
      1 +
      clusters.reduce((s, c) => s + c.children.reduce((ss, ch) => ss + ch.count, 0), 0);
    return { person, clusters, count };
  };

  const hasChildren = (id: string) =>
    (dgroupsByLeader.get(id)?.some((dg) => dg.memberIds.length > 0) ?? false) ||
    people.some((m) => parentOf.get(m.id) === id);

  const visited = new Set<string>();
  const roots: TreeNodeData[] = [];
  for (const p of people) {
    if (!parentOf.has(p.id) && hasChildren(p.id) && !visited.has(p.id)) {
      roots.push(build(p.id, visited));
    }
  }
  const inTree = visited;
  return { roots, inTree };
}

export default function DiscipleshipPage() {
  const { ready, realMode, role, people, groups, dgroups, roadmapSteps } = useData();
  const h = makeHelpers(people);
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showDgroup, setShowDgroup] = useState(false);
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

  // The generation forest: mentoring D-groups as clusters, 1-1 edges folded
  // in. Peer D-groups have no hierarchy so they stay out of the tree.
  const { roots: forestRoots, inTree } = buildForest(
    people,
    dgroups.filter((d) => d.kind === "mentoring"),
  );
  const menRoots = forestRoots.filter((n) => n.person.gender === "M");
  const womenRoots = forestRoots.filter((n) => n.person.gender === "F");
  // Anyone in a D-group (leader or member) counts as "in a relationship" even
  // without a 1-1 edge. Peer D-groups don't nest in the tree, so check them too.
  const peerDgroups = dgroups.filter((d) => d.kind === "peer");
  const isInRel = (p: Person) =>
    h.inRelationship(p) ||
    inTree.has(p.id) ||
    peerDgroups.some((d) => d.memberIds.includes(p.id));

  // Kids are part of discipleship (4th grade and up); "not applicable" people
  // live behind their own filter so they don't clutter the shepherding list.
  const all = h.discipleshipPeople();
  const na = h.naPeople();
  const inD = all.filter(isInRel);
  const notD = all.filter((p) => !isInRel(p));
  const counts: Record<Filter, number> = {
    all: notD.length,
    wants: 0,
    open: 0,
    invited: 0,
    declined: 0,
    discipled: 0,
    making: 0,
    emerging: 0,
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

  // Peer partnerships: unique unordered pairs across everyone's peers list.
  const peerPairs: [Person, Person][] = [];
  const seenPair = new Set<string>();
  for (const p of people) {
    for (const pid of p.peers) {
      const key = [p.id, pid].sort().join("|");
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      const other = people.find((x) => x.id === pid);
      if (other) peerPairs.push([p, other]);
    }
  }

  // Roadmap progress: how many of the discipleship population reached each step.
  const roadmapPop = all;
  const roadmapCounts = roadmapSteps.map((s) => ({
    ...s,
    count: roadmapPop.filter((p) => p.roadmap[s.key]).length,
  }));

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
            ? "Nothing recorded yet — add a D-group (even a 1-on-1) to start the tree."
            : "No D-groups yet."}
        </p>
      ) : (
        <ul className="tree">
          {activeRoots.map((r) => (
            <TreeNode
              key={r.person.id}
              node={r}
              depth={0}
              groupName={groupName}
              collapsed={collapsed}
              toggle={toggle}
              onEdit={setEditPerson}
            />
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
            D-groups show as clusters; each generation tints deeper. Click a name to edit,
            or the arrow to fold a branch.
          </p>
        </div>
        <button
          onClick={() => setShowDgroup(true)}
          className="ml-auto rounded-xl bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-cta-ink"
        >
          ＋ D-group
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
              {filterBtn("emerging", "emerging leaders")}
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

          {(peerPairs.length > 0 || peerDgroups.length > 0) && (
            <div className="rise rounded-[14px] border border-line bg-surface p-[18px] shadow-card">
              <h2 className="font-display mb-0.5 text-[16.5px]">Peer groups</h2>
              <div className="mb-3 text-xs text-muted">Sharpening one another — no hierarchy.</div>
              <div className="flex flex-col gap-2">
                {peerDgroups.map((d) => {
                  const members = d.memberIds
                    .map((id) => people.find((p) => p.id === id))
                    .filter(Boolean) as Person[];
                  if (members.length === 0) return null;
                  return (
                    <div key={d.id} className="text-[13px]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                            d.gender === "M"
                              ? "bg-men-soft ring-1 ring-men/40"
                              : "bg-women-soft ring-1 ring-women/40"
                          }`}
                        />
                        <span className="min-w-0">
                          {d.name && <span className="font-medium">{d.name}: </span>}
                          {members.map((m) => m.name.split(" ")[0]).join(" ↔ ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {peerPairs.map(([a, b]) => (
                  <div key={`${a.id}|${b.id}`} className="flex items-center gap-2 text-[13px]">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                        a.gender === "M" ? "bg-men-soft ring-1 ring-men/40" : "bg-women-soft ring-1 ring-women/40"
                      }`}
                    />
                    {a.name.split(" ")[0]} ↔ {b.name.split(" ")[0]}
                    <span className="text-[11px] text-faint">{groupName(a)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rise rounded-[14px] border border-line bg-surface p-[18px] shadow-card">
            <h2 className="font-display mb-0.5 text-[16.5px]">Roadmap progress</h2>
            <div className="mb-3 text-xs text-muted">
              How far the {roadmapPop.length} in discipleship view have walked.
            </div>
            <div className="flex flex-col gap-2">
              {roadmapCounts.map((s) => {
                const pct = roadmapPop.length ? Math.round((s.count / roadmapPop.length) * 100) : 0;
                return (
                  <div key={s.key}>
                    <div className="flex items-baseline justify-between text-[12.5px]">
                      <span>{s.label}</span>
                      <span className="tabular-nums text-muted">{s.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showDgroup && (
        <Modal title="New D-group" onClose={() => setShowDgroup(false)}>
          <DGroupForm onDone={() => setShowDgroup(false)} />
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
