import { describe, it, expect } from "vitest";
import {
  unitPriceFor,
  selectedOptionsFor,
  lineTotal,
  cartSubtotal,
  cartItemCount,
  buildLineId,
} from "../cart";
import type { CartLine, MenuItem } from "../types";

const pizza: MenuItem = {
  id: "margherita",
  name: "Margherita",
  description: "",
  price: 14,
  categoryId: "pizza",
  tags: [],
  modifierGroups: [
    {
      id: "size",
      label: "Size",
      min: 1,
      max: 1,
      required: true,
      options: [
        { id: "reg", label: "Regular", priceDelta: 0 },
        { id: "lg", label: "Large", priceDelta: 4 },
      ],
    },
    {
      id: "addons",
      label: "Add-ons",
      min: 0,
      max: 2,
      required: false,
      options: [
        { id: "mozz", label: "Extra mozzarella", priceDelta: 3 },
        { id: "truffle", label: "Truffle", priceDelta: 2 },
      ],
    },
  ],
};

describe("unitPriceFor", () => {
  it("uses the base price with no selections", () => {
    expect(unitPriceFor(pizza, [])).toBe(14);
  });

  it("adds every selected option's delta", () => {
    const selected = selectedOptionsFor(pizza, ["lg", "mozz", "truffle"]);
    expect(unitPriceFor(pizza, selected)).toBe(14 + 4 + 3 + 2);
  });
});

describe("selectedOptionsFor", () => {
  it("resolves ids to options in menu order", () => {
    const selected = selectedOptionsFor(pizza, ["truffle", "lg"]);
    expect(selected.map((o) => o.id)).toEqual(["lg", "truffle"]);
  });

  it("drops ids that don't belong to the item", () => {
    expect(selectedOptionsFor(pizza, ["nope"])).toEqual([]);
  });

  it("is empty for an item without groups", () => {
    expect(selectedOptionsFor({ ...pizza, modifierGroups: undefined }, ["lg"]))
      .toEqual([]);
  });
});

function line(partial: Partial<CartLine>): CartLine {
  return {
    lineId: "x",
    itemId: "margherita",
    name: "Margherita",
    quantity: 1,
    unitPrice: 14,
    optionIds: [],
    optionLabels: [],
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
  it("is stable regardless of option order", () => {
    expect(buildLineId("margherita", ["lg", "mozz", "truffle"])).toBe(
      buildLineId("margherita", ["truffle", "mozz", "lg"]),
    );
  });

  it("differs when the options differ", () => {
    expect(buildLineId("margherita", ["reg"])).not.toBe(
      buildLineId("margherita", ["lg"]),
    );
    expect(buildLineId("margherita", ["reg", "mozz"])).not.toBe(
      buildLineId("margherita", ["reg"]),
    );
  });
});
