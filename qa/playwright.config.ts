import { defineConfig, devices } from '@playwright/test';

// Reviewer-owned QA config. Targets the built static site (dist preview, port 4173)
// by default; set QA_BASE_URL to test a different origin (e.g. dev server 5173 or a
// sub-path static server). Browsers are the locally installed Edge/Chrome channels so
// no browser download is required.
const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173';
const channel = (process.env.QA_BROWSER_CHANNEL ?? 'msedge') as 'msedge' | 'chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'results/playwright-report.json' }]],
  use: {
    baseURL,
    channel,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts$/,
    },
    {
      name: 'mobile-390',
      use: {
        ...devices['Desktop Chrome'],
        channel,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /mobile\.spec\.ts$/,
    },
  ],
});
