import { getSingleMonitorState } from "./getSingleMonitorState";
import { UptimeState, UptimeWorkerConfig } from "./types";

export const getMonitorsState = async (
  config: UptimeWorkerConfig,
  { env }: { env: Cloudflare.Env },
) => {
  const state: UptimeState = [];
  for (const monitor of config.monitors) {
    const monitorState = await getSingleMonitorState(monitor, { env });
    state.push(monitorState);
  }

  return state;
};
