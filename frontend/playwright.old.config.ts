import { defineConfig } from '@playwright/test';
import { headedChromiumProjects, sharedPlaywrightConfig } from './playwright.shared';

// Configuration for the legacy numbered Playwright suite. The tests remain
// available and can be run explicitly without mixing them into the v1 suite.
export default defineConfig({
  ...sharedPlaywrightConfig,
  testMatch: '**/[0-9][0-9]-*.spec.ts',
  projects: headedChromiumProjects,
});
