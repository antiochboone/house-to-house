"use client";

// The web of lifegroups over time: each group is a horizontal line; lines branch at
// plants, flow into each other at merges, fade while dormant, and resume at replants.
// Lanes come from the store (demo seed, or the group_events ledger in real mode).

import { useMemo, useState } from "react";
import type { Lane, LaneEvent } from "@/lib/data";

const LANE_H = 52;
const PAD_L = 16;
const PAD_R = 24;
const PAD_T = 34;
const W = 1060;

const monthIndex = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};

const SEG_STYLE: Record<string, { stroke: string; dash?: string; opacity: number; width: number }> = {
  active: { stroke: "var(--accent)", opacity: 1, width: 3.5 },
  dormant: { stroke: "var(--dormant)", dash: "3 6", opacity: 0.8, width: 2.5 },
  upcoming: { stroke: "var(--gold)", dash: "2 5", opacity: 0.9, width: 2.5 },
};

const EVENT_DOT: Record<LaneEvent["kind"], { fill: string; r: number }> = {
  "plant-in": { fill: "var(--accent)", r: 5.5 },
  "plant-out": { fill: "var(--accent)", r: 4 },
  "merge-in": { fill: "var(--gold)", r: 4.5 },
  "merge-out": { fill: "var(--dormant)", r: 4.5 },
  dormant: { fill: "var(--dormant)", r: 4.5 },
  replant: { fill: "var(--sprout)", r: 5.5 },
  milestone: { fill: "var(--gold)", r: 3.5 },
};

export function LineageTimeline({ lanes }: { lanes: Lane[] }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  const { X, laneY, years, H, todayYM } = useMemo(() => {
    const now = new Date();
    const todayYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const months = lanes.flatMap((l) => [
      ...l.segments.flatMap((s) => [s.from, s.to ?? todayYM]),
      ...l.events.map((e) => e.date),
    ]);
    const minM = months.length ? Math.min(...months.map(monthIndex)) - 2 : monthIndex(todayYM) - 12;
    const maxM = Math.max(monthIndex(todayYM) + 5, ...(months.length ? months.map(monthIndex) : [0]));
    const X = (ym: string) =>
      PAD_L + 120 + ((monthIndex(ym) - minM) / Math.max(1, maxM - minM)) * (W - PAD_L - PAD_R - 120);
    const laneY = new Map(lanes.map((l, i) => [l.id, PAD_T + i * LANE_H + LANE_H / 2]));
    const years: number[] = [];
    for (let y = Math.ceil(minM / 12); y * 12 <= maxM; y++) years.push(y);
    const H = PAD_T + Math.max(1, lanes.length) * LANE_H + 30;
    return { X, laneY, years: years.filter((y) => y * 12 >= minM), H, todayYM };
  }, [lanes]);

  const laneEnd = (lane: Lane): string => {
    const last = lane.segments[lane.segments.length - 1];
    return last.to ?? todayYM;
  };

  if (lanes.length === 0) {
    return (
      <div className="rise rounded-[14px] border border-line bg-surface p-8 text-center shadow-card">
        <p className="font-display mb-1 text-lg">No history yet</p>
        <p className="text-[13.5px] text-muted">
          As lifegroups are added and their plants, merges, and replants get recorded, the
          family tree of the church grows here.
        </p>
      </div>
    );
  }

  return (
    <div className="rise rounded-[14px] border border-line bg-surface p-5 shadow-card">
      <div className="mb-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-6 rounded bg-accent" /> active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-6 rounded border-t-2 border-dashed border-dormant" /> dormant
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-6 rounded border-t-2 border-dashed border-gold" /> upcoming plant
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sprout" /> replant
        </span>
        <span>· hover any dot for the story</span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[900px]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Group lineage timeline">
            {years.map((y) => (
              <g key={y}>
                <line
                  x1={X(`${y}-01`)} x2={X(`${y}-01`)} y1={PAD_T - 14} y2={H - 20}
                  stroke="var(--line)" strokeWidth="1"
                />
                <text x={X(`${y}-01`)} y={PAD_T - 20} textAnchor="middle" fontSize="11" fill="var(--faint)">
                  {y}
                </text>
              </g>
            ))}
            <line
              x1={X(todayYM)} x2={X(todayYM)} y1={PAD_T - 14} y2={H - 20}
              stroke="var(--ember)" strokeWidth="1" strokeDasharray="2 4" opacity="0.6"
            />
            <text x={X(todayYM)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--ember)">
              today
            </text>

            {lanes.map((lane) => {
              const y = laneY.get(lane.id)!;
              const parts: React.ReactNode[] = [];
              if (lane.parentId && laneY.has(lane.parentId)) {
                const px = X(lane.segments[0].from);
                const py = laneY.get(lane.parentId)!;
                parts.push(
                  <path
                    key={`branch-${lane.id}`}
                    d={`M ${px} ${py} C ${px + 26} ${py}, ${px + 26} ${y}, ${px} ${y}`}
                    fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.55"
                  />,
                );
              }
              if (lane.mergedIntoId && laneY.has(lane.mergedIntoId)) {
                const mx = X(laneEnd(lane));
                const my = laneY.get(lane.mergedIntoId)!;
                parts.push(
                  <path
                    key={`merge-${lane.id}`}
                    d={`M ${mx} ${y} C ${mx + 26} ${y}, ${mx + 26} ${my}, ${mx} ${my}`}
                    fill="none" stroke="var(--dormant)" strokeWidth="2" strokeDasharray="4 4" opacity="0.7"
                  />,
                );
              }
              return parts;
            })}

            {lanes.map((lane) => {
              const y = laneY.get(lane.id)!;
              return (
                <g key={lane.id}>
                  {lane.segments.map((seg, i) => {
                    const s = SEG_STYLE[seg.kind];
                    return (
                      <line
                        key={i}
                        x1={X(seg.from)} x2={X(seg.to ?? todayYM)} y1={y} y2={y}
                        stroke={s.stroke} strokeWidth={s.width}
                        strokeDasharray={s.dash} opacity={s.opacity} strokeLinecap="round"
                      />
                    );
                  })}
                  <text
                    x={X(lane.segments[0].from) - 8} y={y + 4}
                    textAnchor="end" fontSize="12.5" fill="var(--ink)"
                    fontFamily="Palatino Linotype, Book Antiqua, Palatino, Georgia, serif"
                  >
                    {lane.name}
                  </text>
                  {lane.segments.length > 1 && lane.segments[0].name !== lane.name && (
                    <text
                      x={X(lane.segments[0].from) + 4} y={y - 9}
                      fontSize="10" fill="var(--faint)" fontStyle="italic"
                    >
                      {lane.segments[0].name}
                    </text>
                  )}
                  {lane.events.map((ev) => {
                    const d = EVENT_DOT[ev.kind];
                    return (
                      <circle
                        key={ev.date + ev.kind + ev.label}
                        cx={X(ev.date)} cy={y} r={d.r} fill={d.fill}
                        stroke="var(--surface)" strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() =>
                          setHover({ x: X(ev.date), y, text: `${lane.name} · ${ev.label}` })
                        }
                        onMouseLeave={() => setHover(null)}
                      >
                        <title>{`${ev.date} - ${ev.label}`}</title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}
          </svg>
          {hover && (
            <div
              className="pointer-events-none absolute z-10 max-w-[260px] rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] leading-snug shadow-card"
              style={{
                left: `${(hover.x / W) * 100}%`,
                top: `${((hover.y - 34) / H) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              {hover.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
