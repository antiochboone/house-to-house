"use client";

import { useState } from "react";
import type { DiscipleshipStatus, Person } from "@/lib/types";
import {
  STATUS_LABEL,
  descendantCount,
  disciplesOf,
  groupById,
  inRelationship,
  placedPeople,
  treeRoots,
} from "@/lib/data";
import { useRole } from "@/components/role-context";
import { Avatar, Chip, Stat } from "@/components/ui";

type Filter = "all" | DiscipleshipStatus;

function TreeNode({
  person,
  collapsed,
  toggle,
}: {
  person: Person;
  collapsed: Set<string>;
  toggle: (id: string) => void;
}) {
  const children = disciplesOf(person.id);
  const hasKids = children.length > 0;
  const isCollapsed = collapsed.has(person.id);
  const groupLabel = person.groupId ? groupById(person.groupId)?.name : "Staff";

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
        <span className="text-[11px] text-faint">{groupLabel}</span>
        {hasKids && isCollapsed && (
          <span className="rounded-full bg-accent-soft px-1.5 py-px text-[10.5px] font-bold text-accent-ink">
            +{descendantCount(person.id)}
          </span>
        )}
      </button>
      {hasKids && !isCollapsed && (
        <ul>
          {children.map((c) => (
            <TreeNode key={c.id} person={c} collapsed={collapsed} toggle={toggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function DiscipleshipPage() {
  const { role } = useRole();
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const all = placedPeople();
  const inD = all.filter(inRelationship);
  const notD = all.filter((p) => !inRelationship(p));
  const counts: Record<Filter, number> = {
    all: notD.length,
    wants: 0,
    open: 0,
    invited: 0,
    declined: 0,
    none: 0,
  };
  for (const p of notD) if (p.status) counts[p.status]++;
  const filtered = filter === "all" ? notD : notD.filter((p) => p.status === filter);

  const roots = treeRoots();
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

  return (
    <>
      <div className="mb-5 max-w-[640px]">
        <h1 className="font-display mb-1 text-[27px]">Who is discipling whom</h1>
        <p className="text-[14.5px] text-muted">
          Every chain starts somewhere. Click any name to fold or unfold their branch.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-5">
        <Stat num={inD.length} dim={`of ${all.length}`} label="in a discipleship relationship" />
        <Stat num={counts.wants} label="want to disciple someone" />
        <Stat num={4} label="generations in the deepest chain" />
      </div>

      <div className="grid grid-cols-[1fr_300px] items-start gap-6 max-lg:grid-cols-1">
        <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
          <div className="rise rounded-[14px] border border-line bg-surface p-5 shadow-card">
            <h2 className="font-display mb-3.5 text-[17px]">Men</h2>
            <ul className="tree">
              {menRoots.map((r) => (
                <TreeNode key={r.id} person={r} collapsed={collapsed} toggle={toggle} />
              ))}
            </ul>
          </div>
          <div className="rise rounded-[14px] border border-line bg-surface p-5 shadow-card">
            <h2 className="font-display mb-3.5 text-[17px]">Women</h2>
            <ul className="tree">
              {womenRoots.map((r) => (
                <TreeNode key={r.id} person={r} collapsed={collapsed} toggle={toggle} />
              ))}
            </ul>
          </div>
        </div>

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
              {filterBtn("declined", "declined for now")}
              {filterBtn("none", "not yet invited")}
            </div>
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 border-t border-line py-2">
                <Avatar name={p.name} gender={p.gender} />
                <div>
                  <div className="text-[13.5px]">{p.name}</div>
                  <div className="text-[11px] text-faint">
                    {p.groupId ? groupById(p.groupId)?.name : ""}
                  </div>
                </div>
                {p.status && (
                  <span className="ml-auto">
                    <Chip
                      tone={
                        p.status === "wants"
                          ? "bg-sprout-soft text-sprout"
                          : p.status === "invited"
                            ? "bg-gold-soft text-gold"
                            : p.status === "declined"
                              ? "bg-dormant-soft text-dormant"
                              : "bg-surface-2 text-muted"
                      }
                      className="font-medium"
                    >
                      {STATUS_LABEL[p.status]}
                    </Chip>
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="rise rounded-[14px] border border-line bg-surface p-[18px] shadow-card">
            <h2 className="font-display mb-0.5 text-[16.5px]">A match to make</h2>
            <div className="text-xs leading-relaxed text-muted">
              June (Howard&apos;s Knob) wants to disciple someone — Marla in her group is open
              to it. Same gender, same group, same Thursday. ✦
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
