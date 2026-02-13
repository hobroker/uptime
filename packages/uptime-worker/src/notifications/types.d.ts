import type { CheckResultList } from "../types";
import type { ChannelName } from "./constants";

export interface NotificationContext {
  state: CheckResultList;
  env: Env;
}

export interface NotificationState {
  lastFailedChecks: string[];
  channels: Partial<Record<ChannelName, object | null | undefined>>;
}
