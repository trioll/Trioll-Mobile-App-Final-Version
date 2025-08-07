
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { BiometricAuthResult } from '../types/auth';

const logger = getLogger('biometricAuth');

import { getLogger } from '../src/utils/logger';
const BIOMETRIC_ENABLED_KEY = 'trioll_biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'trioll_biometric_credentials';

export const checkBiometricSupport = async (): Promise<{
  isAvailable: boolean;
  biometryType: LocalAuthentication.AuthenticationType[];
}> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return {
        isAvailable: true,
        biometryType: supportedTypes,
      };
    }

    return {
      isAvailable: false,
      biometryType: [],
    };
  } catch (error) {
    logger.error('Error checking biometric support:', error);
    return {
      isAvailable: false,
      biometryType: [],
    };
  }
};

export const authenticateWithBiometrics = async (): Promise<BiometricAuthResult> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to sign in to TRIOLL',
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if ((result as any).success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: (result as any).error || 'Authentication failed',
      };
    }
  } catch (error) {
    logger.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'Biometric authentication unavailable',
    };
  }
};

export const enableBiometricAuth = async (
  emailOrUsername: string,
  password: string
): Promise<boolean> => {
  try {
    // First authenticate with biometrics
    const authResult = await authenticateWithBiometrics();
    if (!(authResult as any).success) {
      return false;
    }

    // Store encrypted credentials
    const credentials = JSON.stringify({ emailOrUsername, password });
    await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

    return true;
  } catch (error) {
    logger.error('Error enabling biometric auth:', error);
    return false;
  }
};

export const disableBiometricAuth = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    return true;
  } catch (error) {
    logger.error('Error disabling biometric auth:', error);
    return false;
  }
};

export const isBiometricAuthEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    logger.error('Error checking biometric status:', error);
    return false;
  }
};

export const getBiometricCredentials = async (): Promise<{
  emailOrUsername: string;
  password: string;
} | null> => {
  try {
    const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    if (credentials) {
      return JSON.parse(credentials);
    }
    return null;
  } catch (error) {
    logger.error('Error getting biometric credentials:', error);
    return null;
  }
};

export const getBiometryTypeName = (type: LocalAuthentication.AuthenticationType): string => {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'Touch ID';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'Face ID';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'Iris';
    default:
      return 'Biometric';
  }
};
