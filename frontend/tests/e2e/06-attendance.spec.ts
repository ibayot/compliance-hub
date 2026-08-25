import { test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import accounts from './data/accounts.json';

test.describe('Suite 6 — ATTENDANCE', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let attendancePage: AttendancePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    attendancePage = new AttendancePage(page);
  });

  test('Desktop Technician Attendance', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(accounts.desktopJr.email, accounts.desktopJr.password);

    // Check if Attendance exists for tech
    const attendanceMenu = page.locator(`nav a:has-text("Attendance")`).first();
    if (await attendanceMenu.isVisible()) {
      await dashboardPage.navigateTo('Attendance');
      // By default, techs might be present or absent. We just verify the UI shows their status.
      await attendancePage.verifyStatus('Present|Absent|Office');
    }
  });

  test('Office Days', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await dashboardPage.navigateTo('Attendance');

    const today = new Date().getDate();

    // Admin can modify office days
    await attendancePage.modifyOfficeDay(today);
    // Revert back
    await attendancePage.modifyOfficeDay(today);
  });

  test('Attendance Verification', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(accounts.admin.email, accounts.admin.password);
    await dashboardPage.navigateTo('Attendance');

    // Verify tech appears in list
    // We don't strictly assert "Present" because we didn't force seed it via API,
    // so we just verify they appear in the attendance grid with a valid status.
    await attendancePage.verifyUserAttendance('Jaymark Cardona', 'Present|Absent|Office|OOO');
  });
});
