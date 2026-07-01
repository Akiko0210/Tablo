import { describe, it, expect } from "vitest";
import { createOrder, listOrders, updateOrderStatus } from "../store";

describe("order store", () => {
  it("creates an order with status 'new' and returns it", () => {
    const before = listOrders().length;
    const order = createOrder({
      table: "7",
      subtotal: 14,
      lines: [{ name: "Margherita", quantity: 1, unitPrice: 14, addonLabels: [] }],
    });
    expect(order.status).toBe("new");
    expect(order.id).toMatch(/^ord-/);
    expect(listOrders().length).toBe(before + 1);
  });

  it("lists orders newest first", () => {
    createOrder({
      table: "1",
      subtotal: 3,
      lines: [{ name: "Espresso", quantity: 1, unitPrice: 3, addonLabels: [] }],
    });
    const orders = listOrders();
    for (let i = 1; i < orders.length; i++) {
      expect(
        orders[i - 1].createdAt.localeCompare(orders[i].createdAt),
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("advances an order's status", () => {
    const order = createOrder({
      table: "2",
      subtotal: 11,
      lines: [{ name: "Aperol Spritz", quantity: 1, unitPrice: 11, addonLabels: [] }],
    });
    const updated = updateOrderStatus(order.id, "preparing");
    expect(updated?.status).toBe("preparing");
    expect(listOrders().find((o) => o.id === order.id)?.status).toBe("preparing");
  });

  it("returns undefined for an unknown id", () => {
    expect(updateOrderStatus("does-not-exist", "ready")).toBeUndefined();
  });
});
