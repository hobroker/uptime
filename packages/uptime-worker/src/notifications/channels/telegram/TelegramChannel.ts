import { FormattedString } from "@grammyjs/parse-mode";
import { UPTIME_KV_KEYS } from "../../../constants";
import { TelegramService } from "./TelegramService";
import type { NotificationChannel, NotificationContext } from "../../types";
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

export class TelegramChannel implements NotificationChannel {
  name = ChannelName.Telegram;

  async notify({ state, env }: NotificationContext): Promise<void> {
    const telegramService = new TelegramService({
      token: env.TELEGRAM_BOT_TOKEN,
    });

    const statusPageUrl = uptimeWorkerConfig.statuspageUrl;

    const lastNotificationOfDowntime = await env.uptime.get(
      UPTIME_KV_KEYS.telegramDowntimeMessageId,
    );
    const failedChecks = state.filter((c) => c.status === "down");
    const isAnyCheckDown = failedChecks.length > 0;

    // if we already sent a notification, check if the status has changed
    if (lastNotificationOfDowntime) {
      if (isAnyCheckDown) {
        // we already notified about downtime
        console.log(
          "[TelegramChannel] Already notified via Telegram about downtime, skipping notification",
        );
        return;
      }

      await env.uptime.put(UPTIME_KV_KEYS.telegramDowntimeMessageId, "");

      console.log("[TelegramChannel] sending recovery message");

      await telegramService.sendMessage({
        chatId: env.TELEGRAM_CHAT_ID,
        message: formatRecoveryMessage(statusPageUrl),
        options: {
          reply_parameters: {
            message_id: parseInt(lastNotificationOfDowntime, 10),
          },
        },
      });

      console.log(
        "[TelegramChannel] All checks are up, sent Telegram notification about recovery",
      );
      return;
    }

    if (!isAnyCheckDown) {
      // no checks are down, so we don't need to send a notification
      console.log(
        "[TelegramChannel] No checks are down, skipping Telegram notification",
      );
      return;
    }

    // no previous notification, so we can send a message if at least one check is down
    const downtime = buildDowntimeMessage(failedChecks);
    console.log(`[TelegramChannel] sending ${downtime.type} message`);
    const formatted = formatDowntimeMessage(downtime, statusPageUrl);
    const message = await telegramService.sendMessage({
      chatId: env.TELEGRAM_CHAT_ID,
      message: formatted,
    });

    await env.uptime.put(
      UPTIME_KV_KEYS.telegramDowntimeMessageId,
      message.message_id.toString(),
    );
    console.log("[TelegramChannel] Sent Telegram notification about downtime");
  }
}
