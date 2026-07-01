import { describe, it, expect } from "vitest";
import { tableMenuPath, tableMenuUrl } from "../menu-url";

describe("tableMenuPath", () => {
  it("builds the /m/<table> path", () => {
    expect(tableMenuPath(7)).toBe("/m/7");
    expect(tableMenuPath("12")).toBe("/m/12");
  });

  it("encodes unusual table identifiers", () => {
    expect(tableMenuPath("A 1")).toBe("/m/A%201");
  });
});

describe("tableMenuUrl", () => {
  it("joins origin and path", () => {
    expect(tableMenuUrl("https://tablo.app", 7)).toBe("https://tablo.app/m/7");
  });

  it("trims a trailing slash from the origin", () => {
    expect(tableMenuUrl("http://192.168.1.10:3000/", 3)).toBe(
      "http://192.168.1.10:3000/m/3",
    );
  });
});
