import { TelegramService } from "../services/TelegramService";
import { Env, UptimeState } from "../types";

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
    await telegramService.sendMessage({
      chatId: env.TELEGRAM_CHAT_ID,
      message: `✅ All monitors are up and running!`,
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
  const message = await telegramService.sendMessage({
    chatId: env.TELEGRAM_CHAT_ID,
    message:
      `⚠️ Some monitors are down ⚠️\n\n` +
      state
        .filter(({ status }) => status === "down")
        .map(
          ({ name, target, protectedByZeroTrust }) =>
            `*${name}* (${target})${
              protectedByZeroTrust ? ": (protected by Zero Trust)" : ""
            }`,
        )
        .join("\n"),
  });
  await env.uptime.put(
    "lastNotificationOfDowntime",
    message.message_id.toString(),
  );
  console.log("Sent notification about downtime");
};
