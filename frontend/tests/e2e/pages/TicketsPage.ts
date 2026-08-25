import { Page, expect } from '@playwright/test';

export class TicketsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async createTicket(subject: string, categoryName: string, requestedForEmail?: string) {
    const newTicketBtn = this.page.locator('button', { hasText: 'New Ticket' }).first();
    await expect(newTicketBtn).toBeVisible({ timeout: 15000 });
    await this.page.waitForTimeout(1000);
    await newTicketBtn.click();

    const proceedBtn = this.page.getByRole('button', { name: 'Proceed Anyway' });
    try {
      await proceedBtn.waitFor({ state: 'visible', timeout: 3000 });
      await proceedBtn.click();
      await this.page.waitForTimeout(1000);
    } catch (e) {
      // Proceed button didn't appear, ignore
    }

    const dialog = this.page.locator('.MuiDialog-root').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(1000);

    const subjectInput = this.page.getByRole('textbox', { name: /Subject/i });
    await subjectInput.fill(subject);
    await this.page
      .getByRole('textbox', { name: /Description/i })
      .fill('E2E automated test ticket.');

    if (requestedForEmail) {
      const reqForInput = dialog.getByLabel(/Requested For/i);
      await reqForInput.fill(requestedForEmail);
      await this.page.waitForTimeout(1500);
      const option = this.page.locator('.MuiAutocomplete-listbox li').first();
      await expect(option).toBeVisible({ timeout: 5000 });
      await option.click();
    }

    const categoryCard = dialog.locator('.MuiCard-root', { hasText: categoryName }).first();
    await expect(categoryCard).toBeVisible({ timeout: 5000 });
    await categoryCard.click();

    await this.page.waitForTimeout(500); // Allow categories to load based on support type
    const categoryDropdown = dialog.locator('label:has-text("Category")').first();
    if (await categoryDropdown.isVisible()) {
      const parent = categoryDropdown.locator('..');
      await parent.click();
      await this.page.waitForTimeout(500);
      const options = this.page.getByRole('option');
      if ((await options.count()) > 1) {
        await options.nth(1).click();
      } else {
        await this.page.keyboard.press('Escape');
      }
    }

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) => res.url().includes('/api/tickets') && res.request().method() === 'POST',
      ),
      this.page.getByRole('button', { name: 'Submit Ticket', exact: true }).click(),
    ]);

    expect(response.status()).toBe(201);
    await expect(this.page.locator('.notistack-Snackbar')).not.toBeVisible({ timeout: 15000 });
    await expect(dialog).toBeHidden({ timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  async openTicket(subject: string) {
    let row = this.page.locator('tr', { hasText: subject }).first();
    let found = false;

    // Auto-paginate to find ticket
    for (let i = 0; i < 10; i++) {
      try {
        await expect(row).toBeVisible({ timeout: 2000 });
        found = true;
        break;
      } catch {
        const hasNext = await this.nextPage();
        if (!hasNext) break;
      }
    }

    if (!found) {
      throw new Error(`Ticket with subject "${subject}" not found after pagination.`);
    }
    await row.getByRole('button', { name: 'View Details' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async nextPage(): Promise<boolean> {
    const nextBtn = this.page.getByRole('button', { name: 'Go to next page' });
    if ((await nextBtn.isVisible()) && !(await nextBtn.isDisabled())) {
      await nextBtn.click();
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async assignTicketToUserContaining(subject: string, nameSubstring: string) {
    // Requires admin/ticket admin rights
    // Increase rows per page to 50 if the dropdown is available to prevent pagination hiding the new ticket
    const rowsSelect = this.page.locator('.MuiTablePagination-select').first();
    if (await rowsSelect.isVisible()) {
      await rowsSelect.click();
      await this.page.getByRole('option', { name: '50' }).click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(500);
    }

    const row = this.page.locator('tr', { hasText: subject }).first();
    await expect(row).toBeVisible({ timeout: 15000 });

    // The assign button is a primary colored icon button inside the row
    const assignBtn = row.locator('button.MuiIconButton-colorPrimary').first();
    await assignBtn.click();

    const dialog = this.page.locator('.MuiDialog-root').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const input = dialog.getByRole('combobox', { name: /Technician/i }).first();
    await input.fill(nameSubstring);
    await this.page.waitForTimeout(1000);
    const option = this.page.getByRole('option', { name: new RegExp(nameSubstring, 'i') }).first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    await dialog.getByRole('button', { name: /Assign|Reassign/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  async updateStatus(newStatus: string, notes?: string, priority?: string) {
    const updateBtn = this.page.getByRole('button', { name: 'Update Status' });
    await updateBtn.waitFor({ state: 'visible' });
    await updateBtn.click();

    // Wait for inline editor instead of dialog
    const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });

    // Open Status select
    await this.page
      .locator('div[id="mui-component-select-status"], label:has-text("Status") + div')
      .click();
    await this.page.getByRole('option', { name: new RegExp(`^${newStatus}$`, 'i') }).click();

    if (priority) {
      await this.page.locator('label:has-text("Priority") + div').click();
      await this.page.getByRole('option', { name: new RegExp(`^${priority}$`, 'i') }).click();
    }

    if (notes) {
      await this.page.getByLabel(/Resolution Notes/i).fill(notes);
    }

    await saveBtn.click();
    await expect(saveBtn).toBeHidden({ timeout: 5000 });
    await this.page.waitForTimeout(1000);
  }

  async escalateTicket(reason: string, targetRole: string) {
    const escalateBtn = this.page.getByRole('button', { name: 'Escalate Ticket' }).first();
    await escalateBtn.waitFor({ state: 'visible' });
    await escalateBtn.click();

    const dialog = this.page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const input = dialog.getByRole('combobox', { name: /Escalate To/i });
    await input.fill(targetRole);
    console.log(targetRole);
    await this.page.waitForTimeout(1000);
    const optionsText = await this.page.locator('li[role="option"]').allInnerTexts();
    console.log(`Dropdown options for target ${targetRole}:`, optionsText);
    const option = this.page.getByRole('option', { name: new RegExp(targetRole, 'i') }).first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await this.page.getByLabel(/Reason/i).fill(reason);

    await this.page.getByRole('button', { name: 'Escalate', exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await this.page.waitForTimeout(1000);
  }

  async returnTicket(reason: string) {
    const returnBtn = this.page.getByRole('button', { name: 'Return', exact: true });
    await returnBtn.waitFor({ state: 'visible' });
    await returnBtn.click();

    const dialog = this.page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await this.page.getByLabel(/Reason/i).fill(reason);
    await this.page.getByRole('button', { name: 'Return Ticket', exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await this.page.waitForTimeout(1000);
  }

  async rateTicket() {
    const rateBtn = this.page.getByRole('button', { name: /Rate Resolution/i });
    if (await rateBtn.isVisible({ timeout: 5000 })) {
      await rateBtn.click();

      const dialog = this.page.locator('.MuiDialog-root');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      await this.page.getByRole('checkbox', { name: /consent/i }).check();

      const unitInput = this.page.getByRole('combobox', { name: /Unit\/Section/i });
      if (await unitInput.isEditable()) await unitInput.fill('Test');

      const firstNameInput = this.page.getByRole('textbox', { name: /First Name/i });
      if (await firstNameInput.isEditable()) await firstNameInput.fill('Juan');

      const lastNameInput = this.page.getByRole('textbox', { name: /Last Name/i });
      if (await lastNameInput.isEditable()) await lastNameInput.fill('Dela');

      await this.page.getByRole('spinbutton', { name: /Age/i }).fill('30');
      await this.page.getByRole('textbox', { name: /Religion/i }).fill('None');

      const sexInput = this.page.getByRole('combobox', { name: /Sex/i });

      if (await sexInput.isEnabled()) {
        await sexInput.click();
        await this.page.getByRole('option', { name: 'Male' }).click();
      }
      // await this.page.getByLabel(/Sex \*/i).click();
      // await this.page.getByRole('option', { name: 'Male', exact: true }).click();

      const toggleGroups = await this.page.getByRole('group').all();
      for (const group of toggleGroups) {
        const btn5 = group.locator('button[value="5"]');
        if (await btn5.isVisible()) await btn5.click();
      }

      await this.page.getByRole('button', { name: 'Submit Feedback' }).click();
      await expect(dialog).toBeHidden({ timeout: 10000 });
    }
  }

  async acceptTicket() {
    // If there's an accept button when assigned to a group or escalation
    const acceptBtn = this.page.getByRole('button', { name: 'Accept Ticket', exact: true });
    if (await acceptBtn.isVisible({ timeout: 5000 })) {
      await acceptBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }
  async waitForStatus(status: string) {
    // Wait for the status chip to update (e.g. "IN PROGRESS", "RESOLVED")
    const statusChip = this.page.locator('.MuiChip-label', {
      hasText: new RegExp(`^${status.replace('_', ' ')}$`, 'i'),
    });
    await expect(statusChip).toBeVisible({ timeout: 10000 });
  }
}
