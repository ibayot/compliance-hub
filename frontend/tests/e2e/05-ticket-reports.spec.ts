import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import accounts from './data/accounts.json';

test.describe('Suite 5 — TICKET REPORTS', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('Ticket Admin Reports', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await dashboardPage.navigateTo('Ticket Reports');

    // Wait for the overview report to load (cards are always rendered)
    const card = page.locator('.MuiCard-root').first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // Test Date filter
    const dateInput = page.getByLabel(/Year/i).first();
    if (await dateInput.isVisible()) {
      await dateInput.click();
      await page.waitForTimeout(500); // allow dropdown animation
      await page.keyboard.press('Escape');
    }

    // Detailed Ratings (might be a tab)
    const ratingsTab = page.getByRole('button', { name: /Detailed Ratings/i });
    if (await ratingsTab.isVisible()) {
      await ratingsTab.click();
      const ratingsCard = page.locator('.MuiCard-root').first();
      await expect(ratingsCard).toBeVisible({ timeout: 15000 });
    }
  });

  test('Desktop Technician Reports', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(accounts.desktopJr.email, accounts.desktopJr.password);

    // Some tech dashboard might have a reports tab or embedded reports
    // If they have a dedicated Reports menu:
    const reportsMenu = page
      .locator('.MuiListItemButton-root', { hasText: /Ticket Reports/i })
      .first();
    if (await reportsMenu.isVisible()) {
      await dashboardPage.navigateTo('Ticket Reports');

      const card = page.locator('.MuiCard-root').first();
      await expect(card).toBeVisible({ timeout: 15000 });

      // Detailed Ratings
      const ratingsTab = page.getByRole('button', { name: /Detailed Ratings/i });
      if (await ratingsTab.isVisible()) {
        await ratingsTab.click();
        const ratingsCard = page.locator('.MuiCard-root').first();
        await expect(ratingsCard).toBeVisible({ timeout: 15000 });
      }
    }
  });
});
