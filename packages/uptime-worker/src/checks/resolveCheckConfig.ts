import { CheckConfig, ResolvedCheckConfig } from "../types";

export const resolveCheckConfig = (check: CheckConfig): ResolvedCheckConfig => {
  return {
    ...check,
    method: check.method || "GET",
    statusPageLink: check.statusPageLink || check.target,
    expectedCodes: check.expectedCodes || [200],
    timeout: check.timeout || 10000,
    retryCount: check.retryCount ?? 0,
  };
};
