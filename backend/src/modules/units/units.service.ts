import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitsRepository: Repository<Unit>,
  ) {}

  async create(createUnitDto: CreateUnitDto): Promise<Unit> {
    const name = createUnitDto.name?.trim();
    if (!name) throw new BadRequestException('Unit name is required');

    const existingUnit = await this.unitsRepository.findOne({
      where: { name },
    });

    if (existingUnit) {
      if (!existingUnit.active) {
        existingUnit.name = name;
        existingUnit.description = createUnitDto.description?.trim() || null;
        existingUnit.active = true;
        if (createUnitDto.hasReportorialRequirements !== undefined) {
          existingUnit.hasReportorialRequirements = createUnitDto.hasReportorialRequirements;
        }
        return await this.unitsRepository.save(existingUnit);
      }
      throw new ConflictException('Unit with this name already exists');
    }

    const unit = this.unitsRepository.create({
      ...createUnitDto,
      name,
      description: createUnitDto.description?.trim() || null,
    });
    return await this.unitsRepository.save(unit);
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<Unit[] | { data: Unit[]; total: number; page: number; limit: number }> {
    const where = { active: true };
    const order = { name: 'ASC' as const };

    // Preserve the existing array response for dropdowns and other callers
    // that intentionally request the complete active-unit list.
    if (page === undefined && limit === undefined) {
      return await this.unitsRepository.find({ where, order });
    }

    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page as number)) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit as number))) : 25;
    const [data, total] = await this.unitsRepository.findAndCount({
      where,
      order,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total, page: safePage, limit: safeLimit };
  }

  async findOne(id: number): Promise<Unit> {
    const unit = await this.unitsRepository.findOne({ where: { id } });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto): Promise<Unit> {
    const unit = await this.findOne(id);
    const name = updateUnitDto.name?.trim();
    if (updateUnitDto.name !== undefined) {
      if (!name) throw new BadRequestException('Unit name is required');
      const duplicate = await this.unitsRepository.findOne({ where: { name } });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Unit with this name already exists');
      }
    }

    Object.assign(unit, {
      ...updateUnitDto,
      ...(updateUnitDto.name !== undefined ? { name } : {}),
      ...(updateUnitDto.description !== undefined
        ? { description: updateUnitDto.description?.trim() || null }
        : {}),
    });
    return await this.unitsRepository.save(unit);
  }

  async remove(id: number): Promise<void> {
    const unit = await this.findOne(id);
    unit.active = false;
    await this.unitsRepository.save(unit);
  }
}
