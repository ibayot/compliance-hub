import { test, expect, Page } from '@playwright/test';

type Account = { email: string; password: string };

function account(prefix: string): Account | null {
  const email = process.env[`E2E_${prefix}_EMAIL`]?.trim();
  const password = process.env[`E2E_${prefix}_PASSWORD`] || 'secure-password1';
  const fallbackEmails: Record<string, string> = {
    SUPER_ADMIN: 'fo2admin@dswd.gov.ph',
    CONTROL: 'jdhiquin@dswd.gov.ph',
  };
  return { email: email || fallbackEmails[prefix] || '', password };
}

function expectedNavigation(prefix: string, fallback: string[]): string[] {
  const configured = process.env[`E2E_${prefix}_NAV`]
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured?.length ? configured : fallback;
}

async function signIn(page: Page, user: Account) {
  // The root page is the only browser entry point. Every subsequent page is
  // reached through a visible application action.
  await page.goto('/');
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  const mfaField = page.getByLabel('6-Digit Code');
  if (await mfaField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const bodyText = await page.locator('body').innerText();
    const code = bodyText.match(/Your MFA Code is:\s*(\d{6})/)?.[1];
    if (!code) throw new Error('MFA verification is required but the test-mode code was not visible.');
    await mfaField.fill(code);
    await page.getByRole('button', { name: /verify code/i }).click();
  }
  await expect(page).toHaveURL(/\/dashboard(?:$|[?#])/i, { timeout: 30_000 });
}

async function closeTransientDialog(page: Page) {
  const dialog = page.locator('[role="dialog"]').first();
  if (await dialog.isVisible().catch(() => false)) {
    const close = dialog.getByRole('button', { name: /close/i }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
  }
}

async function navigateFromSidebar(page: Page, label: string) {
  const paths: Record<string, string> = {
    Tickets: '/operations/tickets',
    'Knowledge Base': '/operations/knowledge-base',
    Duties: '/operations/duties',
    'Ticket Settings': '/operations/settings',
    'Ticket Reports': '/operations/reports',
    Attendance: '/admin/attendance',
  };
  const drawerToggle = page.getByRole('button', { name: 'open drawer' });
  let navigation: Page | ReturnType<Page['locator']> = page;
  if (await drawerToggle.isVisible().catch(() => false)) {
    await drawerToggle.click();
    navigation = page.locator('.MuiDrawer-paper:visible').first();
    await expect(navigation).toBeVisible({ timeout: 15_000 });
  }
  const item = navigation.locator(`.MuiListItemButton-root[aria-label="${label}"]`).first();
  await expect(item).toBeVisible({ timeout: 20_000 });
  await item.click();
  const path = paths[label];
  if (!path) throw new Error(`No UI route mapping defined for ${label}.`);
  await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}(?:$|[?#/])`), { timeout: 20_000 });
  await expect(page.locator('body')).toContainText(label, { timeout: 20_000 });
}

async function expectSidebarHidden(page: Page, label: string) {
  await expect(page.locator(`.MuiListItemButton-root[aria-label="${label}"]`)).toHaveCount(0);
}

async function signOut(page: Page) {
  const accountButton = page.locator('button[aria-label="account of current user"]');
  await accountButton.click();
  await page.getByRole('menuitem', { name: /logout/i }).click();
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible({ timeout: 20_000 });
}

const ticketingNavigation = [
  'Tickets',
  'Knowledge Base',
  'Duties',
  'Ticket Settings',
  'Ticket Reports',
  'Attendance',
];

test.describe('Version 1 ticketing service — UI-only capability coverage', () => {
  test('super admin can navigate every ticketing module through the sidebar', async ({ page }) => {
    const user = account('SUPER_ADMIN');
    expect(user?.email).toBeTruthy();
    await signIn(page, user!);
    await closeTransientDialog(page);

    // Open notifications through the AppBar UI to exercise notification loading.
    await page.locator('button:has([data-testid="NotificationsIcon"])').click();
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press('Escape');
    for (const label of expectedNavigation('SUPER_ADMIN', ticketingNavigation)) {
      await navigateFromSidebar(page, label);
    }

    const accountButton = page.locator('button[aria-label="account of current user"]');
    await accountButton.click();
    await page.getByRole('menuitem', { name: /^settings$/i }).click();
    await expect(page).toHaveURL(/\/admin\/settings(?:$|[?#])/i);
    await expect(page.locator('body')).toContainText(/profile|preferences|password/i);
  });
});
