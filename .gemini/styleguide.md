# Uptime JavaScript Style Guide

# Introduction

This style guide defines JavaScript conventions for this repository.
It reflects how code is already written here and aligns with the current tooling
(Prettier + ESLint). The primary goals are readability, consistency, and reliable behavior
in production environments (Cloudflare Workers).

# Key Principles

- **Readability first:** Prefer code that is obvious on first read.
- **Consistency over preference:** Follow the project style even if alternatives are valid.
- **Small, composable units:** Build logic from focused functions and modules.
- **Fail safely:** Handle external failures explicitly (network/API/runtime).
- **Type-aware JavaScript:** Even in JS, write code that is easy to type-check and reason about.

# Formatting and Layout

## Prettier is the source of truth

- Run formatting with Prettier.
- Keep trailing commas where valid (configured in `.prettierrc`).
- Let Prettier handle line breaks and wrapping.

## Indentation and spacing

- Use 2 spaces for indentation.
- Use spaces after commas and around operators.
- Use one statement per line unless a compact expression clearly improves readability.

## Semicolons and quotes

- Use semicolons.
- Use double quotes for strings.
- Prefer template literals for interpolation.

# Modules and Imports

## ESM conventions

- Use ESM import/export syntax.
- Prefer named exports for utilities and module APIs.
- Use default exports only where framework/runtime conventions require it.

## Import order

- Group imports by:
  1. External packages
  2. Internal modules
- Keep imports clean and remove unused imports.

## Paths

- Prefer explicit relative imports inside packages.
- Keep module boundaries clear and avoid deep, unclear cross-module coupling.

# Naming Conventions

- **Variables/functions:** `camelCase`
- **Classes:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE` for true constants and shared config keys
- **Files:**
  - Utility/function modules: `camelCase` (for example: `performCheck.js`)
  - Class modules: `PascalCase` (for example: `NotificationService.js`)

Use names that encode intent (for example: `maxAttempts`, `expectedCodes`, `notificationService`).

# Functions and Control Flow

## Function style

- Prefer `const fn = async (...) => {}` for local/exported functions.
- Keep functions focused on one responsibility.
- Prefer early returns to reduce nesting.
- Pass dependencies explicitly (for example: `{ env }`) instead of relying on hidden globals.

## Async behavior

- Use `async/await` over raw Promise chains for non-trivial flows.
- Use `Promise.all` for parallel work when all results are required.
- Use `Promise.allSettled` when partial failures are acceptable and should be logged.

# Error Handling and Reliability

- Catch errors at boundaries (network, storage, third-party APIs).
- Prefer specific, actionable error messages.
- Do not swallow errors silently.
- When retries are required, keep retry counts bounded and explicit.
- Return predictable error states instead of throwing from deep internals when callers need status objects.

# Logging

- Use `console.log`, `console.warn`, and `console.error` with clear prefixes (for example: `[performCheck]`).
- Log enough context to debug failures without leaking secrets.
- Keep logs structured and consistent so production debugging is easy.

# Comments and Documentation

- Add comments only when intent is not obvious from code.
- Explain **why**, not **what**.
- Keep comments short and precise.
- For JavaScript files, use JSDoc where type/contract clarity is needed.

# Linting and Quality Gates

- Linting is required and should pass before merging.
- Follow ESLint rules in `packages/uptime-worker/eslint.config.mjs`.
- Respect unused variable/import rules.
  - Prefix intentionally unused args/vars with `_`.
- Prefer `const` when values are not reassigned.

# Testing Expectations

- Write tests for behavior-heavy logic (checks, retries, notification fan-out, state transitions).
- Keep tests deterministic.
- Cover both success and failure paths.

# Randy Marsh Summary Rules

- Every time a PR is opened, generate a summary.
- If possible, prepend the summary to the PR description.
- Use the Randy Marsh tone: "Wow... look at all these changes!"
- Ensure the summary clearly lists the key changes.

# Example

```javascript
import pLimit from "p-limit";

const limit = pLimit(2);

/**
 * Run checks concurrently with a fixed limit.
 * @param {Array<() => Promise<any>>} jobs
 * @returns {Promise<any[]>}
 */
export const runChecks = async (jobs) =>
  Promise.all(jobs.map((job) => limit(() => job())));

export const performCheck = async (check, { env }) => {
  const maxAttempts = Math.max(0, check.retryCount) + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(check.probeTarget, {
        method: check.method,
        body: check.body?.({ env }),
        headers: check.headers?.({ env }),
        signal: AbortSignal.timeout(check.timeout),
      });

      response.body?.cancel();

      if (check.expectedCodes.includes(response.status)) {
        return { name: check.name, status: "up" };
      }

      if (attempt < maxAttempts) {
        console.warn(
          `[performCheck] ${check.name} failed (${attempt}/${maxAttempts}), retrying...`,
        );
        continue;
      }

      return {
        name: check.name,
        status: "down",
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    } catch (error) {
      if (attempt < maxAttempts) {
        console.warn(
          `[performCheck] ${check.name} errored (${attempt}/${maxAttempts}), retrying...`,
        );
        continue;
      }

      return {
        name: check.name,
        status: "down",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
};
```
