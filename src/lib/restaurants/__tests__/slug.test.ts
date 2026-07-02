import { describe, it, expect } from "vitest";
import {
  kitchenCodeFor,
  normalizeKitchenCode,
  slugify,
  uniqueSlug,
} from "../slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Luna Ramen House")).toBe("luna-ramen-house");
  });
  it("strips punctuation and trims hyphens", () => {
    expect(slugify("  Bella's — Trattoria! ")).toBe("bella-s-trattoria");
  });
  it("falls back for empty input", () => {
    expect(slugify("!!!")).toBe("restaurant");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when free", () => {
    expect(uniqueSlug("Luna", new Set())).toBe("luna");
  });
  it("suffixes -2, -3… when taken", () => {
    expect(uniqueSlug("Luna", new Set(["luna"]))).toBe("luna-2");
    expect(uniqueSlug("Luna", new Set(["luna", "luna-2"]))).toBe("luna-3");
  });
});

describe("kitchenCodeFor", () => {
  it("prefixes with the slug (max 5 chars, uppercased)", () => {
    expect(kitchenCodeFor("luna-ramen-house", "4821")).toBe("LUNAR-4821");
    expect(kitchenCodeFor("bella", "1234")).toBe("BELLA-1234");
  });
  it("falls back when the slug is empty", () => {
    expect(kitchenCodeFor("", "0001")).toBe("TABLO-0001");
  });
});

describe("normalizeKitchenCode", () => {
  it("trims, uppercases, removes inner spaces", () => {
    expect(normalizeKitchenCode("  bella - 1234 ")).toBe("BELLA-1234");
  });
});
