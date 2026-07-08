import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issuance } from './entities/issuance.entity';
import { IssuanceService } from './services/issuance.service';
import { IssuanceController } from './controllers/issuance.controller';
import { Document } from '../documents/entities/document.entity';

import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';

@Module({
  imports: [TypeOrmModule.forFeature([Issuance, Document]), HttpClientsModule],
  controllers: [IssuanceController],
  providers: [
    IssuanceService,
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [IssuanceService],
})
export class ReferencesModule {}
