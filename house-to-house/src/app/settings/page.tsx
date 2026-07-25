"use client";

// Church configuration: tag categories, check-in pulse vocabulary, the guest
// follow-up road, engagement tier names, and zones & sections. Everything saves
// to the church's settings, so this is also where another church would make
// House to House theirs.

import { useEffect, useRef, useState } from "react";
import type { EngagementTier, Milestone, ReportEmailConfig, Section, Zone } from "@/lib/types";
import { TIERS, TIER_MEANING } from "@/lib/data";
import { isEmail } from "@/lib/report-email";
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

/** One "who gets this level's reports" row: chips plus an add field. */
function EmailList({
  label,
  hint,
  emails,
  onChange,
}: {
  label: string;
  hint?: string;
  emails: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [bad, setBad] = useState(false);
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    if (!isEmail(v)) {
      setBad(true);
      return;
    }
    onChange([...emails, v]);
    setDraft("");
    setBad(false);
  };
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
        <span className="text-[13px] font-semibold">{label}</span>
        {hint && <span className="text-[10.5px] text-faint">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {emails.map((e) => (
          <button
            key={e}
            type="button"
            title={`Remove ${e}`}
            onClick={() => onChange(emails.filter((x) => x !== e))}
            className="group rounded-full border border-line px-2.5 py-1 text-[12px] text-muted hover:border-ember hover:text-ember"
          >
            {e} <span className="opacity-40 group-hover:opacity-100">✕</span>
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          type="email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setBad(false);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="name@church.org"
          aria-label={`Add an email for ${label}`}
          className={`${inputCls} min-w-0 flex-1 ${bad ? "border-ember" : ""}`}
        />
        <button
          type="button"
          onClick={commit}
          className="rounded-xl border-[1.5px] border-line px-3 py-2 text-[12.5px] font-semibold text-muted hover:border-accent hover:text-accent-ink"
        >
          Add
        </button>
      </div>
      {bad && <p className="mt-1 text-[11.5px] text-ember">That doesn&apos;t look like an email address.</p>}
    </div>
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

/**
 * Warns when alert email isn't configured. Requests still queue without it,
 * but nobody is told — a failure mode that is completely invisible from the
 * app otherwise, which is exactly how a leader ends up waiting on an approval
 * nobody knows about.
 */
function EmailConfigWarning() {
  const [missing, setMissing] = useState<string[] | null>(null);
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/alert-status");
        if (!res.ok) return;
        const data = (await res.json()) as { configured: boolean; missing: string[] };
        if (!data.configured) setMissing(data.missing);
      } catch {
        // Can't tell — say nothing rather than cry wolf.
      }
    })();
  }, []);

  if (!missing?.length) return null;
  return (
    <div className="mb-5 rounded-xl border-[1.5px] border-ember bg-ember-soft p-3">
      <div className="label mb-1 text-ember">Nobody is being emailed</div>
      <p className="text-[12px] leading-relaxed text-ember">
        Requests still collect below, but no alert goes out — {missing.join(", ")}{" "}
        {missing.length === 1 ? "is" : "are"} missing from this deployment&apos;s
        environment variables. Add {missing.length === 1 ? "it" : "them"} in Vercel and
        redeploy.
      </p>
    </div>
  );
}

/**
 * The shareable sign-up link. A link nobody can find is a link nobody sends,
 * so it lives right above the queue it feeds. The origin is read lazily on the
 * client (it's a browser-only value); suppressHydrationWarning covers the one
 * frame where the server rendered an empty string.
 */
function JoinLinkBlock() {
  const [copied, setCopied] = useState(false);
  // The origin is a browser-only value, and this page is server-rendered
  // first, so it can't come from render or from state (React keeps the
  // server's HTML through hydration). Writing it to the DOM once mounted is
  // exactly the "sync an external system" case effects exist for.
  const codeRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (codeRef.current) codeRef.current.textContent = `${window.location.origin}/join`;
  }, []);
  const fullUrl = () =>
    typeof window === "undefined" ? "/join" : `${window.location.origin}/join`;

  return (
    <div className="mb-5 rounded-xl border-[1.5px] border-accent bg-accent-soft p-3">
      <div className="label mb-1.5">Your sign-up link</div>
      <p className="mb-2.5 text-[12px] leading-relaxed text-muted">
        Send this to lifegroup leaders. They pick the group they lead, verify their
        email, and land in the queue below for you to approve. It grants nothing on its
        own, so it&apos;s safe to post in a group chat.
      </p>
      <div className="flex items-center gap-2">
        <code
          ref={codeRef}
          suppressHydrationWarning
          className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-2.5 py-2 text-[12.5px]"
        >
          /join
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(fullUrl());
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard blocked (insecure origin / permissions) — the link is
              // on screen to copy by hand.
            }
          }}
          className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-semibold text-cta-ink"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/** Rename the church - shown under "House to House" in the top-left wordmark. */
function ChurchNameCard({
  churchName,
  onSave,
}: {
  churchName: string;
  onSave: (name: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState(churchName);
  const [saved, setSaved] = useState(false);
  const dirty = draft.trim() !== churchName && draft.trim().length > 0;
  return (
    <SectionCard
      title="Church name"
      blurb="Shown under “House to House” in the top-left, and wherever the app greets your church by name."
    >
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
          }}
          aria-label="Church name"
          className={`${inputCls} min-w-0 flex-1`}
        />
        <button
          type="button"
          disabled={!dirty}
          onClick={async () => {
            const err = await onSave(draft);
            if (!err) setSaved(true);
          }}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-[13.5px] font-semibold text-cta-ink disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {saved && !dirty && (
        <p className="mt-2 text-[12px] text-accent-ink">✓ Saved. It updates everywhere at once.</p>
      )}
    </SectionCard>
  );
}

/** One zone or section, with whoever oversees it. */
function OversightPicker({
  label,
  hint,
  leaders,
  candidates,
  onAdd,
  onRemove,
}: {
  label: string;
  hint: string;
  leaders: { id: string; name: string }[];
  candidates: { id: string; name: string }[];
  onAdd: (personId: string) => void;
  onRemove: (personId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[13.5px] font-semibold">{label}</span>
        <span className="shrink-0 text-[11.5px] text-faint">{hint}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {leaders.length === 0 && (
          <span className="text-[12px] italic text-muted">nobody yet</span>
        )}
        {leaders.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onRemove(l.id)}
            aria-label={`Remove ${l.name} from ${label}`}
            className="group rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent-ink"
          >
            {l.name} <span className="opacity-40 group-hover:opacity-100">✕</span>
          </button>
        ))}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onAdd(e.target.value);
          }}
          aria-label={`Add a leader for ${label}`}
          className="rounded-xl border-[1.5px] border-line bg-surface px-2 py-1 text-[12.5px] text-muted outline-none focus:border-accent"
        >
          <option value="">+ add leader…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
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
    roadmapSteps,
    saveRoadmap,
    tierLabels,
    saveTierLabels,
    roles,
    saveRoles,
    people,
    zones,
    sections,
    groupSections,
    saveZoning,
    reportEmails,
    saveReportEmails,
    accessAlerts,
    saveAccessAlerts,
    accessRequests,
    accessRequestsError,
    staffMismatch,
    resolveAccessRequest,
    approveJoinRequest,
    setAccess,
    oversightLeaders,
    setOversight,
    churchName,
    saveChurchName,
  } = useData();
  const [newCat, setNewCat] = useState("");
  const [newCatMulti, setNewCatMulti] = useState(true);
  const [newRole, setNewRole] = useState("");
  const [newRoleLead, setNewRoleLead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** requestId → who we just emailed, for immediate confirmation. */
  const [notified, setNotified] = useState<Record<string, string>>({});

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

  /* ----- Discipleship Roadmap helpers ----- */
  const moveRoadmap = (i: number, dir: -1 | 1) => {
    const next = [...roadmapSteps];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    void act(() => saveRoadmap(next));
  };
  const addRoadmap = (label: string) => {
    const key = slugId(label, roadmapSteps.map((s) => s.key));
    void act(() => saveRoadmap([...roadmapSteps, { key, label }]));
  };
  const renameRoadmap = (key: string, label: string) =>
    void act(() => saveRoadmap(roadmapSteps.map((s) => (s.key === key ? { ...s, label } : s))));
  const removeRoadmap = (key: string) =>
    void act(() => saveRoadmap(roadmapSteps.filter((s) => s.key !== key)));

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

  /* ----- Oversight (section / zone leaders) helpers ----- */
  const leadersFor = (scope: "zone" | "section", scopeId: string) =>
    oversightLeaders.filter((o) => o.scope === scope && o.scopeId === scopeId);
  const groupCountIn = (scope: "zone" | "section", scopeId: string) =>
    groups.filter((g) => {
      const sectionId = groupSections[g.id];
      if (!sectionId) return false;
      if (scope === "section") return sectionId === scopeId;
      return sections.find((s: Section) => s.id === sectionId)?.zoneId === scopeId;
    }).length;

  /* ----- Access request helpers ----- */
  // Alerts fire once, when someone gets stuck. If email wasn't configured yet,
  // this is how a queued request gets its notification without asking the
  // person to sign up all over again.
  const notifyNow = async (requestId: string) => {
    setError(null);
    try {
      const res = await fetch("/api/notify-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = (await res.json()) as { sent?: number; to?: string[]; error?: string };
      if (!res.ok || !data.sent) {
        setError(data.error ?? "Couldn't send that notification.");
      } else {
        setError(null);
        setNotified((prev) => ({ ...prev, [requestId]: (data.to ?? []).join(", ") }));
      }
    } catch {
      setError("Couldn't reach the server to send that notification.");
    }
  };

  const patchAlerts = (patch: Partial<typeof accessAlerts>) =>
    void act(() => saveAccessAlerts({ ...accessAlerts, ...patch }));
  const toggleAdmin = (personId: string) =>
    patchAlerts({
      admins: accessAlerts.admins.includes(personId)
        ? accessAlerts.admins.filter((id) => id !== personId)
        : [...accessAlerts.admins, personId],
    });
  // Only people who can already see the whole church make sense as admins -
  // these alerts point at People, which is a staff page.
  const adminCandidates = people.filter((p) => p.access === "staff" && p.email);
  // Match a waiting address to a person record so the row can offer the grant
  // outright, instead of sending staff off to find them by hand.
  const personForRequest = (email: string) =>
    people.find((p) => (p.email ?? "").trim().toLowerCase() === email.trim().toLowerCase());

  /* ----- Emailed reports helpers ----- */
  const patchReports = (patch: Partial<ReportEmailConfig>) =>
    void act(() => saveReportEmails({ ...reportEmails, ...patch }));
  const patchReportMap = (
    level: "zones" | "sections" | "groups",
    id: string,
    next: string[],
  ) => patchReports({ [level]: { ...reportEmails[level], [id]: next } } as Partial<ReportEmailConfig>);

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

      {/* The app says staff, the database says otherwise. Everything protected
          reads back empty until this is fixed, so it goes above everything. */}
      {staffMismatch && (
        <div className="mb-4 max-w-[640px] rounded-xl border-[1.5px] border-ember bg-ember-soft p-3.5">
          <div className="label mb-1 text-ember">Your staff access is only half applied</div>
          <p className="text-[12.5px] leading-relaxed text-ember">
            You can see the staff screens, but the database still has this login as a
            leader — so anything protected (the access-request queue, guest follow-up,
            saving settings) comes back empty or refuses, with no error. Run{" "}
            <code>supabase/migration-staff-alignment.sql</code> in the Supabase SQL
            Editor, then reload.
          </p>
        </div>
      )}

      <div className="flex max-w-[640px] flex-col gap-5">
        <ChurchNameCard churchName={churchName} onSave={saveChurchName} />

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
              The milestone steps a guest might walk - rename, reorder, add, or remove
              freely. They just track what&apos;s happened; graduation is a separate staff
              decision on the Follow-up page.
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
                  disabled={milestones.length === 1}
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
          title="Discipleship Roadmap"
          blurb="The formation ladder each disciple walks - testimony, baptism, membership, making their first disciple. Set per person on their profile; rename or reorder the rungs here."
        >
          <div className="flex flex-col gap-1">
            {roadmapSteps.map((s, i) => (
              <div
                key={s.key}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5"
              >
                <span className="w-5 text-center text-[11px] font-semibold text-faint">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <CommitInput
                    value={s.label}
                    ariaLabel={`Roadmap step ${i + 1}`}
                    onCommit={(v) => renameRoadmap(s.key, v)}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Move "${s.label}" earlier`}
                  disabled={i === 0}
                  onClick={() => moveRoadmap(i, -1)}
                  className={iconBtn}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move "${s.label}" later`}
                  disabled={i === roadmapSteps.length - 1}
                  onClick={() => moveRoadmap(i, 1)}
                  className={iconBtn}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove "${s.label}"`}
                  disabled={roadmapSteps.length === 1}
                  onClick={() => removeRoadmap(s.key)}
                  className={`${iconBtn} hover:text-ember`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2.5">
            <AddChipInput placeholder="new rung…" onAdd={addRoadmap} />
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
          title="Lifegroup roles"
          blurb="The roles people can hold inside a group. Rename them, toggle whether a role is leadership (leadership roles form the leadership team and can run check-ins), or add your own - Co-leader, Host, Prayer lead, whatever fits."
        >
          <div className="flex flex-col gap-2.5">
            {roles.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2.5"
              >
                <div className="min-w-[140px] flex-1">
                  <CommitInput
                    value={r.label}
                    placeholder="Role name"
                    ariaLabel={`Name for the "${r.label}" role`}
                    onCommit={(v) =>
                      void act(() =>
                        saveRoles(roles.map((x) => (x.id === r.id ? { ...x, label: v } : x))),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void act(() =>
                      saveRoles(
                        roles.map((x) =>
                          x.id === r.id ? { ...x, leadership: !x.leadership } : x,
                        ),
                      ),
                    )
                  }
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${
                    r.leadership
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-line text-muted"
                  }`}
                  title="Leadership roles form the leadership team and can run check-ins"
                >
                  {r.leadership ? "✓ leadership" : "leadership"}
                </button>
                {r.builtin ? (
                  <span className="text-[10.5px] text-faint">built-in</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const inUse = people.some((p) => p.role === r.id);
                      if (inUse) {
                        setError(
                          `Move anyone still set as "${r.label}" to another role before removing it.`,
                        );
                        return;
                      }
                      void act(() => saveRoles(roles.filter((x) => x.id !== r.id)));
                    }}
                    aria-label={`Remove the "${r.label}" role`}
                    className="text-[12px] text-faint hover:text-ember"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="e.g. Co-leader"
              className={`${inputCls} min-w-0 flex-1`}
              aria-label="New role name"
            />
            <button
              type="button"
              onClick={() => setNewRoleLead(!newRoleLead)}
              className={`rounded-xl border-[1.5px] px-3 py-2 text-[12.5px] font-medium ${
                newRoleLead ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-muted"
              }`}
            >
              {newRoleLead ? "leadership" : "member-level"}
            </button>
            <button
              type="button"
              onClick={() => {
                const label = newRole.trim();
                if (!label) return;
                if (roles.some((x) => x.label.toLowerCase() === label.toLowerCase())) {
                  setError("That role already exists.");
                  return;
                }
                const id = slugId(label, roles.map((x) => x.id));
                void act(async () => {
                  const err = await saveRoles([
                    ...roles,
                    { id, label, leadership: newRoleLead },
                  ]);
                  if (!err) {
                    setNewRole("");
                    setNewRoleLead(false);
                  }
                  return err;
                });
              }}
              className="rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-cta-ink"
            >
              Add role
            </button>
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
                  No sections yet - add one and the map starts clustering.
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

            {(zones.length > 0 || sections.length > 0) && (
              <div>
                <span className="label mb-2 block">Who oversees what</span>
                <p className="mb-2.5 text-[12px] leading-relaxed text-faint">
                  A section leader gets, for every lifegroup in their section, exactly what
                  a lifegroup leader gets for their own: the roster, editing its members,
                  the monthly check-in, and the MVP board. A zone leader gets that across
                  every section in the zone. They still need Leader app access to sign in.
                </p>
                <div className="flex flex-col gap-1.5">
                  {zones.map((z: Zone) => {
                    const assigned = leadersFor("zone", z.id);
                    const n = groupCountIn("zone", z.id);
                    return (
                      <OversightPicker
                        key={z.id}
                        label={z.name}
                        hint={`zone · ${n} ${n === 1 ? "group" : "groups"}`}
                        leaders={assigned.map((o) => ({
                          id: o.personId,
                          name: people.find((p) => p.id === o.personId)?.name ?? "someone",
                        }))}
                        candidates={people
                          .filter(
                            (p) => !p.isChild && !assigned.some((o) => o.personId === p.id),
                          )
                          .map((p) => ({ id: p.id, name: p.name }))}
                        onAdd={(pid) => void act(() => setOversight(pid, "zone", z.id, true))}
                        onRemove={(pid) =>
                          void act(() => setOversight(pid, "zone", z.id, false))
                        }
                      />
                    );
                  })}
                  {sections.map((s: Section) => {
                    const assigned = leadersFor("section", s.id);
                    const n = groupCountIn("section", s.id);
                    return (
                      <OversightPicker
                        key={s.id}
                        label={s.name}
                        hint={`section · ${n} ${n === 1 ? "group" : "groups"}`}
                        leaders={assigned.map((o) => ({
                          id: o.personId,
                          name: people.find((p) => p.id === o.personId)?.name ?? "someone",
                        }))}
                        candidates={people
                          .filter(
                            (p) => !p.isChild && !assigned.some((o) => o.personId === p.id),
                          )
                          .map((p) => ({ id: p.id, name: p.name }))}
                        onAdd={(pid) => void act(() => setOversight(pid, "section", s.id, true))}
                        onRemove={(pid) =>
                          void act(() => setOversight(pid, "section", s.id, false))
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Access requests"
          blurb="Leaders who sign up at your /join link land here to be approved, as does anyone who signs in but can't get anywhere yet. The app emails whoever you name below - once per person, not once per visit."
        >
          <EmailConfigWarning />

          {accessRequestsError && (
            <div className="mb-5 rounded-xl border-[1.5px] border-ember bg-ember-soft p-3">
              <div className="label mb-1 text-ember">Couldn&apos;t load the queue</div>
              <p className="text-[12px] leading-relaxed text-ember">{accessRequestsError}</p>
            </div>
          )}

          <JoinLinkBlock />

          {accessRequests.length > 0 && (
            <div className="mb-5 rounded-xl border-[1.5px] border-gold bg-gold-soft p-3">
              <div className="label mb-2">
                Waiting on you ({accessRequests.length})
              </div>
              <div className="flex flex-col gap-2">
                {accessRequests.map((r) => {
                  const match = personForRequest(r.email);
                  // A self-service join carries the name they typed and the
                  // group they say they lead; it may also point at an existing
                  // person (same email — the "member asked to lead" case).
                  if (r.kind === "join") {
                    const typed = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
                    const matchName = r.matchedPersonId
                      ? people.find((p) => p.id === r.matchedPersonId)?.name
                      : undefined;
                    const groupLabel = r.requestedGroupId
                      ? (groups.find((g) => g.id === r.requestedGroupId)?.name ??
                        "a group that no longer exists")
                      : r.requestedGroupNote || "a group they didn't pick from the list";
                    return (
                      <div key={r.id} className="rounded-xl border border-line bg-surface px-3 py-2.5">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-[13.5px] font-semibold">{typed || r.email}</span>
                          <span className="text-[12px] text-muted">{r.email}</span>
                          <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-ink">
                            wants to join
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                          Says they lead <strong>{groupLabel}</strong>.
                          {matchName && (
                            <>
                              {" "}
                              Looks like <strong>{matchName}</strong> is already in your
                              directory with this email.
                            </>
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {matchName ? (
                            <>
                              <button
                                onClick={() =>
                                  void act(() => approveJoinRequest(r.id, r.matchedPersonId ?? null))
                                }
                                className="rounded-lg bg-accent px-2.5 py-1 text-[12px] font-semibold text-cta-ink"
                              >
                                Approve as {matchName.split(" ")[0]}
                              </button>
                              <button
                                onClick={() => void act(() => approveJoinRequest(r.id, null))}
                                className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold text-muted hover:border-accent hover:text-accent-ink"
                              >
                                They&apos;re someone new
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => void act(() => approveJoinRequest(r.id, null))}
                              className="rounded-lg bg-accent px-2.5 py-1 text-[12px] font-semibold text-cta-ink"
                            >
                              Approve &amp; add to their group
                            </button>
                          )}
                          <button
                            onClick={() => void act(() => resolveAccessRequest(r.id))}
                            className="text-[12px] text-faint underline-offset-2 hover:text-ink hover:underline"
                          >
                            dismiss
                          </button>
                          {notified[r.id] ? (
                            <span className="ml-auto text-[11px] text-accent-ink">
                              ✓ emailed {notified[r.id]}
                            </span>
                          ) : (
                            !r.notifiedAt && (
                              <button
                                onClick={() => void notifyNow(r.id)}
                                className="ml-auto text-[11px] text-faint underline-offset-2 hover:text-accent-ink hover:underline"
                              >
                                not emailed - notify now
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-line bg-surface px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[13.5px] font-semibold">
                          {match ? match.name : r.email}
                        </span>
                        {match && (
                          <span className="text-[12px] text-muted">{r.email}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                        {r.kind === "no-access"
                          ? match
                            ? "Signed in, but their App access is still None."
                            : "Signed in, but no person record carries that email. Add them in People first."
                          : "Has access, but no lifegroup roster with a leader role."}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {r.kind === "no-access" && match && (
                          <>
                            <button
                              onClick={() => void act(() => setAccess(match.id, "leader"))}
                              className="rounded-lg bg-accent px-2.5 py-1 text-[12px] font-semibold text-cta-ink"
                            >
                              Grant Leader
                            </button>
                            <button
                              onClick={() => void act(() => setAccess(match.id, "staff"))}
                              className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold text-muted hover:border-accent hover:text-accent-ink"
                            >
                              Grant Staff
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => void act(() => resolveAccessRequest(r.id))}
                          className="text-[12px] text-faint underline-offset-2 hover:text-ink hover:underline"
                        >
                          dismiss
                        </button>
                        {notified[r.id] ? (
                          <span className="ml-auto text-[11px] text-accent-ink">
                            ✓ emailed {notified[r.id]}
                          </span>
                        ) : (
                          !r.notifiedAt && (
                            <button
                              onClick={() => void notifyNow(r.id)}
                              className="ml-auto text-[11px] text-faint underline-offset-2 hover:text-accent-ink hover:underline"
                            >
                              not emailed - notify now
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={accessAlerts.enabled}
            onClick={() => patchAlerts({ enabled: !accessAlerts.enabled })}
            className={`mb-4 flex w-full items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-2.5 text-left ${
              accessAlerts.enabled ? "border-accent bg-accent-soft" : "border-line bg-surface"
            }`}
          >
            <span
              className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                accessAlerts.enabled ? "bg-accent" : "bg-surface-2"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-surface shadow-card transition-transform ${
                  accessAlerts.enabled ? "translate-x-4" : ""
                }`}
              />
            </span>
            <span className="text-[13.5px] font-semibold">
              {accessAlerts.enabled ? "Emailing access requests" : "Requests are queued only"}
            </span>
          </button>

          {accessAlerts.enabled && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="label mb-1.5">Admins</div>
                {adminCandidates.length === 0 ? (
                  <p className="text-[12px] leading-relaxed text-faint">
                    Nobody with Staff access has an email on file yet. Until then these
                    alerts go to every Staff-access person who has one.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {adminCandidates.map((p) => {
                      const on = accessAlerts.admins.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleAdmin(p.id)}
                          className={`flex items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2 text-left text-[13.5px] ${
                            on ? "border-accent bg-accent-soft" : "border-line bg-surface"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-bold ${
                              on ? "bg-accent text-cta-ink" : "border-[1.5px] border-line text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                          <span className="shrink-0 text-[11.5px] text-faint">{p.email}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
                  {accessAlerts.admins.length === 0
                    ? "None picked, so every Staff-access person hears about it. Pick someone to narrow it down."
                    : "Only the people ticked above get these emails."}
                </p>
              </div>

              <EmailList
                label="Also email"
                hint="a shared inbox, or someone with no person record"
                emails={accessAlerts.extra}
                onChange={(next) => patchAlerts({ extra: next })}
              />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Emailed reports"
          blurb="Check-ins are always saved here. Turn this on to also email each one out. Recipients stack: a group's report goes to its own list, its section's, its zone's, and the church-wide list."
        >
          <button
            type="button"
            role="switch"
            aria-checked={reportEmails.enabled}
            onClick={() => patchReports({ enabled: !reportEmails.enabled })}
            className={`mb-4 flex w-full items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-2.5 text-left ${
              reportEmails.enabled
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface"
            }`}
          >
            <span
              className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                reportEmails.enabled ? "bg-accent" : "bg-surface-2"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-surface shadow-card transition-transform ${
                  reportEmails.enabled ? "translate-x-4" : ""
                }`}
              />
            </span>
            <span className="text-[13.5px] font-semibold">
              {reportEmails.enabled ? "Emailing reports" : "Reports are saved only"}
            </span>
          </button>

          {reportEmails.enabled && (
            <div className="flex flex-col gap-5">
              <EmailList
                label="Church-wide"
                hint="gets every group's report"
                emails={reportEmails.church}
                onChange={(next) => patchReports({ church: next })}
              />

              {zones.map((z: Zone) => (
                <EmailList
                  key={z.id}
                  label={z.name}
                  hint="zone - every group in its sections"
                  emails={reportEmails.zones[z.id] ?? []}
                  onChange={(next) => patchReportMap("zones", z.id, next)}
                />
              ))}

              {sections.map((s: Section) => (
                <EmailList
                  key={s.id}
                  label={s.name}
                  hint="section"
                  emails={reportEmails.sections[s.id] ?? []}
                  onChange={(next) => patchReportMap("sections", s.id, next)}
                />
              ))}

              <details className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <summary className="cursor-pointer text-[13px] font-semibold">
                  A single group&apos;s own recipients
                </summary>
                <div className="mt-3 flex flex-col gap-4">
                  {groups.map((g) => (
                    <EmailList
                      key={g.id}
                      label={g.name}
                      emails={reportEmails.groups[g.id] ?? []}
                      onChange={(next) => patchReportMap("groups", g.id, next)}
                    />
                  ))}
                </div>
              </details>

              {zones.length === 0 && sections.length === 0 && (
                <p className="text-[12px] leading-relaxed text-faint">
                  Add zones and sections above to route reports to section leaders instead
                  of sending everything to one inbox.
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
