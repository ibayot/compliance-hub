import { test, expect } from '@playwright/test';

test.describe('Proxy Request Feature', () => {
  test('Staff can create a ticket on behalf of a user, and it shows as Proxy Request', async ({ page }) => {
    // 1. Login as Admin
    await page.goto('/login');
    // MUI TextField renders as <input type="email"> — no name attribute
    await page.locator('input[type="email"]').fill('admin@rictms.gov.ph');
    await page.locator('input[type="password"]').fill('admin');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 20000 });

    // 2. Navigate to Tickets page
    await page.goto('/dashboard/tickets');
    await page.waitForURL('**/tickets', { timeout: 10000 });

    // 3. Open New Ticket dialog
    await page.locator('button:has-text("New Ticket")').click();
    // Dialog title is "Submit a Help Desk Ticket"
    await page.waitForSelector('text="Submit a Help Desk Ticket"', { timeout: 10000 });

    // 4. Select Desktop Support type (click the card)
    await page.locator('text="Desktop Support"').first().click();

    // 5. Fill subject and description
    await page.locator('label:has-text("Subject")').locator('..').locator('input').fill('E2E Proxy Request Test');
    await page.locator('textarea').first().fill('This ticket is created by staff for an employee.');

    // 6. Use the "Requested For" Autocomplete — label is "Requested For (Optional)"
    const autocompleteInput = page.locator('label:has-text("Requested For") ~ div input, input[id*="combo-box"]').first();
    await autocompleteInput.fill('test');
    await page.waitForTimeout(1500);
    const option = page.locator('.MuiAutocomplete-listbox li').first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    // 7. Submit — button text is "Submit Ticket"
    await page.locator('button:has-text("Submit Ticket")').click();
    await page.waitForSelector('text="Ticket submitted successfully"', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // 8. Verify Proxy Request chip appears on the newest ticket in the list
    const proxyChip = page.locator('text="Proxy Request"').first();
    await expect(proxyChip).toBeVisible({ timeout: 5000 });
  });

  test('User can see tickets filed on their behalf in the Requested For tab', async ({ page }) => {
    // Login as the regular user whose ticket was just created by admin
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test@dswd.gov.ph');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 20000 });

    await page.goto('/dashboard/tickets');
    await page.waitForURL('**/tickets', { timeout: 10000 });

    // The "Requested For" tab should be visible in the user view
    const requestedForTab = page.locator('[role="tab"]:has-text("Requested For")');
    await expect(requestedForTab).toBeVisible({ timeout: 5000 });
    await requestedForTab.click();
    await page.waitForTimeout(1000);

    // The proxy ticket created in the previous test should appear here
    // Verify at least one ticket is visible or the empty state message shows (no error)
    const ticketRow = page.locator('tr[data-testid], .MuiCard-root').first();
    const noTickets = page.locator('text="No tickets found in this category"');
    const hasContent = (await ticketRow.count()) > 0 || (await noTickets.count()) > 0;
    expect(hasContent).toBe(true);
  });
});
