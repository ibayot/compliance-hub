import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Force Logout on Role Change', () => {
  test.setTimeout(120000); // Increase timeout for slow dual-browser interactions

  test('User is forcefully logged out when their role is changed by an admin', async ({
    browser,
  }) => {
    const TARGET_USER = 'mjdibay@dswd.gov.ph';
    const ADMIN_USER = 'fo2admin@dswd.gov.ph';

    // 1. Context A: The Target User
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    const userLogin = new LoginPage(userPage);

    await userPage.goto('/');
    await userLogin.login(TARGET_USER, 'password123'); // Assuming standard password

    // Ensure user is on dashboard
    await expect(userPage.url()).toContain('/dashboard');

    // 2. Context B: The Super Admin
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const adminLogin = new LoginPage(adminPage);

    // Login as super admin
    await adminPage.goto('/');
    await adminLogin.login(ADMIN_USER, 'password123');

    const adminDashboard = new DashboardPage(adminPage);
    await adminDashboard.navigateTo('Settings');

    const adminUserMgmt = new UserManagementPage(adminPage);

    // Check what the current role is to toggle it
    await adminUserMgmt.searchUser(TARGET_USER);
    const row = adminPage.locator('tr', { hasText: TARGET_USER }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const roleText = await row.locator('td').nth(2).innerText();
    const isDesktopSupportJr =
      roleText.toLowerCase().includes('desktop') && roleText.toLowerCase().includes('jr');

    // We adjust to Compliance Officer if Desktop Support Junior, else Desktop Support Junior
    const roleToSelect = isDesktopSupportJr ? 'Compliance Officer' : 'Desktop Support Junior';
    const originalRoleToRestore = isDesktopSupportJr
      ? 'Desktop Support Junior'
      : 'Compliance Officer';

    await adminUserMgmt.editUserRole(TARGET_USER, roleToSelect);

    // 3. Back to Context A (Target User)
    // Bring the target user's page to the front so Chrome doesn't throttle the setInterval heartbeat
    await userPage.bringToFront();
    try {
      const snackbar = userPage.locator(
        'text=Your role has been updated. Please log in again to apply changes.',
      );
      await expect(snackbar).toBeVisible({ timeout: 70000 });
      await expect(userPage).toHaveURL(/.*\/login\?reason=role_changed/, { timeout: 10000 });
    } finally {
      // 4. Restore the role (Clean up) ALWAYS RUNS
      await adminUserMgmt.editUserRole(TARGET_USER, originalRoleToRestore);
    }

    await userContext.close();
    await adminContext.close();
  });
});
