import { RoleCapabilitiesService } from './role-capabilities.service';

describe('RoleCapabilitiesService', () => {
  it('reloads the cache and reflects changed database capability rows', async () => {
    const repo = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
    const roleDefinitionsRepo = { find: jest.fn() };
    const service = new RoleCapabilitiesService(repo as any, roleDefinitionsRepo as any);

    roleDefinitionsRepo.find.mockResolvedValue([{ id: 1, value: 'custom_role', label: 'Custom Role' }]);
    repo.find.mockResolvedValue([
      { roleValue: 'custom_role', isTicketModuleAccess: true, isAttendanceEligible: true },
    ]);
    await service.reload();

    expect(service.isTicketModuleAccess('custom_role')).toBe(true);
    expect(service.isAttendanceEligible('custom_role')).toBe(true);

    repo.find.mockResolvedValue([
      { roleValue: 'custom_role', isTicketModuleAccess: false, isAttendanceEligible: false },
    ]);
    await service.reload();

    expect(service.isTicketModuleAccess('custom_role')).toBe(false);
    expect(service.isAttendanceEligible('custom_role')).toBe(false);
  });

  it('fails closed for roles not present in the cache', () => {
    const repo = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
    const roleDefinitionsRepo = { find: jest.fn().mockResolvedValue([]) };
    const service = new RoleCapabilitiesService(repo as any, roleDefinitionsRepo as any);

    expect(service.isTicketModuleAccess('missing_role')).toBe(false);
    expect(service.isAttendanceEligible('missing_role')).toBe(false);
  });

  it('adds a default-disabled capability row for every database-defined role', async () => {
    const existing = {
      roleValue: 'super_admin',
      isTicketModuleAccess: true,
      isAttendanceEligible: false,
    };
    const created = { roleValue: 'new_role' };
    const repo = {
      find: jest.fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([existing, created]),
      create: jest.fn().mockReturnValue(created),
      save: jest.fn().mockResolvedValue([created]),
    };
    const roleDefinitionsRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 1, value: 'super_admin', label: 'Super Administrator' },
        { id: 2, value: 'new_role', label: 'New Role' },
      ]),
    };
    const service = new RoleCapabilitiesService(repo as any, roleDefinitionsRepo as any);

    await service.reload();

    expect(repo.create).toHaveBeenCalledWith({ roleValue: 'new_role' });
    expect(repo.save).toHaveBeenCalledWith([created]);
    expect(service.findAll().map((row) => row.roleValue)).toEqual(['new_role', 'super_admin']);
    expect(service.isTicketModuleAccess('super_admin')).toBe(true);
    expect(service.isTicketModuleAccess('new_role')).toBe(false);
  });

  it('orders capability rows by the database role name', async () => {
    const repo = {
      find: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { roleValue: 'z_role' },
          { roleValue: 'a_role' },
        ]),
      create: jest.fn(),
      save: jest.fn(),
    };
    const roleDefinitionsRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 1, value: 'z_role', label: 'Zulu Role' },
        { id: 2, value: 'a_role', label: 'Alpha Role' },
      ]),
    };
    const service = new RoleCapabilitiesService(repo as any, roleDefinitionsRepo as any);

    await service.reload();

    expect(service.findAll().map((row) => row.roleValue)).toEqual(['a_role', 'z_role']);
  });
});
