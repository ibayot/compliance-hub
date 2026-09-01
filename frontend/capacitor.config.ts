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
  server: {
    cleartext: true,
    allowNavigation: ['10.0.2.2']
  }
};

export default config;
