import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { MovArtifact } from '../entities/mov-artifact.entity';
import { CreateMovArtifactDto } from '../dto/create-mov-artifact.dto';
import { UpdateMovArtifactDto } from '../dto/update-mov-artifact.dto';
import { TemplateQueryDto } from '../dto/template-query.dto';
import { Issuance } from '../../references/entities/issuance.entity';
import { KpiMonitoring } from '../../kpi/entities/kpi-monitoring.entity';
import { KpiMaster } from '../../kpi/entities/kpi-master.entity';

@Injectable()
export class MovService implements OnModuleInit {
  private readonly logger = new Logger(MovService.name);

  private isDbBootstrapEnabled(): boolean {
    return String(process.env.DB_BOOTSTRAP ?? 'false').toLowerCase() === 'true';
  }

  private validateReportPeriod(year: number, quarter: number): void {
    if (!Number.isInteger(year) || year < 2000 || year > 2200) {
      throw new BadRequestException('Report year is invalid');
    }
    if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      throw new BadRequestException('Report quarter must be between 1 and 4');
    }
  }

  constructor(
    @InjectRepository(MovArtifact)
    private readonly movRepo: Repository<MovArtifact>,
    @InjectRepository(Issuance)
    private readonly issuanceRepo: Repository<Issuance>,
    @InjectRepository(KpiMonitoring)
    private readonly kpiMonitoringRepo: Repository<KpiMonitoring>,
    @InjectRepository(KpiMaster)
    private readonly kpiMasterRepo: Repository<KpiMaster>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.isDbBootstrapEnabled()) {
      this.logger.log('DB bootstrap disabled; skipping MOV startup DDL/seed.');
      return;
    }

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS mov_artifacts (
        id CHAR(36) NOT NULL,
        artifact_type VARCHAR(60) NOT NULL,
        scope VARCHAR(30) NOT NULL DEFAULT 'regional',
        title VARCHAR(255) NOT NULL,
        period_year INT NOT NULL,
        quarter INT NULL,
        unit_id INT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        content_markdown LONGTEXT NOT NULL,
        metadata_json JSON NULL,
        created_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_mov_type_period (artifact_type, period_year, quarter),
        KEY idx_mov_scope (scope),
        KEY idx_mov_unit (unit_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await this.seedDefaultAssessmentArtifacts();
    } catch (err) {
      this.logger.warn('Startup seeding failed (non-fatal).');
    }
  }

  private async seedDefaultAssessmentArtifacts(): Promise<void> {
    const existingPlans = await this.movRepo.count({
      where: { artifact_type: 'assessment_plan_year' },
    });
    if (existingPlans === 0) {
      const plans = [
        {
          title: 'Year 1 - Context, Governance, Risk Foundation',
          yearIndex: 1,
          content:
            'Map processes by unit, establish governance standards, identify stakeholders and responsibilities, perform baseline technical-operational-compliance risk analysis, map controls to ISO/IEC 27001 and DSWD QMS, then launch initial treatment and pilot validation.',
        },
        {
          title: 'Year 2 - Control Stabilization and Standardization',
          yearIndex: 2,
          content:
            'Standardize SOPs from year-1 pilots, expand treatment coverage, improve control consistency, and formalize quarterly management review routines.',
        },
        {
          title: 'Year 3 - Integration and Capability Maturity',
          yearIndex: 3,
          content:
            'Integrate regional/national requirements, strengthen evidence traceability, and track control effectiveness through KPI-linked review cycles.',
        },
        {
          title: 'Year 4 - Optimization and Audit Readiness',
          yearIndex: 4,
          content:
            'Optimize process bottlenecks, close recurring findings, and ensure complete MoV evidence packs for planned internal and external audits.',
        },
        {
          title: 'Year 5 - Sustainment and Continuous Improvement',
          yearIndex: 5,
          content:
            'Institutionalize continuous improvement, refresh risk methodology, and sustain quality-driven quarterly compliance reporting at maturity state.',
        },
      ];

      await this.movRepo.save(
        plans.map((item, index) =>
          this.movRepo.create({
            artifact_type: 'assessment_plan_year',
            scope: 'regional',
            title: item.title,
            period_year: new Date().getFullYear() + index,
            quarter: null,
            status: 'active',
            content_markdown: item.content,
            metadata_json: { year_index: item.yearIndex },
          }),
        ),
      );
    }

    const existingSchedule = await this.movRepo.count({
      where: { artifact_type: 'assessment_schedule_entry' },
    });
    if (existingSchedule === 0) {
      const currentYear = new Date().getFullYear();
      const entries = [
        {
          quarter: 1,
          title: 'Process Mapping and Governance Setup',
          owner: 'ICT Process Owner',
          due: `${currentYear}-03-31`,
        },
        {
          quarter: 2,
          title: 'Risk Analysis and ISMS/QMS Mapping',
          owner: 'Compliance Team',
          due: `${currentYear}-06-30`,
        },
        {
          quarter: 3,
          title: 'Risk Treatment and Awareness Rollout',
          owner: 'Unit Heads',
          due: `${currentYear}-09-30`,
        },
        {
          quarter: 4,
          title: 'Pilot Audit and Readiness Validation',
          owner: 'Internal Audit Team',
          due: `${currentYear}-12-15`,
        },
      ];

      await this.movRepo.save(
        entries.map((item) =>
          this.movRepo.create({
            artifact_type: 'assessment_schedule_entry',
            scope: 'regional',
            title: item.title,
            period_year: currentYear,
            quarter: item.quarter,
            status: 'planned',
            content_markdown: item.title,
            metadata_json: {
              owner: item.owner,
              due_date: item.due,
              sample_seed: true,
            },
          }),
        ),
      );
    }
  }

  list(filters?: {
    artifact_type?: string;
    period_year?: number;
    quarter?: number;
    scope?: string;
    unit_id?: number;
  }) {
    const query = this.movRepo.createQueryBuilder('mov').orderBy('mov.updated_at', 'DESC');

    if (filters?.artifact_type)
      query.andWhere('mov.artifact_type = :artifact_type', {
        artifact_type: filters.artifact_type,
      });
    if (filters?.period_year)
      query.andWhere('mov.period_year = :period_year', { period_year: filters.period_year });
    if (filters?.quarter) query.andWhere('mov.quarter = :quarter', { quarter: filters.quarter });
    if (filters?.scope) query.andWhere('mov.scope = :scope', { scope: filters.scope });
    if (filters?.unit_id) query.andWhere('mov.unit_id = :unit_id', { unit_id: filters.unit_id });

    return query.getMany();
  }

  async getById(id: string) {
    const row = await this.movRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('MoV artifact not found');
    return row;
  }

  create(dto: CreateMovArtifactDto, createdBy?: number) {
    const isGeneratedReport = dto.artifact_type === 'generated_report';
    const requestedStatus = dto.status || 'draft';
    if (isGeneratedReport && !['draft', 'reviewed', 'approved'].includes(requestedStatus)) {
      throw new BadRequestException('Generated reports must be Draft, Reviewed, or Approved');
    }
    const row = this.movRepo.create({
      ...dto,
      scope: dto.scope || 'regional',
      status: requestedStatus,
      quarter: dto.quarter ?? null,
      unit_id: dto.unit_id ?? null,
      metadata_json: dto.metadata_json || null,
      created_by: createdBy ?? null,
      content_sha256: isGeneratedReport
        ? createHash('sha256').update(dto.content_markdown).digest('hex')
        : null,
      finalized_at: isGeneratedReport && requestedStatus === 'approved' ? new Date() : null,
    });

    return this.movRepo.save(row);
  }

  async update(id: string, dto: UpdateMovArtifactDto) {
    const row = await this.getById(id);
    if (row.artifact_type === 'generated_report' && row.status === 'approved') {
      if (dto.status === 'superseded' && Object.keys(dto).every((key) => key === 'status')) {
        row.status = 'superseded';
        return this.movRepo.save(row);
      }
      throw new BadRequestException(
        'Approved report snapshots are immutable. Create a new report or mark this one Superseded.',
      );
    }
    Object.assign(row, dto);
    if (row.artifact_type === 'generated_report') {
      if (!['draft', 'reviewed', 'approved', 'superseded'].includes(row.status)) {
        throw new BadRequestException('Generated report status is invalid');
      }
      row.content_sha256 = createHash('sha256').update(row.content_markdown).digest('hex');
      row.finalized_at = row.status === 'approved' ? new Date() : null;
    }
    return this.movRepo.save(row);
  }

  async remove(id: string) {
    const row = await this.getById(id);
    if (row.artifact_type === 'generated_report' && row.status === 'approved') {
      throw new BadRequestException('Approved report snapshots cannot be deleted');
    }
    await this.movRepo.remove(row);
    return { message: 'MoV artifact deleted' };
  }

  getRegisterColumns() {
    return [
      'Item No.',
      'Title',
      'Type',
      'Applicable Provisions',
      'Issuing Entity',
      'Compliance Requirements',
      'Evidence of Compliance',
      'Impact',
      'Effectivity',
      'Compliance Status',
    ];
  }

  getTemplate(query: TemplateQueryDto) {
    const year = query.year || new Date().getFullYear();
    const quarter = query.quarter || Math.floor((new Date().getMonth() + 3) / 3);
    const scope = query.scope || 'regional';
    const unitName = query.unitName || 'ICT Unit';

    const baseHeader = `# ${query.type.replace(/_/g, ' ').toUpperCase()}\n\nYear: ${year}\nQuarter: Q${quarter}\nScope: ${scope}\nUnit: ${unitName}\nGenerated: ${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })}\n`;

    switch (query.type) {
      case 'assessment_plan':
        return {
          title: `Assessment Plan Q${quarter} ${year}`,
          content_markdown: `${baseHeader}\n## 1. Institutional Context\n- Map unit processes and interfaces\n- Confirm governance framework and documentation standards\n- Assign roles and RACI\n\n## 2. Risk Analysis\n- Analyze technical, operational, and compliance risks\n- Map risks to ISO/IEC 27001 and DSWD QMS requirements\n- Build/update risk register and scoring methodology\n\n## 3. Risk Treatment\n- Define treatment actions and corrective controls\n- Define awareness and training activities\n\n## 4. Validation and Readiness\n- Run pilot audits and SOP walkthrough\n- Validate effectiveness and adjust documentation\n- Confirm quarterly MoV completeness\n`,
        };
      case 'assessment_schedule':
        return {
          title: `Assessment Schedule Roadmap ${year}`,
          content_markdown: `${baseHeader}\n## Quarterly Roadmap\n- Q1: Process mapping, governance setup, stakeholders\n- Q2: Risk analysis, ISMS/QMS mapping, register calibration\n- Q3: Risk treatment rollout, controls implementation, training\n- Q4: Pilot audits, effectiveness monitoring, audit readiness\n\n## Gantt (Text)\n| Workstream | Q1 | Q2 | Q3 | Q4 |\n|---|---|---|---|---|\n| Process Mapping | ███ | ░░░ | ░░░ | ░░░ |\n| Risk Analysis | ░░░ | ███ | ░░░ | ░░░ |\n| Risk Treatment | ░░░ | ░░░ | ███ | ░░░ |\n| Validation & Readiness | ░░░ | ░░░ | ░░░ | ███ |\n`,
        };
      case 'assessment_report':
        return {
          title: `Assessment Report Q${quarter} ${year}`,
          content_markdown: `${baseHeader}\n## 1. Executive Summary\n## 2. Scope and Criteria\n## 3. Plan and Schedule Conformance\n## 4. Checklist Results\n## 5. Findings and Root Causes\n## 6. Risk Rating Summary\n## 7. Action Plan and Owners\n## 8. Evidence Index\n## 9. Conclusion\n`,
        };
      case 'review_report':
        return {
          title: `ICT Document Review Report Q${quarter} ${year}`,
          content_markdown: `${baseHeader}\n## 1. Review Coverage\n- National scope documents\n- Regional scope documents\n\n## 2. Inventory Snapshot\n- Total inventoried documents\n- Reviewed this quarter\n- Pending review\n\n## 3. Relevance and Validity Findings\n- Outdated policies\n- Missing evidence\n- Superseded requirements\n\n## 4. Corrective Actions\n| Item | Owner | Due Date | Status |\n|---|---|---|---|\n\n## 5. Quarterly MoV Readiness Statement\n`,
        };
      case 'register_template':
      default:
        return {
          title: `Legal and Regulatory Register Template`,
          content_markdown: `${baseHeader}\n## Recommended Columns\n${this.getRegisterColumns()
            .map((column) => `- ${column}`)
            .join('\n')}\n`,
        };
    }
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatDate(value?: Date | string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  }

  private formatDateMmm(value?: Date | string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const m = months[date.getUTCMonth()];
    const d = String(date.getUTCDate()).padStart(2, '0');
    const y = date.getUTCFullYear();
    return `${m}-${d}-${y}`;
  }

  private normalizeIssuanceType(value?: string | null): string {
    return (value || '').trim().toLowerCase();
  }

  private resolveRegisterTypeCode(issuanceType?: string | null): 'L' | 'R' | 'S' | 'C' {
    const normalized = this.normalizeIssuanceType(issuanceType);
    if (['law', 'executive_order'].includes(normalized)) return 'L';
    if (['standard', 'framework', 'guideline'].includes(normalized)) return 'S';
    if (['contract', 'contractual', 'contractual_requirement'].includes(normalized)) return 'C';
    return 'R';
  }

  private resolveRegisterGroup(
    item: Issuance,
  ): 'legal' | 'standards' | 'internal' | 'internal_operational' {
    if (item.primary_register === 'legal_regulatory') return 'legal';
    if (item.primary_register === 'standards') return 'standards';
    if (item.primary_register === 'internal_issuances') return 'internal';
    if (item.primary_register === 'internal_operational') return 'internal_operational';

    // Compatibility fallback for records not yet migrated.
    const type = this.normalizeIssuanceType(item.issuance_type);
    const number = (item.issuance_number || '').toLowerCase();

    if (['standard', 'framework', 'guideline'].includes(type)) return 'standards';

    if (
      type === 'internal policy' ||
      type === 'internal_policy' ||
      type === 'plan' ||
      number.startsWith('ao') ||
      number.startsWith('mc')
    ) {
      return 'internal';
    }

    return 'legal';
  }

  private complianceRequirement(item: Issuance): string {
    return item.compliance_obligations || item.applicable_provisions || item.relevance_notes || '-';
  }

  private implicationsEffectivity(item: Issuance): string {
    if (!item.effectivity_date || item.effectivity_date_precision === 'unknown') return '-';
    const date = new Date(item.effectivity_date);
    if (Number.isNaN(date.getTime())) return '-';
    if (item.effectivity_date_precision === 'year') return String(date.getUTCFullYear());
    if (item.effectivity_date_precision === 'month') {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
    return this.formatDateMmm(item.effectivity_date);
  }

  private statusLabel(value?: string | null): string {
    if (!value) return '-';
    return value
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private quarterStatusScore(value?: string | null): string {
    const normalized = (value || '').toLowerCase();
    if (normalized === 'compliant') return '100';
    if (normalized === 'partial') return '50';
    if (normalized === 'non_compliant') return '0';
    if (normalized === 'not_applicable') return 'N/A';
    return '-';
  }

  private buildRegisterTable(items: Issuance[], startingIndex: number): string {
    if (items.length === 0) {
      return '<p style="margin:8px 0 16px;">No entries available for this section.</p>';
    }

    const rows = items.map((item, index) => {
      const requirements = this.escapeHtml(this.complianceRequirement(item));
      const applicableProvisions = this.escapeHtml(item.applicable_provisions || '-');
      // The register asks for evidence actually available. Required-evidence guidance remains
      // in the issuance detail instead of making every generated register row unnecessarily long.
      const evidence = this.escapeHtml(item.evidence_location || '-');
      const impact = this.escapeHtml(item.applicability_scope || '-');
      const status = this.escapeHtml(this.statusLabel(item.compliance_status));
      return `
        <tr>
          <td>${startingIndex + index}</td>
          <td>${this.escapeHtml(item.title)}</td>
          <td style="white-space:nowrap;text-align:center;">${this.resolveRegisterTypeCode(item.issuance_type)}</td>
          <td>${applicableProvisions}</td>
          <td>${this.escapeHtml(item.issuing_authority || '-')}</td>
          <td>${requirements}</td>
          <td>${evidence}</td>
          <td>${impact}</td>
          <td style="white-space:nowrap;text-align:center;">${this.escapeHtml(this.implicationsEffectivity(item))}</td>
          <td style="text-align:center;">${status}</td>
        </tr>
      `;
    });

    const legend = `
      <p class="register-legend">
        <sup>1</sup>: L – Law / Executive Order,
        R – Regulatory Issuance,
        S – Standard / Framework / Guideline,
        C – Contractual Requirement
      </p>
    `;

    return `
      <table>
        <thead>
          <tr>
            <th>Item No.</th>
            <th>Title</th>
            <th>Type<br/><sup>1</sup></th>
            <th>Applicable Provisions</th>
            <th>Issuing Entity</th>
            <th>Compliance Requirements (e.g., frequency of review, reportorial requirements, etc.)</th>
            <th>Evidence of Compliance (Permit No. / Output documents, etc.)</th>
            <th>Impact</th>
            <th>Effectivity</th>
            <th>Compliance Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
      ${legend}
    `;
  }

  private buildMonitoringTable(items: Issuance[]): string {
    if (items.length === 0) {
      return '<p style="margin:8px 0 16px;">No monitoring entries available.</p>';
    }

    const rows = items.map((item) => {
      const basis = `${item.issuance_number} · ${item.title}`;
      const source = item.source_url
        ? `<a href="${this.escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">Source</a>`
        : '-';

      return `
        <tr>
          <td>${this.escapeHtml(basis)}</td>
          <td>${source}</td>
          <td>${this.quarterStatusScore(item.q1_compliance_status)}</td>
          <td>${this.quarterStatusScore(item.q2_compliance_status)}</td>
          <td>${this.quarterStatusScore(item.q3_compliance_status)}</td>
          <td>${this.quarterStatusScore(item.q4_compliance_status)}</td>
        </tr>
      `;
    });

    return `
      <h3>Register Monitoring Matrix</h3>
      <table>
        <thead>
          <tr>
            <th>Applicable Bases</th>
            <th>Description/Link</th>
            <th>Compliance Score (1st Q)</th>
            <th>Compliance Score (2nd Q)</th>
            <th>Compliance Score (3rd Q)</th>
            <th>Compliance Score (4th Q)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    `;
  }

  async generateRegisterReport(query: {
    year: number;
    quarter: number;
    scope?: string;
    unit?: string;
    register_type?: string;
    scope_profile?: string;
  }) {
    this.validateReportPeriod(Number(query.year), Number(query.quarter));
    const issuances = await this.issuanceRepo.find({
      where: {
        lifecycle_status: 'active',
        register_decision: 'included',
      },
      relations: ['assessments', 'assessments.evidence', 'assessments.remediationActions'],
      order: { register_added_at: 'DESC', created_at: 'DESC' },
    });

    const scopeFilter = (query.scope || '').trim().toLowerCase();
    const unitFilter = (query.unit || '').trim().toLowerCase();
    const registerType = (query.register_type || 'all').toLowerCase();
    const registerScope = (query.scope_profile || 'core').toLowerCase();
    if (!['legal', 'standards', 'internal', 'internal_operational', 'all'].includes(registerType)) {
      throw new BadRequestException('Register type is invalid');
    }
    if (!['core', 'extended', 'all'].includes(registerScope)) {
      throw new BadRequestException('Register scope is invalid');
    }

    issuances.forEach((item) => {
      const assessment = (item.assessments || [])
        .filter(
          (entry) =>
            Number(entry.year) === Number(query.year) &&
            (entry.quarter == null || Number(entry.quarter) === Number(query.quarter)),
        )
        .sort((a, b) => Number(b.quarter || 0) - Number(a.quarter || 0))[0];
      if (assessment) {
        item.compliance_status = assessment.status;
        item.evidence_location = assessment.evidenceSummary || '';
        item.gap_summary = assessment.gapSummary || '';
        item.quarterly_readiness = assessment.readinessStatus || 'not_assessed';
      } else {
        item.compliance_status = 'not_assessed';
        item.evidence_location = '';
        item.gap_summary = '';
        item.quarterly_readiness = 'not_assessed';
      }
    });

    const filtered = issuances.filter((item) => {
      const scopeValue = (item.applicability_scope || '').toLowerCase();

      const scopeMatch =
        scopeFilter && scopeFilter !== 'all' ? scopeValue.includes(scopeFilter) : true;
      const unitMatch = unitFilter ? scopeValue.includes(unitFilter) : true;

      const registerScopeMatch =
        registerScope === 'all' || item.scope_profile === registerScope;

      return scopeMatch && unitMatch && registerScopeMatch;
    });

    const legalEntries = filtered.filter((item) => this.resolveRegisterGroup(item) === 'legal');
    const standardsEntries = filtered.filter(
      (item) => this.resolveRegisterGroup(item) === 'standards',
    );
    const internalEntries = filtered.filter(
      (item) => this.resolveRegisterGroup(item) === 'internal',
    );
    const internalOperationalEntries = filtered.filter(
      (item) => this.resolveRegisterGroup(item) === 'internal_operational',
    );

    const selectedEntries =
      registerType === 'legal'
        ? legalEntries
        : registerType === 'standards'
          ? standardsEntries
          : registerType === 'internal'
            ? internalEntries
            : registerType === 'internal_operational'
              ? internalOperationalEntries
              : filtered;

    const quarterStartMonth = (Math.max(1, Math.min(4, Number(query.quarter || 1))) - 1) * 3 + 1;
    const quarterEndMonth = quarterStartMonth + 2;
    const addedEntries = selectedEntries.filter((item) => {
      const basisDate = item.register_added_at || item.created_at;
      const date = new Date(basisDate as any);
      if (Number.isNaN(date.getTime())) return false;
      const yearMatch = date.getFullYear() === Number(query.year);
      const month = date.getMonth() + 1;
      return yearMatch && month >= quarterStartMonth && month <= quarterEndMonth;
    }).length;

    const compliant = selectedEntries.filter(
      (item) => (item.compliance_status || '').toLowerCase() === 'compliant',
    ).length;
    const ready = selectedEntries.filter(
      (item) => (item.quarterly_readiness || '').toLowerCase() === 'ready',
    ).length;

    const style = `
      <style>
        body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
        h2 { font-family: Arial, sans-serif; font-size: 11pt; margin: 0 0 10px; text-align: center; }
        h3 { margin: 0 0 10px; font-family: Arial, sans-serif; font-size: 10pt; text-align: center; }
        .period { margin: 0 0 12px; color: #374151; font-family: Arial, sans-serif; font-size: 10pt; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0 4px; }
        th { border: 1px solid #d1d5db; padding: 6px; vertical-align: middle; background: #f3f4f6; text-align: center; font-family: Helvetica, Arial, sans-serif; font-size: 9pt; }
        td { border: 1px solid #d1d5db; padding: 6px; vertical-align: middle; font-family: Helvetica, Arial, sans-serif; font-size: 10pt; }
        .register-legend { font-family: Helvetica, Arial, sans-serif; font-size: 8pt; margin: 2px 0 18px; color: #374151; }
        .section-title { margin-top: 18px; }
        .summary-block { margin: 8px 0 16px; line-height: 1.8; font-family: Arial, sans-serif; font-size: 10pt; }
      </style>
    `;

    let sectionHtml = '';
    if (registerType === 'legal') {
      sectionHtml = `<h3 class="section-title">Legal Register</h3>${this.buildRegisterTable(legalEntries, 1)}`;
    } else if (registerType === 'standards') {
      sectionHtml = `<h3 class="section-title">Standards Register</h3>${this.buildRegisterTable(standardsEntries, 1)}`;
    } else if (registerType === 'internal') {
      sectionHtml = `<h3 class="section-title">Internal Issuances Register</h3>${this.buildRegisterTable(internalEntries, 1)}`;
    } else if (registerType === 'internal_operational') {
      sectionHtml = `<h3 class="section-title">Internal Operational Documents Register</h3>${this.buildRegisterTable(internalOperationalEntries, 1)}`;
    } else {
      let indexCounter = 1;
      const legalTable = this.buildRegisterTable(legalEntries, indexCounter);
      indexCounter += legalEntries.length;
      const standardsTable = this.buildRegisterTable(standardsEntries, indexCounter);
      indexCounter += standardsEntries.length;
      const internalTable = this.buildRegisterTable(internalEntries, indexCounter);
      indexCounter += internalEntries.length;
      const internalOperationalTable = this.buildRegisterTable(
        internalOperationalEntries,
        indexCounter,
      );
      sectionHtml = `
        <h3 class="section-title">Legal Register</h3>
        ${legalTable}

        <h3 class="section-title">Standards Register</h3>
        ${standardsTable}

        <h3 class="section-title">Internal Issuances Register</h3>
        ${internalTable}

        <h3 class="section-title">Internal Operational Documents Register</h3>
        ${internalOperationalTable}
      `;
    }

    const reportHeading =
      registerType === 'legal'
        ? 'LEGAL AND REGULATORY REGISTER FOR INFORMATION SECURITY'
        : registerType === 'standards'
          ? 'STANDARDS REGISTER FOR INFORMATION SECURITY'
          : registerType === 'internal'
            ? 'INTERNAL ISSUANCES REGISTER FOR INFORMATION SECURITY'
            : registerType === 'internal_operational'
              ? 'INTERNAL OPERATIONAL DOCUMENTS REGISTER FOR INFORMATION SECURITY'
              : 'INFORMATION SECURITY COMPLIANCE REGISTERS';

    const content_html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        ${style}
      </head>
      <body>
        <h2>INFORMATION SECURITY MANAGEMENT SYSTEM<br/>${reportHeading}</h2>
        <p class="period">Period: ${query.year} Q${query.quarter}${query.unit ? ` · Unit: ${this.escapeHtml(query.unit)}` : ''}</p>

        <h3>Summary</h3>
        <div class="summary-block">
          Active register entries: ${selectedEntries.length}<br/>
          Marked Compliant: ${compliant}<br/>
          Readiness: ${ready}<br/>
          Added Entries this Quarter: ${addedEntries}
        </div>

        ${sectionHtml}
      </body>
      </html>
    `;

    const content_markdown = content_html;
    const source_manifest = selectedEntries.map((item) => {
      const assessment = (item.assessments || []).
        filter((entry) => Number(entry.year) === Number(query.year) &&
          (Number(entry.quarter) === Number(query.quarter) || entry.quarter == null))
        .sort((a, b) => Number(b.quarter || 0) - Number(a.quarter || 0))[0];
      return {
        issuance_id: item.id,
        assessment_id: assessment?.id || null,
        evidence_ids: assessment?.evidence?.map((entry) => entry.id) || [],
        document_version_ids:
          assessment?.evidence?.map((entry) => entry.documentVersionId).filter(Boolean) || [],
        remediation_action_ids: assessment?.remediationActions?.map((entry) => entry.id) || [],
      };
    });

    return {
      title: `${registerType === 'legal' ? 'Legal & Regulatory Register' : registerType === 'standards' ? 'Standards Register' : registerType === 'internal' ? 'Internal Issuances Register' : registerType === 'internal_operational' ? 'Internal Operational Documents Register' : 'Register'} Report ${query.year} Q${query.quarter}`,
      content_html,
      content_markdown,
      summary: {
        total: selectedEntries.length,
        compliant,
        ready,
        addedEntries,
      },
      source_manifest,
      generated_at: new Date().toISOString(),
    };
  }

  async generateMonitoringMatrixReport(query: {
    year: number;
    quarter: number;
    scope?: string;
    unit?: string;
    scope_profile?: string;
  }) {
    this.validateReportPeriod(Number(query.year), Number(query.quarter));
    const issuances = await this.issuanceRepo.find({
      where: { lifecycle_status: 'active', register_decision: 'included' },
      relations: ['assessments', 'assessments.evidence', 'assessments.remediationActions'],
      order: { register_added_at: 'DESC', created_at: 'DESC' },
    });

    const scopeFilter = (query.scope || '').trim().toLowerCase();
    const unitFilter = (query.unit || '').trim().toLowerCase();
    const registerScope = (query.scope_profile || 'core').toLowerCase();
    if (!['core', 'extended', 'all'].includes(registerScope)) {
      throw new BadRequestException('Register scope is invalid');
    }
    issuances.forEach((item) => {
      const quarterly = new Map(
        (item.assessments || [])
          .filter(
            (entry) =>
              Number(entry.year) === Number(query.year) &&
              entry.quarter != null &&
              Number(entry.quarter) >= 1 &&
              Number(entry.quarter) <= 4,
          )
          .map((entry) => [Number(entry.quarter), entry.status]),
      );
      item.q1_compliance_status = quarterly.get(1) || 'not_assessed';
      item.q2_compliance_status = query.quarter >= 2 ? quarterly.get(2) || 'not_assessed' : '';
      item.q3_compliance_status = query.quarter >= 3 ? quarterly.get(3) || 'not_assessed' : '';
      item.q4_compliance_status = query.quarter >= 4 ? quarterly.get(4) || 'not_assessed' : '';
    });
    const filtered = issuances.filter((item) => {
      const scopeValue = (item.applicability_scope || '').toLowerCase();
      const scopeMatch =
        scopeFilter && scopeFilter !== 'all' ? scopeValue.includes(scopeFilter) : true;
      const unitMatch = unitFilter ? scopeValue.includes(unitFilter) : true;
      const registerScopeMatch =
        registerScope === 'all' || item.scope_profile === registerScope;
      return scopeMatch && unitMatch && registerScopeMatch;
    });

    const style = `
      <style>
        body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
        h2 { font-family: Arial, sans-serif; font-size: 11pt; margin: 0 0 10px; text-align: center; }
        h3 { margin: 0 0 10px; font-family: Arial, sans-serif; font-size: 10pt; text-align: center; }
        .period { margin: 0 0 12px; color: #374151; font-family: Arial, sans-serif; font-size: 10pt; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0 20px; table-layout: fixed; }
        .col-basis { width: 36%; }
        .col-source { width: 26%; }
        .col-score { width: 9.5%; }
        th { border: 1px solid #d1d5db; padding: 6px; vertical-align: middle; background: #f3f4f6; text-align: center; font-family: Helvetica, Arial, sans-serif; font-size: 9pt; }
        td { border: 1px solid #d1d5db; padding: 6px; vertical-align: middle; font-family: Helvetica, Arial, sans-serif; font-size: 10pt; word-break: break-word; }
      </style>
    `;

    const rows = filtered.map((item) => {
      const basis = this.escapeHtml(`${item.issuance_number} – ${item.title}`);
      const source = item.source_url
        ? `<a href="${this.escapeHtml(item.source_url)}" target="_blank" rel="noreferrer">${this.escapeHtml(item.source_url)}</a>`
        : '-';
      return `
        <tr>
          <td>${basis}</td>
          <td>${source}</td>
          <td style="text-align:center;">${this.quarterStatusScore(item.q1_compliance_status)}</td>
          <td style="text-align:center;">${this.quarterStatusScore(item.q2_compliance_status)}</td>
          <td style="text-align:center;">${this.quarterStatusScore(item.q3_compliance_status)}</td>
          <td style="text-align:center;">${this.quarterStatusScore(item.q4_compliance_status)}</td>
        </tr>
      `;
    });

    const content_html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" />${style}</head>
      <body>
        <h2>ICT COMPLIANCE REGISTER MONITORING</h2>
        <p class="period">Year ${query.year}, status as of Q${query.quarter}${query.unit ? ` · Unit: ${this.escapeHtml(query.unit)}` : ''}</p>
        <table>
          <colgroup>
            <col class="col-basis" />
            <col class="col-source" />
            <col class="col-score" />
            <col class="col-score" />
            <col class="col-score" />
            <col class="col-score" />
          </colgroup>
          <thead>
            <tr>
              <th>Applicable Bases</th>
              <th>Source</th>
              <th>Q1 Score</th>
              <th>Q2 Score</th>
              <th>Q3 Score</th>
              <th>Q4 Score</th>
            </tr>
          </thead>
          <tbody>${filtered.length === 0 ? '<tr><td colspan="6">No entries available.</td></tr>' : rows.join('')}</tbody>
        </table>
      </body>
      </html>
    `;

    return {
      title: `ICT Compliance Register Monitoring ${query.year} Q${query.quarter}`,
      content_html,
      content_markdown: content_html,
      summary: { total: filtered.length },
      source_manifest: filtered.map((item) => ({
        issuance_id: item.id,
        assessment_ids: (item.assessments || [])
          .filter((entry) => Number(entry.year) === Number(query.year) && Number(entry.quarter || 0) <= Number(query.quarter))
          .map((entry) => entry.id),
      })),
      generated_at: new Date().toISOString(),
    };
  }

  async generateAssessmentReport(query: {
    year: number;
    quarter: number;
    unit_id?: number;
    manual_remarks?: Record<string, string>;
  }) {
    this.validateReportPeriod(Number(query.year), Number(query.quarter));
    const plans = await this.movRepo.find({
      where: { artifact_type: 'assessment_plan_year' },
      order: { updated_at: 'ASC' },
    });

    const schedule = await this.movRepo.find({
      where: {
        artifact_type: 'assessment_schedule_entry',
        period_year: query.year,
        quarter: query.quarter,
        ...(query.unit_id ? { unit_id: query.unit_id } : {}),
      },
      order: { updated_at: 'ASC' },
    });

    const quarterMonths = [query.quarter * 3 - 2, query.quarter * 3 - 1, query.quarter * 3];
    const kpiRows = await this.kpiMonitoringRepo.find({
      where: {
        periodYear: query.year,
        periodMonth: In(quarterMonths),
        ...(query.unit_id ? { unitId: query.unit_id } : {}),
      },
      relations: ['kpiMaster'],
    });

    const kpiBelowTarget = kpiRows.filter((row) => {
      const target = Number(row.kpiMaster?.targetValue || 0);
      const actual = Number(row.actualValue || 0);
      const direction = row.kpiMaster?.direction;
      if (!target || !direction) return false;
      if (direction === 'higher_is_better') return actual < target;
      return actual > target;
    });

    const completedSchedule = schedule.filter((item) =>
      ['completed', 'done'].includes((item.status || '').toLowerCase()),
    ).length;

    const selectedPlan = plans.find((item) => Number(item.period_year) === Number(query.year));
    if (!selectedPlan) {
      throw new BadRequestException(`No assessment plan exists for ${query.year}`);
    }
    const planItemsFromMeta = Array.isArray(selectedPlan?.metadata_json?.items)
      ? (selectedPlan?.metadata_json?.items as string[])
      : [];
    const planItemsFromContent = String(selectedPlan?.content_markdown || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.replace(/^-\s+/, '').trim());

    const planChecklistItems = Array.from(
      new Set([...planItemsFromMeta, ...planItemsFromContent]),
    ).filter(Boolean);

    const normalizeActivity = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const checklist = (
      planChecklistItems.length > 0
        ? planChecklistItems
        : ['Assessment plan activities defined for selected year']
    ).map((item) => {
      const normalizedItem = normalizeActivity(item);
      const matchingSchedule = schedule.filter((entry) => {
        const explicitPlanItem = String(entry.metadata_json?.plan_item || '');
        const candidates = [entry.title, entry.content_markdown, explicitPlanItem]
          .map((value) => normalizeActivity(String(value || '')))
          .filter(Boolean);
        return candidates.some(
          (candidate) =>
            candidate === normalizedItem ||
            candidate.includes(normalizedItem) ||
            normalizedItem.includes(candidate),
        );
      });
      const completed = matchingSchedule.filter((entry) =>
        ['completed', 'done'].includes((entry.status || '').toLowerCase()),
      );
      return {
        item,
        passed: completed.length > 0,
        evidence: matchingSchedule.length
          ? `${completed.length} of ${matchingSchedule.length} linked schedule activities completed`
          : 'No linked schedule activity',
      };
    });

    const scheduleRows = schedule.map((item) => {
      const owner = item.metadata_json?.owner || '-';
      const due = item.metadata_json?.due_date || '-';
      const remarks = item.metadata_json?.remarks || '-';
      return `| ${item.title} | ${owner} | ${due} | ${item.status} | ${remarks} |`;
    });

    const manualRemarks = query.manual_remarks || {};
    const kpiRowsText = kpiBelowTarget.map((row) => {
      const key = `${row.unitId}:${row.kpiMasterCode}`;
      const overridden = manualRemarks[key]?.trim() || manualRemarks[row.kpiMasterCode]?.trim();
      return `| ${row.unit?.name || row.unitId} | ${row.kpiMasterCode} | ${row.kpiMaster?.name || '-'} | ${row.actualValue} | ${row.kpiMaster?.targetValue || '-'} | ${overridden || row.remarks || '-'} |`;
    });

    const assessedIssuances = await this.issuanceRepo.find({
      where: { lifecycle_status: 'active', register_decision: 'included' },
      relations: ['assessments', 'assessments.evidence', 'assessments.remediationActions'],
    });
    const periodAssessments = assessedIssuances.flatMap((issuance) =>
      (issuance.assessments || [])
        .filter((assessment) =>
          Number(assessment.year) === Number(query.year) &&
          (Number(assessment.quarter) === Number(query.quarter) || assessment.quarter == null),
        )
        .map((assessment) => ({ issuance, assessment })),
    );
    const evidenceCount = periodAssessments.reduce(
      (sum, row) => sum + (row.assessment.evidence?.length || 0),
      0,
    );
    const openActions = periodAssessments.reduce(
      (sum, row) =>
        sum +
        (row.assessment.remediationActions || []).filter((action) =>
          ['open', 'in_progress'].includes(action.status),
        ).length,
      0,
    );

    const report_html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 24px; }
          h2, h3 { margin: 0 0 10px; }
          ul { margin-top: 4px; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0 20px; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h2>Assessment Report</h2>
        <p>Period: ${query.year} Q${query.quarter}</p>
        <h3>Plan-Schedule-KPI Conformance</h3>
        <p>
          The assessment schedule contains ${schedule.length} planned activities for this quarter, with ${completedSchedule} tagged as completed.
          KPI monitoring captured ${kpiRows.length} entries for the reporting period, and ${kpiBelowTarget.length} KPI items are currently below target and require follow-through.
        </p>
        <h3>Assessment Checklist</h3>
        <ul>${checklist.map((item) => `<li>${item.passed ? '✅' : '❌'} ${this.escapeHtml(item.item)} (${this.escapeHtml(item.evidence)})</li>`).join('')}</ul>
        <h3>Issuance Assessment Evidence</h3>
        <p>${periodAssessments.length} issuance assessments are recorded for this period, supported by ${evidenceCount} linked evidence records. ${openActions} corrective actions remain open or in progress.</p>
        <h3>Assessment Schedule</h3>
        <table>
          <thead><tr><th>Activity</th><th>Owner</th><th>Due Date</th><th>Status</th><th>Remarks</th></tr></thead>
          <tbody>${
            scheduleRows.length
              ? scheduleRows
                  .map((row) => {
                    const cells = row
                      .split('|')
                      .map((cell) => cell.trim())
                      .filter(Boolean);
                    return `<tr><td>${this.escapeHtml(cells[0] || '-')}</td><td>${this.escapeHtml(cells[1] || '-')}</td><td>${this.escapeHtml(cells[2] || '-')}</td><td>${this.escapeHtml(cells[3] || '-')}</td><td>${this.escapeHtml(cells[4] || '-')}</td></tr>`;
                  })
                  .join('')
              : '<tr><td>No schedule entries found</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>'
          }</tbody>
        </table>
        <h3>KPI Gaps vs Plan</h3>
        <table>
          <thead><tr><th>Unit</th><th>KPI Code</th><th>KPI Name</th><th>Actual</th><th>Target</th><th>Remarks</th></tr></thead>
          <tbody>${
            kpiRowsText.length
              ? kpiRowsText
                  .map((row) => {
                    const cells = row
                      .split('|')
                      .map((cell) => cell.trim())
                      .filter(Boolean);
                    return `<tr><td>${this.escapeHtml(cells[0] || '-')}</td><td>${this.escapeHtml(cells[1] || '-')}</td><td>${this.escapeHtml(cells[2] || '-')}</td><td>${this.escapeHtml(cells[3] || '-')}</td><td>${this.escapeHtml(cells[4] || '-')}</td><td>${this.escapeHtml(cells[5] || '-')}</td></tr>`;
                  })
                  .join('')
              : '<tr><td>No KPI gaps detected in this period</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>'
          }</tbody>
        </table>
      </body>
      </html>
    `;

    const report_markdown = report_html;

    return {
      title: `Assessment Report ${query.year} Q${query.quarter}`,
      report_html,
      report_markdown,
      checklist,
      summary: {
        plan_entries: planChecklistItems.length,
        schedule_entries: schedule.length,
        completed_schedule: completedSchedule,
        kpi_rows: kpiRows.length,
        kpi_below_target: kpiBelowTarget.length,
        issuance_assessments: periodAssessments.length,
        linked_evidence: evidenceCount,
        open_corrective_actions: openActions,
      },
      source_manifest: {
        plan_id: selectedPlan.id,
        schedule_ids: schedule.map((entry) => entry.id),
        kpi_monitoring_ids: kpiRows.map((entry) => entry.id),
        issuance_assessments: periodAssessments.map(({ issuance, assessment }) => ({
          issuance_id: issuance.id,
          assessment_id: assessment.id,
          evidence_ids: assessment.evidence?.map((entry) => entry.id) || [],
          remediation_action_ids: assessment.remediationActions?.map((entry) => entry.id) || [],
        })),
      },
      generated_at: new Date().toISOString(),
    };
  }
}
