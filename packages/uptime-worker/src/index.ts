import { runChecks } from "./checks/runChecks";
import { pingHeartbeat } from "./heartbeat/pingHeartbeat";
import { NotificationService } from "./notifications/NotificationService";
import { StatuspageChannel } from "./notifications/channels/statuspage/StatuspageChannel";
import { TelegramChannel } from "./notifications/channels/telegram/TelegramChannel";
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

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    try {
      // Get the current state of all checks
      const state = await runChecks(uptimeWorkerConfig, { env });

      console.log("[scheduled] state", state);

      const notificationService = new NotificationService([
        new StatuspageChannel({ state, env }),
        new TelegramChannel({
          state,
          env,
          statuspageUrl: uptimeWorkerConfig.statuspageUrl,
        }),
      ]);
      // Notify all channels (Statuspage, Telegram, etc.). Each channel owns
      // and persists whatever state it needs to dedupe across runs.
      await notificationService.notifyAll();

      // Keep the cron string for debugging; controller.cron is provided by Workers runtime
      console.log(`[scheduled] trigger fired at ${controller.cron}`);

      // Dead-man's-switch: report a successful cycle to the external heartbeat
      // monitor. This is intentionally the last step, so it only fires when
      // checks ran and notifications were attempted. If the worker stops
      // running or throws before here, the heartbeat stops and the external
      // monitor alerts that the monitor itself is down.
      await pingHeartbeat({ env });
    } catch (error) {
      // Cloudflare only records an uncaught exception as the invocation
      // summary (the cron template), hiding the real cause. Log the actual
      // message/stack before rethrowing so the failure is diagnosable.
      console.error(
        "[scheduled] unhandled error",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;
