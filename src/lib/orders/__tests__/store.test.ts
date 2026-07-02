// @vitest-environment node
import { describe, it, expect } from "vitest";
import { DEMO_RESTAURANT_ID } from "@/lib/restaurants/demo";
import {
  createOrder,
  insertSeededHistory,
  listAllOrdersForAnalysis,
  listOrders,
  updateOrderStatus,
} from "../store";

const REST = DEMO_RESTAURANT_ID;

describe("order store", () => {
  it("creates an order with status 'new' and returns it", () => {
    const before = listOrders(REST).length;
    const order = createOrder(REST, {
      table: "7",
      subtotal: 14,
      lines: [{ name: "Margherita", quantity: 1, unitPrice: 14, addonLabels: [] }],
    });
    expect(order.status).toBe("new");
    expect(order.id).toMatch(/^ord-/);
    expect(order.restaurantId).toBe(REST);
    expect(listOrders(REST).length).toBe(before + 1);
  });

  it("lists orders newest first", () => {
    createOrder(REST, {
      table: "1",
      subtotal: 3,
      lines: [{ name: "Espresso", quantity: 1, unitPrice: 3, addonLabels: [] }],
    });
    const orders = listOrders(REST);
    for (let i = 1; i < orders.length; i++) {
      expect(
        orders[i - 1].createdAt.localeCompare(orders[i].createdAt),
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("scopes orders per restaurant", () => {
    const other = `rest-${Date.now()}`;
    const order = createOrder(other, {
      table: "5",
      subtotal: 10,
      lines: [{ name: "Ramen", quantity: 1, unitPrice: 10, addonLabels: [] }],
    });
    expect(listOrders(other).map((o) => o.id)).toContain(order.id);
    expect(listOrders(REST).map((o) => o.id)).not.toContain(order.id);
  });

  it("advances an order's status", () => {
    const order = createOrder(REST, {
      table: "2",
      subtotal: 11,
      lines: [{ name: "Aperol Spritz", quantity: 1, unitPrice: 11, addonLabels: [] }],
    });
    const updated = updateOrderStatus(REST, order.id, "preparing");
    expect(updated?.status).toBe("preparing");
    expect(listOrders(REST).find((o) => o.id === order.id)?.status).toBe(
      "preparing",
    );
  });

  it("refuses to advance another restaurant's order", () => {
    const order = createOrder(REST, {
      table: "3",
      subtotal: 9,
      lines: [{ name: "Tiramisù", quantity: 1, unitPrice: 9, addonLabels: [] }],
    });
    expect(updateOrderStatus("someone-else", order.id, "ready")).toBeUndefined();
  });

  it("returns undefined for an unknown id", () => {
    expect(updateOrderStatus(REST, "does-not-exist", "ready")).toBeUndefined();
  });

  it("keeps seeded history out of the live board but in analysis", () => {
    const rest = `rest-hist-${Date.now()}`;
    const ran = insertSeededHistory(rest, [
      {
        id: `seed-${Date.now()}`,
        restaurantId: rest,
        table: "1",
        lines: [{ name: "Ramen", quantity: 2, unitPrice: 12, addonLabels: [] }],
        subtotal: 24,
        status: "served",
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(ran).toBe(true);
    expect(listOrders(rest)).toHaveLength(0);
    expect(listAllOrdersForAnalysis(rest)).toHaveLength(1);
    // Idempotent: second call is a no-op.
    expect(insertSeededHistory(rest, [])).toBe(false);
  });
});
