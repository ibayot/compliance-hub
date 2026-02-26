import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { User } from '../../users/entities/user.entity';
import { KpiFrequency, KpiMaster, KpiType } from '../entities/kpi-master.entity';
import { KpiMonitoring, KpiMonitoringStatus } from '../entities/kpi-monitoring.entity';
import { KpiThreshold } from '../entities/kpi-threshold.entity';
import { KpiScoringRule } from '../entities/kpi-scoring-rule.entity';
import { CreateKpiMasterDto, UpdateKpiMasterDto } from '../dto/kpi-master.dto';
import { UpdateKpiMonitoringDto, UpsertKpiMonitoringDto } from '../dto/kpi-monitoring.dto';
import { UpsertKpiScoringRuleDto, UpsertKpiThresholdDto } from '../dto/kpi-lookups.dto';

interface AuthUser {
  id: number;
  role: string;
  units?: number[];
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

  private canManage(user: AuthUser) {
    return ['super_admin', 'reviewer', 'section_head'].includes(user.role);
  }

  private canViewAll(user: AuthUser) {
    return ['super_admin', 'reviewer', 'section_head'].includes(user.role);
  }

  private getAllowedUnitIds(user: AuthUser): number[] {
    const units = Array.isArray(user.units) ? user.units.map(Number).filter(Number.isFinite) : [];
    return Array.from(new Set(units));
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

    const allowed = this.getAllowedUnitIds(user);
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

    if (query.periodYear !== undefined) where.periodYear = query.periodYear;
    if (query.periodMonth !== undefined) where.periodMonth = query.periodMonth;
    if (query.kpiMasterCode !== undefined) where.kpiMasterCode = query.kpiMasterCode;

    if (this.canViewAll(user)) {
      if (query.unitId !== undefined) where.unitId = query.unitId;
    } else {
      const allowed = this.getAllowedUnitIds(user);
      if (allowed.length === 0) return [];
      if (query.unitId !== undefined && !allowed.includes(query.unitId)) {
        throw new ForbiddenException('Unit access denied.');
      }
      where.unitId = query.unitId !== undefined ? query.unitId : In(allowed);
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

    if (Number(actual) <= 0) return 0;
    return (target / Number(actual)) * 100;
  }

  private classifyScore(score: number, thresholds: KpiThreshold[]) {
    return (
      thresholds.find((t) => score >= Number(t.minScore) && score <= Number(t.maxScore))?.band ||
      'unclassified'
    );
  }

  async dashboardSummary(user: AuthUser, periodYear: number, periodMonth: number) {
    const where: any = { periodYear, periodMonth };

    if (!this.canViewAll(user)) {
      const allowed = this.getAllowedUnitIds(user);
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
        periodYear,
        periodMonth,
      },
      units: units.sort((a, b) => b.score - a.score),
      thresholds,
    };
  }

  async dashboardUnit(user: AuthUser, unitId: number, periodYear: number, periodMonth: number) {
    if (!this.canViewAll(user)) {
      const allowed = this.getAllowedUnitIds(user);
      if (!allowed.includes(unitId)) {
        throw new ForbiddenException('Unit access denied.');
      }
    }

    const rows = await this.kpiMonitoringRepo.find({
      where: { unitId, periodYear, periodMonth },
      relations: ['kpiMaster', 'unit'],
    });

    const scoringRule =
      (await this.kpiScoringRuleRepo.findOne({ where: { active: true }, order: { id: 'DESC' } })) ||
      this.kpiScoringRuleRepo.create({ capScore: 100, floorScore: 0, yesScore: 100, noScore: 0 });

    const thresholds = await this.kpiThresholdRepo.find({ order: { minScore: 'DESC' } });

    const details = rows.map((row) => {
      const kpi = row.kpiMaster;
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
    });

    const totalWeight = details.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    const weightedSum = details.reduce((sum, item) => sum + Number(item.normalizedScore) * Number(item.weight || 0), 0);
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      unitId,
      unitName: rows[0]?.unit?.name || `Unit ${unitId}`,
      score: Number(score.toFixed(2)),
      band: this.classifyScore(score, thresholds),
      periodYear,
      periodMonth,
      details,
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
