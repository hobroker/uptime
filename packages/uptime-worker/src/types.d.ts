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
  statusPageLink?: string; // defaults to target if not provided
  expectedCodes?: number[]; // default [200]
  timeout?: number; // default 5000
  headers?: (args: { env: Env }) => HeadersInit; // additional headers to send with the request
  body?: (args: { env: Env }) => BodyInit; // body to send with the request
}

export interface ResolvedCheckConfig extends CheckConfig {
  method: string;
  statusPageLink: string;
  expectedCodes: number[];
  timeout: number;
}

export interface UptimeWorkerConfig {
  checks: CheckConfig[];
  statuspageUrl?: string;
}
