import { ResolvedCheckConfig, CheckResult } from "../types";
import { getCheckFailureReason } from "./getCheckFailureReason";
import { sleep } from "../util/sleep";

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
      const response = await fetch(check.probeTarget, {
        method: check.method,
        body: check.body?.({ env }),
        headers: check.headers?.({ env }),
        signal: AbortSignal.timeout(check.timeout),
      });

      // Cancel response body since we only need status/headers/url
      response.body?.cancel();

      const failureReason = getCheckFailureReason(check, response);

      if (!failureReason) {
        return state;
      }

      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(
          `[performCheck] ${check.name} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`,
        );
        await sleep(delay);
        continue;
      }

      state.status = "down";
      state.error = failureReason;
      return state;
    } catch (error) {
      console.error(`[performCheck] ${check.name} errored with`, error);
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(
          `[performCheck] ${check.name} error (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`,
        );
        await sleep(delay);
        continue;
      }
      state.status = "down";
      state.error = error instanceof Error ? error.message : "Unknown error";
      return state;
    }
  }

  return state;
};
