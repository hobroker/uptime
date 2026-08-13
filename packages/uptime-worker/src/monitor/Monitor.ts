import { DurableObject } from "cloudflare:workers";
import { runChecks } from "../checks/runChecks";
import { resolveCheckConfig } from "../checks/resolveCheckConfig";
import { NotificationService } from "../notifications/NotificationService";
import { StatuspageChannel } from "../notifications/channels/statuspage/StatuspageChannel";
import { TelegramChannel } from "../notifications/channels/telegram/TelegramChannel";
import { uptimeWorkerConfig } from "../../uptime.config";
import {
  CheckStateMap,
  computeSnapshot,
  isActive,
  nextAlarmDelay,
  transitionCheck,
} from "./stateMachine";
import { CheckResultList, ResolvedCheckConfig } from "../types";

// Single storage key holding the per-check confirmation state map.
const STATE_KEY = "checkStates";

/** Stable id for the single Monitor instance. */
export const MONITOR_DO_NAME = "monitor";

/**
 * The Monitor Durable Object owns the flap-filtering state machine and the
 * alarm-driven re-probe loop.
 *
 * - `tick()` is the cron poke: it sweeps every check, so a check that goes down
 *   between fast re-probes is still picked up.
 * - `alarm()` re-probes only the checks that are pending/down, ~recheckInterval
 *   after the previous probe, so a confirmed failure (or a recovery) is
 *   detected within ~1 minute instead of waiting a full cron interval.
 *
 * Both paths reconcile the probe results into the confirmation state, compute
 * the holistic snapshot, and drive the existing notification channels — so the
 * single-Telegram-message / grouped-Statuspage-incident UX is preserved.
 */
export class Monitor extends DurableObject<Env> {
  private readonly checks: ResolvedCheckConfig[] =
    uptimeWorkerConfig.checks.map(resolveCheckConfig);

  /** Cron poke: sweep every check. */
  async tick(): Promise<CheckResultList> {
    return this.probeAndReconcile(this.checks);
  }

  /** Alarm: re-probe only the checks still awaiting confirmation or recovery. */
  async alarm(): Promise<void> {
    const states = await this.loadStates();
    const active = this.checks.filter((check) => isActive(states[check.name]));
    if (active.length === 0) {
      // Nothing left to watch; the cron poke is the safety net.
      return;
    }
    await this.probeAndReconcile(active, states);
  }

  private async probeAndReconcile(
    checksToProbe: ResolvedCheckConfig[],
    knownStates?: CheckStateMap,
  ): Promise<CheckResultList> {
    const states = knownStates ?? (await this.loadStates());

    const results = await runChecks(
      { ...uptimeWorkerConfig, checks: checksToProbe },
      { env: this.env },
    );

    const thresholdByName = new Map(
      checksToProbe.map((check) => [
        check.name,
        check.flapFilter.failureThreshold,
      ]),
    );
    for (const result of results) {
      states[result.name] = transitionCheck(
        states[result.name],
        result,
        thresholdByName.get(result.name) ?? 1,
      );
    }

    await this.saveStates(states);

    const snapshot = computeSnapshot(this.checks, states);
    await this.notify(snapshot);
    await this.scheduleAlarm(states);

    return snapshot;
  }

  private async notify(snapshot: CheckResultList): Promise<void> {
    const notificationService = new NotificationService([
      new StatuspageChannel({ state: snapshot, env: this.env }),
      new TelegramChannel({
        state: snapshot,
        env: this.env,
        statuspageUrl: uptimeWorkerConfig.statuspageUrl,
      }),
    ]);
    await notificationService.notifyAll();
  }

  private async scheduleAlarm(states: CheckStateMap): Promise<void> {
    const delay = nextAlarmDelay(this.checks, states);
    if (delay === null) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(Date.now() + delay);
  }

  private async loadStates(): Promise<CheckStateMap> {
    return (await this.ctx.storage.get<CheckStateMap>(STATE_KEY)) ?? {};
  }

  private async saveStates(states: CheckStateMap): Promise<void> {
    await this.ctx.storage.put(STATE_KEY, states);
  }
}
