import { UPTIME_KV_KEYS } from "../../../constants";
import { TelegramService } from "./TelegramService";
import { NotificationChannel } from "../../NotificationChannel";
import { ChannelName } from "../constants";
import { uptimeWorkerConfig } from "../../../../uptime.config";
import {
  telegramDowntimeTemplate,
  telegramRecoveryTemplate,
} from "./templates";

export class TelegramChannel extends NotificationChannel {
  name = ChannelName.Telegram;

  async notify(): Promise<void> {
    const telegramService = new TelegramService({
      token: this.env.TELEGRAM_BOT_TOKEN,
    });

    const statusPageUrl = uptimeWorkerConfig.statuspageUrl;
    const lastNotificationId = await this.getLastNotificationId();
    const isAnyCheckDown = this.downtimeChecks.length > 0;

    // Handle case where we already notified about downtime
    if (lastNotificationId) {
      if (isAnyCheckDown) {
        console.log(
          "[TelegramChannel] Already notified via Telegram about downtime, skipping notification",
        );
        return;
      }

      await this.sendRecoveryNotification({
        telegramService,
        lastNotificationId,
        statusPageUrl,
      });
      return;
    }

    // Handle case where no previous notification exists
    if (!isAnyCheckDown) {
      console.log(
        "[TelegramChannel] No checks are down, skipping Telegram notification",
      );
      return;
    }

    await this.sendDowntimeNotification({
      telegramService,
      statusPageUrl,
    });
  }

  private async getLastNotificationId(): Promise<string | null> {
    return await this.env.uptime.get(UPTIME_KV_KEYS.telegramDowntimeMessageId);
  }

  private async clearLastNotificationId(): Promise<void> {
    await this.env.uptime.put(UPTIME_KV_KEYS.telegramDowntimeMessageId, "");
  }

  private async saveNotificationId(messageId: number): Promise<void> {
    await this.env.uptime.put(
      UPTIME_KV_KEYS.telegramDowntimeMessageId,
      messageId.toString(),
    );
  }

  private async sendRecoveryNotification({
    telegramService,
    lastNotificationId,
    statusPageUrl,
  }: {
    telegramService: TelegramService;
    lastNotificationId: string;
    statusPageUrl?: string;
  }): Promise<void> {
    await this.clearLastNotificationId();

    console.log("[TelegramChannel] sending recovery message");

    await telegramService.sendMessage({
      chatId: this.env.TELEGRAM_CHAT_ID,
      message: telegramRecoveryTemplate({ statusPageUrl }),
      options: {
        reply_parameters: {
          message_id: parseInt(lastNotificationId, 10),
        },
      },
    });

    console.log(
      "[TelegramChannel] All checks are up, sent Telegram notification about recovery",
    );
  }

  private async sendDowntimeNotification({
    telegramService,
    statusPageUrl,
  }: {
    telegramService: TelegramService;
    statusPageUrl?: string;
  }): Promise<void> {
    console.log(`[TelegramChannel] sending downtime message`);

    const formatted = telegramDowntimeTemplate({
      downtimeChecks: this.downtimeChecks,
      statusPageUrl,
    });
    console.log(`[TelegramChannel] formatted downtime message: ${formatted}`);
    const message = await telegramService.sendMessage({
      chatId: this.env.TELEGRAM_CHAT_ID,
      message: formatted,
    });

    await this.saveNotificationId(message.message_id);
    console.log("[TelegramChannel] Sent Telegram notification about downtime");
  }

  private get downtimeChecks() {
    return this.state.filter((c) => c.status === "down");
  }
}
