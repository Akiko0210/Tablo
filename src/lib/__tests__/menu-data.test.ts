import { describe, it, expect } from "vitest";
import {
  restaurant,
  itemsForCategory,
  findItem,
  searchItems,
} from "../menu-data";

describe("menu data integrity", () => {
  it("gives every item a category that exists (aside from the virtual 'popular')", () => {
    const ids = new Set(restaurant.categories.map((c) => c.id));
    for (const item of restaurant.items) {
      expect(ids.has(item.categoryId)).toBe(true);
    }
  });

  it("has no negative prices", () => {
    for (const item of restaurant.items) {
      expect(item.price).toBeGreaterThanOrEqual(0);
      item.modifierGroups?.forEach((g) =>
        g.options.forEach((o) =>
          expect(o.priceDelta).toBeGreaterThanOrEqual(0),
        ),
      );
    }
  });

  it("keeps every modifier group's min ≤ max ≤ option count", () => {
    for (const item of restaurant.items) {
      for (const g of item.modifierGroups ?? []) {
        expect(g.min).toBeLessThanOrEqual(g.max);
        expect(g.max).toBeLessThanOrEqual(g.options.length);
      }
    }
  });

  it("uses unique item ids", () => {
    const ids = restaurant.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("itemsForCategory", () => {
  it("returns only popular items for the virtual 'popular' category", () => {
    const popular = itemsForCategory("popular");
    expect(popular.length).toBeGreaterThan(0);
    expect(popular.every((i) => i.popular)).toBe(true);
  });

  it("filters by real category id", () => {
    const pizzas = itemsForCategory("pizza");
    expect(pizzas.length).toBeGreaterThan(0);
    expect(pizzas.every((i) => i.categoryId === "pizza")).toBe(true);
  });
});

describe("findItem / searchItems", () => {
  it("finds an item by id", () => {
    expect(findItem("margherita")?.name).toBe("Margherita");
    expect(findItem("nope")).toBeUndefined();
  });

  it("searches name, description, and tags case-insensitively", () => {
    expect(searchItems("margher").some((i) => i.id === "margherita")).toBe(true);
    expect(searchItems("SPICY").some((i) => i.tags.includes("Spicy"))).toBe(true);
  });

  it("returns nothing for a blank query", () => {
    expect(searchItems("   ")).toEqual([]);
  });
});
