import { describe, it, expect } from "vitest";
import { initialsFrom } from "../initials";

describe("initialsFrom", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsFrom("Sofia Duarte")).toBe("SD");
  });

  it("uppercases lowercase input", () => {
    expect(initialsFrom("sofia duarte")).toBe("SD");
  });

  it("handles a single word", () => {
    expect(initialsFrom("Alex")).toBe("A");
  });

  it("ignores extra whitespace between words", () => {
    expect(initialsFrom("  Sofia   Duarte  ")).toBe("SD");
  });

  it("caps at two initials for longer names", () => {
    expect(initialsFrom("Maria De La Cruz")).toBe("MD");
  });

  it("returns a placeholder for empty input", () => {
    expect(initialsFrom("")).toBe("?");
    expect(initialsFrom("   ")).toBe("?");
  });
});
