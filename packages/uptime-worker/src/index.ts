import { getMonitorsState } from "./getMonitorsState";
import { uptimeWorkerConfig } from "../../../uptime.config";
import { updateUptimeKV } from "./updateUptimeKV";
import { handleNotifications } from "./handleNotifications";

export default {
  async fetch(req) {
    const url = new URL(req.url);
    url.pathname = "/__scheduled";
    url.searchParams.append("cron", "* * * * *");
    return new Response(
      `To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`,
    );
  },

  async scheduled(event, env): Promise<void> {
    // Get the current state of all monitors
    const state = await getMonitorsState(uptimeWorkerConfig, { env });

    console.log("state", state);

    // Update the KV store with the new state
    await updateUptimeKV(state, { env });

    // Send a Telegram message with the current state and if it was previously down, then notify of the change
    await handleNotifications(state, { env });

    console.log(`trigger fired at ${event.cron}`);
  },
} satisfies ExportedHandler<Env>;
