import { UPTIME_KV_KEYS } from "../../../constants";
import { TelegramService } from "./TelegramService";
import { NotificationChannel } from "../../NotificationChannel";
import { ChannelName } from "../constants";
import {
  telegramDowntimeTemplate,
  telegramRecoveryTemplate,
} from "./templates";
import { NotificationContext } from "../../types";

interface TelegramNotificationContext extends NotificationContext {
  statuspageUrl?: string;
}

export class TelegramChannel extends NotificationChannel {
  name = ChannelName.Telegram;
  private statuspageUrl?: string;

  constructor({ state, env, statuspageUrl }: TelegramNotificationContext) {
    super({ state, env });
    this.statuspageUrl = statuspageUrl;
  }

  async notify(): Promise<void> {
    const telegramService = new TelegramService({
      token: this.env.TELEGRAM_BOT_TOKEN,
    });

    const lastNotificationId = await this.getLastNotificationId();
    const isAnyCheckDown = this.failedChecks.length > 0;

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
        statuspageUrl: this.statuspageUrl,
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
      statuspageUrl: this.statuspageUrl,
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
    statuspageUrl,
  }: {
    telegramService: TelegramService;
    lastNotificationId: string;
    statuspageUrl?: string;
  }): Promise<void> {
    await this.clearLastNotificationId();

    console.log("[TelegramChannel] sending recovery message");

    await telegramService.sendMessage({
      chatId: this.env.TELEGRAM_CHAT_ID,
      message: telegramRecoveryTemplate({ statuspageUrl }),
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
    statuspageUrl,
  }: {
    telegramService: TelegramService;
    statuspageUrl?: string;
  }): Promise<void> {
    console.log(`[TelegramChannel] sending downtime message`);

    const formatted = telegramDowntimeTemplate({
      failedChecks: this.failedChecks,
      statuspageUrl,
    });
    const message = await telegramService.sendMessage({
      chatId: this.env.TELEGRAM_CHAT_ID,
      message: formatted,
    });

    await this.saveNotificationId(message.message_id);
    console.log("[TelegramChannel] Sent Telegram notification about downtime");
  }

  private get failedChecks() {
    return this.state.filter((c) => c.status === "down");
  }
}
