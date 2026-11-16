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
import { formatDuration } from "../../../util/formatDuration";

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

/** How long the incident lasted, from its start until resolution (or now). */
const getIncidentDuration = (
  incident: StatuspageIncident,
): string | undefined => {
  const start = incident.started_at || incident.created_at;
  if (!start) {
    return undefined;
  }
  const startMs = Date.parse(start);
  const endMs = incident.resolved_at
    ? Date.parse(incident.resolved_at)
    : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return undefined;
  }
  return formatDuration(endMs - startMs);
};

/** Resolve the incident, optionally create & publish a postmortem. */
const resolveIncident = async ({
  incidentId,
  incidentService,
  autoPostmortem,
}: {
  incidentId: string;
  incidentService: StatuspageIncidentService;
  autoPostmortem?: boolean;
}): Promise<void> => {
  console.log("[Statuspage] resolving incident, all checks are up");
  await incidentService.updateIncident(incidentId, {
    status: "resolved",
    body: statuspageRecoveryTemplate(),
  });

  if (!autoPostmortem) {
    return;
  }

  const incident = await incidentService.getIncident(incidentId);
  const latestUpdate = incident.incident_updates.find(
    (u) => u.status !== "resolved" && u.status !== "postmortem",
  );
  // The postmortem is written after resolution, so switch the downtime
  // update's wording to past tense.
  const incidentDetails = latestUpdate?.body
    ? latestUpdate.body.replace(
        "The following services are currently down:",
        "The following services were down:",
      )
    : "One or more services experienced a disruption.";

  const postmortemBody = statuspagePostmortemTemplate({
    incidentDetails,
    duration: getIncidentDuration(incident),
  });

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
  autoPostmortem,
}: {
  state: CheckResultList;
  byName: Map<string, StatuspageComponent>;
  incidentService: StatuspageIncidentService;
  autoPostmortem?: boolean;
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
      autoPostmortem,
    });
  }
};
