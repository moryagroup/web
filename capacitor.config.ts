import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moryagroup.app',
  appName: 'Morya Group',
  webDir: 'dist',
  server: {
    // URL for live web auto-sync. Replace this with your production web host URL
    // e.g., url: 'https://moryagroup.org',
    // During local development, un-comment live reload settings:
    // url: 'http://192.168.1.100:3000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
      showSpinner: false,
    },
  },
};

export default config;
