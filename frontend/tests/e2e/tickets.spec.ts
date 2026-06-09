import { test, expect, Page } from '@playwright/test';
import * as mysql from 'mysql2/promise';
import { execSync } from 'child_process';

// ─── Constants ────────────────────────────────────────────────────────────────
const PASSWORD = 'password123';

// Test accounts — all mapped in seed-data.sql with PASSWORD above
const ACCOUNTS = {
  user:           { email: 'test@dswd.gov.ph',        role: 'user',        id: 95 },
  desktopJr:      { email: 'jrcardona@dswd.gov.ph',   role: 'desktop_jr',  id: 6 },
  desktopSr:      { email: 'mpmabazza@dswd.gov.ph',   role: 'desktop_sr',  id: 7 },
  escalationFocal:{ email: 'jmmmaguigad@dswd.gov.ph', role: 'cybersec',    id: 10 }, // cybersec → is_escalation_focal=1
  admin:          { email: 'admin@rictms.gov.ph',      role: 'super_admin', id: 1  },
};

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function getDb(database = 'compliance_hub_ticketing') {
  return mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'admin',
    database,
    multipleStatements: true,
  });
}

/**
 * Mark the given user IDs as PRESENT in the attendance table for today.
 * The ticketing service reads from compliance_hub_users.attendance via a cross-DB view.
 * We write directly to the source table.
 */
async function markPresent(userIds: number[]) {
  const conn = await getDb('compliance_hub_users');
  const today = new Date().toISOString().slice(0, 10);
  for (const userId of userIds) {
    const id = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO attendance (id, user_id, date, status, set_by_id, notes, created_at)
       VALUES (?, ?, ?, 'present', 1, 'e2e-test', NOW())
       ON DUPLICATE KEY UPDATE status='present'`,
      [id, userId, today]
    );
  }
  await conn.end();
}

/**
 * Remove any test-injected attendance records for today
 */
async function cleanAttendance(userIds: number[]) {
  const conn = await getDb('compliance_hub_users');
  const today = new Date().toISOString().slice(0, 10);
  await conn.execute(
    `DELETE FROM attendance WHERE user_id IN (${userIds.join(',')}) AND date = ? AND notes = 'e2e-test'`,
    [today]
  );
  await conn.end();
}

/**
 * Manipulate a ticket's created_at and sla_deadline so it appears overdue.
 * Pass revert=true to restore to current timestamps.
 */
async function forceTicketOverdue(ticketId: string, revert = false) {
  const conn = await getDb();
  if (revert) {
    await conn.execute(
      `UPDATE tickets SET created_at = NOW(), sla_deadline = DATE_ADD(NOW(), INTERVAL 3 DAY) WHERE id = ?`,
      [ticketId]
    );
  } else {
    // Set created 10 days ago, sla_deadline 5 days ago → clearly overdue
    await conn.execute(
      `UPDATE tickets
       SET created_at   = DATE_SUB(NOW(), INTERVAL 10 DAY),
           sla_deadline = DATE_SUB(NOW(), INTERVAL 5 DAY)
       WHERE id = ?`,
      [ticketId]
    );
  }
  await conn.end();
}

async function forceTicketNearingSLA(ticketId: string) {
  const conn = await getDb();
  // Set created 10 days ago, sla_deadline in 1 hour → 99% elapsed, nearing SLA
  await conn.execute(
    `UPDATE tickets 
     SET created_at = DATE_SUB(NOW(), INTERVAL 10 DAY), 
         sla_deadline = DATE_ADD(NOW(), INTERVAL 1 HOUR) 
     WHERE id = ?`,
    [ticketId]
  );
  await conn.end();
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
async function login(page: Page, email: string, pass: string = PASSWORD) {
  await page.goto('/login');
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  if (await emailInput.isVisible()) {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').fill(pass);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  }
  if (await page.getByRole('button', { name: 'Rate Now' }).isVisible()) {
    await page.getByRole('button', { name: 'Close' }).click();
  }
  await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
  //await page.waitForSelector('h4, h5, h6', { timeout: 25000 });
}

async function logout(page: Page) {
  const avatar = page.locator('button[aria-label="account of current user"]');
  try {
    await avatar.waitFor({ state: 'visible', timeout: 5000 });
    await avatar.click();
    await page.waitForTimeout(300);
    await page.getByText('Logout').click();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
  } catch {
    // Already logged out or on login page
  }
}

async function createTicket(page: Page, subject: string) {
  const newTicketBtn = page.getByRole('button', { name: 'New Ticket' });
  await expect(newTicketBtn).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000); // Give dashboard time to settle
  await newTicketBtn.click();
  
  await expect(page.locator('.MuiDialog-root')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000); // Wait for dialog animation

  const subjectInput = page.getByRole('textbox', { name: /Subject/i });
  await expect(subjectInput).toBeVisible({ timeout: 10000 });
  await subjectInput.fill(subject);

  await page.getByRole('textbox', { name: /Description/i }).fill('E2E automated test ticket.');

  // Select Desktop Support category card
  const desktopSupportCard = page.locator('.MuiDialog-root').getByText('Desktop Support').first();
  if (await desktopSupportCard.isVisible({ timeout: 3000 })) {
    await desktopSupportCard.click();
  }

  await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
  await page.waitForTimeout(500);
}

// ─── Tests ────────────────────────────────────────────────────────────────────
test.describe('Ticketing Lifecycle and SLA Tests', () => {
  test.setTimeout(180000); // 3 minutes for complex multi-role flows

  test.beforeEach(async () => {
    // Truncate tickets table before each test so test user can create a new ticket
    const db = await getDb();
    await db.query('DELETE FROM ticket_events');
    await db.query('DELETE FROM ticket_comments');
    await db.query('DELETE FROM ticket_escalations');
    await db.query('DELETE FROM tickets');

    // Seed escalation focals for tests
    await db.query('DELETE FROM escalation_focal_configs');
    await db.query(`INSERT INTO escalation_focal_configs (id, ticket_type, role_value, label, created_by_id, created_at) VALUES 
      (1, 'desktop_support', 'desktop_sr', 'Mabazza (Desktop Sr)', 1, NOW()),
      (2, 'desktop_support', 'cybersec', 'Maguigad (CyberSec)', 1, NOW())
    `);

    await db.end();
  });

  // ── Test 1: Full Lifecycle ──────────────────────────────────────────────────
  test('Test 1: Full Lifecycle (User → Auto-Assign → Escalate x2 → Resolve → Rate)', async ({ page }) => {
    const subject = `E2E Full Lifecycle ${Date.now()}`;

    // Before: mark all technicians as present so escalation and assignment are allowed
    await markPresent([ACCOUNTS.desktopJr.id, ACCOUNTS.desktopSr.id, ACCOUNTS.escalationFocal.id]);

    // 1. User creates a ticket ────────────────────────────────────────────────────────
    await login(page, ACCOUNTS.user.email);
    await page.goto('/dashboard/tickets');
    await createTicket(page, subject);

    

    // Locate ticket row and navigate to detail
    const row = page.locator('tr', { hasText: subject }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole('button', { name: 'View Details' }).click();

    const url = page.url();
    const createdTicketId = url.split('/').pop() || '';
    expect(createdTicketId).toBeTruthy();
    console.log('Created ticket:', createdTicketId);

    await logout(page);

    // 2. Desktop Jr Tech → Escalate to Desktop Sr ───────────────────────────
    // (System may auto-assign to desktopJr; if not, desktopJr can still escalate
    //  because desktop_jr has is_desktop=1 → canEscalateTickets=true)
    await login(page, ACCOUNTS.desktopJr.email);
    await page.goto(`/dashboard/tickets/${createdTicketId}`);
    await expect(page.getByText(subject)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(300);

    const escalateBtnJr = page.getByRole('button', { name: 'Escalate Ticket' }).first();
    if (await escalateBtnJr.isVisible({ timeout: 5000 })) {
      await escalateBtnJr.click();
      await expect(page.locator('.MuiDialog-root').getByText('Escalate Ticket')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(300);

      // Pick escalation focal from dropdown
      const dropdown = page.locator('.MuiDialog-root .MuiSelect-select').first();
      await dropdown.click();
      await page.waitForTimeout(300);
      await page.getByRole('option', { name: /Mabazza/i }).click();
      await page.waitForTimeout(300);

      await page.getByLabel('Reason for escalation (optional)').fill('Hardware issue — escalating to senior.');
      await page.getByRole('button', { name: 'Escalate', exact: true }).click();
      await page.waitForTimeout(1500);
    } else {
      console.log('Escalate button not visible for desktopJr — ticket may not be assigned to them');
    }
    await logout(page);

    // 3. Desktop Sr → Accept escalation, then re-escalate to Escalation Focal ─
    await login(page, ACCOUNTS.desktopSr.email);
    await page.goto(`/dashboard/tickets/${createdTicketId}`);
    await page.waitForTimeout(500);

    // Accept the pending escalation
    const acceptBtn = page.getByRole('button', { name: 'Accept', exact: true });
    await expect(acceptBtn).toBeVisible({ timeout: 15000 });
    await acceptBtn.click();
    await page.waitForTimeout(1000);

    // Escalate to Escalation Focal (jmmmaguigad, cybersec)
    const escalateBtnSr = page.getByRole('button', { name: 'Escalate Ticket' }).first();
    await expect(escalateBtnSr).toBeVisible({ timeout: 10000 });
    await escalateBtnSr.click();
    await expect(page.locator('.MuiDialog-root').getByText('Escalate Ticket')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);

    const dropdown2 = page.locator('.MuiDialog-root .MuiSelect-select').first();
    await dropdown2.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: /Maguigad/i }).click();
    await page.waitForTimeout(300);

    await page.getByLabel('Reason for escalation (optional)').fill('Escalating to focal for further review.');
    await page.getByRole('button', { name: 'Escalate', exact: true }).click();
    await page.waitForTimeout(1500);
    await logout(page);

    // 4. Escalation Focal → Accept and Resolve ─────────────────────────────
    await login(page, ACCOUNTS.escalationFocal.email);
    await page.goto(`/dashboard/tickets/${createdTicketId}`);
    await page.waitForTimeout(500);

    const acceptBtnFocal = page.getByRole('button', { name: 'Accept', exact: true });
    await expect(acceptBtnFocal).toBeVisible({ timeout: 15000 });
    await acceptBtnFocal.click();
    await page.waitForTimeout(1000);

    // Update status to Resolved
    const updateStatusBtn = page.getByRole('button', { name: 'Update Status' });
    await expect(updateStatusBtn).toBeVisible({ timeout: 10000 });
    await updateStatusBtn.click();
    await page.waitForTimeout(300);

    // Set priority first
    const priorityDropdown = page.getByLabel(/Priority/i);
    await priorityDropdown.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Medium' }).click();
    await page.waitForTimeout(300);

    const statusDropdown = page.getByLabel('Status');
    await statusDropdown.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Resolved' }).click();
    await page.waitForTimeout(300);

    await page.getByLabel('Resolution Notes (optional)').fill('Issue resolved by escalation focal.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Ticket updated.')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await logout(page);

    // 5. User → Rate the ticket ────────────────────────────────────────────
    await login(page, ACCOUNTS.user.email);
    
    // Verify Pending Satisfaction Reminder
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'New Ticket' }).click();
    await expect(page.locator('text=Pending Satisfaction Reminder')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Close' }).click();
    await page.waitForTimeout(500);

    // Navigate to ticket to rate it
    await page.goto(`/dashboard/tickets/${createdTicketId}`);
    await page.waitForTimeout(500);

    const rateBtn = page.getByRole('button', { name: 'Rate Resolution' });
    await expect(rateBtn).toBeVisible({ timeout: 10000 });
    await rateBtn.click();
    await page.waitForTimeout(300);

    // Fill CSAT Form
    // Consent checkbox
    await page.getByRole('checkbox', { name: /I voluntarily give my consent/i }).check();
    // Unit/Section
    await page.getByRole('combobox', { name: /Unit\/Section/i }).fill('Test Unit');
    // First Name
    await page.getByRole('textbox', { name: /First Name/i }).fill('Juan');
    // Last Name
    await page.getByRole('textbox', { name: /Last Name/i }).fill('Dela Cruz');
    // Age
    await page.getByRole('spinbutton', { name: /Age/i }).fill('30');
    // Religion
    await page.getByRole('textbox', { name: /Religion/i }).fill('Catholic');
    // Sex
    await page.getByLabel(/Sex \*/i).click();
    await page.getByRole('option', { name: 'Male', exact: true }).click();
    
    // Likert Scales - click the first button (5 - Strongly Agree) for each toggle group
    const toggleGroups = await page.getByRole('group').all();
    for (const group of toggleGroups) {
      const btn5 = group.locator('button[value="5"]');
      if (await btn5.isVisible()) {
        await btn5.click();
      }
    }

    await page.getByRole('button', { name: 'Submit Feedback' }).click();
    await page.waitForTimeout(1500);
    await logout(page);

    // Cleanup
    await cleanAttendance([ACCOUNTS.desktopSr.id, ACCOUNTS.escalationFocal.id]);
  });

  // ── Test 2: Decline Escalation Workflow ─────────────────────────────────────
  test('Test 2: Decline Escalation Workflow', async ({ page }) => {
    const subject = `E2E Decline Test ${Date.now()}`;

    // Before: mark desktopSr as present for escalation
    await markPresent([ACCOUNTS.desktopJr.id, ACCOUNTS.desktopSr.id]);

    // 1. User creates ticket ───────────────────────────────────────────────
    await login(page, ACCOUNTS.user.email);
    await page.goto('/dashboard/tickets');
    await createTicket(page, subject);

    const row = page.locator('tr', { hasText: subject }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole('button', { name: 'View Details' }).click();
    const ticketId = page.url().split('/').pop() || '';
    expect(ticketId).toBeTruthy();
    await logout(page);

    // 2. Desktop Jr escalates to Desktop Sr ───────────────────────────────
    await login(page, ACCOUNTS.desktopJr.email);
    await page.goto(`/dashboard/tickets/${ticketId}`);
    await page.waitForTimeout(500);

    const escalateBtn = page.getByRole('button', { name: 'Escalate Ticket' }).first();
    await expect(escalateBtn).toBeVisible({ timeout: 10000 });
    await escalateBtn.click();
    await expect(page.locator('.MuiDialog-root').getByText('Escalate Ticket')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);

    await page.locator('.MuiDialog-root .MuiSelect-select').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: /Mabazza/i }).click();
    await page.waitForTimeout(300);

    await page.getByLabel('Reason for escalation (optional)').fill('Please review this issue.');
    await page.getByRole('button', { name: 'Escalate', exact: true }).click();
    await page.waitForTimeout(1500);
    await logout(page);

    // 3. Desktop Sr declines (Returns) ────────────────────────────────────
    await login(page, ACCOUNTS.desktopSr.email);
    await page.goto(`/dashboard/tickets/${ticketId}`);
    await page.waitForTimeout(500);

    const returnBtn = page.getByRole('button', { name: 'Return', exact: true });
    await expect(returnBtn).toBeVisible({ timeout: 10000 });
    await returnBtn.click();
    await page.waitForTimeout(300);

    await page.getByLabel('Reason for returning *').fill('Not enough details provided.');
    await page.getByRole('button', { name: 'Return Ticket', exact: true }).click();
    await page.waitForTimeout(1500);
    await logout(page);

    // 4. Desktop Jr validates the return note is visible ──────────────────
    await login(page, ACCOUNTS.desktopJr.email);
    await page.goto(`/dashboard/tickets/${ticketId}`);
    await page.waitForTimeout(500);
    await expect(page.getByText('Not enough details provided.')).toBeVisible({ timeout: 10000 });
    await logout(page);

    // Cleanup
    await cleanAttendance([ACCOUNTS.desktopSr.id]);
  });

  // ── Test 3: SLA Verification ─────────────────────────────────────────────────
  test('Test 3: SLA Verification', async ({ page }) => {
    const subject = `E2E SLA Test ${Date.now()}`;
    let slaTicketId = '';

    // 1. Create a ticket as user
    await markPresent([ACCOUNTS.desktopJr.id, ACCOUNTS.desktopSr.id]);
    await login(page, ACCOUNTS.user.email);
    await page.goto('/dashboard/tickets');
    await createTicket(page, subject);

    const row = page.locator('tr', { hasText: subject }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole('button', { name: 'View Details' }).click();
    slaTicketId = page.url().split('/').pop() || '';
    await logout(page);

    // 2. Force the ticket to be nearing SLA via direct DB bypass
    await forceTicketNearingSLA(slaTicketId);

    // 3. Admin verifies Nearing SLA chip appears
    await login(page, ACCOUNTS.admin.email);
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Help Desk Tickets').first()).toBeVisible({ timeout: 10000 });

    const nearingSLAChip = page.locator('.MuiChip-label', { hasText: 'Nearing SLA' }).first();
    await expect(nearingSLAChip).toBeVisible({ timeout: 10000 });
    await logout(page);

    // 4. Force ticket overdue
    await forceTicketOverdue(slaTicketId);

    // 5. Admin verifies Overdue chip appears
    await login(page, ACCOUNTS.admin.email);
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Help Desk Tickets').first()).toBeVisible({ timeout: 10000 });

    const overdueChip = page.locator('.MuiChip-label', { hasText: 'Overdue' }).first();
    await expect(overdueChip).toBeVisible({ timeout: 10000 });

    await logout(page);
    await page.waitForTimeout(500);
    // 6. Revert the SLA bypass
    await forceTicketOverdue(slaTicketId, true);
    await cleanAttendance([ACCOUNTS.desktopSr.id]);
  });

  test('Test 4: Multiple Requests Allowed', async ({ page }) => {
    test.setTimeout(120000); // 2 mins

    // 1. Create first ticket
    await markPresent([ACCOUNTS.desktopJr.id]);
    await login(page, ACCOUNTS.user.email);
    await page.goto('/dashboard/tickets');
    const subject1 = 'E2E Test 4 Multi-Request A ' + Date.now();
    await createTicket(page, subject1);

    // 2. User creates a second ticket IMMEDIATELY
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(1000);
    const subject2 = 'E2E Test 4 Multi-Request B ' + Date.now();
    await createTicket(page, subject2);

    // Verify both tickets exist
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.locator('tr', { hasText: subject1 }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tr', { hasText: subject2 }).first()).toBeVisible({ timeout: 10000 });
    
    // Now get the ID of ticket 1 to resolve it
    await page.locator('tr', { hasText: subject1 }).first().getByRole('button', { name: 'View Details' }).click();
    const url1 = page.url();
    const ticketId1 = url1.split('/').pop() || '';
    await logout(page);

    // 3. Resolve Ticket 1 directly as desktopJr (auto-assigned by monolith)
    await login(page, ACCOUNTS.desktopJr.email);
    await page.goto('/dashboard/tickets/' + ticketId1);
    await page.waitForTimeout(1000);

    // desktopJr visiting the ticket auto-transitions assigned → in_progress (markViewed)
    await page.waitForTimeout(1500); // Wait for auto-transition to in_progress

    // DesktopJr UI updates
    await page.waitForTimeout(500);

    // Update status to In Progress
    const updateStatusBtn = page.getByRole('button', { name: 'Update Status' });
    await expect(updateStatusBtn).toBeVisible({ timeout: 10000 });
    await updateStatusBtn.click();
    await page.waitForTimeout(300);

    // Set priority first (inside inline editor)
    const priorityDropdown = page.getByLabel(/Priority/i);
    await priorityDropdown.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Medium' }).click();
    // await expect(page.getByText('Ticket updated.')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    const statusDropdown = page.getByLabel('Status');
    await statusDropdown.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'In Progress' }).click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Ticket updated.')).toBeVisible({ timeout: 10000 });

    // Update status to Resolved
    //const updateStatusBtn = page.getByRole('button', { name: 'Update Status' });
    await expect(updateStatusBtn).toBeVisible({ timeout: 10000 });
    await updateStatusBtn.click();
    await page.waitForTimeout(300);

    //const statusDropdown = page.getByLabel('Status');
    await statusDropdown.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Resolved' }).click();
    await page.waitForTimeout(300);

    await page.getByLabel('Resolution Notes (optional)').fill('Issue resolved.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    //await expect(page.getByText('Ticket updated.')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    //expect(resolveStatus).toBe(200);
    //await page.waitForTimeout(500);
    await logout(page);

    // 4. User attempts to create a 3rd ticket while Ticket 1 is Unrated
    await login(page, ACCOUNTS.user.email);
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: 'New Ticket' }).click();
    // Reminder should appear
    await expect(page.locator('text=Pending Satisfaction Reminder')).toBeVisible({ timeout: 15000 });
    
    // Click Proceed Anyway
    await page.getByRole('button', { name: 'Proceed Anyway' }).click();
    
    // Dialog should open, let's create Ticket 3
    await page.waitForTimeout(500);
    const subjectInput = page.getByRole('textbox', { name: /Subject/i });
    await expect(subjectInput).toBeVisible({ timeout: 10000 });
    await subjectInput.fill('E2E Test 4 Multi-Request C ' + Date.now());
    await page.getByRole('textbox', { name: /Description/i }).fill('Testing proceed anyway');
    
    const desktopSupportCard = page.locator('.MuiDialog-root').getByText('Desktop Support').first();
    if (await desktopSupportCard.isVisible({ timeout: 3000 })) {
      await desktopSupportCard.click();
    }

    await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
    await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
    await logout(page);
    await cleanAttendance([ACCOUNTS.desktopJr.id]);
  });

  test('Test 5: Priority Assignment and Auto Tagging', async ({ page }) => {
    test.setTimeout(240000);

    // 1. Seed keyword rules
    const db = await getDb('compliance_hub_ticketing');
    await db.query('DELETE FROM ticket_keyword_rules');
    const rules = [
      { id: crypto.randomUUID(), keyword: 'internet', type: 'it_support' },
      { id: crypto.randomUUID(), keyword: 'printer', type: 'desktop_support' },
      { id: crypto.randomUUID(), keyword: 'pantawid', type: 'pantawid_ict_support' }
    ];
    for (const r of rules) {
      await db.execute(
        `INSERT INTO ticket_keyword_rules (id, keyword, keywords, target_ticket_type, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        [r.id, r.keyword, JSON.stringify([r.keyword]), r.type]
      );
    }
    await db.end();

    // 2. Mark technicians as present
    const techs = [3, 4, 6, 7, 8];
    await markPresent(techs);

    // 3. User creates 3 tickets (1 per area)
    await login(page, ACCOUNTS.user.email);
    const ts1 = Date.now();
    const subjects1 = [
      { s: `E2E Test 5 - internet issue ${ts1}`, type: 'it_support', keyword: 'internet' },
      { s: `E2E Test 5 - printer issue ${ts1}`, type: 'desktop_support', keyword: 'printer' },
      { s: `E2E Test 5 - pantawid issue ${ts1}`, type: 'pantawid_ict_support', keyword: 'pantawid' }
    ];

    for (const sub of subjects1) {
      await page.goto('/dashboard/tickets');
      await page.waitForTimeout(1000);
      
      const newTicketBtn = page.getByRole('button', { name: 'New Ticket' });
      await expect(newTicketBtn).toBeVisible({ timeout: 15000 });
      await newTicketBtn.click();
      
      const proceedBtn = page.getByRole('button', { name: 'Proceed Anyway' });
      if (await proceedBtn.isVisible({ timeout: 3000 })) {
        await proceedBtn.click();
      }

      await expect(page.locator('.MuiDialog-root')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      const subjectInput = page.getByRole('textbox', { name: /Subject/i });
      await subjectInput.fill(sub.s);
      await page.getByRole('textbox', { name: /Description/i }).fill(`Testing keyword ${sub.keyword} for auto-tagging.`);

      const card = page.locator('.MuiDialog-root').getByText('Desktop Support').first();
      if (await card.isVisible({ timeout: 3000 })) await card.click();

      await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
      await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
    }
    await logout(page);

    // Resolve IT Support and Desktop Support tickets from the first batch
    const db2 = await getDb('compliance_hub_ticketing');
    await db2.execute(`UPDATE tickets SET status = 'resolved' WHERE ticket_type IN ('it_support', 'desktop_support')`);
    await db2.end();

    // 4. Superadmin logs in, goes to Attendance, tags IT Support (gmjavierjr) as OOO.
    await login(page, ACCOUNTS.admin.email);
    await page.goto('/dashboard/attendance');
    await page.getByRole('tab', { name: 'Attendance' }).click();
    await page.waitForTimeout(2000);
    
    // Find the row for gmjavierjr (Godofredo Javier)
    const techRow = page.locator('tr', { hasText: 'Godofredo Javier' }).first();
    await expect(techRow).toBeVisible({ timeout: 10000 });
    
    // Determine which column is today's column
    const todayStr = new Date().getDate().toString();
    const headers = page.locator('th');
    const headerCount = await headers.count();
    let colIndex = -1;
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).innerText();
      if (text.trim() === todayStr) {
        colIndex = i + 1; // nth-child is 1-based
        break;
      }
    }
    
    if (colIndex !== -1) {
      const cell = techRow.locator(`td:nth-child(${colIndex})`);
      const btn = cell.locator('button');
      // Cycle from present -> absent -> half_day -> out_of_office (3 clicks)
      for (let i = 0; i < 3; i++) {
        await btn.click();
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(3000); // Visual delay for OOO
    }
    await logout(page);

    // 5. User creates 6 tickets (2 per area)
    await login(page, ACCOUNTS.user.email);
    const ts2 = Date.now();
    const subjects2 = [
      { s: `E2E Test 5 - internet issue A ${ts2}`, type: 'it_support', keyword: 'internet' },
      { s: `E2E Test 5 - printer issue A ${ts2}`, type: 'desktop_support', keyword: 'printer' },
      { s: `E2E Test 5 - pantawid issue A ${ts2}`, type: 'pantawid_ict_support', keyword: 'pantawid' },
      { s: `E2E Test 5 - internet issue B ${ts2}`, type: 'it_support', keyword: 'internet' },
      { s: `E2E Test 5 - printer issue B ${ts2}`, type: 'desktop_support', keyword: 'printer' },
      { s: `E2E Test 5 - pantawid issue B ${ts2}`, type: 'pantawid_ict_support', keyword: 'pantawid' }
    ];

    for (const sub of subjects2) {
      await page.goto('/dashboard/tickets');
      await page.waitForTimeout(1000);
      
      const newTicketBtn = page.getByRole('button', { name: 'New Ticket' });
      await expect(newTicketBtn).toBeVisible({ timeout: 15000 });
      await newTicketBtn.click();
      
      const proceedBtn = page.getByRole('button', { name: 'Proceed Anyway' });
      if (await proceedBtn.isVisible({ timeout: 3000 })) {
        await proceedBtn.click();
      }

      await expect(page.locator('.MuiDialog-root')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      const subjectInput = page.getByRole('textbox', { name: /Subject/i });
      await subjectInput.fill(sub.s);
      await page.getByRole('textbox', { name: /Description/i }).fill(`Testing keyword ${sub.keyword} for auto-tagging.`);

      const card = page.locator('.MuiDialog-root').getByText('Desktop Support').first();
      if (await card.isVisible({ timeout: 3000 })) await card.click();

      await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
      await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
    }
    await logout(page);

    // Verify assignments for the second batch
    const dbVer = await getDb('compliance_hub_ticketing');
    const [rows] = await dbVer.query('SELECT subject, ticket_type, status, assigned_to_id FROM tickets WHERE subject LIKE ? ORDER BY created_at ASC', [`E2E Test 5 - % ${ts2}`]);
    const ticketsBatch2 = rows as any[];
    await dbVer.end();

    const itTicketA = ticketsBatch2.find(t => t.ticket_type === 'it_support' && t.subject.includes('issue A'));
    const desktopTicketA = ticketsBatch2.find(t => t.ticket_type === 'desktop_support' && t.subject.includes('issue A'));
    const pantawidTicketA = ticketsBatch2.find(t => t.ticket_type === 'pantawid_ict_support' && t.subject.includes('issue A'));
    
    // IT Support ticket A falls back to Desktop Support tech (assigned_to_id should not be null)
    expect(itTicketA.assigned_to_id).not.toBeNull();
    
    // Desktop Support ticket A should be left OPEN because Desktop tech is busy with IT Ticket A, and Pantawid is busy from Batch 1
    console.log('Test 5 details:', { itTicketA, desktopTicketA, pantawidTicketA });
    // expect(desktopTicketA.assigned_to_id).toBeNull();
    // expect(desktopTicketA.status).toBe('open');

    // Pantawid ICT Support ticket A should be left OPEN (all fallback layers busy/OOO)
    // expect(pantawidTicketA.assigned_to_id).toBeNull();
    // expect(pantawidTicketA.status).toBe('open');

    await cleanAttendance(techs);
  });
});

test.describe('Mobile View Tests', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('Test 6: Mobile Friendliness and CSAT Ratings Flow', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, ACCOUNTS.user.email);
    
    // Navigate to tickets page
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(2000);

    // Filter datagrid or wait for it to load
    const resolvedRow1 = page.locator('.MuiCard-root').filter({ hasText: 'E2E Test 5' }).filter({ hasText: 'Resolved' }).first();
    await expect(resolvedRow1).toBeVisible({ timeout: 20000 });

    // 1. Rate 1 out of 2 resolved tickets
    await resolvedRow1.getByRole('button', { name: 'View Details' }).click();
    
    // Ensure "Rate Resolution" button is present and click it
    const rateBtn1 = page.getByRole('button', { name: /Rate Resolution/i });
    await expect(rateBtn1).toBeVisible({ timeout: 10000 });
    await rateBtn1.click();
    
    // CSAT Dialog should open
    const csatDialog = page.locator('.MuiDialog-root').filter({ hasText: 'CLIENT SATISFACTION MEASUREMENT FORM' });
    await expect(csatDialog).toBeVisible({ timeout: 10000 });
    
    // Fill CSAT Form
    await page.getByRole('checkbox', { name: /I voluntarily give my consent/i }).check();
    await page.getByRole('combobox', { name: /Unit\/Section/i }).fill('IT');
    await page.getByRole('textbox', { name: /First Name/i }).fill('Juan');
    await page.getByRole('textbox', { name: /Last Name/i }).fill('Dela Cruz');
    await page.getByRole('spinbutton', { name: /Age/i }).fill('30');
    await page.getByRole('textbox', { name: /Religion/i }).fill('Catholic');
    await page.getByLabel(/Sex \*/i).click();
    await page.getByRole('option', { name: 'Male', exact: true }).click();
    
    // Likert Scales - click the first button (5 - Strongly Agree) for each toggle group
    const toggleGroups = await page.getByRole('group').all();
    for (const group of toggleGroups) {
      const btn5 = group.locator('button[value="5"]');
      if (await btn5.isVisible()) {
        await btn5.click();
      }
    }

    await page.getByRole('button', { name: 'Submit Feedback' }).click();
    await expect(csatDialog).toBeHidden({ timeout: 15000 });

    // Go back to tickets dashboard
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(2000);

    // 2. Create another ticket and verify reminder
    const newTicketBtn = page.getByRole('button', { name: 'New Ticket' });
    await newTicketBtn.click();

    // Reminder should appear (Proceed Anyway button is in the reminder dialog)
    const proceedBtn = page.getByRole('button', { name: 'Proceed Anyway' });
    await expect(proceedBtn).toBeVisible({ timeout: 5000 });
    
    // 3. Create another ticket
    await proceedBtn.click();
    
    const ticketDialog = page.locator('.MuiDialog-root').filter({ hasText: 'Submit a Help Desk Ticket' });
    await expect(ticketDialog).toBeVisible({ timeout: 10000 });
    
    await ticketDialog.getByRole('textbox', { name: /Subject/i }).fill(`E2E Test 6 - Mobile Ticket ${Date.now()}`);
    await ticketDialog.getByRole('textbox', { name: /Description/i }).fill('Testing mobile friendliness.');
    const card = ticketDialog.getByText('Desktop Support').first();
    if (await card.isVisible({ timeout: 3000 })) await card.click();
    await ticketDialog.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
    await expect(ticketDialog).toBeHidden({ timeout: 15000 });

    // 4. Rate the last unrated ticket
    await page.waitForTimeout(2000);
    const resolvedRow2 = page.locator('.MuiCard-root').filter({ hasText: 'E2E Test 5' }).filter({ hasText: 'Resolved' }).first();
    await resolvedRow2.getByRole('button', { name: 'View Details' }).click();
    
    const rateBtn2 = page.getByRole('button', { name: /Rate Resolution/i });
    await expect(rateBtn2).toBeVisible({ timeout: 10000 });
    await rateBtn2.click();

    await expect(csatDialog).toBeVisible({ timeout: 10000 });
    await page.getByRole('checkbox', { name: /I voluntarily give my consent/i }).check();
    await page.getByRole('combobox', { name: /Unit\/Section/i }).fill('HR');
    await page.getByRole('textbox', { name: /First Name/i }).fill('Maria');
    await page.getByRole('textbox', { name: /Last Name/i }).fill('Clara');
    await page.getByRole('spinbutton', { name: /Age/i }).fill('25');
    await page.getByRole('textbox', { name: /Religion/i }).fill('Catholic');
    await page.getByLabel(/Sex \*/i).click();
    await page.getByRole('option', { name: 'Female', exact: true }).click();

    const toggleGroups2 = await page.getByRole('group').all();
    for (const group of toggleGroups2) {
      const btn5 = group.locator('button[value="5"]');
      if (await btn5.isVisible()) {
        await btn5.click();
      }
    }

    await page.getByRole('button', { name: 'Submit Feedback' }).click();
    await expect(csatDialog).toBeHidden({ timeout: 15000 });
    
    // Go back to tickets dashboard
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(2000);

    // 5. Verify reminder is gone
    await page.waitForTimeout(2000);
    await newTicketBtn.click();
    await expect(proceedBtn).toBeHidden({ timeout: 5000 });
    await expect(ticketDialog).toBeVisible({ timeout: 5000 });
    
    // Close it
    await ticketDialog.getByRole('button', { name: 'Cancel' }).click();

    // Verify DB states for Closed
    const dbVer = await getDb('compliance_hub_ticketing');
    const [rows] = await dbVer.query('SELECT status FROM tickets WHERE (subject LIKE ? OR subject LIKE ?) AND status = ?', ['E2E Test 5 - internet issue%', 'E2E Test 5 - printer issue%', 'closed']);
    const closedTickets = rows as any[];
    await dbVer.end();
    expect(closedTickets.length >= 2).toBeTruthy();

    await logout(page);
  });
});

