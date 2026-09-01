import { test, expect, Page } from '@playwright/test';
import {
  superAdmin,
  createE2ERegularAccount,
  signIn,
  dismissPendingSatisfactionReminder,
} from './v1-helpers';

const ticketingPages = [
  ['Tickets', '/operations/tickets'],
  ['Knowledge Base', '/operations/knowledge-base'],
  ['Duties', '/operations/duties'],
  ['Ticket Settings', '/operations/settings'],
  ['Ticket Reports', '/operations/reports'],
  ['Attendance', '/admin/attendance'],
] as const;

async function assertMobileLayout(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    viewportHeight: window.innerHeight,
  }));
  expect(metrics.documentWidth, `${label}: document overflows horizontally`).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.bodyWidth, `${label}: body overflows horizontally`).toBeLessThanOrEqual(metrics.viewport + 1);
}

async function openMobileDrawer(page: Page) {
  const drawer = page.locator('.MuiDrawer-paper:visible').first();
  if (!(await drawer.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'open drawer' }).click();
  }
  await expect(drawer).toBeVisible({ timeout: 10_000 });
  const box = await drawer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual((await page.evaluate(() => innerWidth)) + 1);
  return drawer;
}

async function navigateMobile(page: Page, label: string, path: string) {
  const drawer = await openMobileDrawer(page);
  const item = drawer.locator(`.MuiListItemButton-root[aria-label="${label}"]`);
  await expect(item).toBeVisible({ timeout: 20_000 });
  await item.click();
  await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}(?:$|[?#/])`), { timeout: 20_000 });
  await dismissPendingSatisfactionReminder(page);
  await assertMobileLayout(page, label);
}

async function assertDialogsFit(page: Page) {
  for (const dialog of await page.getByRole('dialog').all()) {
    if (!(await dialog.isVisible().catch(() => false))) continue;
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual((await page.evaluate(() => innerWidth)) + 1);
  }
}

async function assertVisibleControlFits(page: Page, locator: ReturnType<Page['locator']>, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} should have a layout box`).not.toBeNull();
  const viewport = await page.evaluate(() => innerWidth);
  expect(box!.x, `${label} starts outside the viewport`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${label} is clipped by the viewport`).toBeLessThanOrEqual(viewport + 1);
}

async function clickTabAndCheck(page: Page, name: string | RegExp) {
  const tab = page.getByRole('tab', { name });
  await tab.scrollIntoViewIfNeeded();
  await assertVisibleControlFits(page, tab, `tab ${String(name)}`);
  await tab.click();
  await assertMobileLayout(page, `tab ${String(name)}`);
  await assertDialogsFit(page);
}

async function exerciseTabChevrons(page: Page, label: string) {
  const right = page.getByRole('button', { name: /scroll right/i }).last();
  if (!(await right.isVisible().catch(() => false))) return;
  await assertVisibleControlFits(page, right, `${label} right chevron`);
  await expect(right).toBeEnabled();
  await right.click();
  await page.waitForTimeout(250);
  const left = page.getByRole('button', { name: /scroll left/i }).last();
  await assertVisibleControlFits(page, left, `${label} left chevron`);
  await expect(left).toBeEnabled();
  await left.click();
}

async function cancelVisibleDialog(page: Page) {
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible();
  await assertDialogsFit(page);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

test.describe('Version 1 ticketing service — mobile responsiveness', () => {
  test('iPhone 12 Pro Max viewport can navigate ticketing modules through visible UI', async ({ page }) => {
    await page.setViewportSize({ width: 428, height: 926 });
    await signIn(page, superAdmin);
    await dismissPendingSatisfactionReminder(page);
    await assertMobileLayout(page, 'dashboard');

    await openMobileDrawer(page);
    await page.keyboard.press('Escape');

    for (const [label, path] of ticketingPages) {
      await navigateMobile(page, label, path);
    }

    await navigateMobile(page, 'Tickets', '/operations/tickets');
    const newTicket = page.getByRole('button', { name: /New Ticket|Submit Ticket|Create Ticket/i }).first();
    await assertVisibleControlFits(page, newTicket, 'new ticket button');
    await newTicket.click();
    await expect(page.getByRole('dialog', { name: 'Submit a Help Desk Ticket' })).toBeVisible();
    await assertDialogsFit(page);
    await page.getByRole('dialog', { name: 'Submit a Help Desk Ticket' }).getByRole('button', { name: 'Cancel', exact: true }).click();

    await navigateMobile(page, 'Knowledge Base', '/operations/knowledge-base');
    const kbSearch = page.getByLabel('Search Knowledge Base Articles', { exact: true });
    await assertVisibleControlFits(page, kbSearch, 'knowledge-base search');
    await kbSearch.fill('network');
    await kbSearch.fill('');

    await navigateMobile(page, 'Duties', '/operations/duties');
    await exerciseTabChevrons(page, 'Duties tabs');
    for (const tab of ['overview', 'map', 'Duty Log', 'rotation', 'exceptions', 'meetings', 'roster']) {
      await clickTabAndCheck(page, tab);
    }
    await page.getByRole('tab', { name: 'roster', exact: true }).click();
    await page.getByRole('button', { name: 'Manage Roster', exact: true }).click();
    await cancelVisibleDialog(page);

    await navigateMobile(page, 'Ticket Settings', '/operations/settings');
    await exerciseTabChevrons(page, 'Ticket Settings tabs');
    for (const tab of [/Categories/, /Issues/, /Keyword Rules/, /Escalation Focals/, /Global Settings/, /User Feedback/]) {
      const candidate = page.getByRole('tab', { name: tab });
      if (await candidate.isVisible().catch(() => false)) await clickTabAndCheck(page, tab);
    }
    await page.getByRole('tab', { name: /Categories/ }).click();
    for (const action of ['Add Category', 'Add Issue Type']) {
      const button = page.getByRole('button', { name: action, exact: true });
      if (await button.isVisible().catch(() => false)) {
        await assertVisibleControlFits(page, button, action);
        await button.click();
        await cancelVisibleDialog(page);
      }
    }
    await page.getByRole('tab', { name: /Keyword Rules/ }).click();
    const addRule = page.getByRole('button', { name: 'Add Rule', exact: true });
    if (await addRule.isVisible().catch(() => false)) {
      await assertVisibleControlFits(page, addRule, 'Add Rule');
      await addRule.click();
      await cancelVisibleDialog(page);
    }

    await navigateMobile(page, 'Ticket Reports', '/operations/reports');
    await exerciseTabChevrons(page, 'Ticket Reports tabs');
    for (const tab of ['Overview & Ratings', 'Issues', 'SLA Insights', 'Performance']) {
      const candidate = page.getByRole('tab', { name: tab, exact: true });
      if (await candidate.isVisible().catch(() => false)) await clickTabAndCheck(page, tab);
    }

    await navigateMobile(page, 'Attendance', '/admin/attendance');
    await clickTabAndCheck(page, 'Office Days');
    await clickTabAndCheck(page, 'Attendance');
    const attendanceTable = page.locator('.MuiTableContainer-root:visible').first();
    if (await attendanceTable.isVisible().catch(() => false)) {
      await assertVisibleControlFits(page, attendanceTable, 'attendance table container');
    }

    await page.getByRole('button', { name: 'account of current user' }).click();
    await expect(page.getByRole('menuitem', { name: 'Settings', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await assertMobileLayout(page, 'ticket detail controls');
  });

  test('small 320px viewport keeps regular-user controls and account settings usable', async ({ page, browser }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const regularUser = await createE2ERegularAccount(browser);
    await signIn(page, regularUser);
    await dismissPendingSatisfactionReminder(page);
    await assertMobileLayout(page, 'small dashboard');

    await navigateMobile(page, 'Tickets', '/operations/tickets');
    const newTicket = page.getByRole('button', { name: /New Ticket|Submit Ticket|Create Ticket/i }).first();
    await assertVisibleControlFits(page, newTicket, 'small-screen new ticket button');
    await newTicket.click();
    await expect(page.getByRole('dialog', { name: 'Submit a Help Desk Ticket' })).toBeVisible();
    await assertDialogsFit(page);
    await page.getByRole('dialog', { name: 'Submit a Help Desk Ticket' }).getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('button', { name: 'account of current user' }).click();
    await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/settings/);
    await assertMobileLayout(page, 'small settings');
    await expect(page.getByRole('tab', { name: 'Profile & Preferences', exact: true })).toBeVisible();
  });

  test('small 320px viewport keeps super-admin ticketing controls reachable', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await signIn(page, superAdmin);
    await dismissPendingSatisfactionReminder(page);

    await navigateMobile(page, 'Duties', '/operations/duties');
    await exerciseTabChevrons(page, 'small Duties tabs');
    for (const tab of ['overview', 'map', 'Duty Log', 'rotation', 'exceptions', 'meetings', 'roster']) {
      await clickTabAndCheck(page, tab);
    }

    await navigateMobile(page, 'Ticket Settings', '/operations/settings');
    await exerciseTabChevrons(page, 'small Ticket Settings tabs');
    const categorySearch = page.getByPlaceholder('Search categories...', { exact: true });
    await assertVisibleControlFits(page, categorySearch, 'small-screen category search');
    for (const tab of [/Categories/, /Issues/, /Keyword Rules/, /Escalation Focals/, /Global Settings/, /User Feedback/]) {
      const candidate = page.getByRole('tab', { name: tab });
      if (await candidate.isVisible().catch(() => false)) await clickTabAndCheck(page, tab);
    }

    await navigateMobile(page, 'Ticket Reports', '/operations/reports');
    await exerciseTabChevrons(page, 'small Ticket Reports tabs');
    for (const tab of ['Overview & Ratings', 'Issues', 'SLA Insights', 'Performance']) {
      const candidate = page.getByRole('tab', { name: tab, exact: true });
      if (await candidate.isVisible().catch(() => false)) await clickTabAndCheck(page, tab);
    }

    await navigateMobile(page, 'Attendance', '/admin/attendance');
    await clickTabAndCheck(page, 'Office Days');
    await clickTabAndCheck(page, 'Attendance');
    await assertMobileLayout(page, 'small attendance');
  });
});
