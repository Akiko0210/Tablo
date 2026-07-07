import { describe, it, expect } from "vitest";
import { parseNewOrder } from "../validate";

const valid = {
  table: "7",
  kitchenNote: "  nut allergy  ",
  lines: [
    {
      itemId: "margherita",
      quantity: 2,
      optionIds: ["lg", "mozz"],
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
    expect(parsed!.lines[0]).toEqual({
      itemId: "margherita",
      quantity: 2,
      optionIds: ["lg", "mozz"],
      note: "well done",
    });
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

  it("rejects lines with a bad itemId or quantity", () => {
    expect(
      parseNewOrder({ ...valid, lines: [{ itemId: "", quantity: 1 }] }),
    ).toBeNull();
    expect(
      parseNewOrder({ ...valid, lines: [{ itemId: "x", quantity: 0 }] }),
    ).toBeNull();
    expect(
      parseNewOrder({ ...valid, lines: [{ itemId: "x", quantity: 100 }] }),
    ).toBeNull();
  });

  it("floors fractional quantities", () => {
    const parsed = parseNewOrder({
      ...valid,
      lines: [{ itemId: "x", quantity: 2.9 }],
    });
    expect(parsed!.lines[0].quantity).toBe(2);
  });

  it("defaults optionIds to an empty array and rejects non-string ids", () => {
    const parsed = parseNewOrder({
      ...valid,
      lines: [{ itemId: "espresso", quantity: 1 }],
    });
    expect(parsed!.lines[0].optionIds).toEqual([]);
    expect(
      parseNewOrder({
        ...valid,
        lines: [{ itemId: "x", quantity: 1, optionIds: [1] }],
      }),
    ).toBeNull();
  });

  it("never accepts client-supplied prices (they're simply ignored)", () => {
    const parsed = parseNewOrder({
      ...valid,
      subtotal: 0.01,
      lines: [{ itemId: "x", quantity: 1, unitPrice: 0.01 }],
    });
    expect(parsed!.lines[0]).not.toHaveProperty("unitPrice");
  });
});
