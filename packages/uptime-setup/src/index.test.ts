import { describe, it, expect, vi, beforeEach } from "vitest";
import { main } from "./index";
import { execSync, exec } from "node:child_process";
import * as fs from "node:fs";
import * as prompts from "@clack/prompts";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
  exec: vi.fn(),
}));

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  realpathSync: vi.fn((p) => p),
}));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  confirm: vi.fn(),
  text: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  log: {
    error: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  isCancel: vi.fn((val) => val === "__CANCEL__"),
  group: vi.fn(),
  outro: vi.fn(),
}));

describe("Setup Script", () => {
  const mockWranglerContent = JSON.stringify({
    name: "old-name",
    kv_namespaces: [
      { binding: "uptime", id: "00000000000000000000000000000000" },
    ],
  });

  const validHexId = "deadbeefdeadbeefdeadbeefdeadbeef";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.readFileSync).mockReturnValue(mockWranglerContent);

    // Default implementation for all tests
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      const cb = (typeof opts === "function" ? opts : callback) as any;
      if (cmd.includes("whoami")) {
        cb(null, { stdout: "You are logged in" }, "");
      } else if (cmd.includes("kv namespace list")) {
        cb(null, { stdout: "[]" }, "");
      } else if (cmd.includes("kv namespace create")) {
        cb(null, { stdout: `id = "${validHexId}"` }, "");
      } else {
        cb(null, { stdout: "" }, "");
      }
      return {} as any;
    });

    vi.mocked(prompts.confirm).mockResolvedValue(true);
    vi.mocked(prompts.text).mockResolvedValue("new-project");
    vi.mocked(prompts.group).mockResolvedValue({});
  });

  it("should run through a successful setup when already logged in", async () => {
    await main();

    expect(prompts.intro).toHaveBeenCalled();
    expect(prompts.text).toHaveBeenCalled();
    expect(prompts.outro).toHaveBeenCalled();
  });

  it("should prompt for login if not logged in", async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      const cb = (typeof opts === "function" ? opts : callback) as any;
      if (cmd.includes("whoami")) {
        cb(new Error("Not logged in"), { stdout: "" }, "");
      } else if (cmd.includes("kv namespace list")) {
        cb(null, { stdout: "[]" }, "");
      } else {
        cb(null, { stdout: "" }, "");
      }
      return {} as any;
    });

    vi.mocked(prompts.confirm).mockImplementation(async (opts: any) => {
      if (opts.message.includes("login to Cloudflare now?")) return true;
      return false;
    });

    await main();

    expect(execSync).toHaveBeenCalledWith(
      "npx wrangler login",
      expect.anything(),
    );
  });

  it("should handle project name updates in wrangler.jsonc", async () => {
    vi.mocked(prompts.text).mockResolvedValue("my-awesome-uptime");

    await main();

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const wranglerUpdate = writeCalls.find((call) =>
      call[0].toString().includes("wrangler.jsonc"),
    );
    expect(wranglerUpdate?.[1]).toMatch(/"name"\s*:\s*"my-awesome-uptime"/);
  });

  it("should handle KV namespace discovery and update", async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      const cb = (typeof opts === "function" ? opts : callback) as any;
      if (cmd.includes("kv namespace list")) {
        cb(
          null,
          {
            stdout: JSON.stringify([
              {
                title: "new-project-uptime",
                id: "foundid0123456789abcdefabcdefabcd",
              },
            ]),
          },
          "",
        );
      } else if (cmd.includes("whoami")) {
        cb(null, { stdout: "You are logged in" }, "");
      } else {
        cb(null, { stdout: "" }, "");
      }
      return {} as any;
    });

    await main();

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const wranglerUpdate = writeCalls.find(
      (call) =>
        call[0].toString().includes("wrangler.jsonc") &&
        call[1]
          .toString()
          .match(/"id"\s*:\s*"foundid0123456789abcdefabcdefabcd"/),
    );
    expect(wranglerUpdate).toBeDefined();
  });

  it("should create a new KV namespace if none found", async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      const cb = (typeof opts === "function" ? opts : callback) as any;
      if (cmd.includes("kv namespace list")) {
        cb(null, { stdout: "[]" }, "");
      } else if (cmd.includes("kv namespace create")) {
        cb(null, { stdout: `id = "${validHexId}"` }, "");
      } else if (cmd.includes("whoami")) {
        cb(null, { stdout: "You are logged in" }, "");
      } else {
        cb(null, { stdout: "" }, "");
      }
      return {} as any;
    });

    await main();

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const wranglerWrites = writeCalls.filter((call) =>
      call[0].toString().includes("wrangler.jsonc"),
    );

    const hasCreatedId = wranglerWrites.some((call) =>
      call[1].toString().includes(validHexId),
    );
    expect(hasCreatedId).toBe(true);
  });

  it("should handle secrets configuration", async () => {
    vi.mocked(prompts.confirm).mockImplementation(async (opts: any) => {
      if (opts.message.includes("configure Cloudflare secrets")) return true;
      return false;
    });

    vi.mocked(prompts.group).mockResolvedValue({
      TELEGRAM_BOT_TOKEN: "bot-token",
      TELEGRAM_CHAT_ID: "chat-id",
    });

    await main();

    expect(execSync).toHaveBeenCalledWith(
      "npx wrangler secret put TELEGRAM_BOT_TOKEN",
      expect.objectContaining({ input: "bot-token" }),
    );
  });

  it("should throw cancellation error if user cancels project name prompt", async () => {
    vi.mocked(prompts.text).mockResolvedValue("__CANCEL__" as any);

    await expect(main()).rejects.toThrow("Setup cancelled.");
  });
});
