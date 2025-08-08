
import * as Sentry from '@sentry/react-native';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../../config/environments';
import { sessionManager } from '../../../utils/sessionManager';
import { getLogger } from '../../utils/logger';

const logger = getLogger('crashReporter');
interface CrashContext {
  userId?: string;
  sessionId?: string;
  lastAction?: string;
  appState?: string;
  networkState?: boolean;
  memoryUsage?: number;
  batteryLevel?: number;
}

class CrashReporter {
  private initialized = false;
  private crashContext: CrashContext = {};
  private breadcrumbLimit = 100;

  async initialize() : Promise<void> {
    if (!Config.FEATURES.CRASH_REPORTING || this.initialized) {
      logger.info('Crash reporting disabled or already initialized');
      return;
    }

    // Get Sentry DSN from environment or config
    const sentryDsn = process.env.REACT_APP_SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;
    
    if (!sentryDsn) {
      logger.info('No Sentry DSN configured, crash reporting disabled');
      return;
    }

    // Only initialize Sentry in staging/production environments
    if (Config.ENV === 'development') {
      logger.info('Sentry disabled in development environment');
      return;
    }

    try {
      Sentry.init({
        dsn: sentryDsn,
        debug: Config.DEBUG.ENABLE_LOGGING && Config.ENV !== 'production',
        environment: Config.ENV,
        tracesSampleRate: Config.ENV === 'production' ? 0.1 : 1.0,
        release: `trioll-mobile@1.0.0`, // TODO: Import version from config
        dist: `${Config.ENV}-${Date.now()}`,

        beforeSend: event => {
          // Filter out sensitive data
          return this.sanitizeEvent(event) as unknown;
        },

        integrations: [
          Sentry.reactNavigationIntegration(),
          Sentry.httpIntegration({
            tracePropagationTargets: [Config.API_BASE_URL],
          }),
        ],

        // Performance monitoring
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
        enableNativeCrashHandling: true,
        enableAutoPerformanceTracking: true,
      });

      this.initialized = true;
      this.setupContextEnrichment();
      this.setupErrorBoundaries();
    } catch (error) {
      logger.error('Failed to initialize crash reporter:', error);
    }
  }

  // Sanitize sensitive data from crash reports
  private sanitizeEvent(event: Sentry.Event): Sentry.Event | null {
    // Remove sensitive data from request
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      if ((event.request as unknown).data) {
        (event.request as unknown).data = this.sanitizeObject((event.request as unknown).data);
      }
    }

    // Remove sensitive data from context
    if (event.contexts) {
      event.contexts = this.sanitizeObject(event.contexts);
    }

    // Remove sensitive data from extra
    if (event.extra) {
      event.extra = this.sanitizeObject(event.extra);
    }

    return event;
  }

  private sanitizeObject(obj: unknown): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'credit',
      'card',
      'ssn',
      'pin',
      'cvv',
    ];

    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeObject(sanitized[key]);
      }
    }

    return sanitized;
  }

  // Setup context enrichment
  private async setupContextEnrichment() : Promise<void> {
    // Set user context
    const session = await sessionManager.getSession();
    const userId = session?.user?.id;
    if (userId) {
      this.setUser(userId);
    }

    // Set app context
    Sentry.setContext('app', {
      environment: Config.ENV,
      version: '1.0.0', // TODO: Import version from config
      mockApiEnabled: Config.USE_MOCK_API,
    });

    // Monitor app state changes
    this.monitorAppState();
    this.monitorMemory();
    this.monitorNetwork();
  }

  // Setup error boundaries
  private setupErrorBoundaries() {
    // Global error handler
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.captureException(error, {
        fatal: isFatal,
        handled: false,
      });

      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    // Promise rejection handler for React Native
    const handleUnhandledRejection = (reason: any, _promise: Promise<unknown>) => {
      this.captureException(new Error(reason?.toString() || 'Unhandled Promise Rejection'), {
        handled: false,
        mechanism: 'onunhandledrejection',
      });
    };

    // React Native doesn't have global.onunhandledrejection
    // Instead, Sentry handles this automatically
  }

  // Set user context
  setUser(userId: string, additionalData?: Record<string, any>) {
    this.crashContext.userId = userId;

    Sentry.setUser({
      id: userId,
      ...additionalData,
    });
  }

  // Clear user context
  clearUser() {
    this.crashContext.userId = undefined;
    Sentry.setUser(null);
  }

  // Add breadcrumb
  addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ) {
    if (!Config.FEATURES.CRASH_REPORTING) return;

    this.crashContext.lastAction = `${category}: ${message}`;

    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now() / 1000,
      data: this.sanitizeObject({ ...data }),
    });
  }

  // Capture exception
  captureException(
    error: Error | string,
    context?: {
      level?: 'fatal' | 'error' | 'warning' | 'info';
      tags?: Record<string, string>;
      extra?: Record<string, any>;
      handled?: boolean;
      fatal?: boolean;
      mechanism?: string;
    }
  ) {
    if (!Config.FEATURES.CRASH_REPORTING) {
      logger.error('Crash reporting disabled:', error);
      return;
    }

    const errorObj = typeof error === 'string' ? new Error(error as any) : error;

    Sentry.withScope(scope => {
      // Set severity
      scope.setLevel(context?.level || 'error');

      // Add tags
      if (context?.tags) {
        Object.keys(context.tags).forEach((key) => { const value = context.tags[key];
          scope.setTag(key, value);
        });
      }

      // Add extra context
      scope.setContext('crash', {
        ...this.crashContext,
        timestamp: new Date().toISOString(),
        handled: context?.handled ?? true,
        fatal: context?.fatal ?? false,
        mechanism: context?.mechanism ?? 'manual',
      });

      if (context?.extra) {
        scope.setContext('extra', this.sanitizeObject({ ...context.extra }));
      }

      // Capture the exception
      Sentry.captureException(errorObj);
    });

    // Store crash locally for offline reporting
    this.storeCrashLocally(errorObj, context);
  }

  // Capture message
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' = 'info',
    context?: Record<string, any>
  ) {
    if (!Config.FEATURES.CRASH_REPORTING) return;

    // Map 'fatal' to 'error' for Sentry
    const sentryLevel = level === 'fatal' ? 'error' : level;
    Sentry.captureMessage(message, sentryLevel as unknown);

    if (context) {
      // Map 'fatal' to 'error' for breadcrumb level
      const breadcrumbLevel = level === 'fatal' ? 'error' : level;
      this.addBreadcrumb(message, 'message', breadcrumbLevel as unknown, context);
    }
  }

  // Monitor app state
  private monitorAppState() {
    let lastState = 'active';

    AppState.addEventListener('change', nextState => {
      this.crashContext.appState = nextState;

      this.addBreadcrumb(
        `App state changed from ${lastState} to ${nextState}`,
        'app.lifecycle',
        'info'
      );

      lastState = nextState;
    });
  }

  // Monitor memory usage
  private monitorMemory() {
    setInterval(() => {
      // @ts-ignore - performance.memory might not be available
      if (global.performance?.memory) {
        // @ts-ignore
        const memoryUsage =
          global.performance.memory.usedJSHeapSize /
          // @ts-ignore
          global.performance.memory.totalJSHeapSize;

        this.crashContext.memoryUsage = Math.round(memoryUsage * 100);

        if (memoryUsage > 0.9) {
          this.captureMessage('High memory usage detected', 'warning', {
            memoryUsage: this.crashContext.memoryUsage,
          });
        }
      }
    }, 60000); // Check every minute
  }

  // Monitor network state
  private monitorNetwork() {
    setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      const isConnected = state.isConnected && state.isInternetReachable;
      
      if (this.crashContext.networkState !== isConnected) {
        this.crashContext.networkState = isConnected;

        this.addBreadcrumb(
          `Network state changed: ${isConnected ? 'connected' : 'disconnected'}`,
          'network',
          'info',
          {
            type: state.type || Network.NetworkStateType.UNKNOWN,
            isInternetReachable: state.isInternetReachable,
          }
        );
      }
    }, 5000);
  }

  // Store crash locally for offline reporting
  private async storeCrashLocally(error: Error, context?: any) {
    try {
      const crashes = await AsyncStorage.getItem('offline_crashes');
      const crashList = crashes ? JSON.parse(crashes) : [];

      crashList.push({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context: {
          ...context,
          ...this.crashContext,
          timestamp: new Date().toISOString(),
        },
      });

      // Keep only last 50 crashes
      const trimmedList = crashList.slice(-50);

      await AsyncStorage.setItem('offline_crashes', JSON.stringify(trimmedList));
    } catch (e) {
      logger.error('Failed to store crash locally:', e);
    }
  }

  // Report offline crashes
  async reportOfflineCrashes() : Promise<void> {
    if (!Config.FEATURES.CRASH_REPORTING) return;

    try {
      const crashes = await AsyncStorage.getItem('offline_crashes');
      if (!crashes) return;

      const crashList = JSON.parse(crashes);

      for (let i = 0; i < crashList.length; i++) {
        const crash = crashList[i];
        const error = new Error((crash as any).error.message);
        error.name = (crash as any).error.name;
        error.stack = (crash as any).error.stack;

        this.captureException(error, {
          ...crash.context,
          extra: {
            ...crash.context,
            offline: true,
            originalTimestamp: crash.context.timestamp,
           },
        });
      }

      // Clear reported crashes
      await AsyncStorage.removeItem('offline_crashes');
    } catch (error) {
      logger.error('Failed to report offline crashes:', error);
    }
  }

  // Performance transaction
  startTransaction(name: string, op: string) {
    if (!Config.FEATURES.PERFORMANCE_MONITORING) return null;

    // In newer Sentry versions, use startSpan instead
    return Sentry.startSpan({ name, op }, () => {
      return {
        finish: () => {},
        setData: () => {},
        setStatus: () => {},
      };
    });
  }

  // Profile transaction
  async profileTransaction<T>(name: string, op: string, callback: () => Promise<T>): Promise<T> {
    const transaction = this.startTransaction(name, op);

    try {
      const result = await callback();
      transaction?.setStatus('ok');
      return result;
    } catch (error) {
      transaction?.setStatus('internal_error');
      throw error;
    } finally {
      transaction?.finish();
    }
  }

  // Test crash reporting
  testCrash() {
    if (Config.ENV === 'production') {
      logger.warn('Test crash disabled in production');
      return;
    }

    throw new Error('Test crash for crash reporting verification');
  }
}

export const crashReporter = new CrashReporter();
