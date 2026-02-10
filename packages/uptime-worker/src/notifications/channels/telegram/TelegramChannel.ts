import { FormattedString } from "@grammyjs/parse-mode";
import { UPTIME_KV_KEYS } from "../../../kvKeys";
import { TelegramService } from "./TelegramService";
import type { NotificationChannel, NotificationContext } from "../../types";
import { buildDowntimeMessage, type DowntimeMessage } from "../../messages";

const STATUSPAGE_URL = "https://hobroker.statuspage.io/";

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const formatDowntimeMessage = (report: DowntimeMessage) => {
  let msg = new FormattedString("");
  msg = msg.link(`⚠️ ${report.title} ⚠️`, STATUSPAGE_URL);
  msg = msg.plain("\n\n");

  report.downMonitors.forEach(({ name, target, protectedByZeroTrust }, i) => {
    if (i > 0) msg = msg.plain("\n");

    msg = msg.plain("🔴 ");

    if (isHttpUrl(target)) {
      msg = msg.link(name, target);
    } else {
      msg = msg.b(name).plain(" (").plain(target).plain(")");
    }

    msg = msg.plain(protectedByZeroTrust ? ": (protected by Zero Trust)" : "");
  });

  return msg;
};

const formatRecoveryMessage = () =>
  new FormattedString("✅ All monitors are up and running!\n").link(
    "Status page",
    STATUSPAGE_URL,
  );

export class TelegramChannel implements NotificationChannel {
  name = "telegram";

  async notify({ state, env }: NotificationContext): Promise<void> {
    const telegramService = new TelegramService({
      token: env.TELEGRAM_BOT_TOKEN,
    });

    const lastNotificationOfDowntime = await env.uptime.get(
      UPTIME_KV_KEYS.lastNotificationOfDowntime,
    );
    const downMonitors = state.filter((m) => m.status === "down");
    const isAnyMonitorDown = downMonitors.length > 0;

    // if we already sent a notification, check if the state has changed
    if (lastNotificationOfDowntime) {
      if (isAnyMonitorDown) {
        // we already notified about downtime
        console.log(
          "Already notified via Telegram about downtime, skipping notification",
        );
        return;
      }

      await env.uptime.put(UPTIME_KV_KEYS.lastNotificationOfDowntime, "");

      console.log(`Telegram: sending recovery message`);

      await telegramService.sendMessage({
        chatId: env.TELEGRAM_CHAT_ID,
        message: formatRecoveryMessage(),
        options: {
          reply_parameters: {
            message_id: parseInt(lastNotificationOfDowntime, 10),
          },
        },
      });

      console.log(
        "All monitors are up, sent Telegram notification about recovery",
      );
      return;
    }

    if (!isAnyMonitorDown) {
      // no monitors are down, so we don't need to send a notification
      console.log("No monitors are down, skipping Telegram notification");
      return;
    }

    // no previous notification, so we can send a message if at least one monitor is down
    const downtime = buildDowntimeMessage(downMonitors);
    console.log(`Telegram: sending ${downtime.type} message`);
    const formatted = formatDowntimeMessage(downtime);
    const message = await telegramService.sendMessage({
      chatId: env.TELEGRAM_CHAT_ID,
      message: formatted,
    });

    await env.uptime.put(
      UPTIME_KV_KEYS.lastNotificationOfDowntime,
      message.message_id.toString(),
    );
    console.log("Sent Telegram notification about downtime");
  }
}
