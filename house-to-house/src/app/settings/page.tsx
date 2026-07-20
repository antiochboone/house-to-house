"use client";

// Church configuration: tag categories, check-in pulse vocabulary, the guest
// follow-up road, engagement tier names, and zones & sections. Everything saves
// to the church's settings, so this is also where another church would make
// House to House theirs.

import { useState } from "react";
import type { EngagementTier, Milestone, Section, Zone } from "@/lib/types";
import { TIERS, TIER_MEANING } from "@/lib/data";
import { useData } from "@/lib/store";

const inputCls =
  "rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-[14.5px] max-md:text-[16px] outline-none focus:border-accent";

/** Slug-style id from a label, unique among `taken`. */
function slugId(label: string, taken: Iterable<string>) {
  const base =
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "item";
  const used = new Set(taken);
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}_${n++}`;
  return id;
}

function AddChipInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = () => {
    if (draft.trim()) onAdd(draft.trim());
    setDraft("");
    setAdding(false);
  };
  return adding ? (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          setDraft("");
          setAdding(false);
        }
      }}
      onBlur={commit}
      placeholder={placeholder}
      className="w-[150px] rounded-full border border-accent bg-surface px-2.5 py-1 text-[12px] max-md:text-[16px] outline-none"
    />
  ) : (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="rounded-full border border-dashed border-line px-2.5 py-1 text-[12px] text-faint hover:border-accent hover:text-accent-ink"
    >
      ＋ add
    </button>
  );
}

/** Text input that commits on blur / Enter (used for tier renames). */
function CommitInput({
  value,
  placeholder,
  ariaLabel,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  ariaLabel: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // Re-sync the draft when the saved value changes (adjust-during-render pattern).
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }
  const commit = () => {
    if (draft.trim() && draft.trim() !== value) onCommit(draft.trim());
    else setDraft(value);
  };
  return (
    <input
      value={draft}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") setDraft(value);
      }}
      className={`${inputCls} w-full`}
    />
  );
}

function SectionCard({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rise rounded-[14px] border border-line bg-surface p-5 max-md:p-4 shadow-card">
      <h2 className="font-display mb-1 text-[18px]">{title}</h2>
      <p className="mb-4 text-[13px] text-muted">{blurb}</p>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const {
    ready,
    role,
    groups,
    tagCategories,
    addTagOption,
    addTagCategory,
    pulseWords,
    savePulseWords,
    milestones,
    saveMilestones,
    tierLabels,
    saveTierLabels,
    zones,
    sections,
    groupSections,
    saveZoning,
  } = useData();
  const [newCat, setNewCat] = useState("");
  const [newCatMulti, setNewCatMulti] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (role !== "staff") {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="font-display mb-2 text-2xl">Staff view</h1>
        <p className="text-[14.5px] text-muted">Church settings are a staff tool.</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mt-24 text-center text-muted">
        <p className="font-display text-lg">Opening settings…</p>
      </div>
    );
  }

  const act = async (fn: () => Promise<string | null>) => {
    setError(null);
    const err = await fn();
    if (err) setError(err);
  };

  /* ----- Follow-up road helpers ----- */
  const moveMilestone = (i: number, dir: -1 | 1) => {
    const next = [...milestones];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    void act(() => saveMilestones(next));
  };
  const addMilestone = (label: string) => {
    const key = slugId(label, milestones.map((m) => m.key));
    // New steps land just before "In a lifegroup" — that's where the road
    // usually grows (contact steps come first, landing comes last).
    const at = milestones.findIndex((m) => m.key === "lifegroup");
    const next = [...milestones];
    next.splice(at === -1 ? next.length : at, 0, { key, label });
    void act(() => saveMilestones(next));
  };

  /* ----- Zones & sections helpers ----- */
  const zoning = { zones, sections, groupSections };
  const addZone = (name: string) =>
    void act(() =>
      saveZoning({ ...zoning, zones: [...zones, { id: slugId(name, zones.map((z) => z.id)), name }] }),
    );
  const removeZone = (id: string) =>
    void act(() => saveZoning({ ...zoning, zones: zones.filter((z) => z.id !== id) }));
  const addSection = (name: string) =>
    void act(() =>
      saveZoning({
        ...zoning,
        sections: [
          ...sections,
          { id: slugId(name, sections.map((s) => s.id)), name, zoneId: null } satisfies Section,
        ],
      }),
    );
  const patchSection = (id: string, patch: Partial<Section>) =>
    void act(() =>
      saveZoning({
        ...zoning,
        sections: sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }),
    );
  const removeSection = (id: string) =>
    void act(() => saveZoning({ ...zoning, sections: sections.filter((s) => s.id !== id) }));
  const assignGroup = (groupId: string, sectionId: string) => {
    const next = { ...groupSections };
    if (sectionId) next[groupId] = sectionId;
    else delete next[groupId];
    void act(() => saveZoning({ ...zoning, groupSections: next }));
  };

  const iconBtn =
    "flex h-7 w-7 items-center justify-center rounded-lg text-[13px] text-faint hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <>
      <div className="mb-6 max-md:mb-4 max-w-[640px]">
        <h1 className="font-display mb-1 text-[27px] max-md:text-[23px]">Settings</h1>
        <p className="text-[14.5px] text-muted">
          Make House to House speak your church&apos;s language. Everything here applies
          everywhere, immediately.
        </p>
      </div>

      {error && (
        <p className="mb-4 max-w-[640px] rounded-lg bg-ember-soft px-3 py-2 text-[13px] text-ember">
          {error}
        </p>
      )}

      <div className="flex max-w-[640px] flex-col gap-5">
        <SectionCard
          title="Lifegroup tags"
          blurb="The categories and options offered when tagging a group. Options you add while tagging land here too."
        >
          <div className="flex flex-col gap-4">
            {tagCategories.map((c) => (
              <div key={c.id}>
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold">{c.label}</span>
                  <span className="text-[10.5px] text-faint">
                    {c.multi ? "pick any" : "pick one"}
                    {c.custom ? " · custom" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.options.map((o) => (
                    <span
                      key={o}
                      className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted"
                    >
                      {o}
                    </span>
                  ))}
                  <AddChipInput
                    placeholder="new option…"
                    onAdd={(v) => void act(() => addTagOption(c.id, v))}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <span className="label mb-2 block">New category</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="e.g. Meeting style"
                className={`${inputCls} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => setNewCatMulti(!newCatMulti)}
                className={`rounded-xl border-[1.5px] px-3 py-2 text-[12.5px] font-medium ${
                  newCatMulti
                    ? "border-line text-muted"
                    : "border-accent bg-accent-soft text-accent-ink"
                }`}
              >
                {newCatMulti ? "pick any" : "pick one"}
              </button>
              <button
                type="button"
                onClick={() =>
                  void act(async () => {
                    const err = await addTagCategory(newCat, newCatMulti);
                    if (!err) setNewCat("");
                    return err;
                  })
                }
                className="rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-cta-ink"
              >
                Add
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Check-in pulse words"
          blurb={
            <>
              The words leaders pick from when asked &quot;How has the group been
              feeling?&quot; Tap one to remove it.
            </>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {pulseWords.map((w) => (
              <button
                key={w}
                type="button"
                title={`Remove "${w}"`}
                onClick={() => void act(() => savePulseWords(pulseWords.filter((x) => x !== w)))}
                className="group rounded-full border border-line px-2.5 py-1 text-[12px] text-muted hover:border-ember hover:text-ember"
              >
                {w} <span className="opacity-40 group-hover:opacity-100">✕</span>
              </button>
            ))}
            <AddChipInput
              placeholder="new word…"
              onAdd={(v) => void act(() => savePulseWords([...pulseWords, v]))}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Guest follow-up road"
          blurb={
            <>
              The milestone steps every guest walks, in order. &quot;In a lifegroup&quot;
              can&apos;t be removed — graduating a guest onto a roster hangs on it.
            </>
          }
        >
          <div className="flex flex-col gap-1">
            {milestones.map((m: Milestone, i: number) => (
              <div
                key={m.key}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5"
              >
                <span className="w-5 text-center text-[11px] font-semibold text-faint">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{m.label}</span>
                {m.key === "lifegroup" && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent-ink">
                    graduation step
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Move "${m.label}" earlier`}
                  disabled={i === 0}
                  onClick={() => moveMilestone(i, -1)}
                  className={iconBtn}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move "${m.label}" later`}
                  disabled={i === milestones.length - 1}
                  onClick={() => moveMilestone(i, 1)}
                  className={iconBtn}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove "${m.label}"`}
                  disabled={m.key === "lifegroup"}
                  onClick={() =>
                    void act(() => saveMilestones(milestones.filter((x) => x.key !== m.key)))
                  }
                  className={`${iconBtn} hover:text-ember`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2.5">
            <AddChipInput placeholder="new step…" onAdd={addMilestone} />
          </div>
        </SectionCard>

        <SectionCard
          title="Engagement tier names"
          blurb="The four rows of the map's Engagement view, most to least engaged. Rename them to your church's language."
        >
          <div className="flex flex-col gap-3">
            {TIERS.map((t: { key: EngagementTier; label: string }) => (
              <div key={t.key}>
                <CommitInput
                  value={tierLabels[t.key]}
                  placeholder={t.label}
                  ariaLabel={`Name for the "${t.label}" tier`}
                  onCommit={(v) => void act(() => saveTierLabels({ ...tierLabels, [t.key]: v }))}
                />
                <span className="mt-1 block px-1 text-[11.5px] text-faint">
                  {TIER_MEANING[t.key]}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Zones &amp; sections"
          blurb="For churches that grow past a handful of groups: a section gathers a few lifegroups, a zone gathers sections. Leave this empty and the map stays a single flat list."
        >
          <div className="flex flex-col gap-5">
            <div>
              <span className="label mb-2 block">Zones</span>
              <div className="flex flex-wrap gap-1.5">
                {zones.map((z: Zone) => (
                  <button
                    key={z.id}
                    type="button"
                    title={`Remove zone "${z.name}"`}
                    onClick={() => removeZone(z.id)}
                    className="group rounded-full border border-line px-2.5 py-1 text-[12px] text-muted hover:border-ember hover:text-ember"
                  >
                    {z.name} <span className="opacity-40 group-hover:opacity-100">✕</span>
                  </button>
                ))}
                <AddChipInput placeholder="new zone…" onAdd={addZone} />
              </div>
            </div>

            <div>
              <span className="label mb-2 block">Sections</span>
              {sections.length === 0 && (
                <p className="mb-2 text-[12.5px] italic text-muted">
                  No sections yet — add one and the map starts clustering.
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {sections.map((s: Section) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate rounded-xl border border-line bg-surface px-3 py-1.5 text-[13.5px]">
                      {s.name}
                    </span>
                    {zones.length > 0 && (
                      <select
                        value={s.zoneId ?? ""}
                        onChange={(e) =>
                          patchSection(s.id, { zoneId: e.target.value || null })
                        }
                        aria-label={`Zone for section "${s.name}"`}
                        className="rounded-xl border-[1.5px] border-line bg-surface px-2 py-1.5 text-[12.5px] text-muted outline-none focus:border-accent"
                      >
                        <option value="">no zone</option>
                        {zones.map((z: Zone) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove section "${s.name}"`}
                      onClick={() => removeSection(s.id)}
                      className={`${iconBtn} hover:text-ember`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <AddChipInput placeholder="new section…" onAdd={addSection} />
              </div>
            </div>

            {sections.length > 0 && (
              <div>
                <span className="label mb-2 block">Which section is each group in?</span>
                <div className="flex flex-col gap-1.5">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{g.name}</span>
                      <select
                        value={groupSections[g.id] ?? ""}
                        onChange={(e) => assignGroup(g.id, e.target.value)}
                        aria-label={`Section for ${g.name}`}
                        className="rounded-xl border-[1.5px] border-line bg-surface px-2 py-1.5 text-[12.5px] text-muted outline-none focus:border-accent"
                      >
                        <option value="">no section</option>
                        {sections.map((s: Section) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
