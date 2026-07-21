"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/lib/store";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { Avatar, LogoMark } from "./ui";
import { WelcomeTour } from "./welcome-tour";
import { LEADER_NAME } from "@/lib/data";

const ICONS: Record<string, React.ReactNode> = {
  map: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0 opacity-85">
      <path d="M2.5 9.5 10 2.5l7.5 7" />
      <path d="M4.5 8.5V17h11V8.5" />
      <rect x="8.2" y="12" width="3.6" height="5" rx=".5" />
    </svg>
  ),
  disc: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-[18px] w-[18px] shrink-0 opacity-85">
      <circle cx="10" cy="4.5" r="2.3" />
      <circle cx="4.5" cy="14.5" r="2.3" />
      <circle cx="15.5" cy="14.5" r="2.3" />
      <path d="M8.8 6.6 5.6 12.4M11.2 6.6l3.2 5.8" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-[18px] w-[18px] shrink-0 opacity-85">
      <circle cx="7" cy="6.5" r="2.5" />
      <circle cx="13.5" cy="8" r="2" />
      <path d="M2.5 15.5c.5-3 2.5-4.5 4.5-4.5s4 1.5 4.5 4.5M12.5 12.8c1.8.3 3.2 1.5 3.7 3" />
    </svg>
  ),
  guest: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0 opacity-85">
      <circle cx="8" cy="6.5" r="2.5" />
      <path d="M3 16c.5-3 2.7-4.5 5-4.5s4.5 1.5 5 4.5" />
      <path d="M14.5 5.5v5M17 8h-5" />
    </svg>
  ),
  checkin: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0 opacity-85">
      <rect x="4" y="2.5" width="12" height="15" rx="2.5" />
      <path d="m7.5 10 2 2 3.5-4" />
    </svg>
  ),
  group: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-[18px] w-[18px] shrink-0 opacity-85">
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="13.5" cy="8.5" r="2" />
      <path d="M2.5 16c.5-3 2.5-4.5 4.5-4.5S11 13 11.5 16M12 13.2c1.8.3 3 1.4 3.5 2.8" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[18px] w-[18px] shrink-0 opacity-85">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.49.49 0 0 0-.48-.41h-3.84a.49.49 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"
      />
    </svg>
  ),
};

function Wordmark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 pb-4 ${collapsed ? "justify-center px-0" : "px-2.5"}`}>
      <LogoMark size={34} className="text-accent" />
      {!collapsed && (
        <div>
          <div className="font-display text-[19px] leading-[1.1]">House to House</div>
          <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-muted max-md:hidden">
            Antioch Boone
          </div>
        </div>
      )}
    </div>
  );
}

/** Cycles light → dark → follow-the-device. */
function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { choice, resolved, setChoice } = useTheme();
  const next: Record<ThemeChoice, ThemeChoice> = {
    light: "dark",
    dark: "system",
    system: "light",
  };
  const label =
    choice === "system" ? `Auto · ${resolved}` : choice === "dark" ? "Dark" : "Light";

  return (
    <button
      onClick={() => setChoice(next[choice])}
      title={`Theme: ${label} — tap for ${next[choice] === "system" ? "auto" : next[choice]}`}
      aria-label={`Theme: ${label}. Switch to ${next[choice]}.`}
      className={`flex items-center gap-2 rounded-[10px] text-muted hover:bg-surface-2 hover:text-ink ${
        collapsed ? "h-9 w-9 justify-center" : "px-2.5 py-1.5"
      }`}
    >
      <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        {resolved === "dark" ? (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M16.5 11.8A7 7 0 0 1 8.2 3.5a7 7 0 1 0 8.3 8.3z" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-[18px] w-[18px]">
            <circle cx="10" cy="10" r="3.4" />
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4" />
          </svg>
        )}
        {choice === "system" && (
          <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-bg" />
        )}
      </span>
      {!collapsed && <span className="text-[12.5px] font-medium">{label}</span>}
    </button>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { role, demoRole, setDemoRole, realMode, userEmail, myGroupIds } = useData();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("h2h-sidebar") === "collapsed");
  }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("h2h-sidebar", next ? "collapsed" : "open");
  };

  // Auth pages stand alone — no app chrome.
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  const items =
    role === "staff"
      ? [
          { href: "/map", label: "Lifegroup Map", icon: "map" },
          { href: "/people", label: "People", icon: "people" },
          { href: "/discipleship", label: "Discipleship", icon: "disc" },
          { href: "/follow-up", label: "Follow-up", icon: "guest" },
          { href: "/check-in", label: "Check-in", icon: "checkin" },
          { href: "/settings", label: "Settings", icon: "gear" },
        ]
      : [
          { href: "/map", label: "Lifegroup Map", icon: "map" },
          ...(myGroupIds.length > 0
            ? [
                { href: `/map?open=${myGroupIds[0]}`, label: "My Group", icon: "group" },
                { href: "/follow-up", label: "MVPs", icon: "guest" },
              ]
            : []),
          { href: "/check-in", label: "Check-in", icon: "checkin" },
        ];

  return (
    <div className="flex min-h-screen max-md:flex-col">
      <aside
        style={{ "--sbw": collapsed ? "68px" : "232px" } as React.CSSProperties}
        className={`sidebar sticky top-0 flex h-screen shrink-0 flex-col gap-1.5 border-r border-line py-5 transition-[width] duration-150 max-md:static max-md:h-auto max-md:flex-row max-md:flex-wrap max-md:items-center max-md:gap-1 max-md:border-b max-md:border-r-0 max-md:px-3.5 max-md:py-3 ${
          collapsed ? "px-2" : "px-3.5"
        }`}
      >
        <Wordmark collapsed={collapsed} />
        <nav className="flex flex-col gap-1 max-md:hidden">
          {items.map((it) => {
            const active = it.href === pathname;
            return (
              <Link
                key={it.href + it.label}
                href={it.href}
                title={it.label}
                className={`flex w-full items-center gap-2.5 rounded-[10px] py-2 text-[14.5px] font-medium ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${
                  active
                    ? "bg-accent-soft font-semibold text-accent-ink"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {ICONS[it.icon]}
                {!collapsed && it.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-faint shadow-card hover:text-accent-ink max-md:hidden"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 transition-transform ${collapsed ? "rotate-180" : ""}`}>
            <path d="M10 3 5 8l5 5" />
          </svg>
        </button>
        <div className="flex-1 max-md:hidden" />

        {/* Mobile: theme + settings sit at the right of the top bar. */}
        <div className="hidden max-md:ml-auto max-md:flex max-md:items-center max-md:gap-0.5">
          <ThemeToggle collapsed />
          {role === "staff" && (
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted"
            >
              {ICONS.gear}
            </Link>
          )}
        </div>

        <div className={`max-md:hidden ${collapsed ? "flex justify-center" : ""}`}>
          <ThemeToggle collapsed={collapsed} />
        </div>

        {!collapsed && (
          <button
            onClick={() => window.dispatchEvent(new Event("h2h-tour"))}
            className="px-2 py-1 text-left text-[12px] text-muted underline-offset-2 hover:text-accent-ink hover:underline max-md:hidden"
          >
            ✨ Take the tour
          </button>
        )}

        <div className={`border-t border-line pt-3.5 max-md:border-0 max-md:pt-0 ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <Avatar name={realMode ? (userEmail ?? "?") : "Hunter R"} gender={realMode ? undefined : "M"} />
          ) : realMode ? (
            <>
              <div className="flex items-center gap-2 px-2 py-1 max-md:hidden">
                <Avatar name={userEmail ?? "?"} gender={undefined} />
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-[13px] font-semibold">
                    {userEmail ?? "Signed in"}
                  </div>
                  <div className="text-[11.5px] capitalize text-muted">{role}</div>
                </div>
              </div>
              <form method="post" action="/auth/signout" className="px-2 pt-1">
                <button
                  type="submit"
                  className="text-[12px] text-muted underline-offset-2 hover:underline"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <span className="label max-md:hidden">Viewing as</span>
              <div
                role="group"
                aria-label="Role switcher"
                className="my-2 flex gap-[3px] rounded-[10px] bg-surface-2 p-[3px] max-md:my-0"
              >
                {(["staff", "leader"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setDemoRole(r)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize max-md:px-2 max-md:py-1 ${
                      demoRole === r ? "bg-surface text-ink shadow-card" : "text-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 px-2 py-1 max-md:hidden">
                <Avatar name={demoRole === "staff" ? "Hunter R" : LEADER_NAME} gender="M" />
                <div className="leading-tight">
                  <div className="text-[13px] font-semibold">
                    {demoRole === "staff" ? "Hunter" : "Sam Caldwell"}
                  </div>
                  <div className="text-[11.5px] text-muted">
                    {demoRole === "staff" ? "Staff · full access" : "Leader · King Street"}
                  </div>
                </div>
              </div>
              <div className="px-2 pt-2 text-[10.5px] leading-relaxed text-faint max-md:hidden">
                Demo mode · sample data. Connect Supabase to switch to the real church.
              </div>
            </>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 pb-20 pt-7 max-md:px-4 max-md:pb-28 max-md:pt-5">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        <div className="flex">
          {items
            .filter((it) => it.href !== "/settings")
            .map((it) => {
              const active = it.href === pathname;
              const short =
                { "Lifegroup Map": "Map", Discipleship: "Tree", "Follow-up": "Guests" }[
                  it.label
                ] ?? it.label;
              return (
                <Link
                  key={it.href + it.label}
                  href={it.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 ${
                    active ? "text-accent-ink" : "text-muted"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center rounded-full px-3.5 py-1 ${
                      active ? "bg-accent-soft" : ""
                    }`}
                  >
                    {ICONS[it.icon]}
                  </span>
                  <span className={`text-[10px] leading-tight ${active ? "font-semibold" : "font-medium"}`}>
                    {short}
                  </span>
                </Link>
              );
            })}
        </div>
      </nav>

      <WelcomeTour />
    </div>
  );
}
