import { CapabilityGuard } from './capability.guard';
import { CAPABILITY_KEY } from '../decorators/require-capability.decorator';

describe('CapabilityGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const roleCapSvc = {
    isTicketModuleAccess: jest.fn(),
  };
  const guard = new CapabilityGuard(reflector as any, roleCapSvc as any);

  const contextFor = (role?: string) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows routes without a capability requirement', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextFor('custom_role'))).toBe(true);
    expect(roleCapSvc.isTicketModuleAccess).not.toHaveBeenCalled();
  });

  it('allows a custom role when the database capability is enabled', () => {
    reflector.getAllAndOverride.mockReturnValue('isTicketModuleAccess');
    roleCapSvc.isTicketModuleAccess.mockReturnValue(true);

    expect(guard.canActivate(contextFor('custom_role'))).toBe(true);
    expect(roleCapSvc.isTicketModuleAccess).toHaveBeenCalledWith('custom_role');
  });

  it('denies a role when the database capability is disabled', () => {
    reflector.getAllAndOverride.mockReturnValue('isTicketModuleAccess');
    roleCapSvc.isTicketModuleAccess.mockReturnValue(false);

    expect(guard.canActivate(contextFor('custom_role'))).toBe(false);
  });

  it('denies requests without an authenticated role', () => {
    reflector.getAllAndOverride.mockReturnValue('isTicketModuleAccess');

    expect(guard.canActivate(contextFor())).toBe(false);
    expect(roleCapSvc.isTicketModuleAccess).not.toHaveBeenCalled();
  });

  it('denies unknown capability names instead of granting access', () => {
    reflector.getAllAndOverride.mockReturnValue('notARealCapability');

    expect(guard.canActivate(contextFor('custom_role'))).toBe(false);
  });

  it('uses the handler/class metadata key used by RequireCapability', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    guard.canActivate(contextFor('custom_role'));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      CAPABILITY_KEY,
      expect.any(Array),
    );
  });
});