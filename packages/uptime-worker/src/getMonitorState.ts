import { Monitor, UptimeStateMonitor } from "./types";

export const getMonitorState = async (
  monitor: Monitor,
  { env }: { env: Cloudflare.Env },
) => {
  console.log(`Checking ${monitor.name}...`);
  const state: UptimeStateMonitor = {
    name: monitor.name,
    target: monitor.target,
    status: "up",
    protectedByAccess: false,
  };

  try {
    const response = await fetch(monitor.statusPageLink || monitor.target, {
      method: monitor.method || "GET",
      headers: {
        "CF-Access-Client-Id": env.CF_ACCESS_CLIENT_ID,
        "CF-Access-Client-Secret": env.CF_ACCESS_CLIENT_SECRET,
      },
      signal: AbortSignal.timeout(monitor.timeout || 5000),
    });
    if (!(monitor.expectedCodes || [200]).includes(response.status)) {
      state.status = "down";
    }
    if (
      response.headers.get("cf-access-domain") ||
      [401, 403].includes(response.status) // TODO handle `expectedCodes` here, sometimes it may be necessary to expect 401 or 403
    ) {
      state.protectedByAccess = true;
      state.status = "down";
    }
    return state;
  } catch (error) {
    console.log(`${monitor.name} errored with`, error);
    state.status = "down";
    return state;
  }
};
