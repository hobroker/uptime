import { resolveCheckConfig } from "./resolveCheckConfig";
import { CheckConfig } from "../types";

describe("resolveCheckConfig", () => {
  it("defaults core values when not provided", () => {
    const input: CheckConfig = {
      name: "api",
      target: "https://api.example.com",
    };

    const resolved = resolveCheckConfig(input);

    expect(resolved.method).toBe("GET");
    expect(resolved.probeTarget).toBe("https://api.example.com");
    expect(resolved.expectedCodes).toEqual([200]);
    expect(resolved.timeout).toBe(10000);
    expect(resolved.retryCount).toBe(0);
  });

  it("uses configured overrides", () => {
    const input: CheckConfig = {
      name: "api",
      target: "https://api.example.com",
      method: "POST",
      probeTarget: "https://status.example.com",
      expectedCodes: [200, 202],
      timeout: 2500,
      retryCount: 3,
    };

    const resolved = resolveCheckConfig(input);

    expect(resolved.method).toBe("POST");
    expect(resolved.probeTarget).toBe("https://status.example.com");
    expect(resolved.expectedCodes).toEqual([200, 202]);
    expect(resolved.timeout).toBe(2500);
    expect(resolved.retryCount).toBe(3);
  });

  // Guards the `??` (not `||`) defaulting: an explicitly provided falsy value
  // is a deliberate override and must be preserved, not replaced by the default.
  it("preserves explicit falsy overrides instead of defaulting them", () => {
    const input: CheckConfig = {
      name: "api",
      target: "https://api.example.com",
      method: "",
      probeTarget: "",
      expectedCodes: [],
      timeout: 0,
      retryCount: 0,
    };

    const resolved = resolveCheckConfig(input);

    expect(resolved.method).toBe("");
    expect(resolved.probeTarget).toBe("");
    expect(resolved.expectedCodes).toEqual([]);
    expect(resolved.timeout).toBe(0);
    expect(resolved.retryCount).toBe(0);
  });
});
