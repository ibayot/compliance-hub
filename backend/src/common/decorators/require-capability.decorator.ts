import { SetMetadata } from '@nestjs/common';

export const CAPABILITY_KEY = 'requiredCapability';

/**
 * Declares that a route or controller requires a specific role_capability flag.
 * Works in conjunction with CapabilityGuard.
 * Example: @RequireCapability('isTicketSettingsFocal')
 */
export const RequireCapability = (capability: string) => SetMetadata(CAPABILITY_KEY, capability);
