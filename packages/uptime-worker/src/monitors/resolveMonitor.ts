import { Monitor, ResolvedMonitor } from "../types";

export const resolveMonitor = (monitor: Monitor): ResolvedMonitor => {
  return {
    ...monitor,
    method: monitor.method || "GET",
    statusPageLink: monitor.statusPageLink || monitor.target,
    expectedCodes: monitor.expectedCodes || [200],
    timeout: monitor.timeout || 10000,
  };
};
