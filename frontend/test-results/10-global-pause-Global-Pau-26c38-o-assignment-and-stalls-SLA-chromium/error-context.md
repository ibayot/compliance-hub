# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 10-global-pause.spec.ts >> Global Pause and SLA Adjustment >> Verify Global Pause stops auto-assignment and stalls SLA
- Location: frontend\tests\e2e\10-global-pause.spec.ts:20:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "open"
Received: "assigned"
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
        - button "Knowledge Base" [ref=e38] [cursor=pointer]:
          - img [ref=e40]
          - generic [ref=e43]: Knowledge Base
      - listitem [ref=e44]:
        - button "Documents" [ref=e45] [cursor=pointer]:
          - img [ref=e47]
          - generic [ref=e50]: Documents
      - listitem [ref=e51]:
        - button "Repository" [ref=e52] [cursor=pointer]:
          - img [ref=e54]
          - generic [ref=e57]: Repository
      - listitem [ref=e58]:
        - button "Issuances" [ref=e59] [cursor=pointer]:
          - img [ref=e61]
          - generic [ref=e64]: Issuances
    - separator [ref=e65]
    - generic [ref=e66]: Administration
    - list [ref=e67]:
      - listitem [ref=e68]:
        - button "Units" [ref=e69] [cursor=pointer]:
          - img [ref=e71]
          - generic [ref=e74]: Units
      - listitem [ref=e75]:
        - button "Metrics" [ref=e76] [cursor=pointer]:
          - img [ref=e78]
          - generic [ref=e81]: Metrics
      - listitem [ref=e82]:
        - button "KPI" [ref=e83] [cursor=pointer]:
          - img [ref=e85]
          - generic [ref=e89]: KPI
      - listitem [ref=e90]:
        - button "Ticket Settings" [ref=e91] [cursor=pointer]:
          - img [ref=e93]
          - generic [ref=e96]: Ticket Settings
      - listitem [ref=e97]:
        - button "Ticket Reports" [ref=e98] [cursor=pointer]:
          - img [ref=e100]
          - generic [ref=e103]: Ticket Reports
      - listitem [ref=e104]:
        - button "Attendance" [ref=e105] [cursor=pointer]:
          - img [ref=e107]
          - generic [ref=e110]: Attendance
      - listitem [ref=e111]:
        - button "Reviews" [ref=e112] [cursor=pointer]:
          - img [ref=e114]
          - generic [ref=e117]: Reviews
      - listitem [ref=e118]:
        - button "Reports" [ref=e119] [cursor=pointer]:
          - img [ref=e121]
          - generic [ref=e124]: Reports
      - listitem [ref=e125]:
        - button "MoV Builder" [ref=e126] [cursor=pointer]:
          - img [ref=e128]
          - generic [ref=e131]: MoV Builder
      - listitem [ref=e132]:
        - button "Audit Logs" [ref=e133] [cursor=pointer]:
          - img [ref=e135]
          - generic [ref=e138]: Audit Logs
    - separator [ref=e139]
    - list [ref=e140]:
      - listitem [ref=e141]:
        - button "User Manual" [ref=e142] [cursor=pointer]:
          - img [ref=e144]
          - generic [ref=e148]: User Manual
      - listitem [ref=e149]:
        - button "Settings" [ref=e150] [cursor=pointer]:
          - img [ref=e152]
          - generic [ref=e155]: Settings
    - generic [ref=e156]:
      - paragraph [ref=e157]: System Admin
      - text: SUPER ADMIN
  - main [ref=e158]:
    - generic [ref=e161]:
      - generic [ref=e162]:
        - heading "Dashboard" [level=1] [ref=e163]
        - paragraph [ref=e164]: Welcome back, System!
      - generic [ref=e166]:
        - generic [ref=e167]:
          - generic [ref=e168]:
            - img [ref=e169]
            - generic [ref=e171]:
              - heading "My Assigned Tickets" [level=6] [ref=e172]
              - paragraph [ref=e173]: Monthly statistics for tickets assigned to you
          - generic [ref=e174]:
            - generic [ref=e175]:
              - generic [ref=e176]: Month
              - generic [ref=e177]:
                - combobox "Month July" [ref=e178] [cursor=pointer]: July
                - textbox: "7"
                - img
                - group:
                  - generic: Month
            - generic [ref=e179]:
              - generic [ref=e180]: Year
              - generic [ref=e181]:
                - combobox "Year 2026" [ref=e182] [cursor=pointer]: "2026"
                - textbox: "2026"
                - img
                - group:
                  - generic: Year
        - generic [ref=e183]:
          - generic [ref=e185]:
            - img [ref=e186]
            - heading "0" [level=4] [ref=e188]
            - text: Assigned
          - generic [ref=e190]:
            - img [ref=e191]
            - heading "0" [level=4] [ref=e193]
            - text: In Progress
          - generic [ref=e195]:
            - img [ref=e196]
            - heading "0" [level=4] [ref=e198]
            - text: Resolved
          - generic [ref=e200]:
            - img [ref=e201]
            - heading "0" [level=4] [ref=e203]
            - text: Closed
        - generic [ref=e204]:
          - generic [ref=e205]:
            - text: Total this month
            - heading "0" [level=6] [ref=e206]
          - generic [ref=e207]:
            - text: Total Resolved & Closed
            - heading "0" [level=6] [ref=e208]
            - generic [ref=e209]: 0 of 0 tickets have rating
      - generic [ref=e211]:
        - generic [ref=e212]:
          - img [ref=e213]
          - generic [ref=e215]:
            - heading "Incident Response — Tuesday, July 7, 2026" [level=6] [ref=e216]
            - generic [ref=e217]: "Start: 0 • Added: 0 • Current: 0"
        - generic [ref=e218]:
          - generic [ref=e220]:
            - paragraph [ref=e221]: Low Severity
            - heading "0" [level=5] [ref=e222]
          - generic [ref=e224]:
            - paragraph [ref=e225]: Medium Severity
            - heading "0" [level=5] [ref=e226]
          - generic [ref=e228]:
            - paragraph [ref=e229]: High Severity
            - heading "0" [level=5] [ref=e230]
          - generic [ref=e232]:
            - paragraph [ref=e233]: Critical Severity
            - heading "0" [level=5] [ref=e234]
      - generic [ref=e236]:
        - generic [ref=e237]:
          - generic [ref=e238]:
            - img [ref=e239]
            - generic [ref=e241]:
              - heading "IT Help Desk Overview" [level=6] [ref=e242]
              - generic [ref=e243]: "Total: 16 tickets • Resolved: 6 • Satisfaction: 5/5"
          - link "View All Tickets" [ref=e244] [cursor=pointer]:
            - /url: /dashboard/tickets
            - text: View All Tickets
        - generic [ref=e245]:
          - generic [ref=e247]:
            - img [ref=e248]
            - heading "1" [level=5] [ref=e250]
            - text: Open
          - generic [ref=e252]:
            - img [ref=e253]
            - heading "9" [level=5] [ref=e255]
            - text: Assigned
          - generic [ref=e257]:
            - img [ref=e258]
            - heading "0" [level=5] [ref=e260]
            - text: In Progress
          - generic [ref=e262]:
            - img [ref=e263]
            - heading "5" [level=5] [ref=e265]
            - text: Resolved
          - generic [ref=e267]:
            - img [ref=e268]
            - heading "1" [level=5] [ref=e270]
            - text: Closed
          - generic [ref=e272]:
            - img [ref=e273]
            - heading "5" [level=5] [ref=e275]
            - text: Satisfaction
        - generic [ref=e276]:
          - generic [ref=e278]:
            - img [ref=e279]
            - generic [ref=e281]:
              - paragraph [ref=e282]: IT Support
              - heading "10 tickets" [level=6] [ref=e283]
          - generic [ref=e285]:
            - img [ref=e286]
            - generic [ref=e288]:
              - paragraph [ref=e289]: Desktop Support
              - heading "4 tickets" [level=6] [ref=e290]
          - generic [ref=e292]:
            - img [ref=e293]
            - generic [ref=e295]:
              - paragraph [ref=e296]: Pantawid ICT Support
              - heading "2 tickets" [level=6] [ref=e297]
        - generic [ref=e298]:
          - generic [ref=e299]:
            - paragraph [ref=e300]: Satisfaction fill rate
            - paragraph [ref=e301]: 17%
          - progressbar [ref=e302]
      - generic [ref=e306]:
        - img [ref=e307]
        - heading "Cybersecurity Compliance" [level=6] [ref=e309]
      - generic [ref=e310]:
        - generic [ref=e313]:
          - heading "Recent Documents" [level=6] [ref=e314]
          - list [ref=e315]:
            - listitem [ref=e316]:
              - generic [ref=e317]:
                - generic [ref=e318]: IT Compliance Quarterly Report Q1 2026
                - paragraph [ref=e319]: Quarterly Report • 4/4/2026
              - generic [ref=e321]: ready
            - listitem [ref=e322]:
              - generic [ref=e323]:
                - generic [ref=e324]: Finance Compliance Memo
                - paragraph [ref=e325]: Memo • 3/4/2026
              - generic [ref=e327]: ready
            - listitem [ref=e328]:
              - generic [ref=e329]:
                - generic [ref=e330]: IT Unit Incident Summary January 2026
                - paragraph [ref=e331]: Incident Report • 2/3/2026
              - generic [ref=e333]: ready
            - listitem [ref=e334]:
              - generic [ref=e335]:
                - generic [ref=e336]: Finance Annual Compliance Review 2025
                - paragraph [ref=e337]: Annual Review • 1/10/2026
              - generic [ref=e339]: ready
            - listitem [ref=e340]:
              - generic [ref=e341]:
                - generic [ref=e342]: Finance Compliance Report Q2 2025
                - paragraph [ref=e343]: Quarterly Report • 7/6/2025
              - generic [ref=e345]: ready
        - generic [ref=e348]:
          - heading "Compliance Overview" [level=6] [ref=e349]
          - generic [ref=e350]:
            - heading "100.0%" [level=2] [ref=e351]
            - paragraph [ref=e352]: Documents Ready
          - generic [ref=e353]:
            - paragraph [ref=e354]: "Documents by Status:"
            - generic [ref=e355]:
              - generic [ref=e356]:
                - paragraph [ref=e357]: "Ready:"
                - generic [ref=e359]: "7"
              - generic [ref=e360]:
                - paragraph [ref=e361]: "Pending:"
                - generic [ref=e363]: "0"
      - generic [ref=e367]:
        - heading "Quick Actions" [level=6] [ref=e368]
        - generic [ref=e369]:
          - link "Upload Document" [ref=e370] [cursor=pointer]:
            - /url: /dashboard/documents/upload
            - text: Upload Document
          - link "View Issuances" [ref=e371] [cursor=pointer]:
            - /url: /dashboard/issuances
            - text: View Issuances
          - link "View Issues" [ref=e372] [cursor=pointer]:
            - /url: /dashboard/tickets
            - text: View Issues
          - button "Clock Out (Pause My Tickets)" [disabled]
          - button "Show Clockout Bypass" [ref=e373] [cursor=pointer]: Show Clockout Bypass
          - button "Global Pause (Flag Ceremony)" [ref=e374] [cursor=pointer]: Global Pause (Flag Ceremony)
          - button "Global Resume" [ref=e375] [cursor=pointer]: Global Resume
```

# Test source

```ts
  41  |         ticketType: 'it_support',
  42  |         slaHours: 4,
  43  |         isActive: true
  44  |       }
  45  |     });
  46  |     expect(catRes.status()).toBe(201);
  47  |     const catData = await catRes.json();
  48  |     console.log('Created SLA Category:', catData);
  49  | 
  50  |     // 1. Create a baseline ticket to get an active ticket with an SLA deadline
  51  |     await loginPage.goto();
  52  |     await loginPage.login(accounts.user.email, accounts.user.password);
  53  |     await loginPage.closeCsatIfVisible();
  54  |     await loginPage.verifyDashboardVisible();
  55  |     await dashboardPage.navigateTo('Tickets');
  56  |     
  57  |     const activeSubject = `E2E Active Ticket ${Date.now()}`;
  58  |     await ticketsPage.createTicket(activeSubject, 'IT Support');
  59  |     await dashboardPage.logout();
  60  | 
  61  |     // Admin login
  62  |     await loginPage.goto();
  63  |     await loginPage.login(accounts.admin.email, accounts.admin.password);
  64  |     await loginPage.closeCsatIfVisible();
  65  |     await loginPage.verifyDashboardVisible();
  66  | 
  67  |     // Manually assign the baseline ticket to ensure SLA deadline is populated (bypassing auto-assign flakiness)
  68  |     await dashboardPage.navigateTo('Tickets');
  69  |     await ticketsPage.assignTicketToUserContaining(activeSubject, 'Godofredo');
  70  | 
  71  |     // Authenticate via API to get token
  72  |     const authRes2 = await request.post('/api/auth/login', {
  73  |       data: { email: accounts.admin.email, password: accounts.admin.password }
  74  |     });
  75  |     const authData2 = await authRes2.json();
  76  |     const token2 = authData2.accessToken;
  77  |     console.log("Admin User Role:", authData2.user.role, "RoleCode:", authData2.user.roleCode);
  78  |     expect(token2).toBeTruthy();
  79  | 
  80  |     // Fetch the baseline ticket to get its slaDeadline using the API
  81  |     let response = await request.get(`/api/tickets`, {
  82  |       headers: { Authorization: `Bearer ${token2}` }
  83  |     });
  84  |     let result = await response.json();
  85  |     let tickets = result.data || result;
  86  |     let baselineTicket = tickets.find((t: any) => t.subject === activeSubject);
  87  |     expect(baselineTicket).toBeTruthy();
  88  |     console.log("Baseline Ticket:", baselineTicket);
  89  |     const originalSlaDeadline = new Date(baselineTicket.slaDeadline).getTime();
  90  | 
  91  |     // 2. Trigger Global Pause via UI
  92  |     await dashboardPage.navigateTo('Dashboard');
  93  |     
  94  |     // We expect 2 dialogs: confirm, then alert
  95  |     let dialogCount = 0;
  96  |     page.on('dialog', async dialog => {
  97  |       dialogCount++;
  98  |       await dialog.accept();
  99  |     });
  100 | 
  101 |     const pauseResPromise = page.waitForResponse(res => res.url().includes('/api/tickets/global-pause'));
  102 |     await page.getByRole('button', { name: 'Global Pause (Flag Ceremony)' }).click();
  103 |     await pauseResPromise;
  104 |     
  105 |     // Wait for reload and UI to settle
  106 |     await page.waitForLoadState('networkidle');
  107 |     await page.waitForTimeout(2000);
  108 |     
  109 |     // Clean up dialog listener
  110 |     page.removeAllListeners('dialog');
  111 | 
  112 |     await dashboardPage.logout();
  113 | 
  114 |     // Wait exactly 15 seconds to simulate a stall period
  115 |     await page.waitForTimeout(15000);
  116 | 
  117 |     // 3. User creates a new ticket DURING the pause
  118 |     await loginPage.goto();
  119 |     await loginPage.login(accounts.user.email, accounts.user.password);
  120 |     await loginPage.closeCsatIfVisible();
  121 |     await loginPage.verifyDashboardVisible();
  122 |     await dashboardPage.navigateTo('Tickets');
  123 |     const pausedSubject = `E2E Paused Ticket ${Date.now()}`;
  124 |     await ticketsPage.createTicket(pausedSubject, 'IT Support');
  125 |     await dashboardPage.logout();
  126 | 
  127 |     // 4. Admin logs in to verify the paused ticket
  128 |     await loginPage.goto();
  129 |     await loginPage.login(accounts.admin.email, accounts.admin.password);
  130 |     await loginPage.closeCsatIfVisible();
  131 |     await loginPage.verifyDashboardVisible();
  132 |     
  133 |     // Check via API that the paused ticket is unassigned (Open)
  134 |     response = await request.get(`/api/tickets`, {
  135 |       headers: { Authorization: `Bearer ${token2}` }
  136 |     });
  137 |     result = await response.json();
  138 |     tickets = result.data || result;
  139 |     const pausedTicket = tickets.find((t: any) => t.subject === pausedSubject);
  140 |     expect(pausedTicket).toBeTruthy();
> 141 |     expect(pausedTicket.status).toBe('open'); // Auto-assignment shouldn't have fired
      |                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  142 |     expect(pausedTicket.assignedToId).toBeNull(); // Should be null
  143 | 
  144 |     // 5. Admin triggers Global Resume via UI
  145 |     await dashboardPage.navigateTo('Dashboard');
  146 |     
  147 |     // We expect 2 dialogs: confirm, then alert
  148 |     page.on('dialog', async dialog => {
  149 |       await dialog.accept();
  150 |     });
  151 | 
  152 |     const resumeResPromise = page.waitForResponse(res => res.url().includes('/api/tickets/global-resume'));
  153 |     await page.getByRole('button', { name: 'Global Resume' }).click();
  154 |     await resumeResPromise;
  155 |     
  156 |     // Wait for reload and UI to settle
  157 |     await page.waitForLoadState('networkidle');
  158 |     await page.waitForTimeout(2000);
  159 |     
  160 |     // Clean up dialog listener
  161 |     page.removeAllListeners('dialog');
  162 | 
  163 |     // 6. Verify SLA deadline was stalled
  164 |     response = await request.get(`/api/tickets`, {
  165 |       headers: { Authorization: `Bearer ${token2}` }
  166 |     });
  167 |     result = await response.json();
  168 |     tickets = result.data || result;
  169 |     const resumedBaselineTicket = tickets.find((t: any) => t.subject === activeSubject);
  170 |     expect(resumedBaselineTicket).toBeTruthy();
  171 | 
  172 |     const newSlaDeadline = new Date(resumedBaselineTicket.slaDeadline).getTime();
  173 |     
  174 |     // The difference should be ~15 seconds (15000ms), allow some buffer for execution time
  175 |     const diffMs = newSlaDeadline - originalSlaDeadline;
  176 |     
  177 |     // Log for debugging
  178 |     console.log(`Original SLA: ${new Date(originalSlaDeadline).toISOString()}`);
  179 |     console.log(`New SLA: ${new Date(newSlaDeadline).toISOString()}`);
  180 |     console.log(`Difference in ms: ${diffMs}`);
  181 | 
  182 |     // Diff should be at least 15000ms, and reasonably less than 60000ms
  183 |     expect(diffMs).toBeGreaterThanOrEqual(15000);
  184 |     expect(diffMs).toBeLessThan(60000);
  185 |   });
  186 | });
  187 | 
```