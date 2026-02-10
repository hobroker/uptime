/** Centralized Uptime KV key names used across the worker. */
export const UPTIME_KV_KEYS = {
  state: "state",
  lastChecked: "lastChecked",
  lastNotificationOfDowntime: "lastNotificationOfDowntime",
} as const;
