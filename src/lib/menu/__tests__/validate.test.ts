import { describe, it, expect } from "vitest";
import { parseMenuItemInput, parseMenuItemPatch } from "../validate";

const valid = {
  name: "  Shoyu Ramen ",
  description: " Classic soy broth. ",
  price: 13.456,
  category: " Noodles ",
};

describe("parseMenuItemInput", () => {
  it("accepts and normalizes a valid item (price rounded to cents)", () => {
    const parsed = parseMenuItemInput(valid);
    expect(parsed.data).toMatchObject({
      name: "Shoyu Ramen",
      description: "Classic soy broth.",
      price: 13.46,
      category: "Noodles",
    });
  });

  it("rejects missing name / category and bad prices", () => {
    expect(parseMenuItemInput({ ...valid, name: " " }).error).toBeTruthy();
    expect(parseMenuItemInput({ ...valid, category: "" }).error).toBeTruthy();
    expect(parseMenuItemInput({ ...valid, price: -1 }).error).toBeTruthy();
    expect(parseMenuItemInput({ ...valid, price: "13" }).error).toBeTruthy();
    expect(parseMenuItemInput({ ...valid, price: 10001 }).error).toBeTruthy();
  });

  it("rejects non-objects", () => {
    expect(parseMenuItemInput(null).error).toBeTruthy();
  });
});

describe("parseMenuItemPatch", () => {
  it("accepts partial updates", () => {
    expect(parseMenuItemPatch({ soldOut: true }).data).toEqual({ soldOut: true });
    expect(parseMenuItemPatch({ price: 9 }).data).toEqual({ price: 9 });
  });
  it("rejects an empty patch", () => {
    expect(parseMenuItemPatch({}).error).toBeTruthy();
  });
  it("rejects invalid fields", () => {
    expect(parseMenuItemPatch({ soldOut: "yes" }).error).toBeTruthy();
    expect(parseMenuItemPatch({ name: "" }).error).toBeTruthy();
  });
});
