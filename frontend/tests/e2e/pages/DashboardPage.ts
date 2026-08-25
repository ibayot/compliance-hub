import { Page, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async logout() {
    const avatar = this.page.locator('button[aria-label="account of current user"]');
    await avatar.waitFor({ state: 'visible', timeout: 5000 });
    await avatar.click();
    await this.page.waitForTimeout(300);
    await this.page.getByText('Logout').click();

    // Verify logged out
    await expect(this.page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
  }

  async closeSatisfactionReminder() {
    try {
      const dialog = this.page.locator('.MuiDialog-root');
      // Wait for dialog to appear, max 3 seconds
      await dialog.first().waitFor({ state: 'visible', timeout: 3000 });
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);

      // If still visible, try clicking Close button
      try {
        await dialog.first().waitFor({ state: 'visible', timeout: 1000 });
        const closeBtn = this.page.getByRole('button', { name: 'Close' });
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      } catch {
        // Dialog already closed
      }

      await expect(dialog.first())
        .toBeHidden({ timeout: 5000 })
        .catch(() => {});
    } catch {
      // Ignore errors (dialog never appeared)
    }
  }

  async navigateTo(menuName: string) {
    // MUI Sidebar uses ListItemButton without nav tags
    const link = this.page.locator(`.MuiListItemButton-root[aria-label="${menuName}"]`).first();
    await link.waitFor({ state: 'visible' });
    await link.click();
    await this.page.waitForLoadState('networkidle');
  }
}
