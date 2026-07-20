"use client";

import { useEffect } from "react";

/** Freeze the page behind an overlay while `locked` is true.
 *
 * Position-fixing the body is the only technique iOS Safari respects —
 * `overflow: hidden` alone still lets the page scroll behind a modal. The
 * scroll position is stashed in `top` and restored on unlock. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { body } = document;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflowY: body.style.overflowY,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    // Keep the scrollbar gutter on desktop so the page doesn't jump sideways.
    body.style.overflowY = "scroll";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflowY = prev.overflowY;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
