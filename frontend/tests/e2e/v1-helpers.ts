import { Browser, expect, Locator, Page } from '@playwright/test';

export type Account = { email: string; password: string };

export const superAdmin: Account = {
  email: process.env.E2E_SUPER_ADMIN_EMAIL || 'fo2admin@dswd.gov.ph',
  password: process.env.E2E_SUPER_ADMIN_PASSWORD || 'secure-password1',
};

export const controlAccount: Account = {
  email: process.env.E2E_CONTROL_EMAIL || 'jdhiquin@dswd.gov.ph',
  password: process.env.E2E_CONTROL_PASSWORD || 'secure-password1',
};

export const unique = (prefix: string) => `${prefix}-${Date.now()}`;

/**
 * Creates a disposable regular account through the same visible admin flow
 * that an administrator uses, then completes its first-login profile setup.
 * Each spec gets its own account so tests do not depend on a seeded requester.
 */
export async function createE2ERegularAccount(browser: Browser): Promise<Account> {
  const context = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL || 'https://172.31.16.76',
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const email = `${unique('e2e.regular.user')}@dswd.gov.ph`.toLowerCase();
  const password = `E2eRegular-${Date.now()}Aa!`;
  const staffId = String(100000 + (Date.now() % 899999));

  try {
    await signIn(page, superAdmin);
    await navigate(page, 'Settings', '/admin/settings');
    await page.getByRole('tab', { name: 'Security Settings', exact: true }).click();
    const defaultPassword = await page.getByLabel('System Default Password', { exact: true }).inputValue();
    expect(defaultPassword).not.toBe('');

    await page.getByRole('tab', { name: 'User Management', exact: true }).click();
    await page.getByRole('button', { name: 'Create New User', exact: true }).click();
    const createDialog = page.getByRole('dialog', { name: 'Create New User' });
    await createDialog.getByRole('textbox', { name: 'Email Address', exact: true }).fill(email);
    await createDialog.getByRole('combobox', { name: /Role/ }).click();
    await page.getByRole('option', { name: 'End User', exact: true }).click();
    await createDialog.getByRole('textbox', { name: 'First Name', exact: true }).fill('E2E');
    await createDialog.getByRole('textbox', { name: 'Last Name', exact: true }).fill('Regular');
    await createDialog.getByRole('button', { name: 'Create User', exact: true }).click();
    await snackbar(page, /created successfully/i);

    await signOut(page);
    await signIn(page, { email, password: defaultPassword });
    const forceDialog = page.getByRole('dialog', { name: 'Complete Your Profile & Change Password' });
    await expect(forceDialog).toBeVisible();
    await forceDialog.getByRole('textbox', { name: 'Staff ID', exact: true }).fill(staffId);
    await forceDialog.getByRole('textbox', { name: 'Phone Number', exact: true }).fill('9171234567');
    await forceDialog.getByRole('combobox').nth(0).click();
    await page.getByRole('option', { name: 'Male', exact: true }).click();
    await forceDialog.getByRole('combobox').nth(1).click();
    await page.getByRole('option').filter({ hasText: /.+/ }).first().click();
    await forceDialog.getByRole('textbox', { name: 'New Password', exact: true }).fill(password);
    await forceDialog.getByRole('textbox', { name: 'Confirm New Password', exact: true }).fill(password);
    await forceDialog.getByRole('button', { name: 'Save Profile & Password', exact: true }).click();
    await snackbar(page, /Profile updated and password changed successfully/i);

    return { email, password };
  } finally {
    await context.close();
  }
}

export async function ticketResult(page: Page, subject: string): Promise<Locator> {
  const tableRow = page.locator('tr.ticket-row').filter({ hasText: subject }).last();
  if (await tableRow.count()) return tableRow;
  return page.locator('.MuiCard-root').filter({ hasText: subject }).last();
}

export async function signIn(page: Page, account: Account) {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();

  const mfa = page.getByRole('textbox', { name: '6-Digit Code', exact: true });
  let mfaVisible = false;
  await expect
    .poll(
      async () => {
        mfaVisible = await mfa.isVisible().catch(() => false);
        return mfaVisible || /\/dashboard(?:$|[?#])/i.test(page.url());
      },
      { timeout: 30_000, message: 'Login did not reach dashboard or the MFA verification screen' },
    )
    .toBeTruthy();

  if (mfaVisible) {
    await expect(page.getByRole('alert').filter({ hasText: /Your MFA Code is:\s*\d{6}/ }).last()).toBeVisible({
      timeout: 15_000,
    });
    const code = (await page.locator('body').innerText()).match(/Your MFA Code is:\s*(\d{6})/)?.[1];
    if (!code) throw new Error('MFA verification was required but no test-mode code was visible.');
    await mfa.fill(code);
    await page.getByRole('button', { name: /verify code/i }).click();
  }

  await expect(page).toHaveURL(/\/dashboard(?:$|[?#])/i, { timeout: 30_000 });
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'account of current user' }).click();
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20_000 });
}

export async function dismissPendingSatisfactionReminder(page: Page) {
  const reminder = page.getByRole('dialog', { name: 'Pending Satisfaction Reminder' });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!(await reminder.isVisible({ timeout: attempt === 0 ? 5_000 : 1_000 }).catch(() => false))) return;
    const close = reminder.getByRole('button', { name: 'Close', exact: true });
    if (await close.isVisible().catch(() => false)) await close.click();
    else await reminder.getByRole('button', { name: 'Proceed Anyway', exact: true }).click();
    await expect(reminder).not.toBeVisible();
    // Dashboard stats can finish loading after the first close and reopen the
    // reminder; drain that UI state before the test clicks another control.
    await page.waitForTimeout(750);
  }
}

export async function navigate(page: Page, label: string, path: string) {
  await dismissPendingSatisfactionReminder(page);
  // Both the permanent desktop drawer and the temporary mobile drawer are
  // mounted. Select the visible copy so mobile navigation does not bind to
  // the hidden desktop item.
  const drawerToggle = page.getByRole('button', { name: 'open drawer' });
  const allItems = page.locator(`.MuiListItemButton-root[aria-label="${label}"]`);
  await expect
    .poll(() => allItems.count(), { timeout: 20_000, message: `${label} navigation item did not load` })
    .toBeGreaterThan(0);
  let item: Locator;
  const isMobileViewport = (page.viewportSize()?.width ?? 1280) <= 600;
  if (isMobileViewport) {
    let drawer = page.locator('.MuiDrawer-paper:visible').first();
    if (!(await drawer.isVisible().catch(() => false))) {
      await expect(drawerToggle).toBeVisible({ timeout: 20_000 });
      await drawerToggle.click();
      drawer = page.locator('.MuiDrawer-paper:visible').first();
    }
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    item = drawer.locator(`.MuiListItemButton-root[aria-label="${label}"]:visible`).first();
  } else {
    item = page.locator(`.MuiListItemButton-root[aria-label="${label}"]:visible`).first();
  }
  await expect(item).toBeVisible({ timeout: 20_000 });
  await item.click();
  await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}(?:$|[?#/])`), { timeout: 20_000 });
}

export async function snackbar(page: Page, text: string | RegExp) {
  await expect(page.locator('[role="alert"]').filter({ hasText: text }).last()).toBeVisible({ timeout: 15_000 });
}

export async function selectOption(page: Page, label: string, option: string | RegExp, scope?: Locator) {
  await (scope ?? page).getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option }).last().click();
}

export async function saveDialog(page: Page, name = 'Save', scope?: Locator) {
  await (scope ?? page).getByRole('dialog').last().getByRole('button', { name, exact: true }).click();
}

export async function setEveryonePresent(page: Page): Promise<boolean> {
  await navigate(page, 'Attendance', '/admin/attendance');
  // Local Docker has no DTR office-day view. Make today an office day first;
  // this is especially important when today is Saturday or Sunday.
  const todayDate = new Date();
  const todayDateStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const todayOfficeDay = page.getByTestId(`office-day-${todayDateStr}`);
  await expect(todayOfficeDay).toBeVisible({ timeout: 20_000 });
  if ((await todayOfficeDay.getAttribute('data-office-day')) !== 'true') {
    await todayOfficeDay.click();
    await expect(todayOfficeDay).toHaveAttribute('data-office-day', 'true', { timeout: 20_000 });
  }
  await page.getByRole('tab', { name: 'Attendance', exact: true }).click();
  await expect(page.getByText('Click a cell to cycle:', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Present \((?:Auto-Synced|Fallback)\)/, { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  const table = page.locator('table').last();
  const headers = await table.locator('thead th').allTextContents();
  const today = String(new Date().getDate());
  const todayIndex = headers.findIndex((value) => value.trim() === today);
  if (todayIndex < 1) throw new Error(`Could not locate today's attendance column (${today}).`);

  const rows = table.locator('tbody tr');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);

  if (await page.getByText('Present (Auto-Synced)', { exact: true }).isVisible().catch(() => false)) {
    // Online attendance is supplied by the DTR view. The application correctly
    // prevents the UI from manually creating PRESENT records in this mode.
    for (let index = 0; index < count; index += 1) {
      const cell = rows.nth(index).locator('td').nth(todayIndex);
      if (await cell.locator('[data-testid="CheckCircleIcon"]').count()) return true;
    }
    return false;
  }

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const name = (await row.locator('td').first().innerText()).split('\n')[0].trim();
    // The exclusion fixture is created during the admin CRUD test. Its
    // auto-assignment exclusion is verified separately in User Management.
    if (name === 'E2E Excluded Technician') continue;
    const cell = row.locator('td').nth(todayIndex);
    if (await cell.locator('[data-testid="CheckCircleIcon"]').count()) continue;

    let present = false;
    for (let attempt = 0; attempt < 2 && !present; attempt += 1) {
      await cell.click();
      const timeDialog = page.getByRole('dialog', { name: 'Set Clock-In Time' });
      if (await timeDialog.isVisible().catch(() => false)) {
        await timeDialog.getByRole('button', { name: 'Confirm', exact: true }).click();
      }
      // Attendance writes fan out through the event bus. Keep a deliberate
      // pause between UI mutations so the local gateway DDoS guard does not
      // mistake this setup flow for a request burst.
      await page.waitForTimeout(1_000);
      present = Boolean(await cell.locator('[data-testid="CheckCircleIcon"]').count());
    }
    expect(present, `Unable to mark ${name} present through Attendance UI`).toBe(true);
  }
  return true;
}
