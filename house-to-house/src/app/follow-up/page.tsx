"use client";

import type { Guest } from "@/lib/types";
import { GUESTS, MILESTONES } from "@/lib/data";
import { useRole } from "@/components/role-context";
import { Avatar, Chip, Stat } from "@/components/ui";

function AttendingChip({ a }: { a: Guest["attending"] }) {
  if (a === "yes") return <Chip tone="bg-sprout-soft text-sprout">still attending</Chip>;
  if (a === "sporadic") return <Chip tone="bg-gold-soft text-gold">sporadic</Chip>;
  return <Chip tone="bg-surface-2 text-muted">brand new</Chip>;
}

function MilestoneRoad({ guest }: { guest: Guest }) {
  return (
    <div className="flex flex-wrap items-start gap-y-2.5 md:ml-10">
      {MILESTONES.map((m, i) => {
        const done = guest.steps[m.key];
        const isNext = !done && MILESTONES.slice(0, i).every((prev) => guest.steps[prev.key]);
        return (
          <div key={m.key} className="mile flex w-[86px] flex-col items-center gap-1.5">
            <div
              className={`z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                done
                  ? "bg-accent text-cta-ink"
                  : isNext
                    ? "border-2 border-dashed border-accent bg-surface text-transparent"
                    : "border-2 border-line bg-surface text-transparent"
              }`}
            >
              ✓
            </div>
            <div
              className={`text-center text-[10.5px] leading-tight ${
                done ? "font-semibold text-ink" : "text-muted"
              }`}
            >
              {m.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FollowUpPage() {
  const { role } = useRole();

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

  const inMotion = GUESTS.filter((g) => !g.steps.lifegroup).length;
  const landed = GUESTS.filter((g) => g.steps.lifegroup).length;

  return (
    <>
      <div className="mb-5 max-w-[680px]">
        <h1 className="font-display mb-1 text-[27px]">Guest follow-up</h1>
        <p className="text-[14.5px] text-muted">
          From first Sunday to family — every guest walks the same road: contact → coffee →
          Discover Antioch → a lifegroup home → discipleship.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-5">
        <Stat num={GUESTS.length} label="guests in the pipeline" />
        <Stat num={inMotion} label="still in motion" />
        <Stat num={landed} label="landed in a lifegroup this year" />
      </div>

      <div className="flex flex-col gap-3.5">
        {GUESTS.map((g) => (
          <div key={g.id} className="rise rounded-[14px] border border-line bg-surface px-5 py-[18px] shadow-card">
            <div className="flex flex-wrap items-start gap-3">
              <Avatar name={g.name} gender={g.gender} />
              <div>
                <div className="font-display text-[17px]">{g.name}</div>
                <div className="text-[13px] text-muted">{g.desc}</div>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <AttendingChip a={g.attending} />
                {g.connectCard && <Chip>connect card ✓</Chip>}
                <Chip>first Sunday: {g.firstSunday}</Chip>
              </div>
            </div>
            <div className="my-2 flex flex-wrap gap-3.5 text-xs text-faint md:ml-10">
              <span>✉ {g.email}</span>
              <span>☎ {g.phone}</span>
            </div>
            <MilestoneRoad guest={g} />
            <div className="mt-2.5 text-[12.5px] italic text-muted md:ml-10">{g.note}</div>
          </div>
        ))}
      </div>
    </>
  );
}
