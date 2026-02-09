import { getMonitorsState } from "./monitors/getMonitorsState";
import { handleNotifications } from "./notifications/handleNotifications";
import { syncStatuspage } from "./statuspage/syncStatuspage";
import { updateUptimeKV } from "./storage/updateUptimeKV";
import { uptimeWorkerConfig } from "../../../uptime.config";

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

    // Sync component statuses to Statuspage (if configured)
    await syncStatuspage(state, { env });

    // Send a Telegram message with the current state and if it was previously down, then notify of the change
    await handleNotifications(state, { env });

    // Keep the cron string for debugging; controller.cron is provided by Workers runtime
    console.log(`trigger fired at ${controller.cron}`);
    ctx.waitUntil(Promise.resolve());
  },
} satisfies ExportedHandler<Env>;
