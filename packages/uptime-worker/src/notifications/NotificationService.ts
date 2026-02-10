import type { NotificationChannel, NotificationContext } from "./types";

export class NotificationService {
  private channels: NotificationChannel[];

  constructor(channels: NotificationChannel[]) {
    this.channels = channels;
  }

  async notifyAll(context: NotificationContext): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.map((channel) => channel.notify(context)),
    );

    for (const [i, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error(
          `Notification channel "${this.channels[i].name}" failed:`,
          result.reason,
        );
      }
    }
  }
}
