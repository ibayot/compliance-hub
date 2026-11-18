import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/auth.interface';
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
    const user = await this.outboundEmailPolicy.authorizeRequestAccount(payload.sub, payload.jti);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      units: payload.units,
      staffId: user.staffId,
    };
  }
}
