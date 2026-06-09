# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tickets.spec.ts >> Mobile View Tests >> Test 6: Mobile Friendliness and CSAT Ratings Flow
- Location: frontend\tests\e2e\tickets.spec.ts:747:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Dashboard' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('button', { name: 'Dashboard' })

```

```yaml
- banner:
  - button "open drawer"
  - navigation "breadcrumb":
    - list:
      - listitem:
        - paragraph: Dashboard
  - button "account of current user": TU
- main:
  - heading "Dashboard" [level=1]
  - paragraph: Welcome back, Test!
  - heading "5" [level=4]
  - paragraph: Open
  - heading "2" [level=4]
  - paragraph: In Progress
  - heading "2" [level=4]
  - paragraph: Resolved
  - heading "0" [level=4]
  - paragraph: Closed
  - heading "Client Satisfaction" [level=6]
  - paragraph: Satisfaction forms filled
  - paragraph: 0%
  - progressbar
  - paragraph: 2 resolved tickets awaiting your satisfaction rating
  - button "Rate Now"
  - heading "Quick Actions" [level=6]
  - button "My Tickets"
  - button "Fill Client Satisfaction (2)"
```

# Test source

```ts
  12  |   desktopSr:      { email: 'mpmabazza@dswd.gov.ph',   role: 'desktop_sr',  id: 7 },
  13  |   escalationFocal:{ email: 'jmmmaguigad@dswd.gov.ph', role: 'cybersec',    id: 10 }, // cybersec → is_escalation_focal=1
  14  |   admin:          { email: 'admin@rictms.gov.ph',      role: 'super_admin', id: 1  },
  15  | };
  16  | 
  17  | // ─── DB helpers ───────────────────────────────────────────────────────────────
  18  | async function getDb(database = 'compliance_hub_ticketing') {
  19  |   return mysql.createConnection({
  20  |     host: 'localhost',
  21  |     port: 3307,
  22  |     user: 'root',
  23  |     password: 'admin',
  24  |     database,
  25  |     multipleStatements: true,
  26  |   });
  27  | }
  28  | 
  29  | /**
  30  |  * Mark the given user IDs as PRESENT in the attendance table for today.
  31  |  * The ticketing service reads from compliance_hub_users.attendance via a cross-DB view.
  32  |  * We write directly to the source table.
  33  |  */
  34  | async function markPresent(userIds: number[]) {
  35  |   const conn = await getDb('compliance_hub_users');
  36  |   const today = new Date().toISOString().slice(0, 10);
  37  |   for (const userId of userIds) {
  38  |     const id = crypto.randomUUID();
  39  |     await conn.execute(
  40  |       `INSERT INTO attendance (id, user_id, date, status, set_by_id, notes, created_at)
  41  |        VALUES (?, ?, ?, 'present', 1, 'e2e-test', NOW())
  42  |        ON DUPLICATE KEY UPDATE status='present'`,
  43  |       [id, userId, today]
  44  |     );
  45  |   }
  46  |   await conn.end();
  47  | }
  48  | 
  49  | /**
  50  |  * Remove any test-injected attendance records for today
  51  |  */
  52  | async function cleanAttendance(userIds: number[]) {
  53  |   const conn = await getDb('compliance_hub_users');
  54  |   const today = new Date().toISOString().slice(0, 10);
  55  |   await conn.execute(
  56  |     `DELETE FROM attendance WHERE user_id IN (${userIds.join(',')}) AND date = ? AND notes = 'e2e-test'`,
  57  |     [today]
  58  |   );
  59  |   await conn.end();
  60  | }
  61  | 
  62  | /**
  63  |  * Manipulate a ticket's created_at and sla_deadline so it appears overdue.
  64  |  * Pass revert=true to restore to current timestamps.
  65  |  */
  66  | async function forceTicketOverdue(ticketId: string, revert = false) {
  67  |   const conn = await getDb();
  68  |   if (revert) {
  69  |     await conn.execute(
  70  |       `UPDATE tickets SET created_at = NOW(), sla_deadline = DATE_ADD(NOW(), INTERVAL 3 DAY) WHERE id = ?`,
  71  |       [ticketId]
  72  |     );
  73  |   } else {
  74  |     // Set created 10 days ago, sla_deadline 5 days ago → clearly overdue
  75  |     await conn.execute(
  76  |       `UPDATE tickets
  77  |        SET created_at   = DATE_SUB(NOW(), INTERVAL 10 DAY),
  78  |            sla_deadline = DATE_SUB(NOW(), INTERVAL 5 DAY)
  79  |        WHERE id = ?`,
  80  |       [ticketId]
  81  |     );
  82  |   }
  83  |   await conn.end();
  84  | }
  85  | 
  86  | async function forceTicketNearingSLA(ticketId: string) {
  87  |   const conn = await getDb();
  88  |   // Set created 10 days ago, sla_deadline in 1 hour → 99% elapsed, nearing SLA
  89  |   await conn.execute(
  90  |     `UPDATE tickets 
  91  |      SET created_at = DATE_SUB(NOW(), INTERVAL 10 DAY), 
  92  |          sla_deadline = DATE_ADD(NOW(), INTERVAL 1 HOUR) 
  93  |      WHERE id = ?`,
  94  |     [ticketId]
  95  |   );
  96  |   await conn.end();
  97  | }
  98  | 
  99  | // ─── UI helpers ───────────────────────────────────────────────────────────────
  100 | async function login(page: Page, email: string, pass: string = PASSWORD) {
  101 |   await page.goto('/login');
  102 |   const emailInput = page.locator('input[type="email"]');
  103 |   await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  104 |   if (await emailInput.isVisible()) {
  105 |     await emailInput.fill(email);
  106 |     await page.locator('input[type="password"]').fill(pass);
  107 |     await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  108 |   }
  109 |   if (await page.getByRole('button', { name: 'Rate Now' }).isVisible()) {
  110 |     await page.getByRole('button', { name: 'Close' }).click();
  111 |   }
> 112 |   await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  113 |   //await page.waitForSelector('h4, h5, h6', { timeout: 25000 });
  114 | }
  115 | 
  116 | async function logout(page: Page) {
  117 |   const avatar = page.locator('button[aria-label="account of current user"]');
  118 |   try {
  119 |     await avatar.waitFor({ state: 'visible', timeout: 5000 });
  120 |     await avatar.click();
  121 |     await page.waitForTimeout(300);
  122 |     await page.getByText('Logout').click();
  123 |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
  124 |   } catch {
  125 |     // Already logged out or on login page
  126 |   }
  127 | }
  128 | 
  129 | async function createTicket(page: Page, subject: string) {
  130 |   const newTicketBtn = page.getByRole('button', { name: 'New Ticket' });
  131 |   await expect(newTicketBtn).toBeVisible({ timeout: 15000 });
  132 |   await page.waitForTimeout(1000); // Give dashboard time to settle
  133 |   await newTicketBtn.click();
  134 |   
  135 |   await expect(page.locator('.MuiDialog-root')).toBeVisible({ timeout: 10000 });
  136 |   await page.waitForTimeout(1000); // Wait for dialog animation
  137 | 
  138 |   const subjectInput = page.getByRole('textbox', { name: /Subject/i });
  139 |   await expect(subjectInput).toBeVisible({ timeout: 10000 });
  140 |   await subjectInput.fill(subject);
  141 | 
  142 |   await page.getByRole('textbox', { name: /Description/i }).fill('E2E automated test ticket.');
  143 | 
  144 |   // Select Desktop Support category card
  145 |   const desktopSupportCard = page.locator('.MuiDialog-root').getByText('Desktop Support').first();
  146 |   if (await desktopSupportCard.isVisible({ timeout: 3000 })) {
  147 |     await desktopSupportCard.click();
  148 |   }
  149 | 
  150 |   await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  151 |   await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
  152 |   await page.waitForTimeout(500);
  153 | }
  154 | 
  155 | // ─── Tests ────────────────────────────────────────────────────────────────────
  156 | test.describe('Ticketing Lifecycle and SLA Tests', () => {
  157 |   test.setTimeout(180000); // 3 minutes for complex multi-role flows
  158 | 
  159 |   test.beforeEach(async () => {
  160 |     // Truncate tickets table before each test so test user can create a new ticket
  161 |     const db = await getDb();
  162 |     await db.query('DELETE FROM ticket_events');
  163 |     await db.query('DELETE FROM ticket_comments');
  164 |     await db.query('DELETE FROM ticket_escalations');
  165 |     await db.query('DELETE FROM tickets');
  166 | 
  167 |     // Seed escalation focals for tests
  168 |     await db.query('DELETE FROM escalation_focal_configs');
  169 |     await db.query(`INSERT INTO escalation_focal_configs (id, ticket_type, role_value, label, created_by_id, created_at) VALUES 
  170 |       (1, 'desktop_support', 'desktop_sr', 'Mabazza (Desktop Sr)', 1, NOW()),
  171 |       (2, 'desktop_support', 'cybersec', 'Maguigad (CyberSec)', 1, NOW())
  172 |     `);
  173 | 
  174 |     await db.end();
  175 |   });
  176 | 
  177 |   // ── Test 1: Full Lifecycle ──────────────────────────────────────────────────
  178 |   test('Test 1: Full Lifecycle (User → Auto-Assign → Escalate x2 → Resolve → Rate)', async ({ page }) => {
  179 |     const subject = `E2E Full Lifecycle ${Date.now()}`;
  180 | 
  181 |     // Before: mark all technicians as present so escalation and assignment are allowed
  182 |     await markPresent([ACCOUNTS.desktopJr.id, ACCOUNTS.desktopSr.id, ACCOUNTS.escalationFocal.id]);
  183 | 
  184 |     // 1. User creates a ticket ────────────────────────────────────────────────────────
  185 |     await login(page, ACCOUNTS.user.email);
  186 |     await page.goto('/dashboard/tickets');
  187 |     await createTicket(page, subject);
  188 | 
  189 |     
  190 | 
  191 |     // Locate ticket row and navigate to detail
  192 |     const row = page.locator('tr', { hasText: subject }).first();
  193 |     await expect(row).toBeVisible({ timeout: 15000 });
  194 |     await row.getByRole('button', { name: 'View Details' }).click();
  195 | 
  196 |     const url = page.url();
  197 |     const createdTicketId = url.split('/').pop() || '';
  198 |     expect(createdTicketId).toBeTruthy();
  199 |     console.log('Created ticket:', createdTicketId);
  200 | 
  201 |     await logout(page);
  202 | 
  203 |     // 2. Desktop Jr Tech → Escalate to Desktop Sr ───────────────────────────
  204 |     // (System may auto-assign to desktopJr; if not, desktopJr can still escalate
  205 |     //  because desktop_jr has is_desktop=1 → canEscalateTickets=true)
  206 |     await login(page, ACCOUNTS.desktopJr.email);
  207 |     await page.goto(`/dashboard/tickets/${createdTicketId}`);
  208 |     await expect(page.getByText(subject)).toBeVisible({ timeout: 10000 });
  209 |     await page.waitForTimeout(300);
  210 | 
  211 |     const escalateBtnJr = page.getByRole('button', { name: 'Escalate Ticket' }).first();
  212 |     if (await escalateBtnJr.isVisible({ timeout: 5000 })) {
```