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

  async createPostmortem(
    incidentId: string,
    { body }: { body: string },
  ): Promise<void> {
    await this.request(
      `/pages/${this.pageId}/incidents/${incidentId}/postmortem`,
      {
        method: "PUT",
        json: {
          postmortem: {
            body_draft: body,
            notify_subscribers: false,
            notify_twitter: false,
          },
        },
      },
    );
  }

  async publishPostmortem(incidentId: string): Promise<void> {
    await this.request(
      `/pages/${this.pageId}/incidents/${incidentId}/postmortem/publish`,
      {
        method: "PUT",
        json: {
          postmortem: {
            notify_subscribers: false,
            notify_twitter: false,
          },
        },
      },
    );
  }

  async updateIncident(
    incidentId: string,
    {
      name,
      status,
      body,
      componentIds,
    }: {
      name?: string;
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
            name,
            status,
            body,
            component_ids: componentIds,
          },
        },
      },
    );
  }
}
