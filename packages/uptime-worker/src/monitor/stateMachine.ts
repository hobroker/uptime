import { CheckResult, CheckResultList, ResolvedCheckConfig } from "../types";

/**
 * Confirmation phase of a single check, held in the Monitor Durable Object.
 *
 *  - `up`      — last probe passed (or never failed). Reported as up.
 *  - `pending` — a probe failed but the failure is not yet confirmed. Still
 *                reported as up (we don't want to alert on a sub-minute blip).
 *  - `down`    — the failure reached `failureThreshold` confirmations. Reported
 *                as down until a probe passes again.
 */
export type CheckPhase = "up" | "pending" | "down";

export interface CheckState {
  phase: CheckPhase;
  // Consecutive failing probes since the check last left "up".
  failures: number;
  // Last observed failure reason, surfaced once the check is confirmed down.
  error?: string;
}

export type CheckStateMap = Record<string, CheckState>;

const upState = (): CheckState => ({ phase: "up", failures: 0 });

/**
 * Advance one check's confirmation state given a fresh probe result.
 *
 * `up → pending → down`, driven by probe results:
 *  - a passing probe always resets to `up` (recovery, or a `pending` blip that
 *    never got confirmed — no alert either way);
 *  - a failing probe increments the consecutive-failure count; once it reaches
 *    `failureThreshold` the check is confirmed `down`;
 *  - a check already `down` stays `down` (keep watching) until a probe passes.
 */
export const transitionCheck = (
  prev: CheckState | undefined,
  result: CheckResult,
  failureThreshold: number,
): CheckState => {
  const threshold = Math.max(1, failureThreshold);
  const phase = prev?.phase ?? "up";

  if (result.status === "up") {
    return upState();
  }

  // Already confirmed down: keep watching for recovery, refresh the reason.
  if (phase === "down") {
    return {
      phase: "down",
      failures: prev?.failures ?? threshold,
      error: result.error,
    };
  }

  // up → pending, or pending → pending/down as confirmations accumulate.
  const failures = (phase === "pending" ? (prev?.failures ?? 0) : 0) + 1;
  return {
    phase: failures >= threshold ? "down" : "pending",
    failures,
    error: result.error,
  };
};

/**
 * Human-readable description of a phase change, for logging, or `null` when the
 * transition isn't worth a line (e.g. a check that was up and stayed up). Lets
 * the logs show the confirmation outcome — was the re-probe still failing, or
 * did it clear the blip — not just the initial failing probe.
 */
export const describeTransition = (
  check: ResolvedCheckConfig,
  prev: CheckState | undefined,
  next: CheckState,
): string | null => {
  const from = prev?.phase ?? "up";
  const threshold = Math.max(1, check.flapFilter.failureThreshold);
  const seconds = Math.round(check.flapFilter.recheckInterval / 1000);

  if (next.phase === "up") {
    if (from === "pending") {
      return `${check.name} recovered before confirmation — blip filtered, no alert`;
    }
    if (from === "down") {
      return `${check.name} recovered → up`;
    }
    return null; // up → up: nothing to say.
  }

  if (next.phase === "pending") {
    return `${check.name} failed (${next.failures}/${threshold}), re-probing in ${seconds}s to confirm`;
  }

  // next.phase === "down"
  if (from === "pending") {
    return `${check.name} failure confirmed (${next.failures}/${threshold}) → down`;
  }
  if (from === "down") {
    return `${check.name} still down`;
  }
  return `${check.name} down`; // threshold 1: up → down on the first failure.
};

/**
 * A check is "active" while it still needs the fast confirmation re-probe.
 * Only `pending` qualifies: once a check is confirmed `down` and reported, the
 * alarm loop stops and its recovery is picked up by the next regular cron poke.
 */
export const isActive = (state: CheckState | undefined): boolean =>
  state?.phase === "pending";

/**
 * Build the holistic snapshot the notification channels consume. Only checks
 * confirmed `down` are reported down; `pending` checks are still reported up so
 * an unconfirmed blip never produces an alert or a Statuspage incident.
 */
export const computeSnapshot = (
  checks: ResolvedCheckConfig[],
  states: CheckStateMap,
): CheckResultList =>
  checks.map((check) => {
    const state = states[check.name];
    const confirmedDown = state?.phase === "down";
    const result: CheckResult = {
      name: check.name,
      target: check.target,
      status: confirmedDown ? "down" : "up",
    };
    if (confirmedDown && state?.error) {
      result.error = state.error;
    }
    return result;
  });

/**
 * Delay (ms) until the DO should next re-probe, or `null` if nothing is pending
 * and the alarm loop can stop. Only checks still awaiting confirmation keep the
 * loop alive; once a check is confirmed down the alarm stops and the regular
 * cron poke detects its recovery. While any check is pending we re-probe at the
 * shortest configured recheckInterval.
 */
export const nextAlarmDelay = (
  checks: ResolvedCheckConfig[],
  states: CheckStateMap,
): number | null => {
  const active = checks.filter((check) => isActive(states[check.name]));
  if (active.length === 0) {
    return null;
  }
  return Math.min(...active.map((check) => check.flapFilter.recheckInterval));
};
