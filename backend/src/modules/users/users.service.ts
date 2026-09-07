import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, AuthProvider } from './entities/user.entity';
import {
  CreateRoleDefinitionDto,
  UpdateRoleDefinitionDto,
  CreateUserDto,
  UpdateUserDto,
} from './dto';
import { Unit } from '../units/entities/unit.entity';
import { RoleDefinitionEntity } from './entities/role-definition.entity';
import { RoleCapability } from './entities/role-capability.entity';
import { SecurityConfig } from './entities/security-config.entity';
import { SecurityConfigService } from './security-config.service';
import { UserTrustedDevice } from './entities/user-trusted-device.entity';

const DEFAULT_ROLE_DEFINITIONS: Array<
  Pick<RoleDefinitionEntity, 'value' | 'label' | 'description' | 'assignable' | 'isSystem'> & {
  }
> = [
  // ── Core administrative roles ────────────────────────────────────────────
  {
    value: UserRole.SUPER_ADMIN,
    label: 'Super Administrator',
    description:
      'Full system access: manage users, units, issuances, metrics, tickets, documents, and settings.',
    assignable: false,
    isSystem: true,
  },
  {
    value: UserRole.SECTION_HEAD,
    label: 'Section Head',
    description:
      'Unit/section leader. Has access to KPI monitoring, reports, ticket assignment, and incident response statistics across their assigned units.',
    assignable: true,
    isSystem: true,
  },
  // ── Staff roles with focal-equivalent access ─────────────────────────────
  {
    value: UserRole.LEAD_INFRA,
    label: 'Lead Network & Infrastructure',
    description:
      'Leads the network and infrastructure team. Responsible for network architecture, server infrastructure, and ICT compliance documentation for their unit.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.SERVER_ADMIN,
    label: 'Server Administrator',
    description:
      'Manages server infrastructure and operations. Responsible for server compliance documentation and ICT system administration.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.DB_ADMIN,
    label: 'Database Administrator',
    description:
      'Manages database systems and operations. Responsible for database compliance documentation and data management policies.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.NETWORK_ADMIN,
    label: 'Network Administrator',
    description:
      'Manages network systems and connectivity. Responsible for network compliance documentation and infrastructure maintenance.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.PROJECT_MGR,
    label: 'Project Manager',
    description:
      'Manages ICT projects and deliverables. Responsible for project compliance documentation and team coordination.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.DEV_LEAD,
    label: 'Lead Developer',
    description:
      'Leads software development projects. Responsible for development compliance documentation and code quality standards.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.SQA_LEAD,
    label: 'Lead SQA',
    description:
      'Leads software quality assurance activities. Responsible for QA compliance documentation and testing standards.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.RECORDS_OFFICER,
    label: 'Records Officer',
    description:
      'Manages records and documentation. Responsible for records management compliance and document retention policies.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.HR_ID_OFFICER,
    label: 'HRIS & ID Officer',
    description:
      'Manages HR information systems and ID issuance. Responsible for HRIS compliance documentation and personnel data management.',
    assignable: true,
    isSystem: true,
  },
  // ── Compliance / review roles ────────────────────────────────────────────
  {
    value: UserRole.COMPLIANCE_OFFICER,
    label: 'Compliance Officer',
    description:
      'Reviews and tags documents as compliant, non-compliant, or for revision. Manages issuances, KPI monitoring, MoV artifacts, and compliance reports.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.CYBERSEC,
    label: 'Cybersecurity Officer',
    description:
      'Manages cybersecurity operations and incident response. Has compliance officer access plus cybersecurity and incident dashboard.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.INFOSEC,
    label: 'Information Security Officer',
    description:
      'Manages information security policies and incident response. Has compliance officer access plus information security and incident dashboard.',
    assignable: true,
    isSystem: true,
  },
  // ── Technician / support roles ───────────────────────────────────────────
  {
    value: UserRole.DESKTOP_SR,
    label: 'Senior Desktop Engineer',
    description:
      'Handles all desktop/hardware support tickets: workstations, printers, peripherals, and hardware troubleshooting. Sees all desktop support tickets.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.IT_SUPPORT_SR,
    label: 'Senior IT Support Specialist',
    description:
      'Handles all IT/software support tickets: software, network, internet connectivity, and system-level issues. Sees all IT support tickets.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.DESKTOP_JR,
    label: 'Junior Desktop Engineer',
    description:
      'Handles desktop/hardware support tickets assigned to them. Escalates complex issues to senior engineers.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.IT_SUPPORT_JR,
    label: 'IT Support Specialist',
    description:
      'Handles IT/software support tickets assigned to them. Escalates complex issues to senior specialists.',
    assignable: true,
    isSystem: true,
  },
  {
    value: UserRole.PANTAWID_ICT,
    label: 'Pantawid ICT Support',
    description:
      'Handles Pantawid Pamilyang Pilipino Program (4Ps) ICT support requests exclusively.',
    assignable: true,
    isSystem: true,
  },
  // ── End-user role ────────────────────────────────────────────────────────
  {
    value: UserRole.USER,
    label: 'Regular User',
    description:
      'External or non-staff user. Can submit help desk tickets and view their own ticket history. No access to compliance modules.',
    assignable: true,
    isSystem: true,
  },
];

@Injectable()
export class UsersService {
  private isDbBootstrapEnabled(): boolean {
    return String(process.env.DB_BOOTSTRAP ?? 'false').toLowerCase() === 'true';
  }

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Unit)
    private readonly unitsRepository: Repository<Unit>,
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefinitionsRepository: Repository<RoleDefinitionEntity>,
    @InjectRepository(RoleCapability)
    private readonly roleCapabilitiesRepository: Repository<RoleCapability>,
    @InjectRepository(SecurityConfig)
    private readonly configRepository: Repository<SecurityConfig>,
    @InjectRepository(UserTrustedDevice)
    private readonly trustedDeviceRepository: Repository<UserTrustedDevice>,
    private readonly securityConfigService: SecurityConfigService,
  ) {
    if (!this.isDbBootstrapEnabled()) {
      return;
    }

    this.ensureRoleDefinitions()
      .then(() => this.ensureRoleCapabilityRows())
      .catch(() => undefined);
  }

  private buildCapabilitySeed(role: RoleDefinitionEntity) {
    const roleValue = role.value;
    // New role definitions are safe by default. Existing effective permissions
    // come from the seeded/database capability row and are never inferred from
    // a role name in application code.
    return this.roleCapabilitiesRepository.create({ roleValue });
  }

  private async ensureRoleCapabilityRows() {
    const [roleDefs, existingCaps] = await Promise.all([
      this.roleDefinitionsRepository.find(),
      this.roleCapabilitiesRepository.find({ select: ['roleValue'] }),
    ]);

    const existingRoleValues = new Set(existingCaps.map((row) => row.roleValue));
    const missing = roleDefs.filter((role) => !existingRoleValues.has(role.value));

    if (missing.length > 0) {
      await this.roleCapabilitiesRepository.save(
        missing.map((role) => this.buildCapabilitySeed(role)),
      );
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
    });

    const savedRole = await this.roleDefinitionsRepository.save(role);
    await this.ensureRoleCapabilityRows();
    return savedRole;
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
      const codeExists = await this.roleDefinitionsRepository.findOne({
        where: { value: dto.value },
      });
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
const previousValue = value;
    const saved = await this.roleDefinitionsRepository.save(role);
    if (saved.value !== previousValue) {
      const previousCapability = await this.roleCapabilitiesRepository.findOne({
        where: { roleValue: previousValue },
      });
      if (previousCapability) {
        await this.roleCapabilitiesRepository.remove(previousCapability);
      }
      await this.ensureRoleCapabilityRows();
    }
    return saved;
  }

  async deleteRoleDefinition(value: string) {
    const role = await this.roleDefinitionsRepository.findOne({ where: { value } });
    if (!role) {
      throw new NotFoundException(`Role definition '${value}' not found`);
    }
    if (role.isSystem) {
      throw new BadRequestException(
        `System role '${value}' cannot be deleted. Only custom roles can be removed.`,
      );
    }
    await this.roleDefinitionsRepository.remove(role);
    const capability = await this.roleCapabilitiesRepository.findOne({ where: { roleValue: value } });
    if (capability) {
      await this.roleCapabilitiesRepository.remove(capability);
    }
  }

  private isMissingUserUnitAccessError(error: unknown): boolean {
    const message = String((error as any)?.message || '').toLowerCase();
    return (
      message.includes('user_unit_access') ||
      (message.includes("doesn't exist") && message.includes("table '"))
    );
  }

  private optionalText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async resolveUnitSelection(
    unitIds: unknown,
    role: string,
    required: boolean,
  ): Promise<Unit[]> {
    if (!Array.isArray(unitIds)) {
      throw new BadRequestException('Unit selection must contain one unit.');
    }
    if (unitIds.length > 1) {
      throw new BadRequestException('A user can be assigned to only one unit.');
    }
    if (required && unitIds.length !== 1) {
      throw new BadRequestException('A unit is required before saving this profile.');
    }
    if (unitIds.length === 0) return [];
    if (unitIds.some((id) => !Number.isInteger(id))) {
      throw new BadRequestException('The selected unit is invalid.');
    }

    const units = await this.unitsRepository.find({
      where: { id: In(unitIds as number[]), active: true },
    });
    if (units.length !== 1) {
      throw new BadRequestException('The selected unit is not available.');
    }

    const requiresReportorialUnit = role !== UserRole.USER;
    if (Boolean(units[0].hasReportorialRequirements) !== requiresReportorialUnit) {
      throw new BadRequestException(
        requiresReportorialUnit
          ? 'RICTMS users can only be assigned to reportorial units.'
          : 'Regular users can only be assigned to regular requester units.',
      );
    }

    return units;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      // If no password supplied, we're adding/updating an existing account (e.g. Google SSO walk-in)
      if (!createUserDto.password) {
        // Update profile fields only; role changes should go through the explicit admin update flow.
        if (createUserDto.firstName !== undefined) existingUser.firstName = this.optionalText(createUserDto.firstName) as any;
        if (createUserDto.lastName !== undefined) existingUser.lastName = this.optionalText(createUserDto.lastName) as any;
        if ((createUserDto as any).middleName !== undefined)
          existingUser.middleName = this.optionalText((createUserDto as any).middleName) as any;
        if ((createUserDto as any).suffix !== undefined)
          existingUser.suffix = this.optionalText((createUserDto as any).suffix) as any;
        if ((createUserDto as any).staffId !== undefined)
          existingUser.staffId = this.optionalText((createUserDto as any).staffId) as any;
        if ((createUserDto as any).position !== undefined)
          existingUser.position = this.optionalText((createUserDto as any).position) as any;
        if ((createUserDto as any).positionFull !== undefined)
          existingUser.positionFull = this.optionalText((createUserDto as any).positionFull) as any;
        if ((createUserDto as any).designation !== undefined)
          existingUser.designation = this.optionalText((createUserDto as any).designation) as any;
        if (createUserDto.autoAssignmentEligible !== undefined)
          existingUser.autoAssignmentEligible = createUserDto.autoAssignmentEligible;

        if (createUserDto.unitIds !== undefined) {
          existingUser.units = await this.resolveUnitSelection(
            createUserDto.unitIds,
            existingUser.role,
            false,
          );
        }
        return this.usersRepository.save(existingUser);
      }
      throw new ConflictException('User with this email already exists');
    }

    const roleDefinition = await this.roleDefinitionsRepository.findOne({
      where: { value: createUserDto.role },
    });
    if (!roleDefinition || !roleDefinition.assignable) {
      throw new BadRequestException('The selected role is not available for user creation.');
    }

    const firstName = createUserDto.firstName?.trim() || '';
    const lastName = createUserDto.lastName?.trim() || '';
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required when creating a new account');
    }

    // Admin-created accounts may omit a password; use the configured first-login password.
    const securityConfig = await this.securityConfigService.getConfig();
    const password = createUserDto.password?.trim() || securityConfig.defaultPassword;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Get one appropriately classified unit if provided. A new account may
    // remain unitless until the user completes the forced profile step.
    let units: Unit[] = [];
    if (createUserDto.unitIds !== undefined) {
      units = await this.resolveUnitSelection(createUserDto.unitIds, createUserDto.role, false);
    }

    const user = this.usersRepository.create({
      email: createUserDto.email,
      passwordHash,
      firstName,
      middleName: this.optionalText((createUserDto as any).middleName),
      lastName,
      suffix: this.optionalText((createUserDto as any).suffix),
      staffId: this.optionalText((createUserDto as any).staffId),
      position: this.optionalText((createUserDto as any).position),
      positionFull: this.optionalText((createUserDto as any).positionFull),
      designation: this.optionalText((createUserDto as any).designation),

      authProvider: AuthProvider.LOCAL,
      googleSub: null,
      // Admin-created users are always RICTMS staff → default to FOCAL unless explicitly set
      role: createUserDto.role as UserRole,
      autoAssignmentEligible: createUserDto.autoAssignmentEligible ?? true,
      units,
    } as any) as unknown as User;

    return await this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    const decorate = async (users: User[]): Promise<User[]> => {
      const capabilityRows = await this.roleCapabilitiesRepository.find({
        select: ['roleValue', 'isAttendanceEligible', 'isDesktop', 'isItSupport', 'isPantawidIct', 'isIssuancesManage', 'isDocumentsDelete', 'isUserManagementAdmin'],
      });
      const eligibleByRole = new Map(
        capabilityRows.map((row) => [row.roleValue, Boolean(row.isAttendanceEligible)]),
      );
      const technicianByRole = new Map(
        capabilityRows.map((row) => [
          row.roleValue,
          Boolean(row.isDesktop || row.isItSupport || row.isPantawidIct),
        ]),
      );
      return users.map((user) => ({
        ...user,
        attendanceEligible: eligibleByRole.get(user.role) ?? false,
        technicianEligible: technicianByRole.get(user.role) ?? false,
        isIssuancesManage: Boolean(capabilityRows.find((row) => row.roleValue === user.role)?.isIssuancesManage),
        isDocumentsDelete: Boolean(capabilityRows.find((row) => row.roleValue === user.role)?.isDocumentsDelete),
        isUserManagementAdmin: Boolean(capabilityRows.find((row) => row.roleValue === user.role)?.isUserManagementAdmin),
      })) as User[];
    };

    try {
      const users = await this.usersRepository.find({
        relations: ['units'],
        // Return all users (including inactive) so management UI can show/toggle them
      });
      return decorate(users);
    } catch (error) {
      if (!this.isMissingUserUnitAccessError(error)) {
        throw error;
      }

      const users = await this.usersRepository.find();
      return decorate(users.map((user) => ({ ...user, units: [] }) as User));
    }
  }

  /**
   * Returns only the fields needed by the ticket proxy requester selector.
   * This deliberately does not expose the full user-management payload.
   */
  async findTicketRequesters(): Promise<
    Array<Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'active'>>
  > {
    const users = await this.usersRepository.find({
      where: { active: true },
      order: { lastName: 'ASC', firstName: 'ASC', email: 'ASC' },
    });

    return users
      .filter((user) => user.role !== UserRole.SUPER_ADMIN)
      .map(({ id, email, firstName, lastName, role, active }) => ({
        id,
        email,
        firstName,
        lastName,
        role,
        active,
      }));
  }

  /** Look up a role definition by value string. */
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

  async updateMfaCode(userId: number, code: string, expiresAt: Date): Promise<void> {
    await this.usersRepository.update(userId, {
      mfaCode: code,
      mfaExpiresAt: expiresAt,
      mfaChallengeAttempts: 0,
    } as any);
  }

  async recordMfaFailure(
    userId: number,
    attempts: number,
    challengeAttempts: number,
    lockedUntil: Date | null,
    invalidateCode = false,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      mfaAttempts: attempts,
      mfaChallengeAttempts: challengeAttempts,
      mfaLockedUntil: lockedUntil,
      ...(invalidateCode ? { mfaCode: null, mfaExpiresAt: null } : {}),
    } as any);
  }

  async markMfaVerified(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
        mfaCode: null,
        mfaExpiresAt: null,
        mfaLastVerifiedAt: new Date(),
        mfaAttempts: 0,
        mfaChallengeAttempts: 0,
        mfaLockedUntil: null,
    } as any);
  }

  async findTrustedDevice(userId: number, deviceToken: string): Promise<UserTrustedDevice | null> {
    if (!deviceToken) return null;
    return this.trustedDeviceRepository.findOne({
      where: {
        userId,
        deviceToken,
      },
    });
  }

  async addTrustedDevice(userId: number, deviceToken: string): Promise<UserTrustedDevice> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const device = this.trustedDeviceRepository.create({
      userId,
      deviceToken,
      expiresAt,
    });
    return this.trustedDeviceRepository.save(device);
  }

  /** Units available for self-service profile selection. This is not the Units administration endpoint. */
  async getProfileUnits(role: string): Promise<Unit[]> {
    return this.unitsRepository.find({
      where: {
        active: true,
        hasReportorialRequirements: role !== UserRole.USER,
      },
      order: { name: 'ASC' },
    });
  }

  async validateStaffId(staffId: string): Promise<{ valid: boolean }> {
    const normalized = String(staffId ?? '').trim();
    if (!/^\d{6}$/.test(normalized)) {
      return { valid: false };
    }

    try {
      const rows = await this.usersRepository.query(
        'SELECT staff_id FROM vw_staff_id_list WHERE staff_id = ? LIMIT 1',
        [normalized],
      );
      return { valid: rows.length > 0 };
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('vw_staff_id_list') && message.includes("doesn't exist")) {
        throw new BadRequestException(
          'Staff ID validation is not available. Please contact the system administrator.',
        );
      }
      throw error;
    }
  }

  /** Autocomplete: find registered emails that start with (or contain) a query string */
  async searchEmails(
    query: string,
    limit = 10,
  ): Promise<
    Array<{ id: number; email: string; firstName: string; lastName: string; role: string }>
  > {
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
  async getFederatedUsers(): Promise<
    Array<{
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      active: boolean;
      unitIds: number[];
      unitNames: string[];
    }>
  > {
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
    defaultPassword?: string;
  }): Promise<User> {
    const existingUser = await this.usersRepository.findOne({ where: { email: payload.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordToHash =
      payload.defaultPassword || `google-oauth-${payload.googleSub}-${Date.now()}`;
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    const user = this.usersRepository.create({
      email: payload.email,
      passwordHash,
      firstName: payload.firstName || 'Google',
      lastName: payload.lastName || 'User',
      role: payload.role || UserRole.USER,
      authProvider: AuthProvider.GOOGLE,
      googleSub: payload.googleSub,

      units: [],
    });

    return await this.usersRepository.save(user);
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) return;

    // Use entity persistence so the password change is audited. The audit
    // redaction helper ensures the hash itself is never stored or returned.
    user.passwordHash = passwordHash;
    await this.usersRepository.save(user);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    options: { requireUnit?: boolean } = {},
  ): Promise<User> {
    const user = await this.findOne(id);
    const dto = updateUserDto as any;
    const targetRole = dto.role ?? user.role;

    // Update basic fields
    if (dto.email) user.email = dto.email;
    if (dto.staffId !== undefined) {
      if (dto.staffId?.trim()) {
        const existing = await this.usersRepository.findOne({ where: { staffId: dto.staffId } });
        if (existing && existing.id !== user.id) {
          throw new ConflictException('Staff ID is already in use by another account.');
        }
      }
      user.staffId = dto.staffId;
    }
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.suffix !== undefined) user.suffix = dto.suffix;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.sex !== undefined) user.sex = dto.sex;
    if (dto.position !== undefined) user.position = dto.position;
    if (dto.positionFull !== undefined) user.positionFull = dto.positionFull;
    if (dto.designation !== undefined) user.designation = dto.designation;

    if (dto.role !== undefined) user.role = dto.role;
    if ((dto as any).active !== undefined) user.active = (dto as any).active;
    if (dto.autoAssignmentEligible !== undefined) {
      user.autoAssignmentEligible = dto.autoAssignmentEligible;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.unitIds !== undefined) {
      user.units = await this.resolveUnitSelection(dto.unitIds, targetRole, Boolean(options.requireUnit));
    } else if (options.requireUnit) {
      user.units = await this.resolveUnitSelection(
        user.units?.map((unit) => unit.id) || [],
        targetRole,
        true,
      );
    } else if (dto.role !== undefined && user.units?.length) {
      // A role change must not leave an already-assigned user in the wrong
      // unit category. The administrator can submit the new role and unit together.
      user.units = await this.resolveUnitSelection(
        user.units.map((unit) => unit.id),
        targetRole,
        false,
      );
    } else if ((user.units?.length || 0) > 1) {
      throw new BadRequestException('A user can be assigned to only one unit.');
    }

    return await this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    user.active = false;
    await this.usersRepository.save(user);
  }

  async resetPassword(id: number): Promise<User> {
    const user = await this.findOne(id);
    const securityConfig = await this.securityConfigService.getConfig();
    const defaultPassword = securityConfig?.defaultPassword || 'Changeme123!@#';
    user.passwordHash = await bcrypt.hash(defaultPassword, 10);

    return await this.usersRepository.save(user);
  }
}
