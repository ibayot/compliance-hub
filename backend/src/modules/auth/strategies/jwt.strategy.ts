import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/auth.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      issuer: configService.get('JWT_ISSUER') || 'compliance-hub-api',
      audience: configService.get('JWT_AUDIENCE') || 'compliance-hub-client',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    // Check that the user still exists and is active on every request.
    // This ensures that deactivated or deleted accounts are forced out immediately
    // without waiting for the JWT to expire.
    const user = await this.usersService.findByIdSafe(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException('Account not found or has been deactivated');
    }
    const roleDef = await this.usersService.findRoleDefinition(user.role).catch(() => null);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      roleCode: roleDef?.roleCode ?? null,
      units: payload.units,
    };
  }
}

