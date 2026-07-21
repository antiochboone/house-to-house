"use client";

// Add-flows for M2 hand entry: new lifegroup, new person, new discipleship
// relationship. Built for speed of entry — Hunter is typing in a whole church.

import { useState, type ReactNode } from "react";
import type {
  AppAccess,
  DiscipleshipStatus,
  Gender,
  Group,
  MemberRole,
  Person,
  Season,
} from "@/lib/types";
import {
  GROUP_EVENT_KINDS,
  READINESS_LEADERSHIP,
  READINESS_READINESS,
  SELECTABLE_STATUSES,
  STATUS_LABEL,
} from "@/lib/data";
import { useData, makeHelpers } from "@/lib/store";
import { useScrollLock } from "@/lib/use-scroll-lock";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useScrollLock(true);
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 top-[8vh] z-[70] mx-auto max-h-[84vh] w-[440px] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-[14px] border border-line bg-bg p-6 max-md:top-[4vh] max-md:max-h-[90vh] max-md:p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-0.5 text-lg text-muted hover:bg-surface-2"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-[14.5px] max-md:text-[16px] outline-none focus:border-accent";
const labelCls = "label mb-1.5 mt-3.5 block first:mt-0";

function SubmitRow({
  busy,
  error,
  label,
}: {
  busy: boolean;
  error: string | null;
  label: string;
}) {
  return (
    <>
      {error && <p className="mt-3 text-[13px] text-ember">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-xl bg-accent py-2.5 text-[14.5px] font-semibold text-cta-ink disabled:opacity-50"
      >
        {busy ? "Saving…" : label}
      </button>
    </>
  );
}

const DAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const HOURS = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

/** Multi-select discipleship status chips; empty selection = "not yet invited". */
function StatusChips({
  statuses,
  setStatuses,
}: {
  statuses: DiscipleshipStatus[];
  setStatuses: (s: DiscipleshipStatus[]) => void;
}) {
  const toggle = (s: DiscipleshipStatus) =>
    setStatuses(
      statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s],
    );
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {SELECTABLE_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className={`rounded-full border px-2.5 py-1 text-[12px] ${
              statuses.includes(s)
                ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                : "border-line text-muted hover:border-accent"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {statuses.length === 0 && (
        <p className="mt-1.5 text-[11.5px] text-faint">Nothing picked = not yet invited.</p>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  tags,
  setTags,
}: {
  category: import("@/lib/types").TagCategory;
  tags: string[];
  setTags: (t: string[]) => void;
}) {
  const { addTagOption } = useData();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const toggle = (opt: string) => {
    const on = tags.some((t) => t.toLowerCase() === opt.toLowerCase());
    if (on) {
      setTags(tags.filter((t) => t.toLowerCase() !== opt.toLowerCase()));
    } else if (category.multi) {
      setTags([...tags, opt]);
    } else {
      // single-select: drop other options from this category, add this one
      const others = tags.filter(
        (t) => !category.options.some((o) => o.toLowerCase() === t.toLowerCase()),
      );
      setTags([...others, opt]);
    }
  };

  const commitAdd = async () => {
    const clean = draft.trim();
    setAdding(false);
    setDraft("");
    if (!clean) return;
    await addTagOption(category.id, clean);
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      if (category.multi) setTags([...tags, clean]);
      else {
        const others = tags.filter(
          (t) => !category.options.some((o) => o.toLowerCase() === t.toLowerCase()),
        );
        setTags([...others, clean]);
      }
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[12px] font-semibold text-ink">{category.label}</span>
        {!category.multi && <span className="text-[10.5px] text-faint">pick one</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {category.options.map((opt) => {
          const on = tags.some((t) => t.toLowerCase() === opt.toLowerCase());
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-2.5 py-1 text-[12px] ${
                on
                  ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                  : "border-line text-muted hover:border-accent"
              }`}
            >
              {opt}
            </button>
          );
        })}
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitAdd();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setDraft("");
              }
            }}
            onBlur={commitAdd}
            placeholder="new tag…"
            className="w-[110px] rounded-full border border-accent bg-surface px-2.5 py-1 text-[12px] max-md:text-[16px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-line px-2.5 py-1 text-[12px] text-faint hover:border-accent hover:text-accent-ink"
          >
            ＋ add
          </button>
        )}
      </div>
    </div>
  );
}

export function TagEditor({
  tags,
  setTags,
  startOpen = false,
}: {
  tags: string[];
  setTags: (t: string[]) => void;
  startOpen?: boolean;
}) {
  const { tagCategories } = useData();
  const [open, setOpen] = useState(startOpen);

  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-[10px] text-faint">{open ? "▾" : "▸"}</span>
        <span className="text-[13px] font-medium">Tags</span>
        {!open && tags.length > 0 ? (
          <span className="ml-1 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                {t}
              </span>
            ))}
          </span>
        ) : (
          !open && <span className="text-[12px] text-faint">none yet — click to add</span>
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
          {tagCategories.map((c) => (
            <CategoryRow key={c.id} category={c} tags={tags} setTags={setTags} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AddGroupForm({ onDone }: { onDone: () => void }) {
  const { addGroup } = useData();
  const [name, setName] = useState("");
  const [season, setSeason] = useState<Season>("start");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("30");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const [place, setPlace] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await addGroup({
      name: name.trim(),
      season,
      meetingDay: day,
      meetingTime: hour ? `${hour}:${minute} ${ampm}` : "",
      meetingPlace: place.trim(),
      tags,
    });
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <form onSubmit={submit}>
      <label className={labelCls}>Group name</label>
      <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="King Street" />
      <label className={labelCls}>Season</label>
      <select value={season} onChange={(e) => setSeason(e.target.value as Season)} className={inputCls}>
        <option value="start">Starting Up</option>
        <option value="build">Thriving</option>
        <option value="plant">Multiplying</option>
        <option value="stagnant">Stagnant</option>
      </select>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Day</label>
          <select value={day} onChange={(e) => setDay(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Time</label>
          <div className="flex gap-1.5">
            <select value={hour} onChange={(e) => setHour(e.target.value)} className={inputCls} aria-label="Hour">
              {HOURS.map((h) => (
                <option key={h} value={h}>{h || "—"}</option>
              ))}
            </select>
            <select value={minute} onChange={(e) => setMinute(e.target.value)} className={inputCls} aria-label="Minute">
              {MINUTES.map((m) => (
                <option key={m} value={m}>:{m}</option>
              ))}
            </select>
            <select value={ampm} onChange={(e) => setAmpm(e.target.value as "AM" | "PM")} className={inputCls} aria-label="AM or PM">
              <option value="PM">PM</option>
              <option value="AM">AM</option>
            </select>
          </div>
        </div>
      </div>
      <label className={labelCls}>Where</label>
      <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} placeholder="downtown Boone" />
      <div className="mt-3.5">
        <TagEditor tags={tags} setTags={setTags} />
      </div>
      <SubmitRow busy={busy} error={error} label="Add lifegroup" />
    </form>
  );
}

/** Role-in-group dropdown using the church's configurable roles. Member first,
 * then the rest in configured order. */
function RoleSelect({
  value,
  onChange,
}: {
  value: MemberRole;
  onChange: (r: MemberRole) => void;
}) {
  const { roles } = useData();
  const ordered = [
    ...roles.filter((r) => r.id === "member"),
    ...roles.filter((r) => r.id !== "member"),
  ];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MemberRole)}
      className={inputCls}
    >
      {ordered.map((r) => (
        <option key={r.id} value={r.id}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

export function AddPersonForm({
  defaultGroupId,
  onDone,
}: {
  defaultGroupId?: string | null;
  onDone: () => void;
}) {
  const { addPerson, groups } = useData();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [gender, setGender] = useState<Gender>("M");
  const [isChild, setIsChild] = useState(false);
  const [groupId, setGroupId] = useState<string>(defaultGroupId ?? "");
  const [role, setRole] = useState<MemberRole>("member");
  const [statuses, setStatuses] = useState<DiscipleshipStatus[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await addPerson({
      firstName: first.trim(),
      lastName: last.trim(),
      gender,
      isChild,
      email: email.trim(),
      phone: phone.trim(),
      groupId: groupId || null,
      role,
      statuses,
    });
    setBusy(false);
    if (err) {
      setError(err);
    } else {
      // Stay open for rapid entry — clear the name, keep group/gender context.
      setSavedName(`${first.trim()} ${last.trim()}`.trim());
      setFirst("");
      setLast("");
      setEmail("");
      setPhone("");
      setRole("member");
      setStatuses([]);
      setError(null);
    }
  };

  return (
    <form onSubmit={submit}>
      {savedName && (
        <p className="mb-2 rounded-lg bg-accent-soft px-3 py-1.5 text-[12.5px] text-accent-ink">
          ✓ Added {savedName} — add another, or close.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>First name</label>
          <input required autoFocus value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last name</label>
          <input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} />
        </div>
      </div>
      <label className={labelCls}>Who is this?</label>
      <div className="flex gap-2">
        {(["M", "F"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            className={`flex-1 rounded-xl border-[1.5px] py-2 text-[14px] font-medium ${
              gender === g
                ? g === "M"
                  ? "border-men bg-men-soft text-men-ink"
                  : "border-women bg-women-soft text-women-ink"
                : "border-line text-muted"
            }`}
          >
            {g === "M" ? (isChild ? "Boy" : "Man") : isChild ? "Girl" : "Woman"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsChild(!isChild)}
          className={`rounded-xl border-[1.5px] px-3.5 py-2 text-[14px] font-medium ${
            isChild ? "border-gold bg-gold-soft text-gold" : "border-line text-muted"
          }`}
        >
          Child
        </button>
      </div>
      <label className={labelCls}>Lifegroup</label>
      <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputCls}>
        <option value="">Not in a lifegroup yet</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      {groupId && (
        <>
          <label className={labelCls}>Role in group</label>
          <RoleSelect value={role} onChange={setRole} />
        </>
      )}
      <label className={labelCls}>Discipleship (pick any that apply)</label>
      <StatusChips statuses={statuses} setStatuses={setStatuses} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Email (optional)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone (optional)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>
      </div>
      <SubmitRow busy={busy} error={error} label="Add person" />
    </form>
  );
}

export function EditPersonForm({ person, onDone }: { person: Person; onDone: () => void }) {
  const { groups, people, updatePerson, deletePerson, endDiscipleship, setAccess, sendInvite } =
    useData();
  const [first, setFirst] = useState(person.firstName);
  const [last, setLast] = useState(person.lastName);
  const [gender, setGender] = useState<Gender>(person.gender);
  const [isChild, setIsChild] = useState(!!person.isChild);
  const [groupId, setGroupId] = useState<string>(person.groupId ?? "");
  const [role, setRole] = useState<MemberRole>(person.role === "staff" ? "member" : person.role);
  const [statuses, setStatuses] = useState<DiscipleshipStatus[]>(person.statuses);
  const [email, setEmail] = useState(person.email ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [access, setAccessLevel] = useState<AppAccess>(person.access ?? "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const discipler = person.discipledBy
    ? people.find((p) => p.id === person.discipledBy)
    : null;

  const persist = async (): Promise<string | null> => {
    let err = await updatePerson(person.id, {
      firstName: first.trim(),
      lastName: last.trim(),
      gender,
      isChild,
      email: email.trim(),
      phone: phone.trim(),
      groupId: groupId || null,
      role,
      statuses,
    });
    if (!err && access !== (person.access ?? "none")) {
      err = await setAccess(person.id, access);
    }
    return err;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (access !== "none" && !email.trim()) {
      setError("Add a sign-in email before granting app access.");
      return;
    }
    setBusy(true);
    const err = await persist();
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  // Save any pending changes, then email a sign-in link (invite).
  const saveAndInvite = async () => {
    if (!email.trim()) {
      setError("Add a sign-in email first.");
      return;
    }
    setBusy(true);
    setError(null);
    let err = await persist();
    if (!err) err = await sendInvite(email.trim());
    setBusy(false);
    if (err) setError(err);
    else setInvited(email.trim());
  };

  const remove = async () => {
    setBusy(true);
    const err = await deletePerson(person.id);
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>First name</label>
          <input required value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last name</label>
          <input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} />
        </div>
      </div>
      <label className={labelCls}>Who is this?</label>
      <div className="flex gap-2">
        {(["M", "F"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            className={`flex-1 rounded-xl border-[1.5px] py-2 text-[14px] font-medium ${
              gender === g
                ? g === "M"
                  ? "border-men bg-men-soft text-men-ink"
                  : "border-women bg-women-soft text-women-ink"
                : "border-line text-muted"
            }`}
          >
            {g === "M" ? (isChild ? "Boy" : "Man") : isChild ? "Girl" : "Woman"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsChild(!isChild)}
          className={`rounded-xl border-[1.5px] px-3.5 py-2 text-[14px] font-medium ${
            isChild ? "border-gold bg-gold-soft text-gold" : "border-line text-muted"
          }`}
        >
          Child
        </button>
      </div>
      <label className={labelCls}>Lifegroup</label>
      <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputCls}>
        <option value="">Not in a lifegroup</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      {groupId && (
        <>
          <label className={labelCls}>Role in group</label>
          <RoleSelect value={role} onChange={setRole} />
        </>
      )}
      <label className={labelCls}>Discipleship (pick any that apply)</label>
      {discipler && (
        <div className="mb-2 flex items-center justify-between rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-[13.5px]">
          <span>
            Discipled by <strong>{discipler.name}</strong>
          </span>
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              const err = await endDiscipleship(person.id);
              setBusy(false);
              if (err) setError(err);
              else onDone();
            }}
            className="text-[12px] text-ember hover:underline"
          >
            end relationship
          </button>
        </div>
      )}
      <StatusChips statuses={statuses} setStatuses={setStatuses} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setInvited(null);
            }}
            placeholder="name@email.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>
      </div>

      {!isChild && (
        <div className="mt-4 rounded-xl border border-dashed border-line p-3">
          <label className="label mb-1 block">App access</label>
          <div className="flex gap-1.5">
            {(
              [
                ["none", "No access"],
                ["leader", "Leader"],
                ["staff", "Staff"],
              ] as const
            ).map(([lvl, lbl]) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setAccessLevel(lvl)}
                className={`flex-1 rounded-xl border-[1.5px] py-2 text-[13px] font-medium ${
                  access === lvl
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-line text-muted"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-[11.5px] text-faint">
            {access === "none"
              ? "Signing in gets them nothing."
              : access === "leader"
                ? "Can sign in, see the church map, and check in for groups they lead."
                : "Full access, including People, Follow-up, and Settings."}
          </p>
          {access !== "none" && (
            <>
              {!email.trim() ? (
                <p className="mt-1.5 px-1 text-[11.5px] text-ember">
                  Add their email above — it&apos;s what they sign in with.
                </p>
              ) : invited ? (
                <p className="mt-2 rounded-lg bg-accent-soft px-2.5 py-1.5 text-[12px] text-accent-ink">
                  ✓ Sign-in link sent to {invited}. When {first.trim() || "they"} click it,
                  they&apos;re in.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={saveAndInvite}
                  disabled={busy}
                  className="mt-2 w-full rounded-xl border-[1.5px] border-accent py-2 text-[13px] font-semibold text-accent-ink disabled:opacity-50"
                >
                  {busy ? "Sending…" : `✉ Save & email a sign-in link`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <SubmitRow busy={busy} error={error} label="Save changes" />
      <div className="mt-3 text-center">
        {confirmDelete ? (
          <span className="text-[12.5px] text-muted">
            Really remove {person.firstName} entirely?{" "}
            <button type="button" onClick={remove} className="font-semibold text-ember hover:underline">
              yes, remove
            </button>{" "}
            ·{" "}
            <button type="button" onClick={() => setConfirmDelete(false)} className="hover:underline">
              cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-[12.5px] text-faint hover:text-ember hover:underline"
          >
            remove this person from the church records
          </button>
        )}
      </div>
    </form>
  );
}

function parseMeet(meet: string) {
  const dayMatch = DAYS.find((d) => meet.includes(d));
  const timeMatch = meet.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  const place = meet
    .split(" · ")
    .filter((part) => !DAYS.includes(part) && !/^\d{1,2}:\d{2}/.test(part))
    .join(" · ");
  return {
    day: dayMatch ?? "",
    hour: timeMatch ? timeMatch[1] : "",
    minute: timeMatch ? timeMatch[2] : "30",
    ampm: (timeMatch?.[3]?.toUpperCase() as "AM" | "PM") ?? "PM",
    place: place === "meeting time TBD" ? "" : place,
  };
}

export function EditGroupForm({ group, onDone }: { group: Group; onDone: () => void }) {
  const { groups, lanes, updateGroup, deleteGroup, setGroupOrigin, setGroupTags } = useData();
  const parsed = parseMeet(group.meet);
  const lane = lanes.find((l) => l.id === group.id);
  const [name, setName] = useState(group.name);
  const [season, setSeason] = useState<Season>(group.season);
  const [day, setDay] = useState(parsed.day);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState<"AM" | "PM">(parsed.ampm);
  const [place, setPlace] = useState(parsed.place);
  const [tags, setTags] = useState<string[]>(group.tags);
  const [plantedMonth, setPlantedMonth] = useState(lane?.segments[0]?.from ?? "");
  const [parentId, setParentId] = useState(lane?.parentId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let err = await updateGroup(group.id, {
      name: name.trim(),
      season,
      meetingDay: day,
      meetingTime: hour ? `${hour}:${minute} ${ampm}` : "",
      meetingPlace: place.trim(),
    });
    if (!err) err = await setGroupTags(group.id, tags);
    if (!err && plantedMonth) {
      err = await setGroupOrigin(group.id, plantedMonth, parentId || null);
    }
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  const remove = async () => {
    setBusy(true);
    const err = await deleteGroup(group.id);
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <form onSubmit={submit}>
      <label className={labelCls}>Group name</label>
      <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      <label className={labelCls}>Season</label>
      <select value={season} onChange={(e) => setSeason(e.target.value as Season)} className={inputCls}>
        <option value="start">Starting Up</option>
        <option value="build">Thriving</option>
        <option value="plant">Multiplying</option>
        <option value="stagnant">Stagnant</option>
      </select>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Day</label>
          <select value={day} onChange={(e) => setDay(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Time</label>
          <div className="flex gap-1.5">
            <select value={hour} onChange={(e) => setHour(e.target.value)} className={inputCls} aria-label="Hour">
              {HOURS.map((h) => (
                <option key={h} value={h}>{h || "—"}</option>
              ))}
            </select>
            <select value={minute} onChange={(e) => setMinute(e.target.value)} className={inputCls} aria-label="Minute">
              {MINUTES.map((m) => (
                <option key={m} value={m}>:{m}</option>
              ))}
            </select>
            <select value={ampm} onChange={(e) => setAmpm(e.target.value as "AM" | "PM")} className={inputCls} aria-label="AM or PM">
              <option value="PM">PM</option>
              <option value="AM">AM</option>
            </select>
          </div>
        </div>
      </div>
      <label className={labelCls}>Where</label>
      <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} />
      <div className="mt-3.5">
        <TagEditor tags={tags} setTags={setTags} />
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-line p-3">
        <span className="label mb-1 block">Origin story (for the timeline)</span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Planted (month)</label>
            <input
              type="month"
              value={plantedMonth}
              onChange={(e) => setPlantedMonth(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Planted from</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
              <option value="">— (original / direct plant)</option>
              {groups
                .filter((g) => g.id !== group.id)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
      <SubmitRow busy={busy} error={error} label="Save changes" />
      <div className="mt-3 text-center">
        {confirmDelete ? (
          <span className="text-[12.5px] text-muted">
            Really delete {group.name}? Its people become &quot;not in a lifegroup.&quot;{" "}
            <button type="button" onClick={remove} className="font-semibold text-ember hover:underline">
              yes, delete
            </button>{" "}
            ·{" "}
            <button type="button" onClick={() => setConfirmDelete(false)} className="hover:underline">
              cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-[12.5px] text-faint hover:text-ember hover:underline"
          >
            delete this group
          </button>
        )}
      </div>
    </form>
  );
}

export function GroupEventForm({ group, onDone }: { group: Group; onDone: () => void }) {
  const { groups, recordGroupEvent } = useData();
  const [kind, setKind] = useState<import("@/lib/types").GroupEventKind>("milestone");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState("");
  const [relatedGroupId, setRelatedGroupId] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heavy = kind === "dissolved" || kind === "merged";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === "merged" && !relatedGroupId) {
      setError("Pick the group they merged into.");
      return;
    }
    setBusy(true);
    const err = await recordGroupEvent({
      groupId: group.id,
      kind,
      month,
      notes: notes.trim(),
      relatedGroupId: relatedGroupId || undefined,
      newName: newName.trim() || undefined,
    });
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <form onSubmit={submit}>
      <label className={labelCls}>What happened?</label>
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as import("@/lib/types").GroupEventKind)}
        className={inputCls}
      >
        {GROUP_EVENT_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>
      <label className={labelCls}>When (month)</label>
      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls} />
      {kind === "merged" && (
        <>
          <label className={labelCls}>Merged into which group?</label>
          <select value={relatedGroupId} onChange={(e) => setRelatedGroupId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {groups
              .filter((g) => g.id !== group.id && g.status === "active")
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
        </>
      )}
      {kind === "replanted" && (
        <>
          <label className={labelCls}>New name (optional)</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} placeholder={group.name} />
        </>
      )}
      <label className={labelCls}>The story in a sentence</label>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="What happened, for the timeline…" />
      {heavy && (
        <p className="mt-3 rounded-lg bg-ember-soft px-3 py-2 text-[12.5px] text-ember">
          {kind === "merged"
            ? "This moves everyone onto the receiving group's roster and closes this group's line on the timeline."
            : "This ends the group — its people become “not in a lifegroup” and its line closes on the timeline. The history stays forever."}
        </p>
      )}
      <SubmitRow busy={busy} error={error} label="Record it" />
    </form>
  );
}

export function ReadinessForm({ group, onDone }: { group: Group; onDone: () => void }) {
  const { saveReadiness } = useData();
  const existing = group.readinessData;
  const [attendance, setAttendance] = useState(existing?.attendance ?? 0);
  const [checks, setChecks] = useState<Record<string, boolean>>(existing?.checks ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkedCount = [...READINESS_LEADERSHIP, ...READINESS_READINESS].filter(
    (c) => checks[c.id],
  ).length;
  const score = attendance + checkedCount;

  const toggle = (id: string) => setChecks((c) => ({ ...c, [id]: !c[id] }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await saveReadiness(group.id, {
      score,
      date: new Date().toISOString().slice(0, 10),
      attendance,
      checks,
    });
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  const checkRow = (c: { id: string; label: string }) => (
    <button
      key={c.id}
      type="button"
      onClick={() => toggle(c.id)}
      className={`flex w-full items-start gap-2.5 rounded-xl border-[1.5px] px-3 py-2 text-left text-[13px] leading-snug ${
        checks[c.id]
          ? "border-accent bg-glow font-medium"
          : "border-line text-muted hover:border-accent"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-[10px] ${
          checks[c.id] ? "bg-accent text-cta-ink" : "border-[1.5px] border-line"
        }`}
      >
        ✓
      </span>
      {c.label}
    </button>
  );

  return (
    <form onSubmit={submit}>
      <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-2.5">
        <span className="text-[13px] text-muted">Score so far</span>
        <span className="font-display text-[24px] tabular-nums">
          {score}
          <span className="text-[14px] text-faint">/15</span>
        </span>
      </div>
      <label className={labelCls}>Attendance (0–4)</label>
      <p className="mb-1.5 text-[12px] text-faint">
        1 point per 3 core members attending 3–4× a month (not counting the leadership team).
      </p>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setAttendance(n)}
            className={`flex-1 rounded-xl border-[1.5px] py-2 text-[14px] font-semibold ${
              attendance === n
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line text-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <label className={labelCls}>Leadership (6)</label>
      <div className="flex flex-col gap-1.5">{READINESS_LEADERSHIP.map(checkRow)}</div>
      <label className={labelCls}>Readiness (5)</label>
      <div className="flex flex-col gap-1.5">{READINESS_READINESS.map(checkRow)}</div>
      <p className="mt-3 text-center text-[12.5px] text-muted">
        {score >= 12
          ? "12+ — prepare to plant! 🌱"
          : `${12 - score} more to the plant-ready threshold of 12.`}
      </p>
      <SubmitRow busy={busy} error={error} label="Save assessment" />
    </form>
  );
}

export function GuestForm({
  guest,
  onDone,
}: {
  guest?: import("@/lib/types").Guest;
  onDone: () => void;
}) {
  const { addGuest, updateGuest } = useData();
  const [name, setName] = useState(guest?.name ?? "");
  const [gender, setGender] = useState<Gender>(guest?.gender ?? "M");
  const [desc, setDesc] = useState(guest?.desc ?? "");
  const [firstSunday, setFirstSunday] = useState(
    guest && /^\d{4}-\d{2}-\d{2}$/.test(guest.firstSunday) ? guest.firstSunday : "",
  );
  const [attending, setAttending] = useState<import("@/lib/types").GuestAttending>(
    guest?.attending ?? "new",
  );
  const [connectCard, setConnectCard] = useState(guest?.connectCard ?? false);
  const [email, setEmail] = useState(guest && guest.email !== "—" ? guest.email : "");
  const [phone, setPhone] = useState(guest && guest.phone !== "—" ? guest.phone : "");
  const [note, setNote] = useState(guest?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const input = {
      name: name.trim(),
      gender,
      desc: desc.trim(),
      firstSunday,
      attending,
      connectCard,
      email: email.trim(),
      phone: phone.trim(),
      note: note.trim(),
    };
    const err = guest ? await updateGuest(guest.id, input) : await addGuest(input);
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <form onSubmit={submit}>
      <label className={labelCls}>Name</label>
      <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="First Last" />
      <label className={labelCls}>Who are they?</label>
      <div className="flex gap-2">
        {(["M", "F"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            className={`flex-1 rounded-xl border-[1.5px] py-2 text-[14px] font-medium ${
              gender === g
                ? g === "M"
                  ? "border-men bg-men-soft text-men-ink"
                  : "border-women bg-women-soft text-women-ink"
                : "border-line text-muted"
            }`}
          >
            {g === "M" ? "Man" : "Woman"}
          </button>
        ))}
      </div>
      <label className={labelCls}>A line of context</label>
      <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} placeholder="New to town, visited with the Smiths…" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>First Sunday</label>
          <input type="date" value={firstSunday} onChange={(e) => setFirstSunday(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Attending</label>
          <select value={attending} onChange={(e) => setAttending(e.target.value as import("@/lib/types").GuestAttending)} className={inputCls}>
            <option value="new">Brand new</option>
            <option value="yes">Still attending</option>
            <option value="sporadic">Sporadic</option>
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setConnectCard(!connectCard)}
        className={`mt-3.5 w-full rounded-xl border-[1.5px] py-2 text-[13.5px] font-medium ${
          connectCard ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-muted"
        }`}
      >
        {connectCard ? "✓ Filled out a connect card" : "Filled out a connect card?"}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>
      </div>
      <label className={labelCls}>Notes</label>
      <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Next step, who's connecting with them…" />
      <SubmitRow busy={busy} error={error} label={guest ? "Save changes" : "Add guest"} />
    </form>
  );
}

export function AddRelationshipForm({ onDone }: { onDone: () => void }) {
  const { people, addRelationship } = useData();
  const helpers = makeHelpers(people);
  const [disciplerId, setDisciplerId] = useState("");
  const [discipleId, setDiscipleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = people.filter((p) => p.role !== "staff" || true);
  const discipler = people.find((p) => p.id === disciplerId);
  const disciples = candidates.filter(
    (p) => p.id !== disciplerId && (!discipler || p.gender === discipler.gender),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await addRelationship(disciplerId, discipleId);
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  const personLabel = (id: string) => {
    const p = helpers.personById(id);
    return p ? p.name : "";
  };

  return (
    <form onSubmit={submit}>
      <label className={labelCls}>Who is discipling…</label>
      <select required value={disciplerId} onChange={(e) => { setDisciplerId(e.target.value); setDiscipleId(""); }} className={inputCls}>
        <option value="">Choose the discipler</option>
        {candidates.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <label className={labelCls}>…whom?</label>
      <select required value={discipleId} onChange={(e) => setDiscipleId(e.target.value)} className={inputCls} disabled={!disciplerId}>
        <option value="">{disciplerId ? `Choose who ${personLabel(disciplerId).split(" ")[0]} disciples` : "Pick a discipler first"}</option>
        {disciples.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[12px] text-faint">
        Same-gender only — the list filters automatically.
      </p>
      <SubmitRow busy={busy} error={error} label="Record relationship" />
    </form>
  );
}
