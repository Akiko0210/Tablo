// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createAccount } from "../accounts";
import {
  emailTakenAny,
  findUserByIdAny,
  verifyCredentialsAny,
} from "../directory";

describe("verifyCredentialsAny", () => {
  it("authenticates the seeded demo (plaintext) account", async () => {
    const user = await verifyCredentialsAny("SOFIA@bella.com", "tablo123");
    expect(user?.id).toBe("u_sofia");
    expect(user?.restaurantName).toBe("Bella Trattoria");
  });

  it("rejects a wrong password for the demo account", async () => {
    expect(await verifyCredentialsAny("sofia@bella.com", "wrong")).toBeNull();
  });

  it("authenticates a dynamically signed-up (hashed) account", async () => {
    const email = `dir-${Date.now()}@example.com`;
    const account = await createAccount({
      name: "Dana Cook",
      email,
      password: "supersecret1",
      restaurantName: "Dana's Diner",
    });
    const user = await verifyCredentialsAny(email, "supersecret1");
    expect(user?.id).toBe(account.id);
    expect(user?.restaurantName).toBe("Dana's Diner");
  });

  it("rejects a wrong password for a signed-up account", async () => {
    const email = `dir-wrong-${Date.now()}@example.com`;
    await createAccount({
      name: "Dana Cook",
      email,
      password: "supersecret1",
      restaurantName: "Dana's Diner",
    });
    expect(await verifyCredentialsAny(email, "nope-not-it")).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    expect(
      await verifyCredentialsAny("ghost@nowhere.com", "whatever"),
    ).toBeNull();
  });
});

describe("findUserByIdAny", () => {
  it("finds the demo user", () => {
    expect(findUserByIdAny("u_sofia")?.email).toBe("sofia@bella.com");
  });

  it("finds a signed-up account", async () => {
    const account = await createAccount({
      name: "Ivy Park",
      email: `find-${Date.now()}@example.com`,
      password: "supersecret1",
      restaurantName: "Ivy's Table",
    });
    expect(findUserByIdAny(account.id)?.restaurantName).toBe("Ivy's Table");
  });

  it("returns null for an unknown id", () => {
    expect(findUserByIdAny("nope")).toBeNull();
  });
});

describe("emailTakenAny", () => {
  it("flags the demo account's email as taken", () => {
    expect(emailTakenAny("sofia@bella.com")).toBe(true);
    expect(emailTakenAny("SOFIA@BELLA.com")).toBe(true);
  });

  it("flags a signed-up account's email as taken", async () => {
    const email = `taken-${Date.now()}@example.com`;
    await createAccount({
      name: "Taken Test",
      email,
      password: "supersecret1",
      restaurantName: "Taken Spot",
    });
    expect(emailTakenAny(email)).toBe(true);
  });

  it("returns false for an unused email", () => {
    expect(emailTakenAny(`unused-${Date.now()}@example.com`)).toBe(false);
  });
});
