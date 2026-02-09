import { Bot } from "grammy";
import { ApiMethods } from "grammy/types";
import type { FormattedString } from "@grammyjs/parse-mode";

type SendMessageOptions = Pick<
  Parameters<ApiMethods["sendMessage"]>[0],
  "reply_parameters" | "disable_notification"
>;

export class TelegramService {
  private bot: Bot;

  constructor({ token }: { token: string }) {
    this.bot = new Bot(token);
  }

  async sendMessage({
    chatId,
    message,
    options,
  }: {
    chatId: string | number;
    message: string | FormattedString;
    options?: SendMessageOptions;
  }) {
    // Use entity-based formatting when a FormattedString is provided.
    // This avoids fragile Markdown escaping issues (monitor names, URLs, etc.).
    if (typeof message === "string") {
      return this.bot.api.sendMessage(chatId, message, {
        // no parse_mode: plain text
        disable_notification: true,
        ...options,
      });
    }

    return this.bot.api.sendMessage(chatId, message.text, {
      entities: message.entities,
      disable_notification: true,
      ...options,
    });
  }
}
