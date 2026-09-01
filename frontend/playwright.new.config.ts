import { defineConfig } from '@playwright/test';
import { headedChromiumProjects, sharedPlaywrightConfig } from './playwright.shared';

// Configuration for the newer v1 Playwright suite.
export default defineConfig({
  ...sharedPlaywrightConfig,
  testMatch: '**/v1-*.spec.ts',
  projects: headedChromiumProjects,
});
