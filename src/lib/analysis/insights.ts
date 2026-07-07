// Rule-based, plain-language suggestions computed from the stats — the "AI
// suggestions" strip on the Analysis page. Pure and deterministic so the
// advice is testable and never hallucinates a number.
//
// Every rule is volume-aware: a brand-new restaurant with a dozen orders gets
// one friendly "insights unlock as orders come in" note instead of confident
// trend calls, and a low-volume month needs bigger swings before anything is
// flagged. Below ~200 orders, whatever does fire is marked low-confidence and
// rendered muted.

import {
  DAY_LABELS,
  type ActivitySummary,
  type DayOfWeekPoint,
  type HourPoint,
  type ItemStat,
} from "./stats";

export type InsightTone = "positive" | "warning" | "info";
export type InsightConfidence = "high" | "low";

export interface Insight {
  tone: InsightTone;
  title: string;
  detail: string;
  /** "low" = based on limited data; rendered muted on the analysis page. */
  confidence: InsightConfidence;
}

export interface InsightInputs extends ActivitySummary {
  items: ItemStat[];
  days: DayOfWeekPoint[];
  hours: HourPoint[];
  /** Names currently on the menu (to catch items that never sell). */
  menuItemNames: string[];
  /** Length of the analysis window in days (for phrasing). */
  windowDays: number;
}

// Nothing fires below this — there isn't a trend to talk about yet.
const GLOBAL_MIN_ORDERS = 30;
const GLOBAL_MIN_ACTIVE_DAYS = 7;

// Under this many orders in the window, thresholds widen and whatever fires
// is marked low-confidence.
const LOW_VOLUME_ORDERS = 200;

const DECLINE_THRESHOLD_PCT = -30;
const DECLINE_THRESHOLD_PCT_LOW_VOLUME = -50;
const RISE_THRESHOLD_PCT = 15;
const RISE_THRESHOLD_PCT_LOW_VOLUME = 30;
const WEEKEND_LIFT_THRESHOLD_PCT = 25;
/** Item trends need sales on at least this many distinct days. */
const MIN_TREND_DAYS = 3;
/** Day-of-week claims need at least this many weekend days with sales. */
const MIN_WEEKEND_DAYS = 2;
const PEAK_HOUR_MIN_ORDERS = 5;
const PEAK_HOUR_MIN_SHARE = 0.1;

export function buildInsights(inputs: InsightInputs): Insight[] {
  const {
    items,
    days,
    hours,
    menuItemNames,
    windowDays,
    totalOrders,
    prevTotalOrders,
    activeDays,
    activeWeekendDays,
  } = inputs;
  const windowLabel =
    windowDays % 7 === 0 ? `${windowDays / 7} weeks` : `${windowDays} days`;

  // Global guard: too little history for any trend talk.
  if (totalOrders < GLOBAL_MIN_ORDERS || activeDays < GLOBAL_MIN_ACTIVE_DAYS) {
    return [
      {
        tone: "info",
        confidence: "high",
        title: "Insights unlock as orders come in",
        detail: `Suggestions appear once there's enough history to trust — about ${GLOBAL_MIN_ORDERS} orders across a week of service. Keep serving; the numbers are collecting.`,
      },
    ];
  }

  const lowVolume = totalOrders < LOW_VOLUME_ORDERS;
  const confidence: InsightConfidence = lowVolume ? "low" : "high";
  const declineThreshold = lowVolume
    ? DECLINE_THRESHOLD_PCT_LOW_VOLUME
    : DECLINE_THRESHOLD_PCT;
  const riseThreshold = lowVolume
    ? RISE_THRESHOLD_PCT_LOW_VOLUME
    : RISE_THRESHOLD_PCT;
  // Baseline units scale with how busy the restaurant actually is — 8 units
  // is a trend for a quiet café but noise for a packed trattoria.
  const minBaselineUnits = Math.max(8, Math.ceil(0.02 * prevTotalOrders));

  const insights: Insight[] = [];

  // 1. Sustained decliners — the "maybe change the menu" call-outs.
  const decliners = items.filter(
    (i) =>
      i.trendPct !== null &&
      i.trendPct <= declineThreshold &&
      i.prevUnits >= minBaselineUnits &&
      i.distinctDays >= MIN_TREND_DAYS,
  );
  for (const item of decliners.slice(0, 2)) {
    insights.push({
      tone: "warning",
      confidence,
      title: `${item.name} is selling low`,
      detail: `Down ${Math.abs(item.trendPct!)}% over the last ${windowLabel} (${item.units} sold vs ${item.prevUnits} before). If this keeps up, consider reworking the dish, adjusting its price, or swapping it off the menu.`,
    });
  }

  // 2. Star item.
  const star = items.find(
    (i) =>
      i.trendPct !== null &&
      i.trendPct >= riseThreshold &&
      i.units > 0 &&
      i.prevUnits >= minBaselineUnits &&
      i.distinctDays >= MIN_TREND_DAYS,
  );
  if (star) {
    insights.push({
      tone: "positive",
      confidence,
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
      confidence,
      title: `${neverSold.length === 1 ? "One dish hasn't" : `${neverSold.length} dishes haven't`} sold in ${windowLabel}`,
      detail: `${list}${neverSold.length > 3 ? "…" : ""} had zero orders. They may be hard to find on the menu, priced wrong, or ready to retire.`,
    });
  }

  // Day-of-week claims need the window to actually span weekends with sales,
  // or one lucky Saturday reads as "your strongest day".
  const enoughWeekendData = activeWeekendDays >= MIN_WEEKEND_DAYS;

  // 4. Best / slowest day.
  const daysWithSales = days.filter((d) => d.orders > 0);
  if (enoughWeekendData && daysWithSales.length >= 2) {
    const best = [...daysWithSales].sort((a, b) => b.revenue - a.revenue)[0];
    const worst = [...daysWithSales].sort((a, b) => a.revenue - b.revenue)[0];
    if (best.day !== worst.day && worst.revenue > 0) {
      const ratio = best.revenue / worst.revenue;
      if (ratio >= 1.5) {
        insights.push({
          tone: "info",
          confidence,
          title: `${fullDay(best.day)} is your strongest day`,
          detail: `${fullDay(best.day)}s bring in about ${ratio.toFixed(1)}× the revenue of ${fullDay(worst.day)}s. A ${fullDay(worst.day)} special or shorter hours could balance the week.`,
        });
      }
    }
  }

  // 5. Weekend lift.
  if (enoughWeekendData) {
    const weekday = days.slice(0, 5);
    const weekend = days.slice(5);
    const weekdayAvg = avg(weekday.map((d) => d.revenue));
    const weekendAvg = avg(weekend.map((d) => d.revenue));
    if (weekdayAvg > 0) {
      const liftPct = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
      if (liftPct >= WEEKEND_LIFT_THRESHOLD_PCT) {
        insights.push({
          tone: "info",
          confidence,
          title: "Weekends carry the week",
          detail: `Weekend days average ${liftPct}% more revenue than weekdays. Staff up for Friday–Sunday and prep inventory ahead of the rush.`,
        });
      }
    }
  }

  // 6. Peak hour — only when the peak is real, not two orders at 7 PM.
  const peak = [...hours].sort((a, b) => b.orders - a.orders)[0];
  if (
    peak &&
    peak.orders >= PEAK_HOUR_MIN_ORDERS &&
    peak.orders >= PEAK_HOUR_MIN_SHARE * totalOrders
  ) {
    insights.push({
      tone: "info",
      confidence,
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
