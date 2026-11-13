import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dswd.compliancehub',
  appName: 'Compliance Hub',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_WEB_CLIENT_ID_HERE',
      forceCodeForRefreshToken: true,
    },
  },
  // Set only by the Android debug build script for the emulator connection.
  server: process.env.CAPACITOR_ANDROID_DEBUG_NETWORK === '1' ? {
    cleartext: true,
    androidScheme: 'http',
  } : { cleartext: false }
};

export default config;
