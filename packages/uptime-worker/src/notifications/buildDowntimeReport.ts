import type { UptimeState } from "../types";

export interface DowntimeReport {
  /** Incident title, e.g. "n8n Down" or "Multiple Systems Disrupted". */
  title: string;
  /** Plain-text body listing affected services. */
  body: string;
  /** The subset of monitors that are currently down. */
  downMonitors: UptimeState;
}

/**
 * Builds a channel-agnostic downtime report from the current monitor state.
 *
 * Both Telegram and Statuspage channels format this report for their medium.
 */
export const buildDowntimeReport = (state: UptimeState): DowntimeReport => {
  const downMonitors = state.filter((m) => m.status === "down");

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

  return { title, body, downMonitors };
};
