import { UptimeState } from "./types";

export const updateUptimeKV = async (
  state: UptimeState,
  { env }: { env: Cloudflare.Env },
) => {
  await env.uptime.put("state", JSON.stringify(state));
  await env.uptime.put("lastChecked", new Date().toISOString());
};
