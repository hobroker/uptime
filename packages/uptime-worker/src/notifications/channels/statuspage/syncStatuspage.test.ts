import { vi } from "vitest";
import { StatuspageChannel } from "./StatuspageChannel";
import { UptimeState } from "../../../types";

vi.stubGlobal("setTimeout", (fn: () => void) => {
  fn();
  return 0;
});

const mockSyncComponents = vi.fn().mockResolvedValue(new Map());
const mockSyncIncidents = vi.fn().mockResolvedValue(undefined);

vi.mock("./syncComponents", () => ({
  syncComponents: (...args: unknown[]) => mockSyncComponents(...args),
}));

vi.mock("./syncIncidents", () => ({
  syncIncidents: (...args: unknown[]) => mockSyncIncidents(...args),
}));

vi.mock("./services", () => ({
  StatuspageComponentService: class {},
  StatuspageIncidentService: class {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSyncComponents.mockResolvedValue(new Map());
  mockSyncIncidents.mockResolvedValue(undefined);
});

const createEnv = () =>
  ({
    STATUSPAGE_IO_API_KEY: "test-key",
    STATUSPAGE_IO_PAGE_ID: "test-page",
    uptime: {},
  }) as unknown as Env;

const state: UptimeState = [
  {
    name: "api",
    target: "https://api.example.com",
    status: "up",
  },
];

describe("StatuspageChannel", () => {
  const channel = new StatuspageChannel();

  it("should skip when Statuspage is not configured", async () => {
    const env = createEnv();
    env.STATUSPAGE_IO_API_KEY = "" as string;

    await channel.notify({ state, env });

    expect(mockSyncComponents).not.toHaveBeenCalled();
    expect(mockSyncIncidents).not.toHaveBeenCalled();
  });

  it("should call syncComponents then syncIncidents", async () => {
    const byName = new Map([["api", { id: "comp-1", name: "api" }]]);
    mockSyncComponents.mockResolvedValue(byName);

    const env = createEnv();
    await channel.notify({ state, env });

    expect(mockSyncComponents).toHaveBeenCalledWith({
      state,
      componentService: expect.anything(),
    });
    expect(mockSyncIncidents).toHaveBeenCalledWith({
      state,
      byName,
      incidentService: expect.anything(),
    });
  });
});
