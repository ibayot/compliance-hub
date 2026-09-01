import { expect, test } from '@playwright/test';
import {
  dismissPendingSatisfactionReminder,
  createE2ERegularAccount,
  navigate,
  signIn,
  signOut,
  superAdmin,
  snackbar,
  unique,
} from './v1-helpers';

test.describe('Version 1 ticketing service — feedback workflow', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('a user submits feedback and an administrator accepts or rejects it', async ({ page, browser }) => {
    const acceptedSuggestion = unique('E2E feedback accepted');
    const rejectedSuggestion = unique('E2E feedback rejected');
    const regularUser = await createE2ERegularAccount(browser);

    await signIn(page, regularUser);
    await dismissPendingSatisfactionReminder(page);
    await page.getByRole('button', { name: 'account of current user' }).click();
    await dismissPendingSatisfactionReminder(page);
    await page.getByRole('menuitem', { name: 'Suggestions', exact: true }).click();
    const feedbackDialog = page.getByRole('dialog', { name: 'Help Us Improve' });
    await expect(feedbackDialog.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
    await feedbackDialog.getByLabel('Your Suggestion', { exact: true }).fill(acceptedSuggestion);
    await feedbackDialog.getByRole('button', { name: 'Submit', exact: true }).click();
    await snackbar(page, /Thank you for your feedback/i);

    await page.getByRole('button', { name: 'account of current user' }).click();
    await dismissPendingSatisfactionReminder(page);
    await page.getByRole('menuitem', { name: 'Suggestions', exact: true }).click();
    await page.getByRole('dialog', { name: 'Help Us Improve' }).getByLabel('Your Suggestion', { exact: true }).fill(rejectedSuggestion);
    await page.getByRole('dialog', { name: 'Help Us Improve' }).getByRole('button', { name: 'Submit', exact: true }).click();
    await snackbar(page, /Thank you for your feedback/i);

    await signOut(page);
    await signIn(page, superAdmin);
    await navigate(page, 'Ticket Settings', '/operations/settings');
    await page.getByRole('tab', { name: /User Feedback/ }).click();
    await expect(page.getByText(acceptedSuggestion, { exact: true })).toBeVisible();
    await expect(page.getByText(rejectedSuggestion, { exact: true })).toBeVisible();

    const acceptedRow = page.locator('tr').filter({ hasText: acceptedSuggestion }).last();
    await acceptedRow.getByRole('button', { name: 'Accept', exact: true }).click();
    await snackbar(page, /Feedback accepted/i);
    await expect(acceptedRow).toContainText('ACCEPTED');

    const rejectedRow = page.locator('tr').filter({ hasText: rejectedSuggestion }).last();
    await rejectedRow.getByRole('button', { name: 'Reject', exact: true }).click();
    await snackbar(page, /Feedback rejected/i);
    await expect(rejectedRow).toContainText('REJECTED');
  });
});
