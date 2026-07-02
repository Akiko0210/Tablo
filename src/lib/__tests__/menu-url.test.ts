import { describe, it, expect } from "vitest";
import { tableMenuPath, tableMenuUrl } from "../menu-url";

describe("tableMenuPath", () => {
  it("builds the /m/<restaurant>/<table> path", () => {
    expect(tableMenuPath("bella", 7)).toBe("/m/bella/7");
    expect(tableMenuPath("luna-ramen", "12")).toBe("/m/luna-ramen/12");
  });

  it("encodes unusual identifiers", () => {
    expect(tableMenuPath("bella", "A 1")).toBe("/m/bella/A%201");
  });
});

describe("tableMenuUrl", () => {
  it("joins origin and path", () => {
    expect(tableMenuUrl("https://tablo.app", "bella", 7)).toBe(
      "https://tablo.app/m/bella/7",
    );
  });

  it("trims a trailing slash from the origin", () => {
    expect(tableMenuUrl("http://192.168.1.10:3000/", "bella", 3)).toBe(
      "http://192.168.1.10:3000/m/bella/3",
    );
  });
});
