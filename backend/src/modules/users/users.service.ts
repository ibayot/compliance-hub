import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, AuthProvider } from './entities/user.entity';
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
    label: 'Focal Person (RICTMS Staff)',
    description: 'RICTMS staff member. Unit focal person responsible for uploading and submitting compliance documents on behalf of their unit. Default role for all admin-created accounts.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.TECHNICIAN,
    label: 'Technician (General)',
    description: 'General technical operations staff who assist in document preparation and submission.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.TECHNICIAN_DESKTOP,
    label: 'Technician — Desktop Support',
    description: 'Handles desktop/hardware support tickets: workstations, printers, peripherals, and hardware troubleshooting.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.TECHNICIAN_IT_SUPPORT,
    label: 'Technician — IT Support',
    description: 'Handles IT/software support tickets: software, network, internet connectivity, and system-level issues.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.TECHNICIAN_IT_STAFF,
    label: 'Technician — IT Staff (Level 1)',
    description: 'Entry-level IT support staff. Assists with basic software and connectivity issues under supervision of IT Support technicians.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.TECHNICIAN_DESKTOP_STAFF,
    label: 'Technician — Desktop Staff (Level 1)',
    description: 'Entry-level desktop support staff. Assists with basic hardware and peripheral issues under supervision of Desktop Support technicians.',
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
  {
    value: UserRole.USER,
    label: 'Regular User',
    description: 'External or non-staff user. Can submit help desk tickets and view their own ticket history. No access to compliance modules.',
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
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS position_full VARCHAR(255) NULL');
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(255) NULL');
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS ticket_main_focal TINYINT(1) NOT NULL DEFAULT 0');
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS ticket_technician TINYINT(1) NOT NULL DEFAULT 0');
      await queryRunner.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider ENUM('local','google') NOT NULL DEFAULT 'local'");
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) NULL');
      await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_sub ON users (google_sub)');
      // Extend the role enum to include new roles (safe: only adds values, never removes)
      await queryRunner.query(
        `ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','reviewer','focal','technician','technician_desktop','technician_it_support','technician_it_staff','technician_desktop_staff','auditor','user') NOT NULL DEFAULT 'focal'`,
      ).catch(() => undefined); // Catch if enum already has these values
      // Add last_login column for staff activity tracking
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login DATETIME NULL').catch(() => undefined);
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

    const isSystemRole = Object.values(UserRole).includes(dto.value as UserRole);
    const role = this.roleDefinitionsRepository.create({
      value: dto.value,
      label: dto.label,
      description: dto.description,
      assignable: dto.value === UserRole.SUPER_ADMIN ? false : (dto.assignable ?? true),
      isSystem: isSystemRole,
    });

    return this.roleDefinitionsRepository.save(role);
  }

  async updateRoleDefinition(value: string, dto: UpdateRoleDefinitionDto) {
    const role = await this.roleDefinitionsRepository.findOne({ where: { value } });
    if (!role) {
      throw new NotFoundException(`Role definition '${value}' not found`);
    }

    // Allow renaming the code only for custom (non-system) roles
    if (dto.value && dto.value !== role.value) {
      if (role.isSystem) {
        throw new BadRequestException('System role codes cannot be changed.');
      }
      const codeExists = await this.roleDefinitionsRepository.findOne({ where: { value: dto.value } });
      if (codeExists) {
        throw new ConflictException(`Role code '${dto.value}' is already in use.`);
      }
      role.value = dto.value;
    }

    if (dto.label !== undefined) role.label = dto.label;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.assignable !== undefined) {
      role.assignable = role.value === UserRole.SUPER_ADMIN ? false : dto.assignable;
    }

    return this.roleDefinitionsRepository.save(role);
  }

  async deleteRoleDefinition(value: string) {
    const role = await this.roleDefinitionsRepository.findOne({ where: { value } });
    if (!role) {
      throw new NotFoundException(`Role definition '${value}' not found`);
    }
    if (role.isSystem) {
      throw new BadRequestException(`System role '${value}' cannot be deleted. Only custom roles can be removed.`);
    }
    await this.roleDefinitionsRepository.remove(role);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      // If no password supplied, we're adding/updating an existing account (e.g. Google SSO walk-in)
      if (!createUserDto.password) {
        // Update role and profile fields, leave password unchanged
        existingUser.role = createUserDto.role ?? existingUser.role;
        if (createUserDto.firstName !== undefined) existingUser.firstName = createUserDto.firstName;
        if (createUserDto.lastName !== undefined) existingUser.lastName = createUserDto.lastName;
        if ((createUserDto as any).middleName !== undefined) existingUser.middleName = (createUserDto as any).middleName;
        if ((createUserDto as any).suffix !== undefined) existingUser.suffix = (createUserDto as any).suffix;
        if ((createUserDto as any).staffId !== undefined) existingUser.staffId = (createUserDto as any).staffId;
        if ((createUserDto as any).position !== undefined) existingUser.position = (createUserDto as any).position;
        if ((createUserDto as any).positionFull !== undefined) existingUser.positionFull = (createUserDto as any).positionFull;
        if ((createUserDto as any).designation !== undefined) existingUser.designation = (createUserDto as any).designation;
        if ((createUserDto as any).ticketMainFocal !== undefined) existingUser.ticketMainFocal = Boolean((createUserDto as any).ticketMainFocal);
        if ((createUserDto as any).ticketTechnician !== undefined) existingUser.ticketTechnician = Boolean((createUserDto as any).ticketTechnician);
        if (createUserDto.unitIds && createUserDto.unitIds.length > 0) {
          existingUser.units = await this.unitsRepository.find({ where: { id: In(createUserDto.unitIds) } });
        }
        return this.usersRepository.save(existingUser);
      }
      throw new ConflictException('User with this email already exists');
    }

    // New user must provide a password
    if (!createUserDto.password) {
      throw new BadRequestException('Password is required when creating a new account');
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
      positionFull: (createUserDto as any).positionFull,
      designation: (createUserDto as any).designation,
      ticketMainFocal: Boolean((createUserDto as any).ticketMainFocal),
      ticketTechnician: Boolean((createUserDto as any).ticketTechnician),
      authProvider: AuthProvider.LOCAL,
      googleSub: null,
      // Admin-created users are always RICTMS staff → default to FOCAL unless explicitly set
      role: createUserDto.role ?? UserRole.FOCAL,
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

  /** Record last login timestamp for staff activity tracking */
  async recordLogin(userId: number): Promise<void> {
    await this.usersRepository.update(userId, { lastLogin: new Date() } as Partial<User>);
  }

  /** Autocomplete: find registered emails that start with (or contain) a query string */
  async searchEmails(query: string, limit = 10): Promise<Array<{ id: number; email: string; firstName: string; lastName: string; role: string }>> {
    if (!query || query.trim().length < 2) return [];
    const clean = `%${query.trim().toLowerCase()}%`;
    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.role'])
      .where('LOWER(u.email) LIKE :q', { q: clean })
      .orderBy('u.email', 'ASC')
      .limit(limit)
      .getMany();
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
    }));
  }

  async findByGoogleSub(googleSub: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { googleSub },
      relations: ['units'],
    });
  }

  async linkGoogleIdentity(userId: number, googleSub: string): Promise<User> {
    const user = await this.findOne(userId);
    user.googleSub = googleSub;
    user.authProvider = AuthProvider.GOOGLE;
    return await this.usersRepository.save(user);
  }

  async createGoogleUser(payload: {
    email: string;
    firstName?: string;
    lastName?: string;
    googleSub: string;
    role?: UserRole;
  }): Promise<User> {
    const existingUser = await this.usersRepository.findOne({ where: { email: payload.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const randomPassword = `google-oauth-${payload.googleSub}-${Date.now()}`;
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const user = this.usersRepository.create({
      email: payload.email,
      passwordHash,
      firstName: payload.firstName || 'Google',
      lastName: payload.lastName || 'User',
      role: payload.role || UserRole.FOCAL,
      authProvider: AuthProvider.GOOGLE,
      googleSub: payload.googleSub,
      ticketMainFocal: false,
      ticketTechnician: false,
      units: [],
    });

    return await this.usersRepository.save(user);
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
    if (dto.positionFull !== undefined) user.positionFull = dto.positionFull;
    if (dto.designation !== undefined) user.designation = dto.designation;
    if (dto.ticketMainFocal !== undefined) user.ticketMainFocal = Boolean(dto.ticketMainFocal);
    if (dto.ticketTechnician !== undefined) user.ticketTechnician = Boolean(dto.ticketTechnician);
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
