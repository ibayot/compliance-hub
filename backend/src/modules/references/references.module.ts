import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issuance } from './entities/issuance.entity';
import { IssuanceService } from './services/issuance.service';
import { IssuanceController } from './controllers/issuance.controller';
import { Document } from '../documents/entities/document.entity';
import { DocumentVersion } from '../documents/entities/document-version.entity';
import { ComplianceDomain } from './entities/compliance-domain.entity';
import { IssuanceSource } from './entities/issuance-source.entity';
import { IssuanceRelationship } from './entities/issuance-relationship.entity';
import { IssuanceLifecycleHistory } from './entities/issuance-lifecycle-history.entity';
import { IssuanceAssessment } from './entities/issuance-assessment.entity';
import { IssuanceRecommendation } from './entities/issuance-recommendation.entity';
import { IssuanceRegisterDecision } from './entities/issuance-register-decision.entity';
import { IssuanceAssessmentEvidence } from './entities/issuance-assessment-evidence.entity';
import { IssuanceRemediationAction } from './entities/issuance-remediation-action.entity';

import { RoleCapabilitiesService } from '../users/role-capabilities.service';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { HttpClientsModule } from '../../common/http-clients/http-clients.module';
import { RoleCapabilitiesHttpClient } from '../../common/http-clients/role-capabilities.http-client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Issuance,
      Document,
      DocumentVersion,
      ComplianceDomain,
      IssuanceSource,
      IssuanceRelationship,
      IssuanceLifecycleHistory,
      IssuanceAssessment,
      IssuanceRecommendation,
      IssuanceRegisterDecision,
      IssuanceAssessmentEvidence,
      IssuanceRemediationAction,
    ]),
    HttpClientsModule,
  ],
  controllers: [IssuanceController],
  providers: [
    IssuanceService,
    { provide: RoleCapabilitiesService, useClass: RoleCapabilitiesHttpClient },
    CapabilityGuard,
  ],
  exports: [IssuanceService],
})
export class ReferencesModule {}
