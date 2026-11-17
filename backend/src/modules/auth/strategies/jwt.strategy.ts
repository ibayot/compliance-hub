import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/auth.interface';
import { UsersService } from '../../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { OutboundEmailPolicyService } from '../../users/outbound-email-policy.service';
function getCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  return cookieHeader
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepo: Repository<TokenBlacklist>,
    private readonly outboundEmailPolicy: OutboundEmailPolicyService,
  ) {
    const accessCookieName = configService.get<string>('AUTH_ACCESS_COOKIE_NAME') as string;
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => getCookieValue(request?.headers?.cookie, accessCookieName),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      issuer: configService.get('JWT_ISSUER') || 'compliance-hub-api',
      audience: configService.get('JWT_AUDIENCE') || 'compliance-hub-client',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.isTemp) throw new UnauthorizedException('Complete MFA verification before accessing the application.');
    // Enforce server-side token revocation: if this token's jti has been blacklisted
    // (e.g., the user logged out), reject it immediately.
    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistRepo.findOne({
        where: { tokenJti: payload.jti },
      });
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked. Please log in again.');
      }
    }

    // The Users service combines the current user, active-unit, and persisted
    // capability checks into one narrow query. Keep the fallback for older
    // strategy adapters/test doubles; the registered service always provides
    // authorizeRequestAccount.
    const authorizeRequestAccount = (this.outboundEmailPolicy as any).authorizeRequestAccount;
    let user: any;
    if (typeof authorizeRequestAccount === 'function') {
      user = await authorizeRequestAccount.call(this.outboundEmailPolicy, payload.sub);
    } else {
      user = await this.usersService.findByIdSafe(payload.sub);
      if (!user || !user.active) {
        throw new UnauthorizedException('Account not found or has been deactivated');
      }
      await this.outboundEmailPolicy.assertAccountAccess(user.id);
    }

    if (!user || !user.active) {
      throw new UnauthorizedException('Account not found or has been deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      units: payload.units,
      staffId: user.staffId,
    };
  }
}
