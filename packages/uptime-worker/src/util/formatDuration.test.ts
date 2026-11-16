import { describe, it, expect } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration(45_000)).toBe("45 seconds");
    expect(formatDuration(1_000)).toBe("1 second");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(5 * 60_000 + 30_000)).toBe("5 minutes 30 seconds");
  });

  it("drops seconds once hours are involved", () => {
    expect(formatDuration(2 * 3_600_000 + 5 * 60_000 + 12_000)).toBe(
      "2 hours 5 minutes",
    );
  });

  it("formats days", () => {
    expect(formatDuration(86_400_000 + 3_600_000)).toBe("1 day 1 hour");
  });

  it("handles zero and negative durations", () => {
    expect(formatDuration(0)).toBe("less than a second");
    expect(formatDuration(-5_000)).toBe("less than a second");
  });
});
