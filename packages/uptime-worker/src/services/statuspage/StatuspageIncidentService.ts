import { StatuspageBaseService } from "./StatuspageBaseService";
import type {
  StatuspageComponentStatus,
  StatuspageIncident,
  StatuspageIncidentStatus,
} from "./types";

export class StatuspageIncidentService extends StatuspageBaseService {
  async listUnresolvedIncidents(): Promise<StatuspageIncident[]> {
    return this.request<StatuspageIncident[]>(
      `/pages/${this.pageId}/incidents/unresolved.json`,
      { method: "GET" },
    );
  }

  async createIncident({
    name,
    status,
    body,
    components,
  }: {
    name: string;
    status: StatuspageIncidentStatus;
    body?: string;
    components?: Record<string, StatuspageComponentStatus>;
  }): Promise<StatuspageIncident> {
    return this.request<StatuspageIncident>(
      `/pages/${this.pageId}/incidents.json`,
      {
        method: "POST",
        json: {
          incident: {
            name,
            status,
            body,
            components,
          },
        },
      },
    );
  }

  async updateIncident(
    incidentId: string,
    {
      status,
      body,
      components,
    }: {
      status?: StatuspageIncidentStatus;
      body?: string;
      components?: Record<string, StatuspageComponentStatus>;
    },
  ): Promise<StatuspageIncident> {
    return this.request<StatuspageIncident>(
      `/pages/${this.pageId}/incidents/${incidentId}.json`,
      {
        method: "PATCH",
        json: {
          incident: {
            status,
            body,
            components,
          },
        },
      },
    );
  }
}
