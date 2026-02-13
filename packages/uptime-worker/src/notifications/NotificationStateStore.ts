import { UPTIME_KV_KEYS } from "../constants";
import { ChannelName } from "./constants";

export class NotificationStateStore {
  constructor(
    private kv: KVNamespace,
    private channel: ChannelName,
  ) {}

  async getChannelState<T>(): Promise<T | undefined> {
    const state = await this.getState();
    if (!state) return undefined;
    return state.channels[this.channel] as T | undefined;
  }

  async updateChannelState<T>(
    updater: ((prev: T | undefined) => T | undefined) | T | undefined,
  ): Promise<void> {
    const state = await this.getState();
    const next =
      typeof updater === "function"
        ? (updater as (prev: T | undefined) => T | undefined)(
            state.channels[this.channel] as T | undefined,
          )
        : updater;

    if (next === undefined) {
      delete state.channels[this.channel];
    } else {
      state.channels[this.channel] = next;
    }

    await this.kv.put(UPTIME_KV_KEYS.notificationState, JSON.stringify(state));
  }

  private async getState() {
    try {
      const doc = await this.kv.get(UPTIME_KV_KEYS.notificationState);
      if (!doc) return undefined;
      return JSON.parse(doc);
    } catch {
      return undefined;
    }
  }
}
