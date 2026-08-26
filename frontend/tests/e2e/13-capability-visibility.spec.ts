import { expect, Page, test } from '@playwright/test';

type CapabilityKey =
  | 'isTicketModuleAccess'
  | 'isDutyViewerAccess'
  | 'isDutyAdminAccess'
  | 'isDocumentsAccess'
  | 'isRepositoryAccess'
  | 'isIssuancesAccess'
  | 'isUnitsAccess'
  | 'isMetricsAccess'
  | 'isKpiAccess'
  | 'isTicketSettingsFocal'
  | 'isDesktop'
  | 'isItSupport'
  | 'isPantawidIct'
  | 'isAttendanceAccess'
  | 'isReviewsAccess'
  | 'isReportsAccess'
  | 'isMovAccess'
  | 'isAuditAccess'
  | 'isGlobalSettingsAccess'
  | 'isUserManagementView'
  | 'isRoleCapabilitiesAccess'
  | 'isSystemRolesAccess'
  | 'isSecuritySettingsAccess';

const navigationCapabilities: Array<{
  label: string;
  path: string;
  capabilities: CapabilityKey[];
}> = [
  { label: 'Tickets', path: '/operations/tickets', capabilities: ['isTicketModuleAccess'] },
  {
    label: 'Knowledge Base',
    path: '/operations/knowledge-base',
    capabilities: ['isTicketModuleAccess'],
  },
  {
    label: 'Duties',
    path: '/operations/duties',
    capabilities: ['isDutyViewerAccess', 'isDutyAdminAccess'],
  },
  { label: 'Documents', path: '/governance/documents', capabilities: ['isDocumentsAccess'] },
  { label: 'Repository', path: '/governance/repository', capabilities: ['isRepositoryAccess'] },
  { label: 'Issuances', path: '/governance/issuances', capabilities: ['isIssuancesAccess'] },
  { label: 'Units', path: '/admin/units', capabilities: ['isUnitsAccess'] },
  { label: 'Metrics', path: '/governance/metrics', capabilities: ['isMetricsAccess'] },
  { label: 'KPI', path: '/governance/kpi', capabilities: ['isKpiAccess'] },
  {
    label: 'Ticket Settings',
    path: '/operations/settings',
    capabilities: ['isTicketSettingsFocal'],
  },
  {
    label: 'Ticket Reports',
    path: '/operations/reports',
    capabilities: ['isTicketSettingsFocal', 'isDesktop', 'isItSupport', 'isPantawidIct'],
  },
  { label: 'Attendance', path: '/admin/attendance', capabilities: ['isAttendanceAccess'] },
  { label: 'Reviews', path: '/governance/reviews', capabilities: ['isReviewsAccess'] },
  { label: 'Reports', path: '/governance/reports', capabilities: ['isReportsAccess'] },
  { label: 'MoV Builder', path: '/governance/mov', capabilities: ['isMovAccess'] },
  { label: 'Audit Logs', path: '/admin/audit-logs', capabilities: ['isAuditAccess'] },
  {
    label: 'Settings',
    path: '/admin/settings',
    capabilities: [],
  },
];

const allCapabilities = [
  ...new Set(navigationCapabilities.flatMap(({ capabilities }) => capabilities)),
];

function capabilityRow(enabled: Partial<Record<CapabilityKey, boolean>> = {}) {
  return {
    id: 9001,
    roleValue: 'custom_role',
    ...Object.fromEntries(allCapabilities.map((capability) => [capability, false])),
    ...enabled,
  };
}

async function installCapabilityApiMock(
  page: Page,
  enabled: Partial<Record<CapabilityKey, boolean>> = {},
  appMode: 'full' | 'ticketing_only' | 'compliance_only' = 'full',
) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (!pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }

    let responseBody: unknown;

    if (pathname.endsWith('/auth/me')) {
      responseBody = {
        id: 9001,
        email: 'capability-test@example.test',
        firstName: 'Capability',
        lastName: 'Tester',
        role: 'custom_role',
        active: true,
        requiresMfa: false,
        requiresPasswordChange: false,
        units: [],
      };
    } else if (pathname.endsWith('/users/role-capabilities/me')) {
      responseBody = capabilityRow(enabled);
    } else if (pathname.endsWith('/users/security-config/app-mode')) {
      responseBody = { appMode };
    } else if (pathname.endsWith('/duties/dashboard')) {
      responseBody = [];
    } else if (pathname.endsWith('/cybersecurity/metrics')) {
      responseBody = [];
    } else if (pathname.endsWith('/incidents/today-stats')) {
      responseBody = {
        startCount: 0,
        addedToday: 0,
        currentCount: 0,
        severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
      };
    } else if (pathname.endsWith('/kpi/dashboard/summary')) {
      responseBody = {
        summary: { overallScore: 0, unitCount: 0, rowCount: 0, periodYear: 2026, periodMonth: 8 },
        units: [],
      };
    } else if (pathname.includes('/documents')) {
      responseBody = { data: [], total: 0 };
    } else if (pathname.endsWith('/tickets/statistics')) {
      responseBody = {
        total: 0,
        byStatus: {},
        byType: {},
        satisfactionAvg: null,
        satisfactionFillRate: 0,
        resolvedTickets: 0,
      };
    } else if (pathname.endsWith('/tickets/dashboard')) {
      responseBody = { myTicketsCount: 0, escalatedToMeCount: 0 };
    } else if (pathname.endsWith('/tickets/report-technicians')) {
      responseBody = [];
    } else if (pathname.endsWith('/tickets/reports/issue-counts')) {
      responseBody = [];
    } else if (pathname.endsWith('/tickets/reports')) {
      responseBody = {
        totalTickets: 0,
        totalWithRating: 0,
        avgOverallRating: null,
        avgRatingByType: [],
        avgRatingByTechnician: [],
        issueCounts: [],
        acceptedEscalations: 0,
        returnedEscalations: 0,
        totalEscalations: 0,
        slaStats: { met: 0, missed: 0, avgResolutionTimeHours: 0 },
        slaByType: [],
        slaByTechnician: [],
      };
    } else if (pathname.endsWith('/tickets/ratings-report')) {
      responseBody = {
        overview: { totalRatings: 0, avgOverallRating: 0 },
        byTicket: [],
        byTechnician: [],
        byDay: [],
        byWeek: [],
        byMonth: [],
        byQuarter: [],
      };
    } else if (pathname.endsWith('/tickets')) {
      responseBody = { data: [], total: 0, totalPages: 1, page: 1, limit: 10 };
    } else if (pathname.includes('/ticket-settings/categories')) {
      responseBody = [];
    } else if (pathname.includes('/ticket-settings/keyword-rules')) {
      responseBody = [];
    } else if (pathname.includes('/ticket-settings/issue-types')) {
      responseBody = [];
    } else if (pathname.includes('/ticket-settings/escalation-focals')) {
      responseBody = [];
    } else if (pathname.endsWith('/feedback')) {
      responseBody = { data: [], total: 0 };
    } else if (pathname.endsWith('/users/profile-units')) {
      responseBody = [];
    } else if (pathname.endsWith('/users')) {
      responseBody = [];
    } else if (pathname.endsWith('/notifications/unread-count')) {
      responseBody = { count: 0 };
    } else if (pathname.endsWith('/health')) {
      responseBody = { status: 'ok' };
    } else {
      responseBody = {};
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
    });
  });
}

async function openShell(
  page: Page,
  enabled: Partial<Record<CapabilityKey, boolean>> = {},
  appMode: 'full' | 'ticketing_only' | 'compliance_only' = 'full',
) {
  await page.unroute('**/api/**');
  await installCapabilityApiMock(page, enabled, appMode);
  const appModeResponse = page.waitForResponse((response) =>
    response.url().includes('/api/users/security-config/app-mode'),
    { timeout: 300_000 },
  );
  const capabilityResponse = page.waitForResponse((response) =>
    response.url().includes('/api/users/role-capabilities/me'),
    { timeout: 300_000 },
  );
  await page.goto('/');
  await Promise.all([appModeResponse, capabilityResponse]);
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
}

function routePattern(path: string) {
  const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedPath}$`);
}

async function clickNavigationItem(page: Page, label: string, path: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page).toHaveURL(routePattern(path));
}

test.describe('Capability-driven frontend visibility', () => {
  test.describe.configure({ timeout: 300_000 });

  test('keeps baseline navigation available to a custom role with no feature capabilities', async ({
    page,
  }) => {
    await openShell(page);

    const userManual = page.getByRole('button', { name: 'User Manual', exact: true });
    await expect(userManual).toBeVisible();
    await userManual.click();
    await expect(page).toHaveURL(routePattern('/admin/user-manual'));

    for (const { label, capabilities } of navigationCapabilities) {
      const navigationItem = page.getByRole('button', { name: label, exact: true });
      if (capabilities.length === 0) {
        await expect(navigationItem).toBeVisible();
      } else {
        await expect(navigationItem).not.toBeVisible();
      }
    }
  });

  for (const capability of allCapabilities) {
    test('maps ' + capability + ' to the expected navigation visibility', async ({ page }) => {
      await openShell(page, { [capability]: true });
      await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'User Manual', exact: true })).toBeVisible();

      for (const { label, path, capabilities } of navigationCapabilities) {
        const shouldBeVisible = capabilities.length === 0 || capabilities.includes(capability);
        const navigationItem = page.getByRole('button', { name: label, exact: true });

        if (shouldBeVisible) {
          await expect(navigationItem).toBeVisible();
        } else {
          await expect(navigationItem).not.toBeVisible();
        }
      }

      for (const { label, path, capabilities } of navigationCapabilities) {
        if (capabilities.includes(capability)) {
          await openShell(page, { [capability]: true });
          await clickNavigationItem(page, label, path);
        }
      }
    });
  }

  test('uses the visible navigation action to enter an enabled feature', async ({ page }) => {
    await openShell(page, { isMetricsAccess: true });

    await page.getByRole('button', { name: 'Metrics', exact: true }).click();

    await expect(page).toHaveURL(/\/governance\/metrics$/);
    await expect(page.getByText('You do not have access to this feature.')).not.toBeVisible();
  });

  test('ticketing-only mode navigates ticketing CRUD entry points through visible UI actions', async ({
    page,
  }) => {
    await openShell(
      page,
      { isTicketModuleAccess: true, isTicketSettingsFocal: true, isDesktop: true },
      'ticketing_only',
    );

    await expect(page.getByRole('button', { name: 'Tickets', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Knowledge Base', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ticket Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ticket Reports', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Documents', exact: true })).not.toBeVisible();

    await clickNavigationItem(page, 'Tickets', '/operations/tickets');
    await expect(page.getByText('Tickets').first()).toBeVisible();

    await page.getByRole('button', { name: 'Ticket Settings', exact: true }).click();
    await expect(page).toHaveURL(routePattern('/operations/settings'));
    await expect(page.getByRole('heading', { name: 'Ticket Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Categories/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Issues/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Keyword Rules/ })).toBeVisible();

    await page.getByRole('button', { name: 'Ticket Reports', exact: true }).click();
    await expect(page).toHaveURL(routePattern('/operations/reports'));
    await expect(page.getByRole('heading', { name: 'Ticket Reports', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(routePattern('/admin/settings'));
    await expect(page.getByText('Change Password', { exact: true })).toBeVisible();
  });
});
