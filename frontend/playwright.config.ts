import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    actionTimeout: 15000,
    headless: false,
    viewport: null,
    launchOptions: {
      slowMo: 300,
      args: ['--start-maximized'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        viewport: null,
      },
    },
  ],
});
