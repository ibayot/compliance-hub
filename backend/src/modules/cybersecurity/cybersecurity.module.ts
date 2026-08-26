import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CybersecurityMetric } from './entities/cybersecurity-metric.entity';
import { CybersecurityController } from './controllers/cybersecurity.controller';
import { CybersecurityService } from './services/cybersecurity.service';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CybersecurityMetric]), HttpClientsModule],
  controllers: [CybersecurityController],
  providers: [
    CybersecurityService,
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [CybersecurityService],
})
export class CybersecurityModule {}
