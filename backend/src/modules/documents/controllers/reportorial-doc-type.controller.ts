import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportorialDocTypeService } from '../services/reportorial-doc-type.service';
import { CreateReportorialDocTypeDto } from '../dto/create-reportorial-doc-type.dto';
import { UpdateReportorialDocTypeDto } from '../dto/update-reportorial-doc-type.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';

@ApiTags('document-types')
@Controller('document-types')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)
export class ReportorialDocTypeController {
  constructor(private readonly service: ReportorialDocTypeService) {}

  /**
   * GET /api/document-types?unitId=1
   * Returns all (or filtered by unitId) reportorial document types.
   */
  @Get()
  @RequireCapability(['isDocumentsAccess', 'isDocumentTypesManage'])
  findAll(@Query('unitId') unitId?: string) {
    if (unitId) {
      return this.service.findByUnit(Number(unitId));
    }
    return this.service.findAll();
  }

  @Get(':id')
  @RequireCapability(['isDocumentsAccess', 'isDocumentTypesManage'])
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @RequireCapability('isDocumentTypesManage')
  create(@Body() dto: CreateReportorialDocTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequireCapability('isDocumentTypesManage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReportorialDocTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireCapability('isDocumentTypesManage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
