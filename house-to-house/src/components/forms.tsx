"use client";

// Add-flows for M2 hand entry: new lifegroup, new person, new discipleship
// relationship. Built for speed of entry — Hunter is typing in a whole church.

import { useState, type ReactNode } from "react";
import type { DiscipleshipStatus, Gender, MemberRole, Season } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/data";
import { useData, makeHelpers } from "@/lib/store";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 top-[10vh] z-50 mx-auto w-[440px] max-w-[calc(100vw-2rem)] rounded-[14px] border border-line bg-bg p-6 shadow-card">
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
  "w-full rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-[14.5px] outline-none focus:border-accent";
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

export function AddGroupForm({ onDone }: { onDone: () => void }) {
  const { addGroup } = useData();
  const [name, setName] = useState("");
  const [season, setSeason] = useState<Season>("start");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await addGroup({
      name: name.trim(),
      season,
      meetingDay: day.trim(),
      meetingTime: time.trim(),
      meetingPlace: place.trim(),
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
        <option value="build">Building Up</option>
        <option value="plant">Planting</option>
      </select>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Day</label>
          <input value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} placeholder="Tuesdays" />
        </div>
        <div>
          <label className={labelCls}>Time</label>
          <input value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} placeholder="6:30" />
        </div>
      </div>
      <label className={labelCls}>Where</label>
      <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} placeholder="downtown Boone" />
      <SubmitRow busy={busy} error={error} label="Add lifegroup" />
    </form>
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
  const [groupId, setGroupId] = useState<string>(defaultGroupId ?? "");
  const [role, setRole] = useState<MemberRole>("member");
  const [status, setStatus] = useState<DiscipleshipStatus>("none");
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
      email: email.trim(),
      phone: phone.trim(),
      groupId: groupId || null,
      role,
      status,
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
      setStatus("none");
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
      <label className={labelCls}>Gender</label>
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
          <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className={inputCls}>
            <option value="member">Member</option>
            <option value="leader">Leader</option>
            <option value="intern">Intern</option>
            <option value="worship">Worship leader</option>
          </select>
        </>
      )}
      <label className={labelCls}>Discipleship status</label>
      <select value={status} onChange={(e) => setStatus(e.target.value as DiscipleshipStatus)} className={inputCls}>
        {(Object.keys(STATUS_LABEL) as DiscipleshipStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
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
