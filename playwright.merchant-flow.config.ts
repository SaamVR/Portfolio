import { defineConfig } from "playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const envFile of [".env.local", ".env"]) {
  const envPath = resolve(process.cwd(), envFile);
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8080";

export default defineConfig({
  testDir: "./tests",
  testMatch: "merchant-registration-dashboard.spec.ts",
  timeout: 180000,
  outputDir: "test-results-merchant-flow",
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-merchant-flow" }]],
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm.cmd run start",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
