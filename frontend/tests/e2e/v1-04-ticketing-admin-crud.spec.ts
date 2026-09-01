import { expect, test } from '@playwright/test';
import {
  navigate,
  saveDialog,
  selectOption,
  setEveryonePresent,
  signIn,
  snackbar,
  superAdmin,
  unique,
} from './v1-helpers';

test.describe('Version 1 ticketing service — admin CRUD', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('super admin can set attendance and manage ticketing/user administration data', async ({ page }) => {
    await signIn(page, superAdmin);
    await setEveryonePresent(page);

    const category = unique('E2E Category');
    const editedCategory = `${category} Edited`;
    const issue = unique('E2E Issue');
    const editedIssue = `${issue} Edited`;
    const keyword = unique('e2e-keyword');
    const editedKeyword = `${keyword}-edited`;
    const unit = unique('E2E Unit');
    const editedUnit = `${unit} Edited`;
    const roleCode = unique('e2e_role').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const roleLabel = unique('E2E Role');
    const userEmail = `${unique('e2e.user')}@dswd.gov.ph`.toLowerCase();

    await navigate(page, 'Ticket Settings', '/operations/settings');
    await page.getByRole('button', { name: 'Add Category', exact: true }).click();
    await page.getByLabel('Category Name *', { exact: true }).fill(category);
    await page.getByRole('checkbox', { name: 'IT Support', exact: true }).check();
    await saveDialog(page);
    await snackbar(page, /created|saved/i);
    const categorySearch = page.getByPlaceholder('Search categories...', { exact: true });
    await categorySearch.fill(category);
    await expect(page.getByText(category, { exact: true })).toBeVisible();

    // Negative CRUD: duplicate names must be rejected and surfaced to the user.
    await page.getByRole('button', { name: 'Add Category', exact: true }).click();
    const duplicateCategoryDialog = page.getByRole('dialog').last();
    await duplicateCategoryDialog.getByLabel('Category Name *', { exact: true }).fill(category);
    await duplicateCategoryDialog.getByRole('checkbox', { name: 'IT Support', exact: true }).check();
    await duplicateCategoryDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await snackbar(page, /already|exist|duplicate/i);
    await duplicateCategoryDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    const categoryRow = page.locator('tr').filter({ hasText: category }).last();
    await categoryRow.locator('button').first().click();
    await page.getByLabel('Category Name *', { exact: true }).fill(editedCategory);
    await saveDialog(page);
    await snackbar(page, /updated|saved/i);
    await categorySearch.fill(editedCategory);
    await expect(page.getByText(editedCategory, { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: /Issues/ }).click();
    await page.getByRole('button', { name: 'Add Issue', exact: true }).click();
    await selectOption(page, 'Category *', editedCategory);
    await page.getByLabel('Issue Name', { exact: true }).fill(issue);
    await page.getByLabel('Description (Optional)', { exact: true }).fill('E2E issue description');
    await page.getByLabel('SLA Time Limit (hours)', { exact: true }).fill('8');
    await page.getByLabel('Allowable Pause Hours *', { exact: true }).fill('2');
    await page.getByLabel('Max Freeze Hours', { exact: true }).fill('4');
    await saveDialog(page);
    await snackbar(page, /created|saved/i);
    const issueSearch = page.getByPlaceholder('Search issues...', { exact: true });
    await issueSearch.fill(issue);
    await expect(page.getByText(issue, { exact: true })).toBeVisible();

    const issueRow = page.locator('tr').filter({ hasText: issue }).last();
    await issueRow.locator('button').first().click();
    await page.getByLabel('Issue Name', { exact: true }).fill(editedIssue);
    await saveDialog(page);
    await snackbar(page, /updated|saved/i);
    await issueSearch.fill(editedIssue);
    await expect(page.getByText(editedIssue, { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: /Keyword Rules/ }).click();
    await page.getByRole('button', { name: 'Add Rule', exact: true }).click();
    const ruleDialog = page.getByRole('dialog');
    await ruleDialog.getByLabel('Keywords *', { exact: true }).fill(keyword);
    await ruleDialog.getByLabel('Keywords *', { exact: true }).press('Enter');
    await selectOption(page, 'Support Type *', 'IT Support', ruleDialog);
    await selectOption(page, 'Target Category *', editedCategory, ruleDialog);
    await selectOption(page, 'Target Issue *', editedIssue, ruleDialog);
    await saveDialog(page);
    await snackbar(page, /created|saved/i);
    const ruleSearch = page.getByPlaceholder('Search rules...', { exact: true });
    await ruleSearch.fill(keyword);
    await expect(page.locator('table').getByText(keyword, { exact: true }).first()).toBeVisible();

    const ruleRow = page.locator('tr').filter({ hasText: keyword }).last();
    await ruleRow.locator('button').first().click();
    const editRuleDialog = page.getByRole('dialog');
    await editRuleDialog.getByLabel('Keywords *', { exact: true }).fill(editedKeyword);
    await editRuleDialog.getByLabel('Keywords *', { exact: true }).press('Enter');
    await saveDialog(page);
    await snackbar(page, /updated|saved/i);
    await ruleSearch.fill(editedKeyword);
    await expect(page.locator('table').getByText(editedKeyword, { exact: true }).first()).toBeVisible();

    await page.getByRole('tab', { name: /Escalation Focals/ }).click();
    await page.getByRole('button', { name: 'Add Focal', exact: true }).click();
    await selectOption(page, 'Ticket Type *', 'Desktop Support');
    await page.getByLabel('Select Focal User *', { exact: true }).click();
    const eligibleFocal = page.locator('[role="option"]:not([aria-disabled="true"])').last();
    if (await eligibleFocal.count()) {
      await eligibleFocal.click();
      await saveDialog(page, 'Add');
      const focalRow = page.locator('tr').filter({ hasText: 'Desktop Support' }).last();
      await expect(focalRow).toBeVisible();
      await focalRow.locator('button').last().click();
      await page.getByRole('dialog', { name: 'Remove Escalation Focal' }).getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(page.locator('tr').filter({ hasText: 'Desktop Support' }).last()).not.toBeVisible();
    } else {
      // Online DTR is authoritative. With no present staff, the application
      // correctly disables focal creation; continue with the independent CRUD.
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click();
    }

    await navigate(page, 'Units', '/admin/units');
    await page.getByRole('button', { name: 'Add Unit', exact: true }).click();
    await page.getByLabel('Unit Name', { exact: true }).fill(unit);
    await page.getByLabel('Description', { exact: true }).fill('E2E unit description');
    await saveDialog(page);
    await snackbar(page, /created|successfully/i);
    await expect(page.getByText(unit, { exact: true })).toBeVisible();

    // Negative CRUD: a duplicate unit is rejected with a visible snackbar.
    await page.getByRole('button', { name: 'Add Unit', exact: true }).click();
    const duplicateUnitDialog = page.getByRole('dialog').last();
    await duplicateUnitDialog.getByLabel('Unit Name', { exact: true }).fill(unit);
    await duplicateUnitDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await snackbar(page, /already|exist|duplicate/i);
    await duplicateUnitDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    const unitAccordion = page.locator('.MuiAccordion-root').filter({ hasText: unit }).last();
    await unitAccordion.locator('.MuiAccordionSummary-root button').first().click();
    await page.getByLabel('Unit Name', { exact: true }).fill(editedUnit);
    await page.getByLabel('Description', { exact: true }).fill('E2E unit description edited');
    await saveDialog(page);
    await snackbar(page, /updated|successfully/i);
    await expect(page.getByText(editedUnit, { exact: true })).toBeVisible();

    await navigate(page, 'Settings', '/admin/settings');
    await page.getByRole('tab', { name: 'Role Management', exact: true }).click();

    // Negative validation: role descriptions shorter than the configured minimum are rejected.
    await page.getByRole('button', { name: 'Add Role Definition', exact: true }).click();
    const invalidRoleDialog = page.getByRole('dialog').last();
    await invalidRoleDialog.getByLabel('Role Code', { exact: true }).fill(`${roleCode}_invalid`);
    await invalidRoleDialog.getByLabel('Role Label', { exact: true }).fill('Invalid E2E Role');
    await invalidRoleDialog.getByLabel('Description', { exact: true }).fill('bad');
    // The UI prevents submission while the description is below the minimum.
    await expect(invalidRoleDialog.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();
    await invalidRoleDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('button', { name: 'Add Role Definition', exact: true }).click();
    await page.getByLabel('Role Code', { exact: true }).fill(roleCode);
    await page.getByLabel('Role Label', { exact: true }).fill(roleLabel);
    await page.getByLabel('Description', { exact: true }).fill('E2E custom role');
    await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();
    await snackbar(page, /created|added|saved/i);
    await expect(page.getByText(roleLabel, { exact: true })).toBeVisible();
    const roleRow = page.locator('tr').filter({ hasText: roleLabel }).last();
    await roleRow.locator('button').first().click();
    await page.getByLabel('Description', { exact: true }).fill('E2E custom role edited');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await snackbar(page, /updated|saved/i);

    await page.getByRole('tab', { name: 'Role Capabilities Matrix', exact: true }).click();
    const capabilitySections = page.locator('.MuiAccordionSummary-root');
    for (let index = 0; index < await capabilitySections.count(); index += 1) {
      const section = capabilitySections.nth(index);
      if ((await section.getAttribute('aria-expanded')) !== 'true') await section.click();
    }
    await expect(page.getByText(roleCode, { exact: true }).last()).toBeVisible();

    await page.getByRole('tab', { name: 'Role Management', exact: true }).click();
    await page.locator('tr').filter({ hasText: roleLabel }).last().locator('button').last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(roleLabel, { exact: true })).not.toBeVisible();

    await page.getByRole('tab', { name: 'User Management', exact: true }).click();
    await page.getByRole('button', { name: 'Create New User', exact: true }).click();
    const userDialog = page.getByRole('dialog', { name: 'Create New User' });
    await userDialog.getByLabel('Email Address').fill(userEmail);
    await selectOption(page, 'Role *', 'User', userDialog);
    await userDialog.getByLabel('First Name').fill('E2E');
    await userDialog.getByLabel('Last Name').fill('Regular');
    await userDialog.getByRole('button', { name: 'Create User', exact: true }).click();
    await snackbar(page, /created successfully/i);
    await page.getByRole('tab', { name: /Regular Users/ }).click();
    await page.getByPlaceholder('Search staff by name or email...').fill(userEmail);
    await expect(page.getByText(userEmail, { exact: true })).toBeVisible();
    const userRow = page.locator('tr').filter({ hasText: userEmail }).last();
    await userRow.locator('button').nth(1).click();
    await page.getByLabel('Phone Number', { exact: true }).fill('09171234567');
    await page.getByLabel('Position (Abbreviated)', { exact: true }).fill('E2E');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await snackbar(page, /updated successfully/i);
    await page.locator('tr').filter({ hasText: userEmail }).last().locator('button').nth(2).click();
    await expect(page.getByText(/Inactive/i).last()).toBeVisible();
    await page.locator('tr').filter({ hasText: userEmail }).last().locator('button').nth(2).click();
    await expect(page.getByText(/Active/i).last()).toBeVisible();

    // Preserve the automatic-assignment exclusion scenario from the original
    // end-to-end flow, then refresh attendance so the new technician is usable
    // by the later ticket and duty tests.
    const technicianEmail = `${unique('e2e.tech')}@dswd.gov.ph`.toLowerCase();
    await page.getByRole('button', { name: 'Create New User', exact: true }).click();
    const technicianDialog = page.getByRole('dialog', { name: 'Create New User' });
    await technicianDialog.getByLabel('Email Address').fill(technicianEmail);
    await selectOption(page, 'Role *', /IT Support Junior/i, technicianDialog);
    await technicianDialog.getByLabel('First Name').fill('E2E');
    await technicianDialog.getByLabel('Last Name').fill('Excluded Technician');
    await technicianDialog.getByLabel('Eligible for automatic ticket assignment', { exact: true }).uncheck();
    await technicianDialog.getByRole('button', { name: 'Create User', exact: true }).click();
    await snackbar(page, /created successfully/i);
    await page.getByRole('tab', { name: /RICTMS Staff/ }).click();
    await page.getByPlaceholder('Search staff by name or email...').fill(technicianEmail);
    await expect(page.getByText(technicianEmail, { exact: true })).toBeVisible();
    await setEveryonePresent(page);

    await navigate(page, 'Ticket Settings', '/operations/settings');
    await page.getByRole('tab', { name: /Keyword Rules/ }).click();
    await page.getByPlaceholder('Search rules...', { exact: true }).fill(editedKeyword);
    await page.locator('tr').filter({ hasText: editedKeyword }).last().locator('button').last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await page.getByRole('tab', { name: /Issues/ }).click();
    await page.getByPlaceholder('Search issues...', { exact: true }).fill(editedIssue);
    await page.locator('tr').filter({ hasText: editedIssue }).last().locator('button').last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
    await page.getByRole('tab', { name: /Categories/ }).click();
    await page.getByPlaceholder('Search categories...', { exact: true }).fill(editedCategory);
    await page.locator('tr').filter({ hasText: editedCategory }).last().locator('button').last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();

    await navigate(page, 'Units', '/admin/units');
    const finalUnit = page.locator('.MuiAccordion-root').filter({ hasText: editedUnit }).last();
    await finalUnit.locator('.MuiAccordionSummary-root button').nth(1).click();
    const deleteUnitDialog = page.getByRole('dialog', { name: 'Confirm Unit Deletion' });
    await deleteUnitDialog.getByRole('checkbox', { name: 'Confirm unit deletion' }).check();
    await deleteUnitDialog.getByRole('button', { name: 'Delete Permanently', exact: true }).click();
    await snackbar(page, /deleted successfully/i);
  });
});
