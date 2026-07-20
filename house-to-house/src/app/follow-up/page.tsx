"use client";

// Guest follow-up: the whole journey from first Sunday to lifegroup family.
// Milestones are clickable; "In a lifegroup" graduates the guest into the
// people directory; archiving records one of four honest outcomes.

import { useState } from "react";
import type { Guest, GuestOutcome, MilestoneKey } from "@/lib/types";
import { MILESTONES } from "@/lib/data";
import { useData } from "@/lib/store";
import { Avatar, Chip, Stat } from "@/components/ui";
import { GuestForm, Modal } from "@/components/forms";

const OUTCOME_META: Record<GuestOutcome, { label: string; tone: string }> = {
  landed: { label: "landed in a lifegroup", tone: "bg-sprout-soft text-sprout" },
  moved_away: { label: "moved away", tone: "bg-dormant-soft text-dormant" },
  other_church: { label: "found another church", tone: "bg-gold-soft text-gold" },
  went_cold: { label: "went cold", tone: "bg-dormant-soft text-dormant" },
  sundays_only: { label: "Sundays for now", tone: "bg-men-soft text-men-ink" },
};

function AttendingChip({ a }: { a: Guest["attending"] }) {
  if (a === "yes") return <Chip tone="bg-sprout-soft text-sprout">still attending</Chip>;
  if (a === "sporadic") return <Chip tone="bg-gold-soft text-gold">sporadic</Chip>;
  return <Chip tone="bg-surface-2 text-muted">brand new</Chip>;
}

export default function FollowUpPage() {
  const { ready, realMode, role, guests, groups, setGuestMilestone, graduateGuest, archiveGuest, restoreGuest } =
    useData();
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [graduating, setGraduating] = useState<Guest | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (role !== "staff") {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="font-display mb-2 text-2xl">Staff view</h1>
        <p className="text-[14.5px] text-muted">
          Guest follow-up is a staff workflow. If someone new lands in your group, they&apos;ll
          show up on your roster automatically.
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

  const active = guests.filter((g) => !g.archivedAt);
  const archived = guests
    .filter((g) => g.archivedAt)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  const landed = archived.filter((g) => g.outcome === "landed").length;
  const shown = tab === "active" ? active : archived;

  const act = async (id: string, fn: () => Promise<string | null>) => {
    setBusyId(id);
    setError(null);
    const err = await fn();
    setBusyId(null);
    if (err) setError(err);
  };

  const toggleMilestone = (g: Guest, key: MilestoneKey, done: boolean) => {
    if (key === "lifegroup" && !done) {
      setGraduating(g);
      return;
    }
    void act(g.id, () => setGuestMilestone(g.id, key, !done));
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-[680px]">
          <h1 className="font-display mb-1 text-[27px] max-md:text-[23px]">Guest follow-up</h1>
          <p className="text-[14.5px] text-muted">
            From first Sunday to family. Tap a milestone to mark it done — &quot;In a
            lifegroup&quot; graduates them onto a real roster.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex gap-[3px] rounded-[10px] bg-surface-2 p-[3px]">
            {(
              [
                ["active", `In motion (${active.length})`],
                ["archive", `Archive (${archived.length})`],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold ${
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
      </div>

      <div className="mb-5 flex flex-wrap gap-5">
        <Stat num={active.length} label="guests in motion" />
        <Stat num={landed} label="landed in a lifegroup" />
        <Stat num={archived.length - landed} label="archived other ways" />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-[13px] text-ember">
          Couldn&apos;t save: {error}
        </p>
      )}

      {shown.length === 0 && (
        <div className="mx-auto mt-10 max-w-md rounded-[14px] border border-line bg-surface p-8 text-center shadow-card">
          <p className="font-display mb-2 text-lg">
            {tab === "active" ? "No guests in the pipeline" : "Nothing archived yet"}
          </p>
          <p className="text-[13.5px] text-muted">
            {tab === "active"
              ? realMode
                ? "When someone visits on a Sunday, add them here and walk the road together."
                : "Add a demo guest to try the flow."
              : "Graduations and archived journeys will collect here."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {shown.map((g) => (
          <div key={g.id} className={`rise rounded-[14px] border border-line bg-surface px-5 py-[18px] shadow-card ${busyId === g.id ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start gap-3">
              <button
                onClick={() => setEditing(g)}
                title={`Edit ${g.name}`}
                className="flex min-w-0 items-center gap-3 text-left hover:opacity-70"
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
                {g.connectCard && <Chip>connect card ✓</Chip>}
                {g.firstSunday !== "—" && <Chip>first Sunday: {g.firstSunday}</Chip>}
              </div>
            </div>
            {(g.email !== "—" || g.phone !== "—") && (
              <div className="my-2 flex flex-wrap gap-3.5 text-xs text-faint md:ml-10">
                {g.email !== "—" && g.email && <span>✉ {g.email}</span>}
                {g.phone !== "—" && g.phone && <span>☎ {g.phone}</span>}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-start gap-y-2.5 md:ml-10">
              {MILESTONES.map((m, i) => {
                const done = g.steps[m.key];
                const isNext = !done && MILESTONES.slice(0, i).every((prev) => g.steps[prev.key]);
                return (
                  <button
                    key={m.key}
                    disabled={!!g.archivedAt || busyId === g.id}
                    onClick={() => toggleMilestone(g, m.key, done)}
                    title={done ? `Un-mark "${m.label}"` : `Mark "${m.label}" done`}
                    className="mile group flex w-[86px] flex-col items-center gap-1.5 disabled:cursor-default"
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

            {g.note && <div className="mt-2.5 text-[12.5px] italic text-muted md:ml-10">{g.note}</div>}

            <div className="mt-3 flex flex-wrap items-center gap-2 md:ml-10">
              {g.archivedAt ? (
                <button
                  onClick={() => void act(g.id, () => restoreGuest(g.id))}
                  className="text-[12px] text-accent-ink hover:underline"
                >
                  restore to pipeline
                </button>
              ) : archiving === g.id ? (
                <>
                  <span className="text-[12px] text-muted">Archive as:</span>
                  {(Object.keys(OUTCOME_META) as GuestOutcome[])
                    .filter((o) => o !== "landed")
                    .map((o) => (
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
                <button
                  onClick={() => setArchiving(g.id)}
                  className="text-[12px] text-faint hover:text-muted hover:underline"
                >
                  archive…
                </button>
              )}
            </div>
          </div>
        ))}
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
        <Modal title={`${graduating.name.split(" ")[0]} found home 🏡`} onClose={() => setGraduating(null)}>
          <p className="mb-3 text-[13.5px] text-muted">
            Which lifegroup? This adds {graduating.name.split(" ")[0]} to the roster, moves
            them into the people directory, and graduates them from the pipeline.
          </p>
          <div className="flex flex-col gap-2">
            {groups.map((grp) => (
              <button
                key={grp.id}
                onClick={() => {
                  const id = graduating.id;
                  setGraduating(null);
                  void act(id, () => graduateGuest(id, grp.id));
                }}
                className="rounded-xl border-[1.5px] border-line bg-surface px-3.5 py-2.5 text-left text-[14.5px] hover:border-accent"
              >
                {grp.name}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
