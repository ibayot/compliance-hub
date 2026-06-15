# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-ticket-lifecycle.spec.ts >> Suite 4 — TICKET LIFE CYCLE >> Escalation & De-Escalation (Round 2)
- Location: frontend\tests\e2e\04-ticket-lifecycle.spec.ts:143:7

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
      - separator [ref=e37]
      - generic [ref=e38]: Administration
      - list [ref=e39]:
        - listitem [ref=e40]:
          - button [ref=e41] [cursor=pointer]:
            - img [ref=e43]
            - generic [ref=e46]: Ticket Reports
        - listitem [ref=e47]:
          - button [ref=e48] [cursor=pointer]:
            - img [ref=e50]
            - generic [ref=e53]: Attendance
      - separator [ref=e55]
      - list [ref=e56]:
        - listitem [ref=e57]:
          - button [ref=e58] [cursor=pointer]:
            - img [ref=e60]
            - generic [ref=e64]: User Manual
        - listitem [ref=e65]:
          - button [ref=e66] [cursor=pointer]:
            - img [ref=e68]
            - generic [ref=e71]: Settings
      - generic [ref=e72]:
        - paragraph [ref=e73]: Jaymark Cardona
        - text: DESKTOP JR
    - main [ref=e74]:
      - generic [ref=e77]:
        - button [ref=e78] [cursor=pointer]:
          - img [ref=e80]
          - text: Back to Tickets
        - generic [ref=e84]:
          - generic [ref=e85]:
            - text: TKT-2026-0006
            - heading [level=5] [ref=e86]: E2E Proxy 1781511249540
            - generic [ref=e87]:
              - generic [ref=e89]: IT Support
              - generic [ref=e91]: "Priority: Not Set"
              - generic [ref=e93]: ASSIGNED
          - generic [ref=e94]:
            - button [ref=e95] [cursor=pointer]: Update Status
            - button [ref=e96] [cursor=pointer]: Escalate Ticket
        - generic [ref=e97]:
          - generic [ref=e100]:
            - heading [level=6] [ref=e101]: Description
            - paragraph [ref=e102]: E2E automated test ticket.
          - generic [ref=e105]:
            - heading [level=6] [ref=e106]: Details
            - generic [ref=e107]:
              - generic [ref=e108]:
                - text: Ticket Number
                - paragraph [ref=e109]: TKT-2026-0006
              - generic [ref=e110]:
                - text: Requested For
                - paragraph [ref=e111]: Jaymark Cardona
              - generic [ref=e112]:
                - text: Filed By (Proxy)
                - paragraph [ref=e113]: System Admin
              - generic [ref=e114]:
                - text: Assigned To
                - paragraph [ref=e115]: Marc Jayson D Ibay
              - generic [ref=e116]:
                - text: Created
                - paragraph [ref=e117]: 6/16/2026, 12:14:15 AM
        - generic [ref=e119]:
          - heading [level=6] [ref=e120]: Escalation Details
          - paragraph [ref=e121]: No escalations for this ticket.
        - generic [ref=e123]:
          - heading [level=6] [ref=e124]: Comments (0)
          - paragraph [ref=e125]: No comments yet.
          - generic [ref=e126]:
            - separator [ref=e127]
            - generic [ref=e128]:
              - generic: Add a comment
              - generic [ref=e129]:
                - textbox [ref=e130]
                - group:
                  - generic: Add a comment
            - generic [ref=e131] [cursor=pointer]:
              - checkbox [ref=e134]
              - generic [ref=e137]: Internal note (hidden from requester)
            - generic [ref=e138]:
              - button [disabled]: Add Comment
        - generic [ref=e140]:
          - heading [level=6] [ref=e141]: Timeline
          - generic [ref=e142]:
            - generic [ref=e147]:
              - paragraph [ref=e148]: Auto-Assigned
              - text: by Automatic Ticket Assignment
              - generic [ref=e149]: → Marc Jayson D Ibay
              - generic [ref=e150]: 6/16/2026, 12:14:15 AM
            - generic [ref=e154]:
              - paragraph [ref=e155]: Ticket Created
              - text: by System Admin
              - generic [ref=e156]: 6/16/2026, 12:14:15 AM
  - dialog [ref=e160]:
    - heading [level=2] [ref=e161]: Escalate Ticket
    - generic [ref=e162]:
      - alert [ref=e163]:
        - img [ref=e165]
        - generic [ref=e167]: Escalate this ticket to a designated focal technician or senior staff. You may attach photo proof of the issue.
      - generic [ref=e168]:
        - generic [ref=e169]: Escalate To
        - generic [ref=e170]:
          - combobox [expanded] [ref=e171] [cursor=pointer]
          - textbox
          - img
          - group:
            - generic: Escalate To
      - generic [ref=e172]:
        - generic: Reason for escalation (optional)
        - generic [ref=e173]:
          - textbox [ref=e174]
          - group:
            - generic: Reason for escalation (optional)
      - generic [ref=e175]:
        - generic [ref=e176]: Proof photos (optional, max 10 files, 10 MB each)
        - button [ref=e177] [cursor=pointer]:
          - img [ref=e179]
          - text: Upload Proof Photo(s)
    - generic [ref=e181]:
      - button [ref=e182] [cursor=pointer]: Cancel
      - button [disabled]: Escalate
  - listbox "Escalate To" [ref=e185]:
    - option "Jaylord Bucayu" [active] [ref=e186] [cursor=pointer]: Jaylord Bucayu
    - option "Bernardo Juan" [ref=e187] [cursor=pointer]: Bernardo Juan
    - option "John Manuel Maguigad" [ref=e188] [cursor=pointer]: John Manuel Maguigad
    - option "Godofredo Javier" [ref=e189] [cursor=pointer]: Godofredo Javier
```

# Test source

```ts
  23  |     await expect(dialog).toBeVisible({ timeout: 10000 });
  24  |     await this.page.waitForTimeout(1000); 
  25  | 
  26  |     const subjectInput = this.page.getByRole('textbox', { name: /Subject/i });
  27  |     await subjectInput.fill(subject);
  28  |     await this.page.getByRole('textbox', { name: /Description/i }).fill('E2E automated test ticket.');
  29  | 
  30  |     if (requestedForEmail) {
  31  |       const reqForInput = dialog.getByLabel(/Requested For/i);
  32  |       await reqForInput.fill(requestedForEmail);
  33  |       await this.page.waitForTimeout(1500);
  34  |       const option = this.page.locator('.MuiAutocomplete-listbox li').first();
  35  |       await expect(option).toBeVisible({ timeout: 5000 });
  36  |       await option.click();
  37  |     }
  38  | 
  39  |     const categoryCard = dialog.locator('.MuiCard-root', { hasText: categoryName }).first();
  40  |     await expect(categoryCard).toBeVisible({ timeout: 5000 });
  41  |     await categoryCard.click();
  42  | 
  43  |     await this.page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  44  |     await expect(dialog).toBeHidden({ timeout: 15000 });
  45  |     await this.page.waitForTimeout(1000);
  46  |   }
  47  | 
  48  |   async openTicket(subject: string) {
  49  |     const row = this.page.locator('tr', { hasText: subject }).first();
  50  |     try {
  51  |       await expect(row).toBeVisible({ timeout: 7000 });
  52  |     } catch {
  53  |       // Fallback: check Open Tickets (Queue) tab if not in Assigned to Me
  54  |       const openTab = this.page.getByRole('tab', { name: /Open Tickets/i });
  55  |       if (await openTab.isVisible()) {
  56  |         await openTab.click();
  57  |         await this.page.waitForLoadState('networkidle');
  58  |         await expect(row).toBeVisible({ timeout: 7000 });
  59  |       } else {
  60  |         throw new Error(`Ticket with subject "${subject}" not found.`);
  61  |       }
  62  |     }
  63  |     await row.getByRole('button', { name: 'View Details' }).click();
  64  |     await this.page.waitForLoadState('networkidle');
  65  |   }
  66  | 
  67  |   async assignTicketToUserContaining(subject: string, nameSubstring: string) {
  68  |     // Requires admin/ticket admin rights
  69  |     const row = this.page.locator('tr', { hasText: subject }).first();
  70  |     await expect(row).toBeVisible({ timeout: 15000 });
  71  |     
  72  |     // The assign button is a primary colored icon button inside the row
  73  |     const assignBtn = row.locator('button.MuiIconButton-colorPrimary').first();
  74  |     await assignBtn.click();
  75  |     
  76  |     const dialog = this.page.locator('.MuiDialog-root').first();
  77  |     await expect(dialog).toBeVisible({ timeout: 5000 });
  78  | 
  79  |     await dialog.getByLabel(/Technician/i).first().click();
  80  |     // Use regex to find the option with the partial name
  81  |     await this.page.getByRole('option', { name: new RegExp(nameSubstring, 'i') }).click();
  82  | 
  83  |     await dialog.getByRole('button', { name: /Assign|Reassign/i }).click();
  84  |     await expect(dialog).toBeHidden({ timeout: 10000 });
  85  |   }
  86  | 
  87  |   async updateStatus(newStatus: string, notes?: string, priority?: string) {
  88  |     const updateBtn = this.page.getByRole('button', { name: 'Update Status' });
  89  |     await updateBtn.waitFor({ state: 'visible' });
  90  |     await updateBtn.click();
  91  |     
  92  |     // Wait for inline editor instead of dialog
  93  |     const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true });
  94  |     await expect(saveBtn).toBeVisible({ timeout: 5000 });
  95  | 
  96  |     // Open Status select
  97  |     await this.page.locator('div[id="mui-component-select-status"], label:has-text("Status") + div').click();
  98  |     await this.page.getByRole('option', { name: new RegExp(`^${newStatus}$`, 'i') }).click();
  99  | 
  100 |     if (priority) {
  101 |       await this.page.locator('label:has-text("Priority") + div').click();
  102 |       await this.page.getByRole('option', { name: new RegExp(`^${priority}$`, 'i') }).click();
  103 |     }
  104 | 
  105 |     if (notes) {
  106 |       await this.page.getByLabel(/Resolution Notes/i).fill(notes);
  107 |     }
  108 | 
  109 |     await saveBtn.click();
  110 |     await expect(saveBtn).toBeHidden({ timeout: 5000 });
  111 |     await this.page.waitForTimeout(1000);
  112 |   }
  113 | 
  114 |   async escalateTicket(reason: string, targetRole: string) {
  115 |     const escalateBtn = this.page.getByRole('button', { name: 'Escalate Ticket' }).first();
  116 |     await escalateBtn.waitFor({ state: 'visible' });
  117 |     await escalateBtn.click();
  118 |     
  119 |     const dialog = this.page.locator('.MuiDialog-root');
  120 |     await expect(dialog).toBeVisible({ timeout: 5000 });
  121 | 
  122 |     await dialog.locator('.MuiSelect-select').first().click();
> 123 |     await this.page.getByRole('option', { name: new RegExp(targetRole, 'i') }).click();
      |                                                                                ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  124 |     await this.page.getByLabel(/Reason/i).fill(reason);
  125 |     
  126 |     await this.page.getByRole('button', { name: 'Escalate', exact: true }).click();
  127 |     await expect(dialog).toBeHidden({ timeout: 5000 });
  128 |     await this.page.waitForTimeout(1000);
  129 |   }
  130 | 
  131 |   async returnTicket(reason: string) {
  132 |     const returnBtn = this.page.getByRole('button', { name: 'Return', exact: true });
  133 |     await returnBtn.waitFor({ state: 'visible' });
  134 |     await returnBtn.click();
  135 | 
  136 |     const dialog = this.page.locator('.MuiDialog-root');
  137 |     await expect(dialog).toBeVisible({ timeout: 5000 });
  138 | 
  139 |     await this.page.getByLabel(/Reason/i).fill(reason);
  140 |     await this.page.getByRole('button', { name: 'Return Ticket', exact: true }).click();
  141 |     await expect(dialog).toBeHidden({ timeout: 5000 });
  142 |     await this.page.waitForTimeout(1000);
  143 |   }
  144 | 
  145 |   async rateTicket() {
  146 |     const rateBtn = this.page.getByRole('button', { name: /Rate Resolution/i });
  147 |     if (await rateBtn.isVisible({ timeout: 5000 })) {
  148 |       await rateBtn.click();
  149 |       
  150 |       const dialog = this.page.locator('.MuiDialog-root');
  151 |       await expect(dialog).toBeVisible({ timeout: 5000 });
  152 | 
  153 |       await this.page.getByRole('checkbox', { name: /consent/i }).check();
  154 |       await this.page.getByRole('combobox', { name: /Unit\/Section/i }).fill('Test');
  155 |       await this.page.getByRole('textbox', { name: /First Name/i }).fill('Juan');
  156 |       await this.page.getByRole('textbox', { name: /Last Name/i }).fill('Dela');
  157 |       await this.page.getByRole('spinbutton', { name: /Age/i }).fill('30');
  158 |       await this.page.getByRole('textbox', { name: /Religion/i }).fill('None');
  159 |       
  160 |       await this.page.getByLabel(/Sex \*/i).click();
  161 |       await this.page.getByRole('option', { name: 'Male', exact: true }).click();
  162 |       
  163 |       const toggleGroups = await this.page.getByRole('group').all();
  164 |       for (const group of toggleGroups) {
  165 |         const btn5 = group.locator('button[value="5"]');
  166 |         if (await btn5.isVisible()) await btn5.click();
  167 |       }
  168 |       
  169 |       await this.page.getByRole('button', { name: 'Submit Feedback' }).click();
  170 |       await expect(dialog).toBeHidden({ timeout: 10000 });
  171 |     }
  172 |   }
  173 | 
  174 |   async acceptTicket() {
  175 |       // If there's an accept button when assigned to a group or escalation
  176 |       const acceptBtn = this.page.getByRole('button', { name: 'Accept Ticket', exact: true });
  177 |       if (await acceptBtn.isVisible({ timeout: 5000 })) {
  178 |           await acceptBtn.click();
  179 |           await this.page.waitForTimeout(1000);
  180 |       }
  181 |   }
  182 |   async waitForStatus(status: string) {
  183 |     // Wait for the status chip to update (e.g. "IN PROGRESS", "RESOLVED")
  184 |     const statusChip = this.page.locator('.MuiChip-label', { hasText: new RegExp(`^${status.replace('_', ' ')}$`, 'i') });
  185 |     await expect(statusChip).toBeVisible({ timeout: 10000 });
  186 |   }
  187 | }
  188 | 
```