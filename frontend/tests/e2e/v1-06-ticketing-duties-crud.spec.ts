import { expect, test } from '@playwright/test';
import { navigate, saveDialog, setEveryonePresent, signIn, snackbar, superAdmin, unique } from './v1-helpers';

test.describe('Version 1 ticketing service — duties CRUD', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('super admin can manage roster, duty logs, exceptions, and meetings', async ({ page }) => {
    await signIn(page, superAdmin);
    await setEveryonePresent(page);
    await navigate(page, 'Duties', '/operations/duties');

    await page.getByRole('tab', { name: 'roster', exact: true }).click();
    await page.getByRole('button', { name: 'Manage Roster', exact: true }).click();
    const rosterDialog = page.getByRole('dialog', { name: 'Manage Duty Roster' });
    const roster = rosterDialog.getByRole('combobox').first();
    await roster.click();
    const rosterOptions = page.getByRole('option');
    await expect(rosterOptions.first()).toBeVisible();
    if ((await rosterOptions.first().getAttribute('aria-selected')) !== 'true') await rosterOptions.first().click();
    await page.keyboard.press('Escape');
    await rosterDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(rosterDialog).not.toBeVisible();

    const futureDate = (minimumDays: number) => new Date(Date.now() + (minimumDays + Math.floor(Math.random() * 300)) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const logDate = futureDate(4);
    const logRemark = unique('E2E duty log');
    const editedLogRemark = `${logRemark} edited`;
    await page.getByRole('tab', { name: 'Duty Log', exact: true }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('Date', { exact: true }).fill(logDate);
    const logDialog = page.getByRole('dialog').last();
    await logDialog.getByRole('combobox').nth(1).click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Remarks', { exact: true }).fill(logRemark);
    await saveDialog(page);
    await expect(page.locator('tr').filter({ hasText: logRemark }).last()).toBeVisible();
    await page.locator('tr').filter({ hasText: logRemark }).last().getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Remarks', { exact: true }).fill(editedLogRemark);
    await saveDialog(page);
    const editedLogRow = page.locator('tr').filter({ hasText: editedLogRemark }).last();
    await expect(editedLogRow).toBeVisible();
    await editedLogRow.getByRole('button', { name: 'Delete', exact: true }).click();
    const logDeleteDialog = page.getByRole('dialog', { name: /Delete Duty Log entry/ });
    await logDeleteDialog.getByRole('checkbox').check();
    await logDeleteDialog.getByRole('button', { name: 'Delete Permanently', exact: true }).click();
    await expect(page.locator('tr').filter({ hasText: editedLogRemark }).last()).not.toBeVisible();

    const exceptionDate = futureDate(5);
    const exceptionRemark = unique('E2E exception');
    const editedExceptionRemark = `${exceptionRemark} edited`;
    await page.getByRole('tab', { name: 'exceptions', exact: true }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('Date', { exact: true }).fill(exceptionDate);
    const exceptionDialog = page.getByRole('dialog').last();
    await exceptionDialog.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();
    await exceptionDialog.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'OTHER', exact: true }).click();
    await page.getByLabel('Remarks', { exact: true }).fill(exceptionRemark);
    await saveDialog(page);
    await expect(page.locator('tr').filter({ hasText: exceptionRemark }).last()).toBeVisible();

    // Negative CRUD: the same roster member cannot be both an exception and a duty
    // log entry on the same date.
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const duplicateExceptionDialog = page.getByRole('dialog').last();
    await duplicateExceptionDialog.getByLabel('Date', { exact: true }).fill(exceptionDate);
    await duplicateExceptionDialog.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();
    await duplicateExceptionDialog.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'OTHER', exact: true }).click();
    await duplicateExceptionDialog.getByLabel('Remarks', { exact: true }).fill(`${exceptionRemark} duplicate`);
    await duplicateExceptionDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await snackbar(page, /already|exist|duplicate|conflict|duty|exception/i);
    await duplicateExceptionDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.locator('tr').filter({ hasText: exceptionRemark }).last().getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Remarks', { exact: true }).fill(editedExceptionRemark);
    await saveDialog(page);
    const editedExceptionRow = page.locator('tr').filter({ hasText: editedExceptionRemark }).last();
    await expect(editedExceptionRow).toBeVisible();
    await editedExceptionRow.getByRole('button', { name: 'Delete', exact: true }).click();
    const exceptionDeleteDialog = page.getByRole('dialog', { name: /Delete Duty exception/ });
    await exceptionDeleteDialog.getByRole('checkbox').check();
    await exceptionDeleteDialog.getByRole('button', { name: 'Delete Permanently', exact: true }).click();
    await expect(page.locator('tr').filter({ hasText: editedExceptionRemark }).last()).not.toBeVisible();

    const meetingDate = futureDate(6);
    const meetingPurpose = unique('E2E Meeting');
    const editedMeetingPurpose = `${meetingPurpose} edited`;
    await page.getByRole('tab', { name: 'meetings', exact: true }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('Meeting Date', { exact: true }).fill(meetingDate);
    await page.getByLabel('Purpose', { exact: true }).fill(meetingPurpose);
    await saveDialog(page);
    await expect(page.locator('tr').filter({ hasText: meetingPurpose }).last()).toBeVisible();

    // Negative CRUD: a second meeting for the same date/period is rejected.
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const duplicateMeetingDialog = page.getByRole('dialog').last();
    await duplicateMeetingDialog.getByLabel('Meeting Date', { exact: true }).fill(meetingDate);
    await duplicateMeetingDialog.getByLabel('Purpose', { exact: true }).fill(`${meetingPurpose} duplicate`);
    await duplicateMeetingDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await snackbar(page, /already|exist|duplicate|conflict|meeting/i);
    await duplicateMeetingDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.locator('tr').filter({ hasText: meetingPurpose }).last().getByRole('button', { name: 'Edit meeting', exact: true }).click();
    await page.getByLabel('Purpose', { exact: true }).fill(editedMeetingPurpose);
    await saveDialog(page);
    await expect(page.locator('tr').filter({ hasText: editedMeetingPurpose }).last()).toBeVisible();
    await page.locator('tr').filter({ hasText: editedMeetingPurpose }).last().getByRole('button', { name: 'Delete meeting', exact: true }).click();
    await expect(page.locator('tr').filter({ hasText: editedMeetingPurpose }).last()).not.toBeVisible();
  });
});
