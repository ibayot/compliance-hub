import { test, expect, request as playwrightRequest } from '@playwright/test';
import fs from 'fs';
import { LoginPage } from './pages/LoginPage';
import accounts from './data/accounts.json';

test.describe('Suite 7 - DDOS & Rate Limiting', () => {
  test('Authenticated Endpoint Spam Protection', async ({ page, request }) => {
    test.setTimeout(120000); // 2 mins

    // 1. Login using the test fallback mechanism
    console.log('Logging in using test account...');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(accounts.user.email, accounts.user.password);
    await loginPage.verifyDashboardVisible();
    console.log('Login detected! Starting SPAM test on authenticated endpoint...');

    const token = await page.evaluate(() => window.sessionStorage.getItem('accessToken'));

    // 2. Execute requests against an endpoint using Playwright's native API request context
    // This bypasses the Vite dev server proxy to avoid Vite crash/timeout and hits the backend directly.
    const apiContext = await playwrightRequest.newContext({
      baseURL: 'http://localhost:4000',
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    let firstBlockedResponse = null;
    let timeToThrottling = 0;
    const startTime = Date.now();
    const batchSize = 100;
    const totalRequests = 4500; // Just enough to hit the 4000 limit

    for (let i = 0; i < totalRequests; i += batchSize) {
      const promises = [];
      for (let j = 0; j < batchSize; j++) {
        promises.push(apiContext.get('/api/auth/profile'));
      }

      const responses = await Promise.all(promises);
      for (const res of responses) {
        if (res.status() === 429 && !firstBlockedResponse) {
          firstBlockedResponse = {
            status: res.status(),
            body: await res.text(),
          };
          timeToThrottling = Date.now() - startTime;
          break;
        }
      }
      if (firstBlockedResponse) break;
    }

    // Verify system returns protection response
    expect(firstBlockedResponse).not.toBeNull();
    expect(firstBlockedResponse?.status).toBe(429);

    // Write detailed report
    const report = {
      test: 'DDOS Simulation (Native API)',
      endpoint: '/api/health',
      totalRequestsAttempted: totalRequests,
      timeToThrottlingMs: timeToThrottling,
      firstBlockedResponse: firstBlockedResponse,
    };
    fs.writeFileSync('ddos-report.json', JSON.stringify(report, null, 2));

    console.log('SPAM test complete. Rate limit triggered successfully.');
    console.log(
      'Waiting 65 seconds for the rate limit window to expire before the next test suite...',
    );
    await page.waitForTimeout(65000);
  });
});
