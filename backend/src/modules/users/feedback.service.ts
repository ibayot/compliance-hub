import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
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
}
