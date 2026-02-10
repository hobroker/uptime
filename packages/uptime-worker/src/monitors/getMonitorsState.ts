import pLimit from "p-limit";
import { getSingleMonitorState } from "./getSingleMonitorState";
import { UptimeState, UptimeWorkerConfig } from "../types";

const limit = pLimit(1);

export const getMonitorsState = async (
  config: UptimeWorkerConfig,
  { env }: { env: Env },
) => {
  const state: UptimeState = await Promise.all(
    config.monitors.map((monitor) =>
      limit(() => getSingleMonitorState(monitor, { env })),
    ),
  );

  return state;
};
