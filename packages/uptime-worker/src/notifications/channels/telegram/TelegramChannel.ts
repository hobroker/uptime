import { FormattedString } from "@grammyjs/parse-mode";
import { UPTIME_KV_KEYS } from "../../../constants";
import { TelegramService } from "./TelegramService";
import { NotificationChannel } from "../../NotificationChannel";
import { buildDowntimeMessage, type DowntimeMessage } from "../../messages";
import { ChannelName } from "../constants";
import { uptimeWorkerConfig } from "../../../../uptime.config";

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const formatDowntimeMessage = (
  report: DowntimeMessage,
  statusPageUrl?: string,
) => {
  let msg = new FormattedString("");

  if (statusPageUrl) {
    msg = msg.link(`⚠️ ${report.title} ⚠️`, statusPageUrl);
  } else {
    msg = msg.plain(`⚠️ ${report.title} ⚠️`);
  }

  msg = msg.plain("\n\n");

  report.failedChecks.forEach(({ name, target, error }, i) => {
    if (i > 0) msg = msg.plain("\n");

    msg = msg.plain("🔴 ");

    if (isHttpUrl(target)) {
      msg = msg.link(name, target);
    } else {
      msg = msg.b(name).plain(" (").plain(target).plain(")");
    }

    msg = msg.plain(error ? `: ${error}` : "");
  });

  return msg;
};

const formatRecoveryMessage = (statusPageUrl?: string) => {
  const message = new FormattedString("✅ All checks are up and running!\n");

  if (statusPageUrl) {
    return message.link("Status page", statusPageUrl);
  }

  return message;
};

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
      message: formatRecoveryMessage(statusPageUrl),
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
    const downtime = buildDowntimeMessage(this.downtimeChecks);
    console.log(`[TelegramChannel] sending ${downtime.type} message`);

    const formatted = formatDowntimeMessage(downtime, statusPageUrl);
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
