import { Page, expect } from '@playwright/test';

export class TicketSettingsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToTab(tabName: string) {
    const tab = this.page.getByRole('tab', { name: new RegExp(tabName, 'i') });
    await expect(tab).toBeVisible({ timeout: 10000 });
    await tab.click();
    await this.page.waitForTimeout(1000);
  }

  async addEscalationFocal(ticketType: string, focalRoleName: string) {
    await this.navigateToTab('Escalation Focals');
    
    // Check if it already exists in the table to avoid unique constraint errors
    const table = this.page.locator('table').first();
    const isExisting = await table.getByText(new RegExp(focalRoleName, 'i')).isVisible();
    if (isExisting) {
        return;
    }

    // Check if focal button is present
    const addBtn = this.page.locator('button', { hasText: /Add Focal|Create Focal/i }).first();
    if (await addBtn.isVisible()) {
        await addBtn.click();
        
        const dialog = this.page.locator('.MuiDialog-root');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Select ticket type
        await dialog.getByLabel(/Ticket Type/i).first().click();
        await this.page.getByRole('option', { name: new RegExp(ticketType, 'i') }).click();

        // Select Role Value
        await dialog.locator('.MuiSelect-select').nth(1).click();
        await this.page.getByRole('option', { name: new RegExp(focalRoleName, 'i') }).click();

        await dialog.getByRole('button', { name: /Add/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });
    }
  }
}
