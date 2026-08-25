import { DutyService } from './duty.service';
import { DutyCoverageStatus, DutyExceptionType, DutyReservationStatus, DutyType } from '../entities/duty.entity';
import { TicketStatus } from '../entities/ticket.entity';

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
      { status: DutyCoverageStatus.ACTIVE, assignedUserId: 7 },
      { status: DutyCoverageStatus.INTERVENTION_REQUIRED, assignedUserId: null },
    ]) });
    const service = makeService({ coverages });
    await expect(service.blockedTechnicianIds('2026-08-20')).resolves.toEqual([7]);
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

  it('replaces a duplicate lower-priority duty assignment with another eligible technician', async () => {
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

    expect(result).toEqual(expect.objectContaining({ assignedUserId: 2, status: DutyCoverageStatus.ACTIVE }));
    expect(coverages.save).toHaveBeenCalledWith(expect.objectContaining({ assignedUserId: null, status: DutyCoverageStatus.CANCELLED }));
    expect(coverages.save).toHaveBeenCalledWith(expect.objectContaining({ assignedUserId: 2, status: DutyCoverageStatus.ACTIVE }));
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
    const service = makeService({ roster, exceptions, caps: { isDutyAdminAccess: jest.fn().mockReturnValue(true), isDutyViewerAccess: jest.fn() } });

    await expect(service.saveException(
      { id: 99, role: 'admin' },
      {
        exceptionDate: '2026-08-20',
        userId: 2,
        type: DutyExceptionType.TRAVEL_ORDER,
      },
    )).rejects.toThrow('shared duty roster');
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
    caps: { isDutyAdminAccess: jest.fn(), isDutyViewerAccess: jest.fn() },
    config: { findOne: jest.fn().mockResolvedValue({ scheduleMode: 'OFFICE_HOURS', officeClockin: '08:00:00', officeClockout: '17:00:00' }) },
    events: { publish: jest.fn() }, sse: { emitDutyUpdated: jest.fn(), emitAttendanceUpdated: jest.fn() },
    ...custom,
  };
  return new DutyService(defaults.roster, defaults.assignments, defaults.exceptions, defaults.reservations,
    defaults.coverages, defaults.attendance, defaults.tickets, defaults.users, defaults.caps,
    defaults.events, defaults.sse, defaults.config);
}
