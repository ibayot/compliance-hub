import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import * as accounts from './data/accounts.json';

test.describe('Global Pause and SLA Adjustment', () => {
  test.describe.configure({ timeout: 180000 });

  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let ticketsPage: TicketsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    ticketsPage = new TicketsPage(page);
  });

  test('Verify Global Pause stops auto-assignment and stalls SLA', async ({ page, request }) => {
    // 0. Login an IT technician briefly to mark them present so auto-assignment works
    await loginPage.goto();
    await loginPage.login(accounts.itSupportJr.email, accounts.itSupportJr.password);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();
    await dashboardPage.logout();

    // Authenticate via API to get token for admin operations
    const authRes = await request.post('/api/auth/login', {
      data: { email: accounts.admin.email, password: accounts.admin.password },
    });
    const authData = await authRes.json();
    const token = authData.accessToken;

    // Create a Category with SLA so the ticket will have a deadline
    const catRes = await request.post('/api/ticket-settings/categories', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E SLA Category ${Date.now()}`,
        description: 'For testing SLA',
        ticketType: 'it_support',
        slaHours: 4,
        isActive: true,
      },
    });
    expect(catRes.status()).toBe(201);
    const catData = await catRes.json();
    console.log('Created SLA Category:', catData);

    // 1. Create a baseline ticket to get an active ticket with an SLA deadline
    await loginPage.goto();
    await loginPage.login(accounts.user.email, accounts.user.password);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();
    await dashboardPage.navigateTo('Tickets');

    const activeSubject = `E2E Active Ticket ${Date.now()}`;
    await ticketsPage.createTicket(activeSubject, 'IT Support');
    await dashboardPage.logout();

    // Admin login
    await loginPage.goto();
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();

    // Manually assign the baseline ticket to ensure SLA deadline is populated (bypassing auto-assign flakiness)
    await dashboardPage.navigateTo('Tickets');
    await ticketsPage.assignTicketToUserContaining(activeSubject, 'Jaymark');

    // Authenticate via API to get token
    const authRes2 = await request.post('/api/auth/login', {
      data: { email: accounts.admin.email, password: accounts.admin.password },
    });
    const authData2 = await authRes2.json();
    const token2 = authData2.accessToken;
    console.log('Admin User Role:', authData2.user.role, 'RoleCode:', authData2.user.roleCode);
    expect(token2).toBeTruthy();

    // Fetch the baseline ticket to get its slaDeadline using the API
    let response = await request.get(`/api/tickets`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    let result = await response.json();
    let tickets = result.data || result;
    let baselineTicket = tickets.find((t: any) => t.subject === activeSubject);
    expect(baselineTicket).toBeTruthy();
    console.log('Baseline Ticket:', baselineTicket);
    const originalSlaDeadline = new Date(baselineTicket.slaDeadline).getTime();

    // 2. Trigger Global Pause via UI
    await dashboardPage.navigateTo('Dashboard');

    // We expect 2 dialogs: confirm, then alert
    let dialogCount = 0;
    page.on('dialog', async (dialog) => {
      dialogCount++;
      await dialog.accept();
    });

    const pauseResPromise = page.waitForResponse((res) =>
      res.url().includes('/api/tickets/global-pause'),
    );
    await page.getByRole('button', { name: 'Global Pause (Flag Ceremony)' }).click();
    await pauseResPromise;

    // Wait for reload and UI to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Clean up dialog listener
    page.removeAllListeners('dialog');

    await dashboardPage.logout();

    // Wait exactly 15 seconds to simulate a stall period
    await page.waitForTimeout(15000);

    // 3. User creates a new ticket DURING the pause
    await loginPage.goto();
    await loginPage.login(accounts.user.email, accounts.user.password);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();
    await dashboardPage.navigateTo('Tickets');
    const pausedSubject = `E2E Paused Ticket ${Date.now()}`;
    await ticketsPage.createTicket(pausedSubject, 'IT Support');
    await dashboardPage.logout();

    // 4. Admin logs in to verify the paused ticket
    await loginPage.goto();
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();

    // Check via API that the paused ticket is unassigned (Open)
    response = await request.get(`/api/tickets`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    result = await response.json();
    tickets = result.data || result;
    const pausedTicket = tickets.find((t: any) => t.subject === pausedSubject);
    expect(pausedTicket).toBeTruthy();
    expect(pausedTicket.status).toBe('open'); // Auto-assignment shouldn't have fired
    expect(pausedTicket.assignedToId).toBeNull(); // Should be null

    // 5. Admin triggers Global Resume via UI
    await dashboardPage.navigateTo('Dashboard');

    // We expect 2 dialogs: confirm, then alert
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const resumeResPromise = page.waitForResponse((res) =>
      res.url().includes('/api/tickets/global-resume'),
    );
    await page.getByRole('button', { name: 'Global Resume' }).click();
    await resumeResPromise;

    // Wait for reload and UI to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Clean up dialog listener
    page.removeAllListeners('dialog');

    // 6. Verify SLA deadline was stalled
    response = await request.get(`/api/tickets`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    result = await response.json();
    tickets = result.data || result;
    const resumedBaselineTicket = tickets.find((t: any) => t.subject === activeSubject);
    expect(resumedBaselineTicket).toBeTruthy();

    const newSlaDeadline = new Date(resumedBaselineTicket.slaDeadline).getTime();

    // The difference should be ~15 seconds (15000ms), allow some buffer for execution time
    const diffMs = newSlaDeadline - originalSlaDeadline;

    // Log for debugging
    console.log(`Original SLA: ${new Date(originalSlaDeadline).toISOString()}`);
    console.log(`New SLA: ${new Date(newSlaDeadline).toISOString()}`);
    console.log(`Difference in ms: ${diffMs}`);

    // Diff should be at least 15000ms, and reasonably less than 60000ms
    expect(diffMs).toBeGreaterThanOrEqual(15000);
    expect(diffMs).toBeLessThan(60000);
  });
});
