"use client";

// Church configuration: tag categories (and their options) and the check-in
// pulse vocabulary. Everything saves to the church's settings, so this is also
// where another church would make House to House theirs.

import { useState } from "react";
import { useData } from "@/lib/store";

const inputCls =
  "rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-[14.5px] max-md:text-[16px] outline-none focus:border-accent";

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
      className="w-[130px] rounded-full border border-accent bg-surface px-2.5 py-1 text-[12px] max-md:text-[16px] outline-none"
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

export default function SettingsPage() {
  const { ready, role, tagCategories, addTagOption, addTagCategory, pulseWords, savePulseWords } =
    useData();
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

  return (
    <>
      <div className="mb-6 max-w-[640px]">
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
        <section className="rise rounded-[14px] border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-1 text-[18px]">Lifegroup tags</h2>
          <p className="mb-4 text-[13px] text-muted">
            The categories and options offered when tagging a group. Options you add while
            tagging land here too.
          </p>
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
        </section>

        <section className="rise rounded-[14px] border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-1 text-[18px]">Check-in pulse words</h2>
          <p className="mb-3 text-[13px] text-muted">
            The words leaders pick from when asked &quot;How has the group been
            feeling?&quot; Tap one to remove it.
          </p>
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
        </section>

        <p className="text-[12px] leading-relaxed text-faint">
          Coming later: follow-up milestone steps, engagement tier names, and zones &amp;
          sections for churches that grow into them.
        </p>
      </div>
    </>
  );
}
