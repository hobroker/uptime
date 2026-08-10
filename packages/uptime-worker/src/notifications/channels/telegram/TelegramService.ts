import { Api } from "grammy";
import { ApiMethods, ParseMode } from "grammy/types";

type SendMessageOptions = Pick<
  Parameters<ApiMethods["sendMessage"]>[0],
  "reply_parameters" | "disable_notification"
>;

export class TelegramService {
  private api: Api;

  constructor({ token }: { token: string }) {
    // Use grammy's `Api` client directly rather than `Bot`: we only issue
    // outbound API calls (send/edit), so we don't need the update-handling
    // and long-polling machinery that `Bot` sets up.
    this.api = new Api(token);
  }

  get defaultOptions(): SendMessageOptions & { parse_mode: ParseMode } {
    return {
      parse_mode: "HTML",
      disable_notification: true,
    };
  }

  async sendMessage({
    chatId,
    message,
    options,
  }: {
    chatId: string | number;
    message: string;
    options?: SendMessageOptions;
  }) {
    return this.api.sendMessage(chatId, message, {
      ...this.defaultOptions,
      ...options,
    });
  }

  async editMessage({
    chatId,
    messageId,
    message,
    options,
  }: {
    chatId: string | number;
    messageId: number;
    message: string;
    options?: SendMessageOptions;
  }) {
    return this.api.editMessageText(chatId, messageId, message, {
      ...this.defaultOptions,
      ...options,
    });
  }
}
