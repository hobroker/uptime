import { getSingleMonitorState } from "./getSingleMonitorState";
import { Env, UptimeState, UptimeWorkerConfig } from "../types";

export const getMonitorsState = async (
  config: UptimeWorkerConfig,
  { env }: { env: Env },
) => {
  const state: UptimeState = [];
  for (const monitor of config.monitors) {
    const monitorState = await getSingleMonitorState(monitor, { env });
    state.push(monitorState);
  }

  return state;
};
