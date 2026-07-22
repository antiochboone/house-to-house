"use client";

import { useEffect, useState } from "react";
import type { Group } from "@/lib/types";
import { TIERS, WIN_CATEGORY_META, firstName } from "@/lib/data";
import { useData, makeHelpers } from "@/lib/store";
import { Avatar, Chip, Flame, Insight, SeasonChip, Stat } from "@/components/ui";
import { GroupDrawer } from "@/components/group-drawer";
import { LineageTimeline } from "@/components/lineage-timeline";
import { AddGroupForm, AddPersonForm, Modal } from "@/components/forms";
import { DensityToggle, useDensity, type Density } from "@/components/density";

type MapMode = "cards" | "chart" | "timeline";
type OpenModal = "group" | "person" | null;

export default function MapPage() {
  const { ready, realMode, role, people, groups, lanes, myGroupIds, leadershipRoleIds } = useData();
  const h = makeHelpers(people, leadershipRoleIds);
  const [mode, setMode] = useState<MapMode>("cards");
  // Lifegroups are few and worth seeing in full, so they default to expanded.
  const [density, setDensity] = useDensity("h2h-density-map", "expanded");
  const [openGroup, setOpenGroup] = useState<Group | null>(null);
  const [modal, setModal] = useState<OpenModal>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showKids, setShowKids] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // Support /map?open=<groupId> (used by the leader's "My Group" nav item).
  useEffect(() => {
    const openParam = new URLSearchParams(window.location.search).get("open");
    if (openParam) {
      const g = groups.find((x) => x.id === openParam);
      if (g) setOpenGroup(g);
    }
  }, [groups]);

  const staff = role === "staff";
  const showChart = staff && mode === "chart";
  const showTimeline = staff && mode === "timeline";

  const placed = h.placedPeople();
  const inD = placed.filter(h.inRelationship);
  const unplaced = h.unplacedPeople();
  const allTags = [...new Set(groups.flatMap((g) => g.tags))].sort();
  const visibleGroups = activeTag ? groups.filter((g) => g.tags.includes(activeTag)) : groups;
  const totalKids = people.filter((p) => p.isChild && p.groupId).length;

  if (!ready) {
    return (
      <div className="mt-24 text-center text-muted">
        <p className="font-display text-lg">Opening the map…</p>
      </div>
    );
  }

  const emptyChurch = groups.length === 0;

  return (
    <>
      {/* Header. On a phone the two add buttons become a full-width row right
          under the title; on desktop they sit right of the view toggle. */}
      <div className="mb-5 flex flex-wrap items-end gap-4 max-md:mb-3.5 max-md:flex-col max-md:items-stretch max-md:gap-2.5">
        <div className="max-w-[640px]">
          <h1 className="font-display mb-1 text-[27px] max-md:mb-0 max-md:text-[23px]">
            {staff ? "Lifegroup Map" : "Lifegroups at Antioch Boone"}
          </h1>
          <p className="text-[14.5px] text-muted max-md:hidden">
            {staff
              ? showChart
                ? "Everyone in every group, by engagement - and who hasn't found a lifegroup home yet."
                : showTimeline
                  ? "The web of lifegroups over time - every plant, merge, dormancy, and replant."
                  : "Every lifegroup in the church - tap a house to step inside."
              : "Find a group, see who leads it, help someone land in the right home."}
          </p>
        </div>
        {staff && (
          <div className="ml-auto flex flex-wrap items-center gap-2.5 max-md:ml-0 max-md:flex-col max-md:items-stretch max-md:gap-2.5">
            {!emptyChurch && (
              <div className="flex gap-[3px] rounded-[10px] bg-surface-2 p-[3px] max-md:order-2">
                {(
                  [
                    ["cards", "Lifegroups"],
                    ["chart", "Engagement"],
                    ["timeline", "Timeline"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold max-md:flex-1 max-md:py-2 ${
                      mode === m ? "bg-surface text-ink shadow-card" : "text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {!emptyChurch && mode === "cards" && (
              <div className="max-md:order-3">
                <DensityToggle value={density} onChange={setDensity} />
              </div>
            )}
            <div className="flex items-center gap-2.5 max-md:order-1 max-md:gap-2">
              <button
                onClick={() => setModal("person")}
                className="rounded-xl border-[1.5px] border-line px-3.5 py-1.5 text-[13px] font-semibold text-muted hover:border-accent hover:text-accent-ink max-md:flex-1 max-md:py-2.5 max-md:text-[14.5px]"
              >
                ＋ Person
              </button>
              <button
                onClick={() => setModal("group")}
                className="rounded-xl bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-cta-ink max-md:flex-1 max-md:py-2.5 max-md:text-[14.5px]"
              >
                ＋ Lifegroup
              </button>
            </div>
          </div>
        )}
      </div>

      {emptyChurch ? (
        <div className="mx-auto mt-16 max-w-md rounded-[14px] border border-line bg-surface p-8 text-center shadow-card">
          <p className="font-display mb-2 text-xl">Welcome home 🏡</p>
          <p className="mb-5 text-[14px] leading-relaxed text-muted">
            {realMode
              ? "The church is connected and the map is empty - time to plant it. Add your first lifegroup, then add its people."
              : "No groups yet in demo mode - add one to try the flow."}
          </p>
          {staff && (
            <button
              onClick={() => setModal("group")}
              className="rounded-xl bg-accent px-5 py-2.5 text-[14.5px] font-semibold text-cta-ink"
            >
              ＋ Add your first lifegroup
            </button>
          )}
        </div>
      ) : (
        <>
          {(allTags.length > 0 || totalKids > 0) && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5 max-md:-mx-4 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:[&>*]:shrink-0">
              {allTags.length > 0 && (
                <>
                  <span className="label mr-1">Filter</span>
                  <button
                    onClick={() => setActiveTag(null)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      activeTag === null
                        ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                        : "border-line text-muted"
                    }`}
                  >
                    all groups
                  </button>
                  {allTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTag(activeTag === t ? null : t)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        activeTag === t
                          ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                          : "border-line text-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </>
              )}
              {totalKids > 0 && (
                <button
                  onClick={() => setShowKids(!showKids)}
                  className={`ml-auto rounded-full border px-2.5 py-1 text-xs ${
                    showKids
                      ? "border-gold bg-gold-soft font-semibold text-gold"
                      : "border-line text-muted"
                  }`}
                >
                  {showKids ? "✓ " : ""}show kids ({totalKids})
                </button>
              )}
            </div>
          )}
          {/* Phone: one tappable summary line that opens into the full grid.
              Desktop keeps the always-visible row. */}
          <button
            onClick={() => setStatsOpen(!statsOpen)}
            aria-expanded={statsOpen}
            className="mb-3 hidden w-full items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-[13px] text-muted max-md:flex"
          >
            <span className="font-display text-[17px] tabular-nums text-ink">{groups.length}</span>
            <span>groups</span>
            <span className="text-line">·</span>
            <span className="font-display text-[17px] tabular-nums text-ink">{placed.length}</span>
            <span>people</span>
            {staff && unplaced.length > 0 && (
              <>
                <span className="text-line">·</span>
                <span className="font-display text-[17px] tabular-nums text-ember">
                  {unplaced.length}
                </span>
                <span className="text-ember">unplaced</span>
              </>
            )}
            <span className={`ml-auto text-[11px] text-faint transition-transform ${statsOpen ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>

          <div
            className={`mb-6 flex flex-wrap items-baseline gap-6 max-md:mb-4 max-md:grid max-md:grid-cols-2 max-md:gap-4 ${
              statsOpen ? "" : "max-md:hidden"
            }`}
          >
            <Stat num={groups.length} label="lifegroups" />
            <Stat num={placed.length} label="people in groups" />
            {staff && <Stat num={inD.length} label="in a discipleship relationship" />}
            {staff && <Stat num={unplaced.length} label="not yet in a lifegroup" alert />}
            <div className="ml-auto flex flex-wrap items-center gap-3.5 text-xs text-muted max-md:hidden">
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
                  <Chip tone="bg-gold-soft text-gold">Thriving</Chip>
                  <Chip tone="bg-ember-soft text-ember">Multiplying</Chip>
                  <Chip tone="bg-dormant-soft text-dormant">Stagnant</Chip>
                </>
              )}
            </div>
          </div>

          {showTimeline ? (
            <LineageTimeline lanes={lanes} />
          ) : showChart ? (
            <EngagementChart visibleGroups={visibleGroups} />
          ) : (
            <CardsView
              visibleGroups={visibleGroups}
              showKids={showKids}
              onOpen={setOpenGroup}
              density={density}
            />
          )}
        </>
      )}

      <GroupDrawer
        group={openGroup}
        showDetail={staff || (openGroup !== null && myGroupIds.includes(openGroup.id))}
        onClose={() => setOpenGroup(null)}
        onAddPerson={staff ? () => setModal("person") : undefined}
      />

      {modal === "group" && (
        <Modal title="New lifegroup" onClose={() => setModal(null)}>
          <AddGroupForm onDone={() => setModal(null)} />
        </Modal>
      )}
      {modal === "person" && (
        <Modal title="Add a person" onClose={() => setModal(null)}>
          <AddPersonForm defaultGroupId={openGroup?.id ?? null} onDone={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}

function CardsView({
  visibleGroups,
  showKids,
  onOpen,
  density,
}: {
  visibleGroups: Group[];
  showKids: boolean;
  onOpen: (g: Group) => void;
  density: Density;
}) {
  const { role, people, wins, realMode, myGroupIds, zones, sections, groupSections, leadershipRoleIds } =
    useData();
  const h = makeHelpers(people, leadershipRoleIds);
  const staff = role === "staff";

  // When the church has grown into sections, cluster the cards under them.
  const assignedSections = sections.filter((s) =>
    visibleGroups.some((g) => groupSections[g.id] === s.id),
  );
  const clusters: { key: string; heading: string | null; zone: string | null; groups: Group[] }[] =
    assignedSections.length === 0
      ? [{ key: "all", heading: null, zone: null, groups: visibleGroups }]
      : [
          ...assignedSections.map((s) => ({
            key: s.id,
            heading: s.name,
            zone: zones.find((z) => z.id === s.zoneId)?.name ?? null,
            groups: visibleGroups.filter((g) => groupSections[g.id] === s.id),
          })),
          {
            key: "unsectioned",
            heading: "No section yet",
            zone: null,
            groups: visibleGroups.filter(
              (g) => !sections.some((s) => s.id === groupSections[g.id]),
            ),
          },
        ].filter((c) => c.groups.length > 0);

  const card = (g: Group) => {
    const mine = role === "leader" && myGroupIds.includes(g.id);
    const showDetail = staff || mine;
    const ppl = h.groupPeople(g.id);
    const gKids = h.groupKids(g.id);
    const leaders = h.groupLeaders(g.id);

    if (density === "condensed") {
      return (
        <button
          key={g.id}
          onClick={() => onOpen(g)}
          aria-label={`Open ${g.name}`}
          className="rise flex w-full flex-col gap-1 rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-left shadow-card transition-[border-color] duration-150 hover:border-accent"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display truncate text-[15.5px] leading-tight">
              {g.name}
              {mine && <span className="label ml-1.5 tracking-wide">· yours</span>}
            </h3>
            <SeasonChip group={g} />
          </div>
          <div className="truncate text-[12px] text-muted">
            {leaders.length > 0 ? `${leaders.map((l) => firstName(l.name)).join(" & ")} · ` : ""}
            {ppl.length} people
            {gKids.length > 0 ? ` · ${gKids.length} kids` : ""}
          </div>
        </button>
      );
    }

    return (
      <button
        key={g.id}
        onClick={() => onOpen(g)}
        aria-label={`Open ${g.name}`}
        className="rise flex w-full flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-[18px] pb-4 text-left shadow-card transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-accent max-md:gap-2 max-md:p-4"
      >
        <div className="flex items-start justify-between gap-2.5">
          <h3 className="font-display text-[19px] leading-tight">
            {g.name}
            {mine && <span className="label ml-2 tracking-wide">· yours</span>}
          </h3>
          <SeasonChip group={g} />
        </div>
        <div className="text-[13px] text-muted">{g.meet}</div>
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span className="flex">
            {leaders.map((l) => (
              <span key={l.id} className="-mr-1">
                <Avatar name={l.name} gender={l.gender} size={24} />
              </span>
            ))}
          </span>
          <span className="ml-2">
            {leaders.length > 0
              ? `${leaders.map((l) => firstName(l.name)).join(" & ")} · `
              : ""}
            {ppl.length} people
            {gKids.length > 0 ? ` · ${gKids.length} kids` : ""}
          </span>
        </div>
        {/* The per-person dot row reads as texture on desktop but as noise on
            a phone, where the headline counts already say it. */}
        <div className="flex flex-wrap items-center gap-[5px] py-0.5 max-md:hidden">
          {ppl.map((p) =>
            showDetail ? (
              <span
                key={p.id}
                title={p.name}
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  h.inRelationship(p) ? "bg-accent" : "border-[1.5px] border-faint"
                }`}
              />
            ) : (
              <span key={p.id} className="inline-block h-2.5 w-2.5 rounded-full bg-faint opacity-50" />
            ),
          )}
          {showKids &&
            gKids.map((k) => (
              <span
                key={k.id}
                title={`${k.name} (child)`}
                className="inline-block h-2 w-2 rounded-full bg-gold opacity-80"
              />
            ))}
        </div>
        {g.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {g.tags.map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
        {showDetail && g.insights[0] && <Insight text={g.insights[0]} />}
        {g.lineage && <div className="text-[11.5px] text-faint">↳ {g.lineage}</div>}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-[1fr_280px] items-start gap-5 max-lg:grid-cols-1">
      <div className="flex flex-col gap-6">
        {clusters.map((c) => (
          <section key={c.key}>
            {c.heading && (
              <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="font-display text-[17px]">{c.heading}</h2>
                {c.zone && <span className="label">{c.zone}</span>}
                <span className="text-[11.5px] text-faint">
                  {c.groups.length} {c.groups.length === 1 ? "group" : "groups"}
                </span>
              </div>
            )}
            <div
              className={`grid gap-4 ${
                density === "condensed"
                  ? "grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-2"
                  : "grid-cols-[repeat(auto-fill,minmax(290px,1fr))]"
              }`}
            >
              {c.groups.map(card)}
            </div>
          </section>
        ))}
      </div>
      <div className="rise rounded-[14px] border border-line bg-surface p-[18px] shadow-card">
        <h2 className="font-display mb-1 text-[17px]">Wins</h2>
        <div className="mb-3.5 text-xs text-muted">What God&apos;s been doing, house to house</div>
        {wins.length === 0 ? (
          <p className="border-t border-line pt-3 text-[12.5px] italic text-muted">
            {realMode
              ? "No wins recorded yet - they'll flow in from monthly check-ins."
              : "No wins yet."}
          </p>
        ) : (
          wins.map((w) => (
            <div
              key={w.text}
              className="flex gap-2.5 border-t border-line py-2.5 text-[13.5px] leading-snug"
            >
              <Flame />
              <div>
                {w.text}
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${WIN_CATEGORY_META[w.category].tone}`}
                  >
                    {WIN_CATEGORY_META[w.category].label}
                  </span>
                  <span className="text-[11px] text-faint">{w.date}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EngagementChart({ visibleGroups }: { visibleGroups: Group[] }) {
  const { people, tierLabels, leadershipRoleIds } = useData();
  const h = makeHelpers(people, leadershipRoleIds);
  const unplaced = h.unplacedPeople();

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-4">
      {visibleGroups.map((g) => {
        const ppl = h.groupPeople(g.id);
        const kids = h.groupKids(g.id);
        const cell = (tierKey: string, gender: "F" | "M") =>
          ppl
            .filter((p) => h.engagementTier(p) === tierKey && p.gender === gender)
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
          <div key={g.id} className="rise rounded-[14px] border border-line bg-surface p-4 pb-3 shadow-card">
            <h3 className="font-display flex items-center justify-between gap-2 text-[17px]">
              {g.name} <SeasonChip group={g} />
            </h3>
            <div className="mb-2.5 text-[11.5px] text-faint">
              {ppl.length} people{kids.length > 0 ? ` · ${kids.length} kids` : ""}
              {g.dgroups !== " - " ? ` · ${g.dgroups} D-groups` : ""}
            </div>
            <div
              className={`grid border-t border-line ${
                kids.length > 0
                  ? "grid-cols-[84px_1fr_1fr_minmax(64px,0.55fr)]"
                  : "grid-cols-[84px_1fr_1fr]"
              }`}
            >
              <div />
              <div className="px-1.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-women-ink">
                Women
              </div>
              <div className="border-l border-dashed border-line px-1.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-men-ink">
                Men
              </div>
              {kids.length > 0 && (
                <div className="border-l border-dashed border-line px-1.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                  Kids
                </div>
              )}
              {TIERS.map((tier) => (
                <div key={tier.key} className="contents">
                  <div className="col-start-1 flex items-center border-t border-line px-1.5 py-2 text-[11px] font-semibold text-muted">
                    {tierLabels[tier.key]}
                  </div>
                  <div className="flex flex-wrap content-start gap-1 border-t border-line px-1 py-1.5">
                    {cell(tier.key, "F")}
                  </div>
                  <div className="flex flex-wrap content-start gap-1 border-l border-dashed border-line border-t px-1 py-1.5">
                    {cell(tier.key, "M")}
                  </div>
                </div>
              ))}
              {kids.length > 0 && (
                <div className="col-start-4 row-span-4 row-start-2 flex flex-wrap content-start gap-1 border-l border-dashed border-line border-t px-1 py-1.5">
                  {kids.map((k) => (
                    <span
                      key={k.id}
                      title={k.name}
                      className="whitespace-nowrap rounded-full bg-gold-soft px-2 py-[2.5px] text-[11.5px] text-gold"
                    >
                      {firstName(k.name)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div className="rise rounded-[14px] border border-dashed border-ember bg-surface p-4 shadow-card">
        <h3 className="font-display text-[17px] text-ember">Not yet in a lifegroup</h3>
        <div className="mb-2 text-[11.5px] text-faint">
          {unplaced.length} people we know of - the shepherding edge of the whole church
        </div>
        {unplaced.length === 0 ? (
          <p className="text-[12.5px] italic text-muted">
            Everyone we know of has a lifegroup home. 🎉
          </p>
        ) : (
          unplaced.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 py-1.5">
              <Avatar name={p.name} gender={p.gender} />
              <div>
                <div className="text-sm">{p.name}</div>
                {p.note && <div className="text-[11.5px] text-faint">{p.note}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
