interface UptimeStateMonitor {
  name: string;
  target: string;
  status: "up" | "down";
  protectedByAccess: boolean;
}

export type UptimeState = UptimeStateMonitor[];

export interface Monitor {
  name: string;
  target: string;
  method?: string; // default GET
  statusPageLink?: string; // defaults to target if not provided
  expectedCodes?: number[]; // default [200]
  timeout?: number; // default 10000
}

export interface UptimeWorkerConfig {
  monitors: Monitor[];
}
