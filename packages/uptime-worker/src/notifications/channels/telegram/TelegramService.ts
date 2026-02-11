import { Bot } from "grammy";
import { ApiMethods } from "grammy/types";

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
    message: string;
    options?: SendMessageOptions;
  }) {
    return this.bot.api.sendMessage(chatId, message, {
      parse_mode: "HTML",
      disable_notification: true,
      ...options,
    });
  }
}
