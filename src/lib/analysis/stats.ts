// Pure order-analytics math for the dashboard Analysis page. Everything takes
// the order list + an explicit `now` so it's deterministic and unit-testable.
// Only "served" orders (completed sales) count toward revenue.

import type { Order } from "@/lib/orders/types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function completed(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === "served");
}

/** Monday 00:00 (local) of the week containing `date`. */
export function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - day);
  return d;
}

export interface WeeklyPoint {
  /** Week-start label, e.g. "Jun 23". */
  week: string;
  revenue: number;
  orders: number;
}

/** Revenue and order count per week for the last `weeks` weeks (oldest first,
 * current partial week included last). */
export function revenueByWeek(
  orders: Order[],
  weeks = 8,
  now = new Date(),
): WeeklyPoint[] {
  const currentStart = weekStart(now);
  const buckets: { start: Date; revenue: number; orders: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({
      start: new Date(currentStart.getTime() - i * 7 * DAY_MS),
      revenue: 0,
      orders: 0,
    });
  }
  const firstStart = buckets[0].start.getTime();

  for (const order of completed(orders)) {
    const t = new Date(order.createdAt).getTime();
    if (t < firstStart || t > now.getTime()) continue;
    const idx = Math.floor((t - firstStart) / (7 * DAY_MS));
    const bucket = buckets[idx];
    if (!bucket) continue;
    bucket.revenue += order.subtotal;
    bucket.orders += 1;
  }

  return buckets.map((b) => ({
    week: b.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Math.round(b.revenue * 100) / 100,
    orders: b.orders,
  }));
}

export interface DayOfWeekPoint {
  day: string;
  revenue: number;
  orders: number;
}

/** Totals per day of week (Mon…Sun) over the last `days` days. */
export function revenueByDayOfWeek(
  orders: Order[],
  days = 28,
  now = new Date(),
): DayOfWeekPoint[] {
  const since = now.getTime() - days * DAY_MS;
  const totals = DAY_LABELS.map((day) => ({ day, revenue: 0, orders: 0 }));

  for (const order of completed(orders)) {
    const created = new Date(order.createdAt);
    const t = created.getTime();
    if (t < since || t > now.getTime()) continue;
    const idx = (created.getDay() + 6) % 7;
    totals[idx].revenue += order.subtotal;
    totals[idx].orders += 1;
  }

  return totals.map((t) => ({ ...t, revenue: Math.round(t.revenue * 100) / 100 }));
}

export interface HourPoint {
  /** 0–23. */
  hour: number;
  orders: number;
}

/** Order counts by hour of day over the last `days` days. */
export function ordersByHour(
  orders: Order[],
  days = 28,
  now = new Date(),
): HourPoint[] {
  const since = now.getTime() - days * DAY_MS;
  const hours: HourPoint[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orders: 0,
  }));
  for (const order of completed(orders)) {
    const created = new Date(order.createdAt);
    const t = created.getTime();
    if (t < since || t > now.getTime()) continue;
    hours[created.getHours()].orders += 1;
  }
  return hours;
}

export interface ItemStat {
  name: string;
  /** Units sold in the current window. */
  units: number;
  revenue: number;
  /** Units sold in the equally-sized previous window. */
  prevUnits: number;
  /** Percent change in units vs the previous window; null when there's no
   * baseline (prevUnits === 0). */
  trendPct: number | null;
  /** Distinct calendar days with at least one sale in the current window —
   * a one-day spike shouldn't read as a trend. */
  distinctDays: number;
}

/** Per-item sales over the last `days` days, with a trend vs the preceding
 * `days` days. Sorted by current revenue, best seller first. */
export function itemPerformance(
  orders: Order[],
  days = 28,
  now = new Date(),
): ItemStat[] {
  const windowStart = now.getTime() - days * DAY_MS;
  const prevStart = windowStart - days * DAY_MS;

  const current = new Map<
    string,
    { units: number; revenue: number; days: Set<string> }
  >();
  const previous = new Map<string, number>();

  for (const order of completed(orders)) {
    const created = new Date(order.createdAt);
    const t = created.getTime();
    if (t > now.getTime() || t < prevStart) continue;
    const inCurrent = t >= windowStart;
    for (const line of order.lines) {
      if (inCurrent) {
        const entry =
          current.get(line.name) ?? { units: 0, revenue: 0, days: new Set<string>() };
        entry.units += line.quantity;
        entry.revenue += line.quantity * line.unitPrice;
        entry.days.add(created.toDateString());
        current.set(line.name, entry);
      } else {
        previous.set(line.name, (previous.get(line.name) ?? 0) + line.quantity);
      }
    }
  }

  const names = new Set([...current.keys(), ...previous.keys()]);
  const stats: ItemStat[] = [...names].map((name) => {
    const cur = current.get(name) ?? { units: 0, revenue: 0, days: new Set() };
    const prevUnits = previous.get(name) ?? 0;
    return {
      name,
      units: cur.units,
      revenue: Math.round(cur.revenue * 100) / 100,
      prevUnits,
      trendPct:
        prevUnits === 0
          ? null
          : Math.round(((cur.units - prevUnits) / prevUnits) * 100),
      distinctDays: cur.days.size,
    };
  });

  return stats.sort((a, b) => b.revenue - a.revenue);
}

export interface PeriodSummary {
  revenue: number;
  orders: number;
  /** Units sold across all order lines. */
  items: number;
  avgOrder: number;
  itemsPerOrder: number;
  /** vs the preceding period; null when there's no baseline. */
  revenueTrendPct: number | null;
  ordersTrendPct: number | null;
  avgOrderTrendPct: number | null;
  itemsPerOrderTrendPct: number | null;
}

function trendPct(current: number, previous: number): number | null {
  return previous === 0
    ? null
    : Math.round(((current - previous) / previous) * 100);
}

/** Headline numbers for the last `days` days vs the preceding `days` days. */
export function periodSummary(
  orders: Order[],
  days = 7,
  now = new Date(),
): PeriodSummary {
  const windowStart = now.getTime() - days * DAY_MS;
  const prevStart = windowStart - days * DAY_MS;

  const cur = { revenue: 0, orders: 0, items: 0 };
  const prev = { revenue: 0, orders: 0, items: 0 };

  for (const order of completed(orders)) {
    const t = new Date(order.createdAt).getTime();
    if (t > now.getTime() || t < prevStart) continue;
    const bucket = t >= windowStart ? cur : prev;
    bucket.revenue += order.subtotal;
    bucket.orders += 1;
    bucket.items += order.lines.reduce((n, l) => n + l.quantity, 0);
  }

  const avgOrder = cur.orders === 0 ? 0 : cur.revenue / cur.orders;
  const prevAvgOrder = prev.orders === 0 ? 0 : prev.revenue / prev.orders;
  const itemsPerOrder = cur.orders === 0 ? 0 : cur.items / cur.orders;
  const prevItemsPerOrder = prev.orders === 0 ? 0 : prev.items / prev.orders;

  return {
    revenue: Math.round(cur.revenue * 100) / 100,
    orders: cur.orders,
    items: cur.items,
    avgOrder: Math.round(avgOrder * 100) / 100,
    itemsPerOrder: Math.round(itemsPerOrder * 10) / 10,
    revenueTrendPct: trendPct(cur.revenue, prev.revenue),
    ordersTrendPct: trendPct(cur.orders, prev.orders),
    avgOrderTrendPct: trendPct(avgOrder, prevAvgOrder),
    itemsPerOrderTrendPct: trendPct(itemsPerOrder, prevItemsPerOrder),
  };
}

export interface ActivitySummary {
  /** Completed orders in the current window. */
  totalOrders: number;
  /** Completed orders in the equally-sized previous window. */
  prevTotalOrders: number;
  /** Distinct calendar days with at least one sale in the window. */
  activeDays: number;
  /** Distinct Saturdays/Sundays with at least one sale in the window. */
  activeWeekendDays: number;
}

/** How much signal the window actually holds — used to gate insights so a
 * brand-new restaurant isn't told "Tuesdays are slow" off three orders. */
export function activitySummary(
  orders: Order[],
  days = 28,
  now = new Date(),
): ActivitySummary {
  const windowStart = now.getTime() - days * DAY_MS;
  const prevStart = windowStart - days * DAY_MS;

  let totalOrders = 0;
  let prevTotalOrders = 0;
  const activeDates = new Set<string>();
  const weekendDates = new Set<string>();

  for (const order of completed(orders)) {
    const created = new Date(order.createdAt);
    const t = created.getTime();
    if (t > now.getTime() || t < prevStart) continue;
    if (t < windowStart) {
      prevTotalOrders += 1;
      continue;
    }
    totalOrders += 1;
    const key = created.toDateString();
    activeDates.add(key);
    const dow = created.getDay();
    if (dow === 0 || dow === 6) weekendDates.add(key);
  }

  return {
    totalOrders,
    prevTotalOrders,
    activeDays: activeDates.size,
    activeWeekendDays: weekendDates.size,
  };
}
