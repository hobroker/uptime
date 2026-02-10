import type { UptimeState } from "../types";

export interface NotificationContext {
  state: UptimeState;
  env: Env;
}

export interface NotificationChannel {
  name: string;
  notify(context: NotificationContext): Promise<void>;
}
