import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://172.31.16.76:3000',
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
