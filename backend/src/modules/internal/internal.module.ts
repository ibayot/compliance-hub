import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { UsersModule } from '../users/users.module';
import { UnitsModule } from '../units/units.module';

/**
 * InternalModule — registers the inter-service API surface for users-service.
 *
 * Import this module into UsersServiceAppModule to expose:
 *  GET /api/internal/users
 *  GET /api/internal/users/:id
 *  GET /api/internal/units
 *  GET /api/internal/units/:id
 *
 * Authentication: InternalServiceGuard (X-Service-Token header, no JWT required).
 */
@Module({
  imports: [UsersModule, UnitsModule],
  controllers: [InternalController],
})
export class InternalModule {}
