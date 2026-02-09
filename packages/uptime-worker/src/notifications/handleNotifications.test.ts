import { buildDowntimeMessage } from "./handleNotifications";
import { UptimeState } from "../types";

describe("buildDowntimeMessage", () => {
  it("should include the header with a link to the status page", () => {
    const state: UptimeState = [
      {
        name: "api",
        target: "https://api.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const msg = buildDowntimeMessage(state);

    expect(msg.text).toContain("⚠️ Some monitors are down ⚠️");
    expect(msg.entities).toContainEqual(
      expect.objectContaining({
        type: "text_link",
        url: "https://hobroker.statuspage.io/",
      }),
    );
  });

  it("should list a single HTTP monitor as a linked name with bullet", () => {
    const state: UptimeState = [
      {
        name: "my-api",
        target: "https://api.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const msg = buildDowntimeMessage(state);

    expect(msg.text).toContain("🔴 my-api");
    expect(msg.entities).toContainEqual(
      expect.objectContaining({
        type: "text_link",
        url: "https://api.example.com",
      }),
    );
  });

  it("should list a non-HTTP monitor with bold name and target in parentheses", () => {
    const state: UptimeState = [
      {
        name: "db-check",
        target: "tcp://db.local:5432",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const msg = buildDowntimeMessage(state);

    expect(msg.text).toContain("🔴 db-check (tcp://db.local:5432)");
    expect(msg.entities).toContainEqual(
      expect.objectContaining({ type: "bold" }),
    );
  });

  it("should append Zero Trust label when protectedByZeroTrust is true", () => {
    const state: UptimeState = [
      {
        name: "internal",
        target: "https://internal.example.com",
        status: "down",
        protectedByZeroTrust: true,
      },
    ];

    const msg = buildDowntimeMessage(state);

    expect(msg.text).toContain(": (protected by Zero Trust)");
  });

  it("should not append Zero Trust label when protectedByZeroTrust is false", () => {
    const state: UptimeState = [
      {
        name: "public",
        target: "https://public.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const msg = buildDowntimeMessage(state);

    expect(msg.text).not.toContain("protected by Zero Trust");
  });

  it("should only include monitors that are down", () => {
    const state: UptimeState = [
      {
        name: "healthy",
        target: "https://ok.example.com",
        status: "up",
        protectedByZeroTrust: false,
      },
      {
        name: "broken",
        target: "https://broken.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const msg = buildDowntimeMessage(state);

    expect(msg.text).not.toContain("healthy");
    expect(msg.text).toContain("🔴 broken");
  });

  it("should list multiple down monitors separated by newlines", () => {
    const state: UptimeState = [
      {
        name: "api-1",
        target: "https://api1.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
      {
        name: "api-2",
        target: "https://api2.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
      {
        name: "api-3",
        target: "https://api3.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const msg = buildDowntimeMessage(state);

    expect(msg.text).toContain("🔴 api-1\n🔴 api-2\n🔴 api-3");
  });

  it("should handle a mix of HTTP and non-HTTP down monitors", () => {
    const state: UptimeState = [
      {
        name: "web",
        target: "https://web.example.com",
        status: "down",
        protectedByZeroTrust: false,
      },
      {
        name: "redis",
        target: "redis://cache.local:6379",
        status: "down",
        protectedByZeroTrust: false,
      },
    ];

    const msg = buildDowntimeMessage(state);

    expect(msg.text).toContain("🔴 web");
    expect(msg.text).toContain("🔴 redis (redis://cache.local:6379)");

    const linkEntities = msg.entities.filter(
      (e: { type: string }) => e.type === "text_link",
    );
    expect(linkEntities).toContainEqual(
      expect.objectContaining({ url: "https://web.example.com" }),
    );
  });
});
