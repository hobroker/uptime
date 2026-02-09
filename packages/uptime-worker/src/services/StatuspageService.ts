export type StatuspageComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance";

export interface StatuspageComponent {
  id: string;
  name: string;
  status: StatuspageComponentStatus;
}

export type StatuspageIncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved"
  | "postmortem";

export interface StatuspageIncident {
  id: string;
  name: string;
  status: StatuspageIncidentStatus;
  components: StatuspageComponent[];
}

export class StatuspageService {
  private apiKey: string;
  private pageId: string;
  private baseUrl = "https://api.statuspage.io/v1";

  constructor({ apiKey, pageId }: { apiKey: string; pageId: string }) {
    this.apiKey = apiKey;
    this.pageId = pageId;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { json?: unknown } = {},
  ): Promise<T> {
    const { json, ...rest } = init;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...rest,
      headers: {
        Authorization: `OAuth ${this.apiKey}`,
        Accept: "application/json",
        ...(json ? { "Content-Type": "application/json" } : {}),
        ...(rest.headers || {}),
      },
      body: json ? JSON.stringify(json) : rest.body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Statuspage API error ${res.status} ${res.statusText}: ${text}`,
      );
    }

    // Some endpoints return empty body; handle that.
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }

  async listComponents(): Promise<StatuspageComponent[]> {
    return this.request<StatuspageComponent[]>(
      `/pages/${this.pageId}/components.json`,
      { method: "GET" },
    );
  }

  async createComponent({
    name,
    status,
  }: {
    name: string;
    status: StatuspageComponentStatus;
  }): Promise<StatuspageComponent> {
    return this.request<StatuspageComponent>(
      `/pages/${this.pageId}/components.json`,
      {
        method: "POST",
        json: {
          component: {
            name,
            status,
          },
        },
      },
    );
  }

  async updateComponentStatus({
    componentId,
    status,
  }: {
    componentId: string;
    status: StatuspageComponentStatus;
  }): Promise<StatuspageComponent> {
    return this.request<StatuspageComponent>(
      `/pages/${this.pageId}/components/${componentId}.json`,
      {
        method: "PATCH",
        json: {
          component: {
            status,
          },
        },
      },
    );
  }

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
