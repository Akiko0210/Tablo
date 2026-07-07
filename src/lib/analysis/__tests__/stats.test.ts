import { describe, it, expect } from "vitest";
import type { Order } from "@/lib/orders/types";
import {
  activitySummary,
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
    lines: lines.map((l) => ({ ...l, optionLabels: [] })),
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

  it("counts distinct sale days, not orders", () => {
    const orders = [
      order(2, 10, [{ name: "Ragù", quantity: 1, unitPrice: 10 }]),
      order(2, 10, [{ name: "Ragù", quantity: 1, unitPrice: 10 }]), // same day
      order(5, 10, [{ name: "Ragù", quantity: 1, unitPrice: 10 }]),
    ];
    const [ragu] = itemPerformance(orders, 28, NOW);
    expect(ragu.distinctDays).toBe(2);
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

  it("computes items per order and its trend", () => {
    const orders = [
      // Current week: 2 orders, 5 items → 2.5 items/order
      order(1, 30, [{ name: "A", quantity: 3, unitPrice: 10 }]),
      order(2, 20, [{ name: "B", quantity: 2, unitPrice: 10 }]),
      // Previous week: 1 order, 1 item → 1 item/order
      order(10, 10, [{ name: "A", quantity: 1, unitPrice: 10 }]),
    ];
    const summary = periodSummary(orders, 7, NOW);
    expect(summary.items).toBe(5);
    expect(summary.itemsPerOrder).toBe(2.5);
    expect(summary.itemsPerOrderTrendPct).toBe(150);
    expect(summary.avgOrderTrendPct).toBe(150); // 25 avg vs 10 avg
  });

  it("returns null trends with no baseline", () => {
    const summary = periodSummary([order(1, 50)], 7, NOW);
    expect(summary.revenueTrendPct).toBeNull();
    expect(summary.avgOrderTrendPct).toBeNull();
    expect(summary.itemsPerOrderTrendPct).toBeNull();
  });
});

describe("activitySummary", () => {
  it("counts window orders, previous-window orders, and active days", () => {
    const orders = [
      order(1, 10), // Tue
      order(1, 10), // Tue (same day)
      order(3, 10), // Sun — weekend
      order(4, 10), // Sat — weekend
      order(40, 10), // previous window
      order(999, 10), // outside both windows
    ];
    const activity = activitySummary(orders, 28, NOW);
    expect(activity.totalOrders).toBe(4);
    expect(activity.prevTotalOrders).toBe(1);
    expect(activity.activeDays).toBe(3);
    expect(activity.activeWeekendDays).toBe(2);
  });

  it("ignores non-served orders", () => {
    const activity = activitySummary([order(1, 10, undefined, "new")], 28, NOW);
    expect(activity.totalOrders).toBe(0);
    expect(activity.activeDays).toBe(0);
  });
});
