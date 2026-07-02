// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  DEMO_KITCHEN_CODE,
  DEMO_RESTAURANT_ID,
  DEMO_RESTAURANT_SLUG,
  createRestaurant,
  findRestaurantByKitchenCode,
  findRestaurantByOwner,
  findRestaurantBySlug,
  updateRestaurant,
} from "../store";

describe("restaurant store", () => {
  it("seeds the demo restaurant owned by the demo user", () => {
    const demo = findRestaurantBySlug(DEMO_RESTAURANT_SLUG);
    expect(demo?.id).toBe(DEMO_RESTAURANT_ID);
    expect(demo?.demo).toBe(true);
    expect(findRestaurantByOwner("u_sofia")?.id).toBe(DEMO_RESTAURANT_ID);
  });

  it("creates a restaurant with a unique slug and kitchen code", () => {
    const a = createRestaurant({ name: "Test Slug Cafe", ownerUserId: "u1" });
    const b = createRestaurant({ name: "Test Slug Cafe", ownerUserId: "u2" });
    expect(a.slug).toBe("test-slug-cafe");
    expect(b.slug).toBe("test-slug-cafe-2");
    expect(a.kitchenCode).toMatch(/^TESTS-\d{4}$/);
    expect(a.tableCount).toBe(12);
  });

  it("looks up by kitchen code, case/space-insensitively", () => {
    expect(findRestaurantByKitchenCode(" bella-1234 ")?.id).toBe(
      DEMO_RESTAURANT_ID,
    );
    expect(findRestaurantByKitchenCode(DEMO_KITCHEN_CODE)?.id).toBe(
      DEMO_RESTAURANT_ID,
    );
    expect(findRestaurantByKitchenCode("NOPE-0000")).toBeUndefined();
  });

  it("updates profile fields and recomputes initials on rename", () => {
    const r = createRestaurant({ name: "Rename Me", ownerUserId: "u3" });
    const updated = updateRestaurant(r.id, {
      name: "Golden Duck",
      tableCount: 20,
      cuisine: "Chinese",
      address: "1 Duck Way",
    });
    expect(updated?.name).toBe("Golden Duck");
    expect(updated?.initials).toBe("GD");
    expect(updated?.tableCount).toBe(20);
    expect(updated?.address).toBe("1 Duck Way");
  });

  it("ignores out-of-range table counts", () => {
    const r = createRestaurant({ name: "Table Test", ownerUserId: "u4" });
    updateRestaurant(r.id, { tableCount: 0 });
    expect(findRestaurantBySlug(r.slug)?.tableCount).toBe(12);
  });
});
