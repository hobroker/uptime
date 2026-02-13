import { describe, it, expect } from "vitest";
import { getCheckFailureReason } from "./getCheckFailureReason";
import { ResolvedCheckConfig } from "../types";

const makeResponse = (
  status: number,
  statusText: string,
  url = "https://example.com",
) =>
  ({
    status,
    statusText,
    url,
  }) as Response;

describe("getCheckFailureReason", () => {
  const baseCheck: ResolvedCheckConfig = {
    name: "test",
    target: "https://example.com",
    probeTarget: "https://example.com",
    method: "GET",
    expectedCodes: [200],
    timeout: 1000,
    retryCount: 0,
  };

  it("returns undefined for expected status codes", () => {
    const response = makeResponse(200, "OK");
    expect(getCheckFailureReason(baseCheck, response)).toBeUndefined();
  });

  it("returns protected message for Cloudflare Access login page with 200", () => {
    const response = makeResponse(
      200,
      "OK",
      "https://example.com/cdn-cgi/access/login",
    );
    expect(getCheckFailureReason(baseCheck, response)).toBe(
      "Protected by Cloudflare Access (HTTP 200)",
    );
  });

  it("returns generic HTTP error for unexpected status codes", () => {
    const response = makeResponse(404, "Not Found");
    expect(getCheckFailureReason(baseCheck, response)).toBe(
      "HTTP 404 Not Found",
    );
  });

  it("respects multiple expected status codes", () => {
    const check = { ...baseCheck, expectedCodes: [200, 201] };
    expect(
      getCheckFailureReason(check, makeResponse(201, "Created")),
    ).toBeUndefined();
  });

  it("returns protected message for Cloudflare Access login page with 401", () => {
    const response = makeResponse(
      401,
      "Unauthorized",
      "https://example.com/cdn-cgi/access/error",
    );
    expect(getCheckFailureReason(baseCheck, response)).toBe(
      "Protected by Cloudflare Access (HTTP 401)",
    );
  });
});
