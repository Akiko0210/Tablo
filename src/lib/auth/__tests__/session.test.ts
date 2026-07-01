// @vitest-environment node
import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../session";

describe("session sign/verify", () => {
  it("round-trips a valid session", async () => {
    const token = await signSession({
      userId: "u_sofia",
      name: "Sofia Duarte",
      email: "sofia@bella.com",
    });
    const payload = await verifySession(token);
    expect(payload).toEqual({
      userId: "u_sofia",
      name: "Sofia Duarte",
      email: "sofia@bella.com",
    });
  });

  it("returns null for a missing token", async () => {
    expect(await verifySession(undefined)).toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const token = await signSession({
      userId: "u_sofia",
      name: "Sofia Duarte",
      email: "sofia@bella.com",
    });
    expect(await verifySession(token + "tampered")).toBeNull();
  });
});
