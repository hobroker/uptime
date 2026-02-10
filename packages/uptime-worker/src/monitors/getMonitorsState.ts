import pLimit from "p-limit";
import { getSingleMonitorState } from "./getSingleMonitorState";
import { UptimeState, UptimeWorkerConfig } from "../types";
import { resolveMonitor } from "./resolveMonitor";

const limit = pLimit(1);

export const getMonitorsState = async (
  config: UptimeWorkerConfig,
  { env }: { env: Env },
) => {
  const state: UptimeState = await Promise.all(
    config.monitors
      .map(resolveMonitor)
      .map((monitor) => () => getSingleMonitorState(monitor, { env }))
      .map(limit),
  );

  return state;
};
