import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runDurableObjectAlarm,
  runInDurableObject,
  evictDurableObject,
  env,
} from "cloudflare:test";
import { Monitor, MONITOR_DO_NAME } from "../monitor/Monitor";

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports are resolved inside
// the Workers runtime.
// ---------------------------------------------------------------------------

vi.mock("../checks/runChecks", () => ({
  runChecks: vi.fn(),
}));

vi.mock("../notifications/NotificationService", () => ({
  // Use a regular function so it is constructable with `new` inside the DO.
  NotificationService: function NotificationService() {
    return { notifyAll: () => Promise.resolve() };
  },
}));

vi.mock("../notifications/channels/statuspage/StatuspageChannel", () => ({
  StatuspageChannel: vi.fn(),
}));

vi.mock("../notifications/channels/telegram/TelegramChannel", () => ({
  TelegramChannel: vi.fn(),
}));

// Mock the worker config so tests control the check list.
vi.mock("../../uptime.config", () => ({
  uptimeWorkerConfig: {
    checks: [
      {
        name: "alpha",
        target: "https://alpha.test",
        flapFilter: { failureThreshold: 2, recheckInterval: 30_000 },
      },
      {
        name: "beta",
        target: "https://beta.test",
        flapFilter: { failureThreshold: 2, recheckInterval: 60_000 },
      },
    ],
    statuspageUrl: undefined,
  },
}));

import { runChecks } from "../checks/runChecks";

// Helpers for result construction
const upResult = (name: string, target: string) => ({
  name,
  target,
  status: "up" as const,
});
const downResult = (name: string, target: string, error = "HTTP 500") => ({
  name,
  target,
  status: "down" as const,
  error,
});

function getMonitorStub(): DurableObjectStub<Monitor> {
  const id = (env as Env).MONITOR.idFromName(MONITOR_DO_NAME);
  return (env as Env).MONITOR.get(id);
}

describe("Monitor Durable Object – integration", () => {
  beforeEach(async () => {
    vi.mocked(runChecks).mockReset();
    // Clear durable storage so every test starts with a clean slate.
    const stub = getMonitorStub();
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.deleteAll();
    });
  });

  afterEach(async () => {
    // Evict the in-memory DO instance between tests.
    const stub = getMonitorStub();
    await evictDurableObject(stub);
  }, 30_000);

  it("a pending check schedules an alarm; alarm fires and re-probes only pending checks", async () => {
    const stub = getMonitorStub();

    // First tick: alpha fails once (needs 2 to confirm → pending), beta is up.
    vi.mocked(runChecks).mockResolvedValueOnce([
      downResult("alpha", "https://alpha.test"),
      upResult("beta", "https://beta.test"),
    ]);

    await stub.tick();

    // An alarm must be scheduled (alpha is pending).
    const alarmAfterTick = await runInDurableObject(
      stub,
      async (_instance, state) => state.storage.getAlarm(),
    );
    expect(alarmAfterTick).not.toBeNull();

    // Alarm fires: alpha is still failing → pending (1 failure, needs 2).
    // Only alpha (the pending check) is re-probed by the alarm.
    vi.mocked(runChecks).mockImplementationOnce(async (config) => {
      // The alarm probes only active (pending) checks: just alpha.
      expect(config.checks.map((c) => c.name)).toEqual(["alpha"]);
      return [downResult("alpha", "https://alpha.test")];
    });

    const alarmRan = await runDurableObjectAlarm(stub);
    expect(alarmRan).toBe(true);

    // After the alarm: alpha is now confirmed down (2 failures = threshold).
    const states = await runInDurableObject(
      stub,
      async (_instance, state) =>
        state.storage.get<Record<string, { phase: string; failures: number }>>(
          "checkStates",
        ),
    );
    expect(states?.["alpha"]?.phase).toBe("down");
    expect(states?.["beta"]?.phase).toBe("up");
  });

  it("once a check is confirmed down the alarm loop stops", async () => {
    const stub = getMonitorStub();

    // Tick 1: alpha fails for the first time → pending.
    vi.mocked(runChecks).mockResolvedValueOnce([
      downResult("alpha", "https://alpha.test"),
      upResult("beta", "https://beta.test"),
    ]);
    await stub.tick();

    // Alarm 1: alpha fails again → confirmed down (threshold = 2).
    vi.mocked(runChecks).mockResolvedValueOnce([
      downResult("alpha", "https://alpha.test"),
    ]);
    await runDurableObjectAlarm(stub);

    // After confirmation the alarm must be cleared (no more pending checks).
    const alarmAfterConfirmation = await runInDurableObject(
      stub,
      async (_instance, state) => state.storage.getAlarm(),
    );
    expect(alarmAfterConfirmation).toBeNull();

    // Recovery is picked up by the next cron tick, not by another alarm.
    vi.mocked(runChecks).mockResolvedValueOnce([
      upResult("alpha", "https://alpha.test"),
      upResult("beta", "https://beta.test"),
    ]);
    await stub.tick();

    const statesAfterRecovery = await runInDurableObject(
      stub,
      async (_instance, state) =>
        state.storage.get<Record<string, { phase: string }>>("checkStates"),
    );
    expect(statesAfterRecovery?.["alpha"]?.phase).toBe("up");
  });

  it("a single shared alarm fires at the shortest recheckInterval when multiple checks are pending", async () => {
    const stub = getMonitorStub();

    // Both alpha (30 s) and beta (60 s) fail → both pending.
    vi.mocked(runChecks).mockResolvedValueOnce([
      downResult("alpha", "https://alpha.test"),
      downResult("beta", "https://beta.test"),
    ]);

    const before = Date.now();
    await stub.tick();
    const after = Date.now();

    const alarm = await runInDurableObject(
      stub,
      async (_instance, state) => state.storage.getAlarm(),
    );
    expect(alarm).not.toBeNull();
    // The alarm must be set to approximately now + 30 000 ms (shortest interval).
    // Allow a generous window to account for processing time on both sides.
    expect(alarm!).toBeGreaterThanOrEqual(before + 30_000);
    expect(alarm!).toBeLessThanOrEqual(after + 30_000 + 5_000);
  });

  it("confirmation state persists across DO restarts", async () => {
    const stub = getMonitorStub();

    // alpha fails once → pending.
    vi.mocked(runChecks).mockResolvedValueOnce([
      downResult("alpha", "https://alpha.test"),
      upResult("beta", "https://beta.test"),
    ]);
    await stub.tick();

    // Evict the DO (simulates a restart / eviction).
    await evictDurableObject(stub);

    // After eviction a fresh instance is created but shares the same storage.
    const freshStub = getMonitorStub();

    const states = await runInDurableObject(
      freshStub,
      async (_instance, state) =>
        state.storage.get<Record<string, { phase: string }>>("checkStates"),
    );
    // alpha must still be in the pending phase — durable storage survived.
    expect(states?.["alpha"]?.phase).toBe("pending");
  });

  it("alarm does not fire when there are no pending checks", async () => {
    const stub = getMonitorStub();

    // All checks are up: no alarm should be scheduled.
    vi.mocked(runChecks).mockResolvedValueOnce([
      upResult("alpha", "https://alpha.test"),
      upResult("beta", "https://beta.test"),
    ]);
    await stub.tick();

    const alarm = await runInDurableObject(
      stub,
      async (_instance, state) => state.storage.getAlarm(),
    );
    expect(alarm).toBeNull();

    // runDurableObjectAlarm returns false when no alarm is scheduled.
    const alarmRan = await runDurableObjectAlarm(stub);
    expect(alarmRan).toBe(false);
  });

  it("a pending check that clears on re-probe is reported up (blip filtered)", async () => {
    const stub = getMonitorStub();

    // alpha fails once → pending.
    vi.mocked(runChecks).mockResolvedValueOnce([
      downResult("alpha", "https://alpha.test"),
      upResult("beta", "https://beta.test"),
    ]);
    await stub.tick();

    // Alarm fires: alpha recovers before reaching the threshold → blip filtered.
    vi.mocked(runChecks).mockResolvedValueOnce([
      upResult("alpha", "https://alpha.test"),
    ]);
    await runDurableObjectAlarm(stub);

    const states = await runInDurableObject(
      stub,
      async (_instance, state) =>
        state.storage.get<
          Record<string, { phase: string; failures: number }>
        >("checkStates"),
    );
    expect(states?.["alpha"]?.phase).toBe("up");

    // No alarm should remain (no pending checks after blip resolved).
    const alarm = await runInDurableObject(
      stub,
      async (_instance, state) => state.storage.getAlarm(),
    );
    expect(alarm).toBeNull();
  });
});
