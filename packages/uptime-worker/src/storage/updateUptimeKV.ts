import { UPTIME_KV_KEYS } from "../constants";
import { CheckResultList } from "../types";

export const updateUptimeKV = async (
  state: CheckResultList,
  { env }: { env: Env },
) => {
  await env.uptime.put(UPTIME_KV_KEYS.state, JSON.stringify(state));
  await env.uptime.put(UPTIME_KV_KEYS.lastChecked, new Date().toISOString());
};
