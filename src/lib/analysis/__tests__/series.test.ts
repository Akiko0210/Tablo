import { describe, it, expect } from "vitest";
import {
  buildSeries,
  isCurrentPeriod,
  periodEnd,
  periodStart,
  shiftPeriod,
  type SalesEvent,
} from "../series";

// Anchor: Thursday, May 14, 2026, 13:30 local.
const ANCHOR = new Date(2026, 4, 14, 13, 30, 0);

function ev(date: Date, revenue: number, items = 1): SalesEvent {
  return { t: date.getTime(), revenue, items };
}

describe("periodStart / periodEnd", () => {
  it("day spans one calendar day", () => {
    expect(periodStart(ANCHOR, "day")).toEqual(new Date(2026, 4, 14, 0, 0, 0));
    expect(periodEnd(ANCHOR, "day")).toEqual(new Date(2026, 4, 15, 0, 0, 0));
  });

  it("week starts Monday", () => {
    // May 14 2026 is a Thursday → week starts Mon May 11.
    expect(periodStart(ANCHOR, "week")).toEqual(new Date(2026, 4, 11, 0, 0, 0));
    expect(periodEnd(ANCHOR, "week")).toEqual(new Date(2026, 4, 18, 0, 0, 0));
  });

  it("month spans the calendar month", () => {
    expect(periodStart(ANCHOR, "month")).toEqual(new Date(2026, 4, 1));
    expect(periodEnd(ANCHOR, "month")).toEqual(new Date(2026, 5, 1));
  });

  it("year spans the calendar year", () => {
    expect(periodStart(ANCHOR, "year")).toEqual(new Date(2026, 0, 1));
    expect(periodEnd(ANCHOR, "year")).toEqual(new Date(2027, 0, 1));
  });
});

describe("shiftPeriod", () => {
  it("day: next moves to the next calendar day", () => {
    expect(shiftPeriod(ANCHOR, "day", 1)).toEqual(new Date(2026, 4, 15));
    expect(shiftPeriod(ANCHOR, "day", -1)).toEqual(new Date(2026, 4, 13));
  });

  it("week: moves by 7 days", () => {
    expect(shiftPeriod(ANCHOR, "week", 1)).toEqual(new Date(2026, 4, 18));
  });

  it("month: May → June, then next → July", () => {
    const june = shiftPeriod(ANCHOR, "month", 1);
    expect(june).toEqual(new Date(2026, 5, 1));
    expect(shiftPeriod(june, "month", 1)).toEqual(new Date(2026, 6, 1));
  });

  it("month: handles year boundary (Dec → Jan next year)", () => {
    const dec = new Date(2026, 11, 10);
    expect(shiftPeriod(dec, "month", 1)).toEqual(new Date(2027, 0, 1));
  });

  it("year: next moves to the next year", () => {
    expect(shiftPeriod(ANCHOR, "year", 1)).toEqual(new Date(2027, 0, 1));
  });
});

describe("isCurrentPeriod", () => {
  it("is true when now is inside the anchor's period", () => {
    const now = new Date(2026, 4, 14, 20, 0, 0);
    expect(isCurrentPeriod(ANCHOR, "day", now)).toBe(true);
  });

  it("is false for a past day", () => {
    const now = new Date(2026, 4, 20);
    expect(isCurrentPeriod(ANCHOR, "day", now)).toBe(false);
  });

  it("month view: same month is current, previous month is not", () => {
    const now = new Date(2026, 4, 30);
    expect(isCurrentPeriod(new Date(2026, 4, 1), "month", now)).toBe(true);
    expect(isCurrentPeriod(new Date(2026, 3, 1), "month", now)).toBe(false);
  });
});

describe("buildSeries", () => {
  it("day: 24 hourly buckets, events land in the right hour", () => {
    const events = [
      ev(new Date(2026, 4, 14, 9, 15), 20),
      ev(new Date(2026, 4, 14, 9, 45), 30),
      ev(new Date(2026, 4, 14, 19, 0), 50),
      ev(new Date(2026, 4, 15, 9, 0), 999), // next day — excluded
    ];
    const res = buildSeries(events, ANCHOR, "day");
    expect(res.points).toHaveLength(24);
    expect(res.points[9]).toMatchObject({ revenue: 50, orders: 2 });
    expect(res.points[19]).toMatchObject({ revenue: 50, orders: 1 });
    expect(res.totalRevenue).toBe(100);
    expect(res.totalOrders).toBe(3);
    expect(res.avgOrder).toBeCloseTo(33.33, 1);
  });

  it("week: 7 daily buckets Mon–Sun", () => {
    const events = [
      ev(new Date(2026, 4, 11, 12, 0), 10), // Mon
      ev(new Date(2026, 4, 14, 12, 0), 40), // Thu
      ev(new Date(2026, 4, 17, 12, 0), 25), // Sun
    ];
    const res = buildSeries(events, ANCHOR, "week");
    expect(res.points).toHaveLength(7);
    expect(res.points[0]).toMatchObject({ label: "Mon", revenue: 10 });
    expect(res.points[3]).toMatchObject({ label: "Thu", revenue: 40 });
    expect(res.points[6]).toMatchObject({ label: "Sun", revenue: 25 });
    expect(res.totalRevenue).toBe(75);
  });

  it("month: one bucket per day of the month", () => {
    const events = [
      ev(new Date(2026, 4, 1, 12, 0), 100),
      ev(new Date(2026, 4, 14, 12, 0), 50),
      ev(new Date(2026, 4, 31, 12, 0), 25),
      ev(new Date(2026, 5, 1, 12, 0), 999), // June — excluded
    ];
    const res = buildSeries(events, ANCHOR, "month");
    expect(res.points).toHaveLength(31);
    expect(res.points[0]).toMatchObject({ label: "1", revenue: 100 });
    expect(res.points[13]).toMatchObject({ label: "14", revenue: 50 });
    expect(res.points[30]).toMatchObject({ label: "31", revenue: 25 });
    expect(res.totalOrders).toBe(3);
  });

  it("year: 12 monthly buckets", () => {
    const events = [
      ev(new Date(2026, 0, 15), 100), // Jan
      ev(new Date(2026, 4, 15), 200), // May
      ev(new Date(2026, 4, 20), 50), // May
      ev(new Date(2025, 4, 20), 999), // previous year — excluded
    ];
    const res = buildSeries(events, ANCHOR, "year");
    expect(res.points).toHaveLength(12);
    expect(res.points[0]).toMatchObject({ label: "Jan", revenue: 100, orders: 1 });
    expect(res.points[4]).toMatchObject({ label: "May", revenue: 250, orders: 2 });
    expect(res.totalRevenue).toBe(350);
  });

  it("empty period yields zeroed buckets and zero avg", () => {
    const res = buildSeries([], ANCHOR, "week");
    expect(res.points.every((p) => p.revenue === 0 && p.orders === 0)).toBe(true);
    expect(res.avgOrder).toBe(0);
  });
});
