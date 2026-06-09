# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: proxy.spec.ts >> Proxy Request Feature >> Staff can create a ticket on behalf of a user, and it shows as Proxy Request
- Location: frontend\tests\e2e\proxy.spec.ts:21:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('text="Ticket submitted successfully"') to be visible

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
            - paragraph [ref=e13]: Tickets
      - button "account of current user" [ref=e15] [cursor=pointer]:
        - generic [ref=e16]: SA
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
      - listitem [ref=e37]:
        - button "Documents" [ref=e38] [cursor=pointer]:
          - img [ref=e40]
          - generic [ref=e43]: Documents
      - listitem [ref=e44]:
        - button "Repository" [ref=e45] [cursor=pointer]:
          - img [ref=e47]
          - generic [ref=e50]: Repository
      - listitem [ref=e51]:
        - button "Issuances" [ref=e52] [cursor=pointer]:
          - img [ref=e54]
          - generic [ref=e57]: Issuances
    - separator [ref=e58]
    - generic [ref=e59]: Administration
    - list [ref=e60]:
      - listitem [ref=e61]:
        - button "Units" [ref=e62] [cursor=pointer]:
          - img [ref=e64]
          - generic [ref=e67]: Units
      - listitem [ref=e68]:
        - button "Metrics" [ref=e69] [cursor=pointer]:
          - img [ref=e71]
          - generic [ref=e74]: Metrics
      - listitem [ref=e75]:
        - button "KPI" [ref=e76] [cursor=pointer]:
          - img [ref=e78]
          - generic [ref=e82]: KPI
      - listitem [ref=e83]:
        - button "Ticket Settings" [ref=e84] [cursor=pointer]:
          - img [ref=e86]
          - generic [ref=e89]: Ticket Settings
      - listitem [ref=e90]:
        - button "Ticket Reports" [ref=e91] [cursor=pointer]:
          - img [ref=e93]
          - generic [ref=e96]: Ticket Reports
      - listitem [ref=e97]:
        - button "Attendance" [ref=e98] [cursor=pointer]:
          - img [ref=e100]
          - generic [ref=e103]: Attendance
      - listitem [ref=e104]:
        - button "Reviews" [ref=e105] [cursor=pointer]:
          - img [ref=e107]
          - generic [ref=e110]: Reviews
      - listitem [ref=e111]:
        - button "Reports" [ref=e112] [cursor=pointer]:
          - img [ref=e114]
          - generic [ref=e117]: Reports
      - listitem [ref=e118]:
        - button "MoV Builder" [ref=e119] [cursor=pointer]:
          - img [ref=e121]
          - generic [ref=e124]: MoV Builder
    - separator [ref=e125]
    - list [ref=e126]:
      - listitem [ref=e127]:
        - button "User Manual" [ref=e128] [cursor=pointer]:
          - img [ref=e130]
          - generic [ref=e134]: User Manual
      - listitem [ref=e135]:
        - button "Settings" [ref=e136] [cursor=pointer]:
          - img [ref=e138]
          - generic [ref=e141]: Settings
    - generic [ref=e142]:
      - paragraph [ref=e143]: System Admin
      - text: SUPER ADMIN
  - main [ref=e144]:
    - generic [ref=e147]:
      - generic [ref=e148]:
        - generic [ref=e149]:
          - heading "Help Desk Tickets" [level=4] [ref=e150]
          - paragraph [ref=e151]: Submit and track assistance requests for Desktop & IT Support
        - button "New Ticket" [active] [ref=e152] [cursor=pointer]:
          - img [ref=e154]
          - text: New Ticket
      - generic [ref=e158]:
        - generic [ref=e159]:
          - generic: Status
          - generic [ref=e160]:
            - combobox "Status" [ref=e161] [cursor=pointer]
            - textbox
            - img
            - group:
              - generic: Status
        - generic [ref=e162]:
          - generic: Type
          - generic [ref=e163]:
            - combobox "Type" [ref=e164] [cursor=pointer]
            - textbox
            - img
            - group:
              - generic: Type
        - button "Reset" [ref=e165] [cursor=pointer]: Reset
        - button "Escalated To Me" [ref=e166] [cursor=pointer]: Escalated To Me
      - tablist [ref=e172]:
        - tab "All (1)" [selected] [ref=e173] [cursor=pointer]: All (1)
        - tab "Active (1)" [ref=e174] [cursor=pointer]: Active (1)
        - tab "Resolved / Closed (0)" [ref=e175] [cursor=pointer]: Resolved / Closed (0)
        - tab "Frozen (0)" [ref=e176] [cursor=pointer]: Frozen (0)
        - tab "Duplicate (0)" [ref=e177] [cursor=pointer]: Duplicate (0)
        - tab "Proxy Requests (1)" [ref=e178] [cursor=pointer]:
          - generic [ref=e179]: Proxy Requests (1)
      - table [ref=e183]:
        - rowgroup [ref=e184]:
          - 'row "Ticket # Subject Type Category Priority Status SLA Requester Assigned To Date Actions" [ref=e185]':
            - 'columnheader "Ticket #" [ref=e186]'
            - columnheader "Subject" [ref=e187]
            - columnheader "Type" [ref=e188]
            - columnheader "Category" [ref=e189]
            - columnheader "Priority" [ref=e190]
            - columnheader "Status" [ref=e191]
            - columnheader "SLA" [ref=e192]
            - columnheader "Requester" [ref=e193]
            - columnheader "Assigned To" [ref=e194]
            - columnheader "Date" [ref=e195]
            - columnheader "Actions" [ref=e196]
        - rowgroup [ref=e197]:
          - row "TKT-2026-0001 E2E Proxy Request Test Proxy Request Desktop Support — NOT SET assigned — Test User Jaymark Cardona 6/9/2026 View Details Reassign Ticket Escalate Ticket" [ref=e198]:
            - cell "TKT-2026-0001" [ref=e199]
            - cell "E2E Proxy Request Test" [ref=e200]
            - cell "Proxy Request Desktop Support" [ref=e201]:
              - generic [ref=e202]:
                - generic [ref=e204]: Proxy Request
                - generic [ref=e205]:
                  - img [ref=e206]
                  - generic [ref=e208]: Desktop Support
            - cell "—" [ref=e209]:
              - paragraph [ref=e210]: —
            - cell "NOT SET" [ref=e211]:
              - generic [ref=e213]: NOT SET
            - cell "assigned" [ref=e214]:
              - generic [ref=e217]: assigned
            - cell "—" [ref=e218]:
              - paragraph [ref=e220]: —
            - cell "Test User" [ref=e221]
            - cell "Jaymark Cardona" [ref=e222]:
              - generic [ref=e224]: Jaymark Cardona
            - cell "6/9/2026" [ref=e225]
            - cell "View Details Reassign Ticket Escalate Ticket" [ref=e226]:
              - generic [ref=e227]:
                - button "View Details" [ref=e228] [cursor=pointer]:
                  - img [ref=e229]
                - generic "Reassign Ticket" [ref=e231]:
                  - button [ref=e232] [cursor=pointer]:
                    - img [ref=e233]
                - button "Escalate Ticket" [ref=e235] [cursor=pointer]:
                  - img [ref=e236]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // All seed DB accounts use this password
  4  | const PASSWORD = 'password123';
  5  | 
  6  | /**
  7  |  * Login helper using MUI TextFields (rendered without name attributes).
  8  |  */
  9  | async function login(page: any, email: string, password = PASSWORD) {
  10 |   await page.goto('/login');
  11 |   await page.locator('input[type="email"]').fill(email);
  12 |   await page.locator('input[type="password"]').fill(password);
  13 |   await page.locator('button[type="submit"]').click();
  14 |   // Wait for the dashboard to load by watching for the page heading
  15 |   await page.waitForSelector('h4, h5, h6', { timeout: 25000 });
  16 |   // Also give auth context time to settle
  17 |   await page.waitForTimeout(1000);
  18 | }
  19 | 
  20 | test.describe('Proxy Request Feature', () => {
  21 |   test('Staff can create a ticket on behalf of a user, and it shows as Proxy Request', async ({ page }) => {
  22 |     // 1. Login as Admin (super_admin role, password123)
  23 |     await login(page, 'admin@rictms.gov.ph');
  24 | 
  25 |     // 2. Navigate directly to Tickets page
  26 |     await page.goto('/dashboard/tickets');
  27 |     await page.waitForSelector('text="Help Desk Tickets"', { timeout: 15000 });
  28 | 
  29 |     // 3. Open New Ticket dialog
  30 |     await page.locator('button:has-text("New Ticket")').click();
  31 |     const dialog = page.locator('[role="dialog"]');
  32 |     await dialog.waitFor({ timeout: 10000 });
  33 |     await page.waitForSelector('text="Submit a Help Desk Ticket"', { timeout: 10000 });
  34 | 
  35 |     // 4. Select Desktop Support — scope click INSIDE the dialog to avoid hitting chips in the table
  36 |     await dialog.locator('text="Desktop Support"').click({ force: true });
  37 | 
  38 |     // 5. Fill subject — look for the input with placeholder "Brief description of your issue"
  39 |     await dialog.locator('input[placeholder="Brief description of your issue"]').fill('E2E Proxy Request Test');
  40 | 
  41 |     // 6. Fill description
  42 |     await dialog.locator('textarea').first().fill('This ticket is created by staff for an employee.');
  43 | 
  44 |     // 7. Use the "Requested For (Optional)" Autocomplete
  45 |     const reqForInput = dialog.locator('label:has-text("Requested For")').locator('..').locator('input');
  46 |     await reqForInput.fill('test');
  47 |     await page.waitForTimeout(1500);
  48 |     const option = page.locator('.MuiAutocomplete-listbox li').first();
  49 |     await expect(option).toBeVisible({ timeout: 5000 });
  50 |     await option.click();
  51 | 
  52 |     // 8. Submit — button text is "Submit Ticket"
  53 |     await dialog.locator('button:has-text("Submit Ticket")').click({ force: true });
> 54 |     await page.waitForSelector('text="Ticket submitted successfully"', { timeout: 15000 });
     |                ^ TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
  55 |     await page.waitForTimeout(2000);
  56 | 
  57 |     // 9. Verify Proxy Request chip appears in the ticket list
  58 |     const proxyChip = page.locator('text="Proxy Request"').first();
  59 |     await expect(proxyChip).toBeVisible({ timeout: 8000 });
  60 |   });
  61 | 
  62 |   test('User can see tickets filed on their behalf in the Requested For tab', async ({ page }) => {
  63 |     // Login as the regular user who was used as proxy target in the previous test
  64 |     await login(page, 'test@dswd.gov.ph');
  65 | 
  66 |     await page.goto('/dashboard/tickets');
  67 |     await page.waitForSelector('text="Help Desk Tickets"', { timeout: 15000 });
  68 | 
  69 |     // The "Requested For" tab (4th tab in user view)
  70 |     const requestedForTab = page.locator('[role="tab"]:has-text("Requested For")');
  71 |     await expect(requestedForTab).toBeVisible({ timeout: 5000 });
  72 |     await requestedForTab.click();
  73 |     await page.waitForTimeout(1500);
  74 | 
  75 |     // Verify no JS error and that the tab works
  76 |     await expect(page.locator('body')).not.toContainText('Error');
  77 |     const hasTickets = await page.locator('tbody tr').count() > 0;
  78 |     const hasEmptyState = await page.locator('text="No tickets found in this category"').count() > 0;
  79 |     expect(hasTickets || hasEmptyState).toBe(true);
  80 |   });
  81 | });
  82 | 
```