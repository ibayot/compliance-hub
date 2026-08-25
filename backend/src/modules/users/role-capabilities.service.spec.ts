import { RoleCapabilitiesService } from './role-capabilities.service';

describe('RoleCapabilitiesService', () => {
  it('reloads the cache and reflects changed database capability rows', async () => {
    const repo = { find: jest.fn() };
    const service = new RoleCapabilitiesService(repo as any);

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
    const repo = { find: jest.fn() };
    const service = new RoleCapabilitiesService(repo as any);

    expect(service.isTicketModuleAccess('missing_role')).toBe(false);
    expect(service.isAttendanceEligible('missing_role')).toBe(false);
  });
});