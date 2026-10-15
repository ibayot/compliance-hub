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
  DefaultValuePipe,
  ParseIntPipe,
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
@UseGuards(StaffDirectoryKeyGuard)
export class StaffDirectoryIntegrationController {
  constructor(
    private readonly db: DataSource,
    private readonly store: StaffDirectoryStore,
  ) {}
  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    if (page < 1 || page > 100000 || limit < 1 || limit > 200)
      throw new BadRequestException('Page must be positive and limit must be 1–200.');
    const s = this.store.schema();
    const query = `SELECT u.staff_id,u.last_name,u.first_name,u.middle_name,u.suffix,u.position_full,
       COALESCE((SELECT un.name FROM ${s}.user_unit_access a JOIN ${s}.units un ON un.id=a.unit_id WHERE a.user_id=u.id ORDER BY a.unit_id LIMIT 1),dun.name) unit
      FROM ${s}.users u LEFT JOIN ${s}.ums_staff_directory d ON d.staff_id=u.staff_id LEFT JOIN ${s}.units dun ON dun.id=d.unit_id
      WHERE u.staff_id IS NOT NULL AND TRIM(u.staff_id)<>''
      UNION ALL
      SELECT d.staff_id,d.last_name,d.first_name,d.middle_name,d.suffix,d.position_full,un.name unit
      FROM ${s}.ums_staff_directory d LEFT JOIN ${s}.units un ON un.id=d.unit_id
      WHERE d.available=1 AND d.review_reason IS NULL AND NOT EXISTS(SELECT 1 FROM ${s}.users u WHERE u.staff_id=d.staff_id)`;
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
