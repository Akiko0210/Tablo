import { describe, it, expect } from "vitest";
import { buildInsights, formatHour } from "../insights";
import type { DayOfWeekPoint, HourPoint, ItemStat } from "../stats";

function item(partial: Partial<ItemStat> & { name: string }): ItemStat {
  return {
    units: 10,
    revenue: 100,
    prevUnits: 10,
    trendPct: 0,
    distinctDays: 10,
    ...partial,
  };
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

// Defaults describe a busy, established restaurant so individual rules can be
// tested without the volume guards interfering.
function build(overrides: Partial<Parameters<typeof buildInsights>[0]>) {
  return buildInsights({
    items: [],
    days: quietDays,
    hours: noHours,
    menuItemNames: [],
    windowDays: 28,
    totalOrders: 500,
    prevTotalOrders: 400,
    activeDays: 28,
    activeWeekendDays: 8,
    ...overrides,
  });
}

describe("buildInsights rules", () => {
  it("flags a sustained decliner with a menu-change suggestion", () => {
    const insights = build({
      items: [item({ name: "Tiramisù", units: 4, prevUnits: 12, trendPct: -67 })],
      menuItemNames: ["Tiramisù"],
    });
    const warning = insights.find((i) => i.title.includes("Tiramisù"));
    expect(warning?.tone).toBe("warning");
    expect(warning?.confidence).toBe("high");
    expect(warning?.detail).toContain("67%");
    expect(warning?.detail.toLowerCase()).toContain("menu");
  });

  it("scales the decline baseline with volume", () => {
    // prevTotalOrders 1000 → baseline max(8, ceil(20)) = 20 units.
    const insights = build({
      prevTotalOrders: 1000,
      items: [item({ name: "Tiramisù", units: 4, prevUnits: 12, trendPct: -67 })],
    });
    expect(insights.find((i) => i.title.includes("Tiramisù"))).toBeUndefined();
  });

  it("requires sales on at least 3 distinct days for item trends", () => {
    const insights = build({
      items: [
        item({
          name: "Tiramisù",
          units: 4,
          prevUnits: 12,
          trendPct: -67,
          distinctDays: 2,
        }),
      ],
    });
    expect(insights.find((i) => i.title.includes("Tiramisù"))).toBeUndefined();
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

  it("suppresses day-of-week claims without 2 weekend days of data", () => {
    const days = quietDays.map((d) =>
      d.day === "Sat" ? { ...d, revenue: 400 } : d,
    );
    const insights = build({ days, activeWeekendDays: 1 });
    expect(insights.some((i) => i.title.includes("Saturday"))).toBe(false);
  });

  it("surfaces the peak hour when it clears the volume bar", () => {
    const hours = noHours.map((h) => (h.hour === 19 ? { ...h, orders: 60 } : h));
    const insights = build({ hours });
    const peak = insights.find((i) => i.title.includes("7 PM"));
    expect(peak).toBeDefined();
    expect(peak?.detail).toContain("60");
  });

  it("suppresses a peak hour that's under 10% of window orders", () => {
    // 42 orders at 7 PM out of 500 total = 8.4% — not a real peak.
    const hours = noHours.map((h) => (h.hour === 19 ? { ...h, orders: 42 } : h));
    expect(build({ hours }).some((i) => i.title.includes("7 PM"))).toBe(false);
  });

  it("is quiet when there's nothing notable", () => {
    expect(build({})).toHaveLength(0);
  });
});

describe("buildInsights volume tiers", () => {
  const decliner = item({
    name: "Tiramisù",
    units: 6,
    prevUnits: 10,
    trendPct: -40,
  });
  const busyHours = noHours.map((h) =>
    h.hour === 19 ? { ...h, orders: 30 } : h,
  );

  const cases: {
    label: string;
    totalOrders: number;
    activeDays: number;
    locked?: boolean;
    confidence?: "low" | "high";
    /** -40% decline on a 10-unit baseline; 30 orders in the 7 PM hour. */
    declineFires?: boolean;
    peakFires?: boolean;
  }[] = [
    { label: "empty", totalOrders: 0, activeDays: 0, locked: true },
    { label: "20 orders", totalOrders: 20, activeDays: 10, locked: true },
    { label: "3 busy days", totalOrders: 90, activeDays: 3, locked: true },
    {
      // Low tier: -40% misses the widened -50% bar; peak (30 ≥ 10% of 100) fires.
      label: "100 orders",
      totalOrders: 100,
      activeDays: 20,
      confidence: "low",
      declineFires: false,
      peakFires: true,
    },
    {
      // Full tier: -40% clears -30%; baseline max(8, 4) ≤ 10; peak 30 ≥ 20.
      label: "200 orders",
      totalOrders: 200,
      activeDays: 28,
      confidence: "high",
      declineFires: true,
      peakFires: true,
    },
    {
      // Demo-scale volume: a 10-unit baseline is noise (needs 48+) and 30
      // orders isn't a peak for 2400 — the strip goes quiet rather than
      // shouting about noise.
      label: "seeded demo (thousands)",
      totalOrders: 2400,
      activeDays: 28,
      confidence: "high",
      declineFires: false,
      peakFires: false,
    },
  ];

  it.each(cases)("$label", ({ totalOrders, activeDays, locked, confidence, declineFires, peakFires }) => {
    const insights = build({
      totalOrders,
      activeDays,
      prevTotalOrders: totalOrders,
      items: [decliner],
      hours: busyHours,
    });

    if (locked) {
      expect(insights).toHaveLength(1);
      expect(insights[0].title).toContain("unlock");
      return;
    }
    expect(insights.every((i) => i.confidence === confidence)).toBe(true);
    expect(insights.some((i) => i.title.includes("Tiramisù"))).toBe(
      declineFires,
    );
    expect(insights.some((i) => i.title.includes("7 PM"))).toBe(peakFires);
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
