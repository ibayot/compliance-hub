/**
 * Shared entity re-exports — Phase A service boundary.
 *
 * Why this file exists:
 *  These entity classes are owned by the users-service domain but are referenced by
 *  TypeORM JOIN relationships in ticketing and compliance service entities.
 *  By routing all cross-domain entity imports through this shared barrel, we:
 *
 *  1. Create an explicit "shared contract boundary" — if you ever move to separate
 *     npm packages, only this file needs to change in dependent packages.
 *  2. Make cross-boundary coupling visible and searchable.
 *  3. Prevent direct "../../users/entities/..." imports from spreading throughout
 *     the codebase (enforce via ESLint rule in future).
 *
 * Migration path (Phase A):
 *  The re-exported classes ARE the same TypeScript class objects — TypeORM sees
 *  them as identical references regardless of import path. No runtime behaviour changes.
 *
 * Future (Phase A full):
 *  When services are split into separate npm packages, these re-exports will be
 *  replaced with imports from a shared @compliance-hub/entities package, and the
 *  TypeORM entities will be replaced with plain value-object stubs + integer FK columns.
 */

// Users domain — owned by users-service
export { User, UserRole, AuthProvider } from '../../users/entities/user.entity';
export { RoleDefinitionEntity } from '../../users/entities/role-definition.entity';
export { RoleCapability } from '../../users/entities/role-capability.entity';

// Units domain — owned by users-service (unit master data)
export { Unit } from '../../units/entities/unit.entity';
