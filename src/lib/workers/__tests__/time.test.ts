import { describe, it, expect } from "vitest";
import {
  formatDuration,
  minutesBetween,
  minutesToday,
} from "../time";

const NOW = new Date(2026, 5, 24, 14, 0, 0); // 2 PM

function iso(hoursAgo: number): string {
  return new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
}

describe("minutesBetween", () => {
  it("floors to whole minutes and never goes negative", () => {
    expect(minutesBetween(iso(1), iso(0))).toBe(60);
    expect(minutesBetween(iso(0), iso(1))).toBe(0);
  });
});

describe("minutesToday", () => {
  it("counts a closed shift fully inside today", () => {
    expect(
      minutesToday([{ clockIn: iso(4), clockOut: iso(2) }], NOW),
    ).toBe(120);
  });

  it("counts an open shift up to now", () => {
    expect(minutesToday([{ clockIn: iso(3) }], NOW)).toBe(180);
  });

  it("clips a shift that started yesterday to local midnight", () => {
    // Started 20h ago (6 PM yesterday), ended 12h ago (2 AM today):
    // only the 2h after midnight count.
    expect(
      minutesToday([{ clockIn: iso(20), clockOut: iso(12) }], NOW),
    ).toBe(120);
  });

  it("sums multiple entries", () => {
    expect(
      minutesToday(
        [
          { clockIn: iso(6), clockOut: iso(5) },
          { clockIn: iso(2), clockOut: iso(1) },
        ],
        NOW,
      ),
    ).toBe(120);
  });

  it("returns 0 for entries entirely before today", () => {
    expect(
      minutesToday([{ clockIn: iso(40), clockOut: iso(30) }], NOW),
    ).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(200)).toBe("3h 20m");
  });
});
