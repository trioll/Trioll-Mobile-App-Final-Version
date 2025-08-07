
import React, { useEffect, useState } from 'react';
import { LogBox, View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { AppErrorBoundary } from './components/errors/AppErrorBoundary';
import { MainNavigator } from './navigation';
import { isUserCompliant } from './utils/complianceStorage';
import { cleanupCorruptedStorage } from './src/utils/storageCleanup';
import { Config } from './src/config/environments';
import { webSocketService } from './src/services/websocket/WebSocketService';
import { configureAmplify } from './src/config/amplifyConfig';
import { ensureGuestCredentials, testAmplifyConfig } from './src/services/auth/amplifyAuthServiceFix';
import { GamesLoaderProvider } from './components/providers/GamesLoaderProvider';
import { WebSocketProvider } from './src/contexts/WebSocketContext';
import { getLogger } from './src/utils/logger';

const logger = getLogger('App');

// Suppress console logs in production
if (!Config.DEBUG.ENABLE_LOGGING && !__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;

  // Keep console.warn and console.error based on LOG_LEVEL
  if (Config.DEBUG.LOG_LEVEL !== 'warn' && Config.DEBUG.LOG_LEVEL !== 'error') {
    console.warn = noop;
  }

  if (Config.DEBUG.LOG_LEVEL !== 'error') {
    console.error = noop;
  }
}

// Only import diagnostics if needed
let StartupDiagnostics: React.ComponentType | null = null;
const SHOW_DIAGNOSTICS = false;
if (SHOW_DIAGNOSTICS) {
  StartupDiagnostics =
    require('./src/components/diagnostics/StartupDiagnostics').StartupDiagnostics;
}

// Ignore specific warnings that might cause issues
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Cannot read property \'ENABLED\' of undefined', // Expo Updates config error
  'VirtualizedLists should never be nested',
]);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsCompliance, setNeedsCompliance] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(SHOW_DIAGNOSTICS);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    // Test storage persistence in development
    if (__DEV__) {
      testStoragePersistence();
    }
    
    initializeApp();

    // Cleanup on app unmount
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  const testStoragePersistence = async () => {
    try {
      const { safeStorage } = await import('./utils/safeStorage');
      const testKey = 'trioll_storage_test';
      const existingValue = await safeStorage.getItem(testKey);
      
      if (existingValue) {
        logger.info('✅ Storage persistence test: Found existing value:', existingValue);
      } else {
        const newValue = new Date().toISOString();
        await safeStorage.setItem(testKey, newValue);
        logger.info('📝 Storage persistence test: Stored new value:', newValue);
      }
      
      // Test if SecureStore is being used
      logger.info('Storage using SecureStore:', safeStorage.isUsingSecureStore());
    } catch (error) {
      logger.error('Storage persistence test failed:', error);
    }
  };

  const initializeApp = async () => {
    // Configure Amplify first
    try {
      const amplifyConfigured = await configureAmplify();
      if (!amplifyConfigured) {
        logger.warn('Amplify configuration failed, using fallback auth');
      } else {
        // Ensure guest credentials are initialized
        logger.info('Initializing guest credentials...');
        await ensureGuestCredentials();
        
        // Initialize API for guest mode
        const { configureAPIForGuest } = await import('./src/services/api/TriollAPI');
        const { amplifyAuthService } = await import('./src/services/auth/amplifyAuthService');
        const state = amplifyAuthService.getCurrentState();
        if (state.identityId) {
          configureAPIForGuest({ identityId: state.identityId });
        }
        
        // Test configuration in development
        if (__DEV__) {
          await testAmplifyConfig();
        }
      }
    } catch (error) {
      logger.error('Amplify configuration error:', error);
    }

    // Clean up any corrupted storage data
    try {
      await cleanupCorruptedStorage();
    } catch {
      // Storage cleanup failed, but continue
    }

    // Check compliance
    checkCompliance();

    // Initialize WebSocket connection
    initializeWebSocket();

    // Defer analytics initialization to after app is ready
    setTimeout(() => {
      initializeAnalytics();
      loadBackendValidationTool();
    }, 1000);
  };

  const initializeAnalytics = async () => {
    try {
      // Lazy load analytics service
      const { getAnalyticsService } = await import('./src/services/monitoring/analyticsEnhanced');
      const analyticsService = getAnalyticsService();
      await analyticsService.initialize();
      
      // Check auth status in development
      if (__DEV__) {
        // Test Amplify setup first
        const { testAmplifySetup } = await import('./src/utils/testAmplifySetup');
        await testAmplifySetup();
        
        // Wait a bit for Amplify to fully initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Then check auth status
        const { logAuthStatus } = await import('./src/utils/checkAuthStatusFixed');
        await logAuthStatus();
        
        // Run comprehensive auth flow test
        logger.info('🧪 Running Auth Flow Test...');
        const { testAuthFlow } = await import('./src/utils/testAuthFlow');
        await testAuthFlow();
      }
    } catch {
      // Failed to initialize analytics, but don't crash the app
    }
  };

  const initializeWebSocket = async () => {
    try {
      // Connect to WebSocket service for real-time features
      await webSocketService.connect();
    } catch (_error) {
      // WebSocket connection failed, but don't crash the app
      // Real-time features will be unavailable
    }
    return;
};

  const loadBackendValidationTool = async () => {
    try {
      // Load backend validation tool for development
      if (__DEV__) {
        const { loadBackendValidation } = await import('./src/utils/backendValidation');
        await loadBackendValidation();

        // Also load test utilities
        await import('./src/utils/apiIntegrationTest');
        await import('./src/utils/comprehensiveTestRunner');
        
        // Load debug API test utility
        await import('./src/utils/debugApiTest');
        logger.info('Debug API test utilities loaded - check console for instructions');
      }
    } catch {
      // Failed to load backend validation, but don't crash the app
    }
  };

  const checkCompliance = async () => {
    try {
      logger.info('=== CHECKING COMPLIANCE ON APP START ===');
      
      // Add a small delay to ensure storage is initialized
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // First check if we have stored compliance data
      const { getComplianceData } = await import('./utils/complianceStorage');
      const storedData = await getComplianceData();
      
      if (storedData) {
        logger.info('Found stored compliance data:', {
          age: storedData.age,
          region: storedData.region,
          termsAccepted: storedData.termsAccepted,
          completedAt: storedData.completedAt
        });
      } else {
        logger.info('No stored compliance data found');
      }
      
      const compliant = await isUserCompliant();
      logger.info('User compliance check result:', compliant);
      setNeedsCompliance(!compliant);
    } catch (error) {
      logger.error('Compliance check error:', error);
      // Error is shown in UI, no need to log
      setStartupError(error instanceof Error ? (error as any).message : 'Unknown startup error');
      setNeedsCompliance(true); // Default to showing compliance if error
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1a1a2e',
        }}
      >
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // Show diagnostics if enabled or if there's a startup error
  if (showDiagnostics || startupError) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          {startupError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>Startup Error: {startupError}</Text>
            </View>
          )}
          {StartupDiagnostics && <StartupDiagnostics />}
          <TouchableOpacity style={styles.continueButton} onPress={() => setShowDiagnostics(false)}>
            <Text style={styles.continueButtonText}>Continue to App</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <WebSocketProvider autoConnect={true}>
              <GamesLoaderProvider>
                <StatusBar style="light" />
                <NavigationContainer>
                  <MainNavigator needsCompliance={needsCompliance} />
                </NavigationContainer>
              </GamesLoaderProvider>
            </WebSocketProvider>
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  errorBanner: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  continueButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
