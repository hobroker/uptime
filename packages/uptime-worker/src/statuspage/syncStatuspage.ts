import {
  StatuspageComponentService,
  StatuspageIncidentService,
} from "../services/statuspage";
import type { UptimeState } from "../types";
import { syncComponents } from "./syncComponents";
import { syncIncidents } from "./syncIncidents";

/**
 * Syncs current monitor state to Statuspage.
 *
 * 1. Ensures components exist with correct status and position.
 * 2. Creates / updates / resolves an incident based on down monitors.
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

  const config = {
    apiKey: env.STATUSPAGE_IO_API_KEY,
    pageId: env.STATUSPAGE_IO_PAGE_ID,
  };

  const byName = await syncComponents({
    state,
    componentService: new StatuspageComponentService(config),
  });

  await syncIncidents({
    state,
    byName,
    incidentService: new StatuspageIncidentService(config),
    kv: env.uptime,
  });
};
