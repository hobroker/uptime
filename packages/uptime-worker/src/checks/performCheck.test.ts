import { vi } from "vitest";
import { performCheck } from "./performCheck";
import { ResolvedCheckConfig } from "../types";

const makeResponse = (
  status: number,
  statusText: string,
  headers: Record<string, string> = {},
) => ({
  status,
  statusText,
  headers: {
    get: (key: string) => headers[key] ?? null,
  },
});

describe("performCheck", () => {
  const baseCheck: ResolvedCheckConfig = {
    name: "api",
    target: "https://api.example.com",
    statusPageLink: "https://api.example.com",
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
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(makeResponse(200, "OK"));

    vi.stubGlobal("fetch", mockFetch);

    const result = await performCheck({ ...baseCheck, retryCount: 1 }, { env });

    expect(result.status).toBe("up");
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("marks down after exhausting retries", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(makeResponse(503, "Service Unavailable"));

    vi.stubGlobal("fetch", mockFetch);

    const result = await performCheck({ ...baseCheck, retryCount: 2 }, { env });

    expect(result.status).toBe("down");
    expect(result.error).toBe("HTTP 503 Service Unavailable");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries on thrown errors", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(makeResponse(200, "OK"));

    vi.stubGlobal("fetch", mockFetch);

    const result = await performCheck({ ...baseCheck, retryCount: 1 }, { env });

    expect(result.status).toBe("up");
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
