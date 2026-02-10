import {
  StatuspageComponentService,
  StatuspageIncidentService,
} from "../../services/statuspage";
import { syncComponents } from "../../statuspage/syncComponents";
import { syncIncidents } from "../../statuspage/syncIncidents";
import type {
  NotificationChannel,
  NotificationContext,
} from "../NotificationChannel";

export class StatuspageChannel implements NotificationChannel {
  name = "statuspage";

  async notify({ state, env }: NotificationContext): Promise<void> {
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
    });
  }
}
