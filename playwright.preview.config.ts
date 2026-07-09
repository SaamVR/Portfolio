import { defineConfig } from "playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8080";

export default defineConfig({
  testDir: "./tests",
  testMatch: "preview-smoke.spec.ts",
  timeout: 240000,
  outputDir: "test-results",
  expect: {
    timeout: 15000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
