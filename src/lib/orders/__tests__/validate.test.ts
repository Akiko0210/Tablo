import { describe, it, expect } from "vitest";
import { parseNewOrder } from "../validate";

const valid = {
  table: "7",
  subtotal: 42,
  kitchenNote: "  nut allergy  ",
  lines: [
    {
      name: "Margherita",
      quantity: 2,
      unitPrice: 21,
      sizeLabel: 'Large · 16"',
      addonLabels: ["Extra mozzarella"],
      note: "well done",
    },
  ],
};

describe("parseNewOrder", () => {
  it("accepts and trims a well-formed order", () => {
    const parsed = parseNewOrder(valid);
    expect(parsed).not.toBeNull();
    expect(parsed!.table).toBe("7");
    expect(parsed!.kitchenNote).toBe("nut allergy");
    expect(parsed!.lines[0].quantity).toBe(2);
  });

  it("rejects non-objects", () => {
    expect(parseNewOrder(null)).toBeNull();
    expect(parseNewOrder("nope")).toBeNull();
  });

  it("rejects a missing or empty table", () => {
    expect(parseNewOrder({ ...valid, table: "" })).toBeNull();
    expect(parseNewOrder({ ...valid, table: 7 })).toBeNull();
  });

  it("rejects an empty line list", () => {
    expect(parseNewOrder({ ...valid, lines: [] })).toBeNull();
  });

  it("rejects lines with bad quantity or price", () => {
    expect(
      parseNewOrder({
        ...valid,
        lines: [{ name: "X", quantity: 0, unitPrice: 5, addonLabels: [] }],
      }),
    ).toBeNull();
    expect(
      parseNewOrder({
        ...valid,
        lines: [{ name: "X", quantity: 1, unitPrice: -5, addonLabels: [] }],
      }),
    ).toBeNull();
  });

  it("defaults addonLabels to an empty array", () => {
    const parsed = parseNewOrder({
      ...valid,
      lines: [{ name: "Espresso", quantity: 1, unitPrice: 3 }],
    });
    expect(parsed!.lines[0].addonLabels).toEqual([]);
  });
});
