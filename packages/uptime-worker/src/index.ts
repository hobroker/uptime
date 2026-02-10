import { runChecks } from "./checks/runChecks";
import { NotificationService } from "./notifications/NotificationService";
import { StatuspageChannel } from "./notifications/channels/statuspage/StatuspageChannel";
import { TelegramChannel } from "./notifications/channels/telegram/TelegramChannel";
import { updateUptimeKV } from "./storage/updateUptimeKV";
import { uptimeWorkerConfig } from "../uptime.config";

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
    // Get the current state of all checks
    const state = await runChecks(uptimeWorkerConfig, { env });

    console.log("[scheduled] state", state);

    // Update the KV store with the new state
    await updateUptimeKV(state, { env });

    const notificationService = new NotificationService([
      new StatuspageChannel({ state, env }),
      new TelegramChannel({ state, env }),
    ]);
    // Notify all channels (Statuspage, Telegram, etc.)
    await notificationService.notifyAll();

    // Keep the cron string for debugging; controller.cron is provided by Workers runtime
    console.log(`[scheduled] trigger fired at ${controller.cron}`);
    ctx.waitUntil(Promise.resolve());
  },
} satisfies ExportedHandler<Env>;
