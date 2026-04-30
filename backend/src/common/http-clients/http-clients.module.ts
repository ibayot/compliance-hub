import { Module } from '@nestjs/common';
import { UsersHttpClient } from './users.http-client';
import { ComplianceHttpClient } from './compliance.http-client';
import { RoleCapabilitiesHttpClient } from './role-capabilities.http-client';

/**
 * HttpClientsModule — reusable inter-service HTTP client providers.
 *
 * Import this module in any service module that needs to call another
 * microservice via HTTP instead of using a cross-DB SQL view.
 *
 * Cross-DB views are still used for TypeORM entity JOIN relationships;
 * these HTTP clients are for new non-JOIN enrichment paths.
 *
 * RoleCapabilitiesHttpClient is the Phase B replacement for importing
 * RoleCapabilitiesService TypeScript source across service boundaries.
 */
@Module({
  providers: [UsersHttpClient, ComplianceHttpClient, RoleCapabilitiesHttpClient],
  exports: [UsersHttpClient, ComplianceHttpClient, RoleCapabilitiesHttpClient],
})
export class HttpClientsModule {}
