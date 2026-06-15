import { test, expect } from '@playwright/test';
import fs from 'fs';
import { LoginPage } from './pages/LoginPage';
import accounts from './data/accounts.json';

test.describe('Suite 7 - DDOS & Rate Limiting', () => {
  test('Authenticated Endpoint Spam Protection', async ({ page }) => {
    test.setTimeout(120000); // 2 mins

    // 1. Login using the test fallback mechanism
    console.log('Logging in using test account...');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(accounts.user.email, accounts.user.password);
    await loginPage.verifyDashboardVisible();
    console.log('Login detected! Starting SPAM test on authenticated endpoint...');

    // 2. Execute 8000 requests against an authenticated endpoint from within the browser
    const totalRequests = 8000;
    const batchSize = 200;
    
    const result = await page.evaluate(async ({ total, batch }) => {
      let firstBlockedResponse = null;
      let timeToThrottling = 0;
      const startTime = Date.now();

      for (let i = 0; i < total; i += batch) {
        const promises = [];
        for (let j = 0; j < batch; j++) {
          // Hit an authenticated endpoint
          promises.push(fetch('/api/auth/profile'));
        }

        const responses = await Promise.all(promises);
        for (const res of responses) {
          if (res.status === 429 && !firstBlockedResponse) {
            firstBlockedResponse = {
              status: res.status,
              body: await res.text()
            };
            timeToThrottling = Date.now() - startTime;
            break;
          }
        }
        if (firstBlockedResponse) break;
      }

      return { firstBlockedResponse, timeToThrottling };
    }, { total: totalRequests, batch: batchSize });

    // Verify system returns protection response
    expect(result.firstBlockedResponse).not.toBeNull();
    expect(result.firstBlockedResponse?.status).toBe(429);

    // Write detailed report
    const report = {
      test: "DDOS Simulation (Authenticated)",
      endpoint: "/api/users/profile",
      totalRequestsAttempted: totalRequests,
      timeToThrottlingMs: result.timeToThrottling,
      firstBlockedResponse: result.firstBlockedResponse
    };
    fs.writeFileSync('ddos-report.json', JSON.stringify(report, null, 2));
    
    console.log('SPAM test complete. Rate limit triggered successfully.');
  });
});
