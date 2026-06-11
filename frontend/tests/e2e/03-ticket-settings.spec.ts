import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketSettingsPage } from './pages/TicketSettingsPage';
import accounts from './data/accounts.json';

test.describe('Suite 3 — TICKET SETTINGS', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let settingsPage: TicketSettingsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    settingsPage = new TicketSettingsPage(page);

    await loginPage.goto();
    // Assuming Ticket Admin or Super Admin
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();
  });

  test('Ticket Categories', async ({ page }) => {
    await dashboardPage.navigateTo('Ticket Settings');
    await settingsPage.navigateToTab('^Categories');

    const list = page.locator('table, ul, .MuiDataGrid-root').first();
    await expect(list).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
        await searchInput.fill('Desktop Support');
        await page.waitForTimeout(1000);
    }
  });

  test('Keyword Rules', async ({ page }) => {
    await dashboardPage.navigateTo('Ticket Settings');
    await settingsPage.navigateToTab('Keyword Rules');

    // Verify rules are visible
    const list = page.locator('table, ul, .MuiDataGrid-root').first();
    await expect(list).toBeVisible({ timeout: 10000 });

    // Add rule if possible
    const addBtn = page.locator('button', { hasText: /Add Rule|Create Rule/i }).first();
    if (await addBtn.isVisible()) {
        await addBtn.click();
        const dialog = page.locator('.MuiDialog-root');
        await expect(dialog).toBeVisible({ timeout: 5000 });
        const kwInput = dialog.getByLabel(/Keywords/i).first();
        await kwInput.fill('E2E_KEYWORD');
        await kwInput.press('Enter');
        
        // Wait for chip
        await expect(dialog.locator('.MuiChip-root', { hasText: 'E2E_KEYWORD' })).toBeVisible({ timeout: 5000 });

        await dialog.getByRole('button', { name: /Save|Create/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });
    }
  });

  test('Escalation Focals', async ({ page }) => {
    await dashboardPage.navigateTo('Ticket Settings');
    await settingsPage.navigateToTab('Escalation Focals');

    // Add Desktop Senior as focal (from the previous test's newly created user's role)
    await settingsPage.addEscalationFocal('Desktop Support', 'Garcia');
    await settingsPage.addEscalationFocal('Desktop Support', 'Maguigad');
  });
});
