import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class TicketingJwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => request?.headers?.cookie?.split(';').map((value: string) => value.trim()).find((value: string) => value.startsWith('auth_access='))?.slice('auth_access='.length),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      issuer: configService.get('JWT_ISSUER') || 'compliance-hub-api',
      audience: configService.get('JWT_AUDIENCE') || 'compliance-hub-client',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      units: payload.units ?? [],
      staffId: payload.staffId,
    };
  }
}
