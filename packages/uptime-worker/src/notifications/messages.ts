import type { CheckResultList } from "../types";

// ── Message types ──────────────────────────────────────────────────────

export interface DowntimeMessage {
  type: "downtime";
  /** Incident title, e.g. "n8n Down" or "Multiple Systems Disrupted". */
  title: string;
  /** Plain-text body listing affected services. */
  body: string;
  /** The subset of checks that are currently down. */
  failedChecks: CheckResultList;
}

/** Discriminated union of all notification message types. */
export type NotificationMessage = DowntimeMessage;

// ── Builders ───────────────────────────────────────────────────────────

export const buildDowntimeMessage = (
  failedChecks: CheckResultList,
): DowntimeMessage => {
  const affectedLines = failedChecks.map((check) =>
    check.error ? `🔴 ${check.name} — ${check.error}` : `🔴 ${check.name}`,
  );

  const title =
    failedChecks.length === 1
      ? `${failedChecks[0].name} Down`
      : "Multiple Systems Disrupted";

  const body = `Affected services:\n\n${affectedLines.join("\n\n")}`;

  return {
    type: "downtime",
    title,
    body,
    failedChecks,
  };
};
