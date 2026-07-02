import { describe, it, expect } from "vitest";
import { generateHistory, hashString, mulberry32 } from "../seed-history";

const MENU = [
  { name: "Margherita", price: 14 },
  { name: "Ragù", price: 18 },
  { name: "Negroni", price: 13 },
  { name: "Tiramisù", price: 9 },
];
const NOW = new Date(2026, 5, 24, 12, 0, 0);

describe("mulberry32 / hashString", () => {
  it("is deterministic", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hashString("bella")).toBe(hashString("bella"));
    expect(hashString("bella")).not.toBe(hashString("luna"));
  });
});

describe("generateHistory", () => {
  it("is deterministic per restaurant", () => {
    const a = generateHistory("rest-1", MENU, { now: NOW });
    const b = generateHistory("rest-1", MENU, { now: NOW });
    expect(a).toEqual(b);
    const c = generateHistory("rest-2", MENU, { now: NOW });
    expect(c).not.toEqual(a);
  });

  it("produces served orders inside the window with correct subtotals", () => {
    const orders = generateHistory("rest-1", MENU, { now: NOW, days: 30 });
    expect(orders.length).toBeGreaterThan(100);
    for (const order of orders.slice(0, 25)) {
      expect(order.status).toBe("served");
      const expected = order.lines.reduce(
        (a, l) => a + l.quantity * l.unitPrice,
        0,
      );
      expect(order.subtotal).toBeCloseTo(expected, 2);
      const t = new Date(order.createdAt).getTime();
      expect(t).toBeLessThan(NOW.getTime());
      expect(t).toBeGreaterThan(NOW.getTime() - 31 * 24 * 60 * 60 * 1000);
    }
  });

  it("returns nothing for an empty or priceless menu", () => {
    expect(generateHistory("rest-1", [], { now: NOW })).toEqual([]);
    expect(
      generateHistory("rest-1", [{ name: "Free", price: 0 }], { now: NOW }),
    ).toEqual([]);
  });

  it("gives every menu item some sales", () => {
    const orders = generateHistory("rest-1", MENU, { now: NOW });
    const sold = new Set(orders.flatMap((o) => o.lines.map((l) => l.name)));
    for (const item of MENU) expect(sold.has(item.name)).toBe(true);
  });
});
