import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationStateStore } from "./NotificationStateStore";
import { ChannelName } from "./constants";
import { UPTIME_KV_KEYS } from "../constants";

describe("NotificationStateStore", () => {
  let mockKv: any;
  let store: NotificationStateStore;

  beforeEach(() => {
    const storage = new Map<string, string>();
    mockKv = {
      get: vi.fn(async (key: string) => storage.get(key) || null),
      put: vi.fn(async (key: string, value: string) => {
        storage.set(key, value);
      }),
      delete: vi.fn(async (key: string) => {
        storage.delete(key);
      }),
    };
    store = new NotificationStateStore(mockKv);
  });

  it("should use granular keys for channel state", async () => {
    const channel = ChannelName.Telegram;
    const state = { lastMessageId: "123" };

    await store.updateChannelState(channel, state);

    expect(mockKv.put).toHaveBeenCalledWith(
      `${UPTIME_KV_KEYS.notificationState}:channel:${channel}`,
      JSON.stringify(state),
    );

    const savedState = await store.getChannelState(channel);
    expect(savedState).toEqual(state);
  });

  it("should migrate state from old consolidated key", async () => {
    const channel = ChannelName.Telegram;
    const oldState = {
      lastFailedChecks: [],
      channels: {
        [channel]: { lastMessageId: "old-123" },
      },
    };

    // Set up old state in KV
    await mockKv.put(
      UPTIME_KV_KEYS.notificationState,
      JSON.stringify(oldState),
    );

    // Get state should fallback to old key
    const state = await store.getChannelState(channel);
    expect(state).toEqual({ lastMessageId: "old-123" });

    // Updating state should write to new key
    await store.updateChannelState(channel, { lastMessageId: "new-456" });

    expect(mockKv.put).toHaveBeenCalledWith(
      `${UPTIME_KV_KEYS.notificationState}:channel:${channel}`,
      JSON.stringify({ lastMessageId: "new-456" }),
    );

    // Subsequent gets should use new key
    const newState = await store.getChannelState(channel);
    expect(newState).toEqual({ lastMessageId: "new-456" });
  });

  it("should use granular key for last failed checks", async () => {
    const failedChecks = ["check-1", "check-2"];

    await store.updateLastFailedChecks(failedChecks);

    expect(mockKv.put).toHaveBeenCalledWith(
      `${UPTIME_KV_KEYS.notificationState}:lastFailedChecks`,
      JSON.stringify(failedChecks),
    );
  });

  it("should handle updater function in updateChannelState", async () => {
    const channel = ChannelName.Telegram;
    await store.updateChannelState(channel, { lastMessageId: "1" });

    await store.updateChannelState<{ lastMessageId?: string }>(
      channel,
      (prev) => ({
        ...prev,
        lastMessageId: (parseInt(prev?.lastMessageId || "0") + 1).toString(),
      }),
    );

    const state = await store.getChannelState<{ lastMessageId: string }>(
      channel,
    );
    expect(state?.lastMessageId).toBe("2");
  });
});
