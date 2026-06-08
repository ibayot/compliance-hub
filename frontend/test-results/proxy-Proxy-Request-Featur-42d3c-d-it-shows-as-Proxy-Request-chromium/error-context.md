# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: proxy.spec.ts >> Proxy Request Feature >> Staff can create a ticket on behalf of a user, and it shows as Proxy Request
- Location: frontend\tests\e2e\proxy.spec.ts:4:7

# Error details

```
TimeoutError: page.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e7]:
    - heading "RICTMS Compliance Hub" [level=1] [ref=e8]
    - paragraph [ref=e9]: Sign in to your account
  - generic [ref=e10]:
    - generic [ref=e11]:
      - generic [ref=e12]:
        - text: Email
        - generic [ref=e13]: "*"
      - generic [ref=e14]:
        - textbox "Email" [ref=e15]
        - group:
          - generic: Email *
    - generic [ref=e16]:
      - generic [ref=e17]:
        - text: Password
        - generic [ref=e18]: "*"
      - generic [ref=e19]:
        - textbox "Password" [ref=e20]
        - group:
          - generic: Password *
    - button "Sign In" [ref=e21] [cursor=pointer]: Sign In
    - separator [ref=e22]:
      - generic [ref=e23]: or
    - generic [ref=e26]:
      - button "Mag-sign in sa Google. Magbubukas sa bagong tab" [ref=e28] [cursor=pointer]:
        - generic [ref=e30]:
          - img [ref=e32]
          - generic [ref=e39]: Mag-sign in sa Google
      - iframe
  - generic [ref=e40]: RICTMS Internal Use Only
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Proxy Request Feature', () => {
  4  |   test('Staff can create a ticket on behalf of a user, and it shows as Proxy Request', async ({ page }) => {
  5  |     // 1. Login as Staff
  6  |     await page.goto('/login');
> 7  |     await page.fill('input[name="email"]', 'jmmmaguigad@gmail.com');
     |                ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  8  |     await page.fill('input[name="password"]', 'admin');
  9  |     await page.click('button[type="submit"]');
  10 |     await page.waitForURL('/dashboard');
  11 | 
  12 |     // 2. Go to Ticketing
  13 |     await page.click('text="Ticketing Module"');
  14 |     await page.waitForURL('/dashboard/tickets');
  15 | 
  16 |     // 3. Create Ticket for a user
  17 |     await page.click('button:has-text("New Ticket")');
  18 |     await page.waitForSelector('text="New Ticket Request"');
  19 |     await page.click('text="Desktop Support"');
  20 | 
  21 |     await page.fill('input[name="subject"]', 'E2E Proxy Request Test');
  22 |     await page.fill('textarea[name="description"]', 'This ticket is created by staff for an employee.');
  23 |     
  24 |     // Select a user in the Requested For dropdown
  25 |     await page.fill('input[placeholder="Search user..."]', 'emp');
  26 |     await page.waitForTimeout(1000);
  27 |     await page.click('li:has-text("employee")'); // Match the label without role name
  28 | 
  29 |     await page.click('button:has-text("Submit Request")');
  30 | 
  31 |     // Wait for creation
  32 |     await page.waitForSelector('text="Ticket submitted successfully"');
  33 |     await page.waitForTimeout(2000);
  34 | 
  35 |     // 4. Verify Proxy Request chip is visible on the created ticket
  36 |     // Since it's sorted by newest, it should be at the top
  37 |     const proxyChip = page.locator('text="Proxy Request"').first();
  38 |     await expect(proxyChip).toBeVisible();
  39 |   });
  40 | });
  41 | 
```