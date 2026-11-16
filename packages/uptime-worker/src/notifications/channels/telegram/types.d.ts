export interface TelegramNotificationState {
  lastMessageId?: string;
  // Names of the checks that were down as of the last Telegram notification.
  // Kept alongside lastMessageId (instead of in a shared, service-level key)
  // so the channel owns all the state its dedup logic depends on.
  lastFailedChecks?: string[];
  // ISO timestamp of when the downtime notification was first sent, used to
  // report how long the incident lasted in the recovery message.
  downSince?: string;
}
