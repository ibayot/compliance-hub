import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('returns audit rows from both users and ticketing services and redacts legacy secrets', async () => {
    const dataSource = { query: jest.fn() };
    dataSource.query.mockImplementation((sql: string) => {
      if (sql.includes('COUNT(*)')) return Promise.resolve([{ total: 1 }]);
      return Promise.resolve([
        {
          id: 1,
          databaseName: '02_db_stg_compliance_hub_users',
          tableName: 'users',
          oldValues: '{"passwordHash":"old-hash"}',
          newValues: '{"passwordHash":"new-hash","firstName":"Updated"}',
        },
      ]);
    });

    const service = new AuditService(dataSource as any);
    const result = await service.getAuditLogs({ page: 1, limit: 20 });

    expect(dataSource.query).toHaveBeenCalledTimes(2);
    expect(dataSource.query.mock.calls[0][0]).toContain('database_name IN (?, ?)');
    expect(dataSource.query.mock.calls[0][1].slice(0, 2)).toEqual([
      '02_db_stg_compliance_hub_ticketing',
      '02_db_stg_compliance_hub_users',
    ]);
    expect(result.total).toBe(1);
    expect(result.data[0].newValues).toBe(
      '{"passwordHash":"[REDACTED]","firstName":"Updated"}',
    );
  });

  it('returns tables from both audited databases', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([{ tableName: 'users' }]) };
    const service = new AuditService(dataSource as any);

    await expect(service.getAuditedTables()).resolves.toEqual(['users']);
    expect(dataSource.query.mock.calls[0][0]).toContain('database_name IN (?, ?)');
    expect(dataSource.query.mock.calls[0][1]).toEqual([
      '02_db_stg_compliance_hub_ticketing',
      '02_db_stg_compliance_hub_users',
    ]);
  });
});
