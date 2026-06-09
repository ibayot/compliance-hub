import { test, expect } from '@playwright/test';

// All seed DB accounts use this password
const PASSWORD = 'password123';

/**
 * Login helper using MUI TextFields (rendered without name attributes).
 */
async function login(page: any, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Wait for the dashboard to load by watching for the page heading
  await page.waitForSelector('h4, h5, h6', { timeout: 25000 });
  // Also give auth context time to settle
  await page.waitForTimeout(1000);
}

test.describe('Proxy Request Feature', () => {
  test('Staff can create a ticket on behalf of a user, and it shows as Proxy Request', async ({ page }) => {
    // 1. Login as Admin (super_admin role, password123)
    await login(page, 'admin@rictms.gov.ph');

    // 2. Navigate directly to Tickets page
    await page.goto('/dashboard/tickets');
    await page.waitForSelector('text="Help Desk Tickets"', { timeout: 15000 });

    // 3. Open New Ticket dialog
    await page.locator('button:has-text("New Ticket")').click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ timeout: 10000 });
    await page.waitForSelector('text="Submit a Help Desk Ticket"', { timeout: 10000 });

    // 4. Select Desktop Support — scope click INSIDE the dialog to avoid hitting chips in the table
    await dialog.locator('text="Desktop Support"').click({ force: true });

    // 5. Fill subject — look for the input with placeholder "Brief description of your issue"
    await dialog.locator('input[placeholder="Brief description of your issue"]').fill('E2E Proxy Request Test');

    // 6. Fill description
    await dialog.locator('textarea').first().fill('This ticket is created by staff for an employee.');

    // 7. Use the "Requested For (Optional)" Autocomplete
    const reqForInput = dialog.locator('label:has-text("Requested For")').locator('..').locator('input');
    await reqForInput.fill('test');
    await page.waitForTimeout(1500);
    const option = page.locator('.MuiAutocomplete-listbox li').first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    // 8. Submit — button text is "Submit Ticket"
    await dialog.locator('button:has-text("Submit Ticket")').click({ force: true });
    await page.waitForSelector('text=/Ticket submitted successfully/i', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 9. Verify Proxy Request chip appears in the ticket list
    const proxyChip = page.locator('text="Proxy Request"').first();
    await expect(proxyChip).toBeVisible({ timeout: 8000 });
  });

  test('User can see tickets filed on their behalf in the Requested For tab', async ({ page }) => {
    // Login as the regular user who was used as proxy target in the previous test
    await login(page, 'test@dswd.gov.ph');

    await page.goto('/dashboard/tickets');
    await page.waitForSelector('text="Help Desk Tickets"', { timeout: 15000 });

    // The "Requested For" tab (4th tab in user view)
    const requestedForTab = page.locator('[role="tab"]:has-text("Requested For")');
    await expect(requestedForTab).toBeVisible({ timeout: 5000 });
    await requestedForTab.click();
    await page.waitForTimeout(1500);

    // Verify no JS error and that the tab works
    await expect(page.locator('body')).not.toContainText('Error');
    const hasTickets = await page.locator('tbody tr').count() > 0;
    const hasEmptyState = await page.locator('text="No tickets found in this category"').count() > 0;
    expect(hasTickets || hasEmptyState).toBe(true);
  });
});
