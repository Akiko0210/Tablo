import { describe, it, expect } from "vitest";
import { verifyCredentials, findUserById } from "../users";

describe("verifyCredentials", () => {
  it("accepts the demo account (case-insensitive email)", () => {
    const user = verifyCredentials("SOFIA@bella.com", "tablo123");
    expect(user?.id).toBe("u_sofia");
    // never leak the password
    expect((user as Record<string, unknown>)?.password).toBeUndefined();
  });

  it("rejects a wrong password", () => {
    expect(verifyCredentials("sofia@bella.com", "nope")).toBeNull();
  });

  it("rejects an unknown email", () => {
    expect(verifyCredentials("ghost@nowhere.com", "tablo123")).toBeNull();
  });
});

describe("findUserById", () => {
  it("finds a known user without the password", () => {
    const user = findUserById("u_sofia");
    expect(user?.email).toBe("sofia@bella.com");
    expect((user as Record<string, unknown>)?.password).toBeUndefined();
  });

  it("returns null for an unknown id", () => {
    expect(findUserById("nope")).toBeNull();
  });
});
