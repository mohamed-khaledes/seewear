import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the journeys a customer actually takes.
 *
 * They run against a real build talking to the real Supabase project named in
 * `.env.local`, because a storefront that passes against mocks proves nothing
 * about a storefront. That has one consequence, which the specs are written
 * around: **nothing here places an order**. The suite fills the checkout form
 * and stops at the button, so running it never leaves rows in the orders table
 * or a charge with Paymob.
 *
 * `npm run test:e2e` starts its own dev server on port 3100.
 */

/** Its own port, so the suite can never test another project by accident. */
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        // Deliberately not reusing whatever is on the default port: another
        // project answering on 3000 would be tested instead of this one.
        reuseExistingServer: false,
        // A cold Next build on first request is slow; this is not a hang.
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
