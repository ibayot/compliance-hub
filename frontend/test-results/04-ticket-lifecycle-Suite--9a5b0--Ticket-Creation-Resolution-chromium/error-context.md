# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-ticket-lifecycle.spec.ts >> Suite 4 — TICKET LIFE CYCLE >> Round 1: Ticket Creation & Resolution
- Location: frontend\tests\e2e\04-ticket-lifecycle.spec.ts:28:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('button[aria-label="account of current user"]') to be visible

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
        - textbox "Email" [ref=e15]: gmjavierjr@dswd.gov.ph
        - group:
          - generic: Email *
    - generic [ref=e16]:
      - generic [ref=e17]:
        - text: Password
        - generic [ref=e18]: "*"
      - generic [ref=e19]:
        - textbox "Password" [ref=e20]: password123
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
  1  | import { Page, expect } from '@playwright/test';
  2  | 
  3  | export class DashboardPage {
  4  |   readonly page: Page;
  5  | 
  6  |   constructor(page: Page) {
  7  |     this.page = page;
  8  |   }
  9  | 
  10 |   async logout() {
  11 |     const avatar = this.page.locator('button[aria-label="account of current user"]');
> 12 |     await avatar.waitFor({ state: 'visible', timeout: 5000 });
     |                  ^ TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
  13 |     await avatar.click();
  14 |     await this.page.waitForTimeout(300);
  15 |     await this.page.getByText('Logout').click();
  16 |     
  17 |     // Verify logged out
  18 |     await expect(this.page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
  19 |   }
  20 | 
  21 |   async closeSatisfactionReminder() {
  22 |     try {
  23 |       const dialog = this.page.locator('.MuiDialog-root');
  24 |       // Wait for dialog to appear, max 3 seconds
  25 |       await dialog.first().waitFor({ state: 'visible', timeout: 3000 });
  26 |       await this.page.keyboard.press('Escape');
  27 |       await this.page.waitForTimeout(500);
  28 |       
  29 |       // If still visible, try clicking Close button
  30 |       try {
  31 |         await dialog.first().waitFor({ state: 'visible', timeout: 1000 });
  32 |         const closeBtn = this.page.getByRole('button', { name: 'Close' });
  33 |         if (await closeBtn.isVisible()) {
  34 |           await closeBtn.click();
  35 |         }
  36 |       } catch {
  37 |         // Dialog already closed
  38 |       }
  39 |       
  40 |       await expect(dialog.first()).toBeHidden({ timeout: 5000 }).catch(() => {});
  41 |     } catch {
  42 |       // Ignore errors (dialog never appeared)
  43 |     }
  44 |   }
  45 | 
  46 |   async navigateTo(menuName: string) {
  47 |     // MUI Sidebar uses ListItemButton without nav tags
  48 |     const link = this.page.locator('.MuiListItemButton-root', { hasText: new RegExp('^' + menuName + '$', 'i') }).first();
  49 |     await link.waitFor({ state: 'visible' });
  50 |     await link.click();
  51 |     await this.page.waitForLoadState('networkidle');
  52 |   }
  53 | }
  54 | 
```