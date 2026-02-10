import {
  StatuspageIncidentService,
  type StatuspageComponent,
  type StatuspageIncident,
} from "../services/statuspage";
import type { UptimeState } from "../types";
import { buildDowntimeReport } from "../notifications/buildDowntimeReport";
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
  const report = buildDowntimeReport(downMonitors);

  const componentIds = downMonitors
    .map((m) => byName.get(m.name)?.id)
    .filter((id): id is string => id != null);

  const componentsKey = componentIds.slice().sort().join(",");

  return { name: report.title, body: report.body, componentIds, componentsKey };
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

/** Create a new incident. */
const createIncident = async ({
  data,
  incidentService,
}: {
  data: IncidentData;
  incidentService: StatuspageIncidentService;
}): Promise<void> => {
  console.log("Statuspage: creating incident for down monitors");
  await sleep(1100);
  const incident = await incidentService.createIncident({
    name: data.name,
    status: "investigating",
    body: data.body,
    componentIds: data.componentIds,
  });
};

/** Update an existing incident when the set of affected components changed. */
const updateIncident = async ({
  incidentId,
  data,
  incidentService,
}: {
  incidentId: string;
  data: IncidentData;
  incidentService: StatuspageIncidentService;
}): Promise<void> => {
  console.log("Statuspage: updating existing incident with current state");
  await sleep(1100);
  await incidentService.updateIncident(incidentId, {
    name: data.name,
    body: data.body,
    componentIds: data.componentIds,
  });
};

/** Resolve the incident, create & publish a postmortem, then clean up KV. */
const resolveIncident = async ({
  incidentId,
  incidentService,
}: {
  incidentId: string;
  incidentService: StatuspageIncidentService;
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
};

const getLastUnresolvedIncident = async (
  incidentService: StatuspageIncidentService,
): Promise<StatuspageIncident | null> => {
  const unresolved = await incidentService.listUnresolvedIncidents();
  if (unresolved.length === 0) {
    return null;
  }
  if (unresolved.length > 1) {
    console.log(
      `Statuspage: ${unresolved.length} unresolved incidents found, using the most recent entry`,
    );
  }
  return unresolved[0];
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
}: {
  state: UptimeState;
  byName: Map<string, StatuspageComponent>;
  incidentService: StatuspageIncidentService;
}): Promise<void> => {
  const downMonitors = state.filter((m) => m.status === "down");
  const activeIncident = await getLastUnresolvedIncident(incidentService);
  const activeIncidentId = activeIncident?.id ?? null;
  const lastComponentsKey = activeIncident
    ? activeIncident.components
        .map((component) => component.id)
        .sort()
        .join(",")
    : null;

  if (downMonitors.length > 0) {
    const data = buildIncidentData(downMonitors, byName);

    if (!activeIncidentId) {
      await createIncident({ data, incidentService });
    } else if (data.componentsKey !== lastComponentsKey) {
      await updateIncident({
        incidentId: activeIncidentId,
        data,
        incidentService,
      });
    }
  } else if (activeIncidentId) {
    await resolveIncident({
      incidentId: activeIncidentId,
      incidentService,
    });
  }
};
