"use client";

// Add-flows for M2 hand entry: new lifegroup, new person, new discipleship
// relationship. Built for speed of entry — Hunter is typing in a whole church.

import { useState, type ReactNode } from "react";
import type { DiscipleshipStatus, Gender, Group, MemberRole, Person, Season } from "@/lib/types";
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
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 top-[8vh] z-[70] mx-auto max-h-[84vh] w-[440px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[14px] border border-line bg-bg p-6 shadow-card">
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

const DAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const HOURS = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

export function TagsInput({
  tags,
  setTags,
  suggestions,
}: {
  tags: string[];
  setTags: (t: string[]) => void;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState("");
  const add = (label: string) => {
    const clean = label.trim();
    if (clean && !tags.some((t) => t.toLowerCase() === clean.toLowerCase()))
      setTags([...tags, clean]);
    setDraft("");
  };
  const unused = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border-[1.5px] border-line bg-surface px-2 py-1.5 focus-within:border-accent">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent-ink">
            {t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="text-[11px] opacity-70 hover:opacity-100">
              ✕
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={tags.length ? "" : "e.g. Downtown, College, Families…"}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-[13.5px] outline-none"
        />
      </div>
      {unused.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-muted hover:border-accent hover:text-accent-ink">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddGroupForm({ onDone }: { onDone: () => void }) {
  const { addGroup, groups } = useData();
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

  const allTags = [...new Set(groups.flatMap((g) => g.tags))];

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
        <option value="start">Starting Up — new or recently replanted</option>
        <option value="build">Building Up — healthy and growing</option>
        <option value="plant">Multiplying — preparing to plant a new group</option>
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
      <label className={labelCls}>Tags</label>
      <TagsInput tags={tags} setTags={setTags} suggestions={allTags} />
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
  const [isChild, setIsChild] = useState(false);
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
      isChild,
      email: email.trim(),
      phone: phone.trim(),
      groupId: groupId || null,
      role: isChild ? "member" : role,
      status: isChild ? "none" : status,
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
      {groupId && !isChild && (
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
      {!isChild && (
        <>
          <label className={labelCls}>Discipleship status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as DiscipleshipStatus)} className={inputCls}>
            {(Object.keys(STATUS_LABEL) as DiscipleshipStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </>
      )}
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
  const { groups, people, updatePerson, deletePerson, endDiscipleship } = useData();
  const [first, setFirst] = useState(person.firstName);
  const [last, setLast] = useState(person.lastName);
  const [gender, setGender] = useState<Gender>(person.gender);
  const [isChild, setIsChild] = useState(!!person.isChild);
  const [groupId, setGroupId] = useState<string>(person.groupId ?? "");
  const [role, setRole] = useState<MemberRole>(person.role === "staff" ? "member" : person.role);
  const [status, setStatus] = useState<DiscipleshipStatus>(person.status ?? "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const discipler = person.discipledBy
    ? people.find((p) => p.id === person.discipledBy)
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await updatePerson(person.id, {
      firstName: first.trim(),
      lastName: last.trim(),
      gender,
      isChild,
      groupId: groupId || null,
      role: isChild ? "member" : role,
      status: isChild ? "none" : status,
    });
    setBusy(false);
    if (err) setError(err);
    else onDone();
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
      {groupId && !isChild && (
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
      {!isChild && (
        <>
          <label className={labelCls}>Discipleship</label>
          {discipler ? (
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-[13.5px]">
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
          ) : (
            <select value={status} onChange={(e) => setStatus(e.target.value as DiscipleshipStatus)} className={inputCls}>
              {(Object.keys(STATUS_LABEL) as DiscipleshipStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
        </>
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
  const { groups, lanes, updateGroup, deleteGroup, setGroupOrigin } = useData();
  const parsed = parseMeet(group.meet);
  const lane = lanes.find((l) => l.id === group.id);
  const [name, setName] = useState(group.name);
  const [season, setSeason] = useState<Season>(group.season);
  const [day, setDay] = useState(parsed.day);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState<"AM" | "PM">(parsed.ampm);
  const [place, setPlace] = useState(parsed.place);
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
        <option value="start">Starting Up — new or recently replanted</option>
        <option value="build">Building Up — healthy and growing</option>
        <option value="plant">Multiplying — preparing to plant a new group</option>
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
