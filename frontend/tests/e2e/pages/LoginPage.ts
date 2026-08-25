import { Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string = 'password123') {
    const emailInput = this.page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);

    const passInput = this.page.locator('input[type="password"]');
    await passInput.waitFor({ state: 'visible' });
    await passInput.fill(password);

    await this.page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await this.page.waitForURL(/.*\/dashboard/, { timeout: 15000 }).catch(() => {});
    await this.closeAnyDialogIfVisible();
  }

  async closeAnyDialogIfVisible() {
    try {
      const dialog = this.page.locator('.MuiDialog-root, [role="dialog"]');

      // Wait up to 3000ms for it to appear asynchronously (e.g. CSAT pending check)
      await dialog
        .first()
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => {});

      if (await dialog.first().isVisible()) {
        const closeBtn = this.page.getByRole('button', { name: 'Close' });
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }

      await expect(dialog.first())
        .toBeHidden({ timeout: 5000 })
        .catch(() => {});
    } catch {
      // Ignore errors (dialog never appeared)
    }
  }

  // Backwards compatibility for tests that explicitly call it
  async closeCsatIfVisible() {
    await this.closeAnyDialogIfVisible();
  }

  async verifyDashboardVisible() {
    await expect(this.page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  }

  async verifyErrorVisible() {
    const alert = this.page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 10000 });
  }
}
