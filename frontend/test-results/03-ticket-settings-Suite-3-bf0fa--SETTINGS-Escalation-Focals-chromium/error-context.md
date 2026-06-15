# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-ticket-settings.spec.ts >> Suite 3 — TICKET SETTINGS >> Escalation Focals
- Location: frontend\tests\e2e\03-ticket-settings.spec.ts:64:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('option', { name: /Garcia/i })

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
              - paragraph [ref=e13]: Ticket Settings
        - button [ref=e15] [cursor=pointer]:
          - generic [ref=e16]: SA
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
            - generic [ref=e43]: Documents
        - listitem [ref=e44]:
          - button [ref=e45] [cursor=pointer]:
            - img [ref=e47]
            - generic [ref=e50]: Repository
        - listitem [ref=e51]:
          - button [ref=e52] [cursor=pointer]:
            - img [ref=e54]
            - generic [ref=e57]: Issuances
      - separator [ref=e58]
      - generic [ref=e59]: Administration
      - list [ref=e60]:
        - listitem [ref=e61]:
          - button [ref=e62] [cursor=pointer]:
            - img [ref=e64]
            - generic [ref=e67]: Units
        - listitem [ref=e68]:
          - button [ref=e69] [cursor=pointer]:
            - img [ref=e71]
            - generic [ref=e74]: Metrics
        - listitem [ref=e75]:
          - button [ref=e76] [cursor=pointer]:
            - img [ref=e78]
            - generic [ref=e82]: KPI
        - listitem [ref=e83]:
          - button [ref=e84] [cursor=pointer]:
            - img [ref=e86]
            - generic [ref=e89]: Ticket Settings
        - listitem [ref=e90]:
          - button [ref=e91] [cursor=pointer]:
            - img [ref=e93]
            - generic [ref=e96]: Ticket Reports
        - listitem [ref=e97]:
          - button [ref=e98] [cursor=pointer]:
            - img [ref=e100]
            - generic [ref=e103]: Attendance
        - listitem [ref=e104]:
          - button [ref=e105] [cursor=pointer]:
            - img [ref=e107]
            - generic [ref=e110]: Reviews
        - listitem [ref=e111]:
          - button [ref=e112] [cursor=pointer]:
            - img [ref=e114]
            - generic [ref=e117]: Reports
        - listitem [ref=e118]:
          - button [ref=e119] [cursor=pointer]:
            - img [ref=e121]
            - generic [ref=e124]: MoV Builder
      - separator [ref=e125]
      - list [ref=e126]:
        - listitem [ref=e127]:
          - button [ref=e128] [cursor=pointer]:
            - img [ref=e130]
            - generic [ref=e134]: User Manual
        - listitem [ref=e135]:
          - button [ref=e136] [cursor=pointer]:
            - img [ref=e138]
            - generic [ref=e141]: Settings
      - generic [ref=e142]:
        - paragraph [ref=e143]: System Admin
        - text: SUPER ADMIN
    - main [ref=e144]:
      - generic [ref=e147]:
        - heading [level=4] [ref=e148]: Ticket Settings
        - paragraph [ref=e149]: Manage support categories and keyword-based auto-shift rules
        - generic [ref=e150]:
          - tablist [ref=e153]:
            - tab [ref=e154] [cursor=pointer]: Categories (23)
            - tab [ref=e155] [cursor=pointer]: Keyword Rules (5)
            - tab [selected] [ref=e156] [cursor=pointer]: Escalation Focals (0)
          - generic [ref=e158]:
            - generic [ref=e159]:
              - paragraph [ref=e160]: Configure which roles act as escalation focal points per ticket type.
              - button [ref=e161] [cursor=pointer]:
                - img [ref=e163]
                - text: Add Focal
            - table [ref=e166]:
              - rowgroup [ref=e167]:
                - row [ref=e168]:
                  - columnheader [ref=e169]: Ticket Type
                  - columnheader [ref=e170]: Role
                  - columnheader [ref=e171]: Label
                  - columnheader [ref=e172]: Actions
              - rowgroup [ref=e173]:
                - row [ref=e174]:
                  - cell [ref=e175]:
                    - paragraph [ref=e176]: No escalation focals configured.
  - dialog [ref=e180]:
    - heading [level=2] [ref=e181]: Add Escalation Focal
    - generic [ref=e183]:
      - generic [ref=e184]:
        - generic [ref=e185]: Ticket Type *
        - generic [ref=e186]:
          - combobox [ref=e187] [cursor=pointer]: Desktop Support
          - textbox: desktop_support
          - img
          - group:
            - generic: Ticket Type *
      - generic [ref=e188]:
        - generic [ref=e189]: Role *
        - generic [ref=e190]:
          - combobox [expanded] [ref=e191] [cursor=pointer]
          - textbox
          - img
          - group:
            - generic: Role *
    - generic [ref=e192]:
      - button [ref=e193] [cursor=pointer]: Cancel
      - button [disabled]: Add
  - listbox "Role *" [ref=e196]:
    - option "Section Head (section_head)" [active] [ref=e197] [cursor=pointer]: Section Head (section_head)
    - option "Compliance Officer (compliance_officer)" [ref=e198] [cursor=pointer]: Compliance Officer (compliance_officer)
    - option "Cybersecurity Officer (cybersec)" [ref=e199] [cursor=pointer]: Cybersecurity Officer (cybersec)
    - option "Information Security Officer (infosec)" [ref=e200] [cursor=pointer]: Information Security Officer (infosec)
    - option "Lead Infrastructure Officer (lead_infra)" [ref=e201] [cursor=pointer]: Lead Infrastructure Officer (lead_infra)
    - option "Server Administrator (server_admin)" [ref=e202] [cursor=pointer]: Server Administrator (server_admin)
    - option "Database Administrator (db_admin)" [ref=e203] [cursor=pointer]: Database Administrator (db_admin)
    - option "Network Administrator (network_admin)" [ref=e204] [cursor=pointer]: Network Administrator (network_admin)
    - option "Project Manager (project_mgr)" [ref=e205] [cursor=pointer]: Project Manager (project_mgr)
    - option "Development Lead (dev_lead)" [ref=e206] [cursor=pointer]: Development Lead (dev_lead)
    - option "SQA Lead (sqa_lead)" [ref=e207] [cursor=pointer]: SQA Lead (sqa_lead)
    - option "Desktop Support Senior (desktop_sr)" [ref=e208] [cursor=pointer]: Desktop Support Senior (desktop_sr)
    - option "IT Support Senior (it_support_sr)" [ref=e209] [cursor=pointer]: IT Support Senior (it_support_sr)
    - option "Pantawid ICT Support (pantawid_ict)" [ref=e210] [cursor=pointer]: Pantawid ICT Support (pantawid_ict)
```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test';
  2  | 
  3  | export class TicketSettingsPage {
  4  |   readonly page: Page;
  5  | 
  6  |   constructor(page: Page) {
  7  |     this.page = page;
  8  |   }
  9  | 
  10 |   async navigateToTab(tabName: string) {
  11 |     const tab = this.page.getByRole('tab', { name: new RegExp(tabName, 'i') });
  12 |     await expect(tab).toBeVisible({ timeout: 10000 });
  13 |     await tab.click();
  14 |     await this.page.waitForTimeout(1000);
  15 |   }
  16 | 
  17 |   async addEscalationFocal(ticketType: string, focalRoleName: string) {
  18 |     await this.navigateToTab('Escalation Focals');
  19 |     
  20 |     // Check if it already exists in the table to avoid unique constraint errors
  21 |     const table = this.page.locator('table').first();
  22 |     const isExisting = await table.getByText(new RegExp(focalRoleName, 'i')).isVisible();
  23 |     if (isExisting) {
  24 |         return;
  25 |     }
  26 | 
  27 |     // Check if focal button is present
  28 |     const addBtn = this.page.locator('button', { hasText: /Add Focal|Create Focal/i }).first();
  29 |     if (await addBtn.isVisible()) {
  30 |         await addBtn.click();
  31 |         
  32 |         const dialog = this.page.locator('.MuiDialog-root');
  33 |         await expect(dialog).toBeVisible({ timeout: 5000 });
  34 | 
  35 |         // Select ticket type
  36 |         await dialog.getByLabel(/Ticket Type/i).first().click();
  37 |         await this.page.getByRole('option', { name: new RegExp(ticketType, 'i') }).click();
  38 | 
  39 |         // Select Role Value
  40 |         await dialog.locator('.MuiSelect-select').nth(1).click();
> 41 |         await this.page.getByRole('option', { name: new RegExp(focalRoleName, 'i') }).click();
     |                                                                                       ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  42 | 
  43 |         await dialog.getByRole('button', { name: /Add/i }).click();
  44 |         await expect(dialog).toBeHidden({ timeout: 10000 });
  45 |     }
  46 |   }
  47 | }
  48 | 
```