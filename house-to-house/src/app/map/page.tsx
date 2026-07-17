"use client";

import { useEffect, useState } from "react";
import type { Group } from "@/lib/types";
import {
  GROUPS,
  LEADER_HOME,
  TIERS,
  WINS,
  churchStats,
  engagementTier,
  firstName,
  groupById,
  groupLeaders,
  groupPeople,
  inRelationship,
  unplacedPeople,
} from "@/lib/data";
import { useRole } from "@/components/role-context";
import { Avatar, Chip, Flame, Insight, SeasonChip, Stat } from "@/components/ui";
import { GroupDrawer } from "@/components/group-drawer";
import { LineageTimeline } from "@/components/lineage-timeline";

type MapMode = "cards" | "chart" | "timeline";

function GroupCard({
  group,
  showDetail,
  mine,
  onOpen,
}: {
  group: Group;
  showDetail: boolean;
  mine: boolean;
  onOpen: () => void;
}) {
  const ppl = groupPeople(group.id);
  const leaders = groupLeaders(group.id);
  return (
    <button
      onClick={onOpen}
      aria-label={`Open ${group.name}`}
      className="rise flex w-full flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-[18px] pb-4 text-left shadow-card transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="flex items-start justify-between gap-2.5">
        <h3 className="font-display text-[19px] leading-tight">
          {group.name}
          {mine && <span className="label ml-2 tracking-wide">· yours</span>}
        </h3>
        <SeasonChip group={group} />
      </div>
      <div className="text-[13px] text-muted">{group.meet}</div>
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <span className="flex">
          {leaders.map((l) => (
            <span key={l.id} className="-mr-1">
              <Avatar name={l.name} gender={l.gender} size={24} />
            </span>
          ))}
        </span>
        <span className="ml-2">
          {leaders.map((l) => firstName(l.name)).join(" & ")} · {ppl.length} people
        </span>
      </div>
      <div className="flex flex-wrap gap-[5px] py-0.5">
        {ppl.map((p) =>
          showDetail ? (
            <span
              key={p.id}
              title={p.name}
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                inRelationship(p) ? "bg-accent" : "border-[1.5px] border-faint"
              }`}
            />
          ) : (
            <span key={p.id} className="inline-block h-2.5 w-2.5 rounded-full bg-faint opacity-50" />
          ),
        )}
      </div>
      {showDetail && group.insights[0] && <Insight text={group.insights[0]} />}
      {group.lineage && <div className="text-[11.5px] text-faint">↳ {group.lineage}</div>}
    </button>
  );
}

function EngagementChart() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-4">
      {GROUPS.map((g) => {
        const ppl = groupPeople(g.id);
        return (
          <div key={g.id} className="rise rounded-[14px] border border-line bg-surface p-4 pb-3 shadow-card">
            <h3 className="font-display flex items-center justify-between gap-2 text-[17px]">
              {g.name} <SeasonChip group={g} />
            </h3>
            <div className="mb-2.5 text-[11.5px] text-faint">
              {ppl.length} people · {g.dgroups} D-groups
            </div>
            <div className="grid grid-cols-[84px_1fr_1fr] border-t border-line">
              <div />
              <div className="px-1.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-women-ink">
                Women
              </div>
              <div className="border-l border-dashed border-line px-1.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-men-ink">
                Men
              </div>
              {TIERS.map((tier) => (
                <TierRow key={tier.key} groupId={g.id} tierKey={tier.key} label={tier.label} />
              ))}
            </div>
          </div>
        );
      })}
      <div className="rise rounded-[14px] border border-dashed border-ember bg-surface p-4 shadow-card">
        <h3 className="font-display text-[17px] text-ember">Not yet in a lifegroup</h3>
        <div className="mb-2 text-[11.5px] text-faint">
          {unplacedPeople().length} people we know of — the shepherding edge of the whole church
        </div>
        {unplacedPeople().map((p) => (
          <div key={p.id} className="flex items-center gap-2.5 py-1.5">
            <Avatar name={p.name} gender={p.gender} />
            <div>
              <div className="text-sm">{p.name}</div>
              <div className="text-[11.5px] text-faint">{p.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierRow({
  groupId,
  tierKey,
  label,
}: {
  groupId: string;
  tierKey: (typeof TIERS)[number]["key"];
  label: string;
}) {
  const ppl = groupPeople(groupId);
  const cell = (gender: "F" | "M") =>
    ppl
      .filter((p) => engagementTier(p) === tierKey && p.gender === gender)
      .map((p) => (
        <span
          key={p.id}
          title={p.name}
          className={`whitespace-nowrap rounded-full px-2 py-[2.5px] text-[11.5px] ${
            gender === "M" ? "bg-men-soft text-men-ink" : "bg-women-soft text-women-ink"
          } ${tierKey === "fringe" ? "opacity-60" : ""}`}
        >
          {firstName(p.name)}
        </span>
      ));
  return (
    <>
      <div className="flex items-center border-t border-line px-1.5 py-2 text-[11px] font-semibold text-muted">
        {label}
      </div>
      <div className="flex flex-wrap content-start gap-1 border-t border-line px-1 py-1.5">
        {cell("F")}
      </div>
      <div className="flex flex-wrap content-start gap-1 border-l border-dashed border-line border-t px-1 py-1.5">
        {cell("M")}
      </div>
    </>
  );
}

function MapView() {
  const { role } = useRole();
  const [mode, setMode] = useState<MapMode>("cards");
  const [openGroup, setOpenGroup] = useState<Group | null>(null);

  // Support /map?open=<groupId> (used by the leader's "My Group" nav item). Read from
  // the URL on mount rather than useSearchParams to keep this page Suspense-free.
  useEffect(() => {
    const openParam = new URLSearchParams(window.location.search).get("open");
    if (openParam) setOpenGroup(groupById(openParam) ?? null);
  }, []);

  const stats = churchStats();
  const staff = role === "staff";
  const showChart = staff && mode === "chart";
  const showTimeline = staff && mode === "timeline";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-[640px]">
          <h1 className="font-display mb-1 text-[27px]">
            {staff ? "Lifegroup Map" : "Lifegroups at Antioch Boone"}
          </h1>
          <p className="text-[14.5px] text-muted">
            {staff
              ? showChart
                ? "Everyone in every group, by engagement — and who hasn't found a lifegroup home yet."
                : showTimeline
                  ? "The web of lifegroups over time — every plant, merge, dormancy, and replant since 2021."
                  : "Every lifegroup in the church — tap a house to step inside."
              : "Find a group, see who leads it, help someone land in the right home."}
          </p>
        </div>
        {staff && (
          <div className="ml-auto flex gap-[3px] rounded-[10px] bg-surface-2 p-[3px]">
            {(
              [
                ["cards", "Cards"],
                ["chart", "Engagement"],
                ["timeline", "Timeline"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold ${
                  mode === m ? "bg-surface text-ink shadow-card" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-baseline gap-6">
        <Stat num={stats.groups} label="lifegroups" />
        <Stat num={stats.people} label="people in groups" />
        {staff && <Stat num={stats.inDiscipleship} label="in a discipleship relationship" />}
        {staff && <Stat num={stats.unplaced} label="not yet in a lifegroup" alert />}
        <div className="ml-auto flex flex-wrap items-center gap-3.5 text-xs text-muted max-md:ml-0">
          {showTimeline ? null : showChart ? (
            <>
              <Chip tone="bg-women-soft text-women-ink">women</Chip>
              <Chip tone="bg-men-soft text-men-ink">men</Chip>
            </>
          ) : (
            <>
              {staff && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-accent" /> in discipleship
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full border-[1.5px] border-faint" /> not yet
                  </span>
                </>
              )}
              <Chip tone="bg-sprout-soft text-sprout">Starting Up</Chip>
              <Chip tone="bg-gold-soft text-gold">Building Up</Chip>
              <Chip tone="bg-ember-soft text-ember">Planting</Chip>
            </>
          )}
        </div>
      </div>

      {showTimeline ? (
        <LineageTimeline />
      ) : showChart ? (
        <EngagementChart />
      ) : (
        <div className="grid grid-cols-[1fr_280px] items-start gap-5 max-lg:grid-cols-1">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
            {GROUPS.map((g) => {
              const mine = role === "leader" && g.id === LEADER_HOME;
              return (
                <GroupCard
                  key={g.id}
                  group={g}
                  mine={mine}
                  showDetail={staff || mine}
                  onOpen={() => setOpenGroup(g)}
                />
              );
            })}
          </div>
          <div className="rise rounded-[14px] border border-line bg-surface p-[18px] shadow-card">
            <h2 className="font-display mb-1 text-[17px]">Wins</h2>
            <div className="mb-3.5 text-xs text-muted">
              What God&apos;s been doing, house to house
            </div>
            {WINS.map((w) => (
              <div
                key={w.text}
                className="flex gap-2.5 border-t border-line py-2.5 text-[13.5px] leading-snug"
              >
                <Flame />
                <div>
                  {w.text}
                  <span className="mt-0.5 block text-[11px] text-faint">{w.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <GroupDrawer
        group={openGroup}
        showDetail={role === "staff" || openGroup?.id === LEADER_HOME}
        onClose={() => setOpenGroup(null)}
      />
    </>
  );
}

export default function MapPage() {
  return <MapView />;
}
