"use client";

import { useEffect } from "react";
import type { Group, Person } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/data";
import { useData, makeHelpers } from "@/lib/store";
import { Avatar, Chip, Insight, SeasonChip } from "./ui";

const ROLE_NAME: Partial<Record<Person["role"], string>> = {
  leader: "Leader",
  intern: "Intern",
  worship: "Worship",
};

function statusChip(p: Person) {
  if (!p.status) return null;
  const tone =
    p.status === "wants"
      ? "bg-sprout-soft text-sprout"
      : p.status === "invited"
        ? "bg-gold-soft text-gold"
        : p.status === "declined"
          ? "bg-dormant-soft text-dormant"
          : "bg-surface-2 text-muted";
  return (
    <Chip tone={tone} className="font-medium">
      {STATUS_LABEL[p.status]}
    </Chip>
  );
}

export function GroupDrawer({
  group,
  showDetail,
  onClose,
  onAddPerson,
}: {
  group: Group | null;
  showDetail: boolean;
  onClose: () => void;
  onAddPerson?: () => void;
}) {
  const { people } = useData();
  const h = makeHelpers(people);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = group !== null;
  const ppl = group ? h.groupPeople(group.id) : [];
  const leadership = ppl.filter((p) => ["leader", "intern", "worship"].includes(p.role));
  const members = ppl.filter((p) => p.role === "member");

  const row = (p: Person) => (
    <div key={p.id} className="flex items-center gap-2.5 py-1.5">
      <Avatar name={p.name} gender={p.gender} />
      <div>
        <div className="text-sm">{p.name}</div>
        {ROLE_NAME[p.role] && (
          <div className="text-[11.5px] text-faint">{ROLE_NAME[p.role]}</div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {showDetail &&
          (h.inRelationship(p) ? (
            <span
              title="in a discipleship relationship"
              className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
            />
          ) : (
            statusChip(p)
          ))}
      </div>
    </div>
  );

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Group details"
        className={`fixed inset-y-0 right-0 z-50 w-[480px] max-w-full overflow-y-auto border-l border-line bg-bg px-6 pb-16 pt-6 transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-[102%]"
        }`}
      >
        {group && (
          <>
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg px-2.5 py-1 text-xl text-muted hover:bg-surface-2"
            >
              ✕
            </button>
            <SeasonChip group={group} />
            <h2 className="font-display mb-0.5 mt-1.5 text-2xl">{group.name}</h2>
            <div className="mb-3.5 text-[13.5px] text-muted">
              {group.meet} · {ppl.length} people
              {group.lineage ? ` · ${group.lineage}` : ""}
            </div>

            {showDetail && group.insights.length > 0 && (
              <section className="mt-5">
                <span className="label mb-2 block">Insights</span>
                <div className="flex flex-col gap-1.5">
                  {group.insights.map((i) => (
                    <Insight key={i} text={i} />
                  ))}
                </div>
              </section>
            )}

            {showDetail && group.readiness !== undefined && (
              <section className="mt-5">
                <span className="label mb-2 block">Planting readiness</span>
                <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3.5">
                  <div className="font-display text-[26px] tabular-nums">
                    {group.readiness}
                    <span className="text-[15px] text-faint">/15</span>
                  </div>
                  <div className="text-[12.5px] leading-snug text-muted">
                    12+ means prepare to plant. Leadership balanced, locations set —
                    worship leader for group two is the open item.
                  </div>
                </div>
              </section>
            )}

            <section className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="label">Leadership team</span>
                {onAddPerson && (
                  <button
                    onClick={onAddPerson}
                    className="text-[12px] font-semibold text-accent-ink hover:underline"
                  >
                    ＋ add person
                  </button>
                )}
              </div>
              <div className="mb-1.5 flex gap-3 text-[11.5px] text-faint">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-men-soft ring-1 ring-men/40" /> men
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-women-soft ring-1 ring-women/40" /> women
                </span>
              </div>
              {leadership.length === 0 && (
                <p className="text-[12.5px] italic text-muted">No leadership recorded yet.</p>
              )}
              {leadership.map(row)}
            </section>

            <hr className="my-2 border-line" />

            <section className="mt-2.5">
              <span className="label mb-2 block">Members</span>
              {members.length === 0 && (
                <p className="text-[12.5px] italic text-muted">No members yet.</p>
              )}
              {members.map(row)}
            </section>

            {showDetail && group.dgroups !== "—" && (
              <section className="mt-5">
                <span className="label mb-2 block">Discipleship groups</span>
                <div className="text-sm">
                  {group.dgroups}{" "}
                  {group.dgroups === "2 men's · 2 women's" && (
                    <Chip tone="bg-sprout-soft text-sprout" className="ml-1.5 font-medium">
                      plant-ready pattern
                    </Chip>
                  )}
                </div>
              </section>
            )}

            {showDetail && group.history.length > 0 && (
              <section className="mt-5">
                <span className="label mb-2 block">Story</span>
                <div className="relative flex flex-col gap-3 pl-[18px] before:absolute before:bottom-1.5 before:left-1 before:top-1.5 before:w-0.5 before:rounded before:bg-line">
                  {group.history.map((ev) => (
                    <div key={ev.date + ev.text} className="relative text-[13.5px]">
                      <span className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                      <span className="block text-[11px] text-faint">{ev.date}</span>
                      {ev.text}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!showDetail && (
              <p className="mt-5 text-[11.5px] leading-relaxed text-faint">
                Roster names only — health insights and discipleship detail are visible to
                staff and this group&apos;s own leaders.
              </p>
            )}
          </>
        )}
      </aside>
    </>
  );
}
