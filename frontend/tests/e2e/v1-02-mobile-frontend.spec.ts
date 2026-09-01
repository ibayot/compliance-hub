import { expect, Page, test } from '@playwright/test';
import {
  dismissPendingSatisfactionReminder,
  createE2ERegularAccount,
  signIn,
  superAdmin,
} from './v1-helpers';

const superAdminRoutes = [
  { label: 'Dashboard', path: '/dashboard', marker: /Dashboard/i, service: 'core' },
  { label: 'Tickets', path: '/operations/tickets', marker: /Tickets/i, service: 'ticketing' },
  { label: 'Knowledge Base', path: '/operations/knowledge-base', marker: /Knowledge Base/i, service: 'ticketing' },
  { label: 'Duties', path: '/operations/duties', marker: /Duties/i, service: 'core' },
  { label: 'Documents', path: '/governance/documents', marker: /Documents/i, service: 'compliance' },
  { label: 'Repository', path: '/governance/repository', marker: /Repository/i, service: 'compliance' },
  { label: 'Issuances', path: '/governance/issuances', marker: /Issuances/i, service: 'compliance' },
  { label: 'Units', path: '/admin/units', marker: /Units/i, service: 'core' },
  { label: 'Metrics', path: '/governance/metrics', marker: /Metrics/i, service: 'compliance' },
  { label: 'KPI', path: '/governance/kpi', marker: /KPI/i, service: 'compliance' },
  { label: 'Ticket Settings', path: '/operations/settings', marker: /Ticket Settings/i, service: 'ticketing' },
  { label: 'Ticket Reports', path: '/operations/reports', marker: /Ticket Reports/i, service: 'ticketing' },
  { label: 'Attendance', path: '/admin/attendance', marker: /Attendance/i, service: 'ticketing' },
  { label: 'Reviews', path: '/governance/reviews', marker: /Reviews/i, service: 'compliance' },
  { label: 'Reports', path: '/governance/reports', marker: /Reports/i, service: 'compliance' },
  { label: 'MoV Builder', path: '/governance/mov', marker: /MoV/i, service: 'compliance' },
  { label: 'Audit Logs', path: '/admin/audit-logs', marker: /Audit Logs/i, service: 'users' },
  { label: 'User Manual', path: '/admin/user-manual', marker: /User Manual/i, service: 'shared' },
  { label: 'Settings', path: '/admin/settings', marker: /Settings/i, service: 'shared' },
] as const;

const regularUserRoutes = [
  { label: 'Dashboard', path: '/dashboard', marker: /Dashboard/i, service: 'core' },
  { label: 'Tickets', path: '/operations/tickets', marker: /Tickets/i, service: 'ticketing' },
  { label: 'Knowledge Base', path: '/operations/knowledge-base', marker: /Knowledge Base/i, service: 'ticketing' },
  { label: 'Settings', path: '/admin/settings', marker: /Settings/i, service: 'shared' },
] as const;

type AppMode = 'full' | 'ticketing_only' | 'compliance_only';

function routesForMode<T extends { service: string }>(routes: readonly T[], mode: AppMode) {
  return routes.filter((route) =>
    mode === 'ticketing_only'
      ? route.service !== 'compliance'
      : mode === 'compliance_only'
        ? route.service !== 'ticketing'
        : true,
  );
}

async function assertMobileLayout(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.documentWidth, `${label}: document overflows horizontally`).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.bodyWidth, `${label}: body overflows horizontally`).toBeLessThanOrEqual(metrics.viewport + 1);
}

async function assertPageReady(page: Page, label: string, marker: RegExp) {
  await expect(page.locator('main'), `${label}: main content should render`).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('body'), `${label}: expected page marker should render`).toContainText(marker, { timeout: 30_000 });
  await assertMobileLayout(page, label);
}

async function getAppMode(page: Page): Promise<AppMode> {
  return page.evaluate(async () => {
    const response = await fetch('/api/users/security-config/app-mode');
    if (!response.ok) return 'full';
    const body = await response.json();
    return body.appMode === 'ticketing_only' || body.appMode === 'compliance_only' ? body.appMode : 'full';
  }) as Promise<AppMode>;
}

async function openMobileDrawer(page: Page) {
  const drawer = page.locator('.MuiDrawer-paper:visible').first();
  if (!(await drawer.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'open drawer' }).click();
  }
  await expect(drawer).toBeVisible({ timeout: 15_000 });
  const viewport = await page.evaluate(() => innerWidth);
  // MUI reports the paper as visible before the temporary Drawer slide-in
  // transition has settled. Wait for its final in-viewport bounds.
  await expect
    .poll(
      async () => {
        const box = await drawer.boundingBox();
        return Boolean(box && box.x >= -1 && box.x + box.width <= viewport + 1);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  const box = await drawer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport + 1);
  return drawer;
}

async function navigateViaDrawer(
  page: Page,
  route: { label: string; path: string; marker: RegExp },
) {
  const drawer = await openMobileDrawer(page);
  const item = drawer.locator(`.MuiListItemButton-root[aria-label="${route.label}"]`);
  await expect(item, `${route.label} should be visible in the mobile drawer`).toBeVisible({ timeout: 30_000 });
  await item.click();
  await expect(page).toHaveURL(new RegExp(`${route.path.replaceAll('/', '\\/')}(?:$|[?#/])`), { timeout: 30_000 });
  await dismissPendingSatisfactionReminder(page);
  await assertPageReady(page, route.label, route.marker);
}

async function assertVisibleTabsFit(page: Page, label: string) {
  const tabs = page.getByRole('tab');
  const count = await tabs.count();
  for (let index = 0; index < count; index += 1) {
    const tab = tabs.nth(index);
    if (!(await tab.isVisible().catch(() => false))) continue;
    await tab.scrollIntoViewIfNeeded();
    await expect(tab, `${label}: tab ${index} should remain visible in its scrollable MUI tab strip`).toBeVisible();
    await tab.click();
    await assertMobileLayout(page, `${label} tab ${index}`);
  }
}

async function exerciseRepresentativeRoutes(page: Page, mode: AppMode) {
  if (mode !== 'ticketing_only') {
    await navigateViaDrawer(page, superAdminRoutes.find((route) => route.label === 'Documents')!);
    const uploadButton = page.getByRole('button', { name: 'Upload Document', exact: true });
    await expect(uploadButton).toBeVisible({ timeout: 30_000 });
    await uploadButton.click();
    await expect(page).toHaveURL(/\/governance\/documents\/upload/);
    await assertPageReady(page, 'Document upload', /Upload|Document/i);

    await navigateViaDrawer(page, superAdminRoutes.find((route) => route.label === 'Documents')!);
    await assertPageReady(page, 'Documents return', /Documents/i);
    const documentLink = page.locator('a[href*="/governance/documents/"]').filter({ hasNotText: /upload/i }).first();
    if (await documentLink.isVisible().catch(() => false)) {
      await documentLink.click();
      await expect(page).toHaveURL(/\/governance\/documents\/[^/]+/);
      await assertPageReady(page, 'Document detail', /Document|Version|Review/i);
    }
  }

  if (mode !== 'compliance_only') {
    await navigateViaDrawer(page, superAdminRoutes.find((route) => route.label === 'Tickets')!);
    await assertPageReady(page, 'Tickets return', /Tickets/i);
    const ticketRow = page.locator('tr.ticket-row').first();
    if (await ticketRow.isVisible().catch(() => false)) {
      await ticketRow.getByRole('button').first().click();
      await expect(page).toHaveURL(/\/operations\/tickets\/[^/]+/);
      await assertPageReady(page, 'Ticket detail', /Ticket|Activity|Comments/i);
    }
  }
}

test.describe('Version 1 frontend — full mobile web coverage', () => {
  test.describe.configure({ mode: 'serial', timeout: 600_000 });

  for (const width of [428, 320]) {
    test(`super admin can navigate every available frontend module at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 428 ? 926 : 568 });
      await signIn(page, superAdmin);
      await dismissPendingSatisfactionReminder(page);
      const mode = await getAppMode(page);
      if (process.env.E2E_APP_MODE && process.env.E2E_APP_MODE !== mode) {
        test.skip(true, `Expected app mode ${process.env.E2E_APP_MODE}, found ${mode}.`);
      }
      await assertPageReady(page, `${width}px dashboard`, /Dashboard/i);

      for (const route of routesForMode(superAdminRoutes, mode)) {
        await navigateViaDrawer(page, route);
        if (
          route.label === 'Duties' ||
          route.label === 'Ticket Settings' ||
          route.label === 'Ticket Reports' ||
          route.label === 'Settings'
        ) {
          await assertVisibleTabsFit(page, `${width}px ${route.label}`);
        }
      }

      const finalDrawer = await openMobileDrawer(page);
      if (mode === 'ticketing_only') {
        for (const label of ['Documents', 'Repository', 'Issuances', 'Metrics', 'KPI', 'Reviews', 'Reports', 'MoV Builder']) {
          await expect(finalDrawer.locator(`.MuiListItemButton-root[aria-label="${label}"]`)).toHaveCount(0);
        }
      }
      await page.keyboard.press('Escape');
      await exerciseRepresentativeRoutes(page, mode);
      await assertMobileLayout(page, `${width}px representative routes`);
    });
  }

  test('regular user sees a usable mobile navigation surface at 320px', async ({ page, browser }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const regularUser = await createE2ERegularAccount(browser);
    await signIn(page, regularUser);
    await dismissPendingSatisfactionReminder(page);
    const mode = await getAppMode(page);
    await assertPageReady(page, 'regular-user dashboard', /Dashboard/i);

    for (const route of routesForMode(regularUserRoutes, mode)) {
      await navigateViaDrawer(page, route);
    }

    const finalDrawer = await openMobileDrawer(page);
    await expect(finalDrawer.locator('.MuiListItemButton-root[aria-label="Ticket Settings"]')).toHaveCount(0);
    await expect(finalDrawer.locator('.MuiListItemButton-root[aria-label="Audit Logs"]')).toHaveCount(0);
    await assertMobileLayout(page, 'regular-user mobile navigation');
  });
});
