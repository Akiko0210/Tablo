// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  createAccount,
  findAccountByEmail,
  findAccountById,
  toSafeAccount,
  updateAccountProfile,
} from "../accounts";

describe("createAccount", () => {
  it("hashes the password and computes initials", async () => {
    const account = await createAccount({
      name: "Maya Lin",
      email: `maya-${Date.now()}@example.com`,
      password: "supersecret1",
      restaurantName: "Maya's Kitchen",
    });
    expect(account.passwordHash).not.toBe("supersecret1");
    expect(account.passwordHash.split(":")).toHaveLength(2);
    expect(account.initials).toBe("ML");
    expect(account.role).toBe("Owner");
    expect(account.onboardingComplete).toBe(false);
  });

  it("normalizes the email to lowercase", async () => {
    const email = `Case-${Date.now()}@Example.com`;
    const account = await createAccount({
      name: "Test User",
      email,
      password: "supersecret1",
      restaurantName: "Test Spot",
    });
    expect(account.email).toBe(email.toLowerCase());
  });
});

describe("findAccountByEmail / findAccountById", () => {
  it("finds a created account case-insensitively by email", async () => {
    const email = `find-${Date.now()}@example.com`;
    const created = await createAccount({
      name: "Finder Test",
      email,
      password: "supersecret1",
      restaurantName: "Findery",
    });
    expect(findAccountByEmail(email.toUpperCase())?.id).toBe(created.id);
    expect(findAccountById(created.id)?.email).toBe(email.toLowerCase());
  });

  it("returns undefined for unknown accounts", () => {
    expect(findAccountByEmail("nobody@nowhere.com")).toBeUndefined();
    expect(findAccountById("acct_does_not_exist")).toBeUndefined();
  });
});

describe("updateAccountProfile", () => {
  it("merges profile fields and marks onboarding complete", async () => {
    const account = await createAccount({
      name: "Profile Test",
      email: `profile-${Date.now()}@example.com`,
      password: "supersecret1",
      restaurantName: "Profile Place",
    });
    expect(account.onboardingComplete).toBe(false);

    const updated = updateAccountProfile(account.id, {
      cuisine: "Italian",
      tableCount: 10,
    });
    expect(updated?.profile).toEqual({ cuisine: "Italian", tableCount: 10 });
    expect(updated?.onboardingComplete).toBe(true);

    const updatedAgain = updateAccountProfile(account.id, { tagline: "Cozy" });
    expect(updatedAgain?.profile).toEqual({
      cuisine: "Italian",
      tableCount: 10,
      tagline: "Cozy",
    });
  });

  it("returns undefined for an unknown account", () => {
    expect(updateAccountProfile("acct_nope", { cuisine: "X" })).toBeUndefined();
  });
});

describe("toSafeAccount", () => {
  it("strips the password hash", async () => {
    const account = await createAccount({
      name: "Safe Test",
      email: `safe-${Date.now()}@example.com`,
      password: "supersecret1",
      restaurantName: "Safe House",
    });
    const safe = toSafeAccount(account);
    expect((safe as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(safe.email).toBe(account.email);
  });
});
