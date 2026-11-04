import { createHmac, timingSafeEqual } from 'crypto';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from './entities/user.entity';

export function assertMfaRecoveryAuthority(actor: any, target: any, actorCap: any, targetCap: any): void {
  if (!actor?.active || !target?.active || actor.id === target.id) throw new ForbiddenException('MFA recovery requires another active account manager.');
  const elevated = Boolean(actorCap?.isUserManagementRolesManage);
  const admin = Boolean(actorCap?.isUserManagementAdmin);
  const limited = Boolean(actorCap?.isUserManagementView);
  if (!elevated && !admin && !limited) throw new ForbiddenException('You do not have permission to unlock MFA.');
  if (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Only another Super Administrator can recover this account.');
  if (!admin && !elevated && target.role !== UserRole.USER) throw new ForbiddenException('You can only unlock MFA for Regular Staff accounts.');
  if (admin && !elevated && (targetCap?.isUserManagementAdmin || target.role === UserRole.SUPER_ADMIN)) throw new ForbiddenException('You do not have permission to recover another administrator.');
}

export function mfaRecoveryRequired(user: any): boolean {
  return Number(user.mfaAttempts || 0) > 0 || Number(user.mfaChallengeAttempts || 0) > 0 || Boolean(user.mfaLockedUntil && new Date(user.mfaLockedUntil).getTime() > Date.now());
}

/** Opaque precondition; never expose a hash that permits offline OTP guessing. */
export function mfaRecoveryVersion(user: any): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ServiceUnavailableException('Account recovery is unavailable.');
  const timestamp = (value: any) => value ? new Date(value).toISOString() : null;
  return createHmac('sha256', secret).update(JSON.stringify([
    user.id, user.mfaCode, timestamp(user.mfaExpiresAt), user.mfaAttempts,
    user.mfaChallengeAttempts, timestamp(user.mfaLockedUntil), timestamp(user.updatedAt),
  ])).digest('hex');
}

export function matchesMfaRecoveryVersion(user: any, version: string): boolean {
  return /^[a-f0-9]{64}$/.test(version) && timingSafeEqual(Buffer.from(mfaRecoveryVersion(user), 'hex'), Buffer.from(version, 'hex'));
}
