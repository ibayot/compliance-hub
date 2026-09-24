import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';
import { ChangelogService } from './changelog.service';
@Controller('changelog')
@UseGuards(JwtAuthGuard)
export class ChangelogController {
  constructor(private s: ChangelogService) {}
  @Get('prompt') prompt(@Request() r: any) {
    return this.s.prompt(+r.user.id, r.user.role);
  }
  @Get('history') history(@Request() r: any) {
    return this.s.history(r.user.role);
  }
  @Post('displayed') displayed(@Request() r: any, @Body() b: any) {
    return this.s.displayed(+r.user.id, b.releaseIds);
  }
  @Post('acknowledge') ack(@Request() r: any, @Body() b: any) {
    return this.s.acknowledge(+r.user.id, b.releaseIds);
  }
  @Get('admin/releases')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isChangelogManagement')
  list() {
    return this.s.adminList();
  }
  @Get('admin/capabilities')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isChangelogManagement')
  capabilities() {
    return this.s.capabilityKeys();
  }
  @Post('admin/releases')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isChangelogManagement')
  create(@Body() b: any) {
    return this.s.saveDraft(b);
  }
  @Patch('admin/releases/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isChangelogManagement')
  update(@Param('id') id: string, @Body() b: any) {
    return this.s.saveDraft(b, id);
  }
  @Post('admin/releases/:id/publish')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isChangelogManagement')
  publish(@Param('id') id: string) {
    return this.s.publish(id);
  }
  @Delete('admin/releases/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability('isChangelogManagement')
  remove(@Param('id') id: string) {
    return this.s.remove(id);
  }
}
