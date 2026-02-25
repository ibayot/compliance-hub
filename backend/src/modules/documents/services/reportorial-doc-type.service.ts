import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportorialDocumentType, SubmissionFrequency } from '../entities/reportorial-document-type.entity';
import { CreateReportorialDocTypeDto } from '../dto/create-reportorial-doc-type.dto';
import { UpdateReportorialDocTypeDto } from '../dto/update-reportorial-doc-type.dto';

@Injectable()
export class ReportorialDocTypeService {
  constructor(
    @InjectRepository(ReportorialDocumentType)
    private readonly repo: Repository<ReportorialDocumentType>,
  ) {}

  async findAll(): Promise<ReportorialDocumentType[]> {
    return this.repo.find({ where: { active: true }, relations: ['unit'], order: { unit_id: 'ASC', display_name: 'ASC' } });
  }

  async findByUnit(unitId: number): Promise<ReportorialDocumentType[]> {
    return this.repo.find({
      where: { unit_id: unitId, active: true },
      relations: ['unit'],
      order: { display_name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ReportorialDocumentType> {
    const rec = await this.repo.findOne({ where: { id }, relations: ['unit'] });
    if (!rec) throw new NotFoundException(`Reportorial document type ${id} not found`);
    return rec;
  }

  async create(dto: CreateReportorialDocTypeDto): Promise<ReportorialDocumentType> {
    // Check uniqueness: same unit + base_name
    const existing = await this.repo.findOne({
      where: { unit_id: dto.unit_id, base_name: dto.base_name, active: true },
    });
    if (existing) {
      throw new ConflictException(`A document type with base_name "${dto.base_name}" already exists for this unit`);
    }

    const rec = this.repo.create({
      unit_id: dto.unit_id,
      base_name: dto.base_name,
      display_name: dto.display_name,
      description: dto.description,
      submission_frequency: dto.submission_frequency,
      active: true,
    });
    return this.repo.save(rec);
  }

  async update(id: number, dto: UpdateReportorialDocTypeDto): Promise<ReportorialDocumentType> {
    const rec = await this.findOne(id);

    if (dto.base_name !== undefined) rec.base_name = dto.base_name;
    if (dto.display_name !== undefined) rec.display_name = dto.display_name;
    if (dto.description !== undefined) rec.description = dto.description;
    if (dto.submission_frequency !== undefined) rec.submission_frequency = dto.submission_frequency;
    if (dto.active !== undefined) rec.active = dto.active;

    return this.repo.save(rec);
  }

  async remove(id: number): Promise<void> {
    const rec = await this.findOne(id);
    rec.active = false;
    await this.repo.save(rec);
  }

  /**
   * Compute the expected filename suffix for a given frequency and reference date.
   * - Monthly: YYYYMM (e.g., 202602 for Feb 2026)
   * - Quarterly: YYYYMM1-MM2 (e.g., 202601-03 for Q1 2026)
   * - Annual: YYYY (e.g., 2026)
   */
  static computePeriodSuffix(frequency: SubmissionFrequency, ref: Date = new Date()): string {
    const year = ref.getFullYear();
    const month = ref.getMonth() + 1; // 1-based

    if (frequency === SubmissionFrequency.MONTHLY) {
      return `${year}${String(month).padStart(2, '0')}`;
    }

    if (frequency === SubmissionFrequency.QUARTERLY) {
      const quarter = Math.ceil(month / 3);
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = quarter * 3;
      return `${year}${String(startMonth).padStart(2, '0')}-${String(endMonth).padStart(2, '0')}`;
    }

    // Annual
    return `${year}`;
  }

  /**
   * Compute the expected full filename (without extension) for a document type.
   */
  static computeExpectedFilename(docType: ReportorialDocumentType, ref: Date = new Date()): string {
    const suffix = ReportorialDocTypeService.computePeriodSuffix(docType.submission_frequency, ref);
    return `${docType.base_name}_${suffix}`;
  }
}
