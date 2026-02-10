import { afterAll, beforeAll, vi } from "vitest";

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

const shouldShowLogs = process?.env?.VITEST_SHOW_LOGS === "1";

let consoleLogSpy: ReturnType<typeof vi.spyOn> | null = null;
let consoleWarnSpy: ReturnType<typeof vi.spyOn> | null = null;
let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeAll(() => {
  if (shouldShowLogs) return;
  consoleLogSpy = vi.spyOn(console, "log").mockReturnValue(undefined);
  consoleWarnSpy = vi.spyOn(console, "warn").mockReturnValue(undefined);
  consoleErrorSpy = vi.spyOn(console, "error").mockReturnValue(undefined);
});

afterAll(() => {
  consoleLogSpy?.mockRestore();
  consoleWarnSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();
});
