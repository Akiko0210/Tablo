import { describe, it, expect } from "vitest";
import { formatMoney, formatDelta } from "../format";

describe("formatMoney", () => {
  it("omits cents for whole amounts", () => {
    expect(formatMoney(14)).toBe("$14");
    expect(formatMoney(0)).toBe("$0");
  });

  it("shows two decimals for fractional amounts", () => {
    expect(formatMoney(40.7)).toBe("$40.70");
    expect(formatMoney(17.46)).toBe("$17.46");
  });

  it("rounds to the nearest cent", () => {
    expect(formatMoney(19.005)).toBe("$19.01");
    expect(formatMoney(9.999)).toBe("$10");
  });
});

describe("formatDelta", () => {
  it("labels zero as Included", () => {
    expect(formatDelta(0)).toBe("Included");
  });

  it("prefixes a plus sign for positive deltas", () => {
    expect(formatDelta(4)).toBe("+$4");
    expect(formatDelta(2.5)).toBe("+$2.50");
  });

  it("uses a minus sign for negative deltas", () => {
    expect(formatDelta(-3)).toBe("−$3");
  });
});
