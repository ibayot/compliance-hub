import { Module } from '@nestjs/common';
import { UsersHttpClient } from './users.http-client';
import { ComplianceHttpClient } from './compliance.http-client';

/**
 * HttpClientsModule — reusable inter-service HTTP client providers.
 *
 * Import this module in any service module that needs to call another
 * microservice via HTTP instead of using a cross-DB SQL view.
 *
 * Cross-DB views are still used for TypeORM entity JOIN relationships;
 * these HTTP clients are for new non-JOIN enrichment paths.
 */
@Module({
  providers: [UsersHttpClient, ComplianceHttpClient],
  exports: [UsersHttpClient, ComplianceHttpClient],
})
export class HttpClientsModule {}
