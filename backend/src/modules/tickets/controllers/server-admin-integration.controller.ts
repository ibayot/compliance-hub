import { BadRequestException, CanActivate, Controller, ExecutionContext, Get, Header, Injectable, Param, ParseUUIDPipe, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProperty, ApiQuery, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { ServerAdminIntegrationService } from '../services/server-admin-integration.service';

@Injectable()
export class ServerAdminIntegrationKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<unknown>('SERVER_ADMIN_TICKETS_API_KEY') || '';
    const supplied: unknown = context.switchToHttp().getRequest().headers['x-server-admin-key'];
    if (typeof expected !== 'string' || expected.length < 32 || expected.length > 512 || typeof supplied !== 'string' ||
      Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new UnauthorizedException('Valid server administrator integration credentials are required.');
    }
    return true;
  }
}

class ServerAdminTicketResponse {
  @ApiProperty({ format: 'uuid' }) ticket_id: string;
  @ApiProperty({ example: 'TKT-2026-0001' }) ticket_number: string;
  @ApiProperty({ enum: ['assigned', 'in_progress'] }) status: string;
  @ApiProperty({ type: String, nullable: true, example: '020123', description: 'String, preserving leading zeros. Null when missing or conflicting; never guess a conflicting ID.' }) emp_id: string | null;
  @ApiProperty({ enum: ['requester', 'subject', 'description', 'subject_and_description'], nullable: true }) emp_id_source: string | null;
  @ApiProperty({ enum: ['create', 'enable', 'disable', 'Others'] }) request_type: string;
  @ApiProperty() requires_review: boolean;
  @ApiProperty({ type: [String], example: ['conflicting_employee_ids'] }) review_reasons: string[];
}

class ServerAdminTicketsPageResponse {
  @ApiProperty({ type: [ServerAdminTicketResponse] }) data: ServerAdminTicketResponse[];
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
}

@Controller('integrations/server-admin/tickets')
@ApiTags('server-admin-integration')
@ApiSecurity('server-admin-key')
@ApiUnauthorizedResponse({ description: 'The dedicated integration key is missing, disabled or invalid.' })
@UseGuards(ServerAdminIntegrationKeyGuard)
export class ServerAdminIntegrationController {
  constructor(private readonly service: ServerAdminIntegrationService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Read tickets assigned to server administrators', description: 'Requires X-Server-Admin-Key (no Bearer prefix). Only Assigned/In Progress tickets currently assigned to an active server_admin qualify. Pending escalations do not qualify; accepted escalations qualify after assignment transfers. Returns derived metadata only; never updates tickets or performs account actions.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Whole number 1–100000; default 1.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Whole number 1–100; default 50.' })
  @ApiOkResponse({ type: ServerAdminTicketsPageResponse })
  list(@Query() query: Record<string, unknown>) {
    if (Object.keys(query).some(key => key !== 'page' && key !== 'limit')) throw new BadRequestException('Only page and limit filters are supported.');
    const integer = (value: unknown, fallback: number, max: number) => {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new BadRequestException('Invalid pagination.');
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new BadRequestException('Invalid pagination.');
      return number;
    };
    return this.service.list(integer(query.page, 1, 100000), integer(query.limit, 50, 100));
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Read one eligible server administrator ticket', description: 'Applies the same assignment/status scope as the list. An unknown or out-of-scope ticket returns 404.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ServerAdminTicketResponse })
  @ApiNotFoundResponse({ description: 'Ticket is absent or outside the permitted assignment/status scope.' })
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.get(id); }
}
