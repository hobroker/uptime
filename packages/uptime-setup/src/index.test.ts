import { describe, it, expect, vi, beforeEach } from "vitest";
import { main } from "./index";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as prompts from "@clack/prompts";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
  exec: vi.fn((cmd, opts, callback) => {
    if (typeof opts === "function") {
      opts(null, { stdout: "" }, "");
    } else if (callback) {
      callback(null, { stdout: "" }, "");
    }
  }),
}));

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  realpathSync: vi.fn((p) => p),
}));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  confirm: vi.fn(() => Promise.resolve(true)),
  text: vi.fn(() => Promise.resolve("test-project")),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  log: {
    error: vi.fn(),
    success: vi.fn(),
  },
  isCancel: vi.fn(() => false),
  group: vi.fn(() => Promise.resolve({})),
  outro: vi.fn(),
}));

describe("Setup Script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ name: "old-name" }),
    );
  });

  it("should run through the setup steps", async () => {
    // Mock whoami to return logged in
    vi.mocked(execSync);

    await main();

    expect(prompts.intro).toHaveBeenCalled();
    expect(prompts.text).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "What should be the name of your project on Cloudflare?",
      }),
    );
    expect(prompts.outro).toHaveBeenCalled();
  });
});
