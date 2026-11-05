import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersHttpClient } from '../common/http-clients/users.http-client';
function getCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  return cookieHeader
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1) ?? null;
}

@Injectable()
export class TicketingJwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly usersHttpClient: UsersHttpClient) {
    const accessCookieName = configService.get<string>('AUTH_ACCESS_COOKIE_NAME') as string;
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => getCookieValue(request?.headers?.cookie, accessCookieName),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      issuer: configService.get('JWT_ISSUER') || 'compliance-hub-api',
      audience: configService.get('JWT_AUDIENCE') || 'compliance-hub-client',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    if (payload.isTemp) throw new UnauthorizedException('Complete MFA verification before accessing the application.');
    await this.usersHttpClient.requireAccountAccess(payload.sub);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      units: payload.units ?? [],
      staffId: payload.staffId,
    };
  }
}
