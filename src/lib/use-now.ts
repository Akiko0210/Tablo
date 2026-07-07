"use client";

// Shared ticking clock for live "time ago" labels and timer escalation.
// Visibility-aware: the interval stops while the tab is hidden and the time
// refreshes immediately when it becomes visible again, so a backgrounded
// kitchen tablet snaps to the right colors the moment someone looks at it.

import * as React from "react";

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      setNow(Date.now());
      timer = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      stop();
      if (document.visibilityState === "visible") start();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}
