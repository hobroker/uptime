import { UPTIME_KV_KEYS } from "../kvKeys";
import { UptimeState } from "../types";

export const updateUptimeKV = async (
  state: UptimeState,
  { env }: { env: Env },
) => {
  await env.uptime.put(UPTIME_KV_KEYS.state, JSON.stringify(state));
  await env.uptime.put(UPTIME_KV_KEYS.lastChecked, new Date().toISOString());
};
