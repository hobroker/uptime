import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pingHeartbeat } from "./pingHeartbeat";

const makeEnv = (heartbeatUrl?: string) =>
  ({ HEARTBEAT_URL: heartbeatUrl }) as unknown as Env;

describe("pingHeartbeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (
      typeof globalThis.AbortSignal === "undefined" ||
      typeof globalThis.AbortSignal.timeout !== "function"
    ) {
      vi.stubGlobal("AbortSignal", { timeout: () => undefined });
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when HEARTBEAT_URL is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await pingHeartbeat({ env: makeEnv(undefined) });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pings the configured URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, body: null });
    vi.stubGlobal("fetch", fetchMock);

    await pingHeartbeat({ env: makeEnv("https://hc.example.com/abc") });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://hc.example.com/abc",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("does not throw when the ping request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      pingHeartbeat({ env: makeEnv("https://hc.example.com/abc") }),
    ).resolves.toBeUndefined();
  });

  it("does not throw on a non-2xx response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, body: null });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      pingHeartbeat({ env: makeEnv("https://hc.example.com/abc") }),
    ).resolves.toBeUndefined();
  });
});
