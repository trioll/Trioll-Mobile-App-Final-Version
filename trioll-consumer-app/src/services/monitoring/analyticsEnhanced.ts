
import AsyncStorage from '../../utils/storageCompat';
import * as Network from 'expo-network';
import { Config } from '../../config/environments';
import { performanceMonitor } from './performanceMonitor';
import { crashReporter } from './crashReporterStub';
import { Platform, AppState } from 'react-native';
import { getLogger } from '../../utils/logger';

const logger = getLogger('AnalyticsService');

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  deviceId: string;
  platform: string;
  appVersion: string;
  environment: string;
}

interface UserProperties {
  userId: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

interface AnalyticsSession {
  id: string;
  startTime: number;
  endTime?: number;
  eventCount: number;
  duration?: number;
}

class EnhancedAnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private userPropertiesQueue: UserProperties[] = [];
  private session: AnalyticsSession | null = null;
  private deviceId: string = '';
  private flushInterval: number | null = null;
  private batchSize = 50;
  private flushIntervalMs = 30000; // 30 seconds
  private retryCount = 3;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private lastActivityTime = Date.now();

  async initialize() : Promise<void> {
    if (!Config.FEATURES.ANALYTICS_ENABLED) return;

    try {
      // Get or create device ID
      this.deviceId = await this.getDeviceId();

      // Start session
      await this.startSession();

      // Load queued events
      await this.loadQueuedEvents();

      // Start periodic flushing
      this.startPeriodicFlush();

      // Monitor app state
      this.monitorAppState();

      // Monitor network state
      this.monitorNetworkState();
    } catch (error) {
      logger.error('Failed to initialize analytics:', error);
      crashReporter.captureException(error as Error, {
        tags: { component: 'analytics' },
      });
    }
  }

  // Track event
  async track(event: string, properties?: Record<string, unknown>) {
    if (!Config.FEATURES.ANALYTICS_ENABLED) return;

    try {
      const analyticsEvent: AnalyticsEvent = {
        event,
        properties: this.sanitizeProperties(properties),
        timestamp: Date.now(),
        sessionId: this.session?.id || 'unknown',
        userId: await this.getUserId(),
        deviceId: this.deviceId,
        platform: Platform.OS,
        appVersion: require('../../../package.json').version,
        environment: Config.ENV,
      };

      // Add to queue
      this.queue.push(analyticsEvent);

      // Update session
      this.updateSession();

      // Add breadcrumb for crash reporting
      crashReporter.addBreadcrumb(event, 'analytics', 'info', properties);

      // Flush if batch is full
      if (this.queue.length >= this.batchSize) {
        await this.flush();
      }

      // Store locally for offline support
      await this.storeEventLocally(analyticsEvent);
    } catch (error) {
      logger.error('Failed to track event:', error);
    }
  }

  // Track screen view
  async trackScreen(screenName: string, properties?: Record<string, unknown>) {
    const stopMeasure = performanceMonitor.measureScreenRender(screenName);

    await this.track('screen_view', {
      screen_name: screenName,
      ...properties,
    });

    return stopMeasure;
  }

  // Track user properties
  async identify(userId: string, properties: Record<string, unknown>) {
    if (!Config.FEATURES.ANALYTICS_ENABLED) return;

    try {
      const userProperties: UserProperties = {
        userId,
        properties: this.sanitizeProperties(properties),
        timestamp: Date.now(),
      };

      this.userPropertiesQueue.push(userProperties);

      // Update crash reporter user context
      crashReporter.setUser(userId, properties);

      // Store user ID
      await AsyncStorage.setItem('analytics_user_id', userId);

      // Flush user properties immediately
      await this.flushUserProperties();
    } catch (error) {
      logger.error('Failed to identify user:', error);
    }
  }

  // Track revenue
  async trackRevenue(amount: number, currency: string, properties?: Record<string, unknown>) {
    await this.track('revenue', {
      amount,
      currency,
      ...properties,
    });
  }

  // Track performance metrics
  async trackPerformance(metric: string, value: number, properties?: Record<string, unknown>) {
    await this.track('performance_metric', {
      metric,
      value,
      ...properties,
    });
  }

  // Track errors
  async trackError(error: Error | string, properties?: Record<string, unknown>) {
    const errorObj = typeof error === 'string' ? new Error(error as any) : error;

    await this.track('error', {
      error_name: errorObj.name,
      error_message: errorObj.message,
      error_stack: errorObj.stack,
      ...properties,
    });
  }

  // Batch track events
  async trackBatch(event: string, items: unknown[]) {
    if (!Config.FEATURES.ANALYTICS_ENABLED) return;

    const events = items.map(item => ({
      event,
      properties: this.sanitizeProperties(item),
      timestamp: Date.now(),
      sessionId: this.session?.id || 'unknown',
      userId: null, // Will be filled during flush
      deviceId: this.deviceId,
      platform: Platform.OS,
      appVersion: require('../../../package.json').version,
      environment: Config.ENV,
    }));

    this.queue.push(...events);

    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  // Flush events to server
  private async flush() : Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      const networkState = await Network.getNetworkStateAsync();
      const isOnline = networkState.isConnected && networkState.isInternetReachable;

      if (!isOnline) {
        // Re-queue events if offline
        this.queue.unshift(...events);
        return;
      }

      // Add user ID to events
      const userId = await this.getUserId();
      const eventsWithUserId = events.map(e => ({ ...e, userId }));

      // Send to server with retry
      await this.sendWithRetry('/analytics/events', {
        events: eventsWithUserId,
        session: this.session,
      });

      // Clear local storage after successful send
      await this.clearStoredEvents(events.length);
    } catch (error) {
      // Only log warning for analytics failures, don't crash the app
      logger.warn('Analytics flush failed, will retry later:', error);
      
      // Re-queue events on failure
      this.queue.unshift(...events);

      // Store failed events locally for future retry
      try {
        await this.storeFailedEvents(events);
      } catch (storeError) {
        // Even storage failure shouldn't crash the app
        logger.debug('Failed to store analytics events:', storeError);
      }
    }
  }

  // Flush user properties
  private async flushUserProperties() : Promise<void> {
    if (this.userPropertiesQueue.length === 0) return;

    const properties = [...this.userPropertiesQueue];
    this.userPropertiesQueue = [];

    try {
      await this.sendWithRetry('/analytics/identify', {
        users: properties,
      });
    } catch (error) {
      logger.error('Failed to flush user properties:', error);
      // Re-queue on failure
      this.userPropertiesQueue.unshift(...properties);
    }
  }

  // Send with retry logic
  private async sendWithRetry(endpoint: string, data: unknown, attempt = 1): Promise<void> {
    try {
      const stopMeasure = performanceMonitor.measureApiCall(endpoint, 'POST');

      // Get Amplify identity for auth headers
      let identityId: string | null = null;
      let isGuest = false;
      try {
        const { amplifyAuthService } = await import('../auth/amplifyAuthService');
        const state = amplifyAuthService.getCurrentState();
        identityId = state.identityId;
        isGuest = state.isGuest || false;
      } catch (e) {
        logger.debug('Could not get Amplify identity:', e);
      }

      // Build headers with auth info
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Trioll-Mobile/1.0',
      };

      // Add auth headers similar to TriollAPI
      if (identityId) {
        headers['X-Identity-Id'] = identityId;
        if (isGuest) {
          headers['X-Guest-Mode'] = 'true';
        }
      } else {
        // Fallback for guest mode
        headers['X-Guest-Mode'] = 'true';
      }
      
      // Try to get auth token for authenticated users
      if (!isGuest) {
        try {
          const { safeAuthService } = await import('../auth/safeAuthService');
          const token = await safeAuthService.getIdToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch (e) {
          logger.debug('Could not get auth token:', e);
        }
      }

      // Use fetch directly to avoid circular dependency
      const apiBase = Config.API_BASE_URL;
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Handle 502 Bad Gateway errors specifically
        if (response.status === 502) {
          logger.warn(`Analytics API returned 502 Bad Gateway, will retry (attempt ${attempt}/${this.retryCount})`);
          throw new Error(`Analytics API Error: ${response.status}`);
        }
        
        // For other errors, log as warning (not error) to prevent console spam
        // Analytics failures are non-critical and shouldn't pollute error logs
        if (response.status === 403 || response.status === 500) {
          logger.debug(`Analytics API returned ${response.status} - this is non-critical`);
        } else {
          logger.warn(`Analytics API Error: ${response.status}`);
        }
        stopMeasure();
        return; // Silently fail for non-critical analytics
      }

      stopMeasure();
    } catch (error) {
      if (attempt < this.retryCount) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        logger.debug(`Retrying analytics after ${delay}ms (attempt ${attempt + 1}/${this.retryCount})`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.sendWithRetry(endpoint, data, attempt + 1);
      }

      // After all retries, log as debug - analytics failures are non-critical
      logger.debug(`Analytics failed after ${this.retryCount} attempts (non-critical):`, error);
      return;
    }
  }

  // Session management
  private async startSession() : Promise<void> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.session = {
      id: sessionId,
      startTime: Date.now(),
      eventCount: 0,
    };

    await AsyncStorage.setItem('analytics_session', JSON.stringify(this.session));

    // Track session start
    await this.track('session_start');
  }

  private updateSession() {
    if (!this.session) return;

    const now = Date.now();

    // Check for session timeout
    if (now - this.lastActivityTime > this.sessionTimeout) {
      this.endSession();
      this.startSession();
      return;
    }

    this.lastActivityTime = now;
    this.session.eventCount++;
  }

  private async endSession() : Promise<void> {
    if (!this.session) return;

    this.session.endTime = Date.now();
    this.session.duration = this.session.endTime - this.session.startTime;

    // Track session end
    await this.track('session_end', {
      duration: this.session.duration,
      event_count: this.session.eventCount,
    });

    // Flush remaining events
    await this.flush();
    await this.flushUserProperties();

    this.session = null;
    await AsyncStorage.removeItem('analytics_session');
  }

  // Device ID management
  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('analytics_device_id');

      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('analytics_device_id', deviceId);
      }

      return deviceId;
    } catch {
      return 'unknown_device';
    }
  }

  // User ID management
  private async getUserId(): Promise<string | undefined> {
    try {
      const userId = await AsyncStorage.getItem('analytics_user_id');
      return userId || undefined;
    } catch {
      return undefined;
    }
  }

  // Sanitize properties to remove sensitive data
  private sanitizeProperties(
    properties?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!properties) return undefined;

    const sanitized = { ...properties };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  // Local storage for offline support
  private async storeEventLocally(event: AnalyticsEvent) {
    try {
      const events = await AsyncStorage.getItem('analytics_events');
      const eventList = events ? JSON.parse(events) : [];

      eventList.push(event);

      // Keep only last 1000 events
      const trimmedList = eventList.slice(-1000);

      await AsyncStorage.setItem('analytics_events', JSON.stringify(trimmedList));
    } catch (error) {
      logger.warn('Failed to store event locally:', error);
    }
    return;
}

  private async loadQueuedEvents() : Promise<void> {
    try {
      const events = await AsyncStorage.getItem('analytics_events');
      if (events) {
        const eventList = JSON.parse(events);
        this.queue.push(...eventList);
        await AsyncStorage.removeItem('analytics_events');
      }
    } catch (error) {
      logger.warn('Failed to load queued events:', error);
    }
  }

  private async storeFailedEvents(events: AnalyticsEvent[]) {
    try {
      const failedEvents = await AsyncStorage.getItem('analytics_failed_events');
      const failedList = failedEvents ? JSON.parse(failedEvents) : [];

      failedList.push(...events);

      // Keep only last 500 failed events
      const trimmedList = failedList.slice(-500);

      await AsyncStorage.setItem('analytics_failed_events', JSON.stringify(trimmedList));
    } catch (error) {
      logger.warn('Failed to store failed events:', error);
    }
    return;
}

  private async clearStoredEvents(count: number) {
    try {
      const events = await AsyncStorage.getItem('analytics_events');
      if (events) {
        const eventList = JSON.parse(events);
        const remaining = eventList.slice(count);

        if (remaining.length > 0) {
          await AsyncStorage.setItem('analytics_events', JSON.stringify(remaining));
        } else {
          await AsyncStorage.removeItem('analytics_events');
        }
      }
    } catch (error) {
      logger.warn('Failed to clear stored events:', error);
    }
  }

  // Periodic flush
  private startPeriodicFlush() {
    this.flushInterval = setInterval(async () => {
      await this.flush();
      await this.flushUserProperties();
    }, this.flushIntervalMs) as unknown as number;
  }

  // App state monitoring
  private monitorAppState() {
    AppState.addEventListener('change', async nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Flush events when app goes to background
        await this.flush();
        await this.flushUserProperties();

        // End session if going to background
        if (nextState === 'background') {
          await this.endSession();
        }
      } else if (nextState === 'active') {
        // Start new session if coming from background
        if (!this.session) {
          await this.startSession();
        }
      }
    });
  }

  // Network state monitoring
  private monitorNetworkState() {
    setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected && state.isInternetReachable && this.queue.length > 0) {
        // Flush queued events when coming online
        await this.flush();
      }
    }, 5000);
  }

  // Get analytics summary
  async getAnalyticsSummary(): Promise<{
    queuedEvents: number;
    storedEvents: number;
    failedEvents: number;
    currentSession: AnalyticsSession | null;
    deviceId: string;
  } | null> {
    try {
      const [events, failedEvents, session] = await Promise.all([
        AsyncStorage.getItem('analytics_events'),
        AsyncStorage.getItem('analytics_failed_events'),
        AsyncStorage.getItem('analytics_session'),
      ]);

      return {
        queuedEvents: this.queue.length,
        storedEvents: events ? JSON.parse(events).length : 0,
        failedEvents: failedEvents ? JSON.parse(failedEvents).length : 0,
        currentSession: session ? JSON.parse(session) : null,
        deviceId: this.deviceId,
      };
    } catch (error) {
      logger.error('Failed to get analytics summary:', error);
      return null;
    }
  }

  // Cleanup
  async cleanup() : Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.endSession();
  }
}

// Lazy initialization to prevent early instantiation
let _analyticsService: EnhancedAnalyticsService | null = null;

export const getAnalyticsService = (): EnhancedAnalyticsService => {
  if (!_analyticsService) {
    _analyticsService = new EnhancedAnalyticsService();
  }
  return _analyticsService;
};

// For backward compatibility, export a getter property
export const analyticsService = {
  get current() {
    return getAnalyticsService();
  },
  // Proxy all methods to the singleton instance
  initialize: () => getAnalyticsService().initialize(),
  track: (event: string, properties?: Record<string, unknown>) =>
    getAnalyticsService().track(event, properties),
  trackScreen: (screenName: string, properties?: Record<string, unknown>) =>
    getAnalyticsService().trackScreen(screenName, properties),
  trackRevenue: (amount: number, currency: string, properties?: Record<string, unknown>) =>
    getAnalyticsService().trackRevenue(amount, currency, properties),
  trackPerformance: (metric: string, value: number, properties?: Record<string, unknown>) =>
    getAnalyticsService().trackPerformance(metric, value, properties),
  trackError: (error: Error | string, properties?: Record<string, unknown>) =>
    getAnalyticsService().trackError(error, properties),
  identify: (userId: string, traits?: Record<string, unknown>) =>
    getAnalyticsService().identify(userId, traits || {}),
  cleanup: () => getAnalyticsService().cleanup(),
  trackWebSocketEvent: (eventName: string, data?: any) => 
    getAnalyticsService().track(`websocket_${eventName}`, data),
};
