// Deterministic synthetic order history so the Analysis page has meaningful
// charts from day one. Seeded from the restaurant id, so re-generating
// produces identical data. Orders are marked `seeded` by the store and never
// appear on the live orders board.

import type { Order } from "@/lib/orders/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** mulberry32 — tiny deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mon..Sun demand multipliers — weekends busier. */
const DOW_WEIGHT = [0.7, 0.75, 0.85, 1.0, 1.4, 1.6, 1.1];

/** Lunch + dinner peaks; index = hour 11..21. */
const HOUR_WEIGHTS: [number, number][] = [
  [11, 0.7],
  [12, 1.2],
  [13, 1.0],
  [14, 0.4],
  [17, 0.5],
  [18, 1.1],
  [19, 1.5],
  [20, 1.2],
  [21, 0.6],
];

export interface SeedMenuItem {
  name: string;
  price: number;
}

export interface SeedOptions {
  days?: number;
  now?: Date;
}

/**
 * Generates ~10 weeks of served orders from the restaurant's menu items.
 * Deterministic per restaurantId. The alphabetically-last item is given a
 * decaying popularity so the "selling low for a month" insight has something
 * real to find; overall volume trends gently upward so week-over-week growth
 * is visible.
 */
export function generateHistory(
  restaurantId: string,
  menuItems: SeedMenuItem[],
  options: SeedOptions = {},
): Omit<Order, "seeded">[] {
  const usable = menuItems.filter((m) => m.price > 0);
  if (usable.length === 0) return [];

  const days = options.days ?? 70;
  const now = options.now ?? new Date();
  const rng = mulberry32(hashString(restaurantId));

  // Stable per-item popularity, with a designated decliner.
  const weights = usable.map(() => 0.4 + rng() * 1.2);
  const declinerIdx =
    usable.length > 1 ? hashString(restaurantId + ":decline") % usable.length : -1;

  const orders: Omit<Order, "seeded">[] = [];
  let n = 0;

  for (let d = days; d >= 1; d--) {
    const date = new Date(now.getTime() - d * DAY_MS);
    const dow = (date.getDay() + 6) % 7;
    // Gentle upward volume trend: ~0.8x at the start of the window → ~1.1x now.
    const growth = 0.8 + (0.3 * (days - d)) / days;
    const base = 7 + rng() * 6;
    const count = Math.max(1, Math.round(base * DOW_WEIGHT[dow] * growth));

    for (let i = 0; i < count; i++) {
      const hour = pickHour(rng);
      const created = new Date(date);
      created.setHours(hour, Math.floor(rng() * 60), 0, 0);

      const lineCount = 1 + Math.floor(rng() * 2.4);
      const lines = [];
      let subtotal = 0;
      for (let l = 0; l < lineCount; l++) {
        const idx = pickItem(rng, weights, declinerIdx, d, days);
        const item = usable[idx];
        const quantity = rng() < 0.25 ? 2 : 1;
        lines.push({
          name: item.name,
          quantity,
          unitPrice: item.price,
          addonLabels: [],
        });
        subtotal += item.price * quantity;
      }

      n += 1;
      orders.push({
        id: `seed-${hashString(restaurantId).toString(36)}-${n}`,
        restaurantId,
        table: String(1 + Math.floor(rng() * 12)),
        lines,
        subtotal: Math.round(subtotal * 100) / 100,
        status: "served",
        createdAt: created.toISOString(),
      });
    }
  }

  return orders;
}

function pickHour(rng: () => number): number {
  const total = HOUR_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [hour, w] of HOUR_WEIGHTS) {
    r -= w;
    if (r <= 0) return hour;
  }
  return 19;
}

function pickItem(
  rng: () => number,
  weights: number[],
  declinerIdx: number,
  daysAgo: number,
  windowDays: number,
): number {
  // The decliner's weight fades from full (oldest) to 25% (today).
  const effective = weights.map((w, i) => {
    if (i !== declinerIdx) return w;
    const age = daysAgo / windowDays; // 1 = oldest, ~0 = today
    return w * (0.25 + 0.75 * age);
  });
  const total = effective.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < effective.length; i++) {
    r -= effective[i];
    if (r <= 0) return i;
  }
  return 0;
}
