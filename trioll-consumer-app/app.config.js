// Load environment variables
import 'dotenv/config';

export default {
  expo: {
    name: 'Trioll Mobile',
    slug: 'trioll-mobile',
    version: '1.0.0',
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1a1a2e',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.trioll.mobile',
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'This app uses the camera to scan QR codes for game invites.',
        NSPhotoLibraryUsageDescription:
          'This app needs access to photo library to save game screenshots.',
        NSPhotoLibraryAddUsageDescription:
          'This app needs permission to save game screenshots to your photo library.',
        NSMicrophoneUsageDescription:
          'This app uses the microphone for voice chat in multiplayer games.',
        NSFaceIDUsageDescription: 'This app uses Face ID for secure authentication.',
        ITSAppUsesNonExemptEncryption: false,
      },
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.triollmobile',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1a1a2e',
      },
      permissions: [
        'CAMERA',
        'RECORD_AUDIO',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'USE_FINGERPRINT',
        'USE_BIOMETRIC',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'VIBRATE',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 34,
            buildToolsVersion: '35.0.0',
            minSdkVersion: 24,
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
          ios: {
            deploymentTarget: '15.1',
          },
        },
      ],
      'expo-localization',
      'expo-av',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#6366f1',
        },
      ],
      [
        'expo-updates',
        {
          username: 'trioll',
          enabled: true,
          checkAutomatically: 'ON_LOAD',
          fallbackToCacheTimeout: 30000,
        },
      ],
    ],
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID || 'your-eas-project-id',
      },
      // Pass environment variables to the app
      API_BASE_URL: process.env.API_BASE_URL,
      WEBSOCKET_URL: process.env.WEBSOCKET_URL,
      AWS_REGION: process.env.AWS_REGION,
      AWS_COGNITO_USER_POOL_ID: process.env.AWS_COGNITO_USER_POOL_ID,
      AWS_COGNITO_CLIENT_ID: process.env.AWS_COGNITO_CLIENT_ID,
      AWS_COGNITO_IDENTITY_POOL_ID: process.env.AWS_COGNITO_IDENTITY_POOL_ID,
      S3_GAMES_BUCKET: process.env.S3_GAMES_BUCKET,
      S3_UPLOADS_BUCKET: process.env.S3_UPLOADS_BUCKET,
      ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
      ENABLE_CRASH_REPORTING: process.env.ENABLE_CRASH_REPORTING,
      ENABLE_WEBSOCKET: process.env.ENABLE_WEBSOCKET,
      ENABLE_OFFLINE_MODE: process.env.ENABLE_OFFLINE_MODE,
      DEBUG_MODE: process.env.DEBUG_MODE,
      LOG_LEVEL: process.env.LOG_LEVEL,
      ENABLE_NETWORK_INSPECTOR: process.env.ENABLE_NETWORK_INSPECTOR,
      APP_VERSION: process.env.APP_VERSION,
      BUILD_NUMBER: process.env.BUILD_NUMBER,
      ENVIRONMENT: process.env.ENVIRONMENT,
    },
    updates: {
      url: 'https://u.expo.dev/your-eas-project-id',
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 30000,
    },
    runtimeVersion: '1.0.0',
  },
};