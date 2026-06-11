import { Page, expect } from '@playwright/test';

export class UserManagementPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async openCreateUserDialog() {
    const createBtn = this.page.locator('button', { hasText: /Create New User/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();
    
    const dialog = this.page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    return dialog;
  }

  async createUser(email: string, firstName: string, lastName: string, roleName: string) {
    const dialog = await this.openCreateUserDialog();
    await dialog.getByLabel(/Email Address/i).fill(email);
    // Add Temporary Password required field
    await dialog.getByLabel(/Temporary Password/i).fill('password123');
    await dialog.getByLabel(/First Name/i).fill(firstName);
    await dialog.getByLabel(/Last Name/i).fill(lastName);
    
    // Select Role
    await dialog.getByLabel(/Role/i).first().click();
    await this.page.getByRole('option', { name: new RegExp(roleName, 'i') }).first().click();

    await dialog.getByRole('button', { name: 'Create User', exact: true }).click();
    await expect(this.page.getByText(/created successfully/i)).toBeVisible({ timeout: 10000 });
    await expect(dialog).toBeHidden({ timeout: 5000 });
  }

  async searchUser(email: string) {
    const searchInput = this.page.locator('input[placeholder*="Search staff"]');
    await expect(searchInput).toBeVisible({ timeout: 30000 });
    await searchInput.fill(email);
    await this.page.waitForTimeout(1500); // Wait for debounce
  }

  async verifyUserInTable(email: string) {
    const tableCell = this.page.locator('td', { hasText: email }).first();
    await expect(tableCell).toBeVisible({ timeout: 10000 });
  }

  async editUserRole(email: string, newRoleName: string) {
    await this.searchUser(email);
    const row = this.page.locator('tr', { hasText: email }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const editBtn = row.getByRole('button', { name: /edit/i });
    await editBtn.click();

    const dialog = this.page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await dialog.getByLabel(/Role/i).first().click();
    await this.page.getByRole('option', { name: new RegExp(newRoleName, 'i') }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(this.page.getByText(/User profile updated successfully/i).first()).toBeVisible({ timeout: 10000 });
  }

  async deactivateUser(email: string) {
    // We assume deactivate logic is an edit -> switch active to inactive, or a dedicated button.
    // This will depend on the exact UI, but we'll try to find a switch or a deactivate action.
    await this.searchUser(email);
    const row = this.page.locator('tr', { hasText: email }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const editBtn = row.getByRole('button', { name: /edit/i });
    await editBtn.click();
    
    const dialog = this.page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Look for active switch or checkbox
    const activeSwitch = dialog.locator('input[type="checkbox"][name="isActive"], input[type="checkbox"][name="active"]');
    if (await activeSwitch.isVisible()) {
        const isChecked = await activeSwitch.isChecked();
        if (isChecked) {
            await activeSwitch.click(); // deactivate
        }
    }
    
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(this.page.getByText(/User profile updated successfully/i).first()).toBeVisible({ timeout: 10000 });
  }

  async nextPage() {
    const nextPageBtn = this.page.locator('button[title="Go to next page"]');
    if (await nextPageBtn.isVisible() && await nextPageBtn.isEnabled()) {
      await nextPageBtn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }
}
