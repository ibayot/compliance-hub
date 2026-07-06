# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 12-comprehensive-sla.spec.ts >> Comprehensive E2E SLA & Recent Enhancements >> Scenario 4 & 5: Queue Pushback, Escalation, and KB Generation
- Location: tests\e2e\12-comprehensive-sla.spec.ts:301:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('option', { name: 'Resolved' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - button [ref=e6] [cursor=pointer]:
          - img [ref=e7]
        - navigation [ref=e10]:
          - list [ref=e11]:
            - listitem [ref=e12]:
              - paragraph [ref=e13]: Tickets
        - button [ref=e15] [cursor=pointer]:
          - generic [ref=e16]: JC
    - generic [ref=e18]:
      - generic [ref=e20]: Compliance Hub
      - separator [ref=e21]
      - list [ref=e22]:
        - listitem [ref=e23]:
          - button [ref=e24] [cursor=pointer]:
            - img [ref=e26]
            - generic [ref=e29]: Dashboard
        - listitem [ref=e30]:
          - button [ref=e31] [cursor=pointer]:
            - img [ref=e33]
            - generic [ref=e36]: Tickets
        - listitem [ref=e37]:
          - button [ref=e38] [cursor=pointer]:
            - img [ref=e40]
            - generic [ref=e43]: Knowledge Base
      - separator [ref=e44]
      - generic [ref=e45]: Administration
      - list [ref=e46]:
        - listitem [ref=e47]:
          - button [ref=e48] [cursor=pointer]:
            - img [ref=e50]
            - generic [ref=e53]: Ticket Reports
        - listitem [ref=e54]:
          - button [ref=e55] [cursor=pointer]:
            - img [ref=e57]
            - generic [ref=e60]: Attendance
      - separator [ref=e62]
      - list [ref=e63]:
        - listitem [ref=e64]:
          - button [ref=e65] [cursor=pointer]:
            - img [ref=e67]
            - generic [ref=e71]: User Manual
        - listitem [ref=e72]:
          - button [ref=e73] [cursor=pointer]:
            - img [ref=e75]
            - generic [ref=e78]: Settings
      - generic [ref=e79]:
        - paragraph [ref=e80]: Jaymark Cardona
        - text: DESKTOP JR
    - main [ref=e81]:
      - generic [ref=e84]:
        - button [ref=e85] [cursor=pointer]:
          - img [ref=e87]
          - text: Back to Tickets
        - generic [ref=e90]:
          - generic [ref=e91]:
            - generic [ref=e92]:
              - text: TKT-2026-0001
              - heading [level=5] [ref=e93]: SLA Queue Test Ticket 1
              - generic [ref=e94]:
                - generic [ref=e96]:
                  - combobox [ref=e97] [cursor=pointer]: IT Support
                  - textbox: it_support
                  - img
                  - group
                - generic [ref=e99]: "Priority: Not Set"
                - generic [ref=e101]: ASSIGNED
            - button [ref=e103] [cursor=pointer]: Escalate Ticket
          - generic [ref=e104]:
            - heading [level=6] [ref=e105]: Update Ticket
            - generic [ref=e106]:
              - generic [ref=e108]:
                - generic [ref=e109]: Status
                - generic [ref=e110]:
                  - combobox [expanded] [ref=e111] [cursor=pointer]
                  - textbox: assigned
                  - img
                  - group:
                    - generic: Status
              - generic [ref=e113]:
                - generic: Priority
                - generic [ref=e114]:
                  - combobox [ref=e115] [cursor=pointer]
                  - textbox
                  - img
                  - group:
                    - generic: Priority
              - generic [ref=e117]:
                - generic: Resolution Notes (optional)
                - generic [ref=e118]:
                  - textbox [ref=e119]
                  - group:
                    - generic: Resolution Notes (optional)
              - generic [ref=e121]:
                - button [ref=e122] [cursor=pointer]: Save
                - button [ref=e123] [cursor=pointer]: Cancel
        - generic [ref=e124]:
          - generic [ref=e127]:
            - heading [level=6] [ref=e128]: Description
            - paragraph [ref=e129]: First ticket to block the queue
          - generic [ref=e132]:
            - heading [level=6] [ref=e133]: Details
            - generic [ref=e134]:
              - generic [ref=e135]:
                - text: Ticket Number
                - paragraph [ref=e136]: TKT-2026-0001
              - generic [ref=e137]:
                - text: Requested By
                - paragraph [ref=e138]: undefined undefined
              - generic [ref=e139]:
                - text: Assigned To
                - paragraph [ref=e140]: undefined undefined
              - generic [ref=e141]:
                - text: Created
                - paragraph [ref=e142]: 7/1/2026, 5:33:41 PM
        - generic [ref=e144]:
          - heading [level=6] [ref=e145]: Escalation Details
          - paragraph [ref=e146]: No escalations for this ticket.
        - generic [ref=e148]:
          - heading [level=6] [ref=e149]: Comments (0)
          - paragraph [ref=e150]: No comments yet.
          - generic [ref=e151]:
            - separator [ref=e152]
            - generic [ref=e153]:
              - generic: Add a comment
              - generic [ref=e154]:
                - textbox [ref=e155]
                - group:
                  - generic: Add a comment
            - generic [ref=e156] [cursor=pointer]:
              - checkbox [ref=e159]
              - generic [ref=e162]: Internal note (hidden from requester)
            - generic [ref=e163]:
              - button [disabled]: Add Comment
              - button [ref=e164] [cursor=pointer]: Attach Picture
        - generic [ref=e166]:
          - heading [level=6] [ref=e167]: Timeline
          - generic [ref=e168]:
            - generic [ref=e173]:
              - paragraph [ref=e174]: Auto-Assigned
              - text: by Automatic Ticket Assignment
              - generic [ref=e175]: → Cardona
              - generic [ref=e176]: 7/1/2026, 5:33:41 PM
            - generic [ref=e180]:
              - paragraph [ref=e181]: Ticket Created
              - text: by TestFirst TestLast
              - generic [ref=e182]: 7/1/2026, 5:33:41 PM
  - listbox "Status" [ref=e185]:
    - option "In Progress" [active] [ref=e186] [cursor=pointer]: In Progress
    - option "Duplicate" [ref=e187] [cursor=pointer]: Duplicate
```

# Test source

```ts
  254 |       await page.getByRole('option', { name: 'In Progress' }).click();
  255 |       
  256 |       await page.getByLabel(/Priority/i).click();
  257 |       await page.getByRole('option', { name: /Medium/i }).click();
  258 | 
  259 |       await page.getByRole('button', { name: 'Save' }).click();
  260 |       await expect(page.getByRole('alert').first()).toBeVisible();
  261 |       await dashboardPage.logout();
  262 |     });
  263 | 
  264 |     await test.step('Submit Ticket 2 (Should Queue)', async () => {
  265 |       await loginPage.goto();
  266 |       await loginPage.login(accounts.user.email, accounts.user.password);
  267 |       await dashboardPage.closeSatisfactionReminder();
  268 |       await dashboardPage.navigateTo('Tickets');
  269 |       await page.getByRole('button', { name: 'New Ticket' }).click();
  270 |       await expect(page.getByRole('dialog').first()).toBeVisible();
  271 |       const proceedBtn2 = page.getByRole('button', { name: 'Proceed Anyway' });
  272 |       if (await proceedBtn2.isVisible()) {
  273 |         await proceedBtn2.click();
  274 |       }
  275 |       await expect(page.getByRole('dialog', { name: /Submit a Help Desk Ticket/i })).toBeVisible();
  276 |       await page.getByLabel('Category').click();
  277 |       await page.getByRole('option').nth(1).click();
  278 |       await page.getByLabel(/Subject/i).fill('SLA Queue Test Ticket 2');
  279 |       await page.getByLabel(/Description/i).fill('This ticket should be queued');
  280 |       await page.getByRole('button', { name: 'Submit' }).click();
  281 |       await expect(page.getByRole('alert').first()).toBeVisible();
  282 |       await dashboardPage.logout();
  283 |     });
  284 | 
  285 |     await test.step('Admin verifies SLA is on Hold/Waiting', async () => {
  286 |       await loginPage.goto();
  287 |       await loginPage.login(accounts.admin.email, accounts.admin.password);
  288 |       await dashboardPage.navigateTo('Tickets');
  289 |       
  290 |       const newRow = page.locator('table tbody tr').first();
  291 |       await expect(newRow.locator('text=—')).toBeVisible();
  292 |       await newRow.getByRole('button', { name: 'View Details' }).click();
  293 |       
  294 |       const urlParts = page.url().split('/');
  295 |       roundRobinTicketId = urlParts[urlParts.length - 1];
  296 |       
  297 |       await dashboardPage.logout();
  298 |     });
  299 |   });
  300 | 
  301 |   test('Scenario 4 & 5: Queue Pushback, Escalation, and KB Generation', async ({ page }) => {
  302 |     const loginPage = new LoginPage(page);
  303 |     const dashboardPage = new DashboardPage(page);
  304 | 
  305 |     await test.step('TargetTech puts active ticket On Hold (Unstacking)', async () => {
  306 |       await loginPage.goto();
  307 |       await loginPage.login(assignedTechEmail, accounts.desktopJr.password);
  308 |       
  309 |       // Open the "In Progress" ticket via UI
  310 |       await dashboardPage.navigateTo('Tickets');
  311 |       await page.locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' }).first().getByRole('button', { name: 'View Details' }).click();
  312 |       
  313 |       await page.getByRole('button', { name: 'Update Status' }).click();
  314 |       await page.getByLabel('Status').click();
  315 |       await page.getByRole('option', { name: 'Pause' }).click();
  316 |       await page.getByRole('button', { name: 'Save' }).click();
  317 |       await expect(page.getByRole('alert').first()).toBeVisible();
  318 |     });
  319 | 
  320 | 
  321 | 
  322 |     await test.step('TargetTech puts ticket back In Progress (Preemptive Pushback)', async () => {
  323 |       await page.getByRole('button', { name: 'Update Status' }).click();
  324 |       await page.getByLabel('Status').click();
  325 |       await page.getByRole('option', { name: 'In Progress' }).click();
  326 |       
  327 |       await page.getByLabel(/Priority/i).click();
  328 |       await page.getByRole('option', { name: /Medium/i }).click();
  329 |       
  330 |       await page.getByRole('button', { name: 'Save' }).click();
  331 |       await expect(page.getByRole('alert').first()).toBeVisible();
  332 |     });
  333 | 
  334 |     await test.step('TargetTech escalates ticket', async () => {
  335 |       await page.getByRole('button', { name: 'Escalate Ticket' }).click();
  336 |       await page.getByLabel('Escalate To').click();
  337 |       await page.getByRole('option', { name: 'Marc Jayson D Ibay' }).click(); 
  338 |       await page.getByLabel('Reason for escalation (optional)').fill('Need focal assistance');
  339 |       await page.getByRole('button', { name: 'Escalate', exact: true }).click();
  340 |       await expect(page.getByRole('alert').first()).toBeVisible();
  341 |       await dashboardPage.logout();
  342 |     });
  343 | 
  344 |     await test.step('Escalation Guard blocks unauthorized technicians', async () => {
  345 |       await loginPage.goto();
  346 |       const unauthorizedEmail = assignedTechEmail === accounts.desktopJr.email ? accounts.itSupportJr.email : accounts.desktopJr.email;
  347 |       await loginPage.login(unauthorizedEmail, accounts.desktopJr.password);
  348 |       await dashboardPage.navigateTo('Tickets');
  349 |       await page.locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' }).first().getByRole('button', { name: 'View Details' }).click();
  350 |       
  351 |       // Try to update status when not assigned/escalated to them
  352 |       await page.getByRole('button', { name: 'Update Status' }).click();
  353 |       await page.getByLabel('Status').click();
> 354 |       await page.getByRole('option', { name: 'Resolved' }).click();
      |                                                            ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  355 |       await page.getByRole('button', { name: 'Save' }).click();
  356 |       
  357 |       // The backend should return Forbidden
  358 |       await expect(page.locator('text=Forbidden').or(page.getByRole('alert')).first()).toBeVisible();
  359 |       await dashboardPage.logout();
  360 |     });
  361 | 
  362 |     await test.step('Target Focal accepts and resolves with KB Generation', async () => {
  363 |       await loginPage.goto();
  364 |       await loginPage.login(accounts.complianceOfficer.email, accounts.complianceOfficer.password);
  365 |       await dashboardPage.navigateTo('Tickets');
  366 |       
  367 |       await page.getByRole('button', { name: /Escalated To Me/i }).click();
  368 |       await page.waitForTimeout(1000); // Give the table a moment to filter
  369 | 
  370 |       await page.locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' }).first().getByRole('button', { name: 'View Details' }).click();
  371 |       
  372 |       const acceptBtn = page.getByRole('button', { name: 'Accept', exact: true });
  373 |       await acceptBtn.click();
  374 |       await expect(page.getByRole('alert').first()).toBeVisible();
  375 |       
  376 |       await page.getByRole('button', { name: 'Update Status' }).click();
  377 |       await page.getByLabel('Status').click();
  378 |       await page.getByRole('option', { name: 'Resolved' }).click();
  379 |       
  380 |       // Check KB Generation
  381 |       await page.getByLabel(/Resolution Notes/i).fill('Reconfigured network adapter settings and reset IP stack.');
  382 |       await page.getByRole('checkbox', { name: /Generate Knowledge Base/i }).check();
  383 |       await page.getByRole('button', { name: 'Save' }).click();
  384 |       await expect(page.getByRole('alert').first()).toBeVisible();
  385 |     });
  386 | 
  387 |     await test.step('Verify KB generation success', async () => {
  388 |       // using live Gemini API
  389 | 
  390 |       await dashboardPage.navigateTo('Knowledge Base');
  391 |       await page.getByLabel(/Search Knowledge Base/i).fill('network adapter');
  392 |       await page.waitForTimeout(2000); // Wait for debounce and search results
  393 |       
  394 |       const articleAccordion = page.locator('.MuiAccordion-root').filter({ hasText: /network adapter/i }).first();
  395 |       await expect(articleAccordion).toBeVisible({ timeout: 15000 }); // Wait up to 15s for LLM processing
  396 |       await articleAccordion.click(); // Expand the accordion
  397 |       
  398 |       await expect(page.locator('text=Reconfigured network adapter settings')).toBeVisible();
  399 |       await dashboardPage.logout();
  400 |     });
  401 |   });
  402 | 
  403 |   test('Scenario 6 & 7: CSAT & UI Guards', async ({ page }) => {
  404 |     const loginPage = new LoginPage(page);
  405 |     const dashboardPage = new DashboardPage(page);
  406 |     await test.step('User submits CSAT for resolved ticket', async () => {
  407 |       await loginPage.goto();
  408 |       await loginPage.login(accounts.user.email, accounts.user.password);
  409 |       
  410 |       await dashboardPage.navigateTo('Tickets');
  411 |       await page.getByRole('tab', { name: 'Resolved' }).click();
  412 |       
  413 |       // Click the first ticket in the Resolved tab (which is ticket1)
  414 |       await page.locator('table tbody tr').first().getByRole('button', { name: 'View Details' }).click();
  415 |       
  416 |       await expect(page.getByRole('button', { name: 'Rate Resolution' })).toBeVisible({ timeout: 10000 });
  417 |       await page.getByRole('button', { name: 'Rate Resolution' }).click();
  418 | 
  419 |       // Check consent
  420 |       await page.getByRole('checkbox').first().check();
  421 | 
  422 |       // Fill unit, name, sex
  423 |       await page.getByLabel('Unit/Section *').fill('TEST UNIT');
  424 |       await page.getByLabel('First Name *').fill('TESTER');
  425 |       await page.getByLabel('Last Name *').fill('USER');
  426 |       await page.getByLabel('Sex *').click();
  427 |       await page.getByRole('option', { name: 'Male' }).click();
  428 | 
  429 |       // Likert 0, 1, 2, 4, 6, 7
  430 |       // 5-Strongly Agree is represented by SentimentVerySatisfiedIcon
  431 |       const verySatisfiedBtns = page.getByRole('button').filter({ has: page.locator('svg[data-testid="SentimentVerySatisfiedIcon"]') });
  432 |       const count = await verySatisfiedBtns.count();
  433 |       for (let i = 0; i < count; i++) {
  434 |          await verySatisfiedBtns.nth(i).click();
  435 |       }
  436 | 
  437 |       await page.getByRole('button', { name: 'Submit Feedback' }).click();
  438 |       await expect(page.getByRole('alert')).toContainText('Thank you for your feedback', { ignoreCase: true, timeout: 5000 }).catch(() => {});
  439 |       await dashboardPage.logout();
  440 |     });
  441 | 
  442 |     await test.step('Non-Admin Cannot select OPEN status', async () => {
  443 |       await loginPage.goto();
  444 |       await loginPage.login(assignedTechEmail, accounts.desktopJr.password);
  445 |       await dashboardPage.navigateTo('Tickets');
  446 |       await page.locator('table tbody tr').first().getByRole('button', { name: 'View Details' }).click();
  447 |       
  448 |       await page.getByRole('button', { name: 'Update Status' }).click();
  449 |       await page.getByLabel('Status').click();
  450 |       
  451 |       // Assert 'Open' option does NOT exist in the dropdown
  452 |       await expect(page.getByRole('option', { name: 'Open' })).not.toBeVisible();
  453 |       await dashboardPage.logout();
  454 |     });
```