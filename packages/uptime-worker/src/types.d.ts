export type CheckStatus = "up" | "down";

interface CheckResult {
  name: string;
  target: string;
  status: CheckStatus;
  error?: string;
}

export type CheckResultList = CheckResult[];

// Flap filtering: confirm a failure (via a Monitor DO re-probe) before
// reporting a check as down, so a sub-minute blip never pages you.
export interface FlapFilterConfig {
  // Consecutive failing probes (across real time, one per recheckInterval)
  // required before the check is confirmed "down". Default 1 = report on the
  // first failure (today's behavior). Higher values filter brief blips: the
  // Monitor Durable Object re-probes a failing check ~recheckInterval later
  // and only alerts once the failure is confirmed.
  failureThreshold?: number; // default 1
  // Milliseconds the Monitor DO waits before re-probing a check that is
  // pending confirmation, to confirm or clear the failure. Once a check is
  // confirmed down the re-probe loop stops (recovery rides the cron). Default
  // 60000.
  recheckInterval?: number; // default 60000
}

export interface ResolvedFlapFilterConfig {
  failureThreshold: number;
  recheckInterval: number;
}

export interface CheckConfig {
  name: string;
  target: string;
  method?: string; // default GET
  probeTarget?: string; // defaults to target if not provided
  expectedCodes?: number[]; // default [200]
  timeout?: number; // default 10000
  retryCount?: number; // default 0, number of times to retry the check before marking it as down
  flapFilter?: FlapFilterConfig; // confirm failures before reporting; see FlapFilterConfig
  headers?: (args: { env: Env }) => HeadersInit; // additional headers to send with the request
  body?: (args: { env: Env }) => BodyInit; // body to send with the request
}

export interface ResolvedCheckConfig extends CheckConfig {
  method: string;
  probeTarget: string;
  expectedCodes: number[];
  timeout: number;
  retryCount: number;
  flapFilter: ResolvedFlapFilterConfig;
}

export interface UptimeWorkerConfig {
  checks: CheckConfig[];
  statuspageUrl?: string;
}
