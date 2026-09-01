import { expect, test } from '@playwright/test';
import {
  navigate,
  selectOption,
  setEveryonePresent,
  signIn,
  signOut,
  snackbar,
  superAdmin,
  ticketResult,
  unique,
} from './v1-helpers';

const escalationFocal = {
  email: process.env.E2E_ESCALATION_FOCAL_EMAIL || 'bejaun@dswd.gov.ph',
  password: process.env.E2E_ESCALATION_FOCAL_PASSWORD || 'secure-password1',
};

const ticketImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function createTicket(page: import('@playwright/test').Page, subject: string) {
  await navigate(page, 'Tickets', '/operations/tickets');
  await page.getByRole('button', { name: /Submit|New Ticket|Create Ticket/i }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Submit a Help Desk Ticket' });
  await dialog.getByText('IT Support', { exact: true }).click();
  await selectOption(page, 'Category', /Active Directory/i, dialog);
  const issue = dialog.getByLabel('Issue', { exact: true });
  if (await issue.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await issue.click();
    await page.getByRole('option').last().click();
  }
  await dialog.getByLabel('Subject *', { exact: true }).fill(subject);
  await dialog.getByLabel('Description *', { exact: true }).fill('E2E escalation flow description.');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'e2e-escalation-ticket.png',
    mimeType: 'image/png',
    buffer: ticketImage,
  });
  await selectOption(page, 'Priority', 'High — Significant impact', dialog);
  const ticketRequest = page.waitForRequest(
    (request) => request.url().includes('/tickets') && request.method() === 'POST',
  );
  const ticketResponse = page.waitForResponse(
    (response) => response.url().includes('/tickets') && response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  const request = await ticketRequest;
  const response = await ticketResponse;
  if (!response.ok()) {
    throw new Error(
      `Escalation test ticket submission returned HTTP ${response.status()}: ${(await response.text()).slice(0, 500)}; payload=${request.postData() ?? '<empty>'}`,
    );
  }
  await expect(dialog).not.toBeVisible({ timeout: 20_000 });
  // Tickets are server-paginated, so search for the newly created ticket before opening it.
  await page
    .getByPlaceholder('Search by ticket number, subject, or requester name...', { exact: true })
    .fill(subject);
  const row = await ticketResult(page, subject);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole('button').first().click();
  await expect(page).toHaveURL(/\/operations\/tickets\/[0-9a-f-]+/i, { timeout: 20_000 });
  return page;
}

async function escalateToBernardo(page: import('@playwright/test').Page, note: string) {
  await page.getByRole('button', { name: 'Escalate Ticket', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Escalate Ticket' });
  const recipient = dialog.getByLabel('Escalate To', { exact: true });
  await recipient.click();
  await expect(page.getByRole('option').filter({ hasText: /Bernardo Juan/i }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('option').filter({ hasText: /Bernardo Juan/i }).first().click();
  await dialog.getByLabel('Reason for escalation (optional)', { exact: true }).fill(note);
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'e2e-escalation-proof.png',
    mimeType: 'image/png',
    buffer: ticketImage,
  });
  await expect(dialog.getByText(/1 file\(s\) selected/i)).toBeVisible();
  const escalationResponse = page.waitForResponse(
    (response) => response.url().includes('/escalate') && response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Escalate', exact: true }).click();
  const response = await escalationResponse;
  if (!response.ok()) {
    throw new Error(`Escalation submit returned HTTP ${response.status()}: ${(await response.text()).slice(0, 500)}`);
  }
  await snackbar(page, /Ticket escalated successfully/i);
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible();
}

test.describe('Version 1 ticketing service — escalation and de-escalation', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('a focal can return a pending escalation, then accept a later escalation', async ({ page }) => {
    await signIn(page, superAdmin);
    const hasPresentTechnician = await setEveryonePresent(page);
    test.skip(
      !hasPresentTechnician,
      'Skipped: the online DTR view has no present technician for today, so escalation lifecycle cannot run.',
    );
    const subject = unique('E2E escalation ticket');
    await createTicket(page, subject);
    await escalateToBernardo(page, 'E2E escalation return path.');

    // The focal uses the intended queue UI, not a constructed detail URL.
    await signOut(page);
    await signIn(page, escalationFocal);
    await navigate(page, 'Tickets', '/operations/tickets');
    await page.getByRole('button', { name: 'Escalated To Me', exact: true }).click();
    await page.getByPlaceholder('Search by ticket number, subject, or requester name...').fill(subject);
    const pendingTicket = await ticketResult(page, subject);
    await expect(pendingTicket).toBeVisible({ timeout: 20_000 });
    await pendingTicket.getByRole('button').first().click();
    await expect(page.getByText('PENDING', { exact: true })).toBeVisible();

    // Negative path: Return is disabled until a reason is entered.
    await page.getByRole('button', { name: 'Return', exact: true }).click();
    const returnDialog = page.getByRole('dialog', { name: 'Return Ticket' });
    await expect(returnDialog.getByRole('button', { name: 'Return Ticket', exact: true })).toBeDisabled();
    await returnDialog.getByLabel('Reason for returning *', { exact: true }).fill('E2E focal is returning the ticket for reassignment.');
    await returnDialog.getByRole('button', { name: 'Return Ticket', exact: true }).click();
    await snackbar(page, /Ticket returned to escalating technician/i);
    await expect(page).toHaveURL(/\/operations\/tickets(?:$|[?#])/i);

    // Escalate the same ticket again from the administrator queue and accept it.
    await signOut(page);
    await signIn(page, superAdmin);
    await navigate(page, 'Tickets', '/operations/tickets');
    await page.getByPlaceholder('Search by ticket number, subject, or requester name...').fill(subject);
    const returnedTicket = await ticketResult(page, subject);
    await expect(returnedTicket).toBeVisible({ timeout: 20_000 });
    await returnedTicket.getByRole('button').first().click();
    await expect(page.getByRole('button', { name: 'Escalate Ticket', exact: true })).toBeVisible();
    await escalateToBernardo(page, 'E2E escalation acceptance path.');

    await signOut(page);
    await signIn(page, escalationFocal);
    await navigate(page, 'Tickets', '/operations/tickets');
    await page.getByRole('button', { name: 'Escalated To Me', exact: true }).click();
    await page.getByPlaceholder('Search by ticket number, subject, or requester name...').fill(subject);
    const acceptedTicket = await ticketResult(page, subject);
    await expect(acceptedTicket).toBeVisible({ timeout: 20_000 });
    await acceptedTicket.getByRole('button').first().click();
    await page.getByRole('button', { name: 'Accept', exact: true }).click();
    await snackbar(page, /Escalation accepted/i);
    await expect(page.locator('body')).toContainText(/IN PROGRESS|In Progress/i);
  });
});
