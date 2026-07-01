import { describe, it, expect } from "vitest";
import {
  unitPriceFor,
  lineTotal,
  cartSubtotal,
  cartItemCount,
  buildLineId,
} from "../cart";
import type { CartLine, MenuItem, SizeOption } from "../types";

const pizza: MenuItem = {
  id: "margherita",
  name: "Margherita",
  description: "",
  price: 14,
  categoryId: "pizza",
  tags: [],
  sizes: [
    { id: "reg", label: "Regular", priceDelta: 0 },
    { id: "lg", label: "Large", priceDelta: 4 },
  ],
  addons: [
    { id: "mozz", label: "Extra mozzarella", price: 3 },
    { id: "truffle", label: "Truffle", price: 2 },
  ],
};

const large: SizeOption = pizza.sizes![1];

describe("unitPriceFor", () => {
  it("uses the base price with no size or add-ons", () => {
    expect(unitPriceFor(pizza, undefined, [])).toBe(14);
  });

  it("adds the size delta and every add-on", () => {
    expect(unitPriceFor(pizza, large, pizza.addons!)).toBe(14 + 4 + 3 + 2);
  });
});

function line(partial: Partial<CartLine>): CartLine {
  return {
    lineId: "x",
    itemId: "margherita",
    name: "Margherita",
    quantity: 1,
    unitPrice: 14,
    addonLabels: [],
    ...partial,
  };
}

describe("line + cart totals", () => {
  it("multiplies unit price by quantity", () => {
    expect(lineTotal(line({ unitPrice: 16, quantity: 3 }))).toBe(48);
  });

  it("sums every line for the subtotal", () => {
    const lines = [
      line({ lineId: "a", unitPrice: 14, quantity: 2 }),
      line({ lineId: "b", unitPrice: 9, quantity: 1 }),
    ];
    expect(cartSubtotal(lines)).toBe(37);
  });

  it("counts total items across lines", () => {
    const lines = [
      line({ lineId: "a", quantity: 2 }),
      line({ lineId: "b", quantity: 3 }),
    ];
    expect(cartItemCount(lines)).toBe(5);
  });

  it("is zero for an empty cart", () => {
    expect(cartSubtotal([])).toBe(0);
    expect(cartItemCount([])).toBe(0);
  });
});

describe("buildLineId", () => {
  it("is stable regardless of add-on order", () => {
    expect(buildLineId("margherita", "lg", ["mozz", "truffle"])).toBe(
      buildLineId("margherita", "lg", ["truffle", "mozz"]),
    );
  });

  it("differs when the size differs", () => {
    expect(buildLineId("margherita", "reg", [])).not.toBe(
      buildLineId("margherita", "lg", []),
    );
  });

  it("differs when add-ons differ", () => {
    expect(buildLineId("margherita", "reg", ["mozz"])).not.toBe(
      buildLineId("margherita", "reg", []),
    );
  });
});
