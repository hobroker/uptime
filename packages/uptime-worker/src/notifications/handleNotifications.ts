import { FormattedString } from "@grammyjs/parse-mode";
import { TelegramService } from "../services/TelegramService";
import { UptimeState } from "../types";

const STATUSPAGE_URL = "https://hobroker.statuspage.io/";

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const buildDowntimeMessage = (state: UptimeState) => {
  let msg = new FormattedString("");
  msg = msg.link("⚠️ Some monitors are down ⚠️", STATUSPAGE_URL);
  msg = msg.plain("\n\n");

  const down = state.filter(({ status }) => status === "down");

  down.forEach(({ name, target, protectedByZeroTrust }, i) => {
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

export const handleNotifications = async (
  state: UptimeState,
  { env }: { env: Env },
) => {
  const telegramService = new TelegramService({
    token: env.TELEGRAM_BOT_TOKEN,
  });

  const lastNotificationOfDowntime = await env.uptime.get(
    "lastNotificationOfDowntime",
  );
  const isAnyMonitorDown = state.some((monitor) => monitor.status === "down");

  // if we already sent a notification, check if the state has changed
  if (lastNotificationOfDowntime) {
    if (isAnyMonitorDown) {
      // we already notified about downtime
      console.log("Already notified about downtime, skipping notification");
      return;
    }

    await env.uptime.put("lastNotificationOfDowntime", "");

    // we notified about downtime, but now all monitors are up
    // so we can send a message that everything is back to normal
    const recoveryMessage = new FormattedString(
      "✅ All monitors are up and running!\n",
    ).link("Status page", STATUSPAGE_URL);

    await telegramService.sendMessage({
      chatId: env.TELEGRAM_CHAT_ID,
      message: recoveryMessage,
      options: {
        reply_parameters: {
          message_id: parseInt(lastNotificationOfDowntime, 10),
        },
      },
    });

    console.log("All monitors are up, sent notification about recovery");
    return;
  }

  if (!isAnyMonitorDown) {
    // no monitors are down, so we don't need to send a notification
    console.log("No monitors are down, skipping notification");
    return;
  }

  // no previous notification, so we can send a message if at least one monitor is down
  const formatted = buildDowntimeMessage(state);
  const message = await telegramService.sendMessage({
    chatId: env.TELEGRAM_CHAT_ID,
    message: formatted,
  });

  await env.uptime.put(
    "lastNotificationOfDowntime",
    message.message_id.toString(),
  );
  console.log("Sent notification about downtime");
};
