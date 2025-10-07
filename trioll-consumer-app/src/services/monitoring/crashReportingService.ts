
import { getLogger } from '../../utils/logger';

const logger = getLogger('CrashReportingService');

export interface CrashReport {
  error: Error;
  context: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  appVersion?: string;
  platform?: string;
  osVersion?: string;
  deviceModel?: string;
}

export interface CrashReportingOptions {
  level?: 'global' | 'screen' | 'component';
  context?: string;
  componentStack?: string;
  fatal?: boolean;
  additionalData?: Record<string, unknown>;
}

class CrashReportingService {
  private queue: CrashReport[] = [];
  private maxQueueSize = 100;
  private isInitialized = false;
  private userId?: string;
  private sessionId?: string;

  initialize(config?: { userId?: string; sessionId?: string; appVersion?: string }) {
    this.userId = config?.userId;
    this.sessionId = config?.sessionId;
    this.isInitialized = true;

    logger.info('Crash reporting service initialized');

    // Process any queued reports
    this.processQueue();
  }

  reportError(error: Error, options: CrashReportingOptions = {}) {
    const report: CrashReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as Error,
      context: {
        level: options.level || 'component',
        contextName: options.context || 'Unknown',
        componentStack: options.componentStack,
        fatal: options.fatal || false,
        ...options.additionalData,
      },
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    // Add to queue
    this.queue.push(report);

    // Limit queue size
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift();
    }

    // Log locally
    if (options.fatal) {
      logger.error('Fatal error reported', report);
    } else {
      logger.warn('Error reported', report);
    }

    // Process immediately if fatal
    if (options.fatal) {
      this.sendReport(report);
    } else {
      // Batch non-fatal errors
      this.scheduleProcessing();
    }
  }

  reportCrash(crashData: {
    reason: string;
    stackTrace?: string;
    context?: Record<string, unknown>;
  }) {
    const error = new Error(crashData.reason);
    if (crashData.stackTrace) {
      error.stack = crashData.stackTrace;
    }

    this.reportError(error, {
      level: 'global',
      fatal: true,
      additionalData: crashData.context,
    });
  }

  setUser(userId: string) {
    this.userId = userId;
  }

  setSession(sessionId: string) {
    this.sessionId = sessionId;
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, unknown>;
  }) {
    // Store breadcrumbs for context in crash reports
    logger.info('Breadcrumb added', breadcrumb);
  }

  private scheduleProcessing() {
    // Debounce processing to batch errors
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }

    this.processingTimer = setTimeout(() => {
      this.processQueue();
    }, 5000); // Process after 5 seconds
  }

  private processingTimer?: ReturnType<typeof setTimeout>;

  private async processQueue() : Promise<void> {
    if (!this.isInitialized || this.queue.length === 0) {
      return;
    }

    const reports = [...this.queue];
    this.queue = [];

    // In production, send to crash reporting service
    if (!__DEV__) {
      try {
        // TODO: Implement actual crash reporting service integration
        // e.g., Sentry, Bugsnag, Firebase Crashlytics
        logger.info(`Would send ${reports.length} crash reports to service`);
      } catch {
        logger.error('Failed to send crash reports', error);
        // Re-queue failed reports
        this.queue.unshift(...reports);
      }
    }
  }

  private async sendReport(report: CrashReport) {
    // Send single report immediately (for fatal errors)
    if (!__DEV__) {
      try {
        // TODO: Implement actual crash reporting service integration
        logger.info('Would send crash report to service', report);
      } catch {
        logger.error('Failed to send crash report', error);
      }
    }
  }

  // Get recent crashes for debugging
  getRecentCrashes(limit = 10): CrashReport[] {
    return this.queue.slice(-limit);
  }

  // Clear crash history
  clearHistory() {
    this.queue = [];
  }
}

export const crashReportingService = new CrashReportingService();
