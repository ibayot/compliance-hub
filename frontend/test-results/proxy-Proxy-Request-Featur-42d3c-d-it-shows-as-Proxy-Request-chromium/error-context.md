# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: proxy.spec.ts >> Proxy Request Feature >> Staff can create a ticket on behalf of a user, and it shows as Proxy Request
- Location: tests\e2e\proxy.spec.ts:21:7

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
        - tab "All (11)" [selected] [ref=e173] [cursor=pointer]: All (11)
        - tab "Active (9)" [ref=e174] [cursor=pointer]: Active (9)
        - tab "Resolved / Closed (2)" [ref=e175] [cursor=pointer]: Resolved / Closed (2)
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
          - row "TKT-2026-0011 E2E Proxy Request Test Proxy Request Desktop Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e198]:
            - cell "TKT-2026-0011" [ref=e199]
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
          - row "TKT-2026-0010 E2E Test 6 - Mobile Ticket 1780898632023 Desktop Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e237]:
            - cell "TKT-2026-0010" [ref=e238]
            - cell "E2E Test 6 - Mobile Ticket 1780898632023" [ref=e239]
            - cell "Desktop Support" [ref=e240]:
              - generic [ref=e242]:
                - img [ref=e243]
                - generic [ref=e245]: Desktop Support
            - cell "—" [ref=e246]:
              - paragraph [ref=e247]: —
            - cell "NOT SET" [ref=e248]:
              - generic [ref=e250]: NOT SET
            - cell "open" [ref=e251]:
              - generic [ref=e254]: open
            - cell "—" [ref=e255]:
              - paragraph [ref=e257]: —
            - cell "Test User" [ref=e258]
            - cell "Unassigned" [ref=e259]:
              - paragraph [ref=e260]: Unassigned
            - cell "6/8/2026" [ref=e261]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e262]:
              - generic [ref=e263]:
                - button "View Details" [ref=e264] [cursor=pointer]:
                  - img [ref=e265]
                - generic "Assign Ticket" [ref=e267]:
                  - button [ref=e268] [cursor=pointer]:
                    - img [ref=e269]
                - button "Escalate Ticket" [ref=e271] [cursor=pointer]:
                  - img [ref=e272]
          - row "TKT-2026-0009 E2E Test 5 - pantawid issue B 1780898588492 Pantawid ICT Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e274]:
            - cell "TKT-2026-0009" [ref=e275]
            - cell "E2E Test 5 - pantawid issue B 1780898588492" [ref=e276]
            - cell "Pantawid ICT Support" [ref=e277]:
              - generic [ref=e279]:
                - img [ref=e280]
                - generic [ref=e282]: Pantawid ICT Support
            - cell "—" [ref=e283]:
              - paragraph [ref=e284]: —
            - cell "NOT SET" [ref=e285]:
              - generic [ref=e287]: NOT SET
            - cell "open" [ref=e288]:
              - generic [ref=e291]: open
            - cell "—" [ref=e292]:
              - paragraph [ref=e294]: —
            - cell "Test User" [ref=e295]
            - cell "Unassigned" [ref=e296]:
              - paragraph [ref=e297]: Unassigned
            - cell "6/8/2026" [ref=e298]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e299]:
              - generic [ref=e300]:
                - button "View Details" [ref=e301] [cursor=pointer]:
                  - img [ref=e302]
                - generic "Assign Ticket" [ref=e304]:
                  - button [ref=e305] [cursor=pointer]:
                    - img [ref=e306]
                - button "Escalate Ticket" [ref=e308] [cursor=pointer]:
                  - img [ref=e309]
          - row "TKT-2026-0008 E2E Test 5 - printer issue B 1780898588492 Desktop Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e311]:
            - cell "TKT-2026-0008" [ref=e312]
            - cell "E2E Test 5 - printer issue B 1780898588492" [ref=e313]
            - cell "Desktop Support" [ref=e314]:
              - generic [ref=e316]:
                - img [ref=e317]
                - generic [ref=e319]: Desktop Support
            - cell "—" [ref=e320]:
              - paragraph [ref=e321]: —
            - cell "NOT SET" [ref=e322]:
              - generic [ref=e324]: NOT SET
            - cell "open" [ref=e325]:
              - generic [ref=e328]: open
            - cell "—" [ref=e329]:
              - paragraph [ref=e331]: —
            - cell "Test User" [ref=e332]
            - cell "Unassigned" [ref=e333]:
              - paragraph [ref=e334]: Unassigned
            - cell "6/8/2026" [ref=e335]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e336]:
              - generic [ref=e337]:
                - button "View Details" [ref=e338] [cursor=pointer]:
                  - img [ref=e339]
                - generic "Assign Ticket" [ref=e341]:
                  - button [ref=e342] [cursor=pointer]:
                    - img [ref=e343]
                - button "Escalate Ticket" [ref=e345] [cursor=pointer]:
                  - img [ref=e346]
          - row "TKT-2026-0007 E2E Test 5 - internet issue B 1780898588492 IT Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e348]:
            - cell "TKT-2026-0007" [ref=e349]
            - cell "E2E Test 5 - internet issue B 1780898588492" [ref=e350]
            - cell "IT Support" [ref=e351]:
              - generic [ref=e353]:
                - img [ref=e354]
                - generic [ref=e356]: IT Support
            - cell "—" [ref=e357]:
              - paragraph [ref=e358]: —
            - cell "NOT SET" [ref=e359]:
              - generic [ref=e361]: NOT SET
            - cell "open" [ref=e362]:
              - generic [ref=e365]: open
            - cell "—" [ref=e366]:
              - paragraph [ref=e368]: —
            - cell "Test User" [ref=e369]
            - cell "Unassigned" [ref=e370]:
              - paragraph [ref=e371]: Unassigned
            - cell "6/8/2026" [ref=e372]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e373]:
              - generic [ref=e374]:
                - button "View Details" [ref=e375] [cursor=pointer]:
                  - img [ref=e376]
                - generic "Assign Ticket" [ref=e378]:
                  - button [ref=e379] [cursor=pointer]:
                    - img [ref=e380]
                - button "Escalate Ticket" [ref=e382] [cursor=pointer]:
                  - img [ref=e383]
          - row "TKT-2026-0006 E2E Test 5 - pantawid issue A 1780898588492 Pantawid ICT Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e385]:
            - cell "TKT-2026-0006" [ref=e386]
            - cell "E2E Test 5 - pantawid issue A 1780898588492" [ref=e387]
            - cell "Pantawid ICT Support" [ref=e388]:
              - generic [ref=e390]:
                - img [ref=e391]
                - generic [ref=e393]: Pantawid ICT Support
            - cell "—" [ref=e394]:
              - paragraph [ref=e395]: —
            - cell "NOT SET" [ref=e396]:
              - generic [ref=e398]: NOT SET
            - cell "open" [ref=e399]:
              - generic [ref=e402]: open
            - cell "—" [ref=e403]:
              - paragraph [ref=e405]: —
            - cell "Test User" [ref=e406]
            - cell "Unassigned" [ref=e407]:
              - paragraph [ref=e408]: Unassigned
            - cell "6/8/2026" [ref=e409]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e410]:
              - generic [ref=e411]:
                - button "View Details" [ref=e412] [cursor=pointer]:
                  - img [ref=e413]
                - generic "Assign Ticket" [ref=e415]:
                  - button [ref=e416] [cursor=pointer]:
                    - img [ref=e417]
                - button "Escalate Ticket" [ref=e419] [cursor=pointer]:
                  - img [ref=e420]
          - row "TKT-2026-0005 E2E Test 5 - printer issue A 1780898588492 Desktop Support — NOT SET open — Test User Unassigned 6/8/2026 View Details Assign Ticket Escalate Ticket" [ref=e422]:
            - cell "TKT-2026-0005" [ref=e423]
            - cell "E2E Test 5 - printer issue A 1780898588492" [ref=e424]
            - cell "Desktop Support" [ref=e425]:
              - generic [ref=e427]:
                - img [ref=e428]
                - generic [ref=e430]: Desktop Support
            - cell "—" [ref=e431]:
              - paragraph [ref=e432]: —
            - cell "NOT SET" [ref=e433]:
              - generic [ref=e435]: NOT SET
            - cell "open" [ref=e436]:
              - generic [ref=e439]: open
            - cell "—" [ref=e440]:
              - paragraph [ref=e442]: —
            - cell "Test User" [ref=e443]
            - cell "Unassigned" [ref=e444]:
              - paragraph [ref=e445]: Unassigned
            - cell "6/8/2026" [ref=e446]
            - cell "View Details Assign Ticket Escalate Ticket" [ref=e447]:
              - generic [ref=e448]:
                - button "View Details" [ref=e449] [cursor=pointer]:
                  - img [ref=e450]
                - generic "Assign Ticket" [ref=e452]:
                  - button [ref=e453] [cursor=pointer]:
                    - img [ref=e454]
                - button "Escalate Ticket" [ref=e456] [cursor=pointer]:
                  - img [ref=e457]
          - row "TKT-2026-0004 E2E Test 5 - internet issue A 1780898588492 IT Support — NOT SET assigned — Test User Jaymark Cardona 6/8/2026 View Details Reassign Ticket Escalate Ticket" [ref=e459]:
            - cell "TKT-2026-0004" [ref=e460]
            - cell "E2E Test 5 - internet issue A 1780898588492" [ref=e461]
            - cell "IT Support" [ref=e462]:
              - generic [ref=e464]:
                - img [ref=e465]
                - generic [ref=e467]: IT Support
            - cell "—" [ref=e468]:
              - paragraph [ref=e469]: —
            - cell "NOT SET" [ref=e470]:
              - generic [ref=e472]: NOT SET
            - cell "assigned" [ref=e473]:
              - generic [ref=e476]: assigned
            - cell "—" [ref=e477]:
              - paragraph [ref=e479]: —
            - cell "Test User" [ref=e480]
            - cell "Jaymark Cardona" [ref=e481]:
              - generic [ref=e483]: Jaymark Cardona
            - cell "6/8/2026" [ref=e484]
            - cell "View Details Reassign Ticket Escalate Ticket" [ref=e485]:
              - generic [ref=e486]:
                - button "View Details" [ref=e487] [cursor=pointer]:
                  - img [ref=e488]
                - generic "Reassign Ticket" [ref=e490]:
                  - button [ref=e491] [cursor=pointer]:
                    - img [ref=e492]
                - button "Escalate Ticket" [ref=e494] [cursor=pointer]:
                  - img [ref=e495]
          - row "TKT-2026-0003 E2E Test 5 - pantawid issue 1780898559765 Pantawid ICT Support — NOT SET assigned — Test User James Arnel Lingan 6/8/2026 View Details Reassign Ticket Escalate Ticket" [ref=e497]:
            - cell "TKT-2026-0003" [ref=e498]
            - cell "E2E Test 5 - pantawid issue 1780898559765" [ref=e499]
            - cell "Pantawid ICT Support" [ref=e500]:
              - generic [ref=e502]:
                - img [ref=e503]
                - generic [ref=e505]: Pantawid ICT Support
            - cell "—" [ref=e506]:
              - paragraph [ref=e507]: —
            - cell "NOT SET" [ref=e508]:
              - generic [ref=e510]: NOT SET
            - cell "assigned" [ref=e511]:
              - generic [ref=e514]: assigned
            - cell "—" [ref=e515]:
              - paragraph [ref=e517]: —
            - cell "Test User" [ref=e518]
            - cell "James Arnel Lingan" [ref=e519]:
              - generic [ref=e521]: James Arnel Lingan
            - cell "6/8/2026" [ref=e522]
            - cell "View Details Reassign Ticket Escalate Ticket" [ref=e523]:
              - generic [ref=e524]:
                - button "View Details" [ref=e525] [cursor=pointer]:
                  - img [ref=e526]
                - generic "Reassign Ticket" [ref=e528]:
                  - button [ref=e529] [cursor=pointer]:
                    - img [ref=e530]
                - button "Escalate Ticket" [ref=e532] [cursor=pointer]:
                  - img [ref=e533]
          - row "TKT-2026-0002 E2E Test 5 - printer issue 1780898559765 Desktop Support — NOT SET closed — Test User Jaymark Cardona 6/8/2026 View Details Reassign disabled for resolved/closed tickets" [ref=e535]:
            - cell "TKT-2026-0002" [ref=e536]
            - cell "E2E Test 5 - printer issue 1780898559765" [ref=e537]
            - cell "Desktop Support" [ref=e538]:
              - generic [ref=e540]:
                - img [ref=e541]
                - generic [ref=e543]: Desktop Support
            - cell "—" [ref=e544]:
              - paragraph [ref=e545]: —
            - cell "NOT SET" [ref=e546]:
              - generic [ref=e548]: NOT SET
            - cell "closed" [ref=e549]:
              - generic [ref=e552]: closed
            - cell "—" [ref=e553]:
              - paragraph [ref=e555]: —
            - cell "Test User" [ref=e556]
            - cell "Jaymark Cardona" [ref=e557]:
              - generic [ref=e559]: Jaymark Cardona
            - cell "6/8/2026" [ref=e560]
            - cell "View Details Reassign disabled for resolved/closed tickets" [ref=e561]:
              - generic [ref=e562]:
                - button "View Details" [ref=e563] [cursor=pointer]:
                  - img [ref=e564]
                - generic "Reassign disabled for resolved/closed tickets" [ref=e566]:
                  - button [disabled]:
                    - img
          - row "TKT-2026-0001 E2E Test 5 - internet issue 1780898559765 IT Support — NOT SET closed — Test User Godofredo Javier 6/8/2026 View Details Reassign disabled for resolved/closed tickets" [ref=e567]:
            - cell "TKT-2026-0001" [ref=e568]
            - cell "E2E Test 5 - internet issue 1780898559765" [ref=e569]
            - cell "IT Support" [ref=e570]:
              - generic [ref=e572]:
                - img [ref=e573]
                - generic [ref=e575]: IT Support
            - cell "—" [ref=e576]:
              - paragraph [ref=e577]: —
            - cell "NOT SET" [ref=e578]:
              - generic [ref=e580]: NOT SET
            - cell "closed" [ref=e581]:
              - generic [ref=e584]: closed
            - cell "—" [ref=e585]:
              - paragraph [ref=e587]: —
            - cell "Test User" [ref=e588]
            - cell "Godofredo Javier" [ref=e589]:
              - generic [ref=e591]: Godofredo Javier
            - cell "6/8/2026" [ref=e592]
            - cell "View Details Reassign disabled for resolved/closed tickets" [ref=e593]:
              - generic [ref=e594]:
                - button "View Details" [ref=e595] [cursor=pointer]:
                  - img [ref=e596]
                - generic "Reassign disabled for resolved/closed tickets" [ref=e598]:
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