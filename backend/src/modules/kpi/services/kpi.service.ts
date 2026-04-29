import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { KpiFrequency, KpiMaster, KpiType } from '../entities/kpi-master.entity';
import { KpiMonitoring, KpiMonitoringStatus } from '../entities/kpi-monitoring.entity';
import { KpiThreshold } from '../entities/kpi-threshold.entity';
import { KpiScoringRule } from '../entities/kpi-scoring-rule.entity';
import { CreateKpiMasterDto, UpdateKpiMasterDto } from '../dto/kpi-master.dto';
import { UpdateKpiMonitoringDto, UpsertKpiMonitoringDto } from '../dto/kpi-monitoring.dto';
import { UpsertKpiScoringRuleDto, UpsertKpiThresholdDto } from '../dto/kpi-lookups.dto';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';

interface AuthUser {
  id: number;
  role: string;
  roleCode?: string | null;
  units?: Array<number | string | { id?: number | string }>;
}

@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(KpiMaster)
    private readonly kpiMasterRepo: Repository<KpiMaster>,
    @InjectRepository(KpiMonitoring)
    private readonly kpiMonitoringRepo: Repository<KpiMonitoring>,
    @InjectRepository(KpiThreshold)
    private readonly kpiThresholdRepo: Repository<KpiThreshold>,
    @InjectRepository(KpiScoringRule)
    private readonly kpiScoringRuleRepo: Repository<KpiScoringRule>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) {
    this.ensureLookups().catch(() => undefined);
  }

  private async ensureLookups() {
    const thresholds = await this.kpiThresholdRepo.count();
    if (thresholds === 0) {
      await this.kpiThresholdRepo.save([
        this.kpiThresholdRepo.create({ band: 'green', minScore: 90, maxScore: 100, color: 'success' }),
        this.kpiThresholdRepo.create({ band: 'amber', minScore: 75, maxScore: 89.99, color: 'warning' }),
        this.kpiThresholdRepo.create({ band: 'red', minScore: 0, maxScore: 74.99, color: 'error' }),
      ]);
    }

    const scoringRules = await this.kpiScoringRuleRepo.count();
    if (scoringRules === 0) {
      await this.kpiScoringRuleRepo.save(
        this.kpiScoringRuleRepo.create({
          name: 'default',
          active: true,
          capScore: 100,
          floorScore: 0,
          yesScore: 100,
          noScore: 0,
        }),
      );
    }
  }

  private canManage(user: AuthUser): boolean {
    if (!user?.role) return false;
    return this.roleCapSvc.isKpiManage(user.role);
  }

  private canViewAll(user: AuthUser): boolean {
    if (!user?.role) return false;
    return this.roleCapSvc.isKpiManage(user.role);
  }

  private normalizeUnitId(value: number | string | { id?: number | string } | undefined): number | null {
    if (value === undefined || value === null) return null;
    if (typeof value === 'object') {
      const nested = Number((value as any).id);
      return Number.isFinite(nested) ? nested : null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private async getAllowedUnitIds(user: AuthUser): Promise<number[]> {
    const fromToken = Array.isArray(user.units)
      ? user.units
          .map((unit) => this.normalizeUnitId(unit))
          .filter((unitId): unitId is number => Number.isFinite(unitId as number))
      : [];

    if (fromToken.length > 0) {
      return Array.from(new Set(fromToken));
    }

    const userId = Number(user?.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return [];
    }

    const actor = await this.userRepo.findOne({ where: { id: userId }, relations: ['units'] }).catch(() => null);
    if (!actor?.units?.length) {
      return [];
    }

    return Array.from(
      new Set(
        actor.units
          .map((unit) => Number(unit.id))
          .filter((unitId) => Number.isFinite(unitId)),
      ),
    );
  }

  private async ensureUnit(unitId: number) {
    const unit = await this.unitRepo.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Unit ${unitId} not found`);
    }
  }

  private async ensureKpiMaster(code: string) {
    const kpiMaster = await this.kpiMasterRepo.findOne({ where: { code } });
    if (!kpiMaster) {
      throw new NotFoundException(`KPI master ${code} not found`);
    }
    return kpiMaster;
  }

  async listKpiMaster(user: AuthUser) {
    if (this.canViewAll(user)) {
      return this.kpiMasterRepo.find({ relations: ['unit'], order: { code: 'ASC' } });
    }

    const allowed = await this.getAllowedUnitIds(user);
    if (allowed.length === 0) return [];

    return this.kpiMasterRepo.find({
      where: { unitId: In(allowed) },
      relations: ['unit'],
      order: { code: 'ASC' },
    });
  }

  async createKpiMaster(user: AuthUser, dto: CreateKpiMasterDto) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Only compliance/admin roles can create KPI master records.');
    }

    await this.ensureUnit(dto.unitId);

    const existing = await this.kpiMasterRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(`KPI code '${dto.code}' already exists.`);
    }

    const kpi = this.kpiMasterRepo.create({
      ...dto,
      frequency: dto.frequency || KpiFrequency.MONTHLY,
      active: dto.active ?? true,
    });

    return this.kpiMasterRepo.save(kpi);
  }

  async updateKpiMaster(user: AuthUser, code: string, dto: UpdateKpiMasterDto) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Only compliance/admin roles can update KPI master records.');
    }

    const kpi = await this.ensureKpiMaster(code);

    if (dto.unitId !== undefined) {
      await this.ensureUnit(dto.unitId);
      kpi.unitId = dto.unitId;
    }

    if (dto.name !== undefined) kpi.name = dto.name;
    if (dto.description !== undefined) kpi.description = dto.description;
    if (dto.type !== undefined) kpi.type = dto.type;
    if (dto.unitOfMeasure !== undefined) kpi.unitOfMeasure = dto.unitOfMeasure;
    if (dto.direction !== undefined) kpi.direction = dto.direction;
    if (dto.targetValue !== undefined) kpi.targetValue = dto.targetValue;
    if (dto.weight !== undefined) kpi.weight = dto.weight;
    if (dto.frequency !== undefined) kpi.frequency = dto.frequency;
    if (dto.active !== undefined) kpi.active = dto.active;

    return this.kpiMasterRepo.save(kpi);
  }

  async removeKpiMaster(user: AuthUser, code: string) {
    if (!['super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only super_admin can delete KPI master records.');
    }
    const kpi = await this.ensureKpiMaster(code);
    await this.kpiMasterRepo.remove(kpi);
    return { message: 'KPI master deleted.' };
  }

  async listMonitoring(user: AuthUser, query: { periodYear?: number; periodMonth?: number; unitId?: number; kpiMasterCode?: string }) {
    const where: any = {};

    const yearNum = query.periodYear !== undefined ? Number(query.periodYear) : undefined;
    const monthNum = query.periodMonth !== undefined ? Number(query.periodMonth) : undefined;
    const unitIdNum = query.unitId !== undefined ? Number(query.unitId) : undefined;

    if (yearNum !== undefined && Number.isFinite(yearNum)) where.periodYear = yearNum;
    if (monthNum !== undefined && Number.isFinite(monthNum)) where.periodMonth = monthNum;
    if (query.kpiMasterCode !== undefined) where.kpiMasterCode = query.kpiMasterCode;

    if (this.canViewAll(user)) {
      if (unitIdNum !== undefined && Number.isFinite(unitIdNum)) where.unitId = unitIdNum;
    } else {
      const allowed = await this.getAllowedUnitIds(user);
      if (allowed.length === 0) return [];
      if (unitIdNum !== undefined && Number.isFinite(unitIdNum) && !allowed.includes(unitIdNum)) {
        throw new ForbiddenException('Unit access denied.');
      }
      where.unitId = (unitIdNum !== undefined && Number.isFinite(unitIdNum)) ? unitIdNum : In(allowed);
    }

    return this.kpiMonitoringRepo.find({
      where,
      relations: ['kpiMaster', 'unit'],
      order: { periodYear: 'DESC', periodMonth: 'DESC', kpiMasterCode: 'ASC' },
    });
  }

  async upsertMonitoring(user: AuthUser, dto: UpsertKpiMonitoringDto) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Only compliance/admin roles can encode KPI monitoring values.');
    }

    if (dto.periodMonth < 1 || dto.periodMonth > 12) {
      throw new BadRequestException('periodMonth must be between 1 and 12.');
    }

    const kpiMaster = await this.ensureKpiMaster(dto.kpiMasterCode);
    await this.ensureUnit(dto.unitId);

    let row = await this.kpiMonitoringRepo.findOne({
      where: {
        kpiMasterCode: dto.kpiMasterCode,
        unitId: dto.unitId,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
      },
      relations: ['enteredByUser'],
    });

    if (row && row.status === KpiMonitoringStatus.LOCKED) {
      throw new BadRequestException('This KPI monitoring row is locked.');
    }

    const actor = await this.userRepo.findOne({ where: { id: user.id } });

    if (!row) {
      row = this.kpiMonitoringRepo.create({
        kpiMasterCode: dto.kpiMasterCode,
        unitId: dto.unitId,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
      });
    }

    row.actualValue = dto.actualValue;
    row.remarks = dto.remarks ?? null;
    row.enteredByUserId = actor?.id ?? null;
    row.enteredByStaffId = actor?.staffId ?? null;
    row.enteredByName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') || actor?.email || null;
    row.status = dto.status ?? KpiMonitoringStatus.DRAFT;

    if (kpiMaster.type === KpiType.YES_NO && ![0, 1].includes(Number(row.actualValue))) {
      throw new BadRequestException('YES/NO KPI type accepts only 0 (No) or 1 (Yes).');
    }

    return this.kpiMonitoringRepo.save(row);
  }

  async updateMonitoring(user: AuthUser, id: number, dto: UpdateKpiMonitoringDto) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Only compliance/admin roles can update KPI monitoring values.');
    }

    const row = await this.kpiMonitoringRepo.findOne({ where: { id }, relations: ['kpiMaster'] });
    if (!row) throw new NotFoundException(`KPI monitoring row ${id} not found`);
    if (row.status === KpiMonitoringStatus.LOCKED) {
      throw new BadRequestException('This KPI monitoring row is locked.');
    }

    if (dto.actualValue !== undefined) row.actualValue = dto.actualValue;
    if (dto.remarks !== undefined) row.remarks = dto.remarks;
    if (dto.status !== undefined) row.status = dto.status;

    if (row.kpiMaster.type === KpiType.YES_NO && ![0, 1].includes(Number(row.actualValue))) {
      throw new BadRequestException('YES/NO KPI type accepts only 0 (No) or 1 (Yes).');
    }

    const actor = await this.userRepo.findOne({ where: { id: user.id } });
    row.enteredByUserId = actor?.id ?? null;
    row.enteredByStaffId = actor?.staffId ?? null;
    row.enteredByName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') || actor?.email || null;

    return this.kpiMonitoringRepo.save(row);
  }

  async lockMonitoring(user: AuthUser, id: number) {
    if (!this.canManage(user)) {
      throw new ForbiddenException('Only compliance/admin roles can lock KPI monitoring rows.');
    }

    const row = await this.kpiMonitoringRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`KPI monitoring row ${id} not found`);
    row.status = KpiMonitoringStatus.LOCKED;
    return this.kpiMonitoringRepo.save(row);
  }

  private clamp(value: number, floor: number, cap: number) {
    return Math.min(cap, Math.max(floor, value));
  }

  private computeRaw(kpi: KpiMaster, actual: number, scoringRule: KpiScoringRule) {
    if (kpi.type === KpiType.YES_NO) {
      return Number(actual) >= 1 ? scoringRule.yesScore : scoringRule.noScore;
    }

    const target = Number(kpi.targetValue);
    if (!Number.isFinite(target) || target <= 0) return 0;

    if (kpi.direction === 'higher_is_better') {
      return (Number(actual) / target) * 100;
    }

    // lower_is_better:
    //  - normalized score should increase as actual decreases.
    //  - use target/actual and clamp by scoring rule caps.
    //    e.g. actual=3.1, target=4 → 4/3.1*100 ≈ 129 → clamped to 100
    //    e.g. actual=5,   target=4 → 4/5*100 = 80
    const actualNum = Number(actual);
    if (actualNum <= 0) return 0;
    return (target / actualNum) * 100;
  }

  private classifyScore(score: number, thresholds: KpiThreshold[]) {
    return (
      thresholds.find((t) => score >= Number(t.minScore) && score <= Number(t.maxScore))?.band ||
      'unclassified'
    );
  }

  async dashboardSummary(user: AuthUser, periodYear?: number, periodMonth?: number) {
    const yearNum = Number(periodYear);
    const monthNum = Number(periodMonth);
    if (!Number.isFinite(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new BadRequestException('periodYear must be a valid year (2000-2100).');
    }
    if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('periodMonth must be between 1 and 12.');
    }
    const where: any = { periodYear: yearNum, periodMonth: monthNum };

    if (!this.canViewAll(user)) {
      const allowed = await this.getAllowedUnitIds(user);
      if (allowed.length === 0) {
        return { summary: { overallScore: 0, unitCount: 0, rowCount: 0 }, units: [] };
      }
      where.unitId = In(allowed);
    }

    const rows = await this.kpiMonitoringRepo.find({
      where,
      relations: ['kpiMaster', 'unit'],
    });

    const scoringRule =
      (await this.kpiScoringRuleRepo.findOne({ where: { active: true }, order: { id: 'DESC' } })) ||
      this.kpiScoringRuleRepo.create({ capScore: 100, floorScore: 0, yesScore: 100, noScore: 0 });

    const thresholds = await this.kpiThresholdRepo.find({ order: { minScore: 'DESC' } });

    const byUnit = new Map<number, { unitId: number; unitName: string; totalWeight: number; weightedSum: number; kpiCount: number }>();

    for (const row of rows) {
      const kpi = row.kpiMaster;
      if (!kpi || !kpi.active) continue;

      const raw = this.computeRaw(kpi, Number(row.actualValue), scoringRule);
      const normalized = this.clamp(raw, Number(scoringRule.floorScore), Number(scoringRule.capScore));

      const current = byUnit.get(row.unitId) || {
        unitId: row.unitId,
        unitName: row.unit?.name || `Unit ${row.unitId}`,
        totalWeight: 0,
        weightedSum: 0,
        kpiCount: 0,
      };

      const weight = Number(kpi.weight) || 0;
      current.totalWeight += weight;
      current.weightedSum += normalized * weight;
      current.kpiCount += 1;

      byUnit.set(row.unitId, current);
    }

    const units = Array.from(byUnit.values()).map((item) => {
      const score = item.totalWeight > 0 ? item.weightedSum / item.totalWeight : 0;
      return {
        unitId: item.unitId,
        unitName: item.unitName,
        score: Number(score.toFixed(2)),
        kpiCount: item.kpiCount,
        band: this.classifyScore(score, thresholds),
      };
    });

    const overallScore = units.length > 0
      ? units.reduce((sum, unit) => sum + unit.score, 0) / units.length
      : 0;

    return {
      summary: {
        overallScore: Number(overallScore.toFixed(2)),
        unitCount: units.length,
        rowCount: rows.length,
        periodYear: yearNum,
        periodMonth: monthNum,
      },
      units: units.sort((a, b) => b.score - a.score),
      thresholds,
    };
  }

  async dashboardUnit(user: AuthUser, unitId: number, periodYear?: number, periodMonth?: number) {
    const unitIdNum = Number(unitId);
    if (!Number.isFinite(unitIdNum) || unitIdNum <= 0) {
      throw new BadRequestException('Invalid unit ID.');
    }
    const yearNum = Number(periodYear);
    const monthNum = Number(periodMonth);
    if (!Number.isFinite(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new BadRequestException('periodYear must be a valid year (2000-2100).');
    }
    if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('periodMonth must be between 1 and 12.');
    }
    if (!this.canViewAll(user)) {
      const allowed = await this.getAllowedUnitIds(user);
      if (!allowed.includes(unitIdNum)) {
        throw new ForbiddenException('Unit access denied.');
      }
    }

    const rows = await this.kpiMonitoringRepo.find({
      where: { unitId: unitIdNum, periodYear: yearNum, periodMonth: monthNum },
      relations: ['kpiMaster', 'unit'],
    });

    const scoringRule =
      (await this.kpiScoringRuleRepo.findOne({ where: { active: true }, order: { id: 'DESC' } })) ||
      this.kpiScoringRuleRepo.create({ capScore: 100, floorScore: 0, yesScore: 100, noScore: 0 });

    const thresholds = await this.kpiThresholdRepo.find({ order: { minScore: 'DESC' } });

    const details = rows
      .filter((row) => Boolean(row.kpiMaster))
      .map((row) => {
      const kpi = row.kpiMaster;
      if (!kpi) return null;
      const raw = this.computeRaw(kpi, Number(row.actualValue), scoringRule);
      const normalized = this.clamp(raw, Number(scoringRule.floorScore), Number(scoringRule.capScore));

      return {
        id: row.id,
        code: row.kpiMasterCode,
        name: kpi?.name,
        type: kpi?.type,
        direction: kpi?.direction,
        unitOfMeasure: kpi?.unitOfMeasure,
        targetValue: kpi?.targetValue,
        actualValue: row.actualValue,
        weight: kpi?.weight,
        normalizedScore: Number(normalized.toFixed(2)),
        status: row.status,
        band: this.classifyScore(normalized, thresholds),
        remarks: row.remarks,
      };
    })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const totalWeight = details.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    const weightedSum = details.reduce((sum, item) => sum + Number(item.normalizedScore) * Number(item.weight || 0), 0);
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Resolve unit name even when there are no monitoring rows for this period (partial period).
    const unitName =
      rows[0]?.unit?.name ??
      (await this.unitRepo.findOne({ where: { id: unitIdNum } }))?.name ??
      `Unit ${unitIdNum}`;

    return {
      unitId: unitIdNum,
      unitName,
      score: Number(score.toFixed(2)),
      band: this.classifyScore(score, thresholds),
      periodYear: yearNum,
      periodMonth: monthNum,
      details,
    };
  }

  /** Returns composite + per-KPI scores for a range of (year, month) periods. */
  async dashboardUnitTimeseries(
    user: AuthUser,
    unitId: number,
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number,
  ) {
    const unitIdNum = Number(unitId);
    if (!Number.isFinite(unitIdNum) || unitIdNum <= 0)
      throw new BadRequestException('Invalid unit ID.');

    const fy = Number(fromYear);
    const fm = Number(fromMonth);
    const ty = Number(toYear);
    const tm = Number(toMonth);

    if (!Number.isFinite(fy) || fy < 2000 || fy > 2100) throw new BadRequestException('fromYear invalid.');
    if (!Number.isFinite(fm) || fm < 1 || fm > 12) throw new BadRequestException('fromMonth invalid.');
    if (!Number.isFinite(ty) || ty < 2000 || ty > 2100) throw new BadRequestException('toYear invalid.');
    if (!Number.isFinite(tm) || tm < 1 || tm > 12) throw new BadRequestException('toMonth invalid.');

    if (!this.canViewAll(user)) {
      const allowed = await this.getAllowedUnitIds(user);
      if (!allowed.includes(unitIdNum)) throw new ForbiddenException('Unit access denied.');
    }

    // Build list of (year, month) tuples in range
    const periods: Array<{ year: number; month: number }> = [];
    let y = fy;
    let m = fm;
    while (y < ty || (y === ty && m <= tm)) {
      periods.push({ year: y, month: m });
      m++;
      if (m > 12) { m = 1; y++; }
      if (periods.length > 60) break; // safety cap
    }

    if (periods.length === 0) return [];

    // Fetch all monitoring rows in the date range for this unit in one query
    const rows = await this.kpiMonitoringRepo
      .createQueryBuilder('km')
      .leftJoinAndSelect('km.kpiMaster', 'kpiMaster')
      .where('km.unit_id = :unitId', { unitId: unitIdNum })
      .andWhere(
        '(km.period_year > :fy OR (km.period_year = :fy AND km.period_month >= :fm))',
        { fy, fm },
      )
      .andWhere(
        '(km.period_year < :ty OR (km.period_year = :ty AND km.period_month <= :tm))',
        { ty, tm },
      )
      .getMany();

    const scoringRule =
      (await this.kpiScoringRuleRepo.findOne({ where: { active: true }, order: { id: 'DESC' } })) ||
      this.kpiScoringRuleRepo.create({ capScore: 100, floorScore: 0, yesScore: 100, noScore: 0 });
    const thresholds = await this.kpiThresholdRepo.find({ order: { minScore: 'DESC' } });

    // Group rows by (year, month)
    const rowsByPeriod = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${row.periodYear}-${row.periodMonth}`;
      if (!rowsByPeriod.has(key)) rowsByPeriod.set(key, []);
      rowsByPeriod.get(key)!.push(row);
    }

    // For each period, compute composite score + per-KPI breakdown
    const unitName = rows[0]?.unit?.name
      ?? (await this.unitRepo.findOne({ where: { id: unitIdNum } }))?.name
      ?? `Unit ${unitIdNum}`;

    return periods.map(({ year, month }) => {
      const periodRows = rowsByPeriod.get(`${year}-${month}`) ?? [];
      const kpiScores = periodRows
        .filter((r) => Boolean(r.kpiMaster))
        .map((r) => {
          const kpi = r.kpiMaster!;
          const raw = this.computeRaw(kpi, Number(r.actualValue), scoringRule);
          const normalized = this.clamp(raw, Number(scoringRule.floorScore), Number(scoringRule.capScore));
          return {
            code: r.kpiMasterCode,
            name: kpi.name,
            normalizedScore: Number(normalized.toFixed(2)),
            actualValue: Number(r.actualValue),
            band: this.classifyScore(normalized, thresholds),
          };
        });

      const totalWeight = periodRows
        .filter((r) => Boolean(r.kpiMaster))
        .reduce((s, r) => s + Number(r.kpiMaster!.weight || 0), 0);
      const weightedSum = kpiScores.reduce(
        (s, k, i) =>
          s + k.normalizedScore * Number(periodRows.filter((r) => Boolean(r.kpiMaster))[i]?.kpiMaster!.weight || 0),
        0,
      );
      const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

      return {
        periodYear: year,
        periodMonth: month,
        unitId: unitIdNum,
        unitName,
        score: Number(score.toFixed(2)),
        band: periodRows.length > 0 ? this.classifyScore(score, thresholds) : 'unclassified',
        hasData: periodRows.length > 0,
        kpiScores,
      };
    });
  }

  async generateActionPlans(user: AuthUser, periodYear: number, periodMonth: number, unitId?: number) {
    const yearNum = Number(periodYear);
    const monthNum = Number(periodMonth);

    if (!Number.isFinite(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new BadRequestException('periodYear must be a valid year (2000-2100).');
    }
    if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('periodMonth must be between 1 and 12.');
    }

    const where: any = { periodYear: yearNum, periodMonth: monthNum };

    if (unitId !== undefined) {
      const unitIdNum = Number(unitId);
      if (!Number.isFinite(unitIdNum) || unitIdNum <= 0) {
        throw new BadRequestException('unitId must be a positive number.');
      }

      if (!this.canViewAll(user)) {
        const allowed = await this.getAllowedUnitIds(user);
        if (!allowed.includes(unitIdNum)) {
          throw new ForbiddenException('Unit access denied.');
        }
      }

      where.unitId = unitIdNum;
    } else if (!this.canViewAll(user)) {
      const allowed = await this.getAllowedUnitIds(user);
      if (allowed.length === 0) {
        return { periodYear: yearNum, periodMonth: monthNum, items: [] };
      }
      where.unitId = In(allowed);
    }

    const rows = await this.kpiMonitoringRepo.find({
      where,
      relations: ['kpiMaster', 'unit'],
    });

    const scoringRule =
      (await this.kpiScoringRuleRepo.findOne({ where: { active: true }, order: { id: 'DESC' } })) ||
      this.kpiScoringRuleRepo.create({ capScore: 100, floorScore: 0, yesScore: 100, noScore: 0 });

    const thresholds = await this.kpiThresholdRepo.find({ order: { minScore: 'DESC' } });

    const keywordRule = (text: string) => {
      const value = text.toLowerCase();
      if (value.includes('incident') || value.includes('cyber') || value.includes('security')) {
        return 'Strengthen incident response workflow, validate escalation contacts, and run targeted security awareness refreshers.';
      }
      if (value.includes('document') || value.includes('review') || value.includes('policy')) {
        return 'Close document evidence gaps, complete pending reviews, and publish updated policy/review sign-offs.';
      }
      if (value.includes('compliance') || value.includes('regulat') || value.includes('issuance')) {
        return 'Revalidate legal/regulatory mappings, update applicability notes, and assign closure owners for identified gaps.';
      }
      return 'Perform root-cause review, define corrective actions, and assign accountable process owners with target completion dates.';
    };

    const today = new Date();

    const items = rows
      .filter((row) => Boolean(row.kpiMaster))
      .map((row) => {
        const kpi = row.kpiMaster;
        if (!kpi) return null;

        const raw = this.computeRaw(kpi, Number(row.actualValue), scoringRule);
        const normalized = this.clamp(raw, Number(scoringRule.floorScore), Number(scoringRule.capScore));
        const band = this.classifyScore(normalized, thresholds);

        if (band === 'green') {
          return null;
        }

        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + (band === 'red' ? 15 : 30));

        const triggerText = `${kpi.name || ''} ${kpi.description || ''} ${row.remarks || ''}`;
        const recommendation = keywordRule(triggerText);

        return {
          unitId: row.unitId,
          unitName: row.unit?.name || `Unit ${row.unitId}`,
          kpiCode: row.kpiMasterCode,
          kpiName: kpi.name,
          targetValue: Number(kpi.targetValue),
          actualValue: Number(row.actualValue),
          normalizedScore: Number(normalized.toFixed(2)),
          band,
          priority: band === 'red' ? 'high' : 'medium',
          owner: row.unit?.name ? `${row.unit.name} Process Owner` : 'Process Owner',
          recommendation,
          suggestedDueDate: dueDate.toISOString().slice(0, 10),
          sourceRemarks: row.remarks || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return {
      periodYear: yearNum,
      periodMonth: monthNum,
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  async listThresholds() {
    await this.ensureLookups();
    return this.kpiThresholdRepo.find({ order: { minScore: 'DESC' } });
  }

  async upsertThreshold(user: AuthUser, id: number | null, dto: UpsertKpiThresholdDto) {
    if (!['super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only super_admin can maintain KPI thresholds.');
    }

    const entity = id
      ? await this.kpiThresholdRepo.findOne({ where: { id } })
      : this.kpiThresholdRepo.create();

    if (!entity) {
      throw new NotFoundException(`KPI threshold ${id} not found`);
    }

    entity.band = dto.band;
    entity.minScore = dto.minScore;
    entity.maxScore = dto.maxScore;
    entity.color = dto.color || null;

    return this.kpiThresholdRepo.save(entity);
  }

  async listScoringRules() {
    await this.ensureLookups();
    return this.kpiScoringRuleRepo.find({ order: { id: 'DESC' } });
  }

  async upsertScoringRule(user: AuthUser, id: number | null, dto: UpsertKpiScoringRuleDto) {
    if (!['super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only super_admin can maintain KPI scoring rules.');
    }

    const entity = id
      ? await this.kpiScoringRuleRepo.findOne({ where: { id } })
      : this.kpiScoringRuleRepo.create();

    if (!entity) {
      throw new NotFoundException(`KPI scoring rule ${id} not found`);
    }

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.active !== undefined) entity.active = dto.active;
    if (dto.capScore !== undefined) entity.capScore = dto.capScore;
    if (dto.floorScore !== undefined) entity.floorScore = dto.floorScore;
    if (dto.yesScore !== undefined) entity.yesScore = dto.yesScore;
    if (dto.noScore !== undefined) entity.noScore = dto.noScore;

    const saved = await this.kpiScoringRuleRepo.save(entity);

    if (saved.active) {
      await this.kpiScoringRuleRepo
        .createQueryBuilder()
        .update(KpiScoringRule)
        .set({ active: false })
        .where('id != :id', { id: saved.id })
        .execute();
      saved.active = true;
    }

    return saved;
  }
}
