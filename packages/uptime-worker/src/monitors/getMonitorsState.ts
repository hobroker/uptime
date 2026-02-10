import { getSingleMonitorState } from "./getSingleMonitorState";
import { UptimeWorkerConfig } from "../types";

export const getMonitorsState = async (
  config: UptimeWorkerConfig,
  { env }: { env: Env },
) => {
  return Promise.all(
    config.monitors.map((monitor) => getSingleMonitorState(monitor, { env })),
  );
};
