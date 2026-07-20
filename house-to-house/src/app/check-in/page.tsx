"use client";

// The monthly check-in. Real mode: greets the signed-in leader (or staff),
// runs against their actual group, and SAVES — the check-in row, roster adds,
// meeting changes, and wins all write to the database. Demo mode keeps the
// sample "Sam / King Street" experience.

import { useRef, useState } from "react";
import type { Gender } from "@/lib/types";
import { DAYS_OF_WEEK, firstName } from "@/lib/data";
import { useData, makeHelpers, type CheckinInput } from "@/lib/store";

const STEPS = 6;
const HOURS = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

function Opt({
  selected,
  onClick,
  children,
  center = false,
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 py-3 text-left text-[14.5px] transition-colors ${
        center ? "justify-center px-2 py-2.5 text-[13.5px]" : ""
      } ${
        selected
          ? "border-accent bg-glow font-semibold"
          : "border-line bg-surface hover:border-accent"
      }`}
    >
      {children}
      {!center && (
        <span className={`ml-auto font-bold text-accent ${selected ? "opacity-100" : "opacity-0"}`}>
          ✓
        </span>
      )}
    </button>
  );
}

const inputCls =
  "rounded-xl border-[1.5px] border-accent bg-bg px-3.5 py-2.5 text-[14.5px] max-md:text-[16px] outline-none";

export default function CheckInPage() {
  const data = useData();
  const { ready, realMode, role, groups, people, mePersonId, myGroupIds, submitCheckin, pulseWords } = data;
  const h = makeHelpers(people);

  const [step, setStep] = useState(0);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [meetingChanged, setMeetingChanged] = useState(false);
  const [day, setDay] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("30");
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const [place, setPlace] = useState("");
  const [moods, setMoods] = useState<number[]>([]);
  const [newFace, setNewFace] = useState<boolean | null>(null);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newGender, setNewGender] = useState<Gender>("M");
  const [win, setWin] = useState<number | null>(null);
  const [winNote, setWinNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  if (!ready) {
    return (
      <div className="mt-24 text-center text-muted">
        <p className="font-display text-lg">Getting your check-in ready…</p>
      </div>
    );
  }

  // Which groups can this user check in for?
  const candidates =
    role === "staff" ? groups : groups.filter((g) => myGroupIds.includes(g.id));

  if (realMode && candidates.length === 0) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="font-display mb-2 text-2xl">Almost there</h1>
        <p className="text-[14.5px] leading-relaxed text-muted">
          Your login isn&apos;t connected to a lifegroup yet. Ask your staff to make sure
          your email is on your person record and you&apos;re listed as a leader of your
          group — then this page becomes your monthly check-in.
        </p>
      </div>
    );
  }

  const group = groupId
    ? (groups.find((g) => g.id === groupId) ?? null)
    : candidates.length === 1
      ? candidates[0]
      : null;

  const me = mePersonId ? h.personById(mePersonId) : null;
  const greetName = realMode ? (me ? firstName(me.name) : "there") : "Sam";
  const monthName = new Date().toLocaleString("en-US", { month: "long" });

  const burst = () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    requestAnimationFrame(() => {
      const phone = phoneRef.current;
      if (!phone) return;
      const colors = ["var(--accent)", "var(--gold)", "var(--ember)", "var(--women)"];
      for (let i = 0; i < 26; i++) {
        const d = document.createElement("span");
        d.className = "burst-dot";
        const ang = Math.PI * 2 * (i / 26);
        const dist = 90 + (i % 5) * 28;
        d.style.cssText = `position:absolute;width:8px;height:8px;border-radius:50%;left:50%;top:38%;background:${colors[i % 4]};--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px;pointer-events:none;`;
        phone.appendChild(d);
        setTimeout(() => d.remove(), 1100);
      }
    });
  };

  const finishAndSave = async () => {
    setSaving(true);
    setSaveError(null);
    const winCategories = ["answered_prayer", "salvation", "new_dship"] as const;
    const input: CheckinInput = {
      groupId: group!.id,
      pulseWords: moods.map((i) => pulseWords[i]),
      newPerson:
        newFace && newFirst.trim()
          ? { firstName: newFirst.trim(), lastName: newLast.trim(), gender: newGender }
          : undefined,
      win:
        win !== null && winNote.trim()
          ? { category: winCategories[win], note: winNote.trim() }
          : undefined,
      meeting: meetingChanged
        ? { day, time: hour ? `${hour}:${minute} ${ampm}` : "", place: place.trim() }
        : undefined,
    };
    const err = await submitCheckin(input);
    setSaving(false);
    if (err) {
      setSaveError(err);
    } else {
      setSaved(true);
      setStep(STEPS - 1);
      burst();
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS - 2));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const toggleMood = (i: number) =>
    setMoods((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]));

  const restart = () => {
    setStep(0);
    setGroupId(null);
    setMeetingChanged(false);
    setMoods([]);
    setNewFace(null);
    setNewFirst("");
    setNewLast("");
    setWin(null);
    setWinNote("");
    setSaved(false);
    setSaveError(null);
  };

  const words = moods.map((i) => pulseWords[i].toLowerCase());
  const feeling =
    words.length === 0
      ? ""
      : words.length === 1
        ? words[0]
        : `${words.slice(0, -1).join(", ")} & ${words[words.length - 1]}`;

  const alreadyThisMonth =
    realMode &&
    group?.insights.some((i) => i.includes(`${monthName} check-in`) || i === `Checked in for ${monthName}`);

  return (
    <>
      {/* On desktop the check-in sits in a phone-shaped card; on an actual
          phone the frame disappears and the flow owns the screen. */}
      <div className="mb-5 max-w-[640px] max-md:hidden">
        <h1 className="font-display mb-1 text-[27px]">The monthly check-in</h1>
        <p className="text-[14.5px] text-muted">
          {realMode
            ? role === "staff"
              ? "Check in for any group — leaders will do their own from here too."
              : "Ninety seconds, once a month. That's the whole ask."
            : "Demo preview — sign in on the real site and this saves for real."}
        </p>
      </div>

      <div className="flex justify-center pt-1.5 max-md:pt-0">
        <div
          ref={phoneRef}
          className="relative flex min-h-[560px] w-[360px] max-w-full flex-col overflow-hidden rounded-[26px] border border-line bg-surface px-5 pb-5 pt-6 shadow-card max-md:min-h-[76vh] max-md:w-full max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:px-1 max-md:pt-2 max-md:shadow-none"
        >
          <div className="mb-5 flex justify-center gap-1.5">
            {Array.from({ length: STEPS }, (_, i) => (
              <span
                key={i}
                className={`h-1 w-[26px] rounded ${i <= step ? "bg-accent" : "bg-line"}`}
              />
            ))}
          </div>

          {step === 0 && (
            <>
              <p className="font-display mb-1.5 text-center text-[21px]">
                Hey {greetName} — {monthName} check-in
                {group ? ` for ${group.name}` : ""}
              </p>
              <p className="mb-4 text-center text-[13.5px] text-muted">
                {alreadyThisMonth
                  ? `${group?.name} already checked in this month — running it again updates it.`
                  : "A few taps and you're done. Should take about 90 seconds."}
              </p>
              {!group && (
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                  {candidates.map((g) => (
                    <Opt key={g.id} selected={groupId === g.id} onClick={() => setGroupId(g.id)}>
                      {g.name}
                    </Opt>
                  ))}
                </div>
              )}
              {group && <div className="flex-1" />}
              <button
                onClick={next}
                disabled={!group}
                className="mt-4 w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink disabled:opacity-45"
              >
                Let&apos;s go
              </button>
            </>
          )}

          {step === 1 && group && (
            <>
              <div className="label mb-2 text-center">Rhythm</div>
              <p className="font-display mb-5 text-center text-[21px]">
                Still {group.meet.replace(" · ", " at ")}?
              </p>
              <div className="flex flex-1 flex-col gap-2">
                <Opt selected={!meetingChanged} onClick={() => { setMeetingChanged(false); next(); }}>
                  Yep, same as always
                </Opt>
                <Opt selected={meetingChanged} onClick={() => setMeetingChanged(true)}>
                  Something changed
                </Opt>
                {meetingChanged && (
                  <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-2.5">
                    <select value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} aria-label="Day">
                      <option value="">Day —</option>
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <div className="flex gap-1.5">
                      <select value={hour} onChange={(e) => setHour(e.target.value)} className={`${inputCls} flex-1`} aria-label="Hour">
                        {HOURS.map((hr) => (
                          <option key={hr} value={hr}>{hr || "—"}</option>
                        ))}
                      </select>
                      <select value={minute} onChange={(e) => setMinute(e.target.value)} className={`${inputCls} flex-1`} aria-label="Minute">
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>:{m}</option>
                        ))}
                      </select>
                      <select value={ampm} onChange={(e) => setAmpm(e.target.value as "AM" | "PM")} className={`${inputCls} flex-1`} aria-label="AM or PM">
                        <option value="PM">PM</option>
                        <option value="AM">AM</option>
                      </select>
                    </div>
                    <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Where?" className={inputCls} />
                  </div>
                )}
              </div>
              {meetingChanged && (
                <button
                  onClick={next}
                  className="mt-4 w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink"
                >
                  Next
                </button>
              )}
              <button onClick={back} className="w-full py-2 text-center text-[13px] text-muted">
                back
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="label mb-2 text-center">Roster</div>
              <p className="font-display mb-1.5 text-center text-[21px]">Anyone new this month?</p>
              <p className="mb-5 text-center text-[13.5px] text-muted">
                New faces go straight onto the roster.
              </p>
              <div className="flex flex-1 flex-col gap-2">
                <Opt selected={newFace === true} onClick={() => setNewFace(true)}>
                  ＋ Someone joined lifegroup
                </Opt>
                {newFace === true && (
                  <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-2.5">
                    <div className="flex gap-1.5">
                      <input autoFocus value={newFirst} onChange={(e) => setNewFirst(e.target.value)} placeholder="First name" className={`${inputCls} min-w-0 flex-1`} />
                      <input value={newLast} onChange={(e) => setNewLast(e.target.value)} placeholder="Last name" className={`${inputCls} min-w-0 flex-1`} />
                    </div>
                    <div className="flex gap-1.5">
                      {(["M", "F"] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => setNewGender(g)}
                          className={`flex-1 rounded-xl border-[1.5px] py-2 text-[13.5px] font-medium ${
                            newGender === g
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
                  </div>
                )}
                <Opt
                  selected={newFace === false}
                  onClick={() => {
                    setNewFace(false);
                    setNewFirst("");
                    setNewLast("");
                    next();
                  }}
                >
                  No new faces this month
                </Opt>
              </div>
              {newFace === true && (
                <button
                  onClick={next}
                  disabled={!newFirst.trim()}
                  className="mt-4 w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink disabled:opacity-45"
                >
                  Next
                </button>
              )}
              <button onClick={back} className="w-full py-2 text-center text-[13px] text-muted">
                back
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="label mb-2 text-center">Pulse</div>
              <p className="font-display mb-1.5 text-center text-[21px]">
                How has the group been feeling?
              </p>
              <p className="mb-5 text-center text-[13.5px] text-muted">Pick as many words as fit.</p>
              <div className="flex-1">
                <div className="grid grid-cols-3 gap-2">
                  {pulseWords.map((m, i) => (
                    <Opt key={m} center selected={moods.includes(i)} onClick={() => toggleMood(i)}>
                      {m}
                    </Opt>
                  ))}
                </div>
              </div>
              <button
                onClick={next}
                disabled={moods.length === 0}
                className="mt-4 w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink disabled:opacity-45"
              >
                Next
              </button>
              <button onClick={back} className="w-full py-2 text-center text-[13px] text-muted">
                back
              </button>
            </>
          )}

          {step === 4 && (
            <>
              <div className="label mb-2 text-center">Celebrate</div>
              <p className="font-display mb-1.5 text-center text-[21px]">Anything to celebrate?</p>
              <p className="mb-5 text-center text-[13.5px] text-muted">
                Wins go on the church-wide board.
              </p>
              <div className="flex flex-1 flex-col gap-2">
                {["Answered prayer", "Someone met Jesus", "New discipleship relationship"].map(
                  (w, i) => (
                    <Opt
                      key={w}
                      selected={win === i}
                      onClick={() => {
                        setWin(i);
                        setWinNote("");
                      }}
                    >
                      {w}
                    </Opt>
                  ),
                )}
                {win !== null && (
                  <input
                    autoFocus
                    value={winNote}
                    onChange={(e) => setWinNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && winNote.trim()) {
                        e.preventDefault();
                        void finishAndSave();
                      }
                    }}
                    placeholder={
                      win === 0
                        ? "Share it in one sentence…"
                        : win === 1
                          ? "Who? A first name is enough"
                          : "Who's discipling whom?"
                    }
                    className={inputCls}
                  />
                )}
                <Opt
                  onClick={() => {
                    setWin(null);
                    setWinNote("");
                    void finishAndSave();
                  }}
                >
                  Nothing this month — that&apos;s okay
                </Opt>
              </div>
              {saveError && (
                <p className="mt-2 text-center text-[12.5px] text-ember">
                  Couldn&apos;t save: {saveError}
                </p>
              )}
              {win !== null && (
                <button
                  onClick={() => void finishAndSave()}
                  disabled={!winNote.trim() || saving}
                  className="mt-4 w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink disabled:opacity-45"
                >
                  {saving ? "Saving…" : "Finish check-in"}
                </button>
              )}
              <button onClick={back} className="w-full py-2 text-center text-[13px] text-muted">
                back
              </button>
            </>
          )}

          {step === 5 && saved && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <svg width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden>
                <circle cx="27" cy="27" r="25" stroke="var(--accent)" strokeWidth="2.5" />
                <path
                  d="m17 27.5 7 7 13-14"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="font-display mt-2.5 text-2xl">
                {realMode ? "Saved. That's it." : "That's it. 87 seconds."}
              </p>
              <p className="max-w-[260px] text-sm text-muted">
                {group?.name} is checked in for {monthName}
                {feeling && (
                  <>
                    {" "}
                    — feeling <strong>{feeling}</strong>
                  </>
                )}
                .{newFirst.trim() && <> {newFirst.trim()} is on the roster.</>}
                {winNote.trim() && <> Your win — &quot;{winNote.trim()}&quot; — is on the board.</>}{" "}
                See you next month.
              </p>
              <button onClick={restart} className="mt-2.5 py-2 text-[13px] text-muted">
                {role === "staff" ? "check in another group" : "run it again"}
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-[12.5px] text-faint max-md:hidden">
        {realMode
          ? "Check-ins land on the group's card and feed the church-wide insights."
          : "Demo mode — nothing is saved."}
      </p>
    </>
  );
}
