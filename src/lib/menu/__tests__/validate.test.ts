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

describe("modifier groups", () => {
  const group = (over: object = {}) => ({
    label: "Protein",
    min: 1,
    max: 1,
    required: true,
    options: [
      { label: "Chicken", priceDelta: 0 },
      { label: "Beef", priceDelta: 3 },
    ],
    ...over,
  });
  const withGroups = (groups: unknown) => ({ ...valid, modifierGroups: groups });

  it("accepts a valid group and defaults missing option ids to ''", () => {
    const parsed = parseMenuItemInput(withGroups([group()]));
    expect(parsed.error).toBeUndefined();
    expect(parsed.data!.modifierGroups![0]).toMatchObject({
      id: "",
      label: "Protein",
      min: 1,
      max: 1,
      required: true,
    });
    expect(parsed.data!.modifierGroups![0].options[1]).toMatchObject({
      id: "",
      label: "Beef",
      priceDelta: 3,
    });
  });

  it("bumps a required group's min to 1", () => {
    const parsed = parseMenuItemInput(withGroups([group({ min: 0 })]));
    expect(parsed.data!.modifierGroups![0].min).toBe(1);
  });

  it("enforces min ≤ max ≤ option count", () => {
    expect(parseMenuItemInput(withGroups([group({ min: 2 })])).error).toBeTruthy();
    expect(parseMenuItemInput(withGroups([group({ max: 3 })])).error).toBeTruthy();
    expect(
      parseMenuItemInput(withGroups([group({ min: 1, max: 2 })])).data,
    ).toBeTruthy();
  });

  it("rejects empty groups, unlabeled rows, and negative deltas", () => {
    expect(parseMenuItemInput(withGroups([group({ options: [] })])).error).toBeTruthy();
    expect(parseMenuItemInput(withGroups([group({ label: " " })])).error).toBeTruthy();
    expect(
      parseMenuItemInput(
        withGroups([group({ options: [{ label: "", priceDelta: 0 }] })]),
      ).error,
    ).toBeTruthy();
    expect(
      parseMenuItemInput(
        withGroups([group({ options: [{ label: "X", priceDelta: -1 }] })]),
      ).error,
    ).toBeTruthy();
  });

  it("caps the number of groups at 6", () => {
    expect(
      parseMenuItemInput(withGroups(Array.from({ length: 7 }, () => group())))
        .error,
    ).toBeTruthy();
  });

  it("accepts groups in a patch too", () => {
    const parsed = parseMenuItemPatch({ modifierGroups: [group()] });
    expect(parsed.data!.modifierGroups).toHaveLength(1);
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
