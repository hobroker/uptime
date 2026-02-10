import { getMonitorsState } from "./monitors/getMonitorsState";
import { NotificationService } from "./notifications/NotificationService";
import { StatuspageChannel } from "./notifications/channels/statuspage/StatuspageChannel";
import { TelegramChannel } from "./notifications/channels/telegram/TelegramChannel";
import { updateUptimeKV } from "./storage/updateUptimeKV";
import { uptimeWorkerConfig } from "../../../uptime.config";

const notificationService = new NotificationService([
  new StatuspageChannel(),
  new TelegramChannel(),
]);

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    url.pathname = "/__scheduled";
    url.searchParams.append("cron", "* * * * *");
    return new Response(
      `To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`,
    );
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    // Get the current state of all monitors
    const state = await getMonitorsState(uptimeWorkerConfig, { env });

    console.log("state", state);

    // Update the KV store with the new state
    await updateUptimeKV(state, { env });

    // Notify all channels (Statuspage, Telegram, etc.)
    await notificationService.notifyAll({ state, env });

    // Keep the cron string for debugging; controller.cron is provided by Workers runtime
    console.log(`trigger fired at ${controller.cron}`);
    ctx.waitUntil(Promise.resolve());
  },
} satisfies ExportedHandler<Env>;
