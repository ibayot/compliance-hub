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
  Request,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';

import {
  IssuanceService,
  CreateIssuanceDto,
  UpdateIssuanceDto,
} from '../services/issuance.service';

@ApiTags('issuances')
@Controller('issuances')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)
export class IssuanceController {
  constructor(
    private readonly issuanceService: IssuanceService,
    private readonly roleCapabilities: RoleCapabilitiesService,
  ) {}

  /**
   * Create a new issuance
   * POST /issuances
   */
  @Post()
  @RequireCapability('isIssuancesManage')
  @HttpCode(HttpStatus.CREATED)
  async createIssuance(@Body() dto: CreateIssuanceDto, @Request() req: any) {
    const canReview = this.roleCapabilities.isIssuancesReview(req.user?.role);
    return this.issuanceService.createIssuance(
      canReview
        ? { ...dto, register_decision: 'pending' }
        : { ...dto, applicability_status: 'pending_review', register_decision: 'pending' },
      req.user?.id ?? req.user?.userId,
    );
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
    @Query('primary_register') primary_register?: string,
    @Query('lifecycle_status') lifecycle_status?: string,
    @Query('applicability_status') applicability_status?: string,
    @Query('register_decision') register_decision?: string,
    @Query('scope_profile') scope_profile?: string,
    @Query('domain_id') domain_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedIsActive =
      typeof is_active === 'string' ? is_active.toLowerCase() === 'true' : undefined;

    return this.issuanceService.getIssuances({
      authority,
      category,
      search,
      is_active: parsedIsActive,
      primary_register,
      lifecycle_status,
      applicability_status,
      register_decision,
      scope_profile,
      domain_id: domain_id ? Number(domain_id) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('meta/domains')
  @RequireCapability('isIssuancesAccess')
  listDomains(@Query('include_inactive') includeInactive?: string) {
    return this.issuanceService.listDomains(includeInactive === 'true');
  }

  @Post('meta/domains')
  @RequireCapability('isIssuancesConfigure')
  createDomain(
    @Body() dto: { code: string; name: string; description?: string; sortOrder?: number },
  ) {
    return this.issuanceService.createDomain(dto);
  }

  @Put('meta/domains/:domainId')
  @RequireCapability('isIssuancesConfigure')
  updateDomain(
    @Param('domainId', ParseIntPipe) domainId: number,
    @Body() dto: { name?: string; description?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.issuanceService.updateDomain(domainId, dto);
  }

  @Post('duplicates/check')
  @RequireCapability('isIssuancesManage')
  checkDuplicates(
    @Body()
    dto: {
      issuance_number?: string;
      title?: string;
      issuing_authority?: string;
      source_url?: string;
    },
  ) {
    return this.issuanceService.findDuplicateCandidates(dto);
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
  @RequireCapability('isIssuancesManage')
  async updateIssuance(
    @Param('id') id: string,
    @Body() dto: UpdateIssuanceDto,
    @Request() req: any,
  ) {
    const canReview = this.roleCapabilities.isIssuancesReview(req.user?.role);
    const payload = { ...dto };
    delete payload.register_decision;
    if (!canReview) {
      delete payload.applicability_status;
    }
    return this.issuanceService.updateIssuance(
      id,
      payload,
      req.user?.id ?? req.user?.userId,
    );
  }

  @Post(':id/register-decision/:decision')
  @RequireCapability('isIssuancesReview')
  decideRegisterInclusion(
    @Param('id') id: string,
    @Param('decision') decision: 'included' | 'excluded',
    @Body() dto: { reason: string; applicabilityStatus?: string; domainIds?: number[] },
    @Request() req: any,
  ) {
    if (!['included', 'excluded'].includes(decision)) {
      throw new BadRequestException('Invalid register decision');
    }
    return this.issuanceService.decideRegisterInclusion(
      id,
      decision,
      dto,
      req.user?.id ?? req.user?.userId,
    );
  }

  @Post(':id/sources')
  @RequireCapability('isIssuancesManage')
  addSource(
    @Param('id') id: string,
    @Body()
    dto: {
      sourceType: string;
      url?: string;
      sourceOrganization?: string;
      externalDocumentId?: string;
      isPrimary?: boolean;
    },
    @Request() req: any,
  ) {
    return this.issuanceService.addSource(id, dto, req.user?.id ?? req.user?.userId);
  }

  @Put(':id/sources/:sourceId/verify')
  @RequireCapability('isIssuancesManage')
  verifySource(
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
    @Request() req: any,
  ) {
    return this.issuanceService.verifySource(
      id,
      sourceId,
      req.user?.id ?? req.user?.userId,
    );
  }

  @Post(':id/relationships')
  @RequireCapability('isIssuancesManage')
  addRelationship(
    @Param('id') id: string,
    @Body() dto: { targetIssuanceId: string; relationshipType: string; notes?: string },
    @Request() req: any,
  ) {
    return this.issuanceService.addRelationship(id, dto, req.user?.id ?? req.user?.userId);
  }

  @Delete(':id/relationships/:relationshipId')
  @RequireCapability('isIssuancesManage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRelationship(
    @Param('id') id: string,
    @Param('relationshipId') relationshipId: string,
  ) {
    return this.issuanceService.removeRelationship(id, relationshipId);
  }

  @Post(':id/assessments')
  @RequireCapability('isIssuancesAssessmentManage')
  saveAssessment(
    @Param('id') id: string,
    @Body()
    dto: {
      year: number;
      quarter?: number;
      status: string;
      evidenceSummary?: string;
      gapSummary?: string;
      readinessStatus?: string;
    },
    @Request() req: any,
  ) {
    return this.issuanceService.saveAssessment(id, dto, req.user?.id ?? req.user?.userId);
  }

  @Get(':id/assessments/:assessmentId/evidence')
  @RequireCapability('isIssuancesAccess')
  listAssessmentEvidence(
    @Param('id') id: string,
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.issuanceService.listAssessmentEvidence(id, assessmentId);
  }

  @Post(':id/assessments/:assessmentId/evidence')
  @RequireCapability('isIssuancesAssessmentManage')
  addAssessmentEvidence(
    @Param('id') id: string,
    @Param('assessmentId') assessmentId: string,
    @Body() dto: { label: string; url?: string; documentId?: string; documentVersionId?: string },
    @Request() req: any,
  ) {
    return this.issuanceService.addAssessmentEvidence(
      id,
      assessmentId,
      dto,
      req.user?.id ?? req.user?.userId,
    );
  }

  @Delete(':id/assessments/:assessmentId/evidence/:evidenceId')
  @RequireCapability('isIssuancesAssessmentManage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAssessmentEvidence(
    @Param('id') id: string,
    @Param('assessmentId') assessmentId: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.issuanceService.removeAssessmentEvidence(id, assessmentId, evidenceId);
  }

  @Get(':id/assessments/:assessmentId/actions')
  @RequireCapability('isIssuancesAccess')
  listRemediationActions(
    @Param('id') id: string,
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.issuanceService.listRemediationActions(id, assessmentId);
  }

  @Post(':id/assessments/:assessmentId/actions')
  @RequireCapability('isIssuancesAssessmentManage')
  addRemediationAction(
    @Param('id') id: string,
    @Param('assessmentId') assessmentId: string,
    @Body() dto: { action: string; owner?: string; targetDate?: string; status?: string },
  ) {
    return this.issuanceService.addRemediationAction(id, assessmentId, dto);
  }

  @Put(':id/assessments/:assessmentId/actions/:actionId')
  @RequireCapability('isIssuancesAssessmentManage')
  updateRemediationAction(
    @Param('id') id: string,
    @Param('assessmentId') assessmentId: string,
    @Param('actionId') actionId: string,
    @Body() dto: { action?: string; owner?: string; targetDate?: string | null; status?: string },
  ) {
    return this.issuanceService.updateRemediationAction(id, assessmentId, actionId, dto);
  }

  @Delete(':id/assessments/:assessmentId/actions/:actionId')
  @RequireCapability('isIssuancesAssessmentManage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRemediationAction(
    @Param('id') id: string,
    @Param('assessmentId') assessmentId: string,
    @Param('actionId') actionId: string,
  ) {
    return this.issuanceService.removeRemediationAction(id, assessmentId, actionId);
  }

  /**
   * Delete an issuance
   * DELETE /issuances/:id
   */
  @Delete(':id')
  @RequireCapability('isIssuancesManage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIssuance(@Param('id') id: string, @Request() req: any) {
    await this.issuanceService.deleteIssuance(id, req.user?.id ?? req.user?.userId);
  }

  /**
   * Link a document to an issuance
   * POST /issuances/:id/documents/:documentId
   */
  @Post(':id/documents/:documentId')
  @RequireCapability('isIssuancesManage')
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
  @RequireCapability('isIssuancesManage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    await this.issuanceService.unlinkDocument(id, documentId);
  }

  /**
   * Upload or replace issuance attachment
   * POST /issuances/:id/attachment
   */
  @Post(':id/attachment')
  @RequireCapability('isIssuancesManage')
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
  @RequireCapability('isIssuancesManage')
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
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
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
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }
}
