import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issuance } from './entities/issuance.entity';
import { IssuanceService } from './services/issuance.service';
import { IssuanceController } from './controllers/issuance.controller';
import { Document } from '../documents/entities/document.entity';
import { RoleCapability } from '../users/entities/role-capability.entity';
import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Issuance, Document, RoleCapability])],
  controllers: [IssuanceController],
  providers: [IssuanceService, RoleCapabilitiesService, CapabilityGuard],
  exports: [IssuanceService],
})
export class ReferencesModule {}
