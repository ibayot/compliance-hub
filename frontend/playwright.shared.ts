import { devices } from '@playwright/test';

const visibleChromiumLaunchOptions = {
  slowMo: 500,
  // Remove Playwright's Windows startup-window suppression so headed
  // Chromium creates a normal desktop window that can be seen.
  ignoreDefaultArgs: ['--no-startup-window'],
};

const mobileViewport = devices['iPhone 12 Pro Max'].viewport;

export const sharedPlaywrightConfig = {
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 300_000,
  retries: 0,
  maxFailures: 1,
  workers: 1,
  reporter: 'list' as const,
  use: {
    // Exercise the Docker-served Nginx frontend by default. Set
    // E2E_BASE_URL explicitly only when targeting another environment.
    // https://172.31.16.76 -> Staging IP
    // https://localhost -> Local IP
    baseURL: process.env.E2E_BASE_URL || 'https://172.31.16.76',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry' as const,
    actionTimeout: 15000,
    // Keep direct Playwright runs visible so the user can watch the browser
    // interactions.
    headless: false,
    viewport: null,
    launchOptions: visibleChromiumLaunchOptions,
  },
};

export const headedChromiumProjects = [
  {
    name: 'pc',
    use: {
      browserName: 'chromium' as const,
      headless: false,
      // Let the maximized headed window determine the page size.
      viewport: null,
      launchOptions: {
        ...visibleChromiumLaunchOptions,
        args: ['--start-maximized'],
      },
    },
  },
  {
    name: 'mobile-web',
    use: {
      ...devices['iPhone 12 Pro Max'],
      browserName: 'chromium' as const,
      headless: false,
      // Keep the visible Chromium window the same size as the emulated
      // iPhone viewport instead of inheriting the desktop maximize argument.
      launchOptions: {
        ...visibleChromiumLaunchOptions,
        args: [`--window-size=${mobileViewport.width},${mobileViewport.height}`],
      },
    },
  },
];
