"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/lib/store";
import { Avatar } from "./ui";
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
};

function Wordmark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 pb-4 ${collapsed ? "justify-center px-0" : "px-2.5"}`}>
      <svg width="36" height="30" viewBox="0 0 46 38" fill="none" aria-hidden className="shrink-0">
        <path d="M20 13 L31 2 L42 13" stroke="var(--beige)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22.5 11 V27 H39.5 V11" stroke="var(--beige)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="28" y="19.5" width="6" height="7.5" rx="0.8" fill="var(--beige)" />
        <path d="M6.5 20 V36 H23.5 V20" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 22 L15 11 L26 22" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="12" y="28.5" width="6" height="7.5" rx="0.8" fill="var(--accent)" />
      </svg>
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
        ]
      : [
          { href: "/map", label: "Lifegroup Map", icon: "map" },
          ...(myGroupIds.length > 0
            ? [{ href: `/map?open=${myGroupIds[0]}`, label: "My Group", icon: "group" }]
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
        <div className={`border-t border-line pt-3.5 max-md:ml-auto max-md:border-0 max-md:pt-0 ${collapsed ? "flex justify-center" : ""}`}>
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
                    className={`flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize ${
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
          {items.map((it) => {
            const active = it.href === pathname;
            return (
              <Link
                key={it.href + it.label}
                href={it.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${
                  active ? "text-accent-ink" : "text-muted"
                }`}
              >
                {ICONS[it.icon]}
                <span className={`text-[10px] leading-tight ${active ? "font-semibold" : "font-medium"}`}>
                  {it.label === "Lifegroup Map" ? "Map" : it.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
