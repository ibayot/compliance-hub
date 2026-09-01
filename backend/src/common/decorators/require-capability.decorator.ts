import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

export const CAPABILITY_KEY = 'requiredCapability';
export type CapabilityRequirement = string | string[];

/**
 * Declares that a route or controller requires a specific role_capability flag.
 * Works in conjunction with CapabilityGuard.
 * Example: @RequireCapability('isTicketSettingsFocal')
 */
export const RequireCapability = (capability: CapabilityRequirement) => {
  const capabilities = Array.isArray(capability) ? capability : [capability];
  return applyDecorators(
    SetMetadata(CAPABILITY_KEY, capability),
    ApiExtension('x-required-capabilities', { anyOf: capabilities }),
  );
};
