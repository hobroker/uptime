/**
 * Format a duration in milliseconds as a human-readable string,
 * e.g. "2 hours 5 minutes" or "45 seconds".
 */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const plural = (value: number, unit: string) =>
    `${value} ${unit}${value === 1 ? "" : "s"}`;

  const parts: string[] = [];
  if (days) parts.push(plural(days, "day"));
  if (hours) parts.push(plural(hours, "hour"));
  if (minutes) parts.push(plural(minutes, "minute"));
  // Seconds only matter for short incidents.
  if (seconds && !days && !hours) parts.push(plural(seconds, "second"));

  return parts.length ? parts.join(" ") : "less than a second";
};
