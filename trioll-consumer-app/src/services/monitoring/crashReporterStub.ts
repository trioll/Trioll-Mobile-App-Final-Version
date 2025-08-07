
/**
 * Crash Reporter Stub
 * Simple implementation without Sentry to avoid import errors
 */

import { getLogger } from '../../utils/logger';

const logger = getLogger('CrashReporter');

class CrashReporterStub {
  async initialize() : Promise<void> {
    // Stub - no initialization needed
  }

  setUser(userId: string, properties?: Record<string, unknown>) {
    logger.debug('User set:', { userId, properties });
  }

  addBreadcrumb(
    message: string,
    category?: string,
    level?: string,
    data?: Record<string, unknown>
  ) {
    logger.debug('Breadcrumb:', { message, category, level, data });
  }

  captureException(error: Error, context?: Record<string, unknown>) {
    logger.error('Exception captured:', error, context);
  }

  logError(message: string, error: Error) {
    logger.error(message, error);
  }

  captureMessage(message: string, level?: string) {
    logger.info('Message captured:', { message, level });
  }

  setContext(_key: string, _context: Record<string, unknown>) {
    // Stub
  }

  startTransaction(_name: string, _op: string) {
    return {
      setStatus: () => {},
      finish: () => {},
      setTag: () => {},
    };
  }

  testCrash() {
    logger.warn('Test crash called');
  }
}

export const crashReporter = new CrashReporterStub();
