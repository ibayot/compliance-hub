import {
  Controller,
  Get,
  Post,
  UseGuards,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';
import { StaffDirectoryStore } from '../../shared/staff-directory/staff-directory.store';
import { StaffDirectorySyncService } from './staff-directory-sync.service';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';

@Controller('users/staff-directory')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability('isUserManagementAdmin')
export class StaffDirectoryManagementController {
  constructor(private readonly sync: StaffDirectorySyncService) {}
  @Post('preview') preview() {
    return this.sync.run(true);
  }
  @Post('sync') synchronize() {
    return this.sync.run();
  }
  @Get('review') review() {
    return this.sync.review();
  }
}

@Injectable()
export class StaffDirectoryKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const expected = String(this.config.get('STAFF_DIRECTORY_API_KEY') || '');
    const supplied = context.switchToHttp().getRequest().headers['x-staff-directory-key'];
    if (
      expected.length < 32 ||
      typeof supplied !== 'string' ||
      Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
    )
      throw new UnauthorizedException(
        'Valid staff directory integration credentials are required.',
      );
    return true;
  }
}

@Controller('integrations/staff')
@ApiTags('staff-directory')
@ApiSecurity('staff-directory-key')
@UseGuards(StaffDirectoryKeyGuard)
export class StaffDirectoryIntegrationController {
  constructor(
    private readonly db: DataSource,
    private readonly store: StaffDirectoryStore,
  ) {}
  @Get()
  @ApiOperation({
    summary: 'Read the staff directory',
    description: 'Requires the dedicated X-Staff-Directory-Key header. Enter the configured secret in the staff-directory-key authorization field, without a Bearer prefix. Returns only approved directory fields; this does not synchronize UMS or create accounts.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Integer 1–100000; defaults to 1.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Integer 1–200; defaults to 100.' })
  async list(
    @Query('page') pageValue?: string,
    @Query('limit') limitValue?: string,
  ) {
    // Keep raw query values as strings: global numeric transformation followed
    // by DefaultValuePipe would silently replace invalid text/NaN with defaults.
    const integer = (value: string | undefined, fallback: number, max: number) => {
      if (value === undefined) return fallback;
      const parsed = Number(value);
      if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > max)
        throw new BadRequestException('Page must be an integer from 1–100000 and limit an integer from 1–200.');
      return parsed;
    };
    const page = integer(pageValue, 1, 100000);
    const limit = integer(limitValue, 100, 200);
    const s = this.store.schema();
    // Legacy users tables may not share the directory migration's collation.
    // Normalize UNION text and compare numeric staff IDs as bytes, without
    // changing existing table collations or broadening identity matching.
    const fields = (alias: 'u' | 'd') =>
      ['staff_id', 'last_name', 'first_name', 'middle_name', 'suffix', 'position_full']
        .map((column) => `CONVERT(${alias}.${column} USING utf8mb4) COLLATE utf8mb4_unicode_ci AS ${column}`)
        .join(',');
    const query = `SELECT ${fields('u')},
       COALESCE((SELECT un.name FROM ${s}.user_unit_access a JOIN ${s}.units un ON un.id=a.unit_id WHERE a.user_id=u.id ORDER BY a.unit_id LIMIT 1),dun.name) unit
      FROM ${s}.users u LEFT JOIN ${s}.ums_staff_directory d ON BINARY d.staff_id=BINARY u.staff_id LEFT JOIN ${s}.units dun ON dun.id=d.unit_id
      WHERE u.staff_id IS NOT NULL AND TRIM(u.staff_id)<>''
      UNION ALL
      SELECT ${fields('d')},un.name unit
      FROM ${s}.ums_staff_directory d LEFT JOIN ${s}.units un ON un.id=d.unit_id
      WHERE d.available=1 AND d.review_reason IS NULL AND NOT EXISTS(SELECT 1 FROM ${s}.users u WHERE BINARY u.staff_id=BINARY d.staff_id)`;
    const [count] = await this.db.query(`SELECT COUNT(*) total FROM (${query}) directory`);
    const rows = await this.db.query(
      `SELECT * FROM (${query}) directory ORDER BY last_name,first_name,staff_id LIMIT ? OFFSET ?`,
      [limit, (page - 1) * limit],
    );
    return {
      data: rows.map((r: any) => ({
        staff_id: r.staff_id,
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name ?? null,
        suffix: r.suffix ?? null,
        full_name: [
          String(r.last_name ?? '').trim(),
          [r.first_name, r.middle_name, r.suffix]
            .map((v) => String(v ?? '').trim())
            .filter(Boolean)
            .join(' '),
        ]
          .filter(Boolean)
          .join(', '),
        position_full: r.position_full ?? null,
        unit: r.unit ?? null,
      })),
      page,
      limit,
      total: Number(count.total),
    };
  }
}
