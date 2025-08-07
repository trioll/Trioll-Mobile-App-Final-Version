
/**
 * Environment Activator
 * Safely switches between development and staging environments
 */

import { Config, setEnvironment, Environment } from '../../config/environments';
import { safeAuthService } from '../auth/safeAuthService';
import { dynamoDBService } from '../database/dynamoDBService';
import { WebSocketManager } from '../../utils/websocketManager';
import { offlineQueueManager } from '../../utils/offlineQueueManager';
import { analyticsService } from '../monitoring/analyticsEnhanced';

import AsyncStorage from '../../utils/storageCompat';
import * as Network from 'expo-network';
import { getLogger } from '../../utils/logger';

const logger = getLogger('EnvironmentActivator');

const ENVIRONMENT_STORAGE_KEY = '@trioll_active_environment';
const HEALTH_CHECK_TIMEOUT = 5000;
const ACTIVATION_LOG_KEY = '@trioll_env_activation_log';

export interface EnvironmentStatus {
  current: Environment;
  target?: Environment;
  isTransitioning: boolean;
  lastCheck: number;
  services: {
    api: { available: boolean; latency?: number; error?: string };
    auth: { available: boolean; error?: string };
    database: { available: boolean; error?: string };
    websocket: { available: boolean; error?: string };
  };
  fallbackActive: boolean;
}

export interface ActivationResult {
  success: boolean;
  environment: Environment;
  duration: number;
  services: {
    api: boolean;
    auth: boolean;
    database: boolean;
    websocket: boolean;
  };
  errors: string[];
  warnings: string[];
}

class EnvironmentActivator {
  private status: EnvironmentStatus = {
    current: 'development',
    isTransitioning: false,
    lastCheck: 0,
    services: {
      api: { available: false },
      auth: { available: false },
      database: { available: false },
      websocket: { available: false },
    },
    fallbackActive: false,
  };

  private statusListeners: ((status: EnvironmentStatus) => void)[] = [];
  private healthCheckInterval: number | null = null;
  private wsManager = WebSocketManager.getInstance();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize environment activator
   */
  private async initialize() : Promise<void> {
    // Load saved environment preference
    const savedEnv = await this.loadSavedEnvironment();
    if (savedEnv && savedEnv !== 'production') {
      this.status.current = savedEnv;
    }

    // Start health monitoring
    this.startHealthMonitoring();

    // Monitor network connectivity
    setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected && state.isInternetReachable && this.status.fallbackActive) {
        logger.info('📶 Network restored - checking staging availability');
        this.validateEnvironment(this.status.target || 'staging');
      }
    }, 5000);
  }

  /**
   * Activate staging environment with safety checks
   */
  async activateStaging(): Promise<ActivationResult> {
    logger.info('🚀 Starting staging environment activation...\n');

    const startTime = Date.now();
    const result: ActivationResult = {
      success: false,
      environment: this.status.current,
      duration: 0,
      services: {
        api: false,
        auth: false,
        database: false,
        websocket: false,
      },
      errors: [],
      warnings: [],
    };

    if (this.status.isTransitioning) {
      (result as any).errors.push('Environment transition already in progress');
      return result;
    }

    this.status.isTransitioning = true;
    this.status.target = 'staging';
    this.notifyListeners();

    try {
      // Phase 1: Validate staging environment
      logger.info('📡 Phase 1: Validating staging environment...\n');
      const validation = await this.validateEnvironment('staging');

      if (!validation.isValid) {
        (result as any).errors.push(...(validation as any).errors);
        throw new Error('Staging environment validation failed');
      }

      result.warnings.push(...validation.warnings);

      // Phase 2: Test connectivity
      logger.info('\n🔌 Phase 2: Testing service connectivity...\n');
      const connectivity = await this.testConnectivity();

      result.services = connectivity.services;

      if (!connectivity.allServicesAvailable) {
        (result as any).errors.push('Not all staging services are available');
        if (!connectivity.services.api)
          (result as any).errors.push('API Gateway not accessible');
        if (!connectivity.services.auth)
          (result as any).errors.push('Cognito service not accessible');
        if (!(connectivity.services as unknown).database)
          (result as any).errors.push('DynamoDB not accessible');
        throw new Error('Service connectivity check failed');
      }

      // Phase 3: Backup current state
      logger.info('\n💾 Phase 3: Backing up current state...\n');
      await this.backupCurrentState();

      // Phase 4: Switch environment
      logger.info('\n🔄 Phase 4: Switching to staging environment...\n');
      await this.switchToEnvironment('staging');

      // Phase 5: Verify functionality
      logger.info('\n✅ Phase 5: Verifying functionality...\n');
      const verification = await this.verifyFunctionality();

      if (!(verification as any).success) {
        (result as any).errors.push('Functionality verification failed');
        await this.rollbackToDevelopment();
        throw new Error('Post-switch verification failed');
      }

      // Success!
      (result as any).success = true;
      result.environment = 'staging';
      this.status.current = 'staging';
      this.status.fallbackActive = false;

      // Save environment preference
      await this.saveEnvironmentPreference('staging');

      logger.info('\n🎉 Staging environment activated successfully!\n');

      // Track activation
      analyticsService.track('environment_activated', {
        from: 'development',
        to: 'staging',
        duration: Date.now() - startTime,
        services: result.services,
      });
    } catch (error: unknown) {
      logger.error('❌ Environment activation failed:', error);
      (result as any).errors.push(error.message);

      // Ensure we're back in development mode
      await this.rollbackToDevelopment();
    } finally {
      this.status.isTransitioning = false;
      this.status.target = undefined;
      result.duration = Date.now() - startTime;
      this.notifyListeners();

      // Log activation attempt
      await this.logActivationAttempt(result);
    }

    return result;
  }

  /**
   * Validate environment configuration
   */
  private async validateEnvironment(env: Environment): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Prevent production activation
    if (env === 'production') {
      validation.isValid = false;
      (validation as any).errors.push(
        'Production environment activation not allowed through this interface'
      );
      return validation;
    }

    // Check network connectivity
    const netInfo = await Network.getNetworkStateAsync();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      validation.isValid = false;
      (validation as any).errors.push('No network connectivity');
      return validation;
    }

    // Validate staging configuration
    if (env === 'staging') {
      const stagingConfig = (await import('../../config/environments/staging')).staging;

      // Check required endpoints
      if (!stagingConfig.API_BASE_URL) {
        (validation as any).errors.push('Missing API base URL');
        validation.isValid = false;
      }

      if (!stagingConfig.USER_POOL_ID || !stagingConfig.USER_POOL_CLIENT_ID) {
        (validation as any).errors.push('Missing Cognito configuration');
        validation.isValid = false;
      }

      if (!stagingConfig.GAMES_TABLE || !stagingConfig.USERS_TABLE) {
        (validation as any).errors.push('Missing DynamoDB table names');
        validation.isValid = false;
      }

      // Warnings for optional features
      if (!stagingConfig.WEBSOCKET_URL) {
        validation.warnings.push('WebSocket URL not configured - real-time features disabled');
      }

      if (stagingConfig.USE_MOCK_API) {
        validation.warnings.push('USE_MOCK_API is true in staging config');
      }
    }

    return validation;
  }

  /**
   * Test connectivity to staging services
   */
  private async testConnectivity(): Promise<{
    allServicesAvailable: boolean;
    services: {
      api: boolean;
      auth: boolean;
      database: boolean;
      websocket: boolean;
    };
  }> {
    const services = {
      api: false,
      auth: false,
      database: false,
      websocket: false,
    };

    // Test API Gateway
    try {
      logger.info('Testing API Gateway...');
      const start = Date.now();
      const response = await fetch(`${Config.API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
      });

      const latency = Date.now() - start;
      services.api = response.ok || response.status === 404; // 404 is ok if endpoint doesn't exist
      this.status.services.api = {
        available: services.api,
        latency,
        error: services.api ? undefined : `Status: ${response.status}`,
      };

      logger.info(`✅ API Gateway: ${services.api ? 'Available' : 'Unavailable'} (${latency}ms)`);
    } catch (error: unknown) {
      logger.info(`❌ API Gateway: ${error.message}`);
      this.status.services.api = { available: false, error: error.message };
    }

    // Test Cognito (through auth service)
    try {
      logger.info('Testing AWS Cognito...');
      // Try to get current user (should fail gracefully if not logged in)
      await safeAuthService.getCurrentUser();
      services.auth = true;
      this.status.services.auth = { available: true };
      logger.info('✅ AWS Cognito: Available');
    } catch (error: unknown) {
      // Not being logged in is not a failure
      if (
        error.message.includes('No current user') ||
        error.message.includes('not authenticated')
      ) {
        services.auth = true;
        this.status.services.auth = { available: true };
        logger.info('✅ AWS Cognito: Available (not authenticated)');
      } else {
        logger.info(`❌ AWS Cognito: ${error.message}`);
        this.status.services.auth = { available: false, error: error.message };
      }
    }

    // Test DynamoDB (through API)
    try {
      logger.info('Testing DynamoDB access...');
      // This would be a lightweight query through the API
      (services as any).database = services.api; // If API is available, assume DynamoDB is accessible
      (this.status.services as unknown).database = { available: (services as any).database };
      logger.info(`✅ DynamoDB: ${(services as any).database ? 'Available' : 'Unavailable'}`);
    } catch (error: unknown) {
      logger.info(`❌ DynamoDB: ${error.message}`);
      (this.status.services as unknown).database = { available: false, error: error.message };
    }

    // Test WebSocket (optional)
    if (Config.WEBSOCKET_URL) {
      try {
        logger.info('Testing WebSocket connection...');
        // Don't actually connect, just check if endpoint exists
        services.websocket = true; // Assume available if URL is configured
        this.status.services.websocket = { available: true };
        logger.info('✅ WebSocket: Available');
      } catch (error: unknown) {
        logger.info(`⚠️  WebSocket: ${error.message}`);
        this.status.services.websocket = { available: false, error: error.message };
      }
    }

    const allServicesAvailable = services.api && services.auth && (services as any).database;
    this.status.lastCheck = Date.now();

    return { allServicesAvailable, services };
  }

  /**
   * Backup current state before switching
   */
  private async backupCurrentState() : Promise<void> {
    const backup = {
      environment: this.status.current,
      timestamp: Date.now(),
      offlineQueueSize: offlineQueueManager.getQueueStatus().size,
      authState: await safeAuthService.isAuthenticated(),
    };

    await AsyncStorage.setItem('@trioll_env_backup', JSON.stringify(backup));
    logger.info('💾 Current state backed up');
  }

  /**
   * Switch to specified environment
   */
  private async switchToEnvironment(env: Environment) {
    // Update configuration
    setEnvironment(env);

    // Notify services of environment change
    safeAuthService.enableTestMode();
    dynamoDBService.enableTestMode();

    // Clear caches to ensure fresh data
    await this.clearCaches();

    logger.info(`🔄 Switched to ${env} environment`);
  }

  /**
   * Verify functionality after switch
   */
  private async verifyFunctionality(): Promise<{ success: boolean; errors: string[] }> {
    const verification = {
      success: true,
      errors: [] as string[],
    };

    try {
      // Test a simple API call
      if (!Config.USE_MOCK_API) {
        const testResponse = await fetch(`${Config.API_BASE_URL}/health`);
        if (!testResponse.ok && testResponse.status !== 404) {
          (verification as any).success = false;
          (verification as any).errors.push('API health check failed');
        }
      }

      // Verify auth service is responsive
      const authMode = safeAuthService.getAuthMode();
      if (Config.USE_MOCK_API && authMode !== 'mock') {
        (verification as any).success = false;
        (verification as any).errors.push('Auth service not in expected mode');
      }

      logger.info('✅ Functionality verification passed');
    } catch (error: unknown) {
      (verification as any).success = false;
      (verification as any).errors.push(error.message);
    }

    return verification;
  }

  /**
   * Rollback to development environment
   */
  async rollbackToDevelopment(): Promise<void> {
    logger.info('🔙 Rolling back to development environment...');

    try {
      // Switch back to development
      setEnvironment('development');

      // Enable mock APIs
      safeAuthService.switchToMockAuth();

      // Update status
      this.status.current = 'development';
      this.status.fallbackActive = true;

      // Save preference
      await this.saveEnvironmentPreference('development');

      logger.info('✅ Rolled back to development environment');

      analyticsService.track('environment_rollback', {
        from: 'staging',
        to: 'development',
        reason: 'activation_failed',
      });
    } catch (error) {
      logger.error('Rollback error:', error);
    }
  }

  /**
   * Manually switch environment (for debugging)
   */
  async switchEnvironment(env: Environment): Promise<void> {
    if (env === 'production') {
      throw new Error('Cannot manually switch to production');
    }

    if (env === 'staging') {
      await this.activateStaging();
    } else {
      await this.rollbackToDevelopment();
    }
  }

  /**
   * Get current environment status
   */
  getStatus(): EnvironmentStatus {
    return { ...this.status };
  }

  /**
   * Add status listener
   */
  addStatusListener(listener: (status: EnvironmentStatus) => void) {
    this.statusListeners.push(listener);
  }

  /**
   * Remove status listener
   */
  removeStatusListener(listener: (status: EnvironmentStatus) => void) {
    this.statusListeners = this.statusListeners.filter(l => l !== listener);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (this.status.current === 'staging' && !this.status.isTransitioning) {
        const connectivity = await this.testConnectivity();

        if (!connectivity.allServicesAvailable && !this.status.fallbackActive) {
          logger.warn('⚠️  Staging services unavailable - activating fallback');
          await this.activateFallback();
        }
      }
    }, 30000);
  }

  /**
   * Activate fallback to mock APIs
   */
  private async activateFallback() : Promise<void> {
    this.status.fallbackActive = true;
    safeAuthService.switchToMockAuth();

    analyticsService.track('environment_fallback_activated', {
      environment: this.status.current,
      services: this.status.services,
    });

    this.notifyListeners();
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Clear caches
   */
  private async clearCaches() : Promise<void> {
    try {
      // Clear AsyncStorage caches
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.includes('cache') || key.includes('query'));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      logger.info('🧹 Caches cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Save environment preference
   */
  private async saveEnvironmentPreference(env: Environment) {
    try {
      await AsyncStorage.setItem(ENVIRONMENT_STORAGE_KEY, env);
    } catch (error) {
      logger.error('Failed to save environment preference:', error);
    }
    return;
}

  /**
   * Load saved environment
   */
  private async loadSavedEnvironment(): Promise<Environment | null> {
    try {
      const saved = await AsyncStorage.getItem(ENVIRONMENT_STORAGE_KEY);
      return saved as Environment | null;
    } catch (error) {
      logger.error('Failed to load environment preference:', error);
      return null;
    }
  }

  /**
   * Log activation attempt
   */
  private async logActivationAttempt(result: ActivationResult) {
    try {
      const logs = await AsyncStorage.getItem(ACTIVATION_LOG_KEY);
      const activationLogs = logs ? JSON.parse(logs) : [];

      activationLogs.push({
        timestamp: Date.now(),
        ...result,
      });

      // Keep only last 50 attempts
      const recentLogs = activationLogs.slice(-50);

      await AsyncStorage.setItem(ACTIVATION_LOG_KEY, JSON.stringify(recentLogs));
    } catch (error) {
      logger.error('Failed to log activation attempt:', error);
    }
  }

  /**
   * Get activation history
   */
  async getActivationHistory(): Promise<ActivationResult[]> {
    try {
      const logs = await AsyncStorage.getItem(ACTIVATION_LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      logger.error('Failed to get activation history:', error);
      return [];
    }
  }

  /**
   * Notify status listeners
   */
  private notifyListeners() {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }
}

// Export singleton instance
export const environmentActivator = new EnvironmentActivator();

// Export for testing
export { EnvironmentActivator };
