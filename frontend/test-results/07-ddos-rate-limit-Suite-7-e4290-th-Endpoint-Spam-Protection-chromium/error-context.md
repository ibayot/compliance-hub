# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 07-ddos-rate-limit.spec.ts >> Suite 7 — DDOS & Rate Limiting >> Health Endpoint Spam Protection
- Location: frontend\tests\e2e\07-ddos-rate-limit.spec.ts:5:7

# Error details

```
Error: expect(received).not.toBeNull()

Received: null
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import fs from 'fs';
  3  | 
  4  | test.describe('Suite 7 — DDOS & Rate Limiting', () => {
  5  |   test('Health Endpoint Spam Protection', async ({ page, request }) => {
  6  |     test.setTimeout(120000); // 2 mins
  7  | 
  8  |     let firstBlockedResponse: any = null;
  9  |     let timeToThrottling = 0;
  10 |     const startTime = Date.now();
  11 |     
  12 |     // 1. Execute 4500 requests against /api/health
  13 |     const totalRequests = 4500;
  14 |     const batchSize = 200;
  15 | 
  16 |     for (let i = 0; i < totalRequests; i += batchSize) {
  17 |       const promises = [];
  18 |       for (let j = 0; j < batchSize; j++) {
  19 |         promises.push(request.get('/api/health'));
  20 |       }
  21 | 
  22 |       const responses = await Promise.all(promises);
  23 |       for (const res of responses) {
  24 |         if (res.status() === 429 && !firstBlockedResponse) {
  25 |           firstBlockedResponse = {
  26 |             status: res.status(),
  27 |             headers: res.headers(),
  28 |             body: await res.text()
  29 |           };
  30 |           timeToThrottling = Date.now() - startTime;
  31 |           break;
  32 |         }
  33 |       }
  34 |       if (firstBlockedResponse) break;
  35 |     }
  36 | 
  37 |     // Verify system returns protection response
> 38 |     expect(firstBlockedResponse).not.toBeNull();
     |                                      ^ Error: expect(received).not.toBeNull()
  39 |     expect(firstBlockedResponse.status).toBe(429);
  40 | 
  41 |     // Write detailed report
  42 |     const report = {
  43 |       test: "DDOS Simulation",
  44 |       endpoint: "/api/health",
  45 |       totalRequestsAttempted: totalRequests,
  46 |       timeToThrottlingMs: timeToThrottling,
  47 |       firstBlockedResponse
  48 |     };
  49 |     fs.writeFileSync('ddos-report.json', JSON.stringify(report, null, 2));
  50 | 
  51 |     // 2. Immediately try to load the frontend login page
  52 |     // Verify system remains operational (UI doesn't crash)
  53 |     await page.goto('/login');
  54 |     const emailInput = page.locator('input[type="email"]');
  55 |     
  56 |     // Verify that the UI rendered successfully despite the API being rate-limited
  57 |     await expect(emailInput).toBeVisible({ timeout: 15000 });
  58 |   });
  59 | });
  60 | 
```