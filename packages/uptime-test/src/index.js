import { defineConfig, mergeConfig } from "vitest/config";

const baseConfig = defineConfig({
  test: {
    globals: true,
  },
});

/**
 * @param {import('vitest/config').UserConfigExport} config
 */
export function defineVitestConfig(config) {
  return mergeConfig(baseConfig, config);
}
