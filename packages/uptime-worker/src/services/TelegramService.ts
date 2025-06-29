import { Bot } from "grammy";
import { ApiMethods } from "grammy/types";

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
    chatId: string | number; // Can be a string (for channel usernames) or a number (for user IDs)
    message: string;
    options?: Pick<
      Parameters<ApiMethods["sendMessage"]>[0],
      "reply_parameters"
    >;
  }) {
    return this.bot.api.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      ...options,
    });
  }
}
