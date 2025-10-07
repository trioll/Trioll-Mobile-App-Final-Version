import { Config, setEnvironment, Environment } from '../config/environments';
import { development } from '../config/environments/development';

import AsyncStorage from './storageCompat';
import { getLogger } from '../utils/logger';

const logger = getLogger('environmentSwitcher');
const ENV_STORAGE_KEY = '@trioll/environment_override';
const BACKEND_STATUS_KEY = '@trioll/backend_status';

interface BackendStatus {
  available: boolean;
  lastChecked: number;
  error?: string;
}

class EnvironmentSwitcher {
  private originalEnvironment: Environment;
  private backendStatus: BackendStatus = {
    available: true,
    lastChecked: Date.now(),
  };
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private fallbackEnabled = true;

  constructor() {
    this.originalEnvironment = Config.ENV;
    this.initializeHealthCheck();
  }

  /**
   * Initialize periodic health checks for backend
   */
  private initializeHealthCheck() {
    if (Config.ENV !== 'development') {
      this.healthCheckInterval = setInterval(() => {
        this.checkBackendHealth();
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Check if backend is healthy
   */
  private async checkBackendHealth() : Promise<void> {
    if (Config.USE_MOCK_API) {
      return; // Skip health check if using mock API
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${Config.API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.backendStatus = {
        available: response.ok,
        lastChecked: Date.now(),
        error: response.ok ? undefined : `Status: ${response.status}`,
      };

      await AsyncStorage.setItem(BACKEND_STATUS_KEY, JSON.stringify(this.backendStatus));

      if (!response.ok && this.fallbackEnabled) {
        logger.warn('🚨 Backend health check failed, considering fallback to mock APIs');
        await this.fallbackToMockAPIs();
      }
    } catch {
      logger.error('❌ Backend health check error:', error);
      this.backendStatus = {
        available: false,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      if (this.fallbackEnabled) {
        await this.fallbackToMockAPIs();
      }
    }
  }

  /**
   * Switch to specified environment with safety checks
   */
  async switchEnvironment(targetEnv: Environment): Promise<boolean> {
    logger.info(`🔄 Switching from ${Config.ENV} to ${targetEnv}...`);

    try {
      // Store current environment for rollback
      const previousEnv = Config.ENV;

      // Apply environment change
      setEnvironment(targetEnv);

      // Save preference
      await AsyncStorage.setItem(ENV_STORAGE_KEY, targetEnv);

      // If switching to real backend, test connectivity
      if (!Config.USE_MOCK_API) {
        await this.checkBackendHealth();

        if (!this.backendStatus.available) {
          logger.warn('⚠️ Backend not available, rolling back...');
          setEnvironment(previousEnv);
          await AsyncStorage.setItem(ENV_STORAGE_KEY, previousEnv);
          return false;
        }
      }

      logger.info(`✅ Successfully switched to ${targetEnv} environment`);
      logger.info(`📡 API: ${Config.API_BASE_URL}`);
      logger.info(`🎭 Mock API: ${Config.USE_MOCK_API ? 'Enabled' : 'Disabled'}`);

      return true;
    } catch {
      logger.error('❌ Error switching environment:', error);
      return false;
    }
  }

  /**
   * Fallback to mock APIs if backend fails
   */
  async fallbackToMockAPIs() : Promise<void> {
    if (Config.USE_MOCK_API) {
      return; // Already using mock APIs
    }

    logger.warn('🔄 Falling back to mock APIs due to backend issues...');

    // Create a temporary config with mock APIs enabled
    const mockConfig = {
      ...Config,
      USE_MOCK_API: true,
      API_BASE_URL: development.API_BASE_URL,
    };

    // Apply mock configuration
    Object.assign(Config, mockConfig);

    // Notify user through a callback (to avoid UI changes)
    this.notifyBackendFallback();
  }

  /**
   * Restore original environment settings
   */
  async restoreOriginalEnvironment() : Promise<void> {
    logger.info(`🔄 Restoring original ${this.originalEnvironment} environment...`);
    setEnvironment(this.originalEnvironment);
    await AsyncStorage.removeItem(ENV_STORAGE_KEY);
  }

  /**
   * Get current backend status
   */
  getBackendStatus(): BackendStatus {
    return { ...this.backendStatus };
  }

  /**
   * Enable/disable automatic fallback
   */
  setFallbackEnabled(enabled: boolean) {
    this.fallbackEnabled = enabled;
    logger.info(`🛡️ Automatic fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Load saved environment preference
   */
  async loadSavedEnvironment() : Promise<void> {
    try {
      const savedEnv = await AsyncStorage.getItem(ENV_STORAGE_KEY);
      if (savedEnv && ['development', 'staging', 'production'].includes(savedEnv)) {
        await this.switchEnvironment(savedEnv as Environment);
      }
    } catch {
      logger.error('Error loading saved environment:', error);
    }
  }

  /**
   * Notify about backend fallback (implement as needed without UI changes)
   */
  private notifyBackendFallback() {
    // This could emit an event that debug tools listen to
    // without affecting the main UI
    if (__DEV__) {
      logger.warn('📢 Backend unavailable - using mock data');
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export const environmentSwitcher = new EnvironmentSwitcher();

// Debug helper for development
if (__DEV__) {
  (global as any).environmentSwitcher = environmentSwitcher;
}
