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
        - tab "All (12)" [selected] [ref=e173] [cursor=pointer]: All (12)
        - tab "Active (7)" [ref=e174] [cursor=pointer]: Active (7)
        - tab "Resolved / Closed (5)" [ref=e175] [cursor=pointer]: Resolved / Closed (5)
        - tab "Frozen (0)" [ref=e176] [cursor=pointer]: Frozen (0)
        - tab "Duplicate (0)" [ref=e177] [cursor=pointer]: Duplicate (0)
        - tab "Proxy Requests (2)" [ref=e178] [cursor=pointer]:
          - generic [ref=e179]: Proxy Requests (2)
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
          - row "TKT-2026-0012 E2E Proxy Request Test Proxy Request Desktop Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e198]:
            - cell "TKT-2026-0012" [ref=e199]
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
            - cell "open" [ref=e214]:
              - generic [ref=e217]: open
            - cell "—" [ref=e218]:
              - paragraph [ref=e220]: —
            - cell "Test User" [ref=e221]
            - cell "Unassigned" [ref=e222]:
              - paragraph [ref=e223]: Unassigned
            - cell "6/8/2026" [ref=e224]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e225]:
              - generic [ref=e226]:
                - button "View Details" [ref=e227] [cursor=pointer]:
                  - img [ref=e228]
                - generic "Assign Ticket" [ref=e230]:
                  - button [ref=e231] [cursor=pointer]:
                    - img [ref=e232]
                - button "Escalate Ticket" [ref=e234] [cursor=pointer]:
                  - img [ref=e235]
          - row "TKT-2026-0011 E2E Proxy Request Test Proxy Request Desktop Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e237]:
            - cell "TKT-2026-0011" [ref=e238]
            - cell "E2E Proxy Request Test" [ref=e239]
            - cell "Proxy Request Desktop Support" [ref=e240]:
              - generic [ref=e241]:
                - generic [ref=e243]: Proxy Request
                - generic [ref=e244]:
                  - img [ref=e245]
                  - generic [ref=e247]: Desktop Support
            - cell "—" [ref=e248]:
              - paragraph [ref=e249]: —
            - cell "NOT SET" [ref=e250]:
              - generic [ref=e252]: NOT SET
            - cell "open" [ref=e253]:
              - generic [ref=e256]: open
            - cell "—" [ref=e257]:
              - paragraph [ref=e259]: —
            - cell "Test User" [ref=e260]
            - cell "Unassigned" [ref=e261]:
              - paragraph [ref=e262]: Unassigned
            - cell "6/8/2026" [ref=e263]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e264]:
              - generic [ref=e265]:
                - button "View Details" [ref=e266] [cursor=pointer]:
                  - img [ref=e267]
                - generic "Assign Ticket" [ref=e269]:
                  - button [ref=e270] [cursor=pointer]:
                    - img [ref=e271]
                - button "Escalate Ticket" [ref=e273] [cursor=pointer]:
                  - img [ref=e274]
          - row "TKT-2026-0010 E2E Test 6 - Mobile Ticket 1780898632023 Desktop Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e276]:
            - cell "TKT-2026-0010" [ref=e277]
            - cell "E2E Test 6 - Mobile Ticket 1780898632023" [ref=e278]
            - cell "Desktop Support" [ref=e279]:
              - generic [ref=e281]:
                - img [ref=e282]
                - generic [ref=e284]: Desktop Support
            - cell "—" [ref=e285]:
              - paragraph [ref=e286]: —
            - cell "NOT SET" [ref=e287]:
              - generic [ref=e289]: NOT SET
            - cell "open" [ref=e290]:
              - generic [ref=e293]: open
            - cell "—" [ref=e294]:
              - paragraph [ref=e296]: —
            - cell "Test User" [ref=e297]
            - cell "Unassigned" [ref=e298]:
              - paragraph [ref=e299]: Unassigned
            - cell "6/8/2026" [ref=e300]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e301]:
              - generic [ref=e302]:
                - button "View Details" [ref=e303] [cursor=pointer]:
                  - img [ref=e304]
                - generic "Assign Ticket" [ref=e306]:
                  - button [ref=e307] [cursor=pointer]:
                    - img [ref=e308]
                - button "Escalate Ticket" [ref=e310] [cursor=pointer]:
                  - img [ref=e311]
          - row "TKT-2026-0009 E2E Test 5 - pantawid issue B 1780898588492 Pantawid ICT Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e313]:
            - cell "TKT-2026-0009" [ref=e314]
            - cell "E2E Test 5 - pantawid issue B 1780898588492" [ref=e315]
            - cell "Pantawid ICT Support" [ref=e316]:
              - generic [ref=e318]:
                - img [ref=e319]
                - generic [ref=e321]: Pantawid ICT Support
            - cell "—" [ref=e322]:
              - paragraph [ref=e323]: —
            - cell "NOT SET" [ref=e324]:
              - generic [ref=e326]: NOT SET
            - cell "open" [ref=e327]:
              - generic [ref=e330]: open
            - cell "—" [ref=e331]:
              - paragraph [ref=e333]: —
            - cell "Test User" [ref=e334]
            - cell "Unassigned" [ref=e335]:
              - paragraph [ref=e336]: Unassigned
            - cell "6/8/2026" [ref=e337]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e338]:
              - generic [ref=e339]:
                - button "View Details" [ref=e340] [cursor=pointer]:
                  - img [ref=e341]
                - generic "Assign Ticket" [ref=e343]:
                  - button [ref=e344] [cursor=pointer]:
                    - img [ref=e345]
                - button "Escalate Ticket" [ref=e347] [cursor=pointer]:
                  - img [ref=e348]
          - row "TKT-2026-0008 E2E Test 5 - printer issue B 1780898588492 Desktop Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e350]:
            - cell "TKT-2026-0008" [ref=e351]
            - cell "E2E Test 5 - printer issue B 1780898588492" [ref=e352]
            - cell "Desktop Support" [ref=e353]:
              - generic [ref=e355]:
                - img [ref=e356]
                - generic [ref=e358]: Desktop Support
            - cell "—" [ref=e359]:
              - paragraph [ref=e360]: —
            - cell "NOT SET" [ref=e361]:
              - generic [ref=e363]: NOT SET
            - cell "open" [ref=e364]:
              - generic [ref=e367]: open
            - cell "—" [ref=e368]:
              - paragraph [ref=e370]: —
            - cell "Test User" [ref=e371]
            - cell "Unassigned" [ref=e372]:
              - paragraph [ref=e373]: Unassigned
            - cell "6/8/2026" [ref=e374]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e375]:
              - generic [ref=e376]:
                - button "View Details" [ref=e377] [cursor=pointer]:
                  - img [ref=e378]
                - generic "Assign Ticket" [ref=e380]:
                  - button [ref=e381] [cursor=pointer]:
                    - img [ref=e382]
                - button "Escalate Ticket" [ref=e384] [cursor=pointer]:
                  - img [ref=e385]
          - row "TKT-2026-0007 E2E Test 5 - internet issue B 1780898588492 IT Support — NOT SET assigned — Test User Jaymark Cardona 6/8/2026 View Details Reassign Ticket Escalate Ticket" [ref=e387]:
            - cell "TKT-2026-0007" [ref=e388]
            - cell "E2E Test 5 - internet issue B 1780898588492" [ref=e389]
            - cell "IT Support" [ref=e390]:
              - generic [ref=e392]:
                - img [ref=e393]
                - generic [ref=e395]: IT Support
            - cell "—" [ref=e396]:
              - paragraph [ref=e397]: —
            - cell "NOT SET" [ref=e398]:
              - generic [ref=e400]: NOT SET
            - cell "assigned" [ref=e401]:
              - generic [ref=e404]: assigned
            - cell "—" [ref=e405]:
              - paragraph [ref=e407]: —
            - cell "Test User" [ref=e408]
            - cell "Jaymark Cardona" [ref=e409]:
              - generic [ref=e411]: Jaymark Cardona
            - cell "6/8/2026" [ref=e412]
            - cell "View Details Reassign Ticket Escalate Ticket" [ref=e413]:
              - generic [ref=e414]:
                - button "View Details" [ref=e415] [cursor=pointer]:
                  - img [ref=e416]
                - generic "Reassign Ticket" [ref=e418]:
                  - button [ref=e419] [cursor=pointer]:
                    - img [ref=e420]
                - button "Escalate Ticket" [ref=e422] [cursor=pointer]:
                  - img [ref=e423]
          - row "TKT-2026-0006 E2E Test 5 - pantawid issue A 1780898588492 Pantawid ICT Support — MEDIUM closed — Test User Jaymark Cardona 6/8/2026 View Details Reassign disabled for resolved/closed tickets" [ref=e425]:
            - cell "TKT-2026-0006" [ref=e426]
            - cell "E2E Test 5 - pantawid issue A 1780898588492" [ref=e427]
            - cell "Pantawid ICT Support" [ref=e428]:
              - generic [ref=e430]:
                - img [ref=e431]
                - generic [ref=e433]: Pantawid ICT Support
            - cell "—" [ref=e434]:
              - paragraph [ref=e435]: —
            - cell "MEDIUM" [ref=e436]:
              - generic [ref=e438]: MEDIUM
            - cell "closed" [ref=e439]:
              - generic [ref=e442]: closed
            - cell "—" [ref=e443]:
              - paragraph [ref=e445]: —
            - cell "Test User" [ref=e446]
            - cell "Jaymark Cardona" [ref=e447]:
              - generic [ref=e449]: Jaymark Cardona
            - cell "6/8/2026" [ref=e450]
            - cell "View Details Reassign disabled for resolved/closed tickets" [ref=e451]:
              - generic [ref=e452]:
                - button "View Details" [ref=e453] [cursor=pointer]:
                  - img [ref=e454]
                - generic "Reassign disabled for resolved/closed tickets" [ref=e456]:
                  - button [disabled]:
                    - img
          - row "TKT-2026-0005 E2E Test 5 - printer issue A 1780898588492 Desktop Support — LOW closed — Test User Jaymark Cardona 6/8/2026 View Details Reassign disabled for resolved/closed tickets" [ref=e457]:
            - cell "TKT-2026-0005" [ref=e458]
            - cell "E2E Test 5 - printer issue A 1780898588492" [ref=e459]
            - cell "Desktop Support" [ref=e460]:
              - generic [ref=e462]:
                - img [ref=e463]
                - generic [ref=e465]: Desktop Support
            - cell "—" [ref=e466]:
              - paragraph [ref=e467]: —
            - cell "LOW" [ref=e468]:
              - generic [ref=e470]: LOW
            - cell "closed" [ref=e471]:
              - generic [ref=e474]: closed
            - cell "—" [ref=e475]:
              - paragraph [ref=e477]: —
            - cell "Test User" [ref=e478]
            - cell "Jaymark Cardona" [ref=e479]:
              - generic [ref=e481]: Jaymark Cardona
            - cell "6/8/2026" [ref=e482]
            - cell "View Details Reassign disabled for resolved/closed tickets" [ref=e483]:
              - generic [ref=e484]:
                - button "View Details" [ref=e485] [cursor=pointer]:
                  - img [ref=e486]
                - generic "Reassign disabled for resolved/closed tickets" [ref=e488]:
                  - button [disabled]:
                    - img
          - row "TKT-2026-0004 E2E Test 5 - internet issue A 1780898588492 IT Support — LOW resolved — Test User Jaymark Cardona 6/8/2026 View Details Reassign disabled for resolved/closed tickets" [ref=e489]:
            - cell "TKT-2026-0004" [ref=e490]
            - cell "E2E Test 5 - internet issue A 1780898588492" [ref=e491]
            - cell "IT Support" [ref=e492]:
              - generic [ref=e494]:
                - img [ref=e495]
                - generic [ref=e497]: IT Support
            - cell "—" [ref=e498]:
              - paragraph [ref=e499]: —
            - cell "LOW" [ref=e500]:
              - generic [ref=e502]: LOW
            - cell "resolved" [ref=e503]:
              - generic [ref=e506]: resolved
            - cell "—" [ref=e507]:
              - paragraph [ref=e509]: —
            - cell "Test User" [ref=e510]
            - cell "Jaymark Cardona" [ref=e511]:
              - generic [ref=e513]: Jaymark Cardona
            - cell "6/8/2026" [ref=e514]
            - cell "View Details Reassign disabled for resolved/closed tickets" [ref=e515]:
              - generic [ref=e516]:
                - button "View Details" [ref=e517] [cursor=pointer]:
                  - img [ref=e518]
                - generic "Reassign disabled for resolved/closed tickets" [ref=e520]:
                  - button [disabled]:
                    - img
          - row "TKT-2026-0003 E2E Test 5 - pantawid issue 1780898559765 Pantawid ICT Support — NOT SET assigned — Test User James Arnel Lingan 6/8/2026 View Details Reassign Ticket Escalate Ticket" [ref=e521]:
            - cell "TKT-2026-0003" [ref=e522]
            - cell "E2E Test 5 - pantawid issue 1780898559765" [ref=e523]
            - cell "Pantawid ICT Support" [ref=e524]:
              - generic [ref=e526]:
                - img [ref=e527]
                - generic [ref=e529]: Pantawid ICT Support
            - cell "—" [ref=e530]:
              - paragraph [ref=e531]: —
            - cell "NOT SET" [ref=e532]:
              - generic [ref=e534]: NOT SET
            - cell "assigned" [ref=e535]:
              - generic [ref=e538]: assigned
            - cell "—" [ref=e539]:
              - paragraph [ref=e541]: —
            - cell "Test User" [ref=e542]
            - cell "James Arnel Lingan" [ref=e543]:
              - generic [ref=e545]: James Arnel Lingan
            - cell "6/8/2026" [ref=e546]
            - cell "View Details Reassign Ticket Escalate Ticket" [ref=e547]:
              - generic [ref=e548]:
                - button "View Details" [ref=e549] [cursor=pointer]:
                  - img [ref=e550]
                - generic "Reassign Ticket" [ref=e552]:
                  - button [ref=e553] [cursor=pointer]:
                    - img [ref=e554]
                - button "Escalate Ticket" [ref=e556] [cursor=pointer]:
                  - img [ref=e557]
          - row "TKT-2026-0002 E2E Test 5 - printer issue 1780898559765 Desktop Support — NOT SET closed — Test User Jaymark Cardona 6/8/2026 View Details Reassign disabled for resolved/closed tickets" [ref=e559]:
            - cell "TKT-2026-0002" [ref=e560]
            - cell "E2E Test 5 - printer issue 1780898559765" [ref=e561]
            - cell "Desktop Support" [ref=e562]:
              - generic [ref=e564]:
                - img [ref=e565]
                - generic [ref=e567]: Desktop Support
            - cell "—" [ref=e568]:
              - paragraph [ref=e569]: —
            - cell "NOT SET" [ref=e570]:
              - generic [ref=e572]: NOT SET
            - cell "closed" [ref=e573]:
              - generic [ref=e576]: closed
            - cell "—" [ref=e577]:
              - paragraph [ref=e579]: —
            - cell "Test User" [ref=e580]
            - cell "Jaymark Cardona" [ref=e581]:
              - generic [ref=e583]: Jaymark Cardona
            - cell "6/8/2026" [ref=e584]
            - cell "View Details Reassign disabled for resolved/closed tickets" [ref=e585]:
              - generic [ref=e586]:
                - button "View Details" [ref=e587] [cursor=pointer]:
                  - img [ref=e588]
                - generic "Reassign disabled for resolved/closed tickets" [ref=e590]:
                  - button [disabled]:
                    - img
          - row "TKT-2026-0001 E2E Test 5 - internet issue 1780898559765 IT Support — NOT SET closed — Test User Godofredo Javier 6/8/2026 View Details Reassign disabled for resolved/closed tickets" [ref=e591]:
            - cell "TKT-2026-0001" [ref=e592]
            - cell "E2E Test 5 - internet issue 1780898559765" [ref=e593]
            - cell "IT Support" [ref=e594]:
              - generic [ref=e596]:
                - img [ref=e597]
                - generic [ref=e599]: IT Support
            - cell "—" [ref=e600]:
              - paragraph [ref=e601]: —
            - cell "NOT SET" [ref=e602]:
              - generic [ref=e604]: NOT SET
            - cell "closed" [ref=e605]:
              - generic [ref=e608]: closed
            - cell "—" [ref=e609]:
              - paragraph [ref=e611]: —
            - cell "Test User" [ref=e612]
            - cell "Godofredo Javier" [ref=e613]:
              - generic [ref=e615]: Godofredo Javier
            - cell "6/8/2026" [ref=e616]
            - cell "View Details Reassign disabled for resolved/closed tickets" [ref=e617]:
              - generic [ref=e618]:
                - button "View Details" [ref=e619] [cursor=pointer]:
                  - img [ref=e620]
                - generic "Reassign disabled for resolved/closed tickets" [ref=e622]:
                  - button [disabled]:
                    - img
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