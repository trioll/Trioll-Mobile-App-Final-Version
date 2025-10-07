
/**
 * Biometric Authentication Manager
 * Handles Face ID, Touch ID, and other biometric authentication methods
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getLogger } from '../../utils/logger';

const logger = getLogger('BiometricAuthManager');

const BIOMETRIC_ENABLED_KEY_PREFIX = 'biometric_enabled_';
const BIOMETRIC_CREDENTIALS_KEY_PREFIX = 'biometric_credentials_';

export interface BiometricResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface StoredCredentials {
  username: string;
  refreshToken: string;
}

export class BiometricAuthManager {
  static async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      logger.error('Error checking biometric availability:', error);
      return false;
    }
  }

  static async enrollBiometric(userId: string): Promise<BiometricResult> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication not available on this device',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric login for Trioll',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if ((result as any).success) {
        await SecureStore.setItemAsync(`${BIOMETRIC_ENABLED_KEY_PREFIX}${userId}`, 'true');
        return { success: true };
      }

      return {
        success: false,
        error: (result as any).error || 'Authentication failed',
      };
    } catch {
      logger.error('Failed to enroll biometric:', error);
      return {
        success: false,
        error: 'Failed to enable biometric authentication',
      };
    }
  }

  static async isBiometricEnabledForUser(userId: string): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(`${BIOMETRIC_ENABLED_KEY_PREFIX}${userId}`);
      return enabled === 'true';
    } catch {
      logger.error('Error checking biometric status:', error);
      return false;
    }
  }

  static async saveCredentialsForBiometric(
    userId: string,
    credentials: StoredCredentials
  ): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        `${BIOMETRIC_CREDENTIALS_KEY_PREFIX}${userId}`,
        JSON.stringify(credentials)
      );
    } catch {
      logger.error('Failed to save biometric credentials:', error);
      throw error;
    }
  }

  static async getStoredCredentials(userId: string): Promise<StoredCredentials | null> {
    try {
      const stored = await SecureStore.getItemAsync(`${BIOMETRIC_CREDENTIALS_KEY_PREFIX}${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      logger.error('Failed to get stored credentials:', error);
      return null;
    }
  }

  static async authenticate(promptMessage?: string): Promise<BiometricResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to continue',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if ((result as any).success) {
        return { success: true };
      }

      if ((result as any).error === 'user_cancel') {
        return {
          success: false,
          error: 'Biometric authentication cancelled',
        };
      }

      return {
        success: false,
        error: (result as any).error || 'Authentication failed',
      };
    } catch {
      logger.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Biometric authentication failed',
      };
    }
  }

  static async disableBiometric(userId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`${BIOMETRIC_ENABLED_KEY_PREFIX}${userId}`);
      await SecureStore.deleteItemAsync(`${BIOMETRIC_CREDENTIALS_KEY_PREFIX}${userId}`);
    } catch {
      logger.error('Failed to disable biometric:', error);
      throw error;
    }
  }
}
