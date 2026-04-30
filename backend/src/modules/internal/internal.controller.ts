import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UnitsService } from '../units/units.service';
import { InternalServiceGuard } from '../../common/guards/internal-service.guard';

/**
 * InternalController — inter-service API endpoints for users-service.
 *
 * These endpoints are NOT protected by JWT.  They are secured by the
 * InternalServiceGuard which checks the X-Service-Token header against
 * the INTERNAL_SERVICE_SECRET environment variable.
 *
 * Routes:
 *  GET /api/internal/users         All users (basic stub fields)
 *  GET /api/internal/users/:id     Single user by ID
 *  GET /api/internal/units         All active units
 *  GET /api/internal/units/:id     Single unit by ID
 *
 * These endpoints are called by compliance-service and ticketing-service
 * via UsersHttpClient as an HTTP-first alternative to cross-DB SQL views.
 */
@Controller('internal')
@UseGuards(InternalServiceGuard)
export class InternalController {
  constructor(
    private readonly usersService: UsersService,
    private readonly unitsService: UnitsService,
  ) {}

  @Get('users')
  async getUsers() {
    const users = await this.usersService.findAll();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      middle_name: u.middle_name ?? null,
      role: u.role,
      staff_id: (u as any).staff_id ?? null,
    }));
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findByIdSafe(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name ?? null,
      role: user.role,
      staff_id: (user as any).staff_id ?? null,
    };
  }

  @Get('units')
  async getUnits() {
    return this.unitsService.findAll();
  }

  @Get('units/:id')
  async getUnitById(@Param('id', ParseIntPipe) id: number) {
    const unit = await this.unitsService.findOne(id);
    if (!unit) {
      throw new NotFoundException(`Unit ${id} not found`);
    }
    return unit;
  }
}
