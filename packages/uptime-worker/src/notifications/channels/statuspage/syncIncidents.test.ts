import { vi } from "vitest";
import { buildIncidentData, syncIncidents } from "./syncIncidents";
import { CheckResultList } from "../../../types";
import type { StatuspageComponent } from "./services";

vi.stubGlobal("setTimeout", (fn: () => void) => {
  fn();
  return 0;
});

const mockGetIncident = vi.fn();
const mockListUnresolvedIncidents = vi.fn();
const mockCreateIncident = vi.fn();
const mockUpdateIncident = vi.fn();
const mockCreatePostmortem = vi.fn();
const mockPublishPostmortem = vi.fn();

vi.mock("./services", () => ({
  StatuspageIncidentService: class {
    getIncident = mockGetIncident;
    listUnresolvedIncidents = mockListUnresolvedIncidents;
    createIncident = mockCreateIncident;
    updateIncident = mockUpdateIncident;
    createPostmortem = mockCreatePostmortem;
    publishPostmortem = mockPublishPostmortem;
  },
}));

const { StatuspageIncidentService } = await import("./services");

const byName = new Map<string, StatuspageComponent>([
  ["api", { id: "comp-1", name: "api", status: "operational" }],
  ["web", { id: "comp-2", name: "web", status: "operational" }],
]);

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateIncident.mockResolvedValue({ id: "inc-123" });
  mockUpdateIncident.mockResolvedValue({ id: "inc-123" });
  mockListUnresolvedIncidents.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("buildIncidentData", () => {
  it("should return single-service name when one monitor is down", () => {
    const down: CheckResultList = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        error: "HTTP 500 Internal Server Error",
      },
    ];

    const data = buildIncidentData(down, byName);

    expect(data.name).toBe("⚠️ 1 check is down");
    expect(data.body).toBe(
      "The following services are currently down:\n🔴 api\n<code>HTTP 500 Internal Server Error</code>",
    );
    expect(data.componentIds).toEqual(["comp-1"]);
    expect(data.componentsKey).toBe("comp-1");
  });

  it("should return multi-service name when multiple monitors are down", () => {
    const down: CheckResultList = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "down",
      },
    ];

    const data = buildIncidentData(down, byName);

    expect(data.name).toBe("⚠️ 2 checks are down");
    expect(data.body).toBe(
      "The following services are currently down:\n🔴 api\n\n🔴 web",
    );
    expect(data.componentIds).toEqual(["comp-1", "comp-2"]);
    expect(data.componentsKey).toBe("comp-1,comp-2");
  });

  it("should omit error detail when error is not set", () => {
    const down: CheckResultList = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
      },
    ];

    const data = buildIncidentData(down, byName);

    expect(data.body).toBe(
      "The following services are currently down:\n🔴 api",
    );
  });

  it("should sort component IDs in the componentsKey", () => {
    const down: CheckResultList = [
      {
        name: "web",
        target: "https://web.example.com",
        status: "down",
      },
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
      },
    ];

    const data = buildIncidentData(down, byName);

    expect(data.componentsKey).toBe("comp-1,comp-2");
  });
});

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

describe("syncIncidents", () => {
  it("should create an incident when monitors go down", async () => {
    const state: CheckResultList = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        error: "HTTP 500 Internal Server Error",
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "up",
      },
    ];

    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service });

    expect(mockCreateIncident).toHaveBeenCalledWith({
      name: "⚠️ 1 check is down",
      status: "investigating",
      body: "The following services are currently down:\n🔴 api\n<code>HTTP 500 Internal Server Error</code>",
      componentIds: ["comp-1"],
    });
  });

  it("should update the existing incident when affected components change", async () => {
    const state: CheckResultList = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "down",
      },
    ];

    mockListUnresolvedIncidents.mockResolvedValue([
      {
        id: "inc-existing",
        name: "⚠️ 1 check is down",
        status: "investigating",
        incident_updates: [],
        components: [{ id: "comp-1", name: "api", status: "operational" }],
      },
    ]);
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service });

    expect(mockCreateIncident).not.toHaveBeenCalled();
    expect(mockUpdateIncident).toHaveBeenCalledWith("inc-existing", {
      name: "⚠️ 2 checks are down",
      body: "The following services are currently down:\n🔴 api\n\n🔴 web",
      componentIds: ["comp-1", "comp-2"],
    });
  });

  it("should skip update when affected components have not changed", async () => {
    const state: CheckResultList = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "up",
      },
    ];

    mockListUnresolvedIncidents.mockResolvedValue([
      {
        id: "inc-existing",
        name: "⚠️ 1 check is down",
        status: "investigating",
        incident_updates: [],
        components: [{ id: "comp-1", name: "api", status: "operational" }],
      },
    ]);
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service });

    expect(mockCreateIncident).not.toHaveBeenCalled();
    expect(mockUpdateIncident).not.toHaveBeenCalled();
  });

  it("should resolve the incident, create postmortem, and clean up KV", async () => {
    const state: CheckResultList = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "up",
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "up",
      },
    ];

    mockGetIncident.mockResolvedValue({
      id: "inc-existing",
      incident_updates: [
        {
          id: "upd-2",
          status: "investigating",
          body: "The following services are currently down:\n🔴 api — HTTP 500 Internal Server Error",
        },
      ],
    });

    mockListUnresolvedIncidents.mockResolvedValue([
      {
        id: "inc-existing",
        name: "⚠️ 1 check is down",
        status: "investigating",
        incident_updates: [],
        components: [{ id: "comp-1", name: "api", status: "operational" }],
      },
    ]);
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service });

    expect(mockGetIncident).toHaveBeenCalledWith("inc-existing");
    expect(mockUpdateIncident).toHaveBeenCalledWith("inc-existing", {
      status: "resolved",
      body: "All services have recovered.",
    });
    expect(mockCreatePostmortem).toHaveBeenCalledWith("inc-existing", {
      body: "## Issue\nThe following services are currently down:\n🔴 api — HTTP 500 Internal Server Error\n## Resolution\nAll services are back up and running and the incident has been resolved.",
    });
    expect(mockPublishPostmortem).toHaveBeenCalledWith("inc-existing");
  });

  it("should do nothing when all monitors are up and no active incident", async () => {
    const state: CheckResultList = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "up",
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "up",
      },
    ];

    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service });

    expect(mockCreateIncident).not.toHaveBeenCalled();
    expect(mockUpdateIncident).not.toHaveBeenCalled();
  });
});
