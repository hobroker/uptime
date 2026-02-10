import { vi } from "vitest";
import { syncStatuspage } from "./syncStatuspage";
import { UptimeState } from "../types";

// Make sleep() resolve instantly
vi.stubGlobal("setTimeout", (fn: () => void) => {
  fn();
  return 0;
});

// --- Mocks ---

const mockListComponents = vi.fn();
const mockCreateComponent = vi.fn();
const mockUpdateComponentStatus = vi.fn();
const mockCreateIncident = vi.fn();
const mockUpdateIncident = vi.fn();

vi.mock("../services/statuspage", () => ({
  StatuspageComponentService: class {
    listComponents = mockListComponents;
    createComponent = mockCreateComponent;
    updateComponentStatus = mockUpdateComponentStatus;
  },
  StatuspageIncidentService: class {
    createIncident = mockCreateIncident;
    updateIncident = mockUpdateIncident;
  },
}));

// Fake KV store backed by a plain object
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
  };
};

const createEnv = (kvInit: Record<string, string> = {}) => {
  const kv = createMockKV(kvInit);
  return {
    STATUSPAGE_IO_API_KEY: "test-key",
    STATUSPAGE_IO_PAGE_ID: "test-page",
    uptime: kv,
  };
};

// Pre-existing components returned by listComponents
const existingComponents = [
  { id: "comp-1", name: "api", status: "operational" },
  { id: "comp-2", name: "web", status: "operational" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockListComponents.mockResolvedValue(existingComponents);
  mockCreateComponent.mockImplementation(
    ({ name, status }: { name: string; status: string }) =>
      Promise.resolve({ id: `new-${name}`, name, status }),
  );
  mockUpdateComponentStatus.mockImplementation(
    ({ componentId, status }: { componentId: string; status: string }) => {
      const comp = existingComponents.find((c) => c.id === componentId);
      return Promise.resolve({ ...comp, status });
    },
  );
  mockCreateIncident.mockResolvedValue({ id: "inc-123" });
  mockUpdateIncident.mockResolvedValue({ id: "inc-123" });
});

// --- Tests ---

describe("syncStatuspage - incident management", () => {
  it("should create an incident when monitors go down and no active incident exists", async () => {
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

    const env = createEnv();
    await syncStatuspage(state, { env });

    expect(mockCreateIncident).toHaveBeenCalledWith({
      name: "Service disruption",
      status: "investigating",
      body: "Affected services: api",
      components: { "comp-1": "major_outage" },
    });
    expect(env.uptime.put).toHaveBeenCalledWith(
      "statuspageIncidentId",
      "inc-123",
    );
  });

  it("should update the existing incident when monitors are down and an active incident exists", async () => {
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

    const env = createEnv({ statuspageIncidentId: "inc-existing" });
    await syncStatuspage(state, { env });

    expect(mockCreateIncident).not.toHaveBeenCalled();
    expect(mockUpdateIncident).toHaveBeenCalledWith("inc-existing", {
      body: "Affected services: api, web",
      components: {
        "comp-1": "major_outage",
        "comp-2": "major_outage",
      },
    });
  });

  it("should resolve the incident when all monitors recover", async () => {
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

    const env = createEnv({ statuspageIncidentId: "inc-existing" });
    await syncStatuspage(state, { env });

    expect(mockUpdateIncident).toHaveBeenCalledWith("inc-existing", {
      status: "resolved",
      body: "All services have recovered.",
      components: {
        "comp-1": "operational",
        "comp-2": "operational",
      },
    });
    expect(env.uptime.delete).toHaveBeenCalledWith("statuspageIncidentId");
  });

  it("should not create or update incidents when all monitors are up and no active incident", async () => {
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

    const env = createEnv();
    await syncStatuspage(state, { env });

    expect(mockCreateIncident).not.toHaveBeenCalled();
    expect(mockUpdateIncident).not.toHaveBeenCalled();
  });

  it("should include multiple down monitors in the incident body", async () => {
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

    const env = createEnv();
    await syncStatuspage(state, { env });

    expect(mockCreateIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Affected services: api, web",
        components: {
          "comp-1": "major_outage",
          "comp-2": "major_outage",
        },
      }),
    );
  });

  it("should skip entirely when Statuspage is not configured", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const env = createEnv();
    env.STATUSPAGE_IO_API_KEY = "";

    await syncStatuspage(state, { env });

    expect(mockListComponents).not.toHaveBeenCalled();
    expect(mockCreateIncident).not.toHaveBeenCalled();
  });
});
