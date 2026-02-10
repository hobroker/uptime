import { CheckResultList } from "../types";
import { NotificationContext } from "./types";

export class NotificationChannel {
  public name = "base";
  protected state: CheckResultList;
  protected env: Env;

  constructor({ state, env }: NotificationContext) {
    this.state = state;
    this.env = env;
  }

  public notify(): Promise<void> {
    throw new Error("Notify method not implemented");
  }
}
