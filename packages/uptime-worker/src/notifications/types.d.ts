import type { CheckResultList } from "../types";

export interface NotificationContext {
  state: CheckResultList;
  env: Env;
}

export interface NotificationChannel {
  name: string;
  notify(context: NotificationContext): Promise<void>;
}
