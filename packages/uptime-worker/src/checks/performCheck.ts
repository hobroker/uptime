import { ResolvedCheckConfig, CheckResult } from "../types";

export const performCheck = async (
  check: ResolvedCheckConfig,
  { env }: { env: Env },
) => {
  console.log(`[performCheck] Checking ${check.name}...`);
  const state: CheckResult = {
    name: check.name,
    target: check.target,
    status: "up",
  };

  const maxAttempts = Math.max(0, check.retryCount) + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(check.statusPageLink, {
        method: check.method,
        body: check.body?.({ env }),
        headers: check.headers?.({ env }),
        signal: AbortSignal.timeout(check.timeout),
      });

      // Cancel response body since we only need status/headers
      response.body?.cancel();

      const expectedCodes = check.expectedCodes;
      const isExpected = expectedCodes.includes(response.status);

      if (isExpected) {
        return state;
      }

      const isProtected =
        response.headers.get("cf-access-domain") ||
        [401, 403].includes(response.status);

      const errorMessage = isProtected
        ? `Protected by Zero Trust (HTTP ${response.status})`
        : `HTTP ${response.status} ${response.statusText}`;

      if (attempt < maxAttempts) {
        console.warn(
          `[performCheck] ${check.name} failed (attempt ${attempt}/${maxAttempts}), retrying...`,
        );
        continue;
      }

      state.status = "down";
      state.error = errorMessage;
      return state;
    } catch (error) {
      console.error(`[performCheck] ${check.name} errored with`, error);
      if (attempt < maxAttempts) {
        console.warn(
          `[performCheck] ${check.name} error (attempt ${attempt}/${maxAttempts}), retrying...`,
        );
        continue;
      }
      state.status = "down";
      state.error = error instanceof Error ? error.message : "Unknown error";
      return state;
    }
  }

  return state;
};
