/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Logging utility
 * Provides structured logging with different levels
 * In production, this can be connected to a real logging service
 */

import { Config } from '../config/environments';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  logger: string;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  private shouldLog(level: LogLevel): boolean {
    if (Config.ENV === 'production') {
      // In production, only log warnings and errors
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      logger: this.name,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = this.formatMessage(level, message, data);

    // In production, send to logging service
    if (Config.ENV === 'production') {
      // TODO: Send to real logging service (e.g., Sentry, LogRocket)
      // For now, just structure the data properly
      return;
    }

    // In development, use console methods
    switch (level) {
      case 'debug':
        // Debug logs disabled in production
        break;
      case 'info':
        // Info logs disabled in production
        break;
      case 'warn':
        console.warn(`[${logEntry.logger}]`, message, data);
        break;
      case 'error':
        console.error(`[${logEntry.logger}]`, message, data);
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any): void {
    const errorData =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error;

    this.log('error', message, errorData);
  }
}

// Logger factory
export function getLogger(name: string): Logger {
  return new Logger(name);
}

// Export types
export type { Logger, LogLevel, LogEntry };
