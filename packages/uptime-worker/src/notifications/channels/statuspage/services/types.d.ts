export type StatuspageComponentStatus = "operational" | "major_outage";

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
}

export interface StatuspageConfig {
  apiKey: string;
  pageId: string;
}
