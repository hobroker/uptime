import { getMonitorState } from "./getMonitorState";
import { UptimeState } from "./types";
import { uptimeWorkerConfig } from "./uptime.config";

export default {
  async fetch(req) {
    const url = new URL(req.url);
    url.pathname = "/__scheduled";
    url.searchParams.append("cron", "* * * * *");
    return new Response(
      `To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`
    );
  },

  async scheduled(event, env, ctx): Promise<void> {
    const state: UptimeState = [];
    for (const monitor of uptimeWorkerConfig.monitors) {
      const monitorState = await getMonitorState(monitor, { env });
      state.push(monitorState);
    }

    await env.uptime.put("state", JSON.stringify(state));
    await env.uptime.put("lastChecked", new Date().toISOString());

    console.log("state", state);
    console.log(`trigger fired at ${event.cron}`);
  },
} satisfies ExportedHandler<Env>;
