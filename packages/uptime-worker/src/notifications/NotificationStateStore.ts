import { UPTIME_KV_KEYS } from "../constants";
import { ChannelName } from "./constants";
import { NotificationState } from "./types";

export class NotificationStateStore {
  constructor(private kv: KVNamespace) {}

  async getChannelState<T>(channel: ChannelName): Promise<T | undefined> {
    const state = await this.getState();
    if (!state) return undefined;
    return state.channels[channel] as T | undefined;
  }

  async updateChannelState<T>(
    channel: ChannelName,
    updater: ((prev: T | undefined) => T | undefined) | T | undefined,
  ): Promise<void> {
    const state = await this.getState();
    const next =
      typeof updater === "function"
        ? (updater as (prev: T | undefined) => T | undefined)(
            state.channels[channel] as T | undefined,
          )
        : updater;

    if (next === undefined) {
      delete state.channels[channel];
    } else {
      state.channels[channel] = next;
    }

    await this.kv.put(UPTIME_KV_KEYS.notificationState, JSON.stringify(state));
  }

  async updateLastFailedChecks(checkIds: string[]): Promise<void> {
    const state = await this.getState();
    state.lastFailedChecks = checkIds;
    await this.kv.put(UPTIME_KV_KEYS.notificationState, JSON.stringify(state));
  }

  private async getState(): Promise<NotificationState> {
    const defaultState: NotificationState = {
      lastFailedChecks: [],
      channels: {},
    };
    try {
      const doc = await this.kv.get(UPTIME_KV_KEYS.notificationState);
      if (!doc) return defaultState;
      return JSON.parse(doc) as NotificationState;
    } catch (error) {
      console.error(
        "[NotificationStateStore] Error getting/parsing notification state:",
        error,
      );
      return defaultState;
    }
  }
}
