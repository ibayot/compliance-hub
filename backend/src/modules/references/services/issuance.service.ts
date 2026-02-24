import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Issuance } from '../entities/issuance.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';

export interface CreateIssuanceDto {
  issuance_number: string;
  title: string;
  description?: string;
  issuing_authority: string;
  issue_date: Date;
  effectivity_date?: Date;
  source_url?: string;
}

export interface UpdateIssuanceDto {
  title?: string;
  description?: string;
  issuing_authority?: string;
  issue_date?: Date;
  effectivity_date?: Date;
  source_url?: string;
  is_active?: boolean;
}

export interface LinkDocumentDto {
  document_id: string;
}

@Injectable()
export class IssuanceService {
  private readonly logger = new Logger(IssuanceService.name);

  constructor(
    @InjectRepository(Issuance)
    private issuanceRepo: Repository<Issuance>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
  ) {}

  /**
   * Create a new issuance
   */
  async createIssuance(dto: CreateIssuanceDto): Promise<Issuance> {
    // Check if issuance number already exists
    const existing = await this.issuanceRepo.findOne({
      where: { issuance_number: dto.issuance_number },
    });

    if (existing) {
      throw new ConflictException('Issuance number already exists');
    }

    const issuance = this.issuanceRepo.create(dto);
    await this.issuanceRepo.save(issuance);

    this.logger.log(`Created issuance: ${dto.issuance_number}`);
    return issuance;
  }

  /**
   * Get all issuances with optional filters
   */
  async getIssuances(filters?: {
    authority?: string;
    search?: string;
    is_active?: boolean;
  }): Promise<Issuance[]> {
    const query = this.issuanceRepo
      .createQueryBuilder('issuance')
      .leftJoinAndSelect('issuance.documents', 'documents');

    if (filters?.authority) {
      query.andWhere('issuance.issuing_authority = :authority', {
        authority: filters.authority,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(issuance.issuance_number LIKE :search OR issuance.title LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.is_active !== undefined) {
      query.andWhere('issuance.is_active = :is_active', {
        is_active: filters.is_active,
      });
    }

    query.orderBy('issuance.issue_date', 'DESC');

    return query.getMany();
  }

  /**
   * Get a single issuance by ID
   */
  async getIssuance(id: string): Promise<Issuance> {
    const issuance = await this.issuanceRepo.findOne({
      where: { id },
      relations: ['documents', 'documents.unit'],
    });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    return issuance;
  }

  /**
   * Update an issuance
   */
  async updateIssuance(
    id: string,
    dto: UpdateIssuanceDto,
  ): Promise<Issuance> {
    const issuance = await this.issuanceRepo.findOne({ where: { id } });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    Object.assign(issuance, dto);
    await this.issuanceRepo.save(issuance);

    this.logger.log(`Updated issuance: ${id}`);
    return issuance;
  }

  /**
   * Delete an issuance
   */
  async deleteIssuance(id: string): Promise<void> {
    const result = await this.issuanceRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Issuance not found');
    }

    this.logger.log(`Deleted issuance: ${id}`);
  }

  /**
   * Link a document to an issuance
   */
  async linkDocument(issuanceId: string, documentId: string): Promise<void> {
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
    await this.issuanceRepo
      .createQueryBuilder()
      .relation(Issuance, 'documents')
      .of(issuanceId)
      .remove(documentId);

    this.logger.log(
      `Unlinked document ${documentId} from issuance ${issuanceId}`,
    );
  }
}
