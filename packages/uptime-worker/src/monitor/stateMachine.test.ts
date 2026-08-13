import { describe, it, expect } from "vitest";
import {
  CheckState,
  CheckStateMap,
  computeSnapshot,
  isActive,
  nextAlarmDelay,
  transitionCheck,
} from "./stateMachine";
import { CheckResult, ResolvedCheckConfig } from "../types";

const up: CheckResult = { name: "api", target: "https://api", status: "up" };
const down: CheckResult = {
  name: "api",
  target: "https://api",
  status: "down",
  error: "HTTP 521",
};

const resolved = (over: {
  name: string;
  recheckInterval?: number;
}): ResolvedCheckConfig => ({
  name: over.name,
  target: `https://${over.name}`,
  method: "GET",
  probeTarget: `https://${over.name}`,
  expectedCodes: [200],
  timeout: 10000,
  retryCount: 0,
  flapFilter: {
    failureThreshold: 1,
    recheckInterval: over.recheckInterval ?? 60000,
  },
});

describe("transitionCheck", () => {
  describe("threshold = 1 (default, report on first failure)", () => {
    it("up + down → down immediately", () => {
      expect(transitionCheck(undefined, down, 1)).toEqual({
        phase: "down",
        failures: 1,
        error: "HTTP 521",
      });
    });

    it("up + up → stays up", () => {
      expect(transitionCheck(undefined, up, 1)).toEqual({
        phase: "up",
        failures: 0,
      });
    });

    it("down + up → recovers to up", () => {
      const prev: CheckState = { phase: "down", failures: 1, error: "x" };
      expect(transitionCheck(prev, up, 1)).toEqual({
        phase: "up",
        failures: 0,
      });
    });
  });

  describe("threshold = 2 (confirm before reporting)", () => {
    it("up + down → pending, not yet down", () => {
      expect(transitionCheck(undefined, down, 2)).toEqual({
        phase: "pending",
        failures: 1,
        error: "HTTP 521",
      });
    });

    it("pending + down → down once threshold reached", () => {
      const prev: CheckState = { phase: "pending", failures: 1 };
      expect(transitionCheck(prev, down, 2)).toEqual({
        phase: "down",
        failures: 2,
        error: "HTTP 521",
      });
    });

    it("pending + up → clears to up, never alerts (the filtered blip)", () => {
      const prev: CheckState = { phase: "pending", failures: 1 };
      expect(transitionCheck(prev, up, 2)).toEqual({
        phase: "up",
        failures: 0,
      });
    });

    it("down + down → stays down and keeps watching", () => {
      const prev: CheckState = { phase: "down", failures: 2, error: "old" };
      expect(transitionCheck(prev, down, 2)).toEqual({
        phase: "down",
        failures: 2,
        error: "HTTP 521",
      });
    });
  });

  it("clamps a non-positive threshold to 1", () => {
    expect(transitionCheck(undefined, down, 0).phase).toBe("down");
  });
});

describe("isActive", () => {
  it("is true for pending and down, false otherwise", () => {
    expect(isActive({ phase: "pending", failures: 1 })).toBe(true);
    expect(isActive({ phase: "down", failures: 1 })).toBe(true);
    expect(isActive({ phase: "up", failures: 0 })).toBe(false);
    expect(isActive(undefined)).toBe(false);
  });
});

describe("computeSnapshot", () => {
  const checks = [resolved({ name: "api" }), resolved({ name: "web" })];

  it("reports only confirmed-down checks as down", () => {
    const states: CheckStateMap = {
      api: { phase: "down", failures: 1, error: "HTTP 521" },
      web: { phase: "pending", failures: 1, error: "HTTP 500" },
    };

    expect(computeSnapshot(checks, states)).toEqual([
      { name: "api", target: "https://api", status: "down", error: "HTTP 521" },
      // pending is still reported up — the blip is filtered.
      { name: "web", target: "https://web", status: "up" },
    ]);
  });

  it("treats an unknown check as up", () => {
    expect(computeSnapshot(checks, {})).toEqual([
      { name: "api", target: "https://api", status: "up" },
      { name: "web", target: "https://web", status: "up" },
    ]);
  });
});

describe("nextAlarmDelay", () => {
  it("returns null when nothing is active", () => {
    const checks = [resolved({ name: "api" })];
    expect(nextAlarmDelay(checks, { api: { phase: "up", failures: 0 } })).toBe(
      null,
    );
  });

  it("returns the shortest recheckInterval among active checks", () => {
    const checks = [
      resolved({ name: "api", recheckInterval: 60000 }),
      resolved({ name: "web", recheckInterval: 30000 }),
      resolved({ name: "cdn", recheckInterval: 90000 }),
    ];
    const states: CheckStateMap = {
      api: { phase: "down", failures: 1 },
      web: { phase: "pending", failures: 1 },
      cdn: { phase: "up", failures: 0 },
    };
    expect(nextAlarmDelay(checks, states)).toBe(30000);
  });
});
