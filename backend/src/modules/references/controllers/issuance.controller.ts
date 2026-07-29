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
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  IssuanceService,
  CreateIssuanceDto,
  UpdateIssuanceDto,
} from '../services/issuance.service';

@ApiTags('issuances')
@Controller('issuances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssuanceController {
  constructor(private readonly issuanceService: IssuanceService) {}

  /**
   * Create a new issuance
   * POST /issuances
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.CREATED)
  async createIssuance(@Body() dto: CreateIssuanceDto) {
    return this.issuanceService.createIssuance(dto);
  }

  /**
   * Get all issuances
   * GET /issuances
   */
  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability('isIssuancesAccess')
  async getIssuances(
    @Query('authority') authority?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
  ) {
    const parsedIsActive =
      typeof is_active === 'string' ? is_active.toLowerCase() === 'true' : undefined;

    return this.issuanceService.getIssuances({
      authority,
      category,
      search,
      is_active: parsedIsActive,
    });
  }

  /**
   * Get a single issuance
   * GET /issuances/:id
   */
  @Get(':id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isIssuancesAccess')
  async getIssuance(@Param('id') id: string) {
    return this.issuanceService.getIssuance(id);
  }

  /**
   * Update an issuance
   * PUT /issuances/:id
   */
  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.OK)
  async linkDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    await this.issuanceService.linkDocument(id, documentId);
    return { message: 'Document linked successfully' };
  }

  /**
   * Unlink a document from an issuance
   * DELETE /issuances/:id/documents/:documentId
   */
  @Delete(':id/documents/:documentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    await this.issuanceService.unlinkDocument(id, documentId);
  }

  /**
   * Upload or replace issuance attachment
   * POST /issuances/:id/attachment
   */
  @Post(':id/attachment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  async uploadAttachment(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.issuanceService.uploadAttachment(id, file);
  }

  /**
   * Remove issuance attachment
   * DELETE /issuances/:id/attachment
   */
  @Delete(':id/attachment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(@Param('id') id: string) {
    await this.issuanceService.deleteAttachment(id);
  }

  /**
   * View issuance attachment inline
   * GET /issuances/:id/attachment/view
   */
  @Get(':id/attachment/view')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isIssuancesAccess')
  async viewAttachment(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, fileName, mimeType } = await this.issuanceService.getAttachment(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }

  /**
   * Download issuance attachment
   * GET /issuances/:id/attachment/download
   */
  @Get(':id/attachment/download')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isIssuancesAccess')
  async downloadAttachment(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, fileName, mimeType } = await this.issuanceService.getAttachment(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }
}
