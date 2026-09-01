import { expect, test } from '@playwright/test';
import { navigate, selectOption, signIn, superAdmin } from './v1-helpers';

test.describe('Version 1 ticketing service — reports', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('super admin can inspect ticket report filters, views, and management tabs', async ({ page }) => {
    await signIn(page, superAdmin);
    await navigate(page, 'Ticket Reports', '/operations/reports');

    await expect(page.getByRole('heading', { name: 'Ticket Reports', exact: true })).toBeVisible();
    await expect(page.getByText(/Satisfaction ratings overview/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Filters', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Overview & Ratings', exact: true })).toBeVisible();

    // Exercise the supported period and support-type filters through their UI controls.
    await selectOption(page, 'Period', 'Full Year');
    await selectOption(page, 'Support Type', 'IT Support');
    await expect(page.getByText(/Satisfaction ratings overview/i)).toBeVisible();

    await page.getByRole('button', { name: 'Detailed Ratings', exact: true }).click();
    await expect(page.getByText(/Average Rating By Day|No data\./i).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Overview', exact: true }).click();

    await page.getByRole('tab', { name: 'Issues', exact: true }).click();
    await expect(page.getByText(/Issue Categories Overview|No categories to display\.|All Issues/i).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole('tab', { name: 'All Issues', exact: true }).click();
    await expect(page.getByText(/All Issues|No specific issues reported in this timeframe\./i).first()).toBeVisible();

    await page.getByRole('tab', { name: 'SLA Insights', exact: true }).click();
    await expect(page.getByText('SLA Recalibration Insights', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/No resolution data available|Configured SLA|Actual Avg/i).first()).toBeVisible();

    await page.getByRole('tab', { name: 'Performance', exact: true }).click();
    await expect(page.getByText('Performance Metrics', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/No performance data is available|SLA Performance|SLA by Technician|Technician Performance Detail/i).first()).toBeVisible();

    // A report API failure must not be silently rendered as a successful report page.
    await expect(page.getByText(/Failed to load|Unable to load|Database error|Internal Server Error/i)).toHaveCount(0);
  });
});
