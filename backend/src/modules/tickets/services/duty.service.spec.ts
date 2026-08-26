import { DutyService } from './duty.service';
import { DutyCoverageStatus, DutyExceptionType, DutyReservationStatus, DutyType } from '../entities/duty.entity';
import { TicketStatus } from '../entities/ticket.entity';
import { AttendanceStatus } from '../entities/tech-attendance.entity';

const repo = (overrides: Record<string, any> = {}) => ({
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  findOne: jest.fn().mockResolvedValue(null),
  exist: jest.fn().mockResolvedValue(false),
  save: jest.fn(async (x) => x),
  create: jest.fn((x) => x),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
  ...overrides,
});

describe('DutyService', () => {
  it('marks a never-assigned eligible roster member as NEXT and skips exceptions', async () => {
    const roster = repo({ find: jest.fn().mockResolvedValue([
      { id: 'a', userId: 1, dutyType: DutyType.ROC, sortOrder: 0, isActive: true },
      { id: 'b', userId: 2, dutyType: DutyType.ROC, sortOrder: 1, isActive: true },
    ]) });
    const assignments = repo({ createQueryBuilder: jest.fn()
      .mockReturnValueOnce(chain({ dutyDate: '2026-08-19' }))
      .mockReturnValueOnce(chain(null)) });
    const exceptions = repo({ find: jest.fn().mockResolvedValue([{ userId: 1 }]) });
    const service = makeService({ roster, assignments, exceptions });

    const rows = await service.getRotation('2026-08-20', DutyType.ROC);

    expect(rows.find((x) => x.userId === 1)?.next).toBe(false);
    expect(rows.find((x) => x.userId === 2)?.next).toBe(true);
  });

  it('returns only active assigned duty technicians as auto-assignment blocks', async () => {
    const coverages = repo({ find: jest.fn().mockResolvedValue([
      { status: DutyCoverageStatus.ACTIVE, dutyType: DutyType.OD, assignedUserId: 7 },
      { status: DutyCoverageStatus.INTERVENTION_REQUIRED, dutyType: DutyType.ROC, primaryUserId: 8, assignedUserId: null },
    ]) });
    const service = makeService({ coverages });
    await expect(service.blockedTechnicianIds('2026-08-20')).resolves.toEqual([7]);
  });

  it('temporarily blocks a pending duty candidate when the same-day meeting is scheduled', async () => {
    const coverages = repo({ find: jest.fn().mockResolvedValue([
      { status: DutyCoverageStatus.INTERVENTION_REQUIRED, dutyType: DutyType.ROC, primaryUserId: 8, assignedUserId: null },
    ]) });
    const reservations = repo({ find: jest.fn().mockResolvedValue([
      { venueType: DutyType.ROC, status: DutyReservationStatus.CONFIRMED },
    ]) });
    const service = makeService({ coverages, reservations });

    await expect(service.blockedTechnicianIds('2026-08-20')).resolves.toEqual([8]);
  });

  it('does not block an unscheduled venue-duty candidate', async () => {
    const coverages = repo({ find: jest.fn().mockResolvedValue([
      { status: DutyCoverageStatus.INTERVENTION_REQUIRED, dutyType: DutyType.ROC, primaryUserId: 8, assignedUserId: null },
    ]) });
    const service = makeService({ coverages });

    await expect(service.blockedTechnicianIds('2026-08-20')).resolves.toEqual([]);
  });

  it('removes super_admin, user, and non-technician users from the shared roster', async () => {
    const roster = repo({ find: jest.fn().mockResolvedValue([
      { id: 'super', userId: 1, dutyType: DutyType.OD, sortOrder: 0, isActive: true },
      { id: 'user', userId: 2, dutyType: DutyType.OD, sortOrder: 1, isActive: true },
      { id: 'ito', userId: 3, dutyType: DutyType.OD, sortOrder: 2, isActive: true },
      { id: 'tech', userId: 4, dutyType: DutyType.OD, sortOrder: 3, isActive: true },
    ]) });
    const users = { getUsers: jest.fn().mockResolvedValue([
      { id: 1, role: 'super_admin', first_name: 'Super', last_name: 'Admin' },
      { id: 2, role: 'user', first_name: 'Regular', last_name: 'User' },
      { id: 3, role: 'ito', first_name: 'ITO', last_name: 'Staff' },
      { id: 4, role: 'desktop_jr', first_name: 'Desktop', last_name: 'Tech' },
    ]) };
    const caps = {
      isTechnician: jest.fn((role: string) => role === 'desktop_jr'),
      isDutyAdminAccess: jest.fn(),
      isDutyViewerAccess: jest.fn(),
    };
    const service = makeService({ roster, users, caps });

    await expect(service.getRoster()).resolves.toEqual([
      expect.objectContaining({ userId: 4, name: 'Desktop Tech' }),
    ]);
  });

  it('uses one shared roster and selects each technician only once in duty priority order', async () => {
    const roster = repo({ find: jest.fn().mockResolvedValue([
      { id: 'a', userId: 1, dutyType: DutyType.OD, sortOrder: 0, isActive: true },
      { id: 'b', userId: 2, dutyType: DutyType.OD, sortOrder: 1, isActive: true },
      { id: 'c', userId: 3, dutyType: DutyType.OD, sortOrder: 2, isActive: true },
      { id: 'd', userId: 4, dutyType: DutyType.OD, sortOrder: 3, isActive: true },
    ]) });
    const assignments = repo({ createQueryBuilder: jest.fn().mockImplementation(() => chain(null)) });
    const service = makeService({ roster, assignments, users: { getUsers: jest.fn().mockResolvedValue([
      { id: 1, first_name: 'Ana', last_name: 'One' },
      { id: 2, first_name: 'Ben', last_name: 'Two' },
      { id: 3, first_name: 'Cara', last_name: 'Three' },
      { id: 4, first_name: 'Dan', last_name: 'Four' },
    ]) } });

    const next = (await service.getRotation('2026-08-20')).filter((row) => row.next);

    expect(next.map((row) => [row.dutyType, row.userId])).toEqual([
      [DutyType.OD, 1],
      [DutyType.ROC, 2],
      [DutyType.CONFERENCE, 3],
      [DutyType.OPCEN, 4],
    ]);
    expect(new Set(next.map((row) => row.userId)).size).toBe(next.length);
  });

  it('skips the current active-ticket candidate with a DUE_TO_TA exception', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    const coverages = repo({ findOne: jest.fn().mockResolvedValue({
      id: 'coverage-1', dutyDate: today, dutyType: DutyType.ROC, status: DutyCoverageStatus.INTERVENTION_REQUIRED,
    }) });
    const tickets = repo({ count: jest.fn().mockResolvedValue(1) });
    const service = makeService({
      coverages,
      tickets,
      caps: { isDutyAdminAccess: jest.fn().mockReturnValue(true), isDutyViewerAccess: jest.fn() },
    });
    jest.spyOn(service, 'getRotation').mockResolvedValue([{ userId: 7, excluded: false }] as any);
    jest.spyOn(service as any, 'isAttendanceEligible').mockResolvedValue(true);
    const saveException = jest.spyOn(service, 'saveException').mockResolvedValue({} as any);
    jest.spyOn(service, 'getDashboard').mockResolvedValue([] as any);

    await service.skipCoverage({ id: 99, role: 'admin' }, 'coverage-1', 7);

    expect(saveException).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      exceptionDate: today, userId: 7, dutyType: DutyType.ROC, type: DutyExceptionType.DUE_TO_TA,
    }));
    const statuses = (tickets as any).count.mock.calls[0][0].where.status._value;
    expect(statuses).toContain(TicketStatus.ASSIGNED);
    expect(statuses).toContain(TicketStatus.IN_PROGRESS);
    expect(statuses).not.toContain(TicketStatus.OPEN);
  });

  it('allows a ticket-free candidate to be skipped for another work commitment', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    const coverages = repo({ findOne: jest.fn().mockResolvedValue({
      id: 'coverage-2', dutyDate: today, dutyType: DutyType.OD, status: DutyCoverageStatus.INTERVENTION_REQUIRED,
    }) });
    const tickets = repo({ count: jest.fn().mockResolvedValue(0) });
    const service = makeService({
      coverages,
      tickets,
      caps: { isDutyAdminAccess: jest.fn().mockReturnValue(true), isDutyViewerAccess: jest.fn() },
    });
    jest.spyOn(service, 'getRotation').mockResolvedValue([{ userId: 8, excluded: false }] as any);
    jest.spyOn(service as any, 'isAttendanceEligible').mockResolvedValue(true);
    const saveException = jest.spyOn(service, 'saveException').mockResolvedValue({} as any);
    jest.spyOn(service, 'getDashboard').mockResolvedValue([] as any);

    await service.skipCoverage({ id: 99, role: 'admin' }, 'coverage-2', 8);

    expect(saveException).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: 8,
      type: DutyExceptionType.OTHER,
    }));
  });

  it('recognizes an active coverage row as the current OD for meeting access', async () => {
    const coverages = repo({ findOne: jest.fn().mockResolvedValue({
      dutyDate: '2026-08-20', dutyType: DutyType.OD, assignedUserId: 7, status: DutyCoverageStatus.ACTIVE,
    }) });
    const assignments = repo({ exist: jest.fn().mockResolvedValue(false) });
    const service = makeService({ coverages, assignments, caps: {
      isDutyAdminAccess: jest.fn().mockReturnValue(false),
      isDutyViewerAccess: jest.fn().mockReturnValue(false),
    } });

    await expect(service.getAccess({ id: 7, role: 'custom_staff' })).resolves.toEqual({
      viewer: false, admin: false, canSchedule: true, currentOd: true,
    });
  });

  it('returns the next OD to manual intervention when active coverage is released', async () => {
    const activeCoverage = {
      id: 'coverage-od', dutyDate: '2026-08-20', dutyType: DutyType.OD,
      primaryUserId: 7, assignedUserId: 7, status: DutyCoverageStatus.ACTIVE,
      attendanceOverridden: true, previousAttendanceStatus: AttendanceStatus.PRESENT,
      previousAttendanceNotes: null, releasedAt: null as Date | null,
    };
    const coverages = repo({ findOne: jest.fn().mockResolvedValue(activeCoverage) });
    const attendance = repo({ findOne: jest.fn().mockResolvedValue({
      userId: 7, date: '2026-08-20', status: AttendanceStatus.OUT_OF_OFFICE, notes: 'OD DUTY',
    }) });
    const tickets = repo({ count: jest.fn().mockResolvedValue(0) });
    const service = makeService({ coverages, attendance, tickets, caps: {
      isDutyAdminAccess: jest.fn().mockReturnValue(true),
      isDutyViewerAccess: jest.fn(),
    } });
    const reconcile = jest.spyOn(service, 'reconcileCoverage').mockResolvedValue({
      status: DutyCoverageStatus.INTERVENTION_REQUIRED,
    } as any);

    await service.releaseCoverage({ id: 99, role: 'custom_admin' }, 'coverage-od');

    expect(activeCoverage.status).toBe(DutyCoverageStatus.RELEASED);
    expect(reconcile).toHaveBeenCalledWith('2026-08-20', DutyType.OD, [7]);
  });

  it('keeps the current OD active when no replacement is available', async () => {
    const activeCoverage = {
      id: 'coverage-od', dutyDate: '2026-08-20', dutyType: DutyType.OD,
      primaryUserId: 7, assignedUserId: 7, status: DutyCoverageStatus.ACTIVE,
      attendanceOverridden: true, previousAttendanceStatus: AttendanceStatus.PRESENT,
      previousAttendanceNotes: null, releasedAt: null as Date | null,
    };
    const coverages = repo({ findOne: jest.fn().mockResolvedValue(activeCoverage) });
    const attendance = repo({ findOne: jest.fn().mockResolvedValue({
      userId: 7, date: '2026-08-20', status: AttendanceStatus.OUT_OF_OFFICE, notes: 'OD DUTY',
    }) });
    const tickets = repo({ count: jest.fn().mockResolvedValue(0) });
    const service = makeService({ coverages, attendance, tickets, caps: {
      isDutyAdminAccess: jest.fn().mockReturnValue(true),
      isDutyViewerAccess: jest.fn(),
    } });
    jest.spyOn(service, 'reconcileCoverage').mockResolvedValue(null);

    await expect(service.releaseCoverage({ id: 99, role: 'custom_admin' }, 'coverage-od'))
      .rejects.toThrow('No eligible replacement technician is available');

    expect(activeCoverage.status).toBe(DutyCoverageStatus.ACTIVE);
    expect(activeCoverage.releasedAt).toBeNull();
    expect(attendance.save).toHaveBeenCalledWith(expect.objectContaining({
      status: AttendanceStatus.OUT_OF_OFFICE,
      notes: 'OD DUTY',
      isManualOverride: true,
    }));
  });

  it('reconciles a released coverage instead of treating it as active', async () => {
    const releasedCoverage = {
      id: 'coverage-od', dutyDate: '2026-08-20', dutyType: DutyType.OD,
      primaryUserId: 7, assignedUserId: 7, status: DutyCoverageStatus.RELEASED,
    };
    const coverages = repo({
      findOne: jest.fn().mockResolvedValue(releasedCoverage),
      find: jest.fn().mockResolvedValue([]),
    });
    const tickets = repo({ createQueryBuilder: jest.fn().mockReturnValue(activeTicketCountChain([])) });
    const service = makeService({ coverages, tickets });
    jest.spyOn(service, 'getRotation').mockResolvedValue([
      { userId: 7, excluded: false, sortOrder: 0 },
      { userId: 8, excluded: false, sortOrder: 1 },
    ] as any);
    jest.spyOn(service as any, 'isAttendanceEligible').mockResolvedValue(true);

    const result = await service.reconcileCoverage('2026-08-20', DutyType.OD, [7]);

    expect(result).toEqual(expect.objectContaining({
      primaryUserId: 8,
      assignedUserId: null,
      status: DutyCoverageStatus.INTERVENTION_REQUIRED,
    }));
  });

  it('does not allow the current OD to edit meetings from before today', async () => {
    const coverages = repo({ findOne: jest.fn().mockResolvedValue({
      dutyDate: '2026-08-26', dutyType: DutyType.OD, assignedUserId: 7, status: DutyCoverageStatus.ACTIVE,
    }) });
    const service = makeService({ coverages, caps: {
      isDutyAdminAccess: jest.fn().mockReturnValue(false),
      isDutyViewerAccess: jest.fn().mockReturnValue(false),
    } });

    await expect(service.saveReservation(
      { id: 7, role: 'custom_staff' },
      { meetingDate: '2026-08-25', venueType: DutyType.ROC },
    )).rejects.toThrow('today onwards');
  });

  it('does not allow the current OD to delete meeting schedules', async () => {
    const coverages = repo({ findOne: jest.fn().mockResolvedValue({
      dutyDate: '2026-08-26', dutyType: DutyType.OD, assignedUserId: 7, status: DutyCoverageStatus.ACTIVE,
    }) });
    const reservations = repo({ findOne: jest.fn().mockResolvedValue({ id: 'meeting-1' }) });
    const service = makeService({ coverages, reservations, caps: {
      isDutyAdminAccess: jest.fn().mockReturnValue(false),
      isDutyViewerAccess: jest.fn().mockReturnValue(false),
    } });

    await expect(service.deleteReservation({ id: 7, role: 'custom_staff' }, 'meeting-1'))
      .rejects.toThrow('Duty Administrator');
    expect(reservations.delete).not.toHaveBeenCalled();
  });

  it('scopes a duty exception to its duty rotation while preserving global exceptions', async () => {
    const roster = repo({ find: jest.fn().mockResolvedValue([
      { id: 'a', userId: 1, dutyType: DutyType.OD, sortOrder: 0, isActive: true },
      { id: 'b', userId: 2, dutyType: DutyType.OD, sortOrder: 1, isActive: true },
    ]) });
    const assignments = repo({ createQueryBuilder: jest.fn().mockImplementation(() => chain(null)) });
    const exceptions = repo({ find: jest.fn().mockResolvedValue([{ userId: 1, dutyType: DutyType.OD }]) });
    const service = makeService({ roster, assignments, exceptions });

    const rocRows = await service.getRotation('2026-08-20', DutyType.ROC);
    const odRows = await service.getRotation('2026-08-20', DutyType.OD);

    expect(rocRows.find((row) => row.userId === 1)?.excluded).toBe(false);
    expect(odRows.find((row) => row.userId === 1)?.excluded).toBe(true);
  });

  it('reconciles a cancelled coverage after an exception is deleted and requires intervention for active tickets', async () => {
    const cancelledCoverage = {
      id: 'coverage-1', dutyDate: '2026-08-20', dutyType: DutyType.OD,
      primaryUserId: 7, assignedUserId: null, status: DutyCoverageStatus.CANCELLED,
    };
    const coverages = repo({
      findOne: jest.fn().mockResolvedValue(cancelledCoverage),
      find: jest.fn().mockResolvedValue([]),
    });
    const tickets = repo({
      createQueryBuilder: jest.fn().mockReturnValue(activeTicketCountChain([{ userId: '7', count: '2' }])),
    });
    const service = makeService({ coverages, tickets });
    jest.spyOn(service, 'getRotation').mockResolvedValue([{ userId: 7, excluded: false, sortOrder: 0 }] as any);
    jest.spyOn(service as any, 'isAttendanceEligible').mockResolvedValue(true);

    const result = await service.reconcileCoverage('2026-08-20', DutyType.OD);

    expect(result).toEqual(expect.objectContaining({
      id: 'coverage-1', assignedUserId: null, status: DutyCoverageStatus.INTERVENTION_REQUIRED,
    }));
    expect(coverages.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'coverage-1', assignedUserId: null, status: DutyCoverageStatus.INTERVENTION_REQUIRED,
    }));
  });

  it('presents a duplicate lower-priority candidate for manual activation', async () => {
    const duplicateRocCoverage = {
      id: 'roc-coverage', dutyDate: '2026-08-20', dutyType: DutyType.ROC,
      primaryUserId: 1, assignedUserId: 1, attendanceOverridden: false,
      status: DutyCoverageStatus.ACTIVE,
    };
    const coverages = repo({
      findOne: jest.fn().mockResolvedValue(duplicateRocCoverage),
      find: jest.fn().mockResolvedValue([{ id: 'od-coverage', dutyDate: '2026-08-20', dutyType: DutyType.OD, primaryUserId: 1, assignedUserId: 1, status: DutyCoverageStatus.ACTIVE }]),
    });
    const reservations = repo({ find: jest.fn().mockResolvedValue([{ status: 'confirmed' }]) });
    const attendance = repo({ findOne: jest.fn().mockResolvedValue({ userId: 2, date: '2026-08-20', status: 'present' }) });
    const tickets = repo({ createQueryBuilder: jest.fn().mockReturnValue(activeTicketCountChain([])) });
    const service = makeService({ coverages, reservations, attendance, tickets });
    jest.spyOn(service, 'getRotation').mockResolvedValue([
      { userId: 1, excluded: false, sortOrder: 0 },
      { userId: 2, excluded: false, sortOrder: 1 },
    ] as any);
    jest.spyOn(service as any, 'isAttendanceEligible').mockResolvedValue(true);

    const result = await service.reconcileCoverage('2026-08-20', DutyType.ROC);

    expect(result).toEqual(expect.objectContaining({ primaryUserId: 2, assignedUserId: null, status: DutyCoverageStatus.INTERVENTION_REQUIRED }));
    expect(coverages.save).toHaveBeenCalledWith(expect.objectContaining({ assignedUserId: null, status: DutyCoverageStatus.CANCELLED }));
    expect(coverages.save).toHaveBeenCalledWith(expect.objectContaining({ primaryUserId: 2, assignedUserId: null, status: DutyCoverageStatus.INTERVENTION_REQUIRED }));
    expect(attendance.save).not.toHaveBeenCalled();
  });

  it('does not auto-activate a ticket-free roster member', async () => {
    const coverages = repo({ findOne: jest.fn().mockResolvedValue(null), find: jest.fn().mockResolvedValue([]) });
    const attendance = repo({ findOne: jest.fn().mockResolvedValue({ userId: 1, date: '2026-08-20', status: 'present' }) });
    const tickets = repo({ createQueryBuilder: jest.fn().mockReturnValue(activeTicketCountChain([])) });
    const service = makeService({ coverages, attendance, tickets });
    jest.spyOn(service, 'getRotation').mockResolvedValue([{ userId: 1, excluded: false, sortOrder: 0 }] as any);
    jest.spyOn(service as any, 'isAttendanceEligible').mockResolvedValue(true);

    const result = await service.reconcileCoverage('2026-08-20', DutyType.OD);

    expect(result).toEqual(expect.objectContaining({
      primaryUserId: 1,
      assignedUserId: null,
      status: DutyCoverageStatus.INTERVENTION_REQUIRED,
    }));
    expect(attendance.save).not.toHaveBeenCalled();
  });

  it('restores orphaned synthetic duty attendance overrides', async () => {
    const attendance = repo({
      find: jest.fn().mockResolvedValue([
        { userId: 7, date: '2026-08-20', status: 'out_of_office', notes: 'OD DUTY', isManualOverride: true },
        { userId: 8, date: '2026-08-20', status: 'out_of_office', notes: 'MANUAL OOO', isManualOverride: true },
      ]),
    });
    const coverages = repo({
      find: jest.fn().mockResolvedValue([
        { dutyDate: '2026-08-20', dutyType: DutyType.OD, status: DutyCoverageStatus.ACTIVE, assignedUserId: 3, attendanceOverridden: true },
      ]),
    });
    const service = makeService({ attendance, coverages });

    await (service as any).restoreOrphanedDutyAttendance('2026-08-20');

    expect(attendance.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7, status: 'present', notes: null, isManualOverride: false,
    }));
    expect(attendance.save).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 8 }));
  });

  it('does not finalize Duty before the configured workday ends', async () => {
    const service = makeService({
      config: { findOne: jest.fn().mockResolvedValue({ scheduleMode: 'OFFICE_HOURS', officeClockout: '23:59:00' }) },
    });
    jest.spyOn(service as any, 'currentTimeMinutes').mockReturnValue(23 * 60 + 58);

    await service.finalizeToday();

    expect((service as any).coverageRepo.find).not.toHaveBeenCalled();
  });

  it('keeps the primary OD candidate in intervention when they have active tickets', async () => {
    const coverages = repo({ findOne: jest.fn().mockResolvedValue(null) });
    const tickets = repo({ createQueryBuilder: jest.fn().mockReturnValue(activeTicketCountChain([{ userId: '1', count: '1' }])) });
    const service = makeService({ coverages, tickets });
    jest.spyOn(service, 'getRotation').mockResolvedValue([
      { userId: 1, excluded: false, sortOrder: 0 },
      { userId: 2, excluded: false, sortOrder: 1 },
    ] as any);
    jest.spyOn(service as any, 'isAttendanceEligible').mockResolvedValue(true);

    const result = await service.reconcileCoverage('2026-08-20', DutyType.OD);

    expect(result).toEqual(expect.objectContaining({
      primaryUserId: 1,
      assignedUserId: null,
      isSubstitute: false,
      status: DutyCoverageStatus.INTERVENTION_REQUIRED,
    }));
  });

  it.each([DutyType.ROC, DutyType.CONFERENCE, DutyType.OPCEN])(
    'keeps the primary %s candidate in intervention when they have active tickets',
    async (dutyType) => {
      const reservations = repo({ find: jest.fn().mockResolvedValue([{ status: 'confirmed' }]) });
      const coverages = repo({ findOne: jest.fn().mockResolvedValue(null) });
      const tickets = repo({ createQueryBuilder: jest.fn().mockReturnValue(activeTicketCountChain([{ userId: '1', count: '1' }])) });
      const service = makeService({ reservations, coverages, tickets });
      jest.spyOn(service, 'getRotation').mockResolvedValue([
        { userId: 1, excluded: false, sortOrder: 0 },
        { userId: 2, excluded: false, sortOrder: 1 },
      ] as any);
      jest.spyOn(service as any, 'isAttendanceEligible').mockResolvedValue(true);

      const result = await service.reconcileCoverage('2026-08-20', dutyType);

      expect(result).toEqual(expect.objectContaining({
        primaryUserId: 1,
        assignedUserId: null,
        isSubstitute: false,
        status: DutyCoverageStatus.INTERVENTION_REQUIRED,
      }));
    },
  );

  it('deletes meeting reservations instead of cancelling them', async () => {
    const reservations = repo({
      findOne: jest.fn().mockResolvedValue({ id: 'meeting-1', status: DutyReservationStatus.CONFIRMED }),
    });
    const assignments = repo({ exist: jest.fn().mockResolvedValue(true) });
    const service = makeService({
      reservations,
      assignments,
      caps: { isDutyAdminAccess: jest.fn().mockReturnValue(true), isDutyViewerAccess: jest.fn() },
    });

    await service.deleteReservation({ id: 99, role: 'custom_admin' }, 'meeting-1');

    expect(reservations.delete).toHaveBeenCalledWith('meeting-1');
    expect(reservations.save).not.toHaveBeenCalled();
  });

  it('rejects duty exceptions for users outside the shared roster', async () => {
    const roster = repo({
      find: jest.fn().mockResolvedValue([
        { id: 'roster-1', userId: 1, dutyType: DutyType.OD, sortOrder: 0, isActive: true },
      ]),
    });
    const exceptions = repo({ find: jest.fn().mockResolvedValue([]) });
    const service = makeService({ roster, exceptions, caps: {
      isDutyAdminAccess: jest.fn().mockReturnValue(true),
      isDutyViewerAccess: jest.fn(),
      isTechnician: jest.fn().mockReturnValue(true),
    } });

    await expect(service.saveException(
      { id: 99, role: 'admin' },
      {
        exceptionDate: '2026-08-20',
        userId: 2,
        type: DutyExceptionType.TRAVEL_ORDER,
      },
    )).rejects.toThrow('shared duty roster');
  });

  it('rejects a duty log when the technician has an exception on that date', async () => {
    const assignments = repo({ find: jest.fn().mockResolvedValue([]) });
    const exceptions = repo({ findOne: jest.fn().mockResolvedValue({ id: 'exception-1' }) });
    const service = makeService({ assignments, exceptions, caps: {
      isDutyAdminAccess: jest.fn().mockReturnValue(true),
      isDutyViewerAccess: jest.fn(),
      isTechnician: jest.fn().mockReturnValue(true),
    } });

    await expect(service.saveAssignment(
      { id: 99, role: 'admin' },
      { dutyDate: '2026-08-20', userId: 1, dutyType: DutyType.OD },
    )).rejects.toThrow('duty exception');
  });

  it('rejects an exception when the technician already has duty on that date', async () => {
    const roster = repo({
      find: jest.fn().mockResolvedValue([
        { id: 'roster-1', userId: 1, dutyType: DutyType.OD, sortOrder: 0, isActive: true },
      ]),
    });
    const assignments = repo({
      findOne: jest.fn().mockResolvedValue({ id: 'assignment-1', dutyType: DutyType.OD }),
    });
    const service = makeService({ roster, assignments, caps: {
      isDutyAdminAccess: jest.fn().mockReturnValue(true),
      isDutyViewerAccess: jest.fn(),
      isTechnician: jest.fn().mockReturnValue(true),
    } });

    await expect(service.saveException(
      { id: 99, role: 'admin' },
      { exceptionDate: '2026-08-20', userId: 1, type: DutyExceptionType.TRAVEL_ORDER },
    )).rejects.toThrow('already has OD duty');
  });

});

function chain(result: any) {
  const qb: any = { where: jest.fn(), andWhere: jest.fn(), orderBy: jest.fn(), getOne: jest.fn().mockResolvedValue(result) };
  qb.where.mockReturnValue(qb); qb.andWhere.mockReturnValue(qb); qb.orderBy.mockReturnValue(qb);
  return qb;
}

function activeTicketCountChain(result: any[]) {
  const qb: any = {
    select: jest.fn(), addSelect: jest.fn(), where: jest.fn(), andWhere: jest.fn(),
    groupBy: jest.fn(), getRawMany: jest.fn().mockResolvedValue(result),
  };
  qb.select.mockReturnValue(qb); qb.addSelect.mockReturnValue(qb); qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb); qb.groupBy.mockReturnValue(qb);
  return qb;
}

function makeService(custom: Record<string, any> = {}) {
  const defaults: any = {
    roster: repo(), assignments: repo(), exceptions: repo(), reservations: repo(),
    coverages: repo(), attendance: repo(), tickets: repo(),
    users: { getUsers: jest.fn().mockResolvedValue([
      { id: 1, first_name: 'Ana', last_name: 'One' },
      { id: 2, first_name: 'Ben', last_name: 'Two' },
    ]) },
    caps: {
      isDutyAdminAccess: jest.fn(),
      isDutyViewerAccess: jest.fn(),
      isTechnician: jest.fn().mockReturnValue(true),
    },
    config: { findOne: jest.fn().mockResolvedValue({ scheduleMode: 'OFFICE_HOURS', officeClockin: '08:00:00', officeClockout: '17:00:00' }) },
    events: { publish: jest.fn() }, sse: { emitDutyUpdated: jest.fn(), emitAttendanceUpdated: jest.fn() },
    ...custom,
  };
  return new DutyService(defaults.roster, defaults.assignments, defaults.exceptions, defaults.reservations,
    defaults.coverages, defaults.attendance, defaults.tickets, defaults.users, defaults.caps,
    defaults.events, defaults.sse, defaults.config);
}
