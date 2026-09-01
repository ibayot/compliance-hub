import { Capacitor } from '@capacitor/core';
import {
  AccessControl,
  NativeBiometric,
} from '@capgo/capacitor-native-biometric';

// This is an app-scoped keychain/keystore namespace, not a network endpoint.
export const BIOMETRIC_SERVER = 'compliance-hub';

export const isNativeApp = () => Capacitor.isNativePlatform();

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const result = await NativeBiometric.isAvailable({ useFallback: false });
  return result.isAvailable;
}

export async function hasBiometricCredentials(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const result = await NativeBiometric.isCredentialsSaved({ server: BIOMETRIC_SERVER });
  return result.isSaved;
}

export async function saveBiometricCredentials(username: string, password: string): Promise<void> {
  await NativeBiometric.setCredentials({
    username,
    password,
    server: BIOMETRIC_SERVER,
    accessControl: AccessControl.BIOMETRY_ANY,
    title: 'Enable Biometric Login',
    negativeButtonText: 'Cancel',
  });
}

export async function deleteBiometricCredentials(): Promise<void> {
  if (!isNativeApp()) return;
  await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
}

export async function getBiometricCredentials() {
  return NativeBiometric.getSecureCredentials({
    server: BIOMETRIC_SERVER,
    reason: 'Authenticate to sign in to RICTMS Compliance Hub',
    title: 'Biometric Login',
    subtitle: 'Use your device biometrics to continue',
    negativeButtonText: 'Cancel',
  });
}
