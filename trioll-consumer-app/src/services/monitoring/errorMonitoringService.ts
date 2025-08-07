import { getLogger } from '../../utils/logger';

const logger = getLogger('ErrorMonitoringService');

export interface ErrorEvent {
  error: Error;
  context: string;
  level: 'global' | 'screen' | 'component';
  timestamp: number;
  count?: number;
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  contexts: Set<string>;
  levels: Set<string>;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByContext: Record<string, number>;
  errorRate: number; // errors per minute
  topErrors: ErrorPattern[];
}

class ErrorMonitoringService {
  private errorHistory: ErrorEvent[] = [];
  private errorPatterns = new Map<string, ErrorPattern>();
  private maxHistorySize = 1000;
  private errorRateWindow = 60000; // 1 minute

  trackError(event: ErrorEvent) {
    // Add to history
    this.errorHistory.push(event);

    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Track patterns
    this.updateErrorPattern(event);

    // Check for critical patterns
    this.checkCriticalPatterns(event);
  }

  private updateErrorPattern(event: ErrorEvent) {
    const key = this.getErrorKey(event.error);
    const existing = this.errorPatterns.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = event.timestamp;
      existing.contexts.add(event.context);
      existing.levels.add(event.level);
    } else {
      this.errorPatterns.set(key, {
        pattern: key,
        count: 1,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        contexts: new Set([event.context]),
        levels: new Set([event.level]),
      });
    }
  }

  private getErrorKey(error: Error): string {
    // Create a unique key for error pattern detection
    return `${error.name}:${error.message}`;
  }

  private checkCriticalPatterns(event: ErrorEvent) {
    const pattern = this.errorPatterns.get(this.getErrorKey(event.error));

    if (!pattern) return;

    // Check for rapid error occurrence
    const timeSinceFirst = event.timestamp - pattern.firstSeen;
    const errorRate = pattern.count / (timeSinceFirst / 60000); // errors per minute

    if (errorRate > 10 && pattern.count > 5) {
      logger.error('Critical error pattern detected', {
        pattern: pattern.pattern,
        count: pattern.count,
        rate: errorRate,
        contexts: Array.prototype.slice.call(pattern.contexts),
      });

      // TODO: Trigger alerts or take action
    }

    // Check for errors affecting multiple contexts
    if (pattern.contexts.size > 5) {
      logger.warn('Error affecting multiple contexts', {
        pattern: pattern.pattern,
        contextCount: pattern.contexts.size,
        contexts: Array.prototype.slice.call(pattern.contexts),
      });
    }
  }

  getMetrics(): ErrorMetrics {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(e => now - e.timestamp < this.errorRateWindow);

    const errorsByLevel: Record<string, number> = {};
    const errorsByContext: Record<string, number> = {};

    for (let i = 0; i < this.errorHistory.length; i++) {
        const error = this.errorHistory[i];
      errorsByLevel[error.level] = (errorsByLevel[error.level] || 0) + 1;
      errorsByContext[error.context] = (errorsByContext[error.context] || 0) + 1;
     }

    const topErrors = Array.prototype.slice.call(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: this.errorHistory.length,
      errorsByLevel,
      errorsByContext,
      errorRate: recentErrors.length,
      topErrors,
    };
  }

  getErrorsByTimeRange(startTime: number, endTime: number): ErrorEvent[] {
    return this.errorHistory.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  getErrorsByContext(context: string): ErrorEvent[] {
    return this.errorHistory.filter(e => e.context === context);
  }

  getErrorsByLevel(level: string): ErrorEvent[] {
    return this.errorHistory.filter(e => e.level === level);
  }

  getErrorPattern(error: Error): ErrorPattern | undefined {
    return this.errorPatterns.get(this.getErrorKey(error as any));
  }

  clearHistory() {
    this.errorHistory = [];
    this.errorPatterns.clear();
  }

  // Check if error rate is above threshold
  isErrorRateHigh(threshold = 5): boolean {
    const metrics = this.getMetrics();
    return metrics.errorRate > threshold;
  }

  // Get most common errors
  getMostCommonErrors(limit = 5): ErrorPattern[] {
    return Array.prototype.slice.call(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Export error data for analysis
  exportErrorData(): {
    history: ErrorEvent[];
    patterns: Record<string, ErrorPattern>;
    metrics: ErrorMetrics;
  } {
    return {
      history: this.errorHistory,
      patterns: Object.fromEntries(
        Array.prototype.slice.call(this.errorPatterns.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            contexts: Array.prototype.slice.call(value.contexts),
            levels: Array.prototype.slice.call(value.levels),
          },
        ])
      ),
      metrics: this.getMetrics(),
    };
  }
}

export const errorMonitoringService = new ErrorMonitoringService();
