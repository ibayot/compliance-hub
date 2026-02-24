import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  IssuanceService,
  CreateIssuanceDto,
  UpdateIssuanceDto,
} from '../services/issuance.service';

@Controller('issuances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssuanceController {
  constructor(private readonly issuanceService: IssuanceService) {}

  /**
   * Create a new issuance
   * POST /issuances
   */
  @Post()
  @Roles(UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createIssuance(@Body() dto: CreateIssuanceDto) {
    return this.issuanceService.createIssuance(dto);
  }

  /**
   * Get all issuances
   * GET /issuances
   */
  @Get()
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async getIssuances(
    @Query('authority') authority?: string,
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
  ) {
    const parsedIsActive =
      typeof is_active === 'string' ? is_active.toLowerCase() === 'true' : undefined;

    return this.issuanceService.getIssuances({
      authority,
      search,
      is_active: parsedIsActive,
    });
  }

  /**
   * Get a single issuance
   * GET /issuances/:id
   */
  @Get(':id')
  @Roles(UserRole.FOCAL, UserRole.TECHNICIAN, UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async getIssuance(@Param('id') id: string) {
    return this.issuanceService.getIssuance(id);
  }

  /**
   * Update an issuance
   * PUT /issuances/:id
   */
  @Put(':id')
  @Roles(UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  async updateIssuance(@Param('id') id: string, @Body() dto: UpdateIssuanceDto) {
    return this.issuanceService.updateIssuance(id, dto);
  }

  /**
   * Delete an issuance
   * DELETE /issuances/:id
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIssuance(@Param('id') id: string) {
    await this.issuanceService.deleteIssuance(id);
  }

  /**
   * Link a document to an issuance
   * POST /issuances/:id/documents/:documentId
   */
  @Post(':id/documents/:documentId')
  @Roles(UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async linkDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    await this.issuanceService.linkDocument(id, documentId);
    return { message: 'Document linked successfully' };
  }

  /**
   * Unlink a document from an issuance
   * DELETE /issuances/:id/documents/:documentId
   */
  @Delete(':id/documents/:documentId')
  @Roles(UserRole.REVIEWER, UserRole.AUDITOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    await this.issuanceService.unlinkDocument(id, documentId);
  }
}
