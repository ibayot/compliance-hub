import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/auth.interface';
import { UsersService } from '../../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBlacklist } from '../entities/token-blacklist.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepo: Repository<TokenBlacklist>,
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
