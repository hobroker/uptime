import { vi } from "vitest";
import { syncIncidents } from "./syncIncidents";
import { UptimeState } from "../types";
import type { StatuspageComponent } from "../services/statuspage";

vi.stubGlobal("setTimeout", (fn: () => void) => {
  fn();
  return 0;
});

const mockCreateIncident = vi.fn();
const mockUpdateIncident = vi.fn();

vi.mock("../services/statuspage", () => ({
  StatuspageIncidentService: class {
    createIncident = mockCreateIncident;
    updateIncident = mockUpdateIncident;
  },
}));

const { StatuspageIncidentService } = await import("../services/statuspage");

const createMockKV = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  } as unknown as KVNamespace;
};

const byName = new Map<string, StatuspageComponent>([
  ["api", { id: "comp-1", name: "api", status: "operational" }],
  ["web", { id: "comp-2", name: "web", status: "operational" }],
]);

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateIncident.mockResolvedValue({ id: "inc-123" });
  mockUpdateIncident.mockResolvedValue({ id: "inc-123" });
});

describe("syncIncidents", () => {
  it("should create an incident with affected component IDs", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        protectedByZeroTrust: false,
        error: "HTTP 500 Internal Server Error",
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
    ];

    const kv = createMockKV();
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service, kv });

    expect(mockCreateIncident).toHaveBeenCalledWith({
      name: "api Down",
      status: "investigating",
      body: "Affected services:\n🔴 api — HTTP 500 Internal Server Error",
      componentIds: ["comp-1"],
    });
    expect(kv.put).toHaveBeenCalledWith("statuspageIncidentId", "inc-123");
    expect(kv.put).toHaveBeenCalledWith(
      "statuspageIncidentComponents",
      "comp-1",
    );
  });

  it("should update the existing incident with current component IDs", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const kv = createMockKV({
      statuspageIncidentId: "inc-existing",
      statuspageIncidentComponents: "comp-1",
    });
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service, kv });

    expect(mockCreateIncident).not.toHaveBeenCalled();
    expect(mockUpdateIncident).toHaveBeenCalledWith("inc-existing", {
      name: "Multiple Systems Disrupted",
      body: "Affected services:\n🔴 api\n🔴 web",
      componentIds: ["comp-1", "comp-2"],
    });
    expect(kv.put).toHaveBeenCalledWith(
      "statuspageIncidentComponents",
      "comp-1,comp-2",
    );
  });

  it("should skip update when down monitors have not changed", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
    ];

    const kv = createMockKV({
      statuspageIncidentId: "inc-existing",
      statuspageIncidentComponents: "comp-1",
    });
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service, kv });

    expect(mockCreateIncident).not.toHaveBeenCalled();
    expect(mockUpdateIncident).not.toHaveBeenCalled();
  });

  it("should resolve the incident and clean up KV", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
    ];

    const kv = createMockKV({ statuspageIncidentId: "inc-existing" });
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service, kv });

    expect(mockUpdateIncident).toHaveBeenCalledWith("inc-existing", {
      status: "resolved",
      body: "All services have recovered.",
    });
    expect(kv.delete).toHaveBeenCalledWith("statuspageIncidentId");
    expect(kv.delete).toHaveBeenCalledWith("statuspageIncidentComponents");
  });

  it("should do nothing when all monitors are up and no active incident", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
    ];

    const kv = createMockKV();
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service, kv });

    expect(mockCreateIncident).not.toHaveBeenCalled();
    expect(mockUpdateIncident).not.toHaveBeenCalled();
  });

  it("should include all down monitors in the incident body", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        protectedByZeroTrust: false,
        error: "HTTP 503 Service Unavailable",
      },
      {
        name: "web",
        target: "https://web.example.com",
        status: "down",
        protectedByZeroTrust: false,
        error: "The operation was aborted due to timeout",
      },
    ];

    const kv = createMockKV();
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service, kv });

    expect(mockCreateIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Multiple Systems Disrupted",
        body: "Affected services:\n🔴 api — HTTP 503 Service Unavailable\n🔴 web — The operation was aborted due to timeout",
        componentIds: ["comp-1", "comp-2"],
      }),
    );
  });

  it("should omit error detail when error is not set", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const kv = createMockKV();
    const service = new StatuspageIncidentService({ apiKey: "", pageId: "" });
    await syncIncidents({ state, byName, incidentService: service, kv });

    expect(mockCreateIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Affected services:\n🔴 api",
      }),
    );
  });
});
