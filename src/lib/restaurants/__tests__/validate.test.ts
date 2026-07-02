import { describe, it, expect } from "vitest";
import { parseRestaurantPatch } from "../validate";

describe("parseRestaurantPatch", () => {
  it("accepts a partial settings update", () => {
    const parsed = parseRestaurantPatch({
      name: " Golden Duck ",
      tableCount: 20,
      cuisine: "Chinese",
    });
    expect(parsed.data).toEqual({
      name: "Golden Duck",
      tableCount: 20,
      cuisine: "Chinese",
    });
  });

  it("allows clearing optional fields but not the name", () => {
    expect(parseRestaurantPatch({ address: "" }).data).toEqual({ address: "" });
    expect(parseRestaurantPatch({ name: "" }).error).toBeTruthy();
  });

  it("rejects out-of-range table counts", () => {
    expect(parseRestaurantPatch({ tableCount: 0 }).error).toBeTruthy();
    expect(parseRestaurantPatch({ tableCount: 501 }).error).toBeTruthy();
    expect(parseRestaurantPatch({ tableCount: 2.5 }).error).toBeTruthy();
  });

  it("rejects empty patches and non-objects", () => {
    expect(parseRestaurantPatch({}).error).toBeTruthy();
    expect(parseRestaurantPatch(null).error).toBeTruthy();
  });
});
