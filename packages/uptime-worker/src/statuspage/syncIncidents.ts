import { UPTIME_KV_KEYS } from "../kvKeys";
import {
  StatuspageIncidentService,
  type StatuspageComponent,
} from "../services/statuspage";
import type { UptimeState } from "../types";
import { sleep } from "../util/sleep";

interface IncidentData {
  name: string;
  body: string;
  componentIds: string[];
  componentsKey: string;
}

/** Build incident metadata from the current set of down monitors. */
export const buildIncidentData = (
  downMonitors: UptimeState,
  byName: Map<string, StatuspageComponent>,
): IncidentData => {
  const componentIds: string[] = [];
  const affectedLines: string[] = [];

  for (const monitor of downMonitors) {
    const comp = byName.get(monitor.name);
    if (comp) {
      componentIds.push(comp.id);
      const line = monitor.error
        ? `🔴 ${monitor.name} — ${monitor.error}`
        : `🔴 ${monitor.name}`;
      affectedLines.push(line);
    }
  }

  const body = `Affected services:\n\n${affectedLines.join("\n\n")}`;
  const name =
    affectedLines.length === 1
      ? `${downMonitors.find((m) => byName.has(m.name))!.name} Down`
      : "Multiple Systems Disrupted";
  const componentsKey = componentIds.slice().sort().join(",");

  return { name, body, componentIds, componentsKey };
};

/** Build a Markdown postmortem body from the incident details. */
export const buildPostmortemBody = (incidentDetails: string): string =>
  [
    "##### Issue\n\n",
    incidentDetails,
    "\n\n##### Resolution\n\n",
    "All services are back up and running and the incident has been resolved.",
  ].join("");

// ---------------------------------------------------------------------------
// API workflows
// ---------------------------------------------------------------------------

/** Create a new incident and persist its ID in KV. */
const createIncident = async ({
  data,
  incidentService,
  kv,
}: {
  data: IncidentData;
  incidentService: StatuspageIncidentService;
  kv: KVNamespace;
}): Promise<void> => {
  console.log("Statuspage: creating incident for down monitors");
  await sleep(1100);
  const incident = await incidentService.createIncident({
    name: data.name,
    status: "investigating",
    body: data.body,
    componentIds: data.componentIds,
  });
  await kv.put(UPTIME_KV_KEYS.statuspageIncidentId, incident.id);
  await kv.put(UPTIME_KV_KEYS.statuspageIncidentComponents, data.componentsKey);
};

/** Update an existing incident when the set of affected components changed. */
const updateIncident = async ({
  incidentId,
  data,
  incidentService,
  kv,
}: {
  incidentId: string;
  data: IncidentData;
  incidentService: StatuspageIncidentService;
  kv: KVNamespace;
}): Promise<void> => {
  console.log("Statuspage: updating existing incident with current state");
  await sleep(1100);
  await incidentService.updateIncident(incidentId, {
    name: data.name,
    body: data.body,
    componentIds: data.componentIds,
  });
  await kv.put(UPTIME_KV_KEYS.statuspageIncidentComponents, data.componentsKey);
};

/** Resolve the incident, create & publish a postmortem, then clean up KV. */
const resolveIncident = async ({
  incidentId,
  incidentService,
  kv,
}: {
  incidentId: string;
  incidentService: StatuspageIncidentService;
  kv: KVNamespace;
}): Promise<void> => {
  const incident = await incidentService.getIncident(incidentId);
  const latestUpdate = incident.incident_updates.find(
    (u) => u.status !== "resolved" && u.status !== "postmortem",
  );
  const incidentDetails =
    latestUpdate?.body || "One or more services experienced a disruption.";

  console.log("Statuspage: resolving incident, all monitors are up");
  await sleep(1100);
  await incidentService.updateIncident(incidentId, {
    status: "resolved",
    body: "All services have recovered.",
  });

  const postmortemBody = buildPostmortemBody(incidentDetails);

  console.log("Statuspage: creating postmortem");
  await sleep(1100);
  await incidentService.createPostmortem(incidentId, {
    body: postmortemBody,
  });
  await sleep(1100);
  await incidentService.publishPostmortem(incidentId);

  await kv.delete(UPTIME_KV_KEYS.statuspageIncidentId);
  await kv.delete(UPTIME_KV_KEYS.statuspageIncidentComponents);
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

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
    const data = buildIncidentData(downMonitors, byName);
    const lastComponentsKey = await kv.get(
      UPTIME_KV_KEYS.statuspageIncidentComponents,
    );

    if (!activeIncidentId) {
      await createIncident({ data, incidentService, kv });
    } else if (data.componentsKey !== lastComponentsKey) {
      await updateIncident({
        incidentId: activeIncidentId,
        data,
        incidentService,
        kv,
      });
    }
  } else if (activeIncidentId) {
    await resolveIncident({
      incidentId: activeIncidentId,
      incidentService,
      kv,
    });
  }
};
