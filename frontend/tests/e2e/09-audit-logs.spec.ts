import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import accounts from './data/accounts.json';

test.describe('Audit Logs E2E Test', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('Should open Audit Logs and intercept API response', async ({ page }) => {
    // 1. Log in as admin
    await loginPage.goto();
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();

    // 2. Intercept API response for /api/audit-logs
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/audit-logs') && response.request().method() === 'GET',
    );

    // 3. Navigate to Audit Logs directly
    await dashboardPage.navigateTo('Audit Logs');

    // Wait for the API response
    const response = await responsePromise;
    const body = await response.json().catch(() => null);

    console.log(`[Audit Logs API] Status: ${response.status()}`);
    console.log(`[Audit Logs API] Body:`, body);

    // Strict backend assertion
    expect(response.status()).toBe(200);

    // 4. Verify no snackbar error of any kind
    const errorSnackbar = page.locator('.notistack-Snackbar');
    await expect(errorSnackbar).not.toBeVisible({ timeout: 5000 });
  });
});
