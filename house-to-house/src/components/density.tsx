"use client";

// Card density, shared by the Lifegroup Map and Guest follow-up.
// "Condensed" isn't a collapse: every card is still there and still clickable,
// just trimmed to its headline so a long list is scannable at a glance.
// The choice sticks per list (localStorage), so each page remembers its own.

import { useEffect, useState } from "react";

export type Density = "expanded" | "condensed";

export function useDensity(storageKey: string, fallback: Density) {
  const [density, setDensity] = useState<Density>(fallback);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "expanded" || saved === "condensed") setDensity(saved);
    } catch {
      // localStorage unavailable; keep the default.
    }
  }, [storageKey]);

  const choose = (d: Density) => {
    setDensity(d);
    try {
      localStorage.setItem(storageKey, d);
    } catch {
      // ignore
    }
  };

  return [density, choose] as const;
}

export function DensityToggle({
  value,
  onChange,
}: {
  value: Density;
  onChange: (d: Density) => void;
}) {
  return (
    // inline-flex, not flex: the pill hugs its two buttons instead of
    // stretching across the phone with dead space to the right. The caller
    // centers it.
    <div
      role="group"
      aria-label="Card density"
      className="inline-flex gap-[3px] rounded-full border border-line bg-surface-2 p-[3px]"
    >
      {(
        [
          ["expanded", "Expanded", "▤"],
          ["condensed", "Condensed", "☰"],
        ] as const
      ).map(([d, label, glyph]) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          aria-pressed={value === d}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors max-md:px-4 max-md:py-2 max-md:text-[13px] ${
            value === d
              ? "bg-surface text-ink shadow-card"
              : "text-muted hover:text-ink"
          }`}
        >
          <span aria-hidden className="text-[11px] leading-none opacity-70">
            {glyph}
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}
