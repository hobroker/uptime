import { StatuspageBaseService } from "./StatuspageBaseService";
import type { StatuspageIncident, StatuspageIncidentStatus } from "./types";

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
    componentIds,
  }: {
    name: string;
    status: StatuspageIncidentStatus;
    body?: string;
    componentIds?: string[];
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
            component_ids: componentIds,
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
      componentIds,
    }: {
      status?: StatuspageIncidentStatus;
      body?: string;
      componentIds?: string[];
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
            component_ids: componentIds,
          },
        },
      },
    );
  }
}
