import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationService } from "./NotificationService";
import { NotificationChannel } from "./NotificationChannel";

class FakeChannel extends NotificationChannel {
  constructor(
    public readonly channelName: string,
    private readonly impl: () => Promise<void>,
  ) {
    super({ state: [], env: {} as Env });
    this.name = channelName;
  }

  notify(): Promise<void> {
    return this.impl();
  }
}

describe("NotificationService", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("notifies every channel", async () => {
    const a = vi.fn().mockResolvedValue(undefined);
    const b = vi.fn().mockResolvedValue(undefined);

    await new NotificationService([
      new FakeChannel("a", a),
      new FakeChannel("b", b),
    ]).notifyAll();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("isolates channel failures: one rejecting channel does not stop the others", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("telegram down"));
    const healthy = vi.fn().mockResolvedValue(undefined);

    const service = new NotificationService([
      new FakeChannel("telegram", failing),
      new FakeChannel("statuspage", healthy),
    ]);

    // notifyAll must resolve (not reject) even though a channel threw.
    await expect(service.notifyAll()).resolves.toBeUndefined();

    expect(healthy).toHaveBeenCalledTimes(1);
    // The failure is surfaced via console.error, tagged with the channel name.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Channel "telegram" failed'),
      expect.any(Error),
    );
  });
});
