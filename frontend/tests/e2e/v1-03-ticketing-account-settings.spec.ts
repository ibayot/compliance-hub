import { expect, test } from '@playwright/test';
import { navigate, selectOption, signIn, signOut, snackbar, superAdmin, unique } from './v1-helpers';

test.describe('Version 1 ticketing service — account settings', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('a new user completes the forced password flow and updates profile/password in Settings', async ({ page }) => {
    const email = `${unique('e2e.profile.user')}@dswd.gov.ph`.toLowerCase();
    const newPassword = `E2eSecure-${Date.now()}`;
    const updatedPhone = '9171234567';
    const staffId = String(100000 + (Date.now() % 899999));

    // Read the configured first-login password through the visible UI.
    await signIn(page, superAdmin);
    await navigate(page, 'Settings', '/admin/settings');
    await page.getByRole('tab', { name: 'Security Settings', exact: true }).click();
    const defaultPassword = await page.getByLabel('System Default Password', { exact: true }).inputValue();
    expect(defaultPassword).not.toBe('');

    // Create a disposable regular account through the intended admin UI.
    await page.getByRole('tab', { name: 'User Management', exact: true }).click();
    const createUserButton = page.getByRole('button', { name: 'Create New User', exact: true });
    await expect(createUserButton).toBeVisible();
    await createUserButton.click();
    const createDialog = page.getByRole('dialog', { name: 'Create New User' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByRole('textbox', { name: 'Email Address', exact: true }).fill(email);
    await createDialog.getByRole('combobox', { name: /Role/ }).click();
    await page.getByRole('option', { name: 'End User', exact: true }).click();
    await createDialog.getByRole('textbox', { name: 'First Name', exact: true }).fill('E2E');
    await createDialog.getByRole('textbox', { name: 'Middle Name', exact: true }).fill('Profile');
    await createDialog.getByRole('textbox', { name: 'Last Name', exact: true }).fill('Settings');
    await createDialog.getByRole('textbox', { name: 'Suffix (Jr./Sr.)', exact: true }).fill('Jr.');
    await createDialog.getByRole('button', { name: 'Create User', exact: true }).click();
    await snackbar(page, /created successfully/i);

    // The account must use the default password on first login.
    await signOut(page);
    await signIn(page, { email, password: defaultPassword });
    const forceDialog = page.getByRole('dialog', { name: 'Complete Your Profile & Change Password' });
    await expect(forceDialog).toBeVisible();
    await expect(forceDialog.getByRole('textbox', { name: 'First Name', exact: true })).toHaveValue('E2E');
    await expect(forceDialog.getByRole('textbox', { name: 'Middle Name/Initial', exact: true })).toHaveValue('Profile');
    await expect(forceDialog.getByRole('textbox', { name: 'Last Name', exact: true })).toHaveValue('Settings');
    await expect(forceDialog.getByRole('textbox', { name: 'New Password', exact: true })).toHaveValue('');

    // Exercise both supported password generators through the visible modal UI.
    await forceDialog.getByRole('button', { name: 'Generate Password', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Random Password', exact: true }).click();
    await snackbar(page, /Password generated successfully/i);
    await expect(forceDialog.getByRole('textbox', { name: 'New Password', exact: true })).not.toHaveValue('');
    await forceDialog.getByRole('button', { name: 'Generate Password', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Passphrase', exact: true }).click();
    await snackbar(page, /Password generated successfully/i);
    await expect(forceDialog.getByRole('textbox', { name: 'New Password', exact: true })).not.toHaveValue('');
    // Negative: the required submit action is unavailable until the new password,
    // phone, sex, staff ID, and unit are completed.
    const saveProfile = forceDialog.getByRole('button', { name: 'Save Profile & Password', exact: true });
    await expect(saveProfile).toBeDisabled();
    const forceComboboxes = forceDialog.getByRole('combobox');
    await expect(forceComboboxes.nth(1)).toBeVisible();
    await forceDialog.getByRole('textbox', { name: 'Staff ID', exact: true }).fill(staffId);
    await forceDialog.getByRole('textbox', { name: 'Phone Number', exact: true }).fill(updatedPhone);
    await forceComboboxes.nth(0).click();
    await page.getByRole('option', { name: 'Male', exact: true }).click();
    const unitField = forceComboboxes.nth(1);
    await unitField.click();
    const unitOptions = page.getByRole('option').filter({ hasText: /.+/ });
    expect(await unitOptions.count()).toBeGreaterThan(0);
    await unitOptions.first().click();
    await forceDialog.getByRole('textbox', { name: 'New Password', exact: true }).fill(newPassword);
    await forceDialog.getByRole('textbox', { name: 'Confirm New Password', exact: true }).fill(newPassword);
    await expect(saveProfile).toBeEnabled();
    await saveProfile.click();
    await snackbar(page, /Profile updated and password changed successfully/i);
    await expect(forceDialog).not.toBeVisible();

    // Settings is reached from the account menu, not by entering a protected URL.
    await page.getByRole('button', { name: 'account of current user' }).click();
    await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/settings(?:$|[?#])/i);
    await expect(page.getByRole('tab', { name: 'Profile & Preferences', exact: true })).toBeVisible();

    // Profile fields are editable independently of password changes.
    await expect(page.getByLabel('Phone Number', { exact: true })).toHaveValue(updatedPhone);
    await expect(page.getByLabel('Position', { exact: true })).toHaveValue('');
    await page.getByLabel('Position', { exact: true }).fill('E2E QA');
    await page.getByLabel('Position Full', { exact: true }).fill('E2E Quality Assurance');
    await page.getByLabel('Designation', { exact: true }).fill('Ticketing Test Account');
    await page.getByRole('button', { name: 'Save Profile Information', exact: true }).click();
    await snackbar(page, /Profile information updated successfully/i);

    // Password is a separate Settings action and must reject an incorrect current password.
    await page.getByLabel('Current Password', { exact: true }).fill('wrong-password');
    const rejectedPassword = `Rejected-${Date.now()}`;
    await page.getByLabel('New Password', { exact: true }).last().fill(rejectedPassword);
    await page.getByLabel('Confirm New Password', { exact: true }).fill(rejectedPassword);
    await page.getByRole('button', { name: 'Update Password', exact: true }).click();
    await snackbar(page, /invalid|incorrect|password/i);

    await page.getByLabel('Current Password', { exact: true }).fill(newPassword);
    const finalPassword = `FinalSecure-${Date.now()}`;
    await page.getByLabel('New Password', { exact: true }).last().fill(finalPassword);
    await page.getByLabel('Confirm New Password', { exact: true }).fill(finalPassword);
    await page.getByRole('button', { name: 'Update Password', exact: true }).click();
    await snackbar(page, /password updated successfully/i);

    // Re-authenticate through the login UI to prove the final password and profile remain valid.
    await signOut(page);
    await signIn(page, { email, password: finalPassword });
    await page.getByRole('button', { name: 'account of current user' }).click();
    await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
    await expect(page.getByLabel('Position', { exact: true })).toHaveValue('E2E QA');
    await expect(page.getByLabel('Position Full', { exact: true })).toHaveValue('E2E Quality Assurance');
    await expect(page.getByLabel('Designation', { exact: true })).toHaveValue('Ticketing Test Account');
  });
});
