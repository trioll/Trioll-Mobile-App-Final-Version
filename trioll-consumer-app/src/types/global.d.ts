/**
 * Global Type Declarations
 * Defines global variables used throughout the app
 */

declare global {
  // Auth tokens stored globally for quick access
  var authTokens: any;

  // React Native development flag
  var __DEV__: boolean;

  // Node.js style process (for Metro bundler)
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// This is needed to make this file a module
export {};

// Missing type definitions
declare module 'amazon-cognito-identity-js';
declare module '@testing-library/react-native';
declare module 'jest-websocket-mock';

// Extended type definitions
interface SortOption {
  label: string;
  value: string;
  key: string;
}

interface CacheManager {
  clear(): Promise<void>;
  get(key: string): Promise<unknown>;
  set(key: string, value: any): Promise<void>;
}

interface OfflineQueueManager {
  addToQueue(action: any): void;
  processQueue(): Promise<void>;
  getQueueSize(): number;
  clearQueue(): void;
}

interface AnalyticsService {
  trackEvent(eventName: string, properties?: any): void;
  setUserId(userId: string): void;
  reset(): void;
}

// Extend window for test environments
declare global {
  interface Window {
    __TEST_MODE__?: boolean;
  }
}
