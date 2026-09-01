import { expect, Locator, Page, test } from '@playwright/test';
import {
  controlAccount,
  createE2ERegularAccount,
  dismissPendingSatisfactionReminder,
  navigate,
  signIn,
  superAdmin,
} from './v1-helpers';

async function visibleNavigation(page: Page): Promise<Locator> {
  const drawerToggle = page.getByRole('button', { name: 'open drawer' });
  const isMobileViewport = (page.viewportSize()?.width ?? 1280) <= 600;
  if (isMobileViewport) {
    let drawer = page.locator('.MuiDrawer-paper:visible').first();
    if (!(await drawer.isVisible().catch(() => false))) {
      await expect(drawerToggle).toBeVisible({ timeout: 20_000 });
      await drawerToggle.click();
      drawer = page.locator('.MuiDrawer-paper:visible').first();
    }
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    return drawer;
  }
  return page.locator('body');
}

function navigationItem(navigation: Locator, label: string): Locator {
  return navigation.locator(`.MuiListItemButton-root[aria-label="${label}"]:visible`);
}

test.describe('Version 1 ticketing service — capability behavior', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('control and regular accounts see only UI actions granted by capabilities', async ({ page, browser }) => {
    const regularUser = await createE2ERegularAccount(browser);
    await signIn(page, controlAccount);
    await dismissPendingSatisfactionReminder(page);
    let navigation = await visibleNavigation(page);
    await expect(navigationItem(navigation, 'Ticket Settings')).toHaveCount(0);
    // Unit viewers may open the module, but must not receive manage actions.
    await expect(navigationItem(navigation, 'Units')).toHaveCount(1);
    await expect(navigationItem(navigation, 'Attendance')).toHaveCount(0);
    await expect(navigationItem(navigation, 'Duties')).toHaveCount(0);
    await navigate(page, 'Units', '/admin/units');
    await expect(page.getByRole('button', { name: 'Add Unit', exact: true })).toHaveCount(0);
    await navigate(page, 'Tickets', '/operations/tickets');
    await expect(page.getByRole('button', { name: /Submit|New Ticket|Create Ticket/i }).first()).toBeVisible();

    await page.locator('button[aria-label="account of current user"]').click();
    await page.getByRole('menuitem', { name: /logout/i }).click();
    await signIn(page, regularUser);
    await dismissPendingSatisfactionReminder(page);
    navigation = await visibleNavigation(page);
    await expect(navigationItem(navigation, 'Ticket Settings')).toHaveCount(0);
    await expect(navigationItem(navigation, 'Units')).toHaveCount(0);
    await expect(navigationItem(navigation, 'Attendance')).toHaveCount(0);
    await expect(navigationItem(navigation, 'Duties')).toHaveCount(0);
    await navigate(page, 'Tickets', '/operations/tickets');
    await expect(page.getByRole('button', { name: /Submit|New Ticket|Create Ticket/i }).first()).toBeVisible();
  });

  test('super admin sees the management actions through the UI', async ({ page }) => {
    await signIn(page, superAdmin);
    const navigation = await visibleNavigation(page);
    await expect(navigationItem(navigation, 'Ticket Settings').first()).toBeVisible();
    await expect(navigationItem(navigation, 'Units').first()).toBeVisible();
    await expect(navigationItem(navigation, 'Attendance').first()).toBeVisible();
    await expect(navigationItem(navigation, 'Duties').first()).toBeVisible();
  });
});
