"use client";

// Guest follow-up: the whole journey from first Sunday to church family.
// Milestones just track what's happened, in whatever order. Graduation — a
// deliberate staff decision — brings the guest into the people directory
// (placed in a lifegroup or not). Archiving records an honest "didn't stick".

import { useState } from "react";
import type { Guest, GuestOutcome, MilestoneKey } from "@/lib/types";
import { useData } from "@/lib/store";
import { Avatar, Chip, Stat } from "@/components/ui";
import { GuestForm, Modal } from "@/components/forms";
import { DensityToggle, useDensity } from "@/components/density";

type GuestFilter =
  | "all"
  | "attending"
  | "sporadic"
  | "new"
  | "untouched"
  | "started"
  | "connect_card"
  | "in_group";
type GuestSort = "newest" | "oldest" | "name" | "most_progress" | "least_progress";

const OUTCOME_META: Record<GuestOutcome, { label: string; tone: string }> = {
  landed: { label: "landed in a lifegroup", tone: "bg-sprout-soft text-sprout" },
  sundays_only: { label: "in the directory (no group yet)", tone: "bg-men-soft text-men-ink" },
  moved_away: { label: "moved away", tone: "bg-dormant-soft text-dormant" },
  other_church: { label: "found another church", tone: "bg-gold-soft text-gold" },
  went_cold: { label: "went cold", tone: "bg-dormant-soft text-dormant" },
};

// Graduation now handles the two "became a Person" outcomes (landed /
// sundays_only); archiving is only for guests who didn't stick.
const ARCHIVE_OUTCOMES: GuestOutcome[] = ["moved_away", "other_church", "went_cold"];

function AttendingChip({ a }: { a: Guest["attending"] }) {
  if (a === "yes") return <Chip tone="bg-sprout-soft text-sprout">still attending</Chip>;
  if (a === "sporadic") return <Chip tone="bg-gold-soft text-gold">sporadic</Chip>;
  return <Chip tone="bg-surface-2 text-muted">brand new</Chip>;
}

export default function FollowUpPage() {
  const { ready, realMode, role, guests, groups, milestones, myGroupIds, setGuestMilestone, updateGuest, graduateGuest, archiveGuest, restoreGuest } =
    useData();
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [graduating, setGraduating] = useState<Guest | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ id: string; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GuestFilter>("all");
  const [sort, setSort] = useState<GuestSort>("newest");
  // The pipeline runs long, so it starts scannable.
  const [density, setDensity] = useDensity("h2h-density-followup", "condensed");

  const staffView = role === "staff";

  if (!staffView && myGroupIds.length === 0) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="font-display mb-2 text-2xl">MVP board</h1>
        <p className="text-[14.5px] text-muted">
          When your login is connected to a lifegroup you lead, the MVPs connected to
          your group show up here - to pray for, track, and pursue.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mt-24 text-center text-muted">
        <p className="font-display text-lg">Opening the pipeline…</p>
      </div>
    );
  }

  const groupName = (id?: string | null) =>
    id ? groups.find((x) => x.id === id)?.name : undefined;

  const active = guests.filter((g) => !g.archivedAt);
  const archived = guests
    .filter((g) => g.archivedAt)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  const landed = archived.filter((g) => g.outcome === "landed").length;
  // Leaders see their groups' MVPs; RLS enforces this server-side too — the
  // client filter matters for demo mode and staff-turned-leader previews.
  const mine = active.filter((g) => g.groupId && myGroupIds.includes(g.groupId));
  const base = staffView ? (tab === "active" ? active : archived) : mine;

  // How far along the road they are, used for both filtering and sorting.
  const stepsDone = (g: Guest) => milestones.filter((m) => g.steps[m.key]).length;
  const matches = (g: Guest, f: GuestFilter) => {
    switch (f) {
      case "attending":
        return g.attending === "yes";
      case "sporadic":
        return g.attending === "sporadic";
      case "new":
        return g.attending === "new";
      case "untouched":
        return stepsDone(g) === 0;
      case "started":
        return stepsDone(g) > 0;
      case "connect_card":
        return g.connectCard;
      case "in_group":
        return !!g.groupId;
      default:
        return true;
    }
  };
  const q = query.trim().toLowerCase();
  const searched = q
    ? base.filter((g) => `${g.name} ${g.desc}`.toLowerCase().includes(q))
    : base;
  const shown = [...searched.filter((g) => matches(g, filter))].sort((a, b) => {
    const da = a.firstSunday || "";
    const db = b.firstSunday || "";
    switch (sort) {
      case "oldest":
        return da.localeCompare(db);
      case "name":
        return a.name.localeCompare(b.name);
      case "most_progress":
        return stepsDone(b) - stepsDone(a) || a.name.localeCompare(b.name);
      case "least_progress":
        return stepsDone(a) - stepsDone(b) || a.name.localeCompare(b.name);
      default:
        return db.localeCompare(da);
    }
  });

  // Full GuestInput from an existing guest (leaders only touch the note).
  const toInput = (g: Guest, note: string) => ({
    name: g.name,
    gender: g.gender,
    desc: g.desc,
    firstSunday: /^\d{4}-\d{2}-\d{2}$/.test(g.firstSunday) ? g.firstSunday : "",
    attending: g.attending,
    connectCard: g.connectCard,
    email: g.email === " - " ? "" : g.email,
    phone: g.phone === " - " ? "" : g.phone,
    note,
    groupId: g.groupId ?? null,
  });

  const act = async (id: string, fn: () => Promise<string | null>) => {
    setBusyId(id);
    setError(null);
    const err = await fn();
    setBusyId(null);
    if (err) setError(err);
  };

  const toggleMilestone = (g: Guest, key: MilestoneKey, done: boolean) => {
    void act(g.id, () => setGuestMilestone(g.id, key, !done));
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-4 max-md:mb-3.5 max-md:gap-2.5">
        <div className="max-w-[680px]">
          <h1 className="font-display mb-1 text-[27px] max-md:mb-0 max-md:text-[23px]">
            {staffView ? "Guest follow-up" : "MVP board"}
          </h1>
          <p className="text-[14.5px] text-muted max-md:hidden">
            {staffView ? (
              <>
                From first Sunday to family. Tap a milestone to mark it done - &quot;In a
                lifegroup&quot; graduates them onto a real roster.
              </>
            ) : (
              <>
                New folks connected to your lifegroup - pray for them, track the journey,
                tap milestones as they happen. Staff walks alongside you.
              </>
            )}
          </p>
        </div>
        {staffView && (
          <div className="ml-auto flex items-center gap-2.5 max-md:ml-0 max-md:w-full max-md:gap-2">
            <div className="flex gap-[3px] rounded-[10px] bg-surface-2 p-[3px] max-md:flex-1">
              {(
                [
                  ["active", `In motion (${active.length})`],
                  ["archive", `Archive (${archived.length})`],
                ] as const
              ).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold max-md:flex-1 ${
                    tab === t ? "bg-surface text-ink shadow-card" : "text-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-cta-ink"
            >
              ＋ Guest
            </button>
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-5 max-md:mb-4">
        {staffView ? (
          <>
            <Stat num={active.length} label="guests in motion" />
            <Stat num={landed} label="landed in a lifegroup" />
            <Stat num={archived.length - landed} label="archived other ways" />
          </>
        ) : (
          <Stat num={mine.length} label="MVPs in your group's care" alert={mine.length > 0} />
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="w-[220px] rounded-xl border-[1.5px] border-line bg-surface px-3 py-1.5 text-[13px] outline-none focus:border-accent max-md:w-full"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "everyone"],
              ["attending", "still attending"],
              ["sporadic", "sporadic"],
              ["new", "brand new"],
              ["started", "in progress"],
              ["untouched", "not started"],
              ["connect_card", "connect card"],
              ["in_group", "in a lifegroup"],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                filter === f
                  ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                  : "border-line text-muted"
              }`}
            >
              {label} · {searched.filter((g) => matches(g, f)).length}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2.5 max-md:ml-0 max-md:w-full">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as GuestSort)}
            aria-label="Sort guests"
            className="rounded-xl border-[1.5px] border-line bg-surface px-3 py-1.5 text-[13px] outline-none focus:border-accent max-md:flex-1"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A-Z)</option>
            <option value="most_progress">Most progress</option>
            <option value="least_progress">Least progress</option>
          </select>
          <DensityToggle value={density} onChange={setDensity} />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-[13px] text-ember">
          Couldn&apos;t save: {error}
        </p>
      )}

      {shown.length === 0 && (
        <div className="mx-auto mt-10 max-w-md rounded-[14px] border border-line bg-surface p-8 text-center shadow-card">
          <p className="font-display mb-2 text-lg">
            {!staffView
              ? "No MVPs connected yet"
              : tab === "active"
                ? "No guests in the pipeline"
                : "Nothing archived yet"}
          </p>
          <p className="text-[13.5px] text-muted">
            {!staffView
              ? "When staff connects a new person to your lifegroup, they'll show up here to pray for and pursue."
              : tab === "active"
                ? realMode
                  ? "When someone visits on a Sunday, add them here and walk the road together."
                  : "Add a demo guest to try the flow."
                : "Graduations and archived journeys will collect here."}
          </p>
        </div>
      )}

      <div className={`flex flex-col ${density === "condensed" ? "gap-1.5" : "gap-3.5"}`}>
        {shown.map((g) =>
          density === "condensed" ? (
            <div
              key={g.id}
              className={`rise flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-line bg-surface px-3.5 py-2.5 shadow-card ${
                busyId === g.id ? "opacity-60" : ""
              }`}
            >
              <button
                onClick={staffView ? () => setEditing(g) : undefined}
                title={staffView ? `Edit ${g.name}` : undefined}
                className={`flex min-w-0 items-center gap-2.5 text-left ${
                  staffView ? "hover:opacity-70" : "cursor-default"
                }`}
              >
                <Avatar name={g.name} gender={g.gender} size={26} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{g.name}</span>
                  <span className="block truncate text-[11.5px] text-faint">
                    {g.firstSunday && g.firstSunday !== " - " ? g.firstSunday : "no first visit on file"}
                  </span>
                </span>
              </button>

              {/* Progress at a glance: one dot per milestone, still tappable. */}
              <div className="flex items-center gap-1">
                {milestones.map((m) => {
                  const done = g.steps[m.key];
                  return (
                    <button
                      key={m.key}
                      disabled={!!g.archivedAt || busyId === g.id}
                      onClick={() => toggleMilestone(g, m.key, done)}
                      title={`${m.label}${done ? " ✓" : ""}`}
                      className={`h-2.5 w-2.5 rounded-full disabled:cursor-default ${
                        done ? "bg-accent" : "border-[1.5px] border-line"
                      }`}
                    />
                  );
                })}
                <span className="ml-1 text-[11px] tabular-nums text-faint">
                  {stepsDone(g)}/{milestones.length}
                </span>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {g.archivedAt && g.outcome ? (
                  <Chip tone={OUTCOME_META[g.outcome].tone}>{OUTCOME_META[g.outcome].label}</Chip>
                ) : (
                  <AttendingChip a={g.attending} />
                )}
                {groupName(g.groupId) && (
                  <Chip tone="bg-accent-soft text-accent-ink">{groupName(g.groupId)}</Chip>
                )}
                {staffView && !g.archivedAt && (
                  <button
                    onClick={() => setGraduating(g)}
                    title="Graduate into the directory"
                    className="rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-cta-ink"
                  >
                    🎓
                  </button>
                )}
              </div>
            </div>
          ) : (
          <div key={g.id} className={`rise rounded-[14px] border border-line bg-surface px-5 py-[18px] shadow-card ${busyId === g.id ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start gap-3">
              <button
                onClick={staffView ? () => setEditing(g) : undefined}
                title={staffView ? `Edit ${g.name}` : undefined}
                className={`flex min-w-0 items-center gap-3 text-left ${
                  staffView ? "hover:opacity-70" : "cursor-default"
                }`}
              >
                <Avatar name={g.name} gender={g.gender} />
                <div className="min-w-0">
                  <div className="font-display text-[17px]">{g.name}</div>
                  {g.desc && <div className="text-[13px] text-muted">{g.desc}</div>}
                </div>
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {g.archivedAt && g.outcome ? (
                  <Chip tone={OUTCOME_META[g.outcome].tone}>{OUTCOME_META[g.outcome].label}</Chip>
                ) : (
                  <AttendingChip a={g.attending} />
                )}
                {groupName(g.groupId) && (
                  <Chip tone="bg-accent-soft text-accent-ink">{groupName(g.groupId)}</Chip>
                )}
                {g.connectCard && <Chip>connect card ✓</Chip>}
                {g.firstSunday !== " - " && <Chip>first Sunday: {g.firstSunday}</Chip>}
              </div>
            </div>
            {(g.email !== " - " || g.phone !== " - ") && (
              <div className="my-2 flex flex-wrap gap-3.5 text-xs text-faint md:ml-10">
                {g.email !== " - " && g.email && <span>✉ {g.email}</span>}
                {g.phone !== " - " && g.phone && <span>☎ {g.phone}</span>}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-start gap-y-2.5 md:ml-10 max-md:-mx-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-2 max-md:pb-1">
              {milestones.map((m, i) => {
                const done = g.steps[m.key];
                const isNext = !done && milestones.slice(0, i).every((prev) => g.steps[prev.key]);
                return (
                  <button
                    key={m.key}
                    disabled={!!g.archivedAt || busyId === g.id}
                    onClick={() => toggleMilestone(g, m.key, done)}
                    title={done ? `Un-mark "${m.label}"` : `Mark "${m.label}" done`}
                    className="mile group flex w-[86px] shrink-0 flex-col items-center gap-1.5 disabled:cursor-default"
                  >
                    <span
                      className={`z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] transition-colors ${
                        done
                          ? "bg-accent text-cta-ink"
                          : isNext
                            ? "border-2 border-dashed border-accent bg-surface text-transparent group-hover:bg-glow"
                            : "border-2 border-line bg-surface text-transparent group-hover:border-accent"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`text-center text-[10.5px] leading-tight ${
                        done ? "font-semibold text-ink" : "text-muted"
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {noteEdit?.id === g.id ? (
              <div className="mt-2.5 flex flex-col gap-2 md:ml-10">
                <textarea
                  autoFocus
                  value={noteEdit.text}
                  onChange={(e) => setNoteEdit({ id: g.id, text: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border-[1.5px] border-line bg-bg px-3 py-2 text-[13px] outline-none focus:border-accent"
                  placeholder="How's the pursuit going? Prayer points, next step…"
                />
                <div className="flex gap-3 text-[12px]">
                  <button
                    onClick={() => {
                      const text = noteEdit.text.trim();
                      setNoteEdit(null);
                      void act(g.id, () => updateGuest(g.id, toInput(g, text)));
                    }}
                    className="font-semibold text-accent-ink hover:underline"
                  >
                    save note
                  </button>
                  <button onClick={() => setNoteEdit(null)} className="text-faint hover:underline">
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2.5 flex flex-wrap items-baseline gap-2 md:ml-10">
                {g.note && <span className="text-[12.5px] italic text-muted">{g.note}</span>}
                {!staffView && !g.archivedAt && (
                  <button
                    onClick={() => setNoteEdit({ id: g.id, text: g.note })}
                    className="text-[12px] text-accent-ink hover:underline"
                  >
                    {g.note ? "edit note" : "＋ add a note"}
                  </button>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 md:ml-10">
              {!staffView ? null : g.archivedAt ? (
                <button
                  onClick={() => void act(g.id, () => restoreGuest(g.id))}
                  className="text-[12px] text-accent-ink hover:underline"
                >
                  restore to pipeline
                </button>
              ) : archiving === g.id ? (
                <>
                  <span className="text-[12px] text-muted">Archive as:</span>
                  {ARCHIVE_OUTCOMES.map((o) => (
                    <button
                      key={o}
                      onClick={() => {
                        setArchiving(null);
                        void act(g.id, () => archiveGuest(g.id, o));
                      }}
                      className="rounded-full border border-line px-2.5 py-1 text-[12px] text-muted hover:border-accent hover:text-accent-ink"
                    >
                      {OUTCOME_META[o].label}
                    </button>
                  ))}
                  <button onClick={() => setArchiving(null)} className="text-[12px] text-faint hover:underline">
                    cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setGraduating(g)}
                    className="rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-cta-ink"
                  >
                    🎓 Graduate
                  </button>
                  <button
                    onClick={() => setArchiving(g.id)}
                    className="text-[12px] text-faint hover:text-muted hover:underline"
                  >
                    archive…
                  </button>
                </>
              )}
            </div>
          </div>
          ),
        )}
      </div>

      {showAdd && (
        <Modal title="Add a guest" onClose={() => setShowAdd(false)}>
          <GuestForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title={`Edit ${editing.name.split(" ")[0]}`} onClose={() => setEditing(null)}>
          <GuestForm guest={editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
      {graduating && (
        <Modal title={`Graduate ${graduating.name.split(" ")[0]} 🎓`} onClose={() => setGraduating(null)}>
          <p className="mb-3 text-[13.5px] text-muted">
            You&apos;re bringing {graduating.name.split(" ")[0]} into the people directory as a
            member of the church. Place them in a lifegroup, or add them unplaced for now.
          </p>
          <span className="label mb-1.5 block">Into a lifegroup</span>
          <div className="flex flex-col gap-2">
            {graduating.groupId && groups.some((grp) => grp.id === graduating.groupId) && (
              <p className="px-1 text-[11.5px] text-faint">
                Connected to {groups.find((grp) => grp.id === graduating.groupId)?.name} - likely
                their home.
              </p>
            )}
            {[...groups]
              .sort((a, b) => (a.id === graduating.groupId ? -1 : b.id === graduating.groupId ? 1 : 0))
              .map((grp) => (
                <button
                  key={grp.id}
                  onClick={() => {
                    const id = graduating.id;
                    setGraduating(null);
                    void act(id, () => graduateGuest(id, grp.id));
                  }}
                  className={`rounded-xl border-[1.5px] px-3.5 py-2.5 text-left text-[14.5px] hover:border-accent ${
                    grp.id === graduating.groupId
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface"
                  }`}
                >
                  {grp.name}
                </button>
              ))}
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <button
              onClick={() => {
                const id = graduating.id;
                setGraduating(null);
                void act(id, () => graduateGuest(id, null));
              }}
              className="w-full rounded-xl border-[1.5px] border-dashed border-line px-3.5 py-2.5 text-left text-[14px] text-muted hover:border-accent hover:text-accent-ink"
            >
              Not in a lifegroup yet - add to the directory as unplaced
            </button>
            <p className="mt-1 px-1 text-[11.5px] text-faint">
              e.g. a believer who comes on Sundays but hasn&apos;t joined a group.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
