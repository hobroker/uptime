import { Bot } from "grammy";
import { ApiMethods, ParseMode } from "grammy/types";

type SendMessageOptions = Pick<
  Parameters<ApiMethods["sendMessage"]>[0],
  "reply_parameters" | "disable_notification"
>;

export class TelegramService {
  private bot: Bot;

  constructor({ token }: { token: string }) {
    this.bot = new Bot(token);
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
    return this.bot.api.sendMessage(chatId, message, {
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
    return this.bot.api.editMessageText(chatId, messageId, message, {
      ...this.defaultOptions,
      ...options,
    });
  }
}
