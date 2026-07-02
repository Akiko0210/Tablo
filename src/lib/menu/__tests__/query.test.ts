import { describe, it, expect } from "vitest";
import type { MenuItem } from "@/lib/types";
import { itemsForCategory, searchItems } from "../query";

const items: MenuItem[] = [
  {
    id: "a",
    name: "Margherita",
    description: "Tomato and basil pizza",
    price: 14,
    categoryId: "pizza",
    tags: ["Vegetarian"],
    popular: true,
  },
  {
    id: "b",
    name: "Shoyu Ramen",
    description: "Soy broth noodles",
    price: 13,
    categoryId: "noodles",
    tags: [],
  },
];

describe("itemsForCategory", () => {
  it("filters by category id", () => {
    expect(itemsForCategory(items, "noodles").map((i) => i.id)).toEqual(["b"]);
  });
  it("treats 'popular' as a virtual category", () => {
    expect(itemsForCategory(items, "popular").map((i) => i.id)).toEqual(["a"]);
  });
});

describe("searchItems", () => {
  it("matches name, description, and tags case-insensitively", () => {
    expect(searchItems(items, "RAMEN").map((i) => i.id)).toEqual(["b"]);
    expect(searchItems(items, "vegetarian").map((i) => i.id)).toEqual(["a"]);
  });
  it("returns nothing for a blank query", () => {
    expect(searchItems(items, "  ")).toEqual([]);
  });
});
