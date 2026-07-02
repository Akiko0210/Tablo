// Rule-based, plain-language suggestions computed from the stats — the "AI
// suggestions" strip on the Analysis page. Pure and deterministic so the
// advice is testable and never hallucinates a number.

import {
  DAY_LABELS,
  type DayOfWeekPoint,
  type HourPoint,
  type ItemStat,
} from "./stats";

export type InsightTone = "positive" | "warning" | "info";

export interface Insight {
  tone: InsightTone;
  title: string;
  detail: string;
}

export interface InsightInputs {
  items: ItemStat[];
  days: DayOfWeekPoint[];
  hours: HourPoint[];
  /** Names currently on the menu (to catch items that never sell). */
  menuItemNames: string[];
  /** Length of the analysis window in days (for phrasing). */
  windowDays: number;
}

const DECLINE_THRESHOLD_PCT = -30;
const DECLINE_MIN_BASELINE_UNITS = 8;
const RISE_THRESHOLD_PCT = 15;
const WEEKEND_LIFT_THRESHOLD_PCT = 25;

export function buildInsights(inputs: InsightInputs): Insight[] {
  const { items, days, hours, menuItemNames, windowDays } = inputs;
  const insights: Insight[] = [];
  const windowLabel =
    windowDays % 7 === 0 ? `${windowDays / 7} weeks` : `${windowDays} days`;

  // 1. Sustained decliners — the "maybe change the menu" call-outs.
  const decliners = items.filter(
    (i) =>
      i.trendPct !== null &&
      i.trendPct <= DECLINE_THRESHOLD_PCT &&
      i.prevUnits >= DECLINE_MIN_BASELINE_UNITS,
  );
  for (const item of decliners.slice(0, 2)) {
    insights.push({
      tone: "warning",
      title: `${item.name} is selling low`,
      detail: `Down ${Math.abs(item.trendPct!)}% over the last ${windowLabel} (${item.units} sold vs ${item.prevUnits} before). If this keeps up, consider reworking the dish, adjusting its price, or swapping it off the menu.`,
    });
  }

  // 2. Star item.
  const star = items.find(
    (i) => i.trendPct !== null && i.trendPct >= RISE_THRESHOLD_PCT && i.units > 0,
  );
  if (star) {
    insights.push({
      tone: "positive",
      title: `${star.name} is taking off`,
      detail: `Up ${star.trendPct}% over the last ${windowLabel} with ${star.units} sold. Make sure it's stocked — and consider featuring it at the top of the menu.`,
    });
  }

  // 3. Menu items that never sold in the window.
  const soldNames = new Set(items.filter((i) => i.units > 0).map((i) => i.name));
  const neverSold = menuItemNames.filter((name) => !soldNames.has(name));
  if (neverSold.length > 0) {
    const list = neverSold.slice(0, 3).join(", ");
    insights.push({
      tone: "warning",
      title: `${neverSold.length === 1 ? "One dish hasn't" : `${neverSold.length} dishes haven't`} sold in ${windowLabel}`,
      detail: `${list}${neverSold.length > 3 ? "…" : ""} had zero orders. They may be hard to find on the menu, priced wrong, or ready to retire.`,
    });
  }

  // 4. Best / slowest day.
  const daysWithSales = days.filter((d) => d.orders > 0);
  if (daysWithSales.length >= 2) {
    const best = [...daysWithSales].sort((a, b) => b.revenue - a.revenue)[0];
    const worst = [...daysWithSales].sort((a, b) => a.revenue - b.revenue)[0];
    if (best.day !== worst.day && worst.revenue > 0) {
      const ratio = best.revenue / worst.revenue;
      if (ratio >= 1.5) {
        insights.push({
          tone: "info",
          title: `${fullDay(best.day)} is your strongest day`,
          detail: `${fullDay(best.day)}s bring in about ${ratio.toFixed(1)}× the revenue of ${fullDay(worst.day)}s. A ${fullDay(worst.day)} special or shorter hours could balance the week.`,
        });
      }
    }
  }

  // 5. Weekend lift.
  const weekday = days.slice(0, 5);
  const weekend = days.slice(5);
  const weekdayAvg = avg(weekday.map((d) => d.revenue));
  const weekendAvg = avg(weekend.map((d) => d.revenue));
  if (weekdayAvg > 0) {
    const liftPct = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
    if (liftPct >= WEEKEND_LIFT_THRESHOLD_PCT) {
      insights.push({
        tone: "info",
        title: "Weekends carry the week",
        detail: `Weekend days average ${liftPct}% more revenue than weekdays. Staff up for Friday–Sunday and prep inventory ahead of the rush.`,
      });
    }
  }

  // 6. Peak hour.
  const peak = [...hours].sort((a, b) => b.orders - a.orders)[0];
  if (peak && peak.orders > 0) {
    insights.push({
      tone: "info",
      title: `Orders peak around ${formatHour(peak.hour)}`,
      detail: `${peak.orders} orders came in during the ${formatHour(peak.hour)} hour over the last ${windowLabel}. Make sure the kitchen is fully staffed before then.`,
    });
  }

  return insights;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function fullDay(short: string): string {
  const names: Record<string, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };
  return names[short] ?? short;
}

export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

// Re-export so the page can pass DAY_LABELS-shaped data without importing stats.
export { DAY_LABELS };
