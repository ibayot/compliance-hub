# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tickets.spec.ts >> Mobile View Tests >> Test 6: Mobile Friendliness and CSAT Ratings Flow
- Location: frontend\tests\e2e\tickets.spec.ts:743:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.MuiCard-root').filter({ hasText: 'E2E Test 5' }).filter({ hasText: 'Resolved' }).first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('.MuiCard-root').filter({ hasText: 'E2E Test 5' }).filter({ hasText: 'Resolved' }).first()

```

```yaml
- banner:
  - button "open drawer"
  - navigation "breadcrumb":
    - list:
      - listitem:
        - paragraph: Tickets
  - button "account of current user": TU
- main:
  - heading "Help Desk Tickets" [level=4]
  - paragraph: Submit and track assistance requests for Desktop & IT Support
  - button "New Ticket"
  - tablist:
    - tab "All (1)" [selected]
    - tab "Active (1)"
    - tab "To Rate (0)"
    - tab "Closed / Resolved (0)"
    - tab "Requested For (0)"
  - paragraph: TKT-2026-0001
  - text: assigned
  - paragraph: E2E Decline Test 1780905219823
  - text: Desktop Support NOT SET 6/8/2026
  - button "View Details"
```

# Test source

```ts
  654 |     for (let i = 0; i < headerCount; i++) {
  655 |       const text = await headers.nth(i).innerText();
  656 |       if (text.trim() === todayStr) {
  657 |         colIndex = i + 1; // nth-child is 1-based
  658 |         break;
  659 |       }
  660 |     }
  661 |     
  662 |     if (colIndex !== -1) {
  663 |       const cell = techRow.locator(`td:nth-child(${colIndex})`);
  664 |       const btn = cell.locator('button');
  665 |       // Cycle from present -> absent -> half_day -> out_of_office (3 clicks)
  666 |       for (let i = 0; i < 3; i++) {
  667 |         await btn.click();
  668 |         await page.waitForTimeout(500);
  669 |       }
  670 |       await page.waitForTimeout(3000); // Visual delay for OOO
  671 |     }
  672 |     await logout(page);
  673 | 
  674 |     // 5. User creates 6 tickets (2 per area)
  675 |     await login(page, ACCOUNTS.user.email);
  676 |     const ts2 = Date.now();
  677 |     const subjects2 = [
  678 |       { s: `E2E Test 5 - internet issue A ${ts2}`, type: 'it_support', keyword: 'internet' },
  679 |       { s: `E2E Test 5 - printer issue A ${ts2}`, type: 'desktop_support', keyword: 'printer' },
  680 |       { s: `E2E Test 5 - pantawid issue A ${ts2}`, type: 'pantawid_ict_support', keyword: 'pantawid' },
  681 |       { s: `E2E Test 5 - internet issue B ${ts2}`, type: 'it_support', keyword: 'internet' },
  682 |       { s: `E2E Test 5 - printer issue B ${ts2}`, type: 'desktop_support', keyword: 'printer' },
  683 |       { s: `E2E Test 5 - pantawid issue B ${ts2}`, type: 'pantawid_ict_support', keyword: 'pantawid' }
  684 |     ];
  685 | 
  686 |     for (const sub of subjects2) {
  687 |       await page.goto('/dashboard/tickets');
  688 |       await page.waitForTimeout(1000);
  689 |       
  690 |       const newTicketBtn = page.getByRole('button', { name: 'New Ticket' });
  691 |       await expect(newTicketBtn).toBeVisible({ timeout: 15000 });
  692 |       await newTicketBtn.click();
  693 |       
  694 |       const proceedBtn = page.getByRole('button', { name: 'Proceed Anyway' });
  695 |       if (await proceedBtn.isVisible({ timeout: 3000 })) {
  696 |         await proceedBtn.click();
  697 |       }
  698 | 
  699 |       await expect(page.locator('.MuiDialog-root')).toBeVisible({ timeout: 10000 });
  700 |       await page.waitForTimeout(500);
  701 | 
  702 |       const subjectInput = page.getByRole('textbox', { name: /Subject/i });
  703 |       await subjectInput.fill(sub.s);
  704 |       await page.getByRole('textbox', { name: /Description/i }).fill(`Testing keyword ${sub.keyword} for auto-tagging.`);
  705 | 
  706 |       const card = page.locator('.MuiDialog-root').getByText('Desktop Support').first();
  707 |       if (await card.isVisible({ timeout: 3000 })) await card.click();
  708 | 
  709 |       await page.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  710 |       await expect(page.locator('.MuiDialog-root')).toBeHidden({ timeout: 15000 });
  711 |     }
  712 |     await logout(page);
  713 | 
  714 |     // Verify assignments for the second batch
  715 |     const dbVer = await getDb('compliance_hub_ticketing');
  716 |     const [rows] = await dbVer.query('SELECT subject, ticket_type, status, assigned_to_id FROM tickets WHERE subject LIKE ? ORDER BY created_at ASC', [`E2E Test 5 - % ${ts2}`]);
  717 |     const ticketsBatch2 = rows as any[];
  718 |     await dbVer.end();
  719 | 
  720 |     const itTicketA = ticketsBatch2.find(t => t.ticket_type === 'it_support' && t.subject.includes('issue A'));
  721 |     const desktopTicketA = ticketsBatch2.find(t => t.ticket_type === 'desktop_support' && t.subject.includes('issue A'));
  722 |     const pantawidTicketA = ticketsBatch2.find(t => t.ticket_type === 'pantawid_ict_support' && t.subject.includes('issue A'));
  723 |     
  724 |     // IT Support ticket A falls back to Desktop Support tech (assigned_to_id should not be null)
  725 |     expect(itTicketA.assigned_to_id).not.toBeNull();
  726 |     
  727 |     // Desktop Support ticket A should be left OPEN because Desktop tech is busy with IT Ticket A, and Pantawid is busy from Batch 1
  728 |     console.log('Test 5 details:', { itTicketA, desktopTicketA, pantawidTicketA });
  729 |     // expect(desktopTicketA.assigned_to_id).toBeNull();
  730 |     // expect(desktopTicketA.status).toBe('open');
  731 | 
  732 |     // Pantawid ICT Support ticket A should be left OPEN (all fallback layers busy/OOO)
  733 |     // expect(pantawidTicketA.assigned_to_id).toBeNull();
  734 |     // expect(pantawidTicketA.status).toBe('open');
  735 | 
  736 |     await cleanAttendance(techs);
  737 |   });
  738 | });
  739 | 
  740 | test.describe('Mobile View Tests', () => {
  741 |   test.use({ viewport: { width: 375, height: 812 } });
  742 | 
  743 |   test('Test 6: Mobile Friendliness and CSAT Ratings Flow', async ({ page }) => {
  744 |     test.setTimeout(120000);
  745 |     await page.setViewportSize({ width: 375, height: 812 });
  746 |     await login(page, ACCOUNTS.user.email);
  747 |     
  748 |     // Navigate to tickets page
  749 |     await page.goto('/dashboard/tickets');
  750 |     await page.waitForTimeout(2000);
  751 | 
  752 |     // Filter datagrid or wait for it to load
  753 |     const resolvedRow1 = page.locator('.MuiCard-root').filter({ hasText: 'E2E Test 5' }).filter({ hasText: 'Resolved' }).first();
> 754 |     await expect(resolvedRow1).toBeVisible({ timeout: 20000 });
      |                                ^ Error: expect(locator).toBeVisible() failed
  755 | 
  756 |     // 1. Rate 1 out of 2 resolved tickets
  757 |     await resolvedRow1.getByRole('button', { name: 'View Details' }).click();
  758 |     
  759 |     // Ensure "Rate Resolution" button is present and click it
  760 |     const rateBtn1 = page.getByRole('button', { name: /Rate Resolution/i });
  761 |     await expect(rateBtn1).toBeVisible({ timeout: 10000 });
  762 |     await rateBtn1.click();
  763 |     
  764 |     // CSAT Dialog should open
  765 |     const csatDialog = page.locator('.MuiDialog-root').filter({ hasText: 'CLIENT SATISFACTION MEASUREMENT FORM' });
  766 |     await expect(csatDialog).toBeVisible({ timeout: 10000 });
  767 |     
  768 |     // Fill CSAT Form
  769 |     await page.getByRole('checkbox', { name: /I voluntarily give my consent/i }).check();
  770 |     await page.getByRole('combobox', { name: /Unit\/Section/i }).fill('IT');
  771 |     await page.getByRole('textbox', { name: /First Name/i }).fill('Juan');
  772 |     await page.getByRole('textbox', { name: /Last Name/i }).fill('Dela Cruz');
  773 |     await page.getByRole('spinbutton', { name: /Age/i }).fill('30');
  774 |     await page.getByRole('textbox', { name: /Religion/i }).fill('Catholic');
  775 |     await page.getByLabel(/Sex \*/i).click();
  776 |     await page.getByRole('option', { name: 'Male', exact: true }).click();
  777 |     
  778 |     // Likert Scales - click the first button (5 - Strongly Agree) for each toggle group
  779 |     const toggleGroups = await page.getByRole('group').all();
  780 |     for (const group of toggleGroups) {
  781 |       const btn5 = group.locator('button[value="5"]');
  782 |       if (await btn5.isVisible()) {
  783 |         await btn5.click();
  784 |       }
  785 |     }
  786 | 
  787 |     await page.getByRole('button', { name: 'Submit Feedback' }).click();
  788 |     await expect(csatDialog).toBeHidden({ timeout: 15000 });
  789 | 
  790 |     // Go back to tickets dashboard
  791 |     await page.goto('/dashboard/tickets');
  792 |     await page.waitForTimeout(2000);
  793 | 
  794 |     // 2. Create another ticket and verify reminder
  795 |     const newTicketBtn = page.getByRole('button', { name: 'New Ticket' });
  796 |     await newTicketBtn.click();
  797 | 
  798 |     // Reminder should appear (Proceed Anyway button is in the reminder dialog)
  799 |     const proceedBtn = page.getByRole('button', { name: 'Proceed Anyway' });
  800 |     await expect(proceedBtn).toBeVisible({ timeout: 5000 });
  801 |     
  802 |     // 3. Create another ticket
  803 |     await proceedBtn.click();
  804 |     
  805 |     const ticketDialog = page.locator('.MuiDialog-root').filter({ hasText: 'Submit a Help Desk Ticket' });
  806 |     await expect(ticketDialog).toBeVisible({ timeout: 10000 });
  807 |     
  808 |     await ticketDialog.getByRole('textbox', { name: /Subject/i }).fill(`E2E Test 6 - Mobile Ticket ${Date.now()}`);
  809 |     await ticketDialog.getByRole('textbox', { name: /Description/i }).fill('Testing mobile friendliness.');
  810 |     const card = ticketDialog.getByText('Desktop Support').first();
  811 |     if (await card.isVisible({ timeout: 3000 })) await card.click();
  812 |     await ticketDialog.getByRole('button', { name: 'Submit Ticket', exact: true }).click();
  813 |     await expect(ticketDialog).toBeHidden({ timeout: 15000 });
  814 | 
  815 |     // 4. Rate the last unrated ticket
  816 |     await page.waitForTimeout(2000);
  817 |     const resolvedRow2 = page.locator('.MuiCard-root').filter({ hasText: 'E2E Test 5' }).filter({ hasText: 'Resolved' }).first();
  818 |     await resolvedRow2.getByRole('button', { name: 'View Details' }).click();
  819 |     
  820 |     const rateBtn2 = page.getByRole('button', { name: /Rate Resolution/i });
  821 |     await expect(rateBtn2).toBeVisible({ timeout: 10000 });
  822 |     await rateBtn2.click();
  823 | 
  824 |     await expect(csatDialog).toBeVisible({ timeout: 10000 });
  825 |     await page.getByRole('checkbox', { name: /I voluntarily give my consent/i }).check();
  826 |     await page.getByRole('combobox', { name: /Unit\/Section/i }).fill('HR');
  827 |     await page.getByRole('textbox', { name: /First Name/i }).fill('Maria');
  828 |     await page.getByRole('textbox', { name: /Last Name/i }).fill('Clara');
  829 |     await page.getByRole('spinbutton', { name: /Age/i }).fill('25');
  830 |     await page.getByRole('textbox', { name: /Religion/i }).fill('Catholic');
  831 |     await page.getByLabel(/Sex \*/i).click();
  832 |     await page.getByRole('option', { name: 'Female', exact: true }).click();
  833 | 
  834 |     const toggleGroups2 = await page.getByRole('group').all();
  835 |     for (const group of toggleGroups2) {
  836 |       const btn5 = group.locator('button[value="5"]');
  837 |       if (await btn5.isVisible()) {
  838 |         await btn5.click();
  839 |       }
  840 |     }
  841 | 
  842 |     await page.getByRole('button', { name: 'Submit Feedback' }).click();
  843 |     await expect(csatDialog).toBeHidden({ timeout: 15000 });
  844 |     
  845 |     // Go back to tickets dashboard
  846 |     await page.goto('/dashboard/tickets');
  847 |     await page.waitForTimeout(2000);
  848 | 
  849 |     // 5. Verify reminder is gone
  850 |     await page.waitForTimeout(2000);
  851 |     await newTicketBtn.click();
  852 |     await expect(proceedBtn).toBeHidden({ timeout: 5000 });
  853 |     await expect(ticketDialog).toBeVisible({ timeout: 5000 });
  854 |     
```