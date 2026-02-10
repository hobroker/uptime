interface UptimeStateMonitor {
  name: string;
  target: string;
  status: "up" | "down";
  protectedByZeroTrust: boolean;
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
  protectedByZeroTrust?: boolean; // default false, if true, the monitor is protected by Cloudflare Zero Trust and we'll need to use CF-Access-Client-Id and CF-Access-Client-Secret headers
  headers?: HeadersInit; // additional headers to send with the request
  body?: BodyInit; // body to send with the request
}

export interface UptimeWorkerConfig {
  monitors: Monitor[];
}
