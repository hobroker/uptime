export type StatuspageComponentStatus = "operational" | "major_outage";

export interface StatuspageComponent {
  id: string;
  name: string;
  status: StatuspageComponentStatus;
}

export type StatuspageIncidentStatus =
  "investigating" | "identified" | "monitoring" | "resolved" | "postmortem";

export interface StatuspageIncidentUpdate {
  id: string;
  status: StatuspageIncidentStatus;
  body: string;
}

export interface StatuspageIncident {
  id: string;
  name: string;
  status: StatuspageIncidentStatus;
  incident_updates: StatuspageIncidentUpdate[];
  components: StatuspageComponent[];
  created_at?: string;
  started_at?: string | null;
  resolved_at?: string | null;
}

export interface StatuspageConfig {
  apiKey: string;
  pageId: string;
}
