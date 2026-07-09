import { Module } from '@nestjs/common';
import { UsersHttpClient } from './users.http-client';
import { ComplianceHttpClient } from './compliance.http-client';
import { UnitsHttpClient } from './units.http-client';
import { RoleCapabilitiesHttpClient } from './role-capabilities.http-client';
import { EventBusModule } from '../events/event-bus.module';

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
 *
 * EventBusModule is imported so RoleCapabilitiesHttpClient can optionally
 * inject EventBusService and subscribe to capabilities.updated events.
 * In services without Redis, EventBusService is @Optional() — startup
 * will succeed but live cache invalidation will be TTL-based only.
 */
@Module({
  imports: [EventBusModule],
  providers: [UsersHttpClient, ComplianceHttpClient, UnitsHttpClient, RoleCapabilitiesHttpClient],
  exports: [
    UsersHttpClient,
    ComplianceHttpClient,
    UnitsHttpClient,
    RoleCapabilitiesHttpClient,
    EventBusModule,
  ],
})
export class HttpClientsModule {}
