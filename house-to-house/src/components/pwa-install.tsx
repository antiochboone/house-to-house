"use client";

// Registers the service worker and nudges phone users to install the app.
// - Android/Chrome: captures the native `beforeinstallprompt` and offers a
//   one-tap Install button.
// - iOS Safari: no such event exists, so we show the manual "Share → Add to
//   Home Screen" instruction instead.
// Never shows when already installed (standalone), on auth pages, or once
// dismissed. Registration happens regardless so offline + push are ready.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DISMISS_KEY = "h2h-install-dismissed";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstall() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [show, setShow] = useState(false);

  // Register the service worker (offline fallback + push readiness).
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes this non-standard flag when launched from home screen.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    // Add-to-home-screen only works from Safari on iOS, not Chrome/Firefox there.
    const iosInstallable = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if (iosInstallable) {
      setIosHint(true);
      setShow(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  const onAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/auth");
  if (!show || onAuthPage) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto mb-[calc(env(safe-area-inset-bottom)+72px)] w-[380px] max-w-[calc(100vw-1.5rem)] rounded-[14px] border border-line bg-bg p-3.5 shadow-card md:mb-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-[18px] font-bold text-cta-ink">
          A
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">Install House to House</div>
          {iosHint ? (
            <div className="mt-0.5 text-[12px] leading-snug text-muted">
              Tap the Share icon <span aria-hidden>⎋</span>, then{" "}
              <strong>Add to Home Screen</strong> — it opens like an app.
            </div>
          ) : (
            <div className="mt-0.5 text-[12px] leading-snug text-muted">
              Add it to your home screen for one-tap access.
            </div>
          )}
          {!iosHint && (
            <button
              onClick={install}
              className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-cta-ink"
            >
              Install
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg px-1.5 py-0.5 text-muted hover:bg-surface-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
