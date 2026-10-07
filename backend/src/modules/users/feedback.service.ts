import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Feedback } from './entities/feedback.entity';
import { FeedbackAttachment } from './entities/feedback-attachment.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { RoleCapabilitiesService } from './role-capabilities.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(FeedbackAttachment)
    private readonly attachmentRepo: Repository<FeedbackAttachment>,
    private readonly roleCapabilities: RoleCapabilitiesService,
  ) {}

  async create(userId: number | null, dto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = this.feedbackRepo.create({
      suggestion: dto.suggestion,
      submitterId: userId || null,
      status: 'pending',
    });
    return this.feedbackRepo.save(feedback);
  }

  async findAll(
    status?: 'all' | 'pending' | 'accepted' | 'rejected',
    page = 1,
    limit = 10,
  ): Promise<{ data: Feedback[]; total: number }> {
    const query = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.submitter', 'submitter')
      .leftJoinAndSelect('feedback.actedBy', 'actedBy')
      .leftJoinAndSelect('feedback.attachments', 'attachments')
      .orderBy('feedback.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status && status !== 'all') {
      query.andWhere('feedback.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async updateStatus(id: number, adminId: number, dto: UpdateFeedbackStatusDto): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found.`);
    }

    feedback.status = dto.status;
    feedback.actedById = adminId;
    return this.feedbackRepo.save(feedback);
  }

  private detectImageMime(buffer: Buffer): string | null {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
      return 'image/png';
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }
    return null;
  }

  async addAttachments(
    feedbackId: number,
    userId: number,
    files: Express.Multer.File[],
  ): Promise<FeedbackAttachment[]> {
    const feedback = await this.feedbackRepo.findOne({ where: { id: feedbackId } });
    if (!feedback) throw new NotFoundException('Feedback not found');
    if (feedback.submitterId !== userId) {
      throw new ForbiddenException('Only the feedback submitter may add attachments');
    }
    if (!files?.length) throw new BadRequestException('At least one image is required');

    const existingCount = await this.attachmentRepo.count({ where: { feedbackId } });
    if (existingCount + files.length > 5) {
      throw new BadRequestException('A suggestion may contain up to 5 images');
    }

    const attachments = files.map((file) => {
      const detectedMime = this.detectImageMime(file.buffer);
      if (!detectedMime || !['image/jpeg', 'image/png', 'image/webp'].includes(detectedMime)) {
        throw new BadRequestException('Only valid JPEG, PNG, and WebP images are allowed');
      }
      return this.attachmentRepo.create({
        feedbackId,
        originalFileName: file.originalname,
        mimeType: detectedMime,
        fileSize: file.size,
        sha256: createHash('sha256').update(file.buffer).digest('hex'),
        fileBlob: file.buffer,
      });
    });
    return this.attachmentRepo.save(attachments);
  }

  async getAttachment(
    attachmentId: string,
    userId: number,
    role: string,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const attachment = await this.attachmentRepo
      .createQueryBuilder('attachment')
      .addSelect('attachment.fileBlob')
      .leftJoinAndSelect('attachment.feedback', 'feedback')
      .where('attachment.id = :attachmentId', { attachmentId })
      .getOne();
    if (!attachment) throw new NotFoundException('Feedback attachment not found');
    const canReview = this.roleCapabilities.isTicketSettingsFocal(role);
    if (attachment.feedback.submitterId !== userId && !canReview) {
      throw new ForbiddenException('You cannot view this feedback attachment');
    }
    return {
      buffer: attachment.fileBlob,
      mimeType: attachment.mimeType,
      fileName: attachment.originalFileName,
    };
  }
}
