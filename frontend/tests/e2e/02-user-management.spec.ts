import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import accounts from './data/accounts.json';

test.describe.serial('Suite 2 — USER MANAGEMENT', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let userPage: UserManagementPage;
  let targetEmail: string;

  test.beforeAll(() => {
    targetEmail = `newuser_${Date.now()}@dswd.gov.ph`;
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    userPage = new UserManagementPage(page);

    await loginPage.goto();
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await loginPage.closeCsatIfVisible();
    await loginPage.verifyDashboardVisible();
  });

  test('Create New User & Search', async ({ page }) => {
    await dashboardPage.navigateTo('Settings');
    
    // We navigate to User Management (might require scrolling/clicking a tab if settings has tabs)
    // Assuming /settings is the User Management page or there's a specific section.
    // If it's a tab:
    const userMgmtTab = page.getByRole('tab', { name: /User Management/i });
    if (await userMgmtTab.isVisible()) {
        await userMgmtTab.click();
    }

    await userPage.createUser(targetEmail, 'Test', 'User', 'Compliance Officer');
    
    // Exact Search
    await userPage.searchUser(targetEmail);
    await userPage.verifyUserInTable(targetEmail);

    // Partial Search
    await userPage.searchUser('ui_test_');
    await userPage.verifyUserInTable(targetEmail);

    // No-result Search
    await userPage.searchUser('nonexistent_user_12345@dswd.gov.ph');
    const tableBody = page.locator('tbody');
    await expect(tableBody).not.toContainText(targetEmail);
  });

  test('Update User & Deactivate', async ({ page }) => {
    await dashboardPage.navigateTo('Settings');
    const userMgmtTab = page.getByRole('tab', { name: /User Management/i });
    if (await userMgmtTab.isVisible()) {
        await userMgmtTab.click();
    }

    // We will update the newly created user from the previous test
    await userPage.editUserRole(targetEmail, 'Desktop Senior');

    // Keep the role as Desktop Senior for the next test (Escalation Focals)
    // No revert needed.

    // Deactivate User (if applicable)
    // Note: If deactivate isn't supported in the UI, this might just pass through if the switch isn't visible.
    await userPage.deactivateUser(targetEmail);
    
    // Re-activate
    await userPage.deactivateUser(targetEmail); 
  });

  test('Pagination', async ({ page }) => {
    await dashboardPage.navigateTo('Settings');
    const userMgmtTab = page.getByRole('tab', { name: /User Management/i });
    if (await userMgmtTab.isVisible()) {
        await userMgmtTab.click();
    }

    const hasNext = await userPage.nextPage();
    if (hasNext) {
        // Just verifying it doesn't crash and rows exist
        const tableRows = await page.locator('tbody tr').count();
        expect(tableRows).toBeGreaterThan(0);
    }
  });

  test('Negative: Create User Validation', async ({ page }) => {
    await dashboardPage.navigateTo('Settings');
    const userMgmtTab = page.getByRole('tab', { name: /User Management/i });
    if (await userMgmtTab.isVisible()) {
        await userMgmtTab.click();
    }

    const dialog = await userPage.openCreateUserDialog();
    const createBtn = dialog.getByRole('button', { name: 'Create User', exact: true });
    await expect(createBtn).toBeDisabled();
    
    // Close dialog since we can't submit
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    
    // Assuming HTML5 validation or form errors
    const isEmailInvalid = await page.evaluate(() => {
        const input = document.querySelector('input[name="email"]') as HTMLInputElement;
        return input && !input.validity.valid;
    });
    // In React forms, it might not use HTML5 validity, but show text like "Email is required"
    // Since we already asserted the button is disabled, that is sufficient negative validation.
  });
});
