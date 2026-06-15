import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Suite 7 - DDOS & Rate Limiting', () => {
  test('Authenticated Endpoint Spam Protection', async ({ page }) => {
    test.setTimeout(120000); // 2 mins

    // 1. Prompt user to login manually via Google OAuth
    console.log('Navigating to login page. Please login manually via Google OAuth...');
    await page.goto('/login');
    
    // Wait for the user to successfully login and reach the dashboard
    await page.waitForURL('**/dashboard', { timeout: 60000 });
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
          promises.push(fetch('/api/users/profile'));
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
