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

  it("should retrieve last failed checks correctly", async () => {
    const failedChecks = ["check-1", "check-2"];

    // Test empty state
    expect(await store.getLastFailedChecks()).toEqual([]);

    // Set state
    await store.updateLastFailedChecks(failedChecks);

    // Test retrieval
    const retrieved = await store.getLastFailedChecks();
    expect(retrieved).toEqual(failedChecks);

    // Verify it's reading from the correct key
    expect(mockKv.get).toHaveBeenCalledWith(
      `${UPTIME_KV_KEYS.notificationState}:lastFailedChecks`,
    );
  });

  it("should delete channel state when updater returns undefined", async () => {
    const channel = ChannelName.Telegram;
    const initialState = { lastMessageId: "123" };
    await store.updateChannelState(channel, initialState);

    // Verify it exists
    expect(await store.getChannelState(channel)).toEqual(initialState);

    // Update with undefined to delete
    await store.updateChannelState(channel, undefined);

    // Verify it is gone
    expect(await store.getChannelState(channel)).toBeUndefined();
    expect(mockKv.delete).toHaveBeenCalledWith(
      `${UPTIME_KV_KEYS.notificationState}:channel:${channel}`,
    );
  });

  it("should delete channel state when updater function returns undefined", async () => {
    const channel = ChannelName.Telegram;
    await store.updateChannelState(channel, { lastMessageId: "123" });

    await store.updateChannelState(channel, () => undefined);

    expect(await store.getChannelState(channel)).toBeUndefined();
    expect(mockKv.delete).toHaveBeenCalled();
  });

  it("should handle errors during migration gracefully", async () => {
    const channel = ChannelName.Telegram;

    // Set invalid JSON in old state
    await mockKv.put(UPTIME_KV_KEYS.notificationState, "invalid-json");

    const state = await store.getChannelState(channel);

    expect(state).toBeUndefined();
  });
});
