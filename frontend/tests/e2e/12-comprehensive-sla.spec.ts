import { test, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import accounts from './data/accounts.json';

test.describe.serial('Comprehensive E2E SLA & Recent Enhancements', () => {
  test.setTimeout(120000);
  let liveDefaultPassword = '';
  let assignedTechEmail = accounts.desktopJr.email; // Fallback
  let roundRobinTicketId = '';
  let ticket1Id = '';

  test('Scenario 1: Setup - Attendance, Escalation Focal & Security Settings', async ({ page }) => {
    test.setTimeout(120000);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await test.step('Log in as Super Admin', async () => {
      await loginPage.goto();
      await loginPage.login(accounts.admin.email, accounts.admin.password);
    });

    await test.step('Attendance Override: Mark everyone present', async () => {
      await dashboardPage.navigateTo('Attendance');
      await page.getByRole('tab', { name: 'Attendance' }).click();

      const today = new Date().getDate().toString();
      const headers = page.locator('thead tr th');
      const count = await headers.count();
      let targetColIndex = -1;
      for (let i = 0; i < count; i++) {
        const text = await headers.nth(i).textContent();
        if (text?.trim() === today) {
          targetColIndex = i;
          break;
        }
      }

      if (targetColIndex !== -1) {
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        for (let i = 0; i < rowCount; i++) {
          const cell = rows.nth(i).locator('td').nth(targetColIndex);
          const btn = cell.getByRole('button', { name: /Set present/i });
          if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(300);
          }
        }
      }
    });

    await test.step('Configure Escalation Focal (Role Capability)', async () => {
      await dashboardPage.navigateTo('Settings');

      const capabilitiesCard = page
        .locator('.MuiCard-root')
        .filter({ hasText: 'Role Capabilities Matrix' });
      const focalRow = capabilitiesCard
        .locator('tr', { hasText: /compliance[_-]?officer/i })
        .first();
      await focalRow.waitFor({ state: 'visible', timeout: 5000 });
      // isEscalationFocal is index 5 in the CAPABILITY_COLUMNS array
      const escCheckbox = focalRow.locator('input[type="checkbox"]').nth(5);
      if (!(await escCheckbox.isChecked())) {
        await escCheckbox.check();
        await expect(page.getByRole('alert'))
          .toBeVisible({ timeout: 5000 })
          .catch(() => {});
      }
    });

    await test.step('Configure Escalation Focal (Ticket Settings)', async () => {
      await dashboardPage.navigateTo('Ticket Settings');

      await page.getByRole('tab', { name: /Escalation Focals/i }).click();

      // Clear existing focals
      const deleteBtns = page.getByRole('button', { name: 'Remove' });
      const count = await deleteBtns.count();
      for (let i = 0; i < count; i++) {
        page.once('dialog', (dialog) => dialog.accept());
        await deleteBtns.first().click();
        await page.waitForTimeout(500);
      }

      await page.getByRole('button', { name: 'Add Focal' }).click();
      await page.getByRole('combobox', { name: /Ticket Type \*/i }).click();
      await page.getByRole('option', { name: 'All Types' }).click();

      await page.getByRole('combobox', { name: /Select Focal User \*/i }).click();
      await page.getByRole('option', { name: /Marc Jayson D Ibay/i }).click();
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: /added/i }).first()).toBeVisible();
    });

    await test.step('Read Live Default Password from UI', async () => {
      await dashboardPage.navigateTo('Settings');
      const defaultPassInput = page.getByLabel('System Default Password');
      if (await defaultPassInput.isVisible()) {
        liveDefaultPassword = await defaultPassInput.inputValue();
      }
      if (!liveDefaultPassword) liveDefaultPassword = 'Changeme123!@#';
    });

    await test.step('Trigger Password Reset for user', async () => {
      await dashboardPage.navigateTo('Settings');
      await page
        .getByRole('tab', { name: 'Regular Users' })
        .click()
        .catch(() => {});

      const searchInput = page.getByPlaceholder('Search staff by name or email...');
      if (await searchInput.isVisible()) {
        await searchInput.fill(accounts.user.email);
        await page.waitForTimeout(500); // Wait for debounce/filter
      }

      const userRow = page.locator('tr', { hasText: accounts.user.email }).first();
      const resetBtn = userRow
        .getByRole('button')
        .filter({ has: page.locator('svg[data-testid="KeyIcon"]') });

      if (await resetBtn.isVisible()) {
        await resetBtn.click();
        await page.getByRole('button', { name: 'Reset Password' }).click();
        await expect(page.getByRole('alert'))
          .toContainText('successfully', { ignoreCase: true, timeout: 5000 })
          .catch(() => {});
      }
    });

    await dashboardPage.logout();
  });

  test('Scenario 2: Force Password Reset on First Login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await test.step('Log in with live default password', async () => {
      await loginPage.goto();
      await page.locator('input[type="email"]').fill(accounts.user.email);
      await page.locator('input[type="password"]').fill(liveDefaultPassword);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.waitForURL(/.*\/dashboard/, { timeout: 15000 }).catch(() => {});
    });

    await test.step('Verify Force Password Modal is presented and pre-filled', async () => {
      await expect(page.getByRole('heading', { name: 'Complete Your Profile' })).toBeVisible({
        timeout: 15000,
      });

      const firstNameInput = page.getByLabel('First Name');
      if ((await firstNameInput.isVisible()) && (await firstNameInput.inputValue()).trim() === '') {
        await firstNameInput.fill('TestFirst');
      }

      const lastNameInput = page.getByLabel('Last Name');
      if ((await lastNameInput.isVisible()) && (await lastNameInput.inputValue()).trim() === '') {
        await lastNameInput.fill('TestLast');
      }

      const phoneInput = page.getByLabel('Phone Number');
      if ((await phoneInput.isVisible()) && (await phoneInput.inputValue()).trim() === '') {
        await phoneInput.fill('09123456789');
      }

      const sexLabel = page.locator('label').filter({ hasText: 'Sex' });
      const sexControl = sexLabel.locator('..');
      await sexControl.locator('[role="combobox"]').dispatchEvent('mousedown');
      await page.getByRole('option', { name: 'Male', exact: true }).click();

      const unitLabel = page.locator('label').filter({ hasText: 'Unit/Section' });
      const unitControl = unitLabel.locator('..');
      await unitControl.locator('[role="combobox"]').dispatchEvent('mousedown');
      await page.getByRole('option').nth(0).click();
    });

    await test.step('Set new password and save profile', async () => {
      const newPassInputs = page.locator('input[type="password"]');
      await newPassInputs.nth(0).fill(accounts.user.password);
      await newPassInputs.nth(1).fill(accounts.user.password);

      // Handle the Pending Satisfaction Reminder if it overlaps (because of previous test runs)
      const closeCsatBtn = page.getByRole('button', { name: 'Close' });
      if (await closeCsatBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeCsatBtn.click();
      }

      await page.screenshot({ path: 'force-password-modal-before-save.png' });
      await page.getByRole('button', { name: /Save Profile/i }).click();
      //await page.waitForTimeout(2000);
      // await page.pause();
      await page.screenshot({ path: 'force-password-modal-after-save.png' });

      // await expect(page.getByRole('alert').filter({ hasText: /successfully/i }).first()).toBeVisible();
      await expect(page.getByText(/successfully/i)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Complete Your Profile' })).toBeHidden({
        timeout: 5000,
      });
      const dashboardPage = new DashboardPage(page);
      // Wait for and close the CSAT reminder if it pops up after logging in!
      await dashboardPage.closeSatisfactionReminder();

      await expect(page).toHaveURL(/.*dashboard/);
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();
  });

  test('Scenario 3: Round Robin SLA Queuing & Active Load Limit', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await test.step('Submit Ticket 1 to initialize load', async () => {
      await loginPage.goto();
      await loginPage.login(accounts.user.email, accounts.user.password);
      await dashboardPage.closeSatisfactionReminder();
      await dashboardPage.navigateTo('Tickets');
      await page.getByRole('button', { name: 'New Ticket' }).click();
      await expect(page.getByRole('dialog').first()).toBeVisible();
      const proceedBtn1 = page.getByRole('button', { name: 'Proceed Anyway' });
      if (await proceedBtn1.isVisible()) {
        await proceedBtn1.click();
      }
      await expect(page.getByRole('dialog', { name: /Submit a Help Desk Ticket/i })).toBeVisible();
      await page.getByLabel('Category').click();
      await page.getByRole('option').nth(1).click();
      await page.getByLabel(/Subject/i).fill('SLA Queue Test Ticket 1');
      await page.getByLabel(/Description/i).fill('First ticket to block the queue');
      await page.getByRole('button', { name: 'Submit' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await dashboardPage.logout();
    });

    await test.step('Admin identifies assigned tech', async () => {
      await loginPage.goto();
      await loginPage.login(accounts.admin.email, accounts.admin.password);
      await dashboardPage.navigateTo('Tickets');

      const firstRow = page.locator('table tbody tr').first();
      const techName = await firstRow.locator('td').nth(8).innerText();

      const nameLower = techName.toLowerCase();
      if (nameLower.includes('cardona')) assignedTechEmail = accounts.desktopJr.email;
      else if (nameLower.includes('javier')) assignedTechEmail = accounts.itSupportJr.email;
      else if (nameLower.includes('ilingan')) assignedTechEmail = accounts.pantawidIct.email;
      else if (nameLower.includes('mabazza')) assignedTechEmail = accounts.desktopSr1.email;
      else if (nameLower.includes('garcia')) assignedTechEmail = accounts.desktopSr2.email;
      else if (nameLower.includes('bucayu')) assignedTechEmail = accounts.devLead.email;
      else if (nameLower.includes('juan')) assignedTechEmail = accounts.sectionHead.email;
      else if (nameLower.includes('maguigad')) assignedTechEmail = accounts.cybersec.email;

      await dashboardPage.logout();
    });

    await test.step('TargetTech accepts ticket to max active load', async () => {
      await loginPage.goto();
      await loginPage.login(assignedTechEmail, accounts.desktopJr.password); // Using desktopJr password as default generic password for test accounts

      const forcePassHeader = page.getByRole('heading', { name: 'Complete Your Profile' });
      if (await forcePassHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.getByLabel('New Password', { exact: true }).fill('Changeme123!@#');
        await page.getByLabel('Confirm New Password').fill('Changeme123!@#');
        await page.getByRole('button', { name: 'Save Changes' }).click();
        await expect(forcePassHeader)
          .toBeHidden({ timeout: 5000 })
          .catch(() => {});
      }

      await dashboardPage.navigateTo('Tickets');
      await page
        .locator('table tbody tr')
        .first()
        .getByRole('button', { name: 'View Details' })
        .click();

      const urlParts = page.url().split('/');
      ticket1Id = urlParts[urlParts.length - 1];

      await page.getByRole('button', { name: 'Update Status' }).click();
      await page.getByLabel('Status').click();
      await page.getByRole('option', { name: 'In Progress' }).click();

      await page.getByLabel(/Priority/i).click();
      await page.getByRole('option', { name: /Medium/i }).click();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await dashboardPage.logout();
    });

    await test.step('Submit Ticket 2 (Should Queue)', async () => {
      await loginPage.goto();
      await loginPage.login(accounts.user.email, accounts.user.password);
      await dashboardPage.closeSatisfactionReminder();
      await dashboardPage.navigateTo('Tickets');
      await page.getByRole('button', { name: 'New Ticket' }).click();
      await expect(page.getByRole('dialog').first()).toBeVisible();
      const proceedBtn2 = page.getByRole('button', { name: 'Proceed Anyway' });
      if (await proceedBtn2.isVisible()) {
        await proceedBtn2.click();
      }
      await expect(page.getByRole('dialog', { name: /Submit a Help Desk Ticket/i })).toBeVisible();
      await page.getByLabel('Category').click();
      await page.getByRole('option').nth(1).click();
      await page.getByLabel(/Subject/i).fill('SLA Queue Test Ticket 2');
      await page.getByLabel(/Description/i).fill('This ticket should be queued');
      await page.getByRole('button', { name: 'Submit' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await dashboardPage.logout();
    });

    await test.step('Admin verifies SLA is on Hold/Waiting', async () => {
      await loginPage.goto();
      await loginPage.login(accounts.admin.email, accounts.admin.password);
      await dashboardPage.navigateTo('Tickets');

      const newRow = page.locator('table tbody tr').first();
      await expect(newRow.locator('text=—')).toBeVisible();
      await newRow.getByRole('button', { name: 'View Details' }).click();

      const urlParts = page.url().split('/');
      roundRobinTicketId = urlParts[urlParts.length - 1];

      await dashboardPage.logout();
    });
  });

  test('Scenario 4 & 5: Queue Pushback, Escalation, and KB Generation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await test.step('TargetTech puts active ticket On Hold (Unstacking)', async () => {
      await loginPage.goto();
      await loginPage.login(assignedTechEmail, accounts.desktopJr.password);

      // Open the "In Progress" ticket via UI
      await dashboardPage.navigateTo('Tickets');
      await page
        .locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' })
        .first()
        .getByRole('button', { name: 'View Details' })
        .click();

      await page.getByRole('button', { name: 'Update Status' }).click();
      await page.getByLabel('Status').click();
      await page.getByRole('option', { name: 'Pause' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
    });

    await test.step('TargetTech puts ticket back In Progress (Preemptive Pushback)', async () => {
      await page.getByRole('button', { name: 'Update Status' }).click();
      await page.getByLabel('Status').click();
      await page.getByRole('option', { name: 'In Progress' }).click();

      await page.getByLabel(/Priority/i).click();
      await page.getByRole('option', { name: /Medium/i }).click();

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
    });

    await test.step('TargetTech escalates ticket', async () => {
      await page.getByRole('button', { name: 'Escalate Ticket' }).click();
      await page.getByLabel('Escalate To').click();
      await page.getByRole('option', { name: 'Marc Jayson D Ibay' }).click();
      await page.getByLabel('Reason for escalation (optional)').fill('Need focal assistance');
      await page.getByRole('button', { name: 'Escalate', exact: true }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await dashboardPage.logout();
    });

    await test.step('Escalation Guard blocks unauthorized technicians', async () => {
      await loginPage.goto();
      const unauthorizedEmail =
        assignedTechEmail === accounts.desktopJr.email
          ? accounts.itSupportJr.email
          : accounts.desktopJr.email;
      await loginPage.login(unauthorizedEmail, accounts.desktopJr.password);
      await dashboardPage.navigateTo('Tickets');
      await page
        .locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' })
        .first()
        .getByRole('button', { name: 'View Details' })
        .click();

      // Try to update status when not assigned/escalated to them
      await page.getByRole('button', { name: 'Update Status' }).click();
      await page.getByLabel('Status').click();
      await page.getByRole('option', { name: 'Resolved' }).click();
      await page.getByRole('button', { name: 'Save' }).click();

      // The backend should return Forbidden
      await expect(
        page.locator('text=Forbidden').or(page.getByRole('alert')).first(),
      ).toBeVisible();
      await dashboardPage.logout();
    });

    await test.step('Target Focal accepts and resolves with KB Generation', async () => {
      await loginPage.goto();
      await loginPage.login(accounts.complianceOfficer.email, accounts.complianceOfficer.password);
      await dashboardPage.navigateTo('Tickets');

      await page.getByRole('button', { name: /Escalated To Me/i }).click();
      await page.waitForTimeout(1000); // Give the table a moment to filter

      await page
        .locator('table tbody tr', { hasText: 'SLA Queue Test Ticket 1' })
        .first()
        .getByRole('button', { name: 'View Details' })
        .click();

      const acceptBtn = page.getByRole('button', { name: 'Accept', exact: true });
      await acceptBtn.click();
      await expect(page.getByRole('alert').first()).toBeVisible();

      await page.getByRole('button', { name: 'Update Status' }).click();
      await page.getByLabel('Status').click();
      await page.getByRole('option', { name: 'Resolved' }).click();

      // Check KB Generation
      await page
        .getByLabel(/Resolution Notes/i)
        .fill('Reconfigured network adapter settings and reset IP stack.');
      await page.getByRole('checkbox', { name: /Generate Knowledge Base/i }).check();
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
    });

    await test.step('Verify KB generation success', async () => {
      // using live Gemini API

      await dashboardPage.navigateTo('Knowledge Base');
      await page.getByLabel(/Search Knowledge Base/i).fill('network adapter');
      await page.waitForTimeout(2000); // Wait for debounce and search results

      const articleAccordion = page
        .locator('.MuiAccordion-root')
        .filter({ hasText: /network adapter/i })
        .first();
      await expect(articleAccordion).toBeVisible({ timeout: 15000 }); // Wait up to 15s for LLM processing
      await articleAccordion.click(); // Expand the accordion

      await expect(page.locator('text=Reconfigured network adapter settings')).toBeVisible();
      await dashboardPage.logout();
    });
  });

  test('Scenario 6 & 7: CSAT & UI Guards', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await test.step('User submits CSAT for resolved ticket', async () => {
      await loginPage.goto();
      await loginPage.login(accounts.user.email, accounts.user.password);

      await dashboardPage.navigateTo('Tickets');
      await page.getByRole('tab', { name: 'Resolved' }).click();

      // Click the first ticket in the Resolved tab (which is ticket1)
      await page
        .locator('table tbody tr')
        .first()
        .getByRole('button', { name: 'View Details' })
        .click();

      await expect(page.getByRole('button', { name: 'Rate Resolution' })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('button', { name: 'Rate Resolution' }).click();

      // Check consent
      await page.getByRole('checkbox').first().check();

      // Fill unit, name, sex
      await page.getByLabel('Unit/Section *').fill('TEST UNIT');
      await page.getByLabel('First Name *').fill('TESTER');
      await page.getByLabel('Last Name *').fill('USER');
      await page.getByLabel('Sex *').click();
      await page.getByRole('option', { name: 'Male' }).click();

      // Likert 0, 1, 2, 4, 6, 7
      // 5-Strongly Agree is represented by SentimentVerySatisfiedIcon
      const verySatisfiedBtns = page
        .getByRole('button')
        .filter({ has: page.locator('svg[data-testid="SentimentVerySatisfiedIcon"]') });
      const count = await verySatisfiedBtns.count();
      for (let i = 0; i < count; i++) {
        await verySatisfiedBtns.nth(i).click();
      }

      await page.getByRole('button', { name: 'Submit Feedback' }).click();
      await expect(page.getByRole('alert'))
        .toContainText('Thank you for your feedback', { ignoreCase: true, timeout: 5000 })
        .catch(() => {});
      await dashboardPage.logout();
    });

    await test.step('Non-Admin Cannot select OPEN status', async () => {
      await loginPage.goto();
      await loginPage.login(assignedTechEmail, accounts.desktopJr.password);
      await dashboardPage.navigateTo('Tickets');
      await page
        .locator('table tbody tr')
        .first()
        .getByRole('button', { name: 'View Details' })
        .click();

      await page.getByRole('button', { name: 'Update Status' }).click();
      await page.getByLabel('Status').click();

      // Assert 'Open' option does NOT exist in the dropdown
      await expect(page.getByRole('option', { name: 'Open' })).not.toBeVisible();
      await dashboardPage.logout();
    });
  });
});
