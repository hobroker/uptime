import { StatuspageService } from "../services/StatuspageService";
import type { UptimeState } from "../types";

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

  // --- Incident management ---
  const downMonitors = state.filter((m) => m.status === "down");
  const activeIncidentId = await env.uptime.get("statuspageIncidentId");

  if (downMonitors.length > 0) {
    // Build component ID -> status mapping for affected components
    const affectedComponents: Record<string, "major_outage"> = {};
    const affectedNames: string[] = [];
    for (const m of downMonitors) {
      const comp = byName.get(m.name);
      if (comp) {
        affectedComponents[comp.id] = "major_outage";
        affectedNames.push(m.name);
      }
    }

    const body = `Affected services: ${affectedNames.join(", ")}`;

    if (!activeIncidentId) {
      console.log("Statuspage: creating incident for down monitors");
      await sleep(1100);
      const incident = await statuspage.createIncident({
        name: "Service disruption",
        status: "investigating",
        body,
        components: affectedComponents,
      });
      await env.uptime.put("statuspageIncidentId", incident.id);
    } else {
      console.log("Statuspage: updating existing incident with current state");
      await sleep(1100);
      await statuspage.updateIncident(activeIncidentId, {
        body,
        components: affectedComponents,
      });
    }
  } else if (activeIncidentId) {
    // All monitors are up — resolve the incident
    const operationalComponents: Record<string, "operational"> = {};
    for (const [, comp] of byName) {
      operationalComponents[comp.id] = "operational";
    }

    console.log("Statuspage: resolving incident, all monitors are up");
    await sleep(1100);
    await statuspage.updateIncident(activeIncidentId, {
      status: "resolved",
      body: "All services have recovered.",
      components: operationalComponents,
    });
    await env.uptime.delete("statuspageIncidentId");
  }
};
