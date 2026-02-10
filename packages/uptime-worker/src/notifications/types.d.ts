import type { CheckResultList } from "../types";

export interface NotificationContext {
  state: CheckResultList;
  env: Env;
}
