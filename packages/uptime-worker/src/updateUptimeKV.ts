import { getMonitorState } from "./getMonitorState";
import { UptimeState } from "./types";
import { uptimeWorkerConfig } from "./uptime.config";

export const updateUptimeKV = async ({ env }: { env: Cloudflare.Env }) => {
  const state: UptimeState = [];
  for (const monitor of uptimeWorkerConfig.monitors) {
    const monitorState = await getMonitorState(monitor, { env });
    state.push(monitorState);
  }

  await env.uptime.put("state", JSON.stringify(state));
  await env.uptime.put("lastChecked", new Date().toISOString());

  console.log("state", state);
};
