import { vi } from "vitest";
import { syncComponents } from "./syncComponents";
import { UptimeState } from "../types";

vi.stubGlobal("setTimeout", (fn: () => void) => {
  fn();
  return 0;
});

const mockListComponents = vi.fn();
const mockCreateComponent = vi.fn();
const mockUpdateComponentStatus = vi.fn();

vi.mock("../services/statuspage", () => ({
  StatuspageComponentService: class {
    listComponents = mockListComponents;
    createComponent = mockCreateComponent;
    updateComponentStatus = mockUpdateComponentStatus;
  },
}));

const { StatuspageComponentService } = await import("../services/statuspage");

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
});

describe("syncComponents", () => {
  it("should create missing components", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
      {
        name: "new-svc",
        target: "https://new.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
    ];

    const service = new StatuspageComponentService({ apiKey: "", pageId: "" });
    const byName = await syncComponents({ state, componentService: service });

    expect(mockCreateComponent).toHaveBeenCalledWith({
      name: "new-svc",
      status: "operational",
    });
    expect(byName.has("new-svc")).toBe(true);
  });

  it("should update component status when it changes", async () => {
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

    const service = new StatuspageComponentService({ apiKey: "", pageId: "" });
    await syncComponents({ state, componentService: service });

    expect(mockUpdateComponentStatus).toHaveBeenCalledWith({
      componentId: "comp-1",
      status: "major_outage",
    });
  });

  it("should not update when status already matches", async () => {
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

    const service = new StatuspageComponentService({ apiKey: "", pageId: "" });
    await syncComponents({ state, componentService: service });

    expect(mockUpdateComponentStatus).not.toHaveBeenCalled();
  });

  it("should return a name-to-component map", async () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
    ];

    const service = new StatuspageComponentService({ apiKey: "", pageId: "" });
    const byName = await syncComponents({ state, componentService: service });

    expect(byName.get("api")).toEqual(
      expect.objectContaining({ id: "comp-1", name: "api" }),
    );
  });
});
