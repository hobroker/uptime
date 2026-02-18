import { defineConfig } from "@hobroker/uptime-eslint";

export default defineConfig({
  ignores: ["**/worker-configuration.d.ts", ".wrangler/**"],
});
