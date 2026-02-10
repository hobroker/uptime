import {
  StatuspageComponentService,
  StatuspageComponentStatus,
  type StatuspageComponent,
} from "./services";
import type { CheckStatus, CheckResultList } from "../../../types";

const mapCheckStatusToComponent = (
  status: CheckStatus,
): StatuspageComponentStatus => {
  return status === "up" ? "operational" : "major_outage";
};

/**
 * Ensures each check has a matching Statuspage component with the correct status.
 *
 * Returns a name->component map for use by incident management.
 */
export const syncComponents = async ({
  state,
  componentService,
}: {
  state: CheckResultList;
  componentService: StatuspageComponentService;
}): Promise<Map<string, StatuspageComponent>> => {
  const components = await componentService.listComponents();
  const byName = new Map(components.map((c) => [c.name, c]));

  for (const check of state) {
    const desired = mapCheckStatusToComponent(check.status);

    let component = byName.get(check.name);
    if (!component) {
      console.log(`Statuspage: creating component '${check.name}'`);
      component = await componentService.createComponent({
        name: check.name,
        status: desired,
      });
      byName.set(component.name, component);
      continue;
    }

    if (component.status !== desired) {
      console.log(
        `Statuspage: updating component '${check.name}' ${component.status} -> ${desired}`,
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
