import { describe, it, expect } from "vitest";
import { buildInsights, formatHour } from "../insights";
import type { DayOfWeekPoint, HourPoint, ItemStat } from "../stats";

function item(partial: Partial<ItemStat> & { name: string }): ItemStat {
  return { units: 10, revenue: 100, prevUnits: 10, trendPct: 0, ...partial };
}

const quietDays: DayOfWeekPoint[] = [
  { day: "Mon", revenue: 100, orders: 10 },
  { day: "Tue", revenue: 100, orders: 10 },
  { day: "Wed", revenue: 100, orders: 10 },
  { day: "Thu", revenue: 100, orders: 10 },
  { day: "Fri", revenue: 110, orders: 11 },
  { day: "Sat", revenue: 110, orders: 11 },
  { day: "Sun", revenue: 100, orders: 10 },
];

const noHours: HourPoint[] = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  orders: 0,
}));

function build(overrides: Partial<Parameters<typeof buildInsights>[0]>) {
  return buildInsights({
    items: [],
    days: quietDays,
    hours: noHours,
    menuItemNames: [],
    windowDays: 28,
    ...overrides,
  });
}

describe("buildInsights", () => {
  it("flags a sustained decliner with a menu-change suggestion", () => {
    const insights = build({
      items: [item({ name: "Tiramisù", units: 4, prevUnits: 12, trendPct: -67 })],
      menuItemNames: ["Tiramisù"],
    });
    const warning = insights.find((i) => i.title.includes("Tiramisù"));
    expect(warning?.tone).toBe("warning");
    expect(warning?.detail).toContain("67%");
    expect(warning?.detail.toLowerCase()).toContain("menu");
  });

  it("does not flag small-sample declines", () => {
    const insights = build({
      items: [item({ name: "Rare Dish", units: 1, prevUnits: 3, trendPct: -67 })],
      menuItemNames: ["Rare Dish"],
    });
    expect(insights.find((i) => i.title.includes("Rare Dish"))).toBeUndefined();
  });

  it("celebrates a rising star", () => {
    const insights = build({
      items: [item({ name: "Negroni", units: 30, prevUnits: 20, trendPct: 50 })],
      menuItemNames: ["Negroni"],
    });
    const star = insights.find((i) => i.title.includes("Negroni"));
    expect(star?.tone).toBe("positive");
  });

  it("calls out menu items that never sold", () => {
    const insights = build({
      items: [item({ name: "Margherita" })],
      menuItemNames: ["Margherita", "Forgotten Salad"],
    });
    const zero = insights.find((i) => i.detail.includes("Forgotten Salad"));
    expect(zero?.tone).toBe("warning");
  });

  it("surfaces the strongest day when the spread is wide", () => {
    const days = quietDays.map((d) =>
      d.day === "Sat" ? { ...d, revenue: 400 } : d,
    );
    const insights = build({ days });
    expect(insights.some((i) => i.title.includes("Saturday"))).toBe(true);
  });

  it("surfaces the peak hour", () => {
    const hours = noHours.map((h) => (h.hour === 19 ? { ...h, orders: 42 } : h));
    const insights = build({ hours });
    const peak = insights.find((i) => i.title.includes("7 PM"));
    expect(peak).toBeDefined();
    expect(peak?.detail).toContain("42");
  });

  it("is quiet when there's nothing notable", () => {
    expect(build({})).toHaveLength(0);
  });
});

describe("formatHour", () => {
  it("formats 12-hour labels", () => {
    expect(formatHour(0)).toBe("12 AM");
    expect(formatHour(9)).toBe("9 AM");
    expect(formatHour(12)).toBe("12 PM");
    expect(formatHour(19)).toBe("7 PM");
  });
});
