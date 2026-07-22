"use client";

// First-run welcome tour: a short, dismissible carousel that greets a new
// user and orients them. Content differs by what they can see (staff vs
// leader). Shown once per device (localStorage); re-openable via the
// "Take the tour" link in the sidebar, which dispatches the "h2h-tour" event.

import { useEffect, useState } from "react";
import { useData } from "@/lib/store";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { LogoMark } from "./ui";

const SEEN_KEY = "h2h-welcome-seen-v1";

interface Slide {
  icon: string;
  title: string;
  body: string;
}

const STAFF_SLIDES: Slide[] = [
  {
    icon: "🏡",
    title: "Welcome to House to House",
    body: "One home for your church's lifegroups and discipleship. Here's the 60-second tour. Skip anytime.",
  },
  {
    icon: "🗺️",
    title: "The Lifegroup Map",
    body: "Every group at a glance. Flip to the Engagement view to see who's leading, core, or on the fringe, or the Timeline to watch groups multiply over the years.",
  },
  {
    icon: "🌳",
    title: "Discipleship",
    body: "Record D-groups: a mentor with a few people, or a peer group. The tree shows generations of disciples multiplying, tinting deeper the further it goes.",
  },
  {
    icon: "👋",
    title: "Follow-up & MVPs",
    body: "Walk newcomers from their first Sunday toward family. When someone's ready, you graduate them into the directory, whether or not they're in a lifegroup.",
  },
  {
    icon: "✅",
    title: "The monthly check-in",
    body: "Ninety seconds once a month: who came, how the group's feeling, anything to celebrate. Leaders do their own for their group.",
  },
  {
    icon: "⚙️",
    title: "Make it yours",
    body: "Settings tunes roles, the discipleship roadmap, pulse words, and reminders. Grant a leader access and email them a sign-in link from any person's card. You're set!",
  },
];

const LEADER_SLIDES: Slide[] = [
  {
    icon: "🏡",
    title: "Welcome to House to House",
    body: "The tool your church uses to shepherd its lifegroups. Here's your corner of it. A quick look, then you're in.",
  },
  {
    icon: "👥",
    title: "Your group",
    body: "Your roster and its health are a tap away. Open My Group from the map to see who's in and how things are going.",
  },
  {
    icon: "✅",
    title: "Your monthly check-in",
    body: "Ninety seconds, once a month: tap who came, how the group's been feeling, and any wins. That's the whole ask.",
  },
  {
    icon: "🏀",
    title: "Your MVPs",
    body: "New folks connected to your group show up on your MVP board, to pray for, track, and pursue alongside staff. That's it. Welcome!",
  },
];

export function WelcomeTour() {
  const { ready, role } = useData();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useScrollLock(open);

  // Auto-open on first visit once we know who they are.
  useEffect(() => {
    if (!ready) return;
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable — just don't auto-show.
    }
  }, [ready]);

  // Re-open from the sidebar "Take the tour" link.
  useEffect(() => {
    const onOpen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("h2h-tour", onOpen);
    return () => window.removeEventListener("h2h-tour", onOpen);
  }, []);

  if (!open) return null;

  const slides = role === "staff" ? STAFF_SLIDES : LEADER_SLIDES;
  const s = slides[Math.min(step, slides.length - 1)];
  const last = step >= slides.length - 1;

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/45" onClick={dismiss} />
      <div className="fixed inset-x-0 top-[12vh] z-[90] mx-auto w-[420px] max-w-[calc(100vw-2rem)] rounded-[16px] border border-line bg-bg p-6 shadow-card max-md:top-[8vh]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={26} className="text-accent" />
            <span className="text-[11px] uppercase tracking-wider text-muted">
              {slides === STAFF_SLIDES ? "Welcome, staff" : "Welcome, leader"}
            </span>
          </div>
          <button
            onClick={dismiss}
            className="text-[12.5px] text-muted underline-offset-2 hover:underline"
          >
            skip
          </button>
        </div>

        <div className="min-h-[168px]">
          <div className="mb-3 text-[40px] leading-none">{s.icon}</div>
          <h2 className="font-display mb-2 text-[22px]">{s.title}</h2>
          <p className="text-[14px] leading-relaxed text-muted">{s.body}</p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-4 bg-accent" : "w-1.5 bg-line"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((n) => n - 1)}
                className="rounded-xl px-3 py-2 text-[13.5px] font-semibold text-muted hover:text-ink"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (last ? dismiss() : setStep((n) => n + 1))}
              className="rounded-xl bg-accent px-4 py-2 text-[13.5px] font-semibold text-cta-ink"
            >
              {last ? "Let's go" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
