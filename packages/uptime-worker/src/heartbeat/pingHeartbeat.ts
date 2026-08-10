const HEARTBEAT_TIMEOUT_MS = 5000;

/**
 * Dead-man's-switch ping.
 *
 * Call this only after a monitoring cycle completes successfully. It notifies
 * an external heartbeat monitor (healthchecks.io, BetterStack, cronitor, …)
 * that the worker ran. Those services alert when the pings *stop* — so if the
 * worker fails to run or throws before this point, you get notified that the
 * monitor itself is down (something the worker can't report on its own).
 *
 * A heartbeat is opt-in: when `HEARTBEAT_URL` is unset, this is a no-op.
 * A delivery failure never throws — the monitoring run already succeeded, and
 * heartbeat services tolerate an occasional missed ping via their grace period.
 */
export const pingHeartbeat = async ({ env }: { env: Env }): Promise<void> => {
  const url = env.HEARTBEAT_URL;
  if (!url) {
    console.log("[heartbeat] HEARTBEAT_URL not configured, skipping");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(HEARTBEAT_TIMEOUT_MS),
    });

    // We only care about delivery, not the body. Guard the cancel so an
    // aborted/disturbed body can't surface as an unhandled rejection.
    await response.body?.cancel().catch(() => undefined);

    if (!response.ok) {
      console.error(`[heartbeat] ping failed with HTTP ${response.status}`);
      return;
    }

    console.log("[heartbeat] ping sent");
  } catch (error) {
    console.error(
      "[heartbeat] ping error",
      error instanceof Error ? error.message : error,
    );
  }
};
