// Pure time math for worker shifts. Unit tested.

export interface TimeEntryLike {
  clockIn: string;
  clockOut?: string;
}

/** Whole minutes between two ISO timestamps (floored, never negative). */
export function minutesBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.floor(ms / 60_000));
}

/**
 * Minutes worked today (local midnight → now) across a worker's entries.
 * Open entries count up to `now`; entries spanning midnight are clipped.
 */
export function minutesToday(entries: TimeEntryLike[], now = new Date()): number {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const startMs = dayStart.getTime();
  const nowMs = now.getTime();

  let total = 0;
  for (const entry of entries) {
    const inMs = new Date(entry.clockIn).getTime();
    const outMs = entry.clockOut ? new Date(entry.clockOut).getTime() : nowMs;
    const from = Math.max(inMs, startMs);
    const to = Math.min(outMs, nowMs);
    if (to > from) total += Math.floor((to - from) / 60_000);
  }
  return total;
}

/** "3h 20m", "45m", "0m". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "Since 9:12 AM"-style label for an open shift. */
export function sinceLabel(clockInIso: string): string {
  return new Date(clockInIso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
