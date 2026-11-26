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
      passReqToCallback: true,
    });
  }

  async validate(request: { method: string; path: string }, payload: JwtPayload) {
    if (payload.isTemp) throw new UnauthorizedException('Complete MFA verification before accessing the application.');
    const demoSessionRoutes = new Set([
      'GET /api/auth/me', 'GET /api/auth/session', 'POST /api/auth/change-password',
      'POST /api/auth/reauthenticate', 'POST /api/auth/generate-random', 'POST /api/auth/generate-passphrase',
    ]);
    const demoRunId = demoSessionRoutes.has(`${request.method} ${request.path}`) ? payload.demoRunId : undefined;
    const user = await this.outboundEmailPolicy.authorizeRequestAccount(payload.sub, payload.jti, demoRunId);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      units: payload.units,
      staffId: user.staffId,
      ...(user.demo ? { demoRole: user.demo.role } : {}),
    };
  }
}
