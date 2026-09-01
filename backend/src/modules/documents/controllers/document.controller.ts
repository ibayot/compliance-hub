import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  DocumentService,
  UploadDocumentDto,
  UploadGoogleDocDto,
} from '../services/document.service';
import { VersionService, CreateVersionDto } from '../services/version.service';
import { Document, DocumentStatus } from '../entities/document.entity';
import { SubmissionFrequency } from '../entities/document-assignment.entity';
import { UploadBulkheadInterceptor } from '../../../common/interceptors/upload-bulkhead.interceptor';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard, CapabilityGuard)
export class DocumentController {
  constructor(
    private documentService: DocumentService,
    private versionService: VersionService,
    private roleCapabilitiesService: RoleCapabilitiesService,
  ) {}

  /**
   * Upload a new document
   * POST /documents
   */
  @Post()
  @RequireCapability('isDocumentsManage')
  @UseInterceptors(
    UploadBulkheadInterceptor,
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Omit<UploadDocumentDto, 'file' | 'uploaded_by'>,
    @CurrentUser() user: any,
  ): Promise<Document> {
    const dto: UploadDocumentDto = {
      ...body,
      file,
      uploaded_by: user.id,
      user_role: user.role,
    };

    return this.documentService.uploadDocument(dto);
  }

  /**
   * Import and upload a Google Doc via URL export
   * POST /documents/google-doc
   */
  @Post('google-doc')
  @RequireCapability('isDocumentsManage')
  @UseInterceptors(UploadBulkheadInterceptor)
  async uploadGoogleDoc(
    @Body()
    body: Omit<UploadGoogleDocDto, 'uploaded_by' | 'user_role' | 'unit_id'> & {
      unit_id: number | string;
    },
    @CurrentUser() user: any,
  ): Promise<Document> {
    const dto: UploadGoogleDocDto = {
      ...body,
      unit_id: Number(body.unit_id),
      uploaded_by: user.id,
      user_role: user.role,
    };

    return this.documentService.uploadGoogleDoc(dto);
  }

  /**
   * List documents with filters
   * GET /documents
   */
  @Get()
  @RequireCapability(['isDocumentsAccess', 'isDocumentsManage'])
  async listDocuments(
    @Query('title') title?: string,
    @Query('unit_id') unit_id?: string,
    @Query('document_type') document_type?: string,
    @Query('period') period?: string,
    @Query('year') year?: string,
    @Query('status') status?: DocumentStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('archived') archived?: string,
    @CurrentUser() user?: any,
  ) {
    return this.documentService.listDocuments({
      title,
      unit_id,
      document_type,
      period,
      year,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      archived: archived === 'true',
      actor_role: user?.role,
      actor_id: user?.id,
    });
  }

  @Get('types')
  @RequireCapability(['isDocumentsAccess', 'isDocumentsManage'])
  async listDocumentTypes() {
    return this.documentService.listDocumentTypes();
  }

  @Get('upload-options')
  @RequireCapability('isDocumentsManage')
  async getUploadOptions(
    @CurrentUser() user: any,
    @Query('period') period: string,
    @Query('year') year: string,
  ) {
    return this.documentService.getAvailableUploadOptions(user.id, period, year);
  }

  @Get('assignments')
  @RequireCapability('isDocumentsAccess')
  async listAssignments(
    @CurrentUser() user: any,
    @Query('user_id') userId?: string,
    @Query('unit_id') unitId?: string,
    @Query('active_only') activeOnly?: string,
  ) {
    const isPrivileged = this.roleCapabilitiesService.isDocumentsManage(user.role);
    return this.documentService.listAssignments({
      user_id: isPrivileged && userId ? Number(userId) : user.id,
      unit_id: unitId ? Number(unitId) : undefined,
      active_only: activeOnly === 'true',
    });
  }

  @Post('assignments')
  @RequireCapability('isDocumentsManage')
  async createAssignment(
    @Body()
    body: {
      user_id: number;
      unit_id: number;
      document_type: string;
      report_name?: string;
      filename_prefix?: string;
      submission_frequency?: SubmissionFrequency;
      submission_month?: number;
      is_active?: boolean;
    },
  ) {
    return this.documentService.createAssignment(body);
  }

  @Patch('assignments/:id')
  @RequireCapability('isDocumentsManage')
  async updateAssignment(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      unit_id: number;
      document_type: string;
      report_name?: string;
      filename_prefix?: string;
      submission_frequency?: SubmissionFrequency;
      submission_month?: number;
      is_active?: boolean;
    }>,
  ) {
    return this.documentService.updateAssignment(id, body);
  }

  @Delete('assignments/:id')
  @RequireCapability('isDocumentsManage')
  async deleteAssignment(@Param('id') id: string) {
    await this.documentService.deleteAssignment(id);
    return { message: 'Assignment deleted successfully' };
  }

  /**
   * Get document repository grouped by year and period bucket
   * GET /documents/repository
   */
  @Get('repository')
  @RequireCapability(['isRepositoryAccess', 'isDocumentsManage'])
  async getRepository(@CurrentUser() user: any) {
    return this.documentService.getRepository(user?.role, user?.id);
  }

  /**
   * Get document by ID
   * GET /documents/:id
   */
  @Get(':id')
  @RequireCapability(['isDocumentsAccess', 'isDocumentsManage'])
  async getDocument(@Param('id') id: string): Promise<Document> {
    return this.documentService.getDocumentById(id);
  }

  /**
   * Get version history
   * GET /documents/:id/versions
   */
  @Get(':id/versions')
  @RequireCapability(['isDocumentsAccess', 'isDocumentsManage'])
  async getVersionHistory(@Param('id') id: string) {
    return this.documentService.getVersionHistory(id);
  }

  @Get(':id/references')
  @RequireCapability('isDocumentsAccess')
  async getDocumentReferences(@Param('id') id: string) {
    return this.documentService.listDocumentReferences(id);
  }

  @Post(':id/references')
  @RequireCapability('isDocumentsManage')
  async linkDocumentReference(
    @Param('id') sourceDocumentId: string,
    @Body()
    body: {
      target_document_id: string;
      relationship_type?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.documentService.linkDocumentReference({
      source_document_id: sourceDocumentId,
      target_document_id: body.target_document_id,
      relationship_type: body.relationship_type,
      created_by: user.id,
    });
  }

  @Delete(':id/references/:targetId')
  @RequireCapability('isDocumentsManage')
  async unlinkDocumentReference(
    @Param('id') sourceDocumentId: string,
    @Param('targetId') targetDocumentId: string,
  ) {
    await this.documentService.unlinkDocumentReference(sourceDocumentId, targetDocumentId);
    return { message: 'Document reference removed successfully' };
  }

  /**
   * Create a new version of a document
   * POST /documents/:id/versions
   */
  @Post(':id/versions')
  @RequireCapability('isDocumentsManage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async createVersion(
    @Param('id') document_id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('change_notes') change_notes: string,
    @CurrentUser() user: any,
  ) {
    const dto: CreateVersionDto = {
      document_id,
      file,
      change_notes,
      uploaded_by: user.id,
    };

    return this.versionService.createVersion(dto);
  }

  /**
   * Download a specific version
   * GET /documents/:id/versions/:vid/download
   */
  @Get(':id/versions/:vid/download')
  @RequireCapability(['isDocumentsAccess', 'isDocumentsManage'])
  async downloadVersion(
    @Param('vid') versionId: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, fileName, mimeType } = await this.versionService.downloadVersion(versionId, user);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${String(fileName).replace(/[\r\n"\\/]/g, '_')}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  /**
   * Get preview (PDF) of a specific version
   * GET /documents/:id/versions/:vid/preview
   */
  @Get(':id/versions/:vid/preview')
  @RequireCapability(['isDocumentsAccess', 'isDocumentsManage'])
  async getPreview(
    @Param('vid') versionId: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, mimeType } = await this.versionService.getPreview(versionId, user);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': 'inline',
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  /**
   * Focal-initiated archive of a returned document
   * POST /documents/:id/archive
   */
  @Post(':id/archive')
  @RequireCapability('isDocumentsManage')
  async archiveDocument(@Param('id') id: string, @CurrentUser() user: any) {
    await this.documentService.archiveDocument(id, user.id);
    return { message: 'Document archived successfully.' };
  }

  /**
   * Admin/Reviewer re-queue processing for stuck/failed documents
   * POST /documents/:id/reprocess
   */
    @RequireCapability('isDocumentsDelete')
  async reprocessDocument(@Param('id') id: string) {
    await this.documentService.reprocessDocument(id);
    return { message: 'Document reprocessing enqueued.' };
  }

  /**
   * Return document for focal revision (non-destructive)
   * POST /documents/:id/return
   */
    @RequireCapability('isDocumentsDelete')
  async returnDocument(
    @Param('id') id: string,
    @Body() body: { remarks: string },
    @CurrentUser() user: any,
  ) {
    const review = await this.documentService.returnDocumentForRevision({
      document_id: id,
      remarks: body.remarks,
      returned_by: user.id,
    });

    return {
      message: 'Document returned to focal for revision.',
      review_id: review.id,
    };
  }

  /**
   * Soft delete a document
   * DELETE /documents/:id
   */
    @RequireCapability('isDocumentsDelete')
  async deleteDocument(@Param('id') id: string) {
    await this.documentService.deleteDocument(id);
    return { message: 'Document deleted successfully' };
  }
}
