import { Bot } from "grammy";

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
    options?: {
      replyToMessageId?: number; // Optional, for replying to a specific message
    };
  }) {
    return this.bot.api.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      ...(options?.replyToMessageId && {
        reply_parameters: {
          message_id: options?.replyToMessageId,
        },
      }),
    });
  }
}
