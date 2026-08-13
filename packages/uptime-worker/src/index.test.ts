import { describe, it, expect, vi, beforeEach } from "vitest";

const { tickMock, pingHeartbeatMock } = vi.hoisted(() => ({
  tickMock: vi.fn(),
  pingHeartbeatMock: vi.fn(),
}));

vi.mock("./heartbeat/pingHeartbeat", () => ({
  pingHeartbeat: pingHeartbeatMock,
}));
// The Monitor DO class is re-exported from ./index; stub it so importing the
// worker entry doesn't pull in the real Durable Object implementation.
vi.mock("./monitor/Monitor", () => ({
  Monitor: class {},
  MONITOR_DO_NAME: "monitor",
}));

// Imported after the mocks are registered.
import worker from "./index";

const controller = { cron: "*/5 * * * *" } as ScheduledController;

const idFromNameMock = vi.fn(() => "monitor-id");
const getMock = vi.fn(() => ({ tick: tickMock }));
const env = {
  MONITOR: { idFromName: idFromNameMock, get: getMock },
} as unknown as Env;

describe("scheduled handler", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tickMock.mockReset().mockResolvedValue([]);
    pingHeartbeatMock.mockReset().mockResolvedValue(undefined);
    idFromNameMock.mockClear();
    getMock.mockClear();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("pokes the Monitor DO, then pings the heartbeat", async () => {
    tickMock.mockResolvedValue([
      { name: "api", target: "https://api", status: "up" },
    ]);

    await worker.scheduled!(controller, env);

    expect(idFromNameMock).toHaveBeenCalledWith("monitor");
    expect(tickMock).toHaveBeenCalledTimes(1);
    expect(pingHeartbeatMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs the real error, rethrows, and skips the heartbeat when the tick fails", async () => {
    const boom = new Error("checks blew up");
    tickMock.mockRejectedValue(boom);

    await expect(worker.scheduled!(controller, env)).rejects.toBe(boom);

    // The actual error (not just the cron template) is logged for diagnosis.
    expect(errorSpy).toHaveBeenCalledWith(
      "[scheduled] unhandled error",
      expect.stringContaining("checks blew up"),
    );
    // Dead-man's-switch: a failed run must NOT ping, so the monitor alerts.
    expect(pingHeartbeatMock).not.toHaveBeenCalled();
  });
});
