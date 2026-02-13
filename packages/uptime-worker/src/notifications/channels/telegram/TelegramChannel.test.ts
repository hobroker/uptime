import { describe, it, expect, vi, beforeEach } from "vitest";
import { TelegramChannel } from "./TelegramChannel";
import { CheckResultList } from "../../../types";
import { ChannelName } from "../../constants";
import { UPTIME_KV_KEYS } from "../../../constants";

// Mock TelegramService
const { sendMessageMock, editMessageMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn().mockResolvedValue({ message_id: 123 }),
  editMessageMock: vi.fn().mockResolvedValue({ message_id: 123 }),
}));

vi.mock("./TelegramService", () => {
  return {
    TelegramService: class {
      sendMessage = sendMessageMock;
      editMessage = editMessageMock;
    },
  };
});

describe("TelegramChannel", () => {
  let mockKv: any;
  let mockEnv: any;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map<string, string>();
    mockKv = {
      get: vi.fn(async (key: string) => storage.get(key) || null),
      put: vi.fn(async (key: string, value: string) => {
        storage.set(key, value);
      }),
      delete: vi.fn(async (key: string) => {
        storage.delete(key);
      }),
    };
    mockEnv = {
      uptime: mockKv,
      TELEGRAM_BOT_TOKEN: "fake-token",
      TELEGRAM_CHAT_ID: "fake-chat-id",
    };
    sendMessageMock.mockClear();
    editMessageMock.mockClear();
  });

  const createChannel = (checks: CheckResultList) => {
    return new TelegramChannel({
      state: checks,
      env: mockEnv,
      statuspageUrl: "http://status.example.com",
    });
  };

  it("should send downtime notification on initial failure", async () => {
    const checks: CheckResultList = [
      { name: "Check 1", target: "http://1", status: "down" },
    ];
    const channel = createChannel(checks);
    await channel.notify();

    // Verify TelegramService was called
    expect(sendMessageMock).toHaveBeenCalled();

    // Verify state was saved
    expect(mockKv.put).toHaveBeenCalledWith(
      expect.stringContaining(`:channel:${ChannelName.Telegram}`),
      expect.stringContaining('"lastMessageId":"123"'),
    );
  });

  it("should edit notification when failed checks change", async () => {
    // Setup initial state: Check 1 is down and notified
    const lastMessageId = "100";
    await mockKv.put(
      `${UPTIME_KV_KEYS.notificationState}:channel:${ChannelName.Telegram}`,
      JSON.stringify({ lastMessageId }),
    );
    // Setup last failed checks
    await mockKv.put(
      `${UPTIME_KV_KEYS.notificationState}:lastFailedChecks`,
      JSON.stringify(["Check 1"]),
    );

    // Now Check 1 AND Check 2 are down
    const checks: CheckResultList = [
      { name: "Check 1", target: "http://1", status: "down" },
      { name: "Check 2", target: "http://2", status: "down" },
    ];

    const channel = createChannel(checks);
    await channel.notify();

    // Should NOT call sendMessage (new message)
    expect(sendMessageMock).not.toHaveBeenCalled();
    // Should call editMessage
    expect(editMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 100,
      }),
    );
  });

  it("should NOT edit notification when failed checks are same", async () => {
    // Setup initial state: Check 1 is down and notified
    const lastMessageId = "100";
    await mockKv.put(
      `${UPTIME_KV_KEYS.notificationState}:channel:${ChannelName.Telegram}`,
      JSON.stringify({ lastMessageId }),
    );
    // Setup last failed checks
    await mockKv.put(
      `${UPTIME_KV_KEYS.notificationState}:lastFailedChecks`,
      JSON.stringify(["Check 1"]),
    );

    // Check 1 is still down
    const checks: CheckResultList = [
      { name: "Check 1", target: "http://1", status: "down" },
    ];

    const channel = createChannel(checks);
    await channel.notify();

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(editMessageMock).not.toHaveBeenCalled();
  });

  it("should send recovery notification when all checks are up", async () => {
    const lastMessageId = "100";
    await mockKv.put(
      `${UPTIME_KV_KEYS.notificationState}:channel:${ChannelName.Telegram}`,
      JSON.stringify({ lastMessageId }),
    );

    const checks: CheckResultList = [
      { name: "Check 1", target: "http://1", status: "up" },
    ];

    const channel = createChannel(checks);
    await channel.notify();

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("checks are up"),
        options: expect.objectContaining({
          reply_parameters: { message_id: 100 },
        }),
      }),
    );
  });
});
