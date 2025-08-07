import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { crashReportingService } from '../../src/services/monitoring/crashReportingService';
import { errorMonitoringService } from '../../src/services/monitoring/errorMonitoringService';
import * as Updates from 'expo-updates';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({ children }) => {
  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Initialize crash reporting if not already done
    crashReportingService.initialize({
      appVersion: (Updates.manifest as any)?.version || (Updates.manifest as any)?.runtimeVersion || 'unknown',
    });

    // Report critical app-level error
    crashReportingService.reportError(error, {
      level: 'global',
      context: 'App',
      componentStack: errorInfo.componentStack,
      fatal: true,
      additionalData: {
        errorBoundary: 'AppErrorBoundary',
        timestamp: new Date().toISOString(),
      },
    });

    // Track in error monitoring
    errorMonitoringService.trackError({
      error,
      context: 'App',
      level: 'global',
      timestamp: Date.now(),
    });

    // Log to console in development
    if (__DEV__) {
      console.error('Global app error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  };

  return (
    <ErrorBoundary level="global" context="App" onError={handleGlobalError} showDevInfo={__DEV__}>
      {children}
    </ErrorBoundary>
  );
};
