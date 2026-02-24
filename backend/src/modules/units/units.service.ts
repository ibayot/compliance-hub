import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    const existingUnit = await this.unitsRepository.findOne({
      where: { name: createUnitDto.name },
    });

    if (existingUnit) {
      throw new ConflictException('Unit with this name already exists');
    }

    const unit = this.unitsRepository.create(createUnitDto);
    return await this.unitsRepository.save(unit);
  }

  async findAll(): Promise<Unit[]> {
    return await this.unitsRepository.find({
      where: { active: true },
    });
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
    Object.assign(unit, updateUnitDto);
    return await this.unitsRepository.save(unit);
  }

  async remove(id: number): Promise<void> {
    const unit = await this.findOne(id);
    unit.active = false;
    await this.unitsRepository.save(unit);
  }
}
