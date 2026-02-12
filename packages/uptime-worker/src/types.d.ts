export type CheckStatus = "up" | "down";

interface CheckResult {
  name: string;
  target: string;
  status: CheckStatus;
  error?: string;
}

export type CheckResultList = CheckResult[];

export interface CheckConfig {
  name: string;
  target: string;
  method?: string; // default GET
  probeTarget?: string; // defaults to target if not provided
  expectedCodes?: number[]; // default [200]
  timeout?: number; // default 5000
  retryCount?: number; // default 0, number of times to retry the check before marking it as down
  headers?: (args: { env: Env }) => HeadersInit; // additional headers to send with the request
  body?: (args: { env: Env }) => BodyInit; // body to send with the request
}

export interface ResolvedCheckConfig extends CheckConfig {
  method: string;
  probeTarget: string;
  expectedCodes: number[];
  timeout: number;
  retryCount: number;
}

export interface UptimeWorkerConfig {
  checks: CheckConfig[];
  statuspageUrl?: string;
}
