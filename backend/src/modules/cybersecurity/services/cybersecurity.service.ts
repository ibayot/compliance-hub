import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CybersecurityMetric, MetricType } from '../entities/cybersecurity-metric.entity';

@Injectable()
export class CybersecurityService {
  constructor(
    @InjectRepository(CybersecurityMetric)
    private metricRepository: Repository<CybersecurityMetric>,
  ) {}

  async findAll(): Promise<CybersecurityMetric[]> {
    return await this.metricRepository.find({
      where: { is_active: true },
      order: { metric_type: 'ASC' },
    });
  }

  async findOne(id: number): Promise<CybersecurityMetric | null> {
    return await this.metricRepository.findOne({ where: { id } });
  }

  async findByType(type: MetricType): Promise<CybersecurityMetric | null> {
    return await this.metricRepository.findOne({ where: { metric_type: type } });
  }

  async create(createDto: Partial<CybersecurityMetric>): Promise<CybersecurityMetric> {
    const metric = this.metricRepository.create(createDto);
    return await this.metricRepository.save(metric);
  }

  async update(
    id: number,
    updateDto: Partial<CybersecurityMetric>,
  ): Promise<CybersecurityMetric | null> {
    await this.metricRepository.update(id, updateDto);
    return await this.findOne(id);
  }

  async updateByType(
    type: MetricType,
    updateDto: Partial<CybersecurityMetric>,
  ): Promise<CybersecurityMetric> {
    const metric = await this.findByType(type);
    if (!metric) {
      return await this.create({ ...updateDto, metric_type: type });
    }
    const updated = await this.update(metric.id, updateDto);
    if (!updated) {
      throw new Error('Failed to update metric');
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.metricRepository.delete(id);
  }
}
