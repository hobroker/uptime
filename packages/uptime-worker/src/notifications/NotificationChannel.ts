import { CheckResultList } from "../types";
import { NotificationContext } from "./types";

export abstract class NotificationChannel {
  public abstract readonly name: string;
  protected state: CheckResultList;
  protected env: Env;

  constructor({ state, env }: NotificationContext) {
    this.state = state;
    this.env = env;
  }

  public abstract notify(): Promise<void>;
}
