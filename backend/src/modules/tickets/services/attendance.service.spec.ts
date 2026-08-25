import { AttendanceService } from './attendance.service';

describe('AttendanceService capability-backed technician queries', () => {
  const createService = (roleCapSvc: any, repos: any = {}) => {
    const service = Object.create(AttendanceService.prototype) as any;
    service.roleCapSvc = roleCapSvc;
    service.attendanceRepo = repos.attendanceRepo;
    service.userRepo = repos.userRepo;
    return service as AttendanceService;
  };

  const emptyCapabilityService = () => ({
    getRolesWhere: jest.fn().mockReturnValue([]),
    isAttendanceAccess: jest.fn().mockReturnValue(true),
  });

  it('returns a successful empty attendance result when no attendance-eligible capability rows exist', async () => {
    const getMany = jest.fn();
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany,
    };
    const attendanceRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = createService(emptyCapabilityService(), { attendanceRepo });

    await expect(service.getAttendance('2026-08-24', '2026-08-24')).resolves.toEqual([]);

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    expect(getMany).not.toHaveBeenCalled();
  });

  it('returns a successful empty technician list without issuing an empty role predicate', async () => {
    const userRepo = { createQueryBuilder: jest.fn() };
    const service = createService(emptyCapabilityService(), { userRepo });

    await expect(service.listTechnicians(undefined, 'super_admin')).resolves.toEqual([]);

    expect(userRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns no available technicians without issuing an empty role predicate', async () => {
    const userRepo = { createQueryBuilder: jest.fn() };
    const service = createService(emptyCapabilityService(), { userRepo });

    await expect(service.getAvailableTechnicians('desktop_support', '2026-08-24')).resolves.toEqual([]);

    expect(userRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('keeps super_admin out of every capability-backed attendance group', async () => {
    const roleCapSvc = {
      getRolesWhere: jest.fn().mockReturnValue(['super_admin', 'desktop_jr']),
      isAttendanceAccess: jest.fn().mockReturnValue(true),
    };
    const service = createService(roleCapSvc) as any;

    await expect(service.getRoleGroups()).resolves.toEqual({
      desktop_support: ['desktop_jr'],
      it_support: ['desktop_jr'],
      pantawid_ict_support: ['desktop_jr'],
      ito: ['desktop_jr'],
      all: ['desktop_jr'],
    });
  });

  it('excludes opted-out technicians only from the automatic-assignment pool', async () => {
    const service = createService(emptyCapabilityService(), {} as any) as any;
    const optedIn = { id: 1, autoAssignmentEligible: true };
    const legacyDefault = { id: 2 };
    const optedOut = { id: 3, autoAssignmentEligible: false };
    service.getPresentTechnicians = jest.fn().mockResolvedValue([optedIn, legacyDefault, optedOut]);

    await expect(service.getAutoAssignmentTechnicians('desktop_support', '2026-08-24')).resolves.toEqual([
      optedIn,
      legacyDefault,
    ]);
  });
});
