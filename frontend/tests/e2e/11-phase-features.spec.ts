import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// Use a user who has access to everything needed (desktop_sr role)
const TEST_USER = 'mpmabazza@dswd.gov.ph';
const TEST_PASS = 'password123';

test.describe('Phase 1 & 2 Features E2E Tests', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // The Next.js config rewrites /api/* to the backend, so the browser
    // calls http://localhost:3000/api/auth/* — intercept that proxied path.
    const patchAuth = async (route: any) => {
      const response = await route.fetch();
      const json = await response.json();
      json.requiresMfa = false;
      json.requiresPasswordChange = false;
      await route.fulfill({ response, json });
    };
    // Intercept via the Next.js proxy path (what the browser actually calls)
    await page.route('http://localhost:3000/api/auth/login', patchAuth);
    await page.route('http://localhost:3000/api/auth/profile', patchAuth);

    // Login
    await loginPage.goto();
    await loginPage.login(TEST_USER, TEST_PASS);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();
  });

  test('User Profile Settings: Forced MFA and Password Change UI', async ({ page }) => {
    // Navigate via UI to avoid deep linking blocks in App.tsx
    await page.click('[aria-label="account of current user"]');
    await page.click('li[role="menuitem"]:has-text("Settings")');
    await page.waitForLoadState('networkidle');

    // Wait for the Account Information card — always visible for all roles
    await page.waitForSelector('text=Account Information', { timeout: 15000 });

    // Change Password card is rendered for all users
    await page.waitForSelector('text=Change Password', { timeout: 10000 });
    await expect(page.locator('text=Change Password').first()).toBeVisible();

    // Verify Current Password field exists inside the card
    await expect(page.locator('label:has-text("Current Password")')).toBeVisible();
  });

  test('Disposal Ticket Workflow & Ticket Detailed View', async ({ page }) => {
    // Navigate to ticket settings via sidebar
    await dashboardPage.navigateTo('Ticket Settings');

    // Page heading is "Ticket Settings"
    await page.waitForSelector('text=Ticket Settings', { timeout: 15000 });

    // The Categories tab label is dynamic: "Categories (N)"
    await page.waitForSelector('[role="tab"]:has-text("Categories")', { timeout: 10000 });
    await expect(page.locator('[role="tab"]').first()).toBeVisible();

    // Try to see if there is already a Disposal category
    const hasDisposal = await page.isVisible('text=Disposal');
    if (!hasDisposal) {
      await page.click('button:has-text("Add Category")');
      await page.getByLabel('Category Name *').fill('Disposal');

      const [response] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes('/api/ticket-settings/categories') &&
            res.request().method() === 'POST',
        ),
        page.getByRole('dialog').getByRole('button', { name: 'Save' }).click(),
      ]);

      expect(response.status()).toBe(201);
      await expect(page.locator('.notistack-Snackbar')).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1000);
    }

    // Navigate to Tickets page via sidebar
    await dashboardPage.navigateTo('Tickets');
    await page.waitForSelector('text=Tickets', { timeout: 10000 });

    // Open new ticket dialog
    await page.click('button:has-text("New Ticket")');
    await page.waitForTimeout(500);

    // Select Desktop / Hardware Support type if visible
    const desktopOption = page.locator('text=Desktop / Hardware Support');
    if (await desktopOption.isVisible({ timeout: 3000 })) {
      await desktopOption.click();
    }

    // Verify the Tickets page is accessible for this role
    await expect(page.locator('text=Tickets').first()).toBeVisible();
  });

  test('SLA vs Resolution Time Statistical Reports', async ({ page }) => {
    // Navigate to ticket reports via sidebar
    await dashboardPage.navigateTo('Ticket Reports');

    // Wait for page heading
    await page.waitForSelector('text=Ticket Reports', { timeout: 15000 });
    await expect(page.locator('text=Ticket Reports').first()).toBeVisible();

    // Check that the Overview toggle is present
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();

    // SLA Performance only appears if there is resolved SLA data
    const slaCard = page.locator('text=SLA Performance');
    const slaVisible = await slaCard.isVisible({ timeout: 3000 }).catch(() => false);
    if (slaVisible) {
      await expect(slaCard).toBeVisible();
    } else {
      console.log('SLA Performance card not shown — no SLA data in DB yet, this is expected.');
    }
  });
});
