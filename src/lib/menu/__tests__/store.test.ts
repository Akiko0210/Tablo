// @vitest-environment node
import { describe, it, expect } from "vitest";
import { DEMO_RESTAURANT_ID } from "@/lib/restaurants/demo";
import {
  addMenuItem,
  categoriesFor,
  deleteMenuItem,
  listMenuItems,
  replaceAiItems,
  updateMenuItem,
} from "../store";

function freshRestaurantId() {
  return `rest-menu-${Date.now()}-${Math.random()}`;
}

describe("menu store", () => {
  it("seeds the demo restaurant's menu", () => {
    const items = listMenuItems(DEMO_RESTAURANT_ID);
    expect(items.length).toBeGreaterThan(10);
    expect(items.every((i) => i.source === "seed")).toBe(true);
    expect(categoriesFor(DEMO_RESTAURANT_ID)[0].id).toBe("popular");
  });

  it("starts other restaurants empty", () => {
    expect(listMenuItems(freshRestaurantId())).toHaveLength(0);
  });

  it("adds, updates, and deletes items scoped to a restaurant", () => {
    const rest = freshRestaurantId();
    const item = addMenuItem(
      rest,
      { name: "Shoyu Ramen", description: "Classic.", price: 14, category: "Noodles" },
      "manual",
    );
    expect(item.categoryId).toBe("noodles");
    expect(listMenuItems(rest)).toHaveLength(1);

    const updated = updateMenuItem(rest, item.id, { price: 15, soldOut: true });
    expect(updated?.price).toBe(15);
    expect(updated?.soldOut).toBe(true);

    // Another restaurant can't touch it.
    expect(updateMenuItem(freshRestaurantId(), item.id, { price: 1 })).toBeUndefined();
    expect(deleteMenuItem(freshRestaurantId(), item.id)).toBe(false);

    expect(deleteMenuItem(rest, item.id)).toBe(true);
    expect(listMenuItems(rest)).toHaveLength(0);
  });

  it("derives categories from items in first-appearance order", () => {
    const rest = freshRestaurantId();
    addMenuItem(rest, { name: "A", description: "", price: 5, category: "Mains" }, "ai");
    addMenuItem(rest, { name: "B", description: "", price: 5, category: "Drinks" }, "ai");
    addMenuItem(rest, { name: "C", description: "", price: 5, category: "Mains" }, "ai");
    expect(categoriesFor(rest)).toEqual([
      { id: "mains", label: "Mains" },
      { id: "drinks", label: "Drinks" },
    ]);
  });

  it("replaceAiItems swaps AI items but keeps manual ones", () => {
    const rest = freshRestaurantId();
    addMenuItem(rest, { name: "Keep Me", description: "", price: 9, category: "Mains" }, "manual");
    replaceAiItems(rest, [
      { name: "First AI", description: "", price: 10, category: "Mains" },
    ]);
    replaceAiItems(rest, [
      { name: "Second AI", description: "", price: 11, category: "Mains" },
      { name: "Third AI", description: "", price: 12, category: "Drinks" },
    ]);
    const names = listMenuItems(rest).map((i) => i.name);
    expect(names).toContain("Keep Me");
    expect(names).toContain("Second AI");
    expect(names).toContain("Third AI");
    expect(names).not.toContain("First AI");
  });
});
