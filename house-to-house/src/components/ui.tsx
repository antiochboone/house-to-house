import type { Gender, Group } from "@/lib/types";
import { SEASON_META, initials } from "@/lib/data";

/** Gender-coded avatar: slate-blue = men, clay-rose = women. */
export function Avatar({
  name,
  gender,
  size = 28,
}: {
  name: string;
  gender?: Gender;
  size?: number;
}) {
  const tone =
    gender === "M"
      ? "bg-men-soft text-men-ink"
      : gender === "F"
        ? "bg-women-soft text-women-ink"
        : "bg-surface-2 text-muted";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.39 }}
    >
      {initials(name)}
    </span>
  );
}

export function Chip({
  children,
  tone = "bg-surface-2 text-muted",
  className = "",
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-semibold tracking-wide ${tone} ${className}`}
    >
      {children}
    </span>
  );
}

export function SeasonChip({ group }: { group: Group }) {
  if (group.status === "dormant") {
    return <Chip tone="bg-dormant-soft text-dormant">Dormant</Chip>;
  }
  const meta = SEASON_META[group.season];
  const label =
    group.id === "oak" && group.season === "start" ? "Starting Up · replant" : meta.label;
  return <Chip tone={meta.chip}>{label}</Chip>;
}

export function Stat({
  num,
  dim,
  label,
  alert = false,
}: {
  num: React.ReactNode;
  dim?: string;
  label: string;
  alert?: boolean;
}) {
  return (
    <div>
      <div
        className={`font-display text-[26px] tabular-nums ${alert ? "text-ember" : ""}`}
      >
        {num}
        {dim && <span className="text-[15px] text-faint"> {dim}</span>}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export function Insight({ text }: { text: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[13px] italic text-muted">
      <span className="shrink-0 not-italic text-accent">◆</span>
      <span>{text}</span>
    </div>
  );
}

export function Flame() {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="none" aria-hidden className="mt-0.5 shrink-0">
      <path
        d="M6.5 1C7 4 10.5 5 10.5 9a4 4 0 1 1-8 0C2.5 6.5 4 5.5 4.5 4c.8 1 1.2 1.8 1 3C7.5 6 6.2 3 6.5 1z"
        fill="var(--accent)"
      />
    </svg>
  );
}
