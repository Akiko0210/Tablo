// @vitest-environment node
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("hashPassword / verifyPassword", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("tablo123!");
    expect(await verifyPassword("tablo123!", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("tablo123!");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const a = await hashPassword("tablo123!");
    const b = await hashPassword("tablo123!");
    expect(a).not.toBe(b);
  });

  it("stores as salt:hash", async () => {
    const hash = await hashPassword("tablo123!");
    expect(hash.split(":")).toHaveLength(2);
  });

  it("rejects a malformed stored hash", async () => {
    expect(await verifyPassword("anything", "not-a-valid-hash")).toBe(false);
  });
});
