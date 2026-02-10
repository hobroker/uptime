import { ResolvedMonitor, UptimeStateMonitor } from "../types";
import { MonitorStatus } from "../constants";

export const getSingleMonitorState = async (
  monitor: ResolvedMonitor,
  { env }: { env: Env },
) => {
  console.log(`Checking ${monitor.name}...`);
  const state: UptimeStateMonitor = {
    name: monitor.name,
    target: monitor.target,
    status: MonitorStatus.Up,
  };

  try {
    const response = await fetch(monitor.statusPageLink, {
      method: monitor.method,
      body: monitor.body?.({ env }),
      headers: monitor.headers?.({ env }),
      signal: AbortSignal.timeout(monitor.timeout),
    });
    const expectedCodes = monitor.expectedCodes;
    if (!expectedCodes.includes(response.status)) {
      state.status = MonitorStatus.Down;
      state.error = `HTTP ${response.status} ${response.statusText}`;
    }
    if (
      response.headers.get("cf-access-domain") ||
      [401, 403].includes(response.status) // TODO handle `expectedCodes` here, sometimes it may be necessary to expect 401 or 403
    ) {
      state.status = MonitorStatus.Down;
      state.error = `Protected by Zero Trust (HTTP ${response.status})`;
    }
    return state;
  } catch (error) {
    console.error(`${monitor.name} errored with`, error);
    state.status = MonitorStatus.Down;
    state.error = error instanceof Error ? error.message : "Unknown error";
    return state;
  }
};
