import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateRoleDefinitionDto, UpdateRoleDefinitionDto, CreateUserDto, UpdateUserDto } from './dto';
import { Unit } from '../units/entities/unit.entity';
import { RoleDefinitionEntity } from './entities/role-definition.entity';

const DEFAULT_ROLE_DEFINITIONS: Array<Pick<RoleDefinitionEntity, 'value' | 'label' | 'description' | 'assignable' | 'isSystem'>> = [
  {
    value: UserRole.SUPER_ADMIN,
    label: 'Super Admin',
    description: 'Full system access: manage users, units, issuances, metrics, tickets, documents, and settings.',
    assignable: false,
    isSystem: true,
  },
  {
    value: UserRole.REVIEWER,
    label: 'Reviewer / Compliance Officer',
    description: 'Review and tag documents as compliant, non-compliant, or for revision. Manage issuances and tickets.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.FOCAL,
    label: 'Focal Person',
    description: 'Unit focal person responsible for uploading and submitting compliance documents on behalf of their unit.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.TECHNICIAN,
    label: 'Technician',
    description: 'Technical operations staff who assist in document preparation and submission.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.AUDITOR,
    label: 'Auditor',
    description: 'Read-only audit access to view documents, reviews, and compliance records for inspection purposes.',
    assignable: true,
    isSystem: true,
  },
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Unit)
    private readonly unitsRepository: Repository<Unit>,
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefinitionsRepository: Repository<RoleDefinitionEntity>,
  ) {
    this.ensureSchema().catch(() => undefined);
    this.ensureRoleDefinitions().catch(() => undefined);
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

  private async ensureRoleDefinitions() {
    const existing = await this.roleDefinitionsRepository.find();
    const existingByValue = new Set(existing.map((role) => role.value));
    const missing = DEFAULT_ROLE_DEFINITIONS.filter((role) => !existingByValue.has(role.value));

    if (missing.length > 0) {
      await this.roleDefinitionsRepository.save(
        missing.map((role) => this.roleDefinitionsRepository.create(role)),
      );
    }
  }

  async getRoles() {
    await this.ensureRoleDefinitions();
    return this.roleDefinitionsRepository.find({ order: { label: 'ASC' } });
  }

  async createRoleDefinition(dto: CreateRoleDefinitionDto) {
    const existing = await this.roleDefinitionsRepository.findOne({ where: { value: dto.value } });
    if (existing) {
      throw new ConflictException(`Role definition for '${dto.value}' already exists`);
    }

    const role = this.roleDefinitionsRepository.create({
      value: dto.value,
      label: dto.label,
      description: dto.description,
      assignable: dto.value === UserRole.SUPER_ADMIN ? false : (dto.assignable ?? true),
      isSystem: true,
    });

    return this.roleDefinitionsRepository.save(role);
  }

  async updateRoleDefinition(value: string, dto: UpdateRoleDefinitionDto) {
    const role = await this.roleDefinitionsRepository.findOne({ where: { value } });
    if (!role) {
      throw new NotFoundException(`Role definition '${value}' not found`);
    }

    if (dto.value && dto.value !== role.value) {
      throw new BadRequestException('Role code cannot be changed.');
    }

    if (dto.label !== undefined) role.label = dto.label;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.assignable !== undefined) {
      role.assignable = role.value === UserRole.SUPER_ADMIN ? false : dto.assignable;
    }

    return this.roleDefinitionsRepository.save(role);
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
