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
  const activeIncidentId = await kv.get("statuspageIncidentId");

  if (downMonitors.length > 0) {
    const componentIds: string[] = [];
    const affectedLines: string[] = [];
    for (const m of downMonitors) {
      const comp = byName.get(m.name);
      if (comp) {
        componentIds.push(comp.id);
        affectedLines.push(`🔴 ${m.name}`);
      }
    }

    const body = `Affected services:\n${affectedLines.join("\n")}`;

    if (!activeIncidentId) {
      console.log("Statuspage: creating incident for down monitors");
      await sleep(1100);
      const incident = await incidentService.createIncident({
        name: "Service disruption",
        status: "investigating",
        body,
        componentIds,
      });
      await kv.put("statuspageIncidentId", incident.id);
    } else {
      console.log("Statuspage: updating existing incident with current state");
      await sleep(1100);
      await incidentService.updateIncident(activeIncidentId, {
        body,
        componentIds,
      });
    }
  } else if (activeIncidentId) {
    console.log("Statuspage: resolving incident, all monitors are up");
    await sleep(1100);
    await incidentService.updateIncident(activeIncidentId, {
      status: "resolved",
      body: "All services have recovered.",
    });
    await kv.delete("statuspageIncidentId");
  }
};
