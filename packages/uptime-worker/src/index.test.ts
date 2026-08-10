import { describe, it, expect, vi, beforeEach } from "vitest";

const { runChecksMock, notifyAllMock, pingHeartbeatMock } = vi.hoisted(() => ({
  runChecksMock: vi.fn(),
  notifyAllMock: vi.fn(),
  pingHeartbeatMock: vi.fn(),
}));

vi.mock("./checks/runChecks", () => ({ runChecks: runChecksMock }));
vi.mock("./heartbeat/pingHeartbeat", () => ({
  pingHeartbeat: pingHeartbeatMock,
}));
vi.mock("./notifications/NotificationService", () => ({
  NotificationService: class {
    notifyAll = notifyAllMock;
  },
}));

// Imported after the mocks are registered.
import worker from "./index";

const controller = { cron: "*/5 * * * *" } as ScheduledController;
const env = { uptime: {} } as unknown as Env;

describe("scheduled handler", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    runChecksMock.mockReset();
    notifyAllMock.mockReset().mockResolvedValue(undefined);
    pingHeartbeatMock.mockReset().mockResolvedValue(undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("runs the checks, notifies all channels, then pings the heartbeat", async () => {
    runChecksMock.mockResolvedValue([
      { name: "api", target: "https://api", status: "up" },
    ]);

    await worker.scheduled!(controller, env);

    expect(runChecksMock).toHaveBeenCalledTimes(1);
    expect(notifyAllMock).toHaveBeenCalledTimes(1);
    expect(pingHeartbeatMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs the real error, rethrows, and skips the heartbeat when a step fails", async () => {
    const boom = new Error("checks blew up");
    runChecksMock.mockRejectedValue(boom);

    await expect(worker.scheduled!(controller, env)).rejects.toBe(boom);

    // The actual error (not just the cron template) is logged for diagnosis.
    expect(errorSpy).toHaveBeenCalledWith(
      "[scheduled] unhandled error",
      expect.stringContaining("checks blew up"),
    );
    expect(notifyAllMock).not.toHaveBeenCalled();
    // Dead-man's-switch: a failed run must NOT ping, so the monitor alerts.
    expect(pingHeartbeatMock).not.toHaveBeenCalled();
  });
});
