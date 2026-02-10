import { ResolvedCheckConfig, CheckResult } from "../types";

export const performCheck = async (
  check: ResolvedCheckConfig,
  { env }: { env: Env },
) => {
  console.log(`Checking ${check.name}...`);
  const state: CheckResult = {
    name: check.name,
    target: check.target,
    status: "up",
  };

  try {
    const response = await fetch(check.statusPageLink, {
      method: check.method,
      body: check.body?.({ env }),
      headers: check.headers?.({ env }),
      signal: AbortSignal.timeout(check.timeout),
    });
    const expectedCodes = check.expectedCodes;
    if (!expectedCodes.includes(response.status)) {
      state.status = "down";
      state.error = `HTTP ${response.status} ${response.statusText}`;
    }
    if (
      response.headers.get("cf-access-domain") ||
      [401, 403].includes(response.status) // TODO handle `expectedCodes` here, sometimes it may be necessary to expect 401 or 403
    ) {
      state.status = "down";
      state.error = `Protected by Zero Trust (HTTP ${response.status})`;
    }
    return state;
  } catch (error) {
    console.error(`${check.name} errored with`, error);
    state.status = "down";
    state.error = error instanceof Error ? error.message : "Unknown error";
    return state;
  }
};
