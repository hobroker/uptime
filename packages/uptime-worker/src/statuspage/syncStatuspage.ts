import { StatuspageService } from "../services/StatuspageService";
import type { Env, UptimeState } from "../types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mapMonitorStatusToComponent = (
  status: "up" | "down",
): "operational" | "major_outage" => {
  return status === "up" ? "operational" : "major_outage";
};

/**
 * Syncs current monitor state to Statuspage by mapping each monitor to a component.
 *
 * Strategy:
 * - component name == monitor.name
 * - ensure component exists; create if missing
 * - update component status to operational/major_outage
 *
 * Notes:
 * - Statuspage API is rate limited to ~1 req/sec per token. We deliberately sleep between calls.
 */
export const syncStatuspage = async (
  state: UptimeState,
  { env }: { env: Env },
) => {
  if (!env.STATUSPAGE_IO_API_KEY || !env.STATUSPAGE_IO_PAGE_ID) {
    console.log(
      "Statuspage not configured (missing STATUSPAGE_IO_API_KEY or STATUSPAGE_IO_PAGE_ID), skipping",
    );
    return;
  }

  const statuspage = new StatuspageService({
    apiKey: env.STATUSPAGE_IO_API_KEY,
    pageId: env.STATUSPAGE_IO_PAGE_ID,
  });

  // Pull components once
  const components = await statuspage.listComponents();
  const byName = new Map(components.map((c) => [c.name, c]));

  for (const monitor of state) {
    const desired = mapMonitorStatusToComponent(monitor.status);

    let component = byName.get(monitor.name);
    if (!component) {
      console.log(`Statuspage: creating component '${monitor.name}'`);
      component = await statuspage.createComponent({
        name: monitor.name,
        status: desired,
      });
      byName.set(component.name, component);
      await sleep(1100);
      continue;
    }

    if (component.status !== desired) {
      console.log(
        `Statuspage: updating component '${monitor.name}' ${component.status} -> ${desired}`,
      );
      component = await statuspage.updateComponentStatus({
        componentId: component.id,
        status: desired,
      });
      byName.set(component.name, component);
      await sleep(1100);
    }
  }
};
