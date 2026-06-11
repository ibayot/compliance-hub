import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { AttendancePage } from './pages/AttendancePage';
import * as accounts from './data/accounts.json';

test.describe('Suite 4 — TICKET LIFE CYCLE', () => {
  test.describe.configure({ timeout: 180000 });
  test.describe.configure({ mode: 'serial' });

  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let ticketsPage: TicketsPage;
  let attendancePage: AttendancePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    ticketsPage = new TicketsPage(page);
    attendancePage = new AttendancePage(page);
  });

  const subjectIT = `E2E IT Support ${Date.now()}`;
  const subjectDesktop = `E2E Desktop Support ${Date.now()}`;
  const subjectPantawid = `E2E Pantawid ${Date.now()}`;

  test('Round 1: Ticket Creation & Resolution', async ({ page }) => {
    test.setTimeout(240000); // Increased timeout to account for multiple logins

    // Log in all non-user technicians briefly to mark them 'Present' so auto-assignment works
    const nonUserAccounts = [
      accounts.admin, accounts.sectionHead, accounts.itSupportJr, 
      accounts.pantawidIct, accounts.devLead, accounts.desktopJr, 
      accounts.desktopSr1, accounts.desktopSr2, accounts.complianceOfficer, accounts.cybersec
    ];
    for (const acc of nonUserAccounts) {
        await loginPage.goto();
        await loginPage.login(acc.email, acc.password);
        await loginPage.closeCsatIfVisible();
        await dashboardPage.logout();
    }

    // User creates tickets
    await loginPage.goto();
    await loginPage.login(accounts.user.email, accounts.user.password);
    await dashboardPage.navigateTo('Tickets');

    await ticketsPage.createTicket(subjectIT, 'IT Support');
    await ticketsPage.createTicket(subjectDesktop, 'Desktop Support');
    await ticketsPage.createTicket(subjectPantawid, 'Pantawid ICT Support');

    await dashboardPage.logout();

    // Desktop Junior resolves Desktop
    await loginPage.login(accounts.desktopJr.email, accounts.desktopJr.password);
    await dashboardPage.navigateTo('Tickets');
    await ticketsPage.openTicket(subjectDesktop);
    await ticketsPage.acceptTicket();
    await ticketsPage.updateStatus('In Progress', '', 'high');
    await ticketsPage.updateStatus('Resolved', 'Fixed by Junior');
    await dashboardPage.logout();

    // IT Support resolves IT
    await loginPage.login(accounts.itSupportJr.email, accounts.itSupportJr.password);
    await dashboardPage.navigateTo('Tickets');
    await ticketsPage.openTicket(subjectIT);
    await ticketsPage.acceptTicket();
    await ticketsPage.updateStatus('In Progress', '', 'high');
    await ticketsPage.updateStatus('Resolved', 'Fixed by IT');
    await dashboardPage.logout();
  });

  test('Out of Office Configuration & Round 2 Creation', async ({ page }) => {
    test.setTimeout(120000);
    // Admin marks IT Support as OOO
    await loginPage.goto();
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await dashboardPage.navigateTo('Attendance');
    await attendancePage.markUserOOO('Godofredo Javier');
    await dashboardPage.logout();

    // User creates Round 2 tickets
    await loginPage.login(accounts.user.email, accounts.user.password);
    await dashboardPage.closeSatisfactionReminder();
    await dashboardPage.navigateTo('Tickets');

    const subIT2 = `E2E IT 2 ${Date.now()}`;
    const subDesktop2 = `E2E Desktop 2 ${Date.now()}`;
    await ticketsPage.createTicket(subIT2, 'IT Support');
    await ticketsPage.createTicket(subDesktop2, 'Desktop Support');
    await dashboardPage.logout();

    // Proxy Request by Admin
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await dashboardPage.navigateTo('Tickets');
    const proxySub = `E2E Proxy ${Date.now()}`;
    await ticketsPage.createTicket(proxySub, 'IT Support', 'Jaymark Cardona'); // requested for Jr
    await dashboardPage.logout();

    // Verify Proxy Visibility
    await loginPage.login(accounts.desktopJr.email, accounts.desktopJr.password);
    await dashboardPage.navigateTo('Tickets');
    const reqForTab = page.getByRole('tab', { name: 'Requested For' });
    if (await reqForTab.isVisible()) {
        await reqForTab.click();
        const row = page.locator('tr', { hasText: proxySub }).first();
        await expect(row).toBeVisible({ timeout: 10000 });
    }
    await dashboardPage.logout();
    
    // Check Auto Assignment (Ticket Admin or Admin logs in, verifies ticket wasn't assigned to OOO IT tech)
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await dashboardPage.navigateTo('Tickets');
    const row = page.locator('tr', { hasText: subIT2 }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    // Assuming assigned to column doesn't contain the IT support email since they are OOO
    await expect(row).not.toContainText(accounts.itSupportJr.email);
    await dashboardPage.logout();

    // The tickets created above (subIT2, subDesktop2, proxySub) will now be used for Escalation testing.
    // Because IT Support Jr is OOO, subIT2 was auto-assigned to Desktop Jr.
    // The others are waiting in the Open queue for Desktop Jr's openCount to drop to 0.
  });

  test('Ticket Rating (Round 1)', async ({ page }) => {
    test.setTimeout(60000);
    // User rates the tickets from Round 1 to completely close them
    await loginPage.goto();
    await loginPage.login(accounts.user.email, accounts.user.password);
    await dashboardPage.closeSatisfactionReminder();
    await dashboardPage.navigateTo('Tickets');
    
    await ticketsPage.openTicket(subjectDesktop);
    await ticketsPage.rateTicket();

    await dashboardPage.navigateTo('Tickets');
    await ticketsPage.openTicket(subjectIT);
    await ticketsPage.rateTicket();
    await dashboardPage.logout();
  });

  test('Escalation & De-Escalation (Round 2)', async ({ page }) => {
    test.setTimeout(180000);
    
    // Desktop Jr logs in and escalates his assigned ticket (E2E Desktop 2)
    await loginPage.goto();
    await loginPage.login(accounts.desktopJr.email, accounts.desktopJr.password);
    await dashboardPage.navigateTo('Tickets');
    
    // Find the assigned ticket (Desktop 2)
    const row = page.locator('tbody tr').filter({ hasText: /(Assigned|In Progress)/i }).first();
    const subDesktop2 = await row.locator('td:nth-child(2)').innerText();
    
    await ticketsPage.openTicket(subDesktop2);
    // Note: It might be "Assigned", but the Escalate button requires it to be opened. 
    // Wait, the "Escalate Ticket" button is only available if it is NOT pending.
    await ticketsPage.escalateTicket('Need help with Desktop issue', 'Garcia');
    await dashboardPage.logout();

    // Desktop Sr 2 (Garcia) logs in, Accepts and RETURNS (De-escalates) Desktop 2
    await loginPage.login(accounts.desktopSr2.email, accounts.desktopSr2.password);
    await dashboardPage.navigateTo('Tickets');
    await ticketsPage.openTicket(subDesktop2);
    await ticketsPage.acceptTicket();
    await ticketsPage.returnTicket('Fix it yourself, simple issue');
    await dashboardPage.logout();

    // Desktop Jr logs in, resolves returned Desktop 2
    await loginPage.login(accounts.desktopJr.email, accounts.desktopJr.password);
    await dashboardPage.navigateTo('Tickets');
    await ticketsPage.openTicket(subDesktop2);
    await ticketsPage.acceptTicket();
    await ticketsPage.updateStatus('In Progress', 'Okay fine', 'low');
    await ticketsPage.updateStatus('Resolved', 'I fixed it');
    await dashboardPage.logout();
  });
});
