"use client";

// Light/dark theme. Three states: "light", "dark", or "system" (follow the
// phone or laptop's own setting). The choice persists per device.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "h2h-theme";

/** Runs before first paint so a dark-theme user never sees a cream flash.
 * Kept in sync with the provider below — same key, same data-theme contract. */
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_KEY}")||"system";var d=c==="dark"||(c==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;

interface ThemeApi {
  /** What the user picked (may be "system"). */
  choice: ThemeChoice;
  /** What's actually on screen right now. */
  resolved: "light" | "dark";
  setChoice: (c: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server render and first client render must agree, so start at the
  // documented default; the effect below reconciles with localStorage.
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  const apply = useCallback((next: ThemeChoice) => {
    const dark = next === "dark" || (next === "system" && systemPrefersDark());
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    setResolved(dark ? "dark" : "light");
    // Tint the phone's browser chrome to match, so the status bar doesn't
    // stay cream above a dark app.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#211f19" : "#f7f3ea");
  }, []);

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as ThemeChoice | null) ?? "system";
    setChoiceState(saved);
    apply(saved);
  }, [apply]);

  // Follow the device when the user hasn't overridden it.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice, apply]);

  const setChoice = useCallback(
    (next: ThemeChoice) => {
      setChoiceState(next);
      localStorage.setItem(THEME_KEY, next);
      apply(next);
    },
    [apply],
  );

  const value = useMemo(
    () => ({ choice, resolved, setChoice }),
    [choice, resolved, setChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
