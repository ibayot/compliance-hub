import { Controller, Get, Param, NotFoundException, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { UnitsService } from '../units/units.service';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { InternalServiceGuard } from '../../common/guards/internal-service.guard';

/**
 * InternalController — inter-service API endpoints for users-service.
 *
 * These endpoints are NOT protected by JWT.  They are secured by the
 * InternalServiceGuard which checks the X-Service-Token header against
 * the INTERNAL_SERVICE_SECRET environment variable.
 *
 * Routes:
 *  GET /api/internal/users                 All users (basic stub fields)
 *  GET /api/internal/users/:id             Single user by ID
 *  GET /api/internal/units                 All active units
 *  GET /api/internal/units/:id             Single unit by ID
 *  GET /api/internal/role-capabilities     Full role capability matrix
 *
 * These endpoints are called by compliance-service and ticketing-service
 * via UsersHttpClient as an HTTP-first alternative to cross-DB SQL views.
 */
@ApiTags('_internal')
@Controller('internal')
@UseGuards(InternalServiceGuard)
export class InternalController {
  constructor(
    private readonly usersService: UsersService,
    private readonly unitsService: UnitsService,
    private readonly roleCapabilitiesService: RoleCapabilitiesService,
  ) {}

  @Get('users')
  async getUsers() {
    const users = await this.usersService.findAll();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      middle_name: u.middleName ?? null,
      role: u.role,
      staff_id: (u as any).staff_id ?? null,
      ticketMainFocal: u.ticketMainFocal,
      units: u.units || [],
    }));
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    // using findOne instead of findByIdSafe because findOne explicitly loads the units relation
    const user = await this.usersService.findOne(id).catch(() => null);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      middle_name: user.middleName ?? null,
      role: user.role,
      staff_id: (user as any).staff_id ?? null,
      ticketMainFocal: user.ticketMainFocal,
      units: user.units || [],
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

  /**
   * Returns the full role capability matrix.
   * Consumed by ticketing-service and compliance-service to seed their local
   * RoleCapabilitiesHttpClient cache without needing a cross-DB SQL view.
   *
   * Response shape matches RoleCapabilityStub in UsersHttpClient.
   */
  @Get('role-capabilities')
  getRoleCapabilities() {
    return this.roleCapabilitiesService.findAll();
  }
}
