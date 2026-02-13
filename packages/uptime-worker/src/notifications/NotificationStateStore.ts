import { UPTIME_KV_KEYS } from "../constants";
import { ChannelName } from "./constants";
import { NotificationState } from "./types";

export class NotificationStateStore {
  constructor(private kv: KVNamespace) {}

  private getChannelKey(channel: ChannelName): string {
    return `${UPTIME_KV_KEYS.notificationState}:channel:${channel}`;
  }

  private get lastFailedChecksKey(): string {
    return `${UPTIME_KV_KEYS.notificationState}:lastFailedChecks`;
  }

  async getChannelState<T>(channel: ChannelName): Promise<T | undefined> {
    const key = this.getChannelKey(channel);
    const doc = await this.kv.get(key);
    if (doc) return JSON.parse(doc) as T;

    // Fallback to old consolidated state for migration
    try {
      const oldDoc = await this.kv.get(UPTIME_KV_KEYS.notificationState);
      if (oldDoc) {
        const state = JSON.parse(oldDoc) as NotificationState;
        return state.channels[channel] as T | undefined;
      }
    } catch (error) {
      console.error(
        "[NotificationStateStore] Error migrating from old state:",
        error,
      );
    }
    return undefined;
  }

  async updateChannelState<T>(
    channel: ChannelName,
    updater: ((prev: T | undefined) => T | undefined) | T | undefined,
  ): Promise<void> {
    const key = this.getChannelKey(channel);
    const prev = await this.getChannelState<T>(channel);

    const next =
      typeof updater === "function"
        ? (updater as (prev: T | undefined) => T | undefined)(prev)
        : updater;

    if (next === undefined) {
      await this.kv.delete(key);
    } else {
      await this.kv.put(key, JSON.stringify(next));
    }
  }

  async updateLastFailedChecks(checkIds: string[]): Promise<void> {
    await this.kv.put(this.lastFailedChecksKey, JSON.stringify(checkIds));
  }
}
