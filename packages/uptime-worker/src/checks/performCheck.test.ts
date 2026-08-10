import { vi } from "vitest";
import { performCheck } from "./performCheck";
import { ResolvedCheckConfig } from "../types";

const makeResponse = (
  status: number,
  statusText: string,
  headers: Record<string, string> = {},
  url = "https://api.example.com",
) => ({
  status,
  statusText,
  url,
  headers: {
    get: (key: string) => headers[key] ?? null,
  },
});

describe("performCheck", () => {
  const baseCheck: ResolvedCheckConfig = {
    name: "api",
    target: "https://api.example.com",
    probeTarget: "https://api.example.com",
    method: "GET",
    expectedCodes: [200],
    timeout: 1000,
    retryCount: 0,
  };

  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();
    if (
      typeof globalThis.AbortSignal === "undefined" ||
      typeof globalThis.AbortSignal.timeout !== "function"
    ) {
      vi.stubGlobal("AbortSignal", { timeout: () => undefined });
    }
  });

  it("returns up on first successful check", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(makeResponse(200, "OK"));

    vi.stubGlobal("fetch", mockFetch);

    const result = await performCheck(baseCheck, { env });

    expect(result.status).toBe("up");
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries failed status codes up to retryCount and succeeds", async () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(makeResponse(200, "OK"));

    vi.stubGlobal("fetch", mockFetch);

    const promise = performCheck({ ...baseCheck, retryCount: 1 }, { env });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe("up");
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("marks down after exhausting retries", async () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValue(makeResponse(503, "Service Unavailable"));

    vi.stubGlobal("fetch", mockFetch);

    const promise = performCheck({ ...baseCheck, retryCount: 2 }, { env });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe("down");
    expect(result.error).toBe("HTTP 503 Service Unavailable");
    expect(mockFetch).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("retries on thrown errors", async () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(makeResponse(200, "OK"));

    vi.stubGlobal("fetch", mockFetch);

    const promise = performCheck({ ...baseCheck, retryCount: 1 }, { env });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe("up");
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("verifies exponential backoff timing", async () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(makeResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(makeResponse(200, "OK"));

    vi.stubGlobal("fetch", mockFetch);

    const promise = performCheck({ ...baseCheck, retryCount: 2 }, { env });

    // First attempt fails, should be waiting 5s
    await vi.advanceTimersByTimeAsync(0); // process initial fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // After 5s, second attempt should trigger
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Second attempt fails, should be waiting 10s
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result.status).toBe("up");

    vi.useRealTimers();
  });
});
