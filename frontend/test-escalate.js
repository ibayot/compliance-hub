const fs = require('fs');
let code = fs.readFileSync('tests/e2e/tickets.spec.ts', 'utf8');

// 1. Remove Test 1 Open Ticket Restriction check
const test1Pattern = /\/\/ Verify Open Ticket Restriction: User shouldn't be able to create another ticket while one is open[\s\S]*?await page\.waitForTimeout\(500\);/m;
code = code.replace(test1Pattern, '');

// 2. Fix createTicket at the top
const createTicketOldEnd = /await page\.getByRole\('button', \{ name: 'Submit Ticket', exact: true \}\)\.click\(\);\s*await page\.waitForTimeout\(1000\);\s*\}/m;
const createTicketNewEnd = `await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
  await page.waitForTimeout(500);
}`;
code = code.replace(createTicketOldEnd, createTicketNewEnd);

// 3. Append Test 4 at the bottom
const test4 = `
  test('Test 4: Multiple Requests Allowed (Open Ticket & Pending Rating Restrictions Removed)', async ({ page }) => {
    test.setTimeout(120000); // 2 mins

    // 1. Create first ticket
    await markPresent([ACCOUNTS.desktopSr.id]);
    await login(page, ACCOUNTS.user.email);
    await page.goto('/dashboard/tickets');
    const subject1 = 'E2E Test 4 Multi-Request A ' + Date.now();
    await createTicket(page, subject1);

    // 2. User creates a second ticket IMMEDIATELY (checking Open Ticket Restriction is gone)
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(1000);
    const subject2 = 'E2E Test 4 Multi-Request B ' + Date.now();
    await createTicket(page, subject2);

    // Verify both tickets exist
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.locator('tr', { hasText: subject1 }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tr', { hasText: subject2 }).first()).toBeVisible({ timeout: 10000 });
    
    // Now get the ID of ticket 1 to resolve it
    await page.locator('tr', { hasText: subject1 }).first().getByRole('button', { name: 'View Details' }).click();
    const url1 = page.url();
    const ticketId1 = url1.split('/').pop() || '';
    await logout(page);

    // 3. Resolve Ticket 1 directly as desktopSr (auto-assigned by monolith)
    await login(page, ACCOUNTS.desktopSr.email);
    await page.goto('/dashboard/tickets/' + ticketId1);
    await page.waitForTimeout(1000);

    await page.getByLabel('Status').click();
    await page.getByRole('option', { name: 'Resolved' }).click();
    await page.getByLabel('Resolution Notes (optional)').fill('Resolved Ticket A for Test 4');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Ticket updated.')).toBeVisible({ timeout: 10000 });
    await logout(page);

    // 4. User attempts to create a 3rd ticket while Ticket 1 is Unrated (Pending Satisfaction)
    await login(page, ACCOUNTS.user.email);
    await page.goto('/dashboard/tickets');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: 'New Ticket' }).click();
    // Reminder should appear
    await expect(page.locator('text=Pending Satisfaction Reminder')).toBeVisible({ timeout: 10000 });
    
    // Click Proceed Anyway
    await page.getByRole('button', { name: 'Proceed Anyway' }).click();
    
    // Dialog should open, let's create Ticket 3
    await page.waitForTimeout(500);
    const subjectInput = page.getByRole('textbox', { name: /Subject/i });
    await expect(subjectInput).toBeVisible({ timeout: 10000 });
    await subjectInput.fill('E2E Test 4 Multi-Request C ' + Date.now());
    await page.getByRole('textbox', { name: /Description/i }).fill('Testing proceed anyway');
    
    const desktopSupportCard = page.locator('.MuiDialog-root').getByText('Desktop Support').first();
    if (await desktopSupportCard.isVisible({ timeout: 3000 })) {
      await desktopSupportCard.click();
    }

    await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
    await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
    await logout(page);
    await cleanAttendance([ACCOUNTS.desktopSr.id]);
  });
`;

code = code.replace(/}\);\n}\);\n*$/, '});\n' + test4 + '\n});\n');

fs.writeFileSync('tests/e2e/tickets.spec.ts', code, 'utf8');
console.log('Modified tests/e2e/tickets.spec.ts programmatically!');
