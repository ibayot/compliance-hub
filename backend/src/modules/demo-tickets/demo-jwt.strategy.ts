import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getCookieValue } from '../../apps/ticketing-jwt.strategy';
import { UsersHttpClient } from '../../common/http-clients/users.http-client';
import { JwtPayload } from '../auth/interfaces/auth.interface';

@Injectable()
export class DemoJwtStrategy extends PassportStrategy(Strategy, 'demo-jwt') {
  constructor(config: ConfigService, private readonly users: UsersHttpClient) {
    const cookie = config.get<string>('AUTH_ACCESS_COOKIE_NAME')!;
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        request => getCookieValue(request?.headers?.cookie, cookie),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
      issuer: config.get('JWT_ISSUER') || 'compliance-hub-api',
      audience: config.get('JWT_AUDIENCE') || 'compliance-hub-client',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.isTemp || !Number.isSafeInteger(payload.sub) || payload.sub < 1 || !payload.jti) {
      throw new UnauthorizedException('Sign in to use Demo Mode.');
    }
    if (!payload.demoRunId) {
      await this.users.authorizeDemoAdministrator(payload.sub, payload.jti);
      return { kind: 'administrator', userId: payload.sub };
    }
    const session = await this.users.authorizeDemo(payload.sub, payload.jti, payload.demoRunId);
    if (session?.id !== payload.demoRunId ||
        (session.role === 'user' ? session.requesterId : session.technicianId) !== payload.sub) {
      throw new UnauthorizedException('This demo session is unavailable.');
    }
    return { ...session, kind: 'participant', userId: payload.sub };
  }
}
