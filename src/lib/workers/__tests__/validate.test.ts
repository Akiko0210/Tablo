import { describe, it, expect } from "vitest";
import { parseWorkerInput, parseWorkerPatch } from "../validate";

const valid = {
  name: " Kai Tanaka ",
  role: " Line cook ",
  phone: "(555) 111-2222",
  email: "kai@luna.com",
  pin: "4321",
};

describe("parseWorkerInput", () => {
  it("accepts and trims a valid worker", () => {
    expect(parseWorkerInput(valid).data).toEqual({
      name: "Kai Tanaka",
      role: "Line cook",
      phone: "(555) 111-2222",
      email: "kai@luna.com",
      pin: "4321",
    });
  });

  it("treats phone/email as optional", () => {
    const parsed = parseWorkerInput({ name: "A", role: "B", pin: "0000" });
    expect(parsed.data?.phone).toBeUndefined();
    expect(parsed.data?.email).toBeUndefined();
  });

  it("requires a 4-digit numeric PIN", () => {
    expect(parseWorkerInput({ ...valid, pin: "123" }).error).toBeTruthy();
    expect(parseWorkerInput({ ...valid, pin: "12345" }).error).toBeTruthy();
    expect(parseWorkerInput({ ...valid, pin: "abcd" }).error).toBeTruthy();
  });

  it("rejects missing name/role and bad email", () => {
    expect(parseWorkerInput({ ...valid, name: "" }).error).toBeTruthy();
    expect(parseWorkerInput({ ...valid, role: " " }).error).toBeTruthy();
    expect(parseWorkerInput({ ...valid, email: "not-an-email" }).error).toBeTruthy();
  });
});

describe("parseWorkerPatch", () => {
  it("accepts partial updates", () => {
    expect(parseWorkerPatch({ role: "Sous chef" }).data).toEqual({
      role: "Sous chef",
    });
    expect(parseWorkerPatch({ pin: "8888" }).data).toEqual({ pin: "8888" });
  });
  it("allows clearing phone/email with empty strings", () => {
    expect(parseWorkerPatch({ phone: "", email: "" }).data).toEqual({
      phone: "",
      email: "",
    });
  });
  it("rejects an empty patch and invalid pins", () => {
    expect(parseWorkerPatch({}).error).toBeTruthy();
    expect(parseWorkerPatch({ pin: "12" }).error).toBeTruthy();
  });
});
