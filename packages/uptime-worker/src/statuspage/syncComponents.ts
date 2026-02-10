import {
  StatuspageComponentService,
  type StatuspageComponent,
} from "../services/statuspage";
import type { UptimeState } from "../types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mapMonitorStatusToComponent = (
  status: "up" | "down",
): "operational" | "major_outage" => {
  return status === "up" ? "operational" : "major_outage";
};

/**
 * Ensures each monitor has a matching Statuspage component with the correct status.
 *
 * Returns a name->component map for use by incident management.
 */
export const syncComponents = async ({
  state,
  componentService,
}: {
  state: UptimeState;
  componentService: StatuspageComponentService;
}): Promise<Map<string, StatuspageComponent>> => {
  const components = await componentService.listComponents();
  const byName = new Map(components.map((c) => [c.name, c]));

  for (const monitor of state) {
    const desired = mapMonitorStatusToComponent(monitor.status);

    let component = byName.get(monitor.name);
    if (!component) {
      console.log(`Statuspage: creating component '${monitor.name}'`);
      component = await componentService.createComponent({
        name: monitor.name,
        status: desired,
      });
      byName.set(component.name, component);
      await sleep(1100);
      continue;
    }

    if (component.status !== desired) {
      console.log(
        `Statuspage: updating component '${monitor.name}' ${component.status} -> ${desired}`,
      );
      component = await componentService.updateComponentStatus({
        componentId: component.id,
        status: desired,
      });
      byName.set(component.name, component);
      await sleep(1100);
    }
  }

  return byName;
};
