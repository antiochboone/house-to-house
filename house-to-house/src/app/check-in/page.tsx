"use client";

import { useRef, useState } from "react";
import { PULSE_WORDS } from "@/lib/data";
import { useData } from "@/lib/store";

const STEPS = 6;

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

export default function CheckInPage() {
  const { role, realMode } = useData();
  const [step, setStep] = useState(0);
  const [rhythm, setRhythm] = useState(0);
  const [moods, setMoods] = useState<number[]>([]);
  const [, setWin] = useState<number | null>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

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

  const next = () => {
    setStep((s) => {
      const n = Math.min(s + 1, STEPS - 1);
      if (n === STEPS - 1) burst();
      return n;
    });
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const toggleMood = (i: number) =>
    setMoods((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]));

  const words = moods.map((i) => PULSE_WORDS[i].toLowerCase());
  const feeling =
    words.length === 0
      ? ""
      : words.length === 1
        ? words[0]
        : `${words.slice(0, -1).join(", ")} & ${words[words.length - 1]}`;

  return (
    <>
      <div className="mb-5 max-w-[640px]">
        <h1 className="font-display mb-1 text-[27px]">The monthly check-in</h1>
        <p className="text-[14.5px] text-muted">
          {role === "staff"
            ? "This is what leaders experience — pre-filled, phone-first, under two minutes, ends in celebration."
            : "Ninety seconds, once a month. That's the whole ask."}
        </p>
      </div>

      <div className="flex justify-center pt-1.5">
        <div
          ref={phoneRef}
          className="relative flex min-h-[560px] w-[360px] max-w-full flex-col overflow-hidden rounded-[26px] border border-line bg-surface px-5 pb-5 pt-6 shadow-card"
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
                Hey Sam — July check-in for King Street
              </p>
              <p className="mb-5 text-center text-[13.5px] text-muted">
                Everything&apos;s pre-filled from last month. Should take about 90 seconds.
              </p>
              <div className="flex flex-1 items-center justify-center text-center text-[13.5px] text-muted">
                Last check-in: June 2 · streak: 9 months
              </div>
              <button
                onClick={next}
                className="mt-4 w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink"
              >
                Let&apos;s go
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="label mb-2 text-center">Rhythm</div>
              <p className="font-display mb-5 text-center text-[21px]">
                Still Tuesdays 6:30 at your place?
              </p>
              <div className="flex flex-1 flex-col gap-2">
                <Opt selected={rhythm === 0} onClick={() => { setRhythm(0); next(); }}>
                  Yep, same as always
                </Opt>
                <Opt selected={rhythm === 1} onClick={() => { setRhythm(1); next(); }}>
                  Something changed
                </Opt>
                <p className="mt-1 px-1 text-center text-[11.5px] text-faint">
                  &quot;Something changed&quot; will open day/time/place editing in the real
                  build.
                </p>
              </div>
              <button onClick={back} className="w-full py-2 text-center text-[13px] text-muted">
                back
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="label mb-2 text-center">Roster</div>
              <p className="font-display mb-1.5 text-center text-[21px]">Anyone new since June?</p>
              <p className="mb-5 text-center text-[13.5px] text-muted">
                Corey brought his roommate twice — want to add him?
              </p>
              <div className="flex flex-1 flex-col gap-2">
                <Opt onClick={next}>＋ Add Corey&apos;s roommate</Opt>
                <Opt onClick={next}>＋ Add someone else</Opt>
                <Opt onClick={next}>No new faces this month</Opt>
                <p className="mt-1 px-1 text-center text-[11.5px] text-faint">
                  Adding someone opens a quick name-and-how-they-connected form in the real
                  build.
                </p>
              </div>
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
                  {PULSE_WORDS.map((m, i) => (
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
                Wins go on the church-wide board (you can keep one private too).
              </p>
              <div className="flex flex-1 flex-col gap-2">
                {["Answered prayer", "Someone met Jesus", "New discipleship relationship", "Nothing this month — that's okay"].map(
                  (w, i) => (
                    <Opt key={w} onClick={() => { setWin(i); next(); }}>
                      {w}
                    </Opt>
                  ),
                )}
              </div>
              <button onClick={back} className="w-full py-2 text-center text-[13px] text-muted">
                back
              </button>
            </>
          )}

          {step === 5 && (
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
              <p className="font-display mt-2.5 text-2xl">That&apos;s it. 87 seconds.</p>
              <p className="max-w-[250px] text-sm text-muted">
                King Street is checked in for July
                {feeling && (
                  <>
                    {" "}
                    — feeling <strong>{feeling}</strong>
                  </>
                )}
                . Your win is on the board. See you in August.
              </p>
              <button
                onClick={() => {
                  setStep(0);
                  setMoods([]);
                  setWin(null);
                }}
                className="mt-2.5 py-2 text-[13px] text-muted"
              >
                run it again
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-[12.5px] text-faint">
        {realMode
          ? "This is a preview with sample prompts — real check-ins that save to the database arrive in Milestone 3."
          : "Diligent leaders can also log attendance and prayer answers any time — but this is the only ask."}
      </p>
    </>
  );
}
