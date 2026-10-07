import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Issuance } from '../entities/issuance.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';
import { ComplianceDomain } from '../entities/compliance-domain.entity';
import { IssuanceSource } from '../entities/issuance-source.entity';
import { IssuanceRelationship } from '../entities/issuance-relationship.entity';
import { IssuanceLifecycleHistory } from '../entities/issuance-lifecycle-history.entity';
import { IssuanceAssessment } from '../entities/issuance-assessment.entity';
import { IssuanceRecommendation } from '../entities/issuance-recommendation.entity';
import { IssuanceRegisterDecision } from '../entities/issuance-register-decision.entity';
import { IssuanceAssessmentEvidence } from '../entities/issuance-assessment-evidence.entity';
import { IssuanceRemediationAction } from '../entities/issuance-remediation-action.entity';

const PRIMARY_REGISTERS = [
  'legal_regulatory',
  'standards',
  'internal_issuances',
  'internal_operational',
] as const;
const LIFECYCLE_STATUSES = [
  'draft',
  'under_review',
  'active',
  'amended',
  'superseded',
  'repealed',
  'revoked',
  'expired',
  'retired',
] as const;
const APPLICABILITY_STATUSES = [
  'pending_review',
  'applicable',
  'partially_applicable',
  'not_applicable',
] as const;
const REGISTER_DECISIONS = ['pending', 'included', 'excluded'] as const;
const SCOPE_PROFILES = ['core', 'extended'] as const;
const ASSESSMENT_STATUSES = [
  'not_assessed',
  'compliant',
  'partial',
  'non_compliant',
  'not_applicable',
] as const;
const READINESS_STATUSES = ['not_assessed', 'ready', 'needs_update', 'missing_evidence'] as const;
const REMEDIATION_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'] as const;
const SOURCE_TYPES = [
  'official_external',
  'official_internal',
  'uploaded_copy',
  'google_drive',
  'reference_link',
] as const;
const RELATIONSHIP_TYPES = [
  'implements',
  'amends',
  'supersedes',
  'repeals',
  'supplements',
  'clarifies',
  'pursuant_to',
  'related_to',
] as const;

export interface CreateIssuanceDto {
  issuance_number: string;
  title: string;
  description?: string;
  issuance_type?: string;
  primary_register?: string;
  lifecycle_status?: string;
  applicability_status?: string;
  register_decision?: string;
  scope_profile?: string;
  status_reason?: string;
  domain_ids?: number[];
  applicability_scope?: string;
  relevance_notes?: string;
  binding_nature?: string;
  adoption_basis?: string;
  applicable_provisions?: string;
  compliance_obligations?: string;
  required_evidence?: string;
  evidence_location?: string;
  process_owner?: string;
  accountable_user_id?: number;
  frequency_cadence?: string;
  compliance_status?: string;
  gap_summary?: string;
  action_required?: string;
  target_date?: Date;
  last_review_date?: Date;
  quarterly_readiness?: string;
  q1_compliance_status?: string;
  q2_compliance_status?: string;
  q3_compliance_status?: string;
  q4_compliance_status?: string;
  register_added_at?: Date;
  is_amendment?: boolean;
  amended_issuance_number?: string;
  ict_amendment_notes?: string;
  issuing_authority: string;
  issue_date?: Date;
  issue_date_precision?: string;
  approval_date?: Date;
  effectivity_date?: Date;
  effectivity_date_precision?: string;
  end_date?: Date;
  source_url?: string;
  is_active?: boolean;
}

export interface UpdateIssuanceDto {
  title?: string;
  description?: string;
  issuance_type?: string;
  primary_register?: string;
  lifecycle_status?: string;
  applicability_status?: string;
  register_decision?: string;
  scope_profile?: string;
  status_reason?: string;
  domain_ids?: number[];
  applicability_scope?: string;
  relevance_notes?: string;
  binding_nature?: string;
  adoption_basis?: string;
  applicable_provisions?: string;
  compliance_obligations?: string;
  required_evidence?: string;
  evidence_location?: string;
  process_owner?: string;
  accountable_user_id?: number | null;
  frequency_cadence?: string;
  compliance_status?: string;
  gap_summary?: string;
  action_required?: string;
  target_date?: Date;
  last_review_date?: Date;
  quarterly_readiness?: string;
  q1_compliance_status?: string;
  q2_compliance_status?: string;
  q3_compliance_status?: string;
  q4_compliance_status?: string;
  register_added_at?: Date;
  is_amendment?: boolean;
  amended_issuance_number?: string;
  ict_amendment_notes?: string;
  issuing_authority?: string;
  issue_date?: Date;
  issue_date_precision?: string;
  approval_date?: Date;
  effectivity_date?: Date;
  effectivity_date_precision?: string;
  end_date?: Date;
  source_url?: string;
  is_active?: boolean;
}

export interface LinkDocumentDto {
  document_id: string;
}

@Injectable()
export class IssuanceService implements OnModuleInit {
  private readonly logger = new Logger(IssuanceService.name);
  private hasDocumentIssuancesTable: boolean | null = null;

  constructor(
    @InjectRepository(Issuance)
    private issuanceRepo: Repository<Issuance>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private documentVersionRepo: Repository<DocumentVersion>,
    @InjectRepository(ComplianceDomain)
    private domainRepo: Repository<ComplianceDomain>,
    @InjectRepository(IssuanceSource)
    private sourceRepo: Repository<IssuanceSource>,
    @InjectRepository(IssuanceRelationship)
    private relationshipRepo: Repository<IssuanceRelationship>,
    @InjectRepository(IssuanceLifecycleHistory)
    private lifecycleHistoryRepo: Repository<IssuanceLifecycleHistory>,
    @InjectRepository(IssuanceAssessment)
    private assessmentRepo: Repository<IssuanceAssessment>,
    @InjectRepository(IssuanceRecommendation)
    private recommendationRepo: Repository<IssuanceRecommendation>,
    @InjectRepository(IssuanceRegisterDecision)
    private registerDecisionRepo: Repository<IssuanceRegisterDecision>,
    @InjectRepository(IssuanceAssessmentEvidence)
    private assessmentEvidenceRepo: Repository<IssuanceAssessmentEvidence>,
    @InjectRepository(IssuanceRemediationAction)
    private remediationActionRepo: Repository<IssuanceRemediationAction>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    // Schema DDL for this service is managed via versioned migration files in
    // backend/database/migrations/. See v0.0.50-service-ddl-extraction.sql.
    //
    // NOTE: document_issuances pivot table is intentionally absent.
    // The compliance_hub.issuances table is the source of truth.
    // The ManyToMany join to document_issuances is guarded by canUseDocumentLinks().
    this.logger.log('IssuanceService initialized. Schema managed via migration files.');
  }

  private async canUseDocumentLinks(): Promise<boolean> {
    if (this.hasDocumentIssuancesTable !== null) {
      return this.hasDocumentIssuancesTable;
    }
    try {
      const rows = await this.dataSource.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'document_issuances' LIMIT 1",
      );
      this.hasDocumentIssuancesTable = Array.isArray(rows) && rows.length > 0;
    } catch {
      this.hasDocumentIssuancesTable = false;
    }
    return this.hasDocumentIssuancesTable;
  }

  private assertAllowed(value: string | undefined, allowed: readonly string[], label: string): void {
    if (value && !allowed.includes(value)) {
      throw new BadRequestException(`${label} is invalid`);
    }
  }

  private async resolveDomains(
    domainIds?: number[],
    allowedInactiveIds: number[] = [],
  ): Promise<ComplianceDomain[]> {
    if (!domainIds) return [];
    const ids = [...new Set(domainIds.map(Number).filter(Number.isInteger))];
    if (ids.length === 0) return [];
    const domains = await this.domainRepo.find({ where: { id: In(ids) } });
    const allowedInactive = new Set(allowedInactiveIds);
    if (
      domains.length !== ids.length ||
      domains.some((domain) => !domain.isActive && !allowedInactive.has(domain.id))
    ) {
      throw new BadRequestException(
        'One or more compliance domains are invalid, inactive, or not already assigned',
      );
    }
    return domains;
  }

  private validateArchitectureFields(dto: CreateIssuanceDto | UpdateIssuanceDto): void {
    this.assertAllowed(dto.primary_register, PRIMARY_REGISTERS, 'Primary Register');
    this.assertAllowed(dto.lifecycle_status, LIFECYCLE_STATUSES, 'Lifecycle Status');
    this.assertAllowed(dto.applicability_status, APPLICABILITY_STATUSES, 'Applicability Status');
    this.assertAllowed(dto.register_decision, REGISTER_DECISIONS, 'Register Decision');
    this.assertAllowed(dto.scope_profile, SCOPE_PROFILES, 'Scope Profile');
    if (dto.register_decision === 'included' && dto.applicability_status === 'not_applicable') {
      throw new BadRequestException('A Not Applicable issuance cannot be included in an official register');
    }
    if (
      dto.lifecycle_status &&
      !['draft', 'under_review', 'active'].includes(dto.lifecycle_status) &&
      !dto.status_reason?.trim()
    ) {
      throw new BadRequestException('Status Reason is required for historical lifecycle states');
    }
  }

  private normalizeComparable(value?: string | null): string {
    return (value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private async assertAmendmentTarget(
    issuanceId: string | undefined,
    isAmendment?: boolean,
    amendedIssuanceNumber?: string | null,
  ): Promise<void> {
    if (!isAmendment) return;
    const number = amendedIssuanceNumber?.trim();
    if (!number) throw new BadRequestException('Amended Issuance Number is required');
    const target = await this.issuanceRepo.findOne({ where: { issuance_number: number } });
    if (!target) throw new BadRequestException('The amended issuance could not be found');
    if (issuanceId && target.id === issuanceId) {
      throw new BadRequestException('An issuance cannot amend itself');
    }
  }

  private async syncLegacyAmendmentRelationship(
    issuance: Issuance,
    userId?: number,
  ): Promise<void> {
    const existingAmendments = await this.relationshipRepo.find({
      where: { sourceIssuanceId: issuance.id, relationshipType: 'amends' },
    });
    if (!issuance.is_amendment || !issuance.amended_issuance_number?.trim()) {
      if (existingAmendments.length) await this.relationshipRepo.remove(existingAmendments);
      return;
    }
    const target = await this.issuanceRepo.findOne({
      where: { issuance_number: issuance.amended_issuance_number.trim() },
    });
    if (!target || target.id === issuance.id) return;
    const stale = existingAmendments.filter((item) => item.targetIssuanceId !== target.id);
    if (stale.length) await this.relationshipRepo.remove(stale);
    const existing = existingAmendments.find((item) => item.targetIssuanceId === target.id);
    if (!existing) {
      await this.relationshipRepo.save(
        this.relationshipRepo.create({
          sourceIssuanceId: issuance.id,
          targetIssuanceId: target.id,
          relationshipType: 'amends',
          notes: issuance.ict_amendment_notes || null,
          createdBy: userId || null,
        }),
      );
    } else if (existing.notes !== (issuance.ict_amendment_notes || null)) {
      existing.notes = issuance.ict_amendment_notes || null;
      await this.relationshipRepo.save(existing);
    }
  }

  private async syncPrimaryUrlSource(issuance: Issuance): Promise<void> {
    const url = issuance.source_url?.trim();
    if (!url) {
      await this.sourceRepo
        .createQueryBuilder()
        .update(IssuanceSource)
        .set({ isPrimary: false })
        .where('issuance_id = :issuanceId', { issuanceId: issuance.id })
        .andWhere('source_type IN (:...types)', {
          types: ['official_external', 'google_drive'],
        })
        .execute();
      const uploaded = await this.sourceRepo.findOne({
        where: { issuanceId: issuance.id, sourceType: 'uploaded_copy' },
        order: { createdAt: 'DESC' },
      });
      if (uploaded) {
        await this.sourceRepo.update({ issuanceId: issuance.id }, { isPrimary: false });
        uploaded.isPrimary = true;
        await this.sourceRepo.save(uploaded);
      }
      return;
    }
    const normalizedUrl = url.replace(/\/$/, '');
    let source = await this.sourceRepo
      .createQueryBuilder('source')
      .where('source.issuanceId = :issuanceId', { issuanceId: issuance.id })
      .andWhere('LOWER(TRIM(TRAILING \'/\' FROM source.url)) = LOWER(:url)', {
        url: normalizedUrl,
      })
      .getOne();
    if (!source) source = this.sourceRepo.create({ issuanceId: issuance.id });
    await this.sourceRepo.update({ issuanceId: issuance.id }, { isPrimary: false });
    source.sourceType = normalizedUrl.includes('drive.google.com') ? 'google_drive' : 'official_external';
    source.url = normalizedUrl;
    source.sourceOrganization = issuance.issuing_authority;
    source.isPrimary = true;
    await this.sourceRepo.save(source);
  }

  /**
   * Create a new issuance
   */
  async createIssuance(dto: CreateIssuanceDto, userId?: number): Promise<Issuance> {
    this.validateArchitectureFields(dto);

    const lifecycleStatus = dto.lifecycle_status || 'under_review';
    const registerDecision = dto.register_decision || 'pending';
    const applicabilityStatus = dto.applicability_status || 'pending_review';
    const domains = await this.resolveDomains(dto.domain_ids);
    await this.assertAmendmentTarget(undefined, dto.is_amendment, dto.amended_issuance_number);

    if (registerDecision === 'included') {
      if (lifecycleStatus !== 'active') {
        throw new BadRequestException('Only an Active issuance can be included in an official register');
      }
      if (!['applicable', 'partially_applicable'].includes(applicabilityStatus)) {
        throw new BadRequestException('Only Applicable or Partially Applicable records can be included');
      }
      if (domains.length === 0) {
        throw new BadRequestException('At least one active compliance domain is required for inclusion');
      }
      if (!dto.source_url?.trim()) {
        throw new BadRequestException('An identifiable source is required for inclusion');
      }
    }

    // Check if issuance number already exists
    const existing = await this.issuanceRepo.findOne({
      where: { issuance_number: dto.issuance_number },
    });

    if (existing) {
      throw new ConflictException('Issuance number already exists');
    }

    const { domain_ids: _domainIds, ...issuanceDto } = dto;
    const catalogData = { ...issuanceDto } as Record<string, any>;
    [
      'compliance_status',
      'evidence_location',
      'gap_summary',
      'action_required',
      'target_date',
      'last_review_date',
      'quarterly_readiness',
      'q1_compliance_status',
      'q2_compliance_status',
      'q3_compliance_status',
      'q4_compliance_status',
    ].forEach((key) => delete catalogData[key]);
    const issuance = this.issuanceRepo.create({
      ...catalogData,
      primary_register: dto.primary_register || 'legal_regulatory',
      lifecycle_status: lifecycleStatus,
      applicability_status: applicabilityStatus,
      register_decision: registerDecision,
      scope_profile: dto.scope_profile || 'core',
      issue_date_precision: dto.issue_date_precision || (dto.issue_date ? 'day' : 'unknown'),
      effectivity_date_precision:
        dto.effectivity_date_precision || (dto.effectivity_date ? 'day' : 'unknown'),
      is_active: lifecycleStatus === 'active',
      domains,
      compliance_status: dto.compliance_status || 'not_assessed',
      quarterly_readiness: dto.quarterly_readiness || 'not_assessed',
      q1_compliance_status: dto.q1_compliance_status || 'not_assessed',
      q2_compliance_status: dto.q2_compliance_status || 'not_assessed',
      q3_compliance_status: dto.q3_compliance_status || 'not_assessed',
      q4_compliance_status: dto.q4_compliance_status || 'not_assessed',
      register_added_at: dto.register_added_at || new Date(),
    });
    await this.issuanceRepo.save(issuance);
    await this.syncLegacyAmendmentRelationship(issuance, userId);
    await this.syncPrimaryUrlSource(issuance);

    await this.lifecycleHistoryRepo.save(
      this.lifecycleHistoryRepo.create({
        issuanceId: issuance.id,
        fromStatus: null,
        toStatus: lifecycleStatus,
        reason: dto.status_reason?.trim() || 'Issuance created',
        changedBy: userId || null,
      }),
    );

    this.logger.log(`Created issuance: ${dto.issuance_number}`);
    return issuance;
  }

  /**
   * Get all issuances with optional filters
   */
  async getIssuances(filters?: {
    authority?: string;
    category?: string;
    search?: string;
    is_active?: boolean;
    primary_register?: string;
    lifecycle_status?: string;
    applicability_status?: string;
    register_decision?: string;
    scope_profile?: string;
    domain_id?: number;
    page?: number;
    limit?: number;
  }): Promise<Issuance[] | { data: Issuance[]; total: number; page: number; limit: number }> {
    const canUseDocumentLinks = await this.canUseDocumentLinks();
    const query = this.issuanceRepo.createQueryBuilder('issuance');
    query.leftJoinAndSelect('issuance.domains', 'domains');
    query.leftJoinAndSelect('issuance.sources', 'sources');
    query.leftJoinAndSelect('issuance.assessments', 'assessments');
    if (canUseDocumentLinks) {
      query.leftJoinAndSelect('issuance.documents', 'documents');
    }

    if (filters?.authority) {
      query.andWhere('issuance.issuing_authority LIKE :authority', {
        authority: `%${filters.authority}%`,
      });
    }

    if (filters?.category) {
      query.andWhere('issuance.issuance_type = :category', {
        category: filters.category,
      });
    }

    if (filters?.search) {
      query.andWhere(
        `(
          issuance.issuance_number LIKE :search
          OR issuance.title LIKE :search
          OR issuance.description LIKE :search
          OR issuance.issuance_type LIKE :search
          OR issuance.issuing_authority LIKE :search
          OR issuance.applicable_provisions LIKE :search
          OR issuance.compliance_obligations LIKE :search
          OR issuance.required_evidence LIKE :search
          OR issuance.process_owner LIKE :search
          OR issuance.source_url LIKE :search
          OR domains.name LIKE :search
          OR sources.url LIKE :search
          OR sources.sourceOrganization LIKE :search
          OR sources.externalDocumentId LIKE :search
        )`,
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.is_active !== undefined) {
      query.andWhere('issuance.is_active = :is_active', {
        is_active: filters.is_active,
      });
    }

    if (filters?.primary_register) {
      query.andWhere('issuance.primary_register = :primaryRegister', {
        primaryRegister: filters.primary_register,
      });
    }
    if (filters?.lifecycle_status) {
      query.andWhere('issuance.lifecycle_status = :lifecycleStatus', {
        lifecycleStatus: filters.lifecycle_status,
      });
    }
    if (filters?.applicability_status) {
      query.andWhere('issuance.applicability_status = :applicabilityStatus', {
        applicabilityStatus: filters.applicability_status,
      });
    }
    if (filters?.register_decision) {
      query.andWhere('issuance.register_decision = :registerDecision', {
        registerDecision: filters.register_decision,
      });
    }
    if (filters?.scope_profile) {
      query.andWhere('issuance.scope_profile = :scopeProfile', {
        scopeProfile: filters.scope_profile,
      });
    }
    if (filters?.domain_id) {
      query.andWhere('domains.id = :domainId', { domainId: filters.domain_id });
    }

    query.orderBy('issuance.issue_date', 'DESC').addOrderBy('issuance.created_at', 'DESC');

    const usePagination = filters?.page !== undefined || filters?.limit !== undefined;
    const page = Math.max(1, Number(filters?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filters?.limit || 25)));
    if (usePagination) query.skip((page - 1) * limit).take(limit);
    const [results, total] = usePagination
      ? await query.getManyAndCount()
      : [await query.getMany(), 0] as [Issuance[], number];
    if (!canUseDocumentLinks) {
      results.forEach((item) => {
        (item as any).documents = [];
      });
    }
    return usePagination ? { data: results, total, page, limit } : results;
  }

  /**
   * Get a single issuance by ID
   */
  async getIssuance(id: string): Promise<Issuance> {
    const canUseDocumentLinks = await this.canUseDocumentLinks();
    const relations = [
      'domains',
      'sources',
      'outgoingRelationships',
      'outgoingRelationships.targetIssuance',
      'incomingRelationships',
      'incomingRelationships.sourceIssuance',
      'lifecycleHistory',
      'assessments',
      'assessments.evidence',
      'assessments.remediationActions',
      'recommendations',
      'registerDecisionHistory',
    ];
    if (canUseDocumentLinks) relations.push('documents');
    const issuance = await this.issuanceRepo.findOne({ where: { id }, relations });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    if (!canUseDocumentLinks) {
      (issuance as any).documents = [];
    }

    return issuance;
  }

  /**
   * Update an issuance
   */
  async updateIssuance(id: string, dto: UpdateIssuanceDto, userId?: number): Promise<Issuance> {
    this.validateArchitectureFields(dto);
    const issuance = await this.issuanceRepo.findOne({ where: { id }, relations: ['domains'] });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }
    const previousLifecycle = issuance.lifecycle_status;
    const nextLifecycle = dto.lifecycle_status || previousLifecycle;
    if (dto.lifecycle_status && dto.lifecycle_status !== previousLifecycle && !dto.status_reason?.trim()) {
      throw new BadRequestException('Status Reason is required when changing Lifecycle Status');
    }

    const { domain_ids: domainIds, ...issuanceDto } = dto;
    const catalogData = { ...issuanceDto } as Record<string, any>;
    [
      'compliance_status',
      'evidence_location',
      'gap_summary',
      'action_required',
      'target_date',
      'last_review_date',
      'quarterly_readiness',
      'q1_compliance_status',
      'q2_compliance_status',
      'q3_compliance_status',
      'q4_compliance_status',
    ].forEach((key) => delete catalogData[key]);
    Object.assign(issuance, catalogData);
    if (domainIds !== undefined) {
      issuance.domains = await this.resolveDomains(
        domainIds,
        issuance.domains.map((domain) => domain.id),
      );
    }
    issuance.is_active = nextLifecycle === 'active';
    if (nextLifecycle !== 'active' && issuance.register_decision === 'included') {
      issuance.register_decision = 'excluded';
    } else if (
      nextLifecycle === 'active' &&
      previousLifecycle !== 'active' &&
      issuance.register_decision === 'excluded'
    ) {
      issuance.register_decision = 'pending';
    }
    await this.assertAmendmentTarget(
      id,
      issuance.is_amendment,
      issuance.amended_issuance_number,
    );

    if (issuance.register_decision === 'included') {
      if (issuance.lifecycle_status !== 'active') {
        throw new BadRequestException('Only an Active issuance can be included in an official register');
      }
      if (!['applicable', 'partially_applicable'].includes(issuance.applicability_status)) {
        throw new BadRequestException('Only Applicable or Partially Applicable records can be included');
      }
      if (!issuance.domains?.some((domain) => domain.isActive)) {
        throw new BadRequestException('At least one active compliance domain is required for inclusion');
      }
      const sourceCount = await this.sourceRepo.count({ where: { issuanceId: id } });
      if (!sourceCount && !issuance.source_url?.trim()) {
        throw new BadRequestException('An identifiable source is required for inclusion');
      }
    }
    await this.issuanceRepo.save(issuance);
    await this.syncLegacyAmendmentRelationship(issuance, userId);
    await this.syncPrimaryUrlSource(issuance);

    if (nextLifecycle !== previousLifecycle) {
      await this.lifecycleHistoryRepo.save(
        this.lifecycleHistoryRepo.create({
          issuanceId: id,
          fromStatus: previousLifecycle,
          toStatus: nextLifecycle,
          reason: dto.status_reason!.trim(),
          changedBy: userId || null,
        }),
      );
    }

    this.logger.log(`Updated issuance: ${id}`);
    return issuance;
  }

  /**
   * Delete an issuance
   */
  async deleteIssuance(id: string, userId?: number): Promise<void> {
    const issuance = await this.issuanceRepo.findOne({ where: { id } });
    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    if (issuance.lifecycle_status === 'draft') {
      const relatedCount = await this.relationshipRepo.count({
        where: [{ sourceIssuanceId: id }, { targetIssuanceId: id }],
      });
      const assessmentCount = await this.assessmentRepo.count({ where: { issuanceId: id } });
      if (relatedCount === 0 && assessmentCount === 0) {
        await this.issuanceRepo.delete(id);
        this.logger.log(`Deleted unused draft issuance: ${id}`);
        return;
      }
    }

    if (issuance.lifecycle_status === 'retired') {
      return;
    }

    const previous = issuance.lifecycle_status;
    issuance.lifecycle_status = 'retired';
    issuance.register_decision = 'excluded';
    issuance.status_reason = 'Retired through the Issuances management workflow';
    issuance.is_active = false;
    await this.issuanceRepo.save(issuance);
    await this.lifecycleHistoryRepo.save(
      this.lifecycleHistoryRepo.create({
        issuanceId: id,
        fromStatus: previous,
        toStatus: 'retired',
        reason: issuance.status_reason,
        changedBy: userId || null,
      }),
    );
    this.logger.log(`Retired issuance: ${id}`);
  }

  /**
   * Link a document to an issuance
   */
  async linkDocument(issuanceId: string, documentId: string): Promise<void> {
    const canUseDocumentLinks = await this.canUseDocumentLinks();
    if (!canUseDocumentLinks) {
      throw new BadRequestException(
        'Document-issuance linking is unavailable: document_issuances table does not exist in the current schema.',
      );
    }

    const issuance = await this.issuanceRepo.findOne({
      where: { id: issuanceId },
      relations: ['documents'],
    });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    const document = await this.documentRepo.findOne({
      where: { id: documentId, is_deleted: false },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.READY) {
      throw new BadRequestException('Only ready/compliant documents can be linked to issuances.');
    }

    // Add document if not already linked
    if (!(issuance.documents as any).find((d: any) => d.id === documentId)) {
      await this.issuanceRepo
        .createQueryBuilder()
        .relation(Issuance, 'documents')
        .of(issuanceId)
        .add(documentId);

      this.logger.log(`Linked document ${documentId} to issuance ${issuanceId}`);
    }
  }

  /**
   * Unlink a document from an issuance
   */
  async unlinkDocument(issuanceId: string, documentId: string): Promise<void> {
    const canUseDocumentLinks = await this.canUseDocumentLinks();
    if (!canUseDocumentLinks) {
      throw new BadRequestException(
        'Document-issuance linking is unavailable: document_issuances table does not exist in the current schema.',
      );
    }

    await this.issuanceRepo
      .createQueryBuilder()
      .relation(Issuance, 'documents')
      .of(issuanceId)
      .remove(documentId);

    this.logger.log(`Unlinked document ${documentId} from issuance ${issuanceId}`);
  }

  private ensureAllowedAttachment(file: Express.Multer.File): string {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    const fileName = file.originalname.toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx'];
    const isAllowed = allowed.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      throw new BadRequestException('Only PDF, DOC, and DOCX attachments are allowed');
    }

    const isPdf = fileName.endsWith('.pdf') && file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    const isDocx =
      fileName.endsWith('.docx') &&
      file.buffer.length >= 4 &&
      file.buffer[0] === 0x50 &&
      file.buffer[1] === 0x4b;
    const oleHeader = Buffer.from('d0cf11e0a1b11ae1', 'hex');
    const isDoc =
      fileName.endsWith('.doc') &&
      file.buffer.length >= oleHeader.length &&
      file.buffer.subarray(0, oleHeader.length).equals(oleHeader);
    if (!isPdf && !isDocx && !isDoc) {
      throw new BadRequestException('The attachment content does not match its PDF, DOC, or DOCX extension');
    }
    if (isPdf) return 'application/pdf';
    if (isDocx) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/msword';
  }

  async uploadAttachment(id: string, file: Express.Multer.File): Promise<Issuance> {
    const verifiedMimeType = this.ensureAllowedAttachment(file);

    const issuance = await this.issuanceRepo.findOne({ where: { id } });
    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const duplicate = await this.sourceRepo.findOne({ where: { sha256 } });
    if (duplicate && duplicate.issuanceId !== id) {
      throw new ConflictException(
        `This file already exists as a source of issuance ${duplicate.issuanceId}`,
      );
    }

    issuance.attachment_file_name = file.originalname;
    issuance.attachment_mime_type = verifiedMimeType;
    issuance.attachment_blob = file.buffer;
    issuance.attachment_uploaded_at = new Date();

    await this.issuanceRepo.save(issuance);
    if (!issuance.source_url) await this.sourceRepo.update({ issuanceId: id }, { isPrimary: false });
    const source =
      duplicate ||
      this.sourceRepo.create({
        issuanceId: id,
        sourceType: 'uploaded_copy',
      });
    source.originalFileName = file.originalname;
    source.mimeType = verifiedMimeType;
    source.fileSize = file.size;
    source.sha256 = sha256;
    source.fileBlob = file.buffer;
    source.isPrimary = !issuance.source_url;
    await this.sourceRepo.save(source);
    this.logger.log(`Uploaded attachment for issuance: ${id}`);
    return issuance;
  }

  async deleteAttachment(id: string): Promise<void> {
    const issuance = await this.issuanceRepo
      .createQueryBuilder('issuance')
      .addSelect('issuance.attachment_blob')
      .where('issuance.id = :id', { id })
      .getOne();
    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    if (!issuance.attachment_blob || !issuance.attachment_file_name) {
      throw new NotFoundException('Attachment not found for this issuance');
    }

    const attachmentSha256 = createHash('sha256').update(issuance.attachment_blob).digest('hex');
    const source = await this.sourceRepo.findOne({
      where: { issuanceId: id, sourceType: 'uploaded_copy', sha256: attachmentSha256 },
    });
    const otherSourceCount = await this.sourceRepo
      .createQueryBuilder('source')
      .where('source.issuanceId = :id', { id })
      .andWhere(source ? 'source.id <> :sourceId' : '1 = 1', source ? { sourceId: source.id } : {})
      .getCount();
    if (issuance.register_decision === 'included' && otherSourceCount === 0) {
      throw new BadRequestException(
        'Add another identifiable source before removing the attachment from an included issuance',
      );
    }

    issuance.attachment_file_name = null;
    issuance.attachment_mime_type = null;
    issuance.attachment_blob = null;
    issuance.attachment_uploaded_at = null;

    await this.issuanceRepo.save(issuance);
    if (source) await this.sourceRepo.remove(source);

    const primaryCount = await this.sourceRepo.count({ where: { issuanceId: id, isPrimary: true } });
    if (primaryCount === 0) {
      const fallback = await this.sourceRepo.findOne({
        where: { issuanceId: id },
        order: { updatedAt: 'DESC' },
      });
      if (fallback) {
        fallback.isPrimary = true;
        await this.sourceRepo.save(fallback);
        if (fallback.url) await this.issuanceRepo.update({ id }, { source_url: fallback.url });
      }
    }
    this.logger.log(`Deleted attachment for issuance: ${id}`);
  }

  async getAttachment(id: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const issuance = await this.issuanceRepo
      .createQueryBuilder('issuance')
      .addSelect('issuance.attachment_blob')
      .where('issuance.id = :id', { id })
      .getOne();

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    if (!issuance.attachment_blob || !issuance.attachment_file_name) {
      throw new NotFoundException('Attachment not found for this issuance');
    }

    return {
      buffer: issuance.attachment_blob,
      fileName: issuance.attachment_file_name,
      mimeType: issuance.attachment_mime_type || 'application/octet-stream',
    };
  }

  async findDuplicateCandidates(input: {
    issuance_number?: string;
    title?: string;
    issuing_authority?: string;
    source_url?: string;
  }): Promise<Array<{ id: string; issuance_number: string; title: string; reason: string; blocking: boolean }>> {
    const rows = await this.issuanceRepo.find();
    const number = this.normalizeComparable(input.issuance_number);
    const title = this.normalizeComparable(input.title);
    const authority = this.normalizeComparable(input.issuing_authority);
    const url = (input.source_url || '').trim().toLowerCase().replace(/\/$/, '');

    return rows.flatMap((row) => {
      const reasons: string[] = [];
      let blocking = false;
      if (number && this.normalizeComparable(row.issuance_number) === number) {
        reasons.push('same normalized issuance number');
        blocking = true;
      }
      if (url && (row.source_url || '').trim().toLowerCase().replace(/\/$/, '') === url) {
        reasons.push('same source URL');
      }
      if (
        title &&
        this.normalizeComparable(row.title) === title &&
        (!authority || this.normalizeComparable(row.issuing_authority) === authority)
      ) {
        reasons.push('same title and issuing authority');
        blocking = true;
      }
      return reasons.length
        ? [{ id: row.id, issuance_number: row.issuance_number, title: row.title, reason: reasons.join('; '), blocking }]
        : [];
    });
  }

  async listDomains(includeInactive = false): Promise<ComplianceDomain[]> {
    return this.domainRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async createDomain(dto: {
    code: string;
    name: string;
    description?: string;
    sortOrder?: number;
  }): Promise<ComplianceDomain> {
    const code = dto.code.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!code || !dto.name?.trim()) throw new BadRequestException('Domain code and name are required');
    const existing = await this.domainRepo.findOne({ where: [{ code }, { name: dto.name.trim() }] });
    if (existing) throw new ConflictException('Compliance domain already exists');
    return this.domainRepo.save(
      this.domainRepo.create({
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        sortOrder: Number(dto.sortOrder) || 0,
        isActive: true,
      }),
    );
  }

  async updateDomain(
    id: number,
    dto: Partial<{ name: string; description: string; sortOrder: number; isActive: boolean }>,
  ): Promise<ComplianceDomain> {
    const domain = await this.domainRepo.findOne({ where: { id } });
    if (!domain) throw new NotFoundException('Compliance domain not found');
    if (dto.isActive === false && domain.isActive) {
      const rows = await this.dataSource.query(
        `SELECT COUNT(*) AS affected
         FROM issuances i
         JOIN issuance_domains current_domain
           ON current_domain.issuance_id = i.id AND current_domain.domain_id = ?
         WHERE i.register_decision = 'included'
           AND NOT EXISTS (
             SELECT 1
             FROM issuance_domains other_mapping
             JOIN compliance_domains other_domain ON other_domain.id = other_mapping.domain_id
             WHERE other_mapping.issuance_id = i.id
               AND other_mapping.domain_id <> ?
               AND other_domain.is_active = 1
           )`,
        [id, id],
      );
      if (Number(rows?.[0]?.affected || 0) > 0) {
        throw new BadRequestException(
          'Reassign affected included issuances to another active domain before deactivating this domain',
        );
      }
    }
    if (dto.name !== undefined) domain.name = dto.name.trim();
    if (dto.description !== undefined) domain.description = dto.description.trim() || null;
    if (dto.sortOrder !== undefined) domain.sortOrder = Number(dto.sortOrder) || 0;
    if (dto.isActive !== undefined) domain.isActive = Boolean(dto.isActive);
    return this.domainRepo.save(domain);
  }

  async addSource(
    issuanceId: string,
    dto: {
      sourceType: string;
      url?: string;
      sourceOrganization?: string;
      externalDocumentId?: string;
      isPrimary?: boolean;
    },
    userId?: number,
  ): Promise<IssuanceSource> {
    const issuance = await this.getIssuance(issuanceId);
    this.assertAllowed(dto.sourceType, SOURCE_TYPES, 'Source Type');
    if (!dto.url?.trim()) throw new BadRequestException('Source URL is required');
    const normalizedUrl = dto.url.trim().replace(/\/$/, '');
    const existing = await this.sourceRepo
      .createQueryBuilder('source')
      .where('source.issuanceId = :issuanceId', { issuanceId })
      .andWhere('LOWER(TRIM(TRAILING \'/\' FROM source.url)) = LOWER(:url)', {
        url: normalizedUrl,
      })
      .getOne();
    if (existing) {
      throw new ConflictException('This source URL is already linked to this issuance');
    }
    const shouldBePrimary = Boolean(dto.isPrimary) || !issuance.sources?.some((source) => source.isPrimary);
    if (shouldBePrimary) {
      await this.sourceRepo.update({ issuanceId }, { isPrimary: false });
    }
    const saved = await this.sourceRepo.save(
      this.sourceRepo.create({
        issuanceId,
        sourceType: dto.sourceType,
        url: normalizedUrl,
        sourceOrganization: dto.sourceOrganization?.trim() || null,
        externalDocumentId: dto.externalDocumentId?.trim() || null,
        isPrimary: shouldBePrimary,
        createdBy: userId || null,
      }),
    );
    if (shouldBePrimary) {
      await this.issuanceRepo.update({ id: issuanceId }, { source_url: normalizedUrl });
    }
    return saved;
  }

  async verifySource(issuanceId: string, sourceId: string, userId?: number) {
    await this.getIssuance(issuanceId);
    const source = await this.sourceRepo.findOne({ where: { id: sourceId, issuanceId } });
    if (!source) throw new NotFoundException('Issuance source not found');
    source.verifiedAt = new Date();
    source.verifiedBy = userId || null;
    return this.sourceRepo.save(source);
  }

  async addRelationship(
    issuanceId: string,
    dto: { targetIssuanceId: string; relationshipType: string; notes?: string },
    userId?: number,
  ): Promise<IssuanceRelationship> {
    if (issuanceId === dto.targetIssuanceId) {
      throw new BadRequestException('An issuance cannot be related to itself');
    }
    this.assertAllowed(dto.relationshipType, RELATIONSHIP_TYPES, 'Relationship Type');
    const [sourceIssuance, targetIssuance] = await Promise.all([
      this.getIssuance(issuanceId),
      this.getIssuance(dto.targetIssuanceId),
    ]);
    if (
      dto.relationshipType === 'amends' &&
      sourceIssuance.outgoingRelationships?.some(
        (relationship) =>
          relationship.relationshipType === 'amends' &&
          relationship.targetIssuanceId !== dto.targetIssuanceId,
      )
    ) {
      throw new ConflictException(
        'This issuance already amends another record. Update its amendment details instead.',
      );
    }
    const existing = await this.relationshipRepo.findOne({
      where: {
        sourceIssuanceId: issuanceId,
        targetIssuanceId: dto.targetIssuanceId,
        relationshipType: dto.relationshipType,
      },
    });
    if (existing) throw new ConflictException('This relationship already exists');
    const saved = await this.relationshipRepo.save(
      this.relationshipRepo.create({
        sourceIssuanceId: issuanceId,
        targetIssuanceId: dto.targetIssuanceId,
        relationshipType: dto.relationshipType,
        notes: dto.notes?.trim() || null,
        createdBy: userId || null,
      }),
    );
    if (dto.relationshipType === 'amends') {
      await this.issuanceRepo.update(
        { id: issuanceId },
        {
          is_amendment: true,
          amended_issuance_number: targetIssuance.issuance_number,
          ict_amendment_notes: dto.notes?.trim() || null,
        },
      );
    }
    return saved;
  }

  async removeRelationship(issuanceId: string, relationshipId: string): Promise<void> {
    const relationship = await this.relationshipRepo.findOne({
      where: { id: relationshipId, sourceIssuanceId: issuanceId },
      relations: ['targetIssuance'],
    });
    if (!relationship) throw new NotFoundException('Issuance relationship not found');
    await this.relationshipRepo.remove(relationship);
    if (relationship.relationshipType === 'amends') {
      await this.issuanceRepo.update(
        { id: issuanceId },
        {
          is_amendment: false,
          amended_issuance_number: null,
          ict_amendment_notes: null,
        },
      );
    }
  }

  async saveAssessment(
    issuanceId: string,
    dto: {
      year: number;
      quarter?: number;
      status: string;
      evidenceSummary?: string;
      gapSummary?: string;
      readinessStatus?: string;
    },
    userId?: number,
  ): Promise<IssuanceAssessment> {
    await this.getIssuance(issuanceId);
    const year = Number(dto.year);
    const quarter = dto.quarter == null ? null : Number(dto.quarter);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) {
      throw new BadRequestException('Assessment year is invalid');
    }
    if (quarter !== null && ![1, 2, 3, 4].includes(quarter)) {
      throw new BadRequestException('Assessment quarter must be between 1 and 4');
    }
    this.assertAllowed(dto.status || 'not_assessed', ASSESSMENT_STATUSES, 'Assessment Status');
    if (dto.readinessStatus) {
      this.assertAllowed(dto.readinessStatus, READINESS_STATUSES, 'Readiness Status');
    }
    let assessment = await this.assessmentRepo
      .createQueryBuilder('assessment')
      .where('assessment.issuanceId = :issuanceId', { issuanceId })
      .andWhere('assessment.year = :year', { year })
      .andWhere(
        quarter === null ? 'assessment.quarter IS NULL' : 'assessment.quarter = :quarter',
        quarter === null ? {} : { quarter },
      )
      .getOne();
    if (!assessment) assessment = this.assessmentRepo.create({ issuanceId, year, quarter });
    assessment.status = dto.status || 'not_assessed';
    assessment.evidenceSummary = dto.evidenceSummary?.trim() || null;
    assessment.gapSummary = dto.gapSummary?.trim() || null;
    assessment.readinessStatus = dto.readinessStatus?.trim() || null;
    assessment.assessedBy = userId || null;
    assessment.assessedAt = new Date();
    return this.assessmentRepo.save(assessment);
  }

  private async getAssessmentForIssuance(
    issuanceId: string,
    assessmentId: string,
  ): Promise<IssuanceAssessment> {
    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId, issuanceId },
      relations: ['evidence', 'remediationActions'],
    });
    if (!assessment) throw new NotFoundException('Assessment not found for this issuance');
    return assessment;
  }

  async listAssessmentEvidence(issuanceId: string, assessmentId: string) {
    await this.getAssessmentForIssuance(issuanceId, assessmentId);
    return this.assessmentEvidenceRepo.find({
      where: { assessmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async addAssessmentEvidence(
    issuanceId: string,
    assessmentId: string,
    dto: { label: string; url?: string; documentId?: string; documentVersionId?: string },
    userId?: number,
  ) {
    await this.getAssessmentForIssuance(issuanceId, assessmentId);
    const label = dto.label?.trim();
    const url = dto.url?.trim() || null;
    const documentId = dto.documentId?.trim() || null;
    const documentVersionId = dto.documentVersionId?.trim() || null;
    if (!label) throw new BadRequestException('Evidence label is required');
    if (!url && !documentId) {
      throw new BadRequestException('Evidence must include a document or an external link');
    }
    if (documentId) {
      const document = await this.documentRepo.findOne({ where: { id: documentId, is_deleted: false } });
      if (!document) throw new BadRequestException('Evidence document was not found');
      if (documentVersionId) {
        const version = await this.documentVersionRepo.findOne({
          where: { id: documentVersionId, document_id: documentId },
        });
        if (!version) throw new BadRequestException('Evidence version does not belong to the selected document');
      }
    } else if (documentVersionId) {
      throw new BadRequestException('A document is required when a document version is selected');
    }
    return this.assessmentEvidenceRepo.save(
      this.assessmentEvidenceRepo.create({
        assessmentId,
        label,
        url,
        documentId,
        documentVersionId,
        createdBy: userId || null,
      }),
    );
  }

  async removeAssessmentEvidence(issuanceId: string, assessmentId: string, evidenceId: string) {
    await this.getAssessmentForIssuance(issuanceId, assessmentId);
    const evidence = await this.assessmentEvidenceRepo.findOne({
      where: { id: evidenceId, assessmentId },
    });
    if (!evidence) throw new NotFoundException('Assessment evidence not found');
    await this.assessmentEvidenceRepo.remove(evidence);
  }

  async listRemediationActions(issuanceId: string, assessmentId: string) {
    await this.getAssessmentForIssuance(issuanceId, assessmentId);
    return this.remediationActionRepo.find({
      where: { assessmentId },
      order: { createdAt: 'ASC' },
    });
  }

  async addRemediationAction(
    issuanceId: string,
    assessmentId: string,
    dto: { action: string; owner?: string; targetDate?: string; status?: string },
  ) {
    await this.getAssessmentForIssuance(issuanceId, assessmentId);
    if (!dto.action?.trim()) throw new BadRequestException('Corrective action is required');
    const status = dto.status || 'open';
    this.assertAllowed(status, REMEDIATION_STATUSES, 'Corrective Action Status');
    return this.remediationActionRepo.save(
      this.remediationActionRepo.create({
        assessmentId,
        action: dto.action.trim(),
        owner: dto.owner?.trim() || null,
        targetDate: dto.targetDate || null,
        status,
        completedAt: status === 'completed' ? new Date() : null,
      }),
    );
  }

  async updateRemediationAction(
    issuanceId: string,
    assessmentId: string,
    actionId: string,
    dto: { action?: string; owner?: string; targetDate?: string | null; status?: string },
  ) {
    await this.getAssessmentForIssuance(issuanceId, assessmentId);
    const action = await this.remediationActionRepo.findOne({
      where: { id: actionId, assessmentId },
    });
    if (!action) throw new NotFoundException('Corrective action not found');
    if (dto.action !== undefined) {
      if (!dto.action.trim()) throw new BadRequestException('Corrective action is required');
      action.action = dto.action.trim();
    }
    if (dto.owner !== undefined) action.owner = dto.owner.trim() || null;
    if (dto.targetDate !== undefined) action.targetDate = dto.targetDate || null;
    if (dto.status !== undefined) {
      this.assertAllowed(dto.status, REMEDIATION_STATUSES, 'Corrective Action Status');
      action.status = dto.status;
      action.completedAt = dto.status === 'completed' ? action.completedAt || new Date() : null;
    }
    return this.remediationActionRepo.save(action);
  }

  async removeRemediationAction(issuanceId: string, assessmentId: string, actionId: string) {
    await this.getAssessmentForIssuance(issuanceId, assessmentId);
    const action = await this.remediationActionRepo.findOne({ where: { id: actionId, assessmentId } });
    if (!action) throw new NotFoundException('Corrective action not found');
    await this.remediationActionRepo.remove(action);
  }

  async decideRegisterInclusion(
    issuanceId: string,
    decision: 'included' | 'excluded',
    dto: { reason: string; applicabilityStatus?: string; domainIds?: number[] },
    userId?: number,
  ): Promise<Issuance> {
    const issuance = await this.issuanceRepo.findOne({ where: { id: issuanceId }, relations: ['domains'] });
    if (!issuance) throw new NotFoundException('Issuance not found');
    if (!dto.reason?.trim()) throw new BadRequestException('A decision reason is required');
    if (dto.applicabilityStatus) {
      this.assertAllowed(dto.applicabilityStatus, APPLICABILITY_STATUSES, 'Applicability Status');
      issuance.applicability_status = dto.applicabilityStatus;
    }
    if (dto.domainIds !== undefined) {
      issuance.domains = await this.resolveDomains(
        dto.domainIds,
        issuance.domains.map((domain) => domain.id),
      );
    }
    if (decision === 'included') {
      if (issuance.lifecycle_status !== 'active') {
        throw new BadRequestException('Only an Active issuance can be included in an official register');
      }
      if (!['applicable', 'partially_applicable'].includes(issuance.applicability_status)) {
        throw new BadRequestException('Only Applicable or Partially Applicable records can be included');
      }
      if (!issuance.domains.some((domain) => domain.isActive)) {
        throw new BadRequestException('At least one active compliance domain is required for inclusion');
      }
      const sourceCount = await this.sourceRepo.count({ where: { issuanceId } });
      if (!sourceCount && !issuance.source_url) {
        throw new BadRequestException('An identifiable source is required for inclusion');
      }
    }
    issuance.register_decision = decision;
    issuance.status_reason = dto.reason.trim();
    await this.issuanceRepo.save(issuance);
    await this.registerDecisionRepo.save(
      this.registerDecisionRepo.create({
        issuanceId,
        decision,
        applicabilityStatus: issuance.applicability_status,
        reason: dto.reason.trim(),
        decidedBy: userId || null,
      }),
    );

    const pending = await this.recommendationRepo.find({ where: { issuanceId, status: 'pending' } });
    if (pending.length) {
      pending.forEach((item) => {
        item.status = decision === 'included' ? 'accepted' : 'excluded';
        item.decidedBy = userId || null;
        item.decidedAt = new Date();
        item.decisionNote = dto.reason.trim();
      });
      await this.recommendationRepo.save(pending);
    }
    return this.getIssuance(issuanceId);
  }
}
