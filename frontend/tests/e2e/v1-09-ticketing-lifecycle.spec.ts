import { expect, test } from '@playwright/test';
import { navigate, selectOption, setEveryonePresent, signIn, snackbar, superAdmin, ticketResult, unique } from './v1-helpers';

test.describe('Version 1 ticketing service — ticket lifecycle', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('super admin can submit a ticket through the UI and add a comment', async ({ page }) => {
    await signIn(page, superAdmin);
    const hasPresentTechnician = await setEveryonePresent(page);
    test.skip(
      !hasPresentTechnician,
      'Skipped: the online DTR view has no present technician for today, so ticket lifecycle cannot run.',
    );
    await navigate(page, 'Tickets', '/operations/tickets');

    await page.getByRole('button', { name: /Submit|New Ticket|Create Ticket/i }).first().click();
    const ticketSubject = unique('E2E ticket subject');
    const ticketDialog = page.getByRole('dialog', { name: 'Submit a Help Desk Ticket' });
    await ticketDialog.getByText('IT Support', { exact: true }).click();

    const categoryField = ticketDialog.getByLabel('Category', { exact: true });
    await categoryField.click();
    await page.getByRole('option', { name: /Active Directory/i }).click();
    const issueField = ticketDialog.getByLabel('Issue', { exact: true });
    await expect(issueField).toBeVisible({ timeout: 20_000 });
    await issueField.click();
    await page.getByRole('option', { name: /Password Concern/i }).click();
    await expect(issueField).toContainText('Password Concern');
    await ticketDialog.getByLabel('Subject *', { exact: true }).fill(ticketSubject);
    await ticketDialog.getByLabel('Description *', { exact: true }).fill('E2E ticket description for the ticket lifecycle flow.');
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    await ticketDialog.locator('input[type="file"]').setInputFiles({
      name: 'e2e-ticket.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await expect(ticketDialog.getByText(/e2e-ticket\.png/i)).toBeVisible();
    await selectOption(page, 'Priority', 'High — Significant impact', ticketDialog);
    await ticketDialog.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
    await expect(ticketDialog).not.toBeVisible({ timeout: 20_000 });

    await page.getByPlaceholder('Search by ticket number, subject, or requester name...', { exact: true }).fill(ticketSubject);
    const ticketRow = await ticketResult(page, ticketSubject);
    await expect(ticketRow).toBeVisible({ timeout: 20_000 });
    await expect(ticketRow).not.toContainText('Frances Jan Osalvo');
    await ticketRow.getByRole('button').first().click();
    await expect(page).toHaveURL(/\/operations\/tickets\/[0-9a-f-]+/i, { timeout: 20_000 });
    await expect(page.getByText(ticketSubject, { exact: true })).toBeVisible();
    await expect(page.getByText('Attached Image', { exact: true })).toBeVisible();

    // Negative input: an empty comment cannot be submitted.
    await expect(page.getByRole('button', { name: 'Add Comment', exact: true })).toBeDisabled();

    const ticketComment = unique('E2E ticket comment');
    await page.getByLabel('Add a comment', { exact: true }).fill(ticketComment);
    await page.locator('input[type="file"]').last().setInputFiles({
      name: 'e2e-comment.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await expect(page.getByText(/e2e-comment\.png/i)).toBeVisible();
    await page.getByRole('button', { name: 'Add Comment', exact: true }).click();
    await snackbar(page, /Comment added/i);
    await expect(page.getByText(ticketComment, { exact: true })).toBeVisible();

    // Freeze requires a justification; then resume and resolve the ticket.
    await page.getByRole('button', { name: 'Update Status', exact: true }).click();
    await selectOption(page, 'Status', 'On Hold');
    const statusSave = page.getByRole('button', { name: 'Save', exact: true }).last();
    await expect(statusSave).toBeDisabled();
    await page.getByRole('textbox', { name: /Status Justification/i }).fill('Waiting for the requester to provide required information.');
    await expect(statusSave).toBeEnabled();
    await statusSave.click();
    await snackbar(page, /Ticket updated/i);
    await expect(page.locator('body')).toContainText(/ON HOLD|On Hold|freeze/i);

    await page.getByRole('button', { name: 'Update Status', exact: true }).click();
    await selectOption(page, 'Status', 'In Progress');
    await page.getByRole('combobox', { name: /Priority.*High/i }).last().click();
    await page.getByRole('option', { name: 'Critical', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await snackbar(page, /Ticket updated/i);
    await expect(page.locator('body')).toContainText(/IN PROGRESS|In Progress/i);

    await page.getByRole('button', { name: 'Update Status', exact: true }).click();
    await selectOption(page, 'Status', 'Resolved');
    await page.getByLabel('Resolution Notes', { exact: true }).fill('E2E resolution notes: the requested service was completed and verified.');
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await snackbar(page, /Ticket updated/i);
    await expect(page.locator('body')).toContainText(/RESOLVED|Resolved/i);
  });
});
