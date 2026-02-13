import { CheckResultList } from "../types";
import { NotificationChannel } from "./NotificationChannel";
import { NotificationStateStore } from "./NotificationStateStore";

export class NotificationService {
  private channels: NotificationChannel[];

  constructor(channels: NotificationChannel[]) {
    this.channels = channels;
  }

  async notifyAll(): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.map((channel) => channel.notify()),
    );

    for (const [i, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error(
          `[NotificationService] Channel "${this.channels[i].name}" failed to send notification:`,
          result.reason,
        );
      }
    }
  }

  async updateNotificationState({
    kv,
    state,
  }: {
    kv: KVNamespace;
    state: CheckResultList;
  }): Promise<void> {
    const notificationStateStore = new NotificationStateStore(kv);
    await notificationStateStore.updateLastFailedChecks(
      state
        .filter((check) => check.status === "down")
        .map((check) => check.name),
    );
  }
}
