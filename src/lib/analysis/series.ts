// Pure time-series bucketing for the Analysis "revenue explorer". Given a flat
// list of sales events, a granularity, and an anchor date, it produces the
// points for a single navigable period (one day / week / month / year) plus
// that period's totals and a human range label. Framework-free and
// deterministic (takes `now` explicitly) so it's unit-testable and usable from
// the client component.

export type Granularity = "day" | "week" | "month" | "year";

export const GRANULARITIES: Granularity[] = ["day", "week", "month", "year"];

/** One completed sale: when it happened, its value, and how many items. */
export interface SalesEvent {
  /** epoch ms */
  t: number;
  revenue: number;
  /** Units across the order's lines. */
  items: number;
}

export interface SeriesPoint {
  /** x-axis tick label */
  label: string;
  revenue: number;
  orders: number;
  items: number;
  /** Derived per bucket: revenue / orders (0 when empty). */
  avgOrder: number;
  /** Derived per bucket: items / orders (0 when empty). */
  itemsPerOrder: number;
}

export interface SeriesResult {
  points: SeriesPoint[];
  /** Human label for the whole period, e.g. "Thu, May 1" or "May 2026". */
  rangeLabel: string;
  totalRevenue: number;
  totalOrders: number;
  totalItems: number;
  avgOrder: number;
  /** Average items per order across the period (0 when no orders). */
  avgItems: number;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday 00:00 of the week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow);
  return d;
}

/** First day 00:00 of the period containing `anchor` for the given granularity. */
export function periodStart(anchor: Date, g: Granularity): Date {
  switch (g) {
    case "day":
      return startOfDay(anchor);
    case "week":
      return startOfWeek(anchor);
    case "month":
      return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    case "year":
      return new Date(anchor.getFullYear(), 0, 1);
  }
}

/** Exclusive end of the period containing `anchor`. */
export function periodEnd(anchor: Date, g: Granularity): Date {
  const start = periodStart(anchor, g);
  switch (g) {
    case "day":
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    case "week": {
      const e = new Date(start);
      e.setDate(e.getDate() + 7);
      return e;
    }
    case "month":
      return new Date(start.getFullYear(), start.getMonth() + 1, 1);
    case "year":
      return new Date(start.getFullYear() + 1, 0, 1);
  }
}

/** Move the anchor one whole period forward (dir=1) or back (dir=-1). */
export function shiftPeriod(anchor: Date, g: Granularity, dir: 1 | -1): Date {
  const start = periodStart(anchor, g);
  switch (g) {
    case "day":
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + dir);
    case "week": {
      const d = new Date(start);
      d.setDate(d.getDate() + dir * 7);
      return d;
    }
    case "month":
      return new Date(start.getFullYear(), start.getMonth() + dir, 1);
    case "year":
      return new Date(start.getFullYear() + dir, 0, 1);
  }
}

/** True when `anchor`'s period contains `now` — i.e. the latest period, so
 * "next" should be disabled (no peeking into the future). */
export function isCurrentPeriod(anchor: Date, g: Granularity, now: Date): boolean {
  return now >= periodStart(anchor, g) && now < periodEnd(anchor, g);
}

function hourLabel(hour: number): string {
  const period = hour < 12 ? "a" : "p";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${period}`;
}

/** Which bucket index an event falls into within the period, or -1 if outside. */
function bucketIndex(eventDate: Date, start: Date, g: Granularity): number {
  switch (g) {
    case "day":
      return eventDate.getHours();
    case "week": {
      const dayMs = 24 * 60 * 60 * 1000;
      return Math.floor((startOfDay(eventDate).getTime() - start.getTime()) / dayMs);
    }
    case "month":
      return eventDate.getDate() - 1;
    case "year":
      return eventDate.getMonth();
  }
}

function emptyPoint(label: string): SeriesPoint {
  return { label, revenue: 0, orders: 0, items: 0, avgOrder: 0, itemsPerOrder: 0 };
}

/** Empty buckets (labels + zeroed values) for a whole period. */
function emptyPoints(start: Date, g: Granularity): SeriesPoint[] {
  switch (g) {
    case "day":
      return Array.from({ length: 24 }, (_, h) => emptyPoint(hourLabel(h)));
    case "week": {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map(emptyPoint);
    }
    case "month": {
      const daysInMonth = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
      ).getDate();
      return Array.from({ length: daysInMonth }, (_, i) =>
        emptyPoint(String(i + 1)),
      );
    }
    case "year":
      return MONTHS_SHORT.map(emptyPoint);
  }
}

function rangeLabel(start: Date, g: Granularity): string {
  switch (g) {
    case "day":
      return start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    case "week": {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const sameMonth = start.getMonth() === end.getMonth();
      const startStr = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endStr = end.toLocaleDateString("en-US", {
        month: sameMonth ? undefined : "short",
        day: "numeric",
      });
      return `${startStr} – ${endStr}`;
    }
    case "month":
      return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "year":
      return String(start.getFullYear());
  }
}

/** Bucket `events` into the single period around `anchor`. */
export function buildSeries(
  events: SalesEvent[],
  anchor: Date,
  g: Granularity,
): SeriesResult {
  const start = periodStart(anchor, g);
  const end = periodEnd(anchor, g);
  const startMs = start.getTime();
  const endMs = end.getTime();

  const points = emptyPoints(start, g);
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalItems = 0;

  for (const e of events) {
    if (e.t < startMs || e.t >= endMs) continue;
    const idx = bucketIndex(new Date(e.t), start, g);
    const point = points[idx];
    if (!point) continue;
    point.revenue += e.revenue;
    point.orders += 1;
    point.items += e.items;
    totalRevenue += e.revenue;
    totalOrders += 1;
    totalItems += e.items;
  }

  for (const p of points) {
    p.revenue = Math.round(p.revenue * 100) / 100;
    p.avgOrder =
      p.orders === 0 ? 0 : Math.round((p.revenue / p.orders) * 100) / 100;
    p.itemsPerOrder =
      p.orders === 0 ? 0 : Math.round((p.items / p.orders) * 10) / 10;
  }

  return {
    points,
    rangeLabel: rangeLabel(start, g),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    totalItems,
    avgOrder: totalOrders === 0 ? 0 : Math.round((totalRevenue / totalOrders) * 100) / 100,
    avgItems: totalOrders === 0 ? 0 : Math.round((totalItems / totalOrders) * 10) / 10,
  };
}
