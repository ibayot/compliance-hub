import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Unit } from '../units/entities/unit.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Unit)
    private readonly unitsRepository: Repository<Unit>,
  ) {
    this.ensureSchema().catch(() => undefined);
  }

  private async ensureSchema() {
    const queryRunner = this.usersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(255) NULL');
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS suffix VARCHAR(255) NULL');
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id VARCHAR(255) NULL');
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(255) NULL');
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(255) NULL');
    } finally {
      await queryRunner.release();
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Get units if provided
    let units: Unit[] = [];
    if (createUserDto.unitIds && createUserDto.unitIds.length > 0) {
      units = await this.unitsRepository.find({
        where: { id: In(createUserDto.unitIds) },
      });
    }

    const user = this.usersRepository.create({
      email: createUserDto.email,
      passwordHash,
      firstName: createUserDto.firstName,
      middleName: (createUserDto as any).middleName,
      lastName: createUserDto.lastName,
      suffix: (createUserDto as any).suffix,
      staffId: (createUserDto as any).staffId,
      position: (createUserDto as any).position,
      designation: (createUserDto as any).designation,
      role: createUserDto.role,
      units,
    });

    return await this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find({
      relations: ['units'],
      // Return all users (including inactive) so management UI can show/toggle them
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['units'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email },
      relations: ['units'],
    });
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await this.usersRepository.update({ id }, { passwordHash });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const dto = updateUserDto as any;

    // Update basic fields
    if (dto.email) user.email = dto.email;
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.suffix !== undefined) user.suffix = dto.suffix;
    if (dto.staffId !== undefined) user.staffId = dto.staffId;
    if (dto.position !== undefined) user.position = dto.position;
    if (dto.designation !== undefined) user.designation = dto.designation;
    if (dto.role) user.role = dto.role;
    if ((dto as any).active !== undefined) user.active = (dto as any).active;

    // Update units if provided
    if (dto.unitIds) {
      user.units = await this.unitsRepository.find({
        where: { id: In(dto.unitIds) },
      });
    }

    return await this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    user.active = false;
    await this.usersRepository.save(user);
  }
}
