import { defineVitestConfig } from "@hobroker/uptime-test";

export default defineVitestConfig({
  test: {
    setupFiles: ["./src/testSetup.ts"],
  },
});
