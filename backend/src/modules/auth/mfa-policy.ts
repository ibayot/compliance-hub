import { HttpException } from '@nestjs/common';

export const MFA_CODE_TTL_MS = 15 * 60 * 1000;
export const MFA_RESEND_INTERVAL_SECONDS = 60;

export type MfaFailureCode = 'MFA_INVALID_CODE' | 'MFA_CHALLENGE_EXHAUSTED' | 'MFA_CHALLENGE_UNAVAILABLE'
  | 'MFA_CHALLENGE_EXPIRED' | 'MFA_ACCOUNT_LOCKED' | 'MFA_ACCOUNT_UNAVAILABLE' | 'MFA_RESEND_COOLDOWN';

export function mfaFailure(statusCode: number, code: MfaFailureCode, message: string, details: Record<string, number> = {}): HttpException {
  return new HttpException({ statusCode, code, message, ...details }, statusCode);
}
