import { TelegramService } from "./TelegramService";
import { NotificationChannel } from "../../NotificationChannel";
import { ChannelName } from "../../constants";
import {
  telegramDowntimeTemplate,
  telegramRecoveryTemplate,
} from "./templates";
import { NotificationContext } from "../../types";
import { NotificationStateStore } from "../../NotificationStateStore";
import { TelegramNotificationState } from "./types";

interface TelegramNotificationContext extends NotificationContext {
  statuspageUrl?: string;
}

export class TelegramChannel extends NotificationChannel {
  name = ChannelName.Telegram;
  private statuspageUrl?: string;
  private notificationStateStore: NotificationStateStore;

  constructor({ state, env, statuspageUrl }: TelegramNotificationContext) {
    super({ state, env });
    this.statuspageUrl = statuspageUrl;
    this.notificationStateStore = new NotificationStateStore(env.uptime);
  }

  async notify(): Promise<void> {
    const telegramService = new TelegramService({
      token: this.env.TELEGRAM_BOT_TOKEN,
    });

    const state = await this.getState();
    const lastNotificationId = state?.lastMessageId || null;
    const currentFailedChecks = this.failedChecks.map((c) => c.name);
    const isAnyCheckDown = currentFailedChecks.length > 0;

    // Handle case where we already notified about downtime
    if (lastNotificationId) {
      if (isAnyCheckDown) {
        const lastFailedChecks = state?.lastFailedChecks ?? [];
        const hasChanged =
          lastFailedChecks.length !== currentFailedChecks.length ||
          !lastFailedChecks.every((name) => currentFailedChecks.includes(name));

        if (hasChanged) {
          console.log(
            "[TelegramChannel] Failed checks changed, updating Telegram notification",
          );
          await this.updateDowntimeNotification({
            telegramService,
            lastNotificationId,
            statuspageUrl: this.statuspageUrl,
          });
          await this.saveFailedChecks(currentFailedChecks);
          return;
        }

        console.log(
          "[TelegramChannel] Already notified via Telegram about downtime, skipping notification",
        );
        return;
      }

      await this.sendRecoveryNotification({
        telegramService,
        lastNotificationId,
        statuspageUrl: this.statuspageUrl,
      });
      return;
    }

    // Handle case where no previous notification exists
    if (!isAnyCheckDown) {
      console.log(
        "[TelegramChannel] No checks are down, skipping Telegram notification",
      );
      return;
    }

    await this.sendDowntimeNotification({
      telegramService,
      failedCheckNames: currentFailedChecks,
      statuspageUrl: this.statuspageUrl,
    });
  }

  private async getState(): Promise<TelegramNotificationState | undefined> {
    return this.notificationStateStore.getChannelState<TelegramNotificationState>(
      ChannelName.Telegram,
    );
  }

  /** Remove all persisted Telegram state (message id and failed checks). */
  private async clearState(): Promise<void> {
    await this.notificationStateStore.updateChannelState<TelegramNotificationState>(
      ChannelName.Telegram,
      undefined,
    );
  }

  private async saveDowntimeState(
    messageId: number,
    failedCheckNames: string[],
  ): Promise<void> {
    await this.notificationStateStore.updateChannelState<TelegramNotificationState>(
      ChannelName.Telegram,
      (prev) => ({
        ...prev,
        lastMessageId: messageId.toString(),
        lastFailedChecks: failedCheckNames,
      }),
    );
  }

  private async saveFailedChecks(failedCheckNames: string[]): Promise<void> {
    await this.notificationStateStore.updateChannelState<TelegramNotificationState>(
      ChannelName.Telegram,
      (prev) => ({ ...prev, lastFailedChecks: failedCheckNames }),
    );
  }

  private async sendRecoveryNotification({
    telegramService,
    lastNotificationId,
    statuspageUrl,
  }: {
    telegramService: TelegramService;
    lastNotificationId: string;
    statuspageUrl?: string;
  }): Promise<void> {
    await this.clearState();

    console.log("[TelegramChannel] sending recovery message");

    await telegramService.sendMessage({
      chatId: this.env.TELEGRAM_CHAT_ID,
      message: telegramRecoveryTemplate({ statuspageUrl }),
      options: {
        reply_parameters: {
          message_id: parseInt(lastNotificationId, 10),
        },
      },
    });

    console.log(
      "[TelegramChannel] All checks are up, sent Telegram notification about recovery",
    );
  }

  private async updateDowntimeNotification({
    telegramService,
    lastNotificationId,
    statuspageUrl,
  }: {
    telegramService: TelegramService;
    lastNotificationId: string;
    statuspageUrl?: string;
  }): Promise<void> {
    console.log(`[TelegramChannel] updating downtime message`);

    const formatted = telegramDowntimeTemplate({
      failedChecks: this.failedChecks,
      statuspageUrl,
    });
    await telegramService.editMessage({
      chatId: this.env.TELEGRAM_CHAT_ID,
      messageId: parseInt(lastNotificationId, 10),
      message: formatted,
    });

    console.log(
      "[TelegramChannel] Updated Telegram notification about downtime",
    );
  }

  private async sendDowntimeNotification({
    telegramService,
    failedCheckNames,
    statuspageUrl,
  }: {
    telegramService: TelegramService;
    failedCheckNames: string[];
    statuspageUrl?: string;
  }): Promise<void> {
    console.log(`[TelegramChannel] sending downtime message`);

    const formatted = telegramDowntimeTemplate({
      failedChecks: this.failedChecks,
      statuspageUrl,
    });
    const message = await telegramService.sendMessage({
      chatId: this.env.TELEGRAM_CHAT_ID,
      message: formatted,
    });

    await this.saveDowntimeState(message.message_id, failedCheckNames);
    console.log("[TelegramChannel] Sent Telegram notification about downtime");
  }

  private get failedChecks() {
    return this.state.filter((c) => c.status === "down");
  }
}
