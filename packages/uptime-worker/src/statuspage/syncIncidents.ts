import { UPTIME_KV_KEYS } from "../kvKeys";
import {
  StatuspageIncidentService,
  type StatuspageComponent,
} from "../services/statuspage";
import type { UptimeState } from "../types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Manages a single grouped incident for all down monitors.
 *
 * - Creates an incident when monitors first go down.
 * - Updates the incident body when the set of down monitors changes.
 * - Resolves the incident when all monitors recover.
 */
export const syncIncidents = async ({
  state,
  byName,
  incidentService,
  kv,
}: {
  state: UptimeState;
  byName: Map<string, StatuspageComponent>;
  incidentService: StatuspageIncidentService;
  kv: KVNamespace;
}): Promise<void> => {
  const downMonitors = state.filter((m) => m.status === "down");
  const activeIncidentId = await kv.get(UPTIME_KV_KEYS.statuspageIncidentId);

  if (downMonitors.length > 0) {
    const componentIds: string[] = [];
    const affectedLines: string[] = [];
    for (const monitor of downMonitors) {
      const comp = byName.get(monitor.name);
      if (comp) {
        componentIds.push(comp.id);
        affectedLines.push(`🔴 ${monitor.name}`);
      }
    }

    const body = `Affected services:\n${affectedLines.join("\n")}`;
    const name =
      affectedLines.length === 1
        ? `${downMonitors.find((m) => byName.has(m.name))!.name} Down`
        : "Multiple Systems Disrupted";
    const componentsKey = componentIds.slice().sort().join(",");
    const lastComponentsKey = await kv.get(
      UPTIME_KV_KEYS.statuspageIncidentComponents,
    );

    if (!activeIncidentId) {
      console.log("Statuspage: creating incident for down monitors");
      await sleep(1100);
      const incident = await incidentService.createIncident({
        name,
        status: "investigating",
        body,
        componentIds,
      });
      await kv.put(UPTIME_KV_KEYS.statuspageIncidentId, incident.id);
      await kv.put(UPTIME_KV_KEYS.statuspageIncidentComponents, componentsKey);
    } else if (componentsKey !== lastComponentsKey) {
      console.log("Statuspage: updating existing incident with current state");
      await sleep(1100);
      await incidentService.updateIncident(activeIncidentId, {
        name,
        body,
        componentIds,
      });
      await kv.put(UPTIME_KV_KEYS.statuspageIncidentComponents, componentsKey);
    }
  } else if (activeIncidentId) {
    console.log("Statuspage: resolving incident, all monitors are up");
    await sleep(1100);
    await incidentService.updateIncident(activeIncidentId, {
      status: "resolved",
      body: "All services have recovered.",
    });
    await kv.delete(UPTIME_KV_KEYS.statuspageIncidentId);
    await kv.delete(UPTIME_KV_KEYS.statuspageIncidentComponents);
  }
};
