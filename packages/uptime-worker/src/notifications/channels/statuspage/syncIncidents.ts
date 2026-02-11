import {
  StatuspageIncidentService,
  type StatuspageComponent,
  type StatuspageIncident,
} from "./services";
import type { CheckResultList } from "../../../types";
import {
  statuspageDowntimeBodyTemplate,
  statuspageDowntimeTitleTemplate,
  statuspagePostmortemTemplate,
  statuspageRecoveryTemplate,
} from "./templates";

interface IncidentData {
  name: string;
  body: string;
  componentIds: string[];
  componentsKey: string;
}

/** Build incident metadata from the current set of failed checks. */
export const buildIncidentData = (
  failedChecks: CheckResultList,
  byName: Map<string, StatuspageComponent>,
): IncidentData => {
  const componentIds = failedChecks
    .map((c) => byName.get(c.name)?.id)
    .filter((id): id is string => id != null);

  const componentsKey = componentIds.slice().sort().join(",");

  return {
    name: statuspageDowntimeTitleTemplate({ failedChecks }),
    body: statuspageDowntimeBodyTemplate({ failedChecks }),
    componentIds,
    componentsKey,
  };
};

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
  console.log("[Statuspage] creating incident for failed checks");
  await incidentService.createIncident({
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
  console.log("[Statuspage] updating existing incident with current state");
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

  console.log("[Statuspage] resolving incident, all checks are up");
  await incidentService.updateIncident(incidentId, {
    status: "resolved",
    body: statuspageRecoveryTemplate(),
  });

  const postmortemBody = statuspagePostmortemTemplate({ incidentDetails });

  console.log("[Statuspage] creating postmortem");
  await incidentService.createPostmortem(incidentId, {
    body: postmortemBody,
  });
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
      `[Statuspage] ${unresolved.length} unresolved incidents found, using the most recent entry`,
    );
  }
  return unresolved[0];
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Manages a single grouped incident for all failed checks.
 *
 * - Creates an incident when checks first go down.
 * - Updates the incident body when the set of failed checks changes.
 * - Resolves the incident when all checks recover.
 */
export const syncIncidents = async ({
  state,
  byName,
  incidentService,
}: {
  state: CheckResultList;
  byName: Map<string, StatuspageComponent>;
  incidentService: StatuspageIncidentService;
}): Promise<void> => {
  const failedChecks = state.filter((c) => c.status === "down");
  const activeIncident = await getLastUnresolvedIncident(incidentService);
  const activeIncidentId = activeIncident?.id ?? null;
  const lastComponentsKey = activeIncident
    ? activeIncident.components
        .map((component) => component.id)
        .sort()
        .join(",")
    : null;

  if (failedChecks.length > 0) {
    const data = buildIncidentData(failedChecks, byName);

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
