import type { CheckResultList } from "../types";
import type { ChannelName } from "./constants";

export interface NotificationContext {
  state: CheckResultList;
  env: Env;
}

export interface NotificationState {
  lastFailedChecks: string[];
  channels: {
    [ChannelName.Telegram]?: {
      lastMessageId?: string;
    };
    [ChannelName.Statuspage]?: {
      incidentId?: string;
    };
  };
}
