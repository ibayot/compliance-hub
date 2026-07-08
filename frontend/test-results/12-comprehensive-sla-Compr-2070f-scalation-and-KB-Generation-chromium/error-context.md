# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 12-comprehensive-sla.spec.ts >> Comprehensive E2E SLA & Recent Enhancements >> Scenario 4 & 5: Queue Pushback, Escalation, and KB Generation
- Location: frontend\tests\e2e\12-comprehensive-sla.spec.ts:309:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('table tbody tr').filter({ hasText: 'SLA Queue Test Ticket 1' }).first().getByRole('button', { name: 'View Details' })

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
        - generic [ref=e16]: JC
  - generic [ref=e18]:
    - generic [ref=e20]: Compliance Hub
    - separator [ref=e21]
    - list [ref=e22]:
      - listitem [ref=e23]:
        - button "Dashboard" [ref=e24] [cursor=pointer]:
          - img [ref=e26]
          - generic [ref=e29]: Dashboard
      - listitem [ref=e30]:
        - button "Tickets" [active] [ref=e31] [cursor=pointer]:
          - img [ref=e33]
          - generic [ref=e36]: Tickets
      - listitem [ref=e37]:
        - button "Knowledge Base" [ref=e38] [cursor=pointer]:
          - img [ref=e40]
          - generic [ref=e43]: Knowledge Base
    - separator [ref=e44]
    - generic [ref=e45]: Administration
    - list [ref=e46]:
      - listitem [ref=e47]:
        - button "Ticket Reports" [ref=e48] [cursor=pointer]:
          - img [ref=e50]
          - generic [ref=e53]: Ticket Reports
      - listitem [ref=e54]:
        - button "Attendance" [ref=e55] [cursor=pointer]:
          - img [ref=e57]
          - generic [ref=e60]: Attendance
    - separator [ref=e62]
    - list [ref=e63]:
      - listitem [ref=e64]:
        - button "User Manual" [ref=e65] [cursor=pointer]:
          - img [ref=e67]
          - generic [ref=e71]: User Manual
      - listitem [ref=e72]:
        - button "Settings" [ref=e73] [cursor=pointer]:
          - img [ref=e75]
          - generic [ref=e78]: Settings
    - generic [ref=e79]:
      - paragraph [ref=e80]: Jaymark Cardona
      - text: DESKTOP JR
  - main [ref=e81]:
    - generic [ref=e84]:
      - generic [ref=e85]:
        - generic [ref=e86]:
          - heading "Help Desk Tickets" [level=4] [ref=e87]
          - paragraph [ref=e88]: Submit and track assistance requests for Desktop & IT Support
        - button "New Ticket" [ref=e90] [cursor=pointer]:
          - img [ref=e92]
          - text: New Ticket
      - paragraph [ref=e96]: Showing your assigned tickets. Use the Escalate button to forward a ticket to a focal technician.
      - tablist [ref=e102]:
        - tab "Active (3)" [selected] [ref=e103] [cursor=pointer]: Active (3)
        - tab "Resolved / Closed (3)" [ref=e104] [cursor=pointer]: Resolved / Closed (3)
        - tab "Frozen (0)" [ref=e105] [cursor=pointer]: Frozen (0)
        - tab "Duplicate (0)" [ref=e106] [cursor=pointer]: Duplicate (0)
      - table [ref=e109]:
        - rowgroup [ref=e110]:
          - 'row "Ticket # Subject Type Category Priority Status SLA Date Actions" [ref=e111]':
            - 'columnheader "Ticket #" [ref=e112]'
            - columnheader "Subject" [ref=e113]
            - columnheader "Type" [ref=e114]
            - columnheader "Category" [ref=e115]
            - columnheader "Priority" [ref=e116]
            - columnheader "Status" [ref=e117]
            - columnheader "SLA" [ref=e118]
            - columnheader "Date" [ref=e119]
            - columnheader "Actions" [ref=e120]
        - rowgroup [ref=e121]:
          - row "TKT-2026-0012 E2E Proxy 1783401618537 Proxy Request IT Support AD Account NOT SET ASSIGNED — 7/7/2026 View Details Escalate Ticket" [ref=e122]:
            - cell "TKT-2026-0012" [ref=e123]
            - cell "E2E Proxy 1783401618537" [ref=e124]
            - cell "Proxy Request IT Support" [ref=e125]:
              - generic [ref=e126]:
                - generic [ref=e128]: Proxy Request
                - generic [ref=e129]:
                  - img [ref=e130]
                  - generic [ref=e132]: IT Support
            - cell "AD Account" [ref=e133]:
              - paragraph [ref=e134]: AD Account
            - cell "NOT SET" [ref=e135]:
              - generic [ref=e137]: NOT SET
            - cell "ASSIGNED" [ref=e138]:
              - generic [ref=e141]: ASSIGNED
            - cell "—" [ref=e142]:
              - paragraph [ref=e144]: —
            - cell "7/7/2026" [ref=e145]
            - cell "View Details Escalate Ticket" [ref=e146]:
              - generic [ref=e147]:
                - button "View Details" [ref=e148] [cursor=pointer]:
                  - img [ref=e149]
                - button "Escalate Ticket" [ref=e151] [cursor=pointer]:
                  - img [ref=e152]
          - row "TKT-2026-0011 E2E Desktop 2 1783401585403 Desktop Support Desktop Support NOT SET ASSIGNED On Track 7/7/2026 View Details Escalate Ticket" [ref=e154]:
            - cell "TKT-2026-0011" [ref=e155]
            - cell "E2E Desktop 2 1783401585403" [ref=e156]
            - cell "Desktop Support" [ref=e157]:
              - generic [ref=e159]:
                - img [ref=e160]
                - generic [ref=e162]: Desktop Support
            - cell "Desktop Support" [ref=e163]:
              - paragraph [ref=e164]: Desktop Support
            - cell "NOT SET" [ref=e165]:
              - generic [ref=e167]: NOT SET
            - cell "ASSIGNED" [ref=e168]:
              - generic [ref=e171]: ASSIGNED
            - cell "On Track" [ref=e172]:
              - generic [ref=e175]: On Track
            - cell "7/7/2026" [ref=e176]
            - cell "View Details Escalate Ticket" [ref=e177]:
              - generic [ref=e178]:
                - button "View Details" [ref=e179] [cursor=pointer]:
                  - img [ref=e180]
                - button "Escalate Ticket" [ref=e182] [cursor=pointer]:
                  - img [ref=e183]
          - row "TKT-2026-0006 E2E Proxy 1783324538436 Proxy Request IT Support AD Account NOT SET OPEN Overdue 7/6/2026 View Details Escalate Ticket" [ref=e185]:
            - cell "TKT-2026-0006" [ref=e186]
            - cell "E2E Proxy 1783324538436" [ref=e187]
            - cell "Proxy Request IT Support" [ref=e188]:
              - generic [ref=e189]:
                - generic [ref=e191]: Proxy Request
                - generic [ref=e192]:
                  - img [ref=e193]
                  - generic [ref=e195]: IT Support
            - cell "AD Account" [ref=e196]:
              - paragraph [ref=e197]: AD Account
            - cell "NOT SET" [ref=e198]:
              - generic [ref=e200]: NOT SET
            - cell "OPEN" [ref=e201]:
              - generic [ref=e204]: OPEN
            - cell "Overdue" [ref=e205]:
              - generic [ref=e208]: Overdue
            - cell "7/6/2026" [ref=e209]
            - cell "View Details Escalate Ticket" [ref=e210]:
              - generic [ref=e211]:
                - button "View Details" [ref=e212] [cursor=pointer]:
                  - img [ref=e213]
                - button "Escalate Ticket" [ref=e215] [cursor=pointer]:
                  - img [ref=e216]
```

# Test source

```ts
  257 |       const urlParts = page.url().split('/');
  258 |       ticket1Id = urlParts[urlParts.length - 1];
  259 | 
  260 |       await page.getByRole('button', { name: 'Update Status' }).click();
  261 |       await page.getByLabel('Status').click();
  262 |       await page.getByRole('option', { name: 'In Progress' }).click();
  263 | 
  264 |       await page.getByLabel(/Priority/i).click();
  265 |       await page.getByRole('option', { name: /Medium/i }).click();
  266 | 
  267 |       await page.getByRole('button', { name: 'Save' }).click();
  268 |       await expect(page.getByRole('alert').first()).toBeVisible();
  269 |       await dashboardPage.logout();
  270 |     });
  271 | 
  272 |     await test.step('Submit Ticket 2 (Should Queue)', async () => {
  273 |       await loginPage.goto();
  274 |       await loginPage.login(accounts.user.email, accounts.user.password);
  275 |       await dashboardPage.closeSatisfactionReminder();
  276 |       await dashboardPage.navigateTo('Tickets');
  277 |       await page.getByRole('button', { name: 'New Ticket' }).click();
  278 |       await expect(page.getByRole('dialog').first()).toBeVisible();
  279 |       const proceedBtn2 = page.getByRole('button', { name: 'Proceed Anyway' });
  280 |       if (await proceedBtn2.isVisible()) {
  281 |         await proceedBtn2.click();
  282 |       }
  283 |       await expect(page.getByRole('dialog', { name: /Submit a Help Desk Ticket/i })).toBeVisible();
  284 |       await page.getByLabel('Category').click();
  285 |       await page.getByRole('option').nth(1).click();
  286 |       await page.getByLabel(/Subject/i).fill('SLA Queue Test Ticket 2');
  287 |       await page.getByLabel(/Description/i).fill('This ticket should be queued');
  288 |       await page.getByRole('button', { name: 'Submit' }).click();
  289 |       await expect(page.getByRole('alert').first()).toBeVisible();
  290 |       await dashboardPage.logout();
  291 |     });
  292 | 
  293 |     await test.step('Admin verifies SLA is on Hold/Waiting', async () => {
  294 |       await loginPage.goto();
  295 |       await loginPage.login(accounts.admin.email, accounts.admin.password);
  296 |       await dashboardPage.navigateTo('Tickets');
  297 | 
  298 |       const newRow = page.locator('table tbody tr').first();
  299 |       await expect(newRow.locator('text=—')).toBeVisible();
  300 |       await newRow.getByRole('button', { name: 'View Details' }).click();
  301 | 
  302 |       const urlParts = page.url().split('/');
  303 |       roundRobinTicketId = urlParts[urlParts.length - 1];
  304 | 
  305 |       await dashboardPage.logout();
  306 |     });
  307 |   });
  308 | 
  309 |   test('Scenario 4 & 5: Queue Pushback, Escalation, and KB Generation', async ({ page }) => {
  310 |     const loginPage = new LoginPage(page);
  311 |     const dashboardPage = new DashboardPage(page);
  312 | 
  313 |     await test.step('TargetTech puts active ticket On Hold (Unstacking)', async () => {
  314 |       await loginPage.goto();
  315 |       await loginPage.login(assignedTechEmail, accounts.desktopJr.password);
  316 | 
  317 |       // Open the "In Progress" ticket via UI
  318 |       await dashboardPage.navigateTo('Tickets');
  319 |       await page.locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' }).first().getByRole('button', { name: 'View Details' }).click();
  320 | 
  321 |       await page.getByRole('button', { name: 'Update Status' }).click();
  322 |       await page.getByLabel('Status').click();
  323 |       await page.getByRole('option', { name: 'Pause' }).click();
  324 |       await page.getByRole('button', { name: 'Save' }).click();
  325 |       await expect(page.getByRole('alert').first()).toBeVisible();
  326 |     });
  327 | 
  328 | 
  329 | 
  330 |     await test.step('TargetTech puts ticket back In Progress (Preemptive Pushback)', async () => {
  331 |       await page.getByRole('button', { name: 'Update Status' }).click();
  332 |       await page.getByLabel('Status').click();
  333 |       await page.getByRole('option', { name: 'In Progress' }).click();
  334 | 
  335 |       await page.getByLabel(/Priority/i).click();
  336 |       await page.getByRole('option', { name: /Medium/i }).click();
  337 | 
  338 |       await page.getByRole('button', { name: 'Save' }).click();
  339 |       await expect(page.getByRole('alert').first()).toBeVisible();
  340 |     });
  341 | 
  342 |     await test.step('TargetTech escalates ticket', async () => {
  343 |       await page.getByRole('button', { name: 'Escalate Ticket' }).click();
  344 |       await page.getByLabel('Escalate To').click();
  345 |       await page.getByRole('option', { name: 'Marc Jayson D Ibay' }).click();
  346 |       await page.getByLabel('Reason for escalation (optional)').fill('Need focal assistance');
  347 |       await page.getByRole('button', { name: 'Escalate', exact: true }).click();
  348 |       await expect(page.getByRole('alert').first()).toBeVisible();
  349 |       await dashboardPage.logout();
  350 |     });
  351 | 
  352 |     await test.step('Escalation Guard blocks unauthorized technicians', async () => {
  353 |       await loginPage.goto();
  354 |       const unauthorizedEmail = assignedTechEmail === accounts.desktopJr.email ? accounts.itSupportJr.email : accounts.desktopJr.email;
  355 |       await loginPage.login(unauthorizedEmail, accounts.desktopJr.password);
  356 |       await dashboardPage.navigateTo('Tickets');
> 357 |       await page.locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' }).first().getByRole('button', { name: 'View Details' }).click();
      |                                                                                                                                          ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  358 | 
  359 |       // Try to update status when not assigned/escalated to them
  360 |       await page.getByRole('button', { name: 'Update Status' }).click();
  361 |       await page.getByLabel('Status').click();
  362 |       await page.getByRole('option', { name: 'Resolved' }).click();
  363 |       await page.getByRole('button', { name: 'Save' }).click();
  364 | 
  365 |       // The backend should return Forbidden
  366 |       await expect(page.locator('text=Forbidden').or(page.getByRole('alert')).first()).toBeVisible();
  367 |       await dashboardPage.logout();
  368 |     });
  369 | 
  370 |     await test.step('Target Focal accepts and resolves with KB Generation', async () => {
  371 |       await loginPage.goto();
  372 |       await loginPage.login(accounts.complianceOfficer.email, accounts.complianceOfficer.password);
  373 |       await dashboardPage.navigateTo('Tickets');
  374 | 
  375 |       await page.getByRole('button', { name: /Escalated To Me/i }).click();
  376 |       await page.waitForTimeout(1000); // Give the table a moment to filter
  377 | 
  378 |       await page.locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' }).first().getByRole('button', { name: 'View Details' }).click();
  379 | 
  380 |       const acceptBtn = page.getByRole('button', { name: 'Accept', exact: true });
  381 |       await acceptBtn.click();
  382 |       await expect(page.getByRole('alert').first()).toBeVisible();
  383 | 
  384 |       await page.getByRole('button', { name: 'Update Status' }).click();
  385 |       await page.getByLabel('Status').click();
  386 |       await page.getByRole('option', { name: 'Resolved' }).click();
  387 | 
  388 |       // Check KB Generation
  389 |       await page.getByLabel(/Resolution Notes/i).fill('Reconfigured network adapter settings and reset IP stack.');
  390 |       await page.getByRole('checkbox', { name: /Generate Knowledge Base/i }).check();
  391 |       await page.getByRole('button', { name: 'Save' }).click();
  392 |       await expect(page.getByRole('alert').first()).toBeVisible();
  393 |     });
  394 | 
  395 |     await test.step('Verify KB generation success', async () => {
  396 |       // using live Gemini API
  397 | 
  398 |       await dashboardPage.navigateTo('Knowledge Base');
  399 |       await page.getByLabel(/Search Knowledge Base/i).fill('network adapter');
  400 |       await page.waitForTimeout(2000); // Wait for debounce and search results
  401 | 
  402 |       const articleAccordion = page.locator('.MuiAccordion-root').filter({ hasText: /network adapter/i }).first();
  403 |       await expect(articleAccordion).toBeVisible({ timeout: 15000 }); // Wait up to 15s for LLM processing
  404 |       await articleAccordion.click(); // Expand the accordion
  405 | 
  406 |       await expect(page.locator('text=Reconfigured network adapter settings')).toBeVisible();
  407 |       await dashboardPage.logout();
  408 |     });
  409 |   });
  410 | 
  411 |   test('Scenario 6 & 7: CSAT & UI Guards', async ({ page }) => {
  412 |     const loginPage = new LoginPage(page);
  413 |     const dashboardPage = new DashboardPage(page);
  414 |     await test.step('User submits CSAT for resolved ticket', async () => {
  415 |       await loginPage.goto();
  416 |       await loginPage.login(accounts.user.email, accounts.user.password);
  417 | 
  418 |       await dashboardPage.navigateTo('Tickets');
  419 |       await page.getByRole('tab', { name: 'Resolved' }).click();
  420 | 
  421 |       // Click the first ticket in the Resolved tab (which is ticket1)
  422 |       await page.locator('table tbody tr').first().getByRole('button', { name: 'View Details' }).click();
  423 | 
  424 |       await expect(page.getByRole('button', { name: 'Rate Resolution' })).toBeVisible({ timeout: 10000 });
  425 |       await page.getByRole('button', { name: 'Rate Resolution' }).click();
  426 | 
  427 |       // Check consent
  428 |       await page.getByRole('checkbox').first().check();
  429 | 
  430 |       // Fill unit, name, sex
  431 |       await page.getByLabel('Unit/Section *').fill('TEST UNIT');
  432 |       await page.getByLabel('First Name *').fill('TESTER');
  433 |       await page.getByLabel('Last Name *').fill('USER');
  434 |       await page.getByLabel('Sex *').click();
  435 |       await page.getByRole('option', { name: 'Male' }).click();
  436 | 
  437 |       // Likert 0, 1, 2, 4, 6, 7
  438 |       // 5-Strongly Agree is represented by SentimentVerySatisfiedIcon
  439 |       const verySatisfiedBtns = page.getByRole('button').filter({ has: page.locator('svg[data-testid="SentimentVerySatisfiedIcon"]') });
  440 |       const count = await verySatisfiedBtns.count();
  441 |       for (let i = 0; i < count; i++) {
  442 |         await verySatisfiedBtns.nth(i).click();
  443 |       }
  444 | 
  445 |       await page.getByRole('button', { name: 'Submit Feedback' }).click();
  446 |       await expect(page.getByRole('alert')).toContainText('Thank you for your feedback', { ignoreCase: true, timeout: 5000 }).catch(() => { });
  447 |       await dashboardPage.logout();
  448 |     });
  449 | 
  450 |     await test.step('Non-Admin Cannot select OPEN status', async () => {
  451 |       await loginPage.goto();
  452 |       await loginPage.login(assignedTechEmail, accounts.desktopJr.password);
  453 |       await dashboardPage.navigateTo('Tickets');
  454 |       await page.locator('table tbody tr').first().getByRole('button', { name: 'View Details' }).click();
  455 | 
  456 |       await page.getByRole('button', { name: 'Update Status' }).click();
  457 |       await page.getByLabel('Status').click();
```