import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { navigate, signIn, superAdmin } from './v1-helpers';

type DbColumn = { type: string; length?: number; precision?: number; scale?: number };

function loadDatabaseSchema(): Map<string, Map<string, DbColumn>> {
  const files = [
    '20260827-seed-02_db_stg_compliance_hub_users.sql',
    '20260827-seed-02_db_stg_compliance_hub_ticketing.sql',
  ];
  const schema = new Map<string, Map<string, DbColumn>>();
  for (const file of files) {
    const sql = readFileSync(resolve(process.cwd(), '..', 'db-init', file), 'utf8');
    const tables = /CREATE TABLE `([^`]+)` \(([\s\S]*?)\n\) ENGINE=/g;
    for (const tableMatch of sql.matchAll(tables)) {
      const columns = new Map<string, DbColumn>();
      const columnPattern = /^  `([^`]+)`\s+([a-z]+)(?:\((\d+)(?:,(\d+))?\))?/gm;
      for (const columnMatch of tableMatch[2].matchAll(columnPattern)) {
        columns.set(columnMatch[1], {
          type: columnMatch[2],
          length: columnMatch[3] ? Number(columnMatch[3]) : undefined,
          precision: columnMatch[3] ? Number(columnMatch[3]) : undefined,
          scale: columnMatch[4] ? Number(columnMatch[4]) : undefined,
        });
      }
      schema.set(tableMatch[1], columns);
    }
  }
  return schema;
}

const schema = loadDatabaseSchema();

function column(table: string, name: string): DbColumn {
  const result = schema.get(table)?.get(name);
  if (!result) throw new Error(`Database schema column not found: ${table}.${name}`);
  return result;
}

function varcharLength(table: string, name: string): number {
  const result = column(table, name);
  if (!['varchar', 'char'].includes(result.type) || !result.length) {
    throw new Error(`Expected a finite string column: ${table}.${name}`);
  }
  return result.length;
}

function signedIntegerMax(table: string, name: string): number {
  const result = column(table, name);
  const maxima: Record<string, number> = {
    tinyint: result.length === 1 ? 1 : 127,
    smallint: 32_767,
    mediumint: 8_388_607,
    int: 2_147_483_647,
    bigint: Number.MAX_SAFE_INTEGER,
  };
  const max = maxima[result.type];
  if (max === undefined) throw new Error(`Expected an integer column: ${table}.${name}`);
  return max;
}

async function expectDatabaseMaxLength(
  page: import('@playwright/test').Page,
  label: string,
  table: string,
  name: string,
) {
  await expect(page.getByLabel(label)).toHaveAttribute(
    'maxlength',
    String(varcharLength(table, name)),
  );
}

async function expectDatabaseSafeNumericMax(
  page: import('@playwright/test').Page,
  label: string,
  table: string,
  name: string,
) {
  const input = page.getByLabel(label);
  const max = await input.getAttribute('max');
  expect(max, `${label} must declare a maximum`).not.toBeNull();
  expect(Number(max), `${label} must not exceed ${table}.${name}`).toBeLessThanOrEqual(
    signedIntegerMax(table, name),
  );
}

test.describe('Version 1 database-derived input constraints', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('visible PC and mobile-web forms expose database-safe lengths and numeric maxima', async ({ page }) => {
    await signIn(page, superAdmin);

    await navigate(page, 'Tickets', '/operations/tickets');
    await page.getByRole('button', { name: 'New Ticket', exact: true }).click();
    const ticketDialog = page.getByRole('dialog', { name: 'Submit a Help Desk Ticket' });
    await expectDatabaseMaxLength(page, 'Subject *', 'tickets', 'subject');
    await ticketDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await navigate(page, 'Ticket Settings', '/operations/settings');
    await page.getByRole('button', { name: 'Add Category', exact: true }).click();
    await expectDatabaseMaxLength(page, 'Category Name *', 'ticket_categories', 'name');
    await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('tab', { name: /Issues/ }).click();
    await page.getByRole('button', { name: 'Add Issue', exact: true }).click();
    await expectDatabaseMaxLength(page, 'Issue Name', 'ticket_issue_types', 'name');
    await expectDatabaseSafeNumericMax(page, 'SLA Time Limit (hours)', 'ticket_issue_types', 'sla_hours');
    await expectDatabaseSafeNumericMax(page, 'Allowable Pause Hours *', 'ticket_issue_types', 'allowable_pause_hours');
    await expectDatabaseSafeNumericMax(page, 'Max Freeze Hours', 'ticket_issue_types', 'max_freeze_hours');
    await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('tab', { name: /Keyword Rules/ }).click();
    await page.getByRole('button', { name: 'Add Rule', exact: true }).click();
    await expectDatabaseMaxLength(page, 'Keywords *', 'ticket_keyword_rules', 'keyword');
    await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click();

    await navigate(page, 'Units', '/admin/units');
    await page.getByRole('button', { name: 'Add Unit', exact: true }).click();
    await expectDatabaseMaxLength(page, 'Unit Name', 'units', 'name');
    await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click();

    await navigate(page, 'Settings', '/admin/settings');
    await page.getByRole('tab', { name: 'Role Management', exact: true }).click();
    await expect(page.getByText('Loading roles...', { exact: true })).not.toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Add Role Definition', exact: true }).click();
    const roleDialog = page.getByRole('dialog', { name: 'Add Role Definition' });
    await expect(roleDialog).toBeVisible({ timeout: 15_000 });
    await expect(roleDialog.getByLabel('Role Code', { exact: true })).toHaveAttribute(
      'maxlength',
      String(varcharLength('role_definitions', 'value')),
    );
    await expect(roleDialog.getByLabel('Role Label', { exact: true })).toHaveAttribute(
      'maxlength',
      String(varcharLength('role_definitions', 'label')),
    );
    await roleDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('tab', { name: 'User Management', exact: true }).click();
    await page.getByRole('button', { name: 'Create New User', exact: true }).click();
    const userDialog = page.getByRole('dialog', { name: 'Create New User' });
    await expectDatabaseMaxLength(page, 'Email Address', 'users', 'email');
    await expectDatabaseMaxLength(page, 'First Name', 'users', 'first_name');
    await expectDatabaseMaxLength(page, 'Middle Name', 'users', 'middle_name');
    await expectDatabaseMaxLength(page, 'Last Name', 'users', 'last_name');
    await expectDatabaseMaxLength(page, 'Suffix (Jr./Sr.)', 'users', 'suffix');
    await userDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    const globalSettingsTab = page.getByRole('tab', { name: 'Global Settings', exact: true });
    if (await globalSettingsTab.isVisible().catch(() => false)) {
      await globalSettingsTab.click();
      const testOverrideEmail = page.getByLabel('Test Override Email');
      if (await testOverrideEmail.isVisible().catch(() => false)) {
        await expectDatabaseMaxLength(page, 'Test Override Email', 'ticketing_configs', 'email_test_override');
      }
      const configFields: Array<[string, string]> = [
        ['SMTP Host', 'smtp_host'],
        ['SMTP Username', 'smtp_user'],
        ['SMTP Password', 'smtp_pass'],
        ['From Email Address', 'smtp_from'],
        ['From Name', 'smtp_from_name'],
      ];
      for (const [label, name] of configFields) {
        await expectDatabaseMaxLength(page, label, 'ticketing_configs', name);
      }
    }

    await navigate(page, 'Knowledge Base', '/operations/knowledge-base');
    const editArticle = page.getByRole('button', { name: 'Edit Article', exact: true }).first();
    const emptyKnowledgeBase = page.getByText('No matching articles found. Try searching for different keywords.', {
      exact: true,
    });
    await expect
      .poll(async () => (await editArticle.count()) + (await emptyKnowledgeBase.count()), {
        timeout: 20_000,
        message: 'Knowledge Base should render either an article or its empty state',
      })
      .toBeGreaterThan(0);

    if (await editArticle.count()) {
      await editArticle.click();
      await expectDatabaseMaxLength(page, 'Title *', 'knowledge_base_articles', 'title');
      await expectDatabaseMaxLength(page, 'Tags (comma separated)', 'knowledge_base_articles', 'tags');
    } else {
      await expect(emptyKnowledgeBase).toBeVisible();
    }
  });
});
