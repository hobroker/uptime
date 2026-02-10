import type { UptimeState } from "../types";

// ── Message types ──────────────────────────────────────────────────────

export interface DowntimeMessage {
  type: "downtime";
  /** Incident title, e.g. "n8n Down" or "Multiple Systems Disrupted". */
  title: string;
  /** Plain-text body listing affected services. */
  body: string;
  /** The subset of monitors that are currently down. */
  downMonitors: UptimeState;
}

/** Discriminated union of all notification message types. */
export type NotificationMessage = DowntimeMessage;

// ── Builders ───────────────────────────────────────────────────────────

export const buildDowntimeMessage = (
  downMonitors: UptimeState,
): DowntimeMessage => {
  const affectedLines = downMonitors.map((monitor) =>
    monitor.error
      ? `🔴 ${monitor.name} — ${monitor.error}`
      : `🔴 ${monitor.name}`,
  );

  const title =
    downMonitors.length === 1
      ? `${downMonitors[0].name} Down`
      : "Multiple Systems Disrupted";

  const body = `Affected services:\n\n${affectedLines.join("\n\n")}`;

  return {
    type: "downtime",
    title,
    body,
    downMonitors,
  };
};
