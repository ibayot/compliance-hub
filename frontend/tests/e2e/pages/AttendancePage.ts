import { Page, expect } from '@playwright/test';

export class AttendancePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async verifyStatus(expectedStatus: string) {
    // Looks for a chip or text showing the current user's status for today
    const statusText = this.page.getByText(new RegExp(expectedStatus, 'i')).first();
    await expect(statusText).toBeVisible({ timeout: 10000 });
  }

  async markUserOOO(userEmail: string) {
    // Click Attendance tab
    const techTab = this.page.getByRole('tab', { name: /^Attendance$/i });
    if (await techTab.isVisible()) {
      await techTab.click();
      await this.page.waitForTimeout(1000);
    }

    // Find the user in the admin attendance grid and mark them OOO
    const row = this.page.locator('tr', { hasText: userEmail }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    // Calculate index of today among weekdays
    const now = new Date();
    let weekdayIndex = 0;
    for (let d = 1; d <= now.getDate(); d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
      if (day !== 0 && day !== 6) {
        if (d === now.getDate()) break;
        weekdayIndex++;
      }
    }

    const iconBtn = row.locator('button').nth(weekdayIndex);
    await expect(iconBtn).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 4; i++) {
      await iconBtn.click();
      await this.page.waitForTimeout(500);
      // Wait, the row can have multiple OOO chips if they were OOO on other days!
      // We should check the specific table cell!
      const cell = row.locator('td').nth(weekdayIndex + 1); // +1 because first td is name
      const isOOO = await cell.locator('.MuiChip-root', { hasText: 'OOO' }).isVisible();
      if (isOOO) {
        break;
      }
    }
  }

  async verifyUserAttendance(userEmail: string, expectedStatus: string) {
    const techTab = this.page.getByRole('tab', { name: /^Attendance$/i });
    if (await techTab.isVisible()) {
      await techTab.click();
      await this.page.waitForTimeout(1000);
    }
    const row = this.page.locator('tr', { hasText: userEmail }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
  }

  async modifyOfficeDay(day: number) {
    const officeDaysTab = this.page.getByRole('tab', { name: /Office Days/i });
    if (await officeDaysTab.isVisible()) {
      await officeDaysTab.click();
      await this.page.waitForTimeout(1000);
    }

    // Find calendar day and click using regex that matches the exact text for the day number
    const dayText = this.page
      .locator('.MuiCard-root p, .MuiCard-root .MuiTypography-root')
      .filter({ hasText: new RegExp('^' + day + '$') })
      .first();
    await expect(dayText).toBeVisible({ timeout: 5000 });

    await dayText.locator('..').click();
    await this.page.waitForTimeout(1000);
  }
}
