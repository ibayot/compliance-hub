import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, AuthProvider } from './entities/user.entity';
import { CreateRoleDefinitionDto, UpdateRoleDefinitionDto, CreateUserDto, UpdateUserDto } from './dto';
import { Unit } from '../units/entities/unit.entity';
import { RoleDefinitionEntity } from './entities/role-definition.entity';

const DEFAULT_ROLE_DEFINITIONS: Array<Pick<RoleDefinitionEntity, 'value' | 'label' | 'description' | 'assignable' | 'isSystem'> & { roleCode?: string | null; technicianType?: string | null }> = [
  // ── Core administrative roles ────────────────────────────────────────────
  {
    value: UserRole.SUPER_ADMIN,
    label: 'Super Administrator',
    description: 'Full system access: manage users, units, issuances, metrics, tickets, documents, and settings.',
    assignable: false,
    isSystem: true,
    roleCode: null,
    technicianType: null,
  },
  {
    value: UserRole.SECTION_HEAD,
    label: 'Section Head',
    description: 'Unit/section leader. Has access to KPI monitoring, reports, ticket assignment, and incident response statistics across their assigned units.',
    assignable: true,
    isSystem: true,
    roleCode: 'section_head',
    technicianType: null,
  },
  // ── Staff roles with focal-equivalent access ─────────────────────────────
  {
    value: UserRole.LEAD_INFRA,
    label: 'Lead Network & Infrastructure',
    description: 'Leads the network and infrastructure team. Responsible for network architecture, server infrastructure, and ICT compliance documentation for their unit.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  {
    value: UserRole.SERVER_ADMIN,
    label: 'Server Administrator',
    description: 'Manages server infrastructure and operations. Responsible for server compliance documentation and ICT system administration.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  {
    value: UserRole.DB_ADMIN,
    label: 'Database Administrator',
    description: 'Manages database systems and operations. Responsible for database compliance documentation and data management policies.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  {
    value: UserRole.NETWORK_ADMIN,
    label: 'Network Administrator',
    description: 'Manages network systems and connectivity. Responsible for network compliance documentation and infrastructure maintenance.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  {
    value: UserRole.PROJECT_MGR,
    label: 'Project Manager',
    description: 'Manages ICT projects and deliverables. Responsible for project compliance documentation and team coordination.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  {
    value: UserRole.DEV_LEAD,
    label: 'Lead Developer',
    description: 'Leads software development projects. Responsible for development compliance documentation and code quality standards.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  {
    value: UserRole.SQA_LEAD,
    label: 'Lead SQA',
    description: 'Leads software quality assurance activities. Responsible for QA compliance documentation and testing standards.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  {
    value: UserRole.RECORDS_OFFICER,
    label: 'Records Officer',
    description: 'Manages records and documentation. Responsible for records management compliance and document retention policies.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  {
    value: UserRole.HR_ID_OFFICER,
    label: 'HRIS & ID Officer',
    description: 'Manages HR information systems and ID issuance. Responsible for HRIS compliance documentation and personnel data management.',
    assignable: true,
    isSystem: true,
    roleCode: 'focal',
    technicianType: null,
  },
  // ── Compliance / review roles ────────────────────────────────────────────
  {
    value: UserRole.COMPLIANCE_OFFICER,
    label: 'Compliance Officer',
    description: 'Reviews and tags documents as compliant, non-compliant, or for revision. Manages issuances, KPI monitoring, MoV artifacts, and compliance reports.',
    assignable: true,
    isSystem: true,
    roleCode: 'compliance_officer',
    technicianType: null,
  },
  {
    value: UserRole.CYBERSEC,
    label: 'Cybersecurity Officer',
    description: 'Manages cybersecurity operations and incident response. Has compliance officer access plus cybersecurity and incident dashboard.',
    assignable: true,
    isSystem: true,
    roleCode: 'cybersecurity_officer',
    technicianType: null,
  },
  {
    value: UserRole.INFOSEC,
    label: 'Information Security Officer',
    description: 'Manages information security policies and incident response. Has compliance officer access plus information security and incident dashboard.',
    assignable: true,
    isSystem: true,
    roleCode: 'cybersecurity_officer',
    technicianType: null,
  },
  // ── Technician / support roles ───────────────────────────────────────────
  {
    value: UserRole.DESKTOP_SR,
    label: 'Senior Desktop Engineer',
    description: 'Handles all desktop/hardware support tickets: workstations, printers, peripherals, and hardware troubleshooting. Sees all desktop support tickets.',
    assignable: true,
    isSystem: true,
    roleCode: null,
    technicianType: 'desktop_support',
  },
  {
    value: UserRole.IT_SUPPORT_SR,
    label: 'Senior IT Support Specialist',
    description: 'Handles all IT/software support tickets: software, network, internet connectivity, and system-level issues. Sees all IT support tickets.',
    assignable: true,
    isSystem: true,
    roleCode: null,
    technicianType: 'it_support',
  },
  {
    value: UserRole.DESKTOP_JR,
    label: 'Junior Desktop Engineer',
    description: 'Handles desktop/hardware support tickets assigned to them. Escalates complex issues to senior engineers.',
    assignable: true,
    isSystem: true,
    roleCode: null,
    technicianType: 'desktop_support',
  },
  {
    value: UserRole.IT_SUPPORT_JR,
    label: 'IT Support Specialist',
    description: 'Handles IT/software support tickets assigned to them. Escalates complex issues to senior specialists.',
    assignable: true,
    isSystem: true,
    roleCode: null,
    technicianType: 'it_support',
  },
  {
    value: UserRole.PANTAWID_ICT,
    label: 'Pantawid ICT Support',
    description: 'Handles Pantawid Pamilyang Pilipino Program (4Ps) ICT support requests exclusively.',
    assignable: true,
    isSystem: true,
    roleCode: null,
    technicianType: 'pantawid_ict_support',
  },
  // ── End-user role ────────────────────────────────────────────────────────
  {
    value: UserRole.USER,
    label: 'Regular User',
    description: 'External or non-staff user. Can submit help desk tickets and view their own ticket history. No access to compliance modules.',
    assignable: true,
    isSystem: true,
    roleCode: null,
    technicianType: null,
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
        `ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','reviewer','section_head','focal','technician','technician_desktop','technician_it_support','technician_it_staff','technician_desktop_staff','auditor','user','compliance_officer','cybersec','infosec','project_mgr','dev_lead','sqa_lead','lead_infra','server_admin','db_admin','network_admin','desktop_sr','it_support_sr','desktop_jr','it_support_jr','pantawid_ict','records_officer','hr_id_officer') NOT NULL DEFAULT 'focal'`,
      ).catch(() => undefined); // Catch if enum already has these values
      // Add last_login column for staff activity tracking
      await queryRunner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login DATETIME NULL').catch(() => undefined);
      // QA v0.6.4: Add technician_type to role_definitions for custom-role attendance tagging
      await queryRunner.query('ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS technician_type VARCHAR(30) NULL DEFAULT NULL').catch(() => undefined);
      // QA v0.6.10: Add role_code to role_definitions for platform feature-set routing
      await queryRunner.query('ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS role_code VARCHAR(50) NULL DEFAULT NULL').catch(() => undefined);
      // Seed roleCode for existing system roles
      await queryRunner.query(`UPDATE role_definitions SET role_code = 'compliance_officer' WHERE \`value\` = 'reviewer' AND role_code IS NULL`).catch(() => undefined);
      await queryRunner.query(`UPDATE role_definitions SET role_code = 'section_head' WHERE \`value\` = 'section_head' AND role_code IS NULL`).catch(() => undefined);
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
    // NOTE: ensureRoleDefinitions() is intentionally NOT called here.
    // Seeding runs once at startup (constructor). Calling it on every getRoles()
    // caused deleted custom roles to silently reappear on the next auto-refresh.
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
      technicianType: dto.technicianType ?? null,
      roleCode: dto.roleCode ?? null,
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
    if (dto.technicianType !== undefined) {
      role.technicianType = dto.technicianType ?? null;
    }
    if (dto.roleCode !== undefined) {
      role.roleCode = dto.roleCode ?? null;
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

  private isMissingUserUnitAccessError(error: unknown): boolean {
    const message = (error as any)?.message || '';
    return String(message).toLowerCase().includes('user_unit_access');
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
    try {
      return await this.usersRepository.find({
        relations: ['units'],
        // Return all users (including inactive) so management UI can show/toggle them
      });
    } catch (error) {
      if (!this.isMissingUserUnitAccessError(error)) {
        throw error;
      }

      const users = await this.usersRepository.find();
      return users.map((user) => ({ ...user, units: [] } as User));
    }
  }

  /** Look up a role definition by value string — returns null if not found. Used for roleCode lookups. */
  async findRoleDefinition(value: string): Promise<RoleDefinitionEntity | null> {
    return this.roleDefinitionsRepository.findOne({ where: { value } });
  }

  async findOne(id: number): Promise<User> {
    let user: User | null = null;

    try {
      user = await this.usersRepository.findOne({
        where: { id },
        relations: ['units'],
      });
    } catch (error) {
      if (!this.isMissingUserUnitAccessError(error)) {
        throw error;
      }

      user = await this.usersRepository.findOne({ where: { id } });
      if (user) {
        user.units = [];
      }
    }

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /** Returns user by id without throwing — returns null if not found. Used by JwtStrategy. */
  async findByIdSafe(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOne({
        where: { email },
        relations: ['units'],
      });
    } catch (error) {
      if (!this.isMissingUserUnitAccessError(error)) {
        throw error;
      }

      const user = await this.usersRepository.findOne({ where: { email } });
      if (user) {
        user.units = [];
      }
      return user;
    }
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

  /**
   * Cross-database compatible user listing.
   * Works with physical tables or passthrough views depending on split-db deployment state.
   */
  async getFederatedUsers(): Promise<Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    active: boolean;
    unitIds: number[];
    unitNames: string[];
  }>> {
    const rows = await this.usersRepository.query(`
      SELECT
        u.id,
        u.email,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.role,
        u.active,
        GROUP_CONCAT(DISTINCT uu.id ORDER BY uu.id SEPARATOR ',') AS unitIds,
        GROUP_CONCAT(DISTINCT uu.name ORDER BY uu.name SEPARATOR '|') AS unitNames
      FROM users u
      LEFT JOIN user_unit_access uua ON uua.user_id = u.id
      LEFT JOIN units uu ON uu.id = uua.unit_id
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.active
      ORDER BY u.last_name ASC, u.first_name ASC
    `);

    return (rows || []).map((row: any) => ({
      id: Number(row.id),
      email: String(row.email || ''),
      firstName: String(row.firstName || ''),
      lastName: String(row.lastName || ''),
      role: String(row.role || ''),
      active: Boolean(row.active),
      unitIds: String(row.unitIds || '')
        .split(',')
        .filter((v) => v !== '')
        .map((v) => Number(v)),
      unitNames: String(row.unitNames || '')
        .split('|')
        .filter((v) => v !== ''),
    }));
  }

  async findByGoogleSub(googleSub: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOne({
        where: { googleSub },
        relations: ['units'],
      });
    } catch (error) {
      if (!this.isMissingUserUnitAccessError(error)) {
        throw error;
      }

      const user = await this.usersRepository.findOne({ where: { googleSub } });
      if (user) {
        user.units = [];
      }
      return user;
    }
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
