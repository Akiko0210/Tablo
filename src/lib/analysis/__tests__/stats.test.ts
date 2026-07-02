import { describe, it, expect } from "vitest";
import type { Order } from "@/lib/orders/types";
import {
  itemPerformance,
  ordersByHour,
  periodSummary,
  revenueByDayOfWeek,
  revenueByWeek,
  weekStart,
} from "../stats";

// Wednesday, June 24 2026, 12:00 local.
const NOW = new Date(2026, 5, 24, 12, 0, 0);

let seq = 0;
function order(
  daysAgo: number,
  subtotal: number,
  lines: { name: string; quantity: number; unitPrice: number }[] = [
    { name: "Item", quantity: 1, unitPrice: subtotal },
  ],
  status: Order["status"] = "served",
  hour = 19,
): Order {
  const created = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  created.setHours(hour, 0, 0, 0);
  seq += 1;
  return {
    id: `t-${seq}`,
    restaurantId: "r",
    table: "1",
    lines: lines.map((l) => ({ ...l, addonLabels: [] })),
    subtotal,
    status,
    createdAt: created.toISOString(),
  };
}

describe("weekStart", () => {
  it("returns the Monday of the week", () => {
    const monday = weekStart(NOW);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(22); // Mon Jun 22 2026
  });
});

describe("revenueByWeek", () => {
  it("buckets served orders into the right weeks", () => {
    const orders = [
      order(0, 100, undefined, "served", 9), // current week, this morning
      order(7, 50), // previous week
      order(8, 25), // previous week (Tue)
      order(70, 999), // outside the 8-week window
    ];
    const weekly = revenueByWeek(orders, 8, NOW);
    expect(weekly).toHaveLength(8);
    expect(weekly[7].revenue).toBe(100);
    expect(weekly[6].revenue).toBe(75);
    expect(weekly.reduce((a, w) => a + w.revenue, 0)).toBe(175);
  });

  it("ignores non-served orders", () => {
    const weekly = revenueByWeek([order(0, 100, undefined, "new")], 8, NOW);
    expect(weekly[7].revenue).toBe(0);
  });
});

describe("revenueByDayOfWeek", () => {
  it("totals by weekday", () => {
    // NOW is Wednesday; 1 day ago = Tuesday, 2 = Monday.
    const orders = [order(1, 40), order(2, 10), order(9, 20)]; // Tue, Mon, Mon
    const byDay = revenueByDayOfWeek(orders, 28, NOW);
    expect(byDay[0]).toMatchObject({ day: "Mon", revenue: 30, orders: 2 });
    expect(byDay[1]).toMatchObject({ day: "Tue", revenue: 40, orders: 1 });
  });
});

describe("ordersByHour", () => {
  it("counts orders in their hour", () => {
    const orders = [order(1, 10, undefined, "served", 19), order(2, 10, undefined, "served", 19), order(3, 10, undefined, "served", 12)];
    const hours = ordersByHour(orders, 28, NOW);
    expect(hours[19].orders).toBe(2);
    expect(hours[12].orders).toBe(1);
  });
});

describe("itemPerformance", () => {
  it("computes units, revenue, and trend vs the previous window", () => {
    const orders = [
      // Current 28 days: 3 ragù
      order(5, 54, [{ name: "Ragù", quantity: 3, unitPrice: 18 }]),
      // Previous 28 days: 6 ragù
      order(35, 108, [{ name: "Ragù", quantity: 6, unitPrice: 18 }]),
    ];
    const [ragu] = itemPerformance(orders, 28, NOW);
    expect(ragu.name).toBe("Ragù");
    expect(ragu.units).toBe(3);
    expect(ragu.revenue).toBe(54);
    expect(ragu.prevUnits).toBe(6);
    expect(ragu.trendPct).toBe(-50);
  });

  it("marks items with no baseline as trend null", () => {
    const [item] = itemPerformance(
      [order(2, 10, [{ name: "New Dish", quantity: 1, unitPrice: 10 }])],
      28,
      NOW,
    );
    expect(item.trendPct).toBeNull();
  });
});

describe("periodSummary", () => {
  it("compares the last 7 days to the 7 before", () => {
    const orders = [order(1, 100), order(2, 100), order(10, 100)];
    const summary = periodSummary(orders, 7, NOW);
    expect(summary.revenue).toBe(200);
    expect(summary.orders).toBe(2);
    expect(summary.avgOrder).toBe(100);
    expect(summary.revenueTrendPct).toBe(100);
    expect(summary.ordersTrendPct).toBe(100);
  });

  it("returns null trends with no baseline", () => {
    const summary = periodSummary([order(1, 50)], 7, NOW);
    expect(summary.revenueTrendPct).toBeNull();
  });
});
