import { describe, it, expect } from "vitest";
import { parseSignupInput, parseProfileInput } from "../validate-signup";

const validSignup = {
  restaurantName: "  Bella Trattoria  ",
  name: "  Sofia Duarte  ",
  email: "  Sofia@Bella.com  ",
  password: "tablo1234",
};

describe("parseSignupInput", () => {
  it("accepts and trims/normalizes a well-formed signup", () => {
    const parsed = parseSignupInput(validSignup);
    expect(parsed.data).toEqual({
      restaurantName: "Bella Trattoria",
      name: "Sofia Duarte",
      email: "sofia@bella.com",
      password: "tablo1234",
    });
  });

  it("rejects a missing restaurant name", () => {
    expect(parseSignupInput({ ...validSignup, restaurantName: "" }).error).toBeTruthy();
  });

  it("rejects a missing name", () => {
    expect(parseSignupInput({ ...validSignup, name: "  " }).error).toBeTruthy();
  });

  it("rejects an invalid email", () => {
    expect(parseSignupInput({ ...validSignup, email: "not-an-email" }).error).toBeTruthy();
  });

  it("rejects a short password", () => {
    expect(parseSignupInput({ ...validSignup, password: "short" }).error).toBeTruthy();
  });

  it("rejects a non-object body", () => {
    expect(parseSignupInput(null).error).toBeTruthy();
    expect(parseSignupInput("nope").error).toBeTruthy();
  });
});

describe("parseProfileInput", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(parseProfileInput({})).toEqual({ data: {} });
  });

  it("trims string fields and drops empty ones", () => {
    const parsed = parseProfileInput({ cuisine: "  Italian  ", tagline: "" });
    expect(parsed.data).toEqual({ cuisine: "Italian" });
  });

  it("accepts a valid table count", () => {
    expect(parseProfileInput({ tableCount: 12 }).data?.tableCount).toBe(12);
  });

  it("rejects a non-integer table count", () => {
    expect(parseProfileInput({ tableCount: 3.5 }).error).toBeTruthy();
  });

  it("rejects an out-of-range table count", () => {
    expect(parseProfileInput({ tableCount: 0 }).error).toBeTruthy();
    expect(parseProfileInput({ tableCount: 501 }).error).toBeTruthy();
  });

  it("rejects an overly long string field", () => {
    expect(parseProfileInput({ tagline: "x".repeat(200) }).error).toBeTruthy();
  });

  it("rejects a non-object body", () => {
    expect(parseProfileInput(null).error).toBeTruthy();
  });
});
