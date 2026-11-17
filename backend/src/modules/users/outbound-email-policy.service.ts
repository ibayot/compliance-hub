import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import { SecurityConfig } from './entities/security-config.entity';
import { User } from './entities/user.entity';
import { RoleCapability } from './entities/role-capability.entity';

export class OutboundEmailRecipientDto {
  @IsEmail() @MaxLength(255) recipientEmail: string;
  @IsOptional() @IsIn(['routine', 'security']) purpose?: 'routine' | 'security';
}

export type OutboundEmailDecision = {
  allowed: boolean;
  reason: 'restriction_disabled' | 'unit_allowed' | 'security_admin_exempt' | 'no_units_selected' | 'recipient_not_eligible' | 'unit_not_allowed' | 'policy_unavailable';
  recipientUserId?: number;
};

export type AuthorizedAccount = {
  id: number;
  email: string;
  role: string;
  staffId: string | null;
  active: boolean;
  units: Array<{ id: number; active: boolean }>;
};

type AccountAccessSnapshot = {
  user: AuthorizedAccount | null;
  decision: OutboundEmailDecision;
};

function databaseBoolean(value: unknown): boolean | null {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  return null;
}

function databaseJsonArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

@Injectable()
export class OutboundEmailPolicyService {
  constructor(
    @InjectRepository(SecurityConfig) private readonly configRepository: Repository<SecurityConfig>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  private getPolicy(): Promise<SecurityConfig | null> {
    return this.configRepository.findOne({
      where: { id: 1 },
      select: { id: true, outboundEmailUnitRestrictionEnabled: true, outboundEmailAllowedUnitIds: true },
    });
  }

  private async evaluateApproval(user: User, config: SecurityConfig, exemptSecurityManagers: boolean): Promise<OutboundEmailDecision> {
    if (exemptSecurityManagers) {
      // Read persisted authority: stale JWT claims or role-name assumptions cannot grant the exemption.
      const capability = await this.configRepository.manager.getRepository(RoleCapability).findOne({
        where: { roleValue: user.role }, select: { isSecuritySettingsAccess: true },
      });
      const grant: unknown = capability?.isSecuritySettingsAccess;
      if (grant === true || grant === 1) return { allowed: true, reason: 'security_admin_exempt', recipientUserId: user.id };
    }
    const allowedIds = config.outboundEmailAllowedUnitIds;
    if (!Array.isArray(allowedIds)) return { allowed: false, reason: 'policy_unavailable' };
    if (allowedIds.length === 0) return { allowed: false, reason: 'no_units_selected', recipientUserId: user.id };
    const allowed = user.units?.some(unit => unit.active && allowedIds.includes(unit.id)) === true;
    return { allowed, reason: allowed ? 'unit_allowed' : 'unit_not_allowed', recipientUserId: user.id };
  }

  async decideAccountAccess(userId: number): Promise<OutboundEmailDecision> {
    return (await this.readAccountAccess(userId)).decision;
  }

  /**
   * Load the current account and access policy in one narrow SQL statement.
   * This is used by the Users JWT guard and the other services' access check.
   * It deliberately selects no password, MFA, Google subject, or profile data.
   */
  private async readAccountAccess(userId: number): Promise<AccountAccessSnapshot> {
    const rows = await this.configRepository.createQueryBuilder('policy')
      .leftJoin(User, 'user', 'user.id = :userId', { userId })
      .leftJoin(
        'user.units',
        'unit',
        'policy.outboundEmailUnitRestrictionEnabled = :restrictionEnabled',
        { restrictionEnabled: true },
      )
      .leftJoin(
        RoleCapability,
        'capability',
        'policy.outboundEmailUnitRestrictionEnabled = :restrictionEnabled AND capability.roleValue = user.role',
        { restrictionEnabled: true },
      )
      .select('policy.id', 'policyId')
      .addSelect('policy.outboundEmailUnitRestrictionEnabled', 'restrictionEnabled')
      .addSelect('policy.outboundEmailAllowedUnitIds', 'allowedUnitIds')
      .addSelect('user.id', 'userId')
      .addSelect('user.email', 'userEmail')
      .addSelect('user.role', 'userRole')
      .addSelect('user.staffId', 'userStaffId')
      .addSelect('user.active', 'userActive')
      .addSelect('unit.id', 'unitId')
      .addSelect('unit.active', 'unitActive')
      .addSelect('capability.isSecuritySettingsAccess', 'securitySettingsAccess')
      .where('policy.id = :policyId', { policyId: 1 })
      .getRawMany<Record<string, unknown>>();

    if (rows.length === 0) {
      return {
        user: null,
        decision: { allowed: false, reason: 'policy_unavailable' },
      };
    }

    const first = rows[0];
    const restrictionEnabled = databaseBoolean(first.restrictionEnabled);
    if (restrictionEnabled === null) {
      return {
        user: null,
        decision: { allowed: false, reason: 'policy_unavailable' },
      };
    }

    const id = Number(first.userId);
    const activeValue = databaseBoolean(first.userActive);
    const user: AuthorizedAccount | null = Number.isSafeInteger(id) && id > 0 && activeValue !== null
      ? {
        id,
        email: String(first.userEmail ?? ''),
        role: String(first.userRole ?? ''),
        staffId: first.userStaffId == null ? null : String(first.userStaffId),
        active: activeValue,
        units: [],
      }
      : null;

    if (!user || !user.active) {
      return {
        user,
        decision: { allowed: false, reason: 'recipient_not_eligible' },
      };
    }

    const unitMap = new Map<number, boolean>();
    for (const row of rows) {
      const unitId = Number(row.unitId);
      const unitActive = databaseBoolean(row.unitActive);
      if (Number.isSafeInteger(unitId) && unitId > 0 && unitActive !== null) {
        unitMap.set(unitId, unitActive);
      }
    }
    user.units = [...unitMap.entries()].map(([unitId, active]) => ({ id: unitId, active }));

    if (!restrictionEnabled) {
      return {
        user,
        decision: { allowed: true, reason: 'restriction_disabled', recipientUserId: user.id },
      };
    }

    const hasSecuritySettingsAccess = first.securitySettingsAccess === true || first.securitySettingsAccess === 1;
    if (hasSecuritySettingsAccess) {
      return {
        user,
        decision: { allowed: true, reason: 'security_admin_exempt', recipientUserId: user.id },
      };
    }

    const allowedUnitIds = databaseJsonArray(first.allowedUnitIds);
    if (!allowedUnitIds) {
      return {
        user,
        decision: { allowed: false, reason: 'policy_unavailable' },
      };
    }
    if (allowedUnitIds.length === 0) {
      return {
        user,
        decision: { allowed: false, reason: 'no_units_selected', recipientUserId: user.id },
      };
    }

    const allowed = user.units.some((unit) => unit.active && allowedUnitIds.includes(unit.id));
    return {
      user,
      decision: {
        allowed,
        reason: allowed ? 'unit_allowed' : 'unit_not_allowed',
        recipientUserId: user.id,
      },
    };
  }

  /** Revalidate and return only the current identity projection used by JWT guards. */
  async authorizeRequestAccount(userId: number): Promise<AuthorizedAccount> {
    let snapshot: AccountAccessSnapshot;
    try {
      snapshot = await this.readAccountAccess(userId);
    } catch {
      throw new ServiceUnavailableException('Application access could not be verified. Please try again.');
    }

    if (snapshot.decision.reason === 'policy_unavailable') {
      this.assertDecisionAllowed(snapshot.decision);
    }
    if (!snapshot.user || !snapshot.user.active) {
      throw new UnauthorizedException('Account not found or has been deactivated');
    }
    this.assertDecisionAllowed(snapshot.decision);
    return snapshot.user;
  }

  async assertAccountAccess(userId: number): Promise<void> {
    let decision: OutboundEmailDecision;
    try { decision = await this.decideAccountAccess(userId); }
    catch { throw new ServiceUnavailableException('Application access could not be verified. Please try again.'); }
    this.assertDecisionAllowed(decision);
  }

  private assertDecisionAllowed(decision: OutboundEmailDecision): void {
    if (decision.reason === 'policy_unavailable') throw new ServiceUnavailableException('Application access could not be verified. Please try again.');
    if (!decision.allowed) throw new UnauthorizedException({
      statusCode: 401, code: 'UNIT_ACCESS_NOT_APPROVED',
      message: 'Application access is not approved for your account. Please contact your administrator.',
    });
  }

  async decide(recipientEmail: string, purpose: 'routine' | 'security' = 'routine'): Promise<OutboundEmailDecision> {
    const config = await this.getPolicy();
    if (!config) return { allowed: false, reason: 'policy_unavailable' };
    if (config.outboundEmailUnitRestrictionEnabled === false) return { allowed: true, reason: 'restriction_disabled' };
    if (config.outboundEmailUnitRestrictionEnabled !== true || !Array.isArray(config.outboundEmailAllowedUnitIds)) return { allowed: false, reason: 'policy_unavailable' };
    const allowedIds = config.outboundEmailAllowedUnitIds;
    if (allowedIds.length === 0 && purpose !== 'security') return { allowed: false, reason: 'no_units_selected' };
    const email = recipientEmail.trim().toLowerCase();
    // Exact single-mailbox lookup; display names, comma lists and unknown recipients
    // cannot be used to smuggle another destination through a unit decision.
    const users = await this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.units', 'unit')
      .where('LOWER(user.email) = :email', { email })
      .andWhere('user.active = :active', { active: true })
      .getMany();
    if (users.length !== 1) return { allowed: false, reason: 'recipient_not_eligible' };
    return this.evaluateApproval(users[0], config, purpose === 'security');
  }
}
