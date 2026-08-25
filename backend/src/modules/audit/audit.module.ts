import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { AuditService } from './services/audit.service';
import { UsersModule } from '../users/users.module';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuditController],
  providers: [AuditService, CapabilityGuard],
  exports: [AuditService],
})
export class AuditModule {}