/**
 * Debug API Test Utility
 * This utility helps troubleshoot API connection issues
 */

import { Platform } from 'react-native';
import { runAPIDebugTest, triollAPIDebug } from '../services/api/TriollAPIDebug';
import { getLogger } from './logger';

const logger = getLogger('DebugAPITest');

export interface DebugTestResult {
  success: boolean;
  connectionTest: {
    domainResolves: boolean;
    basicFetch: boolean;
    fetchWithHeaders: boolean;
    authState: boolean;
  };
  apiTest: {
    gamesEndpoint: boolean;
    responseValid: boolean;
    gameCount: number;
  };
  errors: string[];
  logs: string[];
}

/**
 * Run comprehensive API debug test
 */
export async function runComprehensiveAPITest(): Promise<DebugTestResult> {
  const result: DebugTestResult = {
    success: false,
    connectionTest: {
      domainResolves: false,
      basicFetch: false,
      fetchWithHeaders: false,
      authState: false,
    },
    apiTest: {
      gamesEndpoint: false,
      responseValid: false,
      gameCount: 0,
    },
    errors: [],
    logs: [],
  };

  // Capture console logs
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    result.logs.push(args.join(' '));
    originalLog(...args);
  };
  console.error = (...args) => {
    result.errors.push(args.join(' '));
    originalError(...args);
  };
  console.warn = (...args) => {
    result.logs.push(`[WARN] ${args.join(' ')}`);
    originalWarn(...args);
  };

  try {
    logger.info('Starting comprehensive API debug test...');
    
    // Test 1: Connection tests
    await triollAPIDebug.testConnection();
    
    // Parse results from logs
    if (result.logs.some(log => log.includes('✅ Domain:'))) {
      result.connectionTest.domainResolves = true;
    }
    if (result.logs.some(log => log.includes('✅ Fetch succeeded'))) {
      result.connectionTest.basicFetch = true;
    }
    if (result.logs.some(log => log.includes('✅ Fetch with headers succeeded'))) {
      result.connectionTest.fetchWithHeaders = true;
    }
    if (result.logs.some(log => log.includes('Auth token: Present'))) {
      result.connectionTest.authState = true;
    }

    // Test 2: API endpoint test
    logger.info('Testing games endpoint...');
    try {
      const games = await triollAPIDebug.debugRequest<{ games: any[] }>('/games');
      result.apiTest.gamesEndpoint = true;
      result.apiTest.responseValid = true;
      result.apiTest.gameCount = games.games?.length || 0;
      result.success = true;
    } catch {
      result.errors.push(`Games endpoint failed: ${error.message}`);
    }

  } catch {
    result.errors.push(`Test failed: ${error.message}`);
  } finally {
    // Restore console methods
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }

  return result;
}

/**
 * Quick test to check if API is accessible
 */
export async function quickAPITest(): Promise<boolean> {
  try {
    const response = await fetch('https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Log detailed debug info to console
 */
export function logDebugInfo(): void {
  logger.info('=== API Debug Information ===');
  logger.info('API Base URL:', 'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod');
  logger.info('Environment:', process.env.NODE_ENV);
  logger.info('Platform:', Platform.OS);
  
  // Check if running in simulator/emulator
  if (__DEV__) {
    logger.info('Running in development mode');
    if (Platform.OS === 'android' && window.location.hostname === 'localhost') {
      logger.warn('Android emulator detected - localhost API calls may fail');
      logger.warn('Consider using 10.0.2.2 instead of localhost');
    }
  }
}

// Make debug functions globally available in development
if (__DEV__ && typeof window !== 'undefined') {
  (window as any).debugAPI = {
    runTest: runAPIDebugTest,
    comprehensiveTest: runComprehensiveAPITest,
    quickTest: quickAPITest,
    logInfo: logDebugInfo,
    triollAPIDebug,
  };
  
  logger.info('🔧 Debug API utilities available:');
  logger.info('  window.debugAPI.runTest() - Run basic debug test');
  logger.info('  window.debugAPI.comprehensiveTest() - Run full test suite');
  logger.info('  window.debugAPI.quickTest() - Quick connectivity check');
  logger.info('  window.debugAPI.logInfo() - Log debug information');
}