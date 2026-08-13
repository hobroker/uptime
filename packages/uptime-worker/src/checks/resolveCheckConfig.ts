import { CheckConfig, ResolvedCheckConfig } from "../types";

/** Defaults applied to a check when a field is not explicitly configured. */
export const CHECK_DEFAULTS = {
  method: "GET",
  expectedCodes: [200],
  timeout: 10000,
  retryCount: 0,
  // Flap filtering: report on the first failure and re-probe pending/down
  // checks once a minute (see FlapFilterConfig).
  failureThreshold: 1,
  recheckInterval: 60000,
} as const;

export const resolveCheckConfig = (check: CheckConfig): ResolvedCheckConfig => {
  return {
    ...check,
    method: check.method ?? CHECK_DEFAULTS.method,
    probeTarget: check.probeTarget ?? check.target,
    expectedCodes: check.expectedCodes ?? [...CHECK_DEFAULTS.expectedCodes],
    timeout: check.timeout ?? CHECK_DEFAULTS.timeout,
    retryCount: check.retryCount ?? CHECK_DEFAULTS.retryCount,
    flapFilter: {
      failureThreshold:
        check.flapFilter?.failureThreshold ?? CHECK_DEFAULTS.failureThreshold,
      recheckInterval:
        check.flapFilter?.recheckInterval ?? CHECK_DEFAULTS.recheckInterval,
    },
  };
};
