# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 07-ddos-rate-limit.spec.ts >> Suite 7 - DDOS & Rate Limiting >> Authenticated Endpoint Spam Protection
- Location: frontend\tests\e2e\07-ddos-rate-limit.spec.ts:7:7

# Error details

```
Error: expect(received).not.toBeNull()

Received: null
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button "toggle sidebar" [ref=e6] [cursor=pointer]:
        - img [ref=e7]
      - navigation "breadcrumb" [ref=e10]:
        - list [ref=e11]:
          - listitem [ref=e12]:
            - paragraph [ref=e13]: Dashboard
      - button "account of current user" [ref=e15] [cursor=pointer]:
        - generic [ref=e16]: TU
  - generic [ref=e18]:
    - generic [ref=e20]: Compliance Hub
    - separator [ref=e21]
    - list [ref=e22]:
      - listitem [ref=e23]:
        - button "Dashboard" [ref=e24] [cursor=pointer]:
          - img [ref=e26]
          - generic [ref=e29]: Dashboard
      - listitem [ref=e30]:
        - button "Tickets" [ref=e31] [cursor=pointer]:
          - img [ref=e33]
          - generic [ref=e36]: Tickets
    - separator [ref=e37]
    - generic [ref=e38]: Administration
    - list [ref=e39]:
      - listitem [ref=e40]:
        - button "Ticket Reports" [ref=e41] [cursor=pointer]:
          - img [ref=e43]
          - generic [ref=e46]: Ticket Reports
    - separator [ref=e48]
    - list [ref=e49]:
      - listitem [ref=e50]:
        - button "User Manual" [ref=e51] [cursor=pointer]:
          - img [ref=e53]
          - generic [ref=e57]: User Manual
      - listitem [ref=e58]:
        - button "Settings" [ref=e59] [cursor=pointer]:
          - img [ref=e61]
          - generic [ref=e64]: Settings
    - generic [ref=e65]:
      - paragraph [ref=e66]: Test User
      - text: USER
  - main [ref=e67]:
    - generic [ref=e70]:
      - generic [ref=e71]:
        - heading "Dashboard" [level=1] [ref=e72]
        - paragraph [ref=e73]: Welcome back, Test!
      - generic [ref=e74]:
        - generic [ref=e77]:
          - img [ref=e78]
          - heading "0" [level=4] [ref=e80]
          - paragraph [ref=e81]: Open
        - generic [ref=e84]:
          - img [ref=e85]
          - heading "3" [level=4] [ref=e87]
          - paragraph [ref=e88]: In Progress
        - generic [ref=e91]:
          - img [ref=e92]
          - heading "0" [level=4] [ref=e94]
          - paragraph [ref=e95]: Resolved
        - generic [ref=e98]:
          - img [ref=e99]
          - heading "2" [level=4] [ref=e101]
          - paragraph [ref=e102]: Closed
      - generic [ref=e104]:
        - generic [ref=e105]:
          - img [ref=e106]
          - heading "Client Satisfaction" [level=6] [ref=e108]
        - generic [ref=e109]:
          - generic [ref=e110]:
            - paragraph [ref=e111]: Satisfaction forms filled
            - paragraph [ref=e112]: 100%
          - progressbar [ref=e113]
      - generic [ref=e116]:
        - heading "Quick Actions" [level=6] [ref=e117]
        - button "My Tickets" [ref=e119] [cursor=pointer]:
          - img [ref=e121]
          - text: My Tickets
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import fs from 'fs';
  3  | import { LoginPage } from './pages/LoginPage';
  4  | import accounts from './data/accounts.json';
  5  | 
  6  | test.describe('Suite 7 - DDOS & Rate Limiting', () => {
  7  |   test('Authenticated Endpoint Spam Protection', async ({ page }) => {
  8  |     test.setTimeout(120000); // 2 mins
  9  | 
  10 |     // 1. Login using the test fallback mechanism
  11 |     console.log('Logging in using test account...');
  12 |     const loginPage = new LoginPage(page);
  13 |     await loginPage.goto();
  14 |     await loginPage.login(accounts.user.email, accounts.user.password);
  15 |     await loginPage.verifyDashboardVisible();
  16 |     console.log('Login detected! Starting SPAM test on authenticated endpoint...');
  17 | 
  18 |     // 2. Execute 8000 requests against an authenticated endpoint from within the browser
  19 |     const totalRequests = 8000;
  20 |     const batchSize = 200;
  21 |     
  22 |     const result = await page.evaluate(async ({ total, batch }) => {
  23 |       let firstBlockedResponse = null;
  24 |       let timeToThrottling = 0;
  25 |       const startTime = Date.now();
  26 | 
  27 |       for (let i = 0; i < total; i += batch) {
  28 |         const promises = [];
  29 |         for (let j = 0; j < batch; j++) {
  30 |           // Hit an authenticated endpoint
  31 |           promises.push(fetch('/api/users/profile'));
  32 |         }
  33 | 
  34 |         const responses = await Promise.all(promises);
  35 |         for (const res of responses) {
  36 |           if (res.status === 429 && !firstBlockedResponse) {
  37 |             firstBlockedResponse = {
  38 |               status: res.status,
  39 |               body: await res.text()
  40 |             };
  41 |             timeToThrottling = Date.now() - startTime;
  42 |             break;
  43 |           }
  44 |         }
  45 |         if (firstBlockedResponse) break;
  46 |       }
  47 | 
  48 |       return { firstBlockedResponse, timeToThrottling };
  49 |     }, { total: totalRequests, batch: batchSize });
  50 | 
  51 |     // Verify system returns protection response
> 52 |     expect(result.firstBlockedResponse).not.toBeNull();
     |                                             ^ Error: expect(received).not.toBeNull()
  53 |     expect(result.firstBlockedResponse?.status).toBe(429);
  54 | 
  55 |     // Write detailed report
  56 |     const report = {
  57 |       test: "DDOS Simulation (Authenticated)",
  58 |       endpoint: "/api/users/profile",
  59 |       totalRequestsAttempted: totalRequests,
  60 |       timeToThrottlingMs: result.timeToThrottling,
  61 |       firstBlockedResponse: result.firstBlockedResponse
  62 |     };
  63 |     fs.writeFileSync('ddos-report.json', JSON.stringify(report, null, 2));
  64 |     
  65 |     console.log('SPAM test complete. Rate limit triggered successfully.');
  66 |   });
  67 | });
  68 | 
```