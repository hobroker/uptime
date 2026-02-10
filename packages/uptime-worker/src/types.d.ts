interface UptimeStateMonitor {
  name: string;
  target: string;
  status: "up" | "down";
  error?: string;
}

export type UptimeState = UptimeStateMonitor[];

export interface Monitor {
  name: string;
  target: string;
  method?: string; // default GET
  statusPageLink?: string; // defaults to target if not provided
  expectedCodes?: number[]; // default [200]
  timeout?: number; // default 5000
  headers?: (args: { env: Env }) => HeadersInit; // additional headers to send with the request
  body?: (args: { env: Env }) => BodyInit; // body to send with the request
}

export interface ResolvedMonitor extends Monitor {
  method: string;
  statusPageLink: string;
  expectedCodes: number[];
  timeout: number;
}

export interface UptimeWorkerConfig {
  monitors: Monitor[];
  statuspageUrl?: string;
}
