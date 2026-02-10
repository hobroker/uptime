import {
  StatuspageComponentService,
  type StatuspageComponent,
} from "./services";
import type { UptimeState } from "../../../types";
import { ComponentStatus, MonitorStatus } from "../../../constants";

const mapMonitorStatusToComponent = (
  status: "up" | "down",
): ComponentStatus => {
  return status === MonitorStatus.Up
    ? ComponentStatus.Operational
    : ComponentStatus.MajorOutage;
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
    }
  }

  return byName;
};
