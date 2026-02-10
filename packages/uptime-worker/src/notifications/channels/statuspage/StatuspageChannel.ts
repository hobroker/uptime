import {
  StatuspageComponentService,
  StatuspageIncidentService,
} from "./services";
import { syncComponents } from "./syncComponents";
import { syncIncidents } from "./syncIncidents";
import { NotificationChannel } from "../../NotificationChannel";

import { ChannelName } from "../constants";

export class StatuspageChannel extends NotificationChannel {
  name = ChannelName.Statuspage;

  async notify(): Promise<void> {
    if (!this.env.STATUSPAGE_IO_API_KEY || !this.env.STATUSPAGE_IO_PAGE_ID) {
      console.log(
        "[StatuspageChannel] Statuspage not configured (missing STATUSPAGE_IO_API_KEY or STATUSPAGE_IO_PAGE_ID), skipping",
      );
      return;
    }

    const config = {
      apiKey: this.env.STATUSPAGE_IO_API_KEY,
      pageId: this.env.STATUSPAGE_IO_PAGE_ID,
    };

    const byName = await syncComponents({
      state: this.state,
      componentService: new StatuspageComponentService(config),
    });

    await syncIncidents({
      state: this.state,
      byName,
      incidentService: new StatuspageIncidentService(config),
    });
  }
}
