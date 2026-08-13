import { pingHeartbeat } from "./heartbeat/pingHeartbeat";
import { Monitor, MONITOR_DO_NAME } from "./monitor/Monitor";

export { Monitor };

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    url.pathname = "/__scheduled";
    url.searchParams.append("cron", "* * * * *");
    return new Response(
      `To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`,
    );
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    try {
      // Poke the single Monitor Durable Object. It owns the flap-filtering
      // state machine, runs the checks, drives notifications, and schedules its
      // own alarm-based re-probes. The cron poke is both the normal-cadence
      // sweep and a safety net in case an alarm is ever missed.
      const monitor = env.MONITOR.get(env.MONITOR.idFromName(MONITOR_DO_NAME));
      const snapshot = await monitor.tick();

      console.log("[scheduled] snapshot", snapshot);

      // Keep the cron string for debugging; controller.cron is provided by Workers runtime
      console.log(`[scheduled] trigger fired at ${controller.cron}`);

      // Dead-man's-switch: report a successful cycle to the external heartbeat
      // monitor. This is intentionally the last step, so it only fires when
      // checks ran and notifications were attempted. If the worker stops
      // running or throws before here, the heartbeat stops and the external
      // monitor alerts that the monitor itself is down.
      await pingHeartbeat({ env });
    } catch (error) {
      // Cloudflare only records an uncaught exception as the invocation
      // summary (the cron template), hiding the real cause. Log the actual
      // message/stack before rethrowing so the failure is diagnosable.
      console.error(
        "[scheduled] unhandled error",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;
