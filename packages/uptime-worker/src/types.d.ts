// Cloudflare Worker environment bindings
// Keep this minimal and aligned with wrangler.jsonc and your secret vars.
export interface Env {
  uptime: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  CF_ACCESS_CLIENT_ID: string;
  CF_ACCESS_CLIENT_SECRET: string;
}

interface UptimeStateMonitor {
  name: string;
  target: string;
  status: "up" | "down";
  protectedByZeroTrust: boolean;
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
