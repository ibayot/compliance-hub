# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tickets.spec.ts >> Ticketing Lifecycle and SLA Tests >> Test 1: Full Lifecycle (User → Auto-Assign → Escalate x2 → Resolve → Rate)
- Location: frontend\tests\e2e\tickets.spec.ts:174:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Dashboard').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('text=Dashboard').first()

```

```yaml
- heading "RICTMS Compliance Hub" [level=1]
- paragraph: Sign in to your account
- text: Email
- textbox "Email": test@dswd.gov.ph
- text: Password
- textbox "Password": password123
- button "Sign In"
- separator: or
- button "Mag-sign in sa Google. Magbubukas sa bagong tab":
  - img
  - text: Mag-sign in sa Google
- iframe
- text: RICTMS Internal Use Only
```

# Test source

```ts
  9   | const ACCOUNTS = {
  10  |   user:           { email: 'test@dswd.gov.ph',        role: 'user',        id: 95 },
  11  |   desktopJr:      { email: 'jrcardona@dswd.gov.ph',   role: 'desktop_jr',  id: 6 },
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
> 109 |   await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
      |                                                        ^ Error: expect(locator).toBeVisible() failed
  110 | }
  111 | 
  112 | async function logout(page: Page) {
  113 |   const avatar = page.locator('button[aria-label="account of current user"]');
  114 |   try {
  115 |     await avatar.waitFor({ state: 'visible', timeout: 5000 });
  116 |     await avatar.click();
  117 |     await page.waitForTimeout(300);
  118 |     await page.getByText('Logout').click();
  119 |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
  120 |   } catch {
  121 |     // Already logged out or on login page
  122 |   }
  123 | }
  124 | 
  125 | async function createTicket(page: Page, subject: string) {
  126 |   const newTicketBtn = page.getByRole('button', { name: 'New Ticket' });
  127 |   await expect(newTicketBtn).toBeVisible({ timeout: 15000 });
  128 |   await page.waitForTimeout(1000); // Give dashboard time to settle
  129 |   await newTicketBtn.click();
  130 |   
  131 |   await expect(page.locator('.MuiDialog-root')).toBeVisible({ timeout: 10000 });
  132 |   await page.waitForTimeout(1000); // Wait for dialog animation
  133 | 
  134 |   const subjectInput = page.getByRole('textbox', { name: /Subject/i });
  135 |   await expect(subjectInput).toBeVisible({ timeout: 10000 });
  136 |   await subjectInput.fill(subject);
  137 | 
  138 |   await page.getByRole('textbox', { name: /Description/i }).fill('E2E automated test ticket.');
  139 | 
  140 |   // Select Desktop Support category card
  141 |   const desktopSupportCard = page.locator('.MuiDialog-root').getByText('Desktop Support').first();
  142 |   if (await desktopSupportCard.isVisible({ timeout: 3000 })) {
  143 |     await desktopSupportCard.click();
  144 |   }
  145 | 
  146 |   await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  147 |   await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
  148 |   await page.waitForTimeout(500);
  149 | }
  150 | 
  151 | // ─── Tests ────────────────────────────────────────────────────────────────────
  152 | test.describe('Ticketing Lifecycle and SLA Tests', () => {
  153 |   test.setTimeout(180000); // 3 minutes for complex multi-role flows
  154 | 
  155 |   test.beforeEach(async () => {
  156 |     // Truncate tickets table before each test so test user can create a new ticket
  157 |     const db = await getDb();
  158 |     await db.query('DELETE FROM ticket_events');
  159 |     await db.query('DELETE FROM ticket_comments');
  160 |     await db.query('DELETE FROM ticket_escalations');
  161 |     await db.query('DELETE FROM tickets');
  162 | 
  163 |     // Seed escalation focals for tests
  164 |     await db.query('DELETE FROM escalation_focal_configs');
  165 |     await db.query(`INSERT INTO escalation_focal_configs (id, ticket_type, role_value, label, created_by_id, created_at) VALUES 
  166 |       (1, 'desktop_support', 'desktop_sr', 'Mabazza (Desktop Sr)', 1, NOW()),
  167 |       (2, 'desktop_support', 'cybersec', 'Maguigad (CyberSec)', 1, NOW())
  168 |     `);
  169 | 
  170 |     await db.end();
  171 |   });
  172 | 
  173 |   // ── Test 1: Full Lifecycle ──────────────────────────────────────────────────
  174 |   test('Test 1: Full Lifecycle (User → Auto-Assign → Escalate x2 → Resolve → Rate)', async ({ page }) => {
  175 |     const subject = `E2E Full Lifecycle ${Date.now()}`;
  176 | 
  177 |     // Before: mark all technicians as present so escalation and assignment are allowed
  178 |     await markPresent([ACCOUNTS.desktopJr.id, ACCOUNTS.desktopSr.id, ACCOUNTS.escalationFocal.id]);
  179 | 
  180 |     // 1. User creates a ticket ────────────────────────────────────────────────────────
  181 |     await login(page, ACCOUNTS.user.email);
  182 |     await page.goto('/dashboard/tickets');
  183 |     await createTicket(page, subject);
  184 | 
  185 |     
  186 | 
  187 |     // Locate ticket row and navigate to detail
  188 |     const row = page.locator('tr', { hasText: subject }).first();
  189 |     await expect(row).toBeVisible({ timeout: 15000 });
  190 |     await row.getByRole('button', { name: 'View Details' }).click();
  191 | 
  192 |     const url = page.url();
  193 |     const createdTicketId = url.split('/').pop() || '';
  194 |     expect(createdTicketId).toBeTruthy();
  195 |     console.log('Created ticket:', createdTicketId);
  196 | 
  197 |     await logout(page);
  198 | 
  199 |     // 2. Desktop Jr Tech → Escalate to Desktop Sr ───────────────────────────
  200 |     // (System may auto-assign to desktopJr; if not, desktopJr can still escalate
  201 |     //  because desktop_jr has is_desktop=1 → canEscalateTickets=true)
  202 |     await login(page, ACCOUNTS.desktopJr.email);
  203 |     await page.goto(`/dashboard/tickets/${createdTicketId}`);
  204 |     await expect(page.getByText(subject)).toBeVisible({ timeout: 10000 });
  205 |     await page.waitForTimeout(300);
  206 | 
  207 |     const escalateBtnJr = page.getByRole('button', { name: 'Escalate Ticket' }).first();
  208 |     if (await escalateBtnJr.isVisible({ timeout: 5000 })) {
  209 |       await escalateBtnJr.click();
```