import { describe, it, expect } from "vitest";
import { timeAgo } from "../time";

describe("timeAgo", () => {
  const now = new Date("2026-07-01T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("shows 'just now' under a minute", () => {
    expect(timeAgo(ago(30_000), now)).toBe("just now");
  });

  it("shows minutes", () => {
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5 min ago");
  });

  it("shows hours with pluralization", () => {
    expect(timeAgo(ago(60 * 60_000), now)).toBe("1 hr ago");
    expect(timeAgo(ago(3 * 60 * 60_000), now)).toBe("3 hrs ago");
  });

  it("shows days", () => {
    expect(timeAgo(ago(2 * 24 * 60 * 60_000), now)).toBe("2 days ago");
  });

  it("returns empty string for an invalid date", () => {
    expect(timeAgo("not-a-date", now)).toBe("");
  });
});
