import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:4000",
  },
  webServer: {
    command: "npm run dev",
    port: 4000,
    reuseExistingServer: true,
  },
});
