import { StatuspageBaseService } from "./StatuspageBaseService";
import type { StatuspageComponent, StatuspageComponentStatus } from "./types";

export class StatuspageComponentService extends StatuspageBaseService {
  async listComponents(): Promise<StatuspageComponent[]> {
    return this.request<StatuspageComponent[]>(
      `/pages/${this.pageId}/components.json`,
      { method: "GET" },
    );
  }

  async createComponent({
    name,
    status,
  }: {
    name: string;
    status: StatuspageComponentStatus;
  }): Promise<StatuspageComponent> {
    return this.request<StatuspageComponent>(
      `/pages/${this.pageId}/components.json`,
      {
        method: "POST",
        json: {
          component: {
            name,
            status,
            showcase: true,
          },
        },
      },
    );
  }

  async updateComponentStatus({
    componentId,
    status,
  }: {
    componentId: string;
    status: StatuspageComponentStatus;
  }): Promise<StatuspageComponent> {
    return this.request<StatuspageComponent>(
      `/pages/${this.pageId}/components/${componentId}.json`,
      {
        method: "PATCH",
        json: {
          component: {
            status,
          },
        },
      },
    );
  }
}
