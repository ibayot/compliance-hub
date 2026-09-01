import { expect, test } from '@playwright/test';
import {
  navigate,
  createE2ERegularAccount,
  selectOption,
  setEveryonePresent,
  signIn,
  signOut,
  snackbar,
  superAdmin,
  ticketResult,
  unique,
} from './v1-helpers';

test.describe('Version 1 ticketing service — requester rating and report precision', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('the regular requester rates a resolved ticket and reports show two-decimal averages', async ({ page, browser }) => {
    await signIn(page, superAdmin);
    const hasPresentTechnician = await setEveryonePresent(page);
    test.skip(
      !hasPresentTechnician,
      'Skipped: the online DTR view has no present technician for today, so requester rating lifecycle cannot run.',
    );

    const subject = unique('E2E requester rating ticket');
    const regularUser = await createE2ERegularAccount(browser);

    const dismissPendingReminder = async () => {
      const reminder = page.getByRole('dialog', { name: 'Pending Satisfaction Reminder' });
      let shown = false;
      try {
        await expect(reminder).toBeVisible({ timeout: 10_000 });
        shown = true;
      } catch {
        // No pending reminder was shown for this login.
      }
      if (!shown) return;
      const proceed = reminder.getByRole('button', { name: 'Proceed Anyway', exact: true });
      if (await proceed.isVisible().catch(() => false)) {
        await proceed.click();
      } else {
        await reminder.getByRole('button', { name: 'Close', exact: true }).click();
      }
      await expect(reminder).not.toBeVisible();
    };

    // Create the ticket as the actual regular requester through the ticket form.
    await signIn(page, regularUser);
    await dismissPendingReminder();
    await navigate(page, 'Tickets', '/operations/tickets');
    await page.getByRole('button', { name: /Submit|New Ticket|Create Ticket/i }).first().click();
    // Opening a new request may trigger the reminder again; proceed through
    // that visible modal so the requester form can continue.
    await dismissPendingReminder();
    const submitDialog = page.getByRole('dialog', { name: 'Submit a Help Desk Ticket' });
    await submitDialog.getByText('IT Support', { exact: true }).click();
    await selectOption(page, 'Category', /Active Directory/i, submitDialog);
    const issue = submitDialog.getByLabel('Issue', { exact: true });
    if (await issue.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await issue.click();
      await page.getByRole('option').last().click();
    }
    await submitDialog.getByLabel('Subject *', { exact: true }).fill(subject);
    await submitDialog
      .getByLabel('Description *', { exact: true })
      .fill('E2E ticket used to verify requester satisfaction rating and report precision.');
    const ticketResponse = page.waitForResponse(
      (response) => response.url().includes('/tickets') && response.request().method() === 'POST',
    );
    await submitDialog.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
    const createdResponse = await ticketResponse;
    if (!createdResponse.ok()) {
      throw new Error(
        `Ticket submission returned HTTP ${createdResponse.status()}: ${(await createdResponse.text()).slice(0, 500)}`,
      );
    }
    await expect(submitDialog).not.toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder('Search by ticket number, subject, or requester name...', { exact: true }).fill(subject);
    const createdRow = await ticketResult(page, subject);
    await expect(createdRow).toBeVisible({ timeout: 20_000 });

    // Resolve the ticket through the administrator UI.
    await signOut(page);
    await signIn(page, superAdmin);
    await setEveryonePresent(page);
    await navigate(page, 'Tickets', '/operations/tickets');
    await page.getByPlaceholder('Search by ticket number, subject, or requester name...').fill(subject);
    const adminRow = await ticketResult(page, subject);
    await expect(adminRow).toBeVisible({ timeout: 20_000 });
    await adminRow.getByRole('button').first().click();
    await expect(page).toHaveURL(/\/operations\/tickets\/[0-9a-f-]+/i, { timeout: 20_000 });

    // Regular requesters do not choose an issue type. Assign one through the
    // administrator's visible header control before moving the ticket forward.
    const headerComboboxes = page.locator('main').getByRole('combobox');
    await expect(headerComboboxes).toHaveCount(3);
    await headerComboboxes.nth(2).click();
    await page.getByRole('option').last().click();
    await snackbar(page, /Ticket issue updated/i);

    await page.getByRole('button', { name: /Assign Technician|Reassign Ticket/i }).click();
    const assignDialog = page.getByRole('dialog', { name: /Assign Technician|Reassign Technician/i });
    await assignDialog.getByLabel('Assign Technician', { exact: true }).click();
    // Choose the first real present technician. The synthetic opted-out E2E
    // account remains available for explicit manual selection, but it is not
    // clocked in and therefore cannot be assigned by this lifecycle flow.
    const assignmentOption = page.getByRole('option').first();
    await expect(assignmentOption).toBeVisible({ timeout: 20_000 });
    await assignmentOption.click();
    await assignDialog.getByRole('button', { name: 'Assign', exact: true }).click();
    // The assignment action is confirmed by the dialog closing. The success
    // snackbar is transient and may be replaced while the ticket detail
    // refreshes, so it is not a stable assertion for this lifecycle test.
    await expect(assignDialog).toBeHidden({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Update Status', exact: true }).click();
    const statusField = page.getByLabel('Status', { exact: true });
    await statusField.click();
    const inProgressOption = page.getByRole('option', { name: 'In Progress', exact: true });
    if (await inProgressOption.isVisible().catch(() => false)) {
      await inProgressOption.click();
    } else {
      // Automatic assignment may have already advanced the ticket to
      // IN_PROGRESS before the administrator opens it.
      await page.keyboard.press('Escape');
    }
    const priorityField = page.getByLabel(/Priority/).last();
    await priorityField.click();
    await page.getByRole('option', { name: 'High', exact: true }).last().click();
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await snackbar(page, /Ticket updated/i);

    await page.getByRole('button', { name: 'Update Status', exact: true }).click();
    await selectOption(page, 'Status', 'Resolved');
    await page
      .getByLabel('Resolution Notes', { exact: true })
      .fill('E2E resolution completed so the requester can provide satisfaction feedback.');
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await snackbar(page, /Ticket updated/i);
    await expect(page.locator('body')).toContainText(/RESOLVED|Resolved/i);

    // Return to the requester account and submit the full satisfaction form.
    await signOut(page);
    await signIn(page, regularUser);
    await dismissPendingReminder();
    await navigate(page, 'Tickets', '/operations/tickets');
    await page.getByPlaceholder('Search by ticket number, subject, or requester name...').fill(subject);
    const requesterRow = await ticketResult(page, subject);
    await expect(requesterRow).toBeVisible({ timeout: 20_000 });
    await requesterRow.getByRole('button').first().click();
    await expect(page).toHaveURL(/\/operations\/tickets\/[0-9a-f-]+/i, { timeout: 20_000 });
    await page.getByRole('button', { name: 'Rate Resolution', exact: true }).click();

    const ratingDialog = page.getByRole('dialog').filter({ hasText: 'CLIENT SATISFACTION MEASUREMENT FORM' });
    await expect(ratingDialog).toBeVisible();
    await ratingDialog.locator('input[type="checkbox"]').first().check();

    const unitField = ratingDialog.getByLabel('Unit/Section *', { exact: true });
    if (!(await unitField.isDisabled())) await unitField.fill('E2E Unit');
    const sexField = ratingDialog.getByLabel('Sex *', { exact: true });
    if (!(await sexField.isDisabled())) await selectOption(page, 'Sex *', 'Prefer Not to Say', ratingDialog);

    // Six numeric items are applicable; the three remaining items are N/A.
    const groups = ratingDialog.locator('[role="group"]');
    await expect(groups).toHaveCount(6);
    for (const [index, value] of [5, 4, 3, 2, 4, 5].entries()) {
      await groups.nth(index).getByRole('button').nth(value - 1).click();
    }
    await ratingDialog.getByRole('button', { name: 'Submit Feedback', exact: true }).click();
    await snackbar(page, /Thank you for your feedback/i);
    await expect(page.getByText('3.83/5', { exact: true })).toBeVisible({ timeout: 20_000 });

    // Ticket Reports must render averages to exactly two decimal places.
    await signOut(page);
    await signIn(page, superAdmin);
    await navigate(page, 'Ticket Reports', '/operations/reports');
    await expect(page.getByText(/Satisfaction ratings overview/i)).toBeVisible({ timeout: 30_000 });
    const overviewButton = page.getByRole('button', { name: 'Overview', exact: true });
    await overviewButton.click();
    await expect(overviewButton).toHaveAttribute('aria-pressed', 'true');
    const supportHeadings = page.getByRole('heading', { name: 'Average Rating by Support Type', exact: true });
    let supportHeading = supportHeadings.first();
    for (let index = 0; index < (await supportHeadings.count()); index += 1) {
      if (await supportHeadings.nth(index).isVisible().catch(() => false)) {
        supportHeading = supportHeadings.nth(index);
        break;
      }
    }
    const supportCard = supportHeading.locator('xpath=ancestor::div[1]');
    await expect.poll(() => supportCard.innerText(), { timeout: 60_000 }).toMatch(
      /IT Support|No rated tickets in this period/i,
    );
    await expect.poll(() => supportCard.innerText(), { timeout: 30_000 }).toMatch(/rated\s*\/.*tickets/i);
    await expect.poll(() => supportCard.innerText(), { timeout: 30_000 }).toMatch(/\b\d+\.\d{2}\b/);

    const technicianTables = page.locator('table').filter({ hasText: 'Technician' }).filter({ hasText: 'Avg Rating' });
    let technicianTable = technicianTables.first();
    for (let index = 0; index < (await technicianTables.count()); index += 1) {
      if (await technicianTables.nth(index).isVisible().catch(() => false)) {
        technicianTable = technicianTables.nth(index);
        break;
      }
    }
    if (await technicianTables.count()) {
      const technicianAverageCells = technicianTable.locator('tbody tr td:last-child p');
      const count = await technicianAverageCells.count();
      expect(count).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        await expect(technicianAverageCells.nth(index)).toHaveText(/^\d+\.\d{2}$/);
      }
    }
  });
});
