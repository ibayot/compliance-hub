import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Suite 7 — DDOS & Rate Limiting', () => {
  test('Health Endpoint Spam Protection', async ({ page, request }) => {
    test.setTimeout(120000); // 2 mins

    let firstBlockedResponse: any = null;
    let timeToThrottling = 0;
    const startTime = Date.now();
    
    // 1. Execute 4500 requests against /api/health
    const totalRequests = 4500;
    const batchSize = 200;

    for (let i = 0; i < totalRequests; i += batchSize) {
      const promises = [];
      for (let j = 0; j < batchSize; j++) {
        promises.push(request.get('/api/health'));
      }

      const responses = await Promise.all(promises);
      for (const res of responses) {
        if (res.status() === 429 && !firstBlockedResponse) {
          firstBlockedResponse = {
            status: res.status(),
            headers: res.headers(),
            body: await res.text()
          };
          timeToThrottling = Date.now() - startTime;
          break;
        }
      }
      if (firstBlockedResponse) break;
    }

    // Verify system returns protection response
    expect(firstBlockedResponse).not.toBeNull();
    expect(firstBlockedResponse.status).toBe(429);

    // Write detailed report
    const report = {
      test: "DDOS Simulation",
      endpoint: "/api/health",
      totalRequestsAttempted: totalRequests,
      timeToThrottlingMs: timeToThrottling,
      firstBlockedResponse
    };
    fs.writeFileSync('ddos-report.json', JSON.stringify(report, null, 2));

    // 2. Immediately try to load the frontend login page
    // Verify system remains operational (UI doesn't crash)
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    
    // Verify that the UI rendered successfully despite the API being rate-limited
    await expect(emailInput).toBeVisible({ timeout: 15000 });
  });
});
