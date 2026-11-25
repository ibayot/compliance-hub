export type MobileDevicePlatform = 'android' | 'ios';

type DeviceIdentity = Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> & {
  userAgentData?: { platform?: string };
};

// Device identity stays independent of window width and the responsive shell.
export function getMobileDevicePlatform(device: DeviceIdentity = navigator): MobileDevicePlatform | null {
  if (/\bAndroid\b/i.test(`${device.userAgentData?.platform ?? ''} ${device.userAgent}`)) return 'android';
  if (/iPhone|iPad|iPod/i.test(device.userAgent) ||
      (/Mac/i.test(`${device.platform} ${device.userAgent}`) && device.maxTouchPoints > 1)) return 'ios';
  return null;
}
