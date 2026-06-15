import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import accounts from './data/accounts.json';

test.describe('Suite 1 — LOGIN', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Positive Scenarios', () => {
    test('Login Success & Session Persistence', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(accounts.user.email, accounts.user.password);
      await loginPage.closeCsatIfVisible();
      
      // Verify correct landing page & session creation
      await loginPage.verifyDashboardVisible();

      // Session Persistence: Refresh page
      await page.reload();
      await loginPage.verifyDashboardVisible();
    });

    test('Logout', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(accounts.user.email, accounts.user.password);
      await loginPage.closeCsatIfVisible();
      await loginPage.verifyDashboardVisible();

      await dashboardPage.logout();

      // Verify protected pages inaccessible (redirects to login)
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Negative Scenarios', () => {
    test('Invalid Username', async () => {
      await loginPage.goto();
      await loginPage.login('wrong_user@dswd.gov.ph', accounts.user.password);
      await loginPage.verifyErrorVisible();
    });

    test('Invalid Password', async () => {
      await loginPage.goto();
      await loginPage.login(accounts.user.email, 'wrongpassword');
      await loginPage.verifyErrorVisible();
    });

    test('Empty Username & Password', async ({ page }) => {
      await loginPage.goto();
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      // Should show HTML5 validation or UI validation error
      // In Material UI, usually the required fields might block submission or show error state
      const isEmailInvalid = await page.evaluate(() => {
        const input = document.querySelector('input[type="email"]') as HTMLInputElement;
        return input && !input.validity.valid;
      });
      expect(isEmailInvalid).toBeTruthy();
    });
  });
});
